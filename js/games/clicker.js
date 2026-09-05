import { hud, mkHint, mkButton, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Coins','clkCoins'],['Pro Klick','clkPerClick']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='340px';
  const bigBtn=document.createElement('button');
  bigBtn.textContent='🪙';
  bigBtn.style.cssText='width:160px;height:160px;border-radius:50%;background:linear-gradient(135deg,#FDE68A,#F59E0B);border:none;font-size:64px;cursor:pointer;display:block;margin:10px auto;';
  const upgradeBtn=mkButton('Upgrade — +1 pro Klick','var(--violet)','#fff');
  upgradeBtn.style.width='100%';
  wrap.appendChild(bigBtn);
  playerBody.append(scoreEl, wrap, upgradeBtn, mkHint('Klicke die Münze, kaufe Upgrades, sammle möglichst viele Coins. Kein Zeitlimit.'));
  let coins, perClick, upgradeCost;
  function updateUpgradeBtn(){ upgradeBtn.textContent=`Upgrade (Kosten: ${upgradeCost} Coins) — +1 pro Klick`; }
  function start(){
    coins=0; perClick=1; upgradeCost=10;
    document.getElementById('clkCoins').textContent=0;
    document.getElementById('clkPerClick').textContent=1;
    updateUpgradeBtn();
  }
  bigBtn.onclick=()=>{
    coins+=perClick;
    document.getElementById('clkCoins').textContent=coins;
    bigBtn.style.transform='scale(0.9)';
    setTimeout(()=>bigBtn.style.transform='scale(1)',80);
  };
  upgradeBtn.onclick=()=>{
    if(coins>=upgradeCost){
      coins-=upgradeCost; perClick++; upgradeCost=Math.floor(upgradeCost*1.6);
      document.getElementById('clkCoins').textContent=coins;
      document.getElementById('clkPerClick').textContent=perClick;
      updateUpgradeBtn();
    }
  };
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
