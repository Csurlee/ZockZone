import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

// =====================================================================
//  PANZER-DUELL  —  ein Spiel von Luki 🎮
//  Zwei Spieler schießen abwechselnd. Stell Winkel und Kraft ein,
//  denk an den Wind und triff den anderen Panzer!
//  Gibt es am selben Gerät (build) und online (js/online-tanks.js).
// =====================================================================

// ---------- 🛠️ LUKI-ECKE: Hier darfst du alles verändern! ----------
const SCHWERKRAFT   = 0.15;   // Wie stark fällt die Kugel nach unten? (0.05 = Mond, 0.3 = Jupiter)
const MAX_LEBEN     = 100;    // Wie viel Leben hat jeder Panzer?
const EXPLOSION     = 26;     // Wie groß ist das Loch, das eine Kugel macht?
const MAX_SCHADEN   = 45;     // Schaden bei einem Volltreffer
const MAX_WIND      = 3;      // Wie stark kann der Wind wehen? (0 = kein Wind)
const FARBE_1       = '#C6FF3D';  // Farbe von Spieler 1
const FARBE_2       = '#FF6B4A';  // Farbe von Spieler 2
const FARBE_BODEN   = '#7C5A3A';  // Farbe vom Boden
// ---------------------------------------------------------------------

export const W = 480, H = 300;
const COLORS = [FARBE_1, FARBE_2];

// =====================================================================
//  DER MOTOR: Physik, Malen und Spielregeln.
//  hooks = {
//    names:        ['Spieler 1', 'Spieler 2'],
//    canControl:   (turn) => darf dieser Computer gerade zielen/schießen?
//    onAim:        (angle, power)  Rohr wurde bewegt
//    onFire:       (angle, power)  es wurde geschossen
//    onTurnEnd:    (snapshot)      Schuss ist fertig, neuer Stand
//    onHud:        (info)          Leben/Wind haben sich geändert
//    onGameOver:   (text)          jemand hat gewonnen
//    onRestart:    ()              nach Spielende wurde "Feuer" gedrückt
//  }
// =====================================================================
export function createTanks(canvas, hooks){
  const ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
  let ground, tanks, turn, shot, wind, booms, loopId, gameOver, winnerText, winner, trails;
  let remoteShot = false;   // fliegt gerade eine Kugel vom anderen Computer?
  let pending = null;       // Spielstand, der nach dem Flug geladen wird
  let stopped = false;

  // ---------- Neues Spiel ----------
  function newGame(starter){
    makeGround();
    tanks = [
      { x: 60,     angle: 45,  power: 60, hp: MAX_LEBEN },
      { x: W - 60, angle: 135, power: 60, hp: MAX_LEBEN },
    ];
    tanks.forEach(t => flattenAt(t.x));
    turn = starter; shot = null; booms = []; trails = [[], []]; gameOver = false; winnerText = ''; winner = -1;
    newWind();
    hud();
    return snapshot();
  }

  // Hügel-Landschaft aus Wellen bauen
  function makeGround(){
    ground = new Array(W);
    const a = Math.random() * 6, b = Math.random() * 6;
    for(let x = 0; x < W; x++){
      ground[x] = H - 70
        - Math.sin(x / 70 + a) * 30
        - Math.sin(x / 31 + b) * 12
        - Math.sin(x / W * Math.PI) * 50;   // in der Mitte ein großer Berg
    }
  }
  // Damit die Panzer gerade stehen, wird der Boden unter ihnen flach gemacht
  function flattenAt(x){
    const y = ground[Math.round(x)];
    for(let i = -12; i <= 12; i++){ const gx = Math.round(x) + i; if(gx >= 0 && gx < W) ground[gx] = y; }
  }
  function newWind(){ wind = Math.round((Math.random() * 2 - 1) * MAX_WIND * 10) / 10; }
  function tankY(t){ return ground[Math.round(t.x)]; }

  function hud(){
    hooks.onHud?.({ hp: tanks.map(t => Math.max(0, t.hp)), wind, turn, gameOver, busy: !!shot });
  }

  // ---------- Spielstand speichern und laden (für online) ----------
  function snapshot(){
    return {
      ground: ground.map(v => Math.round(v * 10) / 10),
      tanks: tanks.map(t => ({ ...t })),
      turn, wind, gameOver, winnerText, winner,
    };
  }
  function load(s){
    if(shot){ pending = s; return; }  // erst fertig fliegen lassen
    ground = s.ground.slice();
    tanks = s.tanks.map(t => ({ ...t }));
    turn = s.turn; wind = s.wind; gameOver = s.gameOver; winnerText = s.winnerText; winner = s.winner;
    booms = booms || []; trails = trails || [[], []];
    hud();
    if(gameOver) hooks.onGameOver?.(winnerText);
  }

  // ---------- Schießen ----------
  function launch(isRemote){
    const t = tanks[turn];
    const rad = t.angle * Math.PI / 180;
    const speed = t.power * 0.13;
    shot = {
      x: t.x + Math.cos(rad) * 16,
      y: tankY(t) - 10 - Math.sin(rad) * 16,
      vx: Math.cos(rad) * speed,
      vy: -Math.sin(rad) * speed,
    };
    remoteShot = isRemote;
    trails[turn] = [];
    sfx.whoosh();
    hud();
  }
  function fire(){
    if(stopped || shot) return;
    if(gameOver){ hooks.onRestart?.(); return; }
    if(!hooks.canControl(turn)) return;
    const t = tanks[turn];
    hooks.onFire?.(t.angle, t.power);
    launch(false);
  }
  function remoteFire(angle, power){
    if(shot || gameOver) return;
    tanks[turn].angle = angle; tanks[turn].power = power;
    launch(true);
  }

  function explode(x, y){
    sfx.explosion();
    booms.push({ x, y, r: 0 });
    // Loch in den Boden machen
    for(let gx = Math.floor(x - EXPLOSION); gx <= x + EXPLOSION; gx++){
      if(gx < 0 || gx >= W) continue;
      const dy = Math.sqrt(Math.max(0, EXPLOSION * EXPLOSION - (gx - x) ** 2));
      if(ground[gx] < y + dy) ground[gx] = Math.min(H, Math.max(ground[gx], y + dy));
    }
    // Schaden: je näher an der Explosion, desto mehr
    tanks.forEach(t => {
      const d = Math.hypot(t.x - x, tankY(t) - 6 - y);
      if(d < EXPLOSION + 10){
        t.hp -= Math.round(MAX_SCHADEN * (1 - d / (EXPLOSION + 10)));
      }
    });
    hud();
  }

  function endTurn(){
    shot = null;
    // Schuss vom anderen Computer: nicht selbst entscheiden, sondern auf seinen Stand warten
    if(remoteShot){
      remoteShot = false;
      if(pending){ const p = pending; pending = null; load(p); }
      return;
    }
    const loser = tanks.findIndex(t => t.hp <= 0);
    if(loser >= 0){
      gameOver = true;
      winner = tanks.every(t => t.hp <= 0) ? -1 : 1 - loser;   // -1 = unentschieden
      winnerText = tanks.every(t => t.hp <= 0)
        ? 'Beide kaputt! Unentschieden 💥'
        : hooks.names[1 - loser] + ' gewinnt! 🏆';
      sfx.win();
      hud();
      hooks.onTurnEnd?.(snapshot());
      setTimeout(() => hooks.onGameOver?.(winnerText), 600);
      return;
    }
    turn = 1 - turn;
    newWind();
    hud();
    sfx.blip();
    hooks.onTurnEnd?.(snapshot());
  }

  // ---------- Spiel-Schleife: läuft 60 Mal pro Sekunde ----------
  function loop(){
    if(stopped) return;
    if(!ground){ loopId = requestAnimationFrame(loop); return; }   // noch kein Spielstand da
    if(shot){
      shot.vx += wind * 0.01;          // Wind schiebt die Kugel
      shot.vy += SCHWERKRAFT;          // Schwerkraft zieht sie nach unten
      shot.x += shot.vx; shot.y += shot.vy;
      trails[turn].push([shot.x, shot.y]);
      const gx = Math.round(shot.x);
      const hitTank = tanks.some(t => Math.abs(t.x - shot.x) < 12 && shot.y > tankY(t) - 14 && shot.y < tankY(t) + 2);
      if(shot.x < 0 || shot.x >= W || shot.y > H){ sfx.miss(); endTurn(); }
      else if(hitTank || (shot.y >= ground[gx])){ explode(shot.x, shot.y); endTurn(); }
    }
    booms.forEach(b => b.r += 2);
    booms = booms.filter(b => b.r < EXPLOSION + 8);
    draw();
    loopId = requestAnimationFrame(loop);
  }

  // ---------- Malen ----------
  function draw(){
    // Himmel
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1E1B4B'); sky.addColorStop(1, '#4C1D95');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // Boden
    ctx.fillStyle = FARBE_BODEN;
    ctx.beginPath(); ctx.moveTo(0, H);
    for(let x = 0; x < W; x++) ctx.lineTo(x, ground[x]);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4ADE80'; ctx.lineWidth = 3;   // Gras oben drauf
    ctx.beginPath(); for(let x = 0; x < W; x++) ctx.lineTo(x, ground[x]); ctx.stroke();

    // Letzte Flugbahn des Spielers, der dran ist (als Hilfe)
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    trails[turn].forEach(([x, y], i) => { if(i % 4 === 0) ctx.fillRect(x - 1, y - 1, 2, 2); });

    // Panzer
    tanks.forEach((t, i) => {
      const y = tankY(t);
      const color = COLORS[i];
      if(t.hp <= 0) ctx.globalAlpha = .35;
      const rad = t.angle * Math.PI / 180;
      ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(t.x, y - 10); ctx.lineTo(t.x + Math.cos(rad) * 16, y - 10 - Math.sin(rad) * 16); ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(t.x, y - 8, 7, Math.PI, 0); ctx.fill();   // Kuppel
      ctx.fillRect(t.x - 12, y - 8, 24, 7);                            // Körper
      ctx.fillStyle = '#1F2937'; ctx.fillRect(t.x - 13, y - 2, 26, 3); // Ketten
      ctx.globalAlpha = 1;
      // Lebensbalken
      ctx.fillStyle = '#00000088'; ctx.fillRect(t.x - 15, y - 28, 30, 4);
      ctx.fillStyle = t.hp > MAX_LEBEN * .3 ? '#4ADE80' : '#EF4444';
      ctx.fillRect(t.x - 15, y - 28, 30 * Math.max(0, t.hp) / MAX_LEBEN, 4);
      // Pfeil über dem Panzer, der dran ist
      if(i === turn && !shot && !gameOver){
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(t.x - 6, y - 40); ctx.lineTo(t.x + 6, y - 40); ctx.lineTo(t.x, y - 33); ctx.fill();
      }
    });

    // Kugel
    if(shot){ ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(shot.x, shot.y, 3, 0, Math.PI * 2); ctx.fill(); }

    // Explosionen
    booms.forEach(b => {
      ctx.fillStyle = `rgba(255,${140 + b.r * 3},60,${1 - b.r / (EXPLOSION + 8)})`;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    });

    // Info oben: wer ist dran, Winkel, Kraft
    const t = tanks[turn];
    ctx.fillStyle = COLORS[turn]; ctx.font = 'bold 15px Fredoka, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const shownAngle = turn === 0 ? t.angle : 180 - t.angle;   // beide sehen "45°" als Start
    if(!gameOver) ctx.fillText(`${hooks.names[turn]} ist dran   Winkel: ${shownAngle}°   Kraft: ${t.power}`, 10, 8);
    // Wind-Pfeil
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
    ctx.fillText('Wind ' + (wind === 0 ? '–' : (wind > 0 ? '→'.repeat(Math.ceil(Math.abs(wind))) : '←'.repeat(Math.ceil(Math.abs(wind))))), W - 10, 8);
  }

  // ---------- Zielen ----------
  function change(what, delta){
    if(stopped || shot || gameOver || !hooks.canControl(turn)) return;
    const t = tanks[turn];
    // Für Spieler 2 ist der Winkel gespiegelt, damit es sich gleich anfühlt
    if(what === 'angle') t.angle = Math.max(5, Math.min(175, t.angle + (turn === 0 ? delta : -delta)));
    if(what === 'power') t.power = Math.max(10, Math.min(100, t.power + delta));
    sfx.tick?.();
    hooks.onAim?.(t.angle, t.power);
  }
  function remoteAim(angle, power){
    if(shot || gameOver) return;
    tanks[turn].angle = angle; tanks[turn].power = power;
  }

  function stop(){ stopped = true; cancelAnimationFrame(loopId); }
  function begin(){ loop(); }

  return { newGame, load, snapshot, fire, remoteFire, change, remoteAim, begin, stop,
           get turn(){ return turn; }, get gameOver(){ return gameOver; }, get busy(){ return !!shot; } };
}

// =====================================================================
//  STEUERUNG: Tastatur + Knöpfe (am selben Gerät und online gleich)
// =====================================================================
export function createControls(api, canvas){
  const pad = document.createElement('div');
  pad.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px;';
  const btn = (label, bg) => { const b = mkButton(label, bg || 'var(--card)', bg ? '#14101F' : '#fff'); b.style.padding = '10px 14px'; b.style.touchAction = 'manipulation'; return b; };
  const bAngL = btn('↺ Winkel'), bAngR = btn('Winkel ↻'), bPowD = btn('− Kraft'), bPowU = btn('Kraft +'), bFire = btn('🔥 FEUER!', '#FF6B4A');
  pad.append(bAngL, bAngR, bPowD, bPowU, bFire);

  function onKey(e){
    if(!canvas.isConnected || canvas.offsetParent === null) return;   // nur wenn das Spiel sichtbar ist
    if(e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;     // nicht beim Chatten
    const k = e.key;
    if(k === 'ArrowLeft')  { api.change('angle', 1);  e.preventDefault(); }
    if(k === 'ArrowRight') { api.change('angle', -1); e.preventDefault(); }
    if(k === 'ArrowUp')    { api.change('power', 1);  e.preventDefault(); }
    if(k === 'ArrowDown')  { api.change('power', -1); e.preventDefault(); }
    if(k === ' ' || k === 'Enter') { api.fire(); e.preventDefault(); }
  }
  window.addEventListener('keydown', onKey);

  // Knöpfe: gedrückt halten = schneller verstellen
  let holdTimer = null;
  const stopHold = () => { clearInterval(holdTimer); holdTimer = null; };
  function holdable(el, fn){
    el.addEventListener('pointerdown', e => { e.preventDefault(); fn(); stopHold(); holdTimer = setInterval(fn, 70); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, stopHold));
  }
  holdable(bAngL, () => api.change('angle', 1));
  holdable(bAngR, () => api.change('angle', -1));
  holdable(bPowD, () => api.change('power', -1));
  holdable(bPowU, () => api.change('power', 1));
  bFire.addEventListener('click', () => api.fire());

  return { el: pad, stop(){ stopHold(); window.removeEventListener('keydown', onKey); pad.remove(); } };
}

// =====================================================================
//  AM SELBEN GERÄT: beide Spieler am gleichen Computer
// =====================================================================
export function build(){
  const scoreEl = hud(['Spieler 1','tnkP1'], ['Spieler 2','tnkP2'], ['Wind','tnkWind']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas');
  canvas.style.touchAction = 'none';
  wrap.appendChild(canvas);
  const over = overMsg(wrap, '', start);

  let starter = 1;   // wer beginnt, wechselt jede Runde (fair!)
  const game = createTanks(canvas, {
    names: ['Spieler 1', 'Spieler 2'],
    canControl: () => true,
    onHud: ({ hp, wind }) => {
      document.getElementById('tnkP1').textContent = hp[0];
      document.getElementById('tnkP2').textContent = hp[1];
      document.getElementById('tnkWind').textContent = wind === 0 ? '0' : (wind > 0 ? '→ ' : '← ') + Math.abs(wind);
    },
    onGameOver: text => { over.querySelector('div').textContent = text; over.classList.add('show'); },
    onRestart: () => start(),
  });
  const controls = createControls(game, canvas);

  playerBody.append(scoreEl, wrap, controls.el, mkHint('2 Spieler abwechselnd. ← → Winkel, ↑ ↓ Kraft, Leertaste = Feuer. Achte auf den Wind!'));

  function start(){
    starter = 1 - starter;
    over.classList.remove('show');
    game.newGame(starter);
  }

  window.__restartCurrent = start;
  start();
  game.begin();
  return () => { game.stop(); controls.stop(); };
}
