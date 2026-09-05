<?php
require_once __DIR__ . '/includes/auth_guard.php';
require_once __DIR__ . '/includes/supabase_client.php';
[, $games] = sb_request('GET', '/rest/v1/games?select=id,title&order=title.asc');
$games = $games ?? [];
$pageTitle = 'Highscores';
$activeNav = 'scores';
require __DIR__ . '/includes/layout_top.php';
?>
<div class="toolbar">
  <select id="gameSelect">
    <option value="">— Spiel wählen —</option>
    <?php foreach ($games as $g): ?>
      <option value="<?= htmlspecialchars($g['id']) ?>"><?= htmlspecialchars($g['title']) ?></option>
    <?php endforeach; ?>
  </select>
  <button class="btn btn-danger btn-sm" id="wipeBtn" disabled onclick="wipeLeaderboard()">Ganze Bestenliste zurücksetzen</button>
</div>

<table class="data-table" id="scoresTable">
  <thead><tr><th>Platz</th><th>Anzeigename</th><th>Punkte</th><th>Aktualisiert</th><th>Aktion</th></tr></thead>
  <tbody><tr><td colspan="5">Bitte ein Spiel wählen.</td></tr></tbody>
</table>

<script>
const gameSelect = document.getElementById('gameSelect');
const wipeBtn = document.getElementById('wipeBtn');

async function loadScores(){
  const gameId = gameSelect.value;
  const tbody = document.querySelector('#scoresTable tbody');
  wipeBtn.disabled = !gameId;
  if(!gameId){ tbody.innerHTML = '<tr><td colspan="5">Bitte ein Spiel wählen.</td></tr>'; return; }
  const rows = await apiCall('GET', `api/scores.php?game_id=${encodeURIComponent(gameId)}`);
  if(!Array.isArray(rows) || rows.length===0){ tbody.innerHTML = '<tr><td colspan="5">Noch keine Einträge.</td></tr>'; return; }
  tbody.innerHTML = rows.map((r,i) => `
    <tr>
      <td>${i+1}</td>
      <td>${escapeHtml(r.display_name)}</td>
      <td>${r.score}</td>
      <td>${new Date(r.updated_at).toLocaleString('de-DE')}</td>
      <td><button class="btn btn-sm btn-danger" onclick="resetOne('${gameId}','${r.user_id}')">Zurücksetzen</button></td>
    </tr>
  `).join('');
}

async function resetOne(gameId, userId){
  if(!confirm('Diesen Highscore wirklich löschen?')) return;
  await apiCall('DELETE', `api/scores.php?game_id=${encodeURIComponent(gameId)}&user_id=${encodeURIComponent(userId)}`);
  loadScores();
}

async function wipeLeaderboard(){
  const gameId = gameSelect.value;
  if(!gameId) return;
  if(!confirm('Die GESAMTE Bestenliste für dieses Spiel löschen? Das kann nicht rückgängig gemacht werden.')) return;
  await apiCall('DELETE', `api/scores.php?game_id=${encodeURIComponent(gameId)}`);
  loadScores();
}

gameSelect.addEventListener('change', loadScores);
</script>
<?php require __DIR__ . '/includes/layout_bottom.php'; ?>
