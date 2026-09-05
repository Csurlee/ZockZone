import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','drtScore'],['Wurf','drtThrow']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const canvas=document.createElement('canvas'); canvas.width=300; canvas.height=300;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Klicke, wenn der Ring die Mitte der Zielscheibe trifft. 10 Würfe.'));
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',start);
  let angle, score, throwsLeft, loopId;
  function start(){
    angle=0; score=0; throwsLeft=10;
    document.getElementById('drtScore').textContent=0;
    document.getElementById('drtThrow').textContent=throwsLeft;
    over.classList.remove('show');
    if(loopId) cancelAnimationFrame(loopId);
    loop();
  }
  function loop(){ angle+=0.06; draw(); loopId=requestAnimationFrame(loop); }
  function draw(){
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,300,300);
    const cx=150,cy=150;
    [120,90,60,30].forEach((r,i)=>{ ctx.fillStyle=['#7C3AED','#A78BFA','#F59E0B','#C6FF3D'][i]; ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.fill(); });
    const r=Math.abs(Math.sin(angle))*120;
    ctx.strokeStyle='#fff'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.stroke();
  }
  canvas.addEventListener('click', ()=>{
    if(throwsLeft<=0) return;
    const r=Math.abs(Math.sin(angle))*120;
    let pts=0;
    if(r<30) pts=50; else if(r<60) pts=30; else if(r<90) pts=20; else if(r<120) pts=10;
    score+=pts; throwsLeft--;
    document.getElementById('drtScore').textContent=score;
    document.getElementById('drtThrow').textContent=throwsLeft;
    if(throwsLeft<=0){
      cancelAnimationFrame(loopId);
      over.querySelector('div').textContent='Fertig! Gesamt: '+score+' Punkte';
      over.classList.add('show');
    }
  });
  window.__restartCurrent=start;
  start();
  return ()=>{ cancelAnimationFrame(loopId); };
}
