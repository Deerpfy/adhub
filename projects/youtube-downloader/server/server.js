import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../')));

// Složka pro stahované soubory
const DOWNLOADS_DIR = join(__dirname, '../downloads');
fs.ensureDirSync(DOWNLOADS_DIR);

// Složka rozšíření
const EXTENSION_DIR = join(__dirname, '../extension');

// =========================================
// API pro stažení rozšíření jako ZIP
// =========================================

app.get('/api/extension/download', async (req, res) => {
    try {
        // Kontrola, zda složka extension existuje
        if (!fs.existsSync(EXTENSION_DIR)) {
            return res.status(404).json({ error: 'Extension folder not found' });
        }

        // Nastavení hlaviček pro stažení
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="adhub-youtube-extension.zip"');

        // Vytvoření ZIP archivu
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximální komprese
        });

        // Pipe do response
        archive.pipe(res);

        // Přidání souborů ze složky extension
        archive.directory(EXTENSION_DIR, 'adhub-youtube-extension');

        // Dokončení
        await archive.finalize();

        console.log('[Extension] ZIP created and sent successfully');

    } catch (error) {
        console.error('[Extension] Error creating ZIP:', error);
        res.status(500).json({ error: 'Failed to create extension ZIP' });
    }
});

// API pro info o rozšíření
app.get('/api/extension/info', (req, res) => {
    try {
        const manifestPath = join(EXTENSION_DIR, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            return res.status(404).json({ error: 'Extension manifest not found' });
        }

        const manifest = fs.readJsonSync(manifestPath);
        res.json({
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
            available: true
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read extension info' });
    }
});

// Najde yt-dlp příkaz (zkusí yt-dlp.exe, pak yt-dlp, pak python -m yt_dlp)
function getYtDlpCommand() {
    return new Promise((resolve) => {
        const commands = process.platform === 'win32' 
            ? ['yt-dlp.exe', 'yt-dlp', 'python -m yt_dlp']
            : ['yt-dlp', 'python3 -m yt_dlp', 'python -m yt_dlp'];
        
        let index = 0;
        
        function tryNext() {
            if (index >= commands.length) {
                resolve(null);
                return;
            }
            
            const cmd = commands[index];
            const parts = cmd.split(' ');
            const mainCmd = parts[0];
            const args = parts.slice(1).concat(['--version']);
            
            const testProcess = spawn(mainCmd, args, { shell: true });
            
            testProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(cmd);
                } else {
                    index++;
                    tryNext();
                }
            });
            
            testProcess.on('error', () => {
                index++;
                tryNext();
            });
            
            setTimeout(() => {
                testProcess.kill();
                index++;
                tryNext();
            }, 2000);
        }
        
        tryNext();
    });
}

// Cache pro yt-dlp příkaz
let ytDlpCommandCache = null;

// Kontrola ffmpeg
async function checkFfmpegInstalled() {
    try {
        await execPromise('ffmpeg -version', { timeout: 5000 });
        return true;
    } catch (error) {
        return false;
    }
}

// Automatická instalace ffmpeg přes winget
async function installFfmpegAuto() {
    if (process.platform !== 'win32') {
        return false; // Pouze pro Windows
    }
    
    try {
        console.log('[FFmpeg] Zkouším automatickou instalaci přes winget...');
        await execPromise('winget install ffmpeg', { timeout: 60000 });
        
        // Počkáme chvíli a zkontrolujeme
        await new Promise(resolve => setTimeout(resolve, 3000));
        const installed = await checkFfmpegInstalled();
        
        if (installed) {
            console.log('[FFmpeg] ✅ ffmpeg úspěšně nainstalován!');
            return true;
        }
    } catch (error) {
        console.log('[FFmpeg] Automatická instalace selhala:', error.message);
    }
    
    return false;
}

// Kontrola, zda je yt-dlp nainstalovaný
async function checkYtDlpInstalled() {
    if (!ytDlpCommandCache) {
        ytDlpCommandCache = await getYtDlpCommand();
    }
    return ytDlpCommandCache !== null;
}

// Získání informací o videu
app.post('/api/video/info', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL je povinné' });
        }

        // Najdeme yt-dlp příkaz
        if (!ytDlpCommandCache) {
            ytDlpCommandCache = await getYtDlpCommand();
        }
        
        if (!ytDlpCommandCache) {
            return res.status(500).json({ 
                error: 'yt-dlp není nainstalován. Zkontrolujte instalaci.',
                details: 'Spusťte check-yt-dlp.bat pro kontrolu instalace'
            });
        }

        const cmdParts = ytDlpCommandCache.split(' ');
        const ytDlpCmd = cmdParts[0];
        const args = cmdParts.slice(1).concat([
            '--dump-json',
            '--no-download',
            '--no-warnings',
            url
        ]);

        const infoProcess = spawn(ytDlpCmd, args, { shell: true });
        let stdout = '';
        let stderr = '';

        infoProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        infoProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        infoProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('yt-dlp error:', stderr);
                return res.status(500).json({ 
                    error: 'Nepodařilo se získat informace o videu',
                    details: stderr 
                });
            }

            try {
                const videoInfo = JSON.parse(stdout);
                res.json({
                    id: videoInfo.id,
                    title: videoInfo.title,
                    thumbnail: videoInfo.thumbnail,
                    duration: videoInfo.duration,
                    uploader: videoInfo.uploader,
                    view_count: videoInfo.view_count,
                    formats: videoInfo.formats || []
                });
            } catch (parseError) {
                res.status(500).json({ 
                    error: 'Chyba při parsování informací o videu',
                    details: parseError.message 
                });
            }
        });

        infoProcess.on('error', (error) => {
            console.error('Spawn error:', error);
            res.status(500).json({ 
                error: 'Nepodařilo se spustit yt-dlp. Zkontrolujte, zda je nainstalovaný.',
                details: error.message 
            });
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stahování videa ve formátu MP4
app.post('/api/download/mp4', async (req, res) => {
    try {
        const { url, quality } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL je povinné' });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Neplatná YouTube URL' });
        }

        // Vytvořit jedinečné jméno souboru
        const timestamp = Date.now();
        const outputPath = join(DOWNLOADS_DIR, `${videoId}_${timestamp}.%(ext)s`);

        // Najdeme yt-dlp příkaz
        if (!ytDlpCommandCache) {
            ytDlpCommandCache = await getYtDlpCommand();
        }
        
        if (!ytDlpCommandCache) {
            return res.status(500).json({ 
                error: 'yt-dlp není nainstalován. Zkontrolujte instalaci.',
                details: 'Spusťte check-yt-dlp.bat pro kontrolu instalace'
            });
        }

        const cmdParts = ytDlpCommandCache.split(' ');
        const ytDlpCmd = cmdParts[0];
        const args = cmdParts.slice(1).concat([
            '-f', quality || 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '--merge-output-format', 'mp4',
            '-o', outputPath,
            '--no-playlist',
            '--progress',
            url
        ]);

        const downloadProcess = spawn(ytDlpCmd, args, { shell: true });
        
        let progressData = '';
        let errorData = '';

        downloadProcess.stdout.on('data', (data) => {
            const text = data.toString();
            progressData += text;
            
            // Parsování progressu
            const progressMatch = text.match(/(\d+(?:\.\d+)?)%/);
            if (progressMatch) {
                const progress = parseFloat(progressMatch[1]);
                // Poslat progress přes WebSocket by bylo lepší, ale pro jednoduchost použijeme polling
            }
        });

        downloadProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        downloadProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error('Download error:', errorData);
                return res.status(500).json({ 
                    error: 'Chyba při stahování videa',
                    details: errorData 
                });
            }

            // Najít stažený soubor
            const files = await fs.readdir(DOWNLOADS_DIR);
            const downloadedFile = files.find(f => f.startsWith(`${videoId}_${timestamp}`));
            
            if (!downloadedFile) {
                return res.status(500).json({ error: 'Soubor nebyl nalezen po stažení' });
            }

            const filePath = join(DOWNLOADS_DIR, downloadedFile);
            const stats = await fs.stat(filePath);

            res.json({
                success: true,
                filename: downloadedFile,
                path: `/downloads/${downloadedFile}`,
                size: stats.size
            });
        });

        downloadProcess.on('error', (error) => {
            console.error('Spawn error:', error);
            res.status(500).json({ 
                error: 'Nepodařilo se spustit yt-dlp',
                details: error.message 
            });
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stahování audia ve formátu M4A (nepotřebuje ffmpeg)
app.post('/api/download/m4a', async (req, res) => {
    try {
        const { url, quality } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL je povinné' });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Neplatná YouTube URL' });
        }

        const timestamp = Date.now();
        const outputPath = join(DOWNLOADS_DIR, `${videoId}_${timestamp}.%(ext)s`);

        // Najdeme yt-dlp příkaz
        if (!ytDlpCommandCache) {
            ytDlpCommandCache = await getYtDlpCommand();
        }
        
        if (!ytDlpCommandCache) {
            return res.status(500).json({ 
                error: 'yt-dlp není nainstalován. Zkontrolujte instalaci.',
                details: 'Spusťte check-yt-dlp.bat pro kontrolu instalace'
            });
        }

        const cmdParts = ytDlpCommandCache.split(' ');
        const ytDlpCmd = cmdParts[0];
        
        // Pokud používáme python -m yt_dlp, musíme argumenty formátovat jinak
        let args;
        if (ytDlpCommandCache.includes('python') && ytDlpCommandCache.includes('-m')) {
            args = ['-m', 'yt_dlp', 
                '-f', 'bestaudio[ext=m4a]/bestaudio',
                '-o', outputPath,
                '--no-playlist',
                '--progress',
                url];
        } else {
            args = cmdParts.slice(1).concat([
                '-f', 'bestaudio[ext=m4a]/bestaudio',
                '-o', outputPath,
                '--no-playlist',
                '--progress',
                url
            ]);
        }

        console.log(`[M4A Download] Command: ${ytDlpCmd} ${args.join(' ')}`);
        
        const downloadProcess = spawn(ytDlpCmd, args, { shell: true });
        
        let progressData = '';
        let errorData = '';

        downloadProcess.stdout.on('data', (data) => {
            progressData += data.toString();
        });

        downloadProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        downloadProcess.on('close', async (code) => {
            console.log(`[M4A Download] Process finished with code: ${code}`);
            
            if (code !== 0) {
                console.error('[M4A Download] Error:', errorData);
                return res.status(500).json({ 
                    error: 'Chyba při stahování audia M4A',
                    details: errorData.substring(0, 1000),
                    code: code
                });
            }

            // Hledáme stažený soubor - zkusíme různé koncovky
            const files = await fs.readdir(DOWNLOADS_DIR);
            let downloadedFile = files.find(f => f.startsWith(`${videoId}_${timestamp}`) && 
                (f.endsWith('.m4a') || f.endsWith('.webm') || f.endsWith('.opus')));
            
            if (!downloadedFile) {
                console.error(`[M4A Download] No file found starting with: ${videoId}_${timestamp}`);
                return res.status(500).json({ 
                    error: 'Soubor nebyl nalezen po stažení',
                    details: `Hledané: ${videoId}_${timestamp}.*.m4a. Dostupné soubory: ${files.slice(0, 10).join(', ')}`
                });
            }

            const filePath = join(DOWNLOADS_DIR, downloadedFile);
            const stats = await fs.stat(filePath);

            console.log(`[M4A Download] Success! File: ${downloadedFile}, Size: ${stats.size} bytes`);

            res.json({
                success: true,
                filename: downloadedFile,
                path: `/downloads/${downloadedFile}`,
                size: stats.size
            });
        });

        downloadProcess.on('error', (error) => {
            console.error('Spawn error:', error);
            res.status(500).json({ 
                error: 'Nepodařilo se spustit yt-dlp',
                details: error.message 
            });
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stahování audia ve formátu MP3 (potřebuje ffmpeg)
app.post('/api/download/mp3', async (req, res) => {
    try {
        const { url, quality } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL je povinné' });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Neplatná YouTube URL' });
        }

        const timestamp = Date.now();
        const outputPath = join(DOWNLOADS_DIR, `${videoId}_${timestamp}.%(ext)s`);

        // Najdeme yt-dlp příkaz
        if (!ytDlpCommandCache) {
            ytDlpCommandCache = await getYtDlpCommand();
        }
        
        if (!ytDlpCommandCache) {
            return res.status(500).json({ 
                error: 'yt-dlp není nainstalován. Zkontrolujte instalaci.',
                details: 'Spusťte check-yt-dlp.bat pro kontrolu instalace'
            });
        }

        const cmdParts = ytDlpCommandCache.split(' ');
        const ytDlpCmd = cmdParts[0];
        
        // Pokud používáme python -m yt_dlp, musíme argumenty formátovat jinak
        let args;
        if (ytDlpCommandCache.includes('python') && ytDlpCommandCache.includes('-m')) {
            // Pro python -m yt_dlp: python -m yt_dlp [args]
            args = ['-m', 'yt_dlp', 
                '-x',
                '--audio-format', 'mp3',
                '--audio-quality', quality || '192K',
                '-o', outputPath,
                '--no-playlist',
                '--progress',
                url];
        } else {
            // Pro běžný yt-dlp.exe nebo yt-dlp
            args = cmdParts.slice(1).concat([
                '-x',
                '--audio-format', 'mp3',
                '--audio-quality', quality || '192K',
                '-o', outputPath,
                '--no-playlist',
                '--progress',
                url
            ]);
        }

        console.log(`[MP3 Download] Command: ${ytDlpCmd} ${args.join(' ')}`);
        
        const downloadProcess = spawn(ytDlpCmd, args, { shell: true });
        
        let progressData = '';
        let errorData = '';

        downloadProcess.stdout.on('data', (data) => {
            progressData += data.toString();
        });

        downloadProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        downloadProcess.on('close', async (code) => {
            console.log(`[MP3 Download] Process finished with code: ${code}`);
            console.log(`[MP3 Download] Error data: ${errorData.substring(0, 500)}`);
            console.log(`[MP3 Download] Progress data: ${progressData.substring(0, 500)}`);
            
            if (code !== 0) {
                // Zkontrolujeme, zda chyba je o ffmpeg
                const ffmpegError = errorData.toLowerCase().includes('ffmpeg') || errorData.toLowerCase().includes('avconv');
                
                if (ffmpegError) {
                    console.log('[MP3 Download] Detekována chyba ffmpeg, zkouším automatickou instalaci...');
                    const installed = await installFfmpegAuto();
                    
                    if (!installed) {
                        return res.status(500).json({ 
                            error: 'Chyba při stahování audia: ffmpeg není nainstalován nebo není v PATH. MP3 konverze vyžaduje ffmpeg.',
                            details: errorData.substring(0, 1000),
                            code: code,
                            autoInstallFailed: true,
                            installHint: 'Zkuste: winget install ffmpeg nebo stáhněte z https://www.gyan.dev/ffmpeg/builds/'
                        });
                    } else {
                        // ffmpeg byl nainstalován, ale už je pozdě - uživatel musí zkusit znovu
                        return res.status(500).json({ 
                            error: 'ffmpeg byl nainstalován, ale stahování již bylo zrušeno. Zkuste stáhnout znovu.',
                            details: 'ffmpeg byl úspěšně nainstalován. Pro dokončení stahování klikněte na tlačítko znovu.',
                            code: code,
                            ffmpegInstalled: true
                        });
                    }
                }
                
                console.error('[MP3 Download] Error:', errorData);
                return res.status(500).json({ 
                    error: 'Chyba při stahování audia',
                    details: errorData.substring(0, 1000),
                    code: code
                });
            }

            // Hledáme stažený soubor - zkusíme různé koncovky
            const files = await fs.readdir(DOWNLOADS_DIR);
            let downloadedFile = files.find(f => f.startsWith(`${videoId}_${timestamp}`) && f.endsWith('.mp3'));
            
            // Pokud nenajdeme .mp3, zkusíme najít jiný audio soubor
            if (!downloadedFile) {
                downloadedFile = files.find(f => f.startsWith(`${videoId}_${timestamp}`) && 
                    (f.endsWith('.m4a') || f.endsWith('.webm') || f.endsWith('.opus')));
                
                if (downloadedFile) {
                    console.log(`[MP3 Download] Found audio file but not MP3: ${downloadedFile}`);
                    return res.status(500).json({ 
                        error: 'Soubor byl stažen, ale konverze do MP3 selhala. Zkontrolujte, zda je nainstalován ffmpeg.',
                        details: `Nalezen soubor: ${downloadedFile}, ale MP3 konverze neproběhla.`
                    });
                }
                
                // Pokud vůbec nic nenašli
                console.error(`[MP3 Download] No file found starting with: ${videoId}_${timestamp}`);
                return res.status(500).json({ 
                    error: 'Soubor nebyl nalezen po stažení',
                    details: `Hledané: ${videoId}_${timestamp}.*.mp3. Dostupné soubory: ${files.slice(0, 10).join(', ')}`
                });
            }

            const filePath = join(DOWNLOADS_DIR, downloadedFile);
            const stats = await fs.stat(filePath);

            console.log(`[MP3 Download] Success! File: ${downloadedFile}, Size: ${stats.size} bytes`);

            res.json({
                success: true,
                filename: downloadedFile,
                path: `/downloads/${downloadedFile}`,
                size: stats.size
            });
        });

        downloadProcess.on('error', (error) => {
            console.error('Spawn error:', error);
            res.status(500).json({ 
                error: 'Nepodařilo se spustit yt-dlp',
                details: error.message 
            });
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stahování souboru
app.get('/downloads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = join(DOWNLOADS_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Soubor nenalezen' });
    }

    res.download(filePath, filename, (err) => {
        if (err) {
            console.error('Download error:', err);
            res.status(500).json({ error: 'Chyba při stahování souboru' });
        }
    });
});

// Status endpoint
app.get('/api/status', async (req, res) => {
    const ytDlpInstalled = await checkYtDlpInstalled();
    
    res.json({
        status: 'ok',
        ytDlpInstalled: ytDlpInstalled,
        downloadsDir: DOWNLOADS_DIR,
        timestamp: new Date().toISOString()
    });
});

// Restart endpoint (for compatibility)
app.post('/api/restart', async (req, res) => {
    res.json({
        success: true,
        message: 'Server restartován (pro skutečný restart použijte helper server)',
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Pomocná funkce pro extrakci video ID
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

// Spuštění serveru
app.listen(PORT, () => {
    console.log(`═══════════════════════════════════════════════`);
    console.log(`🎥 YouTube Downloader Server běží na portu ${PORT}`);
    console.log(`📡 HTTP endpoint: http://localhost:${PORT}`);
    console.log(`📁 Stahování do: ${DOWNLOADS_DIR}`);
    console.log(`═══════════════════════════════════════════════`);
    
    // Kontrola yt-dlp při spuštění
    checkYtDlpInstalled().then(installed => {
        if (installed) {
            console.log(`✅ yt-dlp je nainstalován`);
        } else {
            console.log(`⚠️  yt-dlp není nainstalován nebo není v PATH`);
            console.log(`   Stáhněte z: https://github.com/yt-dlp/yt-dlp/releases`);
            console.log(`   Nebo použijte: pip install yt-dlp`);
        }
    });
});

