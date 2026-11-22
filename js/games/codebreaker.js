import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

// 🔐 CODEKNACKER – der Computer hat einen geheimen Code aus 4 Farben. Knack ihn!
// ⚫ = richtige Farbe am richtigen Platz, ⚪ = richtige Farbe, aber falscher Platz.
// ---------- 🛠️ LUKI-ECKE ----------
const LAENGE   = 4;    // Wie lang ist der Code?
const VERSUCHE = 10;   // Wie viele Versuche hast du?
const DOPPELT  = false; // Dürfen Farben doppelt vorkommen? (true = schwerer)
// ------------------------------------
const COLORS = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'];

export function build(){
  const scoreEl = hud(['Versuch','cbTry'], ['Gewonnen','cbWins']);
  const board = document.createElement('div');
  board.style.cssText = 'display:flex; flex-direction:column; gap:6px; background:#1D1730; padding:12px; border-radius:14px; max-height:420px; overflow:auto;';
  const current = document.createElement('div');
  current.style.cssText = 'display:flex; gap:10px; justify-content:center; align-items:center;';
  const palette = document.createElement('div');
  palette.style.cssText = 'display:flex; gap:8px; justify-content:center; flex-wrap:wrap;';
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex; gap:8px; justify-content:center;';
  const delBtn = mkButton('⌫ Löschen', 'var(--card)', '#fff'), okBtn = mkButton('✓ Prüfen');
  controls.append(delBtn, okBtn);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:12px; align-items:center;';
  wrap.append(board, current, palette, controls);
  playerBody.append(scoreEl, wrap, mkHint(`Wähle ${LAENGE} Farben und drück Prüfen. ⚫ = richtig am richtigen Platz, ⚪ = Farbe kommt vor, aber woanders.`));
  const over = overMsg(wrap, '', start);
  const peg = (c, size = 34) => { const d = document.createElement('div'); d.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${c || '#0F0B1C'};border:2px solid rgba(255,255,255,${c ? .3 : .12});`; return d; };
  let secret, guess, tries, wins = 0, done;

  COLORS.forEach((c, i) => { const b = peg(c, 40); b.style.cursor = 'pointer'; b.title = 'Taste ' + (i + 1); b.onclick = () => add(i); palette.appendChild(b); });
  delBtn.onclick = () => { if(!done){ guess.pop(); renderCurrent(); } };
  okBtn.onclick = check;

  function start(){
    const pool = [...COLORS.keys()];
    secret = Array.from({ length: LAENGE }, () => DOPPELT ? Math.floor(Math.random() * COLORS.length) : pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    guess = []; tries = 0; done = false; board.innerHTML = '';
    over.classList.remove('show'); renderCurrent(); updateHud();
  }
  function updateHud(){ document.getElementById('cbTry').textContent = `${tries}/${VERSUCHE}`; document.getElementById('cbWins').textContent = wins; }
  function add(i){ if(done || guess.length >= LAENGE) return; if(!DOPPELT && guess.includes(i)){ sfx.wrong?.(); return; } guess.push(i); sfx.click?.(); renderCurrent(); }
  function renderCurrent(){
    current.innerHTML = '';
    for(let i = 0; i < LAENGE; i++) current.appendChild(peg(guess[i] !== undefined ? COLORS[guess[i]] : null));
    okBtn.style.opacity = guess.length === LAENGE ? '1' : '.5';
  }
  function check(){
    if(done || guess.length < LAENGE) return;
    let black = 0, white = 0;
    const s = [...secret], g = [...guess];
    for(let i = 0; i < LAENGE; i++) if(g[i] === s[i]){ black++; s[i] = g[i] = -1; }
    for(let i = 0; i < LAENGE; i++) if(g[i] >= 0){ const k = s.indexOf(g[i]); if(k >= 0){ white++; s[k] = -1; } }
    tries++;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:8px; align-items:center;';
    const num = document.createElement('span'); num.textContent = tries + '.'; num.style.cssText = 'width:22px; color:#B4A9D6; font-size:13px;';
    row.appendChild(num);
    guess.forEach(i => row.appendChild(peg(COLORS[i], 26)));
    const fb = document.createElement('span'); fb.style.cssText = 'margin-left:8px; font-size:14px; letter-spacing:1px; min-width:70px;';
    fb.textContent = '⚫'.repeat(black) + '⚪'.repeat(white) || '–';
    row.appendChild(fb);
    board.appendChild(row); board.scrollTop = board.scrollHeight;
    guess = []; renderCurrent(); updateHud();
    if(black === LAENGE){ done = true; wins++; sfx.win(); updateHud(); over.querySelector('div').textContent = `Geknackt in ${tries} Versuchen! 🔓`; over.classList.add('show'); }
    else if(tries >= VERSUCHE){ done = true; sfx.lose(); reveal(); }
    else (black + white ? sfx.coin : sfx.miss)();
  }
  function reveal(){
    over.querySelector('div').textContent = 'Nicht geknackt! So war der Code:';
    const sol = document.createElement('div'); sol.style.cssText = 'display:flex; gap:8px; justify-content:center; margin:8px 0;';
    secret.forEach(i => sol.appendChild(peg(COLORS[i], 28)));
    over.querySelector('div').appendChild(sol);
    over.classList.add('show');
  }
  const kd = e => { const n = parseInt(e.key, 10); if(n >= 1 && n <= COLORS.length) add(n - 1); else if(e.key === 'Backspace'){ delBtn.onclick(); } else if(e.key === 'Enter') check(); };
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => document.removeEventListener('keydown', kd);
}
