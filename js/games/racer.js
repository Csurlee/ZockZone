import { overMsg, mkHint, playerBody } from '../core.js';

const W = 360, H = 360, TW = 46, NLAPS = 3;

function makeOval(n) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    p.push([180 + Math.cos(a) * 145, 180 + Math.sin(a) * 112]);
  }
  return p;
}

const TRACKS = [
  {
    name: 'Oval', emoji: '🔵', diff: 'Leicht',
    pts: makeOval(20),
  },
  {
    name: 'Stadt', emoji: '🏙️', diff: 'Mittel',
    pts: [
      [72,72],[180,55],[288,72],
      [315,150],[315,210],
      [288,288],[180,308],
      [72,288],[45,210],[45,150],
    ],
  },
  {
    name: 'Schikane', emoji: '⚡', diff: 'Schwer',
    pts: [
      [72,72],[180,55],[288,72],
      [315,138],[232,180],[315,222],
      [288,288],[180,306],
      [72,288],[45,222],
      [128,180],[45,138],
    ],
  },
];

const COLORS = ['#C6FF3D','#FF6B4A','#60A5FA','#F59E0B'];
const NAMES  = ['Du','Rot','Blau','Gelb'];
const SKILL  = [0, 0.07, -0.04, 0.03]; // AI speed modifier per car

export function build() {
  // ---- DOM ----
  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const selectDiv = document.createElement('div');
  selectDiv.style.cssText = 'text-align:center;padding:8px 0 2px;';
  selectDiv.innerHTML = '<p style="font-family:Fredoka;font-size:17px;margin-bottom:10px;color:#F3F1FA">Strecke wählen</p>';
  TRACKS.forEach((tr, i) => {
    const b = document.createElement('button');
    b.style.cssText = 'margin:4px;padding:9px 16px;border-radius:12px;background:#241D3B;color:#F3F1FA;border:1px solid rgba(255,255,255,0.1);font-family:Fredoka;font-size:14px;cursor:pointer;transition:background .15s;';
    b.innerHTML = `${tr.emoji} ${tr.name} <span style="color:#9C93B8;font-size:12px;">(${tr.diff})</span>`;
    b.onmouseenter = () => b.style.background = '#7C3AED';
    b.onmouseleave = () => b.style.background = '#241D3B';
    b.onclick = () => startRace(i);
    selectDiv.appendChild(b);
  });

  const hudDiv = document.createElement('div');
  hudDiv.style.cssText = 'display:flex;gap:18px;justify-content:center;font-size:13px;font-weight:600;font-family:"JetBrains Mono",monospace;color:#9C93B8;padding:4px 0;';

  const overEl = overMsg(wrap, '', showSelect);
  playerBody.append(selectDiv, hudDiv, wrap, mkHint('Pfeiltasten / WASD lenken. Auf Handy: links/rechts tippen = Gas + Lenken.'));
  wrap.hidden = true;

  // ---- State ----
  let cars, keys = {}, touchDir = 0, loopId, phase = 'select';
  let raceTrack, finishOrder = [], lastTime = 0;

  function showSelect() {
    cancelAnimationFrame(loopId);
    wrap.hidden = true;
    selectDiv.hidden = false;
    overEl.classList.remove('show');
    hudDiv.innerHTML = '';
    finishOrder = [];
    phase = 'select';
  }

  function startRace(ti) {
    raceTrack = TRACKS[ti];
    selectDiv.hidden = true;
    wrap.hidden = false;
    overEl.classList.remove('show');
    phase = 'race';
    finishOrder = [];
    keys = {};
    touchDir = 0;

    const pts = raceTrack.pts;
    const a0 = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]);
    const perp = a0 + Math.PI / 2;

    cars = COLORS.map((color, i) => ({
      x: pts[0][0] + Math.cos(perp) * (i % 2 === 0 ? 1 : -1) * 14
                   - Math.cos(a0) * Math.floor(i / 2) * 26,
      y: pts[0][1] + Math.sin(perp) * (i % 2 === 0 ? 1 : -1) * 14
                   - Math.sin(a0) * Math.floor(i / 2) * 26,
      a: a0, spd: 0, color, isPlayer: i === 0,
      checkpoint: 1, lap: 0, finished: false, skill: SKILL[i],
    }));

    cancelAnimationFrame(loopId);
    lastTime = 0;
    loopId = requestAnimationFrame(loop);
  }

  // ---- Loop ----
  function loop(ts = 0) {
    const dt = Math.min((ts - lastTime) / 16.67, 3);
    lastTime = ts;
    update(dt);
    draw();
    if (phase === 'race') loopId = requestAnimationFrame(loop);
  }

  function update(dt) {
    const pts = raceTrack.pts, n = pts.length;

    cars.forEach(car => {
      if (car.finished) return;
      let accel = 0, steer = 0;

      if (car.isPlayer) {
        if (keys['ArrowUp']   || keys['w'] || keys['W']) accel =  1;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) accel = -0.5;
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) steer = -1;
        if (keys['ArrowRight']|| keys['d'] || keys['D']) steer =  1;
        if (touchDir !== 0) { accel = 1; steer = touchDir; }
      } else {
        const tgt = pts[car.checkpoint % n];
        const dx = tgt[0] - car.x, dy = tgt[1] - car.y;
        if (Math.hypot(dx, dy) < 30) {
          car.checkpoint++;
          if (car.checkpoint % n === 0) {
            car.lap++;
            if (car.lap >= NLAPS) { car.finished = true; finishCar(car); return; }
          }
        }
        const want = Math.atan2(dy, dx);
        let diff = want - car.a;
        while (diff >  Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        steer = Math.max(-1, Math.min(1, diff * 2.5));
        accel = Math.max(0.3, 0.95 - Math.abs(diff) * 0.45 + car.skill);
      }

      // Physics
      const maxSpd = car.isPlayer ? 3.8 : 3.4 + car.skill * 0.5;
      car.spd += (accel > 0 ? accel * 0.18 : accel * 0.12) * dt;
      car.spd = Math.max(-1.2, Math.min(maxSpd, car.spd));
      car.spd *= Math.pow(0.988, dt);
      car.a   += steer * 0.048 * Math.min(Math.abs(car.spd), 1) * Math.sign(car.spd) * dt;
      car.x   += Math.cos(car.a) * car.spd * dt;
      car.y   += Math.sin(car.a) * car.spd * dt;

      // Wall bounce
      if (car.x <  8) { car.x =  8; car.spd *= -0.4; }
      if (car.x > W-8){ car.x = W-8; car.spd *= -0.4; }
      if (car.y <  8) { car.y =  8; car.spd *= -0.4; }
      if (car.y > H-8){ car.y = H-8; car.spd *= -0.4; }

      // Player checkpoint
      if (car.isPlayer) {
        const cp = pts[car.checkpoint % n];
        if (Math.hypot(car.x - cp[0], car.y - cp[1]) < 30) {
          car.checkpoint++;
          if (car.checkpoint % n === 0) {
            car.lap++;
            if (car.lap >= NLAPS) { car.finished = true; finishCar(car); }
          }
        }
      }
    });

    // HUD
    const p = cars[0];
    const prog = c => c.lap * raceTrack.pts.length + (c.checkpoint % raceTrack.pts.length);
    const ahead = cars.filter(c => !c.isPlayer && !c.finished && prog(c) > prog(p)).length;
    const finBefore = finishOrder.filter(c => !c.isPlayer).length;
    const pos = p.finished ? (finishOrder.indexOf(p) + 1) : finBefore + ahead + 1;
    hudDiv.innerHTML = `<span>Runde <b style="color:#C6FF3D">${Math.min(p.lap+1,NLAPS)}/${NLAPS}</b></span>`
      + `<span>Pos <b style="color:#C6FF3D">${pos}/${cars.length}</b></span>`
      + `<span><b style="color:#C6FF3D">${Math.abs(p.spd * 58).toFixed(0)}</b> km/h</span>`;
  }

  function finishCar(car) {
    finishOrder.push(car);
    if (!car.isPlayer) return;
    const rank = finishOrder.indexOf(car) + 1;
    const msgs = ['Du gewinnst! 🏆', '2. Platz — Fast!', '3. Platz — Gut!', 'Letzter — Nochmal!'];
    overEl.querySelector('div').textContent = msgs[rank - 1] || msgs[3];
    overEl.classList.add('show');
    phase = 'done';
    cancelAnimationFrame(loopId);
  }

  // ---- Draw ----
  function draw() {
    ctx.fillStyle = '#0f1824';
    ctx.fillRect(0, 0, W, H);
    // Grass texture dots
    ctx.fillStyle = 'rgba(30,60,30,0.6)';
    for (let gx = 10; gx < W; gx += 18)
      for (let gy = 10; gy < H; gy += 18)
        ctx.fillRect(gx, gy, 2, 2);

    drawTrack();
    [...cars].sort((a, b) => a.y - b.y).forEach(drawCar);
  }

  function tracePath() {
    const pts = raceTrack.pts, n = pts.length;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  function drawTrack() {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // Outer kerb
    ctx.strokeStyle = '#cc3333'; ctx.lineWidth = TW + 14;
    tracePath(); ctx.stroke();
    // White kerb stripe
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = TW + 10;
    tracePath(); ctx.stroke();
    // Outer border
    ctx.strokeStyle = '#4a4a5a'; ctx.lineWidth = TW + 6;
    tracePath(); ctx.stroke();
    // Tarmac
    ctx.strokeStyle = '#2e2e3e'; ctx.lineWidth = TW;
    tracePath(); ctx.stroke();
    // Inner edge highlight
    ctx.strokeStyle = '#3a3a4a'; ctx.lineWidth = TW - 10;
    tracePath(); ctx.stroke();
    // Tarmac center
    ctx.strokeStyle = '#2e2e3e'; ctx.lineWidth = TW - 14;
    tracePath(); ctx.stroke();
    // Center dashes
    ctx.setLineDash([14, 10]); ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
    tracePath(); ctx.stroke();
    ctx.setLineDash([]);

    // Finish line
    const pts = raceTrack.pts;
    const fa = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]) + Math.PI / 2;
    const cos = Math.cos(fa), sin = Math.sin(fa);
    for (let s = -3; s < 3; s++) {
      ctx.fillStyle = s % 2 === 0 ? '#fff' : '#333';
      ctx.save();
      ctx.translate(pts[0][0] + cos * (s * 7 + 3.5), pts[0][1] + sin * (s * 7 + 3.5));
      ctx.rotate(fa); ctx.fillRect(-5, -4, 10, 8);
      ctx.restore();
    }
  }

  function drawCar(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.a);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(1, 2, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.fillStyle = car.color;
    ctx.beginPath(); ctx.roundRect(-10, -6, 20, 12, 3); ctx.fill();
    // Windshield
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, -4, 7, 8);
    // Wheel hints
    ctx.fillStyle = '#111';
    [[-7,-7],[-7,5],[5,-7],[5,5]].forEach(([wx,wy]) => ctx.fillRect(wx, wy, 4, 4));
    // Player marker (white dot above)
    if (car.isPlayer) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, -11, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ---- Controls ----
  const onDown = e => {
    keys[e.key] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  };
  const onUp = e => { keys[e.key] = false; };
  document.addEventListener('keydown', onDown);
  document.addEventListener('keyup', onUp);

  canvas.addEventListener('touchstart', e => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches[0].clientX - rect.left) * (W / rect.width);
    touchDir = x < W / 2 ? -1 : 1;
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches[0].clientX - rect.left) * (W / rect.width);
    touchDir = x < W / 2 ? -1 : 1;
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', () => { touchDir = 0; });

  window.__restartCurrent = showSelect;

  return () => {
    cancelAnimationFrame(loopId);
    document.removeEventListener('keydown', onDown);
    document.removeEventListener('keyup', onUp);
  };
}
