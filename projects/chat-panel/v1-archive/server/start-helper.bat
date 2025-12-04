@echo off
echo ================================================
echo   Server Helper - Ovládání serveru z webu
echo ================================================
echo.

cd /d "%~dp0"

echo Spoustim Server Helper...
echo.
echo Tento proces umozni ovladat server z weboveho rozhrani.
echo NEVYPINEJTE tento proces - nechte ho bezet na pozadi!
echo.
echo Pro zastaveni stisknete Ctrl+C
echo.

node server-helper.js

pause






