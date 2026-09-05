import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Rot','chkRed'],['Blau','chkBlue']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap';
  const gridDiv=document.createElement('div');
  gridDiv.style.cssText='display:grid; grid-template-columns:repeat(8,38px); grid-gap:0px; border:2px solid #3a2f5c;';
  wrap.appendChild(gridDiv);
  const statusEl=document.createElement('div');
  statusEl.style.cssText='font-family:Fredoka; font-weight:600;';
  playerBody.append(scoreEl, statusEl, wrap, mkHint('2 Spieler abwechselnd. Klicke einen Stein, dann ein Zielfeld. Schlagen ist Pflicht, wenn möglich (Einzelsprung).'));
  const over=overMsg(wrap,'',start);
  let board, turn, selected;
  function start(){
    board=Array.from({length:8},()=>Array(8).fill(null));
    for(let r=0;r<3;r++)for(let c=0;c<8;c++) if((r+c)%2===1) board[r][c]={p:'r',king:false};
    for(let r=5;r<8;r++)for(let c=0;c<8;c++) if((r+c)%2===1) board[r][c]={p:'b',king:false};
    turn='r'; selected=null;
    statusEl.textContent='Rot ist dran';
    over.classList.remove('show');
    updateCounts();
    render();
  }
  function updateCounts(){
    let red=0,blue=0;
    board.forEach(row=>row.forEach(c=>{ if(c){ if(c.p==='r') red++; else blue++; } }));
    document.getElementById('chkRed').textContent=red;
    document.getElementById('chkBlue').textContent=blue;
    if(red===0){ over.querySelector('div').textContent='Blau gewinnt! 🎉'; over.classList.add('show'); }
    else if(blue===0){ over.querySelector('div').textContent='Rot gewinnt! 🎉'; over.classList.add('show'); }
  }
  function legalMovesFor(r,c){
    const piece=board[r][c]; if(!piece) return [];
    const dirs = piece.king ? [[-1,-1],[-1,1],[1,-1],[1,1]] : (piece.p==='r'? [[1,-1],[1,1]] : [[-1,-1],[-1,1]]);
    const moves=[];
    dirs.forEach(([dr,dc])=>{
      const nr=r+dr,nc=c+dc;
      if(nr>=0&&nr<8&&nc>=0&&nc<8&&!board[nr][nc]) moves.push({r:nr,c:nc,capture:null});
      const jr=r+dr*2, jc=c+dc*2;
      if(jr>=0&&jr<8&&jc>=0&&jc<8&&!board[jr][jc] && board[nr]&&board[nr][nc] && board[nr][nc].p!==piece.p) moves.push({r:jr,c:jc,capture:{r:nr,c:nc}});
    });
    return moves;
  }
  function hasCaptureAvailable(player){
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      if(board[r][c] && board[r][c].p===player && legalMovesFor(r,c).some(m=>m.capture)) return true;
    }
    return false;
  }
  function render(){
    gridDiv.innerHTML='';
    const mustCapture = hasCaptureAvailable(turn);
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const cell=document.createElement('div');
      const dark=(r+c)%2===1;
      cell.style.cssText=`width:38px;height:38px;background:${dark?'#3a2f5c':'#1D1730'};display:flex;align-items:center;justify-content:center;cursor:${dark?'pointer':'default'};`;
      const piece=board[r][c];
      if(piece){
        const disc=document.createElement('div');
        disc.style.cssText=`width:28px;height:28px;border-radius:50%;background:${piece.p==='r'?'#DC2626':'#2563EB'};border:2px solid ${selected&&selected.r===r&&selected.c===c?'#C6FF3D':'rgba(255,255,255,0.3)'};display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;`;
        if(piece.king) disc.textContent='♛';
        cell.appendChild(disc);
      }
      if(dark) cell.onclick=(()=>{ const rr=r, cc=c; return ()=>handleClick(rr,cc,mustCapture); })();
      gridDiv.appendChild(cell);
    }
  }
  function handleClick(r,c,mustCapture){
    const piece=board[r][c];
    if(piece && piece.p===turn){
      const moves=legalMovesFor(r,c);
      if(mustCapture && !moves.some(m=>m.capture)){ selected=null; render(); return; }
      selected={r,c,moves}; render(); return;
    }
    if(selected){
      const move=selected.moves.find(m=>m.r===r&&m.c===c);
      if(move){
        board[r][c]=board[selected.r][selected.c];
        board[selected.r][selected.c]=null;
        if(move.capture) board[move.capture.r][move.capture.c]=null;
        if((board[r][c].p==='r'&&r===7)||(board[r][c].p==='b'&&r===0)) board[r][c].king=true;
        selected=null;
        updateCounts();
        turn = turn==='r'?'b':'r';
        statusEl.textContent = (turn==='r'?'Rot':'Blau')+' ist dran';
        render();
      } else { selected=null; render(); }
    }
  }
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
