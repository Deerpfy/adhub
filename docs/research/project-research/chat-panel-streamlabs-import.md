---
title: "Chat Panel - Streamlabs CSS/HTML Import System"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Chat Panel - Streamlabs CSS/HTML Import System

> **Projekt:** AdHub Multistream Chat v2
> **Účel:** Návrh importu Streamlabs custom stylizace do AdHub chatu
> **Datum:** 2026-02-06
> **Souvisí s:** `chat-panel-obs-api.md`, `chat-panel-analyza.md`

---

## 1. Cíl

Umožnit uživatelům:
1. Převzít **custom CSS** ze Streamlabs Twitch chat nastavení
2. Vložit ho do AdHub Chat Panelu (hlavní i OBS view)
3. Mít tak **vlastní nezávislý chat** s vizuální podobou identickou Streamlabs widgetu
4. Být **nezávislý na Streamlabs** - žádné volání jejich API, žádná závislost na jejich infrastruktuře

---

## 2. Streamlabs Chat Widget - anatomie

### 2.1 HTML struktura Streamlabs widgetu

Streamlabs chat widget používá tuto DOM strukturu:

```html
<div id="log" class="sl__chat__layout">
  <div id="{messageId}" class="wrap animate" data-from="{from}" data-id="{messageId}">
    <div class="meta" style="color: {color}">
      <span class="badges">
        <img class="badge" src="..." alt="badge">
      </span>
      <span class="name">{from}</span>
      <span class="colon">: </span>
    </div>
    <span class="message">{message}</span>
  </div>
</div>
```

### 2.2 CSS selektory Streamlabs

| Selektor | Co stylizuje |
|----------|-------------|
| `#log` | Hlavní kontejner chatu |
| `.sl__chat__layout` | Layout třída kontejneru |
| `#log > div` / `.wrap` | Jednotlivá zpráva |
| `.wrap.animate` | Zpráva s animací |
| `#log > div.deleted` | Smazaná zpráva |
| `.meta` | Wrapper pro username + badges |
| `.badges` | Kontejner badges |
| `.badge` | Jednotlivý badge obrázek |
| `.name` | Username text |
| `.colon` | Dvojtečka oddělovač |
| `.message` | Text zprávy |
| `.emote` | Inline emote obrázek |

### 2.3 Template proměnné Streamlabs

Streamlabs CSS podporuje tyto proměnné (nahrazeny při renderování):

| Proměnná | Popis | Použití v CSS |
|----------|-------|---------------|
| `{background_color}` | Barva pozadí | `background-color: {background_color}` |
| `{text_color}` | Barva textu | `color: {text_color}` |
| `{font_size}` | Velikost písma | `font-size: {font_size}px` |
| `{message_hide_delay}` | Doba skrytí zprávy | `animation-delay: {message_hide_delay}s` |

**Důležité:** Proměnná `{color}` (Twitch user color) funguje pouze inline v HTML (`style="color: {color}"`), ne v CSS souboru.

---

## 3. Kompatibilita AdHub OBS view se Streamlabs

### 3.1 Srovnání HTML struktur

| Streamlabs | AdHub OBS view | Kompatibilní? |
|------------|---------------|----------------|
| `#log.sl__chat__layout` | `#log.sl__chat__layout` | ✅ Identické |
| `.wrap.animate` | `.wrap.animate` | ✅ Identické |
| `data-from="{from}"` | `data-from="{username}"` | ✅ Identické |
| `.meta[style="color:"]` | `.meta[style="color:"]` | ✅ Identické |
| `.badges > .badge` | `.badges > .badge` | ✅ Identické |
| `.name` | `.name` | ✅ Identické |
| `.colon` | `.colon` | ✅ Identické |
| `.message` | `.message` | ✅ Identické |
| `.emote` | `.emote` | ✅ Identické |

**OBS view (`obs/index.html`) je záměrně navržen aby byl 100% kompatibilní se Streamlabs HTML strukturou.** Custom CSS ze Streamlabs by měl fungovat beze změn.

### 3.2 Co nemusí fungovat

1. **Template proměnné** (`{font_size}`, `{background_color}`) - Streamlabs je nahrazuje na serveru. AdHub je musí nahradit na klientovi.
2. **JavaScript hooks** (`onLoad`, `onEventReceived`) - Streamlabs specifické eventy
3. **Custom Fields** - JSON konfigurace pro Streamlabs UI controls

---

## 4. Import systém - návrh implementace

### 4.1 UI v hlavním Chat Panelu

```html
<!-- Nová sekce v Settings modalu -->
<div class="settings-section" id="styleImportSection">
    <h3>Chat Style / Streamlabs Import</h3>

    <!-- Výběr stylu -->
    <div class="style-selector">
        <label>
            <input type="radio" name="chatStyle" value="default" checked>
            <span>Default AdHub Style</span>
        </label>
        <label>
            <input type="radio" name="chatStyle" value="streamlabs">
            <span>Streamlabs Compatible</span>
        </label>
        <label>
            <input type="radio" name="chatStyle" value="custom">
            <span>Custom CSS</span>
        </label>
    </div>

    <!-- Streamlabs import -->
    <div id="streamlabsImport" class="import-panel" style="display:none">
        <p>Paste your Streamlabs Custom CSS here. It will be applied to the OBS view.</p>
        <textarea id="streamlabsCSS" rows="12" placeholder="/* Paste Streamlabs Custom CSS here */
@import url(https://fonts.googleapis.com/css?family=Roboto:700);

#log > div {
    background: rgba(0,0,0,0.5);
    border-radius: 5px;
    padding: 5px 10px;
}

.name {
    font-weight: 700;
    text-transform: uppercase;
}

.message {
    font-family: 'Roboto', sans-serif;
}"></textarea>

        <!-- Template proměnné -->
        <div class="template-vars">
            <h4>Template Variables</h4>
            <div class="var-inputs">
                <label>
                    <span>{background_color}</span>
                    <input type="color" id="varBgColor" value="#000000">
                </label>
                <label>
                    <span>{text_color}</span>
                    <input type="color" id="varTextColor" value="#ffffff">
                </label>
                <label>
                    <span>{font_size}</span>
                    <input type="number" id="varFontSize" value="14" min="10" max="32">
                </label>
                <label>
                    <span>{message_hide_delay}</span>
                    <input type="number" id="varHideDelay" value="0" min="0" max="300">
                    <span>seconds (0 = never)</span>
                </label>
            </div>
        </div>

        <button id="applyStreamlabsCSS">Apply & Preview</button>
    </div>

    <!-- Custom CSS editor -->
    <div id="customCSSEditor" class="import-panel" style="display:none">
        <p>Write your own CSS. The HTML structure follows the Streamlabs format.</p>
        <textarea id="customCSS" rows="12" placeholder="/* Custom CSS for AdHub chat */"></textarea>
        <button id="applyCustomCSS">Apply & Preview</button>
    </div>

    <!-- HTML Reference -->
    <details class="html-reference">
        <summary>HTML Reference (click to expand)</summary>
        <pre><code>&lt;div id="log" class="sl__chat__layout"&gt;
  &lt;div class="wrap animate" data-from="username"&gt;
    &lt;div class="meta" style="color: #ff0000"&gt;
      &lt;span class="badges"&gt;
        &lt;img class="badge" src="..."&gt;
      &lt;/span&gt;
      &lt;span class="name"&gt;Username&lt;/span&gt;
      &lt;span class="colon"&gt;: &lt;/span&gt;
    &lt;/div&gt;
    &lt;span class="message"&gt;Chat message&lt;/span&gt;
  &lt;/div&gt;
&lt;/div&gt;</code></pre>
    </details>
</div>
```

### 4.2 JavaScript - Style Manager

```javascript
/**
 * StreamlabsStyleManager
 * Správa a aplikace Streamlabs-kompatibilních CSS stylů
 */
class StreamlabsStyleManager {
    constructor() {
        this.currentStyle = 'default';    // 'default' | 'streamlabs' | 'custom'
        this.customCSS = '';
        this.templateVars = {
            background_color: 'transparent',
            text_color: '#ffffff',
            font_size: '14',
            message_hide_delay: '0',
        };
    }

    /**
     * Načtení uloženého stylu z localStorage
     */
    load() {
        try {
            const saved = localStorage.getItem('adhub_obs_style');
            if (saved) {
                const data = JSON.parse(saved);
                this.currentStyle = data.style || 'default';
                this.customCSS = data.css || '';
                this.templateVars = { ...this.templateVars, ...data.vars };
            }
        } catch (e) {
            console.warn('[StyleManager] Failed to load saved style:', e);
        }
    }

    /**
     * Uložení stylu do localStorage
     */
    save() {
        try {
            localStorage.setItem('adhub_obs_style', JSON.stringify({
                style: this.currentStyle,
                css: this.customCSS,
                vars: this.templateVars,
            }));

            // Uložit i do adhub_obs_config pro OBS view
            const obsConfig = this._getOBSConfig();
            obsConfig.customCSS = this.getProcessedCSS();
            localStorage.setItem('adhub_obs_config', JSON.stringify(obsConfig));
        } catch (e) {
            console.error('[StyleManager] Failed to save style:', e);
        }
    }

    /**
     * Nastavení custom CSS (ze Streamlabs nebo vlastní)
     */
    setCSS(css) {
        this.customCSS = css;
        this.save();
    }

    /**
     * Nastavení template proměnné
     */
    setVariable(name, value) {
        this.templateVars[name] = value;
        this.save();
    }

    /**
     * Zpracování CSS - nahrazení template proměnných
     */
    getProcessedCSS() {
        if (!this.customCSS) return '';

        let processed = this.customCSS;

        // Nahradit Streamlabs template proměnné
        for (const [key, value] of Object.entries(this.templateVars)) {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            processed = processed.replace(regex, value);
        }

        return processed;
    }

    /**
     * Aplikace CSS na element
     */
    applyTo(styleElement) {
        if (this.currentStyle === 'default') {
            styleElement.textContent = '';
            return;
        }

        styleElement.textContent = this.getProcessedCSS();
    }

    /**
     * Generování preview
     */
    generatePreview() {
        const previewHTML = `
            <div id="log" class="sl__chat__layout">
                <div class="wrap animate visible" data-from="TestUser1">
                    <div class="meta" style="color: #9146FF">
                        <span class="badges">
                            <img class="badge" src="https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/2" alt="Broadcaster">
                        </span>
                        <span class="name">Streamer</span>
                        <span class="colon">: </span>
                    </div>
                    <span class="message">Welcome to the stream!</span>
                </div>
                <div class="wrap animate visible" data-from="TestUser2">
                    <div class="meta" style="color: #00FF00">
                        <span class="badges">
                            <img class="badge" src="https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/2" alt="Moderator">
                        </span>
                        <span class="name">ModUser</span>
                        <span class="colon">: </span>
                    </div>
                    <span class="message">Hey everyone! Have fun!</span>
                </div>
                <div class="wrap animate visible" data-from="TestUser3">
                    <div class="meta" style="color: #FF69B4">
                        <span class="name">Viewer42</span>
                        <span class="colon">: </span>
                    </div>
                    <span class="message">This is a test message with an emote 😀</span>
                </div>
            </div>
        `;
        return previewHTML;
    }

    _getOBSConfig() {
        try {
            const stored = localStorage.getItem('adhub_obs_config');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            return {};
        }
    }
}
```

### 4.3 Populární Streamlabs CSS šablony

Pro snadné použití nabídnout předpřipravené šablony:

```javascript
const STYLE_PRESETS = {
    'clean-dark': {
        name: 'Clean Dark',
        description: 'Tmavé pozadí s čistým fontem',
        css: `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

body {
    font-family: 'Inter', sans-serif;
}

#log > div {
    background: linear-gradient(135deg, rgba(30,30,30,0.8), rgba(20,20,20,0.6));
    border-radius: 6px;
    padding: 6px 10px;
    margin-bottom: 4px;
    border-left: 2px solid rgba(255,255,255,0.1);
}

.name {
    font-weight: 700;
}

.message {
    font-weight: 400;
    opacity: 0.95;
}

.colon { display: none; }
.name::after { content: ' '; }
`
    },

    'neon-glow': {
        name: 'Neon Glow',
        description: 'Neonový styl s glow efektem',
        css: `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');

body {
    font-family: 'Orbitron', monospace;
    font-size: 13px;
}

#log > div {
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(0, 255, 255, 0.3);
    border-radius: 0;
    padding: 4px 8px;
    margin-bottom: 2px;
    text-shadow: 0 0 5px currentColor;
}

.name {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.message {
    text-shadow: 0 0 3px rgba(255,255,255,0.3);
}
`
    },

    'bubble': {
        name: 'Chat Bubbles',
        description: 'Styl chatovacích bublin',
        css: `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap');

body {
    font-family: 'Nunito', sans-serif;
}

#log {
    padding: 10px;
}

#log > div {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 18px;
    padding: 8px 14px;
    margin-bottom: 6px;
    max-width: 85%;
    backdrop-filter: blur(5px);
}

.meta {
    display: block;
    margin-bottom: 2px;
}

.name {
    font-weight: 700;
    font-size: 0.85em;
}

.colon { display: none; }

.message {
    display: block;
    line-height: 1.3;
}
`
    },

    'minimal': {
        name: 'Minimal',
        description: 'Pouze text, žádné pozadí',
        css: `
@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap');

body {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 15px;
}

.badges { display: none; }

#log > div {
    padding: 2px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

.name {
    font-weight: 600;
}

.message {
    opacity: 0.9;
}

.emote {
    height: 22px;
}
`
    },

    'twitch-native': {
        name: 'Twitch Native',
        description: 'Vypadá jako nativní Twitch chat',
        css: `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

body {
    font-family: 'Inter', 'Roobert', 'Helvetica Neue', sans-serif;
    font-size: 13px;
}

#log {
    padding: 0 10px;
}

#log > div {
    padding: 5px 0;
    line-height: 20px;
}

.badge {
    width: 18px;
    height: 18px;
    margin-right: 3px;
    vertical-align: middle;
    border-radius: 3px;
}

.name {
    font-weight: 700;
    font-size: 13px;
}

.colon {
    margin: 0 3px 0 0;
}

.message {
    color: #efeff1;
    font-size: 13px;
}

.emote {
    height: 28px;
    margin: -5px 0;
}
`
    }
};
```

---

## 5. Proces importu ze Streamlabs

### 5.1 Krok za krokem pro uživatele

```
1. Otevřít Streamlabs Dashboard
   → streamlabs.com/dashboard
   → Widget Settings → Chat Box

2. Najít "Custom CSS" sekci
   → Zkopírovat celý CSS kód

3. V AdHub Chat Panel:
   → Settings → Chat Style
   → Vybrat "Streamlabs Compatible"
   → Vložit CSS do textového pole

4. (Volitelné) Nastavit template proměnné:
   → Background Color: transparent (pro OBS)
   → Text Color: #ffffff
   → Font Size: 14
   → Message Hide Delay: 0 (nebo hodnota ze Streamlabs)

5. Kliknout "Apply & Preview"
   → Ověřit v preview panelu

6. Pro OBS:
   → Kliknout "Generate OBS URL"
   → Zkopírovat URL
   → Vložit do OBS Browser Source
```

### 5.2 Automatická detekce a konverze

```javascript
/**
 * Detekce a konverze Streamlabs CSS
 * Řeší běžné problémy s kompatibilitou
 */
function processStreamlabsCSS(rawCSS) {
    let css = rawCSS;
    const warnings = [];

    // 1. Detekce template proměnných - informovat uživatele
    const templateVarRegex = /\{(background_color|text_color|font_size|message_hide_delay|name_font|name_font_size|message_font|message_weight)\}/g;
    const foundVars = new Set();
    let match;
    while ((match = templateVarRegex.exec(rawCSS)) !== null) {
        foundVars.add(match[1]);
    }

    if (foundVars.size > 0) {
        warnings.push({
            type: 'template_vars',
            message: `Found Streamlabs template variables: ${[...foundVars].join(', ')}. Set their values in the Template Variables section.`,
            vars: [...foundVars]
        });
    }

    // 2. Detekce @import (Google Fonts atd.) - ponechat
    const imports = css.match(/@import[^;]+;/g) || [];
    if (imports.length > 0) {
        // Zajistit že @import je na začátku
        const nonImportCSS = css.replace(/@import[^;]+;/g, '').trim();
        css = imports.join('\n') + '\n\n' + nonImportCSS;
    }

    // 3. Detekce `{color}` v CSS (nefunkční - funguje jen v HTML inline)
    if (css.includes('{color}')) {
        warnings.push({
            type: 'inline_color',
            message: 'The {color} variable only works in inline HTML styles. Username colors are applied automatically via inline styles.'
        });
        // Odstranit z CSS (způsobilo by chybu)
        css = css.replace(/\{color\}/g, 'inherit');
    }

    // 4. Detekce animation s {message_hide_delay}
    if (css.includes('{message_hide_delay}')) {
        // Tuto proměnnou ponecháme - bude nahrazena StyleManagerem
    }

    // 5. Přidat transparentní pozadí pokud chybí (pro OBS)
    if (!css.includes('body') || !css.includes('background')) {
        css += '\n\nbody { background: transparent !important; }\n';
    }

    return {
        css: css,
        warnings: warnings,
        hasTemplateVars: foundVars.size > 0,
    };
}
```

---

## 6. Preview systém

### 6.1 Live preview v hlavním panelu

```javascript
/**
 * Živý preview stylů v panelu
 */
function createStylePreview(container, styleManager) {
    // Vytvořit izolovaný iframe pro preview
    const iframe = document.createElement('iframe');
    iframe.style.width = '400px';
    iframe.style.height = '300px';
    iframe.style.border = '1px solid var(--border-color)';
    iframe.style.borderRadius = '8px';
    iframe.style.background = '#0e0e10';

    container.appendChild(iframe);

    const iframeDoc = iframe.contentDocument;

    // Základní OBS CSS
    const baseCSS = `<link rel="stylesheet" href="obs/obs-styles.css">`;

    // Custom CSS
    const customCSS = `<style>${styleManager.getProcessedCSS()}</style>`;

    // Preview HTML
    const previewHTML = styleManager.generatePreview();

    iframeDoc.open();
    iframeDoc.write(`
        <!DOCTYPE html>
        <html data-theme="transparent">
        <head>
            ${baseCSS}
            ${customCSS}
        </head>
        <body style="background: #0e0e10;">
            ${previewHTML}
        </body>
        </html>
    `);
    iframeDoc.close();

    return iframe;
}
```

### 6.2 Real-time aktualizace preview

```javascript
// Při každé změně CSS
document.getElementById('streamlabsCSS').addEventListener('input', debounce((e) => {
    styleManager.setCSS(e.target.value);
    updatePreview();
}, 300));

// Při změně template proměnné
document.querySelectorAll('.var-inputs input').forEach(input => {
    input.addEventListener('change', (e) => {
        const varName = e.target.closest('label').querySelector('span').textContent.replace(/[{}]/g, '');
        styleManager.setVariable(varName, e.target.value);
        updatePreview();
    });
});
```

---

## 7. Rozšířené Streamlabs funkce

### 7.1 Font loading

Streamlabs CSS často obsahuje `@import url()` pro Google Fonts. Toto funguje v OBS Browser Source bez problémů, ale:

- Fonty se musí stáhnout při každém načtení
- Bez internetu nebudou k dispozici
- Některé fonty mohou být pomalé

**Řešení:** Detekovat `@import` a zobrazit loading indikátor dokud se fonty nenačtou.

```javascript
// Detekce Google Fonts v CSS
function detectFonts(css) {
    const fontImports = css.match(/@import url\([^)]+fonts\.googleapis[^)]+\)/g) || [];
    return fontImports.map(imp => {
        const urlMatch = imp.match(/url\(["']?([^"')]+)["']?\)/);
        return urlMatch ? urlMatch[1] : null;
    }).filter(Boolean);
}

// Preload fontů
async function preloadFonts(fontUrls) {
    for (const url of fontUrls) {
        try {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = url;
            document.head.appendChild(link);
        } catch (e) {
            console.warn('[Fonts] Failed to preload:', url);
        }
    }
}
```

### 7.2 Animace zpráv

Streamlabs podporuje animace vstupu/výstupu zpráv. Nejběžnější:

```css
/* Fade In */
@keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
}

/* Slide In Right */
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Bounce In */
@keyframes bounceIn {
    0%   { opacity: 0; transform: scale(0.3); }
    50%  { opacity: 1; transform: scale(1.05); }
    70%  { transform: scale(0.9); }
    100% { transform: scale(1); }
}

/* Fade Out (po message_hide_delay) */
@keyframes fadeOut {
    from { opacity: 1; }
    to   { opacity: 0; height: 0; padding: 0; margin: 0; overflow: hidden; }
}

/* Příklad kompletní animace */
#log > div {
    animation:
        slideInRight 0.4s ease forwards,
        fadeOut 0.5s ease {message_hide_delay}s forwards;
}
```

### 7.3 Message hide system

Pro OBS je důležité, aby staré zprávy zmizely. Implementace:

```javascript
/**
 * Automatické skrývání zpráv po uplynutí času
 */
function setupMessageHiding(hideDelay) {
    if (hideDelay <= 0) return;

    // Při každé nové zprávě nastavit timeout
    const originalAppend = Element.prototype.appendChild;

    // MutationObserver pro detekci nových zpráv
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.classList?.contains('wrap')) {
                    setTimeout(() => {
                        node.classList.add('hide');
                        // Odstranit z DOM po animaci
                        setTimeout(() => node.remove(), 500);
                    }, hideDelay * 1000);
                }
            }
        }
    });

    observer.observe(document.getElementById('log'), {
        childList: true
    });
}
```

---

## 8. CSS kompatibilita - mapování tříd

### 8.1 Hlavní Chat Panel vs OBS view

| Hlavní panel třída | OBS/Streamlabs třída | Mapování |
|--------------------|--------------------|----------|
| `.chat-message` | `.wrap` | Nový alias |
| `.message-streamer-label` | *(žádný ekvivalent)* | Skryto v OBS |
| `.message-body` | *(celý `.wrap`)* | Přímé |
| `.message-timestamp` | `.timestamp` | Nový |
| `.message-content` | `.meta` + `.message` | Rozdělen |
| `.user-badges` | `.badges` | Přejmenován |
| `.user-badge` | `.badge` | Přejmenován |
| `.message-author` | `.name` | Přejmenován |
| `.message-text` | `.message` | Přejmenován |
| `.message-emote` | `.emote` | Přejmenován |

**Hlavní panel zachovává své třídy** (zpětná kompatibilita).
**OBS view používá Streamlabs třídy** (kompatibilita s custom CSS).

### 8.2 Dual-class systém pro hlavní panel

Pokud chceme Streamlabs CSS aplikovat i v hlavním panelu:

```javascript
/**
 * Přidat Streamlabs-kompatibilní třídy k existujícím elementům
 */
function addStreamlabsClasses(messageEl) {
    // Hlavní kontejner
    messageEl.classList.add('wrap', 'animate');

    // Mapování vnitřních elementů
    const badges = messageEl.querySelector('.user-badges');
    if (badges) badges.classList.add('badges');

    const badgeImgs = messageEl.querySelectorAll('.user-badge');
    badgeImgs.forEach(img => img.classList.add('badge'));

    const author = messageEl.querySelector('.message-author');
    if (author) author.classList.add('name');

    const text = messageEl.querySelector('.message-text');
    if (text) text.classList.add('message');

    const emotes = messageEl.querySelectorAll('.message-emote');
    emotes.forEach(em => em.classList.add('emote'));
}
```

---

## 9. Export/Share stylů

### 9.1 Sdílení stylu jako URL

```javascript
function shareStyle(styleManager) {
    const styleData = {
        css: styleManager.customCSS,
        vars: styleManager.templateVars,
    };

    // Komprimovat a zakódovat
    const encoded = btoa(JSON.stringify(styleData));
    const shareUrl = `${window.location.origin}/adhub/projects/chat-panel/obs/?importStyle=${encoded}`;

    return shareUrl;
}
```

### 9.2 Import stylu z URL

```javascript
function importStyleFromURL() {
    const params = new URLSearchParams(window.location.search);
    const importData = params.get('importStyle');

    if (importData) {
        try {
            const decoded = JSON.parse(atob(importData));
            styleManager.setCSS(decoded.css || '');
            for (const [key, value] of Object.entries(decoded.vars || {})) {
                styleManager.setVariable(key, value);
            }
            styleManager.save();
            return true;
        } catch (e) {
            console.error('[StyleImport] Invalid style data');
        }
    }
    return false;
}
```

---

## 10. Shrnutí implementace

### Soubory k vytvoření/upravit

| Soubor | Akce | Účel |
|--------|------|------|
| `obs/index.html` | Vytvořit | OBS stránka (Streamlabs-kompatibilní HTML) |
| `obs/obs-script.js` | Vytvořit | OBS logika + style aplikace |
| `obs/obs-styles.css` | Vytvořit | Základní OBS styly |
| `script.js` | Upravit | Přidat StyleManager, UI pro import |
| `index.html` | Upravit | Přidat style import sekci do settings |
| `styles.css` | Upravit | Styly pro import UI |

### Závislosti

- **Žádné externí knihovny** - vše vanilla JS/CSS
- **Žádný server** - vše client-side
- **Žádné Streamlabs API** - pouze CSS import
- **Google Fonts** - volitelné, závisí na uživatelově CSS

### Klíčové principy

1. **Nezávislost** - Žádná závislost na Streamlabs infrastruktuře
2. **Kompatibilita** - HTML struktura identická se Streamlabs widgetem
3. **Jednoduchost** - Copy-paste CSS ze Streamlabs → funguje
4. **Rozšiřitelnost** - Preset šablony + custom CSS + template proměnné
5. **Preview** - Živý náhled před aplikací
