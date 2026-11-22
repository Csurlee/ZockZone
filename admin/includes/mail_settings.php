<?php
// E-Mail-Einstellungen (SMTP) lesen und speichern.
//
// Die Einstellungen enthalten das SMTP-Passwort. Früher lagen sie als
// mail_settings.json im Webroot und konnten von jedem heruntergeladen werden.
// Jetzt liegen sie in mail_settings.secret.php: Die erste Zeile beendet das Skript sofort
// (PHP-Befehl "exit"), daher liefert der Webserver beim direkten Aufruf nur eine leere Seite.
// Achtung: Das Zeichen "?" gefolgt von ">" darf in PHP-Kommentaren nicht vorkommen.

const MAIL_SETTINGS_FILE   = __DIR__ . '/mail_settings.secret.php';
const MAIL_SETTINGS_GUARD  = "<?php exit; ?" . ">\n";   // in zwei Teilen, damit PHP nicht stolpert

function mail_settings_defaults(): array {
    return [
        'enabled'         => false,
        'smtp_host'       => '',
        'smtp_port'       => 587,
        'smtp_encryption' => 'tls',
        'smtp_user'       => '',
        'smtp_password'   => '',
        'from_name'       => 'ZockZone',
        'from_email'      => '',
    ];
}

function mail_settings_read(): array {
    if (!is_file(MAIL_SETTINGS_FILE)) return mail_settings_defaults();
    $raw = (string)file_get_contents(MAIL_SETTINGS_FILE);
    if (strncmp($raw, MAIL_SETTINGS_GUARD, strlen(MAIL_SETTINGS_GUARD)) === 0) {
        $raw = substr($raw, strlen(MAIL_SETTINGS_GUARD));
    }
    $data = json_decode($raw, true);
    return is_array($data) ? array_merge(mail_settings_defaults(), $data) : mail_settings_defaults();
}

function mail_settings_write(array $settings): bool {
    return file_put_contents(
        MAIL_SETTINGS_FILE,
        MAIL_SETTINGS_GUARD . json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    ) !== false;
}
