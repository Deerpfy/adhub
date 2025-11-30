#!/usr/bin/env python3
"""
AdHub YouTube Downloader - Native Host v5.5
============================================
Native Messaging host pro browser extension.
Umoznuje HD/4K stahovani a audio konverzi.

Podporovane typy videi:
- Bezna videa (vsechny kvality)
- Vekove omezena (s cookies z prohlizece)
- Zive prenosy
- Shorts

Akce:
- check: Zkontroluje dostupnost yt-dlp a ffmpeg
- test: Otestuje konkretni nastroj
- download: Stahne video/audio
"""

import sys
import os
import json
import struct
import subprocess
import shutil
import time

# ============================================================================
# KONFIGURACE
# ============================================================================

VERSION = '5.5'
MAX_RETRIES = 3
RETRY_DELAY = 2  # sekundy

# Defaultni cesty k nastrojum
DEFAULT_YTDLP_PATHS = [
    'yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    os.path.expanduser('~/.local/bin/yt-dlp'),
    os.path.expanduser('~/bin/yt-dlp'),
    # Windows cesty - AdHub instalator
    os.path.join(os.environ.get('LOCALAPPDATA', ''), 'AdHub', 'yt-dlp', 'yt-dlp.exe'),
    # Windows cesty - ostatni
    os.path.expanduser('~/yt-dlp.exe'),
    'C:\\yt-dlp\\yt-dlp.exe',
    os.path.join(os.environ.get('LOCALAPPDATA', ''), 'yt-dlp', 'yt-dlp.exe'),
]

DEFAULT_FFMPEG_PATHS = [
    'ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    # Windows cesty - AdHub instalator
    os.path.join(os.environ.get('LOCALAPPDATA', ''), 'AdHub', 'ffmpeg', 'ffmpeg.exe'),
    # Windows cesty - ostatni
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\ffmpeg\\ffmpeg.exe',
    os.path.join(os.environ.get('LOCALAPPDATA', ''), 'ffmpeg', 'bin', 'ffmpeg.exe'),
]

# ============================================================================
# NATIVE MESSAGING PROTOKOL
# ============================================================================

def read_message():
    """Precte zpravu z stdin (Chrome Native Messaging protokol)."""
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None

    message_length = struct.unpack('I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

def send_message(message):
    """Odesle zpravu na stdout (Chrome Native Messaging protokol)."""
    encoded = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

# ============================================================================
# DETEKCE NASTROJU
# ============================================================================

def find_tool(tool_name, custom_path=None, default_paths=None):
    """Najde nastroj a vrati jeho cestu a verzi."""
    paths_to_check = []

    # Custom path ma prioritu
    if custom_path and custom_path.strip():
        paths_to_check.append(custom_path.strip())

    # Pak zkusit shutil.which
    which_path = shutil.which(tool_name)
    if which_path:
        paths_to_check.append(which_path)

    # Pak defaultni cesty
    if default_paths:
        paths_to_check.extend(default_paths)

    for path in paths_to_check:
        result = check_tool_at_path(path, tool_name)
        if result['available']:
            return result

    return {'available': False, 'path': None, 'version': None}

def check_tool_at_path(path, tool_name=None):
    """Zkontroluje nastroj na konkretni ceste."""
    try:
        # ffmpeg pouziva -version (jedina pomlcka), yt-dlp pouziva --version
        version_flag = '-version' if tool_name == 'ffmpeg' or 'ffmpeg' in path.lower() else '--version'

        result = subprocess.run(
            [path, version_flag],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            # Extrahovat verzi z vystupu
            output = result.stdout.strip()
            version = output.split('\n')[0] if output else 'unknown'

            # Zjednodusit verzi
            if 'yt-dlp' in version.lower():
                parts = version.split()
                version = parts[1] if len(parts) > 1 else parts[0]
            elif 'ffmpeg' in version.lower():
                parts = version.split()
                for i, p in enumerate(parts):
                    if p == 'version' and i + 1 < len(parts):
                        version = parts[i + 1]
                        break

            return {
                'available': True,
                'path': path,
                'version': version[:20]  # Max 20 znaku
            }

    except (subprocess.TimeoutExpired, FileNotFoundError, PermissionError):
        pass

    return {'available': False, 'path': path, 'version': None}

def get_download_dir():
    """Ziska slozku pro stahovani."""
    downloads = os.path.expanduser('~/Downloads')
    if os.path.exists(downloads):
        return downloads
    return os.path.expanduser('~')

# ============================================================================
# AKCE: CHECK
# ============================================================================

def handle_check(message):
    """Zkontroluje dostupnost yt-dlp a ffmpeg."""
    ytdlp_path = message.get('ytdlpPath', '')
    ffmpeg_path = message.get('ffmpegPath', '')

    ytdlp_result = find_tool('yt-dlp', ytdlp_path, DEFAULT_YTDLP_PATHS)
    ffmpeg_result = find_tool('ffmpeg', ffmpeg_path, DEFAULT_FFMPEG_PATHS)

    return {
        'success': True,
        'version': VERSION,
        'ytdlp': ytdlp_result,
        'ffmpeg': ffmpeg_result,
        'download_dir': get_download_dir(),
    }

# ============================================================================
# AKCE: TEST
# ============================================================================

def handle_test(message):
    """Otestuje konkretni nastroj na konkretni ceste."""
    tool = message.get('tool')
    path = message.get('path', '')

    if not path:
        return {'available': False, 'error': 'Cesta neni zadana'}

    result = check_tool_at_path(path, tool)
    return result

# ============================================================================
# COOKIES - Pro vekove omezena videa
# ============================================================================

import tempfile
import atexit

# Docasny soubor pro cookies
_temp_cookie_file = None

def cleanup_temp_cookies():
    """Vycisti docasny cookies soubor pri ukonceni."""
    global _temp_cookie_file
    if _temp_cookie_file and os.path.exists(_temp_cookie_file):
        try:
            os.remove(_temp_cookie_file)
        except:
            pass

atexit.register(cleanup_temp_cookies)


def save_cookies_to_temp(cookies_content):
    """Ulozi cookies z extension do docasneho souboru."""
    global _temp_cookie_file

    if not cookies_content:
        return None

    try:
        # Vytvorit docasny soubor
        fd, temp_path = tempfile.mkstemp(suffix='.txt', prefix='adhub_cookies_')
        with os.fdopen(fd, 'w') as f:
            f.write(cookies_content)

        _temp_cookie_file = temp_path
        return temp_path

    except Exception as e:
        return None


def get_cookies_path(cookies_from_extension=None):
    """Najde cookies soubor - prioritne z extension, pak z disku."""

    # 1. Cookies z extension (nejvyssi priorita)
    if cookies_from_extension:
        temp_path = save_cookies_to_temp(cookies_from_extension)
        if temp_path:
            return temp_path

    # 2. Cesty kde mohou byt cookies exportovany
    possible_paths = [
        os.path.expanduser('~/cookies.txt'),
        os.path.expanduser('~/youtube_cookies.txt'),
        os.path.expanduser('~/.config/yt-dlp/cookies.txt'),
        os.path.expanduser('~/Downloads/cookies.txt'),
    ]

    for path in possible_paths:
        if os.path.exists(path):
            return path

    return None

# ============================================================================
# AKCE: DOWNLOAD
# ============================================================================

def handle_download(message, retry_count=0):
    """Stahne video/audio z YouTube s podporou vsech typu videi."""
    url = message.get('url')
    format_type = message.get('format', 'video')  # video nebo audio
    quality = message.get('quality', 'best')
    audio_format = message.get('audioFormat')
    ytdlp_path = message.get('ytdlpPath', '')
    ffmpeg_path = message.get('ffmpegPath', '')
    use_cookies = message.get('useCookies', True)

    if not url:
        return {'success': False, 'error': 'URL neni zadana'}

    # Najit yt-dlp
    ytdlp = find_tool('yt-dlp', ytdlp_path, DEFAULT_YTDLP_PATHS)
    if not ytdlp['available']:
        return {'success': False, 'error': 'yt-dlp neni dostupny'}

    # Pripravit argumenty
    output_dir = get_download_dir()
    # Sanitizovat nazev souboru
    output_template = os.path.join(output_dir, '%(title).150s.%(ext)s')

    cmd = [ytdlp['path']]

    # Obecne nastaveni pro lepsi kompatibilitu
    cmd.extend([
        '--no-playlist',           # Nestahovat playlisty
        '--no-check-certificates', # Preskocit certifikaty (nekdy pomaha)
        # tv_embedded a mweb klienti funguji bez problemu s cookies
        '--extractor-args', 'youtube:player_client=tv_embedded,mweb,web',
    ])

    # Cookies pro vekove omezena videa (prioritne z extension)
    cookies_from_ext = message.get('cookies')
    cookies_path = get_cookies_path(cookies_from_ext)
    if use_cookies and cookies_path:
        cmd.extend(['--cookies', cookies_path])
    elif use_cookies:
        # Zkusit cookies primo z prohlizece (Chrome/Firefox)
        cmd.extend(['--cookies-from-browser', 'chrome'])

    # Format
    if format_type == 'audio' or audio_format:
        cmd.extend(['-f', 'bestaudio/best'])

        if audio_format in ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac']:
            cmd.extend(['-x', '--audio-format', audio_format])
            cmd.extend(['--audio-quality', '0'])  # Nejlepsi kvalita

            # Najit ffmpeg pro konverzi
            ffmpeg = find_tool('ffmpeg', ffmpeg_path, DEFAULT_FFMPEG_PATHS)
            if ffmpeg['available']:
                ffmpeg_dir = os.path.dirname(ffmpeg['path'])
                if ffmpeg_dir:
                    cmd.extend(['--ffmpeg-location', ffmpeg_dir])
    else:
        # Video
        if quality and quality != 'best':
            # Flexibilnejsi format selector - * dovoluje vice kodeku
            cmd.extend(['-f', f'bestvideo*[height<={quality}]+bestaudio*/bestvideo*+bestaudio*/best'])
        else:
            # Nejlepsi kvalita - pouzit * pro maximalni kompatibilitu
            cmd.extend(['-f', 'bestvideo*+bestaudio*/best'])

        cmd.extend(['--merge-output-format', 'mp4'])
        cmd.extend(['--remux-video', 'mp4'])  # Zajistit MP4 format

        # FFmpeg pro merge
        ffmpeg = find_tool('ffmpeg', ffmpeg_path, DEFAULT_FFMPEG_PATHS)
        if ffmpeg['available']:
            ffmpeg_dir = os.path.dirname(ffmpeg['path'])
            if ffmpeg_dir:
                cmd.extend(['--ffmpeg-location', ffmpeg_dir])

    cmd.extend(['-o', output_template])
    cmd.append(url)

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=900  # 15 minut timeout pro velka videa
        )

        if result.returncode == 0:
            filename = extract_filename_from_output(result.stdout, result.stderr)
            return {
                'success': True,
                'filename': os.path.basename(filename) if filename else 'video.mp4',
                'filepath': filename or output_dir,
            }
        else:
            # Ziskat chybu - preferovat stderr, pak stdout
            error_msg = result.stderr.strip() if result.stderr else ''
            stdout_msg = result.stdout.strip() if result.stdout else ''

            # Nekdy je chyba v stdout misto stderr
            if not error_msg and stdout_msg:
                error_msg = stdout_msg
            elif error_msg and stdout_msg:
                error_msg = f"{error_msg}\n{stdout_msg}"

            if not error_msg:
                error_msg = 'Neznama chyba'

            # Analyzovat chybu a pripadne zkusit znovu
            if retry_count < MAX_RETRIES and should_retry_error(error_msg):
                time.sleep(RETRY_DELAY)
                return handle_download(message, retry_count + 1)

            # Parsovat uzivatelsky pritelive chybove hlasky
            friendly_error = parse_error_message(error_msg)

            # Pripojit cast raw chyby pro ladeni
            debug_hint = error_msg[:300].replace('\n', ' ').strip()

            return {
                'success': False,
                'error': friendly_error,
                'raw_error': debug_hint,
                'returncode': result.returncode
            }

    except subprocess.TimeoutExpired:
        return {'success': False, 'error': 'Stahovani trvalo prilis dlouho. Zkuste nizsi kvalitu.'}
    except Exception as e:
        if retry_count < MAX_RETRIES:
            time.sleep(RETRY_DELAY)
            return handle_download(message, retry_count + 1)
        return {'success': False, 'error': str(e)[:200]}


def extract_filename_from_output(stdout, stderr):
    """Extrahuje nazev souboru z vystupu yt-dlp."""
    for line in (stdout + '\n' + stderr).split('\n'):
        if 'Destination:' in line:
            return line.split('Destination:')[-1].strip()
        elif 'has already been downloaded' in line:
            return line.split('[download]')[-1].split('has already')[0].strip()
        elif '[Merger]' in line and 'Merging formats into' in line:
            return line.split('Merging formats into')[-1].strip().strip('"')
        elif '[ExtractAudio]' in line and 'Destination:' in line:
            return line.split('Destination:')[-1].strip()
    return None


def should_retry_error(error_msg):
    """Urcuje zda by se mela chyba zkusit znovu."""
    retryable = [
        'HTTP Error 503',
        'HTTP Error 429',  # Rate limiting
        'Connection reset',
        'Connection refused',
        'timed out',
        'Temporary failure',
        'Unable to download',
    ]
    error_lower = error_msg.lower()
    return any(err.lower() in error_lower for err in retryable)


def parse_error_message(error_msg):
    """Parsuje chybovou hlasku na uzivatelsky pritelive zpravy."""
    error_lower = error_msg.lower()

    # N challenge - YouTube throttling protection
    if 'n challenge' in error_lower or 'challenge solver' in error_lower:
        return 'YouTube throttling. NUTNE aktualizujte yt-dlp: yt-dlp -U'
    # SABR streaming issue (novy YouTube problem)
    elif 'sabr' in error_lower or 'missing a url' in error_lower:
        return 'YouTube blokuje stahovani. Aktualizujte yt-dlp: yt-dlp -U'
    elif 'sign in' in error_lower and 'age' in error_lower:
        return 'Video je vekove omezene. Aktualizujte yt-dlp: yt-dlp -U'
    elif 'sign in' in error_lower:
        return 'Vyzaduje prihlaseni. Aktualizujte yt-dlp: yt-dlp -U'
    elif 'private' in error_lower:
        return 'Video je soukrome'
    elif 'members only' in error_lower or 'member' in error_lower:
        return 'Video je pouze pro cleny kanalu'
    elif 'copyright' in error_lower or 'blocked' in error_lower:
        return 'Video bylo zablokovano z duvodu autorskych prav'
    elif 'live' in error_lower and ('not' in error_lower or 'offline' in error_lower):
        return 'Zivy prenos jeste nezacal nebo uz skoncil'
    elif '403' in error_msg or 'forbidden' in error_lower:
        return 'Pristup odepren (403). Aktualizujte yt-dlp: yt-dlp -U'
    elif '404' in error_msg:
        return 'Video nebylo nalezeno (404)'
    elif 'rate' in error_lower or '429' in error_msg:
        return 'Prilis mnoho pozadavku (429). Pockejte chvili a zkuste znovu'
    elif 'unavailable' in error_lower or 'not available' in error_lower:
        return 'Video neni dostupne. Aktualizujte yt-dlp: yt-dlp -U'
    elif 'no suitable' in error_lower or 'no format' in error_lower:
        return 'Zadny kompatibilni format. Zkuste jinou kvalitu nebo aktualizujte yt-dlp'
    elif 'ffmpeg' in error_lower or 'postprocess' in error_lower:
        return 'Chyba zpracovani videa. Overtte ze ffmpeg je spravne nainstalovan'
    elif 'skipping' in error_lower and 'client' in error_lower:
        return 'YouTube omezuje stahovani. Aktualizujte yt-dlp: yt-dlp -U'

    # Zkratit dlouhe chyby ale zachovat vice informaci
    if len(error_msg) > 200:
        return error_msg[:200] + '...'
    return error_msg

# ============================================================================
# HLAVNI LOOP
# ============================================================================

def main():
    """Hlavni funkce - zpracovava zpravy od extension."""

    while True:
        try:
            message = read_message()
        except Exception:
            break

        if message is None:
            break

        action = message.get('action')

        try:
            if action == 'check':
                result = handle_check(message)
            elif action == 'test':
                result = handle_test(message)
            elif action == 'download':
                result = handle_download(message)
            elif action == 'ping':
                result = {
                    'success': True,
                    'version': VERSION,
                }
            else:
                result = {
                    'success': False,
                    'error': f'Neznama akce: {action}'
                }

            send_message(result)

            # Po stazeni ukoncit
            if action == 'download':
                break

        except Exception as e:
            send_message({
                'success': False,
                'error': str(e)[:200]
            })

if __name__ == '__main__':
    main()
