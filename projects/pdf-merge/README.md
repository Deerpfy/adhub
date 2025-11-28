# PDF Merger

![Status](https://img.shields.io/badge/status-complete-success) ![License](https://img.shields.io/badge/license-MIT-blue)

A simple web tool to merge multiple PDF files into one. Works offline!

## Quick Start (Online)

Just open `index.html` in your browser. It uses CDN links and works immediately with internet.

## Setup for Offline Use

1. **Double-click `download-libs.bat`** - Downloads the JavaScript libraries (~1.5MB total)
2. **Double-click `make-offline.bat`** - Creates `index-offline.html` with local paths
3. **Open `index-offline.html`** - Works 100% offline!

## Features

- Drag & drop PDF upload
- Reorder files by dragging
- PDF preview with page navigation
- Shows file order (1st, 2nd, 3rd...)
- Thumbnail previews
- One-click merge & download
- 100% client-side (no server needed)

## Project Structure

```
pdf-merger/
├── index.html           # Main app (uses CDN)
├── index-offline.html   # Offline version (created by make-offline.bat)
├── download-libs.bat    # Downloads JS libraries
├── make-offline.bat     # Creates offline version
├── README.md
└── js/                  # Libraries (after running download-libs.bat)
    ├── pdf-lib.min.js
    ├── pdf.min.js
    └── pdf.worker.min.js
```

## For Your Website

Upload these files to your web server:
- `index-offline.html` (rename to `index.html`)
- `js/` folder with all 3 files

No backend required - everything runs in the browser!

## Libraries Used

- [pdf-lib](https://pdf-lib.js.org/) v1.17.1 - PDF merging
- [PDF.js](https://mozilla.github.io/pdf.js/) v3.11.174 - PDF viewing

## Privacy

- 100% client-side processing
- No files uploaded to any server
- All data stays in your browser

---

**Součást projektu [AdHUB](../../index.html)** | [Zpět na hub](../../index.html)
