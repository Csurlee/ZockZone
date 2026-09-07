// Einmaliges Setup: Bot-User in Supabase erstellen + .env Anweisung ausgeben
// Ausführen mit: node setup-bot-user.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// Prüfen ob Bot-User schon existiert
const { data: existing } = await sb.auth.admin.listUsers();
const botEmail = 'modbot@zockzone.internal';
const existingBot = existing?.users?.find(u => u.email === botEmail);

if(existingBot) {
  console.log(`ℹ️  Bot-User existiert bereits: ${existingBot.id}`);
  console.log(`👉 Stelle sicher, dass .env enthält:`);
  console.log(`   BOT_USER_ID=${existingBot.id}`);
  process.exit(0);
}

// Bot-User erstellen
const { data, error } = await sb.auth.admin.createUser({
  email: botEmail,
  password: crypto.randomUUID(),
  email_confirm: true,
  user_metadata: { display_name: 'ModBot', avatar: 'ghost' }
});

if(error) {
  console.error('❌ Fehler:', error.message);
  process.exit(1);
}

const botId = data.user.id;

// Bot-Profil anlegen
await sb.from('profiles').upsert({
  id: botId,
  display_name: 'ModBot',
  avatar: 'ghost',
  role: 'moderator'
}, { onConflict: 'id' });

console.log(`✅ Bot-User erstellt!`);
console.log(`👉 Füge folgendes zur .env hinzu:`);
console.log(`   BOT_USER_ID=${botId}`);
