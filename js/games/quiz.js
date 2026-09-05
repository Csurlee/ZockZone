import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Punkte','quizScore'],['Frage','quizNum']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='420px';
  const qEl=document.createElement('div');
  qEl.style.cssText='font-family:Fredoka; font-weight:600; font-size:18px; text-align:center; margin-bottom:14px;';
  const optDiv=document.createElement('div');
  optDiv.style.cssText='display:flex; flex-direction:column; gap:10px;';
  wrap.append(qEl, optDiv);
  playerBody.append(scoreEl, wrap, mkHint('10 Fragen, wähle die richtige Antwort.'));
  const over=overMsg(wrap,'',start);
  const QUESTIONS=[
    {q:'Wie viele Kontinente gibt es?', a:['5','6','7','8'], c:2},
    {q:'Was ist die Hauptstadt von Australien?', a:['Sydney','Canberra','Melbourne','Perth'], c:1},
    {q:'Wie viele Beine hat eine Spinne?', a:['6','8','10','4'], c:1},
    {q:'Welcher Planet ist der Sonne am nächsten?', a:['Venus','Erde','Merkur','Mars'], c:2},
    {q:'Wie viele Saiten hat eine klassische Gitarre?', a:['4','5','6','7'], c:2},
    {q:'Welches ist das größte Säugetier?', a:['Elefant','Blauwal','Giraffe','Nashorn'], c:1},
    {q:'In welchem Jahr fiel die Berliner Mauer?', a:['1987','1989','1991','1993'], c:1},
    {q:'Wie viele Zähne hat ein erwachsener Mensch normalerweise?', a:['28','30','32','34'], c:2},
    {q:'Welches Element hat das Symbol "O"?', a:['Gold','Sauerstoff','Osmium','Silber'], c:1},
    {q:'Wie viele Spieler hat eine Fußballmannschaft auf dem Feld?', a:['9','10','11','12'], c:2},
  ];
  let order, idx, score;
  function start(){
    order=[...QUESTIONS].sort(()=>Math.random()-0.5);
    idx=0; score=0;
    document.getElementById('quizScore').textContent=0;
    over.classList.remove('show');
    showQ();
  }
  function showQ(){
    document.getElementById('quizNum').textContent=(idx+1)+'/'+order.length;
    const item=order[idx];
    qEl.textContent=item.q;
    optDiv.innerHTML='';
    item.a.forEach((opt,i)=>{
      const b=mkButton(opt,'var(--card)','#fff');
      b.style.textAlign='left';
      b.onclick=()=>{
        if(i===item.c){ score++; document.getElementById('quizScore').textContent=score; b.style.background='#16A34A'; }
        else{ b.style.background='#DC2626'; }
        Array.from(optDiv.children).forEach(c=>c.disabled=true);
        setTimeout(()=>{
          idx++;
          if(idx>=order.length){
            over.querySelector('div').textContent=`Fertig! ${score}/${order.length} richtig.`;
            over.classList.add('show');
          } else showQ();
        }, 700);
      };
      optDiv.appendChild(b);
    });
  }
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
