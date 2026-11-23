import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// 🚗 PARKPLATZ-CHAOS – schieb die Autos hin und her, bis das rote Auto rechts rausfahren kann!
// Autos fahren nur vorwärts/rückwärts (waagrechte nach links/rechts, senkrechte nach oben/unten).
// ---------- 🛠️ LUKI-ECKE: eigene Level bauen! ----------
// Jedes Level: 6×6 Felder. Buchstabe = Auto, gleiche Buchstaben gehören zusammen. 'R' = rotes Auto, '.' = frei.
const LEVELS = [
  ['......', '......', 'RR..A.', '....A.', '......', '......'],
  ['..A...', '..A...', 'RRA...', '...BBB', '......', '......'],
  ['A..B..', 'A..B..', 'ARRB..', '..CCC.', '......', '......'],
  ['AA...B', 'C..D.B', 'CRRD.B', 'C..D..', 'E...FF', 'E.GGG.'],
  ['.JJ.AA', '.EEEK.', 'RRI.KD', '..IFFD', 'GHCCCB', 'GH...B'],   // vom Computer erfunden, lösbar in 12 Zügen
  ['.AAAHH', 'GG.EDD', 'RRBEJF', 'K.B.JF', 'KCC...', '..II..'],   // vom Computer erfunden, lösbar in 13 Zügen
];
// --------------------------------------------------------
const N = 6, S = 336, C = S / N;
const CAR_COLORS = ['#3B82F6', '#22C55E', '#FACC15', '#A855F7', '#14B8A6', '#F97316', '#EC4899', '#64748B', '#0EA5E9', '#84CC16'];

export function build(){
  const scoreEl = hud(['Level','pkLevel'], ['Züge','pkMoves']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = S + 30; canvas.height = S;
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'grab';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Zieh ein Auto in seine Richtung. Ziel: Das rote Auto muss rechts durch die Ausfahrt!'));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', next);
  let level = -1, cars, moves, drag, done, exitAnim;

  function next(){ level = (level + 1) % LEVELS.length; load(); }
  function load(){
    const L = LEVELS[level], map = {};
    L.forEach((row, r) => [...row].forEach((ch, c) => { if(ch !== '.') (map[ch] ??= []).push([r, c]); }));
    cars = Object.entries(map).map(([id, cells], i) => {
      const horiz = cells.every(([r]) => r === cells[0][0]);
      const r = Math.min(...cells.map(x => x[0])), c = Math.min(...cells.map(x => x[1]));
      return { id, r, c, len: cells.length, horiz, color: id === 'R' ? '#EF4444' : CAR_COLORS[i % CAR_COLORS.length], off: 0 };
    });
    moves = 0; drag = null; done = false; exitAnim = 0;
    over.classList.remove('show'); updateHud(); draw();
  }
  window.__restartCurrent = () => { load(); };
  function updateHud(){ document.getElementById('pkLevel').textContent = `${level + 1}/${LEVELS.length}`; document.getElementById('pkMoves').textContent = moves; }
  function occupied(except){
    const g = Array.from({ length: N }, () => Array(N).fill(false));
    for(const car of cars) if(car !== except) for(let i = 0; i < car.len; i++) g[car.r + (car.horiz ? 0 : i)][car.c + (car.horiz ? i : 0)] = true;
    return g;
  }
  function limits(car){
    const g = occupied(car); let lo = 0, hi = 0;
    if(car.horiz){ while(car.c - lo - 1 >= 0 && !g[car.r][car.c - lo - 1]) lo++; while(car.c + car.len + hi < N && !g[car.r][car.c + car.len + hi]) hi++; }
    else { while(car.r - lo - 1 >= 0 && !g[car.r - lo - 1][car.c]) lo++; while(car.r + car.len + hi < N && !g[car.r + car.len + hi][car.c]) hi++; }
    return [-lo, hi];
  }
  function draw(){
    ctx.fillStyle = '#374151'; ctx.fillRect(0, 0, S + 30, S);
    ctx.fillStyle = '#4B5563'; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
    for(let i = 1; i < N; i++){ ctx.beginPath(); ctx.moveTo(i * C, 0); ctx.lineTo(i * C, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * C); ctx.lineTo(S, i * C); ctx.stroke(); }
    ctx.setLineDash([]);
    // Ausfahrt
    const red = cars.find(c => c.id === 'R');
    ctx.fillStyle = '#C6FF3D'; ctx.fillRect(S, red.r * C + 6, 30, C - 12);
    ctx.fillStyle = '#14101F'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('➜', S + 15, red.r * C + C / 2);
    for(const car of cars){
      const x = (car.c + (car.horiz ? car.off : 0)) * C + (car.id === 'R' ? exitAnim : 0), y = (car.r + (car.horiz ? 0 : car.off)) * C;
      const w = car.horiz ? car.len * C : C, h = car.horiz ? C : car.len * C;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x + 7, y + 8, w - 10, h - 10);
      ctx.fillStyle = car.color; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 4, y + 4, w - 8, h - 8, 10) : ctx.rect(x + 4, y + 4, w - 8, h - 8); ctx.fill();
      // Fenster
      ctx.fillStyle = 'rgba(15,23,42,.55)';
      if(car.horiz){ ctx.fillRect(x + w - 26, y + 12, 10, h - 24); ctx.fillRect(x + 14, y + 12, 8, h - 24); }
      else { ctx.fillRect(x + 12, y + 14, w - 24, 8); ctx.fillRect(x + 12, y + h - 26, w - 24, 10); }
      if(drag && drag.car === car){ ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(x + 4, y + 4, w - 8, h - 8); }
    }
  }
  const pt = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * (canvas.width / r.width), (e.clientY - r.top) * (canvas.height / r.height)]; };
  canvas.addEventListener('pointerdown', e => {
    if(done) return;
    const [x, y] = pt(e), c = Math.floor(x / C), r = Math.floor(y / C);
    const car = cars.find(k => r >= k.r && r < k.r + (k.horiz ? 1 : k.len) && c >= k.c && c < k.c + (k.horiz ? k.len : 1));
    if(!car) return;
    drag = { car, sx: x, sy: y, lim: limits(car) }; canvas.setPointerCapture?.(e.pointerId); canvas.style.cursor = 'grabbing'; draw();
  });
  canvas.addEventListener('pointermove', e => {
    if(!drag) return;
    const [x, y] = pt(e), d = (drag.car.horiz ? x - drag.sx : y - drag.sy) / C;
    drag.car.off = Math.max(drag.lim[0], Math.min(drag.lim[1], d)); draw();
  });
  canvas.addEventListener('pointerup', () => {
    if(!drag) return;
    const car = drag.car, step = Math.round(car.off);
    if(step){ car.horiz ? car.c += step : car.r += step; moves++; sfx.click?.(); }
    car.off = 0; drag = null; canvas.style.cursor = 'grab'; updateHud(); draw();
    const red = cars.find(k => k.id === 'R');
    if(red.c + red.len === N){ done = true; sfx.win();
      const anim = () => { exitAnim += 12; draw(); if(exitAnim < 200) requestAnimationFrame(anim); else { over.querySelector('div').textContent = `Ausgeparkt in ${moves} Zügen! 🚗 Nächstes Level?`; over.classList.add('show'); } };
      anim(); }
  });
  next();
  return () => { done = true; };
}
