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
  lang = newLang;
  try { localStorage.setItem('zz_lang', lang); } catch {}
  applyTranslations();
  window.dispatchEvent(new CustomEvent('zz:lang-changed', { detail: { lang } }));
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
