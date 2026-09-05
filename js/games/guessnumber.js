import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Versuche','gnTries']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='340px';
  const msgEl=document.createElement('div');
  msgEl.style.cssText='font-family:Fredoka; font-size:18px; text-align:center; margin-bottom:14px;';
  const inputRow=document.createElement('div');
  inputRow.style.cssText='display:flex; gap:10px; justify-content:center;';
  const input=document.createElement('input');
  input.type='number'; input.style.cssText='width:120px; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.15); background:#241D3B; color:#fff; font-size:18px; text-align:center;';
  const submitBtn=mkButton('Raten');
  inputRow.append(input, submitBtn);
  wrap.appendChild(msgEl);
  playerBody.append(scoreEl, wrap, inputRow, mkHint('Errate die Zahl zwischen 1 und 100. Du bekommst Hinweise: höher oder niedriger.'));
  const over=overMsg(wrap,'',start);
  let target, tries;
  function start(){
    target=1+Math.floor(Math.random()*100); tries=0;
    document.getElementById('gnTries').textContent=0;
    msgEl.textContent='Tippe eine Zahl zwischen 1 und 100.';
    over.classList.remove('show');
    input.disabled=false; submitBtn.disabled=false; input.value='';
  }
  function submit(){
    const g=parseInt(input.value);
    if(isNaN(g)) return;
    tries++; document.getElementById('gnTries').textContent=tries;
    if(g===target){
      msgEl.textContent='Richtig! 🎉';
      input.disabled=true; submitBtn.disabled=true;
      over.querySelector('div').textContent=`Erraten in ${tries} Versuchen!`;
      over.classList.add('show');
    } else if(g<target){ msgEl.textContent='Höher! ⬆️'; }
    else { msgEl.textContent='Niedriger! ⬇️'; }
    input.value='';
  }
  submitBtn.onclick=submit;
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
