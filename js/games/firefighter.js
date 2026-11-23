import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🚒 FEUERWEHR – lösch die Feuer in den Fenstern, bevor das Haus abbrennt!
// Halt die Maus/den Finger gedrückt, um zu spritzen. Der Wassertank füllt sich langsam wieder auf.
// ---------- 🛠️ LUKI-ECKE ----------
const LEBEN = 100;        // Wie viel hält das Haus aus?
const TANK  = 100;        // Wie viel Wasser passt in den Tank?
const SPRITZ_STAERKE = 2.2; // Wie schnell löscht der Strahl?
// ------------------------------------
const W = 380, H = 400, TRUCK = { x: 190, y: 370 };
const WINDOWS = []; for(let r = 0; r < 3; r++) for(let c = 0; c < 4; c++) WINDOWS.push({ x: 70 + c * 80, y: 70 + r * 80 });

export function build(){
  const scoreEl = hud([L('Gelöscht', 'Put out'),'ffScore'], [L('Haus', 'House'),'ffHouse'], [L('Wasser', 'Water'),'ffWater']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'crosshair';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint(L('Maus/Finger gedrückt halten und aufs Feuer zielen! Spar Wasser – der Tank füllt sich nur langsam nach.', 'Hold the mouse/finger down and aim at the fire! Save water – the tank refills slowly.')));
  addLeaderboardUI('firefighter', 'Feuerwehr');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let fires, house, water, score, aim, spraying, drops, loopId, running, spawnT, frame;

  function start(){ fires = WINDOWS.map(() => 0); house = LEBEN; water = TANK; score = 0; aim = { x: W / 2, y: 150 }; spraying = false; drops = []; spawnT = 60; frame = 0; running = true; over.classList.remove('show'); updateHud(); cancelAnimationFrame(loopId); loop(); }
  function updateHud(){ document.getElementById('ffScore').textContent = score; document.getElementById('ffHouse').textContent = Math.max(0, Math.round(house)) + ' %'; document.getElementById('ffWater').textContent = Math.round(water) + ' %'; }
  function loop(){
    if(!running) return;
    frame++;
    if(--spawnT <= 0){ const free = fires.map((f, i) => f === 0 ? i : -1).filter(i => i >= 0); if(free.length){ fires[free[Math.floor(Math.random() * free.length)]] = 15; } spawnT = Math.max(35, 110 - score * 2); }
    fires = fires.map(f => f > 0 ? Math.min(100, f + 0.12 + score * 0.004) : 0);
    house -= fires.reduce((a, f) => a + f, 0) * 0.00025;
    if(spraying && water > 0){
      water = Math.max(0, water - 0.6);
      for(let k = 0; k < 2; k++){ const a = Math.atan2(aim.y - TRUCK.y, aim.x - TRUCK.x) + (Math.random() - .5) * 0.08, sp = 9; drops.push({ x: TRUCK.x, y: TRUCK.y - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 40 }); }
      if(frame % 6 === 0) sfx.whoosh?.();
    } else water = Math.min(TANK, water + 0.15);
    drops.forEach(d => { d.x += d.vx; d.y += d.vy; d.vy += 0.06; d.life--; });
    for(const d of drops){
      WINDOWS.forEach((w, i) => { if(fires[i] > 0 && Math.abs(d.x - w.x) < 26 && Math.abs(d.y - w.y) < 26){ fires[i] -= SPRITZ_STAERKE; d.life = 0; if(fires[i] <= 0){ fires[i] = 0; score++; sfx.coin(); } } });
    }
    drops = drops.filter(d => d.life > 0 && d.y < H);
    updateHud(); draw();
    if(house <= 0){ running = false; sfx.lose(); over.querySelector('div').textContent = `Das Haus ist abgebrannt! ${score} Feuer gelöscht 🚒`; over.classList.add('show'); window.zzSaveHighScore?.('firefighter', 'Feuerwehr', score); return; }
    loopId = requestAnimationFrame(loop);
  }
  function draw(){
    ctx.fillStyle = '#1E293B'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#334155'; ctx.fillRect(0, 340, W, 60);
    // Haus
    const burn = 1 - house / LEBEN;
    ctx.fillStyle = `rgb(${180 - burn * 90},${80 - burn * 40},${60 - burn * 30})`; ctx.fillRect(30, 30, 320, 300);
    ctx.fillStyle = '#7F1D1D'; ctx.beginPath(); ctx.moveTo(20, 30); ctx.lineTo(190, -10); ctx.lineTo(360, 30); ctx.fill();
    WINDOWS.forEach((w, i) => {
      ctx.fillStyle = fires[i] ? '#451A03' : '#FEF3C7'; ctx.fillRect(w.x - 24, w.y - 24, 48, 48);
      ctx.strokeStyle = '#F5F5F4'; ctx.lineWidth = 3; ctx.strokeRect(w.x - 24, w.y - 24, 48, 48);
      if(fires[i]){
        const s = 0.5 + fires[i] / 100;
        for(let k = 0; k < 3; k++){ const fl = Math.sin(frame / 4 + k * 2 + i) * 3; ctx.fillStyle = ['#EF4444', '#F97316', '#FACC15'][k]; ctx.beginPath(); ctx.moveTo(w.x - 18 * s + k * 4, w.y + 20); ctx.quadraticCurveTo(w.x + fl, w.y - (30 - k * 8) * s, w.x + 18 * s - k * 4, w.y + 20); ctx.fill(); }
      }
    });
    // Wasser
    ctx.fillStyle = 'rgba(56,189,248,.8)'; drops.forEach(d => { ctx.beginPath(); ctx.arc(d.x, d.y, 3, 0, 7); ctx.fill(); });
    // Feuerwehrauto
    ctx.font = '44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🚒', TRUCK.x, TRUCK.y - 8);
    ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 5; const a = Math.atan2(aim.y - TRUCK.y, aim.x - TRUCK.x); ctx.beginPath(); ctx.moveTo(TRUCK.x, TRUCK.y - 20); ctx.lineTo(TRUCK.x + Math.cos(a) * 30, TRUCK.y - 20 + Math.sin(a) * 30); ctx.stroke();
    // Tank
    ctx.fillStyle = '#111827'; ctx.fillRect(10, 350, 100, 12); ctx.fillStyle = water > 20 ? '#38BDF8' : '#EF4444'; ctx.fillRect(10, 350, water / TANK * 100, 12);
    ctx.fillStyle = '#F3EEFF'; ctx.font = 'bold 11px Fredoka, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('💧 Tank', 10, 344);
  }
  const setAim = e => { const r = canvas.getBoundingClientRect(); aim = { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) }; };
  canvas.addEventListener('pointerdown', e => { spraying = true; setAim(e); canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener('pointermove', setAim);
  ['pointerup','pointercancel'].forEach(ev => canvas.addEventListener(ev, () => { spraying = false; }));
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); };
}
