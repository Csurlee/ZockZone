import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Richtig','sudCorrect']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const gridDiv=document.createElement('div');
  gridDiv.style.cssText='display:grid; grid-template-columns:repeat(6,48px); grid-gap:2px; background:#3a2f5c; padding:4px; border-radius:8px;';
  wrap.appendChild(gridDiv);
  playerBody.append(scoreEl, wrap, mkHint('Fülle jede Zeile, Spalte und jeden 2x3-Block mit den Zahlen 1-6, ohne Wiederholung. Tippe eine Zelle zum Weiterschalten.'));
  const over=overMsg(wrap,'',start);
  const BASE=[[1,2,3,4,5,6],[4,5,6,1,2,3],[2,3,1,5,6,4],[5,6,4,2,3,1],[3,1,2,6,4,5],[6,4,5,3,1,2]];
  let solution, puzzle, fixed;
  function genSolution(){
    let sol = BASE.map(r=>[...r]);
    const perm=[1,2,3,4,5,6].sort(()=>Math.random()-0.5);
    sol = sol.map(row=>row.map(v=>perm[v-1]));
    for(let band=0;band<3;band++){
      if(Math.random()<0.5){ const r0=band*2,r1=band*2+1; [sol[r0],sol[r1]]=[sol[r1],sol[r0]]; }
    }
    for(let stack=0;stack<2;stack++){
      const cols=[stack*3,stack*3+1,stack*3+2].sort(()=>Math.random()-0.5);
      sol = sol.map(row=>{
        const newRow=[...row];
        [0,1,2].forEach((_,i)=> newRow[stack*3+i]=row[cols[i]]);
        return newRow;
      });
    }
    return sol;
  }
  function start(){
    solution=genSolution();
    puzzle=solution.map(r=>[...r]);
    fixed=Array.from({length:6},()=>Array(6).fill(true));
    let toRemove=16;
    while(toRemove>0){
      const r=Math.floor(Math.random()*6), c=Math.floor(Math.random()*6);
      if(fixed[r][c]){ fixed[r][c]=false; puzzle[r][c]=0; toRemove--; }
    }
    over.classList.remove('show');
    updateCorrect();
    render();
  }
  function updateCorrect(){
    let correct=0;
    for(let r=0;r<6;r++)for(let c=0;c<6;c++) if(puzzle[r][c]===solution[r][c]) correct++;
    document.getElementById('sudCorrect').textContent=correct+'/36';
    if(correct===36){ over.querySelector('div').textContent='Gelöst! 🎉'; over.classList.add('show'); }
  }
  function render(){
    gridDiv.innerHTML='';
    for(let r=0;r<6;r++)for(let c=0;c<6;c++){
      const cell=document.createElement('div');
      const boxShade = (Math.floor(r/2)+Math.floor(c/3))%2===0 ? '#241D3B' : '#1D1730';
      cell.style.cssText=`width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;background:${fixed[r][c]?'#3a2f5c':boxShade};color:${fixed[r][c]?'#C6FF3D':'#fff'};cursor:${fixed[r][c]?'default':'pointer'};`;
      cell.textContent = puzzle[r][c]||'';
      if(!fixed[r][c]) cell.onclick=(()=>{ const rr=r, cc=c; return ()=>{ puzzle[rr][cc]=(puzzle[rr][cc]%6)+1; render(); updateCorrect(); }; })();
      gridDiv.appendChild(cell);
    }
  }
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
