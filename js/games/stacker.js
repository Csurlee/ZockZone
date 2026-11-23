import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🏗️ STAPELTURM – lass den Block genau auf den Turm fallen. Was übersteht, wird abgeschnitten!
// ---------- 🛠️ LUKI-ECKE ----------
const START_BREITE = 160;  // Wie breit ist der erste Block?
const START_TEMPO  = 2.4;  // Wie schnell bewegt sich der Block am Anfang?
const PERFEKT      = 4;    // So viele Pixel daneben zählt noch als "Perfekt!"
// ------------------------------------
const W = 320, H = 460, BH = 24;

export function build(){
  const scoreEl = hud([L('Höhe', 'Height'),'stkScore'], [L('Bestwert', 'Best'),'stkBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.cursor = 'pointer';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint(L('Klick, tipp oder Leertaste, um den Block fallen zu lassen. Perfekt getroffen = Block bleibt gleich breit!', 'Click, tap or press Space to drop the block. Perfect hit = the block keeps its width!')));
  addLeaderboardUI('stacker', 'Stapelturm');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let tower, cur, dir, speed, cam, camTarget, falling, best = 0, loopId, running, combo, flash;

  const hue = i => `hsl(${(i * 14 + 200) % 360} 80% 60%)`;
  function start(){
    tower = [{ x: (W - START_BREITE) / 2, w: START_BREITE }];
    speed = START_TEMPO; dir = 1; cam = 0; camTarget = 0; falling = []; combo = 0; flash = 0; running = true;
    newBlock();
    over.classList.remove('show'); updateHud();
    cancelAnimationFrame(loopId); loop();
  }
  function newBlock(){
    const top = tower[tower.length - 1];
    cur = { x: dir > 0 ? -top.w : W, w: top.w };
  }
  const level = () => tower.length - 1;
  function updateHud(){
    document.getElementById('stkScore').textContent = level();
    document.getElementById('stkBest').textContent = best;
  }
  function drop(){
    if(!running) return;
    const top = tower[tower.length - 1];
    const left = Math.max(cur.x, top.x), right = Math.min(cur.x + cur.w, top.x + top.w);
    let w = right - left;
    if(w <= 0){ falling.push({ ...cur, y: yOf(tower.length), vy: 0 }); gameOver(); return; }
    if(Math.abs(cur.x - top.x) <= PERFEKT){
      // Perfekt! Block rastet ein (und wächst nach 3 Perfekten etwas)
      combo++; flash = 20; sfx.coin();
      const grow = combo >= 3 ? Math.min(8, START_BREITE - top.w) : 0;
      tower.push({ x: top.x - grow / 2, w: top.w + grow });
    } else {
      combo = 0; sfx.place();
      // abgeschnittenes Stück fällt runter
      if(cur.x < top.x) falling.push({ x: cur.x, w: top.x - cur.x, y: yOf(tower.length), vy: 0 });
      else falling.push({ x: right, w: cur.x + cur.w - right, y: yOf(tower.length), vy: 0 });
      tower.push({ x: left, w });
    }
    speed = START_TEMPO + level() * 0.12;
    dir *= -1;
    if(level() > 10) camTarget = (level() - 10) * BH;
    updateHud(); newBlock();
  }
  const yOf = i => H - 40 - i * BH;
  function loop(){
    if(!running && !falling.length) return;
    if(running){
      cur.x += speed * dir;
      if(cur.x > W) { cur.x = W; dir = -1; }
      if(cur.x + cur.w < 0) { cur.x = -cur.w; dir = 1; }
    }
    cam += (camTarget - cam) * 0.1;
    falling.forEach(f => { f.vy += 0.5; f.y += f.vy; });
    falling = falling.filter(f => f.y < H + cam + 100);
    if(flash > 0) flash--;
    draw();
    loopId = requestAnimationFrame(loop);
  }
  function gameOver(){
    running = false; sfx.lose();
    if(level() > best) best = level();
    updateHud();
    over.querySelector('div').textContent = `Daneben! Turmhöhe: ${level()}`;
    over.classList.add('show');
    window.zzSaveHighScore?.('stacker', 'Stapelturm', level());
  }
  function draw(){
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#312E81'); g.addColorStop(1, '#0F0B1C');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(0, cam);
    ctx.fillStyle = '#374151'; ctx.fillRect(0, H - 40 + BH, W, 60);   // Boden
    tower.forEach((b, i) => block(b.x, yOf(i), b.w, hue(i)));
    if(running) block(cur.x, yOf(tower.length), cur.w, hue(tower.length));
    falling.forEach(f => block(f.x, f.y, f.w, 'rgba(255,255,255,.35)'));
    ctx.restore();
    if(flash > 0){ ctx.fillStyle = `rgba(198,255,61,${flash / 40})`; ctx.font = 'bold 26px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(combo >= 3 ? `PERFEKT ×${combo}!` : 'PERFEKT!', W / 2, 60); }
  }
  function block(x, y, w, col){
    ctx.fillStyle = col; ctx.fillRect(x, y, w, BH - 2);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x, y + BH - 6, w, 4);
  }
  const kd = e => { if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); drop(); } };
  canvas.addEventListener('pointerdown', drop);
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => { running = false; falling = []; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); };
}
