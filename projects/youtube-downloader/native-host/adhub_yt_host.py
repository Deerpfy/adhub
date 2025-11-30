#!/usr/bin/env python3
"""
AdHub YouTube Downloader - Native Host v6.1
============================================
Native Messaging host pro browser extension.

STRATEGIE v6.1:
YouTube vyzaduje JavaScript runtime pro n-challenge.
Reseni: Kombinace ruznych player clients + format selectoru.

KLICOVE ZMENY v6.1:
- Opraveny format selectory pro kompatibilitu s ruznymi player klienty
- Pridane fallback format selectory pri chybe "format not available"
- Kazda strategie ma vlastni format selector optimalizovany pro dany klient
- Lepsi error handling a retry logika

Pokud vse selze: Doporucit "Zakladni stahovani" (do 720p)
"""

import sys
import os
import json
import struct
import subprocess
import shutil
import time
import urllib.request
import ssl

# ============================================================================
# KONFIGURACE
# ============================================================================

VERSION = '6.1'
MAX_RETRIES = 6  # Pocet strategii k vyzkouseni (vice variant)
RETRY_DELAY = 1  # sekundy - kratsi pro rychlejsi retry
YTDLP_RELEASES_URL = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest'
YTDLP_DOWNLOAD_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'

# ============================================================================
# STRATEGIE v6.1 - Kombinace player clients + format selectoru
# ============================================================================
# Kazda strategie ma:
# - player_client: Ktery YouTube klient pouzit (None = default)
# - format_video: Format selector pro video
# - format_audio: Format selector pro audio
# - description: Popis strategie pro ladeni
#
# DULEZITE: Ruzne player clients maji ruzne dostupne formaty!
# - Default/Web: Vse dostupne, ale muze byt n-challenge
# - TV: Progresivni formaty (video+audio dohromady), bez n-challenge
# - iOS/Android: Omezene formaty
# ============================================================================

RETRY_STRATEGIES = [
    # Pokus 1: Default s jednoduchym selectorem (nejspolehlivejsi)
    {
        'player_client': None,
        'format_video': 'bv*+ba/b',  # Best video + best audio, fallback na best
        'format_audio': 'ba/b',       # Best audio, fallback na best
        'description': 'Default (auto)'
    },
    # Pokus 2: Default s explicitnim merge
    {
        'player_client': None,
        'format_video': 'bestvideo+bestaudio/best',
        'format_audio': 'bestaudio/best',
        'description': 'Default (merge)'
    },
    # Pokus 3: Web Embedded klient - casto obchazi omezeni
    {
        'player_client': 'youtube:player_client=web_embedded',
        'format_video': 'bv*+ba/b',
        'format_audio': 'ba/b',
        'description': 'Web Embedded'
    },
    # Pokus 4: TV klient - progresivni formaty (video+audio dohromady)
    # POZOR: TV klient nema oddelene video/audio, pouzij jednoduchy 'best'
    {
        'player_client': 'youtube:player_client=tv',
        'format_video': 'best',  # TV ma hlavne progresivni formaty
        'format_audio': 'best',
        'description': 'TV client'
    },
    # Pokus 5: MWeb (mobilni web) - dalsi varianta
    {
        'player_client': 'youtube:player_client=mweb',
        'format_video': 'bv*+ba/b',
        'format_audio': 'ba/b',
        'description': 'Mobile Web'
    },
    # Pokus 6: Posledni pokus - uplne jednoduchy 'best'
    {
        'player_client': None,
        'format_video': 'best',
        'format_audio': 'best',
        'description': 'Fallback (best)'
    },
]

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
# YT-DLP UPDATE FUNKCE
# ============================================================================

def get_latest_ytdlp_version():
    """Ziska nejnovejsi verzi yt-dlp z GitHub API."""
    try:
        # Vytvorit SSL context (nekdy potreba na Windows)
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        req = urllib.request.Request(
            YTDLP_RELEASES_URL,
            headers={'User-Agent': 'AdHub-YT-Downloader'}
        )

        with urllib.request.urlopen(req, timeout=10, context=ctx) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get('tag_name', None)
    except Exception as e:
        return None

def get_installed_ytdlp_version(ytdlp_path=None):
    """Ziska verzi nainstalovaneho yt-dlp."""
    ytdlp = find_tool('yt-dlp', ytdlp_path, DEFAULT_YTDLP_PATHS)
    if not ytdlp['available']:
        return None
    return ytdlp.get('version'), ytdlp.get('path')

def download_ytdlp_update(target_path=None):
    """Stahne nejnovejsi verzi yt-dlp."""
    try:
        # Urcit cilovou cestu
        if not target_path:
            # Defaultni cesta - AdHub slozka
            adhub_dir = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'AdHub', 'yt-dlp')
            if not os.path.exists(adhub_dir):
                os.makedirs(adhub_dir, exist_ok=True)
            target_path = os.path.join(adhub_dir, 'yt-dlp.exe')

        # Vytvorit zalohu pokud existuje
        if os.path.exists(target_path):
            backup_path = target_path + '.backup'
            try:
                if os.path.exists(backup_path):
                    os.remove(backup_path)
                shutil.copy2(target_path, backup_path)
            except:
                pass

        # Stahnout novou verzi
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        req = urllib.request.Request(
            YTDLP_DOWNLOAD_URL,
            headers={'User-Agent': 'AdHub-YT-Downloader'}
        )

        with urllib.request.urlopen(req, timeout=120, context=ctx) as response:
            with open(target_path, 'wb') as f:
                f.write(response.read())

        # Overit ze funguje
        result = check_tool_at_path(target_path, 'yt-dlp')
        if result['available']:
            # Smazat zalohu
            backup_path = target_path + '.backup'
            if os.path.exists(backup_path):
                try:
                    os.remove(backup_path)
                except:
                    pass
            return {
                'success': True,
                'version': result['version'],
                'path': target_path
            }
        else:
            # Obnovit zalohu
            backup_path = target_path + '.backup'
            if os.path.exists(backup_path):
                shutil.copy2(backup_path, target_path)
            return {
                'success': False,
                'error': 'Stazeny soubor nefunguje'
            }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)[:200]
        }

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

def handle_download(message, strategy_index=0):
    """Stahne video/audio z YouTube s podporou vsech typu videi.

    v6.1: Pri chybe zkusi ruzne strategie (kombinace player clients + format selectoru):
    - Kazda strategie ma vlastni player_client a format selector
    - Ruzne player clients maji ruzne dostupne formaty
    - Fallback strategie pouziva jednoduchy 'best' selector
    """
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

    # =========================================================================
    # v6.1: STRATEGIE - Kombinace player client + format selector
    # =========================================================================
    # Kazda strategie ma:
    # - player_client: Ktery YouTube klient pouzit
    # - format_video/format_audio: Format selector optimalizovany pro klienta
    #
    # DULEZITE: TV klient ma pouze progresivni formaty (video+audio dohromady),
    # proto pro nej pouzivame jednoduchy 'best' selector.
    # =========================================================================

    # Ziskat aktualni strategii
    strategy = None
    if strategy_index < len(RETRY_STRATEGIES):
        strategy = RETRY_STRATEGIES[strategy_index]
    else:
        # Fallback - posledni strategie
        strategy = RETRY_STRATEGIES[-1]

    strategy_desc = strategy.get('description', f'Strategy {strategy_index}')

    cmd.extend([
        '--no-playlist',           # Nestahovat playlisty
        '--no-check-certificates', # Preskocit problemy s certifikaty
        '--no-warnings',           # Potlacit varovani (cleaner output)
    ])

    # Aplikovat player client ze strategie
    player_client = strategy.get('player_client')
    if player_client:
        cmd.extend(['--extractor-args', player_client])

    # Cookies - pouzit JEN kdyz je extension explicitne posle
    # (pro vekove omezena videa kde je uzivatel prihlasen)
    cookies_from_ext = message.get('cookies')
    if use_cookies and cookies_from_ext:
        cookies_path = get_cookies_path(cookies_from_ext)
        if cookies_path:
            cmd.extend(['--cookies', cookies_path])

    # Format - pouzit selector ze strategie
    if format_type == 'audio' or audio_format:
        # Audio format ze strategie
        audio_selector = strategy.get('format_audio', 'ba/b')
        cmd.extend(['-f', audio_selector])

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
        # Video format ze strategie
        base_format = strategy.get('format_video', 'bv*+ba/b')

        # Aplikovat omezeni kvality pokud je zadano
        if quality and quality != 'best' and base_format not in ['best', 'b']:
            # Pro komplexni selectory pridej height filter
            # Pro jednoduchy 'best' nechej jak je (TV klient)
            if '+' in base_format:
                # Napr. 'bv*+ba/b' -> 'bv*[height<=720]+ba/b'
                parts = base_format.split('+')
                video_part = parts[0]
                rest = '+'.join(parts[1:])
                format_selector = f'{video_part}[height<={quality}]+{rest}'
            else:
                format_selector = base_format
        else:
            format_selector = base_format

        cmd.extend(['-f', format_selector])

        # Merge a remux nastaveni (pouze pokud neni jednoduchy 'best')
        if base_format not in ['best', 'b']:
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
                'strategy_used': strategy_index,
                'strategy_desc': strategy_desc,
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

            # v6.1: Zkusit dalsi strategii pokud je k dispozici
            # Rozhodnout zda retry na zaklade typu chyby
            next_strategy_index = strategy_index + 1
            can_retry = next_strategy_index < len(RETRY_STRATEGIES)
            should_retry = should_retry_error(error_msg)

            if can_retry and should_retry:
                time.sleep(RETRY_DELAY)
                return handle_download(message, next_strategy_index)

            # Parsovat uzivatelsky pritelive chybove hlasky
            friendly_error = parse_error_message(error_msg)

            # Pripojit informaci o vyzkousenych strategiich
            strategies_tried = strategy_index + 1
            if strategies_tried > 1:
                friendly_error += f' (vyzkouseno {strategies_tried} strategii)'

            # Pripojit cast raw chyby pro ladeni
            debug_hint = error_msg[:300].replace('\n', ' ').strip()

            return {
                'success': False,
                'error': friendly_error,
                'raw_error': debug_hint,
                'returncode': result.returncode,
                'strategies_tried': strategies_tried,
                'last_strategy': strategy_desc
            }

    except subprocess.TimeoutExpired:
        return {'success': False, 'error': 'Stahovani trvalo prilis dlouho. Zkuste nizsi kvalitu.'}
    except Exception as e:
        # Zkusit dalsi strategii i pri vyjimce
        next_strategy_index = strategy_index + 1
        if next_strategy_index < len(RETRY_STRATEGIES):
            time.sleep(RETRY_DELAY)
            return handle_download(message, next_strategy_index)
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
    """Urcuje zda by se mela chyba zkusit znovu.

    v6.1: Rozsireno o format-related chyby - ruzne player clients
    maji ruzne dostupne formaty, takze pri chybe formatu zkusime jiny klient.
    """
    retryable = [
        # Sitove chyby
        'HTTP Error 503',
        'HTTP Error 429',  # Rate limiting
        'Connection reset',
        'Connection refused',
        'timed out',
        'Temporary failure',
        'Unable to download',
        # YouTube anti-bot ochrana
        'n challenge',      # YouTube throttling - retry s jinym klientem
        'challenge solver', # YouTube throttling
        'nsig',             # N-signature issue
        # Format chyby - NOVE v6.1
        'format is not available',   # Hlavni oprava - zkusit jiny klient
        'requested format',          # Podobna chyba
        'no suitable format',        # Zadny vhodny format
        'no video formats',          # Zadne video formaty
        'no audio formats',          # Zadne audio formaty
        # Streaming chyby
        'sabr',             # SABR streaming issue
        'missing a url',    # Chybejici URL
        # Ostatni
        'Sign in to confirm',  # Muze pomoct jiny klient
    ]
    error_lower = error_msg.lower()
    return any(err.lower() in error_lower for err in retryable)


def parse_error_message(error_msg):
    """Parsuje chybovou hlasku na uzivatelsky pritelive zpravy.

    v6.1: Vylepsene zpravy pro format-related chyby.
    """
    error_lower = error_msg.lower()

    # N challenge - YouTube anti-bot ochrana
    if 'n challenge' in error_lower or 'challenge solver' in error_lower or 'nsig' in error_lower:
        return 'YouTube anti-bot ochrana. Pockejte 30s a zkuste znovu, nebo pouzijte Zakladni stahovani (do 720p)'
    # PO Token issue
    elif 'po token' in error_lower or 'gvs po' in error_lower:
        return 'YouTube vyzaduje overeni. Zkuste Zakladni stahovani (do 720p)'
    # Format chyby - NOVE v6.1
    elif 'format is not available' in error_lower or 'requested format' in error_lower:
        return 'Pozadovany format neni dostupny. Zkuste jinou kvalitu nebo Zakladni stahovani'
    elif 'no suitable format' in error_lower or 'no video format' in error_lower:
        return 'Zadny vhodny format. Video muze byt omezene. Zkuste Zakladni stahovani'
    # SABR streaming issue
    elif 'sabr' in error_lower or 'missing a url' in error_lower:
        return 'YouTube docasne blokuje. Pockejte 30s a zkuste znovu'
    # Age restricted
    elif 'sign in' in error_lower and 'age' in error_lower:
        return 'Video je vekove omezene. Prihlaste se na YouTube a zkuste znovu'
    elif 'sign in' in error_lower:
        return 'Vyzaduje prihlaseni do YouTube'
    # Content restrictions
    elif 'private' in error_lower:
        return 'Video je soukrome'
    elif 'members only' in error_lower or 'member' in error_lower:
        return 'Video je pouze pro cleny kanalu'
    elif 'copyright' in error_lower or 'blocked' in error_lower:
        return 'Video zablokovano (autorska prava)'
    elif 'live' in error_lower and ('not' in error_lower or 'offline' in error_lower):
        return 'Zivy prenos neni dostupny'
    # HTTP errors
    elif '403' in error_msg or 'forbidden' in error_lower:
        return 'Pristup odepren. Zkuste Zakladni stahovani'
    elif '404' in error_msg:
        return 'Video nenalezeno'
    elif 'rate' in error_lower or '429' in error_msg:
        return 'Prilis mnoho pozadavku. Pockejte 2 minuty'
    # Availability
    elif 'unavailable' in error_lower or 'not available' in error_lower:
        return 'Video neni dostupne'
    elif 'no suitable' in error_lower or 'no format' in error_lower:
        return 'Format neni dostupny. Zkuste jinou kvalitu'
    # Technical issues
    elif 'ffmpeg' in error_lower or 'postprocess' in error_lower:
        return 'Chyba ffmpeg. Zkontrolujte instalaci'
    elif 'getaddrinfo' in error_lower or 'connection' in error_lower:
        return 'Chyba site. Zkontrolujte pripojeni'

    # Zkratit dlouhe chyby
    if len(error_msg) > 150:
        return error_msg[:150] + '...'
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
            elif action == 'checkYtdlpUpdate':
                # Zkontrolovat dostupnost aktualizace yt-dlp
                ytdlp_path = message.get('ytdlpPath', '')
                installed = get_installed_ytdlp_version(ytdlp_path)
                latest = get_latest_ytdlp_version()

                if installed:
                    current_ver, current_path = installed
                else:
                    current_ver, current_path = None, None

                result = {
                    'success': True,
                    'installed': current_ver,
                    'latest': latest,
                    'path': current_path,
                    'updateAvailable': bool(latest and current_ver and latest != current_ver)
                }
            elif action == 'updateYtdlp':
                # Aktualizovat yt-dlp
                ytdlp_path = message.get('ytdlpPath', '')

                # Najit aktualni cestu k yt-dlp
                installed = get_installed_ytdlp_version(ytdlp_path)
                if installed:
                    _, target_path = installed
                else:
                    target_path = None

                result = download_ytdlp_update(target_path)
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
