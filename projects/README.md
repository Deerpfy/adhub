# Projekty v AdHUB

Tato složka obsahuje všechny projekty spravované přes AdHUB.

## 📁 Struktura

```
projects/
├── youtube-downloader/      # 🎥 Stahování videí a audia z YouTube
├── chat-panel/              # 💬 Multistream chat pro Twitch, Kick, YouTube
├── pdf-editor/              # ✏️ PDF editor, podpisy, komprese
├── pdf-merge/               # 📄 Sloučení PDF souborů
├── goalix/                  # 🧠 Správa úkolů a projektů
├── spinning-wheel-giveaway/ # 🎡 Losovací kolo pro streamy
├── resignation-bets/        # 🎰 Casino sázková hra
├── ai-prompting/            # 🤖 AI prompt formátovač
└── komopizza/               # 🍕 Demo objednávkové aplikace
```

## 📊 Stav projektů

| Projekt | Stav | Popis |
|---------|------|-------|
| youtube-downloader | ✅ Hotovo | Browser extension + auto-update loader |
| chat-panel | ✅ Hotovo | Frontend + WebSocket backend server |
| pdf-editor | ✅ Hotovo | Editor, podpisy, komprese, správa stránek |
| pdf-merge | ✅ Hotovo | Sloučení více PDF do jednoho |
| goalix | ✅ Hotovo | Task management s localStorage |
| spinning-wheel-giveaway | ✅ Hotovo | Losovací kolo pro giveaway |
| resignation-bets | ✅ Hotovo | Casino hra s IndexedDB |
| ai-prompting | ✅ Hotovo | Prompt formatter pro AI |
| komopizza | ✅ Hotovo | UI/UX demo aplikace |

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
- V `../script.js` funkce `getLocalizedConfig()` - hlavní konfigurace projektů
- Projekty jsou automaticky dostupné z hlavního hubu

## 📚 Dokumentace projektů

Každý projekt má vlastní README s podrobnou dokumentací:
- [YouTube Downloader](youtube-downloader/README.md)
- [Chat Panel](chat-panel/README.md)
- [PDF Editor](pdf-editor/README.md)
- [PDF Merge](pdf-merge/README.md)
- [Goalix](goalix/README.md)
- [Resignation Bets](resignation-bets/README.md)










