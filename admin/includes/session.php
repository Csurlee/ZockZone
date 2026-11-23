<?php
// Sichere Admin-Sitzung starten.
// - Cookie nur über HTTPS (secure), für JavaScript unsichtbar (httponly)
// - SameSite=Strict: andere Webseiten können keine Anfragen mit dem Admin-Cookie schicken
// - eigener Name und nur für /admin/ gültig
if (session_status() === PHP_SESSION_NONE) {
    session_name('zzadmin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/admin/',
        'secure'   => true,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    ini_set('session.use_strict_mode', '1');   // keine fremden, unbekannten Sitzungs-Nummern annehmen
    session_start();
}

// ---------- Schutz gegen Passwort-Raten ----------
// Pro Person (Tages-Hash der IP) höchstens LOGIN_MAX_FAILS Fehlversuche in LOGIN_WINDOW Sekunden.
const LOGIN_MAX_FAILS = 5;
const LOGIN_WINDOW    = 900;   // 15 Minuten
const LOGIN_FILE      = '/var/log/zockzone-chat/admin-login-fails.json';

function zz_login_key(): string {
    require_once __DIR__ . '/trusted_proxy.php';
    return substr(hash('sha256', resolve_visitor_ip() . date('Y-m-d') . (defined('VISITOR_HASH_SALT') ? VISITOR_HASH_SALT : '')), 0, 16);
}
function zz_login_fails(): array {
    $d = is_readable(LOGIN_FILE) ? json_decode((string)file_get_contents(LOGIN_FILE), true) : [];
    $now = time(); $out = [];
    foreach ((is_array($d) ? $d : []) as $k => $times) {
        $times = array_values(array_filter((array)$times, fn($t) => $t > $now - LOGIN_WINDOW));
        if ($times) $out[$k] = $times;
    }
    return $out;
}
function zz_login_blocked(): bool {
    return count(zz_login_fails()[zz_login_key()] ?? []) >= LOGIN_MAX_FAILS;
}
function zz_login_failed(): void {
    $d = zz_login_fails(); $d[zz_login_key()][] = time();
    @file_put_contents(LOGIN_FILE, json_encode($d), LOCK_EX);
}
function zz_login_reset(): void {
    $d = zz_login_fails(); unset($d[zz_login_key()]);
    @file_put_contents(LOGIN_FILE, json_encode($d), LOCK_EX);
}
