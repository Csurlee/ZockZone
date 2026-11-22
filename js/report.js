// ===== 🐞 PROBLEM MELDEN =====
// Öffnet ein Fenster mit Titel + Beschreibung und schickt die Meldung an report.php.
// Die Meldungen erscheinen auf der Admin-Seite unter "Meldungen".
import { t, getLang } from './i18n.js?v=20261122o';

const $ = id => document.getElementById(id);
const overlay = $('reportOverlay');
const titleEl = $('reportTitle'), descEl = $('reportDesc'), msgEl = $('reportMsg');
const sendBtn = $('reportSend'), gameEl = $('reportGame'), honey = $('reportWebsite');
let currentGame = '';

function open() {
  // Ist gerade ein Spiel offen? Dann merken wir uns, welches.
  const playing = $('overlay')?.classList.contains('open');
  currentGame = playing ? ($('playerTitle')?.textContent || '').trim() : '';
  gameEl.textContent = currentGame ? t('report.game', currentGame) : '';
  gameEl.hidden = !currentGame;
  msgEl.textContent = ''; msgEl.className = 'auth-error';
  sendBtn.disabled = false;
  overlay.classList.add('open');
  setTimeout(() => titleEl.focus(), 50);
}
function close() { overlay.classList.remove('open'); }

async function send() {
  const title = titleEl.value.trim(), description = descEl.value.trim();
  if (title.length < 3)       { msgEl.textContent = t('report.err.title'); titleEl.focus(); return; }
  if (description.length < 5) { msgEl.textContent = t('report.err.desc');  descEl.focus();  return; }
  sendBtn.disabled = true;
  msgEl.className = 'auth-error'; msgEl.textContent = t('report.sending');
  try {
    const res = await fetch('report.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, description, game: currentGame,
        name: window.zzCurrentUserName?.() || '',
        lang: getLang(),
        website: honey.value,   // unsichtbares Feld gegen Spam-Roboter
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      msgEl.className = 'auth-error report-ok';
      msgEl.textContent = t('report.thanks');
      titleEl.value = ''; descEl.value = '';
      setTimeout(close, 1800);
      return;
    }
    msgEl.textContent = res.status === 429 ? t('report.err.limit') : t('report.err.send');
  } catch {
    msgEl.textContent = t('report.err.send');
  }
  sendBtn.disabled = false;
}

window.zzOpenReport = open;
window.zzCloseReport = close;
sendBtn?.addEventListener('click', send);
overlay?.addEventListener('click', e => { if (e.target === overlay) close(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay?.classList.contains('open')) close(); });
