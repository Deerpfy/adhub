<#
.SYNOPSIS
    AdHub YouTube Downloader - Kompletni instalator pro Windows
.DESCRIPTION
    Automaticky stahne a nainstaluje:
    - yt-dlp (pro HD/4K stahovani)
    - ffmpeg (pro audio konverzi)
    - Native Host (pro komunikaci s rozsirenim)
.NOTES
    Verze: 5.5
    Autor: Deerpfy
#>

param(
    [switch]$Silent,
    [string]$InstallPath = "$env:LOCALAPPDATA\AdHub"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Barvy pro vystup
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) { Write-Output $args }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Step($message) {
    Write-ColorOutput Green "[+] $message"
}

function Write-Info($message) {
    Write-ColorOutput Cyan "    $message"
}

function Write-Error($message) {
    Write-ColorOutput Red "[!] $message"
}

# Banner
Write-Host ""
Write-ColorOutput Yellow "=============================================="
Write-ColorOutput Yellow "  AdHub YouTube Downloader - Instalator v5.5"
Write-ColorOutput Yellow "=============================================="
Write-Host ""

# Kontrola admin prav (neni potreba, instalujeme do LOCALAPPDATA)
Write-Step "Kontrola systemu..."
Write-Info "Windows $([System.Environment]::OSVersion.Version)"
Write-Info "PowerShell $($PSVersionTable.PSVersion)"

# Vytvoreni instalacni slozky
$ytdlpPath = "$InstallPath\yt-dlp"
$ffmpegPath = "$InstallPath\ffmpeg"
$nativeHostPath = "$InstallPath\native-host"

Write-Step "Vytvarim instalacni slozky..."
New-Item -ItemType Directory -Force -Path $ytdlpPath | Out-Null
New-Item -ItemType Directory -Force -Path $ffmpegPath | Out-Null
New-Item -ItemType Directory -Force -Path $nativeHostPath | Out-Null
Write-Info "Instalacni cesta: $InstallPath"

# Stazeni yt-dlp
Write-Step "Stahuji yt-dlp..."
$ytdlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
$ytdlpExe = "$ytdlpPath\yt-dlp.exe"

try {
    Invoke-WebRequest -Uri $ytdlpUrl -OutFile $ytdlpExe -UseBasicParsing
    Write-Info "yt-dlp stazen: $ytdlpExe"

    # Overeni verze
    $ytdlpVersion = & $ytdlpExe --version 2>&1
    Write-Info "Verze: $ytdlpVersion"
} catch {
    Write-Error "Chyba pri stahovani yt-dlp: $_"
    exit 1
}

# Stazeni ffmpeg
Write-Step "Stahuji ffmpeg (muze trvat dele)..."
$ffmpegZipUrl = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
$ffmpegZip = "$env:TEMP\ffmpeg.zip"

try {
    Invoke-WebRequest -Uri $ffmpegZipUrl -OutFile $ffmpegZip -UseBasicParsing
    Write-Info "ffmpeg ZIP stazen"

    # Rozbaleni
    Write-Info "Rozbaluji ffmpeg..."
    Expand-Archive -Path $ffmpegZip -DestinationPath "$env:TEMP\ffmpeg-extract" -Force

    # Najit bin slozku a presunout
    $ffmpegBin = Get-ChildItem -Path "$env:TEMP\ffmpeg-extract" -Recurse -Directory | Where-Object { $_.Name -eq "bin" } | Select-Object -First 1
    if ($ffmpegBin) {
        Copy-Item -Path "$($ffmpegBin.FullName)\*" -Destination $ffmpegPath -Force
        Write-Info "ffmpeg nainstalovan: $ffmpegPath"

        # Overeni verze
        $ffmpegVersion = & "$ffmpegPath\ffmpeg.exe" -version 2>&1 | Select-Object -First 1
        Write-Info "Verze: $ffmpegVersion"
    }

    # Cleanup
    Remove-Item -Path $ffmpegZip -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$env:TEMP\ffmpeg-extract" -Recurse -Force -ErrorAction SilentlyContinue
} catch {
    Write-Error "Chyba pri stahovani ffmpeg: $_"
    Write-Info "Muzete nainstalovat rucne z https://ffmpeg.org/download.html"
}

# Vytvoreni Native Host
Write-Step "Vytvarim Native Host..."

# Python skript
$pythonScript = @'
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
YTDLP_PATH = r'%YTDLP_PATH%'
FFMPEG_PATH = r'%FFMPEG_PATH%'

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
'@

# Nahradit cesty
$pythonScript = $pythonScript.Replace('%YTDLP_PATH%', $ytdlpExe.Replace('\', '\\'))
$pythonScript = $pythonScript.Replace('%FFMPEG_PATH%', "$ffmpegPath\ffmpeg.exe".Replace('\', '\\'))

# Ulozit Python skript
$nativeHostScript = "$nativeHostPath\adhub_yt_host.py"
Set-Content -Path $nativeHostScript -Value $pythonScript -Encoding UTF8
Write-Info "Native Host skript: $nativeHostScript"

# Vytvoreni batch wrapperu (pro Windows bez Python)
$batchWrapper = @"
@echo off
python "%~dp0adhub_yt_host.py" %*
"@
Set-Content -Path "$nativeHostPath\adhub_yt_host.bat" -Value $batchWrapper -Encoding ASCII

# Vytvoreni Native Host manifestu pro Chrome
Write-Step "Registruji Native Host pro Chrome..."

$chromeManifest = @{
    name = "com.adhub.ytdownloader"
    description = "AdHub YouTube Downloader Native Host"
    path = $nativeHostScript
    type = "stdio"
    allowed_origins = @(
        "chrome-extension://*/",
        "chromium-extension://*/"
    )
}

# Najit ID rozsireni (pokud je nainstalovano)
$extensionId = $null
$extensionsPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Extensions"
if (Test-Path $extensionsPath) {
    # Hledat podle manifest.json s nazvem AdHub
    Get-ChildItem -Path $extensionsPath -Directory | ForEach-Object {
        $manifestPath = Join-Path $_.FullName "*\manifest.json" | Get-ChildItem -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($manifestPath) {
            $manifest = Get-Content $manifestPath.FullName -Raw | ConvertFrom-Json
            if ($manifest.name -like "*AdHub*" -or $manifest.name -like "*YouTube Downloader*") {
                $extensionId = $_.Name
            }
        }
    }
}

if ($extensionId) {
    $chromeManifest.allowed_origins = @("chrome-extension://$extensionId/")
    Write-Info "Nalezeno rozsireni: $extensionId"
}

$manifestJson = $chromeManifest | ConvertTo-Json -Depth 10
$manifestPath = "$nativeHostPath\com.adhub.ytdownloader.json"
Set-Content -Path $manifestPath -Value $manifestJson -Encoding UTF8

# Registrace v registru Windows
$regPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.adhub.ytdownloader"
New-Item -Path $regPath -Force | Out-Null
Set-ItemProperty -Path $regPath -Name "(Default)" -Value $manifestPath
Write-Info "Registrovano v: $regPath"

# Registrace pro Edge
$edgeRegPath = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.adhub.ytdownloader"
New-Item -Path $edgeRegPath -Force | Out-Null
Set-ItemProperty -Path $edgeRegPath -Name "(Default)" -Value $manifestPath
Write-Info "Registrovano pro Edge"

# Kontrola Python
Write-Step "Kontroluji Python..."
$pythonVersion = $null
try {
    $pythonVersion = & python --version 2>&1
    Write-Info "Python: $pythonVersion"
} catch {
    Write-Error "Python neni nainstalovan!"
    Write-Info "Stahnete Python z https://www.python.org/downloads/"
    Write-Info "Pri instalaci zaznacte 'Add Python to PATH'"
}

# Hotovo
Write-Host ""
Write-ColorOutput Green "=============================================="
Write-ColorOutput Green "  INSTALACE DOKONCENA!"
Write-ColorOutput Green "=============================================="
Write-Host ""
Write-Info "yt-dlp:      $ytdlpExe"
Write-Info "ffmpeg:      $ffmpegPath\ffmpeg.exe"
Write-Info "Native Host: $nativeHostScript"
Write-Host ""
Write-ColorOutput Yellow "Dalsi kroky:"
Write-Host "1. Restartujte prohlizec (Chrome/Edge)"
Write-Host "2. Otevrete rozsireni AdHub YouTube Downloader"
Write-Host "3. V Nastaveni zadejte cesty:"
Write-ColorOutput Cyan "   yt-dlp:  $ytdlpExe"
Write-ColorOutput Cyan "   ffmpeg:  $ffmpegPath\ffmpeg.exe"
Write-Host ""

if (-not $Silent) {
    Write-Host "Stisknete Enter pro ukonceni..."
    Read-Host
}
