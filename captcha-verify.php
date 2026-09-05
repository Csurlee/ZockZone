<?php
header('Content-Type: application/json');

$token = json_decode(file_get_contents('php://input'), true)['token'] ?? '';
if (!$token) { echo json_encode(['ok' => false]); exit; }

require_once __DIR__ . '/admin/includes/config.php';
$secret = defined('TURNSTILE_SECRET_KEY') ? TURNSTILE_SECRET_KEY : '';
if (!$secret) { echo json_encode(['ok' => false, 'error' => 'not configured']); exit; }

$ch = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => http_build_query(['secret' => $secret, 'response' => $token]),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 5,
]);
$data = json_decode(curl_exec($ch), true);
curl_close($ch);

echo json_encode(['ok' => $data['success'] ?? false]);
