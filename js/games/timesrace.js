import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// ✖️ EINMALEINS-RENNEN – jede richtige Antwort bringt dein Auto nach vorne. Schlag das Computer-Auto!
// ---------- 🛠️ LUKI-ECKE ----------
const BIS        = 10;    // Einmaleins bis zu welcher Zahl? (10 = kleines Einmaleins)
const ZIEL       = 15;    // So viele richtige Antworten bis zum Ziel
const CPU_TEMPO  = 3.2;   // Sekunden pro Schritt für das Computer-Auto (kleiner = schwerer)
// ------------------------------------
const W = 380, H = 150;

export function build(){
  const scoreEl = hud(['Richtig','trRight'], ['Fehler','trWrong'], ['Bestzeit','trBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:14px; align-items:center;';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const qEl = document.createElement('div');
  qEl.style.cssText = 'font-family:Fredoka; font-size:42px; font-weight:700; color:#F3EEFF; min-height:52px;';
  const answers = document.createElement('div');
  answers.style.cssText = 'display:grid; grid-template-columns:repeat(4, 76px); gap:10px;';
  const btns = Array.from({ length: 4 }, (_, i) => {
    const b = document.createElement('button');
    b.style.cssText = 'height:58px; border-radius:14px; border:none; font-family:Fredoka; font-size:24px; font-weight:700; background:#241C40; color:#fff; cursor:pointer;';
    b.title = 'Taste ' + (i + 1);
    b.onclick = () => answer(i);
    answers.appendChild(b); return b;
  });
  wrap.append(canvas, qEl, answers);
  playerBody.append(scoreEl, wrap, mkHint('Klick die richtige Antwort (oder Tasten 1–4). Jede richtige Antwort = ein Schritt nach vorne. Fehler bremsen!'));
  addLeaderboardUI('timesrace', 'Einmaleins-Rennen');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let me, cpu, right, wrong, q, opts, t0, cpuT, loopId, running, best = null, last, flash;

  function start(){
    me = 0; cpu = 0; right = 0; wrong = 0; running = true; t0 = performance.now(); last = t0; cpuT = 0; flash = 0;
    over.classList.remove('show'); newQ(); updateHud();
    cancelAnimationFrame(loopId); loopId = requestAnimationFrame(loop);
  }
  function newQ(){
    const a = 2 + Math.floor(Math.random() * (BIS - 1)), b = 2 + Math.floor(Math.random() * (BIS - 1));
    q = { a, b, r: a * b };
    const set = new Set([q.r]);
    while(set.size < 4){ const wrongVal = q.r + [-a, a, -b, b, -1, 1, 10, -10][Math.floor(Math.random() * 8)]; if(wrongVal > 0) set.add(wrongVal); }
    opts = [...set].sort(() => Math.random() - .5);
    qEl.textContent = `${a} × ${b} = ?`;
    btns.forEach((b, i) => { b.textContent = opts[i]; b.style.background = '#241C40'; });
  }
  function answer(i){
    if(!running) return;
    if(opts[i] === q.r){ right++; me++; sfx.correct?.(); btns[i].style.background = '#15803D'; setTimeout(newQ, 120); }
    else { wrong++; me = Math.max(0, me - 0.5); sfx.wrong?.(); btns[i].style.background = '#B91C1C'; flash = 12; }
    updateHud();
    if(me >= ZIEL) finish(true);
  }
  function updateHud(){
    document.getElementById('trRight').textContent = right;
    document.getElementById('trWrong').textContent = wrong;
    document.getElementById('trBest').textContent = best ? best.toFixed(1) + ' s' : '–';
  }
  function loop(now){
    if(!running) return;
    const dt = (now - last) / 1000; last = now;
    cpuT += dt; if(cpuT >= CPU_TEMPO){ cpuT -= CPU_TEMPO; cpu++; }
    if(flash) flash--;
    draw(now);
    if(cpu >= ZIEL){ finish(false); return; }
    loopId = requestAnimationFrame(loop);
  }
  function finish(won){
    running = false;
    const time = (performance.now() - t0) / 1000;
    if(won){ sfx.win(); if(!best || time < best) best = time; window.zzSaveHighScore?.('timesrace', 'Einmaleins-Rennen', Math.max(1, Math.round(1000 - time * 10))); }
    else sfx.lose();
    updateHud(); draw(performance.now());
    over.querySelector('div').textContent = won ? `Gewonnen in ${time.toFixed(1)} Sekunden! 🏁` : 'Das Computer-Auto war schneller! Nochmal?';
    over.classList.add('show');
  }
  function draw(now){
    ctx.fillStyle = flash ? '#3F1D1D' : '#1F2937'; ctx.fillRect(0, 0, W, H);
    const laneY = [45, 105], x0 = 30, x1 = W - 40;
    ctx.fillStyle = '#374151'; laneY.forEach(y => ctx.fillRect(0, y - 22, W, 44));
    ctx.strokeStyle = '#FACC15'; ctx.setLineDash([12, 10]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 75); ctx.lineTo(W, 75); ctx.stroke(); ctx.setLineDash([]);
    // Ziellinie (Schachbrett)
    for(let y = 20; y < 130; y += 8) for(let k = 0; k < 2; k++){ ctx.fillStyle = ((y / 8 + k) % 2 < 1) ? '#fff' : '#111'; ctx.fillRect(x1 + 10 + k * 8, y, 8, 8); }
    const car = (p, y, icon, label) => {
      const x = x0 + (x1 - x0) * Math.min(1, p / ZIEL);
      ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1);
      ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icon, 0, 0 + Math.sin(now / 80) * 1);
      ctx.restore();
      ctx.fillStyle = '#E5E7EB'; ctx.font = 'bold 11px Fredoka, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(label, 6, y - 14);
    };
    car(me, laneY[0], '🏎️', 'DU');
    car(cpu + cpuT / CPU_TEMPO, laneY[1], '🚙', 'COMPUTER');
  }
  const kd = e => { const n = parseInt(e.key, 10); if(n >= 1 && n <= 4) answer(n - 1); };
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); };
}
