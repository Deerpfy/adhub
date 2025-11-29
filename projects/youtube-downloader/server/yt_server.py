#!/usr/bin/env python3
"""
AdHub YouTube Downloader - Local Server
========================================
Lokální server pro stahování YouTube videí.
Používá yt-dlp pro extrakci formátů a stahování.

Spuštění:
    python yt_server.py

API Endpoints:
    GET  /api/info?url=YOUTUBE_URL     - Získá info o videu a dostupné formáty
    POST /api/download                  - Stáhne video/audio
    GET  /api/status                    - Stav serveru
    GET  /api/progress/<task_id>        - Průběh stahování
"""

import os
import sys
import json
import uuid
import threading
import time
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote
import subprocess

# Pokusit se importovat yt-dlp
try:
    import yt_dlp
    YT_DLP_AVAILABLE = True
except ImportError:
    YT_DLP_AVAILABLE = False
    print("VAROVÁNÍ: yt-dlp není nainstalován!")
    print("Nainstalujte: pip install yt-dlp")

# ============================================================================
# KONFIGURACE
# ============================================================================

CONFIG = {
    'HOST': '127.0.0.1',
    'PORT': 8765,
    'DOWNLOAD_DIR': os.path.expanduser('~/Downloads'),
    'CORS_ORIGINS': ['*'],  # Povolit všechny origins pro lokální použití
    'DEBUG': True,
}

# Stav stahování
download_tasks = {}

# ============================================================================
# POMOCNÉ FUNKCE
# ============================================================================

def log(*args):
    if CONFIG['DEBUG']:
        print('[YT Server]', *args)

def extract_video_id(url):
    """Extrahuje video ID z YouTube URL."""
    if not url:
        return None

    # Přímé video ID
    if len(url) == 11 and url.isalnum():
        return url

    try:
        parsed = urlparse(url)

        # youtube.com/watch?v=XXX
        if 'youtube.com' in parsed.netloc:
            qs = parse_qs(parsed.query)
            if 'v' in qs:
                return qs['v'][0]
            # /shorts/XXX nebo /embed/XXX
            path_parts = parsed.path.split('/')
            for i, part in enumerate(path_parts):
                if part in ['shorts', 'embed', 'v'] and i + 1 < len(path_parts):
                    return path_parts[i + 1]

        # youtu.be/XXX
        if 'youtu.be' in parsed.netloc:
            return parsed.path.strip('/')

    except Exception as e:
        log(f'Chyba při extrakci video ID: {e}')

    return None

def format_size(bytes_size):
    """Formátuje velikost souboru."""
    if not bytes_size:
        return 'Neznámá'
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_size < 1024:
            return f'{bytes_size:.1f} {unit}'
        bytes_size /= 1024
    return f'{bytes_size:.1f} TB'

def sanitize_filename(name):
    """Vyčistí název souboru."""
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        name = name.replace(char, '')
    return name.strip()[:200]

# ============================================================================
# YT-DLP FUNKCE
# ============================================================================

def get_video_info(url):
    """Získá informace o videu včetně všech formátů."""
    if not YT_DLP_AVAILABLE:
        return {'error': 'yt-dlp není nainstalován'}

    video_id = extract_video_id(url)
    if not video_id:
        return {'error': 'Neplatná YouTube URL'}

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=False)

            # Zpracovat formáty
            formats_data = {
                'video': [],      # Video + audio
                'video_only': [], # Pouze video (adaptive)
                'audio': [],      # Pouze audio
            }

            for f in info.get('formats', []):
                format_info = {
                    'format_id': f.get('format_id'),
                    'ext': f.get('ext'),
                    'quality': f.get('format_note') or f.get('quality'),
                    'resolution': f.get('resolution'),
                    'height': f.get('height'),
                    'width': f.get('width'),
                    'fps': f.get('fps'),
                    'filesize': f.get('filesize') or f.get('filesize_approx'),
                    'filesize_str': format_size(f.get('filesize') or f.get('filesize_approx')),
                    'vcodec': f.get('vcodec'),
                    'acodec': f.get('acodec'),
                    'abr': f.get('abr'),
                    'vbr': f.get('vbr'),
                    'tbr': f.get('tbr'),
                }

                has_video = f.get('vcodec') and f.get('vcodec') != 'none'
                has_audio = f.get('acodec') and f.get('acodec') != 'none'

                if has_video and has_audio:
                    formats_data['video'].append(format_info)
                elif has_video:
                    formats_data['video_only'].append(format_info)
                elif has_audio:
                    formats_data['audio'].append(format_info)

            # Seřadit podle kvality
            formats_data['video'].sort(key=lambda x: x.get('height') or 0, reverse=True)
            formats_data['video_only'].sort(key=lambda x: x.get('height') or 0, reverse=True)
            formats_data['audio'].sort(key=lambda x: x.get('abr') or 0, reverse=True)

            return {
                'success': True,
                'video_id': video_id,
                'title': info.get('title'),
                'author': info.get('uploader'),
                'duration': info.get('duration'),
                'duration_str': f"{info.get('duration', 0) // 60}:{info.get('duration', 0) % 60:02d}",
                'thumbnail': info.get('thumbnail'),
                'view_count': info.get('view_count'),
                'formats': formats_data,
                'available_qualities': list(set(
                    f.get('height') for f in formats_data['video'] + formats_data['video_only']
                    if f.get('height')
                )),
            }

    except Exception as e:
        log(f'Chyba při získávání info: {e}')
        return {'error': str(e)}

def download_video(url, format_type='best', quality=None, audio_format=None, output_dir=None):
    """
    Stáhne video/audio z YouTube.

    Args:
        url: YouTube URL
        format_type: 'video', 'audio', 'best'
        quality: Kvalita videa (např. 1080, 720)
        audio_format: Pro audio - 'mp3', 'wav', 'm4a', 'flac', 'ogg'
        output_dir: Složka pro uložení
    """
    if not YT_DLP_AVAILABLE:
        return {'error': 'yt-dlp není nainstalován'}

    video_id = extract_video_id(url)
    if not video_id:
        return {'error': 'Neplatná YouTube URL'}

    task_id = str(uuid.uuid4())[:8]
    download_tasks[task_id] = {
        'status': 'starting',
        'progress': 0,
        'filename': None,
        'error': None,
    }

    output_dir = output_dir or CONFIG['DOWNLOAD_DIR']
    os.makedirs(output_dir, exist_ok=True)

    def progress_hook(d):
        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)
            if total > 0:
                download_tasks[task_id]['progress'] = int((downloaded / total) * 100)
            download_tasks[task_id]['status'] = 'downloading'
            download_tasks[task_id]['speed'] = d.get('speed')
            download_tasks[task_id]['eta'] = d.get('eta')
        elif d['status'] == 'finished':
            download_tasks[task_id]['status'] = 'processing'
            download_tasks[task_id]['progress'] = 100

    # Nastavení yt-dlp
    ydl_opts = {
        'outtmpl': os.path.join(output_dir, '%(title)s.%(ext)s'),
        'quiet': False,
        'no_warnings': False,
        'progress_hooks': [progress_hook],
    }

    # Nastavení formátu
    if format_type == 'audio' or audio_format:
        ydl_opts['format'] = 'bestaudio/best'

        if audio_format == 'mp3':
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '320',
            }]
        elif audio_format == 'wav':
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
            }]
        elif audio_format == 'm4a':
            ydl_opts['format'] = 'bestaudio[ext=m4a]/bestaudio/best'
        elif audio_format == 'flac':
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'flac',
            }]
        elif audio_format == 'ogg':
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'vorbis',
                'preferredquality': '320',
            }]
    else:
        # Video formát
        if quality:
            ydl_opts['format'] = f'bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best'
        else:
            ydl_opts['format'] = 'bestvideo+bestaudio/best'
        ydl_opts['merge_output_format'] = 'mp4'

    def do_download():
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=True)

                # Zjistit název staženého souboru
                if 'requested_downloads' in info and info['requested_downloads']:
                    filepath = info['requested_downloads'][0].get('filepath')
                else:
                    title = sanitize_filename(info.get('title', 'video'))
                    ext = audio_format or 'mp4'
                    filepath = os.path.join(output_dir, f'{title}.{ext}')

                download_tasks[task_id]['status'] = 'completed'
                download_tasks[task_id]['progress'] = 100
                download_tasks[task_id]['filename'] = os.path.basename(filepath) if filepath else None
                download_tasks[task_id]['filepath'] = filepath

        except Exception as e:
            log(f'Chyba při stahování: {e}')
            download_tasks[task_id]['status'] = 'error'
            download_tasks[task_id]['error'] = str(e)

    # Spustit stahování v novém vlákně
    thread = threading.Thread(target=do_download)
    thread.start()

    return {
        'success': True,
        'task_id': task_id,
        'message': 'Stahování zahájeno'
    }

# ============================================================================
# HTTP SERVER
# ============================================================================

class RequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        if CONFIG['DEBUG']:
            print(f'[HTTP] {args[0]}')

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # Status endpoint
        if path == '/api/status':
            self.send_json_response({
                'status': 'running',
                'version': '1.0.0',
                'yt_dlp_available': YT_DLP_AVAILABLE,
                'download_dir': CONFIG['DOWNLOAD_DIR'],
            })
            return

        # Video info endpoint
        if path == '/api/info':
            url = query.get('url', [None])[0]
            if not url:
                self.send_json_response({'error': 'Chybí URL parametr'}, 400)
                return

            url = unquote(url)
            result = get_video_info(url)
            self.send_json_response(result)
            return

        # Download progress endpoint
        if path.startswith('/api/progress/'):
            task_id = path.split('/')[-1]
            if task_id in download_tasks:
                self.send_json_response(download_tasks[task_id])
            else:
                self.send_json_response({'error': 'Úloha nenalezena'}, 404)
            return

        # Supported formats endpoint
        if path == '/api/formats':
            self.send_json_response({
                'video': ['mp4', 'webm', 'mkv'],
                'audio': ['mp3', 'wav', 'm4a', 'flac', 'ogg'],
                'qualities': [2160, 1440, 1080, 720, 480, 360, 240, 144],
            })
            return

        # Default - 404
        self.send_json_response({'error': 'Endpoint nenalezen'}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # Download endpoint
        if path == '/api/download':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                self.send_json_response({'error': 'Neplatný JSON'}, 400)
                return

            url = data.get('url')
            if not url:
                self.send_json_response({'error': 'Chybí URL'}, 400)
                return

            format_type = data.get('format_type', 'video')
            quality = data.get('quality')
            audio_format = data.get('audio_format')
            output_dir = data.get('output_dir')

            result = download_video(url, format_type, quality, audio_format, output_dir)
            self.send_json_response(result)
            return

        self.send_json_response({'error': 'Endpoint nenalezen'}, 404)

def run_server():
    """Spustí HTTP server."""
    server_address = (CONFIG['HOST'], CONFIG['PORT'])
    httpd = HTTPServer(server_address, RequestHandler)

    print('=' * 60)
    print('  AdHub YouTube Downloader - Local Server')
    print('=' * 60)
    print(f'  Server běží na: http://{CONFIG["HOST"]}:{CONFIG["PORT"]}')
    print(f'  Složka pro stahování: {CONFIG["DOWNLOAD_DIR"]}')
    print(f'  yt-dlp dostupné: {"Ano" if YT_DLP_AVAILABLE else "NE - nainstalujte: pip install yt-dlp"}')
    print('=' * 60)
    print('  API Endpoints:')
    print(f'    GET  /api/status              - Stav serveru')
    print(f'    GET  /api/info?url=URL        - Info o videu')
    print(f'    GET  /api/formats             - Podporované formáty')
    print(f'    POST /api/download            - Stáhnout video/audio')
    print(f'    GET  /api/progress/<task_id>  - Průběh stahování')
    print('=' * 60)
    print('  Pro ukončení stiskněte Ctrl+C')
    print()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nServer ukončen.')
        httpd.shutdown()

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    # Zkontrolovat a nainstalovat závislosti
    if not YT_DLP_AVAILABLE:
        print('Instaluji yt-dlp...')
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'yt-dlp'], check=True)
        print('yt-dlp nainstalován. Restartujte server.')
        sys.exit(0)

    run_server()
