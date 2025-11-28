# AdHUB - Central Hub for Tools and Utilities

A central hub for various tools, utilities and projects. Everything accessible from one place with a modern and clear interface.

![Status](https://img.shields.io/badge/status-active-success) ![License](https://img.shields.io/badge/license-MIT-blue) ![Version](https://img.shields.io/badge/version-1.0.0-purple)

## Features

- **Search** - Quick search across all tools and links
- **Categories and tags** - Filtering by categories and tags
- **Responsive design** - Works on all devices
- **Modern dark theme** - Easy on the eyes
- **No server needed** - Works as a static page (GitHub Pages)
- **Multi-language support** - 40+ languages with automatic translation
- **Versioning** - Version display in header and footer

## Projects

### YouTube Downloader
Browser extension for Chrome/Edge/Brave enabling download of YouTube videos and audio directly from your browser.

**Features:**
- Download videos in various qualities (360p - 4K)
- Download audio (M4A, WebM)
- Button directly on YouTube page
- Auto-update extension loader
- No external server required

**Status:** ✅ Complete

### Multistream Chat Panel
Unified chat for streamers - displays chat from Twitch, Kick and YouTube in one place.

**Features:**
- Multi-platform support (Twitch, Kick, YouTube)
- Streamlabs-style rendering with animations
- Iframe fallback mode
- Backend WebSocket server for real-time chat
- Customizable appearance
- OBS overlay support

**Status:** ✅ Complete

### PDF Editor
Full-featured PDF editor running 100% client-side in browser.

**Features:**
- Text and annotation editing
- Digital signatures (draw, type, upload)
- PDF compression
- Page management (reorder, rotate, delete)
- Multi-language support (CZ/EN)

**Status:** ✅ Complete

### PDF Merge
Simple web tool to merge multiple PDF files into one.

**Features:**
- Drag & drop upload
- Reorder files by dragging
- PDF preview with page navigation
- Works 100% offline
- No server needed

**Status:** ✅ Complete

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

**Status:** ✅ Complete (Calendar & Habits placeholders)

### Spinning Wheel Giveaway
Interactive spinning wheel for drawing winners on streams and giveaway events.

**Features:**
- Customizable wheel segments
- Sound effects
- Winner history
- OBS overlay support

**Status:** ✅ Complete

### Resignation Bets
Fun casino-style app for betting on who will resign from work first.

**Features:**
- Roulette-style design with animations
- IndexedDB offline storage
- Leaderboard and history
- Export/Import data
- Multi-language (CZ/EN)

**Status:** ✅ Complete

### AI Prompting
Professional prompt formatter for AI assistants.

**Features:**
- 7 prompting methods (CoT, Few-Shot, ToT, etc.)
- 5 output languages
- Local storage for saved prompts
- Share prompts via URL

**Status:** ✅ Complete

### KomoPizza Demo
Sample ordering application demonstrating modern UI/UX principles.

**Status:** ✅ Complete (Demo)

---

## Project Structure

```
adhub/
├── index.html              # Main page
├── script.js               # Logic, configuration and translations
├── styles.css              # Styles
├── README.md               # This file
├── server/                 # AdHUB backend server (optional)
└── projects/
    ├── youtube-downloader/ # YouTube video/audio downloader
    │   ├── index.html
    │   ├── script.js
    │   ├── styles.css
    │   ├── extension/      # Browser extension source
    │   └── extension-loader/ # Auto-update extension loader
    ├── chat-panel/         # Multistream chat for Twitch/Kick/YouTube
    │   ├── index.html
    │   ├── script.js
    │   ├── styles.css
    │   └── server/         # WebSocket backend
    ├── pdf-editor/         # PDF editing, signing, compression
    │   ├── index.html
    │   ├── css/
    │   └── js/
    ├── pdf-merge/          # PDF file merger
    │   ├── index.html
    │   └── js/
    ├── mindhub/            # Task & project management
    │   ├── index.html
    │   ├── css/
    │   └── js/
    ├── spinning-wheel-giveaway/
    │   └── index.html
    ├── resignation-bets/   # Casino-style betting game
    │   ├── index.html
    │   ├── app.js
    │   ├── db.js
    │   ├── lang.js
    │   ├── styles.css
    │   └── locales/
    ├── ai-prompting/       # AI prompt formatter
    │   └── index.html
    └── komopizza/          # Pizza ordering demo
        ├── index.html
        ├── script.js
        └── styles.css
```

---

## Installation and Running

### Option 1: GitHub Pages (recommended)
1. Fork this repository
2. Enable GitHub Pages in settings
3. Access at `https://yourusername.github.io/adhub`

### Option 2: Local Running
```bash
# Clone repository
git clone https://github.com/Deerpfy/adhub.git
cd adhub

# Open in browser - just open index.html
# Or use a local server:
npx serve .
# or
python -m http.server 8000
```

---

## Language Support

AdHUB supports 40+ languages with automatic translation via MyMemory API:

- Czech, English, German, French, Spanish, Italian, Portuguese, Polish, Slovak, Dutch
- Russian, Ukrainian, Japanese, Chinese, Korean, Arabic, Hindi, Turkish
- Swedish, Danish, Finnish, Norwegian, Greek, Hungarian, Romanian, Bulgarian
- Croatian, Slovenian, Serbian, Hebrew, Thai, Vietnamese, Indonesian, Malay
- Lithuanian, Latvian, Estonian, Catalan, Afrikaans, Swahili

The language is automatically detected from your browser settings, or you can manually switch using the language selector. Your preference is saved to localStorage.

---

## Technologies

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Extension:** Chrome Manifest V3
- **Build:** No build process - everything is vanilla JS
- **Icons:** SVG + Canvas generated icons
- **ZIP:** JSZip library for extension generation
- **i18n:** Built-in translation system with API support

---

## Adding a New Project

1. Create folder in `projects/project-name/`
2. Add `index.html` as entry point
3. Edit `script.js` and add to `getLocalizedConfig()`
4. Add translations to `BASE_TRANSLATIONS` object for both `cs` and `en`

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
