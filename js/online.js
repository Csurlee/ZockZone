import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sfx } from './sfx.js';
import { t } from './i18n.js';

const SUPABASE_URL     = 'https://supabase.hackthelab.uk';
const SUPABASE_ANON_KEY = 'sb_publishable_rWR-Aesm3GyJxEnvrhcZ2M_ZmMoQWdB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AVATAR_MAP = {
  snake:'🐍', alien:'👾', rocket:'🚀', bomb:'💣',
  dice:'🎲', joker:'🃏', puzzle:'🧩', lightning:'⚡',
  ghost:'👻', trophy:'🏆'
};

let currentUser  = null;
let myRoom       = null;
let isHost       = false;
let roomChannel  = null;
let gameCleanup  = null;
let roomChatSub  = null;
let presenceInt  = null;
let friendsInviteSub = null;

const $  = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const avatarOf = av => AVATAR_MAP[av] || '👤';
function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6}, () => c[Math.floor(Math.random()*c.length)]).join('');
}
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 Min → gilt als online

// ===== TABS =====
window.zzShowTab = function(tab) {
  $('onlineFriendsTab').hidden = tab !== 'friends';
  $('onlineRoomTab').hidden    = tab !== 'room';
  $('tabFriends').classList.toggle('active', tab === 'friends');
  $('tabRoom').classList.toggle('active', tab === 'room');
  if(tab === 'friends') loadFriends();
};

// ===== VIEWS =====
function showView(id) {
  ['onlineMenu','onlineLobby','onlineGame'].forEach(v => {
    const el = $(v);
    if(el) el.hidden = v !== id;
  });
}

// ===== PRESENCE =====
async function updatePresence() {
  if(!currentUser) return;
  const meta = currentUser.user_metadata || {};
  await sb.from('profiles').update({
    last_seen: new Date().toISOString(),
    avatar:    meta.avatar || null,
  }).eq('id', currentUser.id);
}

function startPresence() {
  updatePresence();
  presenceInt = setInterval(updatePresence, 60_000);
}

function stopPresence() {
  clearInterval(presenceInt);
  presenceInt = null;
}

// ===== FREUNDE: laden =====
async function loadFriends() {
  if(!currentUser) return;
  const { data } = await sb.from('friendships')
    .select('*')
    .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);

  const pending  = (data||[]).filter(f => f.status==='pending' && f.addressee_id===currentUser.id);
  const accepted = (data||[]).filter(f => f.status==='accepted');
  const sent     = (data||[]).filter(f => f.status==='pending' && f.requester_id===currentUser.id);

  // offene Anfragen
  const reqEl = $('friendRequests');
  if(reqEl) {
    if(pending.length) {
      const ids = pending.map(f => f.requester_id);
      const { data: profiles } = await sb.from('profiles').select('id,display_name,avatar,last_seen').in('id', ids);
      const map = Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
      reqEl.innerHTML = `<div class="friend-section-title">📩 Anfragen (${pending.length})</div>` +
        pending.map(f => {
          const p = map[f.requester_id] || {};
          return `<div class="friend-item">
            ${avatarOf(p.avatar)} <span>${esc(p.display_name||'?')}</span>
            <button class="friend-btn accept" onclick="zzAcceptFriend('${f.id}')">✔</button>
            <button class="friend-btn reject" onclick="zzRejectFriend('${f.id}')">✕</button>
          </div>`;
        }).join('');
    } else {
      reqEl.innerHTML = '';
    }
  }

  // Freundesliste
  const listEl = $('friendsList');
  if(listEl) {
    if(!accepted.length && !sent.length) {
      listEl.innerHTML = `<div class="friend-empty">${t('online.friends.none')}</div>`;
      return;
    }
    let html = accepted.length ? `<div class="friend-section-title">${t('online.friends.section')}</div>` : '';
    if(accepted.length) {
      const ids = accepted.map(f => f.requester_id===currentUser.id ? f.addressee_id : f.requester_id);
      const { data: profiles } = await sb.from('profiles').select('id,display_name,avatar,last_seen').in('id', ids);
      const map = Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
      html += accepted.map(f => {
        const fid = f.requester_id===currentUser.id ? f.addressee_id : f.requester_id;
        const p   = map[fid] || {};
        const online = p.last_seen && (Date.now() - new Date(p.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
        return `<div class="friend-item">
          <span class="friend-status-dot ${online?'online':'offline'}"></span>
          ${avatarOf(p.avatar)} <span class="friend-name">${esc(p.display_name||'?')}</span>
          ${online ? `<button class="friend-btn invite" onclick="zzInviteFriend('${fid}','${esc(p.display_name||'?')}')">${t('online.friends.invite')}</button>` : `<span class="friend-offline-label">${t('online.friends.offline')}</span>`}
          <button class="friend-btn remove" onclick="zzRemoveFriend('${f.id}')" title="${t('online.friends.remove.title')}">🗑</button>
        </div>`;
      }).join('');
    }
    if(sent.length) {
      html += `<div class="friend-section-title" style="margin-top:12px">${t('online.friends.section.sent')}</div>`;
      const ids = sent.map(f => f.addressee_id);
      const { data: profiles } = await sb.from('profiles').select('id,display_name').in('id', ids);
      const map = Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
      html += sent.map(f => {
        const p = map[f.addressee_id] || {};
        return `<div class="friend-item pending">
          👤 <span>${esc(p.display_name||'?')}</span>
          <span class="friend-pending-label">${t('online.friends.pending.label')}</span>
          <button class="friend-btn remove" onclick="zzRemoveFriend('${f.id}')" title="${t('online.friends.remove.title')}">✕</button>
        </div>`;
      }).join('');
    }
    listEl.innerHTML = html;
  }
}

// ===== FREUNDE: suchen =====
window.zzSearchUsers = async function() {
  const q = $('friendSearchInput')?.value?.trim();
  if(!q || q.length < 2) return;
  const { data } = await sb.from('profiles')
    .select('id,display_name,avatar,last_seen')
    .ilike('display_name', `%${q}%`)
    .neq('id', currentUser.id)
    .limit(8);

  // eigene Freundschaften laden um Status zu kennen
  const { data: existing } = await sb.from('friendships')
    .select('*')
    .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);

  const friendIds = new Set((existing||[]).map(f =>
    f.requester_id===currentUser.id ? f.addressee_id : f.requester_id
  ));
  const pendingFrom = new Set((existing||[])
    .filter(f=>f.status==='pending'&&f.requester_id===currentUser.id)
    .map(f=>f.addressee_id));

  const resEl = $('friendSearchResults');
  if(!resEl) return;
  if(!data?.length) { resEl.innerHTML = `<div class="friend-empty">${t('online.friends.notfound')}</div>`; return; }

  resEl.innerHTML = data.map(p => {
    const online = p.last_seen && (Date.now() - new Date(p.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
    let btn = '';
    if(friendIds.has(p.id))       btn = `<span class="friend-already">${t('online.friends.already')}</span>`;
    else if(pendingFrom.has(p.id)) btn = `<span class="friend-pending-label">${t('online.friends.pending')}</span>`;
    else                           btn = `<button class="friend-btn accept" onclick="zzSendRequest('${p.id}')">${t('online.friends.add')}</button>`;
    return `<div class="friend-item">
      <span class="friend-status-dot ${online?'online':'offline'}"></span>
      ${avatarOf(p.avatar)} <span>${esc(p.display_name||p.id)}</span>
      ${btn}
    </div>`;
  }).join('');
};

window.zzSendRequest = async function(addresseeId) {
  const { error } = await sb.from('friendships').insert({ requester_id: currentUser.id, addressee_id: addresseeId });
  if(error) { toast(error.code==='23505' ? t('online.toast.request.dup') : t('err.prefix')+error.message); return; }
  toast(t('online.toast.request.sent'));
  sfx.blip();
  $('friendSearchResults').innerHTML = '';
  $('friendSearchInput').value = '';
  loadFriends();
};

window.zzAcceptFriend = async function(id) {
  await sb.from('friendships').update({ status:'accepted' }).eq('id', id);
  sfx.blip(); loadFriends();
};

window.zzRejectFriend = async function(id) {
  await sb.from('friendships').update({ status:'rejected' }).eq('id', id);
  loadFriends();
};

window.zzRemoveFriend = async function(id) {
  await sb.from('friendships').delete().eq('id', id);
  loadFriends();
};

// ===== FREUND EINLADEN =====
window.zzInviteFriend = async function(friendId, friendName) {
  if(!currentUser) return;
  await createRoomAndInvite(friendId, friendName);
};

async function createRoomAndInvite(friendId, friendName) {
  const meta = currentUser.user_metadata || {};
  const code = genCode();
  const { data, error } = await sb.from('online_rooms').insert({
    code,
    host_id:     currentUser.id,
    host_name:   meta.display_name || 'Spieler',
    host_avatar: meta.avatar || '',
  }).select().single();
  if(error) { toast(t('err.prefix')+error.message); return; }
  myRoom  = data;
  isHost  = true;

  // Einladung via Realtime-Broadcast an den Freund schicken
  const inviteChan = sb.channel(`invite-${friendId}`);
  inviteChan.subscribe(status => {
    if(status === 'SUBSCRIBED') {
      inviteChan.send({
        type: 'broadcast', event: 'game-invite',
        payload: {
          from_id:   currentUser.id,
          from_name: meta.display_name || 'Spieler',
          room_code: code,
        }
      });
      setTimeout(() => inviteChan.unsubscribe(), 3000);
    }
  });

  toast(t('online.toast.invite.sent', friendName));
  sfx.blip();
  openLobby();
}

function listenForInvites() {
  if(!currentUser) return;
  if(friendsInviteSub) { friendsInviteSub.unsubscribe(); friendsInviteSub = null; }
  friendsInviteSub = sb.channel(`invite-${currentUser.id}`)
    .on('broadcast', { event: 'game-invite' }, ({ payload }) => {
      showInviteToast(payload);
    })
    .subscribe();
}

function showInviteToast(payload) {
  const name = esc(payload.from_name || 'Jemand');
  const code = payload.room_code || '';
  let el = $('_inviteToast');
  if(!el) {
    el = document.createElement('div');
    el.id = '_inviteToast';
    el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);' +
      'background:#1A1428;border:2px solid #C6FF3D;color:#fff;padding:14px 20px;' +
      'border-radius:12px;z-index:9999;font-size:14px;font-family:Inter,sans-serif;text-align:center;min-width:240px;';
    document.body.appendChild(el);
  }
  el.innerHTML = `${t('online.invite.text', name)}<br>
    <button onclick="zzJoinInvite('${code}')" style="margin-top:8px;background:#C6FF3D;color:#000;border:none;border-radius:6px;padding:6px 18px;cursor:pointer;font-weight:600;">${t('online.invite.accept')}</button>
    <button onclick="document.getElementById('_inviteToast').style.display='none'" style="margin-top:8px;margin-left:8px;background:transparent;color:#888;border:1px solid #555;border-radius:6px;padding:6px 12px;cursor:pointer;">${t('online.invite.decline')}</button>`;
  el.style.display = 'block';
  sfx.blip();
}

window.zzJoinInvite = function(code) {
  const el = $('_inviteToast');
  if(el) el.style.display = 'none';
  $('onlineOverlay').classList.add('open');
  joinRoom(code);
};

// ===== LOBBY UI =====
function updateLobbyUI() {
  if(!myRoom) return;
  const codeEl = $('lobbyCode');
  if(codeEl) codeEl.textContent = myRoom.code;
  const hostEl = $('lobbyHostName');
  if(hostEl) hostEl.textContent = avatarOf(myRoom.host_avatar) + ' ' + esc(myRoom.host_name);
  const guestEl = $('lobbyGuestName');
  if(guestEl) {
    guestEl.innerHTML = myRoom.guest_name
      ? avatarOf(myRoom.guest_avatar) + ' ' + esc(myRoom.guest_name)
      : `<span class="lobby-waiting">${t('online.status.waiting.player')}</span>`;
  }
  const pickBtn = $('lobbyPickGame');
  if(pickBtn) {
    pickBtn.hidden   = !isHost;
    pickBtn.disabled = !myRoom.guest_id;
  }
  const statusEl = $('lobbyStatus');
  if(statusEl) {
    if(myRoom.guest_id && isHost)   statusEl.textContent = t('online.status.pick.game');
    else if(myRoom.guest_id)        statusEl.textContent = t('online.status.wait.host');
    else                            statusEl.textContent = t('online.status.share.code');
  }
  // Chat nur zeigen wenn beide da sind
  const chatEl = $('lobbyChatArea');
  if(chatEl) chatEl.hidden = !myRoom.guest_id;
}

// ===== ROOM OPERATIONS =====
async function createRoom() {
  if(!currentUser) { window.zzOpenAuth?.(); return; }
  const meta = currentUser.user_metadata || {};
  const code = genCode();
  const { data, error } = await sb.from('online_rooms').insert({
    code,
    host_id:     currentUser.id,
    host_name:   meta.display_name || currentUser.email?.split('@')[0] || 'Spieler',
    host_avatar: meta.avatar || '',
  }).select().single();
  if(error) { toast(t('err.prefix')+error.message); return; }
  myRoom = data;
  isHost = true;
  sfx.blip();
  openLobby();
}

async function joinRoom(code) {
  if(!currentUser) { window.zzOpenAuth?.(); return; }
  code = code.toUpperCase().trim();
  if(code.length !== 6) { toast(t('online.err.code.length')); return; }
  const meta = currentUser.user_metadata || {};
  const { data: room } = await sb.from('online_rooms').select('*').eq('code', code).maybeSingle();
  if(!room)                          { toast(t('online.err.room.notfound')); return; }
  if(room.guest_id)                  { toast(t('online.err.room.full')); return; }
  if(room.host_id === currentUser.id){ toast(t('online.err.room.own')); return; }
  const { data, error } = await sb.from('online_rooms').update({
    guest_id:     currentUser.id,
    guest_name:   meta.display_name || currentUser.email?.split('@')[0] || 'Spieler',
    guest_avatar: meta.avatar || '',
    status:       'ready',
  }).eq('code', code).select().single();
  if(error) { toast(t('online.err.join')); return; }
  myRoom = data;
  isHost = false;
  sfx.blip();
  openLobby();
}

function openLobby() {
  $('onlineOverlay').classList.add('open');
  showView('onlineLobby');
  $('gamePicker').hidden     = true;
  $('onlineResult').hidden   = true;
  $('lobbyChatArea').hidden  = !myRoom?.guest_id;
  $('lobbyChatMsgs').innerHTML = '';
  updateLobbyUI();
  subscribeRoom();
  if(myRoom?.guest_id) subscribeRoomChat();
}

function subscribeRoom() {
  if(roomChannel) { roomChannel.unsubscribe(); roomChannel = null; }
  roomChannel = sb.channel('room-'+myRoom.id)
    .on('postgres_changes', {
      event:'UPDATE', schema:'public', table:'online_rooms',
      filter:`id=eq.${myRoom.id}`
    }, ({new: updated}) => {
      const wasPlaying   = myRoom.status === 'playing';
      const hadGuest     = !!myRoom.guest_id;
      myRoom = updated;
      updateLobbyUI();
      if(!hadGuest && updated.guest_id) {
        // Gast gerade beigetreten
        $('lobbyChatArea').hidden = false;
        subscribeRoomChat();
      }
      if(!wasPlaying && updated.status === 'playing' && !isHost) {
        startGame(updated.selected_game || 'pong');
      }
      if(!updated.guest_id && isHost && myRoom.status !== 'playing') {
        toast(t('online.toast.player.left'));
        $('lobbyChatArea').hidden = true;
      }
    })
    .on('postgres_changes', {
      event:'DELETE', schema:'public', table:'online_rooms',
      filter:`id=eq.${myRoom.id}`
    }, () => {
      if(!isHost) {
        toast(t('online.toast.host.left'));
        cleanup();
        $('onlineOverlay').classList.remove('open');
      }
    })
    .subscribe();
}

// ===== RAUM-CHAT =====
function subscribeRoomChat() {
  if(roomChatSub) { roomChatSub.unsubscribe(); roomChatSub = null; }
  if(!myRoom) return;
  roomChatSub = sb.channel('room-chat-'+myRoom.id)
    .on('postgres_changes', {
      event:'INSERT', schema:'public', table:'room_messages',
      filter:`room_id=eq.${myRoom.id}`
    }, ({new: msg}) => appendRoomMsg(msg))
    .subscribe();
}

function appendRoomMsg(msg) {
  const el = $('lobbyChatMsgs');
  if(!el) return;
  const isMe = msg.user_id === currentUser?.id;
  const div  = document.createElement('div');
  div.className = 'rchat-msg ' + (isMe ? 'rchat-me' : 'rchat-other');
  div.innerHTML = `<span class="rchat-name">${esc(msg.username)}</span><span class="rchat-text">${esc(msg.message)}</span>`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

window.zzSendRoomMsg = async function() {
  const inp = $('lobbyChatInput');
  const text = inp?.value?.trim();
  if(!text || !myRoom || !currentUser) return;
  inp.value = '';
  const meta = currentUser.user_metadata || {};
  const { error } = await sb.from('room_messages').insert({
    room_id:  myRoom.id,
    user_id:  currentUser.id,
    username: meta.display_name || 'Spieler',
    message:  text,
  });
  if(error) toast(t('online.err.msg.send'));
};

// ===== SPIEL AUSWÄHLEN =====
async function selectGame(gameName) {
  if(!isHost || !myRoom) return;
  const { data } = await sb.from('online_rooms')
    .update({ selected_game: gameName, status: 'playing' })
    .eq('id', myRoom.id).select().single();
  if(data) { myRoom = data; startGame(gameName); }
}

// ===== VERLASSEN =====
async function leaveRoom() {
  if(gameCleanup)  { gameCleanup(); gameCleanup = null; }
  if(roomChannel)  { roomChannel.unsubscribe(); roomChannel = null; }
  if(roomChatSub)  { roomChatSub.unsubscribe(); roomChatSub = null; }
  if(myRoom) {
    if(isHost) {
      await sb.from('online_rooms').delete().eq('id', myRoom.id);
    } else {
      await sb.from('online_rooms').update({
        guest_id:null, guest_name:null, guest_avatar:null, status:'waiting'
      }).eq('id', myRoom.id);
    }
    myRoom = null;
  }
  isHost = false;
  $('onlineOverlay').classList.remove('open');
}

function cleanup() {
  if(gameCleanup)  { gameCleanup(); gameCleanup = null; }
  if(roomChannel)  { roomChannel.unsubscribe(); roomChannel = null; }
  if(roomChatSub)  { roomChatSub.unsubscribe(); roomChatSub = null; }
  myRoom = null;
  isHost = false;
}

// ===== ONLINE BILLARD =====
function startBilliardOnline(canvas) {
  const ctx = canvas.getContext('2d');
  const W=480,H=288,RAIL=30;
  const TX1=RAIL,TY1=RAIL,TX2=W-RAIL,TY2=H-RAIL,TW=TX2-TX1,TH=TY2-TY1;
  const BR=9,PR=13;
  canvas.width=W; canvas.height=H;

  const POCKETS=[{x:TX1,y:TY1},{x:TX1+TW/2,y:TY1-7},{x:TX2,y:TY1},{x:TX1,y:TY2},{x:TX1+TW/2,y:TY2+7},{x:TX2,y:TY2}];
  const BALL_COLOR=['#F2F2F2','#E8C400','#1833CC','#CC2200','#7700BB','#DD6600','#115500','#8B1010','#111111','#E8C400','#1833CC','#CC2200','#7700BB','#DD6600','#115500','#8B1010'];

  const myRole  = isHost ? 0 : 1;
  let balls=[],state='waiting',turn=0,group=[null,null];
  let keepTurn=false,scratch=false,pocketsThisTurn=[];
  let aimAngle=0,holding=false,powerPct=0;
  let raf,done=false,initInterval=null;

  const cueBall  = () => balls.find(b=>b.num===0&&!b.pocketed);
  const myPool   = (who) => { const g=group[who]; return balls.filter(b=>!b.pocketed&&b.num!==0&&b.num!==8&&(g===null||(g==='solid'?b.num<=7:b.num>=9))); };
  const getPower = () => 2+powerPct*0.14;

  function updateHUD() {
    const el=$('onlineScore');
    if(!el) return;
    const gl=g=>g==='solid'?'🟡':g==='stripe'?'🔵':'—';
    el.innerHTML=`<span style="color:${turn===0?'#C6FF3D':'#aaa'}">${esc(myRoom.host_name)} ${gl(group[0])}</span>`+
      `<span style="margin:0 8px;color:#555">·</span>`+
      `<span style="color:${turn===1?'#C6FF3D':'#aaa'}">${esc(myRoom.guest_name)} ${gl(group[1])}</span>`+
      `<span style="margin-left:8px;font-size:12px;color:${turn===myRole?'#C6FF3D':'#888'}">${turn===myRole?'▶ Dein Zug':'⏳ Gegner'}</span>`;
  }

  function physicsStep() {
    let moving=false;
    for(const b of balls){
      if(b.pocketed) continue;
      b.x+=b.vx;b.y+=b.vy;b.vx*=0.987;b.vy*=0.987;
      if(Math.abs(b.vx)<0.04)b.vx=0;if(Math.abs(b.vy)<0.04)b.vy=0;
      if(b.vx||b.vy)moving=true;
      if(b.x-BR<TX1){b.x=TX1+BR;b.vx=Math.abs(b.vx)*.72;}
      if(b.x+BR>TX2){b.x=TX2-BR;b.vx=-Math.abs(b.vx)*.72;}
      if(b.y-BR<TY1){b.y=TY1+BR;b.vy=Math.abs(b.vy)*.72;}
      if(b.y+BR>TY2){b.y=TY2-BR;b.vy=-Math.abs(b.vy)*.72;}
    }
    for(let iter=0;iter<3;iter++){
      for(let i=0;i<balls.length-1;i++){if(balls[i].pocketed)continue;
        for(let j=i+1;j<balls.length;j++){if(balls[j].pocketed)continue;
          const a=balls[i],b=balls[j],dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy;
          if(d2>=(BR*2)*(BR*2)||d2===0)continue;
          const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,ov=BR*2-d;
          a.x-=nx*ov/2;a.y-=ny*ov/2;b.x+=nx*ov/2;b.y+=ny*ov/2;
          const rv=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
          if(rv>0){a.vx-=rv*nx;a.vy-=rv*ny;b.vx+=rv*nx;b.vy+=rv*ny;}
        }
      }
    }
    for(const b of balls){if(b.pocketed)continue;
      for(const p of POCKETS){const dx=b.x-p.x,dy=b.y-p.y;
        if(dx*dx+dy*dy<PR*PR){b.pocketed=true;b.vx=0;b.vy=0;onPocket(b);moving=true;break;}
      }
    }
    return moving;
  }

  function onPocket(b) {
    if(b.num===0){scratch=true;return;}
    pocketsThisTurn.push(b.num);
    if(b.num===8)return;
    const isStripe=b.num>=9;
    if(group[turn]===null&&group[1-turn]===null){group[turn]=isStripe?'stripe':'solid';group[1-turn]=isStripe?'solid':'stripe';}
    const mine=(isStripe&&group[turn]==='stripe')||(!isStripe&&group[turn]==='solid')||group[turn]===null;
    if(mine)keepTurn=true;
  }

  function createRack() {
    const ax=TX1+TW*0.72,ay=TY1+TH/2,rdx=BR*Math.sqrt(3);
    const rack=[[1],[2,9],[3,8,10],[4,11,5,12],[13,6,14,7,15]];
    const b=[];
    rack.forEach((row,ri)=>row.forEach((num,ci)=>b.push({x:ax+ri*rdx,y:ay+(ci-(row.length-1)/2)*BR*2,num,pocketed:false})));
    b.push({x:TX1+TW*.27,y:ay,num:0,pocketed:false});
    return b;
  }

  function setup(ballData) {
    balls=ballData.map(b=>({...b,vx:0,vy:0}));
    turn=0;group=[null,null];keepTurn=false;scratch=false;pocketsThisTurn=[];holding=false;powerPct=0;
    state=isHost?'waiting':'opponent-turn';
    updateHUD();
  }

  function shoot(angle,power) {
    const cue=cueBall();if(!cue)return;
    cue.vx=Math.cos(angle)*power;cue.vy=Math.sin(angle)*power;
    state='rolling';keepTurn=false;scratch=false;pocketsThisTurn=[];
  }

  function endTurn() {
    const eight=pocketsThisTurn.includes(8);
    if(eight){
      const cleared=myPool(turn).length===0;
      const shooterWins=!scratch&&cleared;
      const winner=shooterWins?(turn===0?'host':'guest'):(turn===0?'guest':'host');
      gchan.send({type:'broadcast',event:'bil-end',payload:{winner}});
      showEnd(t('online.billiard.wins', winner==='host'?myRoom.host_name:myRoom.guest_name));
      return;
    }
    if(scratch){scratch=false;keepTurn=false;const cue=balls.find(b=>b.num===0);if(cue){cue.pocketed=false;cue.x=TX1+TW*.27;cue.y=TY1+TH/2;cue.vx=0;cue.vy=0;}}
    if(!keepTurn)turn=1-turn;
    keepTurn=false;pocketsThisTurn=[];
    const info={turn,group:[...group],balls:balls.map(b=>({x:b.x,y:b.y,num:b.num,pocketed:b.pocketed}))};
    gchan.send({type:'broadcast',event:'bil-info',payload:info});
    applyInfo(info);
  }

  function applyInfo(info) {
    turn=info.turn;group=info.group;
    if(info.balls)balls=info.balls.map(b=>({...b,vx:0,vy:0}));
    state=turn===myRole?'aiming':'opponent-turn';
    holding=false;powerPct=0;updateHUD();
  }

  function showEnd(msg) {
    done=true;state='gameover';cancelAnimationFrame(raf);
    const el=$('onlineResult');if(el){el.textContent=msg;el.hidden=false;}sfx.win();
  }

  function castRay(ox,oy,dx,dy){
    let minT=TW+TH+100,hitBall=null;
    const ts=[];
    if(Math.abs(dx)>0.001){ts.push({t:(TX1+BR-ox)/dx});ts.push({t:(TX2-BR-ox)/dx});}
    if(Math.abs(dy)>0.001){ts.push({t:(TY1+BR-oy)/dy});ts.push({t:(TY2-BR-oy)/dy});}
    for(const {t} of ts)if(t>0.5&&t<minT){minT=t;hitBall=null;}
    for(const b of balls){if(b.pocketed||b.num===0)continue;
      const fx=ox-b.x,fy=oy-b.y,a=dx*dx+dy*dy,bc=2*(fx*dx+fy*dy),c=fx*fx+fy*fy-(BR*2)*(BR*2),disc=bc*bc-4*a*c;
      if(disc<0)continue;const t=(-bc-Math.sqrt(disc))/(2*a);if(t>0.5&&t<minT){minT=t;hitBall=b;}
    }
    return{t:minT,ball:hitBall};
  }

  function drawTable(){
    ctx.fillStyle='#5C3317';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#7A4829';ctx.fillRect(2,2,W-4,H-4);
    const fg=ctx.createLinearGradient(TX1,TY1,TX2,TY2);fg.addColorStop(0,'#1e7c40');fg.addColorStop(1,'#186633');
    ctx.fillStyle=fg;ctx.fillRect(TX1,TY1,TW,TH);
    ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=2;ctx.strokeRect(TX1,TY1,TW,TH);
    [[TX1+TW*.73,TY1+TH/2],[TX1+TW*.27,TY1+TH/2]].forEach(([x,y])=>{ctx.fillStyle='rgba(255,255,255,0.18)';ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();});
    for(const p of POCKETS){ctx.fillStyle='#0a0808';ctx.beginPath();ctx.arc(p.x,p.y,PR,0,Math.PI*2);ctx.fill();}
  }

  function drawBall(b){
    const{x,y,num}=b,isStripe=num>=9&&num<=15,col=BALL_COLOR[num];
    ctx.fillStyle='rgba(0,0,0,0.22)';ctx.beginPath();ctx.ellipse(x+2,y+4,BR*.9,BR*.4,0,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(x,y,BR,0,Math.PI*2);ctx.clip();
    ctx.fillStyle=num===0?'#f0f0f0':isStripe?'#f4f4f4':col;ctx.fillRect(x-BR,y-BR,BR*2,BR*2);
    if(isStripe){ctx.fillStyle=col;ctx.fillRect(x-BR,y-BR*.52,BR*2,BR*1.04);}
    const g=ctx.createRadialGradient(x-BR*.28,y-BR*.3,0,x,y,BR);g.addColorStop(0,'rgba(255,255,255,0.55)');g.addColorStop(0.4,'rgba(255,255,255,0.08)');g.addColorStop(1,'rgba(0,0,0,0.15)');
    ctx.fillStyle=g;ctx.fillRect(x-BR,y-BR,BR*2,BR*2);ctx.restore();
    ctx.strokeStyle='rgba(0,0,0,0.3)';ctx.lineWidth=0.8;ctx.beginPath();ctx.arc(x,y,BR,0,Math.PI*2);ctx.stroke();
    if(num>0){ctx.fillStyle='rgba(255,255,255,0.92)';ctx.beginPath();ctx.arc(x,y,BR*.42,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.font=`bold ${Math.round(BR*.86)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(num,x,y+.5);}
  }

  function drawAimLine(){
    const cue=cueBall();if(!cue)return;
    const cos=Math.cos(aimAngle),sin=Math.sin(aimAngle),hit=castRay(cue.x,cue.y,cos,sin),hx=cue.x+cos*hit.t,hy=cue.y+sin*hit.t;
    ctx.save();ctx.setLineDash([5,5]);ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(cue.x,cue.y);ctx.lineTo(hx,hy);ctx.stroke();
    if(hit.ball){ctx.globalAlpha=0.28;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(hx,hy,BR,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      const nbx=hit.ball.x-hx,nby=hit.ball.y-hy,nd=Math.sqrt(nbx*nbx+nby*nby)||1;ctx.setLineDash([4,6]);ctx.strokeStyle='rgba(255,210,0,0.55)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(hit.ball.x,hit.ball.y);ctx.lineTo(hit.ball.x+nbx/nd*70,hit.ball.y+nby/nd*70);ctx.stroke();}
    ctx.setLineDash([]);ctx.restore();
  }

  function drawCue(){
    const cue=cueBall();if(!cue||state!=='aiming')return;
    const power=holding?getPower():3,gap=BR+4+power*1.3,cueLen=90;
    const bcos=Math.cos(aimAngle+Math.PI),bsin=Math.sin(aimAngle+Math.PI),x1=cue.x+bcos*gap,y1=cue.y+bsin*gap,x2=x1+bcos*cueLen,y2=y1+bsin*cueLen;
    const cg=ctx.createLinearGradient(x1,y1,x2,y2);cg.addColorStop(0,'#c8e8e8');cg.addColorStop(0.08,'#D4A840');cg.addColorStop(0.5,'#E8C458');cg.addColorStop(1,'#7A4E18');
    ctx.save();ctx.lineCap='round';ctx.shadowColor='rgba(0,0,0,0.4)';ctx.shadowBlur=3;ctx.shadowOffsetX=1;ctx.shadowOffsetY=1;
    ctx.strokeStyle=cg;ctx.lineWidth=5.5;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle='#ddd';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cue.x+bcos*(BR+2),cue.y+bsin*(BR+2));ctx.lineTo(x1);ctx.stroke();
    ctx.restore();
  }

  function drawFrame(){
    drawTable();
    if(state==='aiming'){
      drawAimLine();
      const cue=cueBall();if(cue){ctx.strokeStyle='rgba(198,255,61,0.4)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cue.x,cue.y,BR+5,0,Math.PI*2);ctx.stroke();}
    }
    for(const b of balls)if(!b.pocketed)drawBall(b);
    if(state==='aiming')drawCue();
    // power bar in bottom rail
    if(state==='aiming'){
      const pct=holding?powerPct/100:0,bx=TX1,by=TY2+4,bw=TW,bh=9;
      ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(bx,by,bw,bh);
      if(pct>0){const g=ctx.createLinearGradient(bx,0,bx+bw,0);g.addColorStop(0,'#00cc44');g.addColorStop(0.55,'#ffcc00');g.addColorStop(1,'#ff3300');ctx.fillStyle=g;ctx.fillRect(bx,by,bw*pct,bh);}
      ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1;ctx.strokeRect(bx,by,bw,bh);
    }
    // waiting overlay
    if(state==='waiting'||state==='opponent-turn'){
      ctx.fillStyle='rgba(0,0,0,0.28)';ctx.fillRect(TX1,TY1,TW,TH);
      ctx.fillStyle='rgba(255,255,255,0.75)';ctx.font='bold 14px Fredoka,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(state==='waiting'?t('online.billiard.waiting'):t('online.billiard.opponent'),W/2,H/2);
    }
  }

  function getPos(e){
    const r=canvas.getBoundingClientRect(),sx=W/r.width,sy=H/r.height;
    const cx=e.clientX??e.touches?.[0]?.clientX??0,cy=e.clientY??e.touches?.[0]?.clientY??0;
    return{x:(cx-r.left)*sx,y:(cy-r.top)*sy};
  }
  function onPM(e){if(state!=='aiming')return;const cue=cueBall();if(!cue)return;const p=getPos(e);aimAngle=Math.atan2(p.y-cue.y,p.x-cue.x);}
  function onPD(e){if(state!=='aiming')return;e.preventDefault();if(e.pointerId!=null)canvas.setPointerCapture(e.pointerId);onPM(e);holding=true;powerPct=0;}
  function onPU(){
    if(!holding)return;
    const power=getPower();
    holding=false;
    if(state==='aiming'){shoot(aimAngle,power);gchan.send({type:'broadcast',event:'bil-shot',payload:{angle:aimAngle,power}});}
  }
  canvas.addEventListener('pointermove',onPM);canvas.addEventListener('pointerdown',onPD);canvas.addEventListener('pointerup',onPU);canvas.addEventListener('pointercancel',()=>{holding=false;});
  canvas.style.cursor='crosshair';

  function loop(){
    if(done)return;raf=requestAnimationFrame(loop);
    if(state==='rolling'&&isHost){
      const moving=physicsStep();
      gchan.send({type:'broadcast',event:'bil-state',payload:{b:balls.map(b=>([Math.round(b.x*10)/10,Math.round(b.y*10)/10,b.pocketed?1:0]))}});
      if(!moving)endTurn();
    }
    if(state==='aiming'&&holding)powerPct=Math.min(powerPct+1.5,100);
    drawFrame();
  }

  const gchan=sb.channel('bil-'+myRoom.id,{config:{broadcast:{self:false}}});
  let initialBalls=null;

  gchan
    .on('broadcast',{event:'bil-init'},({payload})=>{
      if(isHost)return;
      initialBalls=payload.balls;
      setup(payload.balls);
      gchan.send({type:'broadcast',event:'bil-ready',payload:{}});
    })
    .on('broadcast',{event:'bil-ready'},()=>{
      if(!isHost)return;
      clearInterval(initInterval);initInterval=null;
      state='aiming';updateHUD();
    })
    .on('broadcast',{event:'bil-shot'},({payload})=>{
      if(isHost&&turn===1){shoot(payload.angle,payload.power);}
      else if(!isHost&&turn===0){state='rolling';}
    })
    .on('broadcast',{event:'bil-state'},({payload})=>{
      if(!isHost&&(state==='rolling'||state==='opponent-turn')&&payload.b){
        payload.b.forEach((row,i)=>{if(balls[i]){balls[i].x=row[0];balls[i].y=row[1];balls[i].pocketed=row[2]===1;}});
      }
    })
    .on('broadcast',{event:'bil-info'},({payload})=>applyInfo(payload))
    .on('broadcast',{event:'bil-end'},({payload})=>{
      if(!isHost)showEnd(t('online.billiard.wins', payload.winner==='host'?myRoom.host_name:myRoom.guest_name));
    })
    .subscribe(status=>{
      if(status!=='SUBSCRIBED')return;
      if(isHost){
        initialBalls=createRack();
        setup(initialBalls);
        initInterval=setInterval(()=>{
          if(done||!initInterval)return;
          gchan.send({type:'broadcast',event:'bil-init',payload:{balls:initialBalls.map(({x,y,num,pocketed})=>({x,y,num,pocketed}))}});
        },500);
      }
    });

  updateHUD();loop();

  return ()=>{
    done=true;clearAnimationFrame?.(raf);cancelAnimationFrame(raf);clearInterval(initInterval);
    canvas.removeEventListener('pointermove',onPM);canvas.removeEventListener('pointerdown',onPD);canvas.removeEventListener('pointerup',onPU);
    canvas.style.cursor='';gchan.unsubscribe();
  };
}

// ===== ONLINE PONG =====
function startGame(gameName) {
  showView('onlineGame');
  $('onlineResult').hidden = true;
  sfx.select();

  const canvas = $('onlineCanvas');
  const ctx    = canvas.getContext('2d');

  if(gameName === 'billiard') {
    gameCleanup = startBilliardOnline(canvas);
    return;
  }

  const W = 400, H = 280;
  canvas.width = W; canvas.height = H;

  const gchan = sb.channel('game-'+myRoom.id, { config: { broadcast: { self: false } } });

  const PH = 60, PW = 10;
  let hostY = 110, guestY = 110, myY = 110;
  let ball   = {x:200, y:140, vx:4, vy:3};
  let scores = {host:0, guest:0};
  let loopId = null, inputInterval = null, done = false;
  const hostName  = myRoom.host_name;
  const guestName = myRoom.guest_name;

  function updateScore() {
    const el = $('onlineScore');
    if(el) el.textContent = hostName + '  ' + scores.host + ' : ' + scores.guest + '  ' + guestName;
  }

  function draw() {
    ctx.fillStyle = '#0F0B1C'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = '#2D2545'; ctx.setLineDash([8,8]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#C6FF3D'; ctx.fillRect(10, hostY, PW, PH);
    ctx.fillStyle = '#FF6B4A'; ctx.fillRect(W-PW-10, guestY, PW, PH);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ball.x, ball.y, 6, 0, Math.PI*2); ctx.fill();
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    myY = Math.max(0, Math.min(H-PH, (cy - rect.top)*(H/rect.height) - PH/2));
  }
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('touchmove', e => { e.preventDefault(); onMove(e); }, {passive:false});

  function showResult(text) {
    done = true;
    cancelAnimationFrame(loopId);
    if(inputInterval) { clearInterval(inputInterval); inputInterval = null; }
    const el = $('onlineResult');
    if(el) { el.textContent = text; el.hidden = false; }
  }

  if(isHost) {
    function reset() {
      ball = {x:200, y:140, vx:(Math.random()<.5?4:-4), vy:(Math.random()*4-2)};
    }
    function loop() {
      if(done) return;
      hostY = myY;
      ball.x += ball.vx; ball.y += ball.vy;
      if(ball.y <= 0 || ball.y >= H)          { ball.vy *= -1; sfx.ballBounce(); }
      if(ball.x <= 20  && ball.y >= hostY  && ball.y <= hostY+PH)  { ball.vx = Math.abs(ball.vx)*1.03;  ball.x = 20;   sfx.bounce(); }
      if(ball.x >= W-20 && ball.y >= guestY && ball.y <= guestY+PH){ ball.vx =-Math.abs(ball.vx)*1.03; ball.x = W-20; sfx.bounce(); }
      if(ball.x < 0)  { scores.guest++; sfx.score(); updateScore(); reset(); }
      if(ball.x > W)  { scores.host++;  sfx.score(); updateScore(); reset(); }
      draw();
      if(scores.host >= 5 || scores.guest >= 5) {
        const win = scores.host >= 5;
        gchan.send({type:'broadcast',event:'end',payload:{winner:win?'host':'guest'}});
        showResult(t('online.pong.wins', win ? hostName : guestName));
        sfx.win();
        gchan.unsubscribe();
        return;
      }
      gchan.send({type:'broadcast',event:'state', payload:{ball:{...ball},hostY,guestY,scores:{...scores}}});
      loopId = requestAnimationFrame(loop);
    }
    gchan.on('broadcast',{event:'input'},({payload}) => { guestY = payload.y; })
         .subscribe(() => loop());
  } else {
    let lastState = null;
    inputInterval = setInterval(() => {
      if(!done) gchan.send({type:'broadcast',event:'input',payload:{y:myY}});
    }, 50);
    function renderLoop() {
      if(done) return;
      if(lastState) { hostY = lastState.hostY; guestY = myY; ball = lastState.ball; draw(); }
      loopId = requestAnimationFrame(renderLoop);
    }
    gchan.on('broadcast',{event:'state'},({payload}) => {
        lastState = payload; scores = payload.scores; updateScore();
      })
      .on('broadcast',{event:'end'},({payload}) => {
        done = true;
        if(inputInterval) { clearInterval(inputInterval); inputInterval = null; }
        cancelAnimationFrame(loopId);
        const won = payload.winner === 'guest';
        const el  = $('onlineResult');
        if(el) { el.textContent = t('online.pong.wins', won ? guestName : hostName); el.hidden = false; }
        sfx.win();
      })
      .subscribe(() => renderLoop());
  }

  updateScore();
  gameCleanup = () => {
    done = true;
    cancelAnimationFrame(loopId);
    if(inputInterval) clearInterval(inputInterval);
    canvas.removeEventListener('mousemove', onMove);
    gchan.unsubscribe();
  };
}

// ===== TOAST =====
function toast(msg) {
  let el = $('_ot');
  if(!el) {
    el = document.createElement('div');
    el.id = '_ot';
    el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);' +
      'background:#1A1428;border:1px solid #7C3AED;color:#fff;padding:10px 20px;' +
      'border-radius:8px;z-index:9999;font-size:14px;font-family:Inter,sans-serif;white-space:nowrap;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.style.display='none', 3500);
}

// ===== PUBLIC API =====
window.zzOpenOnline = () => {
  if(!currentUser) { window.zzOpenAuth?.(); return; }
  $('onlineOverlay').classList.add('open');
  showView('onlineMenu');
  zzShowTab('friends');
  $('joinCodeWrap').hidden = true;
  $('friendSearchResults').innerHTML = '';
  if($('friendSearchInput')) $('friendSearchInput').value = '';
};

window.zzCloseOnline = async () => {
  if(myRoom) { await leaveRoom(); }
  else       { $('onlineOverlay').classList.remove('open'); }
};

window.zzCreateRoom  = createRoom;
window.zzShowJoinCode = () => { $('joinCodeWrap').hidden = false; $('joinCodeInput')?.focus(); };
window.zzJoinRoom    = () => joinRoom($('joinCodeInput')?.value || '');
window.zzLeaveRoom   = leaveRoom;
window.zzPickGame    = () => { if(!myRoom?.guest_id) return; $('gamePicker').hidden = false; sfx.click(); };
window.zzStartGame   = name => { $('gamePicker').hidden = true; selectGame(name); };

// ===== AUTH =====
function onAuthChanged() {
  sb.auth.getUser().then(({data}) => {
    currentUser = data?.user || null;
    if(currentUser) {
      startPresence();
      listenForInvites();
    } else {
      stopPresence();
      if(friendsInviteSub) { friendsInviteSub.unsubscribe(); friendsInviteSub = null; }
    }
  });
}
window.addEventListener('zz:auth-changed', onAuthChanged);
onAuthChanged();

window.addEventListener('beforeunload', () => {
  if(!myRoom) return;
  if(isHost) sb.from('online_rooms').delete().eq('id', myRoom.id);
  else       sb.from('online_rooms').update({guest_id:null,guest_name:null,guest_avatar:null,status:'waiting'}).eq('id',myRoom.id);
});
