import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🏍️ LICHTRENNER – 2 Spieler, jedes Motorrad zieht eine Leuchtspur hinter sich her.
// Wer in eine Spur oder an den Rand fährt, verliert! Spieler 1: W A S D · Spieler 2: Pfeiltasten
// ---------- 🛠️ LUKI-ECKE ----------
const TEMPO_MS = 70;     // Millisekunden pro Schritt (kleiner = schneller)
const SIEGE    = 3;      // Wer zuerst so viele Runden gewinnt
// ------------------------------------
const COLS = 50, ROWS = 36, C = 8, W = COLS * C, H = ROWS * C;
const COL = ['#38BDF8', '#F472B6'];

export function build(){
  const scoreEl = hud([L('Blau (WASD)', 'Blue (WASD)'),'lrP1'], [L('Pink (Pfeile)', 'Pink (arrows)'),'lrP2']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  wrap.appendChild(canvas);
  const cpuBtn = mkButton('🤖 Pink = Computer', 'var(--card)', '#fff');
  playerBody.append(scoreEl, wrap, cpuBtn, mkHint(L('Blau lenkt mit W A S D, Pink mit den Pfeiltasten. Nicht in eine Spur fahren! Mit dem Knopf spielst du gegen den Computer.', 'Blue steers with W A S D, Pink with the arrow keys. Don’t hit a trail! Use the button to play against the computer.')));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let grid, bikes, wins, timer, phase, cpu = false, roundMsg;

  cpuBtn.onclick = () => { cpu = !cpu; cpuBtn.textContent = cpu ? '👥 Pink = Spieler 2' : '🤖 Pink = Computer'; start(); };
  function start(){ wins = [0, 0]; over.classList.remove('show'); updateHud(); round(); }
  function updateHud(){ document.getElementById('lrP1').textContent = wins[0]; document.getElementById('lrP2').textContent = wins[1]; }
  function round(){
    clearInterval(timer);
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
    bikes = [{ x: 8, y: ROWS / 2, dx: 1, dy: 0, nd: null, alive: true }, { x: COLS - 9, y: ROWS / 2, dx: -1, dy: 0, nd: null, alive: true }];
    bikes.forEach((b, i) => grid[b.y][b.x] = i);
    phase = 'ready'; roundMsg = 'Los in 1 Sekunde…'; draw();
    timer = setTimeout(() => { phase = 'run'; roundMsg = ''; timer = setInterval(step, TEMPO_MS); }, 1000);
  }
  const free = (x, y) => x >= 0 && x < COLS && y >= 0 && y < ROWS && grid[y][x] === -1;
  function cpuThink(b){
    const opts = [[b.dx, b.dy], [b.dy, -b.dx], [-b.dy, b.dx]];
    const space = ([dx, dy]) => { let n = 0, x = b.x, y = b.y; while(n < 12 && free(x + dx, y + dy)){ x += dx; y += dy; n++; } return n + Math.random() * 0.5; };
    const best = opts.sort((a, c) => space(c) - space(a))[0];
    if(space([b.dx, b.dy]) < 3 || Math.random() < 0.05) b.nd = best;
  }
  function step(){
    if(cpu) cpuThink(bikes[1]);
    bikes.forEach(b => { if(b.nd){ b.dx = b.nd[0]; b.dy = b.nd[1]; b.nd = null; } b.x += b.dx; b.y += b.dy; });
    const [a, b] = bikes;
    const crashA = !free(a.x, a.y) || (a.x === b.x && a.y === b.y), crashB = !free(b.x, b.y) || (a.x === b.x && a.y === b.y);
    if(!crashA) grid[a.y][a.x] = 0; if(!crashB) grid[b.y][b.x] = 1;
    if(crashA || crashB){
      clearInterval(timer); phase = 'crash'; sfx.explosion?.();
      if(crashA && crashB) roundMsg = 'Beide gecrasht! Unentschieden';
      else { const w = crashA ? 1 : 0; wins[w]++; roundMsg = (w ? (cpu ? 'Computer' : 'Pink') : 'Blau') + ' gewinnt die Runde!'; }
      a.alive = !crashA; b.alive = !crashB; updateHud(); draw();
      if(wins[0] >= SIEGE || wins[1] >= SIEGE){ sfx.win(); timer = setTimeout(() => { over.querySelector('div').textContent = `${wins[0] > wins[1] ? 'Blau' : (cpu ? 'Computer' : 'Pink')} ist Lichtrenner-Champion! 🏆`; over.classList.add('show'); }, 900); }
      else timer = setTimeout(round, 1500);
      return;
    }
    draw();
  }
  function draw(){
    ctx.fillStyle = '#05030C'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(124,58,237,.18)'; ctx.lineWidth = 1;
    for(let x = 0; x <= COLS; x += 5){ ctx.beginPath(); ctx.moveTo(x * C, 0); ctx.lineTo(x * C, H); ctx.stroke(); }
    for(let y = 0; y <= ROWS; y += 5){ ctx.beginPath(); ctx.moveTo(0, y * C); ctx.lineTo(W, y * C); ctx.stroke(); }
    for(let y = 0; y < ROWS; y++) for(let x = 0; x < COLS; x++) if(grid[y][x] >= 0){ ctx.fillStyle = COL[grid[y][x]]; ctx.globalAlpha = 0.75; ctx.fillRect(x * C + 1, y * C + 1, C - 2, C - 2); }
    ctx.globalAlpha = 1;
    bikes.forEach((b, i) => { ctx.fillStyle = b.alive ? '#fff' : '#EF4444'; ctx.shadowColor = COL[i]; ctx.shadowBlur = 12; ctx.fillRect(b.x * C - 1, b.y * C - 1, C + 2, C + 2); ctx.shadowBlur = 0; });
    if(roundMsg){ ctx.fillStyle = '#F3EEFF'; ctx.font = 'bold 20px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(roundMsg, W / 2, 30); }
  }
  const kd = e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const m1 = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[k], m2 = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k];
    const set = (b, m) => { if(m && !(m[0] === -b.dx && m[1] === -b.dy)) b.nd = m; };   // nicht umdrehen
    if(m1){ e.preventDefault(); set(bikes[0], m1); }
    if(m2 && !cpu){ e.preventDefault(); set(bikes[1], m2); }
    else if(m2 && cpu){ e.preventDefault(); set(bikes[0], m2); }   // gegen Computer gehen auch die Pfeiltasten für Blau
  };
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => { clearInterval(timer); clearTimeout(timer); document.removeEventListener('keydown', kd); };
}
