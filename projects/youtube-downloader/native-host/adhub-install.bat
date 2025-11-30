@echo off
chcp 65001 >nul 2>&1
title AdHub YouTube Downloader - Installer v5.5

echo.
echo ========================================
echo   AdHub YouTube Downloader Installer
echo ========================================
echo.
echo Spoustim instalaci...
echo.

:: Spustit PowerShell skript primo z GitHubu
powershell -ExecutionPolicy Bypass -Command "& { Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/Deerpfy/adhub/main/projects/youtube-downloader/native-host/adhub-install.ps1')) }"

pause
