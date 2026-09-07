import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://supabase.hackthelab.uk';
const SUPABASE_ANON_KEY = 'sb_publishable_rWR-Aesm3GyJxEnvrhcZ2M_ZmMoQWdB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AVATAR_MAP = {
  snake:'🐍', alien:'👾', rocket:'🚀', bomb:'💣',
  dice:'🎲', joker:'🃏', puzzle:'🧩', lightning:'⚡',
  ghost:'👻', trophy:'🏆'
};

let currentUser = null;
let realtimeChannel = null;
let isOpen = false;
let unread = 0;

const $ = id => document.getElementById(id);

function esc(str){ return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function avatarOf(av){ return AVATAR_MAP[av] || '👤'; }

function timeAgo(iso){
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if(m < 1) return 'jetzt';
  if(m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if(h < 24) return `${h}h`;
  return `${Math.floor(h/24)}d`;
}

function appendMsg(msg){
  if($('chatMsg-' + msg.id)) return;
  const el = document.createElement('div');
  el.className = 'chat-msg';
  el.id = 'chatMsg-' + msg.id;
  el.innerHTML =
    `<span class="chat-av">${avatarOf(msg.avatar)}</span>` +
    `<div class="chat-body">` +
      `<span class="chat-name">${esc(msg.username)}</span>` +
      `<span class="chat-time">${timeAgo(msg.created_at)}</span>` +
      `<p class="chat-text">${esc(msg.message)}</p>` +
    `</div>`;
  const list = $('chatMessages');
  list.appendChild(el);
  list.scrollTop = list.scrollHeight;
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
    .subscribe();
}

function updateBadge(){
  const b = $('chatBadge');
  if(!b) return;
  b.textContent = unread > 9 ? '9+' : unread;
  b.hidden = unread === 0;
}

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
  const msg = input.value.trim();
  if(!msg) return;
  input.value = '';
  const meta = currentUser.user_metadata || {};
  await sb.from('chat_messages').insert({
    user_id: currentUser.id,
    username: meta.display_name || currentUser.email?.split('@')[0] || 'Spieler',
    avatar: meta.avatar || '',
    message: msg.slice(0, 200)
  });
};

$('chatInput')?.addEventListener('keydown', e => {
  if(e.key === 'Enter') window.zzSendChat();
});

function onAuthChanged(){
  sb.auth.getUser().then(({ data }) => {
    currentUser = data?.user || null;
    const btn = $('chatBtn');
    if(!btn) return;
    if(currentUser){
      btn.hidden = false;
      subscribeRealtime();
      loadMessages();
    } else {
      btn.hidden = true;
      if($('chatPanel')) $('chatPanel').hidden = true;
      isOpen = false;
    }
  });
}

window.addEventListener('zz:auth-changed', onAuthChanged);
onAuthChanged();
