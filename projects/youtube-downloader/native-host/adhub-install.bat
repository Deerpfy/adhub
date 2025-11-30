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

:: Vytvorit temp PS1 soubor a spustit ho
set "PSFILE=%TEMP%\adhub-install-temp.ps1"

:: Zapiseme PowerShell skript do temp souboru
(
echo $ErrorActionPreference = 'Continue'
echo $ProgressPreference = 'SilentlyContinue'
echo [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
echo.
echo Write-Host ""
echo Write-Host "==============================================" -ForegroundColor Yellow
echo Write-Host "  AdHub YouTube Downloader - Instalator v5.5" -ForegroundColor Yellow
echo Write-Host "==============================================" -ForegroundColor Yellow
echo Write-Host ""
echo.
echo $d = "$env:LOCALAPPDATA\AdHub"
echo $yt = "$d\yt-dlp"
echo $ff = "$d\ffmpeg"
echo $nh = "$d\native-host"
echo.
echo Write-Host "[+] Vytvarim slozky..." -ForegroundColor Green
echo New-Item -ItemType Directory -Force -Path $yt ^| Out-Null
echo New-Item -ItemType Directory -Force -Path $ff ^| Out-Null
echo New-Item -ItemType Directory -Force -Path $nh ^| Out-Null
echo Write-Host "    Cesta: $d" -ForegroundColor Cyan
echo.
echo Write-Host "[+] Stahuji yt-dlp..." -ForegroundColor Green
echo $ytexe = "$yt\yt-dlp.exe"
echo try {
echo     Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile $ytexe -UseBasicParsing
echo     Write-Host "    OK: $ytexe" -ForegroundColor Cyan
echo } catch {
echo     Write-Host "    Chyba: $_" -ForegroundColor Red
echo }
echo.
echo Write-Host "[+] Stahuji ffmpeg (80MB, muze trvat 2-5 min)..." -ForegroundColor Yellow
echo $fz = "$env:TEMP\ffmpeg.zip"
echo $fe = "$env:TEMP\ffmpeg-ex"
echo try {
echo     $wc = New-Object System.Net.WebClient
echo     $wc.DownloadFile("https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip", $fz)
echo     Write-Host "    Rozbaluji..." -ForegroundColor Green
echo     Expand-Archive -Path $fz -DestinationPath $fe -Force
echo     $bin = Get-ChildItem $fe -Recurse -Directory ^| Where-Object { $_.Name -eq "bin" } ^| Select-Object -First 1
echo     if ($bin) {
echo         Copy-Item "$($bin.FullName)\ffmpeg.exe" $ff -Force
echo         Copy-Item "$($bin.FullName)\ffprobe.exe" $ff -Force -ErrorAction SilentlyContinue
echo     }
echo     Remove-Item $fz -Force -ErrorAction SilentlyContinue
echo     Remove-Item $fe -Recurse -Force -ErrorAction SilentlyContinue
echo     Write-Host "    OK: $ff\ffmpeg.exe" -ForegroundColor Cyan
echo } catch {
echo     Write-Host "    Chyba ffmpeg: $_" -ForegroundColor Red
echo }
echo.
echo # Kontrola Pythonu
echo Write-Host "[+] Kontroluji Python..." -ForegroundColor Green
echo $pyExe = $null
echo foreach ($cmd in @('python', 'python3', 'py')) {
echo     try {
echo         $ver = ^& $cmd --version 2^>^&1
echo         if ($LASTEXITCODE -eq 0) {
echo             $pyExe = $cmd
echo             Write-Host "    OK: $cmd ($ver)" -ForegroundColor Cyan
echo             break
echo         }
echo     } catch {}
echo }
echo if (-not $pyExe) {
echo     Write-Host "    CHYBA: Python neni nainstalovan!" -ForegroundColor Red
echo     Write-Host "    Stahnete Python z: https://www.python.org/downloads/" -ForegroundColor Yellow
echo     Write-Host "    Pri instalaci zaskrtnete 'Add Python to PATH'" -ForegroundColor Yellow
echo     Read-Host "Stisknete Enter pro ukonceni"
echo     exit 1
echo }
echo.
echo Write-Host "[+] Vytvarim Native Host..." -ForegroundColor Green
echo $pyUrl = "https://raw.githubusercontent.com/Deerpfy/adhub/main/projects/youtube-downloader/native-host/adhub_yt_host.py"
echo try {
echo     Invoke-WebRequest -Uri $pyUrl -OutFile "$nh\adhub_yt_host.py" -UseBasicParsing
echo     Write-Host "    OK: $nh\adhub_yt_host.py" -ForegroundColor Cyan
echo } catch {
echo     Write-Host "    Chyba: $_" -ForegroundColor Red
echo }
echo.
echo # Vytvorit BAT wrapper
echo Write-Host "[+] Vytvarim BAT wrapper..." -ForegroundColor Green
echo $batContent = "@echo off`r`n$pyExe `"%~dp0adhub_yt_host.py`" %%*"
echo Set-Content -Path "$nh\adhub_yt_host.bat" -Value $batContent -Encoding ASCII
echo Write-Host "    OK: $nh\adhub_yt_host.bat" -ForegroundColor Cyan
echo.
echo Write-Host "[+] Vytvarim manifest..." -ForegroundColor Green
echo $manifestPath = $nh.Replace("\","\\") + "\\adhub_yt_host.bat"
echo $mf = '{"name":"com.adhub.ytdownloader","description":"AdHub","path":"' + $manifestPath + '","type":"stdio","allowed_origins":["chrome-extension://*/"]}'
echo Set-Content -Path "$nh\com.adhub.ytdownloader.json" -Value $mf -Encoding UTF8
echo Write-Host "    OK: $nh\com.adhub.ytdownloader.json" -ForegroundColor Cyan
echo.
echo Write-Host "[+] Registruji pro Chrome a Edge..." -ForegroundColor Green
echo $manifestFile = "$nh\com.adhub.ytdownloader.json"
echo $rp = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.adhub.ytdownloader"
echo New-Item -Path $rp -Force ^| Out-Null
echo Set-ItemProperty -Path $rp -Name "(Default)" -Value $manifestFile
echo $rp = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.adhub.ytdownloader"
echo New-Item -Path $rp -Force ^| Out-Null
echo Set-ItemProperty -Path $rp -Name "(Default)" -Value $manifestFile
echo.
echo Write-Host ""
echo Write-Host "==============================================" -ForegroundColor Green
echo Write-Host "  INSTALACE DOKONCENA!" -ForegroundColor Green
echo Write-Host "==============================================" -ForegroundColor Green
echo Write-Host ""
echo Write-Host "Python:  $pyExe" -ForegroundColor Cyan
echo Write-Host "yt-dlp:  $ytexe" -ForegroundColor Cyan
echo Write-Host "ffmpeg:  $ff\ffmpeg.exe" -ForegroundColor Cyan
echo Write-Host "Native:  $nh\adhub_yt_host.bat" -ForegroundColor Cyan
echo Write-Host ""
echo Write-Host "Restartujte prohlizec a zkontrolujte rozsireni!" -ForegroundColor Yellow
echo Write-Host ""
echo Read-Host "Stisknete Enter pro ukonceni"
) > "%PSFILE%"

:: Spustit PowerShell s Bypass
powershell -ExecutionPolicy Bypass -File "%PSFILE%"

:: Smazat temp soubor
del "%PSFILE%" 2>nul

pause
