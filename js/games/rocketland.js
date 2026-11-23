import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, mkButton, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🚀 RAKETEN-LANDUNG – lande sanft und gerade auf der Plattform, bevor der Sprit alle ist!
// ---------- 🛠️ LUKI-ECKE ----------
const SCHWERKRAFT = 0.035;  // Mond-Schwerkraft (Erde wäre viel stärker!)
const SCHUB       = 0.085;  // Wie stark ist der Triebwerk?
const SPRIT       = 100;    // Wie viel Sprit hast du?
const MAX_LANDE_TEMPO = 1.4; // Schneller aufsetzen = Bruchlandung
// ------------------------------------
const W = 400, H = 340;

export function build(){
  const scoreEl = hud([L('Level', 'Level'),'rlLevel'], [L('Sprit', 'Fuel'),'rlFuel'], [L('Punkte', 'Points'),'rlScore']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.touchAction = 'none';
  wrap.appendChild(canvas);
  const pad = document.createElement('div');
  pad.style.cssText = 'display:flex; gap:8px; justify-content:center; flex-wrap:wrap;';
  const bL = mkButton('↺ Links', 'var(--card)', '#fff'), bT = mkButton('🔥 Schub', '#FF6B4A'), bR = mkButton('Rechts ↻', 'var(--card)', '#fff');
  [bL, bT, bR].forEach(b => { b.style.touchAction = 'manipulation'; pad.appendChild(b); });
  playerBody.append(scoreEl, wrap, pad, mkHint(L('↑ oder Leertaste = Schub, ← → = drehen. Lande langsam (grün!) und gerade auf der Plattform.', '↑ or Space = thrust, ← → = rotate. Land slowly (green!) and straight on the pad.')));
  addLeaderboardUI('rocketland', 'Raketen-Landung');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let rk, terrain, padX, padW, level, score, keys = {}, btnHeld = {}, loopId, running, stars, boom, landedT;

  function start(){ level = 1; score = 0; over.classList.remove('show'); newLevel(); }
  function newLevel(){
    padW = Math.max(46, 90 - level * 8);
    padX = 40 + Math.random() * (W - 80 - padW);
    terrain = [];
    let y = H - 40 - Math.random() * 40;
    for(let x = 0; x <= W; x += 10){
      if(x >= padX - 5 && x <= padX + padW + 5){ terrain.push(H - 50); continue; }
      y += (Math.random() - 0.5) * (14 + level * 3);
      y = Math.max(H - 140, Math.min(H - 15, y));
      terrain.push(y);
    }
    stars = Array.from({ length: 50 }, () => [Math.random() * W, Math.random() * H * 0.7, Math.random() * 1.5]);
    rk = { x: 60 + Math.random() * (W - 120), y: 40, vx: (Math.random() - .5) * 1.2, vy: 0, a: 0, fuel: SPRIT, thrust: false };
    boom = null; landedT = 0; running = true;
    updateHud();
    cancelAnimationFrame(loopId); loop();
  }
  const groundAt = x => { const i = Math.max(0, Math.min(terrain.length - 2, Math.floor(x / 10))); const t = (x - i * 10) / 10; return terrain[i] * (1 - t) + terrain[i + 1] * t; };
  function updateHud(){
    document.getElementById('rlLevel').textContent = level;
    document.getElementById('rlFuel').textContent = Math.max(0, Math.round(rk.fuel)) + ' %';
    document.getElementById('rlScore').textContent = score;
  }
  function loop(){
    if(!running){ if(boom){ boom.t++; draw(); if(boom.t < 60) loopId = requestAnimationFrame(loop); } return; }
    if(landedT){ landedT++; draw(); if(landedT > 60){ level++; newLevel(); return; } loopId = requestAnimationFrame(loop); return; }
    const left = keys.ArrowLeft || keys.a || btnHeld.l, right = keys.ArrowRight || keys.d || btnHeld.r;
    const up = keys.ArrowUp || keys.w || keys[' '] || btnHeld.t;
    if(left) rk.a -= 0.05; if(right) rk.a += 0.05;
    rk.a = Math.max(-1.4, Math.min(1.4, rk.a));
    rk.thrust = up && rk.fuel > 0;
    if(rk.thrust){ rk.vx += Math.sin(rk.a) * SCHUB; rk.vy -= Math.cos(rk.a) * SCHUB; rk.fuel -= 0.35; }
    rk.vy += SCHWERKRAFT; rk.x += rk.vx; rk.y += rk.vy;
    if(rk.x < 0) rk.x = W; if(rk.x > W) rk.x = 0;
    // Bodenkontakt (Fußpunkte)
    const foot = rk.y + 14;
    if(foot >= groundAt(rk.x)){
      const onPad = rk.x > padX + 6 && rk.x < padX + padW - 6;
      const speed = Math.hypot(rk.vx, rk.vy);
      if(onPad && speed < MAX_LANDE_TEMPO && Math.abs(rk.a) < 0.3){
        rk.y = H - 50 - 14; rk.vx = rk.vy = 0;
        const pts = 100 + Math.round(rk.fuel * 2) + level * 25;
        score += pts; landedT = 1; sfx.win(); updateHud();
        window.zzSaveHighScore?.('rocketland', 'Raketen-Landung', score);
      } else {
        running = false; boom = { x: rk.x, y: groundAt(rk.x), t: 0 }; sfx.explosion();
        const why = !onPad ? 'Daneben gelandet!' : speed >= MAX_LANDE_TEMPO ? 'Zu schnell aufgesetzt!' : 'Zu schief gelandet!';
        setTimeout(() => { over.querySelector('div').textContent = `💥 ${why} ${score} Punkte (Level ${level})`; over.classList.add('show'); }, 700);
        window.zzSaveHighScore?.('rocketland', 'Raketen-Landung', score);
      }
    }
    updateHud(); draw();
    loopId = requestAnimationFrame(loop);
  }
  function draw(){
    ctx.fillStyle = '#05030C'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; stars.forEach(([x, y, s]) => ctx.fillRect(x, y, s, s));
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.moveTo(0, H);
    terrain.forEach((y, i) => ctx.lineTo(i * 10, y)); ctx.lineTo(W, H); ctx.fill();
    ctx.strokeStyle = '#64748B'; ctx.lineWidth = 2; ctx.beginPath(); terrain.forEach((y, i) => ctx.lineTo(i * 10, y)); ctx.stroke();
    // Plattform
    ctx.fillStyle = '#C6FF3D'; ctx.fillRect(padX, H - 50, padW, 5);
    ctx.fillStyle = 'rgba(198,255,61,.25)'; ctx.fillRect(padX, H - 50, padW, 2);
    // Tempo-Anzeige
    const sp = Math.hypot(rk.vx, rk.vy);
    ctx.font = 'bold 13px Fredoka, sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = sp < MAX_LANDE_TEMPO ? '#4ADE80' : '#EF4444';
    ctx.fillText('Tempo ' + sp.toFixed(1) + (sp < MAX_LANDE_TEMPO ? ' ✓' : ' ✗'), 10, 18);
    ctx.fillStyle = Math.abs(rk.a) < 0.3 ? '#4ADE80' : '#EF4444';
    ctx.fillText('Neigung ' + Math.round(rk.a * 57) + '°', 10, 36);
    if(boom){
      for(let i = 0; i < 16; i++){ const a = i / 16 * 6.28, d = boom.t * 1.5; ctx.fillStyle = `rgba(255,${120 + i * 8},40,${1 - boom.t / 60})`; ctx.beginPath(); ctx.arc(boom.x + Math.cos(a) * d, boom.y - 10 + Math.sin(a) * d * .7, 4, 0, 7); ctx.fill(); }
      return;
    }
    // Rakete
    ctx.save(); ctx.translate(rk.x, rk.y); ctx.rotate(rk.a);
    if(rk.thrust){ ctx.fillStyle = Math.random() < .5 ? '#F97316' : '#FACC15'; ctx.beginPath(); ctx.moveTo(-5, 10); ctx.lineTo(5, 10); ctx.lineTo(0, 22 + Math.random() * 8); ctx.fill(); }
    ctx.fillStyle = '#E5E7EB'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(8, 4); ctx.lineTo(8, 10); ctx.lineTo(-8, 10); ctx.lineTo(-8, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#38BDF8'; ctx.beginPath(); ctx.arc(0, -2, 3.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, 10); ctx.lineTo(-11, 14); ctx.moveTo(7, 10); ctx.lineTo(11, 14); ctx.stroke();
    ctx.restore();
    if(landedT){ ctx.fillStyle = '#C6FF3D'; ctx.font = 'bold 26px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Gelandet! 🎉', W / 2, H / 2 - 40); }
  }
  const kd = e => { if(['ArrowLeft','ArrowRight','ArrowUp','a','d','w',' '].includes(e.key)){ keys[e.key] = true; e.preventDefault(); } };
  const ku = e => { keys[e.key] = false; };
  const hold = (b, k) => { b.addEventListener('pointerdown', e => { e.preventDefault(); btnHeld[k] = true; }); ['pointerup','pointerleave','pointercancel'].forEach(ev => b.addEventListener(ev, () => { btnHeld[k] = false; })); };
  hold(bL, 'l'); hold(bT, 't'); hold(bR, 'r');
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  window.__restartCurrent = start;
  start();
  return () => { running = false; boom = null; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
}
