// ===== ZockZone Hintergrundmusik =====
// Eine eigene Arcade-Melodie, komplett im Browser erzeugt (Web Audio, keine Musikdatei).
// - startet beim ersten Klick/Tastendruck (Browser erlauben Ton erst nach einer Aktion)
// - wird leiser/aus, wenn ein Spiel oder das Online-Fenster offen ist
// - 🔊/🔇-Knopf im Header, Einstellung wird im Browser gemerkt

// ---------- 🛠️ LUKI-ECKE: Musik anpassen ----------
const TEMPO      = 112;    // Schläge pro Minute (schneller = höher)
const LAUTSTAERKE = 0.07;  // Gesamtlautstärke (0.0 bis 0.3)
// --------------------------------------------------

// Noten als Zahlen: 0 = Pause, sonst MIDI-Nummer (60 = C in der Mitte)
// Akkordfolge (je 1 Takt = 8 Achtel): C – a – F – G
const CHORDS = [
  [48, 52, 55], // C-Dur
  [45, 48, 52], // a-Moll
  [41, 45, 48], // F-Dur
  [43, 47, 50], // G-Dur
];
// Melodie: 4 Takte × 8 Achtel, zwei Varianten (A und B) im Wechsel
const MELODY_A = [
  72, 0, 76, 79,  76, 0, 74, 72,
  69, 0, 72, 76,  74, 72, 69, 0,
  65, 69, 72, 0,  74, 72, 69, 67,
  67, 0, 71, 74,  79, 0, 77, 74,
];
const MELODY_B = [
  79, 76, 72, 76,  79, 0, 84, 0,
  81, 0, 76, 72,  76, 0, 74, 0,
  77, 74, 69, 74,  77, 0, 81, 79,
  74, 0, 71, 67,  71, 74, 0, 0,
];

const STORE_KEY = 'zz_music';
let ctx = null, master = null, timer = null;
let step = 0, nextTime = 0, playing = false, ducked = false;
let enabled = true;
try { enabled = localStorage.getItem(STORE_KEY) !== 'off'; } catch {}

const freq = m => 440 * Math.pow(2, (m - 69) / 12);

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  return ctx;
}

function note(m, t, dur, type, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq(m);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}
function hat(t, vol) {
  const len = Math.floor(ctx.sampleRate * 0.04);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'highpass'; f.frequency.value = 6000;
  g.gain.value = vol;
  src.buffer = buf; src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
}

// Spielt ein Achtel (step zählt immer weiter)
function playStep(t) {
  const eighth = 60 / TEMPO / 2;
  const bar = Math.floor(step / 8) % 4;
  const pos = step % 8;
  const section = Math.floor(step / 32) % 2;   // A, B, A, B …
  const chord = CHORDS[bar];

  // Bass: Grundton auf 1 und 5, Quinte dazwischen
  if (pos === 0 || pos === 4) note(chord[0] - 12, t, eighth * 1.8, 'triangle', 0.9);
  if (pos === 6) note(chord[2] - 12, t, eighth * 0.9, 'triangle', 0.6);
  // Arpeggio: Akkordtöne nacheinander
  note(chord[pos % 3] + 12, t, eighth * 0.8, 'square', 0.12);
  // Melodie
  const mel = (section === 0 ? MELODY_A : MELODY_B)[bar * 8 + pos];
  if (mel) note(mel, t, eighth * 1.6, 'square', 0.22);
  // Schlagzeug: leises Hi-Hat auf jedem Achtel, betont auf 2 und 4
  hat(t, pos % 4 === 2 ? 0.5 : 0.18);

  step++;
}

function scheduler() {
  const eighth = 60 / TEMPO / 2;
  while (nextTime < ctx.currentTime + 0.15) {
    playStep(nextTime);
    nextTime += eighth;
  }
}

function fadeTo(v, sec) {
  if (!ctx) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(v, now + sec);
}

function start() {
  if (!enabled || !ensureCtx()) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (!playing) {
    playing = true;
    nextTime = ctx.currentTime + 0.05;
    timer = setInterval(scheduler, 25);
  }
  fadeTo(ducked ? 0 : LAUTSTAERKE, 1.2);
}
function stop() {
  if (!playing) return;
  fadeTo(0, 0.4);
  setTimeout(() => {
    if (enabled && !ducked) return;          // wurde inzwischen wieder angemacht
    clearInterval(timer); timer = null; playing = false;
  }, 450);
}

// ---------- Leiser, wenn ein Spiel offen ist ----------
function gameOpen() {
  return !!document.querySelector('#overlay.open, #onlineOverlay.open');
}
function updateDuck() {
  const d = gameOpen() || document.hidden;
  if (d === ducked) return;
  ducked = d;
  if (!enabled || !ctx) return;
  if (ducked) stop(); else start();
}

// ---------- Knopf im Header ----------
const btn = document.getElementById('musicBtn');
function renderBtn() {
  if (!btn) return;
  btn.textContent = enabled ? '🔊' : '🔇';
  btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  btn.title = enabled ? 'Musik ausschalten' : 'Musik einschalten';
}
btn?.addEventListener('click', e => {
  e.stopPropagation();
  // Musik ist an, spielt aber noch nicht (noch kein Klick vorher)? Dann einfach starten.
  if (enabled && !playing) { ducked = gameOpen() || document.hidden; start(); return; }
  enabled = !enabled;
  try { localStorage.setItem(STORE_KEY, enabled ? 'on' : 'off'); } catch {}
  renderBtn();
  if (enabled) { ducked = gameOpen() || document.hidden; start(); } else stop();
});
renderBtn();

// Erster Klick / Tastendruck irgendwo startet die Musik
function firstGesture(e) {
  if (e && e.target && e.target.closest && e.target.closest('#musicBtn')) return;  // das macht der Knopf selbst
  window.removeEventListener('pointerdown', firstGesture, true);
  window.removeEventListener('keydown', firstGesture, true);
  ducked = gameOpen() || document.hidden;
  start();
}
window.addEventListener('pointerdown', firstGesture, true);
window.addEventListener('keydown', firstGesture, true);

// Spiel-Fenster beobachten
const watch = new MutationObserver(updateDuck);
['overlay', 'onlineOverlay'].forEach(id => {
  const el = document.getElementById(id);
  if (el) watch.observe(el, { attributes: true, attributeFilter: ['class'] });
});
document.addEventListener('visibilitychange', updateDuck);
