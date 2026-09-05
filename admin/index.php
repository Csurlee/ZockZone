<?php
require_once __DIR__ . '/includes/config.php';
if (session_status() === PHP_SESSION_NONE) session_start();

if (!empty($_SESSION['admin_logged_in'])) {
    header('Location: dashboard.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    if ($username === ADMIN_USERNAME && password_verify($password, ADMIN_PASSWORD_HASH)) {
        $_SESSION['admin_logged_in'] = true;
        header('Location: dashboard.php');
        exit;
    }
    $error = 'Benutzername oder Passwort falsch.';
}
?>
<!doctype html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZockZone Admin — Login</title>
<link rel="stylesheet" href="assets/admin.css">
</head>
<body class="login-page">
<form class="login-box" method="post">
  <h1>ZockZone <span>Admin</span></h1>
  <?php if ($error): ?><div class="error-msg"><?= htmlspecialchars($error) ?></div><?php endif; ?>
  <label>Benutzername
    <input type="text" name="username" autocomplete="username" required>
  </label>
  <label>Passwort
    <input type="password" name="password" autocomplete="current-password" required>
  </label>
  <button type="submit">Einloggen</button>
</form>
</body>
</html>
