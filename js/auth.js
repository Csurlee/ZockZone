// ============ SUPABASE SETUP ============
const SUPABASE_URL = 'https://supabase.hackthelab.uk';
const SUPABASE_ANON_KEY = 'sb_publishable_rWR-Aesm3GyJxEnvrhcZ2M_ZmMoQWdB';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { t, getLang } from './i18n.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let authMode = 'login';
let authStep = 1;
let selectedAvatar = null;
let pendingSignup = null;
let currentUser = null;
let isReauthForDeletion = false;
let cachedProfileAvatar = null;
let captchaToken = null;

window.zzCaptchaOk    = (token) => { captchaToken = token; };
window.zzCaptchaReset = ()      => { captchaToken = null; };

const AVATARS = [
  { id: 'snake',     emoji: '🐍', labelKey: 'avatar.snake',     bg: '#14532d' },
  { id: 'alien',     emoji: '👾', labelKey: 'avatar.alien',     bg: '#3b0764' },
  { id: 'rocket',    emoji: '🚀', labelKey: 'avatar.rocket',    bg: '#172554' },
  { id: 'bomb',      emoji: '💣', labelKey: 'avatar.bomb',      bg: '#1c1917' },
  { id: 'dice',      emoji: '🎲', labelKey: 'avatar.dice',      bg: '#7c2d12' },
  { id: 'joker',     emoji: '🃏', labelKey: 'avatar.joker',     bg: '#1f2937' },
  { id: 'puzzle',    emoji: '🧩', labelKey: 'avatar.puzzle',    bg: '#0c4a6e' },
  { id: 'lightning', emoji: '⚡', labelKey: 'avatar.lightning', bg: '#713f12' },
  { id: 'ghost',     emoji: '👻', labelKey: 'avatar.ghost',     bg: '#2e1065' },
  { id: 'trophy',    emoji: '🏆', labelKey: 'avatar.trophy',    bg: '#78350f' },
];

function renderAvatarGrid(){
  const grid = document.getElementById('avatarGrid');
  grid.innerHTML = '';
  AVATARS.forEach(a => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'avatar-opt';
    el.dataset.avatarId = a.id;
    el.style.background = a.bg;
    el.innerHTML = `<span class="avatar-emoji">${a.emoji}</span><span class="avatar-label">${t(a.labelKey)}</span>`;
    el.onclick = () => window.zzSelectAvatar(a.id);
    grid.appendChild(el);
  });
  selectedAvatar = null;
}

function displayNameOf(user){
  return (user?.user_metadata?.display_name) || (user?.user_metadata?.full_name)
    || (user?.email ? user.email.split('@')[0] : t('player.default'));
}

function avatarEmojiOf(user){
  const id = user?.user_metadata?.avatar || cachedProfileAvatar;
  const av = AVATARS.find(a => a.id === id);
  return av ? av.emoji : '👤';
}

async function fetchAndCacheProfileAvatar(user){
  const { data } = await supabase.from('profiles').select('avatar').eq('id', user.id).maybeSingle();
  if(data?.avatar){
    cachedProfileAvatar = data.avatar;
    updateAccountUI(user);
  }
}

window.zzToggleAccount = () => {
  if(currentUser){ window.zzOpenProfile(); } else { window.zzOpenAuth(); }
};

window.zzOpenAuth = () => {
  window.zzSwitchTab('login');
  document.getElementById('authOverlay').classList.add('open');
};

window.zzOpenSignup = () => {
  window.zzSwitchTab('signup');
  document.getElementById('authOverlay').classList.add('open');
};

window.zzOpenProfile = async () => {
  if(!currentUser) return;
  const av = AVATARS.find(a => a.id === currentUser.user_metadata?.avatar);
  const bigEl = document.getElementById('profileAvatarBig');
  bigEl.textContent = av ? av.emoji : '👤';
  bigEl.style.background = av ? av.bg : '#241D3B';

  document.getElementById('profileName').value  = displayNameOf(currentUser);
  document.getElementById('profileEmail').value = currentUser.email || '';
  document.getElementById('profilePw').value    = '';
  document.getElementById('profilePw2').value   = '';
  document.getElementById('profileError').textContent   = '';
  document.getElementById('profileSuccess').textContent = '';

  const { data: prof } = await supabase.from('profiles')
    .select('hide_from_ranking, deletion_requested_at')
    .eq('id', currentUser.id).maybeSingle();
  document.getElementById('profileHide').checked = prof?.hide_from_ranking ?? false;

  const delWarning = document.getElementById('profileDeleteWarning');
  const delBtn = document.getElementById('profileDeleteBtn');
  const confirmBox = document.getElementById('profileDeleteConfirm');
  if(prof?.deletion_requested_at){
    const d = new Date(prof.deletion_requested_at);
    const deleteOn = new Date(d.getTime() + 10 * 24 * 60 * 60 * 1000);
    const opts = { day:'2-digit', month:'2-digit', year:'numeric' };
    const locale = t('date.locale');
    delWarning.innerHTML = t('profile.delete.warning', deleteOn.toLocaleDateString(locale, opts));
    delWarning.hidden = false;
    if(delBtn) delBtn.hidden = true;
    if(confirmBox) confirmBox.hidden = true;
  } else {
    delWarning.hidden = true;
    if(delBtn) delBtn.hidden = false;
    if(confirmBox) confirmBox.hidden = true;
  }

  renderProfileAvatarGrid(currentUser.user_metadata?.avatar || '');
  document.getElementById('profileOverlay').classList.add('open');
};
window.zzCloseProfile = () => document.getElementById('profileOverlay').classList.remove('open');

let profileSelectedAvatar = null;

function renderProfileAvatarGrid(currentId){
  const grid = document.getElementById('profileAvatarGrid');
  grid.innerHTML = '';
  profileSelectedAvatar = currentId || null;
  AVATARS.forEach(a => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'avatar-opt' + (a.id === currentId ? ' selected' : '');
    el.dataset.avatarId = a.id;
    el.style.background = a.bg;
    el.innerHTML = `<span class="avatar-emoji">${a.emoji}</span><span class="avatar-label">${t(a.labelKey)}</span>`;
    el.onclick = () => {
      profileSelectedAvatar = a.id;
      grid.querySelectorAll('.avatar-opt').forEach(b => b.classList.toggle('selected', b.dataset.avatarId === a.id));
      const bigEl = document.getElementById('profileAvatarBig');
      bigEl.textContent = a.emoji;
      bigEl.style.background = a.bg;
    };
    grid.appendChild(el);
  });
}

async function isNameTaken(name, excludeUserId = null){
  let q = supabase.from('profiles').select('id').ilike('display_name', name).limit(1);
  if(excludeUserId) q = q.neq('id', excludeUserId);
  const { data } = await q;
  return (data ?? []).length > 0;
}

window.zzSaveProfile = async () => {
  const errEl     = document.getElementById('profileError');
  const successEl = document.getElementById('profileSuccess');
  errEl.textContent     = '';
  successEl.textContent = '';

  const name   = document.getElementById('profileName').value.trim();
  const email  = document.getElementById('profileEmail').value.trim();
  const pw     = document.getElementById('profilePw').value;
  const pw2    = document.getElementById('profilePw2').value;

  if(!name)  { errEl.textContent = t('err.name.empty'); return; }
  if(!email) { errEl.textContent = t('err.email.empty'); return; }
  if(pw && pw.length < 6)  { errEl.textContent = t('err.pw.short'); return; }
  if(pw && pw !== pw2)     { errEl.textContent = t('err.pw.mismatch'); return; }

  if(name !== displayNameOf(currentUser)){
    if(await isNameTaken(name, currentUser.id)){ errEl.textContent = t('err.name.taken'); return; }
  }

  const updates = { data: { display_name: name, avatar: profileSelectedAvatar || currentUser.user_metadata?.avatar || '' } };
  if(email !== currentUser.email)  updates.email    = email;
  if(pw)                           updates.password = pw;

  try{
    const { error } = await supabase.auth.updateUser(updates);
    if(error) throw error;

    const hideFromRanking = document.getElementById('profileHide').checked;
    await supabase.from('profiles').update({
      display_name: name,
      email: email,
      hide_from_ranking: hideFromRanking,
    }).eq('id', currentUser.id);

    successEl.textContent = t('profile.saved');
    setTimeout(() => { successEl.textContent = ''; }, 2500);
  } catch(e){
    errEl.textContent = t('err.prefix') + e.message;
  }
};
window.zzCloseAuth = () => {
  document.getElementById('authOverlay').classList.remove('open');
  document.getElementById('authStep3').style.display = 'none';
  document.getElementById('authStep1').style.display = '';
  document.getElementById('authStep2').style.display = 'none';
};
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
  document.getElementById('signupPw2Wrap').style.display    = isSignup ? '' : 'none';
  document.getElementById('turnstileWrap').style.display    = isSignup ? 'flex' : 'none';
  document.getElementById('authSubmitBtn').textContent = isSignup ? t('auth.btn.next') : t('auth.btn.login');
  document.getElementById('authStep1').style.display = '';
  document.getElementById('authStep2').style.display = 'none';
  document.getElementById('authStep3').style.display = 'none';
  captchaToken = null;
  if(!isSignup && typeof turnstile !== 'undefined') turnstile.reset('#turnstileWidget');
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
    if(!email || !pw){ errEl.textContent = t('err.fill.email.pw'); return; }
    try{
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if(error) throw error;
      window.zzCloseAuth();
    } catch(e){
      errEl.textContent = translateAuthError(e.message);
    }
    return;
  }

  const name  = document.getElementById('authName').value.trim();
  const email = document.getElementById('authEmail').value.trim();
  const pw    = document.getElementById('authPassword').value;
  const pw2   = document.getElementById('authPassword2').value;
  if(!name)            { errEl.textContent = t('err.fill.name'); return; }
  if(!email)           { errEl.textContent = t('err.fill.email'); return; }
  if(!pw)              { errEl.textContent = t('err.fill.pw'); return; }
  if(pw.length < 6)    { errEl.textContent = t('err.pw.short'); return; }
  if(pw !== pw2)       { errEl.textContent = t('err.pw.mismatch'); return; }
  if(!captchaToken)    { errEl.textContent = t('err.captcha'); return; }

  try{
    const r = await fetch('/captcha-verify.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: captchaToken })
    });
    const result = await r.json();
    if(!result.ok){
      errEl.textContent = t('err.captcha.invalid');
      captchaToken = null;
      if(typeof turnstile !== 'undefined') turnstile.reset('#turnstileWidget');
      return;
    }
  } catch{
    errEl.textContent = t('err.captcha.failed');
    return;
  }

  if(await isNameTaken(name)){ errEl.textContent = t('err.name.taken'); return; }

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
  if(!selectedAvatar){ errEl.textContent = t('err.avatar'); return; }
  try{
    const { data, error } = await supabase.auth.signUp({
      email: pendingSignup.email,
      password: pendingSignup.password,
      options: { data: { display_name: pendingSignup.name, avatar: selectedAvatar } }
    });
    if(error) throw error;
    if(data.session) {
      // Auto-confirm aktiv: direkt einloggen
      if(data.user) await ensureProfile(data.user);
      window.zzCloseAuth();
    } else {
      // E-Mail-Bestätigung erforderlich
      if(data.user) await ensureProfile(data.user);
      document.getElementById('authStep2').style.display = 'none';
      document.getElementById('authStep3').style.display = '';
      document.getElementById('authConfirmEmail').textContent = pendingSignup.email;
    }
  } catch(e){
    errEl.textContent = translateAuthError(e.message);
    window.zzBackToStep1();
  }
};

window.zzLogOut = () => supabase.auth.signOut();

window.zzShowDeleteConfirm = () => {
  document.getElementById('profileDeleteConfirm').hidden = false;
  document.getElementById('profileDeleteBtn').hidden = true;
  document.getElementById('profileDeletePw').value = '';
  document.getElementById('profileDeleteError').textContent = '';
  document.getElementById('profileDeletePw').focus();
};

window.zzHideDeleteConfirm = () => {
  document.getElementById('profileDeleteConfirm').hidden = true;
  document.getElementById('profileDeleteBtn').hidden = false;
  document.getElementById('profileDeleteError').textContent = '';
};

window.zzRequestDeletion = async () => {
  if(!currentUser) return;
  const pw = document.getElementById('profileDeletePw').value;
  const errEl = document.getElementById('profileDeleteError');
  errEl.textContent = '';

  if(!pw){ errEl.textContent = t('err.pw.enter'); return; }

  isReauthForDeletion = true;
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: currentUser.email,
    password: pw
  });
  isReauthForDeletion = false;

  if(authErr){ errEl.textContent = t('err.pw.wrong'); return; }

  try{
    const now = new Date().toISOString();
    const { error } = await supabase.from('profiles')
      .update({ deletion_requested_at: now })
      .eq('id', currentUser.id);
    if(error) throw error;
    document.getElementById('profileDeleteConfirm').hidden = true;
    await window.zzOpenProfile();
  } catch(e){
    errEl.textContent = t('err.prefix') + e.message;
  }
};

function showDeletionCancelledNotice(){
  let toast = document.getElementById('zzToast');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'zzToast';
    document.body.appendChild(toast);
  }
  toast.textContent = t('toast.deletion.cancelled');
  toast.className = 'zz-toast zz-toast-show';
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => { toast.className = 'zz-toast'; }, 4000);
}

window.zzCancelDeletion = async () => {
  if(!currentUser) return;
  const errEl = document.getElementById('profileError');
  errEl.textContent = '';
  try{
    const { error } = await supabase.from('profiles')
      .update({ deletion_requested_at: null })
      .eq('id', currentUser.id);
    if(error) throw error;
    await window.zzOpenProfile();
  } catch(e){
    errEl.textContent = t('err.prefix') + e.message;
  }
};

function translateAuthError(msg){
  if(msg.includes('User already registered')) return t('authErr.already_registered');
  if(msg.includes('Invalid login credentials')) return t('authErr.invalid_credentials');
  if(msg.includes('Password should be at least 6 characters')) return t('authErr.pw_too_short');
  if(msg.includes('Unable to validate email address')) return t('authErr.invalid_email');
  return t('err.prefix') + msg;
}

function updateAccountUI(user){
  const changed = currentUser?.id !== user?.id;
  currentUser = user;
  const btn = document.getElementById('accountBtn');
  const signupBtn = document.getElementById('signupBtn');
  if(user){
    btn.textContent = avatarEmojiOf(user) + ' ' + displayNameOf(user);
    if(signupBtn) signupBtn.hidden = true;
  } else {
    btn.textContent = t('header.login');
    if(signupBtn) signupBtn.hidden = false;
  }
  if(changed) window.dispatchEvent(new Event('zz:auth-changed'));
}

window.zzIsLoggedIn = () => !!currentUser;

supabase.auth.onAuthStateChange((event, session) => {
  const user = session?.user || null;
  if(!user) cachedProfileAvatar = null;
  updateAccountUI(user);
  if(event === 'SIGNED_IN' && user){
    ensureProfile(user);
    if(!user.user_metadata?.avatar) fetchAndCacheProfileAvatar(user);
    if(!isReauthForDeletion){
      supabase.from('profiles')
        .select('deletion_requested_at')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if(data?.deletion_requested_at){
            supabase.from('profiles')
              .update({ deletion_requested_at: null })
              .eq('id', user.id)
              .then(() => showDeletionCancelledNotice());
          }
        });
    }
  }
});
supabase.auth.getSession().then(({ data }) => {
  const user = data.session?.user || null;
  updateAccountUI(user);
  if(user && !user.user_metadata?.avatar) fetchAndCacheProfileAvatar(user);
});

window.addEventListener('zz:lang-changed', () => {
  updateAccountUI(currentUser);
  const submitBtn = document.getElementById('authSubmitBtn');
  if(submitBtn) submitBtn.textContent = authMode === 'signup' ? t('auth.btn.next') : t('auth.btn.login');
});

// ============ GAME VISIBILITY ============
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
  } catch(e){ /* treat as enabled */ }
  window.dispatchEvent(new Event('zz:visibility-updated'));
}
refreshGameVisibility();

// ============ HIGHSCORES ============
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
  } catch(e){ console.warn('Highscore save failed:', e.message); }
};

// ============ RANGLISTE ============
window.zzOpenRanking = async () => {
  document.getElementById('rankingOverlay').classList.add('open');
  const content = document.getElementById('rankingContent');
  content.innerHTML = `<div class="ranking-loading">${t('ranking.loading')}</div>`;

  try{
    const [{ data: scores }, { data: profiles }] = await Promise.all([
      supabase.from('highscores').select('user_id, game_id, score'),
      supabase.from('profiles').select('id, display_name, avatar, hide_from_ranking').eq('active', true),
    ]);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    const userStats = {};
    (scores || []).forEach(s => {
      if(!userStats[s.user_id]) userStats[s.user_id] = { count: 0, total: 0 };
      userStats[s.user_id].count++;
      userStats[s.user_id].total += s.score;
    });

    const ranked = Object.entries(userStats)
      .map(([uid, stats]) => ({ uid, ...stats, profile: profileMap[uid] || null }))
      .filter(u => u.profile)
      .sort((a, b) => b.count - a.count || b.total - a.total);

    if(ranked.length === 0){
      content.innerHTML = `<div class="ranking-empty">${t('ranking.empty')}</div>`;
      return;
    }

    const medals = ['🥇','🥈','🥉'];
    content.innerHTML = '';
    ranked.forEach((u, i) => {
      const hidden = u.profile.hide_from_ranking;
      const av = AVATARS.find(a => a.id === u.profile.avatar);
      const row = document.createElement('div');
      row.className = 'ranking-row';
      row.innerHTML = `
        <span class="ranking-rank">${medals[i] || (i+1) + '.'}</span>
        <span class="ranking-avatar">${hidden ? '👻' : (av ? av.emoji : '👤')}</span>
        <div class="ranking-info">
          <div class="ranking-name">${hidden ? t('ranking.anonymous') : escapeHtml(u.profile.display_name || t('ranking.player'))}</div>
          <div class="ranking-sub">${t('ranking.games', u.count)}</div>
        </div>
        <span class="ranking-score">${u.total.toLocaleString(t('score.locale'))}</span>
      `;
      content.appendChild(row);
    });
  } catch(e){
    content.innerHTML = `<div class="ranking-empty">${t('ranking.error')}</div>`;
  }
};
window.zzCloseRanking = () => document.getElementById('rankingOverlay').classList.remove('open');

function escapeHtml(str){ return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

window.zzShowLeaderboard = async (gameId, gameTitle, containerEl) => {
  containerEl.innerHTML = `<div class="hs-row">${t('leaderboard.loading')}</div>`;
  try{
    const { data, error } = await supabase
      .from('highscores')
      .select('display_name, score')
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .limit(10);
    if(error) throw error;
    if(!data || data.length===0){ containerEl.innerHTML = `<div class="hs-row">${t('leaderboard.empty')}</div>`; return; }
    containerEl.innerHTML = '';
    data.forEach((row, i) => {
      const el = document.createElement('div');
      el.className='hs-row';
      el.innerHTML = `<span>${i+1}. ${row.display_name}</span><b>${row.score}</b>`;
      containerEl.appendChild(el);
    });
  } catch(e){
    containerEl.innerHTML = `<div class="hs-row">${t('leaderboard.error')}</div>`;
  }
};
