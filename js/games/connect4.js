import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Runde','c4Round']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const gridDiv=document.createElement('div');
  gridDiv.style.cssText='display:grid; grid-template-columns:repeat(7,40px); grid-gap:4px; background:#1D3A8A; padding:8px; border-radius:12px;';
  wrap.appendChild(gridDiv);
  const statusEl=document.createElement('div');
  statusEl.style.cssText='font-family:Fredoka; font-weight:600;';
  playerBody.append(scoreEl, statusEl, wrap, mkHint('2 Spieler abwechselnd. Klicke eine Spalte, um einen Stein einzuwerfen.'));
  const over=overMsg(wrap,'',start);
  const ROWS=6, COLS=7;
  let board, turn, round=0;
  function start(){
    board=Array.from({length:ROWS},()=>Array(COLS).fill(''));
    turn='🔴'; round++;
    document.getElementById('c4Round').textContent=round;
    statusEl.textContent='Spieler 🔴 ist dran';
    over.classList.remove('show');
    render();
  }
  function render(){
    gridDiv.innerHTML='';
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const cell=document.createElement('div');
      cell.style.cssText='width:40px;height:40px;border-radius:50%;background:#0F172A;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;';
      cell.textContent=board[r][c];
      cell.onclick=(()=>{ const cc=c; return ()=>drop(cc); })();
      gridDiv.appendChild(cell);
    }
  }
  function drop(c){
    for(let r=ROWS-1;r>=0;r--){
      if(!board[r][c]){
        board[r][c]=turn;
        render();
        if(checkWin(r,c)){
          over.querySelector('div').textContent=`Spieler ${turn} gewinnt! 🎉`;
          over.classList.add('show');
          return;
        }
        if(board.every(row=>row.every(v=>v))){
          over.querySelector('div').textContent='Unentschieden!';
          over.classList.add('show');
          return;
        }
        turn = turn==='🔴'?'🟡':'🔴';
        statusEl.textContent=`Spieler ${turn} ist dran`;
        return;
      }
    }
  }
  function checkWin(r,c){
    const dirs=[[0,1],[1,0],[1,1],[1,-1]];
    return dirs.some(([dr,dc])=>{
      let count=1;
      for(let s=1;s<4;s++){ const nr=r+dr*s,nc=c+dc*s; if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&board[nr][nc]===turn) count++; else break; }
      for(let s=1;s<4;s++){ const nr=r-dr*s,nc=c-dc*s; if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&board[nr][nc]===turn) count++; else break; }
      return count>=4;
    });
  }
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
