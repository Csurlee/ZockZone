import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sfx } from './sfx.js';

const SUPABASE_URL = 'https://supabase.hackthelab.uk';
const SUPABASE_ANON_KEY = 'sb_publishable_rWR-Aesm3GyJxEnvrhcZ2M_ZmMoQWdB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AVATAR_MAP = {
  snake:'🐍', alien:'👾', rocket:'🚀', bomb:'💣',
  dice:'🎲', joker:'🃏', puzzle:'🧩', lightning:'⚡',
  ghost:'👻', trophy:'🏆'
};

let currentUser = null;
let myRoom = null;
let isHost = false;
let roomChannel = null;
let gameCleanup = null;

const $ = id => document.getElementById(id);
const avatarOf = av => AVATAR_MAP[av] || '👤';
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6}, () => c[Math.floor(Math.random()*c.length)]).join('');
}

// ===== VIEWS =====
function showView(id) {
  ['onlineMenu','onlineLobby','onlineGame'].forEach(v => {
    const el = $(v);
    if(el) el.hidden = v !== id;
  });
}

// ===== LOBBY UI =====
function updateLobbyUI() {
  if(!myRoom) return;
  const codeEl = $('lobbyCode');
  if(codeEl) codeEl.textContent = myRoom.code;
  const hostEl = $('lobbyHostName');
  if(hostEl) hostEl.textContent = avatarOf(myRoom.host_avatar) + ' ' + myRoom.host_name;
  const guestEl = $('lobbyGuestName');
  if(guestEl) {
    guestEl.innerHTML = myRoom.guest_name
      ? avatarOf(myRoom.guest_avatar) + ' ' + esc(myRoom.guest_name)
      : '<span class="lobby-waiting">Warte auf Spieler…</span>';
  }
  const pickBtn = $('lobbyPickGame');
  if(pickBtn) {
    pickBtn.hidden = !isHost;
    pickBtn.disabled = !myRoom.guest_id;
  }
  const statusEl = $('lobbyStatus');
  if(statusEl) {
    if(myRoom.guest_id && isHost)   statusEl.textContent = 'Wähle ein Spiel aus!';
    else if(myRoom.guest_id)        statusEl.textContent = 'Warte auf den Gastgeber…';
    else                             statusEl.textContent = 'Teile den Code mit einem Freund!';
  }
}

// ===== ROOM OPERATIONS =====
async function createRoom() {
  if(!currentUser) { window.zzOpenAuth?.(); return; }
  const meta = currentUser.user_metadata || {};
  const code = genCode();
  const { data, error } = await sb.from('online_rooms').insert({
    code,
    host_id: currentUser.id,
    host_name: meta.display_name || currentUser.email?.split('@')[0] || 'Spieler',
    host_avatar: meta.avatar || ''
  }).select().single();
  if(error) { toast('Fehler: ' + error.message); return; }
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
  const { data: room } = await sb.from('online_rooms')
    .select('*').eq('code', code).maybeSingle();
  if(!room)            { toast('Raum nicht gefunden!'); return; }
  if(room.guest_id)    { toast('Raum ist bereits voll!'); return; }
  if(room.host_id === currentUser.id) { toast('Das ist dein eigener Raum!'); return; }
  const { data, error } = await sb.from('online_rooms').update({
    guest_id: currentUser.id,
    guest_name: meta.display_name || currentUser.email?.split('@')[0] || 'Spieler',
    guest_avatar: meta.avatar || '',
    status: 'ready'
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
  $('gamePicker').hidden = true;
  $('onlineResult').hidden = true;
  updateLobbyUI();
  subscribeRoom();
}

function subscribeRoom() {
  if(roomChannel) { roomChannel.unsubscribe(); roomChannel = null; }
  roomChannel = sb.channel('room-' + myRoom.id)
    .on('postgres_changes', {
      event:'UPDATE', schema:'public', table:'online_rooms',
      filter:`id=eq.${myRoom.id}`
    }, ({new: updated}) => {
      const wasPlaying = myRoom.status === 'playing';
      myRoom = updated;
      updateLobbyUI();
      if(!wasPlaying && updated.status === 'playing' && !isHost) {
        startGame(updated.selected_game || 'pong');
      }
      if(!updated.guest_id && isHost && myRoom.status !== 'playing') {
        toast('Spieler hat den Raum verlassen.');
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

async function selectGame(gameName) {
  if(!isHost || !myRoom) return;
  const { data } = await sb.from('online_rooms')
    .update({ selected_game: gameName, status: 'playing' })
    .eq('id', myRoom.id).select().single();
  if(data) { myRoom = data; startGame(gameName); }
}

async function leaveRoom() {
  if(gameCleanup) { gameCleanup(); gameCleanup = null; }
  if(roomChannel)  { roomChannel.unsubscribe(); roomChannel = null; }
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
  if(gameCleanup) { gameCleanup(); gameCleanup = null; }
  if(roomChannel)  { roomChannel.unsubscribe(); roomChannel = null; }
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

  const gchan = sb.channel('game-' + myRoom.id, {
    config: { broadcast: { self: false } }
  });

  const PH = 60, PW = 10;
  let hostY = 110, guestY = 110, myY = 110;
  let ball  = {x:200, y:140, vx:4, vy:3};
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
      if(ball.y <= 0 || ball.y >= H)         { ball.vy *= -1; sfx.ballBounce(); }
      if(ball.x <= 20 && ball.y >= hostY  && ball.y <= hostY+PH)  { ball.vx = Math.abs(ball.vx)*1.03; ball.x = 20;   sfx.bounce(); }
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
      gchan.send({type:'broadcast',event:'state',
        payload:{ball:{...ball},hostY,guestY,scores:{...scores}}});
      loopId = requestAnimationFrame(loop);
    }
    gchan.on('broadcast',{event:'input'},({payload}) => { guestY = payload.y; })
         .subscribe(() => loop());

  } else {
    // GUEST: renders host state, sends own paddle position
    let lastState = null;
    inputInterval = setInterval(() => {
      if(!done) gchan.send({type:'broadcast',event:'input',payload:{y:myY}});
    }, 50);
    function renderLoop() {
      if(done) return;
      if(lastState) {
        hostY = lastState.hostY;
        guestY = myY;    // instant local feedback
        ball   = lastState.ball;
        draw();
      }
      loopId = requestAnimationFrame(renderLoop);
    }
    gchan.on('broadcast',{event:'state'},({payload}) => {
        lastState = payload;
        scores    = payload.scores;
        updateScore();
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
  const jw = $('joinCodeWrap');
  if(jw) jw.hidden = true;
  const ji = $('joinCodeInput');
  if(ji) ji.value = '';
};

window.zzCloseOnline = async () => {
  if(myRoom) { await leaveRoom(); }
  else       { $('onlineOverlay').classList.remove('open'); }
};

window.zzCreateRoom = createRoom;

window.zzShowJoinCode = () => {
  $('joinCodeWrap').hidden = false;
  $('joinCodeInput')?.focus();
};

window.zzJoinRoom = () => {
  const code = $('joinCodeInput')?.value || '';
  joinRoom(code);
};

window.zzLeaveRoom = leaveRoom;

window.zzPickGame = () => {
  if(!myRoom?.guest_id) return;
  $('gamePicker').hidden = false;
  sfx.click();
};

window.zzStartGame = name => {
  $('gamePicker').hidden = true;
  selectGame(name);
};

// ===== AUTH =====
function onAuthChanged() {
  sb.auth.getUser().then(({data}) => { currentUser = data?.user || null; });
}
window.addEventListener('zz:auth-changed', onAuthChanged);
onAuthChanged();

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if(!myRoom) return;
  if(isHost) sb.from('online_rooms').delete().eq('id', myRoom.id);
  else       sb.from('online_rooms').update({guest_id:null,guest_name:null,guest_avatar:null,status:'waiting'}).eq('id',myRoom.id);
});
