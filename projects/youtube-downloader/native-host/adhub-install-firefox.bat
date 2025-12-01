@echo off
chcp 65001 >nul 2>&1
title AdHub YouTube Downloader - Firefox Installer v5.7

echo.
echo ========================================
echo   AdHub YouTube Downloader (Firefox)
echo ========================================
echo.
echo Spoustim instalaci...
echo.

:: Spustit PowerShell skript primo z GitHubu
powershell -ExecutionPolicy Bypass -Command "& { Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/Deerpfy/adhub/main/projects/youtube-downloader/native-host/adhub-install-firefox.ps1')) }"

pause
