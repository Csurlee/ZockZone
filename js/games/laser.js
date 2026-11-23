import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// 🔦 LASER-SPIEGEL – klick auf die Spiegel, um sie zu drehen. Lenk den Laser in den Kristall!
// Jedes Level wird vom Computer erfunden: Er baut zuerst einen Laserweg und verdreht dann die Spiegel.
// ---------- 🛠️ LUKI-ECKE ----------
const GROESSE = 7;     // 7 × 7 Felder
// ------------------------------------
const S = 350, C = S / GROESSE;
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];   // rechts, runter, links, hoch
// Spiegel '/' : rechts→hoch, hoch→rechts, links→runter, runter→links ; '\' : rechts→runter, runter→rechts, links→hoch, hoch→links
const BOUNCE = { '/': [3, 2, 1, 0], '\\': [1, 0, 3, 2] };

export function build(){
  const scoreEl = hud(['Level','lzLevel'], ['Klicks','lzClicks']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = S;
  canvas.style.cursor = 'pointer';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Klick auf einen Spiegel, um ihn zu drehen (/ ↔ \\). Der Laser startet links beim 🔦 und muss den 💎 treffen.'));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', () => { level++; make(); });
  let grid, src, gem, level = 1, clicks, solved, path;

  function make(){
    for(let tries = 0; tries < 500; tries++) if(tryMake()) break;
    clicks = 0; solved = false; over.classList.remove('show'); trace(); updateHud();
  }
  function tryMake(){
    grid = Array.from({ length: GROESSE }, () => Array(GROESSE).fill(null));
    src = { r: Math.floor(Math.random() * GROESSE), c: 0 };
    // Weg bauen: vom Laser aus laufen und an zufälligen Stellen abbiegen
    let r = src.r, c = 0, d = 0, turns = 0; const used = new Set([r + ',' + c]);
    const want = 2 + Math.min(4, level);
    for(let steps = 0; steps < 60; steps++){
      const nr = r + DIRS[d][0], nc = c + DIRS[d][1];
      if(nr < 0 || nr >= GROESSE || nc < 0 || nc >= GROESSE || used.has(nr + ',' + nc)) return false;
      r = nr; c = nc; used.add(r + ',' + c);
      if(turns >= want && Math.random() < 0.35){ gem = { r, c }; break; }
      if(Math.random() < 0.4 && c > 0){
        const nd = Math.random() < .5 ? (d + 1) % 4 : (d + 3) % 4;
        const type = BOUNCE['/'][d] === nd ? '/' : '\\';
        grid[r][c] = { type, fixed: false }; d = nd; turns++;
      }
    }
    if(!gem || turns < want) return false;
    // Ablenkungs-Spiegel dazu
    for(let k = 0; k < level + 1; k++){ const rr = Math.floor(Math.random() * GROESSE), cc = 1 + Math.floor(Math.random() * (GROESSE - 1)); if(!used.has(rr + ',' + cc) && !grid[rr][cc]) grid[rr][cc] = { type: Math.random() < .5 ? '/' : '\\' }; }
    // Spiegel verdrehen
    let flipped = 0;
    for(const row of grid) for(const m of row) if(m && Math.random() < 0.6){ m.type = m.type === '/' ? '\\' : '/'; flipped++; }
    if(!flipped){ for(const row of grid) for(const m of row) if(m){ m.type = m.type === '/' ? '\\' : '/'; break; } }
    return !traceHits();
  }
  function traceHits(){ return walk().hit; }
  function walk(){
    let r = src.r, c = src.c, d = 0; const pts = [[r, c]]; const seen = new Set();
    for(let i = 0; i < 200; i++){
      const m = grid[r][c]; if(m && !(r === src.r && c === src.c)) d = BOUNCE[m.type][d];
      const key = r + ',' + c + ',' + d; if(seen.has(key)) break; seen.add(key);
      r += DIRS[d][0]; c += DIRS[d][1];
      if(r < 0 || r >= GROESSE || c < 0 || c >= GROESSE){ pts.push([r, c]); return { pts, hit: false }; }
      pts.push([r, c]);
      if(r === gem.r && c === gem.c) return { pts, hit: true };
    }
    return { pts, hit: false };
  }
  function trace(){ const w = walk(); path = w.pts; if(w.hit && !solved){ solved = true; sfx.win(); setTimeout(() => { over.querySelector('div').textContent = `Treffer! Level ${level} mit ${clicks} Klicks geschafft 💎`; over.classList.add('show'); }, 500); } draw(w.hit); }
  function updateHud(){ document.getElementById('lzLevel').textContent = level; document.getElementById('lzClicks').textContent = clicks; }
  function draw(hit){
    ctx.fillStyle = '#0F0B1C'; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = '#241C40'; ctx.lineWidth = 1;
    for(let i = 0; i <= GROESSE; i++){ ctx.beginPath(); ctx.moveTo(i * C, 0); ctx.lineTo(i * C, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * C); ctx.lineTo(S, i * C); ctx.stroke(); }
    // Laser
    ctx.strokeStyle = hit ? '#C6FF3D' : '#EF4444'; ctx.lineWidth = 4; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10;
    ctx.beginPath(); path.forEach(([r, c], i) => { const x = c * C + C / 2, y = r * C + C / 2; i ? ctx.lineTo(x, y) : ctx.moveTo(x - C / 2, y); }); ctx.stroke();
    ctx.shadowBlur = 0;
    for(let r = 0; r < GROESSE; r++) for(let c = 0; c < GROESSE; c++){
      const m = grid[r][c]; if(!m) continue;
      const x = c * C, y = r * C;
      ctx.fillStyle = '#241C40'; ctx.fillRect(x + 4, y + 4, C - 8, C - 8);
      ctx.strokeStyle = '#E0F2FE'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath();
      if(m.type === '/'){ ctx.moveTo(x + 9, y + C - 9); ctx.lineTo(x + C - 9, y + 9); } else { ctx.moveTo(x + 9, y + 9); ctx.lineTo(x + C - 9, y + C - 9); }
      ctx.stroke();
    }
    ctx.font = `${Math.floor(C * 0.6)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🔦', src.c * C + C / 2, src.r * C + C / 2); ctx.fillText('💎', gem.c * C + C / 2, gem.r * C + C / 2);
  }
  canvas.addEventListener('pointerdown', e => {
    if(solved) return;
    const r = canvas.getBoundingClientRect(), row = Math.floor((e.clientY - r.top) * (canvas.height / r.height) / C), col = Math.floor((e.clientX - r.left) * (canvas.width / r.width) / C);
    const m = grid[row]?.[col]; if(!m) return;
    m.type = m.type === '/' ? '\\' : '/'; clicks++; sfx.click?.(); updateHud(); trace();
  });
  window.__restartCurrent = () => { make(); };
  make();
  return () => { solved = true; };
}
