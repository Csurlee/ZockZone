import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','astScore'],['Leben','astLives']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const canvas=document.createElement('canvas'); canvas.width=360; canvas.height=360;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Pfeile links/rechts drehen, oben Schub, Leertaste schießt.'));
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',start);
  let ship, bullets, rocks, score, lives, keys, loopId;
  function start(){
    ship={x:180,y:180,a:-Math.PI/2,vx:0,vy:0};
    bullets=[]; rocks=[]; score=0; lives=3; keys={};
    for(let i=0;i<5;i++) spawnRock();
    document.getElementById('astScore').textContent=0;
    document.getElementById('astLives').textContent=lives;
    over.classList.remove('show');
    if(loopId) cancelAnimationFrame(loopId);
    loop();
  }
  function spawnRock(){
    let x,y;
    do{ x=Math.random()*360; y=Math.random()*360; }while(Math.hypot(x-180,y-180)<80);
    rocks.push({x,y,vx:(Math.random()-0.5)*2,vy:(Math.random()-0.5)*2,r:22});
  }
  function loop(){
    if(keys['ArrowLeft']) ship.a-=0.06;
    if(keys['ArrowRight']) ship.a+=0.06;
    if(keys['ArrowUp']){ ship.vx+=Math.cos(ship.a)*0.12; ship.vy+=Math.sin(ship.a)*0.12; }
    ship.vx*=0.99; ship.vy*=0.99;
    ship.x=(ship.x+ship.vx+360)%360; ship.y=(ship.y+ship.vy+360)%360;
    bullets.forEach(b=>{ b.x+=b.vx; b.y+=b.vy; b.life--; });
    bullets=bullets.filter(b=>b.life>0);
    rocks.forEach(r=>{ r.x=(r.x+r.vx+360)%360; r.y=(r.y+r.vy+360)%360; });
    bullets.forEach(b=>{
      rocks.forEach(r=>{
        if(!r.dead && Math.hypot(b.x-r.x,b.y-r.y)<r.r){
          r.dead=true; b.life=0; score+=10; document.getElementById('astScore').textContent=score;
        }
      });
    });
    rocks=rocks.filter(r=>!r.dead);
    if(rocks.length===0){ for(let i=0;i<5;i++) spawnRock(); }
    let hitThisFrame=false;
    rocks.forEach(r=>{
      if(hitThisFrame) return;
      if(Math.hypot(ship.x-r.x,ship.y-r.y)<r.r+8){
        hitThisFrame=true;
        lives--; document.getElementById('astLives').textContent=lives;
        ship.x=180; ship.y=180; ship.vx=0; ship.vy=0;
        r.dead=true;
        if(lives<=0){ over.querySelector('div').textContent='Zerstört! Punkte: '+score; over.classList.add('show'); }
      }
    });
    rocks=rocks.filter(r=>!r.dead);
    draw();
    if(lives>0) loopId=requestAnimationFrame(loop);
  }
  function draw(){
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,360,360);
    ctx.save(); ctx.translate(ship.x,ship.y); ctx.rotate(ship.a);
    ctx.fillStyle='#C6FF3D'; ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(-10,-8); ctx.lineTo(-10,8); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle='#FF6B4A';
    bullets.forEach(b=> ctx.fillRect(b.x-2,b.y-2,4,4));
    ctx.strokeStyle='#93C5FD'; ctx.lineWidth=2;
    rocks.forEach(r=>{ ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,7); ctx.stroke(); });
  }
  function key(e,down){
    keys[e.key]=down;
    if(e.code==='Space' && down){
      e.preventDefault();
      bullets.push({x:ship.x+Math.cos(ship.a)*14, y:ship.y+Math.sin(ship.a)*14, vx:Math.cos(ship.a)*5, vy:Math.sin(ship.a)*5, life:60});
    }
  }
  const kd=e=>key(e,true), ku=e=>key(e,false);
  document.addEventListener('keydown', kd);
  document.addEventListener('keyup', ku);
  window.__restartCurrent=start;
  start();
  return ()=>{ cancelAnimationFrame(loopId); document.removeEventListener('keydown',kd); document.removeEventListener('keyup',ku); };
}
