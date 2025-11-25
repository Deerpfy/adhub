# 🎥 AdHUB YouTube Downloader

Stahujte YouTube videa přímo z prohlížeče **bez potřeby serveru**! Ideální pro hostování na GitHub Pages.

**Aktuální verze: 1.1.1** | [Changelog](#-changelog)

## ✨ Funkce

- ✅ **Bez serveru** - Vše běží v prohlížeči
- ✅ **GitHub Pages ready** - Jednoduché hostování jako statická stránka
- ✅ **Více formátů** - MP4, M4A, WebM
- ✅ **Různé kvality** - Od 144p až po 4K (podle dostupnosti)
- ✅ **YouTube integrace** - Tlačítko přímo na YouTube stránce
- ✅ **Open source** - Zdarma a volně dostupné

## 🚀 Jak používat

### 1. Otevřete stránku

Jděte na: **[vaše-github-username.github.io/youtube-downloader]()**

### 2. Stáhněte rozšíření

Klikněte na tlačítko **"Stáhnout rozšíření (.zip)"** na stránce.

### 3. Nainstalujte rozšíření

1. **Rozbalte** stažený ZIP soubor
2. Otevřete **`chrome://extensions`** (nebo `edge://extensions`)
3. Zapněte **"Vývojářský režim"** (Developer mode)
4. Klikněte na **"Načíst rozbalené"** (Load unpacked)
5. Vyberte rozbalenou složku `adhub-youtube-extension`

### 4. Stahujte videa! 🎉

- **Na YouTube**: Pod každým videem se objeví tlačítko "Stáhnout"
- **Přes popup**: Klikněte na ikonu rozšíření v prohlížeči

## 📖 Podrobný návod

### Způsob 1: Přímo na YouTube (doporučeno)

1. Jděte na libovolné YouTube video
2. Pod videem se objeví tlačítko **"Stáhnout"** (fialové)
3. Klikněte na tlačítko
4. Vyberte formát a kvalitu
5. Video se stáhne do prohlížeče

### Způsob 2: Přes popup rozšíření

1. Klikněte na ikonu rozšíření v prohlížeči
2. Zadejte YouTube URL
3. Klikněte na "Načíst"
4. Vyberte formát

## 📁 Struktura projektu

```
youtube-downloader/
├── index.html          # Hlavní stránka (instalační průvodce)
├── script.js           # Logika + embedded extension files
├── styles.css          # Styly
├── README.md           # Tato dokumentace
└── extension/          # Zdrojové soubory rozšíření (reference)
    ├── manifest.json
    ├── background.js
    ├── content.js
    ├── popup.html
    ├── popup.js
    └── icons/
```

## 🔧 Technické detaily

### Jak to funguje?

1. **Stránka** generuje ZIP soubor s rozšířením přímo v prohlížeči (pomocí JSZip)
2. **Rozšíření** obchází CORS omezení a komunikuje s YouTube API
3. **Content script** přidává tlačítko stahování přímo na YouTube
4. **Stahování** probíhá přes Chrome Downloads API

### Podporované formáty

| Typ | Formát | Poznámka |
|-----|--------|----------|
| Video + Audio | MP4, WebM | Kombinované streamy |
| Pouze Video | MP4, WebM | Bez zvuku |
| Pouze Audio | M4A, WebM | Různé bitrates |

### Omezení

- Některá videa mohou být chráněná proti stahování
- Šifrované streamy nemusí být dostupné
- Kvalita závisí na dostupnosti na YouTube

## 🌐 Hosting na GitHub Pages

1. Forkněte tento repozitář
2. Jděte do Settings > Pages
3. Vyberte branch `main` a složku `/` (root)
4. Uložte - stránka bude dostupná na `username.github.io/repo-name`

## 🔒 Bezpečnost & Soukromí

- ✅ **Žádné sledování** - Nesbíráme žádná data
- ✅ **Lokální zpracování** - Vše běží ve vašem prohlížeči
- ✅ **Bez serveru** - Žádná data se neodesílají
- ✅ **Open source** - Můžete zkontrolovat kód

## 📝 Changelog

### v1.1.1 (2025-11-25)
- 🐛 **FIX**: Opraven HTTP 403 error při stahování videí
- ⚡ Optimalizovány HTTP hlavičky pro lepší kompatibilitu s YouTube servery
- 🔧 Odstraněny problematické CORS hlavičky

### v1.1.0 (2025-11-24)
- ✨ Plná funkcionalita stahování YouTube videí
- 🎨 Vylepšené UI s podporou více formátů
- 🚀 Auto-update funkcionalita

### v1.0.0 (2025-11-22)
- 🎉 První release
- ✅ Základní funkcionalita stahování

## 📜 Licence

MIT License - Volně k použití a modifikaci.

## ⚠️ Právní upozornění

Tento nástroj je určen pouze pro stahování videí, ke kterým máte právo. Respektujte autorská práva a podmínky použití YouTube.

---

Vytvořeno s ❤️ pro AdHUB
