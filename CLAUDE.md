# Claude Code - AdHUB Project Guide

Toto je dokumentace pro Claude Code a AI asistenty pracující s projektem AdHUB.

## Struktura projektu

```
adhub/
├── index.html              # Hlavni stranka hubu
├── script.js               # Logika, konfigurace, preklady
├── styles.css              # Globalni styly
├── CLAUDE.md               # Tento soubor
├── README.md               # Dokumentace projektu
├── docs/                   # Dokumentace a vyzkum
│   ├── mcp-example.md      # Priklad MCP konfigurace
│   ├── research/           # Analyzy a vyzkum
│   │   ├── external-services/  # Analyzy externich sluzeb
│   │   └── project-research/   # Vyzkum pro projekty
│   └── artifacts/          # AI prompty a artefakty
└── projects/
    ├── youtube-downloader/ # YouTube stahovac (Chrome extension)
    ├── chat-panel/         # Multistream chat
    ├── pdf-editor/         # PDF editor
    ├── pdf-merge/          # PDF spojovac
    ├── goalix/             # Task manager (dříve MindHub)
    ├── cardharvest/        # Steam hours & cards farming (dříve Steam Farm)
    ├── scribblix/          # Offline dokumentace (dříve DocBook)
    ├── paintnook/          # Digitální malba (dříve Paint Studio)
    ├── slidersnap/         # Before/after porovnání (dříve Juxtapose)
    ├── spinning-wheel-giveaway/
    ├── resignation-bets/
    ├── ai-prompting/
    └── komopizza/
```

## Hlavni projekty a technologie

### YouTube Downloader (`projects/youtube-downloader/`)

**Typ:** Chrome Extension (Manifest V3)

**Soubory:**
- `plugin/manifest.json` - Extension manifest v5.5.0
- `plugin/content.js` - UI na YouTube strance
- `plugin/background.js` - Service worker, cookies, native messaging
- `plugin/popup.html` + `popup.js` - Nastaveni rozsirenni
- `plugin/youtube-ui.css` - Styly
- `native-host/adhub_yt_host.py` - Python Native Messaging host pro yt-dlp

**Funkcionalita:**
- Zakladni rezim: Stahovani do 720p primo z prohlizece
- Rozsireny rezim: HD/4K/MP3 pres yt-dlp + native host
- Automaticke cookies pro vekove omezena videa
- Podpora: YouTube, YouTube Music, Shorts

**Dulezite:**
```javascript
// Verze musi byt konzistentni ve vsech souborech
// manifest.json: "version": "5.5.0"
// content.js: window.__ADHUB_YT_DL_V55__
// background.js: version: '5.5'
// popup.html: v5.5
// popup.js: v5.5
// native host: VERSION = '5.5'
```

### Chat Panel (`projects/chat-panel/`)

**Typ:** Web app + Node.js WebSocket server

**Backend:** `server/` slozka s WebSocket serverem pro real-time chat

### PDF Editor/Merge (`projects/pdf-editor/`, `projects/pdf-merge/`)

**Typ:** 100% client-side web aplikace

**Knihovny:** pdf-lib, pdf.js

### Goalix (`projects/goalix/`)

**Typ:** SPA task manager (dříve MindHub)

**Uloziste:** 100% localStorage

### CardHarvest (`projects/cardharvest/`)

**Typ:** Chrome Extension + Native Host (Node.js) + Web UI

**Soubory:**
- `index.html` - Web UI pro ovladani farmingu
- `script.js` - Frontend logika
- `styles.css` - Styly v AdHUB designu
- `plugin/manifest.json` - Extension manifest v2.0.0
- `plugin/background.js` - Service worker, Native Messaging
- `plugin/content.js` - Bridge mezi webem a extension
- `plugin/popup.html` + `popup.js` - Popup rozsirenni
- `native-host/cardharvest-host.js` - Node.js host pro steam-user
- `native-host/package.json` - NPM dependencies (steam-user, steam-totp)
- `native-host/install.bat` + `install.sh` - Instalacni skripty

**Funkcionalita:**
- Farming az 32 her soucasne
- Zobrazeni zbyvajicich trading cards
- Automaticke 2FA s shared_secret
- Lokalni ulozeni session (refresh token)
- 100% lokalni zpracovani - zadne data neodchazeji na externi servery

**Architektura:**
```
Web UI (index.html)
     |
     v
content.js (window.postMessage)
     |
     v
background.js (chrome.runtime.sendMessage)
     |
     v
Native Messaging (chrome.runtime.connectNative)
     |
     v
cardharvest-host.js (Node.js)
     |
     v
steam-user knihovna
     |
     v
Steam CM servery
```

**Instalace:**
1. Nahrat rozsirenni z `plugin/` do chrome://extensions
2. Spustit `npm install` v `native-host/`
3. Spustit `install.bat` nebo `install.sh` s ID rozsirenni
4. Restartovat prohlizec

**Dulezite:**
- Steam protokol vyzaduje Native Host - browser-only neni mozne
- Max 32 her soucasne (Steam limit)
- Refresh token ma platnost ~200 dni

---

## Pravidla pro vyvoj

### 1. Bez build procesu

Vsechny projekty jsou vanilla JS/HTML/CSS. Zadny webpack, Vite ani jiny bundler.

```bash
# Spusteni - staci HTTP server
python -m http.server 8000
# nebo
npx serve .
```

### 2. Verzovani

Pri zmene rozsirent (youtube-downloader):
1. Aktualizuj verzi ve VSECH souborech konzistentne
2. Pouzij semanticke verzovani (MAJOR.MINOR.PATCH)

### 3. Jazykova podpora

Preklady jsou v `script.js` v objektu `BASE_TRANSLATIONS`:

```javascript
const BASE_TRANSLATIONS = {
  cs: { /* ceske preklady */ },
  en: { /* anglicke preklady */ }
};
```

### 4. Pridani noveho projektu

1. Vytvor slozku `projects/nazev-projektu/`
2. Pridej `index.html` jako vstupni bod
3. Edituj `script.js` a pridej do `getLocalizedConfig()`
4. Pridej preklady do `BASE_TRANSLATIONS`
5. Pridej konfiguraci do `.github/scripts/analyze-projects.py` (PROJECT_CONFIGS)

### 5. Automaticka analyza projektu (GitHub Action)

Repository obsahuje automaticky system pro generovani ANALYSIS.md souboru.

**Jak to funguje:**
- Pri push do `main` vetve (zmeny v `projects/**`) se spusti GitHub Action
- Action detekuje zmemene projekty a aktualizuje POUZE jejich ANALYSIS.md
- Zmeny se automaticky commitnou

**Dulezite pro Claude Code:**
- NEUPRAVUJ rucne soubory `projects/*/ANALYSIS.md` - jsou generovany automaticky
- Pri pridani noveho projektu PRIDEJ konfiguraci do `.github/scripts/analyze-projects.py`:

```python
PROJECT_CONFIGS = {
    "nazev-projektu": {
        "name": "Nazev Projektu",
        "type": "Web App",
        "version": "1.0",
        "status": "Active",
        "technologies": ["HTML/CSS/JS", "React", ...],
        "category": "Category",
        "description": "Popis projektu",
        "main_file": "index.html",
        "features": [
            "Feature 1",
            "Feature 2"
        ]
    }
}
```

**Manualni spusteni:**
- GitHub -> Actions -> "Project Analysis" -> Run workflow
- Lze zadat konkretni projekt nebo analyzovat vse

**Soubory:**
- `.github/workflows/project-analysis.yml` - GitHub Action workflow
- `.github/scripts/analyze-projects.py` - Python skript pro generovani analyzy

---

## YouTube Downloader - Detailni architektura

### Tok dat

```
YouTube stranka
     |
     v
content.js (extrakce ytInitialPlayerResponse)
     |
     v
background.js (chrome.runtime.sendMessage)
     |
     +---> Zakladni rezim: chrome.downloads.download()
     |
     +---> Rozsireny rezim:
           |
           v
     Native Messaging (chrome.runtime.sendNativeMessage)
           |
           v
     adhub_yt_host.py (Python)
           |
           v
     yt-dlp + ffmpeg
           |
           v
     ~/Downloads/
```

### Podporovane typy videi

| Typ | Zakladni | Rozsireny |
|-----|----------|-----------|
| Bezne video | max 720p | 4K |
| YouTube Shorts | max 720p | 4K |
| YouTube Music | max 720p | HD + MP3 |
| Vekove omezene | NE | ANO (cookies) |
| Zive prenosy | NE | ANO |
| Soukrome | NE | NE |

### Automaticke cookies

```javascript
// background.js - ziskani cookies
const cookies = await chrome.cookies.getAll({ domain: '.youtube.com' });
const musicCookies = await chrome.cookies.getAll({ domain: 'music.youtube.com' });
const googleCookies = await chrome.cookies.getAll({ domain: '.google.com' });

// Konverze do Netscape formatu pro yt-dlp
```

### Native Host instalace

```bash
# Linux/macOS
cd native-host && ./install.sh

# Windows
cd native-host && install.bat
```

---

## Casty problemy a reseni

### YouTube Downloader nefunguje

1. **Zadne formaty** - YouTube zmenil strukturu, zkontroluj `extractPlayerResponse()`
2. **Native host error** - Zkontroluj instalaci: `chrome://extensions` -> Details -> Native Messaging hosts
3. **Cookies nefunguji** - Zkontroluj permission "cookies" v manifest.json

### Verze nejsou synchronizovane

```bash
# Najdi vsechny soubory s verzi
grep -r "v5\." projects/youtube-downloader/plugin/
grep -r "VERSION" projects/youtube-downloader/native-host/
```

---

## Uzitecne prikazy

```bash
# Kontrola syntaxe JS
npx eslint projects/youtube-downloader/plugin/*.js

# Kontrola JSON
python -m json.tool projects/youtube-downloader/plugin/manifest.json

# Test native host
echo '{"action":"ping"}' | python3 native-host/adhub_yt_host.py

# Git - ukazat zmeny v extension
git diff projects/youtube-downloader/plugin/
```

---

## Kontakt

**Autor:** Deerpfy
**GitHub:** https://github.com/Deerpfy/adhub
**Web:** https://deerpfy.github.io/adhub/
