#!/bin/bash

echo "============================================"
echo "Steam Farm - Native Host Installer (Linux/macOS)"
echo "============================================"
echo

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js není nainstalován!"
    echo "Nainstalujte jej pomocí:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  macOS: brew install node"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "[OK] Node.js: $NODE_VERSION"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_PATH="$SCRIPT_DIR/steam-farm-host.js"

# Check if host exists
if [ ! -f "$HOST_PATH" ]; then
    echo "[ERROR] steam-farm-host.js nenalezen!"
    exit 1
fi

# Install npm dependencies
echo
echo "Instaluji npm dependencies..."
cd "$SCRIPT_DIR"
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] npm install selhal!"
    exit 1
fi
echo "[OK] Dependencies nainstalovány"

# Get Extension ID
echo
read -p "Zadejte ID rozšíření z chrome://extensions: " EXT_ID
if [ -z "$EXT_ID" ]; then
    echo "[ERROR] ID rozšíření je povinné!"
    exit 1
fi

# Create wrapper script
WRAPPER_PATH="$SCRIPT_DIR/run-host.sh"
cat > "$WRAPPER_PATH" << EOF
#!/bin/bash
exec node "$HOST_PATH"
EOF
chmod +x "$WRAPPER_PATH"
echo "[OK] Wrapper skript vytvořen"

# Create manifest
MANIFEST_CONTENT=$(cat << EOF
{
    "name": "com.adhub.steamfarm",
    "description": "Steam Farm Native Messaging Host pro AdHUB",
    "path": "$WRAPPER_PATH",
    "type": "stdio",
    "allowed_origins": [
        "chrome-extension://$EXT_ID/"
    ]
}
EOF
)

echo
echo "Instaluji manifest..."

# Detect OS
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

# Install for Chrome
if [ -d "$(dirname "$CHROME_DIR")" ] || [[ "$OSTYPE" == "darwin"* ]]; then
    mkdir -p "$CHROME_DIR"
    echo "$MANIFEST_CONTENT" > "$CHROME_DIR/com.adhub.steamfarm.json"
    echo "[OK] Chrome"
fi

# Install for Chromium
if [ -d "$(dirname "$CHROMIUM_DIR")" ]; then
    mkdir -p "$CHROMIUM_DIR"
    echo "$MANIFEST_CONTENT" > "$CHROMIUM_DIR/com.adhub.steamfarm.json"
    echo "[OK] Chromium"
fi

# Install for Brave
if [ -d "$(dirname "$BRAVE_DIR")" ]; then
    mkdir -p "$BRAVE_DIR"
    echo "$MANIFEST_CONTENT" > "$BRAVE_DIR/com.adhub.steamfarm.json"
    echo "[OK] Brave"
fi

# Install for Edge
if [ -d "$(dirname "$EDGE_DIR")" ]; then
    mkdir -p "$EDGE_DIR"
    echo "$MANIFEST_CONTENT" > "$EDGE_DIR/com.adhub.steamfarm.json"
    echo "[OK] Edge"
fi

echo
echo "============================================"
echo "Instalace dokončena!"
echo "============================================"
echo
echo "Restartujte prohlížeč pro aktivaci."
echo
