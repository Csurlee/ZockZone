import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, mkButton, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🌱 GEMÜSEGARTEN – kauf Samen, pflanz sie, gieß sie und ernte, wenn sie reif sind!
// Wer nicht gießt, dessen Pflanzen vertrocknen. Schaffst du 500 Münzen in 3 Minuten?
// ---------- 🛠️ LUKI-ECKE ----------
const SPIELZEIT = 180;   // Sekunden
const ZIEL      = 500;   // Münzen-Ziel
const PFLANZEN = [
  { id: 'karotte', icon: '🥕', preis: 5,  verkauf: 14, wachsen: 8 },
  { id: 'tomate',  icon: '🍅', preis: 10, verkauf: 30, wachsen: 14 },
  { id: 'kuerbis', icon: '🎃', preis: 25, verkauf: 80, wachsen: 24 },
  { id: 'erdbeere',icon: '🍓', preis: 15, verkauf: 45, wachsen: 18 },
];
// ------------------------------------
const COLS = 5, ROWS = 4, C = 70, W = COLS * C, H = ROWS * C;

export function build(){
  const scoreEl = hud([L('Münzen', 'Coins'),'gdCoins'], [L('Zeit', 'Time'),'gdTime'], [L('Ziel', 'Goal'),'gdGoal']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:10px; align-items:center;';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.cursor = 'pointer';
  const bar = document.createElement('div'); bar.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; justify-content:center;';
  const toolBtns = {};
  PFLANZEN.forEach(p => { const b = mkButton(`${p.icon} ${p.preis}🪙`, 'var(--card)', '#fff'); b.onclick = () => { tool = p.id; render(); }; bar.appendChild(b); toolBtns[p.id] = b; });
  const water = mkButton('💧 Gießen', 'var(--card)', '#fff'); water.onclick = () => { tool = 'water'; render(); }; bar.appendChild(water); toolBtns.water = water;
  wrap.append(canvas, bar);
  playerBody.append(scoreEl, wrap, mkHint(L('Samen wählen und auf ein leeres Beet klicken. Mit 💧 gießen (Tropfen = durstig!). Reife Pflanzen ✨ anklicken zum Ernten und Verkaufen.', 'Pick seeds and click an empty bed. Water with 💧 (drop = thirsty!). Click ripe plants ✨ to harvest and sell.')));
  addLeaderboardUI('garden', 'Gemüsegarten');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let beds, coins, timeLeft, last, tool, loopId, running, pops;

  function start(){ beds = Array.from({ length: COLS * ROWS }, () => null); coins = 30; timeLeft = SPIELZEIT; tool = 'karotte'; pops = []; running = true; last = performance.now(); over.classList.remove('show'); render(); cancelAnimationFrame(loopId); loopId = requestAnimationFrame(loop); }
  function render(){
    document.getElementById('gdCoins').textContent = coins + ' 🪙';
    document.getElementById('gdTime').textContent = Math.ceil(timeLeft) + ' s';
    document.getElementById('gdGoal').textContent = ZIEL;
    Object.entries(toolBtns).forEach(([k, b]) => { b.style.outline = tool === k ? '3px solid #C6FF3D' : 'none'; const p = PFLANZEN.find(x => x.id === k); b.style.opacity = p && coins < p.preis ? '.5' : '1'; });
  }
  function loop(now){
    if(!running) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    timeLeft -= dt;
    for(const b of beds){
      if(!b || b.dead || b.ripe) continue;
      b.water -= dt / 7;
      if(b.water <= 0){ b.thirst += dt; if(b.thirst > 6){ b.dead = true; sfx.fail?.(); } }
      else { b.grow += dt / b.p.wachsen; b.thirst = 0; if(b.grow >= 1){ b.ripe = true; sfx.blip?.(); } }
    }
    pops.forEach(p => p.t++); pops = pops.filter(p => p.t < 40);
    render(); draw();
    if(timeLeft <= 0 || coins >= ZIEL){ running = false; const won = coins >= ZIEL; (won ? sfx.win : sfx.lose)();
      over.querySelector('div').textContent = won ? `Super-Gärtner! ${ZIEL} Münzen in ${Math.round(SPIELZEIT - timeLeft)} Sekunden 🌻` : `Zeit um! ${coins} Münzen verdient`;
      over.classList.add('show'); window.zzSaveHighScore?.('garden', 'Gemüsegarten', coins); return; }
    loopId = requestAnimationFrame(loop);
  }
  function draw(){
    ctx.fillStyle = '#4D7C0F'; ctx.fillRect(0, 0, W, H);
    ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    beds.forEach((b, i) => {
      const x = (i % COLS) * C, y = Math.floor(i / COLS) * C;
      ctx.fillStyle = b && b.water > 0 ? '#5B3A1E' : '#8B5A2B'; ctx.fillRect(x + 5, y + 5, C - 10, C - 10);
      ctx.fillStyle = 'rgba(0,0,0,.15)'; for(let k = 0; k < 3; k++) ctx.fillRect(x + 10, y + 16 + k * 16, C - 20, 3);
      if(!b) return;
      if(b.dead){ ctx.fillText('🥀', x + C / 2, y + C / 2); return; }
      if(b.ripe){ ctx.fillText(b.p.icon, x + C / 2, y + C / 2); ctx.font = '14px sans-serif'; ctx.fillText('✨', x + C - 14, y + 14); ctx.font = '30px sans-serif'; return; }
      const s = 12 + b.grow * 18; ctx.font = `${s}px sans-serif`; ctx.fillText(b.grow < 0.5 ? '🌱' : '🌿', x + C / 2, y + C / 2 + 4); ctx.font = '30px sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 10, y + C - 14, C - 20, 5);
      ctx.fillStyle = '#C6FF3D'; ctx.fillRect(x + 10, y + C - 14, (C - 20) * b.grow, 5);
      if(b.water <= 0){ ctx.font = '16px sans-serif'; ctx.fillText('💧', x + 14, y + 14); ctx.font = '30px sans-serif'; }
    });
    for(const p of pops){ ctx.globalAlpha = 1 - p.t / 40; ctx.fillStyle = '#FDE047'; ctx.font = 'bold 18px Fredoka, sans-serif'; ctx.fillText(p.txt, p.x, p.y - p.t); ctx.font = '30px sans-serif'; }
    ctx.globalAlpha = 1;
  }
  canvas.addEventListener('pointerdown', e => {
    if(!running) return;
    const r = canvas.getBoundingClientRect(), c = Math.floor((e.clientX - r.left) * (canvas.width / r.width) / C), row = Math.floor((e.clientY - r.top) * (canvas.height / r.height) / C);
    const i = row * COLS + c; if(i < 0 || i >= beds.length) return;
    const b = beds[i], cx = c * C + C / 2, cy = row * C + C / 2;
    if(b && b.ripe){ coins += b.p.verkauf; pops.push({ x: cx, y: cy, t: 0, txt: '+' + b.p.verkauf }); beds[i] = null; sfx.coin(); }
    else if(b && b.dead){ beds[i] = null; sfx.click?.(); }
    else if(tool === 'water'){ if(b){ b.water = 1; sfx.pop?.(); } }
    else if(!b){ const p = PFLANZEN.find(x => x.id === tool); if(coins >= p.preis){ coins -= p.preis; beds[i] = { p, grow: 0, water: 1, thirst: 0 }; sfx.place?.(); } else sfx.wrong?.(); }
    render(); draw();
  });
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); };
}
