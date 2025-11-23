# 📋 Instrukce pro přesunutí projektů do AdHUB

Tyto instrukce vám pomohou přesunout existující projekty do struktury AdHUB.

## 🔄 Přesunutí projektů

### Windows (PowerShell)

```powershell
# Přejděte do kořenové složky projektu
cd H:\CursorProjects\Test

# Vytvořte složku projects v adhub (pokud neexistuje)
New-Item -ItemType Directory -Force -Path "adhub\projects"

# Zkopírujte projekty
Copy-Item -Path "chat-panel" -Destination "adhub\projects\chat-panel" -Recurse
Copy-Item -Path "youtube-downloader" -Destination "adhub\projects\youtube-downloader" -Recurse
Copy-Item -Path "komopizza" -Destination "adhub\projects\komopizza" -Recurse
```

### Windows (CMD)

```cmd
cd H:\CursorProjects\Test
mkdir adhub\projects
xcopy /E /I /Y chat-panel adhub\projects\chat-panel
xcopy /E /I /Y youtube-downloader adhub\projects\youtube-downloader
xcopy /E /I /Y komopizza adhub\projects\komopizza
```

### Linux/Mac

```bash
cd /cesta/k/projektu
mkdir -p adhub/projects
cp -r chat-panel adhub/projects/
cp -r youtube-downloader adhub/projects/
cp -r komopizza adhub/projects/
```

## ✅ Po přesunutí

1. **Zkontrolujte konfiguraci** - Cesty v `server/tools.json` a `script.js` jsou již aktualizované
2. **Testujte projekty** - Otevřete je přes AdHUB nebo přímo
3. **Odstraňte původní složky** (volitelné) - Pokud vše funguje, můžete odstranit původní složky mimo adhub

## ⚠️ Poznámky

- Při kopírování se zachovají všechny soubory včetně `node_modules`
- Pokud máte velké `node_modules`, můžete je později znovu nainstalovat pomocí `npm install`
- Cesty v projektech mohou potřebovat úpravu, pokud používají absolutní cesty

## 🔍 Ověření

Po přesunutí zkontrolujte:

1. **AdHUB zobrazuje projekty** - Otevřete `adhub/index.html`
2. **Projekty fungují** - Klikněte na projekt v AdHUB
3. **Servery se spouštějí** - Zkuste spustit projekt se serverem přes AdHUB










