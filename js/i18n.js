const TRANSLATIONS = {
  de: {
    'header.login': '👤 Login',
    'header.register': 'Registrieren',
    'header.ranking': '🏆 Rangliste',
    'search.placeholder': 'Spiele suchen…',

    'hero.badge': '⚡ JETZT SPIELEN',
    'hero.title': 'Snake Reloaded',
    'hero.desc': 'Der Klassiker mit Geschwindigkeitsrausch. Wie lang wird deine Schlange, bevor du dich selbst beißt?',
    'hero.cta': '▶ Spielen',
    'hero.stat.games': 'Spiele im Katalog',
    'hero.stat.free': 'Kostenlos, Konto optional',

    'filter.all': 'Alle',
    'filter.hot': '🔥 HOT',
    'filter.new': '✨ NEU',
    'filter.arcade': 'Arcade',
    'filter.puzzle': 'Puzzle',
    'filter.reflex': 'Reflex',
    'filter.2player': '2 Spieler',

    'section.allgames': 'Alle Spiele',
    'count.games': (n) => `${n} Spiele`,

    'game.disabled': 'Vorübergehend deaktiviert',
    'game.login-required': '🔒 Login erforderlich',
    'card.plays': (n) => `${n} Spiele heute`,
    'tag.hot': 'HOT',
    'tag.new': 'NEU',

    'auth.tab.login': 'Login',
    'auth.tab.signup': 'Registrieren',
    'auth.field.name': 'Anzeigename',
    'auth.field.email': 'E-Mail',
    'auth.field.password': 'Passwort (min. 6 Zeichen)',
    'auth.field.password2': 'Passwort wiederholen',
    'auth.btn.login': 'Einloggen',
    'auth.btn.next': 'Weiter →',
    'auth.btn.back': '← Zurück',
    'auth.btn.create': 'Konto erstellen',
    'auth.forgot.link': 'Passwort vergessen?',
    'auth.forgot.label': 'Passwort zurücksetzen',
    'auth.forgot.hint': 'Wir senden dir einen Reset-Link per E-Mail.',
    'auth.forgot.btn': 'Link senden',
    'reset.title': '🔐 Neues Passwort',
    'reset.hint': 'Gib dein neues Passwort ein.',
    'reset.btn': 'Passwort speichern',
    'auth.avatar.label': 'Wähle deinen Avatar',
    'err.fill.email.pw': 'Bitte E-Mail und Passwort ausfüllen.',
    'err.fill.name': 'Bitte einen Anzeigenamen eingeben.',
    'err.fill.email': 'Bitte E-Mail ausfüllen.',
    'err.fill.pw': 'Bitte Passwort ausfüllen.',
    'err.pw.short': 'Passwort muss mindestens 6 Zeichen haben.',
    'err.pw.mismatch': 'Passwörter stimmen nicht überein.',
    'err.captcha': 'Bitte das CAPTCHA lösen.',
    'err.captcha.invalid': 'CAPTCHA ungültig. Bitte erneut versuchen.',
    'err.captcha.failed': 'CAPTCHA-Prüfung fehlgeschlagen. Bitte erneut versuchen.',
    'err.avatar': 'Bitte einen Avatar auswählen.',
    'err.name.empty': 'Anzeigename darf nicht leer sein.',
    'err.name.taken': 'Name schon vergeben. Bitte einen anderen wählen.',
    'err.email.empty': 'E-Mail darf nicht leer sein.',
    'err.pw.wrong': 'Passwort falsch. Bitte erneut versuchen.',
    'err.pw.enter': 'Bitte Passwort eingeben.',
    'err.prefix': 'Fehler: ',

    'authErr.already_registered': 'Diese E-Mail ist schon registriert. Wechsle zu Login.',
    'authErr.invalid_credentials': 'E-Mail oder Passwort falsch.',
    'authErr.pw_too_short': 'Passwort muss mindestens 6 Zeichen haben.',
    'authErr.invalid_email': 'Ungültige E-Mail-Adresse.',

    'profile.title': 'Mein Profil',
    'profile.avatar.change': 'Avatar ändern:',
    'profile.field.name': 'Anzeigename',
    'profile.field.email': 'E-Mail',
    'profile.field.pw': 'Neues Passwort (leer = nicht ändern)',
    'profile.field.pw2': 'Passwort wiederholen',
    'profile.hide': 'Meinen Namen in der Rangliste verbergen',
    'profile.btn.save': 'Speichern',
    'profile.btn.logout': 'Logout',
    'profile.btn.delete': 'Konto löschen',
    'profile.saved': 'Gespeichert!',
    'profile.delete.title': 'Konto wirklich löschen?',
    'profile.delete.text1': 'Dein Konto und alle deine Daten werden <strong>nach 10 Tagen endgültig gelöscht</strong>, sofern du dich nicht vorher wieder einloggst.<br>Loggst du dich innerhalb dieser Zeit ein, wird die Löschung automatisch abgebrochen.',
    'profile.delete.text2': 'Bitte gib dein <strong>Passwort</strong> ein, um die Löschung zu bestätigen:',
    'profile.delete.pw': 'Dein Passwort',
    'profile.delete.cancel': 'Abbrechen',
    'profile.delete.confirm': 'Konto löschen',
    'profile.delete.warning': (date) => `⚠️ Dein Konto wird am <strong>${date}</strong> endgültig gelöscht, sofern du dich nicht vorher einloggst.<br><button class="profile-cancel-delete-btn" onclick="zzCancelDeletion()">Löschung abbrechen</button>`,
    'toast.deletion.cancelled': '✅ Löschung abgebrochen — dein Konto ist wieder aktiv!',
    'toast.signup.confirm': '📧 Fast geschafft! Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte klicke auf den Link darin, um dein Konto zu aktivieren.',
    'toast.email.confirmed': '✅ E-Mail bestätigt! Du bist jetzt eingeloggt.',

    'ranking.title': '🏆 Rangliste',
    'ranking.loading': 'Lade…',
    'ranking.empty': 'Noch keine Einträge. Spiel ein Spiel und erziele einen Highscore!',
    'ranking.error': 'Rangliste konnte nicht geladen werden.',
    'ranking.anonymous': 'Anonym',
    'ranking.player': 'Spieler',
    'ranking.games': (n) => `${n} ${n !== 1 ? 'Spiele' : 'Spiel'} auf der Bestenliste`,

    'cookie.title': '🍪 Diese Website verwendet Cookies',
    'cookie.text': 'Wir nutzen notwendige Cookies für den Login, Cloudflare Turnstile (Bot-Schutz bei Registrierung) sowie optionale Statistik-Cookies. Du kannst frei wählen.',
    'cookie.btn.all': 'Alle akzeptieren',
    'cookie.btn.essential': 'Nur notwendige',
    'cookie.btn.info': 'Datenschutz',

    'leaderboard.btn': '🏆 Bestenliste',
    'leaderboard.loading': 'Lade Bestenliste…',
    'leaderboard.empty': 'Noch keine Einträge. Sei der/die Erste!',
    'leaderboard.error': 'Bestenliste konnte nicht geladen werden.',

    'footer.text': 'ZockZone — gebaut zum Zocken in der Mittagspause. Keine Ads, keine Downloads.',
    'footer.privacy': 'Datenschutz',
    'privacy.title': 'Datenschutzerklärung',

    'game.play-again': 'Nochmal spielen',
    'datenschutz.btn.stats': 'Statistik erlauben',
    'datenschutz.btn.essential': 'Nur notwendige',

    'avatar.snake': 'Snake',
    'avatar.alien': 'Alien',
    'avatar.rocket': 'Rakete',
    'avatar.bomb': 'Bombe',
    'avatar.dice': 'Würfel',
    'avatar.joker': 'Joker',
    'avatar.puzzle': 'Puzzle',
    'avatar.lightning': 'Blitz',
    'avatar.ghost': 'Geist',
    'avatar.trophy': 'Champ',

    'player.default': 'Spieler',
    'date.locale': 'de-DE',
    'score.locale': 'de-DE',

    // === Online ===
    'online.tab.friends': '👥 Freunde',
    'online.tab.room': '🔑 Raum',
    'online.friends.search.ph': 'Spieler suchen…',
    'online.friends.loading': 'Lade Freunde…',
    'online.room.subtitle': 'Spiele gegen einen Freund!',
    'online.room.create': '🟢 Raum erstellen',
    'online.room.join.btn': '🔑 Code eingeben',
    'online.room.code.ph': 'Code eingeben',
    'online.room.join.confirm': 'Beitreten →',
    'online.lobby.code.label': 'Raum-Code',
    'online.lobby.host': '👑 Gastgeber',
    'online.lobby.challenger': '⚔️ Herausforderer',
    'online.lobby.waiting.player': 'Warte…',
    'online.lobby.pick.game': '🎮 Spiel aussuchen',
    'online.lobby.game.label': 'Spiel wählen:',
    'online.lobby.chat.header': '💬 Privater Chat',
    'online.lobby.chat.ph': 'Nachricht…',
    'online.lobby.leave': 'Raum verlassen',
    'online.game.end': 'Beenden',
    'online.friends.none': 'Noch keine Freunde. Suche nach Spielern oben!',
    'online.friends.section': '👥 Freunde',
    'online.friends.section.sent': '⏳ Gesendete Anfragen',
    'online.friends.invite': '🎮 Einladen',
    'online.friends.offline': 'offline',
    'online.friends.remove.title': 'Freundschaft entfernen',
    'online.friends.notfound': 'Kein Spieler gefunden.',
    'online.friends.already': '✔ Freund',
    'online.friends.pending': 'Anfrage gesendet',
    'online.friends.pending.label': 'ausstehend',
    'online.friends.add': '+ Freund',
    'online.status.waiting.player': 'Warte auf Spieler…',
    'online.status.pick.game': 'Wähle ein Spiel aus!',
    'online.status.wait.host': 'Warte auf den Gastgeber…',
    'online.status.share.code': 'Teile den Code mit einem Freund!',
    'online.err.code.length': 'Bitte einen 6-stelligen Code eingeben!',
    'online.err.room.notfound': 'Raum nicht gefunden!',
    'online.err.room.full': 'Raum ist bereits voll!',
    'online.err.room.own': 'Das ist dein eigener Raum!',
    'online.err.join': 'Fehler beim Beitreten!',
    'online.err.msg.send': 'Nachricht konnte nicht gesendet werden.',
    'online.toast.invite.sent': (name) => `Einladung an ${name} gesendet!`,
    'online.toast.player.left': 'Spieler hat den Raum verlassen.',
    'online.toast.host.left': 'Gastgeber hat den Raum verlassen.',
    'online.toast.request.sent': 'Freundschaftsanfrage gesendet!',
    'online.toast.request.dup': 'Anfrage bereits gesendet!',
    'online.invite.text': (name) => `🎮 <b>${name}</b> lädt dich ein!`,
    'online.invite.accept': 'Annehmen',
    'online.invite.decline': 'Ablehnen',
    'online.billiard.waiting': '⏳ Warte auf Gegner…',
    'online.billiard.opponent': '⏳ Gegner zielt…',
    'online.billiard.wins': (name) => `${name} gewinnt! 🏆`,
    'online.pong.wins': (name) => `${name} gewinnt! 🎉`,

    // === Chat ===
    'chat.header': '💬 Lobby Chat',
    'chat.sound.title': 'Benachrichtigungston an/aus',
    'chat.bot.title': 'Chat-Moderator Bot',
    'chat.input.ph': 'Nachricht…',
    'chat.mute.title': (u) => `🔇 ${u} stummschalten`,
    'chat.mute.cancel': 'Abbrechen',
    'chat.mute.reason': (role) => `Von ${role} stummgeschaltet`,
    'chat.mute.done': (n, d) => `🔇 ${n} für ${d} stummgeschaltet.`,
    'chat.mute.10min': '10 Minuten',
    'chat.mute.1h': '1 Stunde',
    'chat.mute.6h': '6 Stunden',
    'chat.mute.24h': '24 Stunden',
    'chat.mute.7d': '7 Tage',
    'chat.mod.mute.title': 'Stummschalten',
    'chat.mod.del.title': 'Löschen',
    'chat.friend.add.title': 'Als Freund hinzufügen',
    'chat.friend.sent.label': 'Anfrage gesendet',
    'chat.friend.added': 'Freundschaftsanfrage gesendet!',
    'chat.friend.error': 'Freundschaftsanfrage konnte nicht gesendet werden.',
    'chat.del.error': 'Fehler beim Löschen.',
    'chat.notice.ratelimit': '⏳ Zu viele Nachrichten — bitte kurz warten.',
    'chat.notice.muted': '🔇 Du bist stummgeschaltet.',
    'chat.notice.send.error': '🔇 Nachricht konnte nicht gesendet werden.',
  },
  en: {
    'header.login': '👤 Login',
    'header.register': 'Register',
    'header.ranking': '🏆 Ranking',
    'search.placeholder': 'Search games…',

    'hero.badge': '⚡ PLAY NOW',
    'hero.title': 'Snake Reloaded',
    'hero.desc': 'The classic with a speed rush. How long will your snake grow before biting itself?',
    'hero.cta': '▶ Play',
    'hero.stat.games': 'Games in catalog',
    'hero.stat.free': 'Free, account optional',

    'filter.all': 'All',
    'filter.hot': '🔥 HOT',
    'filter.new': '✨ NEW',
    'filter.arcade': 'Arcade',
    'filter.puzzle': 'Puzzle',
    'filter.reflex': 'Reflex',
    'filter.2player': '2 Player',

    'section.allgames': 'All Games',
    'count.games': (n) => `${n} game${n !== 1 ? 's' : ''}`,

    'game.disabled': 'Temporarily disabled',
    'game.login-required': '🔒 Login required',
    'card.plays': (n) => `${n} plays today`,
    'tag.hot': 'HOT',
    'tag.new': 'NEW',

    'auth.tab.login': 'Login',
    'auth.tab.signup': 'Register',
    'auth.field.name': 'Display name',
    'auth.field.email': 'E-Mail',
    'auth.field.password': 'Password (min. 6 characters)',
    'auth.field.password2': 'Repeat password',
    'auth.btn.login': 'Log in',
    'auth.btn.next': 'Next →',
    'auth.btn.back': '← Back',
    'auth.btn.create': 'Create account',
    'auth.forgot.link': 'Forgot password?',
    'auth.forgot.label': 'Reset password',
    'auth.forgot.hint': 'We\'ll send you a reset link by email.',
    'auth.forgot.btn': 'Send link',
    'reset.title': '🔐 New Password',
    'reset.hint': 'Enter your new password.',
    'reset.btn': 'Save password',
    'auth.avatar.label': 'Choose your avatar',
    'err.fill.email.pw': 'Please fill in email and password.',
    'err.fill.name': 'Please enter a display name.',
    'err.fill.email': 'Please fill in your email.',
    'err.fill.pw': 'Please fill in your password.',
    'err.pw.short': 'Password must be at least 6 characters.',
    'err.pw.mismatch': 'Passwords do not match.',
    'err.captcha': 'Please complete the CAPTCHA.',
    'err.captcha.invalid': 'Invalid CAPTCHA. Please try again.',
    'err.captcha.failed': 'CAPTCHA verification failed. Please try again.',
    'err.avatar': 'Please select an avatar.',
    'err.name.empty': 'Display name cannot be empty.',
    'err.name.taken': 'Name already taken. Please choose a different one.',
    'err.email.empty': 'Email cannot be empty.',
    'err.pw.wrong': 'Wrong password. Please try again.',
    'err.pw.enter': 'Please enter your password.',
    'err.prefix': 'Error: ',

    'authErr.already_registered': 'This email is already registered. Switch to login.',
    'authErr.invalid_credentials': 'Email or password incorrect.',
    'authErr.pw_too_short': 'Password must be at least 6 characters.',
    'authErr.invalid_email': 'Invalid email address.',

    'profile.title': 'My Profile',
    'profile.avatar.change': 'Change avatar:',
    'profile.field.name': 'Display name',
    'profile.field.email': 'E-Mail',
    'profile.field.pw': 'New password (leave empty = no change)',
    'profile.field.pw2': 'Repeat password',
    'profile.hide': 'Hide my name in the leaderboard',
    'profile.btn.save': 'Save',
    'profile.btn.logout': 'Logout',
    'profile.btn.delete': 'Delete account',
    'profile.saved': 'Saved!',
    'profile.delete.title': 'Really delete account?',
    'profile.delete.text1': 'Your account and all your data will be <strong>permanently deleted after 10 days</strong> unless you log in again before then.<br>If you log in within this period, the deletion will be cancelled automatically.',
    'profile.delete.text2': 'Please enter your <strong>password</strong> to confirm deletion:',
    'profile.delete.pw': 'Your password',
    'profile.delete.cancel': 'Cancel',
    'profile.delete.confirm': 'Delete account',
    'profile.delete.warning': (date) => `⚠️ Your account will be permanently deleted on <strong>${date}</strong> unless you log in before then.<br><button class="profile-cancel-delete-btn" onclick="zzCancelDeletion()">Cancel deletion</button>`,
    'toast.deletion.cancelled': '✅ Deletion cancelled — your account is active again!',
    'toast.signup.confirm': '📧 Almost there! We sent you a confirmation email. Please click the link in it to activate your account.',
    'toast.email.confirmed': '✅ Email confirmed! You are now logged in.',

    'ranking.title': '🏆 Ranking',
    'ranking.loading': 'Loading…',
    'ranking.empty': 'No entries yet. Play a game and set a high score!',
    'ranking.error': 'Could not load ranking.',
    'ranking.anonymous': 'Anonymous',
    'ranking.player': 'Player',
    'ranking.games': (n) => `${n} ${n !== 1 ? 'games' : 'game'} on the leaderboard`,

    'cookie.title': '🍪 This website uses cookies',
    'cookie.text': 'We use necessary cookies for login, Cloudflare Turnstile (bot protection at registration) and optional analytics cookies. You can choose freely.',
    'cookie.btn.all': 'Accept all',
    'cookie.btn.essential': 'Essential only',
    'cookie.btn.info': 'Privacy policy',

    'leaderboard.btn': '🏆 Leaderboard',
    'leaderboard.loading': 'Loading leaderboard…',
    'leaderboard.empty': 'No entries yet. Be the first!',
    'leaderboard.error': 'Could not load leaderboard.',

    'footer.text': 'ZockZone — built for gaming during your lunch break. No ads, no downloads.',
    'footer.privacy': 'Privacy policy',
    'privacy.title': 'Privacy Policy',

    'game.play-again': 'Play again',
    'datenschutz.btn.stats': 'Allow analytics',
    'datenschutz.btn.essential': 'Essential only',

    'avatar.snake': 'Snake',
    'avatar.alien': 'Alien',
    'avatar.rocket': 'Rocket',
    'avatar.bomb': 'Bomb',
    'avatar.dice': 'Dice',
    'avatar.joker': 'Joker',
    'avatar.puzzle': 'Puzzle',
    'avatar.lightning': 'Lightning',
    'avatar.ghost': 'Ghost',
    'avatar.trophy': 'Champ',

    'player.default': 'Player',
    'date.locale': 'en-GB',
    'score.locale': 'en-US',

    // === Online ===
    'online.tab.friends': '👥 Friends',
    'online.tab.room': '🔑 Room',
    'online.friends.search.ph': 'Search players…',
    'online.friends.loading': 'Loading friends…',
    'online.room.subtitle': 'Play against a friend!',
    'online.room.create': '🟢 Create room',
    'online.room.join.btn': '🔑 Enter code',
    'online.room.code.ph': 'Enter code',
    'online.room.join.confirm': 'Join →',
    'online.lobby.code.label': 'Room code',
    'online.lobby.host': '👑 Host',
    'online.lobby.challenger': '⚔️ Challenger',
    'online.lobby.waiting.player': 'Waiting…',
    'online.lobby.pick.game': '🎮 Pick a game',
    'online.lobby.game.label': 'Choose game:',
    'online.lobby.chat.header': '💬 Private chat',
    'online.lobby.chat.ph': 'Message…',
    'online.lobby.leave': 'Leave room',
    'online.game.end': 'End',
    'online.friends.none': 'No friends yet. Search for players above!',
    'online.friends.section': '👥 Friends',
    'online.friends.section.sent': '⏳ Sent requests',
    'online.friends.invite': '🎮 Invite',
    'online.friends.offline': 'offline',
    'online.friends.remove.title': 'Remove friend',
    'online.friends.notfound': 'No player found.',
    'online.friends.already': '✔ Friend',
    'online.friends.pending': 'Request sent',
    'online.friends.pending.label': 'pending',
    'online.friends.add': '+ Friend',
    'online.status.waiting.player': 'Waiting for player…',
    'online.status.pick.game': 'Choose a game!',
    'online.status.wait.host': 'Waiting for the host…',
    'online.status.share.code': 'Share the code with a friend!',
    'online.err.code.length': 'Please enter a 6-character code!',
    'online.err.room.notfound': 'Room not found!',
    'online.err.room.full': 'Room is already full!',
    'online.err.room.own': 'That is your own room!',
    'online.err.join': 'Error joining room!',
    'online.err.msg.send': 'Message could not be sent.',
    'online.toast.invite.sent': (name) => `Invitation sent to ${name}!`,
    'online.toast.player.left': 'Player left the room.',
    'online.toast.host.left': 'Host left the room.',
    'online.toast.request.sent': 'Friend request sent!',
    'online.toast.request.dup': 'Request already sent!',
    'online.invite.text': (name) => `🎮 <b>${name}</b> invited you!`,
    'online.invite.accept': 'Accept',
    'online.invite.decline': 'Decline',
    'online.billiard.waiting': '⏳ Waiting for opponent…',
    'online.billiard.opponent': '⏳ Opponent aiming…',
    'online.billiard.wins': (name) => `${name} wins! 🏆`,
    'online.pong.wins': (name) => `${name} wins! 🎉`,

    // === Chat ===
    'chat.header': '💬 Lobby Chat',
    'chat.sound.title': 'Notification sound on/off',
    'chat.bot.title': 'Chat Moderator Bot',
    'chat.input.ph': 'Message…',
    'chat.mute.title': (u) => `🔇 Mute ${u}`,
    'chat.mute.cancel': 'Cancel',
    'chat.mute.reason': (role) => `Muted by ${role}`,
    'chat.mute.done': (n, d) => `🔇 ${n} muted for ${d}.`,
    'chat.mute.10min': '10 minutes',
    'chat.mute.1h': '1 hour',
    'chat.mute.6h': '6 hours',
    'chat.mute.24h': '24 hours',
    'chat.mute.7d': '7 days',
    'chat.mod.mute.title': 'Mute',
    'chat.mod.del.title': 'Delete',
    'chat.friend.add.title': 'Add as friend',
    'chat.friend.sent.label': 'Request sent',
    'chat.friend.added': 'Friend request sent!',
    'chat.friend.error': 'Friend request could not be sent.',
    'chat.del.error': 'Error deleting.',
    'chat.notice.ratelimit': '⏳ Too many messages — please wait a moment.',
    'chat.notice.muted': '🔇 You are muted.',
    'chat.notice.send.error': '🔇 Message could not be sent.',
  }
};

let lang = 'de';
try {
  const stored = localStorage.getItem('zz_lang');
  if (stored && TRANSLATIONS[stored]) lang = stored;
} catch {}

export function t(key, ...args) {
  const val = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.de?.[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

export function getLang() { return lang; }

export function setLang(newLang) {
  if (!TRANSLATIONS[newLang] || lang === newLang) return;
  try { localStorage.setItem('zz_lang', newLang); } catch {}
  window.location.reload();
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  // Show/hide language-specific content blocks
  document.querySelectorAll('[data-lang]').forEach(el => {
    el.style.display = el.dataset.lang === lang ? '' : 'none';
  });
  const flag = document.getElementById('langFlag');
  if (flag) flag.textContent = lang === 'de' ? '🇩🇪' : '🇬🇧';
  document.querySelectorAll('button[data-lang-btn]').forEach(btn => {
    btn.classList.toggle('active-lang', btn.dataset.langBtn === lang);
  });
}

window.zzSetLang = setLang;
window.zzToggleLangMenu = () => {
  const menu = document.getElementById('langMenu');
  if (menu) menu.hidden = !menu.hidden;
};

document.addEventListener('click', e => {
  if (!e.target.closest('#langSwitcher')) {
    const menu = document.getElementById('langMenu');
    if (menu) menu.hidden = true;
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyTranslations);
} else {
  applyTranslations();
}
