<?php
require_once __DIR__ . '/config.php';

/**
 * Calls the Supabase API (PostgREST or GoTrue admin) with the service_role key,
 * which bypasses Postgres RLS entirely. Never expose this key to the browser.
 *
 * @return array{0:int,1:mixed} [httpStatus, decodedJsonBodyOrNull]
 */
function sb_user_login(string $email, string $password): array {
    $ch = curl_init(SUPABASE_URL . '/auth/v1/token?grant_type=password');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'apikey: ' . SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode(['email' => $email, 'password' => $password]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$status, $response ? json_decode($response, true) : null];
}

function sb_request(string $method, string $path, ?array $body = null, array $extraHeaders = []): array {
    $ch = curl_init(SUPABASE_URL . $path);
    $headers = array_merge([
        'apikey: ' . SUPABASE_SERVICE_ROLE_KEY,
        'Authorization: Bearer ' . SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type: application/json',
    ], $extraHeaders);

    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $decoded = null;
    if ($response !== false && $response !== '') {
        $decoded = json_decode($response, true);
    }
    return [$status, $decoded];
}
