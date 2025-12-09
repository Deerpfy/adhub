#!/bin/bash
# Steam Farm - One-Click Installer pro Linux/macOS

set -e

VERSION="1.2.0"
REPO="Deerpfy/adhub"
HOST_NAME="com.adhub.steamfarm"

echo "============================================"
echo "Steam Farm - Native Host Installer v$VERSION"
echo "============================================"
echo ""

# Detekce OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    INSTALL_DIR="$HOME/.adhub-steam-farm"
    CHROME_MANIFEST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    CHROMIUM_MANIFEST_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
    BRAVE_MANIFEST_DIR="$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    EDGE_MANIFEST_DIR="$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
else
    OS="linux"
    INSTALL_DIR="$HOME/.adhub-steam-farm"
    CHROME_MANIFEST_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    CHROMIUM_MANIFEST_DIR="$HOME/.config/chromium/NativeMessagingHosts"
    BRAVE_MANIFEST_DIR="$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    EDGE_MANIFEST_DIR="$HOME/.config/microsoft-edge/NativeMessagingHosts"
fi

echo "[INFO] Detekován OS: $OS"

# Získání Extension ID
EXTENSION_ID="$1"
if [ -z "$EXTENSION_ID" ]; then
    echo ""
    read -p "Zadejte ID rozšíření z chrome://extensions: " EXTENSION_ID
fi

if [ -z "$EXTENSION_ID" ] || [ ${#EXTENSION_ID} -lt 32 ]; then
    echo "[CHYBA] Neplatné ID rozšíření!"
    exit 1
fi

echo "[INFO] Extension ID: $EXTENSION_ID"

# Cesty
HOST_PATH="$INSTALL_DIR/steam-farm-host"
MANIFEST_PATH="$INSTALL_DIR/$HOST_NAME.json"

# Vytvoření složky
echo ""
echo "[1/4] Vytvářím instalační složku..."
mkdir -p "$INSTALL_DIR"
echo "      $INSTALL_DIR"

# Stažení executable
echo ""
echo "[2/4] Stahuji Native Host..."
DOWNLOAD_URL="https://github.com/$REPO/releases/download/steam-farm-v$VERSION/steam-farm-host-$OS"

if curl -fsSL "$DOWNLOAD_URL" -o "$HOST_PATH" 2>/dev/null; then
    chmod +x "$HOST_PATH"
    echo "      Staženo z GitHub Releases"
else
    echo "      [VAROVÁNÍ] GitHub Release nenalezen, zkouším lokální build..."

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    LOCAL_BUILD="$SCRIPT_DIR/dist/steam-farm-host-$OS"

    if [ -f "$LOCAL_BUILD" ]; then
        cp "$LOCAL_BUILD" "$HOST_PATH"
        chmod +x "$HOST_PATH"
        echo "      Použit lokální build"
    else
        echo "      [CHYBA] Native Host executable nenalezen!"
        echo "      Spusťte 'npm run build' v native-host složce"
        exit 1
    fi
fi

# Vytvoření manifestu
echo ""
echo "[3/4] Vytvářím manifest..."

cat > "$MANIFEST_PATH" << EOF
{
    "name": "$HOST_NAME",
    "description": "Steam Farm Native Messaging Host pro AdHUB",
    "path": "$HOST_PATH",
    "type": "stdio",
    "allowed_origins": [
        "chrome-extension://$EXTENSION_ID/"
    ]
}
EOF

echo "      $MANIFEST_PATH"

# Instalace manifestů pro prohlížeče
echo ""
echo "[4/4] Registruji Native Host..."

install_manifest() {
    local target_dir="$1"
    local browser_name="$2"

    if [ -d "$(dirname "$target_dir")" ] || [[ "$OSTYPE" == "darwin"* ]]; then
        mkdir -p "$target_dir"
        cp "$MANIFEST_PATH" "$target_dir/$HOST_NAME.json"
        echo "      ✓ $browser_name"
    fi
}

install_manifest "$CHROME_MANIFEST_DIR" "Chrome"
install_manifest "$CHROMIUM_MANIFEST_DIR" "Chromium"
install_manifest "$BRAVE_MANIFEST_DIR" "Brave"
install_manifest "$EDGE_MANIFEST_DIR" "Edge"

echo ""
echo "============================================"
echo "Instalace dokončena!"
echo "============================================"
echo ""
echo "Restartujte prohlížeč pro aktivaci rozšíření."
echo ""
