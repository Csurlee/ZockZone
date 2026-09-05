import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','runScore'],['Rekord','runBest']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const canvas=document.createElement('canvas'); canvas.width=360; canvas.height=200;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Leertaste / Klick / Tap zum Springen. Weiche den Hindernissen aus.'));
  addLeaderboardUI('runner', 'Runner Jump');
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',start);
  let player, obstacles, score, best=0, alive, speed, loopId, frame;
  function start(){
    player={y:150, vy:0, jumping:false};
    obstacles=[]; score=0; alive=true; speed=4; frame=0;
    document.getElementById('runScore').textContent=0;
    document.getElementById('runBest').textContent=best;
    over.classList.remove('show');
    if(loopId) cancelAnimationFrame(loopId);
    loop();
  }
  function jump(){ if(!player.jumping && alive){ player.vy=-9; player.jumping=true; } }
  function loop(){
    frame++;
    player.vy+=0.5; player.y+=player.vy;
    if(player.y>150){ player.y=150; player.vy=0; player.jumping=false; }
    if(frame%70===0) obstacles.push({x:360, w:16, h:30+Math.random()*20, passed:false});
    obstacles.forEach(o=>o.x-=speed);
    obstacles=obstacles.filter(o=>o.x>-20);
    obstacles.forEach(o=>{
      if(!o.passed && o.x+o.w<40){ o.passed=true; score++; document.getElementById('runScore').textContent=score; speed=4+score*0.08; }
      if(40+18>o.x && 40-18<o.x+o.w && player.y+15>200-o.h){ die(); }
    });
    draw();
    if(alive) loopId=requestAnimationFrame(loop);
  }
  function die(){
    alive=false;
    if(score>best){ best=score; document.getElementById('runBest').textContent=best; }
    over.querySelector('div').textContent='Getroffen! Punkte: '+score;
    over.classList.add('show');
    if(window.zzSaveHighScore) window.zzSaveHighScore('runner','Runner Jump',score);
  }
  function draw(){
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,360,200);
    ctx.fillStyle='#241D3B'; ctx.fillRect(0,195,360,5);
    ctx.fillStyle='#FF6B4A';
    obstacles.forEach(o=> ctx.fillRect(o.x,200-o.h,o.w,o.h));
    ctx.fillStyle='#C6FF3D'; ctx.fillRect(24,player.y-15,32,30);
  }
  function key(e){ if(e.code==='Space'){ e.preventDefault(); jump(); } }
  document.addEventListener('keydown', key);
  canvas.addEventListener('mousedown', jump);
  canvas.addEventListener('touchstart', e=>{ e.preventDefault(); jump(); });
  window.__restartCurrent=start;
  start();
  return ()=>{ cancelAnimationFrame(loopId); document.removeEventListener('keydown', key); };
}
