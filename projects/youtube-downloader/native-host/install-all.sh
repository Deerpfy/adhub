#!/bin/bash
#
# AdHub YouTube Downloader - Kompletni instalator pro Linux/macOS
# Verze: 5.5
#
# Automaticky stahne a nainstaluje:
# - yt-dlp (pro HD/4K stahovani)
# - ffmpeg (pro audio konverzi)
# - Native Host (pro komunikaci s rozsirenim)
#

set -e

# Barvy
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Instalacni cesta
INSTALL_DIR="$HOME/.local/share/adhub"
NATIVE_HOST_DIR="$INSTALL_DIR/native-host"

# Detekce OS
OS="$(uname -s)"
ARCH="$(uname -m)"

echo ""
echo -e "${YELLOW}==============================================${NC}"
echo -e "${YELLOW}  AdHub YouTube Downloader - Instalator v5.5${NC}"
echo -e "${YELLOW}==============================================${NC}"
echo ""

echo -e "${GREEN}[+]${NC} Detekce systemu..."
echo -e "    OS: $OS"
echo -e "    Architektura: $ARCH"

# Vytvoreni instalacnich slozek
echo -e "${GREEN}[+]${NC} Vytvarim instalacni slozky..."
mkdir -p "$INSTALL_DIR/bin"
mkdir -p "$NATIVE_HOST_DIR"
echo -e "    Instalacni cesta: $INSTALL_DIR"

# Funkce pro stazeni
download_file() {
    local url="$1"
    local output="$2"

    if command -v curl &> /dev/null; then
        curl -L -o "$output" "$url"
    elif command -v wget &> /dev/null; then
        wget -O "$output" "$url"
    else
        echo -e "${RED}[!]${NC} Chybi curl nebo wget!"
        exit 1
    fi
}

# Instalace yt-dlp
echo -e "${GREEN}[+]${NC} Stahuji yt-dlp..."
YTDLP_PATH="$INSTALL_DIR/bin/yt-dlp"

if [[ "$OS" == "Darwin" ]]; then
    # macOS
    if [[ "$ARCH" == "arm64" ]]; then
        YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
    else
        YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
    fi
else
    # Linux
    YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
fi

download_file "$YTDLP_URL" "$YTDLP_PATH"
chmod +x "$YTDLP_PATH"

# Overeni
YTDLP_VERSION=$("$YTDLP_PATH" --version 2>/dev/null || echo "unknown")
echo -e "    yt-dlp: $YTDLP_PATH"
echo -e "    Verze: $YTDLP_VERSION"

# Instalace ffmpeg
echo -e "${GREEN}[+]${NC} Kontroluji ffmpeg..."
FFMPEG_PATH=""

if command -v ffmpeg &> /dev/null; then
    FFMPEG_PATH=$(which ffmpeg)
    FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n1)
    echo -e "    ffmpeg nalezen: $FFMPEG_PATH"
    echo -e "    Verze: $FFMPEG_VERSION"
else
    echo -e "${YELLOW}[!]${NC} ffmpeg neni nainstalovan"

    if [[ "$OS" == "Darwin" ]]; then
        # macOS - zkusit Homebrew
        if command -v brew &> /dev/null; then
            echo -e "    Instaluji pres Homebrew..."
            brew install ffmpeg
            FFMPEG_PATH=$(which ffmpeg)
        else
            echo -e "${CYAN}    Pro instalaci ffmpeg spustte:${NC}"
            echo -e "    brew install ffmpeg"
            echo -e "    (nebo nainstalujte Homebrew z https://brew.sh)"
        fi
    else
        # Linux
        echo -e "${CYAN}    Pro instalaci ffmpeg spustte:${NC}"
        if command -v apt &> /dev/null; then
            echo -e "    sudo apt install ffmpeg"
        elif command -v dnf &> /dev/null; then
            echo -e "    sudo dnf install ffmpeg"
        elif command -v pacman &> /dev/null; then
            echo -e "    sudo pacman -S ffmpeg"
        else
            echo -e "    Nainstalujte ffmpeg pomoci package manageru vasi distribuce"
        fi
    fi
fi

# Vytvoreni Native Host
echo -e "${GREEN}[+]${NC} Vytvarim Native Host..."

# Escapovani cest pro Python
YTDLP_PATH_ESCAPED="${YTDLP_PATH//\\/\\\\}"
FFMPEG_PATH_ESCAPED="${FFMPEG_PATH//\\/\\\\}"

cat > "$NATIVE_HOST_DIR/adhub_yt_host.py" << 'PYTHON_SCRIPT'
#!/usr/bin/env python3
"""
AdHub YouTube Downloader - Native Host v5.5
"""
import sys
import os
import json
import struct
import subprocess
import shutil
import time
import tempfile
import atexit

VERSION = '5.5'
MAX_RETRIES = 3
RETRY_DELAY = 2

# Cesty k nastrojum (nastavene instalatorem)
YTDLP_PATH = '__YTDLP_PATH__'
FFMPEG_PATH = '__FFMPEG_PATH__'

_temp_cookie_file = None

def cleanup_temp_cookies():
    global _temp_cookie_file
    if _temp_cookie_file and os.path.exists(_temp_cookie_file):
        try:
            os.remove(_temp_cookie_file)
        except:
            pass

atexit.register(cleanup_temp_cookies)

def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    message_length = struct.unpack('I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

def send_message(message):
    encoded = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

def find_tool(tool_name, custom_path=None):
    paths_to_check = []
    if custom_path and custom_path.strip():
        paths_to_check.append(custom_path.strip())
    if tool_name == 'yt-dlp' and YTDLP_PATH:
        paths_to_check.append(YTDLP_PATH)
    if tool_name == 'ffmpeg' and FFMPEG_PATH:
        paths_to_check.append(FFMPEG_PATH)
    which_path = shutil.which(tool_name)
    if which_path:
        paths_to_check.append(which_path)

    for path in paths_to_check:
        result = check_tool_at_path(path)
        if result['available']:
            return result
    return {'available': False, 'path': None, 'version': None}

def check_tool_at_path(path):
    try:
        result = subprocess.run([path, '--version'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            output = result.stdout.strip()
            version = output.split('\n')[0] if output else 'unknown'
            if 'yt-dlp' in version.lower():
                parts = version.split()
                version = parts[1] if len(parts) > 1 else parts[0]
            elif 'ffmpeg' in version.lower():
                parts = version.split()
                for i, p in enumerate(parts):
                    if p == 'version' and i + 1 < len(parts):
                        version = parts[i + 1]
                        break
            return {'available': True, 'path': path, 'version': version[:20]}
    except:
        pass
    return {'available': False, 'path': path, 'version': None}

def get_download_dir():
    downloads = os.path.expanduser('~/Downloads')
    if os.path.exists(downloads):
        return downloads
    return os.path.expanduser('~')

def save_cookies_to_temp(cookies_content):
    global _temp_cookie_file
    if not cookies_content:
        return None
    try:
        fd, temp_path = tempfile.mkstemp(suffix='.txt', prefix='adhub_cookies_')
        with os.fdopen(fd, 'w') as f:
            f.write(cookies_content)
        _temp_cookie_file = temp_path
        return temp_path
    except:
        return None

def get_cookies_path(cookies_from_extension=None):
    if cookies_from_extension:
        temp_path = save_cookies_to_temp(cookies_from_extension)
        if temp_path:
            return temp_path
    possible_paths = [
        os.path.expanduser('~/cookies.txt'),
        os.path.expanduser('~/youtube_cookies.txt'),
    ]
    for path in possible_paths:
        if os.path.exists(path):
            return path
    return None

def handle_check(message):
    ytdlp_path = message.get('ytdlpPath', '')
    ffmpeg_path = message.get('ffmpegPath', '')
    ytdlp_result = find_tool('yt-dlp', ytdlp_path)
    ffmpeg_result = find_tool('ffmpeg', ffmpeg_path)
    return {
        'success': True,
        'version': VERSION,
        'ytdlp': ytdlp_result,
        'ffmpeg': ffmpeg_result,
        'download_dir': get_download_dir(),
    }

def handle_test(message):
    tool = message.get('tool')
    path = message.get('path', '')
    if not path:
        return {'available': False, 'error': 'Cesta neni zadana'}
    return check_tool_at_path(path)

def handle_download(message, retry_count=0):
    url = message.get('url')
    format_type = message.get('format', 'video')
    quality = message.get('quality', 'best')
    audio_format = message.get('audioFormat')
    ytdlp_path = message.get('ytdlpPath', '')
    ffmpeg_path = message.get('ffmpegPath', '')
    use_cookies = message.get('useCookies', True)

    if not url:
        return {'success': False, 'error': 'URL neni zadana'}

    ytdlp = find_tool('yt-dlp', ytdlp_path)
    if not ytdlp['available']:
        return {'success': False, 'error': 'yt-dlp neni dostupny'}

    output_dir = get_download_dir()
    output_template = os.path.join(output_dir, '%(title).150s.%(ext)s')

    cmd = [ytdlp['path'], '--no-playlist', '--no-warnings', '--ignore-errors', '--no-check-certificates']

    cookies_from_ext = message.get('cookies')
    cookies_path = get_cookies_path(cookies_from_ext)
    if use_cookies and cookies_path:
        cmd.extend(['--cookies', cookies_path])

    if format_type == 'audio' or audio_format:
        cmd.extend(['-f', 'bestaudio/best'])
        if audio_format in ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac']:
            cmd.extend(['-x', '--audio-format', audio_format, '--audio-quality', '0'])
            ffmpeg = find_tool('ffmpeg', ffmpeg_path)
            if ffmpeg['available']:
                ffmpeg_dir = os.path.dirname(ffmpeg['path'])
                if ffmpeg_dir:
                    cmd.extend(['--ffmpeg-location', ffmpeg_dir])
    else:
        if quality and quality != 'best':
            cmd.extend(['-f', f'bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/bestvideo+bestaudio/best'])
        else:
            cmd.extend(['-f', 'bestvideo+bestaudio/best'])
        cmd.extend(['--merge-output-format', 'mp4'])
        ffmpeg = find_tool('ffmpeg', ffmpeg_path)
        if ffmpeg['available']:
            ffmpeg_dir = os.path.dirname(ffmpeg['path'])
            if ffmpeg_dir:
                cmd.extend(['--ffmpeg-location', ffmpeg_dir])

    cmd.extend(['-o', output_template])
    cmd.append(url)

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        if result.returncode == 0:
            return {'success': True, 'filename': 'video.mp4', 'filepath': output_dir}
        else:
            error_msg = result.stderr or result.stdout or 'Neznama chyba'
            if retry_count < MAX_RETRIES:
                time.sleep(RETRY_DELAY)
                return handle_download(message, retry_count + 1)
            return {'success': False, 'error': error_msg[:200]}
    except subprocess.TimeoutExpired:
        return {'success': False, 'error': 'Timeout - zkuste nizsi kvalitu'}
    except Exception as e:
        if retry_count < MAX_RETRIES:
            time.sleep(RETRY_DELAY)
            return handle_download(message, retry_count + 1)
        return {'success': False, 'error': str(e)[:200]}

def main():
    while True:
        try:
            message = read_message()
        except:
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
                result = {'success': True, 'version': VERSION}
            else:
                result = {'success': False, 'error': f'Neznama akce: {action}'}
            send_message(result)
            if action == 'download':
                break
        except Exception as e:
            send_message({'success': False, 'error': str(e)[:200]})

if __name__ == '__main__':
    main()
PYTHON_SCRIPT

# Nahradit placeholder cesty
sed -i.bak "s|__YTDLP_PATH__|$YTDLP_PATH|g" "$NATIVE_HOST_DIR/adhub_yt_host.py"
sed -i.bak "s|__FFMPEG_PATH__|$FFMPEG_PATH|g" "$NATIVE_HOST_DIR/adhub_yt_host.py"
rm -f "$NATIVE_HOST_DIR/adhub_yt_host.py.bak"

chmod +x "$NATIVE_HOST_DIR/adhub_yt_host.py"
echo -e "    Native Host: $NATIVE_HOST_DIR/adhub_yt_host.py"

# Vytvoreni Native Host manifestu
echo -e "${GREEN}[+]${NC} Registruji Native Host..."

MANIFEST_CONTENT=$(cat << EOF
{
  "name": "com.adhub.ytdownloader",
  "description": "AdHub YouTube Downloader Native Host",
  "path": "$NATIVE_HOST_DIR/adhub_yt_host.py",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://*/",
    "chromium-extension://*/"
  ]
}
EOF
)

# Chrome/Chromium
if [[ "$OS" == "Darwin" ]]; then
    # macOS
    CHROME_MANIFEST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    CHROMIUM_MANIFEST_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
else
    # Linux
    CHROME_MANIFEST_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    CHROMIUM_MANIFEST_DIR="$HOME/.config/chromium/NativeMessagingHosts"
fi

mkdir -p "$CHROME_MANIFEST_DIR"
mkdir -p "$CHROMIUM_MANIFEST_DIR"

echo "$MANIFEST_CONTENT" > "$CHROME_MANIFEST_DIR/com.adhub.ytdownloader.json"
echo "$MANIFEST_CONTENT" > "$CHROMIUM_MANIFEST_DIR/com.adhub.ytdownloader.json"

echo -e "    Chrome:   $CHROME_MANIFEST_DIR"
echo -e "    Chromium: $CHROMIUM_MANIFEST_DIR"

# Kontrola Python
echo -e "${GREEN}[+]${NC} Kontroluji Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    echo -e "    $PYTHON_VERSION"
else
    echo -e "${RED}[!]${NC} Python 3 neni nainstalovan!"
    if [[ "$OS" == "Darwin" ]]; then
        echo -e "    Nainstalujte: brew install python3"
    else
        echo -e "    Nainstalujte: sudo apt install python3"
    fi
fi

# Pridani do PATH (volitelne)
echo ""
echo -e "${YELLOW}[?]${NC} Chcete pridat yt-dlp do PATH? (y/n)"
read -r ADD_PATH

if [[ "$ADD_PATH" == "y" || "$ADD_PATH" == "Y" ]]; then
    SHELL_RC=""
    if [[ -f "$HOME/.zshrc" ]]; then
        SHELL_RC="$HOME/.zshrc"
    elif [[ -f "$HOME/.bashrc" ]]; then
        SHELL_RC="$HOME/.bashrc"
    fi

    if [[ -n "$SHELL_RC" ]]; then
        echo "" >> "$SHELL_RC"
        echo "# AdHub YouTube Downloader" >> "$SHELL_RC"
        echo "export PATH=\"\$PATH:$INSTALL_DIR/bin\"" >> "$SHELL_RC"
        echo -e "    Pridano do $SHELL_RC"
        echo -e "    Spustte: source $SHELL_RC"
    fi
fi

# Hotovo
echo ""
echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}  INSTALACE DOKONCENA!${NC}"
echo -e "${GREEN}==============================================${NC}"
echo ""
echo -e "    yt-dlp:      $YTDLP_PATH"
if [[ -n "$FFMPEG_PATH" ]]; then
    echo -e "    ffmpeg:      $FFMPEG_PATH"
fi
echo -e "    Native Host: $NATIVE_HOST_DIR/adhub_yt_host.py"
echo ""
echo -e "${YELLOW}Dalsi kroky:${NC}"
echo "1. Restartujte prohlizec (Chrome/Chromium)"
echo "2. Otevrete rozsireni AdHub YouTube Downloader"
echo "3. V Nastaveni by mely byt cesty automaticky detekovany"
echo ""
