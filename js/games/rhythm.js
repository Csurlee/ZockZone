import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','rhyScore'],['Combo','rhyCombo']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='340px';
  const canvas=document.createElement('canvas'); canvas.width=320; canvas.height=100;
  wrap.appendChild(canvas);
  const tapBtn=mkButton('TAP!');
  tapBtn.style.width='100%'; tapBtn.style.padding='24px'; tapBtn.style.fontSize='22px';
  playerBody.append(scoreEl, wrap, tapBtn, mkHint('Tippe im Takt, wenn der Marker die Ziellinie erreicht. 20 Runden.'));
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',start);
  let pos, dir, score, combo, round, speed, loopId;
  function start(){
    pos=0; dir=1; score=0; combo=0; round=0; speed=3;
    document.getElementById('rhyScore').textContent=0;
    document.getElementById('rhyCombo').textContent=0;
    over.classList.remove('show');
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
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,320,100);
    ctx.fillStyle='#7C3AED'; ctx.fillRect(140,0,40,100);
    ctx.fillStyle='#C6FF3D'; ctx.fillRect(pos,10,20,80);
  }
  tapBtn.onclick=()=>{
    round++;
    const dist=Math.abs(pos+10-160);
    if(dist<25){ score+=Math.max(1,10-Math.floor(dist/3)); combo++; }
    else combo=0;
    document.getElementById('rhyScore').textContent=score;
    document.getElementById('rhyCombo').textContent=combo;
    if(round>=20){
      cancelAnimationFrame(loopId);
      over.querySelector('div').textContent='Fertig! Punkte: '+score;
      over.classList.add('show');
    }
  };
  window.__restartCurrent=start;
  start();
  return ()=>{ cancelAnimationFrame(loopId); };
}
