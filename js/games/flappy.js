import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

export function build(){
  const scoreEl = hud(['Punkte','flapScore'], ['Rekord','flapBest']);
  const wrap = document.createElement('div'); wrap.className='canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width=360; canvas.height=480;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Leertaste / Klick / Tap zum Springen.'));
  addLeaderboardUI('flappy', 'Flappy Block');
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, 'Abgestürzt!', start);
  let bird, pipes, score, best=0, alive, gravity, loopId, frame;

  function start(){
    bird = {x:70, y:200, vy:0};
    pipes = []; score=0; alive=true; gravity=0.45; frame=0;
    document.getElementById('flapScore').textContent=score;
    document.getElementById('flapBest').textContent=best;
    over.classList.remove('show');
    if(loopId) cancelAnimationFrame(loopId);
    loop();
  }
  function flap(){ if(alive) bird.vy = -7.5; }
  function loop(){
    if(!alive) return;
    frame++;
    bird.vy += gravity; bird.y += bird.vy;
    if(frame%95===0){
      const gapY = 80 + Math.random()*230;
      pipes.push({x:360, gapY, passed:false});
    }
    pipes.forEach(p=>p.x -= 2.6);
    pipes = pipes.filter(p=>p.x>-50);
    pipes.forEach(p=>{
      if(!p.passed && p.x+24<bird.x){ p.passed=true; score++; document.getElementById('flapScore').textContent=score; }
      if(bird.x+14>p.x && bird.x-14<p.x+48){
        if(bird.y-14<p.gapY-70 || bird.y+14>p.gapY+70){ die(); }
      }
    });
    if(bird.y>480-14 || bird.y<14) die();
    draw();
    loopId = requestAnimationFrame(loop);
  }
  function die(){
    if(!alive) return;
    alive=false;
    if(score>best){best=score; document.getElementById('flapBest').textContent=best;}
    over.classList.add('show');
    if(window.zzSaveHighScore) window.zzSaveHighScore('flappy','Flappy Block',score);
  }
  function draw(){
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,360,480);
    ctx.fillStyle='#2563EB';
    pipes.forEach(p=>{
      ctx.fillRect(p.x, 0, 48, p.gapY-70);
      ctx.fillRect(p.x, p.gapY+70, 48, 480-(p.gapY+70));
    });
    ctx.fillStyle='#C6FF3D';
    ctx.fillRect(bird.x-14, bird.y-14, 28, 28);
  }
  function key(e){ if(e.code==='Space'){ e.preventDefault(); flap(); } }
  document.addEventListener('keydown', key);
  canvas.addEventListener('mousedown', flap);
  canvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); flap(); });
  window.__restartCurrent = start;
  start();
  return ()=>{ cancelAnimationFrame(loopId); document.removeEventListener('keydown', key); };
}
