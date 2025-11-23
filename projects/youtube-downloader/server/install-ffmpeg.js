#!/usr/bin/env node
/**
 * Automatická instalace ffmpeg pro Windows
 */

import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import fs from 'fs';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SYSTEM32_PATH = 'C:\\Windows\\System32';
const FFMPEG_URL = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';

async function checkFfmpegInstalled() {
    try {
        await execPromise('ffmpeg -version');
        return true;
    } catch (error) {
        return false;
    }
}

async function installViaWinget() {
    console.log('[FFmpeg Install] Zkouším instalaci přes winget...');
    try {
        const { stdout } = await execPromise('winget install ffmpeg');
        console.log('[FFmpeg Install] Winget output:', stdout);
        return true;
    } catch (error) {
        console.error('[FFmpeg Install] Winget selhal:', error.message);
        return false;
    }
}

async function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = createWriteStream(filepath);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Redirect
                return downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlinkSync(filepath);
            reject(err);
        });
    });
}

async function extractZip(zipPath, extractPath) {
    // Pro jednoduchost použijeme PowerShell Expand-Archive
    try {
        await execPromise(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force"`);
        return true;
    } catch (error) {
        console.error('[FFmpeg Install] Rozbalení ZIP selhalo:', error.message);
        return false;
    }
}

async function findFfmpegInExtractedFolder(extractPath) {
    // Hledáme ffmpeg.exe v rozbalené složce
    const possiblePaths = [
        join(extractPath, 'ffmpeg-*-essentials_build', 'bin', 'ffmpeg.exe'),
        join(extractPath, 'ffmpeg', 'bin', 'ffmpeg.exe'),
        join(extractPath, 'bin', 'ffmpeg.exe'),
    ];
    
    // Pro jednoduchost zkusíme najít přes PowerShell
    try {
        const { stdout } = await execPromise(`powershell -Command "Get-ChildItem -Path '${extractPath}' -Recurse -Filter 'ffmpeg.exe' | Select-Object -First 1 -ExpandProperty FullName"`);
        const path = stdout.trim();
        if (path && fs.existsSync(path)) {
            return path;
        }
    } catch (error) {
        // Ignorujeme
    }
    
    return null;
}

async function copyToSystem32(sourcePath) {
    try {
        const targetPath = join(SYSTEM32_PATH, 'ffmpeg.exe');
        await execPromise(`copy "${sourcePath}" "${targetPath}"`);
        console.log('[FFmpeg Install] ffmpeg.exe zkopírován do System32');
        return true;
    } catch (error) {
        console.error('[FFmpeg Install] Kopírování selhalo:', error.message);
        return false;
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════');
    console.log('🔧 Automatická instalace ffmpeg');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    
    // Kontrola, zda už není nainstalovaný
    console.log('[FFmpeg Install] Kontroluji instalaci ffmpeg...');
    const installed = await checkFfmpegInstalled();
    
    if (installed) {
        console.log('✅ ffmpeg je již nainstalován!');
        return;
    }
    
    console.log('❌ ffmpeg není nainstalován');
    console.log('');
    
    // Zkusíme winget
    console.log('[FFmpeg Install] Zkouším instalaci přes winget...');
    const wingetSuccess = await installViaWinget();
    
    if (wingetSuccess) {
        const verify = await checkFfmpegInstalled();
        if (verify) {
            console.log('✅ ffmpeg úspěšně nainstalován přes winget!');
            return;
        }
    }
    
    console.log('[FFmpeg Install] Winget selhal nebo není dostupný.');
    console.log('');
    console.log('⚠️  Automatická instalace přes stahování ZIP není plně implementována.');
    console.log('');
    console.log('MANUÁLNÍ INSTALACE:');
    console.log('1. Stáhněte z: https://www.gyan.dev/ffmpeg/builds/');
    console.log('2. Rozbalte ZIP');
    console.log('3. Zkopírujte ffmpeg.exe do C:\\Windows\\System32');
    console.log('4. Nebo použijte: choco install ffmpeg (pokud máte Chocolatey)');
    console.log('');
}

// Spustit pokud je volán přímo
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { checkFfmpegInstalled, installViaWinget };






