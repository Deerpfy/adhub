# 🎥 AdHUB YouTube Downloader

Stahujte YouTube videa přímo z prohlížeče **bez potřeby serveru**! Ideální pro hostování na GitHub Pages.

## ✨ Funkce

- ✅ **Bez serveru** - Vše běží v prohlížeči
- ✅ **GitHub Pages ready** - Jednoduché hostování jako statická stránka
- ✅ **Více formátů** - MP4, M4A, WebM
- ✅ **Různé kvality** - Od 144p až po 4K (podle dostupnosti)
- ✅ **YouTube integrace** - Tlačítko přímo na YouTube stránce
- ✅ **Open source** - Zdarma a volně dostupné

## 🚀 Instalace

### 1. Nainstalujte rozšíření do prohlížeče

Rozšíření je nezbytné pro obejití CORS omezení a přímé stahování videí.

#### Chrome / Edge:

1. Stáhněte složku `extension` z tohoto repozitáře
2. Otevřete `chrome://extensions` (nebo `edge://extensions`)
3. Zapněte **Vývojářský režim** (Developer mode) v pravém horním rohu
4. Klikněte na **Načíst rozbalené** (Load unpacked)
5. Vyberte složku `extension`
6. Rozšíření je nainstalované! 🎉

### 2. Otevřete webovou stránku

Můžete použít:
- **GitHub Pages**: Nahrajte projekt na GitHub a povolte Pages
- **Lokálně**: Otevřete `index.html` v prohlížeči
- **Libovolný hosting**: Nahrajte soubory na jakýkoliv statický hosting

## 📖 Jak používat

### Způsob 1: Přes webovou stránku
1. Otevřete webovou stránku
2. Zadejte URL YouTube videa nebo video ID
3. Klikněte na "Získat informace"
4. Vyberte formát a kvalitu
5. Klikněte na "Stáhnout"

### Způsob 2: Přímo na YouTube
1. Jděte na libovolné YouTube video
2. Pod videem se objeví tlačítko "Stáhnout" (po instalaci rozšíření)
3. Klikněte na tlačítko a vyberte formát
4. Video se stáhne do vašeho prohlížeče

## 📁 Struktura projektu

```
youtube-downloader/
├── index.html          # Hlavní webová stránka
├── script.js           # Logika aplikace
├── styles.css          # Styly
├── README.md           # Tato dokumentace
├── extension/          # Browser rozšíření
│   ├── manifest.json   # Manifest rozšíření
│   ├── background.js   # Service worker
│   ├── content.js      # Content script pro YouTube
│   ├── popup.html      # Popup rozšíření
│   ├── popup.js        # Logika popupu
│   └── icons/          # Ikony rozšíření
└── server/             # (Starší verze - není potřeba)
```

## 🔧 Technické detaily

### Jak to funguje?

1. **Browser rozšíření** obchází CORS omezení a může přímo komunikovat s YouTube
2. **Webová stránka** komunikuje s rozšířením přes `chrome.runtime.sendMessage`
3. **Content script** přidává tlačítko stahování přímo na YouTube stránky
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

## 🔒 Bezpečnost

- Rozšíření nepřenáší žádná data na externí servery
- Veškeré zpracování probíhá lokálně v prohlížeči
- Zdrojový kód je open source a můžete ho zkontrolovat

## 📜 Licence

MIT License - Volně k použití a modifikaci.

## 🤝 Přispívání

Pull requesty jsou vítány! Pro větší změny prosím nejprve otevřete issue.

## ⚠️ Právní upozornění

Tento nástroj je určen pouze pro stahování videí, ke kterým máte právo. Respektujte autorská práva a podmínky použití YouTube.

---

Vytvořeno s ❤️ pro AdHUB
