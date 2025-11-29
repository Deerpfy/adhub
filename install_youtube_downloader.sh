#!/bin/bash
# Instalační skript pro YouTube Downloader

echo "=========================================="
echo "  INSTALACE YOUTUBE DOWNLOADER"
echo "=========================================="

# Kontrola Python
if ! command -v python3 &> /dev/null; then
    echo "CHYBA: Python3 není nainstalován!"
    echo "Nainstalujte Python3: https://python.org"
    exit 1
fi

echo "✓ Python3 nalezen: $(python3 --version)"

# Instalace yt-dlp
echo ""
echo "Instaluji yt-dlp..."
pip3 install --upgrade yt-dlp

if [ $? -eq 0 ]; then
    echo "✓ yt-dlp nainstalován"
else
    echo "CHYBA: Nepodařilo se nainstalovat yt-dlp"
    exit 1
fi

# Kontrola FFmpeg (volitelné)
echo ""
if command -v ffmpeg &> /dev/null; then
    echo "✓ FFmpeg nalezen (konverze audio formátů bude fungovat)"
else
    echo "⚠ FFmpeg není nainstalován"
    echo "  Pro konverzi do MP3/WAV/FLAC nainstalujte FFmpeg:"
    echo "  - macOS:   brew install ffmpeg"
    echo "  - Ubuntu:  sudo apt install ffmpeg"
    echo "  - Windows: https://ffmpeg.org/download.html"
fi

echo ""
echo "=========================================="
echo "  INSTALACE DOKONČENA!"
echo "=========================================="
echo ""
echo "Použití:"
echo "  python3 youtube_downloader.py                    # Interaktivní režim"
echo "  python3 youtube_downloader.py URL                # Stáhne v nejlepší kvalitě"
echo "  python3 youtube_downloader.py URL --format mp3   # Stáhne jako MP3"
echo "  python3 youtube_downloader.py URL --list         # Zobrazí formáty"
echo ""
