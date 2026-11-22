<?php
// Admin-API für "Problem melden": Meldungen lesen, als erledigt markieren, löschen.
header('Content-Type: application/json');
require_once __DIR__ . '/../includes/api_auth_guard.php';

const REPORTS_FILE = '/var/log/zockzone-chat/meldungen.jsonl';

function read_reports(): array {
    if (!is_file(REPORTS_FILE)) return [];
    $out = [];
    foreach (file(REPORTS_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $r = json_decode($line, true);
        if (is_array($r) && isset($r['id'])) $out[] = $r;
    }
    return $out;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $reports = array_reverse(read_reports());   // neueste zuerst
    foreach ($reports as &$r) unset($r['ip']);  // Hash braucht der Admin nicht
    echo json_encode($reports, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $input  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id     = is_string($input['id'] ?? null) ? $input['id'] : '';
    $action = $input['action'] ?? '';
    if (!preg_match('/^[a-f0-9]{16}$/', $id) || !in_array($action, ['done', 'open', 'delete'], true)) {
        http_response_code(400); echo json_encode(['error' => 'Ungültige Anfrage']); exit;
    }
    // Nur Admins dürfen löschen, Moderatoren dürfen Status ändern
    if ($action === 'delete' && ($_SESSION['zz_admin_role'] ?? '') !== 'admin') {
        http_response_code(403); echo json_encode(['error' => 'Nur Admins dürfen löschen']); exit;
    }
    $fh = @fopen(REPORTS_FILE, 'c+');
    if (!$fh) { http_response_code(500); echo json_encode(['error' => 'Datei nicht beschreibbar']); exit; }
    flock($fh, LOCK_EX);
    $lines = []; $found = false;
    rewind($fh);
    while (($line = fgets($fh)) !== false) {
        $r = json_decode($line, true);
        if (!is_array($r)) continue;
        if (($r['id'] ?? '') === $id) {
            $found = true;
            if ($action === 'delete') continue;
            $r['status'] = $action === 'done' ? 'erledigt' : 'neu';
        }
        $lines[] = json_encode($r, JSON_UNESCAPED_UNICODE);
    }
    if ($found) {
        ftruncate($fh, 0); rewind($fh);
        fwrite($fh, $lines ? implode("\n", $lines) . "\n" : '');
        fflush($fh);
    }
    flock($fh, LOCK_UN); fclose($fh);
    if (!$found) { http_response_code(404); echo json_encode(['error' => 'Meldung nicht gefunden']); exit; }
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Methode nicht erlaubt']);
