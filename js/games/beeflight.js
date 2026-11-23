import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// 🐝 BIENENFLUG – flieg zu den Blumen, sammle Nektar und bring ihn zum Bienenstock!
// Je mehr Nektar du auf einmal trägst, desto langsamer wirst du. Pass auf die Spinnen auf!
// ---------- 🛠️ LUKI-ECKE ----------
const SPIELZEIT = 90;    // Sekunden
const MAX_NEKTAR = 5;    // So viel kann die Biene tragen
const SPINNEN = 3;
// ------------------------------------
const W = 400, H = 360, HIVE = { x: 40, y: 40 };

export function build(){
  const scoreEl = hud(['Honig','bfHoney'], ['Trägt','bfCarry'], ['Zeit','bfTime']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'none';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Die Biene fliegt zur Maus/zum Finger (oder Pfeiltasten). Über eine Blume fliegen = Nektar. Zum Bienenstock 🏠 = Honig!'));
  addLeaderboardUI('beeflight', 'Bienenflug');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let bee, target, flowers, spiders, honey, carry, timeLeft, last, keys = {}, loopId, running, hurtT, pops;

  function start(){
    bee = { x: 200, y: 200, a: 0 }; target = null; honey = 0; carry = 0; timeLeft = SPIELZEIT; hurtT = 0; pops = []; running = true; last = performance.now();
    flowers = Array.from({ length: 7 }, () => newFlower());
    spiders = Array.from({ length: SPINNEN }, (_, i) => ({ x: 100 + Math.random() * 280, top: 0, len: 60 + Math.random() * 200, t: Math.random() * 6, speed: 0.01 + Math.random() * 0.015 }));
    over.classList.remove('show'); updateHud(); cancelAnimationFrame(loopId); loopId = requestAnimationFrame(loop);
  }
  function newFlower(){ return { x: 90 + Math.random() * (W - 120), y: 120 + Math.random() * (H - 150), nectar: 1, regrow: 0, hue: Math.floor(Math.random() * 360) }; }
  function updateHud(){ document.getElementById('bfHoney').textContent = honey + ' 🍯'; document.getElementById('bfCarry').textContent = '💧'.repeat(carry) || '–'; document.getElementById('bfTime').textContent = Math.ceil(timeLeft) + ' s'; }
  function loop(now){
    if(!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; timeLeft -= dt;
    const speed = 3.6 - carry * 0.45;
    let dx = 0, dy = 0;
    if(keys.ArrowLeft || keys.a) dx--; if(keys.ArrowRight || keys.d) dx++; if(keys.ArrowUp || keys.w) dy--; if(keys.ArrowDown || keys.s) dy++;
    if(dx || dy){ target = null; const l = Math.hypot(dx, dy); bee.x += dx / l * speed; bee.y += dy / l * speed; bee.a = Math.atan2(dy, dx); }
    else if(target){ const tx = target.x - bee.x, ty = target.y - bee.y, d = Math.hypot(tx, ty); if(d > 3){ bee.x += tx / d * Math.min(speed, d); bee.y += ty / d * Math.min(speed, d); bee.a = Math.atan2(ty, tx); } }
    bee.x = Math.max(10, Math.min(W - 10, bee.x)); bee.y = Math.max(10, Math.min(H - 10, bee.y));
    for(const f of flowers){
      if(f.nectar < 1){ f.regrow += dt; if(f.regrow > 6){ f.nectar = 1; f.regrow = 0; } continue; }
      if(carry < MAX_NEKTAR && Math.hypot(f.x - bee.x, f.y - bee.y) < 20){ f.nectar = 0; carry++; sfx.pop?.(); updateHud(); }
    }
    if(carry && Math.hypot(HIVE.x - bee.x, HIVE.y - bee.y) < 30){ const bonus = carry >= MAX_NEKTAR ? 2 : 0; honey += carry + bonus; pops.push({ x: HIVE.x + 30, y: HIVE.y, t: 0, txt: '+' + (carry + bonus) }); carry = 0; sfx.coin(); updateHud(); }
    for(const s of spiders){ s.t += s.speed; s.y = s.top + (Math.sin(s.t) * 0.5 + 0.5) * s.len; if(!hurtT && Math.hypot(s.x - bee.x, s.y - bee.y) < 18){ hurtT = 60; if(carry){ carry = 0; sfx.fail?.(); } else { honey = Math.max(0, honey - 2); sfx.fail?.(); } updateHud(); } }
    if(hurtT) hurtT--;
    pops.forEach(p => p.t++); pops = pops.filter(p => p.t < 40);
    updateHud(); draw();
    if(timeLeft <= 0){ running = false; timeLeft = 0; updateHud(); sfx.win(); over.querySelector('div').textContent = `Feierabend! ${honey} Honig gesammelt 🐝🍯`; over.classList.add('show'); window.zzSaveHighScore?.('beeflight', 'Bienenflug', honey); return; }
    loopId = requestAnimationFrame(loop);
  }
  function draw(){
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#BAE6FD'); g.addColorStop(1, '#86EFAC');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🏠', HIVE.x, HIVE.y);
    for(const f of flowers){
      ctx.strokeStyle = '#15803D'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x, f.y + 26); ctx.stroke();
      const alive = f.nectar >= 1;
      for(let i = 0; i < 6; i++){ const a = i / 6 * 6.28; ctx.fillStyle = alive ? `hsl(${f.hue} 80% 65%)` : `hsl(${f.hue} 15% 70%)`; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 9, f.y + Math.sin(a) * 9, 7, 0, 7); ctx.fill(); }
      ctx.fillStyle = alive ? '#FACC15' : '#A8A29E'; ctx.beginPath(); ctx.arc(f.x, f.y, 6, 0, 7); ctx.fill();
    }
    for(const s of spiders){ ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x, 0); ctx.lineTo(s.x, s.y); ctx.stroke(); ctx.font = '24px sans-serif'; ctx.fillText('🕷️', s.x, s.y); }
    if(!hurtT || hurtT % 6 < 3){
      ctx.save(); ctx.translate(bee.x, bee.y); ctx.rotate(bee.a);
      const flap = Math.sin(performance.now() / 30) * 4;
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-2, -8 - flap / 2, 7, 4 + flap / 3, -0.4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(-2, 8 + flap / 2, 7, 4 + flap / 3, 0.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#FACC15'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#111827'; ctx.fillRect(-4, -7, 3, 14); ctx.fillRect(2, -7, 3, 14); ctx.beginPath(); ctx.arc(10, 0, 4, 0, 7); ctx.fill();
      ctx.restore();
    }
    for(const p of pops){ ctx.globalAlpha = 1 - p.t / 40; ctx.fillStyle = '#B45309'; ctx.font = 'bold 18px Fredoka, sans-serif'; ctx.fillText(p.txt + ' 🍯', p.x, p.y - p.t * 0.5); }
    ctx.globalAlpha = 1;
  }
  const aim = e => { const r = canvas.getBoundingClientRect(); target = { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) }; };
  canvas.addEventListener('pointermove', aim); canvas.addEventListener('pointerdown', aim);
  const kd = e => { if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s'].includes(e.key)){ keys[e.key] = true; e.preventDefault(); } };
  const ku = e => { keys[e.key] = false; };
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
}
