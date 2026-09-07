<?php
require_once __DIR__ . '/../includes/api_auth_guard.php';
require_once __DIR__ . '/../includes/supabase_client.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ===== DELETE MESSAGE =====
if($method === 'DELETE' && $action === 'message') {
    $id = trim($_GET['id'] ?? '');
    if(!$id) { http_response_code(400); echo json_encode(['error'=>'ID fehlt']); exit; }
    [, $r] = sb_request('DELETE', "/rest/v1/chat_messages?id=eq.$id");
    http_response_code(200);
    echo json_encode(['ok'=>true]);
    exit;
}

// ===== BANNED WORDS =====
if($method === 'GET' && $action === 'words') {
    [, $data] = sb_request('GET', '/rest/v1/chat_banned_words?select=word,added_by,created_at&order=created_at.desc');
    echo json_encode($data ?? []);
    exit;
}

if($method === 'POST' && $action === 'words') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $word  = strtolower(trim($input['word'] ?? ''));
    if(!$word || strlen($word) < 2) { http_response_code(400); echo json_encode(['error'=>'Wort zu kurz']); exit; }
    [, $r] = sb_request('POST', '/rest/v1/chat_banned_words',
        ['word'=>$word, 'added_by'=>$_SESSION['zz_admin_email'] ?? 'admin']);
    http_response_code(200);
    echo json_encode(['ok'=>true]);
    exit;
}

if($method === 'DELETE' && $action === 'words') {
    $word = trim($_GET['word'] ?? '');
    if(!$word) { http_response_code(400); echo json_encode(['error'=>'Wort fehlt']); exit; }
    $word = urlencode($word);
    [, $r] = sb_request('DELETE', "/rest/v1/chat_banned_words?word=eq.$word");
    http_response_code(200);
    echo json_encode(['ok'=>true]);
    exit;
}

// ===== MUTED USERS =====
if($method === 'GET' && $action === 'mutes') {
    [, $data] = sb_request('GET', '/rest/v1/chat_muted_users?select=user_id,muted_until,reason&order=muted_until.desc');
    // Enrich with email from auth.users
    [, $authUsers] = sb_request('GET', '/auth/v1/admin/users?page=1&per_page=1000');
    $emailMap = [];
    foreach(($authUsers['users'] ?? []) as $u) $emailMap[$u['id']] = $u['email'] ?? $u['id'];
    $result = array_map(fn($m) => array_merge($m, ['email'=>$emailMap[$m['user_id']] ?? $m['user_id']]), $data ?? []);
    echo json_encode($result);
    exit;
}

if($method === 'POST' && $action === 'mutes') {
    $input   = json_decode(file_get_contents('php://input'), true) ?? [];
    $userId  = trim($input['user_id'] ?? '');
    $minutes = max(1, (int)($input['minutes'] ?? 60));
    $reason  = trim($input['reason'] ?? '');
    if(!$userId) { http_response_code(400); echo json_encode(['error'=>'user_id fehlt']); exit; }
    $until = date('c', strtotime("+{$minutes} minutes"));
    sb_request('POST', '/rest/v1/chat_muted_users',
        ['user_id'=>$userId, 'muted_until'=>$until, 'reason'=>$reason],
        ['Prefer: resolution=merge-duplicates']);
    http_response_code(200);
    echo json_encode(['ok'=>true, 'until'=>$until]);
    exit;
}

if($method === 'DELETE' && $action === 'mutes') {
    $userId = trim($_GET['user_id'] ?? '');
    if(!$userId) { http_response_code(400); echo json_encode(['error'=>'user_id fehlt']); exit; }
    sb_request('DELETE', "/rest/v1/chat_muted_users?user_id=eq.$userId");
    http_response_code(200);
    echo json_encode(['ok'=>true]);
    exit;
}

// ===== RECENT MESSAGES =====
if($method === 'GET' && $action === 'messages') {
    [, $data] = sb_request('GET', '/rest/v1/chat_messages?select=id,username,avatar,message,created_at,user_id&order=created_at.desc&limit=100');
    echo json_encode($data ?? []);
    exit;
}

// ===== MODERATOR ROLE MANAGEMENT =====
if($method === 'GET' && $action === 'moderators') {
    [, $data] = sb_request('GET', "/rest/v1/profiles?select=id,email,display_name,role&role=in.(moderator,admin)&order=role.asc,email.asc");
    echo json_encode($data ?? []);
    exit;
}

if($method === 'POST' && $action === 'set_role') {
    $input  = json_decode(file_get_contents('php://input'), true) ?? [];
    $userId = trim($input['user_id'] ?? '');
    $role   = trim($input['role'] ?? 'user');
    if(!in_array($role, ['user','moderator','admin'], true)) {
        http_response_code(400); echo json_encode(['error'=>'Ungültige Rolle']); exit;
    }
    if(!$userId) { http_response_code(400); echo json_encode(['error'=>'user_id fehlt']); exit; }
    sb_request('PATCH', "/rest/v1/profiles?id=eq.$userId", ['role'=>$role]);
    http_response_code(200);
    echo json_encode(['ok'=>true]);
    exit;
}

// ===== USER SEARCH (for assigning mod role) =====
if($method === 'GET' && $action === 'search_users') {
    $q = trim($_GET['q'] ?? '');
    if(strlen($q) < 2) { echo json_encode([]); exit; }
    $qEnc = rawurlencode("%$q%");
    [, $data] = sb_request('GET', "/rest/v1/profiles?select=id,email,display_name,role&or=(email.ilike.$qEnc,display_name.ilike.$qEnc)&limit=10");
    echo json_encode($data ?? []);
    exit;
}

http_response_code(400);
echo json_encode(['error'=>'Unbekannte Aktion']);
