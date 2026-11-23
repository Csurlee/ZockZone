import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🃏 MAU-MAU – wer zuerst alle Karten los ist, gewinnt!
// Leg eine Karte mit gleicher Farbe (♥ ♦ ♠ ♣) oder gleichem Wert. Kannst du nicht, zieh eine Karte.
// Sonderkarten: 7 = Gegner zieht 2 · 8 = Gegner muss aussetzen · Bube = du wünschst dir eine Farbe
// ---------- 🛠️ LUKI-ECKE ----------
const START_KARTEN = 5;
// ------------------------------------
const SUITS = ['♥', '♦', '♠', '♣'], RED = { '♥': 1, '♦': 1 };
const VALUES = ['7', '8', '9', '10', 'B', 'D', 'K', 'A'];

export function build(){
  const scoreEl = hud([L('Deine Karten', 'Your cards'),'mmMe'], [L('Computer', 'Computer'),'mmCpu'], [L('Siege', 'Wins'),'mmWins']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:12px; align-items:center; width:100%; max-width:480px;';
  const cpuRow = document.createElement('div'); cpuRow.style.cssText = 'display:flex; gap:-10px; min-height:70px;';
  const mid = document.createElement('div'); mid.style.cssText = 'display:flex; gap:18px; align-items:center;';
  const status = document.createElement('div'); status.style.cssText = 'font-family:Fredoka; font-weight:600; min-height:24px; text-align:center;';
  const hand = document.createElement('div'); hand.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; justify-content:center;';
  const wish = document.createElement('div'); wish.style.cssText = 'display:none; gap:8px;';
  SUITS.forEach(s => { const b = mkButton(s, '#F8FAFC', RED[s] ? '#DC2626' : '#111827'); b.style.fontSize = '22px'; b.onclick = () => chooseWish(s); wish.appendChild(b); });
  wrap.append(cpuRow, mid, status, wish, hand);
  playerBody.append(scoreEl, wrap, mkHint(L('Klick eine passende Karte zum Legen. Keine passt? Klick auf den Stapel zum Ziehen. 7 = +2, 8 = Aussetzen, B = Farbe wünschen.', 'Click a matching card to play it. Nothing fits? Click the pile to draw. 7 = +2, 8 = skip, J (B) = wish a suit.')));
  const over = overMsg(wrap, '', start);
  let deck, pile, me, cpu, wishSuit, drawPenalty, turn, wins = 0, done, timer;

  const card = (c, small) => {
    const d = document.createElement('div');
    d.style.cssText = `width:${small ? 40 : 58}px;height:${small ? 58 : 84}px;border-radius:8px;background:#F8FAFC;border:2px solid #CBD5E1;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Fredoka;font-weight:700;color:${RED[c.s] ? '#DC2626' : '#111827'};font-size:${small ? 14 : 20}px;line-height:1.1;user-select:none;`;
    d.innerHTML = `<span>${c.v}</span><span style="font-size:${small ? 16 : 26}px">${c.s}</span>`;
    return d;
  };
  const back = () => { const d = document.createElement('div'); d.style.cssText = 'width:40px;height:58px;border-radius:8px;background:repeating-linear-gradient(45deg,#7C3AED 0 6px,#5B21B6 6px 12px);border:2px solid #C4B5FD;margin-left:-14px;'; return d; };

  function start(){
    clearTimeout(timer);
    deck = []; SUITS.forEach(s => VALUES.forEach(v => deck.push({ s, v }))); deck.sort(() => Math.random() - .5);
    me = deck.splice(0, START_KARTEN); cpu = deck.splice(0, START_KARTEN);
    let first; do { first = deck.shift(); if(['7', '8', 'B'].includes(first.v)) deck.push(first); else break; } while(true);
    pile = [first]; wishSuit = null; drawPenalty = 0; turn = 'me'; done = false;
    over.classList.remove('show'); render();
  }
  const top = () => pile[pile.length - 1];
  const fits = c => {
    if(drawPenalty) return c.v === '7';                  // auf eine 7 nur mit einer 7 antworten
    if(c.v === 'B') return top().v !== 'B' || !!wishSuit;
    return wishSuit ? c.s === wishSuit : (c.s === top().s || c.v === top().v);
  };
  function take(n, who){
    for(let i = 0; i < n; i++){
      if(!deck.length){ const t = pile.pop(); deck = pile.sort(() => Math.random() - .5); pile = [t]; }
      if(deck.length) who.push(deck.shift());
    }
  }
  function play(c, who, hand){
    hand.splice(hand.indexOf(c), 1); pile.push(c); wishSuit = null; sfx.place?.();
    if(!hand.length){ finish(who); return 'end'; }
    if(c.v === '7'){ drawPenalty += 2; }
    if(c.v === '8') return 'skip';
    if(c.v === 'B') return 'wish';
    return 'ok';
  }
  function myPlay(i){
    if(turn !== 'me' || done) return;
    const c = me[i];
    if(!c) return;   // Karte gibt es nicht mehr (z. B. Doppelklick)
    if(!fits(c)){ sfx.wrong?.(); status.textContent = 'Die Karte passt nicht!'; return; }
    const r = play(c, 'me', me);
    if(r === 'end') return;
    if(r === 'wish'){ turn = 'wish'; render(); return; }
    if(r === 'skip'){ status.textContent = 'Computer muss aussetzen! Du bist nochmal dran.'; render(false); return; }
    turn = 'cpu'; render(); timer = setTimeout(cpuTurn, 800);
  }
  function chooseWish(s){ if(turn !== 'wish') return; wishSuit = s; turn = 'cpu'; render(); timer = setTimeout(cpuTurn, 800); }
  function myDraw(){
    if(turn !== 'me' || done) return;
    if(drawPenalty){ take(drawPenalty, me); status.textContent = `Du ziehst ${drawPenalty} Karten.`; drawPenalty = 0; }
    else { take(1, me); }
    sfx.cardFlip?.(); turn = 'cpu'; render(); timer = setTimeout(cpuTurn, 800);
  }
  function cpuTurn(){
    if(done) return;
    const options = cpu.filter(fits);
    if(!options.length){
      if(drawPenalty){ take(drawPenalty, cpu); status.textContent = `Computer zieht ${drawPenalty} Karten.`; drawPenalty = 0; }
      else { take(1, cpu); status.textContent = 'Computer zieht eine Karte.'; }
      turn = 'me'; render(false); return;
    }
    // Strategie: Buben aufheben, sonst Karte der häufigsten eigenen Farbe
    const cnt = s => cpu.filter(c => c.s === s).length;
    options.sort((a, b) => (a.v === 'B') - (b.v === 'B') || cnt(b.s) - cnt(a.s));
    const c = options[0];
    const r = play(c, 'cpu', cpu);
    if(r === 'end') return;
    status.textContent = `Computer legt ${c.v}${c.s}.`;
    if(r === 'wish'){ wishSuit = SUITS.slice().sort((a, b) => cnt(b) - cnt(a))[0]; status.textContent += ` Er wünscht sich ${wishSuit}.`; }
    if(r === 'skip'){ status.textContent += ' Du musst aussetzen!'; render(false); timer = setTimeout(cpuTurn, 1100); return; }
    turn = 'me'; render(false);
  }
  function finish(who){
    done = true; render(false);
    if(who === 'me'){ wins++; sfx.win(); over.querySelector('div').textContent = 'Mau-Mau! Du hast gewonnen! 🎉'; }
    else { sfx.lose(); over.querySelector('div').textContent = 'Der Computer hat Mau-Mau gemacht!'; }
    updateHud(); timer = setTimeout(() => over.classList.add('show'), 700);
  }
  function updateHud(){ document.getElementById('mmMe').textContent = me.length; document.getElementById('mmCpu').textContent = cpu.length; document.getElementById('mmWins').textContent = wins; }
  function render(setStatus = true){
    cpuRow.innerHTML = ''; cpu.forEach(() => cpuRow.appendChild(back()));
    mid.innerHTML = '';
    const stack = document.createElement('div');
    stack.style.cssText = 'width:58px;height:84px;border-radius:8px;background:repeating-linear-gradient(45deg,#7C3AED 0 6px,#5B21B6 6px 12px);border:2px solid #C4B5FD;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-family:Fredoka;font-weight:700;';
    stack.textContent = drawPenalty ? '+' + drawPenalty : deck.length; stack.title = 'Karte ziehen'; stack.onclick = myDraw;
    const topEl = card(top());
    mid.append(stack, topEl);
    if(wishSuit){ const w = document.createElement('div'); w.style.cssText = `font-size:28px;color:${RED[wishSuit] ? '#F87171' : '#F8FAFC'};font-family:Fredoka;`; w.textContent = '→ ' + wishSuit; mid.appendChild(w); }
    hand.innerHTML = '';
    me.forEach((c, i) => { const el = card(c); const ok = turn === 'me' && fits(c); el.style.cursor = 'pointer'; el.style.opacity = turn === 'me' && !ok ? '.55' : '1'; el.style.transform = ok ? 'translateY(-6px)' : ''; el.onclick = () => myPlay(i); hand.appendChild(el); });
    wish.style.display = turn === 'wish' ? 'flex' : 'none';
    if(setStatus) status.textContent = turn === 'wish' ? 'Welche Farbe wünschst du dir?' : turn === 'me' ? (drawPenalty ? `Leg eine 7 oder zieh ${drawPenalty}!` : 'Du bist dran!') : 'Computer überlegt…';
    updateHud();
  }
  window.__restartCurrent = start;
  start();
  return () => clearTimeout(timer);
}
