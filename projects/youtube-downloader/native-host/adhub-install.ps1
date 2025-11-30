# AdHub YouTube Downloader - Instalator v6.0
# Tento skript se stahuje a spousti pres adhub-install.bat
# v6.0: Automaticke retry s ruznymi player clients pro obejiti n-challenge

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host ""
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "  AdHub YouTube Downloader - Instalator v6.0" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host ""

$d = "$env:LOCALAPPDATA\AdHub"
$yt = "$d\yt-dlp"
$ff = "$d\ffmpeg"
$nh = "$d\native-host"
$ytexe = "$yt\yt-dlp.exe"
$ffexe = "$ff\ffmpeg.exe"

# ============================================================================
# FUNKCE
# ============================================================================

function Get-YtDlpVersion {
    param([string]$Path)
    try {
        $ver = & $Path --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $ver.Trim()
        }
    } catch {}
    return $null
}

function Get-LatestYtDlpVersion {
    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest" -UseBasicParsing
        return $release.tag_name
    } catch {
        return $null
    }
}

function Get-CurrentManifestExtId {
    $manifestFile = "$nh\com.adhub.ytdownloader.json"
    if (Test-Path $manifestFile) {
        try {
            $manifest = Get-Content $manifestFile -Raw | ConvertFrom-Json
            $origin = $manifest.allowed_origins[0]
            if ($origin -match 'chrome-extension://([a-p]{32})/') {
                return $Matches[1]
            }
        } catch {}
    }
    return $null
}

# ============================================================================
# VYTVORENI SLOZEK
# ============================================================================

Write-Host "[+] Kontroluji slozky..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path $yt | Out-Null
New-Item -ItemType Directory -Force -Path $ff | Out-Null
New-Item -ItemType Directory -Force -Path $nh | Out-Null
Write-Host "    Cesta: $d" -ForegroundColor Cyan

# ============================================================================
# YT-DLP
# ============================================================================

Write-Host ""
Write-Host "[+] Kontroluji yt-dlp..." -ForegroundColor Green

$needYtDlp = $true
$currentYtVer = $null
$latestYtVer = $null

if (Test-Path $ytexe) {
    $currentYtVer = Get-YtDlpVersion $ytexe
    if ($currentYtVer) {
        Write-Host "    Nainstalovano: $currentYtVer" -ForegroundColor Cyan

        # Zkontrolovat nejnovejsi verzi
        Write-Host "    Kontroluji aktualizace..." -ForegroundColor Gray
        $latestYtVer = Get-LatestYtDlpVersion

        if ($latestYtVer -and $currentYtVer -eq $latestYtVer) {
            Write-Host "    Verze je aktualni!" -ForegroundColor Green
            $needYtDlp = $false
        } elseif ($latestYtVer) {
            Write-Host "    Dostupna nova verze: $latestYtVer" -ForegroundColor Yellow
            $update = Read-Host "    Aktualizovat? (A/n)"
            if ($update -eq 'n' -or $update -eq 'N') {
                $needYtDlp = $false
                Write-Host "    Preskakuji aktualizaci" -ForegroundColor Gray
            }
        } else {
            Write-Host "    Nelze zkontrolovat aktualizace, pouzivam stavajici" -ForegroundColor Gray
            $needYtDlp = $false
        }
    }
}

if ($needYtDlp) {
    Write-Host "    Stahuji yt-dlp..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile $ytexe -UseBasicParsing
        $newVer = Get-YtDlpVersion $ytexe
        Write-Host "    OK: $ytexe ($newVer)" -ForegroundColor Cyan
    } catch {
        Write-Host "    Chyba: $_" -ForegroundColor Red
    }
}

# ============================================================================
# FFMPEG
# ============================================================================

Write-Host ""
Write-Host "[+] Kontroluji ffmpeg..." -ForegroundColor Green

if (Test-Path $ffexe) {
    try {
        $ffver = & $ffexe -version 2>&1 | Select-Object -First 1
        Write-Host "    Nainstalovano: $ffver" -ForegroundColor Cyan
        Write-Host "    Preskakuji stahovani" -ForegroundColor Green
    } catch {
        Write-Host "    Soubor existuje ale nefunguje, stahuji znovu..." -ForegroundColor Yellow
    }
} else {
    Write-Host "    Stahuji ffmpeg (80MB, muze trvat 2-5 min)..." -ForegroundColor Yellow
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
        Write-Host "    OK: $ffexe" -ForegroundColor Cyan
    } catch {
        Write-Host "    Chyba ffmpeg: $_" -ForegroundColor Red
    }
}

# ============================================================================
# PYTHON
# ============================================================================

Write-Host ""
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

# ============================================================================
# NATIVE HOST
# ============================================================================

Write-Host ""
Write-Host "[+] Aktualizuji Native Host..." -ForegroundColor Green
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

# ============================================================================
# EXTENSION ID - VZDY SE ZEPTAT UZIVATELE
# ============================================================================

Write-Host ""
Write-Host "[+] Nastaveni Extension ID..." -ForegroundColor Green
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  DULEZITE: Zkopirujte Extension ID z rozsireni!" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Kliknete na ikonu rozsireni v prohlizeci" -ForegroundColor White
Write-Host "  2. V popup okne kliknete na 'Kopiovat' u Extension ID" -ForegroundColor White
Write-Host "  3. Vlozte sem (Ctrl+V)" -ForegroundColor White
Write-Host ""

$currentManifestId = Get-CurrentManifestExtId
if ($currentManifestId) {
    Write-Host "  Aktualne v registry: $currentManifestId" -ForegroundColor Gray
    Write-Host "  (Pokud nefunguje, zadejte nove ID)" -ForegroundColor Gray
    Write-Host ""
}

$inputId = Read-Host "Zadejte Extension ID"
$inputId = $inputId.Trim()

$extId = $null
if ($inputId -match '^[a-p]{32}$') {
    $extId = $inputId
    Write-Host "    OK: $extId" -ForegroundColor Green
} else {
    Write-Host "    Neplatny format ID! Pouzivam wildcard (*)" -ForegroundColor Yellow
}

# ============================================================================
# MANIFEST A REGISTRY
# ============================================================================

Write-Host ""
Write-Host "[+] Vytvarim manifest..." -ForegroundColor Green
$manifestPath = $nh.Replace("\","\\") + "\\adhub_yt_host.bat"

if ($extId -and $extId -match '^[a-p]{32}$') {
    $origins = '"chrome-extension://' + $extId + '/"'
    Write-Host "    Extension ID: $extId" -ForegroundColor Cyan
} else {
    $origins = '"chrome-extension://*/"'
    Write-Host "    Pouzivam wildcard (*)" -ForegroundColor Yellow
    Write-Host "    Pokud nefunguje, spustte instalator znovu" -ForegroundColor Yellow
}

$mf = '{"name":"com.adhub.ytdownloader","description":"AdHub YouTube Downloader","path":"' + $manifestPath + '","type":"stdio","allowed_origins":[' + $origins + ']}'
Set-Content -Path "$nh\com.adhub.ytdownloader.json" -Value $mf -Encoding UTF8
Write-Host "    OK: $nh\com.adhub.ytdownloader.json" -ForegroundColor Cyan

Write-Host "[+] Registruji pro Chrome, Edge a Brave..." -ForegroundColor Green
$manifestFile = "$nh\com.adhub.ytdownloader.json"

# Chrome
$rp = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.adhub.ytdownloader"
New-Item -Path $rp -Force | Out-Null
Set-ItemProperty -Path $rp -Name "(Default)" -Value $manifestFile

# Edge
$rp = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.adhub.ytdownloader"
New-Item -Path $rp -Force | Out-Null
Set-ItemProperty -Path $rp -Name "(Default)" -Value $manifestFile

# Brave
$rp = "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.adhub.ytdownloader"
New-Item -Path $rp -Force | Out-Null
Set-ItemProperty -Path $rp -Name "(Default)" -Value $manifestFile

# Chromium
$rp = "HKCU:\Software\Chromium\NativeMessagingHosts\com.adhub.ytdownloader"
New-Item -Path $rp -Force | Out-Null
Set-ItemProperty -Path $rp -Name "(Default)" -Value $manifestFile

Write-Host "    Registry aktualizovany (Chrome, Edge, Brave, Chromium)" -ForegroundColor Cyan

# ============================================================================
# HOTOVO
# ============================================================================

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  INSTALACE DOKONCENA!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Python:  $pyExe" -ForegroundColor Cyan
Write-Host "yt-dlp:  $ytexe" -ForegroundColor Cyan
Write-Host "ffmpeg:  $ffexe" -ForegroundColor Cyan
Write-Host "Native:  $nh\adhub_yt_host.bat" -ForegroundColor Cyan
if ($extId) {
    Write-Host "Ext ID:  $extId" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Restartujte prohlizec a zkontrolujte rozsireni!" -ForegroundColor Yellow
Write-Host ""
Read-Host "Stisknete Enter pro ukonceni"
