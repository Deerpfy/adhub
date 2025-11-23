# 🎥 YouTube Downloader

Nástroj pro stahování YouTube videí ve formátu MP4 a MP3 se stejným designem jako Chat Panel.

## 📋 Požadavky

- **Node.js** (verze 16 nebo vyšší)
- **yt-dlp** - nástroj pro stahování videí z YouTube
- **ffmpeg** - pro konverzi do MP3 formátu (není potřeba pro MP4)

## 🔧 Instalace yt-dlp

**⚠️ DŮLEŽITÉ:** Bez yt-dlp server poběží, ale nebude moci stahovat videa!

### Rychlá kontrola
Spusťte: `check-yt-dlp.bat` (zkontroluje, zda je yt-dlp nainstalovaný)

### Windows - Metoda 1: Stáhnout .exe (NEJLEPŠÍ)
1. Stáhněte `yt-dlp.exe` z [GitHub releases](https://github.com/yt-dlp/yt-dlp/releases)
2. Umístěte `yt-dlp.exe` do **`C:\Windows\System32`** (funguje všude)
3. Nebo do složky projektu: `youtube-downloader/server/`
4. Otestujte v CMD: `yt-dlp --version`

### Windows - Metoda 2: Pomocí pip
```bash
pip install yt-dlp
```

### Windows - Metoda 3: Pomocí winget
```bash
winget install yt-dlp
```

**Podrobné instrukce:** Viz `server/INSTALACE-YT-DLP.txt`

## 🔧 Instalace ffmpeg (pro MP3 konverzi)

**⚠️ DŮLEŽITÉ:** ffmpeg je potřeba POUZE pro stahování MP3. Pro MP4 videa není potřeba!

### Windows - Metoda 1: Stáhnout binárky (NEJLEPŠÍ)
1. Stáhněte z: https://www.gyan.dev/ffmpeg/builds/
2. Rozbalte ZIP
3. Zkopírujte `ffmpeg.exe` do `C:\Windows\System32`
4. Otestujte v CMD: `ffmpeg -version`

### Windows - Metoda 2: Pomocí winget
```bash
winget install ffmpeg
```

### Windows - Metoda 3: Pomocí Chocolatey
```bash
choco install ffmpeg
```

**Podrobné instrukce:** Viz `server/INSTALACE-FFMPEG.txt`

### Linux/Mac
```bash
# Pomocí pip
pip install yt-dlp

# Nebo pomocí homebrew (Mac)
brew install yt-dlp
```

## 🚀 Spuštění

### 1. Instalace závislostí

**⚠️ DŮLEŽITÉ:** Musíte nainstalovat závislosti před prvním spuštěním!

**Jednoduchý způsob (doporučeno):**
- Dvakrát klikněte na: `youtube-downloader/server/install.bat`

**Nebo ručně:**
```bash
cd youtube-downloader/server
npm install
```

**Poznámka:** Pokud `npm` příkaz nefunguje:
- Zkuste použít `install.bat` (automaticky kontroluje Node.js a npm)
- Otevřít nový terminál/CMD
- Restartovat počítač (aby se načetla PATH proměnná)
- Zkontrolovat instalaci Node.js: https://nodejs.org/

### 2. Spuštění serveru

```bash
npm start
```

Server poběží na `http://localhost:3003`

**Poznámka:** Helper server (pro ovládání z webu) běží na portu `3004` (port 3002 je používán Chat Panel helperem)

### 3. Otevření webového rozhraní

Otevřete soubor `index.html` v prohlížeči nebo použijte:

```bash
# Z root složky projektu
python -m http.server 8080
```

Pak otevřete `http://localhost:8080/youtube-downloader/` v prohlížeči.

## 📖 Použití

1. **Zapněte server** pomocí tlačítka "Zapnout Server" v hlavičce
2. **Zadejte YouTube URL** do formuláře
3. **Klikněte na "Získat informace"** pro zobrazení informací o videu
4. **Vyberte formát** stahování:
   - **📹 MP4 Video** - stáhne video ve formátu MP4
   - **🎵 MP3 Audio** - stáhne pouze audio ve formátu MP3
5. **Po dokončení** můžete soubor stáhnout pomocí tlačítka "💾 Stáhnout soubor"

## 🎨 Funkce

- ✅ Stahování videí ve formátu **MP4**
- ✅ Stahování audia ve formátu **MP3**
- ✅ Zobrazení informací o videu (název, thumbnail, délka, počet zhlédnutí)
- ✅ Progress tracking při stahování
- ✅ Historie stažených souborů
- ✅ Stejný design jako Chat Panel
- ✅ Ovládání serveru přímo z webového rozhraní

## 🔌 API Endpoints

### Informace o videu
```
POST /api/video/info
Body: { "url": "https://www.youtube.com/watch?v=..." }
```

### Stáhnout MP4
```
POST /api/download/mp4
Body: { "url": "https://www.youtube.com/watch?v=...", "quality": "best" }
```

### Stáhnout MP3
```
POST /api/download/mp3
Body: { "url": "https://www.youtube.com/watch?v=...", "quality": "192K" }
```

### Status
```
GET /api/status
```

### Health check
```
GET /health
```

## 📁 Struktura projektu

```
youtube-downloader/
├── server/
│   ├── server.js          # Backend server
│   ├── package.json       # Node.js závislosti
│   └── downloads/         # Složka pro stažené soubory (vytvoří se automaticky)
├── index.html             # Frontend HTML
├── styles.css             # CSS styly
├── script.js              # Frontend JavaScript
└── README.md              # Tento soubor
```

## ⚠️ Poznámky

- Stažené soubory se ukládají do složky `server/downloads/`
- Historie stahování se ukládá v localStorage prohlížeče
- Server musí běžet pro stahování videí
- Pro Windows může být potřeba přidat `yt-dlp.exe` do PATH

## 🐛 Řešení problémů

### "yt-dlp není nainstalován"
- Ujistěte se, že máte nainstalovaný yt-dlp
- Zkontrolujte, že je v systémové PATH
- Na Windows můžete zkusit `yt-dlp.exe --version` v příkazové řádce

### "Server neběží"
- Spusťte server pomocí `npm start` v složce `server`
- Zkontrolujte, že port 3003 není používán jiným programem
- Použijte tlačítko "Zapnout Server" v webovém rozhraní (pokud je helper server spuštěn)

### "Chyba při stahování"
- Zkontrolujte, že YouTube URL je platná
- Některá videa mohou být chráněná autorskými právy
- Ujistěte se, že máte aktivní internetové připojení

## 📝 Licence

MIT

