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

$totals = [
    'today' => period_stats(date('Y-m-d\TH:i:s\Z', strtotime('today'))),
    '7d' => period_stats(date('Y-m-d\TH:i:s\Z', strtotime('-7 days'))),
    '30d' => period_stats(date('Y-m-d\TH:i:s\Z', strtotime('-30 days'))),
    'all' => period_stats(),
];

// Top countries / paths + map points, based on the last 1000 visits.
[, $recent] = sb_request('GET', '/rest/v1/page_visits?select=country,path,lat,lon,city&order=created_at.desc&limit=1000');
$recent = $recent ?? [];

$countryCounts = [];
$pathCounts = [];
$mapPoints = [];
foreach ($recent as $row) {
    if (!empty($row['country'])) $countryCounts[$row['country']] = ($countryCounts[$row['country']] ?? 0) + 1;
    if (!empty($row['path'])) $pathCounts[$row['path']] = ($pathCounts[$row['path']] ?? 0) + 1;
    if ($row['lat'] !== null && $row['lon'] !== null) {
        $mapPoints[] = ['lat' => $row['lat'], 'lon' => $row['lon'], 'city' => $row['city'], 'country' => $row['country']];
    }
}
arsort($countryCounts);
arsort($pathCounts);

function top_n(array $counts, int $n): array {
    $out = [];
    $i = 0;
    foreach ($counts as $key => $count) {
        if ($i++ >= $n) break;
        $out[] = ['label' => $key, 'count' => $count];
    }
    return $out;
}

http_response_code(200);
echo json_encode([
    'totals' => $totals,
    'topCountries' => top_n($countryCounts, 10),
    'topPaths' => top_n($pathCounts, 10),
    'mapPoints' => $mapPoints,
]);
