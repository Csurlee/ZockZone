import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Du','ahP'],['CPU','ahC']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const canvas=document.createElement('canvas'); canvas.width=400; canvas.height=260;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Bewege deinen Schläger (linke Hälfte) mit Maus/Touch. Erster auf 7 Tore gewinnt.'));
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',start);
  let paddle, cpu, puck, pScore, cScore, loopId;
  function resetPuck(dir){ puck={x:200,y:130,vx:3*dir,vy:(Math.random()*4-2)}; }
  function start(){
    paddle={x:60,y:130}; cpu={x:340,y:130};
    resetPuck(Math.random()<0.5?1:-1);
    pScore=0; cScore=0;
    document.getElementById('ahP').textContent=0;
    document.getElementById('ahC').textContent=0;
    over.classList.remove('show');
    if(loopId) cancelAnimationFrame(loopId);
    loop();
  }
  function loop(){
    puck.x+=puck.vx; puck.y+=puck.vy;
    // 1) Bande: Puck zurück aufs Feld schieben (sonst "zittert" er außerhalb und bleibt hängen)
    if(puck.y<12){ puck.y=12; puck.vy=Math.abs(puck.vy); }
    if(puck.y>248){ puck.y=248; puck.vy=-Math.abs(puck.vy); }
    [paddle,cpu].forEach(p=>{
      const d=Math.hypot(puck.x-p.x, puck.y-p.y);
      if(d<28){
        const ang=Math.atan2(puck.y-p.y, puck.x-p.x);
        // 3) Puck aus dem Schläger herausschieben, damit er nicht jedes Bild neu "getroffen" wird
        puck.x=p.x+Math.cos(ang)*29; puck.y=p.y+Math.sin(ang)*29;
        const vRel=puck.vx*Math.cos(ang)+puck.vy*Math.sin(ang);
        if(vRel<6){ sfx.puckHit(); puck.vx=Math.cos(ang)*6; puck.vy=Math.sin(ang)*6; }
        // nie fast senkrecht: immer etwas Richtung Gegner-Tor
        const toward = p===cpu ? -1 : 1;
        if(Math.abs(puck.vx)<1.5) puck.vx=1.5*toward;
      }
    });
    if(puck.x<0){ cScore++; sfx.score(); document.getElementById('ahC').textContent=cScore; resetPuck(-1); }
    if(puck.x>400){ pScore++; sfx.score(); document.getElementById('ahP').textContent=pScore; resetPuck(1); }
    // 2) Computer-Gegner: nicht an die Bande kleben und den Puck nicht gegen die Wand drücken
    const dy=puck.y-cpu.y;
    const behind = puck.x > cpu.x - 5;   // Puck ist hinter/neben dem Computer
    if(puck.x>200 && !behind){
      cpu.y+=Math.sign(dy)*Math.min(Math.abs(dy),3);
      cpu.x+=((puck.x+40)-cpu.x)*0.06;          // dem Puck entgegen, aber von rechts kommend
    } else if(behind){
      cpu.x+=(385-cpu.x)*0.15;                  // zurück vors eigene Tor
      cpu.y+=((puck.y<130? puck.y+45 : puck.y-45)-cpu.y)*0.12;   // seitlich ausweichen statt einklemmen
    } else {
      cpu.x+=(340-cpu.x)*0.08;
      cpu.y+=(130-cpu.y)*0.08;
    }
    cpu.x=Math.max(230,Math.min(390,cpu.x)); cpu.y=Math.max(30,Math.min(230,cpu.y));
    draw();
    if(pScore>=7||cScore>=7){ over.querySelector('div').textContent = (pScore>=7?sfx.win():sfx.lose(), pScore>=7?'Du gewinnst! 🎉':'CPU gewinnt.'); over.classList.add('show'); return; }
    loopId=requestAnimationFrame(loop);
  }
  function draw(){
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,400,260);
    ctx.strokeStyle='#3a2f5c'; ctx.beginPath(); ctx.moveTo(200,0); ctx.lineTo(200,260); ctx.stroke();
    ctx.fillStyle='#C6FF3D'; ctx.beginPath(); ctx.arc(paddle.x,paddle.y,22,0,7); ctx.fill();
    ctx.fillStyle='#FF6B4A'; ctx.beginPath(); ctx.arc(cpu.x,cpu.y,22,0,7); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(puck.x,puck.y,10,0,7); ctx.fill();
  }
  function move(e){
    const rect=canvas.getBoundingClientRect();
    const sx=canvas.width/rect.width, sy=canvas.height/rect.height;
    const x=((e.touches?e.touches[0].clientX:e.clientX)-rect.left)*sx;
    const y=((e.touches?e.touches[0].clientY:e.clientY)-rect.top)*sy;
    paddle.x=Math.max(10,Math.min(190,x));
    paddle.y=Math.max(12,Math.min(248,y));
  }
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('touchmove', e=>{ e.preventDefault(); move(e); });
  window.__restartCurrent=start;
  start();
  return ()=>{ cancelAnimationFrame(loopId); canvas.removeEventListener('mousemove',move); };
}
