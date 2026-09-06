import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { t } from './i18n.js';
import { GAMES } from './games-list.js?v=20260906k';

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

function renderGrid(filter=lastFilter, search=lastSearch){
  lastFilter = filter; lastSearch = search;
  const list = GAMES.filter(g =>
    (filter==='all' || g.cat===filter || g.tag===filter) &&
    g.title.toLowerCase().includes(search.toLowerCase())
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
        <h3>${g.title}</h3>
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
    snake:'linear-gradient(135deg,#1F7A3D,#0E4A24)',
    twenty48:'linear-gradient(135deg,#C6841E,#7A4E0C)',
    memory:'linear-gradient(135deg,#6D28D9,#2E1065)',
    whack:'linear-gradient(135deg,#B45309,#5A2A05)',
    flappy:'linear-gradient(135deg,#2563EB,#1E3A8A)',
    ttt:'linear-gradient(135deg,#DB2777,#5B0F35)',
    billiard:'linear-gradient(135deg,#1B7A3A,#0A3D1F)',
    blackjack:'linear-gradient(135deg,#0F5132,#062919)',
    pong:'linear-gradient(135deg,#0EA5E9,#075985)',
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
  playerTitle.textContent = g.icon + '  ' + g.title;
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
  overlay.classList.remove('open');
  if(currentCleanup) currentCleanup();
  playerBody.innerHTML = '';
}

const builders = {
  snake: () => import('./games/snake.js'),
  twenty48: () => import('./games/twenty48.js'),
  memory: () => import('./games/memory.js'),
  whack: () => import('./games/whack.js'),
  flappy: () => import('./games/flappy.js'),
  ttt: () => import('./games/ttt.js'),
  billiard: () => import('./games/billiard.js?v=20260906k'),
  blackjack: () => import('./games/blackjack.js'),
  pong: () => import('./games/pong.js'),
  breakout: () => import('./games/breakout.js'),
  minesweeper: () => import('./games/minesweeper.js'),
  simon: () => import('./games/simon.js'),
  connect4: () => import('./games/connect4.js'),
  tetris: () => import('./games/tetris.js'),
  reaction: () => import('./games/reaction.js'),
  rps: () => import('./games/rps.js'),
  dice: () => import('./games/dice.js'),
  hangman: () => import('./games/hangman.js'),
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
  guessnumber: () => import('./games/guessnumber.js'),
  fruitslice: () => import('./games/fruitslice.js'),
  rhythm: () => import('./games/rhythm.js'),
  anagram: () => import('./games/anagram.js'),
  lightsout: () => import('./games/lightsout.js'),
  hanoi: () => import('./games/hanoi.js'),
  nim: () => import('./games/nim.js'),
  sudoku: () => import('./games/sudoku.js'),
  snakesladders: () => import('./games/snakesladders.js'),
  darts: () => import('./games/darts.js'),
  clicker: () => import('./games/clicker.js'),
  airhockey: () => import('./games/airhockey.js'),
  timingbar: () => import('./games/timingbar.js'),
  match3: () => import('./games/match3.js'),
  typing: () => import('./games/typing.js'),
  slots: () => import('./games/slots.js'),
  racer: () => import('./games/racer.js'),
  kartclash: () => import('./games/kartclash.js')
};

async function loadGame(id){
  if(currentCleanup) currentCleanup();
  playerBody.innerHTML = '';
  window.__restartCurrent = null;
  const mod = await builders[id]();
  currentCleanup = mod.build();
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
