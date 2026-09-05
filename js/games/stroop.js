import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','strScore'],['Zeit','strTime']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='360px';
  const wordEl=document.createElement('div');
  wordEl.style.cssText='font-family:Fredoka; font-size:40px; font-weight:700; text-align:center; margin:16px 0;';
  const btnRow=document.createElement('div');
  btnRow.style.cssText='display:flex; gap:10px; justify-content:center; flex-wrap:wrap;';
  wrap.append(wordEl);
  playerBody.append(scoreEl, wrap, btnRow, mkHint('Klicke die FARBE, in der das Wort geschrieben ist — nicht das Wort selbst.'));
  const over=overMsg(wrap,'',start);
  const COLORS=[['ROT','#DC2626'],['BLAU','#2563EB'],['GRÜN','#16A34A'],['GELB','#F59E0B'],['LILA','#7C3AED']];
  let score, timeLeft, timerId, correctColor;
  function start(){
    score=0; timeLeft=30;
    document.getElementById('strScore').textContent=0;
    document.getElementById('strTime').textContent=timeLeft;
    over.classList.remove('show');
    btnRow.innerHTML='';
    COLORS.forEach(([name,hexc])=>{
      const b=document.createElement('button');
      b.style.cssText=`width:60px;height:60px;border-radius:12px;border:none;background:${hexc};cursor:pointer;`;
      b.onclick=()=>check(hexc);
      btnRow.appendChild(b);
    });
    nextWord();
    if(timerId) clearInterval(timerId);
    timerId=setInterval(()=>{
      timeLeft--; document.getElementById('strTime').textContent=timeLeft;
      if(timeLeft<=0){ clearInterval(timerId); over.querySelector('div').textContent='Zeit um! Punkte: '+score; over.classList.add('show'); }
    },1000);
  }
  function nextWord(){
    const word=COLORS[Math.floor(Math.random()*COLORS.length)];
    const color=COLORS[Math.floor(Math.random()*COLORS.length)];
    wordEl.textContent=word[0];
    wordEl.style.color=color[1];
    correctColor=color[1];
  }
  function check(hexc){
    if(timeLeft<=0) return;
    if(hexc===correctColor){ score++; document.getElementById('strScore').textContent=score; }
    nextWord();
  }
  window.__restartCurrent=start;
  start();
  return ()=>{ clearInterval(timerId); };
}
