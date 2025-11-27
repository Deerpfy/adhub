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
- No external server required

### Multistream Chat Panel
Unified chat for streamers - displays chat from Twitch, Kick and YouTube in one place.

**Features:**
- Multi-platform support
- Overlay mode for OBS
- Customizable appearance

### Spinning Wheel Giveaway
Interactive spinning wheel for drawing winners on streams and giveaway events.

**Features:**
- Customizable wheel segments
- Sound effects
- Winner history
- OBS overlay support

### Resignation Bets
Fun casino-style app for betting on who will resign from work first.

**Features:**
- Roulette-style gameplay
- Offline storage
- Multiplayer support

### AI Prompting
Professional prompt formatter for AI assistants.

**Features:**
- 7 prompting methods (CoT, Few-Shot, ToT, etc.)
- 5 output languages
- Local storage for saved prompts
- Share prompts via URL

### KomoPizza Demo
Sample ordering application demonstrating modern UI/UX principles.

---

## Project Structure

```
adhub/
├── index.html              # Main page
├── script.js               # Logic, configuration and translations
├── styles.css              # Styles
├── README.md               # This file
└── projects/
    ├── youtube-downloader/
    │   ├── index.html
    │   ├── script.js
    │   ├── styles.css
    │   └── extension/
    ├── chat-panel/
    │   ├── index.html
    │   ├── script.js
    │   └── styles.css
    ├── spinning-wheel-giveaway/
    │   ├── index.html
    │   ├── script.js
    │   └── styles.css
    ├── resignation-bets/
    │   ├── index.html
    │   ├── script.js
    │   └── styles.css
    ├── ai-prompting/
    │   ├── index.html
    │   ├── script.js
    │   └── styles.css
    └── komopizza/
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
