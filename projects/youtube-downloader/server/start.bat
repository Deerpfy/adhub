@echo off
echo ================================================
echo   YouTube Downloader Server - Windows Launcher
echo ================================================
echo.

cd /d %~dp0

REM Kontrola Node.js
echo Kontroluji Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo CHYBA: Node.js neni nainstalovan!
    echo Stahnete z: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js nalezen!
echo.

REM Automaticka instalace zavislosti pokud chybi
if not exist "node_modules" (
    echo Zarvislosti nejsou nainstalovane, instaluji...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo CHYBA pri instalaci!
        echo.
        echo Zkuste spustit manualne: npm install
        pause
        exit /b 1
    )
    echo.
    echo Zarvislosti uspesne nainstalovany!
    echo.
)

REM Kontrola yt-dlp (varovani, ale neblokuje spusteni)
where yt-dlp.exe >nul 2>&1
if %errorlevel% neq 0 (
    where yt-dlp >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo ========================================
        echo VAROVANI: yt-dlp neni nainstalovan!
        echo ========================================
        echo.
        echo Server se spusti, ale stahovani videi nebude fungovat.
        echo Pro instalaci: Spustte check-yt-dlp.bat nebo viz INSTALACE-YT-DLP.txt
        echo.
        timeout /t 3 >nul
    )
)

echo Spoustim server...
echo.
echo Server bezi na: http://localhost:3003
echo Pro zastaveni stisknete Ctrl+C
echo.

node server.js

pause

