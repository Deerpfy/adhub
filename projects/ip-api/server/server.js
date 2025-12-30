/**
 * IP API Server - Self-hosted ipify alternative
 * Returns client's public IP address in various formats
 *
 * Endpoints:
 *   GET /           - Returns IP as plain text (default)
 *   GET /?format=json    - Returns {"ip": "x.x.x.x"}
 *   GET /?format=jsonp&callback=fn - Returns fn({"ip": "x.x.x.x"})
 *   GET /json       - Alias for ?format=json
 *   GET /health     - Health check endpoint
 *
 * Usage:
 *   npm install
 *   npm start
 *
 * Environment:
 *   PORT - Server port (default: 3080)
 *   TRUST_PROXY - Trust X-Forwarded-For headers (default: true)
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3080;
const TRUST_PROXY = process.env.TRUST_PROXY !== 'false';

// Trust proxy headers (for reverse proxy setups like nginx)
if (TRUST_PROXY) {
    app.set('trust proxy', true);
}

// CORS - allow all origins (like ipify)
app.use(cors({
    origin: '*',
    methods: ['GET'],
    allowedHeaders: ['Content-Type']
}));

// Serve static files (documentation page)
app.use(express.static(join(__dirname, '../')));

// ============================================
// IP DETECTION
// ============================================

/**
 * Extract client IP address from request
 * Priority: X-Forwarded-For > X-Real-IP > connection.remoteAddress
 */
function getClientIP(req) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // Get the first (original client) IP
        const ips = forwardedFor.split(',').map(ip => ip.trim());
        return ips[0];
    }

    // X-Real-IP header (nginx)
    const realIP = req.headers['x-real-ip'];
    if (realIP) {
        return realIP;
    }

    // CF-Connecting-IP (Cloudflare)
    const cfIP = req.headers['cf-connecting-ip'];
    if (cfIP) {
        return cfIP;
    }

    // True-Client-IP (Akamai, Cloudflare Enterprise)
    const trueClientIP = req.headers['true-client-ip'];
    if (trueClientIP) {
        return trueClientIP;
    }

    // Express req.ip (uses trust proxy setting)
    if (req.ip) {
        return req.ip;
    }

    // Direct connection
    return req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.connection?.socket?.remoteAddress ||
           '0.0.0.0';
}

/**
 * Normalize IP address (handle IPv6-mapped IPv4)
 */
function normalizeIP(ip) {
    if (!ip) return '0.0.0.0';

    // Handle IPv6-mapped IPv4 (::ffff:192.168.1.1)
    if (ip.startsWith('::ffff:')) {
        return ip.substring(7);
    }

    // Handle localhost
    if (ip === '::1') {
        return '127.0.0.1';
    }

    return ip;
}

// ============================================
// API ROUTES
// ============================================

/**
 * Main IP endpoint
 * Supports: text (default), json, jsonp formats
 */
function handleIPRequest(req, res) {
    const rawIP = getClientIP(req);
    const ip = normalizeIP(rawIP);
    const format = req.query.format || 'text';
    const callback = req.query.callback;

    // Set common headers
    res.set('X-IP-Address', ip);
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    switch (format.toLowerCase()) {
        case 'json':
            res.set('Content-Type', 'application/json; charset=utf-8');
            res.json({ ip });
            break;

        case 'jsonp':
            if (!callback) {
                res.status(400).json({ error: 'callback parameter required for JSONP' });
                return;
            }
            // Sanitize callback name (prevent XSS)
            const safeCallback = callback.replace(/[^a-zA-Z0-9_$]/g, '');
            res.set('Content-Type', 'application/javascript; charset=utf-8');
            res.send(`${safeCallback}(${JSON.stringify({ ip })});`);
            break;

        case 'text':
        default:
            res.set('Content-Type', 'text/plain; charset=utf-8');
            res.send(ip);
            break;
    }

    // Log request (optional, disable in production)
    console.log(`[${new Date().toISOString()}] ${ip} -> ${format}`);
}

// Main endpoint
app.get('/api', handleIPRequest);
app.get('/api/', handleIPRequest);

// JSON alias
app.get('/api/json', (req, res) => {
    req.query.format = 'json';
    handleIPRequest(req, res);
});

// IPv4 only endpoint (for future IPv6 filtering)
app.get('/api/v4', handleIPRequest);
app.get('/api/v6', handleIPRequest);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// Info endpoint
app.get('/api/info', (req, res) => {
    const rawIP = getClientIP(req);
    const ip = normalizeIP(rawIP);

    res.json({
        ip,
        headers: {
            'x-forwarded-for': req.headers['x-forwarded-for'] || null,
            'x-real-ip': req.headers['x-real-ip'] || null,
            'cf-connecting-ip': req.headers['cf-connecting-ip'] || null,
            'user-agent': req.headers['user-agent'] || null
        },
        connection: {
            remoteAddress: req.socket?.remoteAddress || null,
            protocol: req.protocol,
            secure: req.secure
        }
    });
});

// ============================================
// STATIC PAGES
// ============================================

// Serve documentation page
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, '../index.html'));
});

// API-only page (just IP, like api.ipify.org)
app.get('/ip', (req, res) => {
    res.sendFile(join(__dirname, '../ip.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'Use /api for IP address or /api?format=json for JSON'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Error]', err.message);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// ============================================
// SERVER START
// ============================================

app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                    IP API Server                         ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Server running on: http://localhost:${PORT}               ║`);
    console.log('║                                                          ║');
    console.log('║  Endpoints:                                              ║');
    console.log('║    GET /api           - IP as plain text                 ║');
    console.log('║    GET /api?format=json - IP as JSON                     ║');
    console.log('║    GET /api/json      - IP as JSON (alias)               ║');
    console.log('║    GET /api/info      - Full request info                ║');
    console.log('║    GET /api/health    - Health check                     ║');
    console.log('║                                                          ║');
    console.log('║  Documentation: http://localhost:' + PORT + '/                 ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
});

export default app;
