import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','invScore'],['Leben','invLives']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const canvas=document.createElement('canvas'); canvas.width=360; canvas.height=380;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Pfeile links/rechts bewegen, Leertaste schießt.'));
  addLeaderboardUI('invaders', 'Space Invaders');
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',start);
  let playerX, bullets, enemies, eDir, score, lives, keys, loopId, frame;
  function start(){
    playerX=170; bullets=[]; score=0; lives=3; keys={}; eDir=1; frame=0;
    enemies=[];
    for(let r=0;r<4;r++)for(let c=0;c<7;c++) enemies.push({x:30+c*40,y:30+r*30,alive:true});
    document.getElementById('invScore').textContent=0;
    document.getElementById('invLives').textContent=lives;
    over.classList.remove('show');
    if(loopId) cancelAnimationFrame(loopId);
    loop();
  }
  function loop(){
    frame++;
    if(keys['ArrowLeft']) playerX=Math.max(0,playerX-4);
    if(keys['ArrowRight']) playerX=Math.min(340,playerX+4);
    bullets.forEach(b=>b.y-=6); bullets=bullets.filter(b=>b.y>0);
    if(frame%40===0){
      let hitEdge=false;
      enemies.forEach(en=>{ if(en.alive){ en.x+=eDir*8; if(en.x<10||en.x>330) hitEdge=true; } });
      if(hitEdge){ eDir*=-1; enemies.forEach(en=>en.y+=14); }
    }
    bullets.forEach(b=>{
      enemies.forEach(en=>{
        if(en.alive && Math.abs(b.x-en.x-10)<12 && Math.abs(b.y-en.y-8)<10){
          en.alive=false; b.dead=true; score+=10; document.getElementById('invScore').textContent=score;
        }
      });
    });
    bullets=bullets.filter(b=>!b.dead);
    if(enemies.some(en=>en.alive && en.y>320)) lives=0;
    if(enemies.every(en=>!en.alive)){
      for(let r=0;r<4;r++)for(let c=0;c<7;c++) enemies.push({x:30+c*40,y:30+r*30,alive:true});
    }
    if(lives<=0){
      over.querySelector('div').textContent='Invasion erfolgreich (gegen dich)! Punkte: '+score;
      over.classList.add('show');
      if(window.zzSaveHighScore) window.zzSaveHighScore('invaders','Space Invaders',score);
      draw();
      return;
    }
    draw();
    loopId=requestAnimationFrame(loop);
  }
  function draw(){
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,360,380);
    ctx.fillStyle='#86EFAC';
    enemies.forEach(en=>{ if(en.alive) ctx.fillRect(en.x,en.y,20,16); });
    ctx.fillStyle='#FDE68A';
    bullets.forEach(b=> ctx.fillRect(b.x-2,b.y-8,4,8));
    ctx.fillStyle='#C6FF3D'; ctx.fillRect(playerX,355,20,16);
  }
  function shoot(){ bullets.push({x:playerX+10,y:355}); }
  function key(e,down){
    keys[e.key]=down;
    if(e.code==='Space' && down){ e.preventDefault(); shoot(); }
  }
  const kd=e=>key(e,true), ku=e=>key(e,false);
  document.addEventListener('keydown', kd);
  document.addEventListener('keyup', ku);
  canvas.addEventListener('touchstart', shoot);
  window.__restartCurrent=start;
  start();
  return ()=>{ cancelAnimationFrame(loopId); document.removeEventListener('keydown',kd); document.removeEventListener('keyup',ku); };
}
