# AdHub YouTube Downloader v5.0

![Status](https://img.shields.io/badge/status-complete-success) ![Version](https://img.shields.io/badge/version-5.0.0-purple) ![License](https://img.shields.io/badge/license-MIT-blue)

Kompletní řešení pro stahování YouTube videí ve **všech formátech a kvalitách**.

## Funkce

- **Všechny video kvality**: 4K, 2K, 1080p, 720p, 480p, 360p, 240p, 144p
- **Všechny audio formáty**: MP3, WAV, M4A, FLAC, OGG
- **Tlačítko přímo na YouTube**: Stahujte jedním kliknutím
- **Lokální server**: Plná podpora všech formátů přes yt-dlp
- **Fallback režim**: Základní formáty fungují i bez serveru

## Instalace

### 1. Nainstalujte Browser Extension

1. Stáhněte složku `plugin/` nebo ZIP z webové stránky
2. Otevřete `chrome://extensions` (nebo `edge://extensions`)
3. Zapněte "Vývojářský režim"
4. Klikněte "Načíst rozbalené" a vyberte složku `plugin/`

### 2. Nainstalujte Python Server (doporučeno)

Pro plnou podporu všech formátů a kvalit:

```bash
# Požadavky
pip install yt-dlp

# Volitelně pro audio konverzi
# macOS:   brew install ffmpeg
# Ubuntu:  sudo apt install ffmpeg
# Windows: https://ffmpeg.org/download.html

# Spuštění serveru
cd server
./start_server.sh      # Linux/macOS
start_server.bat       # Windows
```

Server poběží na `http://127.0.0.1:8765`

## Použití

### S lokálním serverem (doporučeno)

1. Spusťte server: `python server/yt_server.py`
2. Jděte na YouTube video
3. Klikněte na tlačítko "Stáhnout" pod videem
4. Vyberte formát a kvalitu
5. Soubor se stáhne do `~/Downloads`

### Bez serveru (omezené formáty)

1. Jděte na YouTube video
2. Klikněte na tlačítko "Stáhnout"
3. Dostupné jsou pouze progressive formáty (max 720p)

## API Endpointy

Server poskytuje REST API:

| Endpoint | Metoda | Popis |
|----------|--------|-------|
| `/api/status` | GET | Stav serveru |
| `/api/info?url=URL` | GET | Info o videu + formáty |
| `/api/formats` | GET | Seznam podporovaných formátů |
| `/api/download` | POST | Zahájit stahování |
| `/api/progress/<id>` | GET | Průběh stahování |

### Příklad stažení přes API

```bash
# Info o videu
curl "http://127.0.0.1:8765/api/info?url=https://www.youtube.com/watch?v=VIDEO_ID"

# Stáhnout MP3
curl -X POST http://127.0.0.1:8765/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID", "format_type": "audio", "audio_format": "mp3"}'

# Stáhnout video v 1080p
curl -X POST http://127.0.0.1:8765/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID", "format_type": "video", "quality": 1080}'
```

## Struktura projektu

```
youtube-downloader/
├── plugin/                 # Browser extension
│   ├── manifest.json
│   ├── content.js         # Injektuje UI na YouTube
│   ├── background.js      # Service worker
│   ├── youtube-ui.css     # Styly
│   └── icons/
├── server/                 # Python server
│   ├── yt_server.py       # Hlavní server
│   ├── start_server.sh    # Spouštěč (Linux/macOS)
│   └── start_server.bat   # Spouštěč (Windows)
├── index.html             # Webová stránka
├── script.js              # Web UI logika
└── styles.css             # Web styly
```

## Řešení problémů

### Server nefunguje

1. Zkontrolujte, že máte Python 3.7+
2. Nainstalujte yt-dlp: `pip install yt-dlp`
3. Pro MP3/WAV nainstalujte FFmpeg

### Tlačítko se nezobrazuje

1. Obnovte stránku (F5)
2. Zkontrolujte, že je extension aktivní
3. Zkuste přeinstalovat extension

### Formáty nejsou dostupné

1. Spusťte lokální server
2. Server zobrazí zelený indikátor na tlačítku

## Changelog

### v5.0.0
- Nový Python server s yt-dlp
- Podpora všech formátů (MP3, WAV, FLAC, OGG)
- Podpora všech kvalit (4K až 144p)
- Server indikátor na tlačítku
- Fallback režim bez serveru

### v4.0.0
- Přepracované UI
- Lepší detekce formátů
- Opravy stability

## Bezpečnost & Soukromí

- **Žádné sledování** - Nesbíráme žádná data
- **Lokální zpracování** - Vše běží na vašem počítači
- **Open source** - Můžete zkontrolovat kód

## Právní upozornění

Tento nástroj je určen pouze pro stahování videí, ke kterým máte právo. Respektujte autorská práva a podmínky použití YouTube.

---

**Součást projektu [AdHUB](../../index.html)**
