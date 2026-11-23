import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// 🖌️ MALEN NACH ZAHLEN – wähl eine Farbe und mal alle Felder mit derselben Zahl aus!
// ---------- 🛠️ LUKI-ECKE: eigene Bilder malen! ----------
// Jedes Bild ist ein Raster aus Ziffern. Ziffer = Farbe aus der Liste darunter (0 = erste Farbe).
const BILDER = [
  { name: 'Rakete', farben: ['#0F172A', '#E5E7EB', '#EF4444', '#38BDF8', '#F97316'], raster: [
    '0000011000000',
    '0000111100000',
    '0001111110000',
    '0001133110000',
    '0001133110000',
    '0001111110000',
    '0001111110000',
    '0021111112000',
    '0221111112200',
    '0220144102200',
    '0000444400000',
    '0000044000000' ] },
  { name: 'Herz-Monster', farben: ['#1E1B4B', '#EC4899', '#FFFFFF', '#111827', '#F9A8D4'], raster: [
    '0011100111000',
    '0111111111100',
    '1111111111110',
    '1122111122110',
    '1123111123110',
    '1111111111110',
    '0141111111410',
    '0011333331100',
    '0001133311000',
    '0000111110000',
    '0000011100000',
    '0000001000000' ] },
  { name: 'Pilz', farben: ['#14532D', '#DC2626', '#FFFFFF', '#FDE68A', '#78350F'], raster: [
    '0000111110000',
    '0011121111100',
    '0111222112110',
    '1112222111111',
    '1111221111221',
    '1211111112221',
    '0111111111110',
    '0000333330000',
    '0000333430000',
    '0000333330000',
    '0000333330000',
    '0004444444000' ] },
];
// ----------------------------------------------------------

export function build(){
  const scoreEl = hud(['Bild','pnPic'], ['Fertig','pnPct']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:12px; align-items:center;';
  const canvas = document.createElement('canvas'); canvas.width = 364; canvas.height = 336;
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'crosshair';
  const pal = document.createElement('div'); pal.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; justify-content:center;';
  wrap.append(canvas, pal);
  playerBody.append(scoreEl, wrap, mkHint('Farbe unten wählen, dann über die Felder mit der passenden Zahl wischen. Falsche Felder werden nicht bemalt.'));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let pic = -1, grid, painted, color, down = false;

  function start(){
    pic = (pic + 1) % BILDER.length;
    const B = BILDER[pic];
    grid = B.raster.map(row => [...row].map(Number));
    painted = grid.map(row => row.map(() => false));
    color = 0; over.classList.remove('show');
    pal.innerHTML = '';
    B.farben.forEach((c, i) => {
      const b = document.createElement('button');
      b.textContent = i + 1;
      b.style.cssText = `width:44px;height:44px;border-radius:12px;border:3px solid transparent;background:${c};color:${i === 0 ? '#fff' : '#111'};font-family:Fredoka;font-weight:700;font-size:16px;cursor:pointer;text-shadow:0 0 3px rgba(255,255,255,.6);`;
      b.onclick = () => { color = i; sfx.click?.(); renderPal(); };
      pal.appendChild(b);
    });
    renderPal(); update();
  }
  function renderPal(){ [...pal.children].forEach((b, i) => { b.style.borderColor = i === color ? '#C6FF3D' : 'transparent'; b.style.transform = i === color ? 'scale(1.1)' : ''; }); }
  const dims = () => { const rows = grid.length, cols = grid[0].length; const c = Math.min(canvas.width / cols, canvas.height / rows); return { rows, cols, c }; };
  function update(){
    const total = grid.flat().length, done = painted.flat().filter(Boolean).length;
    document.getElementById('pnPic').textContent = `${pic + 1}/${BILDER.length}`;
    document.getElementById('pnPct').textContent = Math.round(done / total * 100) + ' %';
    draw();
    if(done === total){ sfx.win(); over.querySelector('div').textContent = `Fertig: ${BILDER[pic].name}! 🎨 Nächstes Bild?`; over.classList.add('show'); }
  }
  function draw(){
    const { rows, cols, c } = dims(), B = BILDER[pic];
    ctx.fillStyle = '#F8FAFC'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${Math.floor(c * 0.45)}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for(let r = 0; r < rows; r++) for(let k = 0; k < cols; k++){
      const x = k * c, y = r * c, v = grid[r][k];
      if(painted[r][k]){ ctx.fillStyle = B.farben[v]; ctx.fillRect(x, y, c, c); }
      else {
        ctx.fillStyle = v === color ? '#E0E7FF' : '#F8FAFC'; ctx.fillRect(x, y, c, c);
        ctx.fillStyle = v === color ? '#4338CA' : '#94A3B8'; ctx.fillText(v + 1, x + c / 2, y + c / 2 + 1);
      }
      ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, c, c);
    }
  }
  function paintAt(e){
    const rc = canvas.getBoundingClientRect(), { rows, cols, c } = dims();
    const k = Math.floor((e.clientX - rc.left) * (canvas.width / rc.width) / c), r = Math.floor((e.clientY - rc.top) * (canvas.height / rc.height) / c);
    if(r < 0 || r >= rows || k < 0 || k >= cols || painted[r][k]) return;
    if(grid[r][k] === color){ painted[r][k] = true; sfx.pop?.(); update(); }
  }
  canvas.addEventListener('pointerdown', e => { down = true; canvas.setPointerCapture?.(e.pointerId); paintAt(e); });
  canvas.addEventListener('pointermove', e => { if(down) paintAt(e); });
  canvas.addEventListener('pointerup', () => { down = false; });
  const kd = e => { const n = parseInt(e.key, 10); if(n >= 1 && n <= BILDER[pic].farben.length){ color = n - 1; renderPal(); draw(); } };
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => document.removeEventListener('keydown', kd);
}
