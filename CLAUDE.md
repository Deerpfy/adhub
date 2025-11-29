# Claude Code - AdHUB Project Guide

Toto je dokumentace pro Claude Code a AI asistenty pracující s projektem AdHUB.

## Struktura projektu

```
adhub/
├── index.html              # Hlavni stranka hubu
├── script.js               # Logika, konfigurace, preklady
├── styles.css              # Globalni styly
├── CLAUDE.md               # Tento soubor
├── mcp-example.md          # Priklad MCP konfigurace
├── README.md               # Dokumentace projektu
└── projects/
    ├── youtube-downloader/ # YouTube stahovac (Chrome extension)
    ├── chat-panel/         # Multistream chat
    ├── pdf-editor/         # PDF editor
    ├── pdf-merge/          # PDF spojovac
    ├── mindhub/            # Task manager
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

### MindHub (`projects/mindhub/`)

**Typ:** SPA task manager

**Uloziste:** 100% localStorage

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
