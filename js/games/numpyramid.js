import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// 🔺 ZAHLEN-PYRAMIDE – jeder Stein ist die Summe der beiden Steine darunter!
// Fülle die leeren Steine aus. Klick einen leeren Stein an und tipp die Zahl ein.
// ---------- 🛠️ LUKI-ECKE ----------
const REIHEN  = 4;     // Wie hoch ist die Pyramide? (4 = leicht, 5 = schwer)
const MAX_UNTEN = 12;  // Größte Zahl in der untersten Reihe
// ------------------------------------

export function build(){
  const scoreEl = hud(['Gelöst','npSolved'], ['Fehler','npErr']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:6px; align-items:center; background:#1D1730; padding:18px; border-radius:16px;';
  const pad = document.createElement('div'); pad.style.cssText = 'display:grid; grid-template-columns:repeat(5, 48px); gap:6px; margin-top:12px;';
  playerBody.append(scoreEl, wrap, pad, mkHint('Beispiel: Stehen unten 3 und 5, dann kommt darüber 8. Klick einen leeren Stein und tipp die Zahl (Ziffern + Enter, oder die Knöpfe).'));
  const over = overMsg(wrap, '', start);
  let rows, shown, input, sel, solved = 0, errors = 0, done;

  ['1','2','3','4','5','6','7','8','9','0','⌫','✓'].forEach(k => {
    const b = document.createElement('button'); b.textContent = k;
    b.style.cssText = `height:44px; border:none; border-radius:10px; font-family:Fredoka; font-size:20px; font-weight:700; cursor:pointer; background:${k === '✓' ? '#C6FF3D' : '#241C40'}; color:${k === '✓' ? '#14101F' : '#fff'};`;
    if(k === '✓') b.style.gridColumn = 'span 2';
    b.onclick = () => key(k === '⌫' ? 'Backspace' : k === '✓' ? 'Enter' : k);
    pad.appendChild(b);
  });
  function start(){
    const base = Array.from({ length: REIHEN }, () => 1 + Math.floor(Math.random() * MAX_UNTEN));
    rows = [base]; while(rows[0].length > 1){ const r = rows[0]; rows.unshift(r.slice(1).map((v, i) => v + r[i])); }
    // So viele Steine verstecken, dass es lösbar bleibt: in jeder Reihe genau einer sichtbar bleibt sicher
    shown = rows.map(r => r.map(() => false));
    // Lösbar machen: unterste Reihe zum Teil zeigen, Rest wird erschlossen. Wir zeigen einen Stein pro Reihe (Diagonale ist immer eindeutig lösbar).
    const keep = Math.floor(Math.random() * 2);
    rows.forEach((r, ri) => { const k = keep ? 0 : r.length - 1; shown[ri][k] = true; });
    input = rows.map(r => r.map(() => '')); done = false;
    sel = findEmpty();   // gleich den ersten leeren Stein auswählen
    over.classList.remove('show'); render(); updateHud();
  }
  function updateHud(){ document.getElementById('npSolved').textContent = solved; document.getElementById('npErr').textContent = errors; }
  function render(){
    wrap.innerHTML = '';
    rows.forEach((r, ri) => {
      const row = document.createElement('div'); row.style.cssText = 'display:flex; gap:6px; justify-content:center;';
      r.forEach((v, i) => {
        const b = document.createElement('div');
        const isSel = sel && sel[0] === ri && sel[1] === i, fixed = shown[ri][i], val = fixed ? v : input[ri][i];
        b.textContent = val;
        b.style.cssText = `width:60px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:8px; font-family:Fredoka; font-size:20px; font-weight:700; cursor:${fixed ? 'default' : 'pointer'}; background:${fixed ? '#B45309' : isSel ? '#3A2F63' : '#F8FAFC'}; color:${fixed ? '#FEF3C7' : '#111827'}; border:3px solid ${isSel ? '#C6FF3D' : 'transparent'};`;
        if(!fixed) b.onclick = () => { sel = [ri, i]; render(); };
        row.appendChild(b);
      });
      wrap.appendChild(row);
    });
  }
  function key(k){
    if(done || !sel) return;
    const [ri, i] = sel;
    if(/^\d$/.test(k) && input[ri][i].length < 4){ input[ri][i] += k; render(); }
    else if(k === 'Backspace'){ input[ri][i] = input[ri][i].slice(0, -1); render(); }
    else if(k === 'Enter') check();
  }
  function check(){
    const empty = rows.some((r, ri) => r.some((v, i) => !shown[ri][i] && input[ri][i] === ''));
    if(empty){ // nur den aktuellen Stein prüfen
      const [ri, i] = sel; if(input[ri][i] === '') return;
      if(+input[ri][i] === rows[ri][i]){ shown[ri][i] = true; sfx.correct?.(); const nxt = findEmpty(); sel = nxt; }
      else { errors++; sfx.wrong?.(); input[ri][i] = ''; }
      updateHud(); render();
      if(!findEmpty()) finish();
      return;
    }
    finish();
  }
  function findEmpty(){ for(let ri = rows.length - 1; ri >= 0; ri--) for(let i = 0; i < rows[ri].length; i++) if(!shown[ri][i]) return [ri, i]; return null; }
  function finish(){ done = true; solved++; updateHud(); sfx.win(); over.querySelector('div').textContent = `Pyramide geschafft! 🔺 Spitze: ${rows[0][0]}`; over.classList.add('show'); }
  const kd = e => { if(/^\d$/.test(e.key) || e.key === 'Backspace' || e.key === 'Enter'){ e.preventDefault(); key(e.key); } };
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => document.removeEventListener('keydown', kd);
}
