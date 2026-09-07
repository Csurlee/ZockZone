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

const SUPABASE_URL       = process.env.SUPABASE_URL       || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const PERSPECTIVE_KEY    = process.env.PERSPECTIVE_API_KEY || '';
const TOXICITY_DELETE    = parseFloat(process.env.TOXICITY_DELETE || '0.85');
const TOXICITY_MUTE      = parseFloat(process.env.TOXICITY_MUTE   || '0.95');
const MUTE_MINUTES       = parseInt(process.env.MUTE_MINUTES      || '60');

if(!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !PERSPECTIVE_KEY) {
  console.error('❌  .env fehlt oder unvollständig. Bitte .env.example kopieren und ausfüllen.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// ===== PERSPECTIVE API =====
// Rate-limit: max 1 Request/Sekunde (Free Tier)
let lastCall = 0;
async function analyzeToxicity(text) {
  const wait = Math.max(0, 1050 - (Date.now() - lastCall));
  if(wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();

  const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${PERSPECTIVE_KEY}`;
  const body = {
    comment:         { text },
    languages:       ['de', 'en'],
    requestedAttributes: {
      TOXICITY:           {},
      INSULT:             {},
      THREAT:             {},
      SEXUALLY_EXPLICIT:  {},
    }
  };

  try {
    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    if(!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('⚠  Perspective API Fehler:', err?.error?.message || res.status);
      return null;
    }
    const data = await res.json();
    const scores = {};
    for(const [attr, val] of Object.entries(data.attributeScores || {})) {
      scores[attr] = val.summaryScore.value;
    }
    return scores;
  } catch(e) {
    console.warn('⚠  Perspective API nicht erreichbar:', e.message);
    return null;
  }
}

// ===== ACTIONS =====
async function deleteMessage(msgId, reason) {
  const { error } = await sb.from('chat_messages').delete().eq('id', msgId);
  if(error) console.error('  ✗ Löschen fehlgeschlagen:', error.message);
  else      console.log(`  ✓ Nachricht gelöscht [${reason}]`);
}

async function muteUser(userId, username, minutes, reason) {
  const until = new Date(Date.now() + minutes * 60_000).toISOString();
  const { error } = await sb.from('chat_muted_users').upsert(
    { user_id: userId, muted_until: until, reason },
    { onConflict: 'user_id' }
  );
  if(error) console.error('  ✗ Muten fehlgeschlagen:', error.message);
  else      console.log(`  ✓ ${username} für ${minutes} Min. stummgeschaltet [${reason}]`);
}

// ===== MESSAGE HANDLER =====
async function handleMessage(msg) {
  const text = msg.message?.trim();
  if(!text) return;

  console.log(`📨 [${msg.username}]: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`);

  const scores = await analyzeToxicity(text);
  if(!scores) return; // API nicht verfügbar, überspringen

  const maxScore    = Math.max(...Object.values(scores));
  const topAttr     = Object.entries(scores).sort((a,b) => b[1]-a[1])[0];
  const scoreStr    = Object.entries(scores)
    .map(([k,v]) => `${k.toLowerCase()}=${(v*100).toFixed(0)}%`)
    .join(' | ');

  console.log(`   ${scoreStr}`);

  if(maxScore >= TOXICITY_DELETE) {
    const reason = `${topAttr[0]} ${(topAttr[1]*100).toFixed(0)}%`;
    await deleteMessage(msg.id, reason);

    if(maxScore >= TOXICITY_MUTE) {
      await muteUser(msg.user_id, msg.username, MUTE_MINUTES, `Auto-Mute: ${reason}`);
    }
  }
}

// ===== REALTIME =====
function connect() {
  console.log('🤖 ZockZone Chat-Moderator gestartet');
  console.log(`   Löschen ab ${(TOXICITY_DELETE*100).toFixed(0)}% | Muten ab ${(TOXICITY_MUTE*100).toFixed(0)}%`);
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log('');

  const channel = sb.channel('bot-mod')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'chat_messages'
    }, ({ new: msg }) => {
      handleMessage(msg).catch(e => console.error('Fehler:', e));
    })
    .subscribe(status => {
      if(status === 'SUBSCRIBED') console.log('✅ Verbunden — überwache Chat…');
      if(status === 'CLOSED')     { console.log('🔌 Verbindung getrennt, reconnect in 5s…'); setTimeout(connect, 5000); }
      if(status === 'CHANNEL_ERROR') console.error('❌ Channel-Fehler');
    });

  // Graceful shutdown
  process.on('SIGINT',  () => { channel.unsubscribe(); process.exit(0); });
  process.on('SIGTERM', () => { channel.unsubscribe(); process.exit(0); });
}

connect();
