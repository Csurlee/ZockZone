import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, mkButton, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 💨 MUTPROBE – pump den Ballon auf! Je größer, desto mehr Punkte. Aber irgendwann platzt er …
// Hör rechtzeitig auf und kassier die Punkte. Wie mutig bist du?
// ---------- 🛠️ LUKI-ECKE ----------
const BALLONS = 10;       // Wie viele Ballons pro Runde?
const MAX_PUMPEN = 20;    // Spätestens nach so vielen Pumpstößen platzt er
// ------------------------------------
const W = 300, H = 340;
const COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#A855F7', '#F59E0B', '#EC4899'];

export function build(){
  const scoreEl = hud([L('Bank', 'Bank'),'pdBank'], [L('Ballon', 'Balloon'),'pdNum'], [L('Im Ballon', 'In balloon'),'pdCur']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:10px; align-items:center;';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const bar = document.createElement('div'); bar.style.cssText = 'display:flex; gap:10px;';
  const pumpBtn = mkButton('💨 Pumpen', '#C6FF3D'), cashBtn = mkButton('💰 Kassieren', 'var(--card)', '#fff');
  bar.append(pumpBtn, cashBtn);
  wrap.append(canvas, bar);
  playerBody.append(scoreEl, wrap, mkHint(L('Pumpen = Leertaste, Kassieren = Enter. Jeder Pumpstoß gibt mehr Punkte – aber der Ballon kann jederzeit platzen!', 'Pump = Space, cash in = Enter. Every pump is worth more points – but the balloon can pop at any time!')));
  addLeaderboardUI('pumpdare', 'Mutprobe');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let bank, num, pumps, limit, cur, state, color, pieces, wobble, history;

  function start(){ bank = 0; num = 0; history = []; over.classList.remove('show'); next(); }
  function next(){
    num++; pumps = 0; cur = 0; state = 'pump'; pieces = []; wobble = 0;
    limit = 1 + Math.floor(Math.random() * MAX_PUMPEN);   // geheim: so oft hält er
    color = COLORS[num % COLORS.length];
    update(); draw();
  }
  function update(){
    document.getElementById('pdBank').textContent = bank;
    document.getElementById('pdNum').textContent = `${Math.min(num, BALLONS)}/${BALLONS}`;
    document.getElementById('pdCur').textContent = cur;
    pumpBtn.style.opacity = state === 'pump' ? '1' : '.5'; cashBtn.style.opacity = state === 'pump' && cur > 0 ? '1' : '.5';
  }
  function pump(){
    if(state !== 'pump') return;
    pumps++; cur += pumps; wobble = 8;   // jeder weitere Pumpstoß ist mehr wert: 1, 2, 3 …
    if(pumps > limit){ state = 'pop'; cur = 0; sfx.explosion?.(); for(let i = 0; i < 26; i++) pieces.push({ x: W / 2, y: 150, vx: (Math.random() - .5) * 9, vy: (Math.random() - .7) * 9, r: Math.random() * 6, life: 50 }); history.push('💥'); animate(); setTimeout(after, 1100); }
    else sfx.pop?.();
    update(); draw();
  }
  function cash(){ if(state !== 'pump' || cur === 0) return; bank += cur; history.push(cur); state = 'cash'; sfx.coin(); update(); draw(); setTimeout(after, 700); }
  function after(){
    if(num >= BALLONS){ state = 'over'; sfx.win(); over.querySelector('div').textContent = `${bank} Punkte! ${bank >= 300 ? '🦁 Mutig und schlau!' : '🎈'}`; over.classList.add('show'); window.zzSaveHighScore?.('pumpdare', 'Mutprobe', bank); return; }
    next();
  }
  function animate(){ pieces.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life--; }); pieces = pieces.filter(p => p.life > 0); draw(); if(pieces.length) requestAnimationFrame(animate); }
  function draw(){
    ctx.fillStyle = '#1E1B4B'; ctx.fillRect(0, 0, W, H);
    // Verlauf
    ctx.font = '13px Fredoka, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#B4A9D6';
    ctx.fillText(history.map(h => h === '💥' ? '💥' : '+' + h).join('  '), 8, 18);
    // Pumpe
    ctx.fillStyle = '#64748B'; ctx.fillRect(W / 2 - 14, H - 60, 28, 50); ctx.fillRect(W / 2 - 30, H - 64 - (wobble > 4 ? 8 : 0), 60, 8);
    ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(W / 2, H - 60); ctx.lineTo(W / 2, 230); ctx.stroke();
    if(state === 'pop'){ pieces.forEach(p => { ctx.fillStyle = color; ctx.globalAlpha = p.life / 50; ctx.fillRect(p.x, p.y, p.r, p.r); }); ctx.globalAlpha = 1; ctx.fillStyle = '#F87171'; ctx.font = 'bold 30px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PENG!', W / 2, 150); return; }
    const r = 22 + pumps * 4.2 + (wobble ? Math.sin(wobble) * 2 : 0); if(wobble) wobble--;
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(W / 2, 228 - r, r * 0.88, r, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(W / 2 - r * 0.35, 228 - r * 1.4, r * 0.15, r * 0.28, -0.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.min(36, 14 + pumps * 1.2)}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(cur, W / 2, 228 - r);
    if(state === 'cash'){ ctx.fillStyle = '#C6FF3D'; ctx.font = 'bold 22px Fredoka, sans-serif'; ctx.fillText('💰 Kassiert!', W / 2, 40); }
  }
  pumpBtn.onclick = pump; cashBtn.onclick = cash;
  const kd = e => { if(e.key === ' '){ e.preventDefault(); pump(); } if(e.key === 'Enter'){ e.preventDefault(); cash(); } };
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => document.removeEventListener('keydown', kd);
}
