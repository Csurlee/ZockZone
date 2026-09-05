import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Treffer','bsHits'],['Schüsse','bsShots']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const gridDiv=document.createElement('div');
  gridDiv.style.cssText='display:grid; grid-template-columns:repeat(8,34px); grid-gap:2px;';
  wrap.appendChild(gridDiv);
  playerBody.append(scoreEl, wrap, mkHint('Finde und versenke alle Schiffe mit möglichst wenigen Schüssen.'));
  const over=overMsg(wrap,'',start);
  const SHIP_SIZES=[4,3,3,2,2];
  let grid, shots, hits, shipCells;
  function start(){
    grid=Array.from({length:8},()=>Array(8).fill(0));
    shipCells=0;
    SHIP_SIZES.forEach(size=>{
      let placed=false;
      while(!placed){
        const horiz=Math.random()<0.5;
        const r=Math.floor(Math.random()*8), c=Math.floor(Math.random()*8);
        const cells=[];
        for(let i=0;i<size;i++) cells.push(horiz?[r,c+i]:[r+i,c]);
        if(cells.every(([rr,cc])=>rr<8&&cc<8&&grid[rr][cc]===0)){
          cells.forEach(([rr,cc])=>grid[rr][cc]=1);
          placed=true; shipCells+=size;
        }
      }
    });
    shots=0; hits=0;
    document.getElementById('bsHits').textContent='0/'+shipCells;
    document.getElementById('bsShots').textContent=0;
    over.classList.remove('show');
    render();
  }
  function render(){
    gridDiv.innerHTML='';
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const cell=document.createElement('div');
      const v=grid[r][c];
      let bg='#241D3B', txt='';
      if(v===2){ bg='#DC2626'; txt='💥'; }
      else if(v===3){ bg='#1D1730'; txt='·'; }
      cell.style.cssText=`width:34px;height:34px;border-radius:6px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;`;
      cell.textContent=txt;
      cell.onclick=(()=>{ const rr=r, cc=c; return ()=>shoot(rr,cc); })();
      gridDiv.appendChild(cell);
    }
  }
  function shoot(r,c){
    if(grid[r][c]===2||grid[r][c]===3) return;
    shots++; document.getElementById('bsShots').textContent=shots;
    if(grid[r][c]===1){ grid[r][c]=2; hits++; document.getElementById('bsHits').textContent=hits+'/'+shipCells; }
    else grid[r][c]=3;
    render();
    if(hits===shipCells){
      over.querySelector('div').textContent=`Alle Schiffe versenkt! 🎉 (${shots} Schüsse)`;
      over.classList.add('show');
    }
  }
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
