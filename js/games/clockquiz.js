import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🕐 UHRZEIT-PROFI – wie spät ist es? Lies die Uhr ab und wähl die richtige Zeit!
// ---------- 🛠️ LUKI-ECKE ----------
const FRAGEN     = 12;    // Wie viele Uhren pro Runde?
const SCHRITT    = 5;     // Minuten in 5er-Schritten (1 = schwer, 15 = leicht)
const ZEIT_PRO_UHR = 10;  // Sekunden pro Uhr
// ------------------------------------
const S = 240;

export function build(){
  const scoreEl = hud([L('Richtig', 'Correct'),'clkRight'], [L('Uhr', 'Clock'),'clkNum'], [L('Zeit', 'Time'),'clkTime']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:14px; align-items:center;';
  const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = S;
  const answers = document.createElement('div');
  answers.style.cssText = 'display:grid; grid-template-columns:repeat(2, 130px); gap:10px;';
  const btns = Array.from({ length: 4 }, (_, i) => {
    const b = document.createElement('button');
    b.style.cssText = 'height:54px; border-radius:14px; border:none; font-family:"JetBrains Mono",monospace; font-size:24px; font-weight:700; background:#241C40; color:#fff; cursor:pointer;';
    b.title = 'Taste ' + (i + 1);
    b.onclick = () => answer(i);
    answers.appendChild(b); return b;
  });
  wrap.append(canvas, answers);
  playerBody.append(scoreEl, wrap, mkHint(L('Der kurze Zeiger zeigt die Stunde, der lange die Minuten. Klick die richtige Uhrzeit (oder Tasten 1–4)!', 'The short hand shows the hour, the long hand the minutes. Click the right time (or keys 1–4)!')));
  addLeaderboardUI('clockquiz', 'Uhrzeit-Profi');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let q, opts, num, right, timeLeft, last, loopId, running, locked;

  const fmt = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
  function start(){ num = 0; right = 0; running = true; over.classList.remove('show'); next(); last = performance.now(); cancelAnimationFrame(loopId); loopId = requestAnimationFrame(loop); }
  function next(){
    num++; locked = false; timeLeft = ZEIT_PRO_UHR;
    q = { h: 1 + Math.floor(Math.random() * 12), m: Math.floor(Math.random() * (60 / SCHRITT)) * SCHRITT };
    const set = new Set([fmt(q.h, q.m)]);
    // typische Verwechslungen: Zeiger vertauscht, eine Stunde daneben, Minuten daneben
    const swapH = Math.round(q.m / 5) || 12, swapM = (q.h % 12) * 5;
    const tries = [[swapH, swapM], [q.h % 12 + 1, q.m], [(q.h + 10) % 12 + 1, q.m], [q.h, (q.m + 30) % 60], [q.h, (q.m + 5) % 60]];
    for(const [h, m] of tries){ if(set.size >= 4) break; set.add(fmt(h, m)); }
    while(set.size < 4) set.add(fmt(1 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 12) * 5));
    opts = [...set].sort(() => Math.random() - .5);
    btns.forEach((b, i) => { b.textContent = opts[i]; b.style.background = '#241C40'; });
    updateHud(); draw();
  }
  function updateHud(){
    document.getElementById('clkRight').textContent = right;
    document.getElementById('clkNum').textContent = `${Math.min(num, FRAGEN)}/${FRAGEN}`;
    document.getElementById('clkTime').textContent = Math.ceil(timeLeft) + ' s';
  }
  function answer(i){
    if(!running || locked) return;
    locked = true;
    const correct = fmt(q.h, q.m);
    if(i >= 0 && opts[i] === correct){ right++; sfx.correct?.(); btns[i].style.background = '#15803D'; }
    else { sfx.wrong?.(); if(i >= 0) btns[i].style.background = '#B91C1C'; btns[opts.indexOf(correct)].style.background = '#15803D'; }
    updateHud();
    setTimeout(() => { if(!running) return; if(num >= FRAGEN) finish(); else next(); }, 900);
  }
  function finish(){
    running = false; sfx.win();
    over.querySelector('div').textContent = `${right} von ${FRAGEN} Uhren richtig! ${right === FRAGEN ? '🏆 Uhrzeit-Profi!' : '🕐'}`;
    over.classList.add('show');
    window.zzSaveHighScore?.('clockquiz', 'Uhrzeit-Profi', right);
  }
  function loop(now){
    if(!running) return;
    const dt = (now - last) / 1000; last = now;
    if(!locked){ timeLeft -= dt; if(timeLeft <= 0){ timeLeft = 0; answer(-1); } updateHud(); }
    loopId = requestAnimationFrame(loop);
  }
  function draw(){
    const c = S / 2, r = S / 2 - 10;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#F8FAFC'; ctx.beginPath(); ctx.arc(c, c, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7C3AED'; ctx.lineWidth = 8; ctx.stroke();
    for(let i = 0; i < 60; i++){
      const a = i / 60 * Math.PI * 2, big = i % 5 === 0;
      ctx.strokeStyle = '#334155'; ctx.lineWidth = big ? 3 : 1;
      ctx.beginPath(); ctx.moveTo(c + Math.sin(a) * (r - (big ? 14 : 8)), c - Math.cos(a) * (r - (big ? 14 : 8))); ctx.lineTo(c + Math.sin(a) * (r - 3), c - Math.cos(a) * (r - 3)); ctx.stroke();
    }
    ctx.fillStyle = '#0F172A'; ctx.font = 'bold 18px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for(let n = 1; n <= 12; n++){ const a = n / 12 * Math.PI * 2; ctx.fillText(n, c + Math.sin(a) * (r - 32), c - Math.cos(a) * (r - 32)); }
    const hand = (angle, len, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c + Math.sin(angle) * len, c - Math.cos(angle) * len); ctx.stroke(); };
    hand(((q.h % 12) + q.m / 60) / 12 * Math.PI * 2, r * 0.5, 7, '#0F172A');   // Stundenzeiger (kurz, dick)
    hand(q.m / 60 * Math.PI * 2, r * 0.78, 4, '#7C3AED');                      // Minutenzeiger (lang)
    ctx.fillStyle = '#C6FF3D'; ctx.beginPath(); ctx.arc(c, c, 6, 0, 7); ctx.fill();
  }
  const kd = e => { const n = parseInt(e.key, 10); if(n >= 1 && n <= 4) answer(n - 1); };
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); };
}
