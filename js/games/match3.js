import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','m3Score'],['Züge','m3Moves']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const gridDiv=document.createElement('div');
  gridDiv.style.cssText='display:grid; grid-template-columns:repeat(6,48px); grid-gap:4px;';
  wrap.appendChild(gridDiv);
  playerBody.append(scoreEl, wrap, mkHint('Tausche zwei benachbarte Steine, um 3 gleiche in einer Reihe zu bilden. 20 Züge.'));
  const over=overMsg(wrap,'',start);
  const COLORS=['#DC2626','#2563EB','#16A34A','#F59E0B','#A855F7'];
  const N=6;
  let grid, score, moves, selected;
  function findMatches(){
    const matches=new Set();
    for(let r=0;r<N;r++)for(let c=0;c<N-2;c++){
      if(grid[r][c]===grid[r][c+1] && grid[r][c]===grid[r][c+2]){ matches.add(r+','+c); matches.add(r+','+(c+1)); matches.add(r+','+(c+2)); }
    }
    for(let c=0;c<N;c++)for(let r=0;r<N-2;r++){
      if(grid[r][c]===grid[r+1][c] && grid[r][c]===grid[r+2][c]){ matches.add(r+','+c); matches.add((r+1)+','+c); matches.add((r+2)+','+c); }
    }
    return [...matches].map(s=>s.split(',').map(Number));
  }
  function removeInitialMatches(){
    let changed=true;
    while(changed){
      changed=false;
      const m=findMatches();
      m.forEach(([r,c])=>{ grid[r][c]=Math.floor(Math.random()*COLORS.length); changed=true; });
    }
  }
  function start(){
    grid=Array.from({length:N},()=>Array.from({length:N},()=>Math.floor(Math.random()*COLORS.length)));
    removeInitialMatches();
    score=0; moves=20; selected=null;
    document.getElementById('m3Score').textContent=0;
    document.getElementById('m3Moves').textContent=moves;
    over.classList.remove('show');
    render();
  }
  function resolveMatches(){
    let totalCleared=0, m;
    while((m=findMatches()).length){
      totalCleared+=m.length;
      m.forEach(([r,c])=> grid[r][c]=-1);
      for(let c=0;c<N;c++){
        let write=N-1;
        for(let r=N-1;r>=0;r--){ if(grid[r][c]!==-1){ grid[write][c]=grid[r][c]; write--; } }
        for(let r=write;r>=0;r--) grid[r][c]=Math.floor(Math.random()*COLORS.length);
      }
    }
    return totalCleared;
  }
  function render(){
    gridDiv.innerHTML='';
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){
      const cell=document.createElement('div');
      const isSel = selected && selected[0]===r && selected[1]===c;
      cell.style.cssText=`width:48px;height:48px;border-radius:10px;background:${COLORS[grid[r][c]]};cursor:pointer;border:3px solid ${isSel?'#fff':'transparent'};`;
      cell.onclick=(()=>{ const rr=r, cc=c; return ()=>click(rr,cc); })();
      gridDiv.appendChild(cell);
    }
  }
  function click(r,c){
    if(moves<=0) return;
    if(!selected){ selected=[r,c]; render(); return; }
    const [sr,sc]=selected;
    const adjacent = Math.abs(sr-r)+Math.abs(sc-c)===1;
    if(adjacent){
      [grid[sr][sc],grid[r][c]]=[grid[r][c],grid[sr][sc]];
      const cleared=resolveMatches();
      if(cleared>0){
        score+=cleared*5; moves--;
        document.getElementById('m3Score').textContent=score;
        document.getElementById('m3Moves').textContent=moves;
      } else {
        [grid[sr][sc],grid[r][c]]=[grid[r][c],grid[sr][sc]];
      }
    }
    selected=null;
    render();
    if(moves<=0){
      over.querySelector('div').textContent='Fertig! Punkte: '+score;
      over.classList.add('show');
    }
  }
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
