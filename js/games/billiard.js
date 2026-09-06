const playerBody = document.getElementById('playerBody');
const overMsg = (...a) => window.zzOverMsg(...a);

const W = 480, H = 288, RAIL = 30;
const TX1 = RAIL, TY1 = RAIL, TX2 = W-RAIL, TY2 = H-RAIL;
const TW = TX2-TX1, TH = TY2-TY1;
const BR = 9, PR = 13;

const POCKETS = [
  {x:TX1,     y:TY1},
  {x:TX1+TW/2, y:TY1-7},
  {x:TX2,     y:TY1},
  {x:TX1,     y:TY2},
  {x:TX1+TW/2, y:TY2+7},
  {x:TX2,     y:TY2},
];

const BALL_COLOR = [
  '#F2F2F2',  // 0 cue
  '#E8C400',  // 1
  '#1833CC',  // 2
  '#CC2200',  // 3
  '#7700BB',  // 4
  '#DD6600',  // 5
  '#115500',  // 6
  '#8B1010',  // 7
  '#111111',  // 8
  '#E8C400',  // 9
  '#1833CC',  // 10
  '#CC2200',  // 11
  '#7700BB',  // 12
  '#DD6600',  // 13
  '#115500',  // 14
  '#8B1010',  // 15
];

export function build() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:100%;max-width:540px;margin:0 auto;';
  playerBody.appendChild(wrap);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.style.cssText = 'display:block;width:100%;touch-action:none;border-radius:6px;cursor:crosshair;user-select:none;';
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const infoBar = document.createElement('div');
  infoBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 10px;font-family:Fredoka,sans-serif;font-size:13px;color:#ccc;';
  wrap.appendChild(infoBar);

  const overEl = overMsg(wrap, '', restart);

  let balls = [];
  let state = 'aiming'; // aiming | rolling | ai-thinking | gameover
  let turn  = 0; // 0=player, 1=AI
  let group = [null, null]; // null | 'solid' | 'stripe' per player
  let keepTurn = false;
  let scratch  = false;
  let pocketsThisTurn = [];
  let raf, aiTimer;
  let running = true;

  // Aiming
  let aimAngle = 0;
  let holding  = false;
  let holdMs   = 0;

  // ─── helpers ────────────────────────────────────────────────────────────────
  const cueBall    = () => balls.find(b => b.num === 0 && !b.pocketed);
  const liveBalls  = () => balls.filter(b => !b.pocketed);
  const myPool     = (who) => {
    const g = group[who];
    return balls.filter(b => !b.pocketed && b.num !== 0 && b.num !== 8 &&
      (g === null || (g === 'solid' ? b.num <= 7 : b.num >= 9)));
  };

  function getPower() {
    return Math.min(2 + holdMs / 100, 16);
  }

  // ─── setup ──────────────────────────────────────────────────────────────────
  function setup() {
    balls = [];
    const ax = TX1 + TW * 0.72, ay = TY1 + TH / 2;
    const rdx = BR * Math.sqrt(3);
    // Standard rack: 1 at apex, 8 in centre, alternating solid/stripe on corners
    const rack = [
      [1],
      [2, 9],
      [3, 8, 10],
      [4, 11, 5, 12],
      [13, 6, 14, 7, 15],
    ];
    rack.forEach((row, ri) => {
      row.forEach((num, ci) => {
        balls.push({
          x: ax + ri*rdx + (Math.random()-.5)*.2,
          y: ay + (ci - (row.length-1)/2)*BR*2 + (Math.random()-.5)*.2,
          vx:0, vy:0, num, pocketed:false,
        });
      });
    });
    balls.push({ x:TX1+TW*.27, y:ay, vx:0, vy:0, num:0, pocketed:false });

    state = 'aiming'; turn = 0;
    group = [null, null];
    keepTurn = false; scratch = false; pocketsThisTurn = [];
    holding = false; holdMs = 0;
    aimAngle = 0;
    updateInfo();
  }

  // ─── physics ────────────────────────────────────────────────────────────────
  function physicsStep() {
    let moving = false;
    for (const b of balls) {
      if (b.pocketed) continue;
      b.x += b.vx; b.y += b.vy;
      b.vx *= 0.987; b.vy *= 0.987;
      if (Math.abs(b.vx) < 0.04) b.vx = 0;
      if (Math.abs(b.vy) < 0.04) b.vy = 0;
      if (b.vx || b.vy) moving = true;

      // Cushion bounce
      if (b.x-BR < TX1) { b.x = TX1+BR; b.vx =  Math.abs(b.vx)*.72; }
      if (b.x+BR > TX2) { b.x = TX2-BR; b.vx = -Math.abs(b.vx)*.72; }
      if (b.y-BR < TY1) { b.y = TY1+BR; b.vy =  Math.abs(b.vy)*.72; }
      if (b.y+BR > TY2) { b.y = TY2-BR; b.vy = -Math.abs(b.vy)*.72; }
    }

    // Ball-ball collisions (3 iterations for stability)
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < balls.length-1; i++) {
        if (balls[i].pocketed) continue;
        for (let j = i+1; j < balls.length; j++) {
          if (balls[j].pocketed) continue;
          const a = balls[i], b = balls[j];
          const dx = b.x-a.x, dy = b.y-a.y;
          const d2 = dx*dx+dy*dy;
          if (d2 >= (BR*2)*(BR*2) || d2 === 0) continue;
          const d  = Math.sqrt(d2);
          const nx = dx/d, ny = dy/d;
          const ov = BR*2-d;
          a.x -= nx*ov/2; a.y -= ny*ov/2;
          b.x += nx*ov/2; b.y += ny*ov/2;
          const rv = (a.vx-b.vx)*nx + (a.vy-b.vy)*ny;
          if (rv > 0) {
            a.vx -= rv*nx; a.vy -= rv*ny;
            b.vx += rv*nx; b.vy += rv*ny;
          }
        }
      }
    }

    // Pocket check
    for (const b of balls) {
      if (b.pocketed) continue;
      for (const p of POCKETS) {
        const dx = b.x-p.x, dy = b.y-p.y;
        if (dx*dx+dy*dy < PR*PR) {
          b.pocketed = true; b.vx = 0; b.vy = 0;
          onPocket(b);
          moving = true;
          break;
        }
      }
    }
    return moving;
  }

  // ─── pocket logic ───────────────────────────────────────────────────────────
  function onPocket(b) {
    if (b.num === 0) {
      scratch = true;
      return;
    }
    pocketsThisTurn.push(b.num);
    if (b.num === 8) return;

    const isStripe = b.num >= 9;
    if (group[turn] === null && group[1-turn] === null) {
      group[turn]   = isStripe ? 'stripe' : 'solid';
      group[1-turn] = isStripe ? 'solid'  : 'stripe';
      updateInfo();
    }
    const mine = (isStripe && group[turn]==='stripe') || (!isStripe && group[turn]==='solid') || group[turn]===null;
    if (mine) keepTurn = true;
  }

  function endTurn() {
    const eight = pocketsThisTurn.includes(8);
    if (eight) {
      const cleared = myPool(turn).length === 0;
      if (scratch || !cleared) {
        showOver(turn===0 ? '😔 Du hast verloren!' : '🏆 Du gewinnst!');
      } else {
        showOver(turn===0 ? '🏆 Du gewinnst!' : '😔 Du hast verloren!');
      }
      return;
    }

    if (scratch) {
      scratch = false;
      keepTurn = false;
      const cue = balls.find(b=>b.num===0);
      if (cue) { cue.pocketed=false; cue.x=TX1+TW*.27; cue.y=TY1+TH/2; }
    }

    if (!keepTurn) turn = 1-turn;
    keepTurn = false;
    pocketsThisTurn = [];

    if (turn === 1) {
      state = 'ai-thinking';
      aiTimer = setTimeout(aiShot, 900 + Math.random()*600);
    } else {
      state = 'aiming';
    }
    updateInfo();
  }

  function showOver(msg) {
    state = 'gameover';
    clearTimeout(aiTimer);
    overEl.querySelector('div').textContent = msg;
    overEl.classList.add('show');
  }

  // ─── shoot ──────────────────────────────────────────────────────────────────
  function shoot(angle, power) {
    const cue = cueBall();
    if (!cue) return;
    cue.vx = Math.cos(angle)*power;
    cue.vy = Math.sin(angle)*power;
    state = 'rolling';
    keepTurn = false;
    scratch = false;
    pocketsThisTurn = [];
  }

  // ─── AI ─────────────────────────────────────────────────────────────────────
  function aiShot() {
    const cue = cueBall();
    if (!cue) { endTurn(); return; }

    let pool = myPool(1);
    if (pool.length === 0) pool = balls.filter(b=>!b.pocketed&&b.num===8);
    if (pool.length === 0) { endTurn(); return; }

    let bestAngle = Math.random()*Math.PI*2, bestPower = 6;
    let bestScore = -Infinity;

    for (const target of pool) {
      for (const pocket of POCKETS) {
        const tdx=pocket.x-target.x, tdy=pocket.y-target.y;
        const td=Math.sqrt(tdx*tdx+tdy*tdy);
        if (td<0.1) continue;
        const gx=target.x-tdx/td*(BR*2), gy=target.y-tdy/td*(BR*2);
        const cdx=gx-cue.x, cdy=gy-cue.y;
        const cd=Math.sqrt(cdx*cdx+cdy*cdy);
        if (cd<1) continue;
        const score = 1000/td - cd*.4 + Math.random()*15;
        if (score>bestScore) {
          bestScore=score;
          bestAngle=Math.atan2(cdy,cdx)+(Math.random()-.5)*.12;
          bestPower=Math.min(cd*.07+4, 15);
        }
      }
    }
    shoot(bestAngle, bestPower);
  }

  // ─── ray casting for aim line ────────────────────────────────────────────────
  function castRay(ox, oy, dx, dy) {
    let minT = TW+TH+100;
    let hitBall = null;

    // Wall hits
    const ts = [];
    if (Math.abs(dx)>0.001) { ts.push({t:(TX1+BR-ox)/dx}); ts.push({t:(TX2-BR-ox)/dx}); }
    if (Math.abs(dy)>0.001) { ts.push({t:(TY1+BR-oy)/dy}); ts.push({t:(TY2-BR-oy)/dy}); }
    for (const {t} of ts) {
      if (t>0.5 && t<minT) { minT=t; hitBall=null; }
    }

    // Ball hits
    for (const b of balls) {
      if (b.pocketed || b.num===0) continue;
      const fx=ox-b.x, fy=oy-b.y;
      const a=dx*dx+dy*dy;
      const bc=2*(fx*dx+fy*dy);
      const c=fx*fx+fy*fy-(BR*2)*(BR*2);
      const disc=bc*bc-4*a*c;
      if (disc<0) continue;
      const t=(-bc-Math.sqrt(disc))/(2*a);
      if (t>0.5 && t<minT) { minT=t; hitBall=b; }
    }
    return { t:minT, ball:hitBall };
  }

  // ─── draw ────────────────────────────────────────────────────────────────────
  function drawTable() {
    // Wooden rail
    ctx.fillStyle='#5C3317'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#7A4829'; ctx.fillRect(2,2,W-4,H-4);
    ctx.fillStyle='#6B3C20'; ctx.fillRect(3,3,W-6,H-6);

    // Felt
    const feltGrad = ctx.createLinearGradient(TX1,TY1,TX2,TY2);
    feltGrad.addColorStop(0,'#1e7c40');
    feltGrad.addColorStop(1,'#186633');
    ctx.fillStyle = feltGrad;
    ctx.fillRect(TX1,TY1,TW,TH);

    // Subtle felt lines
    ctx.save();
    ctx.strokeStyle='rgba(0,0,0,0.05)'; ctx.lineWidth=1;
    for (let y=TY1; y<TY2; y+=18) {
      ctx.beginPath(); ctx.moveTo(TX1,y); ctx.lineTo(TX2,y); ctx.stroke();
    }
    ctx.restore();

    // Inner rail shadow
    ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=2;
    ctx.strokeRect(TX1,TY1,TW,TH);

    // Felt dots (foot/head spot)
    ctx.fillStyle='rgba(255,255,255,0.18)';
    [[TX1+TW*.73, TY1+TH/2],[TX1+TW*.27, TY1+TH/2]].forEach(([x,y])=>{
      ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fill();
    });

    // Head string line
    ctx.setLineDash([3,6]);
    ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(TX1+TW*.27,TY1+2);
    ctx.lineTo(TX1+TW*.27,TY2-2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pockets
    for (const p of POCKETS) {
      ctx.fillStyle='#0a0808';
      ctx.beginPath(); ctx.arc(p.x,p.y,PR,0,Math.PI*2); ctx.fill();
      const rg = ctx.createRadialGradient(p.x-2,p.y-2,1,p.x,p.y,PR);
      rg.addColorStop(0,'rgba(80,40,20,0.4)');
      rg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=rg;
      ctx.beginPath(); ctx.arc(p.x,p.y,PR,0,Math.PI*2); ctx.fill();
    }
  }

  function drawBall(b) {
    const {x,y,num} = b;
    const isStripe = num>=9 && num<=15;
    const col = BALL_COLOR[num];

    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(x+2,y+4,BR*.9,BR*.4,0,0,Math.PI*2);
    ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(x,y,BR,0,Math.PI*2); ctx.clip();

    // Base color
    ctx.fillStyle = num===0 ? '#f0f0f0' : isStripe ? '#f4f4f4' : col;
    ctx.fillRect(x-BR,y-BR,BR*2,BR*2);

    // Stripe band
    if (isStripe) {
      ctx.fillStyle=col;
      ctx.fillRect(x-BR,y-BR*.52,BR*2,BR*1.04);
    }

    // Gloss
    const gloss=ctx.createRadialGradient(x-BR*.28,y-BR*.3,0,x,y,BR);
    gloss.addColorStop(0,'rgba(255,255,255,0.55)');
    gloss.addColorStop(0.4,'rgba(255,255,255,0.08)');
    gloss.addColorStop(1,'rgba(0,0,0,0.15)');
    ctx.fillStyle=gloss;
    ctx.fillRect(x-BR,y-BR,BR*2,BR*2);

    ctx.restore();

    // Outline
    ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.arc(x,y,BR,0,Math.PI*2); ctx.stroke();

    // Number circle + label
    if (num>0) {
      ctx.fillStyle='rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.arc(x,y,BR*.42,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#111';
      ctx.font=`bold ${Math.round(BR*.86)}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(num,x,y+.5);
    }
  }

  function drawAimLine() {
    const cue = cueBall();
    if (!cue) return;
    const cos=Math.cos(aimAngle), sin=Math.sin(aimAngle);
    const hit=castRay(cue.x,cue.y,cos,sin);
    const hx=cue.x+cos*hit.t, hy=cue.y+sin*hit.t;

    ctx.save();

    // Cue ball trajectory
    ctx.setLineDash([5,5]);
    ctx.strokeStyle='rgba(255,255,255,0.5)';
    ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(cue.x,cue.y); ctx.lineTo(hx,hy); ctx.stroke();

    if (hit.ball) {
      // Ghost ball
      ctx.globalAlpha=0.28;
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(hx,hy,BR,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;

      // Target ball's outgoing direction
      const nbx=hit.ball.x-hx, nby=hit.ball.y-hy;
      const nd=Math.sqrt(nbx*nbx+nby*nby)||1;
      ctx.setLineDash([4,6]);
      ctx.strokeStyle='rgba(255,210,0,0.55)';
      ctx.lineWidth=1.2;
      ctx.beginPath();
      ctx.moveTo(hit.ball.x,hit.ball.y);
      ctx.lineTo(hit.ball.x+nbx/nd*70,hit.ball.y+nby/nd*70);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawCue() {
    const cue = cueBall();
    if (!cue || state!=='aiming') return;

    const power = holding ? getPower() : 3;
    const gap = BR + 4 + power * 1.3;
    const cueLen = 90;
    const bcos=Math.cos(aimAngle+Math.PI), bsin=Math.sin(aimAngle+Math.PI);

    const x1=cue.x+bcos*gap, y1=cue.y+bsin*gap;
    const x2=x1+bcos*cueLen, y2=y1+bsin*cueLen;

    const cg=ctx.createLinearGradient(x1,y1,x2,y2);
    cg.addColorStop(0,'#c8e8e8');
    cg.addColorStop(0.08,'#D4A840');
    cg.addColorStop(0.5,'#E8C458');
    cg.addColorStop(1,'#7A4E18');

    ctx.save();
    ctx.lineCap='round';

    // Cue shadow
    ctx.shadowColor='rgba(0,0,0,0.4)';
    ctx.shadowBlur=3;
    ctx.shadowOffsetX=1;
    ctx.shadowOffsetY=1;

    ctx.strokeStyle=cg; ctx.lineWidth=5.5;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();

    ctx.shadowBlur=0;

    // Tip ferrule (white)
    ctx.strokeStyle='#ddd'; ctx.lineWidth=4;
    ctx.beginPath();
    ctx.moveTo(cue.x+bcos*(BR+2),cue.y+bsin*(BR+2));
    ctx.lineTo(x1); ctx.stroke();

    ctx.restore();

    // Power bar
    const pct=power/16;
    const bx=W-20, by=TY1+2, bh=TH-4, bw=9;
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(bx,by,bw,bh);
    const pg=ctx.createLinearGradient(0,by+bh,0,by);
    pg.addColorStop(0,'#00cc44'); pg.addColorStop(0.55,'#ffcc00'); pg.addColorStop(1,'#ff3300');
    ctx.fillStyle=pg;
    ctx.fillRect(bx,by+bh*(1-pct),bw,bh*pct);
    ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=1;
    ctx.strokeRect(bx,by,bw,bh);

    // Labels
    ctx.fillStyle='rgba(255,255,255,0.5)';
    ctx.font='9px Arial'; ctx.textAlign='center';
    ctx.fillText('PWR',bx+bw/2,by+bh+10);
  }

  function drawFrame() {
    drawTable();

    if (state==='aiming') {
      drawAimLine();
      // Cue ball highlight
      const cue=cueBall();
      if (cue) {
        ctx.strokeStyle='rgba(198,255,61,0.4)'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(cue.x,cue.y,BR+5,0,Math.PI*2); ctx.stroke();
      }
    }

    for (const b of balls) { if (!b.pocketed) drawBall(b); }

    if (state==='aiming') drawCue();

    if (state==='ai-thinking') {
      ctx.fillStyle='rgba(0,0,0,0.35)';
      ctx.fillRect(TX1,TY1,TW,TH);
      ctx.fillStyle='#fff';
      ctx.font='bold 15px Fredoka,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('KI denkt...', W/2, H/2);
    }
  }

  // ─── info bar ────────────────────────────────────────────────────────────────
  function groupLabel(who) {
    const g=group[who];
    if (!g) return '–';
    if (g==='solid') return '🟡 Voll (1-7)';
    return '🔴 Halb (9-15)';
  }
  function updateInfo() {
    const mine=myPool(0).length, ai=myPool(1).length;
    const eight=balls.find(b=>b.num===8&&!b.pocketed)?'⚫ im Spiel':'⚫ eingelocht';
    infoBar.innerHTML=`
      <span style="color:${turn===0?'#C6FF3D':'#aaa'}">👤 ${groupLabel(0)} (${mine})</span>
      <span style="color:#aaa;font-size:11px;">${eight}</span>
      <span style="color:${turn===1?'#C6FF3D':'#aaa'}">🤖 ${groupLabel(1)} (${ai})</span>
    `;
  }

  // ─── controls ────────────────────────────────────────────────────────────────
  function getPos(e) {
    const r=canvas.getBoundingClientRect();
    const sx=W/r.width, sy=H/r.height;
    return {x:(e.clientX-r.left)*sx, y:(e.clientY-r.top)*sy};
  }

  function updateAim(pos) {
    const cue=cueBall();
    if (!cue) return;
    aimAngle=Math.atan2(pos.y-cue.y, pos.x-cue.x);
  }

  canvas.addEventListener('pointermove', e => {
    if (state!=='aiming') return;
    updateAim(getPos(e));
    if (holding) holdMs=Math.min(holdMs+2, 1400);
  });
  canvas.addEventListener('pointerdown', e => {
    if (state!=='aiming') return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    updateAim(getPos(e));
    holding=true; holdMs=0;
  });
  canvas.addEventListener('pointerup', e => {
    if (!holding) return;
    holding=false;
    if (state==='aiming') shoot(aimAngle, getPower());
  });
  canvas.addEventListener('pointercancel', () => { holding=false; });

  // ─── game loop ───────────────────────────────────────────────────────────────
  function loop() {
    if (!running) return;
    raf=requestAnimationFrame(loop);

    if (state==='rolling') {
      const moving=physicsStep();
      if (!moving) endTurn();
    }

    if (state==='aiming' && holding) {
      holdMs=Math.min(holdMs+1, 1400);
    }

    drawFrame();
  }

  // ─── restart ─────────────────────────────────────────────────────────────────
  function restart() {
    overEl.classList.remove('show');
    clearTimeout(aiTimer);
    setup();
  }

  setup();
  window.__restartCurrent = restart;
  loop();

  return function cleanup() {
    running=false;
    cancelAnimationFrame(raf);
    clearTimeout(aiTimer);
    wrap.remove();
  };
}
