<?php
// Public, unauthenticated visitor-tracking beacon. Called fire-and-forget from
// js/core.js on every page load. Must never break or slow down the site for
// visitors -- every failure path still responds 200 with {ok:...}.
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/admin/includes/supabase_client.php';
    require_once __DIR__ . '/admin/includes/trusted_proxy.php';

    $ip = resolve_visitor_ip();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $path = substr((string)($input['path'] ?? ''), 0, 200);
    $referrer = substr((string)($input['referrer'] ?? ''), 0, 200);
    $userAgent = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 300);

    $visitorHash = hash('sha256', $ip . date('Y-m-d') . VISITOR_HASH_SALT);

    $isPublicIp = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;

    $country = null; $region = null; $city = null; $lat = null; $lon = null;

    if ($isPublicIp) {
        $geo = @file_get_contents(
            "http://ip-api.com/json/{$ip}?fields=status,country,regionName,city,lat,lon",
            false,
            stream_context_create(['http' => ['timeout' => 3]])
        );
        $geoData = $geo ? json_decode($geo, true) : null;
        if ($geoData && ($geoData['status'] ?? '') === 'success') {
            $country = $geoData['country'] ?? null;
            $region = $geoData['regionName'] ?? null;
            $city = $geoData['city'] ?? null;
            $lat = $geoData['lat'] ?? null;
            $lon = $geoData['lon'] ?? null;
        } else {
            $country = $_SERVER['HTTP_CF_IPCOUNTRY'] ?? null;
        }
    }

    sb_request('POST', '/rest/v1/page_visits', [
        'visitor_hash' => $visitorHash,
        'ip_address' => $ip,
        'country' => $country, 'region' => $region, 'city' => $city,
        'lat' => $lat, 'lon' => $lon,
        'path' => $path, 'user_agent' => $userAgent, 'referrer' => $referrer,
    ]);

    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    echo json_encode(['ok' => false]);
}
