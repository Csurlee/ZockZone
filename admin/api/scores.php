<?php
require_once __DIR__ . '/../includes/api_auth_guard.php';
require_once __DIR__ . '/../includes/supabase_client.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $gameId = $_GET['game_id'] ?? '';
    if ($gameId === '') { http_response_code(400); echo json_encode(['error' => 'game_id fehlt']); exit; }
    [$status, $data] = sb_request('GET', '/rest/v1/highscores?select=user_id,display_name,score,updated_at&game_id=eq.' . rawurlencode($gameId) . '&order=score.desc');
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if ($method === 'DELETE') {
    $gameId = $_GET['game_id'] ?? '';
    $userId = $_GET['user_id'] ?? '';
    if ($gameId === '') { http_response_code(400); echo json_encode(['error' => 'game_id fehlt']); exit; }
    $path = '/rest/v1/highscores?game_id=eq.' . rawurlencode($gameId);
    if ($userId !== '') $path .= '&user_id=eq.' . rawurlencode($userId);
    [$status, $data] = sb_request('DELETE', $path);
    http_response_code($status);
    echo json_encode(['ok' => $status < 300]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Methode nicht erlaubt']);
