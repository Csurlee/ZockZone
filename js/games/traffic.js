import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','trfScore'],['Rekord','trfBest']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const canvas=document.createElement('canvas'); canvas.width=240; canvas.height=400;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Pfeiltasten links/rechts oder Tap auf die Seiten zum Spurwechsel.'));
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',start);
  const LANES=[30,110,190];
  let lane, cars, score, best=0, alive, speed, loopId, frame;
  function start(){
    lane=1; cars=[]; score=0; alive=true; speed=3; frame=0;
    document.getElementById('trfScore').textContent=0;
    document.getElementById('trfBest').textContent=best;
    over.classList.remove('show');
    if(loopId) cancelAnimationFrame(loopId);
    loop();
  }
  function loop(){
    frame++;
    if(frame%Math.max(30,60-Math.floor(speed*4))===0){
      const l=Math.floor(Math.random()*3);
      cars.push({lane:l, y:-40, passed:false});
    }
    cars.forEach(c=>c.y+=speed);
    cars.forEach(c=>{
      if(!c.passed && c.y>360){ c.passed=true; score++; document.getElementById('trfScore').textContent=score; speed=3+score*0.08; }
    });
    cars=cars.filter(c=>c.y<420);
    cars.forEach(c=>{
      if(c.lane===lane && c.y>320 && c.y<380) die();
    });
    draw();
    if(alive) loopId=requestAnimationFrame(loop);
  }
  function die(){
    if(!alive) return;
    alive=false;
    if(score>best){ best=score; document.getElementById('trfBest').textContent=best; }
    over.querySelector('div').textContent='Crash! Punkte: '+score;
    over.classList.add('show');
  }
  function draw(){
    ctx.fillStyle='#1F2937'; ctx.fillRect(0,0,240,400);
    ctx.strokeStyle='#6B7280'; ctx.setLineDash([10,10]);
    [80,160].forEach(x=>{ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,400); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.fillStyle='#FF6B4A';
    cars.forEach(c=> ctx.fillRect(LANES[c.lane]-15, c.y, 30, 46));
    ctx.fillStyle='#C6FF3D'; ctx.fillRect(LANES[lane]-15,335,30,46);
  }
  function key(e){
    if(e.key==='ArrowLeft') lane=Math.max(0,lane-1);
    else if(e.key==='ArrowRight') lane=Math.min(2,lane+1);
  }
  document.addEventListener('keydown', key);
  canvas.addEventListener('click', e=>{
    const rect=canvas.getBoundingClientRect();
    const x=(e.clientX-rect.left)*(canvas.width/rect.width);
    if(x<80) lane=Math.max(0,lane-1); else if(x>160) lane=Math.min(2,lane+1);
  });
  window.__restartCurrent=start;
  start();
  return ()=>{ cancelAnimationFrame(loopId); document.removeEventListener('keydown', key); };
}
