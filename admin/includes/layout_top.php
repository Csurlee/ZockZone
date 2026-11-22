<?php
// Expects $pageTitle and $activeNav to be set before including this file.
?>
<!doctype html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZockZone Admin — <?= htmlspecialchars($pageTitle) ?></title>
<link rel="stylesheet" href="assets/admin.css?v=20260907a">
<script src="assets/admin.js"></script>
</head>
<body>
<div class="admin-shell">
  <nav class="admin-sidebar">
    <div class="admin-brand"><span class="dot"></span>ZockZone <span>Admin</span></div>
    <a href="dashboard.php" class="<?= $activeNav==='dashboard'?'active':'' ?>">Dashboard</a>
    <a href="users.php" class="<?= $activeNav==='users'?'active':'' ?>">Nutzer</a>
    <a href="games.php" class="<?= $activeNav==='games'?'active':'' ?>">Spiele</a>
    <a href="scores.php" class="<?= $activeNav==='scores'?'active':'' ?>">Highscores</a>
    <a href="visitors.php" class="<?= $activeNav==='visitors'?'active':'' ?>">Besucher</a>
    <a href="email.php" class="<?= $activeNav==='email'?'active':'' ?>">E-Mail</a>
    <a href="broadcast.php" class="<?= $activeNav==='broadcast'?'active':'' ?>">Broadcast</a>
    <a href="moderation.php" class="<?= $activeNav==='moderation'?'active':'' ?>">Moderation</a>
    <a href="logs.php" class="<?= $activeNav==='logs'?'active':'' ?>">Chat-Logs</a>
    <?php
      // Anzahl offener Meldungen für das Abzeichen
      $zzOpenReports = 0;
      $zzRf = '/var/log/zockzone-chat/meldungen.jsonl';
      if (is_readable($zzRf)) {
        foreach (file($zzRf, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $zzL) {
          if ((json_decode($zzL, true)['status'] ?? '') === 'neu') $zzOpenReports++;
        }
      }
    ?>
    <a href="reports.php" class="<?= $activeNav==='reports'?'active':'' ?>">🐞 Meldungen<?php if ($zzOpenReports): ?> <span class="badge badge-warn"><?= $zzOpenReports ?></span><?php endif; ?></a>
    <div class="admin-user-info">
      <span class="admin-user-email"><?= htmlspecialchars($_SESSION['zz_admin_email'] ?? '') ?></span>
      <span class="admin-user-role"><?= htmlspecialchars(ucfirst($_SESSION['zz_admin_role'] ?? '')) ?></span>
    </div>
    <a href="logout.php" class="logout-link">Logout</a>
  </nav>
  <main class="admin-main">
    <h1><?= htmlspecialchars($pageTitle) ?></h1>
