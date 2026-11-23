import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// 🔲 SUPER-TIC-TAC-TOE – 9 kleine Tic-Tac-Toe-Felder in einem großen!
// Wo du in einem kleinen Feld setzt, bestimmt, in welchem großen Feld dein Gegner als Nächstes spielen muss.
// Gewinn ein kleines Feld, um dort dein Zeichen zu bekommen. 3 große in einer Reihe = Sieg!
const S = 360, M = 8, B = (S - 2 * M) / 3, c = B / 3;
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const COL = { X: '#C6FF3D', O: '#FF6B4A' };

export function build(){
  const scoreEl = hud(['X','utX'], ['O','utO']);
  const statusEl = document.createElement('div');
  statusEl.style.cssText = 'font-family:Fredoka; font-weight:600; text-align:center; min-height:22px;';
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = S;
  canvas.style.cursor = 'pointer';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, statusEl, wrap, mkHint('2 Spieler abwechselnd. Das leuchtende große Feld ist das, in dem du spielen musst. Ist es schon voll oder gewonnen, darfst du frei wählen.'));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let cells, big, turn, active, done, wins = { X: 0, O: 0 }, last, starter = 'O';

  function start(){ cells = Array.from({ length: 9 }, () => Array(9).fill('')); big = Array(9).fill(''); starter = starter === 'X' ? 'O' : 'X'; turn = starter; active = -1; done = false; last = null; over.classList.remove('show'); update(); }
  const winner = arr => { for(const [a, b, d] of LINES) if(arr[a] && arr[a] !== 'T' && arr[a] === arr[b] && arr[a] === arr[d]) return arr[a]; return ''; };
  const full = arr => arr.every(v => v);
  function update(){
    document.getElementById('utX').textContent = wins.X; document.getElementById('utO').textContent = wins.O;
    statusEl.textContent = done ? '' : `${turn} ist dran${active >= 0 ? ' – im leuchtenden Feld' : ' – freie Wahl!'}`; statusEl.style.color = COL[turn];
    draw();
  }
  function play(b, k){
    if(done || cells[b][k] || big[b] || (active >= 0 && active !== b)) return;
    cells[b][k] = turn; last = [b, k]; sfx.place?.();
    const w = winner(cells[b]);
    if(w){ big[b] = w; sfx.coin(); } else if(full(cells[b])) big[b] = 'T';
    const W = winner(big);
    if(W || big.every(v => v)){
      done = true; if(W) wins[W]++; sfx.win(); update();
      over.querySelector('div').textContent = W ? `${W} gewinnt das Super-Spiel! 🏆` : 'Unentschieden!';
      over.classList.add('show'); return;
    }
    active = big[k] ? -1 : k;
    turn = turn === 'X' ? 'O' : 'X';
    update();
  }
  function mark(v, x, y, size, alpha = 1){
    ctx.globalAlpha = alpha; ctx.strokeStyle = COL[v]; ctx.lineWidth = Math.max(3, size * 0.12); ctx.lineCap = 'round';
    const p = size * 0.22;
    if(v === 'X'){ ctx.beginPath(); ctx.moveTo(x + p, y + p); ctx.lineTo(x + size - p, y + size - p); ctx.moveTo(x + size - p, y + p); ctx.lineTo(x + p, y + size - p); ctx.stroke(); }
    else if(v === 'O'){ ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2 - p, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  function draw(){
    ctx.fillStyle = '#14101F'; ctx.fillRect(0, 0, S, S);
    for(let b = 0; b < 9; b++){
      const bx = M + (b % 3) * B, by = M + Math.floor(b / 3) * B;
      const playable = !done && !big[b] && (active < 0 || active === b);
      ctx.fillStyle = playable ? 'rgba(198,255,61,.10)' : '#1D1730'; ctx.fillRect(bx + 3, by + 3, B - 6, B - 6);
      if(playable){ ctx.strokeStyle = COL[turn]; ctx.lineWidth = 2; ctx.strokeRect(bx + 3, by + 3, B - 6, B - 6); }
      ctx.strokeStyle = '#3A2F63'; ctx.lineWidth = 1.5;
      for(let i = 1; i < 3; i++){ ctx.beginPath(); ctx.moveTo(bx + i * c, by + 8); ctx.lineTo(bx + i * c, by + B - 8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(bx + 8, by + i * c); ctx.lineTo(bx + B - 8, by + i * c); ctx.stroke(); }
      for(let k = 0; k < 9; k++){ const v = cells[b][k]; if(v) mark(v, bx + (k % 3) * c, by + Math.floor(k / 3) * c, c, big[b] ? 0.3 : 1); }
      if(last && last[0] === b){ const k = last[1]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(bx + (k % 3) * c + 3, by + Math.floor(k / 3) * c + 3, c - 6, c - 6); }
      if(big[b] && big[b] !== 'T') mark(big[b], bx, by, B);
    }
    ctx.strokeStyle = '#7C3AED'; ctx.lineWidth = 4;
    for(let i = 1; i < 3; i++){ ctx.beginPath(); ctx.moveTo(M + i * B, M); ctx.lineTo(M + i * B, S - M); ctx.stroke(); ctx.beginPath(); ctx.moveTo(M, M + i * B); ctx.lineTo(S - M, M + i * B); ctx.stroke(); }
  }
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * (canvas.width / r.width) - M, y = (e.clientY - r.top) * (canvas.height / r.height) - M;
    if(x < 0 || y < 0 || x >= 3 * B || y >= 3 * B) return;
    const b = Math.floor(y / B) * 3 + Math.floor(x / B), k = Math.floor((y % B) / c) * 3 + Math.floor((x % B) / c);
    play(b, Math.min(8, k));
  });
  window.__restartCurrent = start;
  start();
  return () => { done = true; };
}
