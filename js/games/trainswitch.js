import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🚂 WEICHENSTELLER – jeder Zug hat eine Farbe. Stell die Weichen so, dass er zum Bahnhof
// mit derselben Farbe fährt! Klick auf eine Weiche, um sie umzustellen.
// ---------- 🛠️ LUKI-ECKE ----------
const ZUEGE     = 20;    // So viele Züge pro Runde
const TEMPO     = 1.1;   // Wie schnell fahren die Züge?
const ABSTAND   = 150;   // Wie viele Bilder zwischen zwei Zügen?
// ------------------------------------
const W = 400, H = 320;
// Gleisnetz: Knoten mit Position. Weichen haben zwei Ausgänge, die man umschaltet.
// Start (oben links) -> Weiche A -> (B oder C) -> 4 Bahnhöfe
const NODES = {
  start: { x: 20,  y: 40,  next: 'A' },
  A:     { x: 120, y: 40,  sw: ['B', 'C'] },
  B:     { x: 200, y: 110, sw: ['s0', 's1'] },
  C:     { x: 200, y: 230, sw: ['s2', 's3'] },
  s0:    { x: 360, y: 50,  station: 0 },
  s1:    { x: 360, y: 140, station: 1 },
  s2:    { x: 360, y: 210, station: 2 },
  s3:    { x: 360, y: 290, station: 3 },
};
const COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#FACC15'];

export function build(){
  const scoreEl = hud([L('Richtig', 'Correct'),'tsRight'], [L('Falsch', 'Wrong'),'tsWrong'], [L('Züge', 'Moves'),'tsLeft']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.cursor = 'pointer';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint(L('Klick auf eine Weiche (Kreis), um sie umzustellen. Der Pfeil zeigt, wohin der nächste Zug fährt. Tasten 1–3 gehen auch!', 'Click a switch (circle) to change it. The arrow shows where the next train goes. Keys 1–3 work too!')));
  addLeaderboardUI('trainswitch', 'Weichensteller');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let state, trains, spawned, right, wrong, spawnT, loopId, running, flashes;
  const SWITCHES = ['A', 'B', 'C'];

  function start(){
    state = { A: 0, B: 0, C: 0 }; trains = []; spawned = 0; right = 0; wrong = 0; spawnT = 30; flashes = []; running = true;
    over.classList.remove('show'); updateHud();
    cancelAnimationFrame(loopId); loop();
  }
  function updateHud(){
    document.getElementById('tsRight').textContent = right;
    document.getElementById('tsWrong').textContent = wrong;
    document.getElementById('tsLeft').textContent = `${spawned}/${ZUEGE}`;
  }
  const nextOf = id => NODES[id].next || (NODES[id].sw ? NODES[id].sw[state[id]] : null);
  function loop(){
    if(!running) return;
    if(spawned < ZUEGE && --spawnT <= 0){
      trains.push({ from: 'start', to: 'A', t: 0, color: Math.floor(Math.random() * 4) });
      spawned++; spawnT = Math.max(70, ABSTAND - spawned * 3); updateHud();
    }
    for(const tr of trains){
      const a = NODES[tr.from], b = NODES[tr.to];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      tr.t += (TEMPO + spawned * 0.02) / len;
      if(tr.t >= 1){
        if(b.station !== undefined){
          tr.done = true;
          const ok = b.station === tr.color;
          ok ? (right++, sfx.coin()) : (wrong++, sfx.wrong?.());
          flashes.push({ x: b.x, y: b.y, ok, t: 0 });
          updateHud();
        } else { tr.from = tr.to; tr.to = nextOf(tr.to); tr.t = 0; }   // an der Weiche: aktuelle Stellung nehmen
      }
    }
    trains = trains.filter(t => !t.done);
    flashes.forEach(f => f.t++); flashes = flashes.filter(f => f.t < 40);
    draw();
    if(spawned >= ZUEGE && trains.length === 0){
      running = false; (right >= ZUEGE * 0.8 ? sfx.win : sfx.lose)();
      over.querySelector('div').textContent = `${right} von ${ZUEGE} Zügen richtig angekommen! ${right === ZUEGE ? '🏆' : '🚂'}`;
      over.classList.add('show'); window.zzSaveHighScore?.('trainswitch', 'Weichensteller', right); return;
    }
    loopId = requestAnimationFrame(loop);
  }
  function draw(){
    ctx.fillStyle = '#3F6212'; ctx.fillRect(0, 0, W, H);
    // Gleise
    const rail = (a, b, active) => {
      ctx.strokeStyle = active ? '#78716C' : '#57534E'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = active ? '#E7E5E4' : '#A8A29E'; ctx.lineWidth = 2; ctx.setLineDash(active ? [] : [6, 6]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    };
    for(const [id, n] of Object.entries(NODES)){
      if(n.next) rail(n, NODES[n.next], true);
      if(n.sw) n.sw.forEach((k, i) => rail(n, NODES[k], state[id] === i));
    }
    // Bahnhöfe
    for(const n of Object.values(NODES)) if(n.station !== undefined){
      ctx.fillStyle = COLORS[n.station]; ctx.fillRect(n.x - 6, n.y - 16, 34, 32);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(n.x - 6, n.y + 10, 34, 6);
      ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🏠', n.x + 11, n.y - 2);
    }
    // Weichen
    SWITCHES.forEach((id, k) => {
      const n = NODES[id], to = NODES[n.sw[state[id]]];
      ctx.fillStyle = '#1F2937'; ctx.beginPath(); ctx.arc(n.x, n.y, 15, 0, 7); ctx.fill();
      ctx.strokeStyle = '#C6FF3D'; ctx.lineWidth = 3; ctx.stroke();
      const a = Math.atan2(to.y - n.y, to.x - n.x);
      ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(a);
      ctx.fillStyle = '#C6FF3D'; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#E5E7EB'; ctx.font = 'bold 11px Fredoka, sans-serif'; ctx.fillText(k + 1, n.x, n.y - 24);
    });
    // Züge
    for(const tr of trains){
      const a = NODES[tr.from], b = NODES[tr.to];
      const x = a.x + (b.x - a.x) * tr.t, y = a.y + (b.y - a.y) * tr.t, ang = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = COLORS[tr.color]; ctx.fillRect(-14, -8, 28, 16);
      ctx.fillStyle = '#111827'; ctx.fillRect(4, -6, 8, 12);
      ctx.fillStyle = '#FDE68A'; ctx.beginPath(); ctx.arc(14, 0, 3, 0, 7); ctx.fill();
      ctx.restore();
    }
    for(const f of flashes){ ctx.globalAlpha = 1 - f.t / 40; ctx.font = 'bold 22px Fredoka, sans-serif'; ctx.fillStyle = f.ok ? '#C6FF3D' : '#EF4444'; ctx.fillText(f.ok ? '✓' : '✗', f.x - 22, f.y - f.t * 0.5); }
    ctx.globalAlpha = 1;
  }
  function toggle(id){ if(!running) return; state[id] = 1 - state[id]; sfx.click?.(); draw(); }
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (canvas.width / r.width), y = (e.clientY - r.top) * (canvas.height / r.height);
    let best = null, bd = 32 * 32;
    for(const id of SWITCHES){ const n = NODES[id], d = (n.x - x) ** 2 + (n.y - y) ** 2; if(d < bd){ bd = d; best = id; } }
    if(best) toggle(best);
  });
  const kd = e => { const n = parseInt(e.key, 10); if(n >= 1 && n <= 3) toggle(SWITCHES[n - 1]); };
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); document.removeEventListener('keydown', kd); };
}
