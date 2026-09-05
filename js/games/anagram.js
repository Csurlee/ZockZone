import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','anaScore'],['Zeit','anaTime']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='360px';
  const scrambledEl=document.createElement('div');
  scrambledEl.style.cssText='font-family:"JetBrains Mono"; font-size:28px; letter-spacing:4px; text-align:center; margin:14px 0;';
  const inputRow=document.createElement('div');
  inputRow.style.cssText='display:flex; gap:10px; justify-content:center;';
  const input=document.createElement('input');
  input.style.cssText='width:160px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:#241D3B;color:#fff;font-size:16px;text-align:center;text-transform:uppercase;';
  const submitBtn=mkButton('OK');
  inputRow.append(input, submitBtn);
  wrap.appendChild(scrambledEl);
  playerBody.append(scoreEl, wrap, inputRow, mkHint('Finde das Wort aus den durcheinandergewürfelten Buchstaben.'));
  const over=overMsg(wrap,'',start);
  const WORDS=['GARTEN','FENSTER','BANANE','WOLKE','SCHULE','MUSIK','KATZE','BRILLE','WASSER','ZUCKER'];
  let word, timeLeft, timerId, score;
  function scramble(w){
    let arr=w.split('');
    do{ arr=arr.sort(()=>Math.random()-0.5); } while(arr.join('')===w);
    return arr.join('');
  }
  function start(){
    score=0; timeLeft=60;
    document.getElementById('anaScore').textContent=0;
    document.getElementById('anaTime').textContent=timeLeft;
    over.classList.remove('show');
    input.disabled=false; submitBtn.disabled=false;
    nextWord();
    if(timerId) clearInterval(timerId);
    timerId=setInterval(()=>{
      timeLeft--; document.getElementById('anaTime').textContent=timeLeft;
      if(timeLeft<=0){
        clearInterval(timerId);
        input.disabled=true; submitBtn.disabled=true;
        over.querySelector('div').textContent='Zeit um! Punkte: '+score;
        over.classList.add('show');
      }
    },1000);
  }
  function nextWord(){
    word=WORDS[Math.floor(Math.random()*WORDS.length)];
    scrambledEl.textContent=scramble(word);
    input.value=''; input.focus();
  }
  function submit(){
    if(input.disabled) return;
    if(input.value.toUpperCase()===word){ score++; document.getElementById('anaScore').textContent=score; }
    nextWord();
  }
  submitBtn.onclick=submit;
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });
  window.__restartCurrent=start;
  start();
  return ()=>{ clearInterval(timerId); };
}
