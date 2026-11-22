// ===== ZockZone Hintergrundmusik: "ZockZone Overdrive" =====
// Ein eigener Drum & Bass-Track, komplett im Browser erzeugt (Web Audio, keine Musikdatei).
// Komponiert für Lukis ZockZone – gehört euch, keine fremde Musik.
// - startet beim ersten Klick/Tastendruck (Browser erlauben Ton erst nach einer Aktion)
// - wird leise/aus, wenn ein Spiel oder das Online-Fenster offen ist
// - 🔊/🔇-Knopf im Header, Einstellung wird im Browser gemerkt

// ---------- 🛠️ LUKI-ECKE: Musik anpassen ----------
const TEMPO        = 174;   // Schläge pro Minute – Drum & Bass ist meistens 170–176
const LAUTSTAERKE  = 0.09;  // Gesamtlautstärke (0.0 bis 0.3)
const BASS_STAERKE = 1.0;   // Wie laut ist der Bass? (0 = aus, 1.5 = extra fett)
const WOBBLE       = 2;     // Wie schnell wobbelt der Bass? (1 = langsam, 4 = schnell)
const DRUMS        = 1.0;   // Wie laut sind die Drums?
// --------------------------------------------------

// Ein Takt = 16 Schritte (Sechzehntel). Muster: 'x' = Schlag, '.' = Pause
const KICK_A  = 'x.........x.....';
const KICK_B  = 'x......x..x.....';   // Variation jeden 2. Takt
const SNARE   = '....x.......x...';
const GHOST   = '.......o......o.';   // leise "Geister-Snares" für den Groove
const HATS    = 'x.x.x.x.x.x.x.x.';
const HATS16  = 'xxxxxxxxxxxxxxxx';   // schnelle Hi-Hats im vollen Teil

// Bass-Riff über 4 Takte: [Start-Schritt, Note (MIDI), Länge in Schritten]
// Tonart f-Moll: F1 = 29, Ab1 = 32, Eb1 = 27, Db1 = 25, C1 = 24, G1 = 31
const BASS = [
  [0, 29, 6], [10, 29, 4], [14, 32, 2],
  [16, 27, 6], [26, 27, 4], [30, 31, 2],
  [32, 25, 6], [42, 25, 4], [46, 29, 2],
  [48, 24, 8], [58, 27, 3], [62, 29, 2],
];
// Akkorde (je 1 Takt): f-Moll, Es-Dur, Des-Dur, c-Moll
const CHORDS = [[53, 56, 60], [51, 55, 58], [49, 53, 56], [48, 51, 55]];

// Aufbau über 16 Takte:  Takt 0–1 Intro · 2–3 Drums · 4–15 alles (mit Bass)
const INTRO_BARS = 2, DRUMS_BARS = 4;

const STORE_KEY = 'zz_music';
let ctx = null, master = null, bus = null, noiseBuf = null, timer = null;
let step = 0, nextTime = 0, playing = false, ducked = false;
let enabled = true;
try { enabled = localStorage.getItem(STORE_KEY) !== 'off'; } catch {}

const freq = m => 440 * Math.pow(2, (m - 69) / 12);
const STEP = () => 60 / TEMPO / 4;   // Länge eines Sechzehntels in Sekunden

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;
  // Kompressor macht alles druckvoller und verhindert Übersteuern
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.15;
  bus = ctx.createGain(); bus.gain.value = 1;
  bus.connect(comp); comp.connect(master); master.connect(ctx.destination);
  // Rauschen einmal erzeugen und für alle Drums wiederverwenden
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

// ---------- Drums ----------
function kick(t, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g); g.connect(bus);
  o.start(t); o.stop(t + 0.4);
}
function noiseHit(t, vol, dur, type, f, q) {
  const src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf;
  flt.type = type; flt.frequency.value = f; if (q) flt.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt); flt.connect(g); g.connect(bus);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}
function snare(t, vol) {
  noiseHit(t, vol, 0.18, 'bandpass', 1800, 0.8);            // Rauschen = "Tsch"
  const o = ctx.createOscillator(), g = ctx.createGain();   // Körper = "Pock"
  o.type = 'triangle';
  o.frequency.setValueAtTime(240, t);
  o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
  g.gain.setValueAtTime(vol * 0.7, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g); g.connect(bus);
  o.start(t); o.stop(t + 0.15);
}
function hat(t, vol) { noiseHit(t, vol, 0.035, 'highpass', 7500); }

// ---------- Reese-Bass (typischer Neurofunk-Bass) ----------
let shaperCurve = null;
function bassNote(t, m, dur) {
  if (BASS_STAERKE <= 0) return;
  const f = freq(m);
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.5 * BASS_STAERKE, t + 0.015);
  out.gain.setValueAtTime(0.5 * BASS_STAERKE, t + dur - 0.04);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  // Drei leicht verstimmte Sägezähne = breiter, "schwebender" Reese-Sound
  const flt = ctx.createBiquadFilter();
  flt.type = 'lowpass'; flt.Q.value = 7; flt.frequency.value = 260;
  // Verzerrung für Biss
  if (!shaperCurve) {
    shaperCurve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; shaperCurve[i] = Math.tanh(x * 2.5); }
  }
  const sh = ctx.createWaveShaper(); sh.curve = shaperCurve;
  [1, 1.011, 0.992].forEach(det => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * 2 * det;
    const g = ctx.createGain(); g.gain.value = 0.22;
    o.connect(g); g.connect(sh); o.start(t); o.stop(t + dur + 0.02);
  });
  sh.connect(flt); flt.connect(out);
  // Wobble: ein langsamer Ton (LFO) bewegt den Filter auf und zu
  const lfo = ctx.createOscillator(), lfoAmt = ctx.createGain();
  lfo.type = 'sine'; lfo.frequency.value = TEMPO / 60 * WOBBLE / 2;
  lfoAmt.gain.value = 700;
  lfo.connect(lfoAmt); lfoAmt.connect(flt.frequency);
  lfo.start(t); lfo.stop(t + dur + 0.02);
  // Sub-Bass darunter (reiner Sinus, den spürt man mehr als man ihn hört)
  const sub = ctx.createOscillator(), sg = ctx.createGain();
  sub.type = 'sine'; sub.frequency.value = f;
  sg.gain.value = 0.9;
  sub.connect(sg); sg.connect(out);
  sub.start(t); sub.stop(t + dur + 0.02);
  out.connect(bus);
}

// ---------- Pad + Synthie-Stöße ----------
function pad(t, chord, dur) {
  const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 1100;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.07, t + dur * 0.4);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  chord.forEach((m, i) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.value = freq(m); o.detune.value = (i - 1) * 7;
    o.connect(flt); o.start(t); o.stop(t + dur + 0.05);
  });
  flt.connect(g); g.connect(bus);
}
function stab(t, m) {
  const o = ctx.createOscillator(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'square'; o.frequency.value = freq(m);
  flt.type = 'lowpass'; flt.Q.value = 6;
  flt.frequency.setValueAtTime(3000, t); flt.frequency.exponentialRampToValueAtTime(300, t + 0.15);
  g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(flt); flt.connect(g); g.connect(bus);
  o.start(t); o.stop(t + 0.2);
}

// ---------- Ein Sechzehntel spielen ----------
function playStep(t) {
  const pos = step % 16;
  const bar = Math.floor(step / 16) % 16;        // Takt im 16-Takte-Bogen
  const fill = bar % 8 === 7;                     // jeder 8. Takt: Snare-Wirbel als Übergang
  const drums = bar >= INTRO_BARS;
  const full = bar >= DRUMS_BARS;

  // Pad zu jedem Taktanfang
  if (pos === 0) pad(t, CHORDS[bar % 4], STEP() * 16);

  // Hi-Hats (im Intro nur leise)
  const hats = full ? HATS16 : HATS;
  if (hats[pos] === 'x') hat(t, (pos % 2 ? 0.12 : 0.22) * (drums ? 1 : 0.5) * DRUMS);

  if (drums) {
    const k = (bar % 2 ? KICK_B : KICK_A);
    if (k[pos] === 'x' && !(fill && pos >= 12)) kick(t, 1.0 * DRUMS);
    if (SNARE[pos] === 'x') snare(t, 0.55 * DRUMS);
    if (full && GHOST[pos] === 'o') snare(t, 0.12 * DRUMS);
    if (fill && pos >= 12) snare(t, (0.15 + (pos - 12) * 0.1) * DRUMS);  // Wirbel wird lauter
  }

  if (full) {
    // Bass-Riff (4 Takte lang)
    const bpos = step % 64;
    for (const [s0, m, len] of BASS) if (s0 === bpos) bassNote(t, m, STEP() * len);
    // Synthie-Stöße jeden 2. Takt
    if (bar % 2 === 1 && (pos === 6 || pos === 14)) stab(t, CHORDS[bar % 4][2] + 12);
  }
  step++;
}

function scheduler() {
  while (nextTime < ctx.currentTime + 0.12) {
    playStep(nextTime);
    nextTime += STEP();
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
