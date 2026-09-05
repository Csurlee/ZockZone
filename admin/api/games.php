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

http_response_code(405);
echo json_encode(['error' => 'Methode nicht erlaubt']);
