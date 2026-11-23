import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// 🚰 ROHRLEITUNG – dreh die Rohrstücke, bis das Wasser vom Hahn 🚰 bis zur Blume 🌻 fließt!
// Jedes Level baut der Computer so, dass es garantiert lösbar ist.
// ---------- 🛠️ LUKI-ECKE ----------
const GROESSE_START = 4;   // Startgröße des Feldes (wird mit jedem Level größer, bis 7)
// ------------------------------------
const S = 336;
// Verbindungen als Bits: 1 = oben, 2 = rechts, 4 = unten, 8 = links
const DIR = [[-1, 0, 1, 4], [0, 1, 2, 8], [1, 0, 4, 1], [0, -1, 8, 2]];
const rot = m => ((m << 1) | (m >> 3)) & 15;   // 90° im Uhrzeigersinn drehen

export function build(){
  const scoreEl = hud(['Level','ppLevel'], ['Drehungen','ppTurns']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = S;
  canvas.style.cursor = 'pointer';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Klick ein Rohr, um es zu drehen. Blaue Rohre sind schon mit dem Wasser verbunden. Bring das Wasser zur Blume!'));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', () => { level++; make(); });
  let N, C, grid, src, dst, level = 1, turns, done, wet;

  function make(){
    N = Math.min(7, GROESSE_START + Math.floor((level - 1) / 2)); C = S / N;
    grid = Array.from({ length: N }, () => Array(N).fill(0));
    // Zufälliger Weg (Tiefensuche) durch alle Felder = garantiert lösbar
    const seen = new Set(), stack = [[0, 0]]; seen.add('0,0');
    while(stack.length){
      const [r, c] = stack[stack.length - 1];
      const nb = DIR.map((d, i) => [r + d[0], c + d[1], i]).filter(([nr, nc]) => nr >= 0 && nr < N && nc >= 0 && nc < N && !seen.has(nr + ',' + nc));
      if(!nb.length){ stack.pop(); continue; }
      const [nr, nc, i] = nb[Math.floor(Math.random() * nb.length)];
      grid[r][c] |= DIR[i][2]; grid[nr][nc] |= DIR[i][3]; seen.add(nr + ',' + nc); stack.push([nr, nc]);
    }
    src = { r: 0, c: 0 };
    // Ziel = ein Endstück möglichst weit weg
    const dist = flow(true);
    let best = null; for(let r = 0; r < N; r++) for(let c = 0; c < N; c++) if([1, 2, 4, 8].includes(grid[r][c]) && !(r === 0 && c === 0) && (!best || dist[r][c] > dist[best.r][best.c])) best = { r, c };
    dst = best || { r: N - 1, c: N - 1 };
    // Verdrehen
    for(let r = 0; r < N; r++) for(let c = 0; c < N; c++){ const k = Math.floor(Math.random() * 4); for(let i = 0; i < k; i++) grid[r][c] = rot(grid[r][c]); }
    turns = 0; done = false; over.classList.remove('show'); check(); updateHud();
  }
  // Breitensuche vom Hahn aus: welche Felder haben Wasser? (mit Abstand)
  function flow(returnDist){
    const d = Array.from({ length: N }, () => Array(N).fill(-1)); d[src.r][src.c] = 0; const q = [[src.r, src.c]];
    while(q.length){ const [r, c] = q.shift(); DIR.forEach(([dr, dc, out, inn]) => { const nr = r + dr, nc = c + dc; if(nr < 0 || nr >= N || nc < 0 || nc >= N || d[nr][nc] >= 0) return; if((grid[r][c] & out) && (grid[nr][nc] & inn)){ d[nr][nc] = d[r][c] + 1; q.push([nr, nc]); } }); }
    return returnDist ? d : d.map(row => row.map(v => v >= 0));
  }
  function check(){ wet = flow(false); draw(); if(wet[dst.r][dst.c] && !done){ done = true; sfx.win(); setTimeout(() => { over.querySelector('div').textContent = `Das Wasser fließt! 🌻 Level ${level} mit ${turns} Drehungen`; over.classList.add('show'); }, 600); } }
  function updateHud(){ document.getElementById('ppLevel').textContent = level; document.getElementById('ppTurns').textContent = turns; }
  function draw(){
    ctx.fillStyle = '#1F2937'; ctx.fillRect(0, 0, S, S);
    for(let r = 0; r < N; r++) for(let c = 0; c < N; c++){
      const x = c * C, y = r * C, m = grid[r][c], w = wet[r][c];
      ctx.fillStyle = (r + c) % 2 ? '#273244' : '#2B374B'; ctx.fillRect(x, y, C, C);
      ctx.strokeStyle = w ? '#38BDF8' : '#9CA3AF'; ctx.lineWidth = C * 0.24; ctx.lineCap = 'round';
      const cx = x + C / 2, cy = y + C / 2;
      ctx.beginPath(); DIR.forEach(([dr, dc, bit]) => { if(m & bit){ ctx.moveTo(cx, cy); ctx.lineTo(cx + dc * C / 2, cy + dr * C / 2); } }); ctx.stroke();
      ctx.fillStyle = w ? '#38BDF8' : '#9CA3AF'; ctx.beginPath(); ctx.arc(cx, cy, C * 0.14, 0, 7); ctx.fill();
    }
    ctx.font = `${Math.floor(C * 0.5)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🚰', src.c * C + C / 2, src.r * C + C / 2); ctx.fillText(wet[dst.r][dst.c] ? '🌻' : '🥀', dst.c * C + C / 2, dst.r * C + C / 2);
  }
  canvas.addEventListener('pointerdown', e => {
    if(done) return;
    const r = canvas.getBoundingClientRect(), row = Math.floor((e.clientY - r.top) * (canvas.height / r.height) / C), col = Math.floor((e.clientX - r.left) * (canvas.width / r.width) / C);
    if(row < 0 || row >= N || col < 0 || col >= N) return;
    grid[row][col] = rot(grid[row][col]); turns++; sfx.click?.(); updateHud(); check();
  });
  window.__restartCurrent = () => { make(); };
  make();
  return () => { done = true; };
}
