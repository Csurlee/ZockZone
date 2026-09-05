import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Flaggen','minFlags'],['Felder','minLeft']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const gridDiv=document.createElement('div');
  gridDiv.style.cssText='display:grid; grid-template-columns:repeat(9,32px); grid-gap:2px;';
  wrap.appendChild(gridDiv);
  const flagBtn=mkButton('🚩 Flaggen-Modus: Aus','var(--card)','#fff');
  playerBody.append(scoreEl, flagBtn, wrap, mkHint('Klicke Felder auf. Zahl = Anzahl Minen drumherum. Flaggen-Modus zum Markieren.'));
  const over=overMsg(wrap,'',start);
  const SIZE=9, MINES=10;
  let board, revealed, flagged, flagMode=false, alive;
  flagBtn.onclick=()=>{ flagMode=!flagMode; flagBtn.textContent='🚩 Flaggen-Modus: '+(flagMode?'An':'Aus'); };
  function start(){
    board=Array.from({length:SIZE},()=>Array(SIZE).fill(0));
    revealed=Array.from({length:SIZE},()=>Array(SIZE).fill(false));
    flagged=Array.from({length:SIZE},()=>Array(SIZE).fill(false));
    let placed=0;
    while(placed<MINES){
      const r=Math.floor(Math.random()*SIZE), c=Math.floor(Math.random()*SIZE);
      if(board[r][c]!==-1){ board[r][c]=-1; placed++; }
    }
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      if(board[r][c]===-1) continue;
      let count=0;
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
        const nr=r+dr,nc=c+dc;
        if(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===-1) count++;
      }
      board[r][c]=count;
    }
    alive=true; flagMode=false; flagBtn.textContent='🚩 Flaggen-Modus: Aus';
    document.getElementById('minFlags').textContent='0/'+MINES;
    updateLeft();
    over.classList.remove('show');
    render();
  }
  function updateLeft(){
    let left=0;
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++) if(!revealed[r][c] && board[r][c]!==-1) left++;
    document.getElementById('minLeft').textContent=left;
  }
  function reveal(r,c){
    if(r<0||r>=SIZE||c<0||c>=SIZE||revealed[r][c]||flagged[r][c]) return;
    revealed[r][c]=true;
    if(board[r][c]===0){
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++) reveal(r+dr,c+dc);
    }
  }
  function render(){
    gridDiv.innerHTML='';
    let flagCount=0;
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++) if(flagged[r][c]) flagCount++;
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      const cell=document.createElement('div');
      const isMine = revealed[r][c] && board[r][c]===-1;
      const colorMap=['#fff','#93C5FD','#86EFAC','#FDE68A','#FCA5A5','#C4B5FD','#67E8F9','#fff','#fff'];
      cell.style.cssText=`width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;cursor:pointer;border-radius:4px;background:${revealed[r][c]?(isMine?'#DC2626':'#241D3B'):'#3a2f5c'};color:${colorMap[board[r][c]]||'#fff'};`;
      if(flagged[r][c] && !revealed[r][c]) cell.textContent='🚩';
      else if(revealed[r][c]) cell.textContent = isMine ? '💣' : (board[r][c]||'');
      cell.onclick=(()=>{ const rr=r, cc=c; return ()=>{
        if(!alive) return;
        if(flagMode){
          if(!revealed[rr][cc]){
            flagged[rr][cc]=!flagged[rr][cc];
            render();
            let fc=0;
            for(let ar=0;ar<SIZE;ar++)for(let ac=0;ac<SIZE;ac++) if(flagged[ar][ac]) fc++;
            document.getElementById('minFlags').textContent=fc+'/'+MINES;
          }
          return;
        }
        if(flagged[rr][cc]) return;
        if(board[rr][cc]===-1){
          alive=false;
          for(let ar=0;ar<SIZE;ar++)for(let ac=0;ac<SIZE;ac++) if(board[ar][ac]===-1) revealed[ar][ac]=true;
          render();
          over.querySelector('div').textContent='Boom! 💥 Verloren.';
          over.classList.add('show');
          return;
        }
        reveal(rr,cc); render(); updateLeft();
        let left=0;
        for(let ar=0;ar<SIZE;ar++)for(let ac=0;ac<SIZE;ac++) if(!revealed[ar][ac] && board[ar][ac]!==-1) left++;
        if(left===0){ alive=false; over.querySelector('div').textContent='Gewonnen! 🎉'; over.classList.add('show'); }
      };})();
      gridDiv.appendChild(cell);
    }
  }
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
