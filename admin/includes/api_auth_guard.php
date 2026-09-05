<?php
if (session_status() === PHP_SESSION_NONE) session_start();

header('Content-Type: application/json');

if (empty($_SESSION['admin_logged_in'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Nicht eingeloggt.']);
    exit;
}
