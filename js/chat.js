import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { t, getLang } from './i18n.js';

const SUPABASE_URL = 'https://supabase.hackthelab.uk';
const SUPABASE_ANON_KEY = 'sb_publishable_rWR-Aesm3GyJxEnvrhcZ2M_ZmMoQWdB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AVATAR_MAP = {
  snake:'🐍', alien:'👾', rocket:'🚀', bomb:'💣',
  dice:'🎲', joker:'🃏', puzzle:'🧩', lightning:'⚡',
  ghost:'👻', trophy:'🏆'
};
// icon shown next to avatar, visible to everyone
const ROLE_ICON  = { moderator:'🛡', admin:'⚡' };
const ROLE_LABEL = { moderator:'MOD', admin:'ADMIN' };

let currentUser   = null;
let currentRole   = 'user';
let staffMap      = new Map(); // userId → role  ('moderator' | 'admin')
let privacySet    = new Set(); // userIds die hide_from_ranking=true haben
let friendSet     = new Set(); // userId von akzeptierten Freunden
let sentSet       = new Set(); // userId zu denen Anfrage gesendet wurde
let mySentIds     = new Set(); // IDs eigener gesendeter Nachrichten (für Moderations-Erkennung)
let realtimeChannel = null;
let isOpen        = false;
let unread        = 0;

// ===== SOUND =====
let soundEnabled = localStorage.getItem('zzChatSound') !== 'off';

function playDing() {
  if(!soundEnabled) return;
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
  } catch(e) {}
}

window.toggleChatSound = function() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('zzChatSound', soundEnabled ? 'on' : 'off');
  const btn = document.getElementById('chatSoundBtn');
  if(btn) btn.textContent = soundEnabled ? '🔔' : '🔕';
};

// ===== MODERATION =====
let bannedWords   = [];
let msgTimestamps = [];
const RATE_LIMIT  = 5;
const RATE_WINDOW = 10000;

async function loadProfile() {
  if(!currentUser) return;
  const { data } = await sb.from('profiles')
    .select('role').eq('id', currentUser.id).maybeSingle();
  currentRole = data?.role || 'user';
}

async function loadStaffMap() {
  const { data } = await sb.from('profiles')
    .select('id,role').in('role',['moderator','admin']);
  staffMap = new Map((data||[]).map(p=>[p.id, p.role]));
}

async function loadPrivacySet() {
  const { data } = await sb.from('profiles')
    .select('id').eq('hide_from_ranking', true);
  privacySet = new Set((data||[]).map(p => p.id));
}

function maskName(name) {
  if(!name) return '???';
  return name.slice(0, 3) + '****';
}

async function loadFriendSet() {
  if(!currentUser) return;
  const { data } = await sb.from('friendships')
    .select('requester_id,addressee_id,status')
    .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);
  friendSet.clear(); sentSet.clear();
  for(const f of (data||[])) {
    const other = f.requester_id === currentUser.id ? f.addressee_id : f.requester_id;
    if(f.status === 'accepted') friendSet.add(other);
    if(f.status === 'pending' && f.requester_id === currentUser.id) sentSet.add(other);
  }
}

async function loadBannedWords() {
  const { data } = await sb.from('chat_banned_words').select('word');
  if(data) bannedWords = data.map(r => r.word.toLowerCase());
}

async function checkMuted() {
  if(!currentUser) return false;
  const { data } = await sb.from('chat_muted_users')
    .select('muted_until').eq('user_id', currentUser.id).maybeSingle();
  if(!data) return false;
  return new Date(data.muted_until) > new Date();
}

function filterMessage(text) {
  if(!bannedWords.length) return text;
  let result = text;
  for(const word of bannedWords) {
    const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi');
    result = result.replace(re, m => '★'.repeat(m.length));
  }
  return result;
}

function isRateLimited() {
  const now = Date.now();
  msgTimestamps = msgTimestamps.filter(t => now - t < RATE_WINDOW);
  return msgTimestamps.length >= RATE_LIMIT;
}

const isMod = () => currentRole === 'moderator' || currentRole === 'admin';

// ===== UI =====
const $ = id => document.getElementById(id);
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const avatarOf = av => AVATAR_MAP[av] || '👤';

function timeAgo(iso){
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if(m < 1) return 'jetzt';
  if(m < 60) return `${m}m`;
  const h = Math.floor(m/60);
  if(h < 24) return `${h}h`;
  return `${Math.floor(h/24)}d`;
}

function appendMsg(msg){
  if($('chatMsg-' + msg.id)) return;

  const role    = staffMap.get(msg.user_id) || null;
  const isOwn   = msg.user_id === currentUser?.id;
  const effectiveRole = isOwn && currentRole !== 'user' ? currentRole : role;

  // Name: maskieren wenn hide_from_ranking && kein Mod/Admin && nicht eigene Nachricht
  const isPrivate    = privacySet.has(msg.user_id);
  const canSeeFull   = isMod() || isOwn;
  const displayName  = (isPrivate && !canSeeFull) ? maskName(msg.username) : msg.username;

  // Avatar with role-badge overlay
  const avBadge = effectiveRole
    ? `<span class="chat-av-badge chat-av-badge--${effectiveRole}" title="${ROLE_LABEL[effectiveRole]}">${ROLE_ICON[effectiveRole]}</span>`
    : '';
  const avWrap =
    `<div class="chat-av-wrap">` +
      `<span class="chat-av">${avatarOf(msg.avatar)}</span>` +
      avBadge +
    `</div>`;

  // Stern für Freunde
  const isFriend = !isOwn && friendSet.has(msg.user_id);
  const starBadge = isFriend ? `<span class="chat-friend-star" title="Freund">⭐</span>` : '';

  // Freund hinzufügen Button (nur für eingeloggte User, fremde Nachrichten, noch kein Freund/Anfrage)
  let addFriendBtn = '';
  if(currentUser && !isOwn && !isFriend && !sentSet.has(msg.user_id)) {
    addFriendBtn = `<button class="chat-add-friend-btn" id="chatFriend-${msg.user_id}"
      title="${t('chat.friend.add.title')}"
      onclick="zzChatAddFriend('${msg.user_id}',this)">+</button>`;
  } else if(currentUser && !isOwn && sentSet.has(msg.user_id)) {
    addFriendBtn = `<button class="chat-add-friend-btn sent" disabled title="${t('chat.friend.sent.label')}">⏳</button>`;
  }

  // Mod action buttons — only for mods/admins viewing other users' messages
  const modBtns = (isMod() && !isOwn)
    ? `<div class="chat-mod-btns">
        <button class="chat-mod-btn" title="${t('chat.mod.mute.title')}"
                onclick="zzChatMuteUser('${msg.user_id}','${esc(msg.username)}',this)">🔇</button>
        <button class="chat-mod-btn chat-del-btn" title="${t('chat.mod.del.title')}"
                onclick="zzChatDeleteMsg('${msg.id}',this)">🗑</button>
       </div>`
    : '';

  const el = document.createElement('div');
  el.className = 'chat-msg';
  el.id = 'chatMsg-' + msg.id;
  el.innerHTML =
    avWrap +
    `<div class="chat-body">` +
      `<span class="chat-name">${esc(displayName)}</span>` +
      starBadge +
      `<span class="chat-time">${timeAgo(msg.created_at)}</span>` +
      `<p class="chat-text">${esc(msg.message)}</p>` +
    `</div>` +
    addFriendBtn +
    modBtns;
  const list = $('chatMessages');
  list.appendChild(el);
  list.scrollTop = list.scrollHeight;

  // Sound für neue Nachrichten von anderen
  if(!isOwn) playDing();
}

function removeMsg(id){
  const el = $('chatMsg-' + id);
  if(el){
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }
}

function showChatNotice(text, isError = false) {
  const notice = document.createElement('div');
  notice.className = 'chat-notice' + (isError ? ' chat-notice-err' : '');
  notice.textContent = text;
  const list = $('chatMessages');
  list.appendChild(notice);
  list.scrollTop = list.scrollHeight;
  setTimeout(() => notice.remove(), 4000);
}

async function loadMessages(){
  const { data } = await sb.from('chat_messages')
    .select('*').order('created_at',{ascending:false}).limit(50);
  if(!data) return;
  $('chatMessages').innerHTML = '';
  [...data].reverse().forEach(appendMsg);
  $('chatMessages').scrollTop = $('chatMessages').scrollHeight;
}

function subscribeRealtime(){
  if(realtimeChannel) return;
  realtimeChannel = sb.channel('chat-room')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},
      ({new: msg}) => {
        appendMsg(msg);
        if(!isOpen){ unread++; updateBadge(); }
      })
    .on('postgres_changes',{event:'DELETE',schema:'public',table:'chat_messages'},
      ({old}) => {
        removeMsg(old.id);
        if(mySentIds.has(old.id)) {
          mySentIds.delete(old.id);
          showChatNotice(t('chat.notice.moderated'), true);
        }
      })
    .subscribe();
}

function updateBadge(){
  const b = $('chatBadge');
  if(!b) return;
  b.textContent = unread > 9 ? '9+' : unread;
  b.hidden = unread === 0;
}

// ===== MOD ACTIONS FROM CHAT =====
window.zzChatDeleteMsg = async (id, btn) => {
  btn.disabled = true;
  const { error } = await sb.from('chat_messages').delete().eq('id', id);
  if(error){ btn.disabled = false; showChatNotice(t('chat.del.error'), true); }
};

// Simple inline mute popup
window.zzChatMuteUser = (userId, username, btn) => {
  // Remove existing popup
  document.getElementById('chatMutePopup')?.remove();

  const opts = [
    {v:10,   k:'chat.mute.10min'},
    {v:60,   k:'chat.mute.1h'},
    {v:360,  k:'chat.mute.6h'},
    {v:1440, k:'chat.mute.24h'},
    {v:10080,k:'chat.mute.7d'},
  ];
  const pop = document.createElement('div');
  pop.id = 'chatMutePopup';
  pop.className = 'chat-mute-popup';
  pop.innerHTML =
    `<div class="chat-mute-popup-title">${t('chat.mute.title', esc(username))}</div>` +
    opts.map(o =>
      `<button class="chat-mute-dur-btn" data-v="${o.v}" data-k="${o.k}">${t(o.k)}</button>`
    ).join('') +
    `<button class="chat-mute-cancel">${t('chat.mute.cancel')}</button>`;

  pop.querySelector('.chat-mute-cancel').onclick = () => pop.remove();
  pop.querySelectorAll('.chat-mute-dur-btn').forEach(b => {
    b.onclick = async () => {
      const minutes = parseInt(b.dataset.v);
      pop.remove();
      await sb.from('chat_muted_users').upsert({
        user_id: userId,
        muted_until: new Date(Date.now() + minutes * 60000).toISOString(),
        reason: t('chat.mute.reason', currentRole)
      }, {onConflict: 'user_id'});
      showChatNotice(t('chat.mute.done', username, t(b.dataset.k)));
    };
  });

  // Position near button
  btn.parentElement.appendChild(pop);
};

// Freund aus Chat hinzufügen
window.zzChatAddFriend = async (userId, btn) => {
  btn.disabled = true;
  const { error } = await sb.from('friendships').insert({
    requester_id: currentUser.id,
    addressee_id: userId,
  });
  if(error) {
    btn.disabled = false;
    showChatNotice(t('chat.friend.error'), true);
  } else {
    btn.textContent = '⏳';
    btn.classList.add('sent');
    btn.title = t('chat.friend.sent.label');
    sentSet.add(userId);
    showChatNotice(t('chat.friend.added'));
  }
};

// Close mute popup on click outside
document.addEventListener('click', e => {
  const pop = document.getElementById('chatMutePopup');
  if(pop && !pop.contains(e.target)) pop.remove();
}, true);

// ===== SEND =====
window.zzToggleChat = () => {
  isOpen = !isOpen;
  const panel = $('chatPanel');
  panel.hidden = !isOpen;
  if(isOpen){
    unread = 0;
    updateBadge();
    $('chatMessages').scrollTop = $('chatMessages').scrollHeight;
    setTimeout(() => $('chatInput')?.focus(), 80);
  }
};

window.zzSendChat = async () => {
  if(!currentUser) return;
  const input = $('chatInput');
  let msg = input.value.trim();
  if(!msg) return;

  if(isRateLimited()){
    showChatNotice(t('chat.notice.ratelimit'), true);
    return;
  }
  const muted = await checkMuted();
  if(muted){
    showChatNotice(t('chat.notice.muted'), true);
    return;
  }

  msg = filterMessage(msg.slice(0, 200));
  input.value = '';
  msgTimestamps.push(Date.now());

  const meta = currentUser.user_metadata || {};
  const { data: inserted, error } = await sb.from('chat_messages').insert({
    user_id: currentUser.id,
    username: meta.display_name || currentUser.email?.split('@')[0] || 'Spieler',
    avatar: meta.avatar || '',
    message: msg
  }).select('id').single();
  if(error) showChatNotice(t('chat.notice.send.error'), true);
  else if(inserted?.id) mySentIds.add(inserted.id);
};

$('chatInput')?.addEventListener('keydown', e => {
  if(e.key === 'Enter') window.zzSendChat();
});

// ===== BOT STATUS =====
async function loadBotStatus() {
  const el = document.getElementById('chatBotStatus');
  if(!el) return;
  try {
    const { data } = await sb.from('chat_bot_status').select('is_online,last_seen').eq('id',1).maybeSingle();
    if(!data) { el.textContent = ''; return; }
    const online = data.is_online;
    const ago    = data.last_seen ? Math.floor((Date.now() - new Date(data.last_seen)) / 60000) : null;
    const stale  = ago !== null && ago > 2;
    el.textContent = online && !stale ? '🤖 online' : '🤖 offline';
    el.style.color  = online && !stale ? '#4ade80' : '#888';
    el.title        = data.last_seen ? `Bot zuletzt aktiv: ${new Date(data.last_seen).toLocaleTimeString('de-DE')}` : 'Bot Status';
  } catch { el.textContent = ''; }
}

// ===== AUTH =====
async function syncLangToProfile() {
  if(!currentUser) return;
  try {
    await sb.from('profiles').update({ lang: getLang() }).eq('id', currentUser.id);
  } catch {}
}

async function onAuthChanged(){
  const { data } = await sb.auth.getUser();
  currentUser = data?.user || null;
  const btn = $('chatBtn');
  if(!btn) return;
  if(currentUser){
    btn.hidden = false;
    await Promise.all([loadProfile(), loadBannedWords(), loadStaffMap(), loadPrivacySet(), loadFriendSet()]);
    syncLangToProfile();
    subscribeRealtime();
    loadMessages();
    loadBotStatus();
    setInterval(loadBotStatus, 30_000);
    // Sound-Button initial setzen
    const sb2 = document.getElementById('chatSoundBtn');
    if(sb2) sb2.textContent = soundEnabled ? '🔔' : '🔕';
    // Show own role badge in FAB
    if(isMod()) btn.title = ROLE_LABEL[currentRole] || '';
  } else {
    btn.hidden = true;
    if($('chatPanel')) $('chatPanel').hidden = true;
    isOpen = false;
    currentRole = 'user';
    staffMap.clear();
  }
}

window.addEventListener('zz:auth-changed', onAuthChanged);
onAuthChanged();
