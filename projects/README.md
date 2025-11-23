# Projekty v AdHUB

Tato složka obsahuje všechny projekty spravované přes AdHUB.

## 📁 Struktura

```
projects/
├── chat-panel/          # Multistream chat pro Twitch, Kick, YouTube
├── youtube-downloader/  # Stahování videí a audia z YouTube
└── komopizza/           # Pizza ordering app
```

## ➕ Jak přidat nový projekt

### 1. Zkopírujte projekt do této složky

```bash
# Příklad: přidání nového projektu "my-project"
cp -r /cesta/k/projektu projects/my-project
# Nebo na Windows:
xcopy /E /I /Y "C:\cesta\k\projektu" "projects\my-project"
```

### 2. Přidejte do konfigurace

Upravte `../server/tools.json` nebo `../script.js` (DEFAULT_CONFIG):

#### Pro projekt se serverem (jako chat-panel, youtube-downloader):

```json
{
  "id": "my-project",
  "name": "My Project",
  "description": "Popis projektu",
  "category": "kategorie",
  "icon": "🔧",
  "url": "http://localhost:PORT",
  "helperPort": HELPER_PORT,
  "serverPort": SERVER_PORT,
  "helperPath": "projects/my-project/server/server-helper.js",
  "enabled": true,
  "tags": ["tag1", "tag2"]
}
```

#### Pro jednoduchý projekt bez serveru (jako komopizza):

```json
{
  "id": "my-project",
  "name": "My Project",
  "description": "Popis projektu",
  "category": "kategorie",
  "icon": "🔧",
  "url": "projects/my-project/index.html",
  "type": "local",
  "tags": ["tag1", "tag2"]
}
```

### 3. Aktualizujte cesty

- Pokud projekt má server, ujistěte se, že cesty v `helperPath` jsou správné
- Pokud projekt používá relativní cesty, upravte je podle nové struktury

### 4. Restartujte AdHUB server (pokud běží)

Po přidání nového projektu restartujte AdHUB server, aby se změny projevily.

## 📝 Poznámky

- Všechny projekty by měly mít vlastní `index.html` v kořenové složce projektu
- Projekty se serverem by měly mít složku `server/` s `server.js` a `server-helper.js`
- Cesty v projektech by měly být relativní k jejich vlastní složce
- Každý projekt může mít vlastní `README.md` pro dokumentaci

## 🔗 Propojení s AdHUB

AdHUB automaticky zobrazí všechny projekty zadané v konfiguraci:
- V `server/tools.json` (používá se když server běží)
- V `script.js` jako `DEFAULT_CONFIG` (používá se v offline režimu)










