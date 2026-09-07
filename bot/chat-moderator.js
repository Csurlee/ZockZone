import { createClient } from '@supabase/supabase-js';
import { readFileSync, appendFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { resolve, dirname, join } from 'path';
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
const VIOLATION_LIMIT     = parseInt(process.env.VIOLATION_LIMIT     || '3');
const VIOLATION_WINDOW_H  = parseInt(process.env.VIOLATION_WINDOW_HOURS || '24');
const LOG_DIR             = process.env.LOG_DIR || '/var/log/zockzone-chat';
const LOG_RETAIN_DAYS     = 365;

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

// ===== LOGGING =====
function logDay() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
function logTime() {
  return new Date().toLocaleTimeString('de-DE', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function writeLog(line) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(join(LOG_DIR, `${logDay()}.log`), line + '\n', 'utf8');
  } catch(e) { console.warn('⚠  Log-Fehler:', e.message); }
}
function rotateLogs() {
  try {
    const cutoff = Date.now() - LOG_RETAIN_DAYS * 86_400_000;
    for(const f of readdirSync(LOG_DIR)) {
      if(!f.endsWith('.log')) continue;
      const fp = join(LOG_DIR, f);
      if(statSync(fp).mtimeMs < cutoff) { unlinkSync(fp); console.log(`🗑  Log rotiert: ${f}`); }
    }
  } catch {}
}

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

// ===== BOT-WARNUNG =====
const WARN_MSGS = {
  de: (u) => `🤖 @${u} — deine Nachricht wurde von unserem Moderations-Bot entfernt. Bitte achte auf einen respektvollen Umgangston. Dieser Chat wird moderiert.`,
  en: (u) => `🤖 @${u} — your message was removed by our moderation bot. Please keep a respectful tone. This chat is moderated.`,
};

async function sendBotWarning(userId, username, table = 'chat_messages') {
  if(!BOT_USER_ID) return;
  const { data } = await sbAdmin.from('profiles').select('lang').eq('id', userId).maybeSingle();
  const lang = data?.lang && WARN_MSGS[data.lang] ? data.lang : 'de';
  const message = WARN_MSGS[lang](username);
  const { error } = await sbAdmin.from(table).insert({
    user_id: BOT_USER_ID,
    username: '🤖 ModBot',
    avatar: 'ghost',
    message
  });
  if(error) console.warn('  ⚠  Bot-Warnung konnte nicht gesendet werden:', error.message);
  else      console.log (`  💬 Bot-Warnung gesendet [${lang}] an ${username}`);
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

async function recordViolation(userId, username, reason) {
  await sbAdmin.from('chat_violations').insert({ user_id: userId, username, reason });
}

async function checkAndBan(userId, username) {
  const since = new Date(Date.now() - VIOLATION_WINDOW_H * 3_600_000).toISOString();
  const { count } = await sbAdmin.from('chat_violations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);

  console.log(`  📊 Verstöße in den letzten ${VIOLATION_WINDOW_H}h: ${count}/${VIOLATION_LIMIT}`);

  if(count >= VIOLATION_LIMIT) {
    // Account endgültig löschen
    const { error } = await sbAdmin.auth.admin.deleteUser(userId);
    if(error) {
      console.error('  ✗ Account-Löschung fehlgeschlagen:', error.message);
      // Fallback: sperren
      await sbAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
    } else {
      console.log(`  🗑  ${username} (${userId}) GELÖSCHT nach ${count} Verstößen`);
      writeLog(`[${logTime()}] [SYSTEM] User GELÖSCHT: ${username} (${userId.slice(0,8)}) — ${count} Verstöße in ${VIOLATION_WINDOW_H}h`);
    }
    return true;
  }
  return false;
}

// ===== CLEANUP: inaktive + gesperrte User nach 90 Tagen löschen =====
const INACTIVE_DAYS = 90;

async function cleanupUsers() {
  const cutoff = new Date(Date.now() - INACTIVE_DAYS * 86_400_000).toISOString();
  let deleted = 0, page = 1;

  console.log(`🧹 Cleanup: prüfe inaktive/gesperrte User (>${INACTIVE_DAYS} Tage)…`);

  while(true) {
    const { data, error } = await sbAdmin.auth.admin.listUsers({ page, perPage: 100 });
    if(error) { console.warn('  ⚠  listUsers Fehler:', error.message); break; }
    const users = data?.users || [];
    if(!users.length) break;

    for(const u of users) {
      if(!u.created_at || new Date(u.created_at) > new Date(cutoff)) continue;

      // Nie eingeloggt (spam/verlassene Accounts)
      const neverLoggedIn = !u.last_sign_in_at;
      // Permanent gesperrt (banned_until weit in der Zukunft, > 1 Jahr)
      const permaBanned = u.banned_until &&
        new Date(u.banned_until) > new Date(Date.now() + 365 * 86_400_000);

      if(neverLoggedIn || permaBanned) {
        const reason = neverLoggedIn ? `inaktiv >${INACTIVE_DAYS}d` : `permanent gesperrt`;
        const { error: delErr } = await sbAdmin.auth.admin.deleteUser(u.id);
        if(!delErr) {
          deleted++;
          console.log(`  🗑  ${u.email} gelöscht (${reason})`);
          writeLog(`[${logTime()}] [SYSTEM] Cleanup: ${u.email} (${u.id.slice(0,8)}) gelöscht — ${reason}`);
        }
      }
    }

    if(users.length < 100) break;
    page++;
  }

  console.log(`✅ Cleanup: ${deleted} User gelöscht.`);
}

// ===== NACHRICHT PRÜFEN =====
async function handleMessage(msg, table = 'chat_messages') {
const text = msg.message?.trim();
  if(!text) return;

  // Verbotene Wörter alle 5 Min. neu laden
  if(Date.now() - bannedWordsLoaded > 5 * 60_000) await loadBannedWords();

  const src   = table === 'room_messages' ? 'RAUM ' : 'LOBBY';
  const logBase = `[${logTime()}] [${src}] ${msg.username} (${msg.user_id.slice(0,8)})`;

  console.log(`📨 [${msg.username}]: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`);

  const result = await checkModeration(text);

  if(result) {
    // ---- OpenAI-Ergebnis verfügbar ----
    if(!result.flagged) { writeLog(`${logBase}: "${text}"`); console.log(`   ✅ OK`); return; }

    const cats   = result.flaggedCats.join(', ');
    const score  = result.topScore ? ` (${(result.topScore * 100).toFixed(0)}%)` : '';
    const reason = `${result.topCategory}${score}`;
    console.log(`   🚨 Flagged: ${cats}`);

    writeLog(`${logBase}: "${text}"`);
    writeLog(`${logBase}: [🚨 MODERIERT: ${reason}] "${text}"`);
    await deleteMessage(msg.id, reason, table);
    await recordViolation(msg.user_id, msg.username, reason);
    const banned = await checkAndBan(msg.user_id, msg.username);
    if(!banned && result.flaggedCats.some(c => MUTE_CATEGORIES.has(c))) {
      await muteUser(msg.user_id, msg.username, MUTE_MINUTES, `Auto-Mute: ${reason}`);
    }
  } else {
    // ---- OpenAI nicht verfügbar → lokaler Wort-Filter ----
    const found = checkBannedWords(text);
    if(found) {
      console.log(`   🚨 Verbotenes Wort gefunden: "${found}" (lokaler Filter)`);
      writeLog(`${logBase}: "${text}"`);
      writeLog(`${logBase}: [🚨 MODERIERT: verbotenes Wort "${found}"] "${text}"`);
      await deleteMessage(msg.id, `verbotenes Wort: ${found}`, table);
      await recordViolation(msg.user_id, msg.username, `verbotenes Wort: ${found}`);
      await checkAndBan(msg.user_id, msg.username);
    } else {
      writeLog(`${logBase}: "${text}"`);
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
  rotateLogs();
  cleanupUsers();
  setInterval(cleanupUsers, 24 * 3_600_000); // täglich
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
