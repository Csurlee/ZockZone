import { hud, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Bestzeit','reactBest']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='340px';
  const box=document.createElement('div');
  box.style.cssText='width:100%;height:220px;border-radius:16px;background:#DC2626;display:flex;align-items:center;justify-content:center;font-family:Fredoka;font-weight:700;font-size:20px;color:#fff;cursor:pointer;text-align:center;padding:20px;';
  box.textContent='Warte auf Grün…';
  wrap.appendChild(box);
  playerBody.append(scoreEl, wrap, mkHint('Klicke, sobald das Feld grün wird. Zu früh geklickt = Neustart.'));
  let best=null, state, timeoutId, startTime;
  function start(){
    state='waiting'; box.style.background='#DC2626'; box.textContent='Warte auf Grün…';
    const delay=1200+Math.random()*2500;
    timeoutId=setTimeout(()=>{
      state='go'; box.style.background='#16A34A'; box.textContent='JETZT KLICKEN!';
      startTime=performance.now();
    }, delay);
  }
  box.onclick=()=>{
    if(state==='waiting'){
      clearTimeout(timeoutId);
      box.style.background='#F59E0B'; box.textContent='Zu früh! Nochmal…';
      state='idle';
      setTimeout(start, 900);
    } else if(state==='go'){
      const t=Math.round(performance.now()-startTime);
      if(best===null || t<best){ best=t; document.getElementById('reactBest').textContent=t+'ms'; }
      box.style.background='#2563EB'; box.textContent=`${t}ms — nochmal!`;
      state='idle';
      setTimeout(start, 1000);
    }
  };
  window.__restartCurrent=start;
  start();
  return ()=>{ clearTimeout(timeoutId); };
}
