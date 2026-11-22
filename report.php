<?php
// ===== PROBLEM MELDEN =====
// Öffentlicher Empfang für "Problem melden" von der ZockZone-Startseite.
// Speichert jede Meldung als eine JSON-Zeile in REPORTS_FILE (außerhalb des Webroots,
// damit niemand die Meldungen von außen abrufen kann). Die Admin-Seite liest sie dort.
header('Content-Type: application/json');

const REPORTS_FILE   = '/var/log/zockzone-chat/meldungen.jsonl';
const MAX_PER_HOUR   = 5;      // höchstens 5 Meldungen pro Person und Stunde
const TITLE_MIN = 3,  TITLE_MAX = 100;
const DESC_MIN  = 5,  DESC_MAX  = 2000;

function fail(int $code, string $error): void {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $error]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'method');

// Nur von der eigenen Seite aus (schützt vor fremden Seiten, die Meldungen fälschen)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['https://zockzone.hackthelab.uk', 'https://muenzarcade.hackthelab.uk', 'http://localhost:8090', 'http://localhost:8000'];
if ($origin !== '' && !in_array($origin, $allowed, true)) fail(403, 'origin');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) fail(400, 'json');

// Honeypot: unsichtbares Feld, das nur Spam-Roboter ausfüllen
if (!empty($input['website'])) { echo json_encode(['ok' => true]); exit; }

$clean = function ($v, int $max): string {
    $v = is_string($v) ? $v : '';
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';   // Steuerzeichen raus
    $v = trim($v);
    return mb_substr($v, 0, $max);
};
$title = $clean($input['title'] ?? '', TITLE_MAX);
$desc  = $clean($input['description'] ?? '', DESC_MAX);
if (mb_strlen($title) < TITLE_MIN) fail(400, 'title');
if (mb_strlen($desc)  < DESC_MIN)  fail(400, 'description');

$game = $clean($input['game'] ?? '', 80);
$name = $clean($input['name'] ?? '', 60);
$lang = in_array($input['lang'] ?? '', ['de', 'en'], true) ? $input['lang'] : '';
$ua   = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200);

// IP nicht speichern, nur einen Tages-Hash (für die Spam-Grenze)
require_once __DIR__ . '/admin/includes/config.php';
require_once __DIR__ . '/admin/includes/trusted_proxy.php';
$ipHash = substr(hash('sha256', resolve_visitor_ip() . date('Y-m-d') . VISITOR_HASH_SALT), 0, 16);

$fh = @fopen(REPORTS_FILE, 'c+');
if (!$fh) fail(500, 'storage');
flock($fh, LOCK_EX);

// Spam-Grenze prüfen: wie viele Meldungen kamen in der letzten Stunde von dieser Person?
$since = time() - 3600; $recent = 0;
rewind($fh);
while (($line = fgets($fh)) !== false) {
    $r = json_decode($line, true);
    if ($r && ($r['ip'] ?? '') === $ipHash && strtotime($r['time'] ?? '') >= $since) $recent++;
}
if ($recent >= MAX_PER_HOUR) { flock($fh, LOCK_UN); fclose($fh); fail(429, 'limit'); }

$report = [
    'id'          => bin2hex(random_bytes(8)),
    'time'        => date('c'),
    'title'       => $title,
    'description' => $desc,
    'game'        => $game,
    'name'        => $name,
    'lang'        => $lang,
    'ua'          => $ua,
    'ip'          => $ipHash,
    'status'      => 'neu',
];
fseek($fh, 0, SEEK_END);
fwrite($fh, json_encode($report, JSON_UNESCAPED_UNICODE) . "\n");
fflush($fh);
flock($fh, LOCK_UN);
fclose($fh);

echo json_encode(['ok' => true]);
