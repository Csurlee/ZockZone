import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// 💥 KETTENREAKTION – du hast nur EINEN Klick! Er macht eine Explosion. Jeder Punkt, der sie berührt,
// explodiert auch. Schaffst du genug Punkte für das nächste Level?
// ---------- 🛠️ LUKI-ECKE ----------
const EXPLOSION_GROESSE = 32;   // Wie groß wird eine Explosion?
const EXPLOSION_DAUER   = 70;   // Wie lange bleibt sie (in Bildern)?
// ------------------------------------
const W = 380, H = 380;
const LEVELS = [[5, 10], [10, 15], [15, 20], [22, 28], [30, 35], [38, 42], [45, 48], [50, 52], [54, 55], [58, 58]];   // [Ziel, Punkte]

export function build(){
  const scoreEl = hud(['Level','crLevel'], ['Getroffen','crHit'], ['Ziel','crGoal']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.cursor = 'crosshair';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Warte auf den richtigen Moment und klick EINMAL. Die Explosionen stecken sich gegenseitig an!'));
  addLeaderboardUI('chainreaction', 'Kettenreaktion');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', () => { if(passed) level++; setup(); });   // geschafft = nächstes Level, sonst nochmal
  let dots, booms, level = 0, hit, clicked, loopId, running, passed, total = 0;

  function setup(){
    if(level >= LEVELS.length){ level = 0; total = 0; }
    const [, n] = LEVELS[level];
    dots = Array.from({ length: n }, () => { const a = Math.random() * 6.28, s = 0.8 + Math.random() * 1.2; return { x: 20 + Math.random() * (W - 40), y: 20 + Math.random() * (H - 40), vx: Math.cos(a) * s, vy: Math.sin(a) * s, hue: Math.floor(Math.random() * 360) }; });
    booms = []; hit = 0; clicked = false; passed = false; running = true;
    over.classList.remove('show'); updateHud();
    cancelAnimationFrame(loopId); loop();
  }
  function updateHud(){ document.getElementById('crLevel').textContent = `${level + 1}/${LEVELS.length}`; document.getElementById('crHit').textContent = `${hit}/${dots.length}`; document.getElementById('crGoal').textContent = LEVELS[level][0]; }
  function loop(){
    if(!running) return;
    for(const d of dots){ d.x += d.vx; d.y += d.vy; if(d.x < 8 || d.x > W - 8) d.vx *= -1; if(d.y < 8 || d.y > H - 8) d.vy *= -1; }
    for(const b of booms){ b.t++; b.r = b.t < 15 ? EXPLOSION_GROESSE * b.t / 15 : b.t > EXPLOSION_DAUER - 15 ? EXPLOSION_GROESSE * (EXPLOSION_DAUER - b.t) / 15 : EXPLOSION_GROESSE; }
    for(let i = dots.length - 1; i >= 0; i--){
      const d = dots[i];
      if(booms.some(b => b.r > 0 && Math.hypot(d.x - b.x, d.y - b.y) < b.r + 6)){
        booms.push({ x: d.x, y: d.y, t: 0, r: 0, hue: d.hue }); dots.splice(i, 1); hit++; sfx.pop?.(); updateHud();
      }
    }
    booms = booms.filter(b => b.t < EXPLOSION_DAUER);
    draw();
    if(clicked && booms.length === 0){ finish(); return; }
    loopId = requestAnimationFrame(loop);
  }
  function finish(){
    running = false; passed = hit >= LEVELS[level][0];
    if(passed){ total += hit; sfx.win(); window.zzSaveHighScore?.('chainreaction', 'Kettenreaktion', total); }
    else sfx.lose();
    over.querySelector('div').textContent = passed ? (level + 1 >= LEVELS.length ? `Alle Level geschafft! 🏆 ${total} Punkte` : `Geschafft! ${hit} getroffen. Nächstes Level?`) : `Nur ${hit} von ${LEVELS[level][0]} – nochmal versuchen!`;
    over.classList.add('show');
  }
  function draw(){
    ctx.fillStyle = '#0B0717'; ctx.fillRect(0, 0, W, H);
    for(const b of booms){ ctx.fillStyle = `hsla(${b.hue} 90% 60% / .45)`; ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(0, b.r), 0, 7); ctx.fill(); ctx.strokeStyle = `hsla(${b.hue} 90% 75% / .8)`; ctx.lineWidth = 2; ctx.stroke(); }
    for(const d of dots){ ctx.fillStyle = `hsl(${d.hue} 85% 60%)`; ctx.beginPath(); ctx.arc(d.x, d.y, 6, 0, 7); ctx.fill(); }
    if(!clicked){ ctx.fillStyle = 'rgba(243,238,255,.6)'; ctx.font = 'bold 14px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Ein Klick – mach ihn gut!', W / 2, 20); }
  }
  canvas.addEventListener('pointerdown', e => {
    if(clicked || !running) return;
    const r = canvas.getBoundingClientRect();
    clicked = true; booms.push({ x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height), t: 0, r: 0, hue: 90 }); sfx.explosion?.();
  });
  window.__restartCurrent = () => { setup(); };
  setup();
  return () => { running = false; cancelAnimationFrame(loopId); };
}
