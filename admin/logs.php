<?php
require_once __DIR__ . '/includes/auth_guard.php';
$pageTitle = 'Chat-Logs';
$activeNav = 'logs';

$LOG_DIR = '/var/log/zockzone-chat';

// Verfügbare Log-Dateien einlesen
$logFiles = [];
if(is_dir($LOG_DIR)) {
  foreach(scandir($LOG_DIR, SCANDIR_SORT_DESCENDING) as $f) {
    if(preg_match('/^\d{4}-\d{2}-\d{2}\.log$/', $f)) {
      $date = substr($f, 0, 10);
      $size = filesize($LOG_DIR . '/' . $f);
      $logFiles[] = ['date' => $date, 'size' => $size];
    }
  }
}

// Ausgewähltes Datum (Standard: heute oder neueste Datei)
$today      = date('Y-m-d');
$selected   = $_GET['date'] ?? ($logFiles[0]['date'] ?? $today);
$selected   = preg_replace('/[^0-9\-]/', '', $selected); // sanitize
$logPath    = $LOG_DIR . '/' . $selected . '.log';
$logContent = is_file($logPath) ? file_get_contents($logPath) : null;

// Suchterm (innerhalb des Tages)
$search = trim($_GET['q'] ?? '');

// User-Suche über alle Logs
$userSearch   = trim($_GET['user'] ?? '');
$userResults  = [];
if($userSearch !== '' && is_dir($LOG_DIR)) {
  foreach(scandir($LOG_DIR) as $f) {
    if(!preg_match('/^\d{4}-\d{2}-\d{2}\.log$/', $f)) continue;
    $date    = substr($f, 0, 10);
    $lines   = file($LOG_DIR . '/' . $f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $matches = array_filter($lines, fn($l) => stripos($l, $userSearch) !== false);
    if($matches) $userResults[$date] = array_values($matches);
  }
  krsort($userResults); // neueste zuerst
}

require __DIR__ . '/includes/layout_top.php';
?>

<style>
.log-layout   { display: flex; gap: 20px; align-items: flex-start; }
.log-sidebar  { width: 220px; flex-shrink: 0; }
.log-sidebar input[type="date"] {
  width: 100%; padding: 9px 12px; border-radius: 8px; margin-bottom: 12px;
  border: 1px solid rgba(255,255,255,0.12); background: var(--bg-alt);
  color: var(--text); font-size: 13px; font-family: 'Inter', sans-serif;
  cursor: pointer;
}
.log-sidebar input[type="date"]:focus { outline: none; border-color: var(--violet-light); }
.log-file-list { display: flex; flex-direction: column; gap: 4px; max-height: 70vh; overflow-y: auto; }
.log-file-btn {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; border-radius: 8px; cursor: pointer; border: none;
  background: var(--bg-alt); color: var(--text-dim); font-size: 12.5px;
  font-family: 'Inter', sans-serif; transition: background .15s, color .15s;
  text-decoration: none;
}
.log-file-btn:hover  { background: rgba(124,58,237,0.15); color: var(--text); }
.log-file-btn.active { background: rgba(124,58,237,0.25); color: var(--violet-light); font-weight: 600; }
.log-file-size { font-size: 10.5px; color: var(--text-dim); }
.log-main { flex: 1; min-width: 0; }
.log-toolbar {
  display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap;
}
.log-search {
  flex: 1; min-width: 200px; padding: 8px 14px; border-radius: 8px; font-size: 13px;
  border: 1px solid rgba(255,255,255,0.12); background: var(--bg-alt);
  color: var(--text); font-family: 'Inter', sans-serif;
}
.log-search:focus { outline: none; border-color: var(--violet-light); }
.log-stats { font-size: 12px; color: var(--text-dim); white-space: nowrap; }
.log-box {
  background: #0d0d14; border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px; padding: 16px 18px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.7;
  max-height: 72vh; overflow-y: auto; white-space: pre-wrap; word-break: break-word;
  color: #c8c8d8;
}
.log-empty { color: var(--text-dim); font-style: italic; }
.line-mod   { color: #f97316; font-weight: 600; }
.line-ban   { color: #ef4444; font-weight: 700; }
.line-lobby { color: #a78bfa; }
.line-raum  { color: #60a5fa; }
.line-hi    { background: rgba(250,204,21,0.2); border-radius: 3px; }
.log-legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 11.5px; margin-bottom: 10px; }
.legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; }
</style>

<!-- User-Suche über alle Logs -->
<div style="margin-bottom:20px;">
  <form method="get" style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
    <input type="hidden" name="date" value="<?= htmlspecialchars($selected) ?>">
    <input name="user" type="search" class="log-search" style="max-width:320px;"
      placeholder="👤 User über alle Logs suchen (Name oder UUID)…"
      value="<?= htmlspecialchars($userSearch) ?>">
    <button type="submit" class="btn btn-primary">Suchen</button>
    <?php if($userSearch !== ''): ?>
      <a href="?date=<?= urlencode($selected) ?>" class="btn">✕ Zurücksetzen</a>
    <?php endif; ?>
  </form>

  <?php if($userSearch !== ''): ?>
    <div style="margin-top:14px;">
      <div style="font-size:13px; color:var(--text-dim); margin-bottom:10px;">
        Ergebnisse für <strong style="color:var(--violet-light)"><?= htmlspecialchars($userSearch) ?></strong>
        — <?= array_sum(array_map('count', $userResults)) ?> Treffer in <?= count($userResults) ?> Tag(en)
      </div>
      <?php if(empty($userResults)): ?>
        <div style="font-size:13px; color:var(--text-dim);">Keine Einträge gefunden.</div>
      <?php else: ?>
        <?php foreach($userResults as $date => $lines): ?>
          <div style="margin-bottom:14px;">
            <div style="font-size:12px; font-weight:600; color:var(--text-dim); margin-bottom:4px;">
              📅 <?= htmlspecialchars($date) ?> — <?= count($lines) ?> Einträge
              <a href="?date=<?= urlencode($date) ?>" style="margin-left:8px; font-size:11px; color:var(--violet-light);">→ Ganzes Log</a>
            </div>
            <div class="log-box" style="max-height:200px;">
              <?php foreach($lines as $line):
                $cls = 'line-lobby';
                if(str_contains($line, '[RAUM'))     $cls = 'line-raum';
                if(str_contains($line, 'MODERIERT')) $cls = 'line-mod';
                if(str_contains($line, 'BAN') || str_contains($line, 'GEBANNT')) $cls = 'line-ban';
                $escaped = htmlspecialchars($line);
                $escaped = str_ireplace(
                  htmlspecialchars($userSearch),
                  '<mark class="line-hi">' . htmlspecialchars($userSearch) . '</mark>',
                  $escaped
                );
              ?>
              <div class="log-line <?= $cls ?>"><?= $escaped ?></div>
              <?php endforeach; ?>
            </div>
          </div>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>
  <?php endif; ?>
</div>

<div class="log-layout">

  <!-- Sidebar: Dateiliste + Kalender -->
  <div class="log-sidebar">
    <input type="date"
      id="calPicker"
      value="<?= htmlspecialchars($selected) ?>"
      max="<?= $today ?>"
      oninput="goDate(this.value)">
    <div class="log-file-list">
      <?php foreach($logFiles as $lf): ?>
        <?php
          $kb   = round($lf['size'] / 1024, 1);
          $cls  = ($lf['date'] === $selected) ? 'active' : '';
          $qs   = http_build_query(['date' => $lf['date'], 'q' => $search]);
        ?>
        <a class="log-file-btn <?= $cls ?>" href="?<?= $qs ?>">
          <span><?= htmlspecialchars($lf['date']) ?></span>
          <span class="log-file-size"><?= $kb ?> KB</span>
        </a>
      <?php endforeach; ?>
      <?php if(empty($logFiles)): ?>
        <div style="font-size:12px; color:var(--text-dim); padding:8px;">Noch keine Logs.</div>
      <?php endif; ?>
    </div>
  </div>

  <!-- Hauptbereich -->
  <div class="log-main">
    <div class="log-toolbar">
      <input class="log-search" id="logSearch" type="search"
        placeholder="🔍 In Log suchen…"
        value="<?= htmlspecialchars($search) ?>"
        oninput="filterLog()">
      <span class="log-stats" id="logStats"></span>
      <a class="btn btn-sm" href="?date=<?= urlencode($selected) ?>" style="white-space:nowrap">↻ Neu laden</a>
    </div>

    <div class="log-legend">
      <span><span class="legend-dot" style="background:#a78bfa"></span>Lobby</span>
      <span><span class="legend-dot" style="background:#60a5fa"></span>Raum</span>
      <span><span class="legend-dot" style="background:#f97316"></span>Moderiert</span>
      <span><span class="legend-dot" style="background:#ef4444"></span>Ban</span>
    </div>

    <div class="log-box" id="logBox">
      <?php if($logContent === null): ?>
        <span class="log-empty">Kein Log für <?= htmlspecialchars($selected) ?> vorhanden.</span>
      <?php elseif(trim($logContent) === ''): ?>
        <span class="log-empty">Log-Datei ist leer.</span>
      <?php else: ?>
        <?php
          $lines = explode("\n", rtrim($logContent));
          foreach($lines as $line):
            if($line === '') continue;
            $cls = 'line-lobby';
            if(str_contains($line, '[RAUM'))    $cls = 'line-raum';
            if(str_contains($line, 'MODERIERT')) $cls = 'line-mod';
            if(str_contains($line, 'BAN') || str_contains($line, 'GEBANNT')) $cls = 'line-ban';
            $escaped = htmlspecialchars($line);
            if($search !== '' && stripos($line, $search) !== false) {
              $escaped = str_ireplace(
                htmlspecialchars($search),
                '<mark class="line-hi">' . htmlspecialchars($search) . '</mark>',
                $escaped
              );
            }
        ?>
        <div class="log-line <?= $cls ?>"><?= $escaped ?></div>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>
  </div>
</div>

<script>
function goDate(val) {
  if(!val) return;
  const q = document.getElementById('logSearch')?.value || '';
  window.location.href = '?date=' + encodeURIComponent(val) + (q ? '&q=' + encodeURIComponent(q) : '');
}

function filterLog() {
  const q     = document.getElementById('logSearch').value.toLowerCase();
  const lines = document.querySelectorAll('.log-line');
  let shown   = 0;
  lines.forEach(el => {
    const match = !q || el.textContent.toLowerCase().includes(q);
    el.style.display = match ? '' : 'none';
    if(match) {
      // highlight
      if(q) {
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi');
        el.innerHTML = el.textContent.replace(re, m => `<mark class="line-hi">${m}</mark>`);
      }
      shown++;
    }
  });
  const stats = document.getElementById('logStats');
  if(stats) stats.textContent = q ? `${shown} / ${lines.length} Zeilen` : `${lines.length} Zeilen`;
}

// Initial stats
window.addEventListener('DOMContentLoaded', () => filterLog());
</script>

<?php require __DIR__ . '/includes/layout_bottom.php'; ?>
