import { playerBody, overMsg } from '../core.js';

const CDN = '/js/lib/three.min.js';
const ARENA = 26;
const COLORS = [0xC6FF3D, 0xFF6B2B, 0x4488FF, 0xFF44AA];
const STARTS = [
  { x: -16, z: -16, a:  Math.PI * 0.25 },
  { x:  16, z: -16, a:  Math.PI * 0.75 },
  { x: -16, z:  16, a: -Math.PI * 0.25 },
  { x:  16, z:  16, a: -Math.PI * 0.75 },
];
const PU_SPOTS = [[-18,-18],[18,-18],[-18,18],[18,18],[0,-17],[0,17],[-17,0],[17,0]];
const PU_COLORS = { ammo:0xffee00, life:0xff3333, speed:0x00ddff };
const PU_TYPES  = ['ammo','life','speed'];

export function build() {
  let running   = true;
  let raf       = null;
  let renderer  = null;
  let scene, camera;
  let karts     = [];
  let bullets   = [];
  let powerups  = [];
  let obsAABBs  = [];
  let overEl    = null;
  let hudEl     = null;
  let wrapEl    = null;
  let gameOver  = false;
  let frame     = 0;
  const keys    = {};
  let touchLeft = false, touchRight = false, touchFire = false;

  function loadThree() {
    return new Promise(r => {
      if (window.THREE) { r(); return; }
      const s = document.createElement('script');
      s.src = CDN;
      s.onload = r;
      document.head.appendChild(s);
    });
  }

  loadThree().then(() => { if (running) init(); });

  // ─── init ─────────────────────────────────────────────────────────────────
  function init() {
    const T = window.THREE;

    wrapEl = document.createElement('div');
    wrapEl.style.cssText = 'position:relative;width:100%;max-width:480px;margin:0 auto;';
    playerBody.appendChild(wrapEl);

    renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setSize(360, 270);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:auto;touch-action:none;border-radius:8px;';
    wrapEl.appendChild(renderer.domElement);

    hudEl = document.createElement('div');
    hudEl.style.cssText = [
      'position:absolute;top:0;left:0;right:0;padding:7px 10px',
      'display:flex;justify-content:space-between',
      'color:#fff;font-family:Fredoka,sans-serif;font-size:15px;font-weight:700',
      'text-shadow:0 1px 4px rgba(0,0,0,.9);pointer-events:none',
    ].join(';');
    wrapEl.appendChild(hudEl);

    const fireBtn = document.createElement('button');
    fireBtn.textContent = '🔫';
    fireBtn.style.cssText = [
      'position:absolute;bottom:10px;right:10px;width:50px;height:50px',
      'border-radius:50%;background:rgba(255,255,255,.18)',
      'border:2px solid rgba(255,255,255,.4);font-size:21px;cursor:pointer',
    ].join(';');
    wrapEl.appendChild(fireBtn);
    fireBtn.addEventListener('touchstart', e => { e.preventDefault(); touchFire = true;  }, {passive:false});
    fireBtn.addEventListener('touchend',   e => { e.preventDefault(); touchFire = false; }, {passive:false});

    // Scene
    scene = new T.Scene();
    scene.background = new T.Color(0x150f28);
    scene.fog = new T.Fog(0x150f28, 38, 90);

    camera = new T.PerspectiveCamera(60, 360/270, 0.1, 200);

    scene.add(new T.AmbientLight(0xffffff, 0.5));
    const sun = new T.DirectionalLight(0xffffff, 0.9);
    sun.position.set(20, 35, 10);
    sun.castShadow = true;
    scene.add(sun);

    // Floor
    const floor = new T.Mesh(
      new T.PlaneGeometry(ARENA*2, ARENA*2),
      new T.MeshLambertMaterial({ color: 0x1c1235 })
    );
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    scene.add(floor);

    scene.add(new T.GridHelper(ARENA*2, 13, 0x2b1d50, 0x2b1d50));

    // Boundary walls (visual — kart movement clamped separately)
    const wallMat = new T.MeshLambertMaterial({ color: 0x3d1e70 });
    function makeWall(w, d, x, z) {
      const m = new T.Mesh(new T.BoxGeometry(w, 3, d), wallMat);
      m.position.set(x, 1.5, z);
      scene.add(m);
    }
    makeWall(ARENA*2+6, 3, 0,  -(ARENA+1.5));
    makeWall(ARENA*2+6, 3, 0,    ARENA+1.5);
    makeWall(3, ARENA*2+6, -(ARENA+1.5), 0);
    makeWall(3, ARENA*2+6,   ARENA+1.5,  0);

    // Obstacles
    const obsMat = new T.MeshLambertMaterial({ color: 0x5a1e98 });
    for (const [ox, oz] of [[-9,0],[9,0],[0,-9],[0,9]]) {
      const m = new T.Mesh(new T.BoxGeometry(5, 3.5, 5), obsMat);
      m.position.set(ox, 1.75, oz);
      m.castShadow = true;
      scene.add(m);
      obsAABBs.push({ minX: ox-2.5, maxX: ox+2.5, minZ: oz-2.5, maxZ: oz+2.5 });
    }

    // Power-ups
    for (const [px, pz] of PU_SPOTS) addPowerup(px, pz);

    // Karts
    for (let i = 0; i < 4; i++) {
      const s = STARTS[i];
      karts.push(mkKart(i, COLORS[i], s.x, s.z, s.a));
    }

    overEl = overMsg(wrapEl, '', restart);

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup',   onKey);
    renderer.domElement.addEventListener('touchstart', onTouch,    {passive:false});
    renderer.domElement.addEventListener('touchmove',  onTouch,    {passive:false});
    renderer.domElement.addEventListener('touchend',   onTouchEnd, {passive:false});

    updateHUD();
    window.__restartCurrent = restart;

    (function loop() {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      tick();
      renderer.render(scene, camera);
    })();
  }

  // ─── Kart factory ─────────────────────────────────────────────────────────
  function mkKart(idx, color, x, z, angle) {
    const T = window.THREE;
    const g = new T.Group();

    const bMat = new T.MeshLambertMaterial({ color });
    const body = new T.Mesh(new T.BoxGeometry(1.5, 0.44, 0.85), bMat);
    body.position.y = 0.22;
    body.castShadow = true;
    g.add(body);

    const cab = new T.Mesh(new T.BoxGeometry(0.65, 0.32, 0.65), bMat);
    cab.position.set(-0.1, 0.58, 0);
    g.add(cab);

    const wMat = new T.MeshLambertMaterial({ color: 0x1a1a1a });
    const wGeo = new T.CylinderGeometry(0.21, 0.21, 0.17, 8);
    for (const [wx, wy, wz] of [[-0.56,0.21,0.51],[0.56,0.21,0.51],[-0.56,0.21,-0.51],[0.56,0.21,-0.51]]) {
      const w = new T.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI/2;
      w.position.set(wx, wy, wz);
      g.add(w);
    }

    g.position.set(x, 0, z);
    g.rotation.y = angle;
    scene.add(g);

    return {
      idx, group: g, bMat, origColor: color,
      lives: 3, bullets: 3, speed: 0, angle,
      alive: true, hitTimer: 0, speedBoost: 0,
      shootCooldown: 0, aiTimer: 0, aiTX: 0, aiTZ: 0,
    };
  }

  // ─── Kart movement ────────────────────────────────────────────────────────
  function moveKart(k, steer, gas, brake) {
    const maxSpd = 0.22 + Math.min(k.speedBoost, 3) * 0.06;
    if (gas)        k.speed = Math.min(k.speed + 0.013, maxSpd);
    else if (brake) k.speed = Math.max(k.speed - 0.02, -maxSpd * 0.4);
    else            k.speed *= 0.91;

    if (Math.abs(k.speed) > 0.003) k.angle += steer * 0.052 * Math.sign(k.speed);
    k.group.rotation.y = k.angle;

    const nx = k.group.position.x + Math.sin(k.angle) * k.speed;
    const nz = k.group.position.z + Math.cos(k.angle) * k.speed;
    const cx = Math.max(-ARENA+1, Math.min(ARENA-1, nx));
    const cz = Math.max(-ARENA+1, Math.min(ARENA-1, nz));

    const R = 0.95;
    let blocked = false;
    for (const b of obsAABBs) {
      if (cx+R > b.minX && cx-R < b.maxX && cz+R > b.minZ && cz-R < b.maxZ) {
        blocked = true; break;
      }
    }
    if (!blocked) {
      k.group.position.x = cx;
      k.group.position.z = cz;
    } else {
      k.speed *= -0.2;
    }

    if (k.hitTimer > 0) {
      k.hitTimer--;
      k.bMat.color.setHex(k.hitTimer % 6 < 3 ? 0xff2222 : k.origColor);
      if (k.hitTimer === 0) k.bMat.color.setHex(k.origColor);
    }
    if (k.speedBoost > 0) k.speedBoost = Math.max(0, k.speedBoost - 0.008);
    if (k.shootCooldown > 0) k.shootCooldown--;
  }

  function hitKart(k) {
    if (k.hitTimer > 20) return;
    k.lives--;
    k.hitTimer = 45;
    if (k.lives <= 0) {
      k.alive = false;
      k.group.visible = false;
    }
  }

  // ─── AI ───────────────────────────────────────────────────────────────────
  function aiUpdate(k, player) {
    if (!k.alive) return;
    k.aiTimer--;
    if (k.aiTimer <= 0) {
      k.aiTimer = 60 + Math.random() * 90;
      k.aiTX = (Math.random() - 0.5) * ARENA * 1.6;
      k.aiTZ = (Math.random() - 0.5) * ARENA * 1.6;
    }

    const dx = k.aiTX - k.group.position.x;
    const dz = k.aiTZ - k.group.position.z;
    let diff = Math.atan2(dx, dz) - k.angle;
    while (diff >  Math.PI) diff -= Math.PI*2;
    while (diff < -Math.PI) diff += Math.PI*2;
    moveKart(k, Math.sign(diff) * Math.min(1, Math.abs(diff)*2), true, false);

    if (player.alive && k.shootCooldown <= 0 && k.bullets > 0) {
      const pdx = player.group.position.x - k.group.position.x;
      const pdz = player.group.position.z - k.group.position.z;
      if (pdx*pdx + pdz*pdz < 18*18) {
        let pd = Math.atan2(pdx, pdz) - k.angle;
        while (pd >  Math.PI) pd -= Math.PI*2;
        while (pd < -Math.PI) pd += Math.PI*2;
        if (Math.abs(pd) < 0.4) { fireBullet(k); k.shootCooldown = 55; }
      }
    }
  }

  // ─── Bullets ──────────────────────────────────────────────────────────────
  function fireBullet(k) {
    if (k.bullets <= 0) return;
    k.bullets--;
    if (k.idx === 0) updateHUD();
    const T = window.THREE;
    const mesh = new T.Mesh(
      new T.SphereGeometry(0.19, 6, 6),
      new T.MeshBasicMaterial({ color: k.idx === 0 ? 0xffff00 : 0xff8800 })
    );
    mesh.position.copy(k.group.position);
    mesh.position.y = 0.32;
    scene.add(mesh);
    bullets.push({ mesh, vx: Math.sin(k.angle)*0.48, vz: Math.cos(k.angle)*0.48, life: 55, owner: k });
  }

  function tickBullets() {
    for (let i = bullets.length-1; i >= 0; i--) {
      const b = bullets[i];
      b.mesh.position.x += b.vx;
      b.mesh.position.z += b.vz;
      b.life--;

      let kill = b.life <= 0
        || Math.abs(b.mesh.position.x) > ARENA+2
        || Math.abs(b.mesh.position.z) > ARENA+2;

      if (!kill) {
        for (const ob of obsAABBs) {
          if (b.mesh.position.x > ob.minX && b.mesh.position.x < ob.maxX &&
              b.mesh.position.z > ob.minZ && b.mesh.position.z < ob.maxZ) {
            kill = true; break;
          }
        }
      }
      if (!kill) {
        for (const k of karts) {
          if (k === b.owner || !k.alive) continue;
          const dx = k.group.position.x - b.mesh.position.x;
          const dz = k.group.position.z - b.mesh.position.z;
          if (dx*dx + dz*dz < 1.1) {
            hitKart(k);
            if (k.idx === 0 || b.owner.idx === 0) updateHUD();
            kill = true; break;
          }
        }
      }

      if (kill) {
        scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        bullets.splice(i, 1);
      }
    }
  }

  // ─── Power-ups ────────────────────────────────────────────────────────────
  function addPowerup(x, z) {
    const T = window.THREE;
    const type = PU_TYPES[Math.floor(Math.random() * 3)];
    const mesh = new T.Mesh(
      new T.BoxGeometry(0.72, 0.72, 0.72),
      new T.MeshLambertMaterial({ color: PU_COLORS[type] })
    );
    mesh.position.set(x, 0.5, z);
    scene.add(mesh);
    powerups.push({ mesh, type, x, z, alive: true, respawn: 0 });
  }

  function tickPowerups() {
    for (const p of powerups) {
      if (!p.alive) {
        if (--p.respawn <= 0) {
          p.type = PU_TYPES[Math.floor(Math.random()*3)];
          p.mesh.material.color.setHex(PU_COLORS[p.type]);
          p.mesh.visible = true;
          p.alive = true;
        }
        continue;
      }
      p.mesh.rotation.y = frame * 0.025;
      for (const k of karts) {
        if (!k.alive) continue;
        const dx = k.group.position.x - p.x;
        const dz = k.group.position.z - p.z;
        if (dx*dx + dz*dz < 1.5) {
          if (p.type === 'ammo')  k.bullets    = Math.min(k.bullets+3, 9);
          if (p.type === 'life')  k.lives      = Math.min(k.lives+1,   6);
          if (p.type === 'speed') k.speedBoost = Math.min(k.speedBoost+2, 4);
          p.alive = false;
          p.mesh.visible = false;
          p.respawn = 480;
          if (k.idx === 0) updateHUD();
          break;
        }
      }
    }
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────
  function updateHUD() {
    if (!hudEl || !karts[0]) return;
    const p = karts[0];
    const h = '❤️'.repeat(Math.max(0, p.lives));
    const e = karts.slice(1).filter(k=>k.alive).length;
    hudEl.innerHTML = `<span>${h}</span><span>🔫 ${p.bullets}</span><span>👾 ${e}</span>`;
  }

  // ─── Controls ─────────────────────────────────────────────────────────────
  function onKey(e) {
    keys[e.code] = e.type === 'keydown';
    if (e.type === 'keydown' && e.code === 'Space') {
      const p = karts[0];
      if (p?.alive && p.shootCooldown <= 0) { fireBullet(p); p.shootCooldown = 20; }
    }
  }

  function onTouch(e) {
    e.preventDefault();
    const rect = renderer.domElement.getBoundingClientRect();
    const mid = rect.left + rect.width/2;
    touchLeft = touchRight = false;
    for (const t of e.touches) {
      if (t.clientX < mid) touchLeft = true;
      else touchRight = true;
    }
  }
  function onTouchEnd(e) {
    e.preventDefault();
    if (!e.touches.length) touchLeft = touchRight = false;
    else onTouch(e);
  }

  // ─── Main tick ────────────────────────────────────────────────────────────
  function tick() {
    frame++;
    if (gameOver) return;

    const p = karts[0];
    if (p.alive) {
      const gas   = keys['ArrowUp']   || keys['KeyW'] || touchLeft || touchRight;
      const brake = keys['ArrowDown'] || keys['KeyS'];
      const left  = keys['ArrowLeft'] || keys['KeyA'] || (touchLeft  && !touchRight);
      const right = keys['ArrowRight']|| keys['KeyD'] || (touchRight && !touchLeft);
      moveKart(p, (right?1:0)-(left?1:0), gas, brake);

      if (touchFire && p.shootCooldown <= 0 && p.bullets > 0) {
        fireBullet(p);
        p.shootCooldown = 20;
      }
    }

    for (let i=1; i<karts.length; i++) aiUpdate(karts[i], p);
    tickBullets();
    tickPowerups();

    // Third-person camera behind player
    const d = 9, h = 5;
    camera.position.set(
      p.group.position.x - Math.sin(p.angle)*d,
      p.group.position.y + h,
      p.group.position.z - Math.cos(p.angle)*d
    );
    camera.lookAt(p.group.position.x, p.group.position.y+0.5, p.group.position.z);

    checkEnd();
  }

  function checkEnd() {
    if (gameOver) return;
    const p = karts[0];
    if (!p.alive) {
      gameOver = true;
      overEl.querySelector('div').textContent = '💀 Eliminiert!';
      overEl.classList.add('show');
    } else if (karts.slice(1).every(k=>!k.alive)) {
      gameOver = true;
      overEl.querySelector('div').textContent = '🏆 Du gewinnst!';
      overEl.classList.add('show');
    }
  }

  // ─── Restart ──────────────────────────────────────────────────────────────
  function restart() {
    overEl.classList.remove('show');
    for (const b of bullets) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }
    for (const p of powerups) scene.remove(p.mesh);
    for (const k of karts) scene.remove(k.group);
    bullets.length = powerups.length = karts.length = 0;

    for (let i=0; i<4; i++) {
      const s = STARTS[i];
      karts.push(mkKart(i, COLORS[i], s.x, s.z, s.a));
    }
    for (const [px,pz] of PU_SPOTS) addPowerup(px, pz);
    gameOver = false;
    frame = 0;
    updateHUD();
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  return function cleanup() {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup',   onKey);
    if (renderer) renderer.dispose();
    if (wrapEl)   wrapEl.remove();
  };
}
