import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// ⛷️ SKI-SLALOM – fahr durch die Tore (zwischen die Fahnen) und weich den Bäumen aus!
// ---------- 🛠️ LUKI-ECKE ----------
const START_TEMPO = 2.6;   // Wie schnell geht es am Anfang den Berg runter?
const LENKUNG     = 0.35;  // Wie schnell kann man lenken?
const LEBEN       = 3;     // So viele verpasste Tore / Bäume darfst du
// ------------------------------------
const W = 340, H = 460;

export function build(){
  const scoreEl = hud([L('Tore', 'Gates'),'skScore'], [L('Leben', 'Lives'),'skLives'], [L('Bestwert', 'Best'),'skBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.touchAction = 'none';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint(L('← → oder A D zum Lenken (Handy: links/rechts tippen und halten). Durch jedes Tor fahren, Bäume vermeiden!', '← → or A D to steer (phone: tap and hold left/right). Pass through every gate, avoid the trees!')));
  addLeaderboardUI('ski', 'Ski-Slalom');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let sk, gates, trees, speed, score, lives, best = 0, dist, keys = {}, touch = 0, loopId, running, trail, hitFlash;

  function start(){
    sk = { x: W / 2, vx: 0 }; gates = []; trees = []; trail = []; speed = START_TEMPO; score = 0; lives = LEBEN; dist = 0; hitFlash = 0; running = true;
    for(let y = 200; y < H + 600; y += 130) addRow(y);
    over.classList.remove('show'); updateHud();
    cancelAnimationFrame(loopId); loop();
  }
  function addRow(y){
    const gap = Math.max(70, 110 - score * 1.5);
    const cx = 40 + gap / 2 + Math.random() * (W - 80 - gap);
    gates.push({ x: cx, y, gap, color: gates.length % 2 ? '#EF4444' : '#3B82F6', done: false });
    for(let i = 0; i < 2; i++){
      let tx = Math.random() * W;
      if(Math.abs(tx - cx) < gap) tx = (tx + W / 2) % W;
      trees.push({ x: tx, y: y + 50 + Math.random() * 40, hit: false });
    }
  }
  const SKIER_Y = 110;
  function updateHud(){
    document.getElementById('skScore').textContent = score;
    document.getElementById('skLives').textContent = '❤️'.repeat(Math.max(0, lives)) || '0';
    document.getElementById('skBest').textContent = best;
  }
  function loseLife(){ lives--; hitFlash = 20; sfx.fail?.(); updateHud(); if(lives <= 0) gameOver(); }
  function loop(){
    if(!running) return;
    let dir = touch;
    if(keys.ArrowLeft || keys.a || keys.A) dir = -1;
    if(keys.ArrowRight || keys.d || keys.D) dir = 1;
    sk.vx += dir * LENKUNG; sk.vx *= 0.9;
    sk.x = Math.max(10, Math.min(W - 10, sk.x + sk.vx));
    speed = START_TEMPO + score * 0.06;
    const dy = speed * (1 - Math.min(0.5, Math.abs(sk.vx) / 12));   // scharf lenken bremst
    dist += dy;
    gates.forEach(g => g.y -= dy); trees.forEach(t => t.y -= dy);
    trail.push([sk.x, SKIER_Y]); trail.forEach(p => p[1] -= dy); trail = trail.filter(p => p[1] > -10);
    for(const g of gates){
      if(!g.done && g.y <= SKIER_Y){
        g.done = true;
        if(Math.abs(sk.x - g.x) < g.gap / 2){ score++; sfx.coin(); updateHud(); } else { g.missed = true; loseLife(); }
      }
    }
    for(const t of trees){ if(!t.hit && Math.abs(t.x - sk.x) < 12 && Math.abs(t.y - SKIER_Y) < 12){ t.hit = true; sk.vx = 0; loseLife(); } }
    if(!running) return;
    gates = gates.filter(g => g.y > -40); trees = trees.filter(t => t.y > -40);
    const lastY = Math.max(...gates.map(g => g.y));
    if(lastY < H + 400) addRow(lastY + 130);
    if(hitFlash) hitFlash--;
    draw();
    loopId = requestAnimationFrame(loop);
  }
  function gameOver(){
    running = false; sfx.lose();
    if(score > best) best = score;
    updateHud(); draw();
    over.querySelector('div').textContent = `Gestürzt! ${score} Tore geschafft`;
    over.classList.add('show');
    window.zzSaveHighScore?.('ski', 'Ski-Slalom', score);
  }
  function draw(){
    ctx.fillStyle = hitFlash ? '#FEE2E2' : '#F8FAFC'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(148,163,184,.25)';
    for(let i = 0; i < 12; i++){ const y = ((i * 60 - dist * 0.9) % (H + 60) + H + 60) % (H + 60) - 30; ctx.fillRect((i * 97) % W, y, 30, 2); }
    // Spur
    ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); trail.forEach(([x, y], i) => i ? ctx.lineTo(x - 4, y) : ctx.moveTo(x - 4, y)); ctx.stroke();
    ctx.beginPath(); trail.forEach(([x, y], i) => i ? ctx.lineTo(x + 4, y) : ctx.moveTo(x + 4, y)); ctx.stroke();
    for(const g of gates){
      [g.x - g.gap / 2, g.x + g.gap / 2].forEach(px => {
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, g.y); ctx.lineTo(px, g.y - 26); ctx.stroke();
        ctx.fillStyle = g.missed ? '#94A3B8' : g.color; ctx.beginPath(); ctx.moveTo(px, g.y - 26); ctx.lineTo(px + (px < g.x ? -14 : 14), g.y - 20); ctx.lineTo(px, g.y - 14); ctx.fill();
      });
      if(g.done && !g.missed){ ctx.fillStyle = 'rgba(34,197,94,.15)'; ctx.fillRect(g.x - g.gap / 2, g.y - 4, g.gap, 4); }
    }
    for(const t of trees){
      ctx.fillStyle = '#78350F'; ctx.fillRect(t.x - 2, t.y, 4, 8);
      ctx.fillStyle = t.hit ? '#86EFAC' : '#15803D';
      ctx.beginPath(); ctx.moveTo(t.x, t.y - 22); ctx.lineTo(t.x + 12, t.y + 2); ctx.lineTo(t.x - 12, t.y + 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(t.x, t.y - 22); ctx.lineTo(t.x + 5, t.y - 12); ctx.lineTo(t.x - 5, t.y - 12); ctx.fill();
    }
    // Skifahrer
    ctx.save(); ctx.translate(sk.x, SKIER_Y); ctx.rotate(-sk.vx * 0.08);
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(-6, -2 + 14); ctx.moveTo(-9, 12); ctx.lineTo(-3, -4); ctx.stroke();
    ctx.fillStyle = '#7C3AED'; ctx.fillRect(-6, -10, 12, 14);
    ctx.fillStyle = '#FDE68A'; ctx.beginPath(); ctx.arc(0, -14, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#EF4444'; ctx.fillRect(-5, -20, 10, 4);
    ctx.strokeStyle = '#0F172A'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-5, 6); ctx.lineTo(-5, 14); ctx.moveTo(5, 6); ctx.lineTo(5, 14); ctx.stroke();
    ctx.restore();
  }
  const kd = e => { if(['ArrowLeft','ArrowRight','a','d','A','D'].includes(e.key)){ keys[e.key] = true; e.preventDefault(); } };
  const ku = e => { keys[e.key] = false; };
  canvas.addEventListener('pointerdown', e => { const r = canvas.getBoundingClientRect(); touch = e.clientX - r.left < r.width / 2 ? -1 : 1; });
  ['pointerup','pointerleave','pointercancel'].forEach(ev => canvas.addEventListener(ev, () => { touch = 0; }));
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
}
