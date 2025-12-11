@echo off
title Steam Farm Service
cd /d "%~dp0"

echo ============================================
echo   Steam Farm Service
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [CHYBA] Node.js neni nainstalovano!
    echo.
    echo Stahnete Node.js z: https://nodejs.org/
    echo.
    pause
    start https://nodejs.org/
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Instaluji zavislosti...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [CHYBA] Instalace zavislosti selhala!
        pause
        exit /b 1
    )
    echo.
)

echo [INFO] Spoustim Steam Farm Service...
echo.
echo Service bezi na: ws://127.0.0.1:17532
echo Status: http://127.0.0.1:17532/status
echo.
echo Toto okno NECHTE OTEVRENE, dokud chcete farmit.
echo Pro ukonceni stisknete Ctrl+C
echo ============================================
echo.

node steam-farm-service.js

pause
