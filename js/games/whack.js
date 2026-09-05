import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl = hud(['Punkte','whackScore'], ['Zeit','whackTime']);
  const wrap = document.createElement('div'); wrap.className='canvas-wrap';
  const gridDiv = document.createElement('div');
  gridDiv.style.cssText = 'display:grid; grid-template-columns:repeat(3,100px); grid-gap:14px;';
  wrap.appendChild(gridDiv);
  playerBody.append(scoreEl, wrap, mkHint('Klicke die Maulwürfe, bevor sie verschwinden!'));
  const over = overMsg(wrap, 'Zeit abgelaufen!', start);
  let holes, score, time, activeIdx, spawnId, timerId;

  function start(){
    score=0; time=30; activeIdx=-1;
    document.getElementById('whackScore').textContent=score;
    document.getElementById('whackTime').textContent=time;
    over.classList.remove('show');
    render();
    if(spawnId) clearInterval(spawnId);
    if(timerId) clearInterval(timerId);
    spawnId = setInterval(spawn, 800);
    timerId = setInterval(()=>{
      time--; document.getElementById('whackTime').textContent=time;
      if(time<=0){ clearInterval(spawnId); clearInterval(timerId); over.classList.add('show'); }
    }, 1000);
  }
  function spawn(){
    activeIdx = Math.floor(Math.random()*9);
    render();
    setTimeout(()=>{ if(activeIdx!==-1){ activeIdx=-1; render(); } }, 650);
  }
  function render(){
    gridDiv.innerHTML='';
    for(let i=0;i<9;i++){
      const cell=document.createElement('div');
      cell.style.cssText=`width:100px;height:90px;border-radius:12px 12px 40px 40px;display:flex;align-items:flex-end;justify-content:center;font-size:38px;cursor:pointer;background:#3B2A1A;overflow:hidden;border:1px solid rgba(255,255,255,0.08);`;
      cell.textContent = i===activeIdx ? '🐹' : '';
      cell.onclick = ()=>{
        if(i===activeIdx){ score++; document.getElementById('whackScore').textContent=score; activeIdx=-1; render(); }
      };
      gridDiv.appendChild(cell);
    }
  }
  window.__restartCurrent = start;
  start();
  return ()=>{ clearInterval(spawnId); clearInterval(timerId); };
}
