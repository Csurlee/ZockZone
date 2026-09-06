<?php
require_once __DIR__ . '/../includes/api_auth_guard.php';
require_once __DIR__ . '/../includes/supabase_client.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    [$status, $data] = sb_request('GET', '/rest/v1/games?select=id,title,enabled_guest,enabled_registered&order=title.asc');
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if ($method === 'PATCH') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $input['id'] ?? '';
    if ($id === '') { http_response_code(400); echo json_encode(['error' => 'id fehlt']); exit; }
    $patch = [];
    if (array_key_exists('enabled_guest', $input)) $patch['enabled_guest'] = (bool)$input['enabled_guest'];
    if (array_key_exists('enabled_registered', $input)) $patch['enabled_registered'] = (bool)$input['enabled_registered'];
    if (!$patch) { http_response_code(400); echo json_encode(['error' => 'keine Aenderung angegeben']); exit; }
    $patch['updated_at'] = date('c');
    [$status, $data] = sb_request('PATCH', '/rest/v1/games?id=eq.' . rawurlencode($id), $patch, ['Prefer: return=representation']);
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $games = $input['games'] ?? [];
    if (!is_array($games) || empty($games)) {
        http_response_code(400); echo json_encode(['error' => 'games fehlt']); exit;
    }
    $rows = array_map(fn($g) => [
        'id'                 => $g['id'],
        'title'              => $g['title'],
        'enabled_guest'      => true,
        'enabled_registered' => true,
    ], $games);
    [$status, $data] = sb_request('POST', '/rest/v1/games', $rows, ['Prefer: resolution=ignore-duplicates,return=representation']);
    http_response_code($status >= 200 && $status < 300 ? 200 : $status);
    echo json_encode(['synced' => count($rows), 'status' => $status]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Methode nicht erlaubt']);
