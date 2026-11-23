import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🌈 FARBFLUT – färbe das ganze Feld in eine Farbe!
// Du startest oben links. Wähle eine Farbe: Dein Bereich nimmt sie an und schluckt alle
// angrenzenden Felder mit dieser Farbe. Schaffst du es in wenigen Zügen?
// ---------- 🛠️ LUKI-ECKE ----------
const GROESSE = 12;   // 12 × 12 Felder
const ZUEGE   = 22;   // So viele Züge hast du
// ------------------------------------
const COLORS = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'];
const S = 336;

export function build(){
  const scoreEl = hud([L('Züge', 'Moves'),'fldMoves'], [L('Geschafft', 'Done'),'fldPct']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = S;
  wrap.appendChild(canvas);
  const pad = document.createElement('div');
  pad.style.cssText = 'display:flex; gap:10px; flex-wrap:wrap; justify-content:center;';
  const btns = COLORS.map((c, i) => {
    const b = document.createElement('button');
    b.style.cssText = `width:46px;height:46px;border-radius:12px;border:3px solid rgba(255,255,255,.15);background:${c};cursor:pointer;`;
    b.title = 'Farbe ' + (i + 1) + ' (Taste ' + (i + 1) + ')';
    b.onclick = () => pick(i);
    pad.appendChild(b); return b;
  });
  playerBody.append(scoreEl, wrap, pad, mkHint(L(`Klick eine Farbe (oder Tasten 1–6). Fülle das Feld in höchstens ${ZUEGE} Zügen!`, `Pick a color (or keys 1–6). Fill the whole board in at most ${ZUEGE} moves!`)));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let grid, moves, done, anim;

  function start(){
    grid = Array.from({ length: GROESSE }, () => Array.from({ length: GROESSE }, () => Math.floor(Math.random() * COLORS.length)));
    moves = 0; done = false; anim = [];
    over.classList.remove('show'); update();
  }
  function region(){
    const c = grid[0][0], seen = new Set(['0,0']), q = [[0, 0]];
    while(q.length){
      const [r, k] = q.pop();
      for(const [dr, dk] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nr = r + dr, nk = k + dk, key = nr + ',' + nk;
        if(nr >= 0 && nr < GROESSE && nk >= 0 && nk < GROESSE && !seen.has(key) && grid[nr][nk] === c){ seen.add(key); q.push([nr, nk]); }
      }
    }
    return seen;
  }
  function pick(ci){
    if(done || grid[0][0] === ci) return;
    const before = region().size;
    region().forEach(key => { const [r, k] = key.split(',').map(Number); grid[r][k] = ci; });
    moves++;
    const after = region().size;
    after > before ? sfx.pop() : sfx.click?.();
    update();
    if(after === GROESSE * GROESSE){ done = true; sfx.win(); over.querySelector('div').textContent = `Geschafft in ${moves} Zügen! 🎉`; over.classList.add('show'); }
    else if(moves >= ZUEGE){ done = true; sfx.lose(); over.querySelector('div').textContent = `Keine Züge mehr! ${Math.round(after / GROESSE / GROESSE * 100)} % geschafft`; over.classList.add('show'); }
  }
  function update(){
    const size = region().size;
    document.getElementById('fldMoves').textContent = moves + ' / ' + ZUEGE;
    document.getElementById('fldPct').textContent = Math.round(size / GROESSE / GROESSE * 100) + ' %';
    btns.forEach((b, i) => { b.style.opacity = grid[0][0] === i ? '.35' : '1'; b.style.transform = grid[0][0] === i ? 'scale(.9)' : ''; });
    draw(region());
  }
  function draw(reg){
    const c = S / GROESSE;
    ctx.fillStyle = '#0F0B1C'; ctx.fillRect(0, 0, S, S);
    for(let r = 0; r < GROESSE; r++) for(let k = 0; k < GROESSE; k++){
      ctx.fillStyle = COLORS[grid[r][k]];
      ctx.fillRect(k * c + 1, r * c + 1, c - 2, c - 2);
      if(reg.has(r + ',' + k)){ ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(k * c + 1, r * c + 1, c - 2, 4); }
    }
  }
  const kd = e => { const n = parseInt(e.key, 10); if(n >= 1 && n <= COLORS.length){ pick(n - 1); } };
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => document.removeEventListener('keydown', kd);
}
