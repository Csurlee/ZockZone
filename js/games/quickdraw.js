import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// 🤠 SCHNELL-DUELL – 2 Spieler an einer Tastatur. Wartet auf „JETZT!“ – wer zuerst drückt, gewinnt die Runde.
// Wer zu früh drückt, verliert die Runde! Spieler 1: Taste A · Spieler 2: Taste L (oder die Hälften antippen)
// ---------- 🛠️ LUKI-ECKE ----------
const SIEGE_ZUM_GEWINN = 5;   // Wer zuerst so viele Runden gewinnt, ist Sieger
const MIN_WARTEN = 1.5, MAX_WARTEN = 5;   // Sekunden bis „JETZT!“
// ------------------------------------
const W = 400, H = 260;

export function build(){
  const scoreEl = hud(['Spieler 1 (A)','qdP1'], ['Spieler 2 (L)','qdP2']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.touchAction = 'none';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Spieler 1 drückt A (oder tippt links), Spieler 2 drückt L (oder tippt rechts). Erst bei „JETZT!“ drücken!'));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let score, phase, goAt, timer, msg, times, loopId;

  function start(){ score = [0, 0]; over.classList.remove('show'); updateHud(); round(); cancelAnimationFrame(loopId); loop(); }
  function updateHud(){ document.getElementById('qdP1').textContent = score[0]; document.getElementById('qdP2').textContent = score[1]; }
  function round(){
    clearTimeout(timer); phase = 'wait'; msg = 'Achtung…'; times = null;
    const wait = (MIN_WARTEN + Math.random() * (MAX_WARTEN - MIN_WARTEN)) * 1000;
    timer = setTimeout(() => { phase = 'go'; goAt = performance.now(); msg = 'JETZT!'; sfx.select?.(); }, wait);
  }
  function hit(p){
    if(phase === 'wait'){ clearTimeout(timer); phase = 'result'; score[1 - p]++; msg = `Spieler ${p + 1} war zu früh! Punkt für Spieler ${2 - p}`; sfx.wrong?.(); after(); }
    else if(phase === 'go'){ phase = 'result'; score[p]++; const ms = Math.round(performance.now() - goAt); times = { p, ms }; msg = `Spieler ${p + 1} gewinnt die Runde! (${ms} ms)`; sfx.coin(); after(); }
  }
  function after(){
    updateHud();
    if(score[0] >= SIEGE_ZUM_GEWINN || score[1] >= SIEGE_ZUM_GEWINN){
      const w = score[0] > score[1] ? 1 : 2; sfx.win();
      timer = setTimeout(() => { over.querySelector('div').textContent = `Spieler ${w} ist der schnellste Revolverheld! 🤠 (${score[0]} : ${score[1]})`; over.classList.add('show'); phase = 'over'; }, 1200);
    } else timer = setTimeout(round, 1800);
  }
  function loop(){
    ctx.fillStyle = phase === 'go' ? '#166534' : phase === 'wait' ? '#7C2D12' : '#1F2937'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(W / 2 - 1, 0, 2, H);
    ctx.font = '56px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🤠', W * 0.2, H * 0.62);
    ctx.save(); ctx.translate(W * 0.8, H * 0.62); ctx.scale(-1, 1); ctx.fillText('🤠', 0, 0); ctx.restore();
    ctx.font = 'bold 14px Fredoka, sans-serif'; ctx.fillStyle = '#F3EEFF';
    ctx.fillText('Spieler 1 · A', W * 0.2, H - 20); ctx.fillText('Spieler 2 · L', W * 0.8, H - 20);
    ctx.font = phase === 'go' ? 'bold 52px Fredoka, sans-serif' : 'bold 20px Fredoka, sans-serif';
    ctx.fillStyle = phase === 'go' ? '#C6FF3D' : '#F3EEFF';
    wrapText(msg || '', W / 2, phase === 'go' ? 70 : 60, W - 40, 24);
    if(times){ ctx.font = '40px sans-serif'; ctx.fillText('💥', times.p ? W * 0.62 : W * 0.38, H * 0.6); }
    loopId = requestAnimationFrame(loop);
  }
  function wrapText(t, x, y, max, lh){ const words = t.split(' '); let line = '', yy = y; for(const w of words){ const test = line ? line + ' ' + w : w; if(ctx.measureText(test).width > max && line){ ctx.fillText(line, x, yy); line = w; yy += lh; } else line = test; } ctx.fillText(line, x, yy); }
  const kd = e => { if(e.repeat) return; const k = e.key.toLowerCase(); if(k === 'a'){ e.preventDefault(); hit(0); } if(k === 'l'){ e.preventDefault(); hit(1); } };
  canvas.addEventListener('pointerdown', e => { const r = canvas.getBoundingClientRect(); hit(e.clientX - r.left < r.width / 2 ? 0 : 1); });
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => { clearTimeout(timer); cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); };
}
