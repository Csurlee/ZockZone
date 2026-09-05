import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Coins','slCoins']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='340px';
  const reelsEl=document.createElement('div');
  reelsEl.style.cssText='display:flex; gap:10px; justify-content:center; font-size:48px; background:#241D3B; padding:20px; border-radius:16px;';
  const spinBtn=mkButton('🎰 Spin (Kosten 10)');
  wrap.appendChild(reelsEl);
  playerBody.append(scoreEl, wrap, spinBtn, mkHint('Drei gleiche Symbole gewinnen Coins. Start-Guthaben: 100.'));
  const over=overMsg(wrap,'',start);
  const SYMBOLS=['🍒','🍋','🍇','⭐','💎','🔔'];
  const PAYOUT={'🍒':20,'🍋':30,'🍇':40,'⭐':60,'💎':100,'🔔':80};
  let coins, reels;
  function start(){
    coins=100; reels=['🍒','🍋','🍇'];
    document.getElementById('slCoins').textContent=coins;
    over.classList.remove('show');
    spinBtn.disabled=false;
    render();
  }
  function render(){
    reelsEl.innerHTML='';
    reels.forEach(s=>{ const d=document.createElement('div'); d.textContent=s; reelsEl.appendChild(d); });
  }
  spinBtn.onclick=()=>{
    if(coins<10){
      over.querySelector('div').textContent='Guthaben leer! 💸';
      over.classList.add('show');
      return;
    }
    coins-=10;
    reels=reels.map(()=>SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)]);
    render();
    if(reels[0]===reels[1] && reels[1]===reels[2]) coins+=PAYOUT[reels[0]];
    else if(reels[0]===reels[1] || reels[1]===reels[2] || reels[0]===reels[2]) coins+=10;
    document.getElementById('slCoins').textContent=coins;
  };
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
