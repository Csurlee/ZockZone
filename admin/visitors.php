<?php
require_once __DIR__ . '/includes/auth_guard.php';
$pageTitle = 'Besucher';
$activeNav = 'visitors';
require __DIR__ . '/includes/layout_top.php';
?>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<p class="admin-hint">GeoIP-Daten stammen aus einer Live-Abfrage bei ip-api.com und sind nur für öffentliche IP-Adressen verfügbar (nicht für Besuche aus dem lokalen Netz).</p>

<div class="stat-row" id="statRow"><div class="stat-tile"><div class="stat-num">…</div><div class="stat-label">Lade…</div></div></div>

<div id="visitorMap" style="height:360px; border-radius:14px; margin:20px 0;"></div>

<div class="two-col">
  <div>
    <h3>Top Länder</h3>
    <table class="data-table" id="countriesTable"><tbody><tr><td>Lade…</td></tr></tbody></table>
  </div>
  <div>
    <h3>Top Seiten</h3>
    <table class="data-table" id="pathsTable"><tbody><tr><td>Lade…</td></tr></tbody></table>
  </div>
</div>

<script>
async function loadVisitors(){
  const data = await apiCall('GET', 'api/visitors.php');

  document.getElementById('statRow').innerHTML = `
    <div class="stat-tile"><div class="stat-num">${data.totals.today.visits}</div><div class="stat-label">Besuche heute (${data.totals.today.unique} unique)</div></div>
    <div class="stat-tile"><div class="stat-num">${data.totals['7d'].visits}</div><div class="stat-label">Besuche 7 Tage (${data.totals['7d'].unique} unique)</div></div>
    <div class="stat-tile"><div class="stat-num">${data.totals['30d'].visits}</div><div class="stat-label">Besuche 30 Tage (${data.totals['30d'].unique} unique)</div></div>
    <div class="stat-tile"><div class="stat-num">${data.totals.all.visits}</div><div class="stat-label">Besuche gesamt (${data.totals.all.unique} unique)</div></div>
  `;

  document.querySelector('#countriesTable tbody').innerHTML = data.topCountries.length
    ? data.topCountries.map(c => `<tr><td>${escapeHtml(c.label)}</td><td>${c.count}</td></tr>`).join('')
    : '<tr><td>Noch keine Geo-Daten.</td></tr>';

  document.querySelector('#pathsTable tbody').innerHTML = data.topPaths.length
    ? data.topPaths.map(p => `<tr><td>${escapeHtml(p.label)}</td><td>${p.count}</td></tr>`).join('')
    : '<tr><td>Noch keine Daten.</td></tr>';

  const map = L.map('visitorMap', { attributionControl: true }).setView([20, 0], 2);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  }).addTo(map);
  data.mapPoints.forEach(p => {
    L.circleMarker([p.lat, p.lon], { radius: 5, color: '#C6FF3D', fillOpacity: 0.7 })
      .bindPopup(`${escapeHtml(p.city || '')} ${escapeHtml(p.country || '')}`)
      .addTo(map);
  });
}

loadVisitors();
</script>
<?php require __DIR__ . '/includes/layout_bottom.php'; ?>
