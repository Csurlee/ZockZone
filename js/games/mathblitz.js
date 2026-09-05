import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','mathScore'],['Zeit','mathTime']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='360px';
  const qEl=document.createElement('div');
  qEl.style.cssText='font-family:Fredoka; font-size:34px; text-align:center; margin:16px 0;';
  const inputRow=document.createElement('div');
  inputRow.style.cssText='display:flex; gap:10px; justify-content:center;';
  const input=document.createElement('input');
  input.type='number'; input.inputMode='numeric';
  input.style.cssText='width:120px; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.15); background:#241D3B; color:#fff; font-size:18px; text-align:center;';
  const submitBtn=mkButton('OK');
  inputRow.append(input, submitBtn);
  wrap.append(qEl);
  playerBody.append(scoreEl, wrap, inputRow, mkHint('Löse so viele Aufgaben wie möglich in 30 Sekunden.'));
  const over=overMsg(wrap,'',start);
  let score, timeLeft, timerId, answer;
  function start(){
    score=0; timeLeft=30;
    document.getElementById('mathScore').textContent=0;
    document.getElementById('mathTime').textContent=timeLeft;
    over.classList.remove('show');
    nextQ();
    input.disabled=false; submitBtn.disabled=false;
    if(timerId) clearInterval(timerId);
    timerId=setInterval(()=>{
      timeLeft--; document.getElementById('mathTime').textContent=timeLeft;
      if(timeLeft<=0){
        clearInterval(timerId);
        input.disabled=true; submitBtn.disabled=true;
        over.querySelector('div').textContent='Zeit um! Punkte: '+score;
        over.classList.add('show');
      }
    },1000);
  }
  function nextQ(){
    const ops=['+','-','×'];
    const op=ops[Math.floor(Math.random()*3)];
    let a,b;
    if(op==='×'){ a=1+Math.floor(Math.random()*12); b=1+Math.floor(Math.random()*12); answer=a*b; }
    else { a=1+Math.floor(Math.random()*20); b=1+Math.floor(Math.random()*20); answer = op==='+'? a+b : a-b; }
    qEl.textContent = `${a} ${op} ${b} = ?`;
    input.value=''; input.focus();
  }
  function submit(){
    if(input.disabled) return;
    if(parseInt(input.value)===answer){ score++; document.getElementById('mathScore').textContent=score; }
    nextQ();
  }
  submitBtn.onclick=submit;
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });
  window.__restartCurrent=start;
  start();
  return ()=>{ clearInterval(timerId); };
}
