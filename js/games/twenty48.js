import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

export function build(){
  const scoreEl = hud(['Punkte','g48Score'], ['Bestwert','g48Best']);
  const wrap = document.createElement('div'); wrap.className='canvas-wrap';
  const gridDiv = document.createElement('div');
  gridDiv.style.cssText = 'display:grid; grid-template-columns:repeat(4,74px); grid-gap:8px; background:#1D1730; padding:8px; border-radius:12px;';
  wrap.appendChild(gridDiv);
  playerBody.append(scoreEl, wrap, mkHint('Pfeiltasten zum Verschieben der Kacheln.'));
  addLeaderboardUI('twenty48', '2048 Fusion');
  const over = overMsg(wrap, 'Keine Züge mehr!', start);
  let board, score, best=0;
  const colors = {2:'#3b2f63',4:'#4b3480',8:'#6D28D9',16:'#7C3AED',32:'#9333EA',64:'#C026D3',128:'#DB2777',256:'#F59E0B',512:'#F59E0B',1024:'#C6FF3D',2048:'#C6FF3D'};

  function start(){
    board = Array.from({length:4},()=>Array(4).fill(0));
    score=0; addTile(); addTile();
    document.getElementById('g48Score').textContent=score;
    document.getElementById('g48Best').textContent=best;
    over.classList.remove('show');
    render();
  }
  function addTile(){
    const empties=[];
    board.forEach((row,r)=>row.forEach((v,c)=>{if(v===0) empties.push([r,c]);}));
    if(!empties.length) return;
    const [r,c] = empties[Math.floor(Math.random()*empties.length)];
    board[r][c] = Math.random()<0.9?2:4;
  }
  function render(){
    gridDiv.innerHTML='';
    board.forEach(row=>row.forEach(v=>{
      const cell=document.createElement('div');
      cell.style.cssText=`width:74px;height:74px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${v>512?20:24}px;font-family:Fredoka;color:${v<=4?'#B4A9D6':'#fff'};background:${v===0?'#241D3B':colors[v]||'#C6FF3D'};transition:.1s;`;
      cell.textContent = v||'';
      gridDiv.appendChild(cell);
    }));
  }
  function slide(row){
    const arr = row.filter(v=>v!==0);
    for(let i=0;i<arr.length-1;i++){
      if(arr[i]===arr[i+1]){ arr[i]*=2; score+=arr[i]; arr.splice(i+1,1); }
    }
    while(arr.length<4) arr.push(0);
    return arr;
  }
  function rotate(b){ return b[0].map((_,c)=>b.map(row=>row[c]).reverse()); }
  function move(dir){
    let moved=false;
    let b = board;
    let rotations = {left:0, up:1, right:2, down:3}[dir];
    for(let i=0;i<rotations;i++) b = rotate(b);
    const newB = b.map(slide);
    if(JSON.stringify(newB)!==JSON.stringify(b)) moved=true;
    let result = newB;
    for(let i=0;i<(4-rotations)%4;i++) result = rotate(result);
    if(moved){
      board = result; addTile();
      document.getElementById('g48Score').textContent=score;
      if(score>best){best=score; document.getElementById('g48Best').textContent=best;}
      render();
      if(isGameOver()){ over.classList.add('show'); if(window.zzSaveHighScore) window.zzSaveHighScore('twenty48','2048 Fusion',score); }
    }
  }
  function isGameOver(){
    for(let r=0;r<4;r++)for(let c=0;c<4;c++){
      if(board[r][c]===0) return false;
      if(c<3 && board[r][c]===board[r][c+1]) return false;
      if(r<3 && board[r][c]===board[r+1][c]) return false;
    }
    return true;
  }
  function key(e){
    const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
    if(map[e.key]){ e.preventDefault(); move(map[e.key]); }
  }
  document.addEventListener('keydown', key);
  window.__restartCurrent = start;
  start();
  return ()=>document.removeEventListener('keydown', key);
}
