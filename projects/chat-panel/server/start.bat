@echo off
echo ================================================
echo   Multistream Chat Server - Windows Launcher
echo ================================================
echo.

cd /d "%~dp0"

REM Set Kick Developer API credentials if not already set
if not defined KICK_CLIENT_ID (
    set KICK_CLIENT_ID=01K91Q792Q3MD9QXARX5AKDZQ3
    set KICK_CLIENT_SECRET=5c93ceaedbc61e8a43471dd4ea3aad55edabd208b65874ad15c1161afc00d7dd
    echo Kick Developer API credentials nastaveny.
)

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

if not exist "node_modules" (
    echo Instaluji zavislosti...
    call npm install
    if %errorlevel% neq 0 (
        echo CHYBA pri instalaci!
        pause
        exit /b 1
    )
    echo.
)

echo Spoustim server...
echo.
echo Server bezi na: http://localhost:3001
echo Pro zastaveni stisknete Ctrl+C
echo.

node server.js

pause

