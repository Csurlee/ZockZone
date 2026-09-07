<?php
require_once __DIR__ . '/../includes/api_auth_guard.php';
require_once __DIR__ . '/../includes/supabase_client.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405); echo json_encode(['error' => 'Methode nicht erlaubt']); exit;
}

function period_stats(string $sinceIso = null): array {
    $path = '/rest/v1/page_visits?select=visitor_hash';
    if ($sinceIso) $path .= '&created_at=gte.' . rawurlencode($sinceIso);
    [, $rows] = sb_request('GET', $path);
    $rows = $rows ?? [];
    $unique = count(array_unique(array_column($rows, 'visitor_hash')));
    return ['visits' => count($rows), 'unique' => $unique];
}

function detect_device(string $ua): string {
    if (preg_match('/tablet|ipad/i', $ua)) return 'Tablet';
    if (preg_match('/mobile|android|iphone|ipod|blackberry|windows phone/i', $ua)) return 'Mobile';
    return 'Desktop';
}

function detect_browser(string $ua): string {
    if (preg_match('/Edg\//i', $ua))          return 'Edge';
    if (preg_match('/OPR\/|Opera/i', $ua))    return 'Opera';
    if (preg_match('/Chrome\//i', $ua))        return 'Chrome';
    if (preg_match('/Firefox\//i', $ua))       return 'Firefox';
    if (preg_match('/Safari\//i', $ua))        return 'Safari';
    return 'Andere';
}

function detect_source(string $referrer): string {
    if (empty($referrer)) return 'Direkt';
    if (preg_match('/google\./i', $referrer))                                    return 'Google';
    if (preg_match('/bing\.|yahoo\.|duckduckgo\.|ecosia\./i', $referrer))       return 'Suchmaschinen';
    if (preg_match('/facebook\.|instagram\.|twitter\.|t\.co|tiktok\./i', $referrer)) return 'Social Media';
    return 'Andere';
}

function top_n(array $counts, int $n): array {
    arsort($counts);
    $out = []; $i = 0;
    foreach ($counts as $key => $count) {
        if ($i++ >= $n) break;
        $out[] = ['label' => $key, 'count' => $count];
    }
    return $out;
}

$totals = [
    'today' => period_stats(date('Y-m-d\TH:i:s\Z', strtotime('today'))),
    '7d'    => period_stats(date('Y-m-d\TH:i:s\Z', strtotime('-7 days'))),
    '30d'   => period_stats(date('Y-m-d\TH:i:s\Z', strtotime('-30 days'))),
    'all'   => period_stats(),
];

// Last 2000 visits with all fields needed for analysis
[, $recent] = sb_request('GET', '/rest/v1/page_visits?select=country,path,lat,lon,city,user_agent,referrer,visitor_hash,created_at&order=created_at.desc&limit=2000');
$recent = $recent ?? [];

$countryCounts  = [];
$pathCounts     = [];
$cityCounts     = [];
$mapPoints      = [];
$deviceCounts   = [];
$browserCounts  = [];
$sourceCounts   = [];
$hourly         = array_fill(0, 24, 0);
$hashDays       = []; // visitor_hash -> set of days

foreach ($recent as $row) {
    if (!empty($row['country'])) $countryCounts[$row['country']] = ($countryCounts[$row['country']] ?? 0) + 1;
    if (!empty($row['path']))    $pathCounts[$row['path']]       = ($pathCounts[$row['path']]    ?? 0) + 1;
    if (!empty($row['city']))    $cityCounts[$row['city']]       = ($cityCounts[$row['city']]    ?? 0) + 1;

    if ($row['lat'] !== null && $row['lon'] !== null) {
        $mapPoints[] = ['lat' => $row['lat'], 'lon' => $row['lon'], 'city' => $row['city'], 'country' => $row['country']];
    }

    $ua  = $row['user_agent'] ?? '';
    $ref = $row['referrer']   ?? '';
    $dev = detect_device($ua);
    $br  = detect_browser($ua);
    $src = detect_source($ref);
    $deviceCounts[$dev]  = ($deviceCounts[$dev]  ?? 0) + 1;
    $browserCounts[$br]  = ($browserCounts[$br]  ?? 0) + 1;
    $sourceCounts[$src]  = ($sourceCounts[$src]  ?? 0) + 1;

    // Hourly distribution
    if (!empty($row['created_at'])) {
        $h = (int) date('G', strtotime($row['created_at']));
        $hourly[$h]++;
    }

    // New vs returning: track which days each hash appeared
    if (!empty($row['visitor_hash']) && !empty($row['created_at'])) {
        $day = substr($row['created_at'], 0, 10);
        $hashDays[$row['visitor_hash']][$day] = true;
    }
}

// New = hash appears on only 1 day in dataset; returning = multiple days
$newCount = 0; $returningCount = 0;
foreach ($hashDays as $days) {
    if (count($days) > 1) $returningCount++;
    else $newCount++;
}

arsort($deviceCounts);
arsort($browserCounts);
arsort($sourceCounts);

http_response_code(200);
echo json_encode([
    'totals'         => $totals,
    'topCountries'   => top_n($countryCounts, 10),
    'topPaths'       => top_n($pathCounts, 10),
    'topCities'      => top_n($cityCounts, 10),
    'mapPoints'      => $mapPoints,
    'devices'        => $deviceCounts,
    'browsers'       => $browserCounts,
    'sources'        => $sourceCounts,
    'hourly'         => array_values($hourly),
    'newVsReturning' => ['Neu' => $newCount, 'Wiederkehrend' => $returningCount],
]);
