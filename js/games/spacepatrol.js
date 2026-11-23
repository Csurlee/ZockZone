import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// 🛸 WELTRAUM-PATROUILLE – flieg durchs All, schieß die Gegner ab und sammle Extras!
// ⚡ = schneller schießen · 🔱 = Dreifachschuss · 🛡️ = Schutzschild
// ---------- 🛠️ LUKI-ECKE ----------
const LEBEN = 3;
const SCHUSS_PAUSE = 14;   // Bilder zwischen zwei Schüssen (kleiner = schneller)
// ------------------------------------
const W = 340, H = 460;

export function build(){
  const scoreEl = hud(['Punkte','spScore'], ['Leben','spLives'], ['Bestwert','spBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.touchAction = 'none';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Maus/Finger oder Pfeiltasten bewegen das Schiff. Es schießt von allein!'));
  addLeaderboardUI('spacepatrol', 'Weltraum-Patrouille');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let ship, shots, foes, foeShots, powers, parts, stars, score, lives, best = 0, cd, keys = {}, loopId, running, frame, power, shield, inv;

  function start(){
    ship = { x: W / 2, y: H - 60 }; shots = []; foes = []; foeShots = []; powers = []; parts = [];
    stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() * 2 }));
    score = 0; lives = LEBEN; cd = 0; frame = 0; power = { rapid: 0, triple: 0 }; shield = 0; inv = 0; running = true;
    over.classList.remove('show'); updateHud(); cancelAnimationFrame(loopId); loop();
  }
  function updateHud(){ document.getElementById('spScore').textContent = score; document.getElementById('spLives').textContent = '🛸'.repeat(Math.max(0, lives)) || '0'; document.getElementById('spBest').textContent = best; }
  function boom(x, y, col, n = 14){ for(let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 5, life: 28, col }); }
  function loop(){
    if(!running) return;
    frame++;
    if(keys.ArrowLeft || keys.a) ship.x -= 5; if(keys.ArrowRight || keys.d) ship.x += 5;
    if(keys.ArrowUp || keys.w) ship.y -= 4; if(keys.ArrowDown || keys.s) ship.y += 4;
    ship.x = Math.max(16, Math.min(W - 16, ship.x)); ship.y = Math.max(H * 0.4, Math.min(H - 20, ship.y));
    stars.forEach(s => { s.y += s.s; if(s.y > H){ s.y = 0; s.x = Math.random() * W; } });
    // Schießen
    if(--cd <= 0){
      cd = power.rapid > 0 ? SCHUSS_PAUSE / 2 : SCHUSS_PAUSE;
      const angles = power.triple > 0 ? [-0.25, 0, 0.25] : [0];
      angles.forEach(a => shots.push({ x: ship.x, y: ship.y - 16, vx: Math.sin(a) * 7, vy: -Math.cos(a) * 7 }));
      sfx.laser?.();
    }
    power.rapid = Math.max(0, power.rapid - 1); power.triple = Math.max(0, power.triple - 1); shield = Math.max(0, shield - 1); inv = Math.max(0, inv - 1);
    // Gegner erscheinen in Wellen
    const level = 1 + Math.floor(score / 300);
    if(frame % Math.max(18, 60 - level * 6) === 0){
      const kind = Math.random() < 0.15 + level * 0.03 ? 'big' : 'small';
      foes.push({ x: 20 + Math.random() * (W - 40), y: -20, hp: kind === 'big' ? 4 : 1, kind, t: Math.random() * 6, vy: kind === 'big' ? 0.8 : 1.5 + Math.random() * level * 0.3 });
    }
    shots.forEach(s => { s.x += s.vx; s.y += s.vy; }); shots = shots.filter(s => s.y > -10 && s.x > -10 && s.x < W + 10);
    for(const f of foes){
      f.t += 0.04; f.y += f.vy; f.x += Math.sin(f.t) * (f.kind === 'big' ? 0.6 : 1.4);
      if(f.kind === 'big' && Math.random() < 0.012) foeShots.push({ x: f.x, y: f.y + 14, vy: 3.5 });
      for(const s of shots) if(!s.hit && Math.abs(s.x - f.x) < (f.kind === 'big' ? 20 : 13) && Math.abs(s.y - f.y) < 14){ s.hit = true; f.hp--; if(f.hp <= 0){ f.dead = true; score += f.kind === 'big' ? 50 : 10; sfx.explosion?.(); boom(f.x, f.y, f.kind === 'big' ? '#F472B6' : '#FB923C'); if(Math.random() < (f.kind === 'big' ? 0.5 : 0.07)) powers.push({ x: f.x, y: f.y, type: ['rapid', 'triple', 'shield'][Math.floor(Math.random() * 3)] }); updateHud(); } }
      if(!f.dead && Math.abs(f.x - ship.x) < 20 && Math.abs(f.y - ship.y) < 18){ f.dead = true; boom(f.x, f.y, '#FB923C'); hurt(); }
    }
    shots = shots.filter(s => !s.hit);
    foes = foes.filter(f => !f.dead && f.y < H + 30);
    foeShots.forEach(s => s.y += s.vy);
    for(const s of foeShots) if(Math.abs(s.x - ship.x) < 12 && Math.abs(s.y - ship.y) < 14){ s.hit = true; hurt(); }
    foeShots = foeShots.filter(s => !s.hit && s.y < H + 10);
    powers.forEach(p => p.y += 1.5);
    for(const p of powers) if(Math.abs(p.x - ship.x) < 22 && Math.abs(p.y - ship.y) < 22){ p.got = true; sfx.coin(); if(p.type === 'shield') shield = 600; else power[p.type] = 600; }
    powers = powers.filter(p => !p.got && p.y < H + 20);
    parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; }); parts = parts.filter(p => p.life > 0);
    draw();
    if(lives <= 0){ running = false; if(score > best) best = score; updateHud(); sfx.lose(); over.querySelector('div').textContent = `Patrouille beendet! ${score} Punkte 🛸`; over.classList.add('show'); window.zzSaveHighScore?.('spacepatrol', 'Weltraum-Patrouille', score); return; }
    loopId = requestAnimationFrame(loop);
  }
  function hurt(){ if(shield || inv) return; lives--; inv = 90; sfx.fail?.(); boom(ship.x, ship.y, '#38BDF8', 20); updateHud(); }
  function draw(){
    ctx.fillStyle = '#05030C'; ctx.fillRect(0, 0, W, H);
    stars.forEach(s => { ctx.fillStyle = `rgba(255,255,255,${0.3 + s.s / 3})`; ctx.fillRect(s.x, s.y, s.s, s.s * 2); });
    ctx.fillStyle = '#C6FF3D'; shots.forEach(s => ctx.fillRect(s.x - 1.5, s.y - 6, 3, 10));
    ctx.fillStyle = '#F87171'; foeShots.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 7); ctx.fill(); });
    for(const f of foes){
      ctx.save(); ctx.translate(f.x, f.y);
      if(f.kind === 'big'){ ctx.fillStyle = '#A855F7'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 12, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#F0ABFC'; ctx.beginPath(); ctx.ellipse(0, -6, 10, 8, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#FDE047'; [-12, 0, 12].forEach(x => { ctx.beginPath(); ctx.arc(x, 3, 2.5, 0, 7); ctx.fill(); }); }
      else { ctx.fillStyle = '#FB923C'; ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(-12, -8); ctx.lineTo(0, -3); ctx.lineTo(12, -8); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#FEF3C7'; ctx.beginPath(); ctx.arc(0, 1, 3, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    powers.forEach(p => ctx.fillText({ rapid: '⚡', triple: '🔱', shield: '🛡️' }[p.type], p.x, p.y));
    parts.forEach(p => { ctx.globalAlpha = p.life / 28; ctx.fillStyle = p.col; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }); ctx.globalAlpha = 1;
    if(!inv || frame % 8 < 4){
      ctx.save(); ctx.translate(ship.x, ship.y);
      ctx.fillStyle = '#F97316'; ctx.beginPath(); ctx.moveTo(-5, 12); ctx.lineTo(5, 12); ctx.lineTo(0, 18 + Math.random() * 6); ctx.fill();
      ctx.fillStyle = '#38BDF8'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(14, 12); ctx.lineTo(0, 6); ctx.lineTo(-14, 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E0F2FE'; ctx.beginPath(); ctx.arc(0, -2, 4, 0, 7); ctx.fill();
      if(shield){ ctx.strokeStyle = `rgba(198,255,61,${0.4 + Math.sin(frame / 5) * 0.2})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.stroke(); }
      ctx.restore();
    }
    ctx.font = 'bold 12px Fredoka, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#FDE047';
    let y = 16; if(power.rapid) { ctx.fillText('⚡ Schnellfeuer', 8, y); y += 16; } if(power.triple) { ctx.fillText('🔱 Dreifachschuss', 8, y); y += 16; } if(shield) ctx.fillText('🛡️ Schild', 8, y);
  }
  const move = e => { const r = canvas.getBoundingClientRect(); ship.x = (e.clientX - r.left) * (canvas.width / r.width); ship.y = Math.max(H * 0.4, (e.clientY - r.top) * (canvas.height / r.height) - 30); };
  canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerdown', move);
  const kd = e => { if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s'].includes(e.key)){ keys[e.key] = true; e.preventDefault(); } };
  const ku = e => { keys[e.key] = false; };
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
}
