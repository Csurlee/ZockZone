import { hud, mkHint, mkButton, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Du','rpsP'],['CPU','rpsC']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='360px';
  const resultEl=document.createElement('div');
  resultEl.style.cssText='font-family:Fredoka;font-weight:700;font-size:16px;text-align:center;min-height:28px;';
  const btnRow=document.createElement('div');
  btnRow.style.cssText='display:flex; gap:12px; justify-content:center;';
  const opts=[['✊','Stein'],['✋','Papier'],['✌️','Schere']];
  wrap.append(resultEl);
  playerBody.append(scoreEl, wrap, btnRow, mkHint('Erster auf 5 Siege gewinnt.'));
  let pScore=0,cScore=0,matchOver=false,resetTimeoutId;
  function beats(a,b){ return (a==='✊'&&b==='✌️')||(a==='✋'&&b==='✊')||(a==='✌️'&&b==='✋'); }
  opts.forEach(([icon,label])=>{
    const b=mkButton(icon+' '+label,'var(--card)','#fff');
    b.onclick=()=>{
      if(matchOver) return;
      const cpu=opts[Math.floor(Math.random()*3)][0];
      let msg;
      if(cpu===icon) msg='Unentschieden ('+icon+' vs '+cpu+')';
      else if(beats(icon,cpu)){ pScore++; msg='Du gewinnst! '+icon+' schlägt '+cpu; }
      else{ cScore++; msg='CPU gewinnt. '+cpu+' schlägt '+icon; }
      document.getElementById('rpsP').textContent=pScore;
      document.getElementById('rpsC').textContent=cScore;
      resultEl.textContent=msg;
      if(pScore>=5||cScore>=5){
        matchOver=true;
        resultEl.textContent += pScore>=5 ? ' 🎉 Match gewonnen!' : ' Match verloren.';
        resetTimeoutId=setTimeout(()=>{ pScore=0; cScore=0; matchOver=false; document.getElementById('rpsP').textContent=0; document.getElementById('rpsC').textContent=0; },1500);
      }
    };
    btnRow.appendChild(b);
  });
  window.__restartCurrent=()=>{ clearTimeout(resetTimeoutId); pScore=0;cScore=0; matchOver=false; document.getElementById('rpsP').textContent=0; document.getElementById('rpsC').textContent=0; resultEl.textContent=''; };
  return ()=>{ clearTimeout(resetTimeoutId); };
}
