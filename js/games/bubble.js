import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','bubScore'],['Leben','bubLives']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const canvas=document.createElement('canvas'); canvas.width=340; canvas.height=380;
  wrap.appendChild(canvas);
  const targetEl=document.createElement('div');
  targetEl.style.cssText='font-family:Fredoka;font-weight:700;text-align:center;';
  playerBody.append(scoreEl, targetEl, wrap, mkHint('Klicke nur Blasen in der Zielfarbe. Falsche Farbe kostet ein Leben.'));
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',start);
  const COLORS=['#DC2626','#2563EB','#16A34A','#F59E0B'];
  const NAMES={'#DC2626':'Rot','#2563EB':'Blau','#16A34A':'Grün','#F59E0B':'Gelb'};
  let bubbles, score, lives, target, spawnId, loopId;
  function start(){
    bubbles=[]; score=0; lives=3;
    document.getElementById('bubScore').textContent=0;
    document.getElementById('bubLives').textContent=lives;
    setTarget();
    over.classList.remove('show');
    if(spawnId) clearInterval(spawnId);
    if(loopId) cancelAnimationFrame(loopId);
    spawnId=setInterval(()=> bubbles.push({x:20+Math.random()*300,y:390,r:18,c:COLORS[Math.floor(Math.random()*4)],vy:1+Math.random()*1.2}), 550);
    loop();
  }
  function setTarget(){ target=COLORS[Math.floor(Math.random()*COLORS.length)]; targetEl.innerHTML=`Ziel: <span style="color:${target}">${NAMES[target]}</span>`; }
  function loop(){
    bubbles.forEach(b=>b.y-=b.vy);
    const escaped = bubbles.filter(b=>b.y<-20 && b.c===target);
    if(escaped.length){ lives-=escaped.length; document.getElementById('bubLives').textContent=Math.max(0,lives); }
    bubbles=bubbles.filter(b=>b.y>-20);
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
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,340,380);
    bubbles.forEach(b=>{ ctx.fillStyle=b.c; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,7); ctx.fill(); });
  }
  canvas.addEventListener('click', e=>{
    const rect=canvas.getBoundingClientRect();
    const x=e.clientX-rect.left, y=e.clientY-rect.top;
    for(let i=bubbles.length-1;i>=0;i--){
      const b=bubbles[i];
      if(Math.hypot(x-b.x,y-b.y)<b.r){
        if(b.c===target){ score++; document.getElementById('bubScore').textContent=score; setTarget(); }
        else{ lives--; document.getElementById('bubLives').textContent=Math.max(0,lives); }
        bubbles.splice(i,1);
        break;
      }
    }
  });
  window.__restartCurrent=start;
  start();
  return ()=>{ clearInterval(spawnId); cancelAnimationFrame(loopId); };
}
