# AdHub YouTube Downloader - Instalator v5.6
# Tento skript se stahuje a spousti pres adhub-install.bat
# Nove: Preskoci stahovani pokud nastroje existuji, auto-detekce Extension ID

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host ""
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "  AdHub YouTube Downloader - Instalator v5.6" -ForegroundColor Yellow
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

function Find-ChromeExtensionId {
    # Hledat AdHub extension ve slozce Chrome/Edge/Brave extensions
    $chromePaths = @(
        # Chrome
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Extensions",
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Profile 1\Extensions",
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Profile 2\Extensions",
        # Brave
        "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Default\Extensions",
        "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Profile 1\Extensions",
        # Edge
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Extensions",
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Profile 1\Extensions",
        # Chromium
        "$env:LOCALAPPDATA\Chromium\User Data\Default\Extensions"
    )

    foreach ($extPath in $chromePaths) {
        if (Test-Path $extPath) {
            # Projit vsechny extension slozky
            Get-ChildItem $extPath -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                $extId = $_.Name
                # Hledat manifest.json s AdHub
                Get-ChildItem $_.FullName -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                    $manifestPath = Join-Path $_.FullName "manifest.json"
                    if (Test-Path $manifestPath) {
                        try {
                            $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
                            if ($manifest.name -like "*AdHub*" -or $manifest.name -like "*YouTube Downloader*") {
                                return $extId
                            }
                        } catch {}
                    }
                }
            }
        }
    }
    return $null
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
# EXTENSION ID - AUTO-DETEKCE
# ============================================================================

Write-Host ""
Write-Host "[+] Hledam Extension ID..." -ForegroundColor Green

$extId = $null
$currentManifestId = Get-CurrentManifestExtId

# Zkusit auto-detekci
$detectedId = Find-ChromeExtensionId
if ($detectedId) {
    Write-Host "    Nalezeno v Chrome: $detectedId" -ForegroundColor Cyan
    $extId = $detectedId
}

# Pokud mame ID v manifestu a je stejne, pouzit ho
if ($currentManifestId -and (-not $extId -or $currentManifestId -eq $extId)) {
    Write-Host "    Aktualni v manifestu: $currentManifestId" -ForegroundColor Cyan
    if (-not $extId) { $extId = $currentManifestId }
}

# Pokud nemame ID, zeptat se
if (-not $extId) {
    Write-Host ""
    Write-Host "Extension ID nebylo nalezeno automaticky." -ForegroundColor Yellow
    Write-Host "Najdete ho v Chrome na: chrome://extensions/" -ForegroundColor Cyan
    Write-Host "Povolte 'Rezim vyvojare' a zkopirujte ID rozsireni AdHub." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Priklad: abcdefghijklmnopqrstuvwxyzabcd" -ForegroundColor Gray
    Write-Host ""

    $inputId = Read-Host "Zadejte Extension ID (nebo Enter pro wildcard)"
    $inputId = $inputId.Trim()

    if ($inputId -match '^[a-p]{32}$') {
        $extId = $inputId
    }
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
