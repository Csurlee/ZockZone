import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Züge','hanMoves'],['Minimum','hanMin']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const canvas=document.createElement('canvas'); canvas.width=340; canvas.height=220;
  wrap.appendChild(canvas);
  playerBody.append(scoreEl, wrap, mkHint('Klicke einen Turm zum Aufnehmen, dann einen Zielturm. Bewege alle Scheiben auf den letzten Turm.'));
  const ctx=canvas.getContext('2d');
  const over=overMsg(wrap,'',start);
  const N=4;
  let towers, moves, selected;
  function start(){
    towers=[[...Array(N).keys()].map(i=>N-i), [], []];
    moves=0; selected=null;
    document.getElementById('hanMoves').textContent=0;
    document.getElementById('hanMin').textContent=Math.pow(2,N)-1;
    over.classList.remove('show');
    draw();
  }
  function draw(){
    ctx.fillStyle='#0F0B1C'; ctx.fillRect(0,0,340,220);
    const baseX=[70,170,270];
    ctx.fillStyle='#3a2f5c';
    baseX.forEach(x=> ctx.fillRect(x-4,60,8,140));
    towers.forEach((t,ti)=>{
      t.forEach((size,i)=>{
        const w=20+size*18;
        ctx.fillStyle = selected===ti && i===t.length-1 ? '#C6FF3D' : '#7C3AED';
        ctx.fillRect(baseX[ti]-w/2, 190-i*18, w, 16);
      });
    });
  }
  canvas.addEventListener('click', e=>{
    const rect=canvas.getBoundingClientRect();
    const x=(e.clientX-rect.left)*(canvas.width/rect.width);
    const ti = x<115?0 : x<225?1:2;
    if(selected===null){
      if(towers[ti].length) selected=ti;
    } else {
      if(ti!==selected && (!towers[ti].length || towers[ti][towers[ti].length-1]>towers[selected][towers[selected].length-1])){
        towers[ti].push(towers[selected].pop());
        moves++; document.getElementById('hanMoves').textContent=moves;
      }
      selected=null;
      draw();
      if(towers[2].length===N){
        over.querySelector('div').textContent=`Geschafft in ${moves} Zügen! (Minimum: ${Math.pow(2,N)-1})`;
        over.classList.add('show');
      }
      return;
    }
    draw();
  });
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
