import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Züge','loMoves']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const gridDiv=document.createElement('div');
  gridDiv.style.cssText='display:grid; grid-template-columns:repeat(5,56px); grid-gap:6px;';
  wrap.appendChild(gridDiv);
  playerBody.append(scoreEl, wrap, mkHint('Klicke ein Feld: es schaltet sich und seine Nachbarn um. Ziel: alle Lichter aus.'));
  const over=overMsg(wrap,'',start);
  const N=5;
  let grid, moves;
  function start(){
    grid=Array.from({length:N},()=>Array(N).fill(false));
    for(let i=0;i<15;i++) toggle(Math.floor(Math.random()*N), Math.floor(Math.random()*N), false);
    moves=0;
    document.getElementById('loMoves').textContent=0;
    over.classList.remove('show');
    render();
  }
  function toggle(r,c,count){
    [[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{
      const nr=r+dr, nc=c+dc;
      if(nr>=0&&nr<N&&nc>=0&&nc<N) grid[nr][nc]=!grid[nr][nc];
    });
    if(count!==false){ moves++; document.getElementById('loMoves').textContent=moves; }
  }
  function render(){
    gridDiv.innerHTML='';
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){
      const cell=document.createElement('div');
      cell.style.cssText=`width:56px;height:56px;border-radius:10px;cursor:pointer;background:${grid[r][c]?'#FDE68A':'#241D3B'};box-shadow:${grid[r][c]?'0 0 16px #FDE68A':'none'};`;
      cell.onclick=(()=>{ const rr=r, cc=c; return ()=>{
        toggle(rr,cc,true); render();
        if(grid.every(row=>row.every(v=>!v))){
          over.querySelector('div').textContent=`Gelöst in ${moves} Zügen! 🎉`;
          over.classList.add('show');
        }
      };})();
      gridDiv.appendChild(cell);
    }
  }
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
