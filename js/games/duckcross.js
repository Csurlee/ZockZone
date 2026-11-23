import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🦆 ENTEN-ÜBERQUERUNG – bring die Entenküken heil über die Straße und den Fluss nach Hause!
// Auf der Straße: Autos ausweichen. Im Fluss: nur auf Baumstämmen und Seerosen stehen!
// ---------- 🛠️ LUKI-ECKE ----------
const LEBEN = 3;
const TEMPO = 1.0;   // Wie schnell ist der Verkehr? (1.5 = Rushhour!)
// ------------------------------------
const COLS = 11, ROWS = 11, C = 34, W = COLS * C, H = ROWS * C;
// Reihen von oben: 0 = Ziel, 1–4 = Fluss, 5 = Wiese, 6–9 = Straße, 10 = Start
const LANES = [
  null,
  { type: 'river', dir: -1, speed: 0.9, len: 3, gap: 5, obj: '🪵' },
  { type: 'river', dir: 1,  speed: 0.6, len: 2, gap: 3, obj: '🪷' },
  { type: 'river', dir: -1, speed: 1.2, len: 4, gap: 6, obj: '🪵' },
  { type: 'river', dir: 1,  speed: 0.8, len: 2, gap: 4, obj: '🪷' },
  null,
  { type: 'road', dir: 1,  speed: 1.0, len: 1, gap: 4, obj: '🚗' },
  { type: 'road', dir: -1, speed: 1.4, len: 1, gap: 5, obj: '🚕' },
  { type: 'road', dir: 1,  speed: 0.7, len: 2, gap: 5, obj: '🚌' },
  { type: 'road', dir: -1, speed: 1.8, len: 1, gap: 6, obj: '🏎️' },
  null,
];

export function build(){
  const scoreEl = hud([L('Gerettet', 'Rescued'),'dcSaved'], [L('Leben', 'Lives'),'dcLives'], [L('Bestwert', 'Best'),'dcBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.touchAction = 'none';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint(L('Pfeiltasten oder WASD. Am Handy: über, unter, links oder rechts neben die Ente tippen. Im Fluss nicht ins Wasser!', 'Arrow keys or WASD. On a phone: tap above, below, left or right of the duck. Don’t fall into the river!')));
  addLeaderboardUI('duckcross', 'Enten-Überquerung');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let duck, objs, saved, lives, best = 0, loopId, running, homes, dead, level;

  function start(){ saved = 0; lives = LEBEN; level = 1; homes = []; running = true; over.classList.remove('show'); setupLanes(); resetDuck(); updateHud(); cancelAnimationFrame(loopId); loop(); }
  function setupLanes(){
    objs = LANES.map(l => {
      if(!l) return [];
      const arr = []; let x = Math.random() * C * 2;
      while(x < W + C * 4){ arr.push({ x, len: l.len }); x += (l.len + l.gap + Math.floor(Math.random() * 2)) * C; }
      return arr;
    });
  }
  function resetDuck(){ duck = { col: 5, row: 10, x: 5 * C }; dead = 0; }
  function updateHud(){ document.getElementById('dcSaved').textContent = saved; document.getElementById('dcLives').textContent = '🦆'.repeat(Math.max(0, lives)) || '0'; document.getElementById('dcBest').textContent = best; }
  function move(dc, dr){
    if(!running || dead) return;
    duck.row = Math.max(0, Math.min(ROWS - 1, duck.row + dr));
    duck.x = Math.max(0, Math.min(W - C, duck.x + dc * C));
    sfx.tick?.();
    if(duck.row === 0){
      const slot = Math.round(duck.x / C);
      if(slot % 2 === 1 && !homes.includes(slot)){ homes.push(slot); saved++; sfx.coin(); updateHud();
        if(homes.length >= 5){ homes = []; level++; sfx.win(); }
        resetDuck(); }
      else die();
    }
  }
  function die(){ if(dead) return; dead = 30; lives--; sfx.fail?.(); updateHud(); }
  function loop(){
    if(!running) return;
    const sp = TEMPO * (1 + (level - 1) * 0.15);
    objs.forEach((arr, r) => { const l = LANES[r]; if(!l) return; arr.forEach(o => { o.x += l.dir * l.speed * sp; if(l.dir > 0 && o.x > W + C) o.x -= W + C * (l.len + l.gap + 3); if(l.dir < 0 && o.x + o.len * C < -C) o.x += W + C * (l.len + l.gap + 3); }); });
    if(dead){ dead--; if(dead === 0){ if(lives <= 0){ running = false; if(saved > best) best = saved; updateHud(); sfx.lose(); over.querySelector('div').textContent = `Keine Enten mehr! ${saved} gerettet`; over.classList.add('show'); window.zzSaveHighScore?.('duckcross', 'Enten-Überquerung', saved); draw(); return; } resetDuck(); } }
    else {
      const l = LANES[duck.row];
      const dx = duck.x + C / 2;
      if(l && l.type === 'road'){ if(objs[duck.row].some(o => dx > o.x + 4 && dx < o.x + o.len * C - 4)) die(); }
      if(l && l.type === 'river'){
        const on = objs[duck.row].find(o => dx > o.x && dx < o.x + o.len * C);
        if(on){ duck.x += l.dir * l.speed * sp; if(duck.x < -C / 2 || duck.x > W - C / 2) die(); } else die();
      }
    }
    draw();
    loopId = requestAnimationFrame(loop);
  }
  function draw(){
    for(let r = 0; r < ROWS; r++){
      const l = LANES[r];
      ctx.fillStyle = r === 0 ? '#14532D' : !l ? '#65A30D' : l.type === 'river' ? '#0284C7' : '#374151';
      ctx.fillRect(0, r * C, W, C);
      if(l && l.type === 'road'){ ctx.fillStyle = 'rgba(255,255,255,.3)'; for(let x = 0; x < W; x += 30) ctx.fillRect(x, r * C + C - 2, 15, 2); }
    }
    // Nester oben
    for(let s = 1; s < COLS; s += 2){ ctx.fillStyle = '#92400E'; ctx.beginPath(); ctx.ellipse(s * C + C / 2, C / 2, 14, 10, 0, 0, 7); ctx.fill(); if(homes.includes(s)){ ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🐥', s * C + C / 2, C / 2); } }
    ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    objs.forEach((arr, r) => { const l = LANES[r]; if(!l) return; arr.forEach(o => {
      if(l.type === 'river'){ ctx.fillStyle = l.obj === '🪵' ? '#92400E' : '#15803D'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(o.x + 2, r * C + 5, o.len * C - 4, C - 10, 10) : ctx.rect(o.x + 2, r * C + 5, o.len * C - 4, C - 10); ctx.fill(); if(l.obj === '🪷') for(let k = 0; k < o.len; k++) ctx.fillText('🪷', o.x + k * C + C / 2, r * C + C / 2); }
      else { for(let k = 0; k < o.len; k++){ ctx.save(); ctx.translate(o.x + k * C + C / 2, r * C + C / 2); if(l.dir > 0) ctx.scale(-1, 1); ctx.fillText(l.obj, 0, 1); ctx.restore(); } }
    }); });
    if(!dead || dead % 6 < 3){ ctx.font = '26px sans-serif'; ctx.fillText(dead ? '💫' : '🦆', duck.x + C / 2, duck.row * C + C / 2); }
  }
  const kd = e => { const m = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[e.key]; if(m){ e.preventDefault(); move(...m); } };
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * (canvas.width / r.width), y = (e.clientY - r.top) * (canvas.height / r.height);
    const dx = x - (duck.x + C / 2), dy = y - (duck.row * C + C / 2);
    if(Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx), 0); else move(0, Math.sign(dy));
  });
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); };
}
