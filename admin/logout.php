<?php
require_once __DIR__ . '/includes/session.php';
$_SESSION = [];
setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/admin/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
session_destroy();
header('Location: index.php');
