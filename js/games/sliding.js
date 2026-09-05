import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Züge','slideMoves']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const gridDiv=document.createElement('div');
  gridDiv.style.cssText='display:grid; grid-template-columns:repeat(4,74px); grid-gap:6px;';
  wrap.appendChild(gridDiv);
  playerBody.append(scoreEl, wrap, mkHint('Klicke ein Feld neben der Lücke, um es zu verschieben. Sortiere 1-15.'));
  const over=overMsg(wrap,'',start);
  let tiles, moves;
  function start(){
    tiles=[...Array(15).keys()].map(n=>n+1); tiles.push(0);
    do{ shuffle(); }while(!solvable());
    moves=0;
    document.getElementById('slideMoves').textContent=0;
    over.classList.remove('show');
    render();
  }
  function shuffle(){ for(let i=tiles.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [tiles[i],tiles[j]]=[tiles[j],tiles[i]]; } }
  function solvable(){
    let inv=0;
    const arr=tiles.filter(v=>v!==0);
    for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++) if(arr[i]>arr[j]) inv++;
    const blankRowFromBottom = 4 - Math.floor(tiles.indexOf(0)/4);
    return (inv + blankRowFromBottom) % 2 === 1;
  }
  function render(){
    gridDiv.innerHTML='';
    tiles.forEach((v,i)=>{
      const cell=document.createElement('div');
      cell.style.cssText=`width:74px;height:74px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;cursor:pointer;background:${v===0?'transparent':'#7C3AED'};color:#fff;`;
      cell.textContent = v||'';
      cell.onclick=(()=>{ const ii=i; return ()=>move(ii); })();
      gridDiv.appendChild(cell);
    });
  }
  function move(i){
    const blank=tiles.indexOf(0);
    const r=Math.floor(i/4), c=i%4, br=Math.floor(blank/4), bc=blank%4;
    if(Math.abs(r-br)+Math.abs(c-bc)===1){
      [tiles[i],tiles[blank]]=[tiles[blank],tiles[i]];
      moves++; document.getElementById('slideMoves').textContent=moves;
      render();
      if(tiles.slice(0,15).every((v,idx)=>v===idx+1)){
        over.querySelector('div').textContent=`Gelöst in ${moves} Zügen! 🎉`;
        over.classList.add('show');
      }
    }
  }
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
