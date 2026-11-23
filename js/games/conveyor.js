import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🏭 FLIESSBAND – sortier alles in die richtige Kiste, bevor es vom Band fällt!
// Taste 1 = 🍎 Obst · 2 = 🧸 Spielzeug · 3 = 👕 Kleidung · 4 = ♻️ Müll (oder die Kisten antippen)
// ---------- 🛠️ LUKI-ECKE ----------
const LEBEN = 5;
const START_TEMPO = 1.2;
// ------------------------------------
const W = 400, H = 260;
const BINS = [
  { name: 'Obst', icon: '🍎', color: '#EF4444', items: ['🍎', '🍌', '🍇', '🍐', '🍊', '🍓'] },
  { name: 'Spielzeug', icon: '🧸', color: '#F59E0B', items: ['🧸', '🪀', '🎮', '🪁', '🧩', '⚽'] },
  { name: 'Kleidung', icon: '👕', color: '#3B82F6', items: ['👕', '👖', '🧦', '🧢', '👟', '🧤'] },
  { name: 'Müll', icon: '♻️', color: '#22C55E', items: ['🥫', '🧃', '📰', '🍾', '🥤', '🗑️'] },
];

export function build(){
  const scoreEl = hud([L('Sortiert', 'Sorted'),'cvScore'], [L('Leben', 'Lives'),'cvLives'], [L('Bestwert', 'Best'),'cvBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.cursor = 'pointer';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint(L('Das vorderste Ding (mit Rahmen) kommt in die Kiste, die du wählst: Tasten 1–4 oder die Kisten antippen.', 'The front item (with frame) goes into the box you pick: keys 1–4 or tap the boxes.')));
  addLeaderboardUI('conveyor', 'Fließband');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let items, score, lives, best = 0, speed, spawnT, loopId, running, flashes, beltOff;

  function start(){ items = []; flashes = []; score = 0; lives = LEBEN; speed = START_TEMPO; spawnT = 0; beltOff = 0; running = true; over.classList.remove('show'); updateHud(); cancelAnimationFrame(loopId); loop(); }
  function updateHud(){ document.getElementById('cvScore').textContent = score; document.getElementById('cvLives').textContent = '❤️'.repeat(Math.max(0, lives)) || '0'; document.getElementById('cvBest').textContent = best; }
  function loop(){
    if(!running) return;
    speed = START_TEMPO + score * 0.035; beltOff = (beltOff + speed) % 30;
    if(--spawnT <= 0){ const b = Math.floor(Math.random() * BINS.length); items.push({ x: -20, bin: b, icon: BINS[b].items[Math.floor(Math.random() * 6)] }); spawnT = Math.max(28, 75 - score * 1.2); }
    items.forEach(it => it.x += speed);
    const fell = items.filter(it => it.x > W - 20);
    if(fell.length){ lives -= fell.length; sfx.fail?.(); fell.forEach(it => flashes.push({ x: W - 30, ok: false, t: 0 })); items = items.filter(it => it.x <= W - 20); updateHud(); }
    flashes.forEach(f => f.t++); flashes = flashes.filter(f => f.t < 30);
    draw();
    if(lives <= 0){ running = false; if(score > best) best = score; updateHud(); sfx.lose(); over.querySelector('div').textContent = `Feierabend! ${score} Sachen sortiert 🏭`; over.classList.add('show'); window.zzSaveHighScore?.('conveyor', 'Fließband', score); return; }
    loopId = requestAnimationFrame(loop);
  }
  function sort(b){
    if(!running || !items.length) return;
    const front = items.reduce((a, c) => c.x > a.x ? c : a);
    items = items.filter(i => i !== front);
    const ok = front.bin === b;
    if(ok){ score++; sfx.coin(); } else { lives--; sfx.wrong?.(); }
    flashes.push({ x: 50 + b * 100, ok, t: 0 }); updateHud();
  }
  function draw(){
    ctx.fillStyle = '#1F2937'; ctx.fillRect(0, 0, W, H);
    // Band
    ctx.fillStyle = '#374151'; ctx.fillRect(0, 60, W, 50);
    ctx.strokeStyle = '#4B5563'; ctx.lineWidth = 3; for(let x = -30 + beltOff; x < W; x += 30){ ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, 110); ctx.stroke(); }
    ctx.fillStyle = '#111827'; ctx.fillRect(0, 108, W, 8);
    ctx.fillStyle = '#EF4444'; ctx.fillRect(W - 14, 50, 14, 70);
    const front = items.length ? items.reduce((a, c) => c.x > a.x ? c : a) : null;
    ctx.font = '32px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    items.forEach(it => { if(it === front){ ctx.strokeStyle = '#C6FF3D'; ctx.lineWidth = 3; ctx.strokeRect(it.x - 22, 63, 44, 44); } ctx.fillText(it.icon, it.x, 86); });
    // Kisten
    BINS.forEach((b, i) => {
      const x = 10 + i * 100;
      ctx.fillStyle = b.color; ctx.fillRect(x, 160, 80, 80);
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x, 160, 80, 12);
      ctx.font = '30px sans-serif'; ctx.fillText(b.icon, x + 40, 200);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Fredoka, sans-serif'; ctx.fillText(`${i + 1} · ${b.name}`, x + 40, 230);
    });
    flashes.forEach(f => { ctx.globalAlpha = 1 - f.t / 30; ctx.font = 'bold 26px Fredoka, sans-serif'; ctx.fillStyle = f.ok ? '#C6FF3D' : '#EF4444'; ctx.fillText(f.ok ? '✓' : '✗', f.x, 145 - f.t); });
    ctx.globalAlpha = 1;
  }
  canvas.addEventListener('pointerdown', e => { const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * (canvas.width / r.width), y = (e.clientY - r.top) * (canvas.height / r.height); if(y > 150){ const b = Math.floor((x - 10) / 100); if(b >= 0 && b < 4) sort(b); } });
  const kd = e => { const n = parseInt(e.key, 10); if(n >= 1 && n <= 4){ e.preventDefault(); sort(n - 1); } };
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); };
}
