import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

export function build(){
  const scoreEl = hud(['Punkte','snakeScore']);
  const wrap = document.createElement('div'); wrap.className='canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width=400; canvas.height=400;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Pfeiltasten / WASD zum Steuern. Swipe auf Mobile.'));
  addLeaderboardUI('snake', 'Snake Reloaded');
  const ctx = canvas.getContext('2d');
  const cell = 20, cols = 20;
  let snake, dir, nextDir, food, score, alive, loopId;
  const over = overMsg(wrap, 'Game Over!', start);

  function start(){
    snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    dir = {x:1,y:0}; nextDir = dir;
    food = randFood(); score = 0; alive = true;
    document.getElementById('snakeScore').textContent = score;
    over.classList.remove('show');
    if(loopId) clearInterval(loopId);
    loopId = setInterval(tick, 100);
  }
  function randFood(){
    let p;
    do{ p = {x:Math.floor(Math.random()*cols), y:Math.floor(Math.random()*cols)}; }
    while(snake.some(s=>s.x===p.x&&s.y===p.y));
    return p;
  }
  function tick(){
    if(!alive) return;
    dir = nextDir;
    const head = {x:snake[0].x+dir.x, y:snake[0].y+dir.y};
    if(head.x<0||head.y<0||head.x>=cols||head.y>=cols||snake.some(s=>s.x===head.x&&s.y===head.y)){
      alive=false; clearInterval(loopId); over.classList.add('show');
      if(window.zzSaveHighScore) window.zzSaveHighScore('snake','Snake Reloaded',score);
      return;
    }
    snake.unshift(head);
    if(head.x===food.x && head.y===food.y){ score++; document.getElementById('snakeScore').textContent=score; food=randFood(); }
    else snake.pop();
    draw();
  }
  function draw(){
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#FF6B4A'; ctx.fillRect(food.x*cell+2, food.y*cell+2, cell-4, cell-4);
    snake.forEach((s,i)=>{
      ctx.fillStyle = i===0 ? '#C6FF3D' : '#7C3AED';
      ctx.fillRect(s.x*cell+1, s.y*cell+1, cell-2, cell-2);
    });
  }
  function key(e){
    const k=e.key;
    if((k==='ArrowUp'||k==='w') && dir.y===0) nextDir={x:0,y:-1};
    else if((k==='ArrowDown'||k==='s') && dir.y===0) nextDir={x:0,y:1};
    else if((k==='ArrowLeft'||k==='a') && dir.x===0) nextDir={x:-1,y:0};
    else if((k==='ArrowRight'||k==='d') && dir.x===0) nextDir={x:1,y:0};
  }
  document.addEventListener('keydown', key);
  let touchStart=null;
  canvas.addEventListener('touchstart', e=>{touchStart=e.touches[0];});
  canvas.addEventListener('touchend', e=>{
    if(!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.clientX;
    const dy = e.changedTouches[0].clientY - touchStart.clientY;
    if(Math.abs(dx)>Math.abs(dy)){ if(dx>0 && dir.x===0) nextDir={x:1,y:0}; else if(dx<0 && dir.x===0) nextDir={x:-1,y:0}; }
    else{ if(dy>0 && dir.y===0) nextDir={x:0,y:1}; else if(dy<0 && dir.y===0) nextDir={x:0,y:-1}; }
  });
  window.__restartCurrent = start;
  start(); draw();
  return ()=>{ clearInterval(loopId); document.removeEventListener('keydown', key); };
}
