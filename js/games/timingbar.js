import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','tbScore'],['Runde','tbRound']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='340px';
  const canvas=document.createElement('canvas'); canvas.width=320; canvas.height=60;
  const stopBtn=mkButton('STOPP!');
  stopBtn.style.width='100%'; stopBtn.style.padding='20px'; stopBtn.style.fontSize='20px';
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, stopBtn, mkHint('Stoppe den Marker in der grünen Zone. 8 Runden.'));
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',start);
  let pos, dir, score, round, speed, zoneStart, loopId, nextRoundTimeoutId;
  function start(){
    score=0; round=0;
    document.getElementById('tbScore').textContent=0;
    document.getElementById('tbRound').textContent=round;
    over.classList.remove('show');
    stopBtn.disabled=false;
    nextRound();
  }
  function nextRound(){
    pos=0; dir=1; speed=3+round*0.4;
    zoneStart=40+Math.random()*200;
    if(loopId) cancelAnimationFrame(loopId);
    loop();
  }
  function loop(){
    pos+=dir*speed;
    if(pos>300||pos<0) dir*=-1;
    draw();
    loopId=requestAnimationFrame(loop);
  }
  function draw(){
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,320,60);
    ctx.fillStyle='#16A34A'; ctx.fillRect(zoneStart,20,40,20);
    ctx.fillStyle='#C6FF3D'; ctx.fillRect(pos,10,10,40);
  }
  stopBtn.onclick=()=>{
    cancelAnimationFrame(loopId);
    round++;
    document.getElementById('tbRound').textContent=round;
    if(pos+5>zoneStart && pos+5<zoneStart+40){ score+=10; }
    document.getElementById('tbScore').textContent=score;
    if(round>=8){
      stopBtn.disabled=true;
      over.querySelector('div').textContent='Fertig! Punkte: '+score;
      over.classList.add('show');
    } else nextRoundTimeoutId=setTimeout(nextRound, 600);
  };
  window.__restartCurrent=start;
  start();
  return ()=>{ cancelAnimationFrame(loopId); clearTimeout(nextRoundTimeoutId); };
}
