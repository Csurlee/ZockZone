import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// 🔍 WORTSUCHE – finde alle versteckten Wörter! Zieh vom ersten bis zum letzten Buchstaben.
// ---------- 🛠️ LUKI-ECKE ----------
const GROESSE = 10;        // 10 × 10 Buchstaben
const ANZAHL  = 7;         // So viele Wörter pro Runde
// Hier kannst du eigene Wörter dazuschreiben (nur Großbuchstaben, ohne Umlaute, max. 10 Buchstaben)
const WOERTER = ['ZOCKEN', 'PIXEL', 'KONSOLE', 'LEVEL', 'PUNKTE', 'SPIELER', 'JOYSTICK', 'HIGHSCORE', 'ROBOTER', 'RAKETE',
  'DRACHE', 'PIRAT', 'SCHATZ', 'BURG', 'RITTER', 'ZAUBER', 'PLANET', 'KOMET', 'TIGER', 'DELFIN', 'KATZE', 'HUND',
  'FUSSBALL', 'GITARRE', 'PIZZA', 'BANANE', 'SCHULE', 'FERIEN', 'SOMMER', 'WINTER', 'COMPUTER', 'MAUS', 'TASTATUR'];
// ------------------------------------
const S = 360, M = 6, C = (S - 2 * M) / GROESSE;
const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
const FOUND_COLORS = ['#C6FF3D', '#38BDF8', '#F472B6', '#FACC15', '#A78BFA', '#FB923C', '#34D399', '#F87171'];

export function build(){
  const scoreEl = hud(['Gefunden','wsFound'], ['Zeit','wsTime']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:12px; align-items:center;';
  const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = S;
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'pointer';
  const list = document.createElement('div');
  list.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; justify-content:center; max-width:380px;';
  wrap.append(canvas, list);
  playerBody.append(scoreEl, wrap, mkHint('Drück auf den ersten Buchstaben eines Wortes und zieh bis zum letzten. Wörter können waagrecht, senkrecht, schräg und rückwärts stehen!'));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let grid, words, found, sel, t0, timer;

  function start(){
    for(let attempt = 0; attempt < 50; attempt++){ if(makePuzzle()) break; }
    found = []; sel = null; t0 = Date.now();
    clearInterval(timer); timer = setInterval(tick, 500);
    over.classList.remove('show'); renderList(); tick(); draw();
  }
  function makePuzzle(){
    grid = Array.from({ length: GROESSE }, () => Array(GROESSE).fill(''));
    const pool = WOERTER.filter(w => w.length <= GROESSE).sort(() => Math.random() - .5);
    words = [];
    for(const w of pool){
      if(words.length >= ANZAHL) break;
      for(let tries = 0; tries < 80; tries++){
        const [dr, dc] = DIRS[Math.floor(Math.random() * DIRS.length)];
        const r = Math.floor(Math.random() * GROESSE), c = Math.floor(Math.random() * GROESSE);
        const er = r + dr * (w.length - 1), ec = c + dc * (w.length - 1);
        if(er < 0 || er >= GROESSE || ec < 0 || ec >= GROESSE) continue;
        let ok = true;
        for(let i = 0; i < w.length; i++){ const ch = grid[r + dr * i][c + dc * i]; if(ch && ch !== w[i]){ ok = false; break; } }
        if(!ok) continue;
        for(let i = 0; i < w.length; i++) grid[r + dr * i][c + dc * i] = w[i];
        words.push({ w, r, c, er, ec });
        break;
      }
    }
    const abc = 'ABCDEFGHIJKLMNOPRSTUVWZ';
    for(let r = 0; r < GROESSE; r++) for(let c = 0; c < GROESSE; c++) if(!grid[r][c]) grid[r][c] = abc[Math.floor(Math.random() * abc.length)];
    return words.length >= ANZAHL;
  }
  function tick(){
    const s = Math.floor((Date.now() - t0) / 1000);
    document.getElementById('wsTime').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    document.getElementById('wsFound').textContent = `${found.length}/${words.length}`;
  }
  function renderList(){
    list.innerHTML = '';
    words.forEach(w => {
      const i = found.indexOf(w);
      const s = document.createElement('span');
      s.textContent = w.w;
      s.style.cssText = `font-family:Fredoka; font-weight:600; padding:4px 10px; border-radius:99px; background:${i >= 0 ? FOUND_COLORS[i % FOUND_COLORS.length] : '#241C40'}; color:${i >= 0 ? '#14101F' : '#F3EEFF'}; ${i >= 0 ? 'text-decoration:line-through;' : ''}`;
      list.appendChild(s);
    });
  }
  const center = (r, c) => [M + c * C + C / 2, M + r * C + C / 2];
  function draw(){
    ctx.fillStyle = '#1D1730'; ctx.fillRect(0, 0, S, S);
    const stroke = (r1, c1, r2, c2, col) => { const [x1, y1] = center(r1, c1), [x2, y2] = center(r2, c2); ctx.strokeStyle = col; ctx.lineWidth = C * 0.78; ctx.lineCap = 'round'; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.globalAlpha = 1; };
    found.forEach((w, i) => stroke(w.r, w.c, w.er, w.ec, FOUND_COLORS[i % FOUND_COLORS.length]));
    if(sel && sel.end) stroke(sel.r, sel.c, sel.end[0], sel.end[1], '#FFFFFF');
    ctx.fillStyle = '#F3EEFF'; ctx.font = `bold ${Math.floor(C * 0.55)}px "JetBrains Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for(let r = 0; r < GROESSE; r++) for(let c = 0; c < GROESSE; c++){ const [x, y] = center(r, c); ctx.fillText(grid[r][c], x, y + 1); }
  }
  function cell(e){
    const rc = canvas.getBoundingClientRect();
    const x = (e.clientX - rc.left) * (canvas.width / rc.width) - M, y = (e.clientY - rc.top) * (canvas.height / rc.height) - M;
    return [Math.max(0, Math.min(GROESSE - 1, Math.floor(y / C))), Math.max(0, Math.min(GROESSE - 1, Math.floor(x / C)))];
  }
  function snap(r, c){
    // auf die nächste der 8 Richtungen einrasten
    let dr = r - sel.r, dc = c - sel.c;
    if(dr === 0 && dc === 0) return [r, c];
    const len = Math.max(Math.abs(dr), Math.abs(dc));
    const a = Math.round(Math.atan2(dr, dc) / (Math.PI / 4)) * (Math.PI / 4);
    let er = sel.r + Math.round(Math.sin(a)) * len, ec = sel.c + Math.round(Math.cos(a)) * len;
    er = Math.max(0, Math.min(GROESSE - 1, er)); ec = Math.max(0, Math.min(GROESSE - 1, ec));
    return [er, ec];
  }
  canvas.addEventListener('pointerdown', e => { const [r, c] = cell(e); sel = { r, c, end: [r, c] }; canvas.setPointerCapture?.(e.pointerId); draw(); });
  canvas.addEventListener('pointermove', e => { if(sel){ const [r, c] = cell(e); sel.end = snap(r, c); draw(); } });
  canvas.addEventListener('pointerup', () => {
    if(!sel) return;
    const [er, ec] = sel.end;
    const w = words.find(w => !found.includes(w) && ((w.r === sel.r && w.c === sel.c && w.er === er && w.ec === ec) || (w.er === sel.r && w.ec === sel.c && w.r === er && w.c === ec)));
    sel = null;
    if(w){ found.push(w); sfx.coin(); renderList(); tick();
      if(found.length === words.length){ clearInterval(timer); sfx.win(); over.querySelector('div').textContent = `Alle Wörter gefunden in ${document.getElementById('wsTime').textContent}! 🔍`; over.classList.add('show'); } }
    draw();
  });
  window.__restartCurrent = start;
  start();
  return () => clearInterval(timer);
}
