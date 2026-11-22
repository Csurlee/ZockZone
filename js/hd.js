// ===== HD-GRAFIK FÜR ALLE CANVAS-SPIELE =====
// Problem: Ein Spiel malt z. B. auf 400×280 Pixel. Wird das 3× größer angezeigt,
// ist es verschwommen.
// Lösung: Das Canvas bekommt intern mehr Pixel (z. B. 1200×840 oder mehr auf
// Retina-Bildschirmen), und alles Gemalte wird automatisch hochgerechnet.
// Für das Spiel ändert sich nichts: canvas.width ist weiterhin 400, und alle
// Koordinaten bleiben gleich. Es sieht nur gestochen scharf aus.

const MAX_RATIO = 4;      // höchstens 4× so viele Pixel (sonst wird es langsam)
const protoW = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
const protoH = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height');

function realize(c, keepImage) {
  const st = c.__zzhd;
  const rw = Math.max(1, Math.round(st.w * st.r)), rh = Math.max(1, Math.round(st.h * st.r));
  let copy = null;
  if (keepImage && protoW.get.call(c) > 0 && protoH.get.call(c) > 0) {
    // Bild retten, damit Spiele, die nur bei einem Klick neu malen, nicht leer werden
    copy = document.createElement('canvas');
    protoW.set.call(copy, protoW.get.call(c)); protoH.set.call(copy, protoH.get.call(c));
    copy.getContext('2d').drawImage(c, 0, 0);
  }
  protoW.set.call(c, rw);   // setzt das Canvas zurück (so wie es Spiele auch erwarten)
  protoH.set.call(c, rh);
  const ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(st.r, 0, 0, st.r, 0, 0);
  if (copy) ctx.drawImage(copy, 0, 0, st.w, st.h);
}

// Macht ein Canvas scharf für die angegebene Anzeige-Vergrößerung.
// displayScale = wie viel größer es angezeigt wird (z. B. 2.5)
export function makeHD(c, displayScale) {
  if (!c || c.__zzhd === false) return;
  // Nur normale 2D-Spiele (WebGL/three.js nicht anfassen)
  if (!c.__zzhd) {
    let ctx = null;
    try { ctx = c.getContext('2d'); } catch {}
    if (!ctx) { c.__zzhd = false; return; }
    const st = { w: protoW.get.call(c), h: protoH.get.call(c), r: 1 };
    c.__zzhd = st;
    Object.defineProperty(c, 'width',  { configurable: true, get: () => st.w, set: v => { st.w = Math.max(0, Math.floor(+v || 0)); realize(c, false); } });
    Object.defineProperty(c, 'height', { configurable: true, get: () => st.h, set: v => { st.h = Math.max(0, Math.floor(+v || 0)); realize(c, false); } });
  }
  const st = c.__zzhd;
  const dpr = window.devicePixelRatio || 1;
  // auf Viertel runden, damit kleine Größenänderungen nicht ständig neu rechnen
  const r = Math.min(MAX_RATIO, Math.max(1, Math.round(displayScale * dpr * 4) / 4));
  if (r === st.r) return;
  st.r = r;
  realize(c, true);
}
