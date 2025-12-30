/**
 * IP API Server - Returns ONLY raw IP address
 *
 * Response: Just the IP, nothing else
 * Example: 203.0.113.45
 *
 * Usage:
 *   node server.js
 *   curl http://localhost:3080
 */

import http from 'http';

const PORT = process.env.PORT || 3080;

function getClientIP(req) {
    // Priority: X-Forwarded-For > X-Real-IP > socket
    const xff = req.headers['x-forwarded-for'];
    if (xff) return xff.split(',')[0].trim();

    const xri = req.headers['x-real-ip'];
    if (xri) return xri;

    const cf = req.headers['cf-connecting-ip'];
    if (cf) return cf;

    let ip = req.socket?.remoteAddress || '0.0.0.0';

    // Handle IPv6-mapped IPv4 (::ffff:192.168.1.1)
    if (ip.startsWith('::ffff:')) ip = ip.slice(7);
    if (ip === '::1') ip = '127.0.0.1';

    return ip;
}

const server = http.createServer((req, res) => {
    const ip = getClientIP(req);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    // Return ONLY the IP - nothing else
    res.end(ip);
});

server.listen(PORT, () => {
    console.log(`IP API running on http://localhost:${PORT}`);
    console.log(`Test: curl http://localhost:${PORT}`);
});
