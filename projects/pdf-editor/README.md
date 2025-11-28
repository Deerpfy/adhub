# PDF Editor

Full-featured PDF editor running 100% client-side in your browser. Edit, sign, compress and reorganize PDF files without uploading them to any server.

## Features

### Editor Tab
- **Text Tool** - Add new text anywhere on the page
- **Edit PDF Text** - Modify existing text in the PDF
- **Highlight Tool** - Highlight important passages
- **Shapes** - Rectangle, circle, line drawing
- **Freehand Drawing** - Draw with mouse/touch
- **Undo/Redo** - Full history support
- **Layer Controls** - Bring to front/send to back
- **Zoom** - Zoom in/out for precision editing
- **Page Navigation** - Navigate through multi-page PDFs

### Text Formatting
- Multiple fonts (Helvetica, Times New Roman, Arial, etc.)
- Font size control
- Bold, italic, underline
- Color picker

### Signatures Tab
- **Draw Signature** - Sign with mouse or touch
- **Type Signature** - Select from multiple signature fonts
- **Upload Signature** - Use an image file
- **Signature Storage** - Save signatures locally for reuse
- Place signature anywhere on the document

### Compression Tab
- Reduce PDF file size
- Multiple compression quality levels
- Before/after size comparison

### Pages Tab
- **Thumbnail View** - See all pages at a glance
- **Reorder Pages** - Drag & drop to rearrange
- **Rotate Pages** - Rotate individual pages
- **Delete Pages** - Remove unwanted pages
- **Multi-select** - Select multiple pages for batch operations

## Quick Start

Simply open `index.html` in your browser. No installation needed!

```bash
# Or serve locally
npx serve .
# Then open http://localhost:3000
```

## How to Use

1. **Load PDF** - Drag & drop or click to upload
2. **Edit** - Use the toolbar to add text, shapes, or annotations
3. **Sign** - Go to Signatures tab to add your signature
4. **Compress** - Optional: reduce file size in Compression tab
5. **Reorganize** - Reorder, rotate or delete pages in Pages tab
6. **Download** - Click "Download PDF" to save your changes

## Project Structure

```
pdf-editor/
├── index.html      # Main HTML with UI
├── css/
│   └── style.css   # All styles
└── js/
    ├── app.js          # Main application logic
    ├── pdf-viewer.js   # PDF rendering
    ├── pdf-editor.js   # Canvas editing tools
    ├── pdf-signer.js   # Signature functionality
    ├── pdf-compress.js # Compression features
    ├── pdf-pages.js    # Page management
    └── storage.js      # Local storage handling
```

## Technologies

- **pdf-lib** - PDF manipulation
- **PDF.js** - PDF rendering
- **Fabric.js** - Canvas editing
- **SignaturePad** - Signature drawing
- **Fontkit** - Font embedding support

## Languages

- Czech (default)
- English

Switch using the CZ/EN buttons in the header.

## Privacy & Security

- **100% Client-Side** - Your files never leave your browser
- **No Server Upload** - All processing happens locally
- **No Tracking** - No analytics or data collection
- **Open Source** - Inspect the code yourself

## Browser Support

Works in all modern browsers:
- Chrome / Chromium
- Firefox
- Edge
- Safari

## License

MIT License - Part of the AdHUB project.

---

[Back to AdHUB](../../index.html)
