import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Schwarz','revB'],['Weiß','revW']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const gridDiv=document.createElement('div');
  gridDiv.style.cssText='display:grid; grid-template-columns:repeat(8,38px); grid-gap:2px; background:#0F5132; padding:6px; border-radius:8px;';
  wrap.appendChild(gridDiv);
  const statusEl=document.createElement('div');
  statusEl.style.cssText='font-family:Fredoka; font-weight:600;';
  playerBody.append(scoreEl, statusEl, wrap, mkHint('2 Spieler. Setze so, dass du eine Reihe gegnerischer Steine einschließt — sie werden umgedreht.'));
  const over=overMsg(wrap,'',start);
  const DIRS=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  let board, turn;
  function start(){
    board=Array.from({length:8},()=>Array(8).fill(null));
    board[3][3]='w'; board[3][4]='b'; board[4][3]='b'; board[4][4]='w';
    turn='b';
    statusEl.textContent='Schwarz ist dran';
    over.classList.remove('show');
    updateCounts();
    render();
  }
  function flips(r,c,player){
    if(board[r][c]) return [];
    const opp = player==='b'?'w':'b';
    let all=[];
    DIRS.forEach(([dr,dc])=>{
      let nr=r+dr,nc=c+dc, line=[];
      while(nr>=0&&nr<8&&nc>=0&&nc<8&&board[nr][nc]===opp){ line.push([nr,nc]); nr+=dr; nc+=dc; }
      if(line.length && nr>=0&&nr<8&&nc>=0&&nc<8&&board[nr][nc]===player) all=all.concat(line);
    });
    return all;
  }
  function legalMoves(player){
    const moves=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){ if(flips(r,c,player).length) moves.push({r,c}); }
    return moves;
  }
  function updateCounts(){
    let b=0,w=0;
    board.forEach(row=>row.forEach(v=>{ if(v==='b')b++; if(v==='w')w++; }));
    document.getElementById('revB').textContent=b;
    document.getElementById('revW').textContent=w;
  }
  function render(){
    gridDiv.innerHTML='';
    const moves=legalMoves(turn);
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const cell=document.createElement('div');
      const isMove=moves.some(m=>m.r===r&&m.c===c);
      cell.style.cssText='width:38px;height:38px;background:#16A34A;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:4px;';
      if(board[r][c]){
        const disc=document.createElement('div');
        disc.style.cssText=`width:28px;height:28px;border-radius:50%;background:${board[r][c]==='b'?'#111':'#fff'};`;
        cell.appendChild(disc);
      } else if(isMove){ cell.style.background='#22C55E'; }
      cell.onclick=(()=>{ const rr=r, cc=c; return ()=>place(rr,cc); })();
      gridDiv.appendChild(cell);
    }
  }
  function place(r,c){
    const f=flips(r,c,turn);
    if(!f.length) return;
    board[r][c]=turn;
    f.forEach(([fr,fc])=> board[fr][fc]=turn);
    updateCounts();
    const next = turn==='b'?'w':'b';
    if(legalMoves(next).length){ turn=next; }
    else if(!legalMoves(turn).length){
      let b=0,w=0; board.forEach(row=>row.forEach(v=>{ if(v==='b')b++; if(v==='w')w++; }));
      over.querySelector('div').textContent = b>w?'Schwarz gewinnt! 🎉' : w>b?'Weiß gewinnt! 🎉':'Unentschieden!';
      over.classList.add('show');
      return;
    }
    statusEl.textContent = (turn==='b'?'Schwarz':'Weiß')+' ist dran'+(legalMoves(turn).length?'':' (kein Zug möglich, ausgesetzt)');
    render();
  }
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
