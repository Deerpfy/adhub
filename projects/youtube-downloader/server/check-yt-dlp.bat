@echo off
echo ========================================
echo Kontrola yt-dlp instalace
echo ========================================
echo.

REM Zkousime yt-dlp.exe (Windows)
where yt-dlp.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] yt-dlp.exe nalezen!
    yt-dlp.exe --version
    echo.
    echo yt-dlp je nainstalovany a funguje!
    pause
    exit /b 0
)

REM Zkousime yt-dlp (bez .exe)
where yt-dlp >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] yt-dlp nalezen!
    yt-dlp --version
    echo.
    echo yt-dlp je nainstalovany a funguje!
    pause
    exit /b 0
)

REM Zkousime primo spustit yt-dlp (muz byt nainstalovan pres pip jako Python modul)
yt-dlp --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] yt-dlp nalezen a funguje!
    yt-dlp --version
    echo.
    echo yt-dlp je nainstalovany a pripraven k pouziti!
    pause
    exit /b 0
)

REM Zkousime python -m yt_dlp (pokud je nainstalovan jako Python modul)
python -m yt_dlp --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] yt-dlp nalezen jako Python modul!
    python -m yt_dlp --version
    echo.
    echo yt-dlp je nainstalovany jako Python modul.
    echo Server by mel automaticky najit yt-dlp.
    pause
    exit /b 0
)

echo [CHYBA] yt-dlp neni nainstalovany nebo neni v PATH!
echo.
echo Instrukce pro instalaci naleznete v: INSTALACE-YT-DLP.txt
echo.
echo NEJRYCHLEJSI ZPUSOB:
echo 1. Stahnete yt-dlp.exe z: https://github.com/yt-dlp/yt-dlp/releases
echo 2. Umistete do: C:\Windows\System32
echo 3. Spustte tento skript znovu
echo.
pause
exit /b 1

