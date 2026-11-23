import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// 🪢 SEILZIEHEN – 2 Spieler an einer Tastatur. Hämmert so schnell ihr könnt auf eure Taste!
// Spieler 1: A · Spieler 2: L (am Handy: linke/rechte Hälfte antippen). Wer das Seil über seine Linie zieht, gewinnt.
// ---------- 🛠️ LUKI-ECKE ----------
const ZUG_PRO_DRUCK = 7;     // Wie weit zieht ein Tastendruck?
const SIEG_ABSTAND  = 120;   // Wie weit muss die Mitte gezogen werden?
// ------------------------------------
const W = 400, H = 240;

export function build(){
  const scoreEl = hud(['Spieler 1 (A)','twP1'], ['Spieler 2 (L)','twP2']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.touchAction = 'none';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Countdown abwarten, dann hämmern! Spieler 1: A (links tippen) · Spieler 2: L (rechts tippen).'));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let pos, vel, wins = [0, 0], phase, count, timer, loopId, taps, shake;

  function start(){ pos = 0; vel = 0; taps = [0, 0]; shake = 0; over.classList.remove('show'); phase = 'count'; count = 3; tick(); cancelAnimationFrame(loopId); loop(); updateHud(); }
  function tick(){ clearTimeout(timer); sfx.tick?.(); timer = setTimeout(() => { count--; if(count > 0) tick(); else { phase = 'pull'; sfx.select?.(); } }, 700); }
  function updateHud(){ document.getElementById('twP1').textContent = wins[0] + ' Siege'; document.getElementById('twP2').textContent = wins[1] + ' Siege'; }
  function pull(p){
    if(phase !== 'pull') return;
    taps[p]++; vel += (p === 0 ? -1 : 1) * ZUG_PRO_DRUCK * 0.35; shake = 4;
  }
  function loop(){
    if(phase === 'pull'){
      pos += vel; vel *= 0.8;
      if(Math.abs(pos) >= SIEG_ABSTAND){
        phase = 'done'; const w = pos < 0 ? 0 : 1; wins[w]++; updateHud(); sfx.win();
        over.querySelector('div').textContent = `Spieler ${w + 1} gewinnt! 💪 (${taps[w]} mal gedrückt)`;
        over.classList.add('show');
      }
    }
    if(shake) shake--;
    draw();
    loopId = requestAnimationFrame(loop);
  }
  function draw(){
    ctx.fillStyle = '#65A30D'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#4D7C0F'; for(let x = 0; x < W; x += 30) ctx.fillRect(x, 0, 15, H);
    // Matschgrube in der Mitte
    ctx.fillStyle = '#78350F'; ctx.beginPath(); ctx.ellipse(W / 2, H * 0.62, 40, 18, 0, 0, 7); ctx.fill();
    // Ziellinien
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
    [W / 2 - SIEG_ABSTAND, W / 2 + SIEG_ABSTAND].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, H - 20); ctx.stroke(); });
    ctx.setLineDash([]);
    const off = pos + (Math.random() - .5) * shake;
    // Seil
    ctx.strokeStyle = '#D6B98C'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(30 + off, H * 0.55); ctx.lineTo(W - 30 + off, H * 0.55); ctx.stroke();
    ctx.fillStyle = '#EF4444'; ctx.fillRect(W / 2 + off - 4, H * 0.55 - 14, 8, 28);
    // Teams
    ctx.font = '34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for(let i = 0; i < 2; i++){
      ctx.fillText('🧍', 60 + i * 34 + off, H * 0.5);
      ctx.save(); ctx.translate(W - 60 - i * 34 + off, H * 0.5); ctx.scale(-1, 1); ctx.fillText('🧍', 0, 0); ctx.restore();
    }
    ctx.font = 'bold 14px Fredoka, sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText('Spieler 1 · A', 80, H - 12); ctx.fillText('Spieler 2 · L', W - 80, H - 12);
    if(phase === 'count'){ ctx.font = 'bold 64px Fredoka, sans-serif'; ctx.fillStyle = '#FACC15'; ctx.fillText(count, W / 2, 50); }
    else if(phase === 'pull' && Math.abs(pos) < 10){ ctx.font = 'bold 32px Fredoka, sans-serif'; ctx.fillStyle = '#FACC15'; ctx.fillText('ZIEHT!', W / 2, 40); }
  }
  const kd = e => { if(e.repeat) return; const k = e.key.toLowerCase(); if(k === 'a'){ e.preventDefault(); pull(0); } if(k === 'l'){ e.preventDefault(); pull(1); } };
  canvas.addEventListener('pointerdown', e => { const r = canvas.getBoundingClientRect(); pull(e.clientX - r.left < r.width / 2 ? 0 : 1); });
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => { clearTimeout(timer); cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); };
}
