<?php
// Cron-Job: Konten löschen, die seit 10+ Tagen zur Löschung vorgemerkt sind
// Läuft täglich via Systemcron (z.B. 3:00 Uhr nachts)
// Setup: sudo crontab -e → 0 3 * * * php /var/www/zockzone/admin/cron/delete_accounts.php >> /var/log/zz_delete.log 2>&1

require_once dirname(__DIR__) . '/includes/config.php';
require_once dirname(__DIR__) . '/includes/supabase_client.php';

$cutoff = date('c', strtotime('-10 days'));

// Alle Konten finden, die seit 10+ Tagen zur Löschung vorgemerkt sind
[$status, $rows] = sb_request('GET',
    '/rest/v1/profiles?select=id,email,display_name,deletion_requested_at'
    . '&deletion_requested_at=lte.' . urlencode($cutoff)
    . '&deletion_requested_at=not.is.null'
);

if ($status !== 200 || !is_array($rows)) {
    echo "[" . date('Y-m-d H:i:s') . "] FEHLER: Profile konnten nicht geladen werden (HTTP $status)\n";
    exit(1);
}

if (empty($rows)) {
    echo "[" . date('Y-m-d H:i:s') . "] Keine Konten zur Löschung gefunden.\n";
    exit(0);
}

foreach ($rows as $row) {
    $uid   = $row['id']           ?? '?';
    $email = $row['email']        ?? '?';
    $name  = $row['display_name'] ?? '?';
    $since = $row['deletion_requested_at'] ?? '?';

    // Konto über Supabase Admin API löschen
    [$delStatus] = sb_request('DELETE', '/auth/v1/admin/users/' . $uid);

    if ($delStatus === 200 || $delStatus === 204) {
        echo "[" . date('Y-m-d H:i:s') . "] GELÖSCHT: $email ($name, ID=$uid, angefragt: $since)\n";
    } else {
        echo "[" . date('Y-m-d H:i:s') . "] FEHLER beim Löschen von $email ($uid): HTTP $delStatus\n";
    }
}
