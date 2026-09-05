import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl = hud(['Züge','memMoves'], ['Paare','memPairs']);
  const wrap = document.createElement('div'); wrap.className='canvas-wrap';
  const gridDiv = document.createElement('div');
  gridDiv.style.cssText = 'display:grid; grid-template-columns:repeat(4,80px); grid-gap:10px;';
  wrap.appendChild(gridDiv);
  playerBody.append(scoreEl, wrap, mkHint('Finde alle Paare mit möglichst wenigen Zügen.'));
  const over = overMsg(wrap, 'Geschafft!', start);
  const icons = ['🍎','🍋','🍇','🍓','🍒','🍑','🥝','🍉'];
  let cards, flipped, matched, moves;

  function start(){
    cards = [...icons, ...icons].sort(()=>Math.random()-0.5);
    flipped=[]; matched=[]; moves=0;
    document.getElementById('memMoves').textContent=0;
    document.getElementById('memPairs').textContent='0/8';
    over.classList.remove('show');
    render();
  }
  function render(){
    gridDiv.innerHTML='';
    cards.forEach((icon,i)=>{
      const isUp = flipped.includes(i) || matched.includes(i);
      const cell=document.createElement('div');
      cell.style.cssText=`width:80px;height:80px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:32px;cursor:pointer;background:${isUp?'#7C3AED':'#241D3B'};transition:.15s;border:1px solid rgba(255,255,255,0.08);`;
      cell.textContent = isUp ? icon : '❔';
      cell.onclick = ()=>flip(i);
      gridDiv.appendChild(cell);
    });
  }
  function flip(i){
    if(flipped.length===2 || flipped.includes(i) || matched.includes(i)) return;
    flipped.push(i); render();
    if(flipped.length===2){
      moves++; document.getElementById('memMoves').textContent=moves;
      const [a,b] = flipped;
      if(cards[a]===cards[b]){
        matched.push(a,b); flipped=[];
        document.getElementById('memPairs').textContent = (matched.length/2)+'/8';
        render();
        if(matched.length===cards.length) over.classList.add('show');
      } else {
        setTimeout(()=>{ flipped=[]; render(); }, 700);
      }
    }
  }
  window.__restartCurrent = start;
  start();
  return ()=>{};
}
