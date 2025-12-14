# CardHarvest - One-Click Installer pro Windows
# Spusťte tento skript v PowerShell jako Administrator

$ErrorActionPreference = "Stop"

$VERSION = "1.2.0"
$REPO = "Deerpfy/adhub"
$HOST_NAME = "com.adhub.cardharvest"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "CardHarvest - Native Host Installer v$VERSION" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Detekce Extension ID
$ExtensionId = $args[0]
if (-not $ExtensionId) {
    Write-Host "Zadejte ID rozsirenni z chrome://extensions:" -ForegroundColor Yellow
    $ExtensionId = Read-Host
}

if (-not $ExtensionId -or $ExtensionId.Length -lt 32) {
    Write-Host "[CHYBA] Neplatne ID rozsirenni!" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Extension ID: $ExtensionId" -ForegroundColor Gray

# Cesty
$InstallDir = "$env:LOCALAPPDATA\AdhubSteamFarm"
$HostPath = "$InstallDir\cardharvest-host.exe"
$ManifestPath = "$InstallDir\$HOST_NAME.json"

# Vytvoření složky
Write-Host ""
Write-Host "[1/4] Vytvářím instalační složku..." -ForegroundColor White
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
Write-Host "      $InstallDir" -ForegroundColor Gray

# Stažení executable
Write-Host ""
Write-Host "[2/4] Stahuji Native Host..." -ForegroundColor White
$DownloadUrl = "https://github.com/$REPO/releases/download/cardharvest-v$VERSION/cardharvest-host-win.exe"

try {
    # Zkusit stáhnout z GitHub Releases
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $HostPath -UseBasicParsing
    Write-Host "      Staženo z GitHub Releases" -ForegroundColor Green
} catch {
    Write-Host "      [VAROVÁNÍ] GitHub Release nenalezen, zkouším lokální build..." -ForegroundColor Yellow

    # Zkusit najít lokální build
    $LocalBuild = Join-Path $PSScriptRoot "dist\cardharvest-host-win.exe"
    if (Test-Path $LocalBuild) {
        Copy-Item $LocalBuild $HostPath -Force
        Write-Host "      Použit lokální build" -ForegroundColor Green
    } else {
        Write-Host "      [CHYBA] Native Host executable nenalezen!" -ForegroundColor Red
        Write-Host "      Spusťte 'npm run build' v native-host složce" -ForegroundColor Yellow
        exit 1
    }
}

# Vytvoření manifestu
Write-Host ""
Write-Host "[3/4] Vytvářím manifest..." -ForegroundColor White

$Manifest = @{
    name = $HOST_NAME
    description = "CardHarvest Native Messaging Host pro AdHUB"
    path = $HostPath
    type = "stdio"
    allowed_origins = @("chrome-extension://$ExtensionId/")
} | ConvertTo-Json

$Manifest | Out-File -FilePath $ManifestPath -Encoding UTF8
Write-Host "      $ManifestPath" -ForegroundColor Gray

# Registrace v Registry
Write-Host ""
Write-Host "[4/4] Registruji Native Host..." -ForegroundColor White

$RegPaths = @(
    "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HOST_NAME",
    "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HOST_NAME",
    "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\$HOST_NAME",
    "HKCU:\Software\Chromium\NativeMessagingHosts\$HOST_NAME"
)

foreach ($RegPath in $RegPaths) {
    try {
        $ParentPath = Split-Path $RegPath -Parent
        if (-not (Test-Path $ParentPath)) {
            continue
        }

        New-Item -Path $RegPath -Force | Out-Null
        Set-ItemProperty -Path $RegPath -Name "(Default)" -Value $ManifestPath

        $BrowserName = ($RegPath -split '\\')[2]
        Write-Host "      ✓ $BrowserName" -ForegroundColor Green
    } catch {
        # Ignorovat chyby pro neexistující prohlížeče
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Instalace dokončena!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Restartujte prohlížeč pro aktivaci rozšíření." -ForegroundColor Yellow
Write-Host ""

# Automatické zavření po 5s
Write-Host "Okno se zavře za 5 sekund..." -ForegroundColor Gray
Start-Sleep -Seconds 5
