import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl = hud(['Bankroll','bjBank'], ['Einsatz','bjBet'], ['Runde','bjRound']);
  const table = document.createElement('div');
  table.style.cssText = 'width:100%; max-width:480px; background:#0F5132; border-radius:16px; padding:20px; border:1px solid rgba(255,255,255,0.1); display:flex; flex-direction:column; gap:16px;';
  const dealerZone = document.createElement('div');
  const playerZone = document.createElement('div');
  [dealerZone, playerZone].forEach(z=>{
    z.style.cssText = 'display:flex; flex-direction:column; gap:8px;';
  });
  const dealerLabel = document.createElement('div');
  dealerLabel.style.cssText = 'font-family:Fredoka; font-weight:600; color:#D9F7E4;';
  const playerLabel = document.createElement('div');
  playerLabel.style.cssText = 'font-family:Fredoka; font-weight:600; color:#D9F7E4;';
  const dealerCards = document.createElement('div');
  const playerCards = document.createElement('div');
  [dealerCards, playerCards].forEach(c=>{
    c.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; min-height:78px;';
  });
  dealerZone.append(dealerLabel, dealerCards);
  playerZone.append(playerLabel, playerCards);

  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex; gap:10px; justify-content:center; flex-wrap:wrap;';
  function mkBtn(label){
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'background:var(--lime); color:#14101F; border:none; font-weight:700; font-family:Fredoka; padding:10px 20px; border-radius:10px; cursor:pointer;';
    return b;
  }
  const hitBtn = mkBtn('Karte (Hit)');
  const standBtn = mkBtn('Halten (Stand)');
  const dealBtn = mkBtn('Neue Runde (—10)');
  standBtn.style.background = '#F59E0B';
  dealBtn.style.background = '#7C3AED'; dealBtn.style.color = '#fff';
  controls.append(hitBtn, standBtn, dealBtn);

  table.append(dealerZone, playerZone);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='480px';
  wrap.appendChild(table);
  playerBody.append(scoreEl, wrap, controls, mkHint('Ziel: 21 treffen oder so nah wie möglich rankommen, ohne drüber zu gehen. Bube/Dame/König = 10, Ass = 11 oder 1.'));
  const over = overMsg(wrap, '', restartRound);

  const SUITS = ['♠','♥','♦','♣'];
  const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  let deck, dealerHand, playerHand, bank, bet, round, phase;

  function start(){
    bank = 100; round = 0; bet = 0;
    updateHud();
    newDeck();
    dealerHand = []; playerHand = [];
    phase = 'idle';
    dealerLabel.textContent = 'Dealer';
    playerLabel.textContent = 'Du';
    renderCards();
    setControls(false, false, true);
    dealBtn.textContent = 'Runde starten (Einsatz 10)';
  }
  function newDeck(){
    deck = [];
    for(const s of SUITS) for(const r of RANKS) deck.push({r,s});
    for(let i=deck.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]]; }
  }
  function draw(){
    if(deck.length < 4) newDeck();
    return deck.pop();
  }
  function cardValue(hand){
    let total = 0, aces = 0;
    hand.forEach(c=>{
      if(c.r==='A'){ aces++; total+=11; }
      else if(['J','Q','K'].includes(c.r)) total+=10;
      else total += parseInt(c.r);
    });
    while(total>21 && aces>0){ total-=10; aces--; }
    return total;
  }
  function cardEl(c, hidden){
    const el = document.createElement('div');
    const red = (c.s==='♥'||c.s==='♦');
    el.style.cssText = `width:52px;height:74px;border-radius:8px;background:${hidden?'#1D1730':'#fff'};display:flex;align-items:center;justify-content:center;flex-direction:column;font-weight:700;font-size:18px;color:${hidden?'#7C3AED':(red?'#DC2626':'#111')};border:1px solid rgba(0,0,0,0.15);`;
    el.textContent = hidden ? '🂠' : `${c.r}${c.s}`;
    return el;
  }
  function renderCards(hideDealerHole){
    dealerCards.innerHTML = '';
    dealerHand.forEach((c,i)=> dealerCards.appendChild(cardEl(c, hideDealerHole && i===1)));
    playerCards.innerHTML = '';
    playerHand.forEach(c=> playerCards.appendChild(cardEl(c, false)));
    const dVal = hideDealerHole ? '?' : cardValue(dealerHand);
    dealerLabel.textContent = `Dealer (${dVal})`;
    playerLabel.textContent = `Du (${cardValue(playerHand)})`;
  }
  function updateHud(){
    document.getElementById('bjBank').textContent = bank + '€';
    document.getElementById('bjBet').textContent = bet + '€';
    document.getElementById('bjRound').textContent = round;
  }
  function setControls(hit, stand, deal){
    hitBtn.disabled = !hit; standBtn.disabled = !stand; dealBtn.disabled = !deal;
    [hitBtn, standBtn, dealBtn].forEach((b,i)=> b.style.opacity = [hit,stand,deal][i] ? 1 : 0.4);
  }
  function dealRound(){
    if(bank < 10){
      over.querySelector('div').textContent = 'Bankroll leer! 💸';
      over.classList.add('show');
      return;
    }
    bank -= 10; bet = 10; round++;
    updateHud();
    playerHand = [draw(), draw()];
    dealerHand = [draw(), draw()];
    phase = 'player';
    renderCards(true);
    setControls(true, true, false);
    if(cardValue(playerHand) === 21){
      if(cardValue(dealerHand) === 21) finishRound('push21');
      else finishRound('blackjack');
    }
  }
  function restartRound(){
    over.classList.remove('show');
    if(bank < 10){ start(); return; }
    dealRound();
  }
  hitBtn.onclick = ()=>{
    if(phase!=='player') return;
    playerHand.push(draw());
    renderCards(true);
    if(cardValue(playerHand) > 21) finishRound('bust');
  };
  standBtn.onclick = ()=>{
    if(phase!=='player') return;
    phase = 'dealer';
    dealerTurn();
  };
  dealBtn.onclick = ()=>{
    if(phase==='idle') dealRound();
  };
  function dealerTurn(){
    renderCards(false);
    const step = ()=>{
      if(cardValue(dealerHand) < 17){
        dealerHand.push(draw());
        renderCards(false);
        setTimeout(step, 500);
      } else {
        finishRound('compare');
      }
    };
    setTimeout(step, 500);
  }
  function finishRound(reason){
    phase = 'idle';
    renderCards(false);
    setControls(false, false, true);
    dealBtn.textContent = 'Nächste Runde (Einsatz 10)';
    const pVal = cardValue(playerHand), dVal = cardValue(dealerHand);
    let msg;
    if(reason==='blackjack'){ bank += 25; msg = 'Blackjack! Du gewinnst 25€ 🎉'; }
    else if(reason==='push21'){ bank += 10; msg = `Beide haben Blackjack (21)! Unentschieden – Einsatz zurück.`; }
    else if(reason==='bust'){ msg = `Überkauft (${pVal})! Verloren.`; }
    else if(dVal>21){ bank += 20; msg = `Dealer überkauft (${dVal})! Du gewinnst 20€.`; }
    else if(pVal>dVal){ bank += 20; msg = `Du gewinnst! ${pVal} gegen ${dVal}.`; }
    else if(pVal===dVal){ bank += 10; msg = `Unentschieden (${pVal}). Einsatz zurück.`; }
    else{ msg = `Dealer gewinnt. ${dVal} gegen ${pVal}.`; }
    updateHud();
    over.querySelector('div').textContent = msg;
    over.classList.add('show');
  }
  window.__restartCurrent = start;
  start();
  return ()=>{};
}
