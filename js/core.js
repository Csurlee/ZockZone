// ZockZone core: catalog, loader, shared UI helpers.
const GAMES = [
  {id:'snake', title:'Snake Reloaded', icon:'🐍', cat:'arcade', tag:'hot', rating:'4.8', plays:'1.2k'},
  {id:'twenty48', title:'2048 Fusion', icon:'🔢', cat:'puzzle', tag:'', rating:'4.7', plays:'980'},
  {id:'memory', title:'Memory Match', icon:'🃏', cat:'puzzle', tag:'', rating:'4.6', plays:'760'},
  {id:'whack', title:'Whack-a-Mole', icon:'🔨', cat:'reflex', tag:'new', rating:'4.5', plays:'640'},
  {id:'flappy', title:'Flappy Block', icon:'🟨', cat:'arcade', tag:'hot', rating:'4.9', plays:'2.1k'},
  {id:'ttt', title:'Tic-Tac-Toe Duell', icon:'❌', cat:'2player', tag:'', rating:'4.4', plays:'510'},
  {id:'blackjack', title:'Blackjack 21', icon:'🂡', cat:'puzzle', tag:'new', rating:'4.7', plays:'890'},
  {id:'pong', title:'Pong Duell', icon:'🏓', cat:'arcade', tag:'', rating:'4.5', plays:'430'},
  {id:'breakout', title:'Breakout', icon:'🧱', cat:'arcade', tag:'', rating:'4.6', plays:'610'},
  {id:'minesweeper', title:'Minesweeper', icon:'💣', cat:'puzzle', tag:'new', rating:'4.7', plays:'720'},
  {id:'simon', title:'Simon Merk-Spiel', icon:'🎵', cat:'reflex', tag:'', rating:'4.4', plays:'390'},
  {id:'connect4', title:'Vier Gewinnt', icon:'🔴', cat:'2player', tag:'', rating:'4.8', plays:'880'},
  {id:'tetris', title:'Tetris Mini', icon:'🟪', cat:'arcade', tag:'hot', rating:'4.9', plays:'1.5k'},
  {id:'reaction', title:'Reaktionstest', icon:'⚡', cat:'reflex', tag:'', rating:'4.3', plays:'340'},
  {id:'rps', title:'Schere Stein Papier', icon:'✊', cat:'reflex', tag:'', rating:'4.2', plays:'510'},
  {id:'dice', title:'Würfelduell', icon:'🎲', cat:'puzzle', tag:'', rating:'4.1', plays:'280'},
  {id:'hangman', title:'Galgenmännchen', icon:'🪢', cat:'puzzle', tag:'', rating:'4.5', plays:'460'},
  {id:'mathblitz', title:'Kopfrechnen Blitz', icon:'➕', cat:'puzzle', tag:'', rating:'4.4', plays:'370'},
  {id:'stroop', title:'Farb-Reflex', icon:'🌈', cat:'reflex', tag:'new', rating:'4.3', plays:'250'},
  {id:'runner', title:'Runner Jump', icon:'🏃', cat:'arcade', tag:'', rating:'4.6', plays:'690'},
  {id:'asteroids', title:'Asteroids', icon:'☄️', cat:'arcade', tag:'', rating:'4.7', plays:'800'},
  {id:'invaders', title:'Space Invaders', icon:'👾', cat:'arcade', tag:'hot', rating:'4.8', plays:'1.1k'},
  {id:'maze', title:'Labyrinth', icon:'🧩', cat:'arcade', tag:'', rating:'4.5', plays:'420'},
  {id:'bubble', title:'Bubble Pop', icon:'🫧', cat:'arcade', tag:'', rating:'4.4', plays:'560'},
  {id:'sliding', title:'Schiebepuzzle', icon:'🔢', cat:'puzzle', tag:'', rating:'4.2', plays:'310'},
  {id:'wordle', title:'Wortraten', icon:'🔤', cat:'puzzle', tag:'new', rating:'4.6', plays:'640'},
  {id:'traffic', title:'Verkehr Ausweichen', icon:'🚗', cat:'arcade', tag:'', rating:'4.3', plays:'450'},
  {id:'checkers', title:'Dame', icon:'⚫', cat:'2player', tag:'', rating:'4.5', plays:'380'},
  {id:'reversi', title:'Reversi', icon:'⚪', cat:'2player', tag:'', rating:'4.4', plays:'340'},
  {id:'battleship', title:'Schiffe versenken', icon:'🚢', cat:'puzzle', tag:'new', rating:'4.6', plays:'520'},
  {id:'quiz', title:'Allgemeinwissen-Quiz', icon:'❓', cat:'puzzle', tag:'', rating:'4.3', plays:'610'},
  {id:'guessnumber', title:'Zahl erraten', icon:'🔢', cat:'puzzle', tag:'', rating:'4.1', plays:'290'},
  {id:'fruitslice', title:'Frucht-Slice', icon:'🍉', cat:'arcade', tag:'hot', rating:'4.7', plays:'900'},
  {id:'rhythm', title:'Rhythmus-Tipper', icon:'🎵', cat:'reflex', tag:'', rating:'4.2', plays:'260'},
  {id:'anagram', title:'Buchstabensalat', icon:'🔤', cat:'puzzle', tag:'', rating:'4.4', plays:'350'},
  {id:'lightsout', title:'Licht aus', icon:'💡', cat:'puzzle', tag:'', rating:'4.3', plays:'270'},
  {id:'hanoi', title:'Türme von Hanoi', icon:'🗼', cat:'puzzle', tag:'', rating:'4.5', plays:'310'},
  {id:'nim', title:'Nim', icon:'🪵', cat:'2player', tag:'', rating:'4.0', plays:'180'},
  {id:'sudoku', title:'Mini-Sudoku', icon:'🧮', cat:'puzzle', tag:'new', rating:'4.6', plays:'480'},
  {id:'snakesladders', title:'Leiterspiel', icon:'🪜', cat:'2player', tag:'', rating:'4.2', plays:'330'},
  {id:'darts', title:'Darts', icon:'🎯', cat:'reflex', tag:'', rating:'4.5', plays:'470'},
  {id:'clicker', title:'Klicker-Fabrik', icon:'🪙', cat:'puzzle', tag:'', rating:'4.0', plays:'560'},
  {id:'airhockey', title:'Air Hockey', icon:'🏒', cat:'arcade', tag:'', rating:'4.6', plays:'640'},
  {id:'timingbar', title:'Stopp die Leiste', icon:'⏱️', cat:'reflex', tag:'', rating:'4.1', plays:'220'},
  {id:'match3', title:'Edelstein-Tausch', icon:'💎', cat:'puzzle', tag:'', rating:'4.5', plays:'710'},
  {id:'typing', title:'Tipp-Test', icon:'⌨️', cat:'reflex', tag:'', rating:'4.3', plays:'300'},
  {id:'slots', title:'Einarmiger Bandit', icon:'🎰', cat:'arcade', tag:'', rating:'4.2', plays:'400'},
];

export const grid = document.getElementById('grid');
export const countLabel = document.getElementById('countLabel');

let lastFilter='all', lastSearch='';

function renderStars(rating){
  const num = parseFloat(rating);
  const full = Math.floor(num);
  const half = (num - full) >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '<span class="star filled">' + '★'.repeat(full) + '</span>'
       + (half ? '<span class="star half">½</span>' : '')
       + '<span class="star empty">' + '☆'.repeat(empty) + '</span>';
}

function gameLockState(id){
  const v = window.zzGameVisibility && window.zzGameVisibility[id];
  if(!v) return null; // no visibility data yet/at all -> treat as fully enabled
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
  countLabel.textContent = list.length + ' Spiele';
  grid.innerHTML = list.map(g => {
    const lock = gameLockState(g.id);
    const lockBadge = lock === 'disabled' ? '<span class="tag locked">Vorübergehend deaktiviert</span>'
      : lock === 'guest-locked' ? '<span class="tag locked">🔒 Login erforderlich</span>' : '';
    return `
    <div class="game-card${lock ? ' locked' : ''}" onclick="zzCardClick('${g.id}')">
      <div class="thumb" style="background:${thumbBg(g.id)}">
        ${lockBadge || (g.tag ? `<span class="tag ${g.tag}">${g.tag==='hot'?'HOT':'NEU'}</span>` : '')}
        ${g.icon}
      </div>
      <div class="card-info">
        <h3>${g.title}</h3>
        <div class="meta"><span class="stars">${renderStars(g.rating)} ${g.rating}</span> · ${g.plays} Spiele heute</div>
      </div>
    </div>
  `;
  }).join('');
}

window.addEventListener('zz:visibility-updated', () => renderGrid());
window.addEventListener('zz:auth-changed', () => renderGrid());

function thumbBg(id){
  const map = {
    snake:'linear-gradient(135deg,#1F7A3D,#0E4A24)',
    twenty48:'linear-gradient(135deg,#C6841E,#7A4E0C)',
    memory:'linear-gradient(135deg,#6D28D9,#2E1065)',
    whack:'linear-gradient(135deg,#B45309,#5A2A05)',
    flappy:'linear-gradient(135deg,#2563EB,#1E3A8A)',
    ttt:'linear-gradient(135deg,#DB2777,#5B0F35)',
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

renderGrid();
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
  loadGame(id);
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
  slots: () => import('./games/slots.js')
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
  m.innerHTML = `<div style="font-size:20px; font-weight:700;">${text}</div><button>Nochmal spielen</button>`;
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
  const btn = mkButton('🏆 Bestenliste', 'var(--card)', '#fff');
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
