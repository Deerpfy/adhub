@echo off
setlocal EnableDelayedExpansion

echo ============================================
echo Steam Farm - Native Host Installer (Windows)
echo ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js neni nainstalovan!
    echo Stahnete jej z: https://nodejs.org/
    pause
    exit /b 1
)

:: Get Node version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js: %NODE_VERSION%

:: Get current directory
set SCRIPT_DIR=%~dp0
set HOST_PATH=%SCRIPT_DIR%steam-farm-host.js

:: Check if host exists
if not exist "%HOST_PATH%" (
    echo [ERROR] steam-farm-host.js nenalezen!
    pause
    exit /b 1
)

:: Install npm dependencies
echo.
echo Instaluji npm dependencies...
cd /d "%SCRIPT_DIR%"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install selhal!
    pause
    exit /b 1
)
echo [OK] Dependencies nainstalovany

:: Get Extension ID
echo.
set /p EXT_ID="Zadejte ID rozsirenni z chrome://extensions: "
if "%EXT_ID%"=="" (
    echo [ERROR] ID rozsirenni je povinne!
    pause
    exit /b 1
)

:: Create manifest
echo.
echo Vytvarim manifest...
set MANIFEST_PATH=%SCRIPT_DIR%com.adhub.steamfarm.json
set HOST_PATH_ESCAPED=%HOST_PATH:\=\\%

:: Create wrapper batch file
set WRAPPER_PATH=%SCRIPT_DIR%run-host.bat
echo @echo off> "%WRAPPER_PATH%"
echo node "%HOST_PATH%">> "%WRAPPER_PATH%"
set WRAPPER_PATH_ESCAPED=%WRAPPER_PATH:\=\\%

:: Create manifest content
(
echo {
echo     "name": "com.adhub.steamfarm",
echo     "description": "Steam Farm Native Messaging Host pro AdHUB",
echo     "path": "%WRAPPER_PATH_ESCAPED%",
echo     "type": "stdio",
echo     "allowed_origins": [
echo         "chrome-extension://%EXT_ID%/"
echo     ]
echo }
) > "%MANIFEST_PATH%"

echo [OK] Manifest vytvoren

:: Register in Windows Registry
echo.
echo Registruji Native Messaging Host...

:: Chrome
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.adhub.steamfarm" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %errorlevel% equ 0 echo [OK] Chrome

:: Edge
reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.adhub.steamfarm" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %errorlevel% equ 0 echo [OK] Edge

:: Brave
reg add "HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.adhub.steamfarm" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %errorlevel% equ 0 echo [OK] Brave

echo.
echo ============================================
echo Instalace dokoncena!
echo ============================================
echo.
echo Restartujte prohlizec pro aktivaci.
echo.
pause
