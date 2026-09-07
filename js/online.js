import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sfx } from './sfx.js';

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
      listEl.innerHTML = '<div class="friend-empty">Noch keine Freunde. Suche nach Spielern oben!</div>';
      return;
    }
    let html = accepted.length ? `<div class="friend-section-title">👥 Freunde</div>` : '';
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
          ${online ? `<button class="friend-btn invite" onclick="zzInviteFriend('${fid}','${esc(p.display_name||'?')}')">🎮 Einladen</button>` : '<span class="friend-offline-label">offline</span>'}
          <button class="friend-btn remove" onclick="zzRemoveFriend('${f.id}')" title="Freundschaft entfernen">🗑</button>
        </div>`;
      }).join('');
    }
    if(sent.length) {
      html += `<div class="friend-section-title" style="margin-top:12px">⏳ Gesendete Anfragen</div>`;
      const ids = sent.map(f => f.addressee_id);
      const { data: profiles } = await sb.from('profiles').select('id,display_name').in('id', ids);
      const map = Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
      html += sent.map(f => {
        const p = map[f.addressee_id] || {};
        return `<div class="friend-item pending">
          👤 <span>${esc(p.display_name||'?')}</span>
          <span class="friend-pending-label">ausstehend</span>
          <button class="friend-btn remove" onclick="zzRemoveFriend('${f.id}')" title="Anfrage zurückziehen">✕</button>
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
  if(!data?.length) { resEl.innerHTML = '<div class="friend-empty">Kein Spieler gefunden.</div>'; return; }

  resEl.innerHTML = data.map(p => {
    const online = p.last_seen && (Date.now() - new Date(p.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
    let btn = '';
    if(friendIds.has(p.id))       btn = '<span class="friend-already">✔ Freund</span>';
    else if(pendingFrom.has(p.id)) btn = '<span class="friend-pending-label">Anfrage gesendet</span>';
    else                           btn = `<button class="friend-btn accept" onclick="zzSendRequest('${p.id}')">+ Freund</button>`;
    return `<div class="friend-item">
      <span class="friend-status-dot ${online?'online':'offline'}"></span>
      ${avatarOf(p.avatar)} <span>${esc(p.display_name||p.id)}</span>
      ${btn}
    </div>`;
  }).join('');
};

window.zzSendRequest = async function(addresseeId) {
  const { error } = await sb.from('friendships').insert({ requester_id: currentUser.id, addressee_id: addresseeId });
  if(error) { toast(error.code==='23505' ? 'Anfrage bereits gesendet!' : 'Fehler: '+error.message); return; }
  toast('Freundschaftsanfrage gesendet!');
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
  if(error) { toast('Fehler: '+error.message); return; }
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

  toast(`Einladung an ${friendName} gesendet!`);
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
  el.innerHTML = `🎮 <b>${name}</b> lädt dich ein!<br>
    <button onclick="zzJoinInvite('${code}')" style="margin-top:8px;background:#C6FF3D;color:#000;border:none;border-radius:6px;padding:6px 18px;cursor:pointer;font-weight:600;">Annehmen</button>
    <button onclick="document.getElementById('_inviteToast').style.display='none'" style="margin-top:8px;margin-left:8px;background:transparent;color:#888;border:1px solid #555;border-radius:6px;padding:6px 12px;cursor:pointer;">Ablehnen</button>`;
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
      : '<span class="lobby-waiting">Warte auf Spieler…</span>';
  }
  const pickBtn = $('lobbyPickGame');
  if(pickBtn) {
    pickBtn.hidden   = !isHost;
    pickBtn.disabled = !myRoom.guest_id;
  }
  const statusEl = $('lobbyStatus');
  if(statusEl) {
    if(myRoom.guest_id && isHost)   statusEl.textContent = 'Wähle ein Spiel aus!';
    else if(myRoom.guest_id)        statusEl.textContent = 'Warte auf den Gastgeber…';
    else                            statusEl.textContent = 'Teile den Code mit einem Freund!';
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
  if(error) { toast('Fehler: '+error.message); return; }
  myRoom = data;
  isHost = true;
  sfx.blip();
  openLobby();
}

async function joinRoom(code) {
  if(!currentUser) { window.zzOpenAuth?.(); return; }
  code = code.toUpperCase().trim();
  if(code.length !== 6) { toast('Bitte einen 6-stelligen Code eingeben!'); return; }
  const meta = currentUser.user_metadata || {};
  const { data: room } = await sb.from('online_rooms').select('*').eq('code', code).maybeSingle();
  if(!room)                          { toast('Raum nicht gefunden!'); return; }
  if(room.guest_id)                  { toast('Raum ist bereits voll!'); return; }
  if(room.host_id === currentUser.id){ toast('Das ist dein eigener Raum!'); return; }
  const { data, error } = await sb.from('online_rooms').update({
    guest_id:     currentUser.id,
    guest_name:   meta.display_name || currentUser.email?.split('@')[0] || 'Spieler',
    guest_avatar: meta.avatar || '',
    status:       'ready',
  }).eq('code', code).select().single();
  if(error) { toast('Fehler beim Beitreten!'); return; }
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
        toast('Spieler hat den Raum verlassen.');
        $('lobbyChatArea').hidden = true;
      }
    })
    .on('postgres_changes', {
      event:'DELETE', schema:'public', table:'online_rooms',
      filter:`id=eq.${myRoom.id}`
    }, () => {
      if(!isHost) {
        toast('Gastgeber hat den Raum verlassen.');
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
  if(error) toast('Nachricht konnte nicht gesendet werden.');
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

// ===== ONLINE PONG =====
function startGame(gameName) {
  showView('onlineGame');
  $('onlineResult').hidden = true;
  sfx.select();

  const canvas = $('onlineCanvas');
  const ctx    = canvas.getContext('2d');
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
        showResult((win ? hostName : guestName) + ' gewinnt! 🎉');
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
        if(el) { el.textContent = (won ? guestName : hostName) + ' gewinnt! 🎉'; el.hidden = false; }
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
