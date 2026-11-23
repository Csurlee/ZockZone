import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// 🔢 ZAHLEN-SPRINT – tipp die Zahlen von 1 bis 25 so schnell wie möglich der Reihe nach an!
// ---------- 🛠️ LUKI-ECKE ----------
const BIS = 25;          // Bis zu welcher Zahl?
const STRAFE = 2;        // Sekunden Strafe für einen falschen Klick
// ------------------------------------
const W = 360, H = 360;

export function build(){
  const scoreEl = hud(['Nächste','nsNext'], ['Zeit','nsTime'], ['Bestzeit','nsBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.cursor = 'pointer';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint(`Finde die 1, dann die 2, dann die 3 … bis ${BIS}! Falsch getippt = ${STRAFE} Sekunden Strafe.`));
  addLeaderboardUI('numbersprint', 'Zahlen-Sprint');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let dots, next, t0, penalty, best = null, loopId, running, wrongFlash;

  function start(){
    dots = [];
    for(let n = 1; n <= BIS; n++){
      let x, y, tries = 0;
      do { x = 30 + Math.random() * (W - 60); y = 30 + Math.random() * (H - 60); tries++; } while(dots.some(d => Math.hypot(d.x - x, d.y - y) < 52) && tries < 400);
      dots.push({ n, x, y, r: 20 + Math.random() * 6, hue: Math.floor(Math.random() * 360), done: false });
    }
    next = 1; t0 = null; penalty = 0; running = true; wrongFlash = 0;
    over.classList.remove('show'); updateHud();
    cancelAnimationFrame(loopId); loop();
  }
  const elapsed = () => t0 === null ? 0 : (performance.now() - t0) / 1000 + penalty;
  function updateHud(){
    document.getElementById('nsNext').textContent = next <= BIS ? next : '✓';
    document.getElementById('nsTime').textContent = elapsed().toFixed(1) + ' s';
    document.getElementById('nsBest').textContent = best ? best.toFixed(1) + ' s' : '–';
  }
  function loop(){ if(!running) return; if(wrongFlash) wrongFlash--; updateHud(); draw(); loopId = requestAnimationFrame(loop); }
  function draw(){
    ctx.fillStyle = wrongFlash ? '#3F1D1D' : '#1D1730'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for(const d of dots){
      if(d.done){ ctx.fillStyle = 'rgba(198,255,61,.12)'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 0.6, 0, 7); ctx.fill(); continue; }
      ctx.fillStyle = `hsl(${d.hue} 70% 55%)`; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(d.r * 0.9)}px Fredoka, sans-serif`; ctx.fillText(d.n, d.x, d.y + 1);
    }
  }
  canvas.addEventListener('pointerdown', e => {
    if(!running) return;
    const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * (canvas.width / r.width), y = (e.clientY - r.top) * (canvas.height / r.height);
    const hit = dots.find(d => !d.done && Math.hypot(d.x - x, d.y - y) < d.r + 4);
    if(!hit) return;
    if(hit.n === next){
      if(t0 === null) t0 = performance.now();
      hit.done = true; next++; sfx.pop?.();
      if(next > BIS){
        running = false; const t = elapsed(); if(!best || t < best) best = t; updateHud(); draw(); sfx.win();
        over.querySelector('div').textContent = `Geschafft in ${t.toFixed(1)} Sekunden! ⚡`; over.classList.add('show');
        window.zzSaveHighScore?.('numbersprint', 'Zahlen-Sprint', Math.max(1, Math.round(1000 - t * 10)));
      }
    } else { penalty += STRAFE; wrongFlash = 12; sfx.wrong?.(); }
  });
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); };
}
