const CONSENT_KEY = 'zz_consent'; // 'all' | 'essential' | null

export function hasTrackingConsent(){
  try{ return localStorage.getItem(CONSENT_KEY) === 'all'; } catch{ return false; }
}

function isConsentSet(){
  try{ return localStorage.getItem(CONSENT_KEY) !== null; } catch{ return true; }
}

function hideBanner(){
  const b = document.getElementById('cookieBanner');
  if(b) b.hidden = true;
}

window.zzAcceptAll = () => {
  try{ localStorage.setItem(CONSENT_KEY, 'all'); } catch{}
  hideBanner();
  // Tracking direkt nachholen
  fetch('/track.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: location.pathname, referrer: document.referrer })
  }).catch(() => {});
};

window.zzAcceptEssential = () => {
  try{ localStorage.setItem(CONSENT_KEY, 'essential'); } catch{}
  hideBanner();
};

window.zzOpenDatenschutz = () => {
  document.getElementById('datenschutzOverlay').classList.add('open');
};
window.zzCloseDatenschutz = () => {
  document.getElementById('datenschutzOverlay').classList.remove('open');
};

// Banner anzeigen wenn noch keine Auswahl
if(!isConsentSet()){
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('cookieBanner');
    if(b) b.hidden = false;
  });
}
