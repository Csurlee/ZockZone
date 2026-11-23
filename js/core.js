import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { t, getLang } from './i18n.js?v=20261122o';
import { GAMES } from './games-list.js?v=20261123f';
import { makeHD } from './hd.js?v=20261122r';

const _sb = createClient('https://supabase.hackthelab.uk', 'sb_publishable_rWR-Aesm3GyJxEnvrhcZ2M_ZmMoQWdB');

let ratingsMap  = {};
let userRatings = {};

async function loadRatings(){
  try{
    const { data: avgs } = await _sb.from('game_ratings_avg').select('game_id,avg_rating,rating_count');
    ratingsMap = {};
    (avgs || []).forEach(r => { ratingsMap[r.game_id] = { avg: r.avg_rating, count: r.rating_count }; });
  }catch{}

  userRatings = {};
  try{
    const { data: { session } } = await _sb.auth.getSession();
    if(session?.user){
      const { data } = await _sb.from('ratings').select('game_id,rating').eq('user_id', session.user.id);
      (data || []).forEach(r => { userRatings[r.game_id] = r.rating; });
    }
  }catch{}
  renderGrid();
}

window.zzRateGame = async (gameId, stars) => {
  const { data: { session } } = await _sb.auth.getSession();
  if(!session){ if(window.zzOpenAuth) window.zzOpenAuth(); return; }
  await _sb.from('ratings').upsert(
    { user_id: session.user.id, game_id: gameId, rating: stars },
    { onConflict: 'user_id,game_id' }
  );
  userRatings[gameId] = stars;
  await loadRatings();
  renderPlayerRating(gameId);
};

document.addEventListener('mouseover', e => {
  const star = e.target.closest('.cstar[data-star]');
  if(!star) return;
  const wrap = star.closest('.stars-wrap');
  if(!wrap) return;
  const n = parseInt(star.dataset.star);
  wrap.querySelectorAll('.cstar').forEach(s =>
    s.classList.toggle('hover', parseInt(s.dataset.star) <= n));
});
document.addEventListener('mouseout', e => {
  const star = e.target.closest('.cstar[data-star]');
  if(!star) return;
  const wrap = star.closest('.stars-wrap');
  if(!wrap || (e.relatedTarget && wrap.contains(e.relatedTarget))) return;
  wrap.querySelectorAll('.cstar').forEach(s => s.classList.remove('hover'));
});


export const grid = document.getElementById('grid');
export const countLabel = document.getElementById('countLabel');

let lastFilter='all', lastSearch='';

function gameLockState(id){
  const v = window.zzGameVisibility && window.zzGameVisibility[id];
  if(!v) return null;
  if(v.enabled_registered === false) return 'disabled';
  if(v.enabled_guest === false && !(window.zzIsLoggedIn && window.zzIsLoggedIn())) return 'guest-locked';
  return null;
}

window.zzCardClick = (id) => {
  const state = gameLockState(id);
  if(state === 'disabled') return;
  if(state === 'guest-locked'){ if(window.zzOpenAuth) window.zzOpenAuth(); return; }
  openGame(id);
};

// Spieltitel in der eingestellten Sprache (Englisch, falls vorhanden)
const gameTitle = g => (getLang() === 'en' && g.en) ? g.en : g.title;

function renderGrid(filter=lastFilter, search=lastSearch){
  lastFilter = filter; lastSearch = search;
  const list = GAMES.filter(g =>
    (filter==='all' || g.cat===filter || g.tag===filter) &&
    (g.title + ' ' + (g.en || '')).toLowerCase().includes(search.toLowerCase())
  );
  countLabel.textContent = t('count.games', list.length);
  const loggedIn = window.zzIsLoggedIn && window.zzIsLoggedIn();
  grid.innerHTML = list.map(g => {
    const lock = gameLockState(g.id);
    const lockBadge = lock === 'disabled' ? `<span class="tag locked">${t('game.disabled')}</span>`
      : lock === 'guest-locked' ? `<span class="tag locked">${t('game.login-required')}</span>` : '';
    const rData = ratingsMap[g.id];
    const avg = rData ? rData.avg : g.rating;
    const cnt = rData ? ` (${rData.count})` : '';
    const starsHtml = `<span class="stars">★ ${avg}${cnt}</span>`;
    const tagLabel = g.tag === 'hot' ? t('tag.hot') : t('tag.new');
    return `
    <div class="game-card${lock ? ' locked' : ''}" onclick="zzCardClick('${g.id}')">
      <div class="thumb" style="background:${thumbBg(g.id)}">
        ${lockBadge || (g.tag ? `<span class="tag ${g.tag}">${tagLabel}</span>` : '')}
        ${g.icon}
      </div>
      <div class="card-info">
        <h3>${gameTitle(g)}</h3>
        <div class="meta">${starsHtml} · ${t('card.plays', g.plays)}</div>
      </div>
    </div>
  `;
  }).join('');
}

window.addEventListener('zz:visibility-updated', () => renderGrid());
window.addEventListener('zz:auth-changed', () => loadRatings());
window.addEventListener('zz:lang-changed', () => renderGrid());

function thumbBg(id){
  const map = {
    domino:'linear-gradient(135deg,#14532D,#F8FAFC)',
    pumpdare:'linear-gradient(135deg,#EF4444,#1E1B4B)',
    conveyor:'linear-gradient(135deg,#374151,#F59E0B)',
    spacepatrol:'linear-gradient(135deg,#38BDF8,#05030C)',
    scale:'linear-gradient(135deg,#A8A29E,#1D1730)',
    beeflight:'linear-gradient(135deg,#FACC15,#86EFAC)',
    firefighter:'linear-gradient(135deg,#EF4444,#1E293B)',
    ultimatettt:'linear-gradient(135deg,#7C3AED,#C6FF3D)',
    numpyramid:'linear-gradient(135deg,#B45309,#1D1730)',
    flipper:'linear-gradient(135deg,#F472B6,#1E1B4B)',
    duckcross:'linear-gradient(135deg,#65A30D,#0284C7)',
    treasure:'linear-gradient(135deg,#FDE68A,#B45309)',
    laser:'linear-gradient(135deg,#EF4444,#0F0B1C)',
    penguinslide:'linear-gradient(135deg,#E0F2FE,#64748B)',
    garden:'linear-gradient(135deg,#4D7C0F,#8B5A2B)',
    lightracer:'linear-gradient(135deg,#38BDF8,#F472B6)',
    parachute:'linear-gradient(135deg,#60A5FA,#0369A1)',
    chainreaction:'linear-gradient(135deg,#A855F7,#0B0717)',
    pipes:'linear-gradient(135deg,#38BDF8,#1F2937)',
    wordsearch:'linear-gradient(135deg,#38BDF8,#1D1730)',
    fivedice:'linear-gradient(135deg,#F8FAFC,#7C3AED)',
    paintnumbers:'linear-gradient(135deg,#F472B6,#38BDF8)',
    pianoecho:'linear-gradient(135deg,#111827,#8B5CF6)',
    parking:'linear-gradient(135deg,#EF4444,#4B5563)',
    canthrow:'linear-gradient(135deg,#7C2D12,#FACC15)',
    quickdraw:'linear-gradient(135deg,#B45309,#166534)',
    tugofwar:'linear-gradient(135deg,#65A30D,#78350F)',
    maumau:'linear-gradient(135deg,#5B21B6,#DC2626)',
    numbersprint:'linear-gradient(135deg,#C6FF3D,#1D1730)',
    clockquiz:'linear-gradient(135deg,#7C3AED,#F8FAFC)',
    meteorshield:'linear-gradient(135deg,#1E3A8A,#05030C)',
    trainswitch:'linear-gradient(135deg,#57534E,#3F6212)',
    snake:'linear-gradient(135deg,#1F7A3D,#0E4A24)',
    twenty48:'linear-gradient(135deg,#C6841E,#7A4E0C)',
    memory:'linear-gradient(135deg,#6D28D9,#2E1065)',
    whack:'linear-gradient(135deg,#B45309,#5A2A05)',
    flappy:'linear-gradient(135deg,#2563EB,#1E3A8A)',
    ttt:'linear-gradient(135deg,#DB2777,#5B0F35)',
    billiard:'linear-gradient(135deg,#1B7A3A,#0A3D1F)',
    blackjack:'linear-gradient(135deg,#0F5132,#062919)',
    pong:'linear-gradient(135deg,#0EA5E9,#075985)',
    tanks:'linear-gradient(135deg,#7C5A3A,#1E1B4B)',
    basketball:'linear-gradient(135deg,#EA580C,#431407)',
    balloons:'linear-gradient(135deg,#38BDF8,#BE185D)',
    catcher:'linear-gradient(135deg,#65A30D,#1E3A8A)',
    cloudjump:'linear-gradient(135deg,#7DD3FC,#1E40AF)',
    dotsboxes:'linear-gradient(135deg,#C6FF3D,#3F6212)',
    fishing:'linear-gradient(135deg,#0EA5E9,#0C1E42)',
    flood:'linear-gradient(135deg,#F59E0B,#7C3AED)',
    muehle:'linear-gradient(135deg,#A57A4F,#3B2A1A)',
    numbermemory:'linear-gradient(135deg,#EC4899,#4C1D95)',
    stacker:'linear-gradient(135deg,#6366F1,#0F0B1C)',
    minigolf:'linear-gradient(135deg,#22C55E,#14532D)',
    rocketland:'linear-gradient(135deg,#334155,#05030C)',
    ski:'linear-gradient(135deg,#E0F2FE,#1E40AF)',
    towerdefense:'linear-gradient(135deg,#65A30D,#3F2A1A)',
    bowling:'linear-gradient(135deg,#E9C46A,#1F2937)',
    codebreaker:'linear-gradient(135deg,#A855F7,#1D1730)',
    timesrace:'linear-gradient(135deg,#FACC15,#1F2937)',
    breakout:'linear-gradient(135deg,#F97316,#7C2D12)',
    minesweeper:'linear-gradient(135deg,#64748B,#1E293B)',
    simon:'linear-gradient(135deg,#A855F7,#4C1D95)',
    connect4:'linear-gradient(135deg,#EF4444,#7F1D1D)',
    tetris:'linear-gradient(135deg,#8B5CF6,#3B0764)',
    reaction:'linear-gradient(135deg,#EAB308,#78350F)',
    rps:'linear-gradient(135deg,#14B8A6,#134E4A)',
    dice:'linear-gradient(135deg,#F43F5E,#4C0519)',
    hangman:'linear-gradient(135deg,#78716C,#292524)',
    mathblitz:'linear-gradient(135deg,#3B82F6,#1E3A8A)',
    stroop:'linear-gradient(135deg,#EC4899,#701A46)',
    runner:'linear-gradient(135deg,#22C55E,#14532D)',
    asteroids:'linear-gradient(135deg,#1E293B,#0F172A)',
    invaders:'linear-gradient(135deg,#16A34A,#052E16)',
    maze:'linear-gradient(135deg,#6366F1,#312E81)',
    bubble:'linear-gradient(135deg,#38BDF8,#0C4A6E)',
    sliding:'linear-gradient(135deg,#A78BFA,#4C1D95)',
    wordle:'linear-gradient(135deg,#22C55E,#166534)',
    traffic:'linear-gradient(135deg,#374151,#111827)',
    checkers:'linear-gradient(135deg,#4B5563,#111827)',
    reversi:'linear-gradient(135deg,#065F46,#022C22)',
    battleship:'linear-gradient(135deg,#1E3A8A,#0C1E42)',
    quiz:'linear-gradient(135deg,#7C2D12,#431407)',
    guessnumber:'linear-gradient(135deg,#4338CA,#1E1B4B)',
    fruitslice:'linear-gradient(135deg,#DB2777,#500724)',
    rhythm:'linear-gradient(135deg,#C026D3,#4A044E)',
    anagram:'linear-gradient(135deg,#0891B2,#083344)',
    lightsout:'linear-gradient(135deg,#CA8A04,#422006)',
    hanoi:'linear-gradient(135deg,#9333EA,#3B0764)',
    nim:'linear-gradient(135deg,#78350F,#292524)',
    sudoku:'linear-gradient(135deg,#0E7490,#164E63)',
    snakesladders:'linear-gradient(135deg,#15803D,#052E16)',
    darts:'linear-gradient(135deg,#B91C1C,#450A0A)',
    clicker:'linear-gradient(135deg,#D97706,#451A03)',
    airhockey:'linear-gradient(135deg,#0369A1,#082F49)',
    timingbar:'linear-gradient(135deg,#4D7C0F,#1A2E05)',
    match3:'linear-gradient(135deg,#BE185D,#500724)',
    typing:'linear-gradient(135deg,#334155,#0F172A)',
    slots:'linear-gradient(135deg,#B45309,#78350F)',
  };
  return map[id] || 'linear-gradient(135deg,#4C1D95,#1D1730)';
}

try{
  if(localStorage.getItem('zz_consent') === 'all'){
    fetch('/track.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: location.pathname, referrer: document.referrer })
    }).catch(() => {});
  }
}catch{}

loadRatings();
document.getElementById('gameCountStat').textContent = GAMES.length;

document.querySelectorAll('.chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');
    renderGrid(chip.dataset.filter, document.getElementById('searchInput').value);
  });
});
document.getElementById('searchInput').addEventListener('input', (e)=>{
  const activeFilter = document.querySelector('.chip.active').dataset.filter;
  renderGrid(activeFilter, e.target.value);
});

export const overlay = document.getElementById('overlay');
export const playerTitle = document.getElementById('playerTitle');
export const playerBody = document.getElementById('playerBody');
export const restartBtn = document.getElementById('restartBtn');
let currentCleanup = null;

function openGame(id){
  const g = GAMES.find(x=>x.id===id);
  playerTitle.textContent = g.icon + '  ' + gameTitle(g);
  overlay.classList.add('open');
  renderPlayerRating(id);
  loadGame(id);
}

function renderPlayerRating(gameId){
  const el = document.getElementById('playerRating');
  if(!el) return;
  const rData = ratingsMap[gameId];
  const avg = rData ? rData.avg : (GAMES.find(g=>g.id===gameId)?.rating || '–');
  const cnt = rData ? rData.count : 0;
  const ur  = userRatings[gameId] || 0;
  const loggedIn = window.zzIsLoggedIn && window.zzIsLoggedIn();

  if(loggedIn){
    el.innerHTML = [1,2,3,4,5].map(n =>
      `<span class="cstar${ur>=n?' on':''}" data-star="${n}" onclick="zzRateGame('${gameId}',${n})">★</span>`
    ).join('') + ` <span class="rating-val">${avg}</span><span class="rating-cnt">${cnt ? ` (${cnt})` : ''}</span>`;
    el.className = 'player-rating stars-wrap';
  } else {
    el.innerHTML = `<span class="stars">★ ${avg}${cnt ? ` (${cnt})` : ''}</span>`;
    el.className = 'player-rating';
  }
}

function closeGame(){
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  overlay.classList.remove('open');
  if(currentCleanup) currentCleanup();
  playerBody.innerHTML = '';
  playerBody.style.zoom = '';
}

const builders = {
  snake: () => import('./games/snake.js'),
  twenty48: () => import('./games/twenty48.js?v=20261122n'),
  memory: () => import('./games/memory.js'),
  whack: () => import('./games/whack.js'),
  flappy: () => import('./games/flappy.js'),
  ttt: () => import('./games/ttt.js'),
  billiard: () => import('./games/billiard.js?v=20261122l'),
  blackjack: () => import('./games/blackjack.js?v=20261122a'),
  pong: () => import('./games/pong.js'),
  breakout: () => import('./games/breakout.js'),
  minesweeper: () => import('./games/minesweeper.js'),
  simon: () => import('./games/simon.js'),
  connect4: () => import('./games/connect4.js'),
  tetris: () => import('./games/tetris.js'),
  reaction: () => import('./games/reaction.js'),
  rps: () => import('./games/rps.js?v=20261122a'),
  dice: () => import('./games/dice.js'),
  hangman: () => import('./games/hangman.js?v=20261122a'),
  mathblitz: () => import('./games/mathblitz.js'),
  stroop: () => import('./games/stroop.js'),
  runner: () => import('./games/runner.js'),
  asteroids: () => import('./games/asteroids.js'),
  invaders: () => import('./games/invaders.js'),
  maze: () => import('./games/maze.js'),
  bubble: () => import('./games/bubble.js'),
  sliding: () => import('./games/sliding.js'),
  wordle: () => import('./games/wordle.js'),
  traffic: () => import('./games/traffic.js'),
  checkers: () => import('./games/checkers.js'),
  reversi: () => import('./games/reversi.js'),
  battleship: () => import('./games/battleship.js'),
  quiz: () => import('./games/quiz.js'),
  guessnumber: () => import('./games/guessnumber.js?v=20261122a'),
  fruitslice: () => import('./games/fruitslice.js?v=20261122a'),
  rhythm: () => import('./games/rhythm.js'),
  anagram: () => import('./games/anagram.js'),
  lightsout: () => import('./games/lightsout.js'),
  hanoi: () => import('./games/hanoi.js'),
  nim: () => import('./games/nim.js'),
  sudoku: () => import('./games/sudoku.js'),
  snakesladders: () => import('./games/snakesladders.js'),
  darts: () => import('./games/darts.js'),
  clicker: () => import('./games/clicker.js'),
  airhockey: () => import('./games/airhockey.js?v=20261123h'),
  timingbar: () => import('./games/timingbar.js'),
  match3: () => import('./games/match3.js'),
  typing: () => import('./games/typing.js'),
  slots: () => import('./games/slots.js'),
  racer: () => import('./games/racer.js'),
  kartclash: () => import('./games/kartclash.js'),
  tanks: () => import('./games/tanks.js?v=20261122d'),
  basketball: () => import('./games/basketball.js?v=20261122s'),
  balloons: () => import('./games/balloons.js?v=20261122s'),
  catcher: () => import('./games/catcher.js?v=20261122s'),
  cloudjump: () => import('./games/cloudjump.js?v=20261122s'),
  dotsboxes: () => import('./games/dotsboxes.js?v=20261122s'),
  fishing: () => import('./games/fishing.js?v=20261122s'),
  flood: () => import('./games/flood.js?v=20261122s'),
  muehle: () => import('./games/muehle.js?v=20261122s'),
  numbermemory: () => import('./games/numbermemory.js?v=20261122s'),
  stacker: () => import('./games/stacker.js?v=20261122s'),
  minigolf: () => import('./games/minigolf.js?v=20261123a'),
  rocketland: () => import('./games/rocketland.js?v=20261122t'),
  ski: () => import('./games/ski.js?v=20261122t'),
  towerdefense: () => import('./games/towerdefense.js?v=20261122t'),
  bowling: () => import('./games/bowling.js?v=20261122t'),
  codebreaker: () => import('./games/codebreaker.js?v=20261122t'),
  timesrace: () => import('./games/timesrace.js?v=20261122t'),
  clockquiz: () => import('./games/clockquiz.js?v=20261123a'),
  meteorshield: () => import('./games/meteorshield.js?v=20261123a'),
  trainswitch: () => import('./games/trainswitch.js?v=20261123a'),
  wordsearch: () => import('./games/wordsearch.js?v=20261123b'),
  fivedice: () => import('./games/fivedice.js?v=20261123b'),
  paintnumbers: () => import('./games/paintnumbers.js?v=20261123b'),
  pianoecho: () => import('./games/pianoecho.js?v=20261123b'),
  parking: () => import('./games/parking.js?v=20261123b'),
  canthrow: () => import('./games/canthrow.js?v=20261123b'),
  quickdraw: () => import('./games/quickdraw.js?v=20261123b'),
  tugofwar: () => import('./games/tugofwar.js?v=20261123b'),
  maumau: () => import('./games/maumau.js?v=20261123b'),
  numbersprint: () => import('./games/numbersprint.js?v=20261123b'),
  flipper: () => import('./games/flipper.js?v=20261123c'),
  duckcross: () => import('./games/duckcross.js?v=20261123c'),
  treasure: () => import('./games/treasure.js?v=20261123c'),
  laser: () => import('./games/laser.js?v=20261123c'),
  penguinslide: () => import('./games/penguinslide.js?v=20261123c'),
  garden: () => import('./games/garden.js?v=20261123c'),
  lightracer: () => import('./games/lightracer.js?v=20261123c'),
  parachute: () => import('./games/parachute.js?v=20261123c'),
  chainreaction: () => import('./games/chainreaction.js?v=20261123c'),
  pipes: () => import('./games/pipes.js?v=20261123c'),
  domino: () => import('./games/domino.js?v=20261123d'),
  pumpdare: () => import('./games/pumpdare.js?v=20261123d'),
  conveyor: () => import('./games/conveyor.js?v=20261123d'),
  spacepatrol: () => import('./games/spacepatrol.js?v=20261123d'),
  scale: () => import('./games/scale.js?v=20261123d'),
  beeflight: () => import('./games/beeflight.js?v=20261123d'),
  firefighter: () => import('./games/firefighter.js?v=20261123d'),
  ultimatettt: () => import('./games/ultimatettt.js?v=20261123d'),
  numpyramid: () => import('./games/numpyramid.js?v=20261123d')
};

async function loadGame(id){
  if(currentCleanup) currentCleanup();
  playerBody.innerHTML = '';
  playerBody.style.zoom = '';
  window.__restartCurrent = null;
  const mod = await builders[id]();
  currentCleanup = mod.build();
  requestAnimationFrame(fitGame);
  setTimeout(fitGame, 200);
}

// ===== GRÖSSERER SPIEL-BILDSCHIRM =====
// Macht das Spiel so groß, wie es auf den Bildschirm passt.
//  - Spiele mit Canvas (Pong, Snake, Panzer-Duell …): das Canvas wird größer angezeigt.
//    Die Spiele rechnen intern weiter mit ihrer normalen Größe (z. B. 400×280),
//    Mausklicks rechnen sie selbst um.
//  - Spiele ohne Canvas (Tic-Tac-Toe, Dame, Memory …): alles wird mit CSS-"zoom" vergrößert.
const MAX_ZOOM = 3;       // Canvas höchstens 3× so groß
const MAX_DOM_ZOOM = 2.2; // Brettspiele höchstens 2,2× so groß
function fitSpace(){
  const ocs = getComputedStyle(overlay);
  const boxW = overlay.clientWidth  - parseFloat(ocs.paddingLeft) - parseFloat(ocs.paddingRight);
  const boxH = overlay.clientHeight - parseFloat(ocs.paddingTop)  - parseFloat(ocs.paddingBottom);
  const topH = overlay.querySelector('.player-top').offsetHeight;
  return { boxW, boxH: boxH - topH - 2 };
}
function fitGame(){
  if(!overlay.classList.contains('open')) return;
  if(window.matchMedia('(max-width: 600px)').matches){   // Handy: CSS macht volle Breite, nur scharf machen
    playerBody.style.zoom = '';
    playerBody.querySelectorAll('canvas').forEach(c => { const w = c.getBoundingClientRect().width; if(c.width && w) makeHD(c, w / c.width); });
    return;
  }
  const { boxW, boxH } = fitSpace();
  const bcs = getComputedStyle(playerBody);
  const padX = parseFloat(bcs.paddingLeft) + parseFloat(bcs.paddingRight) + 4;

  // Canvas suchen: eigene Größe (Spiel-Pixel) oder "width:100%" (z. B. Billard). Fremde Bibliotheken (three.js) nicht anfassen.
  const canvases = [...playerBody.querySelectorAll('canvas')]
    .filter(c => c.width > 0 && c.height > 0 && (!c.style.width || c.dataset.zzfit || c.style.width === '100%'));
  if(canvases.length){
    playerBody.style.zoom = '';
    const c = canvases.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
    const otherH = playerBody.scrollHeight - c.getBoundingClientRect().height;   // HUD, Knöpfe, Hinweise
    const scale = Math.max(0.5, Math.min((boxW - padX) / c.width, (boxH - otherH - 4) / c.height, MAX_ZOOM));
    const w = Math.floor(c.width * scale), h = Math.floor(c.height * scale);
    const wrap = c.closest('.canvas-wrap') || c.parentElement;
    if(c.style.width === '100%' && !c.dataset.zzfit){
      // Spiel will 100% Breite seines Rahmens: dann den Rahmen passend breit machen
      if(wrap){ wrap.style.maxWidth = w + 'px'; wrap.style.width = w + 'px'; }
      makeHD(c, scale);
      return;
    }
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    c.dataset.zzfit = '1';
    makeHD(c, scale);   // gestochen scharf statt verschwommen
    // Manche Spiele begrenzen ihren Rahmen (z. B. max. 340px) – der muss mitwachsen
    if(wrap && wrap.style.maxWidth){ wrap.style.maxWidth = 'none'; wrap.style.width = 'auto'; }
    return;
  }

  // Kein Canvas: ganzes Spiel mit zoom vergrößern.
  if(playerBody.querySelector('[data-zz-nozoom]')) return;
  playerBody.style.zoom = '';                     // kurz ohne zoom messen (passiert im selben Bild, flackert nicht)
  let natW = 0;
  [...playerBody.children].forEach(el => { natW = Math.max(natW, el.getBoundingClientRect().width); });
  if(!natW) return;
  const natH = playerBody.scrollHeight;
  const scale = Math.min(boxW / (natW + padX), boxH / natH, MAX_DOM_ZOOM);
  playerBody.style.zoom = scale > 1.05 ? scale.toFixed(3) : '';
}
let fitQueued = false;
function queueFit(){ if(fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; fitGame(); }); }
window.addEventListener('resize', queueFit);
document.addEventListener('fullscreenchange', () => { renderFsBtn(); setTimeout(fitGame, 50); });
// Wenn ein Spiel sein Canvas austauscht oder die Größe ändert, neu anpassen
new MutationObserver(queueFit).observe(playerBody, { childList:true, subtree:true, attributes:true, attributeFilter:['width','height'] });

// Vollbild-Knopf
const fsBtn = document.getElementById('fullscreenBtn');
function renderFsBtn(){
  if(!fsBtn) return;
  const on = document.fullscreenElement === overlay;
  fsBtn.textContent = on ? '🗗' : '⛶';
  fsBtn.title = on ? t('game.fullscreen.exit') : t('game.fullscreen');
}
if(fsBtn){
  if(!document.fullscreenEnabled) fsBtn.hidden = true;   // z. B. iPhone kann das nicht
  fsBtn.onclick = () => {
    if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    else overlay.requestFullscreen?.().catch(()=>{});
  };
  renderFsBtn();
}

window.openGame = openGame;
window.closeGame = closeGame;
restartBtn.onclick = ()=>{ if(window.__restartCurrent) window.__restartCurrent(); };

export function hud(...items){
  const div = document.createElement('div');
  div.className = 'player-hud';
  div.innerHTML = items.map(([label,id])=>`<div>${label}: <b id="${id}">0</b></div>`).join('');
  return div;
}

export function overMsg(wrap, text, onRestart){
  const m = document.createElement('div');
  m.className = 'game-overmsg';
  m.innerHTML = `<div style="font-size:20px; font-weight:700;">${text}</div><button>${t('game.play-again')}</button>`;
  m.querySelector('button').onclick = ()=>{ m.classList.remove('show'); onRestart(); };
  wrap.appendChild(m);
  return m;
}

export function mkButton(label, bg, color){
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = `background:${bg||'var(--lime)'};color:${color||'#14101F'};border:none;font-weight:700;font-family:Fredoka;padding:10px 20px;border-radius:10px;cursor:pointer;`;
  return b;
}

export function addLeaderboardUI(gameId, gameTitle){
  const btn = mkButton(t('leaderboard.btn'), 'var(--card)', '#fff');
  const panel = document.createElement('div');
  panel.className = 'hs-panel';
  panel.style.display = 'none';
  btn.onclick = ()=>{
    const showing = panel.style.display !== 'none';
    panel.style.display = showing ? 'none' : 'block';
    if(!showing && window.zzShowLeaderboard) window.zzShowLeaderboard(gameId, gameTitle, panel);
  };
  playerBody.append(btn, panel);
}

export function mkHint(text){
  const d = document.createElement('div');
  d.className='hint';
  d.textContent = text;
  return d;
}

// Window globals for game files — prevents duplicate module instances
// (game files import '../core.js' without version; index.html uses core.js?v=...)
window.zzPlayerBody = playerBody;
window.zzOverMsg = overMsg;
window.zzHud = hud;
window.zzMkButton = mkButton;
window.zzMkHint = mkHint;
window.zzAddLeaderboardUI = addLeaderboardUI;
