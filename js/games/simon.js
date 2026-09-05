import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Runde','simRound']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const padDiv=document.createElement('div');
  padDiv.style.cssText='display:grid; grid-template-columns:repeat(2,110px); grid-gap:10px;';
  const colors=['#DC2626','#2563EB','#F59E0B','#16A34A'];
  const cells=colors.map(c=>{
    const d=document.createElement('div');
    d.style.cssText=`width:110px;height:110px;border-radius:14px;background:${c};cursor:pointer;opacity:0.55;transition:opacity .1s;`;
    padDiv.appendChild(d);
    return d;
  });
  wrap.appendChild(padDiv);
  playerBody.append(scoreEl, wrap, mkHint('Merke dir die Blink-Sequenz und wiederhole sie.'));
  const over=overMsg(wrap,'',start);
  let seq, userSeq, round, accepting;
  function start(){
    seq=[]; round=0; accepting=false;
    document.getElementById('simRound').textContent=0;
    over.classList.remove('show');
    nextRound();
  }
  function nextRound(){
    round++; document.getElementById('simRound').textContent=round;
    seq.push(Math.floor(Math.random()*4));
    userSeq=[];
    accepting=false;
    playSeq(0);
  }
  function playSeq(i){
    if(i>=seq.length){ accepting=true; return; }
    const idx=seq[i];
    cells[idx].style.opacity='1';
    setTimeout(()=>{
      cells[idx].style.opacity='0.55';
      setTimeout(()=>playSeq(i+1), 220);
    }, 420);
  }
  cells.forEach((cell,idx)=>{
    cell.onclick=()=>{
      if(!accepting) return;
      cell.style.opacity='1'; setTimeout(()=>cell.style.opacity='0.55',150);
      userSeq.push(idx);
      const pos=userSeq.length-1;
      if(seq[pos]!==idx){
        accepting=false;
        over.querySelector('div').textContent=`Falsch! Du kamst bis Runde ${round}.`;
        over.classList.add('show');
        return;
      }
      if(userSeq.length===seq.length){
        accepting=false;
        setTimeout(nextRound, 600);
      }
    };
  });
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
