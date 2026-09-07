<?php
require_once __DIR__ . '/includes/auth_guard.php';
$pageTitle = 'Besucher';
$activeNav = 'visitors';
require __DIR__ . '/includes/layout_top.php';
?>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>

<style>
#visitorMap .leaflet-tile-pane {
  filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9);
}
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin: 24px 0;
}
.chart-card {
  background: var(--card);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius);
  padding: 20px;
}
.chart-card h3 {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: .05em;
}
.chart-card canvas { max-height: 220px; }
.chart-full {
  background: var(--card);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 24px;
}
.chart-full h3 {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: .05em;
}
.chart-full canvas { max-height: 180px; width: 100%; }
.section-title {
  font-size: 13px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: .06em;
  margin: 28px 0 12px;
}
</style>

<p class="admin-hint">GeoIP-Daten stammen aus einer Live-Abfrage bei ip-api.com und sind nur für öffentliche IP-Adressen verfügbar (nicht für Besuche aus dem lokalen Netz).</p>

<!-- Stat-Tiles -->
<div class="stat-row" id="statRow">
  <div class="stat-tile"><div class="stat-num">…</div><div class="stat-label">Lade…</div></div>
</div>

<!-- Karte -->
<div id="visitorMap" style="height:340px; border-radius:14px; margin:20px 0;"></div>

<!-- Stunden-Chart (volle Breite) -->
<div class="chart-full">
  <h3>Besuche nach Uhrzeit (letzte 2000 Besuche)</h3>
  <canvas id="chartHourly"></canvas>
</div>

<!-- Charts-Grid -->
<div class="charts-grid">
  <div class="chart-card">
    <h3>Gerät</h3>
    <canvas id="chartDevice"></canvas>
  </div>
  <div class="chart-card">
    <h3>Browser</h3>
    <canvas id="chartBrowser"></canvas>
  </div>
  <div class="chart-card">
    <h3>Traffic-Quelle</h3>
    <canvas id="chartSource"></canvas>
  </div>
  <div class="chart-card">
    <h3>Neu vs. Wiederkehrend</h3>
    <canvas id="chartNew"></canvas>
  </div>
</div>

<!-- Tabellen -->
<div class="two-col">
  <div>
    <h3>Top Länder</h3>
    <table class="data-table" id="countriesTable"><tbody><tr><td>Lade…</td></tr></tbody></table>
  </div>
  <div>
    <h3>Top Städte</h3>
    <table class="data-table" id="citiesTable"><tbody><tr><td>Lade…</td></tr></tbody></table>
  </div>
</div>

<div class="two-col" style="margin-top:20px;">
  <div>
    <h3>Top Seiten</h3>
    <table class="data-table" id="pathsTable"><tbody><tr><td>Lade…</td></tr></tbody></table>
  </div>
  <div></div>
</div>

<script>
const CHART_COLORS = {
  violet: '#7C3AED', lime: '#C6FF3D', blue: '#60a5fa', orange: '#f97316',
  pink: '#f472b6', teal: '#2dd4bf', red: '#ef4444', yellow: '#facc15',
  purple: '#a78bfa', gray: '#6b7280',
};
const PALETTE = Object.values(CHART_COLORS);

Chart.defaults.color = '#9ca3af';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 12;

function makeDoughnut(id, labels, values) {
  return new Chart(document.getElementById(id), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: PALETTE.slice(0, labels.length), borderWidth: 0 }],
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } } },
      cutout: '60%',
    },
  });
}

function makeBar(id, labels, values, label) {
  return new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        backgroundColor: 'rgba(124,58,237,0.7)',
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { precision: 0 } },
      },
    },
  });
}

async function loadVisitors() {
  const data = await apiCall('GET', 'api/visitors.php');
  if (!data) return;

  // Stat-Tiles
  const t = data.totals;
  document.getElementById('statRow').innerHTML = `
    <div class="stat-tile"><div class="stat-num">${t.today.visits}</div><div class="stat-label">Heute (${t.today.unique} unique)</div></div>
    <div class="stat-tile"><div class="stat-num">${t['7d'].visits}</div><div class="stat-label">7 Tage (${t['7d'].unique} unique)</div></div>
    <div class="stat-tile"><div class="stat-num">${t['30d'].visits}</div><div class="stat-label">30 Tage (${t['30d'].unique} unique)</div></div>
    <div class="stat-tile"><div class="stat-num">${t.all.visits}</div><div class="stat-label">Gesamt (${t.all.unique} unique)</div></div>
  `;

  // Karte
  const map = L.map('visitorMap', { attributionControl: true }).setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);
  data.mapPoints.forEach(p => {
    L.circleMarker([p.lat, p.lon], { radius: 5, color: '#C6FF3D', fillOpacity: 0.7 })
      .bindPopup(`${escapeHtml(p.city || '')} ${escapeHtml(p.country || '')}`)
      .addTo(map);
  });

  // Stunden-Chart
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`);
  makeBar('chartHourly', hours, data.hourly, 'Besuche');

  // Doughnut-Charts
  makeDoughnut('chartDevice',  Object.keys(data.devices),  Object.values(data.devices));
  makeDoughnut('chartBrowser', Object.keys(data.browsers), Object.values(data.browsers));
  makeDoughnut('chartSource',  Object.keys(data.sources),  Object.values(data.sources));
  makeDoughnut('chartNew',     Object.keys(data.newVsReturning), Object.values(data.newVsReturning));

  // Tabellen
  const renderTable = (id, rows) => {
    document.querySelector(`#${id} tbody`).innerHTML = rows.length
      ? rows.map(r => `<tr><td>${escapeHtml(r.label)}</td><td>${r.count}</td></tr>`).join('')
      : '<tr><td>Keine Daten.</td></tr>';
  };
  renderTable('countriesTable', data.topCountries);
  renderTable('citiesTable',    data.topCities);
  renderTable('pathsTable',     data.topPaths);
}

loadVisitors();
</script>

<?php require __DIR__ . '/includes/layout_bottom.php'; ?>
