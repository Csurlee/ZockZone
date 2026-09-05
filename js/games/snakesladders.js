import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Du','slP'],['CPU','slC']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='420px';
  const trackEl=document.createElement('div');
  trackEl.style.cssText='display:grid; grid-template-columns:repeat(10,1fr); gap:3px; margin:14px 0;';
  const dieEl=document.createElement('div');
  dieEl.style.cssText='font-size:48px; text-align:center;';
  const rollBtn=mkButton('Würfeln!');
  wrap.append(trackEl, dieEl);
  playerBody.append(scoreEl, wrap, rollBtn, mkHint('Würfle abwechselnd mit der CPU. Leitern bringen dich vor, Schlangen zurück. Ziel: Feld 30.'));
  const over=overMsg(wrap,'',start);
  const SPECIAL={4:14, 9:2, 17:26, 20:6, 24:29, 28:12};
  const FACES=['⚀','⚁','⚂','⚃','⚄','⚅'];
  let pPos, cPos, turn;
  function start(){
    pPos=0; cPos=0; turn='p';
    document.getElementById('slP').textContent=0;
    document.getElementById('slC').textContent=0;
    dieEl.textContent='🎲';
    over.classList.remove('show');
    rollBtn.disabled=false;
    render();
  }
  function render(){
    trackEl.innerHTML='';
    for(let i=1;i<=30;i++){
      const cell=document.createElement('div');
      let bg='#241D3B';
      if(SPECIAL[i]>i) bg='#16A34A';
      else if(SPECIAL[i] && SPECIAL[i]<i) bg='#DC2626';
      cell.style.cssText=`aspect-ratio:1; border-radius:6px; background:${bg}; display:flex; align-items:center; justify-content:center; font-size:10px; color:#fff; position:relative;`;
      cell.textContent=i;
      if(pPos===i){ const m=document.createElement('div'); m.textContent='🟢'; m.style.cssText='position:absolute; top:-4px;'; cell.appendChild(m); }
      if(cPos===i){ const m=document.createElement('div'); m.textContent='🔴'; m.style.cssText='position:absolute; bottom:-4px;'; cell.appendChild(m); }
      trackEl.appendChild(cell);
    }
  }
  function afterMove(who){
    if(who==='p' && SPECIAL[pPos]) pPos=SPECIAL[pPos];
    if(who==='c' && SPECIAL[cPos]) cPos=SPECIAL[cPos];
  }
  function finish(msg){
    rollBtn.disabled=true;
    over.querySelector('div').textContent=msg;
    over.classList.add('show');
  }
  rollBtn.onclick=()=>{
    const roll=1+Math.floor(Math.random()*6);
    dieEl.textContent=FACES[roll-1];
    pPos=Math.min(30,pPos+roll); afterMove('p');
    document.getElementById('slP').textContent=pPos;
    render();
    if(pPos>=30){ finish('Du gewinnst! 🎉'); return; }
    rollBtn.disabled=true;
    setTimeout(cpuTurn, 700);
  };
  function cpuTurn(){
    const roll=1+Math.floor(Math.random()*6);
    dieEl.textContent=FACES[roll-1];
    cPos=Math.min(30,cPos+roll); afterMove('c');
    document.getElementById('slC').textContent=cPos;
    render();
    if(cPos>=30){ finish('CPU gewinnt!'); return; }
    rollBtn.disabled=false;
  }
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
