<?php
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/supabase_client.php';
if (session_status() === PHP_SESSION_NONE) session_start();

if (!empty($_SESSION['zz_admin_role'])) {
    header('Location: dashboard.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    [$status, $data] = sb_user_login($email, $password);
    if ($status === 200 && isset($data['user']['id'])) {
        $userId = $data['user']['id'];
        [, $profiles] = sb_request('GET', '/rest/v1/profiles?id=eq.' . rawurlencode($userId) . '&select=role');
        $role = $profiles[0]['role'] ?? 'user';
        if (in_array($role, ['admin', 'moderator'], true)) {
            $_SESSION['zz_admin_uid']   = $userId;
            $_SESSION['zz_admin_email'] = $email;
            $_SESSION['zz_admin_role']  = $role;
            header('Location: dashboard.php');
            exit;
        }
        $error = 'Kein Admin- oder Moderator-Zugang für dieses Konto.';
    } else {
        $error = 'E-Mail oder Passwort falsch.';
    }
}
?>
<!doctype html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZockZone Admin — Login</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/admin.css">
</head>
<body class="login-page">
<form class="login-box" method="post">
  <h1>ZockZone <span>Admin</span></h1>
  <?php if ($error): ?><div class="error-msg"><?= htmlspecialchars($error) ?></div><?php endif; ?>
  <label>E-Mail
    <input type="email" name="email" autocomplete="email" required autofocus>
  </label>
  <label>Passwort
    <input type="password" name="password" autocomplete="current-password" required>
  </label>
  <button type="submit">Einloggen</button>
</form>
</body>
</html>
