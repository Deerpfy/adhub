@echo off
echo ========================================
echo Instalace zarvislosti YouTube Downloader
echo ========================================
cd /d %~dp0

echo Kontroluji Node.js...
node --version
if %errorlevel% neq 0 (
    echo CHYBA: Node.js neni nainstalovan nebo neni v PATH!
    echo Stahnete z: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Kontroluji npm...
npm --version
if %errorlevel% neq 0 (
    echo CHYBA: npm neni dostupny!
    echo Zkuste restartovat pocitac nebo znovu nainstalovat Node.js.
    pause
    exit /b 1
)

echo.
echo Instaluji zarvislosti...
npm install

if %errorlevel% neq 0 (
    echo.
    echo CHYBA pri instalaci zarvislosti!
    echo Zkuste spustit: npm install --verbose
    pause
    exit /b 1
)

echo.
echo ========================================
echo Instalace dokoncena!
echo ========================================
echo.
echo Nyni muzete spustit server pomoci:
echo   start.bat
echo.
pause






