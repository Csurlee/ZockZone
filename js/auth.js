// ============ SUPABASE SETUP ============
// Self-hosted Supabase, reachable via the Cloudflare Tunnel at supabase.hackthelab.uk
// (intentionally not the internal 10.0.10.10 address -- that only works from the home LAN).
const SUPABASE_URL = 'https://supabase.hackthelab.uk';
const SUPABASE_ANON_KEY = 'sb_publishable_rWR-Aesm3GyJxEnvrhcZ2M_ZmMoQWdB';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let authMode = 'login'; // 'login' | 'signup'
let authStep = 1;       // 1 = Zugangsdaten, 2 = Avatar
let selectedAvatar = null;
let pendingSignup = null; // { email, password, name }
let currentUser = null;

const AVATARS = [
  { id: 'snake',    emoji: '🐍', label: 'Snake',    bg: '#14532d' },
  { id: 'alien',    emoji: '👾', label: 'Alien',    bg: '#3b0764' },
  { id: 'rocket',   emoji: '🚀', label: 'Rakete',   bg: '#172554' },
  { id: 'bomb',     emoji: '💣', label: 'Bombe',    bg: '#1c1917' },
  { id: 'dice',     emoji: '🎲', label: 'Würfel',   bg: '#7c2d12' },
  { id: 'joker',    emoji: '🃏', label: 'Joker',    bg: '#1f2937' },
  { id: 'puzzle',   emoji: '🧩', label: 'Puzzle',   bg: '#0c4a6e' },
  { id: 'lightning',emoji: '⚡', label: 'Blitz',    bg: '#713f12' },
  { id: 'ghost',    emoji: '👻', label: 'Geist',    bg: '#2e1065' },
  { id: 'trophy',   emoji: '🏆', label: 'Champ',    bg: '#78350f' },
];

function renderAvatarGrid(){
  const grid = document.getElementById('avatarGrid');
  grid.innerHTML = '';
  AVATARS.forEach(a => {
    const el = document.createElement('div');
    el.className = 'avatar-opt';
    el.dataset.avatarId = a.id;
    el.style.background = a.bg;
    el.innerHTML = `<span class="avatar-emoji">${a.emoji}</span><span class="avatar-label">${a.label}</span>`;
    el.onclick = () => window.zzSelectAvatar(a.id);
    grid.appendChild(el);
  });
  selectedAvatar = null;
}

function displayNameOf(user){
  return (user?.user_metadata?.display_name) || (user?.user_metadata?.full_name)
    || (user?.email ? user.email.split('@')[0] : 'Spieler');
}

function avatarEmojiOf(user){
  const av = AVATARS.find(a => a.id === user?.user_metadata?.avatar);
  return av ? av.emoji : '👤';
}

window.zzOpenAuth = () => {
  if(currentUser){ zzLogOut(); return; }
  window.zzSwitchTab('login');
  document.getElementById('authOverlay').classList.add('open');
};
window.zzCloseAuth = () => document.getElementById('authOverlay').classList.remove('open');
window.zzSwitchTab = (mode) => {
  authMode = mode;
  authStep = 1;
  selectedAvatar = null;
  pendingSignup = null;
  document.getElementById('tabLogin').classList.toggle('active', mode==='login');
  document.getElementById('tabSignup').classList.toggle('active', mode==='signup');
  document.getElementById('authError').textContent = '';

  const isSignup = mode === 'signup';
  document.getElementById('signupOnlyFields').style.display = isSignup ? '' : 'none';
  document.getElementById('signupPw2Wrap').style.display = isSignup ? '' : 'none';
  document.getElementById('authSubmitBtn').textContent = isSignup ? 'Weiter →' : 'Einloggen';
  document.getElementById('authStep1').style.display = '';
  document.getElementById('authStep2').style.display = 'none';
};

async function ensureProfile(user){
  const { data } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if(!data){
    await supabase.from('profiles').insert({
      id: user.id,
      email: user.email || '',
      display_name: displayNameOf(user)
    });
  }
}

window.zzSubmitAuth = async () => {
  const errEl = document.getElementById('authError');
  errEl.textContent = '';

  if(authMode === 'login'){
    const email = document.getElementById('authEmail').value.trim();
    const pw = document.getElementById('authPassword').value;
    if(!email || !pw){ errEl.textContent = 'Bitte E-Mail und Passwort ausfüllen.'; return; }
    try{
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if(error) throw error;
      window.zzCloseAuth();
    } catch(e){
      errEl.textContent = translateAuthError(e.message);
    }
    return;
  }

  // Signup: Schritt 1 — Felder validieren, dann zu Avatar-Auswahl wechseln
  const name  = document.getElementById('authName').value.trim();
  const email = document.getElementById('authEmail').value.trim();
  const pw    = document.getElementById('authPassword').value;
  const pw2   = document.getElementById('authPassword2').value;
  if(!name)            { errEl.textContent = 'Bitte einen Anzeigenamen eingeben.'; return; }
  if(!email)           { errEl.textContent = 'Bitte E-Mail ausfüllen.'; return; }
  if(!pw)              { errEl.textContent = 'Bitte Passwort ausfüllen.'; return; }
  if(pw.length < 6)    { errEl.textContent = 'Passwort muss mindestens 6 Zeichen haben.'; return; }
  if(pw !== pw2)       { errEl.textContent = 'Passwörter stimmen nicht überein.'; return; }

  pendingSignup = { email, password: pw, name };
  renderAvatarGrid();
  document.getElementById('authStep1').style.display = 'none';
  document.getElementById('authStep2').style.display = '';
};

window.zzBackToStep1 = () => {
  document.getElementById('authStep2').style.display = 'none';
  document.getElementById('authStep1').style.display = '';
  document.getElementById('authError').textContent = '';
};

window.zzSelectAvatar = (id) => {
  selectedAvatar = id;
  document.querySelectorAll('.avatar-opt').forEach(el => {
    el.classList.toggle('selected', el.dataset.avatarId === id);
  });
};

window.zzConfirmSignup = async () => {
  const errEl = document.getElementById('authError');
  errEl.textContent = '';
  if(!selectedAvatar){ errEl.textContent = 'Bitte einen Avatar auswählen.'; return; }
  try{
    const { data, error } = await supabase.auth.signUp({
      email: pendingSignup.email,
      password: pendingSignup.password,
      options: { data: { display_name: pendingSignup.name, avatar: selectedAvatar } }
    });
    if(error) throw error;
    if(data.user) await ensureProfile(data.user);
    window.zzCloseAuth();
  } catch(e){
    errEl.textContent = translateAuthError(e.message);
    window.zzBackToStep1();
  }
};

window.zzLogOut = () => supabase.auth.signOut();

function translateAuthError(msg){
  const map = {
    'User already registered': 'Diese E-Mail ist schon registriert. Wechsle zu Login.',
    'Invalid login credentials': 'E-Mail oder Passwort falsch.',
    'Password should be at least 6 characters': 'Passwort muss mindestens 6 Zeichen haben.',
    'Unable to validate email address: invalid format': 'Ungültige E-Mail-Adresse.'
  };
  return map[msg] || ('Fehler: ' + msg);
}

function updateAccountUI(user){
  const changed = currentUser?.id !== user?.id;
  currentUser = user;
  const btn = document.getElementById('accountBtn');
  if(user){
    btn.textContent = avatarEmojiOf(user) + ' ' + displayNameOf(user) + ' · Logout';
  } else {
    btn.textContent = '👤 Login';
  }
  if(changed) window.dispatchEvent(new Event('zz:auth-changed'));
}

window.zzIsLoggedIn = () => !!currentUser;

supabase.auth.onAuthStateChange((event, session) => {
  const user = session?.user || null;
  updateAccountUI(user);
  if(event === 'SIGNED_IN' && user) ensureProfile(user);
});
supabase.auth.getSession().then(({ data }) => updateAccountUI(data.session?.user || null));

// ============ GAME VISIBILITY (guest vs. registered) ============
// Backed by the `games` table, managed from the admin panel. Missing/failed data
// is treated as "everything enabled" downstream (see core.js's gameLockState) so
// the catalog never breaks if this table is empty or unreachable.
window.zzGameVisibility = {};

async function refreshGameVisibility(){
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/games?select=id,enabled_guest,enabled_registered`, {
      headers: { apikey: SUPABASE_ANON_KEY }
    });
    if(!res.ok) return;
    const rows = await res.json();
    const map = {};
    rows.forEach(r => { map[r.id] = { enabled_guest: r.enabled_guest, enabled_registered: r.enabled_registered }; });
    window.zzGameVisibility = map;
  } catch(e){ /* keep whatever we had (possibly empty) -- missing data means "enabled" */ }
  window.dispatchEvent(new Event('zz:visibility-updated'));
}
refreshGameVisibility();

// ============ HIGHSCORES (Supabase/Postgres) ============
// Aktuell angebunden an: Snake, 2048, Flappy Block, Runner Jump, Space Invaders
window.zzSaveHighScore = async (gameId, gameTitle, score) => {
  if(!currentUser || !score || score<=0) return;
  try{
    const { data: existing } = await supabase
      .from('highscores')
      .select('score')
      .eq('user_id', currentUser.id)
      .eq('game_id', gameId)
      .maybeSingle();
    if(!existing || score > existing.score){
      await supabase.from('highscores').upsert({
        user_id: currentUser.id,
        game_id: gameId,
        game_title: gameTitle,
        display_name: displayNameOf(currentUser),
        score,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,game_id' });
    }
  } catch(e){ console.warn('Highscore konnte nicht gespeichert werden:', e.message); }
};

window.zzShowLeaderboard = async (gameId, gameTitle, containerEl) => {
  containerEl.innerHTML = '<div class="hs-row">Lade Bestenliste…</div>';
  try{
    const { data, error } = await supabase
      .from('highscores')
      .select('display_name, score')
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .limit(10);
    if(error) throw error;
    if(!data || data.length===0){ containerEl.innerHTML = '<div class="hs-row">Noch keine Einträge. Sei der/die Erste!</div>'; return; }
    containerEl.innerHTML = '';
    data.forEach((row, i) => {
      const el = document.createElement('div');
      el.className='hs-row';
      el.innerHTML = `<span>${i+1}. ${row.display_name}</span><b>${row.score}</b>`;
      containerEl.appendChild(el);
    });
  } catch(e){
    containerEl.innerHTML = '<div class="hs-row">Bestenliste konnte nicht geladen werden. (RLS-Policies geprüft?)</div>';
  }
};
