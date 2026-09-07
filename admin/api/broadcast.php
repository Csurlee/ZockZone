<?php
require_once __DIR__ . '/../includes/api_auth_guard.php';
require_once __DIR__ . '/../includes/supabase_client.php';

set_time_limit(120);

$SETTINGS_FILE = __DIR__ . '/../includes/mail_settings.json';

function bc_read_settings(string $f): array {
    if (!file_exists($f)) return [
        'enabled' => false, 'smtp_host' => '', 'smtp_port' => 587,
        'smtp_encryption' => 'tls', 'smtp_user' => '', 'smtp_password' => '',
        'from_name' => 'ZockZone', 'from_email' => '',
    ];
    return json_decode(file_get_contents($f), true) ?? [];
}

function bc_get_all_users(): array {
    $page = 1; $all = [];
    do {
        [, $d] = sb_request('GET', "/auth/v1/admin/users?page={$page}&per_page=1000");
        $users = $d['users'] ?? [];
        $all   = array_merge($all, $users);
        $page++;
    } while (count($users) === 1000);
    return $all;
}

function bc_smtp_html(array $cfg, string $to, string $subject, string $html): ?string {
    $host     = $cfg['smtp_host'] ?? '';
    $port     = (int)($cfg['smtp_port'] ?? 587);
    $enc      = $cfg['smtp_encryption'] ?? 'tls';
    $user     = $cfg['smtp_user'] ?? '';
    $pass     = $cfg['smtp_password'] ?? '';
    $from     = $cfg['from_email'] ?? '';
    $fromName = $cfg['from_name'] ?? 'ZockZone';

    if (!$host || !$from) return 'SMTP-Host oder Absender-E-Mail fehlt.';
    if ($from === 'noreply@example.com') return 'Absender-E-Mail nicht konfiguriert.';

    $ctx  = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'allow_self_signed' => false]]);
    $sock = @stream_socket_client(($enc === 'ssl' ? 'ssl://' : '') . $host . ':' . $port, $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $ctx);
    if (!$sock) return "Verbindung fehlgeschlagen ($errno): $errstr";
    stream_set_timeout($sock, 15);

    $send = fn($cmd) => fwrite($sock, $cmd . "\r\n");
    $recv = function () use ($sock) {
        $resp = '';
        while (!feof($sock)) {
            $line = fgets($sock, 512);
            if ($line === false) break;
            $resp .= $line;
            if (strlen($line) >= 4 && $line[3] === ' ') break;
        }
        return trim($resp);
    };
    $code = fn($r) => (int)substr(trim($r), 0, 3);

    $recv();
    $send('EHLO localhost'); $recv();

    if ($enc === 'tls') {
        $send('STARTTLS');
        $r = $recv();
        if ($code($r) !== 220) { fclose($sock); return "STARTTLS fehlgeschlagen: $r"; }
        stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        $send('EHLO localhost'); $recv();
    }

    if ($user !== '') {
        $send('AUTH LOGIN'); $recv();
        $send(base64_encode($user)); $recv();
        $send(base64_encode($pass));
        $r = $recv();
        if ($code($r) !== 235) { fclose($sock); return "Auth fehlgeschlagen: $r"; }
    }

    $send("MAIL FROM:<$from>"); $r = $recv();
    if ($code($r) >= 400) { fclose($sock); return "MAIL FROM abgelehnt: $r"; }

    $send("RCPT TO:<$to>"); $r = $recv();
    if ($code($r) >= 400) { fclose($sock); return "RCPT TO abgelehnt: $r"; }

    $send('DATA'); $recv();

    $fromHeader = $fromName ? "\"$fromName\" <$from>" : $from;
    $subjectEnc = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $msg = "Date: " . date('r') . "\r\n"
         . "From: $fromHeader\r\n"
         . "To: $to\r\n"
         . "Subject: $subjectEnc\r\n"
         . "MIME-Version: 1.0\r\n"
         . "Content-Type: text/html; charset=UTF-8\r\n"
         . "\r\n"
         . $html;
    $send($msg . "\r\n."); $r = $recv();
    $send('QUIT');
    fclose($sock);

    if ($code($r) !== 250) return "Senden fehlgeschlagen: $r";
    return null;
}

function bc_build_email(string $icon, string $subject, string $message): string {
    $safeSubject = htmlspecialchars($subject, ENT_QUOTES);
    $safeMessage = nl2br(htmlspecialchars($message, ENT_QUOTES));
    $safeIcon    = htmlspecialchars($icon ?: '📢', ENT_QUOTES);
    return <<<HTML
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{$safeSubject} – ZockZone</title>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#14101F;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#14101F;min-height:100vh;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo -->
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;">
                  <div style="width:14px;height:14px;background:#C6FF3D;border-radius:4px;transform:rotate(20deg);display:inline-block;box-shadow:0 0 16px rgba(198,255,61,0.8);"></div>
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:28px;font-weight:700;color:#F3F1FA;letter-spacing:-0.5px;font-family:'Fredoka','Trebuchet MS',Arial,sans-serif;">ZockZone</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#241D3B;border-radius:18px;border:1px solid rgba(255,255,255,0.08);padding:40px 36px;">

            <!-- Icon -->
            <div style="text-align:center;margin-bottom:24px;">
              <div style="display:inline-block;background:rgba(124,58,237,0.2);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:30px;text-align:center;">
                {$safeIcon}
              </div>
            </div>

            <!-- Headline -->
            <h1 style="margin:0 0 20px;text-align:center;font-size:24px;font-weight:700;color:#F3F1FA;letter-spacing:-0.3px;font-family:'Fredoka','Trebuchet MS',Arial,sans-serif;">
              {$safeSubject}
            </h1>

            <!-- Message body -->
            <div style="font-size:15px;color:#9C93B8;line-height:1.75;text-align:center;">
              {$safeMessage}
            </div>

            <!-- Divider -->
            <div style="border-top:1px solid rgba(255,255,255,0.08);margin:32px 0;"></div>

            <p style="margin:0;font-size:12px;color:#9C93B8;text-align:center;">
              Du erhältst diese E-Mail als registrierter ZockZone-Nutzer.
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top:24px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9C93B8;">
              &copy; 2026 ZockZone &mdash; <a href="https://zockzone.hackthelab.uk" style="color:#7C3AED;text-decoration:none;">zockzone.hackthelab.uk</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
HTML;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Return recipient count (non-admin users)
    $users = bc_get_all_users();
    [, $profiles] = sb_request('GET', '/rest/v1/profiles?select=id,role');
    $adminIds = [];
    foreach (($profiles ?? []) as $p) {
        if (($p['role'] ?? 'user') === 'admin') $adminIds[$p['id']] = true;
    }
    $recipients = array_filter($users, fn($u) => !isset($adminIds[$u['id']]) && !empty($u['email']));
    http_response_code(200);
    echo json_encode(['count' => count($recipients)]);
    exit;
}

if ($method === 'POST') {
    $input  = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? 'send';

    $icon    = trim($input['icon']    ?? '📢');
    $subject = trim($input['subject'] ?? '');
    $message = trim($input['message'] ?? '');

    if ($action === 'preview') {
        if (!$subject || !$message) { http_response_code(400); echo json_encode(['error' => 'Betreff und Nachricht erforderlich']); exit; }
        http_response_code(200);
        echo json_encode(['html' => bc_build_email($icon, $subject, $message)]);
        exit;
    }

    if ($action === 'send') {
        if (!$subject || !$message) { http_response_code(400); echo json_encode(['error' => 'Betreff und Nachricht erforderlich']); exit; }

        $cfg = bc_read_settings($SETTINGS_FILE);
        if (!($cfg['enabled'] ?? false)) { http_response_code(503); echo json_encode(['error' => 'E-Mail-Versand ist deaktiviert. Bitte erst unter E-Mail aktivieren.']); exit; }

        $users = bc_get_all_users();
        [, $profiles] = sb_request('GET', '/rest/v1/profiles?select=id,role');
        $adminIds = [];
        foreach (($profiles ?? []) as $p) {
            if (($p['role'] ?? 'user') === 'admin') $adminIds[$p['id']] = true;
        }
        $recipients = array_filter($users, fn($u) => !isset($adminIds[$u['id']]) && !empty($u['email']));

        $html   = bc_build_email($icon, $subject, $message);
        $sent   = 0;
        $errors = [];

        foreach ($recipients as $u) {
            $err = bc_smtp_html($cfg, $u['email'], $subject, $html);
            if ($err) {
                $errors[] = $u['email'] . ': ' . $err;
            } else {
                $sent++;
            }
        }

        http_response_code(200);
        echo json_encode(['ok' => true, 'sent' => $sent, 'errors' => $errors]);
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'Methode nicht erlaubt']);
