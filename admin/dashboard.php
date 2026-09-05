<?php
require_once __DIR__ . '/includes/auth_guard.php';
require_once __DIR__ . '/includes/supabase_client.php';

[, $allUsers] = sb_request('GET', '/auth/v1/admin/users?page=1&per_page=1000');
$userCount = count($allUsers['users'] ?? []);

[, $games] = sb_request('GET', '/rest/v1/games?select=id');
$gameCount = count($games ?? []);

[, $todayVisits] = sb_request('GET', '/rest/v1/page_visits?select=id&created_at=gte.' . rawurlencode(date('Y-m-d\TH:i:s\Z', strtotime('today'))));
$visitsToday = count($todayVisits ?? []);

$pageTitle = 'Dashboard';
$activeNav = 'dashboard';
require __DIR__ . '/includes/layout_top.php';
?>
<div class="stat-row">
  <div class="stat-tile"><div class="stat-num"><?= $userCount ?></div><div class="stat-label">Nutzer</div></div>
  <div class="stat-tile"><div class="stat-num"><?= $gameCount ?></div><div class="stat-label">Spiele im Katalog</div></div>
  <div class="stat-tile"><div class="stat-num"><?= $visitsToday ?></div><div class="stat-label">Besuche heute</div></div>
</div>
<p class="admin-hint">Nutzerverwaltung, Spiele-Sichtbarkeit, Highscore-Reset und Besucherstatistik über die Navigation links.</p>
<?php require __DIR__ . '/includes/layout_bottom.php'; ?>
