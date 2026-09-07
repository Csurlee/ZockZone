import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://supabase.hackthelab.uk';
const SUPABASE_ANON_KEY = 'sb_publishable_rWR-Aesm3GyJxEnvrhcZ2M_ZmMoQWdB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AVATAR_MAP = {
  snake:'🐍', alien:'👾', rocket:'🚀', bomb:'💣',
  dice:'🎲', joker:'🃏', puzzle:'🧩', lightning:'⚡',
  ghost:'👻', trophy:'🏆'
};
const ROLE_BADGE = { moderator:'🛡 MOD', admin:'⚡ ADMIN' };

let currentUser   = null;
let currentRole   = 'user';
let staffIds      = new Set();   // user IDs with mod/admin role (for badges)
let realtimeChannel = null;
let isOpen        = false;
let unread        = 0;

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

async function loadStaffIds() {
  const { data } = await sb.from('profiles')
    .select('id').in('role',['moderator','admin']);
  staffIds = new Set((data||[]).map(p=>p.id));
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
  const isStaff = staffIds.has(msg.user_id);
  const badge   = isStaff ? `<span class="chat-role-badge">${msg.user_id === currentUser?.id ? ROLE_BADGE[currentRole]||'' : staffIds.has(msg.user_id) ? '🛡' : ''}</span>` : '';
  // Reload staffIds on each msg to catch newly assigned mods
  const badgeLabel = isStaff
    ? `<span class="chat-role-badge">${staffIds.has(msg.user_id)?'🛡':''}</span>`
    : '';

  const isOwn     = msg.user_id === currentUser?.id;
  const modBtns   = (isMod() && !isOwn)
    ? `<div class="chat-mod-btns">
        <button class="chat-mod-btn" title="Stummschalten" onclick="zzChatMuteUser('${msg.user_id}','${esc(msg.username)}',this)">🔇</button>
        <button class="chat-mod-btn chat-del-btn" title="Löschen" onclick="zzChatDeleteMsg('${msg.id}',this)">🗑</button>
       </div>`
    : '';

  const el = document.createElement('div');
  el.className = 'chat-msg';
  el.id = 'chatMsg-' + msg.id;
  el.innerHTML =
    `<span class="chat-av">${avatarOf(msg.avatar)}</span>` +
    `<div class="chat-body">` +
      `<span class="chat-name">${esc(msg.username)}</span>` +
      (isStaff ? `<span class="chat-role-badge">${ROLE_BADGE[currentRole] && isOwn ? ROLE_BADGE[currentRole] : '🛡 MOD'}</span>` : '') +
      `<span class="chat-time">${timeAgo(msg.created_at)}</span>` +
      `<p class="chat-text">${esc(msg.message)}</p>` +
    `</div>` +
    modBtns;
  const list = $('chatMessages');
  list.appendChild(el);
  list.scrollTop = list.scrollHeight;
}

function appendMsgRefresh(msg) {
  // Re-render with updated staffIds
  const el = $('chatMsg-' + msg.id);
  if(el) el.remove();
  appendMsg(msg);
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
      ({old}) => removeMsg(old.id))
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
  if(error){ btn.disabled = false; showChatNotice('Fehler beim Löschen.', true); }
};

// Simple inline mute popup
window.zzChatMuteUser = (userId, username, btn) => {
  // Remove existing popup
  document.getElementById('chatMutePopup')?.remove();

  const opts = [
    {v:10,  l:'10 Minuten'},
    {v:60,  l:'1 Stunde'},
    {v:360, l:'6 Stunden'},
    {v:1440,l:'24 Stunden'},
    {v:10080,l:'7 Tage'},
  ];
  const pop = document.createElement('div');
  pop.id = 'chatMutePopup';
  pop.className = 'chat-mute-popup';
  pop.innerHTML =
    `<div class="chat-mute-popup-title">🔇 ${esc(username)} stummschalten</div>` +
    opts.map(o =>
      `<button class="chat-mute-dur-btn" data-v="${o.v}">${o.l}</button>`
    ).join('') +
    `<button class="chat-mute-cancel">Abbrechen</button>`;

  pop.querySelector('.chat-mute-cancel').onclick = () => pop.remove();
  pop.querySelectorAll('.chat-mute-dur-btn').forEach(b => {
    b.onclick = async () => {
      const minutes = parseInt(b.dataset.v);
      pop.remove();
      await sb.from('chat_muted_users').upsert({
        user_id: userId,
        muted_until: new Date(Date.now() + minutes * 60000).toISOString(),
        reason: `Von ${currentRole} stummgeschaltet`
      }, {onConflict: 'user_id'});
      showChatNotice(`🔇 ${username} für ${b.textContent} stummgeschaltet.`);
    };
  });

  // Position near button
  btn.parentElement.appendChild(pop);
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
    showChatNotice('⏳ Zu viele Nachrichten — bitte kurz warten.', true);
    return;
  }
  const muted = await checkMuted();
  if(muted){
    showChatNotice('🔇 Du bist stummgeschaltet.', true);
    return;
  }

  msg = filterMessage(msg.slice(0, 200));
  input.value = '';
  msgTimestamps.push(Date.now());

  const meta = currentUser.user_metadata || {};
  const { error } = await sb.from('chat_messages').insert({
    user_id: currentUser.id,
    username: meta.display_name || currentUser.email?.split('@')[0] || 'Spieler',
    avatar: meta.avatar || '',
    message: msg
  });
  if(error) showChatNotice('🔇 Nachricht konnte nicht gesendet werden.', true);
};

$('chatInput')?.addEventListener('keydown', e => {
  if(e.key === 'Enter') window.zzSendChat();
});

// ===== AUTH =====
async function onAuthChanged(){
  const { data } = await sb.auth.getUser();
  currentUser = data?.user || null;
  const btn = $('chatBtn');
  if(!btn) return;
  if(currentUser){
    btn.hidden = false;
    await Promise.all([loadProfile(), loadBannedWords(), loadStaffIds()]);
    subscribeRealtime();
    loadMessages();
    // Show own role badge in FAB
    if(isMod()) btn.title = ROLE_BADGE[currentRole] || '';
  } else {
    btn.hidden = true;
    if($('chatPanel')) $('chatPanel').hidden = true;
    isOpen = false;
    currentRole = 'user';
    staffIds.clear();
  }
}

window.addEventListener('zz:auth-changed', onAuthChanged);
onAuthChanged();
