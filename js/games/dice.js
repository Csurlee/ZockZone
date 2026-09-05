import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Runde','diceRound'],['Du','diceP'],['CPU','diceC']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='360px';
  const diceRow=document.createElement('div');
  diceRow.style.cssText='display:flex; gap:24px; justify-content:center; align-items:center; font-size:52px;';
  const pDie=document.createElement('div'); pDie.textContent='🎲';
  const cDie=document.createElement('div'); cDie.textContent='🎲';
  diceRow.append(pDie, document.createTextNode('vs'), cDie);
  const rollBtn=mkButton('Würfeln!');
  wrap.appendChild(diceRow);
  playerBody.append(scoreEl, wrap, rollBtn, mkHint('Höherer Wurf gewinnt die Runde. Erster auf 3 Rundensiege gewinnt das Spiel.'));
  const over=overMsg(wrap,'',start);
  const FACES=['⚀','⚁','⚂','⚃','⚄','⚅'];
  let round, pWins, cWins;
  function start(){
    round=0; pWins=0; cWins=0;
    document.getElementById('diceRound').textContent=round;
    document.getElementById('diceP').textContent=0;
    document.getElementById('diceC').textContent=0;
    pDie.textContent='🎲'; cDie.textContent='🎲';
    over.classList.remove('show');
    rollBtn.disabled=false;
  }
  rollBtn.onclick=()=>{
    round++;
    const pRoll=1+Math.floor(Math.random()*6), cRoll=1+Math.floor(Math.random()*6);
    pDie.textContent=FACES[pRoll-1]; cDie.textContent=FACES[cRoll-1];
    if(pRoll>cRoll) pWins++; else if(cRoll>pRoll) cWins++;
    document.getElementById('diceRound').textContent=round;
    document.getElementById('diceP').textContent=pWins;
    document.getElementById('diceC').textContent=cWins;
    if(pWins>=3||cWins>=3){
      rollBtn.disabled=true;
      over.querySelector('div').textContent = pWins>=3?'Du gewinnst das Duell! 🎉':'CPU gewinnt das Duell.';
      over.classList.add('show');
    }
  };
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
