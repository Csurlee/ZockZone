import { overMsg, mkHint, playerBody } from '../core.js';

const W = 360, H = 360, R = 10;

const WALLS = [
  {x:100,y:52,w:60,h:18},{x:200,y:52,w:60,h:18},
  {x:100,y:290,w:60,h:18},{x:200,y:290,w:60,h:18},
  {x:52,y:100,w:18,h:60},{x:52,y:200,w:18,h:60},
  {x:290,y:100,w:18,h:60},{x:290,y:200,w:18,h:60},
  {x:162,y:162,w:36,h:36},
];

const PU_SPOTS=[{x:180,y:28},{x:180,y:332},{x:28,y:180},{x:332,y:180},
  {x:105,y:105},{x:255,y:105},{x:255,y:255},{x:105,y:255}];
const PU_TYPES=['🔫','💣','⚡','🛡️'];
const COLORS=['#C6FF3D','#FF6B4A','#A78BFA','#38BDF8'];
const NAMES=['Du','Rot','Lila','Cyan'];
const SPAWNS=[[72,72],[288,72],[288,288],[72,288]];
const SPAWN_ANGLES=[Math.PI*.25,Math.PI*.75,Math.PI*1.25,Math.PI*1.75];

function hitWall(cx,cy,r=R+1){
  for(const w of WALLS){
    const nx=Math.max(w.x,Math.min(cx,w.x+w.w));
    const ny=Math.max(w.y,Math.min(cy,w.y+w.h));
    if(Math.hypot(cx-nx,cy-ny)<r) return true;
  }
  return cx<r||cx>W-r||cy<r||cy>H-r;
}

export function build(){
  const wrap=document.createElement('div');
  wrap.className='canvas-wrap';
  const canvas=document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  wrap.appendChild(canvas);
  const ctx=canvas.getContext('2d');

  const overEl=overMsg(wrap,'',()=>init());
  const msgDiv=overEl.querySelector('div');

  playerBody.append(wrap,mkHint('Pfeiltasten / WASD · Leertaste = Schießen · Handy: links/rechts tippen + Feuer-Button'));

  let karts,bullets,powerups,particles,gameOver,raf;
  const keys={};
  let tLeft=false,tRight=false,tFire=false,prevFire=false;

  /* ── Kart ── */
  class Kart{
    constructor(i){
      const [sx,sy]=SPAWNS[i];
      this.x=sx; this.y=sy; this.angle=SPAWN_ANGLES[i];
      this.speed=0; this.color=COLORS[i]; this.name=NAMES[i];
      this.isPlayer=i===0; this.lives=3; this.shield=0;
      this.weapon=null; this.ammo=0; this.cooldown=0; this.boost=0;
      this.alive=true;
      this.aiTarget={x:W/2,y:H/2}; this.aiTimer=0; this.aiShootTimer=0;
    }
    draw(){
      if(!this.alive) return;
      ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.angle);
      if(this.shield>0){
        ctx.strokeStyle=`rgba(100,200,255,${0.4+0.3*Math.sin(Date.now()*.01)})`;
        ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(0,0,R+5,0,Math.PI*2); ctx.stroke();
      }
      // body
      ctx.fillStyle=this.color;
      ctx.beginPath(); ctx.roundRect(-R,-R*.65,R*2,R*1.3,3); ctx.fill();
      // windshield
      ctx.fillStyle='rgba(180,230,255,.65)';
      ctx.fillRect(1,-R*.35,R*.8,R*.7);
      // front dot
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(R*.75,0,2.2,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    move(inp){
      const {up,down,left,right}=inp;
      const ms=3.5+(this.boost*.8);
      if(up)   this.speed=Math.min(this.speed+.22,ms);
      if(down)  this.speed=Math.max(this.speed-.16,-1.5);
      this.speed*=.91;
      if(Math.abs(this.speed)>.05){
        const t=.055*Math.sign(this.speed);
        if(left)  this.angle-=t;
        if(right) this.angle+=t;
      }
      const nx=this.x+Math.cos(this.angle)*this.speed;
      const ny=this.y+Math.sin(this.angle)*this.speed;
      if(!hitWall(nx,this.y)) this.x=nx; else this.speed*=-.35;
      if(!hitWall(this.x,ny)) this.y=ny; else this.speed*=-.35;
      this.x=Math.max(R+2,Math.min(W-R-2,this.x));
      this.y=Math.max(R+2,Math.min(H-R-2,this.y));
      if(this.cooldown>0) this.cooldown--;
      if(this.shield>0)   this.shield--;
      if(this.boost>0)    this.boost=Math.max(0,this.boost-.04);
    }
    shoot(){
      if(this.cooldown>0||gameOver) return;
      const isBomb=this.weapon==='💣';
      const spread=this.weapon==='🔫'?[-0.18,0,.18]:[0];
      spread.forEach(s=>{
        bullets.push({x:this.x+Math.cos(this.angle)*(R+5),
          y:this.y+Math.sin(this.angle)*(R+5),
          angle:this.angle+s,spd:isBomb?3.5:5.5,
          owner:this,bomb:isBomb,life:isBomb?70:90});
      });
      if(this.ammo>0){ this.ammo--; if(!this.ammo) this.weapon=null; }
      this.cooldown=this.weapon==='🔫'?9:20;
    }
    hit(){
      if(this.shield>0){this.shield=0; boom(this.x,this.y,'#60a5fa'); return;}
      this.lives--;
      boom(this.x,this.y,this.color);
      if(this.lives<=0) this.alive=false;
    }
    aiUpdate(){
      if(!this.alive) return;
      const player=karts[0];
      this.aiTimer--;
      if(this.aiTimer<=0){
        if(player.alive&&Math.random()<.65){
          const off=(Math.random()-.5)*80;
          this.aiTarget={x:player.x+off,y:player.y+off};
        } else {
          this.aiTarget={x:35+Math.random()*(W-70),y:35+Math.random()*(H-70)};
        }
        this.aiTimer=50+Math.random()*70;
      }
      const dx=this.aiTarget.x-this.x, dy=this.aiTarget.y-this.y;
      const ta=Math.atan2(dy,dx);
      let da=ta-this.angle;
      while(da>Math.PI)  da-=Math.PI*2;
      while(da<-Math.PI) da+=Math.PI*2;
      this.move({up:true,down:false,left:da<-.12,right:da>.12});
      this.aiShootTimer--;
      if(player.alive&&this.aiShootTimer<=0){
        const dist=Math.hypot(player.x-this.x,player.y-this.y);
        const pa=Math.atan2(player.y-this.y,player.x-this.x);
        let pda=pa-this.angle; while(pda>Math.PI) pda-=Math.PI*2; while(pda<-Math.PI) pda+=Math.PI*2;
        if(dist<170&&Math.abs(pda)<.35){ this.shoot(); this.aiShootTimer=20+Math.random()*35; }
      }
    }
  }

  function boom(x,y,col){
    for(let i=0;i<12;i++) particles.push({
      x,y,vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,
      r:2+Math.random()*3,life:25+Math.random()*15,maxLife:40,col
    });
  }

  function init(){
    gameOver=false; overEl.classList.remove('show');
    karts=Array.from({length:4},(_,i)=>new Kart(i));
    bullets=[]; particles=[];
    powerups=PU_SPOTS.map(s=>({
      x:s.x,y:s.y,alive:true,
      type:PU_TYPES[Math.floor(Math.random()*PU_TYPES.length)],timer:0
    }));
  }

  /* ── Draw ── */
  function drawArena(){
    ctx.fillStyle='#12101e';
    ctx.fillRect(0,0,W,H);
    // grid dots
    ctx.fillStyle='rgba(255,255,255,.04)';
    for(let x=20;x<W;x+=30) for(let y=20;y<H;y+=30){
      ctx.beginPath(); ctx.arc(x,y,1.5,0,Math.PI*2); ctx.fill();
    }
    // walls
    for(const w of WALLS){
      ctx.fillStyle='#2d1f5e';
      ctx.fillRect(w.x,w.y,w.w,w.h);
      ctx.strokeStyle='#7C3AED'; ctx.lineWidth=2;
      ctx.strokeRect(w.x,w.y,w.w,w.h);
    }
    // border
    ctx.strokeStyle='#4C1D95'; ctx.lineWidth=4;
    ctx.strokeRect(2,2,W-4,H-4);
  }

  function drawPowerups(){
    for(const p of powerups){
      if(!p.alive) continue;
      // glow ring
      ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(p.x,p.y,13+Math.sin(Date.now()*.003)*2,0,Math.PI*2); ctx.stroke();
      ctx.font='15px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(p.type,p.x,p.y);
    }
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  }

  function drawBullets(){
    for(const b of bullets){
      if(b.bomb){
        ctx.font='14px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('💣',b.x,b.y);
        ctx.textAlign='left'; ctx.textBaseline='alphabetic';
      } else {
        const g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,5);
        g.addColorStop(0,'#fffbe0'); g.addColorStop(1,'rgba(255,200,0,0)');
        ctx.fillStyle=g;
        ctx.beginPath(); ctx.arc(b.x,b.y,5,0,Math.PI*2); ctx.fill();
      }
    }
  }

  function drawParticles(){
    for(const p of particles){
      const t=p.life/p.maxLife;
      ctx.globalAlpha=t*.9;
      ctx.fillStyle=p.col;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*t,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  function drawHUD(){
    const alive=karts.filter(k=>k.alive).length;
    karts.forEach((k,i)=>{
      const bx=6+i*88, by=6;
      ctx.fillStyle=k.alive?k.color:'rgba(255,255,255,.2)';
      ctx.font='bold 9px Inter'; ctx.fillText(k.name,bx,by+10);
      for(let h=0;h<3;h++){
        ctx.fillStyle=h<k.lives?(k.alive?'#ef4444':'rgba(255,255,255,.15)'):'rgba(255,255,255,.1)';
        ctx.font='11px serif'; ctx.fillText('♥',bx+h*14,by+22);
      }
    });
    // player weapon
    const p=karts[0];
    if(p.alive&&p.weapon){
      ctx.font='12px serif'; ctx.textAlign='right';
      ctx.fillText(p.weapon+' ×'+p.ammo,W-6,22);
      ctx.textAlign='left';
    }
    // touch fire button
    if(navigator.maxTouchPoints>0){
      ctx.save();
      ctx.globalAlpha=tFire?.5:.25;
      ctx.fillStyle='#ff6b4a';
      ctx.beginPath(); ctx.arc(W-30,H-30,22,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
      ctx.font='14px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🔫',W-30,H-30);
      ctx.textAlign='left'; ctx.textBaseline='alphabetic';
      ctx.restore();
    }
  }

  /* ── Update ── */
  function updateBullets(){
    bullets=bullets.filter(b=>{
      b.x+=Math.cos(b.angle)*b.spd;
      b.y+=Math.sin(b.angle)*b.spd;
      b.life--;
      if(b.life<=0) return false;
      // wall
      for(const w of WALLS){
        if(b.x>=w.x&&b.x<=w.x+w.w&&b.y>=w.y&&b.y<=w.y+w.h){
          if(b.bomb){ explodeBomb(b); return false; }
          return false;
        }
      }
      if(b.x<2||b.x>W-2||b.y<2||b.y>H-2){
        if(b.bomb) explodeBomb(b);
        return false;
      }
      // kart hits
      for(const k of karts){
        if(!k.alive||k===b.owner) continue;
        if(Math.hypot(b.x-k.x,b.y-k.y)<R+4){
          if(b.bomb){ explodeBomb(b); return false; }
          k.hit(); return false;
        }
      }
      return true;
    });
  }

  function explodeBomb(b){
    boom(b.x,b.y,'#ff9f43');
    // extra ring
    for(let i=0;i<20;i++) particles.push({
      x:b.x,y:b.y,vx:(Math.random()-.5)*7,vy:(Math.random()-.5)*7,
      r:3+Math.random()*4,life:40,maxLife:40,col:'#ff6348'
    });
    karts.forEach(k=>{
      if(!k.alive||k===b.owner) return;
      if(Math.hypot(b.x-k.x,b.y-k.y)<52) k.hit();
    });
  }

  function updatePowerups(){
    for(const p of powerups){
      if(!p.alive){ if(--p.timer<=0){p.alive=true; p.type=PU_TYPES[Math.floor(Math.random()*PU_TYPES.length)];} continue; }
      for(const k of karts){
        if(!k.alive) continue;
        if(Math.hypot(k.x-p.x,k.y-p.y)<R+12){
          p.alive=false; p.timer=480;
          if(p.type==='⚡')      k.boost=1.8;
          else if(p.type==='🛡️') k.shield=200;
          else { k.weapon=p.type; k.ammo=3; }
          break;
        }
      }
    }
  }

  function updateParticles(){
    particles=particles.filter(p=>{
      p.x+=p.vx; p.y+=p.vy; p.vx*=.9; p.vy*=.9; p.life--;
      return p.life>0;
    });
  }

  function checkEnd(){
    const alive=karts.filter(k=>k.alive);
    if(alive.length<=1){
      gameOver=true;
      const won=alive[0]?.isPlayer;
      msgDiv.innerHTML=won
        ?'<span style="font-size:2.2rem">🏆</span><br>Du gewinnst!'
        :'<span style="font-size:2.2rem">💀</span><br>Eliminiert!';
      overEl.classList.add('show');
    }
  }

  /* ── Loop ── */
  let prevShoot=false;
  function loop(){
    raf=requestAnimationFrame(loop);
    const up=keys.ArrowUp||keys.w||tLeft||tRight;
    const left=keys.ArrowLeft||keys.a||tLeft;
    const right=keys.ArrowRight||keys.d||tRight;
    const down=keys.ArrowDown||keys.s;
    const fire=keys[' ']||tFire;

    if(!gameOver){
      karts[0].move({up,down,left,right});
      if(fire&&!prevShoot) karts[0].shoot();
      for(let i=1;i<karts.length;i++) karts[i].aiUpdate();
      updateBullets(); updatePowerups(); updateParticles();
      checkEnd();
    }
    prevShoot=fire;

    drawArena(); drawParticles(); drawPowerups(); drawBullets();
    karts.forEach(k=>k.draw());
    drawHUD();
  }

  /* ── Input ── */
  const onDown=e=>{ keys[e.key]=true; if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault(); };
  const onUp=e=>{ keys[e.key]=false; };
  document.addEventListener('keydown',onDown);
  document.addEventListener('keyup',onUp);

  // Touch: multi-touch — fire zone = bottom-right circle, rest = steering
  function touchZone(e){
    tLeft=false; tRight=false; tFire=false;
    const rect=canvas.getBoundingClientRect();
    const sx=W/rect.width, sy=H/rect.height;
    for(const t of e.touches){
      const tx=(t.clientX-rect.left)*sx;
      const ty=(t.clientY-rect.top)*sy;
      // fire button zone: bottom-right corner circle r=35
      if(Math.hypot(tx-(W-30),ty-(H-30))<35){ tFire=true; continue; }
      if(tx<W/2) tLeft=true; else tRight=true;
    }
  }
  const tStart=e=>{touchZone(e); e.preventDefault();};
  const tMove=e=>{touchZone(e); e.preventDefault();};
  const tEnd=e=>{
    if(e.touches.length===0){tLeft=false; tRight=false; tFire=false;}
    else touchZone(e);
  };
  canvas.addEventListener('touchstart',tStart,{passive:false});
  canvas.addEventListener('touchmove',tMove,{passive:false});
  canvas.addEventListener('touchend',tEnd);

  init(); loop();

  return ()=>{
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown',onDown);
    document.removeEventListener('keyup',onUp);
    canvas.removeEventListener('touchstart',tStart);
    canvas.removeEventListener('touchmove',tMove);
    canvas.removeEventListener('touchend',tEnd);
    playerBody.innerHTML='';
  };
}
