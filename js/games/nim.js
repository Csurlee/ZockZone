import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Runde','nimRound']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='400px';
  const sticksEl=document.createElement('div');
  sticksEl.style.cssText='font-size:34px; text-align:center; letter-spacing:8px; margin:16px 0; min-height:44px;';
  const statusEl=document.createElement('div');
  statusEl.style.cssText='font-family:Fredoka; font-weight:600; text-align:center;';
  const btnRow=document.createElement('div');
  btnRow.style.cssText='display:flex; gap:10px; justify-content:center;';
  wrap.append(sticksEl);
  playerBody.append(scoreEl, statusEl, wrap, btnRow, mkHint('2 Spieler abwechselnd. Nimm 1, 2 oder 3 Stäbchen. Wer das letzte Stäbchen nimmt, verliert.'));
  const over=overMsg(wrap,'',start);
  let sticks, turn, round=0;
  function start(){
    sticks=15+Math.floor(Math.random()*6); turn=1; round++;
    document.getElementById('nimRound').textContent=round;
    statusEl.textContent='Spieler 1 ist dran';
    over.classList.remove('show');
    render();
  }
  function render(){
    sticksEl.textContent='| '.repeat(sticks).trim();
    btnRow.innerHTML='';
    [1,2,3].forEach(n=>{
      const b=mkButton('Nimm '+n);
      b.disabled = n>sticks;
      b.onclick=()=>take(n);
      btnRow.appendChild(b);
    });
  }
  function take(n){
    sticks-=n;
    render();
    if(sticks<=0){
      over.querySelector('div').textContent=`Spieler ${turn} nimmt das letzte Stäbchen und verliert! Spieler ${turn===1?2:1} gewinnt! 🎉`;
      over.classList.add('show');
      return;
    }
    turn = turn===1?2:1;
    statusEl.textContent='Spieler '+turn+' ist dran';
  }
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
