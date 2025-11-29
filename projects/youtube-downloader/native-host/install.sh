#!/bin/bash
#
# AdHub YouTube Downloader - Instalační script (Linux/macOS)
#
# Tento script:
# 1. Nainstaluje yt-dlp (pokud chybí)
# 2. Zaregistruje Native Host pro Chrome/Chromium/Brave/Edge
#

set -e

echo "=============================================="
echo "  AdHub YouTube Downloader - Instalace"
echo "=============================================="

# Cesta k tomuto scriptu
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_SCRIPT="$SCRIPT_DIR/adhub_yt_host.py"
MANIFEST_TEMPLATE="$SCRIPT_DIR/com.adhub.ytdownloader.json"

# Kontrola Python
if ! command -v python3 &> /dev/null; then
    echo "CHYBA: Python3 není nainstalován!"
    echo "Nainstalujte Python3 a spusťte znovu."
    exit 1
fi
echo "✓ Python3 nalezen"

# Instalace yt-dlp
echo ""
echo "Kontroluji yt-dlp..."
if ! python3 -c "import yt_dlp" 2>/dev/null; then
    echo "Instaluji yt-dlp..."
    pip3 install --user yt-dlp
fi
echo "✓ yt-dlp připraven"

# Kontrola FFmpeg
if command -v ffmpeg &> /dev/null; then
    echo "✓ FFmpeg nalezen"
else
    echo "⚠ FFmpeg nenalezen (MP3/WAV konverze nebude fungovat)"
    echo "  Nainstalujte: brew install ffmpeg (macOS) nebo apt install ffmpeg (Linux)"
fi

# Udělat host script spustitelným
chmod +x "$HOST_SCRIPT"

# Zjistit Extension ID
echo ""
echo "=============================================="
echo "  DŮLEŽITÉ: Potřebuji Extension ID"
echo "=============================================="
echo ""
echo "1. Nainstalujte extension do Chrome:"
echo "   chrome://extensions → Vývojářský režim → Načíst rozbalené"
echo ""
echo "2. Zkopírujte ID extension (např: abcdefghijklmnopqrstuvwxyz)"
echo ""
read -p "Zadejte Extension ID: " EXTENSION_ID

if [ -z "$EXTENSION_ID" ]; then
    echo "CHYBA: Extension ID je povinné!"
    exit 1
fi

# Vytvořit manifest
echo ""
echo "Vytvářím Native Host manifest..."

# Určit cílovou složku podle OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CHROME_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    CHROMIUM_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
    BRAVE_DIR="$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    EDGE_DIR="$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
else
    # Linux
    CHROME_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    CHROMIUM_DIR="$HOME/.config/chromium/NativeMessagingHosts"
    BRAVE_DIR="$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    EDGE_DIR="$HOME/.config/microsoft-edge/NativeMessagingHosts"
fi

# Vytvořit manifest JSON
MANIFEST_CONTENT=$(cat <<EOF
{
  "name": "com.adhub.ytdownloader",
  "description": "AdHub YouTube Downloader Native Host",
  "path": "$HOST_SCRIPT",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF
)

# Nainstalovat pro všechny prohlížeče
install_manifest() {
    local dir="$1"
    local name="$2"

    if [ -d "$(dirname "$dir")" ] || mkdir -p "$dir" 2>/dev/null; then
        mkdir -p "$dir"
        echo "$MANIFEST_CONTENT" > "$dir/com.adhub.ytdownloader.json"
        echo "✓ Nainstalováno pro $name"
    fi
}

install_manifest "$CHROME_DIR" "Google Chrome"
install_manifest "$CHROMIUM_DIR" "Chromium"
install_manifest "$BRAVE_DIR" "Brave"
install_manifest "$EDGE_DIR" "Microsoft Edge"

echo ""
echo "=============================================="
echo "  INSTALACE DOKONČENA!"
echo "=============================================="
echo ""
echo "Nyní:"
echo "1. Restartujte prohlížeč"
echo "2. Jděte na YouTube video"
echo "3. Klikněte na tlačítko 'Stáhnout'"
echo ""
echo "Videa se budou stahovat do: ~/Downloads"
echo ""
