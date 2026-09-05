<?php
require_once __DIR__ . '/includes/auth_guard.php';
$pageTitle = 'Spiele';
$activeNav = 'games';
require __DIR__ . '/includes/layout_top.php';
?>
<p class="admin-hint">Steuert, welche Spiele im Katalog für Gäste bzw. registrierte Nutzer sichtbar/spielbar sind. Änderungen wirken sofort auf der Live-Seite.</p>
<table class="data-table" id="gamesTable">
  <thead><tr><th>Spiel</th><th>ID</th><th>Für Gäste</th><th>Für registrierte Nutzer</th></tr></thead>
  <tbody><tr><td colspan="4">Lade…</td></tr></tbody>
</table>

<script>
async function loadGames(){
  const games = await apiCall('GET', 'api/games.php');
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

async function toggleGame(id, field, value){
  await apiCall('PATCH', 'api/games.php', { id, [field]: value });
}

loadGames();
</script>
<?php require __DIR__ . '/includes/layout_bottom.php'; ?>
