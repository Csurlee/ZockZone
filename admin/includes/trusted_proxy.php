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

// Returns true when REMOTE_ADDR is a private/loopback address — which means
// the request arrived via Cloudflare Tunnel (cloudflared daemon runs locally
// and forwards traffic; the origin never gets a public REMOTE_ADDR in this
// setup). In that case CF-Connecting-IP is still trustworthy because the
// tunnel blocks all direct external connections to the origin.
function is_private_ip(string $ip): bool {
    // A valid IP that fails the "no private/reserved range" check IS private.
    return filter_var($ip, FILTER_VALIDATE_IP) !== false
        && filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;
}

// Resolves the real visitor IP: honors CF-Connecting-IP when the direct peer
// (REMOTE_ADDR) is either a Cloudflare edge IP (traditional Cloudflare proxy)
// or a private/loopback IP (Cloudflare Tunnel). In both cases the header is
// set by Cloudflare and cannot be forged by an external attacker.
function resolve_visitor_ip(): string {
    $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '';
    if (isset($_SERVER['HTTP_CF_CONNECTING_IP'])
        && (is_cloudflare_ip($remoteAddr) || is_private_ip($remoteAddr))) {
        return $_SERVER['HTTP_CF_CONNECTING_IP'];
    }
    return $remoteAddr;
}
