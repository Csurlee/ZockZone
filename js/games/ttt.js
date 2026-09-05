import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl = hud(['Runde','tttRound']);
  const wrap = document.createElement('div'); wrap.className='canvas-wrap';
  const gridDiv = document.createElement('div');
  gridDiv.style.cssText = 'display:grid; grid-template-columns:repeat(3,90px); grid-gap:8px;';
  wrap.appendChild(gridDiv);
  const statusEl = document.createElement('div');
  statusEl.style.cssText='font-weight:700; font-size:16px; font-family:Fredoka;';
  playerBody.append(scoreEl, statusEl, wrap, mkHint('2 Spieler abwechselnd — X beginnt.'));
  const over = overMsg(wrap, '', start);
  let board, turn, round=0, active;

  function start(){
    board = Array(9).fill(''); turn='X'; active=true; round++;
    document.getElementById('tttRound').textContent = round;
    statusEl.textContent = 'Spieler X ist dran';
    over.classList.remove('show');
    render();
  }
  function render(){
    gridDiv.innerHTML='';
    board.forEach((v,i)=>{
      const cell=document.createElement('div');
      cell.style.cssText=`width:90px;height:90px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:700;cursor:pointer;background:#241D3B;color:${v==='X'?'#C6FF3D':'#FF6B4A'};border:1px solid rgba(255,255,255,0.08);`;
      cell.textContent = v;
      cell.onclick = ()=>play(i);
      gridDiv.appendChild(cell);
    });
  }
  const WIN = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function play(i){
    if(!active || board[i]) return;
    board[i]=turn;
    const win = WIN.find(([a,b,c])=>board[a] && board[a]===board[b] && board[a]===board[c]);
    render();
    if(win){
      active=false;
      over.querySelector('div').textContent = `Spieler ${turn} gewinnt! 🎉`;
      over.classList.add('show');
      return;
    }
    if(board.every(v=>v)){
      active=false;
      over.querySelector('div').textContent = 'Unentschieden!';
      over.classList.add('show');
      return;
    }
    turn = turn==='X'?'O':'X';
    statusEl.textContent = `Spieler ${turn} ist dran`;
  }
  window.__restartCurrent = start;
  start();
  return ()=>{};
}
