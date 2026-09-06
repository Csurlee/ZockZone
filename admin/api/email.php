<?php
require_once __DIR__ . '/../includes/api_auth_guard.php';

$SETTINGS_FILE = __DIR__ . '/../includes/mail_settings.json';

function read_mail_settings(string $file): array {
    if(!file_exists($file)) return [
        'enabled'          => false,
        'smtp_host'        => '',
        'smtp_port'        => 587,
        'smtp_encryption'  => 'tls',
        'smtp_user'        => '',
        'smtp_password'    => '',
        'from_name'        => 'ZockZone',
        'from_email'       => '',
    ];
    return json_decode(file_get_contents($file), true) ?? [];
}

function smtp_send(array $cfg, string $to, string $subject, string $body): ?string {
    $host = $cfg['smtp_host'] ?? '';
    $port = (int)($cfg['smtp_port'] ?? 587);
    $enc  = $cfg['smtp_encryption'] ?? 'tls';
    $user = $cfg['smtp_user'] ?? '';
    $pass = $cfg['smtp_password'] ?? '';
    $from = $cfg['from_email'] ?? '';
    $fromName = $cfg['from_name'] ?? '';

    if(!$host || !$from) return 'SMTP-Host oder Absender-E-Mail fehlt.';
    if($from === 'noreply@example.com') return 'Bitte Absender-E-Mail konfigurieren (noch Platzhalter).';

    $ctx = stream_context_create(['ssl' => [
        'verify_peer'       => true,
        'verify_peer_name'  => true,
        'allow_self_signed' => false,
    ]]);

    $scheme = ($enc === 'ssl') ? 'ssl://' : '';
    $sock = @stream_socket_client($scheme . $host . ':' . $port, $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $ctx);
    if(!$sock) return "Verbindung fehlgeschlagen ($errno): $errstr";

    stream_set_timeout($sock, 15);

    $send = fn($cmd) => fwrite($sock, $cmd . "\r\n");
    $recv = function() use ($sock) {
        $resp = '';
        while(!feof($sock)) {
            $line = fgets($sock, 512);
            if($line === false) break;
            $resp .= $line;
            if(strlen($line) >= 4 && $line[3] === ' ') break;
        }
        return trim($resp);
    };

    $code = fn($r) => (int)substr(trim($r), 0, 3);

    $recv(); // banner
    $send('EHLO localhost');
    $recv();

    if($enc === 'tls') {
        $send('STARTTLS');
        $r = $recv();
        if($code($r) !== 220) { fclose($sock); return "STARTTLS fehlgeschlagen: $r"; }
        stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        $send('EHLO localhost');
        $recv();
    }

    if($user !== '') {
        $send('AUTH LOGIN');
        $recv();
        $send(base64_encode($user));
        $recv();
        $send(base64_encode($pass));
        $r = $recv();
        if($code($r) !== 235) { fclose($sock); return "Authentifizierung fehlgeschlagen: $r"; }
    }

    $send("MAIL FROM:<$from>");
    $r = $recv();
    if($code($r) >= 400) { fclose($sock); return "MAIL FROM abgelehnt: $r"; }

    $send("RCPT TO:<$to>");
    $r = $recv();
    if($code($r) >= 400) { fclose($sock); return "RCPT TO abgelehnt: $r"; }

    $send('DATA');
    $recv();

    $fromHeader = $fromName ? "\"$fromName\" <$from>" : $from;
    $date = date('r');
    $msg  = "Date: $date\r\n"
          . "From: $fromHeader\r\n"
          . "To: $to\r\n"
          . "Subject: $subject\r\n"
          . "MIME-Version: 1.0\r\n"
          . "Content-Type: text/plain; charset=UTF-8\r\n"
          . "\r\n"
          . $body;
    $send($msg . "\r\n.");
    $r = $recv();

    $send('QUIT');
    fclose($sock);

    if($code($r) !== 250) return "Senden fehlgeschlagen: $r";
    return null;
}

$method = $_SERVER['REQUEST_METHOD'];

if($method === 'GET') {
    $s = read_mail_settings($SETTINGS_FILE);
    if($s['smtp_password'] !== '') $s['smtp_password'] = '••••••••';
    http_response_code(200);
    echo json_encode($s);
    exit;
}

if($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? 'save';

    if($action === 'save') {
        $current = read_mail_settings($SETTINGS_FILE);
        $new = [
            'enabled'         => (bool)($input['enabled'] ?? $current['enabled']),
            'smtp_host'       => trim($input['smtp_host'] ?? $current['smtp_host']),
            'smtp_port'       => (int)($input['smtp_port'] ?? $current['smtp_port']),
            'smtp_encryption' => in_array($input['smtp_encryption'] ?? '', ['tls','ssl','none'])
                                 ? $input['smtp_encryption'] : $current['smtp_encryption'],
            'smtp_user'       => trim($input['smtp_user'] ?? $current['smtp_user']),
            'smtp_password'   => (isset($input['smtp_password']) && $input['smtp_password'] !== '' && $input['smtp_password'] !== '••••••••')
                                 ? $input['smtp_password'] : $current['smtp_password'],
            'from_name'       => trim($input['from_name'] ?? $current['from_name']),
            'from_email'      => trim($input['from_email'] ?? $current['from_email']),
        ];
        file_put_contents($SETTINGS_FILE, json_encode($new, JSON_PRETTY_PRINT));
        http_response_code(200);
        echo json_encode(['ok' => true]);
        exit;
    }

    if($action === 'toggle') {
        $current = read_mail_settings($SETTINGS_FILE);
        $current['enabled'] = (bool)($input['enabled'] ?? !$current['enabled']);
        file_put_contents($SETTINGS_FILE, json_encode($current, JSON_PRETTY_PRINT));
        http_response_code(200);
        echo json_encode(['ok' => true, 'enabled' => $current['enabled']]);
        exit;
    }

    if($action === 'test') {
        $s = read_mail_settings($SETTINGS_FILE);
        $to = trim($input['to'] ?? '');
        if(!$to) { http_response_code(400); echo json_encode(['error' => 'Empfänger fehlt']); exit; }
        $err = smtp_send(
            $s,
            $to,
            'ZockZone — E-Mail Test',
            "Dies ist eine Test-E-Mail vom ZockZone Admin-Panel.\n\nWenn du diese Nachricht siehst, funktioniert der E-Mail-Versand korrekt."
        );
        if($err) {
            http_response_code(502);
            echo json_encode(['error' => $err]);
        } else {
            http_response_code(200);
            echo json_encode(['ok' => true]);
        }
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'Methode nicht erlaubt']);
