# AdHUB - Central Hub for Tools and Utilities

A central hub for various tools, utilities and projects. Everything accessible from one place with a modern and clear interface.

![Status](https://img.shields.io/badge/status-active-success) ![License](https://img.shields.io/badge/license-MIT-blue) ![Version](https://img.shields.io/badge/version-1.3.1-purple) ![Projects](https://img.shields.io/badge/projects-18-orange)

## Features

- **Search** - Quick search across all tools and links
- **Categories and tags** - Filtering by categories and tags
- **Responsive design** - Works on all devices
- **Modern dark theme** - Easy on the eyes
- **No server needed** - Works as a static page (GitHub Pages)
- **Multi-language support** - 40+ languages with automatic translation
- **IP-based language detection** - Automatically detects user's country and sets appropriate language (CZ/SK = Czech, others = English)
- **Versioning** - Version display in header and footer
- **View counter** - Firebase-based view tracking for each tool

---

## Projects Overview

| Project | Type | Status | Offline | Language | Version |
|---------|------|--------|---------|----------|---------|
| [YouTube Downloader](#youtube-downloader) | Chrome Extension | Active | No | CZ | v5.5 |
| [Steam Farm](#steam-farm) | Chrome Extension | Active | No | CZ | v1.2 |
| [PDF Editor](#pdf-editor) | Web App | Complete | Yes | CZ/EN | v1.0 |
| [PDF Merge](#pdf-merge) | Web App | Complete | Yes | CZ/EN | v1.0 |
| [PDF Search](#pdf-search) | Web App | Complete | Yes | CZ/EN | v1.0 |
| [AI Prompting](#ai-prompting) | React App | Complete | No | CZ/EN | v2.0 |
| [Rust Calculator](#rust-calculator) | PWA | Complete | Yes | CZ/EN | v1.0 |
| [DocBook](#docbook) | PWA | Complete | Yes | CZ | v1.0 |
| [API Catalog](#api-catalog) | PWA | Complete | Yes | CZ/EN | v1.0 |
| [Server Hub](#server-hub) | PWA | Complete | Yes | CZ | v1.0 |
| [NIMT Tracker](#nimt-tracker) | PWA | Complete | Yes | CZ | v1.0 |
| [Paint Studio](#paint-studio) | PWA | Complete | Yes | CZ | v1.0 |
| [MindHub](#mindhub) | React App | Complete | No | EN | v1.0 |
| [Resignation Bets](#resignation-bets) | Web App | Complete | Yes | CZ/EN | v1.0 |
| [Multistream Chat](#multistream-chat-panel) | Web App | Active | No | CZ | v2.0 |
| [Spinning Wheel](#spinning-wheel-giveaway) | Web App | Complete | Yes | EN | v1.0 |
| [KomoPizza](#komopizza-demo) | Demo | Complete | No | CZ | v1.0 |

**Legend:** PWA = Progressive Web App with Service Worker

---

## Chrome Extensions

### YouTube Downloader
Browser extension for Chrome/Edge/Brave enabling download of YouTube videos and audio directly from your browser.

**Features:**
- Basic mode: Download up to 720p directly from browser
- Advanced mode: HD/4K/MP3 via yt-dlp + native host
- Automatic cookies for age-restricted videos
- YouTube Shorts support
- YouTube Music support
- Live stream recording
- Download history tracking

**Requirements:**
- Basic mode: Just the extension
- Advanced mode: Python + yt-dlp + ffmpeg + Native Host

**Supported platforms:** YouTube, YouTube Music, YouTube Shorts

**Status:** Active | **Version:** 5.5.0

---

### Steam Farm
Automated Steam game farming tool with native host support.

**Features:**
- Farm up to 32 games simultaneously (Steam limit)
- Trading cards tracking with remaining drops
- Automatic 2FA with shared_secret
- AES-256 encrypted credential vault
- Argon2id key derivation for security
- Refresh token storage (200-day validity)
- 100% local processing - no external servers

**Requirements:**
- Chrome Extension
- Node.js
- Native Host installation (`npm install` + install script)

**Security:**
- All credentials stored locally with AES-256 encryption
- Password-protected vault with Argon2id
- No data sent to external servers

**Status:** Active | **Version:** 1.2.0

---

## PWA Applications (Offline-First)

### Rust Calculator
Offline calculator for the game Rust - raid costs, crafting recipes, and raw materials.

**Features:**
- Raid cost calculator with all building types
- Crafting materials calculator
- Raw materials lookup
- Compare raid methods
- Quick reference tables
- 100% offline functionality
- Multi-language (CZ/EN) with IP detection

**Technology:** Vanilla JS, Service Worker, localStorage

**Status:** Complete | **Version:** 1.0.3

---

### DocBook
Offline documentation platform inspired by GitBook with WYSIWYG Markdown editor.

**Features:**
- WYSIWYG Markdown editor with real-time preview
- Spaces (workspaces) and Pages hierarchy
- Full-text search with FlexSearch
- Rich toolbar for formatting
- Auto-generated table of contents
- Undo/Redo functionality
- Import/Export (JSON, Markdown, HTML, ZIP)
- Auto-save every 30 seconds
- Word count tracking
- Split view mode (edit/preview)

**Technology:** Dexie.js (IndexedDB), Marked.js, DOMPurify, FlexSearch

**Status:** Complete | **Version:** 1.0.0

---

### API Catalog
Offline-first directory for browsing and managing 10,000+ APIs.

**Features:**
- Browse 10,000+ APIs from API-mega-list
- Full-text search with filtering
- Category filtering and sorting
- Favorites/bookmarking system
- Import/Export functionality
- Statistics dashboard
- Add custom APIs manually
- Pagination support

**Technology:** IndexedDB, Service Worker

**Status:** Complete | **Version:** 1.0.0

---

### Server Hub
Offline-first server management dashboard inspired by xCloud control panel.

**Features:**
- Server management and monitoring
- Website management
- Backup tracking
- Activity logging
- Dashboard with statistics
- Data export/import
- 100% offline capability

**Views:** Dashboard, Servers, Sites, Backups, Activity

**Technology:** IndexedDB, Service Worker

**Status:** Complete | **Version:** 1.0.0

---

### NIMT Tracker (AI Visibility Tracker)
Offline-first app for tracking brand visibility in AI search engines.

**Features:**
- Brand visibility tracking dashboard
- Multiple brand management
- Share of Voice metrics
- Source citations analysis
- Competitor tracking
- Data export/import
- Dark/Light theme

**Technology:** IndexedDB, Service Worker

**Status:** Complete | **Version:** 1.0.0

---

### Paint Studio
Offline-first digital painting application inspired by Procreate.

**Features:**
- Layer system with 16 blend modes (Normal, Multiply, Screen, Overlay, etc.)
- Pressure-sensitive brushes (requires compatible stylus)
- QuickShape detection - hold to convert freehand to geometric shapes
- StreamLine stroke smoothing for professional linework
- Multiple tools: Brush, Pencil, Eraser, Fill, Eyedropper, Line, Rectangle, Ellipse
- Color picker with HSV gradient and presets
- Undo/Redo with 50-state history
- Export to PNG, JPEG, WebP
- Import images as new layers
- Project save/load with IndexedDB
- 100% offline functionality

**Technology:** Canvas API, Pointer Events (pressure), IndexedDB, Service Worker

**Inspired by:** Procreate, Kleki, Drawpile

**Status:** Complete | **Version:** 1.0.0

---

## Web Applications

### PDF Editor
Full-featured PDF editor running 100% client-side in browser.

**Features:**
- Text and annotation editing
- Digital signatures (draw, type, upload)
- PDF compression with quality settings
- Page management (reorder, rotate, delete)
- Whiteout/redaction tool
- Multiple signature fonts (Dancing Script, Great Vibes, Pacifico, Sacramento, Allura)
- Multi-language (CZ/EN) with IP detection

**Technology:** pdf-lib, pdfjs-dist, Fabric.js, signature_pad

**Data handling:** 100% client-side - files never leave your device

**Status:** Complete | **Version:** 1.0

---

### PDF Merge
Simple web tool to merge multiple PDF files into one.

**Features:**
- Drag & drop upload
- Reorder files by dragging
- PDF preview with page navigation
- Works 100% offline
- Multi-language (CZ/EN) with IP detection
- No server needed

**Technology:** pdf-lib, pdfjs-dist

**Status:** Complete | **Version:** 1.0

---

### PDF Search
Full-text search within multiple PDF documents.

**Features:**
- Multiple PDF upload and management
- Full-text search across all documents
- Fuzzy search with typo tolerance
- Prefix matching
- Result highlighting with page references
- Multi-language (CZ/EN) with IP detection
- 100% client-side processing

**Technology:** pdfjs-dist, MiniSearch

**Status:** Complete | **Version:** 1.0

---

### AI Prompting
Professional prompt formatter for AI assistants with research-backed techniques.

**Features:**
- 9+ prompting methods (CoT, Few-Shot, ToT, Step-Back, Analogical, RAR, etc.)
- Template system (General, Coding, Creative, Analysis, Email, Academic, Data, Marketing, etc.)
- AI model targeting (Claude, GPT, Gemini, Llama, Mistral, Cohere, Grok, DeepSeek)
- Real-time preview with syntax highlighting
- Save/Load prompts to database
- Share prompts via compressed URL
- Import/Export functionality
- Tutorial system for beginners
- Extended sections for advanced formatting
- Multi-language (CZ/EN) with IP detection

**Technology:** React 18, Tailwind CSS, Lucide Icons, LZ-String

**Status:** Complete | **Version:** 2.0

---

### MindHub
Personal task and project coordination platform.

**Features:**
- Task management with projects and tags
- Quick capture with keyboard shortcuts
- Today view and inbox
- Command palette (Cmd/Ctrl+K)
- Light/Dark/High-contrast themes
- AI agent suggestions (simulated)
- 100% local storage

**Technology:** React 18, localStorage

**Status:** Complete | **Version:** 1.0

---

### Resignation Bets
Fun casino-style app for betting on who will resign from work first.

**Features:**
- Create and manage bets on colleagues
- Predict resignation dates
- Track active/inactive bets
- Leaderboard and statistics
- Bet history tracking
- Export/Import data
- Multi-language (CZ/EN) with IP detection
- Accessibility features (ARIA labels)

**Technology:** IndexedDB, Vanilla JS

**Status:** Complete | **Version:** 1.0

---

### Multistream Chat Panel
Unified chat for streamers - displays chat from multiple platforms in one place.

**Features:**
- Multi-platform support (Twitch, Kick, YouTube)
- Real-time message streaming
- Channel filtering and highlighting
- Emote rendering with platform badges
- Timestamp display
- Compact mode option
- Theme toggle (dark/light)
- OBS overlay support
- Chrome Extension for YouTube integration
- Moderator command support

**Platform modes:**
- Twitch: WebSocket-based real-time
- Kick: REST API polling
- YouTube: Iframe, API, or Extension mode

**Technology:** Adapter pattern, WebSocket, JSZip

**Status:** Active | **Version:** 2.0

---

### Spinning Wheel Giveaway
Interactive spinning wheel for drawing winners on streams and giveaway events.

**Features:**
- Customizable wheel segments
- Sound effects
- Winner history
- OBS overlay support
- Smooth animations

**Technology:** Canvas API, CSS Animations

**Status:** Complete | **Version:** 1.0

---

### KomoPizza Demo
Sample restaurant website demonstrating modern UI/UX principles.

**Features:**
- Restaurant menu display (Kebab, Pizza, Extras)
- 11 different font themes
- Interactive animations
- Responsive design
- Contact information

**Status:** Complete (Demo) | **Version:** 1.0

---

## External Links Directory

AdHUB includes a comprehensive directory of **150+ free web tools** that require no registration. These are curated external links organized into 16 categories:

| Category | Count | Examples |
|----------|-------|----------|
| Security & Privacy | 11 | VirusTotal, SSL Labs, Have I Been Pwned, Am I Unique |
| File Conversion | 12 | iLovePDF, CloudConvert, TinyPNG, Remove.bg |
| Developer Tools | 17 | Regex101, JSON Crack, Hoppscotch, CodePen, Crontab.guru |
| Design & Graphics | 19 | Photopea, Coolors, SVG Repo, Favicon.io, Fontjoy |
| Text & Writing | 9 | StackEdit, Hemingway Editor, QuillBot, Lipsum |
| SEO & Web Analysis | 10 | PageSpeed Insights, GTmetrix, Schema Validator |
| Network & DNS | 9 | MXToolbox, Fast.com, DNSChecker, HackerTarget |
| Data & Calculation | 9 | Desmos, Calculator.net, RAWGraphs, ChartGo |
| Compression & Archive | 5 | ezyZip, ZIP Extractor, Unzip-Online |
| QR Code Generators | 5 | QRCode Monkey, QRStuff, goQR.me |
| Screenshot & Recording | 6 | ScreenPal, RecordCast, Panopto Express |
| Temporary Services | 9 | Guerrilla Mail, PrivateBin, WeTransfer, Privnote |
| AI & Automation | 8 | TinyWow, OCR.space, QuillBot Summarizer |
| Learning & Reference | 5 | Desmos Graphing, Wolfram Alpha, TypingClub |
| Productivity | 11 | draw.io, Excalidraw, Pomofocus, ProtectedText |
| Setup & Utilities | 4 | Ninite, Patch My PC, Winget.run |

All links accessible directly from the AdHUB interface with search and filtering.

---

## Project Structure

```
adhub/
├── index.html              # Main hub page
├── script.js               # Logic, config, translations, geo-detection
├── styles.css              # Global styles
├── README.md               # This file
├── CLAUDE.md               # AI assistant documentation
└── projects/
    ├── youtube-downloader/ # Chrome Extension + Native Host (Python)
    │   ├── plugin/         # Extension source (Manifest V3)
    │   └── native-host/    # Python yt-dlp host
    ├── steam-farm/         # Chrome Extension + Native Host (Node.js)
    │   ├── plugin/         # Extension source
    │   └── native-host/    # Node.js steam-user host
    ├── pdf-editor/         # PDF editing, signing, compression
    │   ├── js/             # pdf-lib, Fabric.js modules
    │   └── css/            # Styles
    ├── pdf-merge/          # PDF file merger
    ├── pdf-search/         # Full-text PDF search
    ├── ai-prompting/       # React prompt formatter
    │   └── archive/        # Previous versions
    ├── rust-calculator/    # PWA game calculator
    │   ├── sw.js           # Service Worker
    │   └── manifest.json   # PWA manifest
    ├── docbook/            # PWA documentation platform
    │   ├── sw.js           # Service Worker
    │   ├── db.js           # Dexie.js database
    │   └── editor.js       # Editor logic
    ├── api-catalog/        # PWA API directory
    │   ├── sw.js           # Service Worker
    │   └── db.js           # IndexedDB layer
    ├── server-hub/         # PWA server management
    │   ├── sw.js           # Service Worker
    │   └── db.js           # IndexedDB layer
    ├── nimt-tracker/       # PWA AI visibility tracker
    │   ├── sw.js           # Service Worker
    │   └── db.js           # IndexedDB layer
    ├── paint-studio/       # PWA digital painting app
    │   ├── sw.js           # Service Worker
    │   ├── app/            # ES modules (PaintApp, Canvas, Layers, Tools)
    │   └── manifest.json   # PWA manifest
    ├── mindhub/            # React task manager
    │   └── js/             # Storage module
    ├── resignation-bets/   # Casino-style betting game
    │   ├── db.js           # IndexedDB operations
    │   ├── lang.js         # Language manager
    │   └── locales/        # Translation files
    ├── chat-panel/         # Multistream chat
    │   ├── adapters/       # Platform adapters
    │   └── v1-archive/     # Previous version
    ├── spinning-wheel-giveaway/
    └── komopizza/          # Restaurant demo
```

---

## Technology Stack

### Core Technologies
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Frameworks:** React 18 (CDN), Tailwind CSS
- **Build:** No build process - everything is vanilla JS
- **Icons:** Lucide Icons, SVG, Canvas-generated

### Storage Solutions
- **IndexedDB:** API Catalog, DocBook, Server Hub, NIMT Tracker, Resignation Bets
- **localStorage:** MindHub, Rust Calculator, Steam Farm, settings/preferences
- **Dexie.js:** DocBook (IndexedDB wrapper)

### PDF Processing
- **pdf-lib@1.17.1:** PDF creation and editing
- **pdfjs-dist@3.11.174:** PDF rendering and text extraction
- **@pdf-lib/fontkit@1.1.1:** Custom font support

### Search Engines
- **FlexSearch@0.7.31:** DocBook full-text search
- **MiniSearch@7.1.1:** PDF Search

### Security (Steam Farm)
- **AES-256-GCM:** Credential encryption
- **Argon2id:** Key derivation
- **steam-user:** Steam protocol library
- **steam-totp:** 2FA support

### Other Libraries
- **Fabric.js@5.3.0:** Canvas manipulation (PDF Editor)
- **signature_pad@4.1.7:** Signature drawing
- **Marked.js@11.1.1:** Markdown parser (DocBook)
- **DOMPurify@3.0.6:** XSS sanitization
- **LZ-String@1.5.0:** URL compression (AI Prompting)
- **JSZip:** Extension packaging

---

## Language Support

### IP-Based Auto-Detection
AdHUB automatically detects user's country via IP geolocation:
- **CZ/SK users:** Czech language by default
- **Other countries:** English by default
- **Manual override:** Always available via language selector
- **Cache:** Results cached for 24 hours

### Supported Languages (40+)
Czech, English, German, French, Spanish, Italian, Portuguese, Polish, Slovak, Dutch, Russian, Ukrainian, Japanese, Chinese, Korean, Arabic, Hindi, Turkish, Swedish, Danish, Finnish, Norwegian, Greek, Hungarian, Romanian, Bulgarian, Croatian, Slovenian, Serbian, Hebrew, Thai, Vietnamese, Indonesian, Malay, Lithuanian, Latvian, Estonian, Catalan, Afrikaans, Swahili

### Translation System
- **Base translations:** Czech and English built-in
- **API translations:** MyMemory API for other languages
- **Caching:** Translations cached in localStorage

---

## Installation and Running

### Option 1: GitHub Pages (Recommended)
1. Fork this repository
2. Enable GitHub Pages in Settings
3. Access at `https://yourusername.github.io/adhub`

### Option 2: Local Development
```bash
# Clone repository
git clone https://github.com/Deerpfy/adhub.git
cd adhub

# Run local server
npx serve .
# or
python -m http.server 8000

# Open http://localhost:8000
```

### Chrome Extensions Setup

#### YouTube Downloader (Advanced Mode)
```bash
# 1. Install Python dependencies
pip install yt-dlp

# 2. Install ffmpeg (for audio/video processing)
# Windows: winget install ffmpeg
# macOS: brew install ffmpeg
# Linux: apt install ffmpeg

# 3. Install Native Host
cd projects/youtube-downloader/native-host
# Windows: install.bat
# Linux/macOS: ./install.sh

# 4. Load extension in Chrome
# chrome://extensions -> Load unpacked -> select plugin/ folder
```

#### Steam Farm
```bash
# 1. Install Node.js dependencies
cd projects/steam-farm/native-host
npm install

# 2. Install Native Host (with your extension ID)
# Windows: install.bat <extension-id>
# Linux/macOS: ./install.sh <extension-id>

# 3. Load extension in Chrome
# chrome://extensions -> Load unpacked -> select plugin/ folder

# 4. Restart browser
```

---

## Adding a New Project

1. Create folder in `projects/project-name/`
2. Add `index.html` as entry point
3. Edit `script.js` and add to `getLocalizedConfig()`
4. Add translations to `BASE_TRANSLATIONS` object for both `cs` and `en`
5. (Optional) Add IP-based language detection:
```javascript
// Add to your project's script.js
const GEO_CACHE_KEY = 'adhub_geo_country';
const GEO_CACHE_TIME_KEY = 'adhub_geo_cache_time';
const GEO_CACHE_DURATION = 24 * 60 * 60 * 1000;
const CZECH_COUNTRIES = ['CZ', 'SK'];

async function detectCountryFromIP() { /* ... */ }
async function initializeLanguageFromGeo() { /* ... */ }
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push branch (`git push origin feature/new-feature`)
5. Open Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

**Deerpfy**

- GitHub: [@Deerpfy](https://github.com/Deerpfy)
- Web: https://deerpfy.github.io/adhub/
