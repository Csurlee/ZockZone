import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🐧 PINGUIN-RUTSCHE – auf dem Eis rutscht der Pinguin, bis er an einen Stein oder Rand stößt.
// Bring ihn zum Fisch 🐟 in möglichst wenigen Zügen! Jedes Level ist garantiert lösbar.
// ---------- 🛠️ LUKI-ECKE ----------
const GROESSE = 8;
const STEINE  = 12;   // Wie viele Steine liegen auf dem Eis?
// ------------------------------------
const S = 352, C = S / GROESSE;

export function build(){
  const scoreEl = hud([L('Level', 'Level'),'psLevel'], [L('Züge', 'Moves'),'psMoves'], [L('Bestmöglich', 'Best possible'),'psPar']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = S;
  canvas.style.touchAction = 'none';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint(L('Pfeiltasten/WASD oder wischen. Der Pinguin rutscht immer, bis er anstößt! ↺ = Level neu starten.', 'Arrow keys/WASD or swipe. The penguin always slides until it bumps into something! ↺ = restart level.')));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', () => { level++; make(); });
  let rocks, peng, fish, start0, level = 1, moves, par, anim, done;

  function slide(r, c, dr, dc){ while(true){ const nr = r + dr, nc = c + dc; if(nr < 0 || nr >= GROESSE || nc < 0 || nc >= GROESSE || rocks.has(nr + ',' + nc)) return [r, c]; r = nr; c = nc; if(r === fish.r && c === fish.c) return [r, c]; } }
  function solve(){
    const q = [[start0.r, start0.c, 0]], seen = new Set([start0.r + ',' + start0.c]);
    while(q.length){ const [r, c, d] = q.shift(); if(r === fish.r && c === fish.c) return d;
      for(const [dr, dc] of [[0,1],[1,0],[0,-1],[-1,0]]){ const [nr, nc] = slide(r, c, dr, dc); const k = nr + ',' + nc; if(!seen.has(k)){ seen.add(k); q.push([nr, nc, d + 1]); } } }
    return -1;
  }
  function make(){
    const want = Math.min(10, 3 + level);
    for(let t = 0; t < 3000; t++){
      rocks = new Set();
      const n = STEINE + Math.floor(Math.random() * 4);
      while(rocks.size < n) rocks.add(Math.floor(Math.random() * GROESSE) + ',' + Math.floor(Math.random() * GROESSE));
      const free = []; for(let r = 0; r < GROESSE; r++) for(let c = 0; c < GROESSE; c++) if(!rocks.has(r + ',' + c)) free.push({ r, c });
      start0 = free[Math.floor(Math.random() * free.length)]; fish = free[Math.floor(Math.random() * free.length)];
      if(start0 === fish) continue;
      par = solve();
      if(par >= Math.max(2, want - 2) && par <= want) break;
    }
    peng = { ...start0, x: start0.c, y: start0.r }; moves = 0; done = false; anim = null;
    over.classList.remove('show'); updateHud(); draw();
  }
  function updateHud(){ document.getElementById('psLevel').textContent = level; document.getElementById('psMoves').textContent = moves; document.getElementById('psPar').textContent = par; }
  function move(dr, dc){
    if(done || anim) return;
    const [nr, nc] = slide(peng.r, peng.c, dr, dc);
    if(nr === peng.r && nc === peng.c){ sfx.bump?.(); return; }
    moves++; updateHud(); sfx.whoosh?.();
    anim = { fr: peng.r, fc: peng.c, tr: nr, tc: nc, t: 0 };
    const step = () => {
      anim.t += 0.12 / Math.max(1, Math.hypot(anim.tr - anim.fr, anim.tc - anim.fc) / 3);
      const t = Math.min(1, anim.t);
      peng.x = anim.fc + (anim.tc - anim.fc) * t; peng.y = anim.fr + (anim.tr - anim.fr) * t; draw();
      if(t < 1) return requestAnimationFrame(step);
      peng.r = anim.tr; peng.c = anim.tc; anim = null;
      if(peng.r === fish.r && peng.c === fish.c){ done = true; sfx.win(); over.querySelector('div').textContent = moves <= par ? `Perfekt! In ${moves} Zügen 🐟⭐` : `Geschafft in ${moves} Zügen (bestmöglich: ${par}) 🐟`; over.classList.add('show'); }
    };
    step();
  }
  function draw(){
    const g = ctx.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#E0F2FE'); g.addColorStop(1, '#BAE6FD');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1;
    for(let i = 0; i <= GROESSE; i++){ ctx.beginPath(); ctx.moveTo(i * C, 0); ctx.lineTo(i * C, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * C); ctx.lineTo(S, i * C); ctx.stroke(); }
    ctx.font = `${Math.floor(C * 0.7)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    rocks.forEach(k => { const [r, c] = k.split(',').map(Number); ctx.fillStyle = '#64748B'; ctx.beginPath(); ctx.ellipse(c * C + C / 2, r * C + C / 2 + 3, C * 0.38, C * 0.32, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#94A3B8'; ctx.beginPath(); ctx.ellipse(c * C + C / 2 - 3, r * C + C / 2, C * 0.25, C * 0.18, 0, 0, 7); ctx.fill(); });
    ctx.fillText('🐟', fish.c * C + C / 2, fish.r * C + C / 2);
    ctx.fillText('🐧', peng.x * C + C / 2, peng.y * C + C / 2);
  }
  const kd = e => { const m = { ArrowUp: [-1, 0], w: [-1, 0], ArrowDown: [1, 0], s: [1, 0], ArrowLeft: [0, -1], a: [0, -1], ArrowRight: [0, 1], d: [0, 1] }[e.key]; if(m){ e.preventDefault(); move(...m); } };
  let sx = null, sy = null;
  canvas.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  canvas.addEventListener('pointerup', e => { if(sx === null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if(Math.max(Math.abs(dx), Math.abs(dy)) < 20) return; Math.abs(dx) > Math.abs(dy) ? move(0, Math.sign(dx)) : move(Math.sign(dy), 0); });
  document.addEventListener('keydown', kd);
  window.__restartCurrent = () => { peng = { ...start0, x: start0.c, y: start0.r }; moves = 0; done = false; anim = null; over.classList.remove('show'); updateHud(); draw(); };
  make();
  return () => { done = true; document.removeEventListener('keydown', kd); };
}
