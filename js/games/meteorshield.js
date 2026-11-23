import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// 🛡️ METEOR-SCHILD – dreh den Schild um deinen Planeten und fang die Meteore ab!
// ---------- 🛠️ LUKI-ECKE ----------
const SCHILD_BREITE = 0.9;   // Wie breit ist der Schild? (in Bogenmaß, 0.9 ≈ 52°)
const DREH_TEMPO    = 0.07;  // Wie schnell dreht der Schild mit den Tasten?
const PLANET_LEBEN  = 5;     // So viele Treffer hält der Planet aus
// ------------------------------------
const W = 360, H = 360, CX = W / 2, CY = H / 2, PLANET_R = 34, SHIELD_R = 58;

export function build(){
  const scoreEl = hud(['Abgewehrt','msScore'], ['Planet','msLives'], ['Bestwert','msBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.touchAction = 'none';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Maus/Finger zeigt, wohin der Schild soll – oder ← → drehen. 💖 heilt den Planeten: den durchlassen!'));
  addLeaderboardUI('meteorshield', 'Meteor-Schild');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let angle, target, meteors, parts, score, lives, best = 0, spawnT, keys = {}, loopId, running, shake, stars;

  function start(){
    angle = -Math.PI / 2; target = null; meteors = []; parts = []; score = 0; lives = PLANET_LEBEN; spawnT = 60; shake = 0; running = true;
    stars = Array.from({ length: 60 }, () => [Math.random() * W, Math.random() * H, Math.random() * 1.6]);
    over.classList.remove('show'); updateHud();
    cancelAnimationFrame(loopId); loop();
  }
  function updateHud(){
    document.getElementById('msScore').textContent = score;
    document.getElementById('msLives').textContent = '🌍 ' + lives;
    document.getElementById('msBest').textContent = best;
  }
  function spawn(){
    const a = Math.random() * Math.PI * 2, d = 240;
    const heart = Math.random() < 0.07 && lives < PLANET_LEBEN;
    meteors.push({ x: CX + Math.cos(a) * d, y: CY + Math.sin(a) * d, a, speed: 1 + score * 0.025 + Math.random() * 0.5, heart, r: heart ? 9 : 6 + Math.random() * 5, spin: 0 });
  }
  const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if(d > Math.PI) d -= Math.PI * 2; if(d < -Math.PI) d += Math.PI * 2; return d; };
  function burst(x, y, col, n){ for(let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 5, life: 30, col }); }
  function loop(){
    if(!running) return;
    if(keys.ArrowLeft || keys.a){ angle -= DREH_TEMPO; target = null; }
    if(keys.ArrowRight || keys.d){ angle += DREH_TEMPO; target = null; }
    if(target !== null) angle += angDiff(target, angle) * 0.25;
    if(--spawnT <= 0){ spawn(); spawnT = Math.max(22, 70 - score * 1.2); }
    for(const m of meteors){
      m.x -= Math.cos(m.a) * m.speed; m.y -= Math.sin(m.a) * m.speed; m.spin += 0.1;
      const d = Math.hypot(m.x - CX, m.y - CY);
      const ma = Math.atan2(m.y - CY, m.x - CX);
      if(!m.heart && d < SHIELD_R + m.r && d > SHIELD_R - 8 && Math.abs(angDiff(ma, angle)) < SCHILD_BREITE / 2){
        m.done = true; score++; sfx.hit?.(); burst(m.x, m.y, '#C6FF3D', 10); updateHud();
      } else if(d < PLANET_R + m.r){
        m.done = true;
        if(m.heart){ lives = Math.min(PLANET_LEBEN, lives + 1); sfx.coin(); burst(m.x, m.y, '#F472B6', 12); }
        else { lives--; shake = 14; sfx.explosion?.(); burst(m.x, m.y, '#F97316', 18); }
        updateHud();
      } else if(m.heart && d < SHIELD_R + m.r && d > SHIELD_R - 8 && Math.abs(angDiff(ma, angle)) < SCHILD_BREITE / 2){
        m.done = true; burst(m.x, m.y, '#F472B6', 6); sfx.miss?.();   // Herz am Schild verloren
      }
    }
    meteors = meteors.filter(m => !m.done);
    parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; }); parts = parts.filter(p => p.life > 0);
    if(shake) shake--;
    draw();
    if(lives <= 0){ running = false; if(score > best) best = score; updateHud(); sfx.lose();
      over.querySelector('div').textContent = `Der Planet ist getroffen! ${score} Meteore abgewehrt`; over.classList.add('show');
      window.zzSaveHighScore?.('meteorshield', 'Meteor-Schild', score); return; }
    loopId = requestAnimationFrame(loop);
  }
  function draw(){
    ctx.save();
    if(shake) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    ctx.fillStyle = '#05030C'; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.fillStyle = '#fff'; stars.forEach(([x, y, s]) => ctx.fillRect(x, y, s, s));
    // Planet
    const g = ctx.createRadialGradient(CX - 10, CY - 10, 4, CX, CY, PLANET_R);
    g.addColorStop(0, '#60A5FA'); g.addColorStop(1, '#1E3A8A');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, CY, PLANET_R, 0, 7); ctx.fill();
    ctx.fillStyle = '#22C55E'; ctx.beginPath(); ctx.ellipse(CX - 8, CY - 6, 12, 8, 0.4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(CX + 12, CY + 10, 8, 6, -0.3, 0, 7); ctx.fill();
    // Schild
    ctx.strokeStyle = '#C6FF3D'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.shadowColor = '#C6FF3D'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(CX, CY, SHIELD_R, angle - SCHILD_BREITE / 2, angle + SCHILD_BREITE / 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(198,255,61,.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(CX, CY, SHIELD_R, 0, 7); ctx.stroke();
    // Meteore
    for(const m of meteors){
      if(m.heart){ ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💖', m.x, m.y); continue; }
      ctx.strokeStyle = 'rgba(249,115,22,.35)'; ctx.lineWidth = m.r; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + Math.cos(m.a) * 18, m.y + Math.sin(m.a) * 18); ctx.stroke();
      ctx.fillStyle = '#A8A29E'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#57534E'; ctx.beginPath(); ctx.arc(m.x + Math.cos(m.spin) * m.r * .4, m.y + Math.sin(m.spin) * m.r * .4, m.r * .3, 0, 7); ctx.fill();
    }
    for(const p of parts){ ctx.globalAlpha = p.life / 30; ctx.fillStyle = p.col; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  const aimAt = e => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (canvas.width / r.width), y = (e.clientY - r.top) * (canvas.height / r.height); target = Math.atan2(y - CY, x - CX); };
  canvas.addEventListener('pointermove', aimAt);
  canvas.addEventListener('pointerdown', aimAt);
  const kd = e => { if(['ArrowLeft','ArrowRight','a','d'].includes(e.key)){ keys[e.key] = true; e.preventDefault(); } };
  const ku = e => { keys[e.key] = false; };
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
}
