import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// 🎣 ANGELGLÜCK – fahr mit dem Boot und lass den Haken runter. Je tiefer, desto wertvoller die Fische!
// ---------- 🛠️ LUKI-ECKE ----------
const SPIELZEIT = 60;   // Sekunden
const HAKEN_TEMPO = 4;  // Wie schnell geht der Haken runter/rauf?
// ------------------------------------
const W = 380, H = 420, WATER = 90;
const TYPES = [
  { icon: '🐟', pts: 2,  depth: [110, 200], speed: 1.4 },
  { icon: '🐠', pts: 5,  depth: [180, 290], speed: 1.8 },
  { icon: '🐡', pts: 8,  depth: [260, 350], speed: 1.2 },
  { icon: '🦈', pts: 20, depth: [330, 400], speed: 2.6 },
  { icon: '👢', pts: -3, depth: [120, 390], speed: 0.6 },
];

export function build(){
  const scoreEl = hud(['Punkte','fshScore'], ['Zeit','fshTime']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('← → fahren (oder Finger links/rechts), Leertaste/Klick = Haken runter. 🦈 = 20 Punkte, 👢 = −3!'));
  addLeaderboardUI('fishing', 'Angelglück');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let boat, hook, fish, score, timeLeft, last, keys = {}, loopId, running, pops, wave = 0, touchX = null;

  function start(){
    boat = { x: W / 2 }; hook = { y: WATER - 10, state: 'up', catch: null };
    fish = []; pops = []; score = 0; timeLeft = SPIELZEIT; running = true; last = performance.now();
    for(let i = 0; i < 7; i++) spawn(Math.random() * W);
    over.classList.remove('show'); updateHud();
    cancelAnimationFrame(loopId); loopId = requestAnimationFrame(loop);
  }
  function spawn(x){
    const t = TYPES[Math.random() < 0.12 ? 4 : Math.random() < 0.08 ? 3 : Math.floor(Math.random() * 3)];
    const dir = Math.random() < .5 ? -1 : 1;
    fish.push({ ...t, x: x ?? (dir > 0 ? -20 : W + 20), y: t.depth[0] + Math.random() * (t.depth[1] - t.depth[0]), dir, wob: Math.random() * 6 });
  }
  function updateHud(){
    document.getElementById('fshScore').textContent = score;
    document.getElementById('fshTime').textContent = Math.ceil(timeLeft);
  }
  function cast(){ if(running && hook.state === 'up'){ hook.state = 'down'; sfx.whoosh?.(); } }
  function loop(now){
    if(!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    timeLeft -= dt; wave += dt;
    if(hook.state === 'up' && !hook.catch){
      if(keys.ArrowLeft || keys.a) boat.x -= 4;
      if(keys.ArrowRight || keys.d) boat.x += 4;
      if(touchX !== null) boat.x += Math.sign(touchX - boat.x) * Math.min(4, Math.abs(touchX - boat.x));
      boat.x = Math.max(30, Math.min(W - 30, boat.x));
    }
    if(hook.state === 'down'){
      hook.y += HAKEN_TEMPO;
      const hit = fish.find(f => Math.abs(f.x - boat.x) < 18 && Math.abs(f.y - hook.y) < 14);
      if(hit){ hook.catch = hit; fish = fish.filter(f => f !== hit); hook.state = 'reel'; sfx.bounce?.(); }
      else if(hook.y > H - 15) hook.state = 'reel';
    } else if(hook.state === 'reel'){
      hook.y -= HAKEN_TEMPO * (hook.catch ? 0.8 : 1.5);
      if(hook.y <= WATER - 10){
        hook.y = WATER - 10; hook.state = 'up';
        if(hook.catch){
          score += hook.catch.pts; hook.catch.pts > 0 ? sfx.coin() : sfx.fail();
          pops.push({ x: boat.x, y: WATER - 30, t: 0, txt: (hook.catch.pts > 0 ? '+' : '') + hook.catch.pts });
          hook.catch = null; spawn(); updateHud();
        }
      }
    }
    for(const f of fish){ f.x += f.speed * f.dir; f.wob += 0.08; }
    const before = fish.length;
    fish = fish.filter(f => f.x > -40 && f.x < W + 40);
    for(let i = fish.length; i < before; i++) spawn();
    pops.forEach(p => p.t++); pops = pops.filter(p => p.t < 45);
    updateHud(); draw();
    if(timeLeft <= 0){ end(); return; }
    loopId = requestAnimationFrame(loop);
  }
  function end(){
    running = false; timeLeft = 0; updateHud(); sfx.win();
    over.querySelector('div').textContent = `Feierabend! ${score} Punkte 🎣`;
    over.classList.add('show');
    window.zzSaveHighScore?.('fishing', 'Angelglück', score);
  }
  function draw(){
    // Himmel
    const sky = ctx.createLinearGradient(0, 0, 0, WATER);
    sky.addColorStop(0, '#FDBA74'); sky.addColorStop(1, '#FDE68A');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, WATER);
    ctx.fillStyle = '#FB923C'; ctx.beginPath(); ctx.arc(W - 60, 40, 22, 0, 7); ctx.fill();
    // Wasser (wird nach unten dunkler)
    const sea = ctx.createLinearGradient(0, WATER, 0, H);
    sea.addColorStop(0, '#0EA5E9'); sea.addColorStop(1, '#0C1E42');
    ctx.fillStyle = sea; ctx.fillRect(0, WATER, W, H - WATER);
    // Wellen
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath();
    for(let x = 0; x <= W; x += 8) ctx.lineTo(x, WATER + Math.sin(x / 20 + wave * 3) * 2);
    ctx.stroke();
    // Seegras
    ctx.strokeStyle = '#166534'; ctx.lineWidth = 4;
    [40, 120, 230, 330].forEach(x => { ctx.beginPath(); ctx.moveTo(x, H); ctx.quadraticCurveTo(x + Math.sin(wave + x) * 10, H - 30, x, H - 55); ctx.stroke(); });
    // Fische
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '26px sans-serif';
    for(const f of fish){ ctx.save(); ctx.translate(f.x, f.y + Math.sin(f.wob) * 3); ctx.scale(-f.dir, 1); ctx.fillText(f.icon, 0, 0); ctx.restore(); }
    // Boot + Angel
    const by = WATER - 14 + Math.sin(wave * 3) * 1.5;
    ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(boat.x, by - 22); ctx.lineTo(boat.x, hook.y); ctx.stroke();
    ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(boat.x - 4, hook.y, 4, 0, Math.PI); ctx.stroke();
    if(hook.catch){ ctx.save(); ctx.translate(boat.x, hook.y + 14); ctx.rotate(Math.PI / 2); ctx.font = '26px sans-serif'; ctx.fillText(hook.catch.icon, 0, 0); ctx.restore(); }
    ctx.fillStyle = '#92400E';
    ctx.beginPath(); ctx.moveTo(boat.x - 32, by); ctx.lineTo(boat.x + 32, by); ctx.lineTo(boat.x + 22, by + 14); ctx.lineTo(boat.x - 22, by + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#78350F'; ctx.fillRect(boat.x - 2, by - 24, 3, 24);
    ctx.font = '20px sans-serif'; ctx.fillText('🧑', boat.x - 14, by - 8);
    // Punkte
    for(const p of pops){ ctx.globalAlpha = 1 - p.t / 45; ctx.fillStyle = p.txt.startsWith('-') ? '#EF4444' : '#C6FF3D'; ctx.font = 'bold 20px Fredoka, sans-serif'; ctx.fillText(p.txt, p.x, p.y - p.t * 0.6); }
    ctx.globalAlpha = 1;
  }
  const kd = e => {
    if(['ArrowLeft','ArrowRight','a','d'].includes(e.key)){ keys[e.key] = true; e.preventDefault(); }
    if(e.key === ' ' || e.key === 'ArrowDown' || e.key === 's'){ e.preventDefault(); cast(); }
  };
  const ku = e => { keys[e.key] = false; };
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (canvas.width / r.width);
    if(Math.abs(x - boat.x) < 45) cast(); else touchX = x;
  });
  const stopTouch = () => { touchX = null; };
  canvas.addEventListener('pointerup', stopTouch); canvas.addEventListener('pointerleave', stopTouch); canvas.addEventListener('pointercancel', stopTouch);
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
}
