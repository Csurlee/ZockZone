import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// ⚪ MÜHLE – der Brettspiel-Klassiker für 2 Spieler
// Regeln: Jeder setzt 9 Steine. Drei in einer Reihe = Mühle → einen gegnerischen Stein wegnehmen.
// Danach werden Steine auf freie Nachbarpunkte geschoben. Wer nur noch 3 Steine hat, darf springen.
// Wer weniger als 3 Steine hat oder nicht mehr ziehen kann, verliert.
const S = 360, M = 30;
// 24 Punkte: [x, y] im Raster 0..6
const P = [[0,0],[3,0],[6,0],[1,1],[3,1],[5,1],[2,2],[3,2],[4,2],[0,3],[1,3],[2,3],[4,3],[5,3],[6,3],[2,4],[3,4],[4,4],[1,5],[3,5],[5,5],[0,6],[3,6],[6,6]];
const MILLS = [[0,1,2],[3,4,5],[6,7,8],[9,10,11],[12,13,14],[15,16,17],[18,19,20],[21,22,23],
               [0,9,21],[3,10,18],[6,11,15],[1,4,7],[16,19,22],[8,12,17],[5,13,20],[2,14,23]];
const ADJ = Array.from({ length: 24 }, () => []);
MILLS.forEach(([a, b, c]) => { ADJ[a].push(b); ADJ[b].push(a, c); ADJ[c].push(b); });
const pos = i => [M + P[i][0] * (S - 2 * M) / 6, M + P[i][1] * (S - 2 * M) / 6];
const NAMES = ['Weiß', 'Schwarz'];

export function build(){
  const scoreEl = hud(['Weiß','mhW'], ['Schwarz','mhB']);
  const statusEl = document.createElement('div');
  statusEl.style.cssText = 'font-family:Fredoka; font-weight:600; min-height:22px; text-align:center;';
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = S;
  canvas.style.cursor = 'pointer';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, statusEl, wrap, mkHint('2 Spieler abwechselnd. Erst Steine setzen, dann schieben. 3 in einer Reihe = Mühle: Nimm dem Gegner einen Stein weg!'));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let board, turn, toPlace, onBoard, mode, sel, done, starter = 1;

  function start(){
    board = Array(24).fill(-1); starter = 1 - starter; turn = starter;
    toPlace = [9, 9]; onBoard = [0, 0]; mode = 'place'; sel = -1; done = false;
    over.classList.remove('show'); status(); draw();
  }
  const inMill = (i, b = board) => b[i] >= 0 && MILLS.some(m => m.includes(i) && m.every(k => b[k] === b[i]));
  const canFly = p => onBoard[p] === 3 && toPlace[p] === 0;
  function hasMove(p){
    if(toPlace[p] > 0) return board.includes(-1);
    if(canFly(p)) return true;
    return board.some((v, i) => v === p && ADJ[i].some(j => board[j] === -1));
  }
  function status(){
    document.getElementById('mhW').textContent = onBoard[0] + (toPlace[0] ? ` (+${toPlace[0]})` : '');
    document.getElementById('mhB').textContent = onBoard[1] + (toPlace[1] ? ` (+${toPlace[1]})` : '');
    const n = NAMES[turn];
    statusEl.textContent = mode === 'remove' ? `🎉 Mühle! ${n}: Nimm einen Stein vom Gegner weg.`
      : toPlace[turn] > 0 ? `${n} setzt einen Stein (${toPlace[turn]} übrig)`
      : canFly(turn) ? `${n} hat nur 3 Steine und darf springen!` : `${n} schiebt einen Stein`;
  }
  function next(){
    turn = 1 - turn; mode = toPlace[turn] > 0 ? 'place' : 'move'; sel = -1;
    const opp = turn;
    if(toPlace[opp] === 0 && (onBoard[opp] < 3 || !hasMove(opp))) return finish(1 - opp);
    status(); draw();
  }
  function finish(winner){
    done = true; sfx.win(); status(); draw();
    over.querySelector('div').textContent = `${NAMES[winner]} gewinnt! 🏆`;
    over.classList.add('show');
  }
  function afterPlaceOrMove(i){
    // Mühle! Aber nur wegnehmen, wenn der Gegner überhaupt einen Stein auf dem Brett hat
    if(inMill(i) && board.includes(1 - turn)){
      mode = 'remove'; sfx.coin(); status(); draw(); return;
    }
    next();
  }
  function click(i){
    if(done || i < 0) return;
    if(mode === 'remove'){
      const opp = 1 - turn;
      if(board[i] !== opp) return;
      const allInMills = board.every((v, k) => v !== opp || inMill(k));
      if(inMill(i) && !allInMills){ statusEl.textContent = 'Steine in einer Mühle sind geschützt – nimm einen anderen!'; sfx.wrong?.(); return; }
      board[i] = -1; onBoard[opp]--; sfx.explosion?.();
      if(toPlace[opp] === 0 && onBoard[opp] < 3) return finish(turn);
      return next();
    }
    if(mode === 'place'){
      if(board[i] !== -1) return;
      board[i] = turn; toPlace[turn]--; onBoard[turn]++; sfx.place();
      return afterPlaceOrMove(i);
    }
    // Schieben
    if(board[i] === turn){ sel = i; sfx.click?.(); draw(); return; }
    if(sel >= 0 && board[i] === -1 && (canFly(turn) || ADJ[sel].includes(i))){
      board[i] = turn; board[sel] = -1; sel = -1; sfx.place();
      return afterPlaceOrMove(i);
    }
  }
  function draw(){
    ctx.fillStyle = '#7C5A3A'; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#A57A4F'; ctx.fillRect(8, 8, S - 16, S - 16);
    ctx.strokeStyle = '#3B2A1A'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    MILLS.forEach(([a, , c]) => { const [x1, y1] = pos(a), [x2, y2] = pos(c); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); });
    const targets = (mode === 'move' && sel >= 0) ? board.map((v, j) => v === -1 && (canFly(turn) || ADJ[sel].includes(j))) : [];
    for(let i = 0; i < 24; i++){
      const [x, y] = pos(i);
      ctx.fillStyle = '#3B2A1A'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill();
      if(targets[i]){ ctx.fillStyle = '#C6FF3D'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); }
      if(board[i] >= 0){
        const white = board[i] === 0;
        const g = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, 17);
        g.addColorStop(0, white ? '#FFFFFF' : '#555'); g.addColorStop(1, white ? '#D6D3D1' : '#111');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 15, 0, 7); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.stroke();
        const removable = mode === 'remove' && board[i] === 1 - turn;
        if(i === sel || removable){ ctx.lineWidth = 3; ctx.strokeStyle = removable ? '#FF6B4A' : '#C6FF3D'; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.stroke(); }
      }
    }
  }
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width), y = (e.clientY - r.top) * (canvas.height / r.height);
    let best = -1, bd = 22 * 22;
    for(let i = 0; i < 24; i++){ const [px, py] = pos(i); const d = (px - x) ** 2 + (py - y) ** 2; if(d < bd){ bd = d; best = i; } }
    click(best);
  });
  window.__restartCurrent = start;
  start();
  return () => {};
}
