import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// ⚖️ WAAGE – links liegt ein geheimnisvolles Paket. Leg Gewichte auf die rechte Seite,
// bis die Waage genau gerade ist! Klick ein Gewicht zum Auflegen, nochmal klicken zum Runternehmen.
// ---------- 🛠️ LUKI-ECKE ----------
const GEWICHTE = [1, 2, 3, 5, 10, 20, 50];   // Diese Gewichte gibt es
const RUNDEN = 8;
// ------------------------------------
const W = 380, H = 230;

export function build(){
  const scoreEl = hud(['Runde','scRound'], ['Punkte','scScore']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:12px; align-items:center;';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const tray = document.createElement('div'); tray.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; justify-content:center;';
  const msgEl = document.createElement('div'); msgEl.style.cssText = 'font-family:Fredoka; font-size:18px; font-weight:600; min-height:24px;';
  wrap.append(canvas, msgEl, tray);
  playerBody.append(scoreEl, wrap, mkHint('Die Waage zeigt, welche Seite schwerer ist. Probier Gewichte aus, bis sie genau gerade steht. Wenig Ausprobieren = mehr Punkte!'));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let target, used, round, score, tries, tilt, done;

  function start(){ round = 0; score = 0; over.classList.remove('show'); next(); }
  function next(){
    round++; used = GEWICHTE.map(() => false); tries = 0; tilt = 0; done = false;
    // Ziel aus 2–4 zufälligen Gewichten zusammensetzen (also immer lösbar)
    const pick = GEWICHTE.map((w, i) => i).sort(() => Math.random() - .5).slice(0, 2 + Math.floor(Math.random() * Math.min(3, 1 + round / 3)));
    target = pick.reduce((a, i) => a + GEWICHTE[i], 0);
    msgEl.textContent = 'Wie schwer ist das Paket? 📦'; msgEl.style.color = '#F3EEFF';
    renderTray(); update();
  }
  const right = () => GEWICHTE.reduce((a, w, i) => a + (used[i] ? w : 0), 0);
  function toggle(i){
    if(done) return;
    used[i] = !used[i]; tries++; sfx.place?.();
    renderTray(); update();
    const r = right();
    if(r === target){
      done = true; const pts = Math.max(10, 60 - tries * 5); score += pts; sfx.win();
      msgEl.textContent = `⚖️ Genau! Das Paket wiegt ${target} kg. +${pts}`; msgEl.style.color = '#C6FF3D'; update();
      setTimeout(() => { if(round >= RUNDEN){ over.querySelector('div').textContent = `${score} Punkte! Du bist ein Waagen-Profi ⚖️`; over.classList.add('show'); } else next(); }, 1500);
    } else { msgEl.textContent = r > target ? 'Rechts ist zu schwer ⬇️' : 'Links ist schwerer ⬅️'; msgEl.style.color = '#FDE68A'; }
  }
  function renderTray(){
    tray.innerHTML = '';
    GEWICHTE.forEach((w, i) => {
      const b = document.createElement('button');
      b.textContent = w + ' kg';
      b.style.cssText = `width:${44 + Math.log2(w + 1) * 8}px;height:44px;border-radius:10px 10px 4px 4px;border:none;font-family:Fredoka;font-weight:700;cursor:pointer;background:${used[i] ? '#3A2F63' : '#94A3B8'};color:${used[i] ? '#8B83A8' : '#111827'};`;
      b.title = used[i] ? 'Liegt auf der Waage (klick zum Runternehmen)' : 'Auf die Waage legen';
      b.onclick = () => toggle(i);
      tray.appendChild(b);
    });
  }
  function update(){ document.getElementById('scRound').textContent = `${round}/${RUNDEN}`; document.getElementById('scScore').textContent = score; }
  // Eine einzige Animations-Schleife für das ganze Spiel (läuft bis das Spiel geschlossen wird)
  let alive = true;
  function anim(){ if(!alive) return; const want = Math.max(-0.3, Math.min(0.3, (target - right()) * 0.03)); tilt += (want - tilt) * 0.12; draw(); requestAnimationFrame(anim); }
  function draw(){
    ctx.fillStyle = '#1D1730'; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = 70, arm = 130;
    ctx.fillStyle = '#78716C'; ctx.fillRect(cx - 6, cy, 12, 140); ctx.fillRect(cx - 50, cy + 136, 100, 12);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
    ctx.fillStyle = '#A8A29E'; ctx.fillRect(-arm, -4, arm * 2, 8);
    ctx.restore();
    const lx = cx - Math.cos(tilt) * arm, ly = cy - Math.sin(tilt) * arm, rx = cx + Math.cos(tilt) * arm, ry = cy + Math.sin(tilt) * arm;
    const pan = (x, y) => { ctx.strokeStyle = '#D6D3D1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 40, y + 50); ctx.moveTo(x, y); ctx.lineTo(x + 40, y + 50); ctx.stroke(); ctx.fillStyle = '#E7E5E4'; ctx.beginPath(); ctx.ellipse(x, y + 52, 46, 8, 0, 0, 7); ctx.fill(); };
    pan(lx, ly); pan(rx, ry);
    ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('📦', lx, ly + 48);
    if(done){ ctx.fillStyle = '#FDE047'; ctx.font = 'bold 14px Fredoka, sans-serif'; ctx.fillText(target + ' kg', lx, ly + 10); }
    let off = 0; GEWICHTE.forEach((w, i) => { if(!used[i]) return; const h = 8 + Math.log2(w + 1) * 4; ctx.fillStyle = '#94A3B8'; ctx.fillRect(rx - 30 + (off % 3) * 22, ry + 48 - h - Math.floor(off / 3) * 18, 18, h); off++; });
    ctx.fillStyle = Math.abs(target - right()) === 0 ? '#C6FF3D' : '#F3EEFF'; ctx.font = 'bold 14px Fredoka, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText(right() + ' kg', rx, ry + 72);
  }
  window.__restartCurrent = start;
  start();
  anim();
  return () => { done = true; alive = false; };
}
