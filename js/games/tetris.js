import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','tetScore'],['Level','tetLevel']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const canvas=document.createElement('canvas'); canvas.width=200; canvas.height=360;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Pfeiltasten: links/rechts bewegen, oben drehen, unten fallen lassen. Touch: Swipe.'));
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',start);
  const COLS=10, ROWS=18, CELL=20;
  const SHAPES=[
    [[1,1,1,1]],
    [[1,1],[1,1]],
    [[0,1,0],[1,1,1]],
    [[1,0],[1,0],[1,1]],
    [[0,1],[0,1],[1,1]],
    [[1,1,0],[0,1,1]],
    [[0,1,1],[1,1,0]],
  ];
  const COLORS=['#67E8F9','#FDE68A','#C4B5FD','#FDBA74','#93C5FD','#86EFAC','#FCA5A5'];
  let grid, cur, curColor, curX, curY, score, level, dropInterval, loopId, lastDrop;
  function start(){
    grid=Array.from({length:ROWS},()=>Array(COLS).fill(0));
    score=0; level=1; dropInterval=600; lastDrop=null;
    document.getElementById('tetScore').textContent=0;
    document.getElementById('tetLevel').textContent=1;
    over.classList.remove('show');
    spawn();
    if(loopId) cancelAnimationFrame(loopId);
    loop();
  }
  function spawn(){
    const idx=Math.floor(Math.random()*SHAPES.length);
    cur=SHAPES[idx].map(r=>[...r]); curColor=COLORS[idx];
    curX=Math.floor(COLS/2)-Math.ceil(cur[0].length/2); curY=0;
    if(collide(cur,curX,curY)){
      cancelAnimationFrame(loopId);
      over.querySelector('div').textContent='Game Over! Punkte: '+score;
      over.classList.add('show');
    }
  }
  function collide(shape,ox,oy){
    for(let y=0;y<shape.length;y++)for(let x=0;x<shape[y].length;x++){
      if(!shape[y][x]) continue;
      const nx=ox+x, ny=oy+y;
      if(nx<0||nx>=COLS||ny>=ROWS) return true;
      if(ny>=0 && grid[ny][nx]) return true;
    }
    return false;
  }
  function merge(){
    cur.forEach((row,y)=>row.forEach((v,x)=>{ if(v && curY+y>=0) grid[curY+y][curX+x]=curColor; }));
  }
  function clearLines(){
    let cleared=0;
    for(let y=ROWS-1;y>=0;y--){
      if(grid[y].every(v=>v)){
        grid.splice(y,1); grid.unshift(Array(COLS).fill(0)); cleared++; y++;
      }
    }
    if(cleared){
      score += cleared*100; document.getElementById('tetScore').textContent=score;
      level = 1+Math.floor(score/500); document.getElementById('tetLevel').textContent=level;
      dropInterval=Math.max(150,600-level*40);
    }
  }
  function rotate(){
    const rotated=cur[0].map((_,i)=>cur.map(row=>row[i]).reverse());
    if(!collide(rotated,curX,curY)) cur=rotated;
  }
  function move(dx){ if(!collide(cur,curX+dx,curY)) curX+=dx; draw(); }
  function softDrop(){
    if(!collide(cur,curX,curY+1)) curY++;
    else { merge(); clearLines(); spawn(); }
    draw();
  }
  function loop(now){
    if(!lastDrop) lastDrop=now||performance.now();
    if((now||performance.now())-lastDrop>dropInterval){ softDrop(); lastDrop=now||performance.now(); }
    loopId=requestAnimationFrame(loop);
  }
  function draw(){
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,200,360);
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(grid[y][x]){ ctx.fillStyle=grid[y][x]; ctx.fillRect(x*CELL+1,y*CELL+1,CELL-2,CELL-2); }
    }
    ctx.fillStyle=curColor;
    cur.forEach((row,y)=>row.forEach((v,x)=>{ if(v) ctx.fillRect((curX+x)*CELL+1,(curY+y)*CELL+1,CELL-2,CELL-2); }));
  }
  function key(e){
    if(e.key==='ArrowLeft') move(-1);
    else if(e.key==='ArrowRight') move(1);
    else if(e.key==='ArrowDown') softDrop();
    else if(e.key==='ArrowUp'){ rotate(); draw(); }
  }
  document.addEventListener('keydown', key);
  let tStart=null;
  canvas.addEventListener('touchstart', e=>{ tStart=e.touches[0]; });
  canvas.addEventListener('touchend', e=>{
    if(!tStart) return;
    const dx=e.changedTouches[0].clientX-tStart.clientX;
    const dy=e.changedTouches[0].clientY-tStart.clientY;
    if(Math.abs(dx)>Math.abs(dy)){ if(Math.abs(dx)>20) move(dx>0?1:-1); }
    else{ if(dy>20) softDrop(); else if(dy<-20){ rotate(); draw(); } }
  });
  window.__restartCurrent=start;
  start(); draw();
  return ()=>{ cancelAnimationFrame(loopId); document.removeEventListener('keydown', key); };
}
