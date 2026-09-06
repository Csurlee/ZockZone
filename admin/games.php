<?php
require_once __DIR__ . '/includes/auth_guard.php';
$pageTitle = 'Spiele';
$activeNav = 'games';
require __DIR__ . '/includes/layout_top.php';
?>
<p class="admin-hint">Steuert, welche Spiele im Katalog für Gäste bzw. registrierte Nutzer sichtbar/spielbar sind. Änderungen wirken sofort auf der Live-Seite.</p>
<div id="syncStatus" style="display:none;margin-bottom:12px;padding:8px 12px;border-radius:6px;font-size:.85rem;"></div>
<table class="data-table" id="gamesTable">
  <thead><tr><th>Spiel</th><th>ID</th><th>Für Gäste</th><th>Für registrierte Nutzer</th></tr></thead>
  <tbody><tr><td colspan="4">Lade…</td></tr></tbody>
</table>

<script type="module">
import { GAMES } from '../js/games-list.js?v=20260906l';

async function loadGames(){
  const dbGames = await apiCall('GET', 'api/games.php');
  const dbIds = new Set(dbGames.map(g => g.id));

  const missing = GAMES.filter(g => !dbIds.has(g.id));
  if(missing.length > 0){
    showSync(`Sync: ${missing.length} neue Spiele werden hinzugefügt…`, '#555');
    await apiCall('POST', 'api/games.php', { games: missing });
    const fresh = await apiCall('GET', 'api/games.php');
    renderTable(fresh);
    showSync(`✓ ${missing.length} Spiel(e) automatisch synchronisiert: ${missing.map(g=>g.title).join(', ')}`, '#1a7a3d');
  } else {
    renderTable(dbGames);
  }
}

function showSync(msg, color){
  const el = document.getElementById('syncStatus');
  el.textContent = msg;
  el.style.display = 'block';
  el.style.background = color === '#1a7a3d' ? '#d4edda' : '#f5f5f5';
  el.style.color = color;
}

function renderTable(games){
  const tbody = document.querySelector('#gamesTable tbody');
  tbody.innerHTML = games.map(g => `
    <tr>
      <td>${escapeHtml(g.title)}</td>
      <td><code>${escapeHtml(g.id)}</code></td>
      <td><label class="switch"><input type="checkbox" ${g.enabled_guest?'checked':''} onchange="toggleGame('${g.id}','enabled_guest',this.checked)"><span></span></label></td>
      <td><label class="switch"><input type="checkbox" ${g.enabled_registered?'checked':''} onchange="toggleGame('${g.id}','enabled_registered',this.checked)"><span></span></label></td>
    </tr>
  `).join('');
}

window.toggleGame = async function(id, field, value){
  await apiCall('PATCH', 'api/games.php', { id, [field]: value });
};

loadGames();
</script>
<?php require __DIR__ . '/includes/layout_bottom.php'; ?>
