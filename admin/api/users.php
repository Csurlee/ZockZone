<?php
require_once __DIR__ . '/../includes/api_auth_guard.php';
require_once __DIR__ . '/../includes/supabase_client.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = 50;
    [$status, $data] = sb_request('GET', "/auth/v1/admin/users?page={$page}&per_page={$perPage}");
    if ($status >= 300 || !$data) { http_response_code($status); echo json_encode(['error' => 'GoTrue-Fehler', 'detail' => $data]); exit; }
    $users = $data['users'] ?? [];

    // Join with profiles (display_name, active) and count highscores per user.
    [, $profiles] = sb_request('GET', '/rest/v1/profiles?select=id,display_name,active');
    $profileById = [];
    foreach (($profiles ?? []) as $p) $profileById[$p['id']] = $p;

    [, $scoreCounts] = sb_request('GET', '/rest/v1/highscores?select=user_id');
    $countByUser = [];
    foreach (($scoreCounts ?? []) as $row) {
        $countByUser[$row['user_id']] = ($countByUser[$row['user_id']] ?? 0) + 1;
    }

    $result = array_map(function ($u) use ($profileById, $countByUser) {
        $p = $profileById[$u['id']] ?? null;
        $meta = $u['raw_user_meta_data'] ?? [];
        $bannedUntil = $u['banned_until'] ?? null;
        $isBanned = $bannedUntil && strtotime($bannedUntil) > time();
        return [
            'id' => $u['id'],
            'email' => $u['email'] ?? '',
            'display_name' => $p['display_name'] ?? ($meta['display_name'] ?? ''),
            'avatar' => $meta['avatar'] ?? '',
            'created_at' => $u['created_at'] ?? '',
            'active' => !$isBanned,
            'score_count' => $countByUser[$u['id']] ?? 0,
        ];
    }, $users);

    http_response_code(200);
    echo json_encode($result);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $displayName = trim($input['display_name'] ?? '') ?: explode('@', $email)[0];
    $avatar = trim($input['avatar'] ?? '');
    if ($email === '' || strlen($password) < 6) {
        http_response_code(400); echo json_encode(['error' => 'E-Mail und Passwort (min. 6 Zeichen) erforderlich']); exit;
    }
    $userPayload = ['email' => $email, 'password' => $password, 'email_confirm' => true,
        'user_metadata' => ['display_name' => $displayName, 'avatar' => $avatar]];
    [$status, $data] = sb_request('POST', '/auth/v1/admin/users', $userPayload);
    if ($status >= 300) { http_response_code($status); echo json_encode(['error' => 'Anlegen fehlgeschlagen', 'detail' => $data]); exit; }
    $userId = $data['id'] ?? null;
    if ($userId) {
        sb_request('POST', '/rest/v1/profiles', [
            'id' => $userId, 'email' => $email, 'display_name' => $displayName,
        ], ['Prefer: resolution=merge-duplicates']);
    }
    http_response_code(201);
    echo json_encode(['ok' => true, 'id' => $userId]);
    exit;
}

if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $input['id'] ?? '';
    if ($id === '') { http_response_code(400); echo json_encode(['error' => 'id fehlt']); exit; }
    $patch = [];
    if (!empty($input['email'])) $patch['email'] = $input['email'];
    if (!empty($input['password'])) $patch['password'] = $input['password'];
    if (!$patch) { http_response_code(400); echo json_encode(['error' => 'keine Aenderung angegeben']); exit; }
    [$status, $data] = sb_request('PUT', '/auth/v1/admin/users/' . rawurlencode($id), $patch);
    if (!empty($input['email'])) {
        sb_request('PATCH', '/rest/v1/profiles?id=eq.' . rawurlencode($id), ['email' => $input['email']]);
    }
    http_response_code($status);
    echo json_encode(['ok' => $status < 300, 'detail' => $data]);
    exit;
}

if ($method === 'PATCH') {
    // Activate/deactivate: ban indefinitely via GoTrue, mirror into profiles.active.
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $input['id'] ?? '';
    $active = $input['active'] ?? null;
    if ($id === '' || $active === null) { http_response_code(400); echo json_encode(['error' => 'id/active fehlt']); exit; }
    $banDuration = $active ? 'none' : '876000h'; // ~100 years == effectively permanent
    [$status, $data] = sb_request('PUT', '/auth/v1/admin/users/' . rawurlencode($id), ['ban_duration' => $banDuration]);
    if ($status < 300) {
        sb_request('PATCH', '/rest/v1/profiles?id=eq.' . rawurlencode($id), ['active' => (bool)$active]);
    }
    http_response_code($status);
    echo json_encode(['ok' => $status < 300, 'detail' => $data]);
    exit;
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if ($id === '') { http_response_code(400); echo json_encode(['error' => 'id fehlt']); exit; }
    [$status, $data] = sb_request('DELETE', '/auth/v1/admin/users/' . rawurlencode($id));
    http_response_code($status);
    echo json_encode(['ok' => $status < 300, 'detail' => $data]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Methode nicht erlaubt']);
