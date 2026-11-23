import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// ☁️ WOLKENHÜPFER – spring von Wolke zu Wolke immer höher!
// ---------- 🛠️ LUKI-ECKE ----------
const SPRUNGKRAFT = 11;    // Wie hoch springt die Figur?
const SCHWERKRAFT = 0.4;   // Wie schnell fällt sie wieder?
const LAUFTEMPO   = 6;     // Wie schnell läuft sie nach links/rechts?
// ------------------------------------
const W = 340, H = 480;

export function build(){
  const scoreEl = hud([L('Höhe', 'Height'),'cjHeight'], [L('Bestwert', 'Best'),'cjBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint(L('← → oder A D zum Lenken. Am Handy: links oder rechts tippen. Wer aus dem Bild fällt, verliert!', '← → or A D to steer. On a phone: tap left or right. Fall off the screen and you lose!')));
  addLeaderboardUI('cloudjump', 'Wolkenhüpfer');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let p, clouds, camY, best = 0, height, keys = {}, touchDir = 0, loopId, running, stars;

  function makeCloud(y){
    const w = 64 + Math.random() * 20;
    const r = Math.random();
    return { x: Math.random() * (W - w), y, w, kind: r < 0.12 && y < 300 ? 'move' : r < 0.2 && y < 200 ? 'break' : 'normal', vx: (Math.random() < .5 ? -1 : 1) * 1.4, broken: false };
  }
  function start(){
    p = { x: W/2, y: H - 80, vx: 0, vy: -SPRUNGKRAFT, face: 1 };
    clouds = [{ x: W/2 - 40, y: H - 40, w: 80, kind: 'normal' }];
    for(let y = H - 110; y > -200; y -= 70 + Math.random() * 25) clouds.push(makeCloud(y));
    stars = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * H * 3, s: Math.random() * 2 }));
    camY = 0; height = 0; running = true;
    over.classList.remove('show'); updateHud();
    cancelAnimationFrame(loopId); loop();
  }
  function updateHud(){
    document.getElementById('cjHeight').textContent = height + ' m';
    document.getElementById('cjBest').textContent = best + ' m';
  }
  function loop(){
    if(!running) return;
    let dir = touchDir;
    if(keys.ArrowLeft || keys.a || keys.A) dir = -1;
    if(keys.ArrowRight || keys.d || keys.D) dir = 1;
    p.vx += (dir * LAUFTEMPO - p.vx) * 0.25;
    if(dir) p.face = dir;
    p.x += p.vx; p.vy += SCHWERKRAFT; p.y += p.vy;
    if(p.x < -15) p.x = W + 15; if(p.x > W + 15) p.x = -15;   // durch den Rand auf die andere Seite
    // Landen (nur von oben)
    if(p.vy > 0){
      for(const c of clouds){
        if(c.broken) continue;
        if(p.x > c.x - 8 && p.x < c.x + c.w + 8 && p.y + 14 >= c.y && p.y + 14 - p.vy < c.y + 4){
          if(c.kind === 'break'){ c.broken = true; sfx.miss(); continue; }
          p.vy = -SPRUNGKRAFT; sfx.bounce(); break;
        }
      }
    }
    for(const c of clouds) if(c.kind === 'move'){ c.x += c.vx; if(c.x < 0 || c.x + c.w > W) c.vx *= -1; }
    // Kamera folgt nach oben
    const target = p.y - H * 0.4;
    if(target < camY) camY = target;
    height = Math.max(height, Math.floor((H - 80 - p.y) / 10));
    // Neue Wolken oben, alte unten weg
    let top = Math.min(...clouds.map(c => c.y));
    while(top > camY - 120){ top -= 70 + Math.random() * 30 + Math.min(40, height / 30); clouds.push(makeCloud(top)); }
    clouds = clouds.filter(c => c.y < camY + H + 40);
    updateHud(); draw();
    if(p.y > camY + H + 30){ gameOver(); return; }
    loopId = requestAnimationFrame(loop);
  }
  function gameOver(){
    running = false; sfx.lose();
    if(height > best) best = height;
    updateHud();
    over.querySelector('div').textContent = `Abgestürzt! ${height} m hoch`;
    over.classList.add('show');
    window.zzSaveHighScore?.('cloudjump', 'Wolkenhüpfer', height);
  }
  function draw(){
    // Himmel wird dunkler, je höher man kommt
    const k = Math.min(1, height / 600);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgb(${Math.round(56 - 40 * k)},${Math.round(150 - 120 * k)},${Math.round(230 - 150 * k)})`);
    g.addColorStop(1, `rgb(${Math.round(150 - 110 * k)},${Math.round(210 - 160 * k)},${Math.round(250 - 150 * k)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if(k > 0.3){ ctx.fillStyle = `rgba(255,255,255,${(k - .3)})`; stars.forEach(s => { const y = ((s.y - camY * 0.2) % (H * 3) + H * 3) % (H * 3) - H; ctx.fillRect(s.x, y, s.s, s.s); }); }
    ctx.save(); ctx.translate(0, -camY);
    for(const c of clouds){
      if(c.broken) continue;
      ctx.fillStyle = c.kind === 'break' ? '#CBD5E1' : c.kind === 'move' ? '#E0F2FE' : '#FFFFFF';
      const cx = c.x, cy = c.y, w = c.w;
      ctx.beginPath();
      ctx.arc(cx + w * 0.25, cy + 2, 11, 0, 7); ctx.arc(cx + w * 0.5, cy - 4, 14, 0, 7); ctx.arc(cx + w * 0.75, cy + 2, 11, 0, 7);
      ctx.rect(cx + w * 0.15, cy, w * 0.7, 10);
      ctx.fill();
      if(c.kind === 'break'){ ctx.strokeStyle = '#64748B'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx + w * .45, cy - 8); ctx.lineTo(cx + w * .55, cy + 2); ctx.lineTo(cx + w * .48, cy + 9); ctx.stroke(); }
    }
    // Figur
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.face, 1);
    const squash = p.vy < -SPRUNGKRAFT + 2 ? 0.85 : 1;
    ctx.scale(1 / squash, squash);
    ctx.fillStyle = '#C6FF3D'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-11, -14, 22, 28, 9) : ctx.rect(-11, -14, 22, 28); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(4, -5, 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(5.5, -5, 2, 0, 7); ctx.fill();
    ctx.fillStyle = '#4D7C0F'; ctx.fillRect(-11, 10, 22, 4);
    ctx.restore();
    ctx.restore();
  }
  const kd = e => { if(['ArrowLeft','ArrowRight','a','d','A','D'].includes(e.key)){ keys[e.key] = true; e.preventDefault(); } };
  const ku = e => { keys[e.key] = false; };
  const td = e => { const r = canvas.getBoundingClientRect(); touchDir = e.clientX - r.left < r.width / 2 ? -1 : 1; };
  const tu = () => { touchDir = 0; };
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  canvas.addEventListener('pointerdown', td); canvas.addEventListener('pointerup', tu); canvas.addEventListener('pointerleave', tu); canvas.addEventListener('pointercancel', tu);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
}
