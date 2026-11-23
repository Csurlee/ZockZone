import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// 🪂 FALLSCHIRM – lenk den Fallschirmspringer aufs Boot! Achtung, der Wind ändert sich.
// Je näher an der Mitte vom Boot, desto mehr Punkte.
// ---------- 🛠️ LUKI-ECKE ----------
const SPRUENGE = 8;      // Wie viele Sprünge pro Runde?
const MAX_WIND = 1.2;    // Wie stark kann der Wind wehen?
// ------------------------------------
const W = 360, H = 440, SEA = 400;

export function build(){
  const scoreEl = hud(['Punkte','pcScore'], ['Sprung','pcJump'], ['Wind','pcWind']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.touchAction = 'none';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('← → oder A D lenken (Handy: links/rechts gedrückt halten). Lande genau in der Mitte vom Boot!'));
  addLeaderboardUI('parachute', 'Fallschirm');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let jumper, boat, wind, score, jump, keys = {}, touch = 0, loopId, running, msg, clouds, splash;

  function start(){ score = 0; jump = 0; running = true; clouds = Array.from({ length: 5 }, () => ({ x: Math.random() * W, y: 40 + Math.random() * 200, s: 0.6 + Math.random() * 0.8 })); over.classList.remove('show'); nextJump(); cancelAnimationFrame(loopId); loop(); }
  function nextJump(){
    jump++; wind = (Math.random() * 2 - 1) * MAX_WIND * (0.5 + jump / SPRUENGE);
    jumper = { x: 40 + Math.random() * (W - 80), y: 20, vx: 0, sway: 0, landed: false };
    boat = { x: 60 + Math.random() * (W - 120), w: Math.max(50, 90 - jump * 4), dir: Math.random() < .5 ? -1 : 1, speed: 0.3 + jump * 0.08 };
    splash = 0; updateHud();
  }
  function updateHud(){ document.getElementById('pcScore').textContent = score; document.getElementById('pcJump').textContent = `${Math.min(jump, SPRUENGE)}/${SPRUENGE}`; document.getElementById('pcWind').textContent = (wind > 0 ? '→ ' : '← ') + Math.abs(wind).toFixed(1); }
  function loop(){
    if(!running) return;
    boat.x += boat.dir * boat.speed; if(boat.x < boat.w / 2 + 5 || boat.x > W - boat.w / 2 - 5) boat.dir *= -1;
    clouds.forEach(c => { c.x += wind * c.s * 0.5; if(c.x > W + 40) c.x = -40; if(c.x < -40) c.x = W + 40; });
    if(!jumper.landed){
      let dir = touch; if(keys.ArrowLeft || keys.a) dir = -1; if(keys.ArrowRight || keys.d) dir = 1;
      jumper.vx += dir * 0.12; jumper.vx += (wind - jumper.vx) * 0.02; jumper.vx *= 0.97;
      jumper.x += jumper.vx; jumper.y += 1.1; jumper.sway += 0.05;
      jumper.x = Math.max(10, Math.min(W - 10, jumper.x));
      if(jumper.y >= SEA - 22){
        jumper.landed = true;
        const off = Math.abs(jumper.x - boat.x);
        if(off < boat.w / 2){ const pts = Math.round(100 * (1 - off / (boat.w / 2))) + 10; score += pts; msg = { txt: pts > 90 ? `🎯 VOLLTREFFER! +${pts}` : `Gelandet! +${pts}`, t: 0 }; sfx.coin(); jumper.onBoat = jumper.x - boat.x; }
        else { msg = { txt: '💦 Platsch! Ins Wasser', t: 0 }; sfx.miss(); splash = 1; }
        updateHud();
        setTimeout(() => { if(!running) return; if(jump >= SPRUENGE){ running = false; sfx.win(); over.querySelector('div').textContent = `Fertig! ${score} Punkte 🪂`; over.classList.add('show'); window.zzSaveHighScore?.('parachute', 'Fallschirm', score); } else nextJump(); }, 1300);
      }
    } else if(jumper.onBoat !== undefined) jumper.x = boat.x + jumper.onBoat;
    if(splash) splash++;
    if(msg){ msg.t++; if(msg.t > 70) msg = null; }
    draw();
    loopId = requestAnimationFrame(loop);
  }
  function draw(){
    const g = ctx.createLinearGradient(0, 0, 0, SEA); g.addColorStop(0, '#60A5FA'); g.addColorStop(1, '#DBEAFE');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, SEA);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; clouds.forEach(c => { ctx.beginPath(); ctx.arc(c.x, c.y, 16 * c.s, 0, 7); ctx.arc(c.x + 18 * c.s, c.y - 6 * c.s, 20 * c.s, 0, 7); ctx.arc(c.x + 36 * c.s, c.y, 15 * c.s, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#0369A1'; ctx.fillRect(0, SEA, W, H - SEA);
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.beginPath(); for(let x = 0; x <= W; x += 10) ctx.lineTo(x, SEA + Math.sin(x / 15 + performance.now() / 300) * 2); ctx.stroke();
    // Boot
    ctx.fillStyle = '#B45309'; ctx.beginPath(); ctx.moveTo(boat.x - boat.w / 2, SEA - 6); ctx.lineTo(boat.x + boat.w / 2, SEA - 6); ctx.lineTo(boat.x + boat.w / 2 - 10, SEA + 8); ctx.lineTo(boat.x - boat.w / 2 + 10, SEA + 8); ctx.fill();
    ctx.fillStyle = '#C6FF3D'; ctx.fillRect(boat.x - 3, SEA - 10, 6, 4);
    // Springer
    const j = jumper;
    if(!splash || splash < 10){
      ctx.save(); ctx.translate(j.x, j.y); ctx.rotate(j.landed ? 0 : Math.sin(j.sway) * 0.15 + j.vx * 0.05);
      if(!j.landed){ ctx.fillStyle = '#EF4444'; ctx.beginPath(); ctx.arc(0, -26, 22, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#FDE047'; ctx.beginPath(); ctx.arc(0, -26, 22, Math.PI, Math.PI * 1.33); ctx.lineTo(0, -26); ctx.fill(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; [-20, -7, 7, 20].forEach(x => { ctx.beginPath(); ctx.moveTo(x, -26); ctx.lineTo(0, -6); ctx.stroke(); }); }
      ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🧑', 0, 0);
      ctx.restore();
    }
    if(splash && splash < 30){ ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(j.x, SEA, splash, Math.PI, 0); ctx.stroke(); }
    // Windfahne
    ctx.fillStyle = '#1F2937'; ctx.font = 'bold 13px Fredoka, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Wind ' + (wind > 0 ? '→'.repeat(1 + Math.round(Math.abs(wind) * 2)) : '←'.repeat(1 + Math.round(Math.abs(wind) * 2))), 10, 20);
    if(msg){ ctx.globalAlpha = 1 - msg.t / 70; ctx.fillStyle = '#1E1B4B'; ctx.font = 'bold 22px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(msg.txt, W / 2, 200); ctx.globalAlpha = 1; }
  }
  const kd = e => { if(['ArrowLeft','ArrowRight','a','d'].includes(e.key)){ keys[e.key] = true; e.preventDefault(); } };
  const ku = e => { keys[e.key] = false; };
  canvas.addEventListener('pointerdown', e => { const r = canvas.getBoundingClientRect(); touch = e.clientX - r.left < r.width / 2 ? -1 : 1; });
  ['pointerup','pointerleave','pointercancel'].forEach(ev => canvas.addEventListener(ev, () => { touch = 0; }));
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
}
