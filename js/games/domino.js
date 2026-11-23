import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🁫 DOMINO – leg deine Steine an die Enden der Kette. Die Augenzahl muss passen!
// Wer zuerst keine Steine mehr hat, gewinnt. Kannst du nicht, ziehst du vom Stapel.
// ---------- 🛠️ LUKI-ECKE ----------
const START_STEINE = 7;
// ------------------------------------
const PIP = { 0: [], 1: [[1,1]], 2: [[0,0],[2,2]], 3: [[0,0],[1,1],[2,2]], 4: [[0,0],[2,0],[0,2],[2,2]], 5: [[0,0],[2,0],[1,1],[0,2],[2,2]], 6: [[0,0],[2,0],[0,1],[2,1],[0,2],[2,2]] };

export function build(){
  const scoreEl = hud([L('Deine Steine', 'Your tiles'),'doMe'], [L('Computer', 'Computer'),'doCpu'], [L('Stapel', 'Pile'),'doPile']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:12px; align-items:center; width:100%; max-width:520px;';
  const chainEl = document.createElement('div'); chainEl.style.cssText = 'display:flex; flex-wrap:wrap; gap:3px; justify-content:center; background:#14532D; padding:12px; border-radius:14px; min-height:60px; width:100%; box-sizing:border-box;';
  const status = document.createElement('div'); status.style.cssText = 'font-family:Fredoka; font-weight:600; min-height:24px; text-align:center;';
  const handEl = document.createElement('div'); handEl.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; justify-content:center;';
  const drawBtn = document.createElement('button'); drawBtn.textContent = '🂠 Ziehen / Passen';
  drawBtn.style.cssText = 'background:#241C40; color:#fff; border:none; border-radius:10px; padding:10px 16px; font-family:Fredoka; font-weight:700; cursor:pointer;';
  wrap.append(chainEl, status, handEl, drawBtn);
  playerBody.append(scoreEl, wrap, mkHint(L('Klick einen hellen Stein zum Anlegen. Passt er an beide Enden, wähle danach links ◀ oder rechts ▶. Nichts passt? Ziehen!', 'Click a bright tile to play it. If it fits both ends, then pick left ◀ or right ▶. Nothing fits? Draw!')));
  const over = overMsg(wrap, '', start);
  let pile, me, cpu, chain, turn, pending, done, passes, timer;

  const tileEl = (t, small, vertical) => {
    const c = document.createElement('canvas'); const w = small ? 44 : 60, h = small ? 22 : 30;
    c.width = vertical ? h : w; c.height = vertical ? w : h;
    c.style.cssText = `width:${c.width}px;height:${c.height}px;`;
    const x = c.getContext('2d');
    x.fillStyle = '#F8FAFC'; x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = '#94A3B8'; x.lineWidth = 2; x.strokeRect(1, 1, c.width - 2, c.height - 2);
    const half = vertical ? c.height / 2 : c.width / 2;
    x.beginPath(); vertical ? (x.moveTo(3, half), x.lineTo(c.width - 3, half)) : (x.moveTo(half, 3), x.lineTo(half, c.height - 3)); x.stroke();
    x.fillStyle = '#111827';
    [t[0], t[1]].forEach((v, side) => {
      const ox = vertical ? 0 : side * half, oy = vertical ? side * half : 0, sz = vertical ? c.width : half;
      PIP[v].forEach(([px, py]) => { x.beginPath(); x.arc(ox + sz * (0.22 + px * 0.28), oy + sz * (0.22 + py * 0.28), sz * 0.08, 0, 7); x.fill(); });
    });
    return c;
  };
  function start(){
    clearTimeout(timer);
    pile = []; for(let a = 0; a <= 6; a++) for(let b = a; b <= 6; b++) pile.push([a, b]);
    pile.sort(() => Math.random() - .5);
    me = pile.splice(0, START_STEINE); cpu = pile.splice(0, START_STEINE);
    chain = []; pending = null; done = false; passes = 0;
    // Wer den höchsten Pasch hat, fängt an
    const dbl = h => Math.max(-1, ...h.filter(t => t[0] === t[1]).map(t => t[0]));
    turn = dbl(cpu) > dbl(me) ? 'cpu' : 'me';
    over.classList.remove('show'); render(turn === 'me' ? 'Du fängst an!' : 'Der Computer fängt an.');
    if(turn === 'cpu') timer = setTimeout(cpuTurn, 900);
  }
  const ends = () => chain.length ? [chain[0][0], chain[chain.length - 1][1]] : null;
  function options(t){
    const e = ends(); if(!e) return ['L'];
    const o = []; if(t.includes(e[0])) o.push('L'); if(t.includes(e[1])) o.push('R'); return o;
  }
  function place(t, side){
    const e = ends();
    if(!e) chain.push(t);
    else if(side === 'L') chain.unshift(t[1] === e[0] ? t : [t[1], t[0]]);
    else chain.push(t[0] === e[1] ? t : [t[1], t[0]]);
    sfx.place?.(); passes = 0;
  }
  function myPick(i){
    if(turn !== 'me' || done) return;
    const t = me[i];
    if(!t) return;   // Stein gibt es nicht mehr (z. B. Doppelklick)
    const o = options(t);
    if(!o.length){ sfx.wrong?.(); render('Der Stein passt nicht.'); return; }
    if(o.length === 2 && ends()[0] !== ends()[1]){ pending = i; render('An welches Ende? ◀ links oder ▶ rechts'); return; }
    me.splice(i, 1); place(t, o[0]); afterMe();
  }
  function mySide(side){ if(pending === null || !me[pending]) { pending = null; return; } const t = me.splice(pending, 1)[0]; pending = null; place(t, side); afterMe(); }
  function afterMe(){ if(!me.length) return finish('me'); turn = 'cpu'; render('Computer ist dran…'); timer = setTimeout(cpuTurn, 900); }
  function myDraw(){
    if(turn !== 'me' || done) return;
    pending = null;
    if(me.some(t => options(t).length)){ render('Du kannst noch einen Stein anlegen!'); sfx.wrong?.(); return; }
    if(pile.length){ me.push(pile.shift()); sfx.cardFlip?.(); render('Du hast einen Stein gezogen.'); return; }
    passes++; if(passes >= 2) return finish('block');
    turn = 'cpu'; render('Du passt.'); timer = setTimeout(cpuTurn, 900);
  }
  function cpuTurn(){
    if(done) return;
    let playable = cpu.map((t, i) => [t, i, options(t)]).filter(x => x[2].length);
    while(!playable.length && pile.length){ cpu.push(pile.shift()); playable = cpu.map((t, i) => [t, i, options(t)]).filter(x => x[2].length); }
    if(!playable.length){ passes++; if(passes >= 2) return finish('block'); turn = 'me'; render('Der Computer muss passen. Du bist dran!'); return; }
    playable.sort((a, b) => (b[0][0] + b[0][1]) - (a[0][0] + a[0][1]));   // schwere Steine zuerst loswerden
    const [t, i, o] = playable[0];
    cpu.splice(i, 1); place(t, o[Math.floor(Math.random() * o.length)]);
    if(!cpu.length) return finish('cpu');
    turn = 'me'; render(`Computer legt [${t[0]}|${t[1]}]. Du bist dran!`);
  }
  function finish(who){
    done = true;
    if(who === 'block'){ const sm = me.reduce((a, t) => a + t[0] + t[1], 0), sc = cpu.reduce((a, t) => a + t[0] + t[1], 0); who = sm < sc ? 'me' : sm > sc ? 'cpu' : 'draw'; }
    render('');
    (who === 'me' ? sfx.win : sfx.lose)();
    over.querySelector('div').textContent = who === 'me' ? 'Du hast gewonnen! 🁫🎉' : who === 'cpu' ? 'Der Computer hat gewonnen!' : 'Unentschieden!';
    timer = setTimeout(() => over.classList.add('show'), 600);
  }
  function render(msg){
    document.getElementById('doMe').textContent = me.length; document.getElementById('doCpu').textContent = cpu.length; document.getElementById('doPile').textContent = pile.length;
    chainEl.innerHTML = '';
    if(pending !== null){ const b = document.createElement('button'); b.textContent = '◀'; b.style.cssText = 'font-size:20px;background:#C6FF3D;border:none;border-radius:8px;cursor:pointer;padding:0 10px;'; b.onclick = () => mySide('L'); chainEl.appendChild(b); }
    chain.forEach(t => chainEl.appendChild(tileEl(t, true, t[0] === t[1])));
    if(!chain.length){ const s = document.createElement('span'); s.textContent = 'Hier entsteht die Kette'; s.style.cssText = 'color:#BBF7D0;font-family:Fredoka;'; chainEl.appendChild(s); }
    if(pending !== null){ const b = document.createElement('button'); b.textContent = '▶'; b.style.cssText = 'font-size:20px;background:#C6FF3D;border:none;border-radius:8px;cursor:pointer;padding:0 10px;'; b.onclick = () => mySide('R'); chainEl.appendChild(b); }
    handEl.innerHTML = '';
    me.forEach((t, i) => { const el = tileEl(t, false, false); const ok = turn === 'me' && options(t).length; el.style.cursor = 'pointer'; el.style.opacity = turn === 'me' && !ok ? '.45' : '1'; el.style.outline = i === pending ? '3px solid #C6FF3D' : ''; el.onclick = () => myPick(i); handEl.appendChild(el); });
    if(msg !== undefined) status.textContent = msg;
  }
  drawBtn.onclick = myDraw;
  window.__restartCurrent = start;
  start();
  return () => clearTimeout(timer);
}
