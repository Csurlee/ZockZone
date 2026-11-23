import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, playerBody } from '../core.js';

// 🗺️ SCHATZSUCHE – irgendwo auf der Insel ist ein Schatz vergraben! Grab ein Loch und du erfährst,
// ob du heiß 🔥 oder kalt 🧊 bist. Findest du ihn, bevor die Schaufeln alle sind?
// ---------- 🛠️ LUKI-ECKE ----------
const GROESSE  = 10;   // 10 × 10 Felder
const SCHAUFELN = 8;   // Wie oft darfst du graben?
// ------------------------------------
const S = 360, C = S / GROESSE;

export function build(){
  const scoreEl = hud(['Schaufeln','trShovels'], ['Gefunden','trFound']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = S;
  canvas.style.cursor = 'crosshair';
  const msgEl = document.createElement('div');
  msgEl.style.cssText = 'font-family:Fredoka; font-size:20px; font-weight:600; text-align:center; min-height:28px;';
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:10px; align-items:center;';
  wrap.append(canvas, msgEl);
  playerBody.append(scoreEl, wrap, mkHint('Klick auf ein Feld zum Graben. Die Farbe zeigt, wie nah du dran bist: 🔥 rot = ganz nah, 🧊 blau = weit weg.'));
  const ctx = canvas.getContext('2d');
  const over = overMsg(wrap, '', start);
  let tr, digs, shovels, found = 0, done, sand;

  function start(){
    tr = { r: Math.floor(Math.random() * GROESSE), c: Math.floor(Math.random() * GROESSE) };
    digs = []; shovels = SCHAUFELN; done = false;
    sand = Array.from({ length: GROESSE * GROESSE }, () => Math.random());
    msgEl.textContent = 'Wo könnte der Schatz sein? 🤔'; msgEl.style.color = '#F3EEFF';
    over.classList.remove('show'); updateHud(); draw();
  }
  function updateHud(){ document.getElementById('trShovels').textContent = '⛏️ ' + shovels; document.getElementById('trFound').textContent = found; }
  const dist = (r, c) => Math.max(Math.abs(r - tr.r), Math.abs(c - tr.c));
  const hint = d => d <= 1 ? ['🔥 Superheiß!', '#EF4444'] : d <= 2 ? ['♨️ Heiß!', '#F97316'] : d <= 3 ? ['☀️ Warm', '#FACC15'] : d <= 5 ? ['🌤️ Kühl', '#38BDF8'] : ['🧊 Eiskalt!', '#6366F1'];
  function dig(r, c){
    if(done || digs.some(d => d.r === r && d.c === c)) return;
    shovels--; const d = dist(r, c); digs.push({ r, c, d });
    if(d === 0){ done = true; found++; sfx.win(); msgEl.textContent = '💰 SCHATZ GEFUNDEN!'; msgEl.style.color = '#FACC15'; updateHud(); draw();
      over.querySelector('div').textContent = `Gefunden mit ${SCHAUFELN - shovels} Schaufeln! 💰`; setTimeout(() => over.classList.add('show'), 800); return; }
    const [t, col] = hint(d); msgEl.textContent = t; msgEl.style.color = col; sfx.dig?.() ?? sfx.place?.();
    if(shovels <= 0){ done = true; sfx.lose(); updateHud(); draw(true); over.querySelector('div').textContent = 'Keine Schaufeln mehr! Der Schatz lag beim ❌'; setTimeout(() => over.classList.add('show'), 800); return; }
    updateHud(); draw();
  }
  function draw(reveal){
    for(let r = 0; r < GROESSE; r++) for(let c = 0; c < GROESSE; c++){
      const v = sand[r * GROESSE + c];
      ctx.fillStyle = `hsl(${40 + v * 8} ${55 + v * 10}% ${62 + v * 8}%)`; ctx.fillRect(c * C, r * C, C, C);
    }
    ctx.font = `${Math.floor(C * 0.6)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🌴', C * 0.5, C * 0.5); ctx.fillText('🌴', S - C * 0.5, S - C * 1.5);
    for(const d of digs){
      const [, col] = hint(d.d);
      ctx.fillStyle = d.d === 0 ? '#FACC15' : col; ctx.globalAlpha = 0.85; ctx.fillRect(d.c * C + 2, d.r * C + 2, C - 4, C - 4); ctx.globalAlpha = 1;
      ctx.fillStyle = '#1F2937'; ctx.fillText(d.d === 0 ? '💰' : '🕳️', d.c * C + C / 2, d.r * C + C / 2 + 1);
    }
    if(reveal){ ctx.fillText('❌', tr.c * C + C / 2, tr.r * C + C / 2); }
    ctx.strokeStyle = 'rgba(120,53,15,.15)'; ctx.lineWidth = 1;
    for(let i = 1; i < GROESSE; i++){ ctx.beginPath(); ctx.moveTo(i * C, 0); ctx.lineTo(i * C, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * C); ctx.lineTo(S, i * C); ctx.stroke(); }
  }
  canvas.addEventListener('pointerdown', e => { const r = canvas.getBoundingClientRect(); dig(Math.floor((e.clientY - r.top) * (canvas.height / r.height) / C), Math.floor((e.clientX - r.left) * (canvas.width / r.width) / C)); });
  window.__restartCurrent = start;
  start();
  return () => { done = true; };
}
