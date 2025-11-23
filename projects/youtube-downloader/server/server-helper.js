#!/usr/bin/env node
/**
 * Server Helper - Umožňuje vzdáleně spouštět/ovládat server přes HTTP
 * Tento soubor můžete spustit jednou a pak ho můžete ovládat z webového rozhraní
 */

import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let serverProcess = null;
const HELPER_PORT = 3004; // Používáme 3004 místo 3002 (3002 je pro Chat Panel helper)

// Start main server
function startServer() {
    if (serverProcess && !serverProcess.killed) {
        console.log('[Helper] Server už běží');
        return false;
    }
    
    console.log('[Helper] Spouštím YouTube Downloader server...');
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
    console.log('🔧 YouTube Downloader Server Helper běží na portu', HELPER_PORT);
    console.log('📡 HTTP endpoint: http://localhost:' + HELPER_PORT);
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('Použití z webového rozhraní:');
    console.log('  POST http://localhost:' + HELPER_PORT + '/start  - Spustit server');
    console.log('  POST http://localhost:' + HELPER_PORT + '/stop   - Zastavit server');
    console.log('  POST http://localhost:' + HELPER_PORT + '/restart - Restartovat server');
    console.log('  GET  http://localhost:' + HELPER_PORT + '/status - Status serveru');
    console.log('');
    console.log('⚠️  Nechte tento proces běžet na pozadí!');
    console.log('   Pro ukončení stiskněte Ctrl+C');
    console.log('═══════════════════════════════════════════════');
});

// Cleanup on exit
process.on('SIGINT', () => {
    console.log('\n[Helper] Ukončuji...');
    stopServer();
    helperServer.close(() => {
        console.log('[Helper] Helper server ukončen');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    stopServer();
    helperServer.close(() => {
        process.exit(0);
    });
});

