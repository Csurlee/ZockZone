import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','frtScore'],['Leben','frtLives']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const canvas=document.createElement('canvas'); canvas.width=340; canvas.height=400;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Klicke Früchte, bevor sie den Boden erreichen. Vermeide die Bomben 💣!'));
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',start);
  const FRUITS=['🍎','🍋','🍇','🍉','🍓'];
  let items, score, lives, spawnId, loopId;
  function start(){
    items=[]; score=0; lives=3;
    document.getElementById('frtScore').textContent=0;
    document.getElementById('frtLives').textContent=lives;
    over.classList.remove('show');
    if(spawnId) clearInterval(spawnId);
    if(loopId) cancelAnimationFrame(loopId);
    spawnId=setInterval(()=>{
      const isBomb=Math.random()<0.2;
      items.push({x:30+Math.random()*280, y:-20, vy:2+Math.random()*1.5, icon:isBomb?'💣':FRUITS[Math.floor(Math.random()*FRUITS.length)], bomb:isBomb});
    }, 700);
    loop();
  }
  function loop(){
    items.forEach(it=>it.y+=it.vy);
    const missed=items.filter(it=>it.y>420 && !it.bomb);
    if(missed.length){ lives-=missed.length; document.getElementById('frtLives').textContent=Math.max(0,lives); }
    items=items.filter(it=>it.y<=420);
    if(lives<=0){
      clearInterval(spawnId);
      over.querySelector('div').textContent='Game Over! Punkte: '+score;
      over.classList.add('show');
      draw();
      return;
    }
    draw();
    loopId=requestAnimationFrame(loop);
  }
  function draw(){
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,340,400);
    ctx.font='32px sans-serif'; ctx.textAlign='center';
    items.forEach(it=> ctx.fillText(it.icon, it.x, it.y));
  }
  canvas.addEventListener('click', e=>{
    const rect=canvas.getBoundingClientRect();
    const x=e.clientX-rect.left, y=e.clientY-rect.top;
    for(let i=items.length-1;i>=0;i--){
      const it=items[i];
      if(Math.hypot(x-it.x,y-it.y)<24){
        if(it.bomb){ lives--; document.getElementById('frtLives').textContent=Math.max(0,lives); }
        else{ score++; document.getElementById('frtScore').textContent=score; }
        items.splice(i,1);
        break;
      }
    }
  });
  window.__restartCurrent=start;
  start();
  return ()=>{ clearInterval(spawnId); cancelAnimationFrame(loopId); };
}
