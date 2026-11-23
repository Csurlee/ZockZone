import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🔵 FLIPPER – halt den Ball mit den Flippern im Spiel und triff die Bumper für Punkte!
// ---------- 🛠️ LUKI-ECKE ----------
const BAELLE      = 3;      // Wie viele Bälle hast du?
const SCHWERKRAFT = 0.18;
const FLIPPER_KRAFT = 14;   // Wie fest schlagen die Flipper?
// ------------------------------------
const W = 300, H = 460, BR = 8;
const BUMPERS = [{ x: 90, y: 120, r: 20, p: 100 }, { x: 210, y: 120, r: 20, p: 100 }, { x: 150, y: 190, r: 24, p: 200 }, { x: 70, y: 250, r: 14, p: 50 }, { x: 230, y: 250, r: 14, p: 50 }];
// Wände als Linien [x1, y1, x2, y2]
const WALLS = [[10, 10, 290, 10], [10, 10, 10, 360], [290, 10, 290, 360], [10, 360, 80, 400], [290, 360, 220, 400], [10, 60, 60, 10], [290, 60, 240, 10]];

export function build(){
  const scoreEl = hud([L('Punkte', 'Points'),'flScore'], [L('Bälle', 'Balls'),'flBalls'], [L('Bestwert', 'Best'),'flBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.touchAction = 'none';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint(L('← / A = linker Flipper, → / L = rechter Flipper. Am Handy: linke oder rechte Hälfte antippen. Leertaste startet den Ball.', '← / A = left flipper, → / L = right flipper. On a phone: tap the left or right half. Space launches the ball.')));
  addLeaderboardUI('flipper', 'Flipper');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let ball, score, balls, best = 0, left, right, keys = {}, touch = { l: false, r: false }, loopId, running, waiting, lit;
  const FL = { x: 80, y: 400, len: 58 }, FR = { x: 220, y: 400, len: 58 };

  function start(){ score = 0; balls = BAELLE; running = true; lit = BUMPERS.map(() => 0); left = right = 0.5; over.classList.remove('show'); newBall(); cancelAnimationFrame(loopId); loop(); }
  function newBall(){ ball = { x: 150, y: 60, vx: (Math.random() - .5) * 3, vy: 0 }; waiting = true; updateHud(); }
  function updateHud(){ document.getElementById('flScore').textContent = score; document.getElementById('flBalls').textContent = '🔵'.repeat(Math.max(0, balls)); document.getElementById('flBest').textContent = best; }
  function flipperLine(f, isLeft, a){ const dir = isLeft ? 1 : -1; return [f.x, f.y, f.x + Math.cos(a) * f.len * dir, f.y - Math.sin(a) * f.len]; }
  function collideLine(x1, y1, x2, y2, bounce, push){
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    let t = ((ball.x - x1) * dx + (ball.y - y1) * dy) / l2; t = Math.max(0, Math.min(1, t));
    const px = x1 + t * dx, py = y1 + t * dy, ex = ball.x - px, ey = ball.y - py, d = Math.hypot(ex, ey);
    if(d < BR && d > 0){
      const nx = ex / d, ny = ey / d; ball.x = px + nx * BR; ball.y = py + ny * BR;
      const dot = ball.vx * nx + ball.vy * ny;
      if(dot < 0){ ball.vx -= (1 + bounce) * dot * nx; ball.vy -= (1 + bounce) * dot * ny; }
      if(push){ ball.vx += nx * push * t; ball.vy += ny * push * t; }
      return true;
    }
    return false;
  }
  function loop(){
    if(!running) return;
    const wantL = keys.ArrowLeft || keys.a || touch.l, wantR = keys.ArrowRight || keys.l || touch.r;
    const prevL = left, prevR = right;
    left += ((wantL ? -0.55 : 0.5) - left) * 0.45;   // Winkel: 0.5 = unten, -0.55 = oben
    right += ((wantR ? -0.55 : 0.5) - right) * 0.45;
    if(!waiting){
      for(let s = 0; s < 3; s++){
        ball.vy += SCHWERKRAFT / 3; ball.x += ball.vx / 3; ball.y += ball.vy / 3;
        for(const w of WALLS) collideLine(...w, 0.6, 0);
        const swingL = (prevL - left) > 0.05 ? FLIPPER_KRAFT * 0.6 : 0, swingR = (prevR - right) > 0.05 ? FLIPPER_KRAFT * 0.6 : 0;
        if(collideLine(...flipperLine(FL, true, -left), 0.3, swingL) && swingL) sfx.bounce?.();
        if(collideLine(...flipperLine(FR, false, -right), 0.3, swingR) && swingR) sfx.bounce?.();
        BUMPERS.forEach((b, i) => {
          const dx = ball.x - b.x, dy = ball.y - b.y, d = Math.hypot(dx, dy);
          if(d < b.r + BR){ const nx = dx / d, ny = dy / d; ball.x = b.x + nx * (b.r + BR); ball.y = b.y + ny * (b.r + BR); ball.vx = nx * 7; ball.vy = ny * 7; if(lit[i] < 5){ score += b.p; sfx.hit?.(); updateHud(); } lit[i] = 12; }
        });
      }
      const sp = Math.hypot(ball.vx, ball.vy); if(sp > 16){ ball.vx *= 16 / sp; ball.vy *= 16 / sp; }
      if(ball.y > H + 20){
        balls--; sfx.lose?.(); updateHud();
        if(balls <= 0){ running = false; if(score > best) best = score; updateHud(); over.querySelector('div').textContent = `Game Over! ${score} Punkte`; over.classList.add('show'); window.zzSaveHighScore?.('flipper', 'Flipper', score); draw(); return; }
        newBall();
      }
    }
    lit = lit.map(v => Math.max(0, v - 1));
    draw();
    loopId = requestAnimationFrame(loop);
  }
  function launch(){ if(waiting && running){ waiting = false; ball.vy = 2; sfx.whoosh?.(); } }
  function draw(){
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1E1B4B'); g.addColorStop(1, '#312E81');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#A78BFA'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for(const [x1, y1, x2, y2] of WALLS){ ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    BUMPERS.forEach((b, i) => {
      ctx.fillStyle = lit[i] ? '#FDE047' : '#F472B6'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#1E1B4B'; ctx.font = 'bold 11px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.p, b.x, b.y + 1);
    });
    ctx.strokeStyle = '#C6FF3D'; ctx.lineWidth = 10;
    [[FL, true, -left], [FR, false, -right]].forEach(([f, l, a]) => { const [x1, y1, x2, y2] = flipperLine(f, l, a); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); });
    ctx.fillStyle = '#E5E7EB'; ctx.beginPath(); ctx.arc(ball.x, ball.y, BR, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(ball.x - 3, ball.y - 3, 2.5, 0, 7); ctx.fill();
    if(waiting){ ctx.fillStyle = '#FDE047'; ctx.font = 'bold 16px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Leertaste / Tippen = Start', W / 2, 300); }
  }
  const kd = e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if(['ArrowLeft','ArrowRight','a','l'].includes(k)){ keys[k] = true; e.preventDefault(); launch(); } if(k === ' '){ e.preventDefault(); launch(); } };
  const ku = e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; };
  canvas.addEventListener('pointerdown', e => { const r = canvas.getBoundingClientRect(); touch[e.clientX - r.left < r.width / 2 ? 'l' : 'r'] = true; launch(); });
  ['pointerup','pointerleave','pointercancel'].forEach(ev => canvas.addEventListener(ev, () => { touch.l = touch.r = false; }));
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
}
