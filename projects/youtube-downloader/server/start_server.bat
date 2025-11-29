@echo off
REM AdHub YouTube Downloader - Start Server (Windows)

echo ==============================================
echo   AdHub YouTube Downloader - Server
echo ==============================================

REM Kontrola Python
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo CHYBA: Python neni nainstalovany!
    echo Stahnete z: https://python.org
    pause
    exit /b 1
)

REM Kontrola yt-dlp
python -c "import yt_dlp" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Instaluji yt-dlp...
    pip install yt-dlp
)

REM Kontrola FFmpeg
where ffmpeg >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo VAROVANI: FFmpeg neni nainstalovany!
    echo Konverze do MP3/WAV/FLAC nebude fungovat.
    echo Stahnete z: https://ffmpeg.org/download.html
    echo.
)

REM Spustit server
cd /d "%~dp0"
python yt_server.py

pause
