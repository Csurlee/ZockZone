import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, mkButton, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🏰 TURM-VERTEIDIGUNG – bau Türme neben den Weg, damit kein Monster deine Burg erreicht!
// ---------- 🛠️ LUKI-ECKE ----------
const START_GOLD  = 120;   // Gold am Anfang
const BURG_LEBEN  = 10;    // So viele Monster darf die Burg aushalten
const TURM_PREIS  = { pfeil: 50, frost: 70, kanone: 100 };
// ------------------------------------
const W = 400, H = 300, C = 25;   // Raster 16 × 12 Felder
const PATH = [[0, 2], [5, 2], [5, 8], [10, 8], [10, 3], [15, 3]];   // Wegpunkte (in Feldern)
const TOWERS = {
  pfeil:  { name: '🏹 Pfeil',  color: '#C6FF3D', range: 70,  rate: 28, dmg: 1.2, slow: 0 },
  frost:  { name: '❄️ Frost',  color: '#7DD3FC', range: 60,  rate: 40, dmg: 0.4, slow: 0.5 },
  kanone: { name: '💣 Kanone', color: '#FB923C', range: 85,  rate: 70, dmg: 4,   slow: 0, splash: 35 },
};

export function build(){
  const scoreEl = hud([L('Welle', 'Wave'),'tdWave'], [L('Gold', 'Gold'),'tdGold'], [L('Burg', 'Castle'),'tdLives']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.cursor = 'pointer';
  wrap.appendChild(canvas);
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; justify-content:center;';
  const typeBtns = Object.entries(TOWERS).map(([k, t]) => { const b = mkButton(`${t.name} ${TURM_PREIS[k]}🪙`, 'var(--card)', '#fff'); b.onclick = () => { sel = k; render(); }; bar.appendChild(b); return [k, b]; });
  const waveBtn = mkButton('▶ Nächste Welle', '#C6FF3D'); bar.appendChild(waveBtn);
  playerBody.append(scoreEl, wrap, bar, mkHint(L('Turm-Art wählen, dann neben den Weg klicken. Frost macht Monster langsam, die Kanone trifft mehrere. Starte die Welle, wenn du bereit bist!', 'Pick a tower type, then click next to the path. Frost slows monsters, the cannon hits several. Start the wave when you are ready!')));
  addLeaderboardUI('towerdefense', 'Turm-Verteidigung');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let towers, enemies, shots, gold, lives, wave, spawnLeft, spawnT, sel, pathCells, pathPts, loopId, running, waveActive, hoverCell;

  // Weg in Pixel-Punkte und belegte Felder umrechnen
  pathPts = PATH.map(([x, y]) => [x * C + C / 2, y * C + C / 2]);
  pathCells = new Set();
  for(let i = 0; i < PATH.length - 1; i++){
    const [x1, y1] = PATH[i], [x2, y2] = PATH[i + 1];
    for(let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for(let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) pathCells.add(x + ',' + y);
  }
  const pathLen = pathPts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pathPts[i][0], p[1] - pathPts[i][1]), 0);
  function posAt(d){
    for(let i = 0; i < pathPts.length - 1; i++){
      const [x1, y1] = pathPts[i], [x2, y2] = pathPts[i + 1], l = Math.hypot(x2 - x1, y2 - y1);
      if(d <= l) return [x1 + (x2 - x1) * d / l, y1 + (y2 - y1) * d / l];
      d -= l;
    }
    return pathPts[pathPts.length - 1];
  }

  function start(){
    towers = []; enemies = []; shots = []; gold = START_GOLD; lives = BURG_LEBEN; wave = 0; spawnLeft = 0; sel = 'pfeil'; running = true; waveActive = false;
    over.classList.remove('show'); render();
    cancelAnimationFrame(loopId); loop();
  }
  function nextWave(){
    if(waveActive || !running) return;
    wave++; spawnLeft = 5 + wave * 2; spawnT = 0; waveActive = true; sfx.select?.(); render();
  }
  waveBtn.onclick = nextWave;
  function render(){
    document.getElementById('tdWave').textContent = wave;
    document.getElementById('tdGold').textContent = gold + ' 🪙';
    document.getElementById('tdLives').textContent = '❤️ ' + lives;
    typeBtns.forEach(([k, b]) => { b.style.outline = sel === k ? '3px solid #C6FF3D' : 'none'; b.style.opacity = gold >= TURM_PREIS[k] ? '1' : '.5'; });
    waveBtn.style.opacity = waveActive ? '.5' : '1';
    waveBtn.textContent = waveActive ? `Welle ${wave} läuft…` : `▶ Welle ${wave + 1} starten`;
  }
  function loop(){
    if(!running) return;
    if(waveActive && spawnLeft > 0 && --spawnT <= 0){
      const boss = spawnLeft === 1 && wave % 3 === 0;
      const hp = (2 + wave * 1.3) * (boss ? 6 : 1);
      enemies.push({ d: 0, hp, max: hp, speed: (boss ? 0.5 : 0.8 + Math.random() * 0.3) + wave * 0.03, slow: 0, boss, reward: boss ? 40 : 6 + Math.floor(wave / 2) });
      spawnLeft--; spawnT = 40;
    }
    for(const e of enemies){
      e.d += e.speed * (e.slow > 0 ? 0.5 : 1); if(e.slow > 0) e.slow--;
      if(e.d >= pathLen){ e.dead = true; lives -= e.boss ? 3 : 1; sfx.fail?.(); }
    }
    for(const t of towers){
      const T = TOWERS[t.type];
      if(--t.cd > 0) continue;
      let target = null, best = -1;
      for(const e of enemies){ if(e.dead) continue; const [x, y] = posAt(e.d); if(Math.hypot(x - t.x, y - t.y) <= T.range && e.d > best){ best = e.d; target = e; } }
      if(target){ t.cd = T.rate; const [x, y] = posAt(target.d); shots.push({ x: t.x, y: t.y, tx: x, ty: y, t: 0, color: T.color, target, type: t.type }); }
    }
    for(const s of shots){
      s.t += 0.15;
      if(s.t >= 1 && !s.hit){
        s.hit = true; const T = TOWERS[s.type];
        const hitOne = e => { e.hp -= T.dmg; if(T.slow) e.slow = 60; };
        if(T.splash){ for(const e of enemies){ const [x, y] = posAt(e.d); if(Math.hypot(x - s.tx, y - s.ty) < T.splash) hitOne(e); } sfx.explosion?.(); }
        else if(!s.target.dead) hitOne(s.target);
      }
    }
    shots = shots.filter(s => !s.hit);
    for(const e of enemies) if(!e.dead && e.hp <= 0){ e.dead = true; gold += e.reward; sfx.pop?.(); }
    enemies = enemies.filter(e => !e.dead);
    if(waveActive && spawnLeft === 0 && enemies.length === 0){ waveActive = false; gold += 20 + wave * 5; sfx.coin(); }
    render(); draw();
    if(lives <= 0){ running = false; sfx.lose(); over.querySelector('div').textContent = `Die Burg ist gefallen! Du hast ${wave - 1} Wellen geschafft.`; over.classList.add('show'); window.zzSaveHighScore?.('towerdefense', 'Turm-Verteidigung', wave - 1); return; }
    loopId = requestAnimationFrame(loop);
  }
  function draw(){
    ctx.fillStyle = '#3F6212'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.06)'; for(let x = 0; x < 16; x++) for(let y = 0; y < 12; y++) if((x + y) % 2) ctx.fillRect(x * C, y * C, C, C);
    ctx.strokeStyle = '#D6B98C'; ctx.lineWidth = C - 4; ctx.lineJoin = 'round';
    ctx.beginPath(); pathPts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x - C, y)); ctx.stroke();
    // Burg
    const [bx, by] = pathPts[pathPts.length - 1];
    ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🏰', bx, by - 4);
    if(hoverCell && running){
      const [hx, hy] = hoverCell, ok = canBuild(hx, hy);
      ctx.fillStyle = ok ? 'rgba(198,255,61,.3)' : 'rgba(239,68,68,.3)'; ctx.fillRect(hx * C, hy * C, C, C);
      if(ok){ ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hx * C + C / 2, hy * C + C / 2, TOWERS[sel].range, 0, 7); ctx.stroke(); }
    }
    for(const t of towers){
      const T = TOWERS[t.type];
      ctx.fillStyle = '#44403C'; ctx.fillRect(t.x - 10, t.y - 10, 20, 20);
      ctx.fillStyle = T.color; ctx.beginPath(); ctx.arc(t.x, t.y, 7, 0, 7); ctx.fill();
    }
    for(const e of enemies){
      const [x, y] = posAt(e.d);
      ctx.font = (e.boss ? 24 : 18) + 'px sans-serif'; ctx.fillText(e.boss ? '👹' : e.slow ? '🥶' : '👾', x, y);
      ctx.fillStyle = '#111'; ctx.fillRect(x - 10, y - 15, 20, 3);
      ctx.fillStyle = '#EF4444'; ctx.fillRect(x - 10, y - 15, 20 * Math.max(0, e.hp / e.max), 3);
    }
    for(const s of shots){ ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x + (s.tx - s.x) * s.t, s.y + (s.ty - s.y) * s.t, s.type === 'kanone' ? 4 : 2.5, 0, 7); ctx.fill(); }
  }
  const cellAt = e => { const r = canvas.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) * (canvas.width / r.width) / C), Math.floor((e.clientY - r.top) * (canvas.height / r.height) / C)]; };
  const canBuild = (x, y) => x >= 0 && x < 16 && y >= 0 && y < 12 && !pathCells.has(x + ',' + y) && !towers.some(t => t.cx === x && t.cy === y) && gold >= TURM_PREIS[sel];
  canvas.addEventListener('pointermove', e => { hoverCell = cellAt(e); });
  canvas.addEventListener('pointerleave', () => { hoverCell = null; });
  canvas.addEventListener('pointerdown', e => {
    if(!running) return;
    const [x, y] = cellAt(e);
    if(!canBuild(x, y)){ sfx.wrong?.(); return; }
    gold -= TURM_PREIS[sel];
    towers.push({ cx: x, cy: y, x: x * C + C / 2, y: y * C + C / 2, type: sel, cd: 0 });
    sfx.place?.(); render();
  });
  window.__restartCurrent = start;
  start();
  return () => { running = false; cancelAnimationFrame(loopId); };
}
