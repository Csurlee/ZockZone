import { sfx } from '../sfx.js';
import { hud, overMsg, mkHint, addLeaderboardUI, playerBody } from '../core.js';

// 🎹 KLAVIER-ECHO – hör dir die Melodie an und spiel sie nach! Jede Runde kommt ein Ton dazu.
// Die Melodien werden zufällig erfunden – jede Runde ein neues kleines Lied.
// ---------- 🛠️ LUKI-ECKE ----------
const START_LAENGE = 3;    // Mit wie vielen Tönen geht es los?
const TEMPO_MS     = 480;  // Pause zwischen den Tönen beim Vorspielen
// ------------------------------------
const KEYS = [
  { n: 'C', f: 261.63, k: 'a' }, { n: 'D', f: 293.66, k: 's' }, { n: 'E', f: 329.63, k: 'd' }, { n: 'F', f: 349.23, k: 'f' },
  { n: 'G', f: 392.00, k: 'g' }, { n: 'A', f: 440.00, k: 'h' }, { n: 'H', f: 493.88, k: 'j' }, { n: 'C', f: 523.25, k: 'k' },
];
const COLS = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899'];
let actx = null;
function note(f, dur = 0.35){
  try {
    actx ??= new (window.AudioContext || window.webkitAudioContext)();
    if(actx.state === 'suspended') actx.resume();
    const t = actx.currentTime, o = actx.createOscillator(), o2 = actx.createOscillator(), g = actx.createGain();
    o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); o2.connect(g); g.connect(actx.destination);
    o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  } catch {}
}

export function build(){
  const scoreEl = hud(['Töne','peLevel'], ['Bestwert','peBest']);
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:14px; align-items:center;';
  const status = document.createElement('div');
  status.style.cssText = 'font-family:Fredoka; font-size:20px; font-weight:600; min-height:28px;';
  const piano = document.createElement('div');
  piano.style.cssText = 'display:flex; gap:4px; background:#111827; padding:10px; border-radius:14px;';
  const keyEls = KEYS.map((k, i) => {
    const b = document.createElement('button');
    b.style.cssText = `width:42px; height:150px; border:none; border-radius:0 0 10px 10px; background:#F8FAFC; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; padding-bottom:8px; cursor:pointer; font-family:Fredoka; font-weight:700; color:#475569; border-top:6px solid ${COLS[i]}; transition:background .08s;`;
    b.innerHTML = `<span style="font-size:16px">${k.n}</span><span style="font-size:11px;opacity:.6">${k.k.toUpperCase()}</span>`;
    b.addEventListener('pointerdown', e => { e.preventDefault(); press(i); });
    piano.appendChild(b); return b;
  });
  wrap.append(status, piano);
  playerBody.append(scoreEl, wrap, mkHint('Hör gut zu, dann tipp die Tasten in der gleichen Reihenfolge (oder Tasten A S D F G H J K).'));
  addLeaderboardUI('pianoecho', 'Klavier-Echo');
  const over = overMsg(wrap, '', start);
  let melody, pos, phase, best = 0, timers = [];

  function later(fn, ms){ timers.push(setTimeout(fn, ms)); }
  function start(){ timers.forEach(clearTimeout); timers = []; melody = []; over.classList.remove('show'); for(let i = 0; i < START_LAENGE - 1; i++) addNote(); nextRound(); }
  function addNote(){
    // kleine Sprünge klingen melodischer als wilde Sprünge
    const last = melody.length ? melody[melody.length - 1] : 3 + Math.floor(Math.random() * 2);
    let n = last + [-2, -1, 1, 2, -3, 3][Math.floor(Math.random() * 6)];
    n = Math.max(0, Math.min(KEYS.length - 1, n));
    melody.push(n);
  }
  function nextRound(){
    addNote(); pos = 0; phase = 'listen';
    document.getElementById('peLevel').textContent = melody.length;
    document.getElementById('peBest').textContent = best;
    status.textContent = '👂 Hör zu…'; status.style.color = '#38BDF8';
    melody.forEach((n, i) => later(() => flash(n, true), 700 + i * TEMPO_MS));
    later(() => { phase = 'play'; status.textContent = '🎹 Du bist dran!'; status.style.color = '#C6FF3D'; }, 700 + melody.length * TEMPO_MS);
  }
  function flash(i, play){
    if(play) note(KEYS[i].f);
    keyEls[i].style.background = COLS[i];
    later(() => { keyEls[i].style.background = '#F8FAFC'; }, 220);
  }
  function press(i){
    if(phase !== 'play') return;
    flash(i, true);
    if(i === melody[pos]){
      pos++;
      if(pos === melody.length){ phase = 'wait'; if(melody.length > best) best = melody.length; status.textContent = '✨ Super!'; sfx.correct?.(); later(nextRound, 900); }
    } else {
      phase = 'over'; sfx.wrong?.(); status.textContent = '❌ Falscher Ton!'; status.style.color = '#FF6B4A';
      keyEls[melody[pos]].style.outline = '4px solid #C6FF3D';
      later(() => { keyEls.forEach(k => k.style.outline = ''); }, 1500);
      window.zzSaveHighScore?.('pianoecho', 'Klavier-Echo', melody.length - 1);
      later(() => { over.querySelector('div').textContent = `Du hast ${melody.length - 1} Töne geschafft! 🎹`; over.classList.add('show'); }, 1200);
    }
  }
  const kd = e => { const i = KEYS.findIndex(k => k.k === e.key.toLowerCase()); if(i >= 0){ e.preventDefault(); press(i); } };
  document.addEventListener('keydown', kd);
  window.__restartCurrent = start;
  start();
  return () => { timers.forEach(clearTimeout); document.removeEventListener('keydown', kd); };
}
