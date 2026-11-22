// ===== PANZER-DUELL ONLINE =====
// Benutzt denselben Motor wie das Spiel am selben Gerät (js/games/tanks.js).
//
// So funktioniert es:
//  - Spieler 0 = Host, Spieler 1 = Gast.
//  - Wer dran ist, zielt ("aim") und schießt ("fire"). Der andere sieht
//    das Rohr drehen und die Kugel live fliegen.
//  - Der Schütze rechnet aus, was passiert, und schickt danach den
//    fertigen Spielstand ("state"): Boden, Leben, Wind, wer dran ist.
//    Der andere übernimmt diesen Stand, so sind beide immer gleich.

export async function startTanksOnline(canvas, env) {
  // Spiel-Motor erst laden, wenn er gebraucht wird
  const { createTanks, createControls } = await import('./games/tanks.js?v=20261122d');
  const { sb, sfx, t, scoreEl, resultEl } = env;
  const me = env.isHost ? 0 : 1;
  const names = [env.hostName, env.guestName];
  let seq = 0, round = 0, wins = [0, 0], loaded = false, done = false;
  let helloTimer = null, aimTimer = null, lastHud = null;

  const chan = sb.channel('tanks-' + env.roomId, { config: { broadcast: { self: false } } });
  const send = (event, payload) => chan.send({ type: 'broadcast', event, payload });

  const game = createTanks(canvas, {
    names,
    canControl: turn => loaded && turn === me,
    onAim: (angle, power) => {
      // höchstens 10 Mal pro Sekunde schicken
      if (aimTimer) return;
      aimTimer = setTimeout(() => { aimTimer = null; const s = game.snapshot().tanks[me]; send('aim', { angle: s.angle, power: s.power }); }, 100);
    },
    onFire: (angle, power) => send('fire', { angle, power }),
    onTurnEnd: snap => {
      if (snap.gameOver && snap.winner >= 0) wins[snap.winner]++;
      seq++;
      send('state', { seq, round, wins, snap, from: me });
    },
    onHud: info => { lastHud = info; render(); },
    onGameOver: () => render(),
    onRestart: () => newRound(),
  });
  const controls = createControls(game, canvas);
  canvas.after(controls.el);
  canvas.style.touchAction = 'none';

  function newRound() {
    round++; seq++;
    const snap = game.newGame((round - 1) % 2);   // abwechselnd beginnt Host oder Gast
    loaded = true;
    sfx.select();
    send('state', { seq, round, wins, snap, from: me });
    render();
  }

  function render() {
    if (done) return;
    const h = lastHud;
    let score = names[0] + ' ' + wins[0] + ' : ' + wins[1] + ' ' + names[1];
    if (h) score += '   ·   ❤️ ' + h.hp[0] + ' / ' + h.hp[1] + '   ·   Wind ' + (h.wind === 0 ? '0' : (h.wind > 0 ? '→ ' : '← ') + Math.abs(h.wind));
    scoreEl.textContent = score;
    resultEl.hidden = false;
    resultEl.style.fontSize = '18px';
    let txt, mine = false;
    if (!loaded) txt = t('online.board.connecting');
    else if (game.gameOver) { txt = (game.snapshot().winnerText) + ' ' + t('online.tanks.again'); mine = true; }
    else if (h && h.busy) txt = '💥 …';
    else if (game.turn === me) { txt = t('online.tanks.yourturn'); mine = true; }
    else txt = t('online.tanks.wait', names[game.turn]);
    resultEl.textContent = txt;
    resultEl.style.color = mine ? '#C6FF3D' : '#B4A9D6';
  }

  chan
    .on('broadcast', { event: 'state' }, ({ payload }) => {
      // Älteren Stand ignorieren. Gleich alt (beide haben gleichzeitig neu gestartet)? Dann gilt der Stand vom Host.
      if (loaded && (payload.seq < seq || (payload.seq === seq && !(payload.from === 0 && me === 1)))) return;
      const wasMine = loaded && game.turn === me;
      seq = payload.seq; round = payload.round; wins = payload.wins;
      game.load(payload.snap);
      loaded = true;
      if (helloTimer) { clearInterval(helloTimer); helloTimer = null; }
      if (!wasMine && payload.snap.turn === me && !payload.snap.gameOver) sfx.blip();
      render();
    })
    .on('broadcast', { event: 'aim' }, ({ payload }) => { if (game.turn !== me) game.remoteAim(payload.angle, payload.power); })
    .on('broadcast', { event: 'fire' }, ({ payload }) => { if (game.turn !== me) game.remoteFire(payload.angle, payload.power); })
    .on('broadcast', { event: 'hello' }, () => { if (loaded && !game.busy) send('state', { seq, round, wins, snap: game.snapshot(), from: me }); })
    .subscribe(status => {
      if (status !== 'SUBSCRIBED' || done) return;
      if (env.isHost) newRound();
      else {
        const hello = () => send('hello', {});
        hello();
        helloTimer = setInterval(hello, 1000);
      }
    });

  game.begin();
  render();

  return () => {
    done = true;
    game.stop();
    controls.stop();
    if (helloTimer) clearInterval(helloTimer);
    if (aimTimer) clearTimeout(aimTimer);
    canvas.style.touchAction = '';
    resultEl.hidden = true;
    resultEl.style.fontSize = ''; resultEl.style.color = '';
    chan.unsubscribe();
  };
}
