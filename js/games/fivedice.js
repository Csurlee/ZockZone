import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, mkButton, addLeaderboardUI, playerBody } from '../core.js';

// 🎲 FÜNF WÜRFEL – würfle bis zu 3 Mal, behalte die guten Würfel und trag dein Ergebnis in die Tabelle ein.
// Jedes Feld nur einmal! Wer am Ende die meisten Punkte hat, ist Würfel-König.
const CATS = [
  { id: 'ones',   name: 'Einser',      f: d => sum(d.filter(x => x === 1)) },
  { id: 'twos',   name: 'Zweier',      f: d => sum(d.filter(x => x === 2)) },
  { id: 'threes', name: 'Dreier',      f: d => sum(d.filter(x => x === 3)) },
  { id: 'fours',  name: 'Vierer',      f: d => sum(d.filter(x => x === 4)) },
  { id: 'fives',  name: 'Fünfer',      f: d => sum(d.filter(x => x === 5)) },
  { id: 'sixes',  name: 'Sechser',     f: d => sum(d.filter(x => x === 6)) },
  { id: 'three',  name: 'Dreierpasch', f: d => maxCount(d) >= 3 ? sum(d) : 0 },
  { id: 'four',   name: 'Viererpasch', f: d => maxCount(d) >= 4 ? sum(d) : 0 },
  { id: 'full',   name: 'Full House',  f: d => { const c = counts(d).filter(Boolean).sort(); return c.length === 2 && c[0] === 2 ? 25 : 0; } },
  { id: 'small',  name: 'Kleine Straße', f: d => straight(d) >= 4 ? 30 : 0 },
  { id: 'large',  name: 'Große Straße',  f: d => straight(d) >= 5 ? 40 : 0 },
  { id: 'five',   name: 'Fünf Gleiche',  f: d => maxCount(d) === 5 ? 50 : 0 },
  { id: 'chance', name: 'Chance',      f: d => sum(d) },
];
const sum = a => a.reduce((x, y) => x + y, 0);
const counts = d => { const c = Array(7).fill(0); d.forEach(x => c[x]++); return c; };
const maxCount = d => Math.max(...counts(d));
const straight = d => { const s = new Set(d); let best = 0, run = 0; for(let i = 1; i <= 6; i++){ run = s.has(i) ? run + 1 : 0; best = Math.max(best, run); } return best; };
const PIPS = { 1: [[1,1]], 2: [[0,0],[2,2]], 3: [[0,0],[1,1],[2,2]], 4: [[0,0],[2,0],[0,2],[2,2]], 5: [[0,0],[2,0],[1,1],[0,2],[2,2]], 6: [[0,0],[2,0],[0,1],[2,1],[0,2],[2,2]] };

export function build(){
  const scoreEl = hud(['Punkte','fdScore'], ['Würfe','fdRolls'], ['Bestwert','fdBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:12px; align-items:center;';
  const diceRow = document.createElement('div'); diceRow.style.cssText = 'display:flex; gap:10px;';
  const rollBtn = mkButton('🎲 Würfeln');
  const table = document.createElement('div');
  table.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:4px 12px; width:100%; max-width:420px;';
  wrap.append(diceRow, rollBtn, table);
  playerBody.append(scoreEl, wrap, mkHint('Würfeln, Würfel antippen zum Behalten (grün), nochmal würfeln. Nach höchstens 3 Würfen ein Feld in der Tabelle wählen. Bonus: 35 Punkte, wenn Einser bis Sechser zusammen 63+ ergeben!'));
  addLeaderboardUI('fivedice', 'Fünf Würfel');
  const over = overMsg(wrap, '', start);
  let dice, held, rolls, used, best = 0, rolling = false;

  function start(){ dice = [1, 2, 3, 4, 5]; held = [false, false, false, false, false]; rolls = 0; used = {}; over.classList.remove('show'); render(); }
  function upper(){ return ['ones','twos','threes','fours','fives','sixes'].reduce((a, k) => a + (used[k] ?? 0), 0); }
  function total(){ const u = upper(); return sum(Object.values(used)) + (u >= 63 ? 35 : 0); }
  function roll(){
    if(rolls >= 3 || rolling) return;
    rolling = true; rolls++; sfx.dice?.();
    let n = 0;
    const anim = setInterval(() => {
      dice = dice.map((d, i) => held[i] ? d : 1 + Math.floor(Math.random() * 6)); render();
      if(++n >= 6){ clearInterval(anim); rolling = false; render(); }
    }, 60);
  }
  function choose(cat){
    if(rolls === 0 || rolling || used[cat.id] !== undefined) return;
    used[cat.id] = cat.f(dice);
    used[cat.id] ? sfx.coin() : sfx.miss();
    rolls = 0; held = held.map(() => false);
    if(Object.keys(used).length === CATS.length){
      const t = total(); if(t > best) best = t;
      render(); sfx.win();
      over.querySelector('div').textContent = `Fertig! ${t} Punkte 🎲`; over.classList.add('show');
      window.zzSaveHighScore?.('fivedice', 'Fünf Würfel', t);
      return;
    }
    render();
  }
  function dieEl(v, h, i){
    const c = document.createElement('canvas'); c.width = 56; c.height = 56;
    c.style.cssText = `width:56px;height:56px;cursor:pointer;border-radius:12px;border:3px solid ${h ? '#C6FF3D' : 'transparent'};background:transparent;`;
    const x = c.getContext('2d');
    x.fillStyle = h ? '#ECFCCB' : '#FFFFFF'; x.beginPath(); x.roundRect ? x.roundRect(2, 2, 52, 52, 10) : x.rect(2, 2, 52, 52); x.fill();
    x.fillStyle = '#111827';
    (PIPS[v] || []).forEach(([px, py]) => { x.beginPath(); x.arc(14 + px * 14, 14 + py * 14, 5, 0, 7); x.fill(); });
    c.onclick = () => { if(rolls > 0 && !rolling){ held[i] = !held[i]; sfx.click?.(); render(); } };
    return c;
  }
  function render(){
    diceRow.innerHTML = '';
    dice.forEach((v, i) => diceRow.appendChild(dieEl(v, held[i], i)));
    rollBtn.textContent = rolls >= 3 ? 'Wähl ein Feld ↓' : rolls === 0 ? '🎲 Würfeln' : `🎲 Nochmal (${3 - rolls} übrig)`;
    rollBtn.style.opacity = rolls >= 3 ? '.5' : '1';
    table.innerHTML = '';
    CATS.forEach(cat => {
      const b = document.createElement('button');
      const isUsed = used[cat.id] !== undefined;
      const preview = rolls > 0 && !isUsed ? cat.f(dice) : null;
      b.style.cssText = `display:flex; justify-content:space-between; padding:8px 10px; border-radius:10px; border:none; font-family:Fredoka; font-size:14px; cursor:${isUsed ? 'default' : 'pointer'}; background:${isUsed ? '#14101F' : preview ? '#2E2560' : '#241C40'}; color:${isUsed ? '#8B83A8' : '#F3EEFF'};`;
      const l = document.createElement('span'); l.textContent = cat.name;
      const r = document.createElement('b'); r.textContent = isUsed ? used[cat.id] : preview !== null ? preview : '–';
      r.style.color = isUsed ? '#8B83A8' : preview ? '#C6FF3D' : '#8B83A8';
      b.append(l, r); b.onclick = () => choose(cat);
      table.appendChild(b);
    });
    const bonus = document.createElement('div');
    bonus.style.cssText = 'grid-column:1/-1; text-align:center; font-size:13px; color:#B4A9D6; padding-top:4px;';
    bonus.textContent = `Oben: ${upper()} / 63 → Bonus ${upper() >= 63 ? '35 ✓' : 'noch ' + (63 - upper())}`;
    table.appendChild(bonus);
    document.getElementById('fdScore').textContent = total();
    document.getElementById('fdRolls').textContent = `${rolls}/3`;
    document.getElementById('fdBest').textContent = best;
  }
  rollBtn.onclick = roll;
  const kd = e => { if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); roll(); } const n = parseInt(e.key, 10); if(n >= 1 && n <= 5 && rolls > 0 && !rolling){ held[n - 1] = !held[n - 1]; render(); } };
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => document.removeEventListener('keydown', kd);
}
