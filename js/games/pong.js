import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl = hud(['Du','pongP'], ['CPU','pongC']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const canvas=document.createElement('canvas'); canvas.width=400; canvas.height=280;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Maus/Touch bewegt deinen Schläger. Erster auf 5 Punkte gewinnt.'));
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',start);
  let pY,cY,ball,pScore,cScore,loopId;
  const PH=60,PW=10;
  function start(){
    pY=110; cY=110; ball={x:200,y:140,vx:4,vy:3}; pScore=0; cScore=0;
    document.getElementById('pongP').textContent=0;
    document.getElementById('pongC').textContent=0;
    over.classList.remove('show');
    if(loopId) cancelAnimationFrame(loopId);
    loop();
  }
  function loop(){
    ball.x+=ball.vx; ball.y+=ball.vy;
    if(ball.y<0||ball.y>280) ball.vy*=-1;
    if(ball.x<20 && ball.y>pY && ball.y<pY+PH){ ball.vx=Math.abs(ball.vx)*1.03; ball.x=20; }
    if(ball.x>380 && ball.y>cY && ball.y<cY+PH){ ball.vx=-Math.abs(ball.vx)*1.03; ball.x=380; }
    if(ball.x<0){ cScore++; document.getElementById('pongC').textContent=cScore; reset(); }
    if(ball.x>400){ pScore++; document.getElementById('pongP').textContent=pScore; reset(); }
    const cCenter=cY+PH/2;
    if(cCenter < ball.y-8) cY+=3.2; else if(cCenter>ball.y+8) cY-=3.2;
    cY=Math.max(0,Math.min(220,cY));
    draw();
    if(pScore>=5 || cScore>=5){ over.querySelector('div').textContent = pScore>=5?'Du gewinnst! 🎉':'CPU gewinnt.'; over.classList.add('show'); return; }
    loopId=requestAnimationFrame(loop);
  }
  function reset(){ ball={x:200,y:140,vx:(Math.random()<0.5?4:-4),vy:(Math.random()*4-2)}; }
  function draw(){
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,400,280);
    ctx.fillStyle='#C6FF3D'; ctx.fillRect(10,pY,PW,PH);
    ctx.fillStyle='#FF6B4A'; ctx.fillRect(380,cY,PW,PH);
    ctx.fillStyle='#fff'; ctx.fillRect(ball.x-5,ball.y-5,10,10);
  }
  function move(e){
    const rect=canvas.getBoundingClientRect();
    const y=((e.touches?e.touches[0].clientY:e.clientY)-rect.top)*(canvas.height/rect.height);
    pY=Math.max(0,Math.min(220,y-PH/2));
  }
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('touchmove', e=>{e.preventDefault(); move(e);});
  window.__restartCurrent=start;
  start();
  return ()=>{ cancelAnimationFrame(loopId); canvas.removeEventListener('mousemove',move); };
}
