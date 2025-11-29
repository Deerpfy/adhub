@echo off
REM AdHub YouTube Downloader - Instalace (Windows)

echo ==============================================
echo   AdHub YouTube Downloader - Instalace
echo ==============================================
echo.

REM Kontrola Python
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo CHYBA: Python neni nainstalovany!
    echo Stahnete z: https://python.org
    pause
    exit /b 1
)
echo [OK] Python nalezen

REM Instalace yt-dlp
echo.
echo Kontroluji yt-dlp...
python -c "import yt_dlp" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Instaluji yt-dlp...
    pip install yt-dlp
)
echo [OK] yt-dlp pripraven

REM Ziskat cestu k tomuto scriptu
set SCRIPT_DIR=%~dp0
set HOST_SCRIPT=%SCRIPT_DIR%adhub_yt_host.py

echo.
echo ==============================================
echo   DULEZITE: Potrebuji Extension ID
echo ==============================================
echo.
echo 1. Nainstalujte extension do Chrome:
echo    chrome://extensions - Vyvojarsky rezim - Nacist rozbalene
echo.
echo 2. Zkopirujte ID extension
echo.
set /p EXTENSION_ID="Zadejte Extension ID: "

if "%EXTENSION_ID%"=="" (
    echo CHYBA: Extension ID je povinne!
    pause
    exit /b 1
)

REM Vytvorit manifest
echo.
echo Vytvarim Native Host manifest...

set MANIFEST_FILE=%SCRIPT_DIR%com.adhub.ytdownloader.json

REM Escape backslashes pro JSON
set HOST_SCRIPT_ESCAPED=%HOST_SCRIPT:\=\\%

(
echo {
echo   "name": "com.adhub.ytdownloader",
echo   "description": "AdHub YouTube Downloader Native Host",
echo   "path": "%HOST_SCRIPT_ESCAPED%",
echo   "type": "stdio",
echo   "allowed_origins": [
echo     "chrome-extension://%EXTENSION_ID%/"
echo   ]
echo }
) > "%MANIFEST_FILE%"

REM Registrovat v Registry pro Chrome
echo.
echo Registruji v systemu...

REG ADD "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.adhub.ytdownloader" /ve /t REG_SZ /d "%MANIFEST_FILE%" /f >nul 2>&1
echo [OK] Google Chrome

REG ADD "HKCU\Software\Chromium\NativeMessagingHosts\com.adhub.ytdownloader" /ve /t REG_SZ /d "%MANIFEST_FILE%" /f >nul 2>&1
echo [OK] Chromium

REG ADD "HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.adhub.ytdownloader" /ve /t REG_SZ /d "%MANIFEST_FILE%" /f >nul 2>&1
echo [OK] Brave

REG ADD "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.adhub.ytdownloader" /ve /t REG_SZ /d "%MANIFEST_FILE%" /f >nul 2>&1
echo [OK] Microsoft Edge

echo.
echo ==============================================
echo   INSTALACE DOKONCENA!
echo ==============================================
echo.
echo Nyni:
echo 1. Restartujte prohlizec
echo 2. Jdete na YouTube video
echo 3. Kliknete na tlacitko 'Stahnout'
echo.
echo Videa se budou stahovat do: %USERPROFILE%\Downloads
echo.
pause
