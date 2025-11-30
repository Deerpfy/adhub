# AdHub YouTube Downloader - Instalator v5.5
# Tento skript se stahuje a spousti pres adhub-install.bat

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host ""
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "  AdHub YouTube Downloader - Instalator v5.5" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host ""

$d = "$env:LOCALAPPDATA\AdHub"
$yt = "$d\yt-dlp"
$ff = "$d\ffmpeg"
$nh = "$d\native-host"

Write-Host "[+] Vytvarim slozky..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path $yt | Out-Null
New-Item -ItemType Directory -Force -Path $ff | Out-Null
New-Item -ItemType Directory -Force -Path $nh | Out-Null
Write-Host "    Cesta: $d" -ForegroundColor Cyan

Write-Host "[+] Stahuji yt-dlp..." -ForegroundColor Green
$ytexe = "$yt\yt-dlp.exe"
try {
    Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile $ytexe -UseBasicParsing
    Write-Host "    OK: $ytexe" -ForegroundColor Cyan
} catch {
    Write-Host "    Chyba: $_" -ForegroundColor Red
}

Write-Host "[+] Stahuji ffmpeg (80MB, muze trvat 2-5 min)..." -ForegroundColor Yellow
$fz = "$env:TEMP\ffmpeg.zip"
$fe = "$env:TEMP\ffmpeg-ex"
try {
    $wc = New-Object System.Net.WebClient
    $wc.DownloadFile("https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip", $fz)
    Write-Host "    Rozbaluji..." -ForegroundColor Green
    Expand-Archive -Path $fz -DestinationPath $fe -Force
    $bin = Get-ChildItem $fe -Recurse -Directory | Where-Object { $_.Name -eq "bin" } | Select-Object -First 1
    if ($bin) {
        Copy-Item "$($bin.FullName)\ffmpeg.exe" $ff -Force
        Copy-Item "$($bin.FullName)\ffprobe.exe" $ff -Force -ErrorAction SilentlyContinue
    }
    Remove-Item $fz -Force -ErrorAction SilentlyContinue
    Remove-Item $fe -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "    OK: $ff\ffmpeg.exe" -ForegroundColor Cyan
} catch {
    Write-Host "    Chyba ffmpeg: $_" -ForegroundColor Red
}

# Kontrola Pythonu
Write-Host "[+] Kontroluji Python..." -ForegroundColor Green
$pyExe = $null
foreach ($cmd in @('python', 'python3', 'py')) {
    try {
        $ver = & $cmd --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pyExe = $cmd
            Write-Host "    OK: $cmd ($ver)" -ForegroundColor Cyan
            break
        }
    } catch {}
}
if (-not $pyExe) {
    Write-Host "    CHYBA: Python neni nainstalovan!" -ForegroundColor Red
    Write-Host "    Stahnete Python z: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "    Pri instalaci zaskrtnete 'Add Python to PATH'" -ForegroundColor Yellow
    Read-Host "Stisknete Enter pro ukonceni"
    exit 1
}

Write-Host "[+] Stahuji Native Host..." -ForegroundColor Green
$pyUrl = "https://raw.githubusercontent.com/Deerpfy/adhub/main/projects/youtube-downloader/native-host/adhub_yt_host.py"
try {
    Invoke-WebRequest -Uri $pyUrl -OutFile "$nh\adhub_yt_host.py" -UseBasicParsing
    Write-Host "    OK: $nh\adhub_yt_host.py" -ForegroundColor Cyan
} catch {
    Write-Host "    Chyba: $_" -ForegroundColor Red
}

# Vytvorit BAT wrapper
Write-Host "[+] Vytvarim BAT wrapper..." -ForegroundColor Green
$batContent = "@echo off`r`n$pyExe `"%~dp0adhub_yt_host.py`" %*"
Set-Content -Path "$nh\adhub_yt_host.bat" -Value $batContent -Encoding ASCII
Write-Host "    OK: $nh\adhub_yt_host.bat" -ForegroundColor Cyan

Write-Host "[+] Vytvarim manifest..." -ForegroundColor Green
$manifestPath = $nh.Replace("\","\\") + "\\adhub_yt_host.bat"
$mf = '{"name":"com.adhub.ytdownloader","description":"AdHub","path":"' + $manifestPath + '","type":"stdio","allowed_origins":["chrome-extension://*/"]}'
Set-Content -Path "$nh\com.adhub.ytdownloader.json" -Value $mf -Encoding UTF8
Write-Host "    OK: $nh\com.adhub.ytdownloader.json" -ForegroundColor Cyan

Write-Host "[+] Registruji pro Chrome a Edge..." -ForegroundColor Green
$manifestFile = "$nh\com.adhub.ytdownloader.json"
$rp = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.adhub.ytdownloader"
New-Item -Path $rp -Force | Out-Null
Set-ItemProperty -Path $rp -Name "(Default)" -Value $manifestFile
$rp = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.adhub.ytdownloader"
New-Item -Path $rp -Force | Out-Null
Set-ItemProperty -Path $rp -Name "(Default)" -Value $manifestFile

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  INSTALACE DOKONCENA!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Python:  $pyExe" -ForegroundColor Cyan
Write-Host "yt-dlp:  $ytexe" -ForegroundColor Cyan
Write-Host "ffmpeg:  $ff\ffmpeg.exe" -ForegroundColor Cyan
Write-Host "Native:  $nh\adhub_yt_host.bat" -ForegroundColor Cyan
Write-Host ""
Write-Host "Restartujte prohlizec a zkontrolujte rozsireni!" -ForegroundColor Yellow
Write-Host ""
Read-Host "Stisknete Enter pro ukonceni"
