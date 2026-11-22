import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// 🏀 KORBWURF – zieh den Ball nach hinten wie eine Steinschleuder und lass los!
// ---------- 🛠️ LUKI-ECKE ----------
const WUERFE      = 10;    // Wie viele Würfe hast du?
const SCHWERKRAFT = 0.35;  // Wie stark fällt der Ball?
const WURFKRAFT   = 0.16;  // Wie stark wird der Ball geworfen?
// ------------------------------------
const W = 380, H = 420, BALL_R = 13;

export function build(){
  const scoreEl = hud(['Körbe','bbScore'], ['Würfe','bbLeft'], ['Bestwert','bbBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.cursor = 'grab'; canvas.style.touchAction = 'none';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Drück auf den Ball, zieh nach hinten und lass los. Je weiter du ziehst, desto fester der Wurf!'));
  addLeaderboardUI('basketball', 'Korbwurf');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let ball, hoop, aiming, aim, score, left, best = 0, loopId, running, streak, msg;

  const START = { x: 70, y: H - 70 };
  function start(){
    score = 0; left = WUERFE; streak = 0; msg = null; running = true;
    placeHoop(); resetBall();
    over.classList.remove('show'); updateHud();
    cancelAnimationFrame(loopId); loop();
  }
  function placeHoop(){ hoop = { x: 230 + Math.random() * 110, y: 120 + Math.random() * 130, w: 46 }; }
  function resetBall(){ ball = { x: START.x, y: START.y, vx: 0, vy: 0, flying: false, scored: false, prevY: START.y, t: 0 }; aiming = false; }
  function updateHud(){
    document.getElementById('bbScore').textContent = score;
    document.getElementById('bbLeft').textContent = left;
    document.getElementById('bbBest').textContent = best;
  }
  function loop(){
    if(!running) return;
    if(ball.flying){
      ball.prevY = ball.y;
      ball.vy += SCHWERKRAFT; ball.x += ball.vx; ball.y += ball.vy; ball.t++;
      // Ring-Kanten (kleine Pfosten links und rechts)
      for(const rx of [hoop.x - hoop.w / 2, hoop.x + hoop.w / 2]){
        const dx = ball.x - rx, dy = ball.y - hoop.y, d = Math.hypot(dx, dy);
        if(d < BALL_R + 3){ const nx = dx / d, ny = dy / d; const dot = ball.vx * nx + ball.vy * ny; if(dot < 0){ ball.vx -= 1.7 * dot * nx; ball.vy -= 1.7 * dot * ny; sfx.bump?.(); } ball.x = rx + nx * (BALL_R + 3); ball.y = hoop.y + ny * (BALL_R + 3); }
      }
      // Brett hinter dem Korb
      const bx = hoop.x + hoop.w / 2 + 6;
      if(ball.x + BALL_R > bx && ball.x < bx + 8 && ball.y > hoop.y - 60 && ball.y < hoop.y + 10 && ball.vx > 0){ ball.vx *= -0.6; ball.x = bx - BALL_R; sfx.bump?.(); }
      // Korb! (von oben durch den Ring)
      if(!ball.scored && ball.prevY < hoop.y && ball.y >= hoop.y && Math.abs(ball.x - hoop.x) < hoop.w / 2 - BALL_R * 0.4 && ball.vy > 0){
        ball.scored = true; streak++; const pts = streak >= 3 ? 2 : 1; score += pts; sfx.coin();
        msg = { txt: streak >= 3 ? `🔥 ${streak}er-Serie! +2` : 'KORB! +1', t: 0 };
        updateHud();
      }
      // Boden / aus dem Bild
      if(ball.y > H - BALL_R - 20){ ball.y = H - BALL_R - 20; ball.vy *= -0.5; ball.vx *= 0.8; }
      if(ball.x < -30 || ball.x > W + 30 || ball.t > 260 || (Math.abs(ball.vy) < 0.8 && ball.y >= H - BALL_R - 21)) endThrow();
    }
    if(msg){ msg.t++; if(msg.t > 60) msg = null; }
    draw();
    loopId = requestAnimationFrame(loop);
  }
  function endThrow(){
    if(!ball.scored){ streak = 0; sfx.miss(); } else placeHoop();
    left--; updateHud();
    if(left <= 0){ running = false; if(score > best) best = score; updateHud(); sfx.win();
      over.querySelector('div').textContent = `${score} Punkte mit ${WUERFE} Würfen! 🏀`; over.classList.add('show');
      window.zzSaveHighScore?.('basketball', 'Korbwurf', score); draw(); return; }
    resetBall();
  }
  function draw(){
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1E1B4B'); g.addColorStop(1, '#4C1D95');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Hallenboden
    ctx.fillStyle = '#B45309'; ctx.fillRect(0, H - 20, W, 20);
    ctx.fillStyle = 'rgba(255,255,255,.15)'; for(let x = 0; x < W; x += 40) ctx.fillRect(x, H - 20, 2, 20);
    // Brett + Korb
    const bx = hoop.x + hoop.w / 2 + 6;
    ctx.fillStyle = '#E5E7EB'; ctx.fillRect(bx, hoop.y - 60, 8, 70);
    ctx.fillStyle = '#6B7280'; ctx.fillRect(bx + 8, hoop.y - 20, 4, H);
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5;
    for(let i = 0; i <= 4; i++){ const x = hoop.x - hoop.w / 2 + i * hoop.w / 4; ctx.beginPath(); ctx.moveTo(x, hoop.y); ctx.lineTo(hoop.x - hoop.w / 4 + i * hoop.w / 8, hoop.y + 30); ctx.stroke(); }
    ctx.strokeStyle = '#F97316'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hoop.x - hoop.w / 2, hoop.y); ctx.lineTo(hoop.x + hoop.w / 2, hoop.y); ctx.stroke();
    // Ziel-Hilfe beim Zielen
    if(aiming){
      const v = velocity();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      let x = ball.x, y = ball.y, vx = v.vx, vy = v.vy;
      for(let i = 0; i < 26; i++){ vy += SCHWERKRAFT; x += vx; y += vy; if(i % 2 === 0){ ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); } }
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(START.x, START.y); ctx.lineTo(aim.x, aim.y); ctx.stroke();
    }
    // Ball
    ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(ball.x / 15);
    ctx.fillStyle = '#F97316'; ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7C2D12'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, 7); ctx.moveTo(-BALL_R, 0); ctx.lineTo(BALL_R, 0); ctx.moveTo(0, -BALL_R); ctx.lineTo(0, BALL_R); ctx.stroke();
    ctx.restore();
    if(msg){ ctx.globalAlpha = 1 - msg.t / 60; ctx.fillStyle = '#C6FF3D'; ctx.font = 'bold 24px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(msg.txt, W / 2, 60 - msg.t * 0.3); ctx.globalAlpha = 1; }
  }
  function velocity(){
    let dx = START.x - aim.x, dy = START.y - aim.y;
    const len = Math.hypot(dx, dy), max = 150;
    if(len > max){ dx *= max / len; dy *= max / len; }
    return { vx: dx * WURFKRAFT, vy: dy * WURFKRAFT };
  }
  const pt = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) }; };
  canvas.addEventListener('pointerdown', e => {
    if(!running || ball.flying) return;
    const p = pt(e);
    if(Math.hypot(p.x - ball.x, p.y - ball.y) < 60){ aiming = true; aim = p; canvas.setPointerCapture?.(e.pointerId); canvas.style.cursor = 'grabbing'; }
  });
  canvas.addEventListener('pointermove', e => { if(aiming){ aim = pt(e); } });
  canvas.addEventListener('pointerup', () => {
    if(!aiming) return;
    aiming = false; canvas.style.cursor = 'grab';
    const v = velocity();
    if(Math.hypot(v.vx, v.vy) < 2) return;   // zu schwach gezogen
    ball.vx = v.vx; ball.vy = v.vy; ball.flying = true; sfx.whoosh?.();
  });
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); };
}
