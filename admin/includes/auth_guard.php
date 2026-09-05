<?php
if (session_status() === PHP_SESSION_NONE) session_start();

if (empty($_SESSION['zz_admin_role']) || !in_array($_SESSION['zz_admin_role'], ['admin', 'moderator'], true)) {
    header('Location: index.php');
    exit;
}
