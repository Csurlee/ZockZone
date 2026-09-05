import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Level','mazeLevel'],['Zeit','mazeTime']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const canvas=document.createElement('canvas'); canvas.width=320; canvas.height=320;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Pfeiltasten/Swipe: Finde den Weg zum grünen Ausgang.'));
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',()=>start(1));
  const N=8, CELL=40;
  let cells, px, py, level=1, timeLeft, timerId, levelTimeoutId;
  function genMaze(){
    cells=Array.from({length:N},()=>Array.from({length:N},()=>({N:true,S:true,E:true,W:true,visited:false})));
    function carve(x,y){
      cells[y][x].visited=true;
      const dirs=[['N',0,-1,'S'],['S',0,1,'N'],['E',1,0,'W'],['W',-1,0,'E']].sort(()=>Math.random()-0.5);
      dirs.forEach(([d,dx,dy,opp])=>{
        const nx=x+dx, ny=y+dy;
        if(nx>=0&&nx<N&&ny>=0&&ny<N&&!cells[ny][nx].visited){
          cells[y][x][d]=false; cells[ny][nx][opp]=false;
          carve(nx,ny);
        }
      });
    }
    carve(0,0);
  }
  function start(lvl){
    level=lvl; timeLeft=45-Math.min(20,level*3);
    document.getElementById('mazeLevel').textContent=level;
    document.getElementById('mazeTime').textContent=timeLeft;
    over.classList.remove('show');
    genMaze();
    px=0; py=0;
    if(timerId) clearInterval(timerId);
    if(levelTimeoutId) clearTimeout(levelTimeoutId);
    timerId=setInterval(()=>{
      timeLeft--; document.getElementById('mazeTime').textContent=timeLeft;
      if(timeLeft<=0){ clearInterval(timerId); over.querySelector('div').textContent='Zeit abgelaufen!'; over.classList.add('show'); }
    },1000);
    draw();
  }
  function draw(){
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,320,320);
    ctx.strokeStyle='#7C3AED'; ctx.lineWidth=2;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const c=cells[y][x], px0=x*CELL, py0=y*CELL;
      ctx.beginPath();
      if(c.N){ ctx.moveTo(px0,py0); ctx.lineTo(px0+CELL,py0); }
      if(c.S){ ctx.moveTo(px0,py0+CELL); ctx.lineTo(px0+CELL,py0+CELL); }
      if(c.E){ ctx.moveTo(px0+CELL,py0); ctx.lineTo(px0+CELL,py0+CELL); }
      if(c.W){ ctx.moveTo(px0,py0); ctx.lineTo(px0,py0+CELL); }
      ctx.stroke();
    }
    ctx.fillStyle='#C6FF3D'; ctx.fillRect((N-1)*CELL+10,(N-1)*CELL+10,20,20);
    ctx.fillStyle='#FF6B4A'; ctx.beginPath(); ctx.arc(px*CELL+20,py*CELL+20,10,0,7); ctx.fill();
  }
  function tryMove(dx,dy,wallKey){
    const c=cells[py][px];
    if(!c[wallKey]){ px+=dx; py+=dy; draw();
      if(px===N-1 && py===N-1){
        clearInterval(timerId);
        over.querySelector('div').textContent='Level '+level+' geschafft! 🎉';
        over.classList.add('show');
        levelTimeoutId=setTimeout(()=>{ over.classList.remove('show'); start(level+1); }, 1200);
      }
    }
  }
  function key(e){
    if(e.key==='ArrowUp') tryMove(0,-1,'N');
    else if(e.key==='ArrowDown') tryMove(0,1,'S');
    else if(e.key==='ArrowLeft') tryMove(-1,0,'W');
    else if(e.key==='ArrowRight') tryMove(1,0,'E');
  }
  document.addEventListener('keydown', key);
  let tStart=null;
  canvas.addEventListener('touchstart', e=>{ tStart=e.touches[0]; });
  canvas.addEventListener('touchend', e=>{
    if(!tStart) return;
    const dx=e.changedTouches[0].clientX-tStart.clientX;
    const dy=e.changedTouches[0].clientY-tStart.clientY;
    if(Math.abs(dx)>Math.abs(dy)) tryMove(dx>0?1:-1,0, dx>0?'E':'W');
    else tryMove(0,dy>0?1:-1, dy>0?'S':'N');
  });
  window.__restartCurrent=()=>start(1);
  start(1);
  return ()=>{ clearInterval(timerId); clearTimeout(levelTimeoutId); document.removeEventListener('keydown', key); };
}
