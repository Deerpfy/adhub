#!/bin/bash
# Steam Farm Service - Double-click to run (macOS/Linux)

cd "$(dirname "$0")"

echo "============================================"
echo "  Steam Farm Service"
echo "============================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[CHYBA] Node.js neni nainstalovano!"
    echo ""
    echo "Nainstalujte Node.js z: https://nodejs.org/"
    echo ""
    read -p "Stiskni Enter pro otevreni stranky..."
    open "https://nodejs.org/" 2>/dev/null || xdg-open "https://nodejs.org/" 2>/dev/null
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[INFO] Instaluji zavislosti..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "[CHYBA] Instalace zavislosti selhala!"
        read -p "Stiskni Enter pro ukonceni..."
        exit 1
    fi
    echo ""
fi

echo "[INFO] Spoustim Steam Farm Service..."
echo ""
echo "Service bezi na: ws://127.0.0.1:17532"
echo "Status: http://127.0.0.1:17532/status"
echo ""
echo "Toto okno NECHTE OTEVRENE, dokud chcete farmit."
echo "Pro ukonceni stisknete Ctrl+C"
echo "============================================"
echo ""

node steam-farm-service.js

read -p "Stiskni Enter pro ukonceni..."
