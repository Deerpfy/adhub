#!/bin/bash
# AdHub YouTube Downloader - Instalator pro Firefox (Linux/macOS) v5.7

set -e
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}==============================================${NC}"
echo -e "${YELLOW}  AdHub YouTube Downloader - Firefox v5.7${NC}"
echo -e "${YELLOW}==============================================${NC}"
echo ""

INSTALL_DIR="$HOME/.local/share/adhub"
mkdir -p "$INSTALL_DIR/bin" "$INSTALL_DIR/native-host"

# yt-dlp
echo -e "${GREEN}[+]${NC} Stahuji yt-dlp..."
YTDLP="$INSTALL_DIR/bin/yt-dlp"
if [[ "$(uname)" == "Darwin" ]]; then
    curl -L -o "$YTDLP" "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
else
    curl -L -o "$YTDLP" "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
fi
chmod +x "$YTDLP"
echo -e "    ${CYAN}$YTDLP${NC}"

# ffmpeg check
FFMPEG_PATH=""
if command -v ffmpeg &> /dev/null; then
    FFMPEG_PATH=$(which ffmpeg)
    echo -e "${GREEN}[+]${NC} ffmpeg nalezen: ${CYAN}$FFMPEG_PATH${NC}"
else
    echo -e "${YELLOW}[!]${NC} ffmpeg neni nainstalovan"
    if [[ "$(uname)" == "Darwin" ]]; then
        echo "    Nainstalujte: brew install ffmpeg"
    else
        echo "    Nainstalujte: sudo apt install ffmpeg"
    fi
fi

# Python check
echo -e "${GREEN}[+]${NC} Kontroluji Python..."
PYTHON_CMD=""
for cmd in python3 python; do
    if command -v $cmd &> /dev/null; then
        PYTHON_CMD=$cmd
        PY_VER=$($cmd --version 2>&1)
        echo -e "    ${CYAN}$cmd ($PY_VER)${NC}"
        break
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo -e "${RED}    CHYBA: Python neni nainstalovan!${NC}"
    if [[ "$(uname)" == "Darwin" ]]; then
        echo "    Nainstalujte: brew install python3"
    else
        echo "    Nainstalujte: sudo apt install python3"
    fi
    exit 1
fi

# Native Host - stahnout z GitHubu
echo -e "${GREEN}[+]${NC} Stahuji Native Host..."
NATIVE_HOST="$INSTALL_DIR/native-host/adhub_yt_host.py"
curl -L -o "$NATIVE_HOST" "https://raw.githubusercontent.com/Deerpfy/adhub/main/projects/youtube-downloader/native-host/adhub_yt_host.py"
chmod +x "$NATIVE_HOST"
echo -e "    ${CYAN}$NATIVE_HOST${NC}"

# Firefox Manifest - pouziva allowed_extensions misto allowed_origins
echo -e "${GREEN}[+]${NC} Vytvarim Firefox manifest..."
MANIFEST_FILE="$INSTALL_DIR/native-host/com.adhub.ytdownloader.json"
cat > "$MANIFEST_FILE" << EOF
{
  "name": "com.adhub.ytdownloader",
  "description": "AdHub YouTube Downloader (Firefox)",
  "path": "$NATIVE_HOST",
  "type": "stdio",
  "allowed_extensions": [
    "youtube-downloader@adhub.cz"
  ]
}
EOF
echo -e "    ${CYAN}$MANIFEST_FILE${NC}"

# Register Native Host pro Firefox
echo -e "${GREEN}[+]${NC} Registruji Native Host pro Firefox..."

if [[ "$(uname)" == "Darwin" ]]; then
    # macOS - Firefox
    FIREFOX_DIR="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts"
else
    # Linux - Firefox
    FIREFOX_DIR="$HOME/.mozilla/native-messaging-hosts"
fi

# Firefox
mkdir -p "$FIREFOX_DIR"
cp "$MANIFEST_FILE" "$FIREFOX_DIR/"
echo -e "    ${CYAN}Firefox: $FIREFOX_DIR${NC}"

echo ""
echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}  INSTALACE DOKONCENA!${NC}"
echo -e "${GREEN}==============================================${NC}"
echo ""
echo -e "Python:  ${CYAN}$PYTHON_CMD${NC}"
echo -e "yt-dlp:  ${CYAN}$YTDLP${NC}"
echo -e "ffmpeg:  ${CYAN}${FFMPEG_PATH:-'neni nainstalovan'}${NC}"
echo -e "Native:  ${CYAN}$NATIVE_HOST${NC}"
echo ""
echo -e "${YELLOW}Restartujte Firefox a zkontrolujte rozsireni!${NC}"
echo ""
