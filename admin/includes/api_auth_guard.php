<?php
if (session_status() === PHP_SESSION_NONE) session_start();

if (empty($_SESSION['zz_admin_role']) || !in_array($_SESSION['zz_admin_role'], ['admin', 'moderator'], true)) {
    http_response_code(401);
    echo json_encode(['error' => 'Nicht angemeldet']);
    exit;
}
