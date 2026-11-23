import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// 🥫 DOSENWERFEN – wirf den Ball auf die Dosentürme! Alle Dosen runter = nächstes Level.
// ---------- 🛠️ LUKI-ECKE ----------
const BAELLE_PRO_LEVEL = 3;   // So viele Bälle pro Level
const WURFKRAFT = 0.17;       // Wie fest wird geworfen?
const SCHWERKRAFT = 0.3;
// ------------------------------------
const W = 400, H = 300, BR = 9, CW = 18, CH = 26, SHELF = 220;

export function build(){
  const scoreEl = hud(['Level','ctLevel'], ['Bälle','ctBalls'], ['Punkte','ctScore']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'grab';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Drück auf den Ball, zieh nach hinten und lass los – wie eine Steinschleuder!'));
  addLeaderboardUI('canthrow', 'Dosenwerfen');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let cans, ball, aiming, aim, level, balls, score, loopId, running, waitT;
  const HOME = { x: 60, y: 220 };

  function start(){ level = 1; score = 0; running = true; over.classList.remove('show'); setupLevel(); cancelAnimationFrame(loopId); loop(); }
  function setupLevel(){
    cans = [];
    const rows = Math.min(4, 2 + Math.floor((level - 1) / 2)), cx = 250 + Math.random() * 60;
    for(let r = 0; r < rows; r++) for(let i = 0; i < rows - r; i++)
      cans.push({ x: cx + (i - (rows - r - 1) / 2) * (CW + 2), y: SHELF - CH / 2 - r * CH, vx: 0, vy: 0, rot: 0, vr: 0, down: false, color: ['#EF4444', '#3B82F6', '#22C55E', '#FACC15'][(r + i) % 4] });
    balls = BAELLE_PRO_LEVEL; resetBall(); updateHud();
  }
  function resetBall(){ ball = { x: HOME.x, y: HOME.y, vx: 0, vy: 0, fly: false }; aiming = false; waitT = 0; }
  function updateHud(){ document.getElementById('ctLevel').textContent = level; document.getElementById('ctBalls').textContent = '⚾'.repeat(balls) || '0'; document.getElementById('ctScore').textContent = score; }
  function loop(){
    if(!running) return;
    if(ball.fly){
      ball.vy += SCHWERKRAFT; ball.x += ball.vx; ball.y += ball.vy;
      for(const c of cans){
        const dx = c.x - ball.x, dy = c.y - ball.y;
        if(Math.abs(dx) < CW / 2 + BR && Math.abs(dy) < CH / 2 + BR){
          c.vx += ball.vx * 0.6 + Math.sign(dx) * 1; c.vy += ball.vy * 0.4 - 2; c.vr += (Math.random() - .5) * 0.4;
          ball.vx *= 0.6; if(!c.hit){ c.hit = true; sfx.hit?.(); }
        }
      }
      if(ball.y > H + 20 || ball.x > W + 20 || ball.x < -20){ ball.fly = false; waitT = 60; }
    }
    // Dosen-Physik: fallen, stoßen sich an, fallen vom Regal
    const shelfL = 210, shelfR = 380;
    for(const c of cans){
      const onShelf = c.x > shelfL && c.x < shelfR;
      const floor = onShelf && !c.down ? SHELF - CH / 2 : H + 100;
      // stützt eine Dose darunter?
      let support = floor;
      for(const o of cans) if(o !== c && Math.abs(o.x - c.x) < CW * 0.9 && o.y > c.y) support = Math.min(support, o.y - CH);
      c.vy += 0.4; c.x += c.vx; c.y += c.vy; c.rot += c.vr;
      if(c.y > support){ c.y = support; c.vy = 0; c.vx *= 0.8; c.vr *= 0.8; }
      if(Math.abs(c.vx) > 0.5 || Math.abs(c.rot) > 0.6) c.moved = true;
      if(!c.down && (c.y > SHELF + 10 || !onShelf)){ c.down = true; score += 10; sfx.coin(); updateHud(); }
    }
    if(!ball.fly && waitT > 0 && --waitT === 0){
      if(cans.every(c => c.down)){ score += balls * 20; level++; sfx.win(); setupLevel(); }
      else { balls--; updateHud(); if(balls <= 0){ running = false; sfx.lose(); over.querySelector('div').textContent = `Keine Bälle mehr! ${score} Punkte (Level ${level})`; over.classList.add('show'); window.zzSaveHighScore?.('canthrow', 'Dosenwerfen', score); draw(); return; } resetBall(); }
    }
    draw();
    loopId = requestAnimationFrame(loop);
  }
  function draw(){
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7C2D12'); g.addColorStop(1, '#1C1917');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(250,204,21,.15)'; for(let i = 0; i < 8; i++){ ctx.beginPath(); ctx.arc(30 + i * 50, 20, 6, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#92400E'; ctx.fillRect(210, SHELF, 170, 10); ctx.fillStyle = '#78350F'; ctx.fillRect(220, SHELF + 10, 8, H); ctx.fillRect(362, SHELF + 10, 8, H);
    for(const c of cans){
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      ctx.fillStyle = c.color; ctx.fillRect(-CW / 2, -CH / 2, CW, CH);
      ctx.fillStyle = '#E5E7EB'; ctx.fillRect(-CW / 2, -CH / 2, CW, 3); ctx.fillRect(-CW / 2, CH / 2 - 3, CW, 3);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-CW / 2 + 3, -CH / 2 + 5, 3, CH - 10);
      ctx.restore();
    }
    if(aiming){
      const v = vel(); let x = ball.x, y = ball.y, vx = v.vx, vy = v.vy;
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      for(let i = 0; i < 20; i++){ vy += SCHWERKRAFT; x += vx; y += vy; if(i % 2 === 0){ ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); } }
    }
    ctx.fillStyle = '#F8FAFC'; ctx.beginPath(); ctx.arc(ball.x, ball.y, BR, 0, 7); ctx.fill();
    ctx.strokeStyle = '#DC2626'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ball.x - 4, ball.y, BR - 2, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(ball.x + 4, ball.y, BR - 2, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  }
  function vel(){ let dx = HOME.x - aim.x, dy = HOME.y - aim.y; const l = Math.hypot(dx, dy), m = 130; if(l > m){ dx *= m / l; dy *= m / l; } return { vx: dx * WURFKRAFT, vy: dy * WURFKRAFT }; }
  const pt = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) }; };
  canvas.addEventListener('pointerdown', e => { if(!running || ball.fly || waitT) return; const p = pt(e); if(Math.hypot(p.x - ball.x, p.y - ball.y) < 60){ aiming = true; aim = p; canvas.setPointerCapture?.(e.pointerId); } });
  canvas.addEventListener('pointermove', e => { if(aiming) aim = pt(e); });
  canvas.addEventListener('pointerup', () => { if(!aiming) return; aiming = false; const v = vel(); if(Math.hypot(v.vx, v.vy) < 2) return; ball.vx = v.vx; ball.vy = v.vy; ball.fly = true; sfx.whoosh?.(); });
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); };
}
