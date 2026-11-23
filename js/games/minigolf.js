import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// ⛳ MINIGOLF – zieh vom Ball weg, zielen, loslassen! Wenige Schläge = gut.
// ---------- 🛠️ LUKI-ECKE ----------
const SCHLAGKRAFT = 0.12;   // Wie fest wird der Ball geschlagen?
const REIBUNG     = 0.985;  // Wie schnell rollt der Ball aus? (näher an 1 = rollt länger)
// ------------------------------------
const W = 380, H = 300, R = 7, HOLE_R = 11;
// Bahnen: Start, Loch, Wände [x, y, breite, höhe], Par (Schläge, die ein Profi braucht)
const COURSES = [
  { s: [60, 150], h: [320, 150], walls: [], par: 2 },
  { s: [60, 240], h: [320, 60], walls: [[170, 90, 20, 210]], par: 3 },
  { s: [60, 60], h: [320, 240], walls: [[130, 0, 20, 200], [230, 100, 20, 200]], par: 3 },
  { s: [190, 260], h: [190, 50], walls: [[100, 140, 180, 18]], par: 3 },
  { s: [50, 150], h: [330, 150], walls: [[150, 60, 18, 70], [150, 170, 18, 70], [240, 110, 18, 80]], par: 3 },
  { s: [60, 250], h: [320, 250], walls: [[120, 120, 20, 180], [240, 0, 20, 180]], par: 4 },
];

export function build(){
  const scoreEl = hud([L('Bahn', 'Hole'),'mgHole'], [L('Schläge', 'Strokes'),'mgShots'], [L('Gesamt', 'Total'),'mgTotal']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'crosshair';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint(L('Drück irgendwo, zieh vom Ball weg (wie eine Steinschleuder) und lass los. Treffer ins Loch → nächste Bahn!', 'Press anywhere, pull away from the ball (like a slingshot) and let go. Sink it → next hole!')));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let hole, ball, shots, total, aiming, aim, loopId, running, sinking, scoreCard;

  function start(){ hole = 0; total = 0; scoreCard = []; running = true; over.classList.remove('show'); loadHole(); cancelAnimationFrame(loopId); loop(); }
  function loadHole(){
    const c = COURSES[hole];
    ball = { x: c.s[0], y: c.s[1], vx: 0, vy: 0 }; shots = 0; sinking = 0; aiming = false;
    updateHud();
  }
  function updateHud(){
    const h = Math.min(hole, COURSES.length - 1);   // nach der letzten Bahn nicht über das Ende hinaus lesen
    document.getElementById('mgHole').textContent = `${h + 1}/${COURSES.length} (Par ${COURSES[h].par})`;
    document.getElementById('mgShots').textContent = shots;
    document.getElementById('mgTotal').textContent = total;
  }
  const moving = () => Math.hypot(ball.vx, ball.vy) > 0.05;
  function loop(){
    if(!running) return;
    const c = COURSES[hole];
    if(sinking){
      sinking++;
      ball.x += (c.h[0] - ball.x) * 0.3; ball.y += (c.h[1] - ball.y) * 0.3;
      if(sinking > 30) nextHole();
    } else if(moving()){
      // in kleinen Schritten bewegen, damit der Ball nicht durch Wände flutscht
      const steps = Math.ceil(Math.hypot(ball.vx, ball.vy) / 3);
      for(let i = 0; i < steps; i++){
        ball.x += ball.vx / steps; ball.y += ball.vy / steps;
        if(ball.x < R){ ball.x = R; ball.vx = Math.abs(ball.vx) * 0.8; sfx.bump?.(); }
        if(ball.x > W - R){ ball.x = W - R; ball.vx = -Math.abs(ball.vx) * 0.8; sfx.bump?.(); }
        if(ball.y < R){ ball.y = R; ball.vy = Math.abs(ball.vy) * 0.8; sfx.bump?.(); }
        if(ball.y > H - R){ ball.y = H - R; ball.vy = -Math.abs(ball.vy) * 0.8; sfx.bump?.(); }
        for(const [wx, wy, ww, wh] of c.walls){
          const cx = Math.max(wx, Math.min(ball.x, wx + ww)), cy = Math.max(wy, Math.min(ball.y, wy + wh));
          const dx = ball.x - cx, dy = ball.y - cy, d = Math.hypot(dx, dy);
          if(d < R && d > 0){
            const nx = dx / d, ny = dy / d, dot = ball.vx * nx + ball.vy * ny;
            ball.x = cx + nx * R; ball.y = cy + ny * R;
            if(dot < 0){ ball.vx -= 1.8 * dot * nx; ball.vy -= 1.8 * dot * ny; sfx.bump?.(); }
          }
        }
      }
      ball.vx *= REIBUNG; ball.vy *= REIBUNG;
      if(!moving()){ ball.vx = 0; ball.vy = 0; }
      // Loch: nah genug und nicht zu schnell
      const dh = Math.hypot(ball.x - c.h[0], ball.y - c.h[1]);
      if(dh < HOLE_R && Math.hypot(ball.vx, ball.vy) < 6){ sinking = 1; ball.vx = ball.vy = 0; sfx.coin(); }
    }
    draw();
    loopId = requestAnimationFrame(loop);
  }
  function nextHole(){
    total += shots; scoreCard.push(shots - COURSES[hole].par);
    hole++;
    if(hole >= COURSES.length){
      running = false; updateHud(); sfx.win();
      const par = COURSES.reduce((a, c) => a + c.par, 0), diff = total - par;
      over.querySelector('div').textContent = `Fertig! ${total} Schläge (${diff === 0 ? 'genau Par' : diff < 0 ? diff + ' unter Par 🏆' : '+' + diff + ' über Par'})`;
      over.classList.add('show'); draw(); return;
    }
    loadHole();
  }
  function draw(){
    const c = COURSES[hole] || COURSES[COURSES.length - 1];
    ctx.fillStyle = '#15803D'; ctx.fillRect(0, 0, W, H);
    // Rasen-Streifen
    ctx.fillStyle = 'rgba(255,255,255,.04)'; for(let x = 0; x < W; x += 40) ctx.fillRect(x, 0, 20, H);
    ctx.strokeStyle = '#78350F'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
    for(const [wx, wy, ww, wh] of c.walls){
      ctx.fillStyle = '#92400E'; ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = '#B45309'; ctx.fillRect(wx, wy, ww, 4);
    }
    // Loch + Fahne
    ctx.fillStyle = '#052E16'; ctx.beginPath(); ctx.arc(c.h[0], c.h[1], HOLE_R, 0, 7); ctx.fill();
    ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c.h[0], c.h[1]); ctx.lineTo(c.h[0], c.h[1] - 34); ctx.stroke();
    ctx.fillStyle = '#EF4444'; ctx.beginPath(); ctx.moveTo(c.h[0], c.h[1] - 34); ctx.lineTo(c.h[0] + 18, c.h[1] - 28); ctx.lineTo(c.h[0], c.h[1] - 22); ctx.fill();
    // Ziellinie
    if(aiming){
      const v = shotVec();
      const len = Math.hypot(v.vx, v.vy);
      ctx.strokeStyle = len > 9 ? '#EF4444' : len > 5 ? '#FACC15' : '#C6FF3D';
      ctx.setLineDash([6, 6]); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(ball.x + v.vx * 8, ball.y + v.vy * 8); ctx.stroke(); ctx.setLineDash([]);
    }
    // Ball
    const r = sinking ? R * Math.max(0.2, 1 - sinking / 30) : R;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(ball.x + 2, ball.y + 2, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(ball.x, ball.y, r, 0, 7); ctx.fill();
  }
  function shotVec(){
    let dx = ball.x - aim.x, dy = ball.y - aim.y;
    const len = Math.hypot(dx, dy), max = 110;
    if(len > max){ dx *= max / len; dy *= max / len; }
    return { vx: dx * SCHLAGKRAFT, vy: dy * SCHLAGKRAFT };
  }
  const pt = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) }; };
  canvas.addEventListener('pointerdown', e => { if(!running || moving() || sinking) return; aiming = true; aim = pt(e); canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if(aiming) aim = pt(e); });
  canvas.addEventListener('pointerup', () => {
    if(!aiming) return; aiming = false;
    const v = shotVec(); if(Math.hypot(v.vx, v.vy) < 0.6) return;
    ball.vx = v.vx; ball.vy = v.vy; shots++; sfx.hit?.(); updateHud();
  });
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); };
}
