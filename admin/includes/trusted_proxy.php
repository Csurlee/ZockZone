<?php
// Only trust the CF-Connecting-IP header when the request actually came through
// Cloudflare's edge (i.e. REMOTE_ADDR is one of Cloudflare's published IP ranges).
// Otherwise the header is attacker-controlled and must be ignored.
// Ranges from https://www.cloudflare.com/ips-v4 / ips-v6.

const CLOUDFLARE_CIDRS = [
    '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
    '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
    '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
    '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
    '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32',
    '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
];

function ip_in_cidr(string $ip, string $cidr): bool {
    [$subnet, $bits] = array_pad(explode('/', $cidr, 2), 2, null);
    $bits = (int)$bits;
    $ipBin = @inet_pton($ip);
    $subnetBin = @inet_pton($subnet);
    if ($ipBin === false || $subnetBin === false || strlen($ipBin) !== strlen($subnetBin)) return false;

    $bytes = intdiv($bits, 8);
    $remainderBits = $bits % 8;
    if ($bytes > 0 && substr($ipBin, 0, $bytes) !== substr($subnetBin, 0, $bytes)) return false;
    if ($remainderBits === 0) return true;

    $mask = (~(0xFF >> $remainderBits)) & 0xFF;
    return (ord($ipBin[$bytes]) & $mask) === (ord($subnetBin[$bytes]) & $mask);
}

function is_cloudflare_ip(string $ip): bool {
    foreach (CLOUDFLARE_CIDRS as $cidr) {
        if (ip_in_cidr($ip, $cidr)) return true;
    }
    return false;
}

// Resolves the real visitor IP: only honors CF-Connecting-IP when the direct
// peer (REMOTE_ADDR) is actually a Cloudflare edge IP; otherwise a client could
// forge that header by connecting straight to the origin and spoof any IP.
function resolve_visitor_ip(): string {
    $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '';
    if (isset($_SERVER['HTTP_CF_CONNECTING_IP']) && is_cloudflare_ip($remoteAddr)) {
        return $_SERVER['HTTP_CF_CONNECTING_IP'];
    }
    return $remoteAddr;
}
