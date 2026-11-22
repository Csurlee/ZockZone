import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

// ✏️ KÄSEKÄSTCHEN – abwechselnd Striche ziehen. Wer ein Kästchen schließt, bekommt einen Punkt
// und ist nochmal dran. Gegen einen Freund oder gegen den Computer.
const N = 5;                 // 5 × 5 Kästchen
const S = 340, M = 30, G = (S - 2 * M) / N;
const COL = ['#C6FF3D', '#FF6B4A'];

export function build(){
  const scoreEl = hud(['Spieler 1','dbP1'], ['Spieler 2','dbP2']);
  const statusEl = document.createElement('div');
  statusEl.style.cssText = 'font-family:Fredoka; font-weight:600; text-align:center;';
  const modeBtn = mkButton('🤖 Gegen Computer', 'var(--card)', '#fff');
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = S;
  canvas.style.cursor = 'pointer';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, statusEl, wrap, modeBtn, mkHint('Klick zwischen zwei Punkte, um einen Strich zu ziehen. Schließt du ein Kästchen, bist du nochmal dran!'));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let H, V, boxes, turn, score, vsCpu = false, busy, done, hover = null;

  modeBtn.onclick = () => { vsCpu = !vsCpu; modeBtn.textContent = vsCpu ? '👥 Gegen Freund' : '🤖 Gegen Computer'; start(); };

  function start(){
    H = Array.from({ length: N + 1 }, () => Array(N).fill(-1));   // waagrechte Striche
    V = Array.from({ length: N }, () => Array(N + 1).fill(-1));   // senkrechte Striche
    boxes = Array.from({ length: N }, () => Array(N).fill(-1));
    turn = 0; score = [0, 0]; busy = false; done = false;
    const label = document.getElementById('dbP2')?.parentElement?.firstChild;   // der Text "Spieler 2: " im HUD
    if(label) label.textContent = (vsCpu ? 'Computer' : 'Spieler 2') + ': ';
    over.classList.remove('show'); update();
  }
  const sides = (r, c) => (H[r][c] >= 0) + (H[r + 1][c] >= 0) + (V[r][c] >= 0) + (V[r][c + 1] >= 0);
  function allLines(){
    const l = [];
    for(let r = 0; r <= N; r++) for(let c = 0; c < N; c++) if(H[r][c] < 0) l.push(['h', r, c]);
    for(let r = 0; r < N; r++) for(let c = 0; c <= N; c++) if(V[r][c] < 0) l.push(['v', r, c]);
    return l;
  }
  function boxesOf([t, r, c]){
    const b = [];
    if(t === 'h'){ if(r > 0) b.push([r - 1, c]); if(r < N) b.push([r, c]); }
    else { if(c > 0) b.push([r, c - 1]); if(c < N) b.push([r, c]); }
    return b;
  }
  function play(line){
    const [t, r, c] = line;
    (t === 'h' ? H : V)[r][c] = turn;
    let closed = 0;
    for(const [br, bc] of boxesOf(line)) if(sides(br, bc) === 4 && boxes[br][bc] < 0){ boxes[br][bc] = turn; closed++; }
    if(closed){ score[turn] += closed; sfx.coin(); } else { turn = 1 - turn; sfx.click?.(); }
    update();
    if(score[0] + score[1] === N * N){ finish(); return; }
    if(vsCpu && turn === 1){ busy = true; setTimeout(cpuMove, 450); }
  }
  function cpuMove(){
    if(done) return;
    const lines = allLines();
    // 1. Ein Kästchen schließen, wenn möglich
    let pick = lines.find(l => boxesOf(l).some(([r, c]) => sides(r, c) === 3));
    // 2. Sonst einen Strich, der dem Gegner kein Kästchen schenkt
    if(!pick){ const safe = lines.filter(l => boxesOf(l).every(([r, c]) => sides(r, c) < 2)); if(safe.length) pick = safe[Math.floor(Math.random() * safe.length)]; }
    // 3. Sonst irgendeinen
    if(!pick) pick = lines[Math.floor(Math.random() * lines.length)];
    busy = false;
    play(pick);
  }
  function finish(){
    done = true;
    const w = score[0] === score[1] ? 'Unentschieden!' : (score[0] > score[1] ? 'Spieler 1' : (vsCpu ? 'Computer' : 'Spieler 2')) + ' gewinnt! 🏆';
    (vsCpu && score[1] > score[0] ? sfx.lose : sfx.win)();
    over.querySelector('div').textContent = `${w} (${score[0]} : ${score[1]})`;
    over.classList.add('show');
  }
  function update(){
    document.getElementById('dbP1').textContent = score[0];
    document.getElementById('dbP2').textContent = score[1];
    statusEl.textContent = done ? '' : (turn === 0 ? 'Spieler 1' : (vsCpu ? 'Computer' : 'Spieler 2')) + ' ist dran';
    statusEl.style.color = COL[turn];
    draw();
  }
  function draw(){
    ctx.fillStyle = '#1D1730'; ctx.fillRect(0, 0, S, S);
    for(let r = 0; r < N; r++) for(let c = 0; c < N; c++) if(boxes[r][c] >= 0){
      ctx.fillStyle = boxes[r][c] ? 'rgba(255,107,74,.35)' : 'rgba(198,255,61,.3)';
      ctx.fillRect(M + c * G + 3, M + r * G + 3, G - 6, G - 6);
      ctx.fillStyle = COL[boxes[r][c]]; ctx.font = 'bold 20px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(boxes[r][c] ? (vsCpu ? '🤖' : '2') : '1', M + c * G + G / 2, M + r * G + G / 2 + 1);
    }
    const line = (x1, y1, x2, y2, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    for(let r = 0; r <= N; r++) for(let c = 0; c < N; c++){
      const v = H[r][c], x = M + c * G, y = M + r * G;
      if(v >= 0) line(x, y, x + G, y, COL[v], 5);
      else if(hover && hover[0] === 'h' && hover[1] === r && hover[2] === c) line(x, y, x + G, y, 'rgba(255,255,255,.35)', 5);
    }
    for(let r = 0; r < N; r++) for(let c = 0; c <= N; c++){
      const v = V[r][c], x = M + c * G, y = M + r * G;
      if(v >= 0) line(x, y, x, y + G, COL[v], 5);
      else if(hover && hover[0] === 'v' && hover[1] === r && hover[2] === c) line(x, y, x, y + G, 'rgba(255,255,255,.35)', 5);
    }
    ctx.fillStyle = '#F3EEFF';
    for(let r = 0; r <= N; r++) for(let c = 0; c <= N; c++){ ctx.beginPath(); ctx.arc(M + c * G, M + r * G, 5, 0, 7); ctx.fill(); }
  }
  function lineAt(e){
    const rc = canvas.getBoundingClientRect();
    const x = (e.clientX - rc.left) * (canvas.width / rc.width) - M, y = (e.clientY - rc.top) * (canvas.height / rc.height) - M;
    const gx = x / G, gy = y / G;
    const dh = Math.abs(gy - Math.round(gy)), dv = Math.abs(gx - Math.round(gx));
    if(Math.min(dh, dv) > 0.3) return null;
    if(dh < dv){ const r = Math.round(gy), c = Math.floor(gx); if(r >= 0 && r <= N && c >= 0 && c < N && H[r][c] < 0) return ['h', r, c]; }
    else { const r = Math.floor(gy), c = Math.round(gx); if(r >= 0 && r < N && c >= 0 && c <= N && V[r][c] < 0) return ['v', r, c]; }
    return null;
  }
  canvas.addEventListener('pointermove', e => { hover = lineAt(e); draw(); });
  canvas.addEventListener('pointerleave', () => { hover = null; draw(); });
  canvas.addEventListener('pointerdown', e => {
    if(done || busy || (vsCpu && turn === 1)) return;
    const l = lineAt(e); if(l){ hover = null; play(l); }
  });
  window.__restartCurrent = start;
  start();
  return () => { done = true; };
}
