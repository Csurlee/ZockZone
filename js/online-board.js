// ===== ONLINE-BRETTSPIELE =====
// Tic-Tac-Toe, Vier Gewinnt, Dame und Reversi online gegen Freunde.
//
// So funktioniert es:
//  - Spieler 0 = Host (hat den Raum erstellt), Spieler 1 = Gast.
//  - Wer dran ist, klickt aufs Brett. Der neue Spielstand wird per
//    Supabase-Broadcast an den anderen geschickt ("state"-Nachricht).
//  - Jeder Stand hat eine laufende Nummer (seq). Ältere Stände werden ignoriert.
//  - Der Gast fragt beim Start mit "hello" nach dem aktuellen Stand.

// ---------- Hilfsfunktionen ----------
const inside8 = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const copy = o => JSON.parse(JSON.stringify(o));

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function disc(ctx, x, y, rad, fill, stroke) {
  ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke(); }
}

// ---------- Die Spielregeln ----------
// Jedes Spiel hat:
//  size        Breite/Höhe des Canvas
//  marks       Name/Farbe für Spieler 0 und 1
//  init(start) neuer Spielstand, "start" = wer beginnt (0/1)
//  draw(ctx, s, me, ui)       Brett malen
//  click(s, x, y, me, ui)     Klick verarbeiten -> neuer Stand oder null
const GAMES = {

  // ===== TIC-TAC-TOE =====
  ttt: {
    size: [300, 300],
    marks: [{ name: 'X', color: '#C6FF3D' }, { name: 'O', color: '#FF6B4A' }],
    LINES: [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]],
    init(start) { return { board: Array(9).fill(null), turn: start, winner: null, line: null }; },
    draw(ctx, s) {
      ctx.fillStyle = '#0F0B1C'; ctx.fillRect(0, 0, 300, 300);
      for (let i = 0; i < 9; i++) {
        const x = (i % 3) * 100, y = Math.floor(i / 3) * 100;
        ctx.fillStyle = '#241D3B'; roundRect(ctx, x + 5, y + 5, 90, 90, 10); ctx.fill();
        const v = s.board[i];
        if (v !== null) {
          ctx.fillStyle = this.marks[v].color;
          ctx.font = 'bold 56px Fredoka, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(this.marks[v].name, x + 50, y + 54);
        }
      }
      if (s.line) {
        const p = i => [(i % 3) * 100 + 50, Math.floor(i / 3) * 100 + 50];
        const [a, b] = [p(s.line[0]), p(s.line[2])];
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
      }
    },
    click(s, x, y, me) {
      const i = Math.floor(y / 100) * 3 + Math.floor(x / 100);
      if (i < 0 || i > 8 || s.board[i] !== null) return null;
      const n = copy(s);
      n.board[i] = me;
      const line = this.LINES.find(([a, b, c]) => n.board[a] !== null && n.board[a] === n.board[b] && n.board[a] === n.board[c]);
      if (line) { n.winner = me; n.line = line; }
      else if (n.board.every(v => v !== null)) n.winner = 'draw';
      else n.turn = 1 - me;
      return n;
    },
  },

  // ===== VIER GEWINNT =====
  connect4: {
    size: [364, 316],
    marks: [{ name: '🔴', color: '#EF4444' }, { name: '🟡', color: '#FACC15' }],
    init(start) { return { board: Array.from({ length: 6 }, () => Array(7).fill(null)), turn: start, winner: null, last: null }; },
    draw(ctx, s) {
      ctx.fillStyle = '#1D3A8A'; roundRect(ctx, 0, 0, 364, 316, 14); ctx.fill();
      for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
        const v = s.board[r][c];
        const isLast = s.last && s.last[0] === r && s.last[1] === c;
        disc(ctx, 26 + c * 52, 28 + r * 52, 21, v === null ? '#0F172A' : this.marks[v].color, isLast ? '#fff' : null);
      }
    },
    click(s, x, y, me) {
      const c = Math.floor(x / 52);
      if (c < 0 || c > 6) return null;
      for (let r = 5; r >= 0; r--) {
        if (s.board[r][c] === null) {
          const n = copy(s);
          n.board[r][c] = me; n.last = [r, c];
          if (this.wins(n.board, r, c, me)) n.winner = me;
          else if (n.board.every(row => row.every(v => v !== null))) n.winner = 'draw';
          else n.turn = 1 - me;
          return n;
        }
      }
      return null; // Spalte voll
    },
    wins(b, r, c, p) {
      return [[0,1],[1,0],[1,1],[1,-1]].some(([dr, dc]) => {
        let n = 1;
        for (const sign of [1, -1]) for (let k = 1; k < 4; k++) {
          const rr = r + dr * k * sign, cc = c + dc * k * sign;
          if (rr >= 0 && rr < 6 && cc >= 0 && cc < 7 && b[rr][cc] === p) n++; else break;
        }
        return n >= 4;
      });
    },
  },

  // ===== DAME =====
  // Spieler 0 = Rot (startet oben), Spieler 1 = Blau (startet unten).
  // Regeln wie im lokalen Spiel: Schlagen ist Pflicht (Einzelsprung), Dame am Ende.
  // Neu: Wer keinen Zug mehr hat, verliert (sonst würde das Spiel hängen).
  checkers: {
    size: [320, 320],
    marks: [{ name: 'Rot', color: '#DC2626' }, { name: 'Blau', color: '#2563EB' }],
    init(start) {
      const b = Array.from({ length: 8 }, () => Array(8).fill(null));
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1 && r < 3) b[r][c] = { p: 0, k: false };
        if ((r + c) % 2 === 1 && r > 4) b[r][c] = { p: 1, k: false };
      }
      return { board: b, turn: start, winner: null };
    },
    movesFor(b, r, c) {
      const pc = b[r][c]; if (!pc) return [];
      const dirs = pc.k ? [[-1,-1],[-1,1],[1,-1],[1,1]] : (pc.p === 0 ? [[1,-1],[1,1]] : [[-1,-1],[-1,1]]);
      const out = [];
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc, jr = r + 2 * dr, jc = c + 2 * dc;
        if (inside8(nr, nc) && !b[nr][nc]) out.push({ r: nr, c: nc, cap: null });
        if (inside8(jr, jc) && !b[jr][jc] && b[nr][nc] && b[nr][nc].p !== pc.p) out.push({ r: jr, c: jc, cap: [nr, nc] });
      }
      return out;
    },
    allMoves(b, p) {
      const list = [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
        if (b[r][c] && b[r][c].p === p) this.movesFor(b, r, c).forEach(m => list.push({ fr: r, fc: c, ...m }));
      return list.some(m => m.cap) ? list.filter(m => m.cap) : list; // Schlagpflicht
    },
    // Blau sieht das Brett umgedreht, damit die eigenen Steine immer unten sind.
    view(me, r, c) { return me === 1 ? [r, c] : [7 - r, 7 - c]; },
    draw(ctx, s, me, ui) {
      const legal = s.winner === null && s.turn === me ? this.allMoves(s.board, me) : [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const [vr, vc] = this.view(me, r, c);
        const x = vc * 40, y = vr * 40;
        ctx.fillStyle = (r + c) % 2 === 1 ? '#3a2f5c' : '#1D1730';
        ctx.fillRect(x, y, 40, 40);
        if (ui.sel && legal.some(m => m.fr === ui.sel[0] && m.fc === ui.sel[1] && m.r === r && m.c === c)) {
          disc(ctx, x + 20, y + 20, 7, '#C6FF3D');
        }
        const pc = s.board[r][c];
        if (pc) {
          const selected = ui.sel && ui.sel[0] === r && ui.sel[1] === c;
          const canMove = legal.some(m => m.fr === r && m.fc === c);
          disc(ctx, x + 20, y + 20, 15, this.marks[pc.p].color, selected ? '#C6FF3D' : canMove ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.15)');
          if (pc.k) {
            ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('♛', x + 20, y + 21);
          }
        }
      }
    },
    click(s, x, y, me, ui) {
      const [r, c] = this.view(me, Math.floor(y / 40), Math.floor(x / 40));
      if (!inside8(r, c)) return null;
      const legal = this.allMoves(s.board, me);
      const pc = s.board[r][c];
      if (pc && pc.p === me) { // eigenen Stein auswählen
        ui.sel = legal.some(m => m.fr === r && m.fc === c) ? [r, c] : null;
        return null;
      }
      if (!ui.sel) return null;
      const mv = legal.find(m => m.fr === ui.sel[0] && m.fc === ui.sel[1] && m.r === r && m.c === c);
      ui.sel = null;
      if (!mv) return null;
      const n = copy(s);
      const b = n.board;
      b[r][c] = b[mv.fr][mv.fc]; b[mv.fr][mv.fc] = null;
      if (mv.cap) b[mv.cap[0]][mv.cap[1]] = null;
      if ((b[r][c].p === 0 && r === 7) || (b[r][c].p === 1 && r === 0)) b[r][c].k = true;
      const opp = 1 - me;
      if (!this.allMoves(b, opp).length) n.winner = me; // Gegner hat keine Steine/Züge mehr
      else n.turn = opp;
      return n;
    },
    count(s) {
      const n = [0, 0];
      s.board.forEach(row => row.forEach(pc => { if (pc) n[pc.p]++; }));
      return n;
    },
  },

  // ===== REVERSI =====
  // Spieler 0 = Schwarz, Spieler 1 = Weiß.
  reversi: {
    size: [320, 320],
    marks: [{ name: 'Schwarz', color: '#111' }, { name: 'Weiß', color: '#fff' }],
    DIRS: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
    init(start) {
      const b = Array.from({ length: 8 }, () => Array(8).fill(null));
      b[3][3] = 1; b[3][4] = 0; b[4][3] = 0; b[4][4] = 1;
      return { board: b, turn: start, winner: null, passed: false };
    },
    flips(b, r, c, p) {
      if (b[r][c] !== null) return [];
      let all = [];
      for (const [dr, dc] of this.DIRS) {
        let nr = r + dr, nc = c + dc; const line = [];
        while (inside8(nr, nc) && b[nr][nc] === 1 - p) { line.push([nr, nc]); nr += dr; nc += dc; }
        if (line.length && inside8(nr, nc) && b[nr][nc] === p) all = all.concat(line);
      }
      return all;
    },
    hasMove(b, p) {
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (this.flips(b, r, c, p).length) return true;
      return false;
    },
    draw(ctx, s, me) {
      ctx.fillStyle = '#0F5132'; ctx.fillRect(0, 0, 320, 320);
      const myTurn = s.winner === null && s.turn === me;
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const x = c * 40, y = r * 40;
        const hint = myTurn && this.flips(s.board, r, c, me).length;
        ctx.fillStyle = hint ? '#22C55E' : '#16A34A';
        roundRect(ctx, x + 1, y + 1, 38, 38, 4); ctx.fill();
        const v = s.board[r][c];
        if (v !== null) disc(ctx, x + 20, y + 20, 15, this.marks[v].color);
      }
    },
    click(s, x, y, me) {
      const r = Math.floor(y / 40), c = Math.floor(x / 40);
      if (!inside8(r, c)) return null;
      const f = this.flips(s.board, r, c, me);
      if (!f.length) return null;
      const n = copy(s);
      n.board[r][c] = me;
      f.forEach(([fr, fc]) => { n.board[fr][fc] = me; });
      n.passed = false;
      if (this.hasMove(n.board, 1 - me)) n.turn = 1 - me;
      else if (this.hasMove(n.board, me)) n.passed = true; // Gegner muss aussetzen
      else {
        const [a, b] = this.count(n);
        n.winner = a > b ? 0 : b > a ? 1 : 'draw';
      }
      return n;
    },
    count(s) {
      const n = [0, 0];
      s.board.forEach(row => row.forEach(v => { if (v !== null) n[v]++; }));
      return n;
    },
  },

  // ===== NIM =====
  // Nimm 1, 2 oder 3 Stäbchen. Wer das LETZTE Stäbchen nimmt, verliert.
  nim: {
    size: [360, 220],
    marks: [{ name: 'Blau', color: '#38BDF8' }, { name: 'Pink', color: '#F472B6' }],
    init(start) { return { sticks: 15 + Math.floor(Math.random() * 6), turn: start, winner: null, last: null }; },
    draw(ctx, s, me) {
      ctx.fillStyle = '#1D1730'; ctx.fillRect(0, 0, 360, 220);
      const n = s.sticks, gap = Math.min(16, 320 / Math.max(1, n));
      for (let i = 0; i < n; i++) {
        const x = 180 - (n - 1) * gap / 2 + i * gap;
        ctx.fillStyle = '#D6B98C'; ctx.fillRect(x - 3, 30, 6, 90);
        ctx.fillStyle = '#EF4444'; ctx.beginPath(); ctx.arc(x, 30, 5, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#F3EEFF'; ctx.font = 'bold 14px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${n} Stäbchen übrig` + (s.last ? ` · zuletzt ${s.last.n} genommen` : ''), 180, 140);
      const myTurn = s.winner === null && s.turn === me;
      [1, 2, 3].forEach((k, i) => {
        const x = 60 + i * 90, ok = myTurn && k <= n;
        ctx.fillStyle = ok ? this.marks[me].color : '#3A2F63'; roundRect(ctx, x, 160, 70, 44, 10); ctx.fill();
        ctx.fillStyle = ok ? '#14101F' : '#8B83A8'; ctx.font = 'bold 18px Fredoka, sans-serif'; ctx.fillText('Nimm ' + k, x + 35, 182);
      });
    },
    click(s, x, y, me) {
      if (y < 160 || y > 204) return null;
      const k = [1, 2, 3].find((v, i) => x >= 60 + i * 90 && x <= 130 + i * 90);
      if (!k || k > s.sticks) return null;
      const n = copy(s);
      n.sticks -= k; n.last = { p: me, n: k };
      if (n.sticks <= 0) n.winner = 1 - me;   // letztes Stäbchen genommen = verloren
      else n.turn = 1 - me;
      return n;
    },
  },

  // ===== LEITERSPIEL =====
  // Würfeln und laufen. Leitern bringen dich hoch, Schlangen zurück. Wer zuerst Feld 30 erreicht, gewinnt.
  ladders: {
    size: [360, 330],
    marks: [{ name: '🟢', color: '#22C55E' }, { name: '🔴', color: '#EF4444' }],
    SPECIAL: { 4: 14, 9: 2, 17: 26, 20: 6, 24: 29, 28: 12 },
    init(start) { return { pos: [0, 0], turn: start, winner: null, roll: null }; },
    cell(i) { const r = Math.floor((i - 1) / 6), c = (i - 1) % 6; return [(r % 2 ? 5 - c : c) * 60 + 30, 270 - r * 60 + 30 - 30]; },
    draw(ctx, s, me) {
      ctx.fillStyle = '#1D1730'; ctx.fillRect(0, 0, 360, 330);
      for (let i = 1; i <= 30; i++) {
        const [x, y] = this.cell(i);
        ctx.fillStyle = (i % 2) ? '#2E2560' : '#241C40'; ctx.fillRect(x - 30, y - 30, 60, 60);
        ctx.fillStyle = '#8B83A8'; ctx.font = '11px Fredoka, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(i, x - 26, y - 26);
      }
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (const [a, b] of Object.entries(this.SPECIAL)) {
        const [x1, y1] = this.cell(+a), [x2, y2] = this.cell(b);
        ctx.strokeStyle = b > a ? 'rgba(250,204,21,.8)' : 'rgba(34,197,94,.7)';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b > a ? '🪜' : '🐍', (x1 + x2) / 2, (y1 + y2) / 2);
      }
      s.pos.forEach((p, i) => { const [x, y] = p ? this.cell(p) : [-20, 300]; ctx.font = '22px sans-serif'; ctx.fillText(this.marks[i].name, x + (i ? 12 : -12), y + 12); });
      ctx.fillStyle = '#F3EEFF'; ctx.font = 'bold 14px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
      ctx.fillText(s.roll ? `${this.marks[s.roll.p].name} würfelt ${faces[s.roll.n - 1]} ${s.roll.n}` : 'Klick aufs Brett zum Würfeln!', 180, 318);
    },
    click(s, x, y, me) {
      const n = copy(s), roll = 1 + Math.floor(Math.random() * 6);   // der Würfelnde würfelt, das Ergebnis wird mitgeschickt
      let p = Math.min(30, n.pos[me] + roll);
      if (this.SPECIAL[p]) p = this.SPECIAL[p];
      n.pos[me] = p; n.roll = { p: me, n: roll };
      if (p >= 30) n.winner = me; else n.turn = 1 - me;
      return n;
    },
  },
};

export const BOARD_GAMES = Object.keys(GAMES);

// ---------- Die Online-Verbindung ----------
// env = { sb, roomId, isHost, hostName, guestName, sfx, t, scoreEl, resultEl }
export function startBoardOnline(canvas, gameName, env) {
  const game = GAMES[gameName];
  const { sb, sfx, t, scoreEl, resultEl } = env;
  const me = env.isHost ? 0 : 1;
  const names = [env.hostName, env.guestName];
  const ctx = canvas.getContext('2d');
  canvas.width = game.size[0]; canvas.height = game.size[1];
  canvas.style.cursor = 'pointer';
  canvas.style.touchAction = 'manipulation';

  let s = null;              // aktueller Spielstand (null = noch nicht geladen)
  let seq = 0;               // Nummer des Spielstands
  let round = 0;
  let wins = [0, 0];
  const ui = { sel: null };  // nur lokal: ausgewählter Stein bei Dame
  let done = false, helloTimer = null;

  const chan = sb.channel('board-' + env.roomId, { config: { broadcast: { self: false } } });

  function send() {
    chan.send({ type: 'broadcast', event: 'state', payload: { seq, round, wins, s, from: me } });
  }

  function newRound() {
    round++;
    seq++;
    ui.sel = null;
    s = game.init((round - 1) % 2); // abwechselnd beginnt Host oder Gast
    sfx.select();
    send();
    render();
  }

  function finishRound(n) {
    if (n.winner === 0 || n.winner === 1) wins[n.winner]++;
  }

  function statusText() {
    if (!s) return t('online.board.connecting');
    const mark = p => game.marks[p].name;
    if (s.winner === 'draw') return t('online.board.draw') + ' ' + t('online.board.again');
    if (s.winner !== null) {
      return t('online.pong.wins', names[s.winner]) + ' ' + t('online.board.again');
    }
    let txt = s.turn === me
      ? t('online.board.yourturn', mark(me))
      : t('online.board.wait', names[s.turn], mark(s.turn));
    if (s.passed) txt = t('online.board.passed', names[1 - s.turn]) + ' ' + txt;
    return txt;
  }

  function render() {
    if (done) return;
    if (s) game.draw(ctx, s, me, ui);
    else { ctx.fillStyle = '#0F0B1C'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    let score = names[0] + ' (' + game.marks[0].name + ')  ' + wins[0] + ' : ' + wins[1] + '  ' + names[1] + ' (' + game.marks[1].name + ')';
    if (s && game.count) { const c = game.count(s); score += '  ·  ' + game.marks[0].name + ' ' + c[0] + ' / ' + game.marks[1].name + ' ' + c[1]; }
    scoreEl.textContent = score;
    resultEl.hidden = false;
    resultEl.textContent = statusText();
    resultEl.style.fontSize = '18px';
    resultEl.style.color = s && s.winner === null && s.turn !== me ? '#B4A9D6' : '#C6FF3D';
  }

  function onPointer(e) {
    if (!s || done) return;
    e.preventDefault();
    if (s.winner !== null) { newRound(); return; } // Klick nach Spielende = neue Runde
    if (s.turn !== me) { sfx.click?.(); return; }
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const n = game.click(s, x, y, me, ui);
    if (n) {
      s = n; seq++;
      finishRound(n);
      if (n.winner === me) sfx.win(); else sfx.place?.();
      send();
    }
    render();
  }
  canvas.addEventListener('pointerdown', onPointer);

  chan
    .on('broadcast', { event: 'state' }, ({ payload }) => {
      // alter Stand ignorieren; gleich alt (beide gleichzeitig neu gestartet)? Dann gilt der Stand vom Host
      if (s && (payload.seq < seq || (payload.seq === seq && !(payload.from === 0 && me === 1)))) return;
      const wasMyTurn = s && s.turn === me;
      s = payload.s; seq = payload.seq; round = payload.round; wins = payload.wins;
      ui.sel = null;
      if (helloTimer) { clearInterval(helloTimer); helloTimer = null; }
      if (s.winner !== null && s.winner !== 'draw') (s.winner === me ? sfx.win : sfx.lose)?.call(sfx);
      else if (!wasMyTurn && s.turn === me) sfx.blip?.();
      render();
    })
    .on('broadcast', { event: 'hello' }, () => { if (s) send(); })
    .subscribe(status => {
      if (status !== 'SUBSCRIBED') return;
      if (env.isHost) newRound();
      else {
        const hello = () => chan.send({ type: 'broadcast', event: 'hello', payload: {} });
        hello();
        helloTimer = setInterval(hello, 1000);
      }
    });

  render();

  return () => {
    done = true;
    if (helloTimer) clearInterval(helloTimer);
    canvas.removeEventListener('pointerdown', onPointer);
    canvas.style.cursor = '';
    resultEl.hidden = true;
    resultEl.style.fontSize = ''; resultEl.style.color = '';
    chan.unsubscribe();
  };
}
