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

async function checkModeration(text) {
  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ input: text }),
    });

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

// ===== AKTIONEN =====
async function deleteMessage(msgId, reason) {
  const { error } = await sbAdmin.from('chat_messages').delete().eq('id', msgId);
  if(error) console.error('  ✗ Löschen fehlgeschlagen:', error.message);
  else      console.log (`  🗑  Nachricht gelöscht [${reason}]`);
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
async function handleMessage(msg) {
  const text = msg.message?.trim();
  if(!text) return;

  console.log(`📨 [${msg.username}]: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`);

  const result = await checkModeration(text);
  if(!result) return;

  if(!result.flagged) {
    console.log(`   ✅ OK`);
    return;
  }

  const cats   = result.flaggedCats.join(', ');
  const score  = result.topScore ? ` (${(result.topScore * 100).toFixed(0)}%)` : '';
  const reason = `${result.topCategory}${score}`;

  console.log(`   🚨 Flagged: ${cats}`);

  // Sollte gemutet werden? (schwerer Verstoß)
  const shouldMute = result.flaggedCats.some(c => MUTE_CATEGORIES.has(c));

  // Nachricht löschen
  await deleteMessage(msg.id, reason);

  // User muten
  if(shouldMute) {
    await muteUser(msg.user_id, msg.username, MUTE_MINUTES, `Auto-Mute: ${reason}`);
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
      handleMessage(msg).catch(e => console.error('Fehler:', e));
    })
    .subscribe(async status => {
      if(status === 'SUBSCRIBED') {
        console.log('✅ Verbunden — überwache Chat in Echtzeit…\n');
        await setOnline(true);
        startHeartbeat();
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
