import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ===== CONFIG =====
const __dir = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  try {
    const lines = readFileSync(resolve(__dir, '.env'), 'utf8').split('\n');
    for(const line of lines) {
      const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
      if(m) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadEnv();

const SUPABASE_URL        = process.env.SUPABASE_URL        || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_ANON_KEY   = 'sb_publishable_rWR-Aesm3GyJxEnvrhcZ2M_ZmMoQWdB';
const OPENAI_API_KEY      = process.env.OPENAI_API_KEY      || '';
const MUTE_MINUTES        = parseInt(process.env.MUTE_MINUTES || '60');

if(!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('❌  .env fehlt oder unvollständig — bitte .env.example kopieren und ausfüllen.');
  process.exit(1);
}

// Realtime subscription: anon key (same as frontend, works with Realtime)
const sbListen = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Admin actions: service key (bypasses RLS for delete/mute)
const sbAdmin  = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// ===== OPENAI MODERATION =====
// Kategorien die zum Löschen führen
const DELETE_CATEGORIES = new Set([
  'hate', 'hate/threatening',
  'harassment', 'harassment/threatening',
  'sexual', 'sexual/minors',
  'violence', 'violence/graphic',
  'self-harm', 'self-harm/intent', 'self-harm/instructions',
]);

// Kategorien die zusätzlich zum Muten führen (schwere Verstöße)
const MUTE_CATEGORIES = new Set([
  'hate/threatening',
  'harassment/threatening',
  'sexual/minors',
  'violence/graphic',
  'self-harm/intent',
]);

async function checkModeration(text, retry = true) {
  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: text }),
    });

    if(res.status === 429 && retry) {
      console.warn('⚠  OpenAI Rate-Limit (429) — warte 3s und versuche nochmal…');
      await new Promise(r => setTimeout(r, 3000));
      return checkModeration(text, false);
    }

    if(!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('⚠  OpenAI API Fehler:', err?.error?.message || res.status);
      return null;
    }

    const data   = await res.json();
    const result = data.results?.[0];
    if(!result) return null;

    // Welche Kategorien sind geflaggt?
    const flaggedCats = Object.entries(result.categories)
      .filter(([, flagged]) => flagged)
      .map(([cat]) => cat);

    // Höchster Score
    const topEntry = Object.entries(result.category_scores)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      flagged:     result.flagged,
      flaggedCats,
      topCategory: topEntry?.[0],
      topScore:    topEntry?.[1],
      scores:      result.category_scores,
    };
  } catch(e) {
    console.warn('⚠  OpenAI nicht erreichbar:', e.message);
    return null;
  }
}

// ===== LOKALER WORT-FILTER (Fallback wenn OpenAI nicht verfügbar) =====

// Basis-Wortliste (immer aktiv, unabhängig von der DB)
const BASE_BANNED_WORDS = [
  'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'nigger', 'nigga',
  'faggot', 'fag', 'retard', 'whore', 'slut',
  'wichser', 'scheiße', 'scheiss', 'arschloch', 'hurensohn',
  'fotze', 'wichse', 'spast', 'idiot', 'nutte',
  'kys', 'kill yourself',
];

let bannedWords = [];
let bannedWordsLoaded = 0;

async function loadBannedWords() {
  const { data, error } = await sbAdmin.from('chat_banned_words').select('word');
  if(error) { console.warn('⚠  Verbotene Wörter konnten nicht geladen werden:', error.message); return; }
  bannedWords = (data || []).map(r => r.word.toLowerCase());
  bannedWordsLoaded = Date.now();
  console.log(`📋 ${bannedWords.length} DB-Wörter + ${BASE_BANNED_WORDS.length} Basis-Wörter im Filter`);
}

function checkBannedWords(text) {
  const lower = text.toLowerCase();
  // Zuerst Basis-Liste prüfen
  for(const word of BASE_BANNED_WORDS) {
    if(lower.includes(word)) return word;
  }
  // Dann DB-Liste prüfen
  for(const word of bannedWords) {
    if(lower.includes(word)) return word;
  }
  return null;
}

// ===== AKTIONEN =====
async function deleteMessage(msgId, reason, table = 'chat_messages') {
  const { error } = await sbAdmin.from(table).delete().eq('id', msgId);
  if(error) console.error('  ✗ Löschen fehlgeschlagen:', error.message);
  else      console.log (`  🗑  Nachricht gelöscht [${reason}] (${table})`);
}

async function muteUser(userId, username, minutes, reason) {
  const until = new Date(Date.now() + minutes * 60_000).toISOString();
  const { error } = await sbAdmin.from('chat_muted_users').upsert(
    { user_id: userId, muted_until: until, reason },
    { onConflict: 'user_id' }
  );
  if(error) console.error('  ✗ Muten fehlgeschlagen:', error.message);
  else      console.log (`  🔇 ${username} für ${minutes} Min. gemutet [${reason}]`);
}

// ===== NACHRICHT PRÜFEN =====
async function handleMessage(msg, table = 'chat_messages') {
  const text = msg.message?.trim();
  if(!text) return;

  // Verbotene Wörter alle 5 Min. neu laden
  if(Date.now() - bannedWordsLoaded > 5 * 60_000) await loadBannedWords();

  console.log(`📨 [${msg.username}]: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`);

  const result = await checkModeration(text);

  if(result) {
    // ---- OpenAI-Ergebnis verfügbar ----
    if(!result.flagged) { console.log(`   ✅ OK`); return; }

    const cats   = result.flaggedCats.join(', ');
    const score  = result.topScore ? ` (${(result.topScore * 100).toFixed(0)}%)` : '';
    const reason = `${result.topCategory}${score}`;
    console.log(`   🚨 Flagged: ${cats}`);

    await deleteMessage(msg.id, reason, table);
    if(result.flaggedCats.some(c => MUTE_CATEGORIES.has(c))) {
      await muteUser(msg.user_id, msg.username, MUTE_MINUTES, `Auto-Mute: ${reason}`);
    }
  } else {
    // ---- OpenAI nicht verfügbar → lokaler Wort-Filter ----
    const found = checkBannedWords(text);
    if(found) {
      console.log(`   🚨 Verbotenes Wort gefunden: "${found}" (lokaler Filter)`);
      await deleteMessage(msg.id, `verbotenes Wort: ${found}`, table);
    } else {
      console.log(`   ⚠  OpenAI nicht verfügbar, lokaler Filter: OK`);
    }
  }
}

// ===== BOT STATUS =====
let heartbeatTimer = null;

async function setOnline(online) {
  await sbAdmin.from('chat_bot_status').upsert({
    id: 1, is_online: online, last_seen: new Date().toISOString()
  });
  console.log(online ? '🟢 Status: Online' : '🔴 Status: Offline');
}

function startHeartbeat() {
  clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(async () => {
    await sbAdmin.from('chat_bot_status')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', 1);
  }, 30_000);
}

// ===== REALTIME =====
function connect() {
  console.log('🤖 ZockZone Chat-Moderator gestartet (OpenAI Moderation API)');
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log('');

  const channel = sbListen.channel('bot-mod')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'chat_messages'
    }, ({ new: msg }) => {
      handleMessage(msg, 'chat_messages').catch(e => console.error('Fehler:', e));
    })
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'room_messages'
    }, ({ new: msg }) => {
      handleMessage(msg, 'room_messages').catch(e => console.error('Fehler:', e));
    })
    .subscribe(async status => {
      if(status === 'SUBSCRIBED') {
        console.log('✅ Verbunden — überwache Chat + Räume in Echtzeit…\n');
        await setOnline(true);
        startHeartbeat();
        await loadBannedWords();
      }
      if(status === 'CLOSED') {
        clearInterval(heartbeatTimer);
        await setOnline(false);
        console.log('🔌 Verbindung getrennt, reconnect in 5s…');
        setTimeout(connect, 5000);
      }
      if(status === 'CHANNEL_ERROR') console.error('❌ Channel-Fehler');
    });

  async function shutdown() {
    clearInterval(heartbeatTimer);
    await setOnline(false);
    channel.unsubscribe();
    process.exit(0);
  }
  process.on('SIGINT',  shutdown);
  process.on('SIGTERM', shutdown);
}

connect();
