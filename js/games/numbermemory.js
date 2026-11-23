import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, mkButton, addLeaderboardUI, playerBody } from '../core.js';

// Texte auf Deutsch oder Englisch (je nach Spracheinstellung der ZockZone)
const L = (de, en) => { try { return localStorage.getItem('zz_lang') === 'en' ? en : de; } catch { return de; } };

// 🧠 ZAHLEN-GEDÄCHTNIS – merk dir die Zahl! Jede Runde wird sie eine Ziffer länger.
// ---------- 🛠️ LUKI-ECKE ----------
const START_LAENGE = 3;     // Mit wie vielen Ziffern geht es los?
const ZEIT_PRO_ZIFFER = 0.7; // Sekunden Anschauzeit pro Ziffer
// ------------------------------------

export function build(){
  const scoreEl = hud([L('Ziffern', 'Digits'),'nmLevel'], [L('Bestwert', 'Best'),'nmBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  wrap.style.cssText = 'width:100%; max-width:420px; min-height:240px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; background:#1D1730; border-radius:16px; padding:24px; box-sizing:border-box;';
  const numEl = document.createElement('div');
  numEl.style.cssText = 'font-family:"JetBrains Mono",monospace; font-size:40px; font-weight:700; letter-spacing:4px; color:#C6FF3D; text-align:center; word-break:break-all; min-height:54px;';
  const bar = document.createElement('div');
  bar.style.cssText = 'width:100%; height:8px; background:#0F0B1C; border-radius:99px; overflow:hidden;';
  const barFill = document.createElement('div');
  barFill.style.cssText = 'height:100%; width:100%; background:#C6FF3D; border-radius:99px;';
  bar.appendChild(barFill);
  const input = document.createElement('input');
  input.type = 'text'; input.inputMode = 'numeric'; input.autocomplete = 'off'; input.placeholder = 'Zahl eintippen…';
  input.style.cssText = 'font-family:"JetBrains Mono",monospace; font-size:26px; text-align:center; width:100%; padding:10px; border-radius:12px; border:2px solid #3A2F63; background:#0F0B1C; color:#fff; box-sizing:border-box;';
  const okBtn = mkButton('Prüfen ✓');
  const msgEl = document.createElement('div');
  msgEl.style.cssText = 'font-family:Fredoka; font-size:18px; min-height:24px; text-align:center;';
  wrap.append(numEl, bar, input, okBtn, msgEl);
  playerBody.append(scoreEl, wrap, mkHint(L('Schau dir die Zahl gut an. Wenn sie verschwindet, tipp sie ein und drück Enter!', 'Look closely at the number. When it disappears, type it and press Enter!')));
  addLeaderboardUI('numbermemory', 'Zahlen-Gedächtnis');
  const over = overMsg(wrap, '', start);
  let len, number, best = 0, timer = null, phase;

  function start(){ len = START_LAENGE; over.classList.remove('show'); round(); }
  function round(){
    clearTimeout(timer);
    number = Array.from({ length: len }, (_, i) => Math.floor(Math.random() * (i === 0 ? 9 : 10)) + (i === 0 ? 1 : 0)).join('');
    numEl.textContent = number; msgEl.textContent = ''; input.value = '';
    input.style.display = 'none'; okBtn.style.display = 'none'; bar.style.display = '';
    phase = 'show';
    document.getElementById('nmLevel').textContent = len;
    document.getElementById('nmBest').textContent = best;
    const ms = Math.max(1500, len * ZEIT_PRO_ZIFFER * 1000);
    barFill.style.transition = 'none'; barFill.style.width = '100%';
    requestAnimationFrame(() => requestAnimationFrame(() => { barFill.style.transition = `width ${ms}ms linear`; barFill.style.width = '0%'; }));
    timer = setTimeout(ask, ms);
  }
  function ask(){
    phase = 'ask';
    numEl.textContent = '?'.repeat(len);
    bar.style.display = 'none'; input.style.display = ''; okBtn.style.display = '';
    input.focus();
  }
  function check(){
    if(phase !== 'ask') return;
    const guess = input.value.replace(/\D/g, '');
    if(!guess) return;
    phase = 'result';
    if(guess === number){
      sfx.correct?.(); msgEl.style.color = '#C6FF3D'; msgEl.textContent = `Richtig! Jetzt ${len + 1} Ziffern…`;
      if(len > best) best = len;
      len++; numEl.textContent = number;
      timer = setTimeout(round, 1200);
    } else {
      sfx.wrong?.();
      numEl.innerHTML = '';
      // Richtige Zahl zeigen, falsche Ziffern rot
      [...number].forEach((d, i) => { const s = document.createElement('span'); s.textContent = d; s.style.color = guess[i] === d ? '#C6FF3D' : '#FF6B4A'; numEl.appendChild(s); });
      msgEl.style.color = '#FF6B4A'; msgEl.textContent = `Du hast ${guess} eingetippt.`;
      input.style.display = 'none'; okBtn.style.display = 'none';
      document.getElementById('nmBest').textContent = best;
      window.zzSaveHighScore?.('numbermemory', 'Zahlen-Gedächtnis', best);
      timer = setTimeout(() => { over.querySelector('div').textContent = `Geschafft: ${len - 1} Ziffern! 🧠`; over.classList.add('show'); }, 1600);
    }
  }
  okBtn.onclick = check;
  input.addEventListener('keydown', e => { if(e.key === 'Enter') check(); });
  window.__restartCurrent = start;
  start();
  return () => clearTimeout(timer);
}
