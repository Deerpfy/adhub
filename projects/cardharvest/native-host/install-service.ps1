# CardHarvest Service - One-Click Installer pro Windows
# Tento skript nainstaluje WebSocket service BEZ nutnosti Extension ID!
# Spusťte: Right-click -> Run with PowerShell

$ErrorActionPreference = "Stop"

$VERSION = "2.0.0"
$REPO = "Deerpfy/adhub"
$SERVICE_NAME = "cardharvest-service"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "CardHarvest Service Installer v$VERSION" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tento instalator nainstaluje CardHarvest Service." -ForegroundColor White
Write-Host "Zadne Extension ID neni potreba!" -ForegroundColor Green
Write-Host ""

# Cesty
$InstallDir = "$env:LOCALAPPDATA\AdhubSteamFarm"
$ServicePath = "$InstallDir\$SERVICE_NAME.exe"
$LogPath = "$InstallDir\service.log"

# Vytvoření složky
Write-Host ""
Write-Host "[1/4] Vytvarim instalacni slozku..." -ForegroundColor White
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
Write-Host "      $InstallDir" -ForegroundColor Gray

# Zastavení existující service
Write-Host ""
Write-Host "[2/4] Kontroluji existujici service..." -ForegroundColor White
$existingProcess = Get-Process -Name $SERVICE_NAME -ErrorAction SilentlyContinue
if ($existingProcess) {
    Write-Host "      Zastavuji existujici service..." -ForegroundColor Yellow
    Stop-Process -Name $SERVICE_NAME -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Stažení executable
Write-Host ""
Write-Host "[3/4] Stahuji CardHarvest Service..." -ForegroundColor White
$DownloadUrl = "https://github.com/$REPO/releases/download/cardharvest-v$VERSION/cardharvest-service-win.exe"

try {
    # Zkusit stáhnout z GitHub Releases
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ServicePath -UseBasicParsing
    Write-Host "      Stazeno z GitHub Releases" -ForegroundColor Green
} catch {
    Write-Host "      [VAROVANI] GitHub Release nenalezen, zkousim lokalni build..." -ForegroundColor Yellow

    # Zkusit najít lokální build
    $LocalBuild = Join-Path $PSScriptRoot "dist\cardharvest-service-win.exe"
    if (Test-Path $LocalBuild) {
        Copy-Item $LocalBuild $ServicePath -Force
        Write-Host "      Pouzit lokalni build" -ForegroundColor Green
    } else {
        # Zkusit Node.js verzi
        Write-Host "      [INFO] Zkousim Node.js verzi..." -ForegroundColor Yellow

        $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
        if ($nodeCheck) {
            $serviceJs = Join-Path $PSScriptRoot "cardharvest-service.js"
            $packageJson = Join-Path $PSScriptRoot "package.json"

            if (Test-Path $serviceJs) {
                Copy-Item $serviceJs "$InstallDir\cardharvest-service.js" -Force
                Copy-Item $packageJson "$InstallDir\package.json" -Force

                Write-Host "      Instaluji zavislosti..." -ForegroundColor White
                Push-Location $InstallDir
                npm install --production 2>$null
                Pop-Location

                # Vytvořit batch wrapper
                $wrapperContent = @"
@echo off
cd /d "%~dp0"
node cardharvest-service.js %*
"@
                $wrapperPath = "$InstallDir\$SERVICE_NAME.bat"
                $wrapperContent | Out-File -FilePath $wrapperPath -Encoding ASCII
                $ServicePath = $wrapperPath

                Write-Host "      Nainstalovano pomoci Node.js" -ForegroundColor Green
            } else {
                Write-Host "      [CHYBA] cardharvest-service.js nenalezen!" -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "      [CHYBA] Node.js neni nainstalovano!" -ForegroundColor Red
            Write-Host "      Nainstalujte Node.js z https://nodejs.org/" -ForegroundColor Yellow
            exit 1
        }
    }
}

# Spuštění service
Write-Host ""
Write-Host "[4/4] Spoustim service..." -ForegroundColor White

# Spustit service
$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = $ServicePath
$processInfo.WorkingDirectory = $InstallDir
$processInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$processInfo.CreateNoWindow = $true

try {
    $process = [System.Diagnostics.Process]::Start($processInfo)
    Start-Sleep -Seconds 2

    if (-not $process.HasExited) {
        Write-Host "      Service bezi (PID: $($process.Id))" -ForegroundColor Green
    } else {
        Write-Host "      [VAROVANI] Service se nepodarilo spustit" -ForegroundColor Yellow
        Write-Host "      Zkontrolujte log: $LogPath" -ForegroundColor Yellow
    }
} catch {
    Write-Host "      [CHYBA] $($_.Exception.Message)" -ForegroundColor Red
}

# Vytvoření autostart položky ve Startup složce
Write-Host ""
Write-Host "[INFO] Nastavuji automaticke spusteni..." -ForegroundColor White

$StartupFolder = [Environment]::GetFolderPath('Startup')
$ShortcutPath = "$StartupFolder\CardHarvest Service.lnk"

try {
    $WScriptShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $ServicePath
    $Shortcut.WorkingDirectory = $InstallDir
    $Shortcut.WindowStyle = 7  # Minimized
    $Shortcut.Description = "CardHarvest Service"
    $Shortcut.Save()
    Write-Host "      Autostart nastaven: $ShortcutPath" -ForegroundColor Gray
} catch {
    Write-Host "      [VAROVANI] Nepodarilo se nastavit autostart" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Instalace dokoncena!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "CardHarvest Service bezi na: ws://127.0.0.1:17532" -ForegroundColor White
Write-Host "Status endpoint: http://127.0.0.1:17532/status" -ForegroundColor White
Write-Host ""
Write-Host "Otevrete rozsireni CardHarvest v prohlizeci." -ForegroundColor Yellow
Write-Host ""

# Ověřit že service odpovídá
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:17532/health" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
        Write-Host "[OK] Service je pripraven!" -ForegroundColor Green
    }
} catch {
    Write-Host "[INFO] Service se spousti, muze to trvat nekolik sekund..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Okno se zavre za 5 sekund..." -ForegroundColor Gray
Start-Sleep -Seconds 5
