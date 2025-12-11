#!/bin/bash
# Steam Farm Service - One-Click Installer pro Linux/macOS
# Tento skript nainstaluje WebSocket service BEZ nutnosti Extension ID!

set -e

VERSION="2.0.0"
REPO="Deerpfy/adhub"
SERVICE_NAME="steam-farm-service"

echo "============================================"
echo "Steam Farm Service Installer v$VERSION"
echo "============================================"
echo ""
echo "Tento instalátor nainstaluje Steam Farm Service."
echo "Žádné Extension ID není potřeba!"
echo ""

# Detekce OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    INSTALL_DIR="$HOME/.adhub-steam-farm"
    BINARY_NAME="steam-farm-service-macos"
else
    OS="linux"
    INSTALL_DIR="$HOME/.adhub-steam-farm"
    BINARY_NAME="steam-farm-service-linux"
fi

echo "[INFO] Detekován OS: $OS"

# Cesty
SERVICE_PATH="$INSTALL_DIR/$SERVICE_NAME"
LOG_PATH="$INSTALL_DIR/service.log"

# Vytvoření složky
echo ""
echo "[1/4] Vytvářím instalační složku..."
mkdir -p "$INSTALL_DIR"
echo "      $INSTALL_DIR"

# Zastavení existující service (pokud běží)
echo ""
echo "[2/4] Kontroluji existující service..."
if pgrep -f "$SERVICE_NAME" > /dev/null 2>&1; then
    echo "      Zastavuji existující service..."
    pkill -f "$SERVICE_NAME" || true
    sleep 1
fi

# Stažení executable
echo ""
echo "[3/4] Stahuji Steam Farm Service..."
DOWNLOAD_URL="https://github.com/$REPO/releases/download/steam-farm-v$VERSION/$BINARY_NAME"

if curl -fsSL "$DOWNLOAD_URL" -o "$SERVICE_PATH" 2>/dev/null; then
    chmod +x "$SERVICE_PATH"
    echo "      Staženo z GitHub Releases"
else
    echo "      [VAROVÁNÍ] GitHub Release nenalezen, zkouším lokální build..."

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    LOCAL_BUILD="$SCRIPT_DIR/dist/$BINARY_NAME"

    if [ -f "$LOCAL_BUILD" ]; then
        cp "$LOCAL_BUILD" "$SERVICE_PATH"
        chmod +x "$SERVICE_PATH"
        echo "      Použit lokální build"
    else
        echo "      [INFO] Zkouším Node.js verzi..."

        # Zkontrolovat Node.js
        if command -v node &> /dev/null; then
            # Zkopírovat Node.js skripty
            if [ -f "$SCRIPT_DIR/steam-farm-service.js" ]; then
                cp "$SCRIPT_DIR/steam-farm-service.js" "$INSTALL_DIR/"
                cp "$SCRIPT_DIR/package.json" "$INSTALL_DIR/"

                echo "      Instaluji závislosti..."
                cd "$INSTALL_DIR"
                npm install --production --silent 2>/dev/null || npm install --production

                # Vytvořit wrapper skript
                cat > "$SERVICE_PATH" << 'WRAPPER'
#!/bin/bash
cd "$(dirname "$0")"
exec node steam-farm-service.js "$@"
WRAPPER
                chmod +x "$SERVICE_PATH"
                echo "      Nainstalováno pomocí Node.js"
            else
                echo "      [CHYBA] steam-farm-service.js nenalezen!"
                exit 1
            fi
        else
            echo "      [CHYBA] Node.js není nainstalován!"
            echo "      Nainstalujte Node.js z https://nodejs.org/"
            exit 1
        fi
    fi
fi

# Spuštění service
echo ""
echo "[4/4] Spouštím service..."

# Spustit v pozadí
cd "$INSTALL_DIR"
nohup "$SERVICE_PATH" > "$LOG_PATH" 2>&1 &
SERVICE_PID=$!

# Počkat a ověřit
sleep 2

if ps -p $SERVICE_PID > /dev/null 2>&1; then
    echo "      Service běží (PID: $SERVICE_PID)"
else
    echo "      [VAROVÁNÍ] Service se nepodařilo spustit"
    echo "      Zkontrolujte log: $LOG_PATH"
fi

# Vytvoření autostart souboru (Linux)
if [[ "$OS" == "linux" ]]; then
    AUTOSTART_DIR="$HOME/.config/autostart"
    DESKTOP_FILE="$AUTOSTART_DIR/steam-farm-service.desktop"

    mkdir -p "$AUTOSTART_DIR"
    cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Type=Application
Name=Steam Farm Service
Exec=$SERVICE_PATH
Hidden=false
NoDisplay=true
X-GNOME-Autostart-enabled=true
Comment=Steam Farm background service
EOF
    echo ""
    echo "[INFO] Autostart nastaven: $DESKTOP_FILE"
fi

# macOS LaunchAgent
if [[ "$OS" == "macos" ]]; then
    LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
    PLIST_FILE="$LAUNCH_AGENTS_DIR/com.adhub.steamfarm.plist"

    mkdir -p "$LAUNCH_AGENTS_DIR"
    cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.adhub.steamfarm</string>
    <key>ProgramArguments</key>
    <array>
        <string>$SERVICE_PATH</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$LOG_PATH</string>
    <key>StandardErrorPath</key>
    <string>$LOG_PATH</string>
    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR</string>
</dict>
</plist>
EOF
    launchctl load "$PLIST_FILE" 2>/dev/null || true
    echo ""
    echo "[INFO] LaunchAgent nastaven: $PLIST_FILE"
fi

echo ""
echo "============================================"
echo "Instalace dokončena!"
echo "============================================"
echo ""
echo "Steam Farm Service běží na: ws://127.0.0.1:17532"
echo "Status endpoint: http://127.0.0.1:17532/status"
echo ""
echo "Otevřete rozšíření Steam Farm v prohlížeči."
echo ""

# Ověřit že service odpovídá
if curl -s "http://127.0.0.1:17532/health" > /dev/null 2>&1; then
    echo "[OK] Service je připraven!"
else
    echo "[INFO] Service se spouští, může to trvat několik sekund..."
fi
