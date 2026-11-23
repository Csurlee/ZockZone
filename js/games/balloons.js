import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🎈 BALLON-JAGD – lass die Ballons platzen, bevor sie wegfliegen!
// ---------- 🛠️ LUKI-ECKE ----------
const SPIELZEIT    = 45;   // Sekunden pro Runde
const MAX_VERPASST = 10;   // Nach so vielen entwischten Ballons ist Schluss
// ------------------------------------
const W = 360, H = 440;
const COLORS = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#14B8A6'];

export function build(){
  const scoreEl = hud([L('Punkte', 'Points'),'balScore'], [L('Zeit', 'Time'),'balTime'], [L('Entwischt', 'Escaped'),'balMiss']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.cursor = 'crosshair';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint(L('Klick oder tipp auf die Ballons! Kleine Ballons geben 3 Punkte, goldene 10.', 'Click or tap the balloons! Small balloons give 3 points, golden ones 10.')));
  addLeaderboardUI('balloons', 'Ballon-Jagd');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let balloons, parts, score, missed, timeLeft, last, spawnT, loopId, running;

  function start(){
    balloons = []; parts = []; score = 0; missed = 0; timeLeft = SPIELZEIT; spawnT = 0; running = true; last = performance.now();
    over.classList.remove('show'); updateHud();
    cancelAnimationFrame(loopId); loopId = requestAnimationFrame(loop);
  }
  function updateHud(){
    document.getElementById('balScore').textContent = score;
    document.getElementById('balTime').textContent = Math.ceil(timeLeft);
    document.getElementById('balMiss').textContent = missed + '/' + MAX_VERPASST;
  }
  function spawn(){
    const r = Math.random();
    const small = r < 0.25, gold = r > 0.95;
    const rad = gold ? 18 : small ? 15 : 22 + Math.random() * 8;
    balloons.push({ x: rad + Math.random() * (W - 2 * rad), y: H + rad, r: rad,
      vy: (gold ? 2.6 : small ? 2.2 : 1.2 + Math.random()) * (1 + (SPIELZEIT - timeLeft) / SPIELZEIT),
      sway: Math.random() * 6, color: gold ? '#FACC15' : COLORS[Math.floor(Math.random() * COLORS.length)],
      pts: gold ? 10 : small ? 3 : 1, gold });
  }
  function loop(now){
    if(!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    timeLeft -= dt;
    spawnT -= dt;
    if(spawnT <= 0){ spawn(); spawnT = 0.35 + Math.random() * 0.45; }
    for(const b of balloons){
      b.y -= b.vy; b.sway += 0.03; b.x += Math.sin(b.sway) * 0.5;
      if(b.y < -b.r * 2 && !b.gone){ b.gone = true; missed++; sfx.miss(); }
    }
    balloons = balloons.filter(b => !b.gone && !b.popped);
    parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--; });
    parts = parts.filter(p => p.life > 0);
    updateHud(); draw();
    if(timeLeft <= 0 || missed >= MAX_VERPASST){ end(); return; }
    loopId = requestAnimationFrame(loop);
  }
  function end(){
    running = false;
    timeLeft = Math.max(0, timeLeft); updateHud();
    (missed >= MAX_VERPASST ? sfx.lose : sfx.win)();
    over.querySelector('div').textContent = (missed >= MAX_VERPASST ? 'Zu viele entwischt! ' : 'Zeit um! ') + score + ' Punkte';
    over.classList.add('show');
    window.zzSaveHighScore?.('balloons', 'Ballon-Jagd', score);
  }
  function draw(){
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#38BDF8'); g.addColorStop(1, '#BAE6FD');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Wolken
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    [[60, 80], [260, 140], [150, 300]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.arc(x + 25, y - 8, 26, 0, 7); ctx.arc(x + 50, y, 20, 0, 7); ctx.fill(); });
    for(const b of balloons){
      // Schnur
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(b.x, b.y + b.r); ctx.quadraticCurveTo(b.x + 6, b.y + b.r + 18, b.x, b.y + b.r + 34); ctx.stroke();
      // Ballon
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 0.85, b.r, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(b.x - 4, b.y + b.r + 4); ctx.lineTo(b.x + 4, b.y + b.r + 4); ctx.lineTo(b.x, b.y + b.r - 2); ctx.fill();
      // Glanz
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.beginPath(); ctx.ellipse(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.18, b.r * 0.3, -0.5, 0, Math.PI * 2); ctx.fill();
      if(b.gold){ ctx.fillStyle = '#78350F'; ctx.font = 'bold 13px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('10', b.x, b.y + 4); }
    }
    for(const p of parts){ ctx.globalAlpha = p.life / 30; ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
    ctx.globalAlpha = 1;
  }
  function onTap(e){
    if(!running) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width), y = (e.clientY - r.top) * (canvas.height / r.height);
    for(let i = balloons.length - 1; i >= 0; i--){
      const b = balloons[i];
      if(((x - b.x) / (b.r * 0.85)) ** 2 + ((y - b.y) / b.r) ** 2 <= 1.15){
        b.popped = true; score += b.pts; b.gold ? sfx.coin() : sfx.pop();
        for(let k = 0; k < 14; k++) parts.push({ x: b.x, y: b.y, vx: (Math.random() - .5) * 6, vy: (Math.random() - .7) * 5, life: 30, color: b.color });
        updateHud();
        return;
      }
    }
  }
  canvas.addEventListener('pointerdown', onTap);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); };
}
