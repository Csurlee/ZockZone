import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// 🎳 BOWLING – 5 Runden, je 2 Würfe. Erst die Position wählen, dann den Ball anschieben!
// ---------- 🛠️ LUKI-ECKE ----------
const RUNDEN = 5;          // Wie viele Runden (Frames)?
const KUGEL_TEMPO = 9;     // Wie schnell rollt die Kugel?
// ------------------------------------
const W = 260, H = 460, LANE_L = 50, LANE_R = 210, BR = 11, PR = 7;

export function build(){
  const scoreEl = hud(['Runde','bwFrame'], ['Wurf','bwThrow'], ['Punkte','bwScore']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'pointer';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('1. Klick: Kugel stoppt an der Position. 2. Klick: Richtungspfeil stoppt, die Kugel rollt los! (Oder Leertaste)'));
  addLeaderboardUI('bowling', 'Bowling');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let pins, ball, phase, posT, angT, frame, throwNo, score, frameScores, loopId, running, msg, knockedThisFrame;

  function setupPins(){
    pins = []; const sx = (LANE_L + LANE_R) / 2, sy = 70, dx = 22, dy = 20;
    for(let row = 0; row < 4; row++) for(let i = 0; i <= row; i++) pins.push({ x: sx + (i - row / 2) * dx, y: sy + (3 - row) * dy, vx: 0, vy: 0, down: false, gone: false });
  }
  function start(){ frame = 1; score = 0; frameScores = []; running = true; over.classList.remove('show'); newFrame(); cancelAnimationFrame(loopId); loop(); }
  function newFrame(){ setupPins(); throwNo = 1; knockedThisFrame = 0; newThrow(); }
  function newThrow(){ ball = { x: (LANE_L + LANE_R) / 2, y: H - 40, vx: 0, vy: 0, rolling: false }; phase = 'pos'; posT = 0; angT = 0; updateHud(); }
  function updateHud(){
    document.getElementById('bwFrame').textContent = `${frame}/${RUNDEN}`;
    document.getElementById('bwThrow').textContent = throwNo;
    document.getElementById('bwScore').textContent = score;
  }
  function click(){
    if(!running) return;
    if(phase === 'pos'){ phase = 'aim'; sfx.click?.(); }
    else if(phase === 'aim'){
      const ang = Math.sin(angT) * 0.28;
      ball.vx = Math.sin(ang) * KUGEL_TEMPO; ball.vy = -Math.cos(ang) * KUGEL_TEMPO; ball.rolling = true; phase = 'roll'; sfx.whoosh?.();
    }
  }
  function loop(){
    if(!running) return;
    if(phase === 'pos'){ posT += 0.04; ball.x = (LANE_L + LANE_R) / 2 + Math.sin(posT) * ((LANE_R - LANE_L) / 2 - BR - 4); }
    if(phase === 'aim'){ angT += 0.06; }
    if(phase === 'roll' || phase === 'settle'){
      if(ball.rolling){ ball.x += ball.vx; ball.y += ball.vy; if(ball.x < LANE_L + BR || ball.x > LANE_R - BR){ ball.vx = 0; ball.vy *= 0.97; ball.x = Math.max(LANE_L + BR, Math.min(LANE_R - BR, ball.x)); } }
      // Kugel trifft Pins
      for(const p of pins){
        if(p.gone) continue;
        if(ball.rolling){ const dx = p.x - ball.x, dy = p.y - ball.y, d = Math.hypot(dx, dy);
          if(d < BR + PR){ const nx = dx / d, ny = dy / d; p.vx += nx * 5 + ball.vx * 0.3; p.vy += ny * 5 + ball.vy * 0.2; ball.vx *= 0.92; ball.vy *= 0.92; if(!p.down){ p.down = true; sfx.hit?.(); } } }
      }
      // Pins treffen Pins
      for(let i = 0; i < pins.length; i++) for(let j = i + 1; j < pins.length; j++){
        const a = pins[i], b = pins[j]; if(a.gone || b.gone) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if(d < PR * 2 && d > 0){ const nx = dx / d, ny = dy / d, rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if(rv > 0){ a.vx -= rv * nx; a.vy -= rv * ny; b.vx += rv * nx; b.vy += rv * ny; if(Math.hypot(a.vx, a.vy) > 1) a.down = true; if(Math.hypot(b.vx, b.vy) > 1) b.down = true; } }
      }
      for(const p of pins){ p.x += p.vx; p.y += p.vy; p.vx *= 0.93; p.vy *= 0.93; if(p.x < LANE_L - 10 || p.x > LANE_R + 10 || p.y < 20) { p.gone = true; p.down = true; } }
      if(ball.y < 20) ball.rolling = false;
      if(phase === 'roll' && !ball.rolling){ phase = 'settle'; setTimeout(endThrow, 900); }
    }
    if(msg){ msg.t++; if(msg.t > 70) msg = null; }
    draw();
    loopId = requestAnimationFrame(loop);
  }
  function endThrow(){
    if(!running) return;
    const down = pins.filter(p => p.down).length;
    const newly = down - knockedThisFrame; knockedThisFrame = down;
    score += newly;
    if(down === 10){ const bonus = throwNo === 1 ? 10 : 5; score += bonus; msg = { txt: throwNo === 1 ? '💥 STRIKE! +10' : '✨ SPARE! +5', t: 0 }; sfx.win(); }
    else if(newly > 0) sfx.coin(); else sfx.miss();
    updateHud();
    pins.forEach(p => { if(p.down) p.gone = true; });
    if(down === 10 || throwNo === 2){
      frameScores.push(knockedThisFrame);
      if(frame >= RUNDEN){ running = false; window.zzSaveHighScore?.('bowling', 'Bowling', score);
        setTimeout(() => { over.querySelector('div').textContent = `Fertig! ${score} Punkte 🎳`; over.classList.add('show'); }, 600); draw(); return; }
      frame++; setTimeout(() => { if(running){ newFrame(); } }, 500);
    } else { throwNo = 2; newThrow(); }
  }
  function draw(){
    ctx.fillStyle = '#1F2937'; ctx.fillRect(0, 0, W, H);
    // Rinnen + Bahn
    ctx.fillStyle = '#111827'; ctx.fillRect(LANE_L - 14, 0, 14, H); ctx.fillRect(LANE_R, 0, 14, H);
    const g = ctx.createLinearGradient(LANE_L, 0, LANE_R, 0);
    g.addColorStop(0, '#D4A373'); g.addColorStop(.5, '#E9C46A'); g.addColorStop(1, '#D4A373');
    ctx.fillStyle = g; ctx.fillRect(LANE_L, 0, LANE_R - LANE_L, H);
    ctx.strokeStyle = 'rgba(120,53,15,.2)'; ctx.lineWidth = 1; for(let x = LANE_L + 10; x < LANE_R; x += 10){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.fillStyle = 'rgba(120,53,15,.5)'; for(let i = 0; i < 5; i++){ ctx.beginPath(); ctx.moveTo(LANE_L + 30 + i * 25, 300); ctx.lineTo(LANE_L + 24 + i * 25, 312); ctx.lineTo(LANE_L + 36 + i * 25, 312); ctx.fill(); }
    for(const p of pins){
      if(p.gone) continue;
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.arc(p.x + 2, p.y + 2, PR, 0, 7); ctx.fill();
      ctx.fillStyle = p.down ? '#D1D5DB' : '#FFFFFF'; ctx.beginPath(); ctx.arc(p.x, p.y, PR, 0, 7); ctx.fill();
      ctx.fillStyle = '#EF4444'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill();
    }
    if(phase === 'aim'){
      const ang = Math.sin(angT) * 0.28;
      ctx.strokeStyle = '#C6FF3D'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(ball.x + Math.sin(ang) * 80, ball.y - Math.cos(ang) * 80); ctx.stroke();
    }
    ctx.fillStyle = '#1D4ED8'; ctx.beginPath(); ctx.arc(ball.x, ball.y, BR, 0, 7); ctx.fill();
    ctx.fillStyle = '#93C5FD'; [[-3, -4], [3, -4], [0, 1]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(ball.x + dx, ball.y + dy, 1.8, 0, 7); ctx.fill(); });
    ctx.font = 'bold 13px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#F3EEFF';
    if(phase === 'pos') ctx.fillText('Klick: Position', W / 2, H - 10);
    if(phase === 'aim') ctx.fillText('Klick: Richtung', W / 2, H - 10);
    if(msg){ ctx.globalAlpha = 1 - msg.t / 70; ctx.fillStyle = '#C6FF3D'; ctx.font = 'bold 24px Fredoka, sans-serif'; ctx.fillText(msg.txt, W / 2, 200); ctx.globalAlpha = 1; }
  }
  const kd = e => { if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); click(); } };
  canvas.addEventListener('pointerdown', click);
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); };
}
