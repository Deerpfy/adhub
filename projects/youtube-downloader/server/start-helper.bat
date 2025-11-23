@echo off
echo ================================================
echo   YouTube Downloader Helper Server
echo ================================================
echo.

cd /d %~dp0

REM Kontrola Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo CHYBA: Node.js neni nainstalovan!
    echo Stahnete z: https://nodejs.org/
    pause
    exit /b 1
)

REM Automaticka instalace zavislosti pokud chybi
if not exist "node_modules" (
    echo Zarvislosti nejsou nainstalovane, instaluji...
    call npm install
    if %errorlevel% neq 0 (
        echo CHYBA pri instalaci!
        pause
        exit /b 1
    )
    echo Zarvislosti uspesne nainstalovany!
    echo.
)

echo Spoustim helper server...
echo Helper server bezi na: http://localhost:3004
echo Pro zastaveni stisknete Ctrl+C
echo.

node server-helper.js

pause
