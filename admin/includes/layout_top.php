<?php
// Expects $pageTitle and $activeNav to be set before including this file.
?>
<!doctype html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZockZone Admin — <?= htmlspecialchars($pageTitle) ?></title>
<link rel="stylesheet" href="assets/admin.css">
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
    <a href="logout.php" class="logout-link">Logout</a>
  </nav>
  <main class="admin-main">
    <h1><?= htmlspecialchars($pageTitle) ?></h1>
