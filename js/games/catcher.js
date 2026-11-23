import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🧺 OBSTKORB – fang die Früchte, weich den Bomben aus!
// ---------- 🛠️ LUKI-ECKE ----------
const LEBEN        = 3;      // Wie viele Leben hast du?
const START_TEMPO  = 2.2;    // Wie schnell fallen die Sachen am Anfang?
const BOMBEN_ANTEIL = 0.18;  // Wie oft kommt eine Bombe? (0.18 = 18 %)
// ------------------------------------
const W = 360, H = 420;
const FRUITS = ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉', '🍒'];

export function build(){
  const scoreEl = hud([L('Punkte', 'Points'),'catScore'], [L('Leben', 'Lives'),'catLives'], [L('Bestwert', 'Best'),'catBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint(L('Maus/Finger oder ← → bewegen den Korb. Früchte fangen, 💣 ausweichen, ⭐ gibt 5 Punkte!', 'Mouse/finger or ← → move the basket. Catch the fruit, dodge 💣, ⭐ gives 5 points!')));
  addLeaderboardUI('catcher', 'Obstkorb');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let basket, items, score, lives, best = 0, speed, spawnT, loopId, keys = {}, pops, running;

  function start(){
    basket = { x: W/2, w: 70 }; items = []; pops = []; score = 0; lives = LEBEN; speed = START_TEMPO; spawnT = 0; running = true;
    over.classList.remove('show');
    updateHud();
    cancelAnimationFrame(loopId); loop();
  }
  function updateHud(){
    document.getElementById('catScore').textContent = score;
    document.getElementById('catLives').textContent = '❤️'.repeat(Math.max(0, lives)) || '0';
    document.getElementById('catBest').textContent = best;
  }
  function spawn(){
    const r = Math.random();
    const kind = r < BOMBEN_ANTEIL ? 'bomb' : r < BOMBEN_ANTEIL + 0.06 ? 'star' : 'fruit';
    items.push({ x: 24 + Math.random() * (W - 48), y: -20, vy: speed * (0.8 + Math.random() * 0.5), kind,
                 icon: kind === 'bomb' ? '💣' : kind === 'star' ? '⭐' : FRUITS[Math.floor(Math.random() * FRUITS.length)],
                 rot: Math.random() * 6, vr: (Math.random() - .5) * 0.1 });
  }
  function loop(){
    if(!running) return;
    if(keys.ArrowLeft || keys.a)  basket.x -= 7;
    if(keys.ArrowRight || keys.d) basket.x += 7;
    basket.x = Math.max(basket.w/2, Math.min(W - basket.w/2, basket.x));
    spawnT -= 1;
    if(spawnT <= 0){ spawn(); spawnT = Math.max(18, 55 - score * 0.6); }
    speed = START_TEMPO + score * 0.03;
    const by = H - 34;
    for(const it of items){
      it.y += it.vy; it.rot += it.vr;
      if(!it.done && it.y > by - 10 && it.y < by + 16 && Math.abs(it.x - basket.x) < basket.w/2 + 6){
        it.done = true;
        if(it.kind === 'bomb'){ lives--; sfx.explosion(); pops.push({ x: it.x, y: by, t: 0, txt: '💥' }); }
        else { const p = it.kind === 'star' ? 5 : 1; score += p; it.kind === 'star' ? sfx.coin() : sfx.pop(); pops.push({ x: it.x, y: by - 10, t: 0, txt: '+' + p }); }
        updateHud();
      }
      if(!it.done && it.y > H + 20){
        it.done = true;
        if(it.kind === 'fruit'){ lives--; sfx.miss(); updateHud(); }
      }
    }
    items = items.filter(it => !it.done);
    pops.forEach(p => p.t++); pops = pops.filter(p => p.t < 40);
    draw();
    if(lives <= 0){ gameOver(); return; }
    loopId = requestAnimationFrame(loop);
  }
  function gameOver(){
    running = false; sfx.lose();
    if(score > best){ best = score; }
    updateHud();
    over.querySelector('div').textContent = `Game Over! ${score} Punkte`;
    over.classList.add('show');
    window.zzSaveHighScore?.('catcher', 'Obstkorb', score);
  }
  function draw(){
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1E3A8A'); g.addColorStop(1, '#0F0B1C');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Gras
    ctx.fillStyle = '#166534'; ctx.fillRect(0, H - 14, W, 14);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for(const it of items){
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
      ctx.font = '30px sans-serif'; ctx.fillText(it.icon, 0, 0);
      ctx.restore();
    }
    // Korb
    const by = H - 34, bw = basket.w;
    ctx.fillStyle = '#B45309';
    ctx.beginPath(); ctx.moveTo(basket.x - bw/2, by - 8); ctx.lineTo(basket.x + bw/2, by - 8);
    ctx.lineTo(basket.x + bw/2 - 8, by + 18); ctx.lineTo(basket.x - bw/2 + 8, by + 18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#78350F'; ctx.lineWidth = 2;
    for(let i = -2; i <= 2; i++){ ctx.beginPath(); ctx.moveTo(basket.x + i * 12, by - 8); ctx.lineTo(basket.x + i * 10, by + 18); ctx.stroke(); }
    ctx.fillStyle = '#F59E0B'; ctx.fillRect(basket.x - bw/2 - 3, by - 11, bw + 6, 5);
    // Punkte-Pops
    for(const p of pops){
      ctx.globalAlpha = 1 - p.t / 40;
      ctx.fillStyle = '#C6FF3D'; ctx.font = 'bold 18px Fredoka, sans-serif';
      ctx.fillText(p.txt, p.x, p.y - p.t);
    }
    ctx.globalAlpha = 1;
  }
  function onMove(e){
    const r = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    basket.x = (cx - r.left) * (canvas.width / r.width);
  }
  const kd = e => { if(['ArrowLeft','ArrowRight','a','d'].includes(e.key)){ keys[e.key] = true; e.preventDefault(); } };
  const ku = e => { keys[e.key] = false; };
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('touchmove', e => { e.preventDefault(); onMove(e); }, { passive: false });
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
}
