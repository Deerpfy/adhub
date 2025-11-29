#!/bin/bash
# AdHub YouTube Downloader - Start Server
# Spouští lokální server pro stahování YouTube videí

echo "=============================================="
echo "  AdHub YouTube Downloader - Server"
echo "=============================================="

# Kontrola Python
if ! command -v python3 &> /dev/null; then
    echo "CHYBA: Python3 není nainstalován!"
    exit 1
fi

# Kontrola yt-dlp
if ! python3 -c "import yt_dlp" 2>/dev/null; then
    echo "Instaluji yt-dlp..."
    pip3 install yt-dlp
fi

# Kontrola FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo ""
    echo "VAROVÁNÍ: FFmpeg není nainstalován!"
    echo "Konverze do MP3/WAV/FLAC nebude fungovat."
    echo ""
    echo "Instalace FFmpeg:"
    echo "  macOS:   brew install ffmpeg"
    echo "  Ubuntu:  sudo apt install ffmpeg"
    echo "  Windows: https://ffmpeg.org/download.html"
    echo ""
fi

# Spustit server
cd "$(dirname "$0")"
python3 yt_server.py
