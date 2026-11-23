<?php
require_once __DIR__ . '/session.php';

if (empty($_SESSION['zz_admin_role']) || !in_array($_SESSION['zz_admin_role'], ['admin', 'moderator'], true)) {
    header('Location: index.php');
    exit;
}
