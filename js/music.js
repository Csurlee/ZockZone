// ===== ZockZone Hintergrundmusik: "ZockZone Overdrive" (mit Drop!) =====
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

// 💥 DROP: Kick-Muster und knurrendes Bass-Riff (2 Takte): [Schritt, Note, Länge, Art]
// Art 0 = "Wauuu" (Filter geht auf und zu), Art 1 = "Brrrr" (schnelles Rattern)
const KICK_DROP = 'x.........x..x..';
const DROP_BASS = [
  [0, 29, 3, 0], [3, 29, 2, 1], [6, 41, 2, 0], [8, 29, 4, 1], [12, 32, 2, 0], [14, 27, 2, 1],
  [16, 29, 3, 0], [19, 29, 2, 1], [22, 36, 2, 0], [24, 25, 4, 1], [28, 24, 2, 0], [30, 31, 2, 1],
];

// Aufbau über 32 Takte (ca. 44 Sekunden):
//   0–3  Intro · 4–11 Teil A (Groove) · 12–15 Build-up (Spannung!) · 16–31 💥 DROP
const INTRO_END = 4, A_END = 12, BUILD_END = 16, SONG_BARS = 32;

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
  // "playback" = Hintergrundmusik: größerer Puffer, weniger Knacksen und Stottern
  try { ctx = new AC({ latencyHint: 'playback' }); } catch { ctx = new AC(); }
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

// ---------- Effekte für Build-up und Drop ----------
// Riser: Rauschen + Ton, die immer höher werden (wie eine startende Rakete)
function riser(t, dur) {
  const src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; src.loop = true;
  flt.type = 'bandpass'; flt.Q.value = 3;
  flt.frequency.setValueAtTime(300, t); flt.frequency.exponentialRampToValueAtTime(9000, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + dur);
  src.connect(flt); flt.connect(g); g.connect(bus);
  src.start(t); src.stop(t + dur);
  const o = ctx.createOscillator(), og = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(1760, t + dur);
  og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.06, t + dur);
  o.connect(og); og.connect(bus); o.start(t); o.stop(t + dur);
}
// Crash-Becken
function crash(t) { noiseHit(t, 0.4, 1.6, 'highpass', 4500); }
// Tiefer "Bumm" beim Drop
function impact(t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
  g.gain.setValueAtTime(1.0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + 1.5);
  noiseHit(t, 0.5, 0.4, 'lowpass', 900);
}

// Neurofunk-Bass: stark verzerrt, der Filter "spricht" (wauuu) oder rattert (brrrr)
let neuroCurve = null;
function neuroBass(t, m, dur, kind) {
  if (BASS_STAERKE <= 0) return;
  const f = freq(m);
  if (!neuroCurve) {
    neuroCurve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) { const x = i / 1024 - 1; neuroCurve[i] = Math.tanh(x * 7) * 0.9 + Math.sin(x * 9) * 0.1; }
  }
  const sh = ctx.createWaveShaper(); sh.curve = neuroCurve; sh.oversample = 'none';   // spart Rechenkraft
  const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 12;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.42 * BASS_STAERKE, t + 0.01);
  out.gain.setValueAtTime(0.42 * BASS_STAERKE, t + dur - 0.03);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  [['sawtooth', 1], ['square', 1.006], ['sawtooth', 0.497]].forEach(([type, det]) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * 2 * det;
    const g = ctx.createGain(); g.gain.value = 0.3;
    o.connect(g); g.connect(sh); o.start(t); o.stop(t + dur + 0.02);
  });
  sh.connect(flt); flt.connect(out);
  if (kind === 0) {
    // "Wauuu": Filter geht schnell auf und langsam wieder zu
    flt.frequency.setValueAtTime(180, t);
    flt.frequency.exponentialRampToValueAtTime(2600, t + dur * 0.3);
    flt.frequency.exponentialRampToValueAtTime(220, t + dur);
  } else {
    // "Brrrr": Filter rattert im Takt (Sechzehntel × WOBBLE)
    flt.frequency.value = 700;
    const lfo = ctx.createOscillator(), amt = ctx.createGain();
    lfo.type = 'square'; lfo.frequency.value = TEMPO / 60 * 2 * WOBBLE;
    amt.gain.value = 600;
    lfo.connect(amt); amt.connect(flt.frequency); lfo.start(t); lfo.stop(t + dur + 0.02);
  }
  const sub = ctx.createOscillator(), sg = ctx.createGain();
  sub.type = 'sine'; sub.frequency.value = f; sg.gain.value = 0.8;
  sub.connect(sg); sg.connect(out); sub.start(t); sub.stop(t + dur + 0.02);
  out.connect(bus);
}

// ---------- Ein Sechzehntel spielen ----------
function playStep(t) {
  const pos = step % 16;
  const bar = Math.floor(step / 16) % SONG_BARS;
  const D = DRUMS;

  if (bar < INTRO_END) {
    // ---------- INTRO: Akkorde + leise Hi-Hats, ab Takt 2 Kick dazu ----------
    if (pos === 0) pad(t, CHORDS[bar % 4], STEP() * 16);
    if (HATS[pos] === 'x') hat(t, 0.1 * D);
    if (bar >= 2 && KICK_A[pos] === 'x') kick(t, 0.8 * D);
    if (bar === 3 && pos >= 12) snare(t, (0.15 + (pos - 12) * 0.1) * D);
  }
  else if (bar < A_END) {
    // ---------- TEIL A: Groove mit Reese-Bass ----------
    if (pos === 0) pad(t, CHORDS[bar % 4], STEP() * 16);
    if (bar === INTRO_END && pos === 0) crash(t);
    if (HATS16[pos] === 'x') hat(t, (pos % 2 ? 0.1 : 0.2) * D);
    const k = bar % 2 ? KICK_B : KICK_A;
    if (k[pos] === 'x') kick(t, 1.0 * D);
    if (SNARE[pos] === 'x') snare(t, 0.55 * D);
    if (GHOST[pos] === 'o') snare(t, 0.12 * D);
    const bpos = (step - INTRO_END * 16) % 64;
    for (const [s0, m, len] of BASS) if (s0 === bpos) bassNote(t, m, STEP() * len);
    if (bar % 2 === 1 && (pos === 6 || pos === 14)) stab(t, CHORDS[bar % 4][2] + 12);
  }
  else if (bar < BUILD_END) {
    // ---------- BUILD-UP: Spannung aufbauen ----------
    const b = bar - A_END;   // 0..3
    if (b === 0 && pos === 0) riser(t, STEP() * 64 - STEP() * 2);   // Rakete über 4 Takte
    if (pos === 0) pad(t, CHORDS[3], STEP() * 16);
    // Snare-Wirbel wird immer schneller: Viertel -> Achtel -> Sechzehntel
    const every = b === 0 ? 4 : b === 1 ? 2 : 1;
    const last = b === 3 && pos >= 14;   // letzte zwei Sechzehntel: STILLE vor dem Drop
    if (!last && pos % every === 0) snare(t, (0.2 + (b * 16 + pos) / 64 * 0.5) * D);
    if (b < 2 && pos % 4 === 0) kick(t, 0.7 * D);
  }
  else {
    // ---------- 💥 DROP ----------
    const d = bar - BUILD_END;   // 0..15
    if (d === 0 && pos === 0) { crash(t); impact(t); }
    if (d === 8 && pos === 0) crash(t);
    if (HATS16[pos] === 'x') hat(t, (pos % 2 ? 0.13 : 0.24) * D);
    const k = d % 4 === 3 ? KICK_B : KICK_DROP;
    if (k[pos] === 'x') kick(t, 1.15 * D);
    if (SNARE[pos] === 'x') snare(t, 0.65 * D);
    if (GHOST[pos] === 'o') snare(t, 0.16 * D);
    if (d === 15 && pos >= 12) snare(t, (0.2 + (pos - 12) * 0.12) * D);   // Wirbel zum Neustart
    const bpos = (step - BUILD_END * 16) % 32;
    for (const [s0, m, len, kind] of DROP_BASS) if (s0 === bpos) neuroBass(t, m, STEP() * len, kind);
  }
  step++;
}

function scheduler() {
  // Hing der Computer kurz (z. B. Tab im Hintergrund)? Dann nicht alle verpassten Töne auf einmal spielen.
  if (nextTime < ctx.currentTime - 0.05) nextTime = ctx.currentTime + 0.05;
  // 0,35 s im Voraus planen: genug Vorrat, falls der Computer kurz beschäftigt ist
  while (nextTime < ctx.currentTime + 0.35) {
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
    timer = setInterval(scheduler, 40);
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
