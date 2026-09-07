// ZockZone Web Audio Sound Engine — alle Sounds synthetisch, keine externen Dateien
let _ctx = null;
function ac() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}
function tone(freq, type, dur, vol = 0.28, delay = 0) {
  try {
    const c = ac(), t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch(e) {}
}
function sweep(f0, f1, type, dur, vol = 0.2, delay = 0) {
  try {
    const c = ac(), t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch(e) {}
}
function noise(dur, vol = 0.15, delay = 0) {
  try {
    const c = ac(), t = c.currentTime + delay;
    const sr = c.sampleRate;
    const buf = c.createBuffer(1, sr * dur, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; src.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.start(t); src.stop(t + dur);
  } catch(e) {}
}

export const sfx = {
  // === Allgemein ===
  click:    () => tone(900, 'sine', 0.07, 0.18),
  blip:     () => tone(660, 'square', 0.08, 0.12),
  pop:      () => sweep(700, 300, 'sine', 0.08, 0.2),
  tick:     () => tone(1200, 'square', 0.03, 0.08),
  whoosh:   () => sweep(600, 80, 'sawtooth', 0.15, 0.18),
  deal:     () => { noise(0.04, 0.12); tone(320, 'sine', 0.06, 0.1); },
  type:     () => tone(1400, 'square', 0.025, 0.06),
  select:   () => tone(523, 'sine', 0.1, 0.2),

  // === Positiv ===
  score:    () => { tone(523, 'sine', 0.12, 0.3); tone(659, 'sine', 0.12, 0.22, 0.1); },
  coin:     () => { tone(1047, 'sine', 0.1, 0.28); tone(1319, 'sine', 0.08, 0.22, 0.09); },
  eat:      () => { sweep(400, 700, 'sine', 0.07, 0.25); },
  levelUp:  () => [392, 523, 659, 784].forEach((f, i) => tone(f, 'triangle', 0.18, 0.3, i * 0.09)),
  win:      () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', 0.35, 0.3, i * 0.12));
    setTimeout(() => noise(0.1, 0.05), 500);
  },
  bigWin:   () => {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 'sine', 0.4, 0.35, i * 0.1));
  },
  correct:  () => { tone(660, 'sine', 0.1, 0.25); tone(880, 'sine', 0.1, 0.2, 0.08); },
  match:    () => { tone(784, 'sine', 0.12, 0.28); tone(1047, 'sine', 0.1, 0.22, 0.1); },

  // === Negativ ===
  fail:     () => sweep(440, 180, 'sawtooth', 0.25, 0.22),
  lose:     () => {
    tone(330, 'sawtooth', 0.18, 0.28);
    tone(262, 'sawtooth', 0.25, 0.22, 0.18);
    tone(196, 'sawtooth', 0.3, 0.18, 0.36);
  },
  wrong:    () => sweep(300, 150, 'square', 0.15, 0.2),
  bump:     () => noise(0.06, 0.2),
  miss:     () => sweep(220, 100, 'sine', 0.12, 0.15),

  // === Physics / Arcade ===
  bounce:   () => tone(440, 'sine', 0.06, 0.22),
  bounceHigh: () => tone(880, 'sine', 0.05, 0.2),
  hit:      () => { noise(0.05, 0.15); tone(220, 'sine', 0.08, 0.2); },
  land:     () => { noise(0.06, 0.22); tone(160, 'sine', 0.12, 0.2); },
  explosion:() => { noise(0.35, 0.45); sweep(200, 50, 'sawtooth', 0.3, 0.25); },
  laser:    () => sweep(880, 110, 'square', 0.18, 0.2),
  flap:     () => sweep(300, 150, 'sawtooth', 0.12, 0.15),
  puckHit:  () => { noise(0.04, 0.2); tone(300, 'sine', 0.06, 0.25); },
  ballBounce: () => tone(500, 'sine', 0.05, 0.18),

  // === Karten / Board ===
  cardFlip: () => { noise(0.04, 0.1); tone(280, 'sine', 0.05, 0.08); },
  place:    () => { noise(0.05, 0.18); tone(200, 'sine', 0.1, 0.18); },
  drop:     () => { noise(0.07, 0.25); tone(140, 'sine', 0.1, 0.22); },
  shuffle:  () => { for(let i=0;i<6;i++) noise(0.02, 0.15, i*0.04); },
  dice:     () => { noise(0.15, 0.3); tone(180, 'sine', 0.1, 0.2); },

  // === Tetris ===
  tetLand:  () => { noise(0.07, 0.25); tone(150, 'sine', 0.12, 0.22); },
  tetClear: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 'square', 0.14, 0.3, i * 0.07)),
  tetRotate:() => tone(660, 'sine', 0.05, 0.15),

  // === Simon ===
  simonA:   () => tone(261.63, 'sine', 0.45, 0.4),
  simonB:   () => tone(329.63, 'sine', 0.45, 0.4),
  simonC:   () => tone(392.00, 'sine', 0.45, 0.4),
  simonD:   () => tone(523.25, 'sine', 0.45, 0.4),

  // === Slots ===
  slotSpin: () => tone(200 + Math.random() * 300, 'sine', 0.04, 0.1),
  slotStop: () => { noise(0.06, 0.2); tone(350, 'sine', 0.08, 0.15); },
  jackpot:  () => {
    [523, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 'sine', 0.2, 0.35, i * 0.1));
  },

  // === Rhythm ===
  kick:     () => { sweep(120, 40, 'sine', 0.15, 0.4); noise(0.04, 0.2); },
  snare:    () => { noise(0.1, 0.35); tone(200, 'square', 0.08, 0.2); },
  hihat:    () => noise(0.04, 0.2),
  beatHit:  () => { noise(0.05, 0.3); tone(500, 'sine', 0.06, 0.2); },
  beatMiss: () => sweep(400, 100, 'sawtooth', 0.12, 0.15),

  // === Clicker ===
  upgrade:  () => [523, 659, 784].forEach((f, i) => tone(f, 'sine', 0.15, 0.3, i * 0.08)),
  clickerHit: () => tone(440, 'sine', 0.04, 0.15),

  // === Balloon / Bubble ===
  pop2:     () => { noise(0.06, 0.3); sweep(800, 200, 'sine', 0.08, 0.1); },
};
