import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','brkScore'],['Leben','brkLives']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const canvas=document.createElement('canvas'); canvas.width=360; canvas.height=420;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Maus/Touch bewegt den Schläger. Zerstöre alle Blöcke.'));
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',start);
  let paddleX,ball,bricks,score,lives,loopId;
  const ROWS=5, COLS=8, BW=40, BH=16, GAP=4;
  function start(){
    paddleX=150; ball={x:180,y:380,vx:3,vy:-3}; score=0; lives=3;
    bricks=[];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) bricks.push({x:c*(BW+GAP)+8, y:r*(BH+GAP)+30, alive:true});
    document.getElementById('brkScore').textContent=0;
    document.getElementById('brkLives').textContent=lives;
    over.classList.remove('show');
    if(loopId) cancelAnimationFrame(loopId);
    loop();
  }
  function loop(){
    ball.x+=ball.vx; ball.y+=ball.vy;
    if(ball.x<6||ball.x>354) ball.vx*=-1;
    if(ball.y<6) ball.vy*=-1;
    if(ball.y>400 && ball.y<412 && ball.x>paddleX && ball.x<paddleX+70){ ball.vy=-Math.abs(ball.vy); }
    else if(ball.y>420){
      lives--; document.getElementById('brkLives').textContent=lives;
      if(lives<=0){ over.querySelector('div').textContent='Game Over! Punkte: '+score; over.classList.add('show'); return; }
      ball={x:180,y:380,vx:3,vy:-3};
    }
    bricks.forEach(b=>{
      if(b.alive && ball.x>b.x && ball.x<b.x+BW && ball.y>b.y && ball.y<b.y+BH){
        b.alive=false; ball.vy*=-1; score+=10; document.getElementById('brkScore').textContent=score;
      }
    });
    if(bricks.every(b=>!b.alive)){ over.querySelector('div').textContent='Gewonnen! 🎉'; over.classList.add('show'); return; }
    draw();
    loopId=requestAnimationFrame(loop);
  }
  function draw(){
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,360,420);
    bricks.forEach(b=>{ if(b.alive){ ctx.fillStyle='#7C3AED'; ctx.fillRect(b.x,b.y,BW-2,BH-2);} });
    ctx.fillStyle='#C6FF3D'; ctx.fillRect(paddleX,405,70,10);
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ball.x,ball.y,6,0,7); ctx.fill();
  }
  function move(e){
    const rect=canvas.getBoundingClientRect();
    const x=(e.touches?e.touches[0].clientX:e.clientX)-rect.left;
    paddleX=Math.max(0,Math.min(290,x-35));
  }
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('touchmove', e=>{e.preventDefault(); move(e);});
  window.__restartCurrent=start;
  start();
  return ()=>{ cancelAnimationFrame(loopId); canvas.removeEventListener('mousemove',move); };
}
