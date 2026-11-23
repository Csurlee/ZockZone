<?php
// 🛡️ SICHERHEITS-SCHILDE für alle PHP-Seiten (Admin + Problem melden + Besucher-Zähler)
// Der Browser bekommt hier Regeln mit, was er erlauben darf und was nicht.
if (!headers_sent()) {
    header('X-Frame-Options: DENY');                         // keine fremde Seite darf uns in einen Rahmen packen (Klick-Falle)
    header('X-Content-Type-Options: nosniff');               // Browser soll nicht raten, was eine Datei ist
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    header('Cross-Origin-Opener-Policy: same-origin');
    header('Strict-Transport-Security: max-age=31536000');   // immer nur über HTTPS (Schloss-Symbol)
    header("Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
    header_remove('X-Powered-By');                           // nicht verraten, welche PHP-Version läuft
}
