#!/usr/bin/env python3
"""
AdHub YouTube Downloader - Native Host
=======================================
Tento script je spouštěn prohlížečem přes Native Messaging API.
Nepotřebuje běžet jako server - spustí se pouze když uživatel klikne na stažení.

Jak to funguje:
1. Uživatel klikne na "Stáhnout" v extension
2. Chrome spustí tento script
3. Script stáhne video přes yt-dlp
4. Script se ukončí
"""

import sys
import os
import json
import struct
import subprocess
import tempfile
import threading

# Přidat cestu pro yt-dlp pokud je nainstalován uživatelsky
sys.path.insert(0, os.path.expanduser('~/.local/lib/python3/site-packages'))

try:
    import yt_dlp
    YT_DLP_AVAILABLE = True
except ImportError:
    YT_DLP_AVAILABLE = False

# ============================================================================
# NATIVE MESSAGING PROTOKOL
# ============================================================================

def read_message():
    """Přečte zprávu z stdin (Chrome Native Messaging protokol)."""
    # Prvních 4 bytů = délka zprávy (little-endian)
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None

    message_length = struct.unpack('I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

def send_message(message):
    """Odešle zprávu na stdout (Chrome Native Messaging protokol)."""
    encoded = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

def log_to_file(msg):
    """Debug log do souboru."""
    log_path = os.path.expanduser('~/adhub_yt_download.log')
    with open(log_path, 'a') as f:
        f.write(f"{msg}\n")

# ============================================================================
# STAHOVÁNÍ
# ============================================================================

def get_download_dir():
    """Získá složku pro stahování."""
    # Zkusit standardní Downloads složku
    downloads = os.path.expanduser('~/Downloads')
    if os.path.exists(downloads):
        return downloads

    # Fallback na home
    return os.path.expanduser('~')

def download_video(url, format_type='video', quality=None, audio_format=None, output_dir=None):
    """Stáhne video/audio z YouTube."""

    if not YT_DLP_AVAILABLE:
        return {
            'success': False,
            'error': 'yt-dlp není nainstalován. Spusťte: pip install yt-dlp'
        }

    output_dir = output_dir or get_download_dir()

    ydl_opts = {
        'outtmpl': os.path.join(output_dir, '%(title)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
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
    else:
        # Video
        if quality:
            ydl_opts['format'] = f'bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best'
        else:
            ydl_opts['format'] = 'bestvideo+bestaudio/best'
        ydl_opts['merge_output_format'] = 'mp4'

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

            # Získat název staženého souboru
            if 'requested_downloads' in info and info['requested_downloads']:
                filepath = info['requested_downloads'][0].get('filepath', '')
            else:
                title = info.get('title', 'video')
                ext = audio_format or 'mp4'
                filepath = os.path.join(output_dir, f'{title}.{ext}')

            return {
                'success': True,
                'title': info.get('title'),
                'filename': os.path.basename(filepath),
                'filepath': filepath,
                'duration': info.get('duration'),
            }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def get_video_info(url):
    """Získá informace o videu."""

    if not YT_DLP_AVAILABLE:
        return {
            'success': False,
            'error': 'yt-dlp není nainstalován'
        }

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            # Extrahovat kvality
            qualities = set()
            for f in info.get('formats', []):
                if f.get('height'):
                    qualities.add(f['height'])

            return {
                'success': True,
                'title': info.get('title'),
                'duration': info.get('duration'),
                'thumbnail': info.get('thumbnail'),
                'qualities': sorted(qualities, reverse=True),
                'best_quality': max(qualities) if qualities else 1080,
            }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

# ============================================================================
# HLAVNÍ LOOP
# ============================================================================

def main():
    """Hlavní funkce - zpracovává zprávy od extension."""

    while True:
        message = read_message()

        if message is None:
            break

        action = message.get('action')

        if action == 'ping':
            send_message({
                'success': True,
                'yt_dlp_available': YT_DLP_AVAILABLE,
                'download_dir': get_download_dir(),
            })

        elif action == 'getInfo':
            url = message.get('url')
            result = get_video_info(url)
            send_message(result)

        elif action == 'download':
            url = message.get('url')
            format_type = message.get('format_type', 'video')
            quality = message.get('quality')
            audio_format = message.get('audio_format')

            # Poslat "starting" zprávu
            send_message({'status': 'starting'})

            # Stáhnout
            result = download_video(url, format_type, quality, audio_format)
            send_message(result)

            # Ukončit po stažení
            break

        else:
            send_message({
                'success': False,
                'error': f'Neznámá akce: {action}'
            })

if __name__ == '__main__':
    main()
