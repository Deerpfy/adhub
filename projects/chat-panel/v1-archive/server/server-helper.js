#!/usr/bin/env node
/**
 * Server Helper - Umožňuje vzdáleně spouštět/ovládat server přes HTTP
 * Tento soubor můžete spustit jednou a pak ho můžete ovládat z webového rozhraní
 */

import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let serverProcess = null;
const HELPER_PORT = 3002;

// Start main server
function startServer() {
    if (serverProcess && !serverProcess.killed) {
        console.log('[Helper] Server už běží');
        return false;
    }
    
    console.log('[Helper] Spouštím server...');
    const serverPath = join(__dirname, 'server.js');
    
    serverProcess = spawn('node', [serverPath], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
    });
    
    serverProcess.on('exit', (code) => {
        console.log(`[Helper] Server ukončen s kódem: ${code}`);
        serverProcess = null;
    });
    
    serverProcess.on('error', (error) => {
        console.error('[Helper] Chyba při spuštění serveru:', error);
        serverProcess = null;
    });
    
    return true;
}

// Stop main server
function stopServer() {
    if (!serverProcess) {
        console.log('[Helper] Server neběží');
        return false;
    }
    
    console.log('[Helper] Zastavuji server...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
    return true;
}

// Check if server is running
function isServerRunning() {
    return serverProcess !== null && !serverProcess.killed;
}

// HTTP server for control
const helperServer = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    
    if (path === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', helper: true }));
        return;
    }
    
    if (path === '/status') {
        const mainServerRunning = isServerRunning();
        res.writeHead(200);
        res.end(JSON.stringify({
            helper: true,
            mainServer: mainServerRunning,
            timestamp: new Date().toISOString()
        }));
        return;
    }
    
    if (path === '/start' && req.method === 'POST') {
        const started = startServer();
        res.writeHead(started ? 200 : 400);
        res.end(JSON.stringify({
            success: started,
            message: started ? 'Server se spouští' : 'Server již běží',
            running: isServerRunning()
        }));
        return;
    }
    
    if (path === '/stop' && req.method === 'POST') {
        const stopped = stopServer();
        res.writeHead(stopped ? 200 : 400);
        res.end(JSON.stringify({
            success: stopped,
            message: stopped ? 'Server se zastavuje' : 'Server neběží',
            running: false
        }));
        return;
    }
    
    if (path === '/restart' && req.method === 'POST') {
        stopServer();
        setTimeout(() => {
            startServer();
        }, 1000);
        res.writeHead(200);
        res.end(JSON.stringify({
            success: true,
            message: 'Server se restartuje'
        }));
        return;
    }
    
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
});

// Start helper server
helperServer.listen(HELPER_PORT, () => {
    console.log('═══════════════════════════════════════════════');
    console.log('🔧 Server Helper běží na portu', HELPER_PORT);
    console.log('📡 HTTP endpoint: http://localhost:' + HELPER_PORT);
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('Použití z webového rozhraní:');
    console.log('  POST http://localhost:' + HELPER_PORT + '/start  - Spustit server');
    console.log('  POST http://localhost:' + HELPER_PORT + '/stop   - Zastavit server');
    console.log('  POST http://localhost:' + HELPER_PORT + '/restart - Restartovat server');
    console.log('  GET  http://localhost:' + HELPER_PORT + '/status - Status serveru');
    console.log('');
    console.log('⚠️  Tento helper musí běžet, aby bylo možné ovládat server z webu.');
    console.log('   Nechte tento proces běžet na pozadí.');
    console.log('');
});

// Graceful shutdown - Helper server should stay running independently
// Only shutdown helper if explicitly requested (Ctrl+C)
// When main server stops/restarts via API, helper stays running
process.on('SIGINT', () => {
    console.log('\n[Helper] Ukončuji helper (Ctrl+C)...');
    console.log('[Helper] Zastavuji hlavní server před ukončením helperu...');
    if (serverProcess) {
        stopServer();
        // Wait a bit for server to stop gracefully
        setTimeout(() => {
            helperServer.close(() => {
                console.log('[Helper] Helper ukončen');
                process.exit(0);
            });
        }, 1000);
    } else {
        helperServer.close(() => {
            console.log('[Helper] Helper ukončen');
            process.exit(0);
        });
    }
});

process.on('SIGTERM', () => {
    console.log('[Helper] Obdržen SIGTERM, ukončuji...');
    if (serverProcess) {
        stopServer();
        setTimeout(() => {
            helperServer.close(() => {
                process.exit(0);
            });
        }, 1000);
    } else {
        helperServer.close(() => {
            process.exit(0);
        });
    }
});

// Prevent helper from closing when main server exits
// Helper is independent and should keep running even if main server stops/restarts
// The main server can be stopped/restarted via API without affecting helper

