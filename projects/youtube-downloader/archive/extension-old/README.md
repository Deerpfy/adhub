# 🧩 AdHUB YouTube Downloader - Browser Extension

Rozšíření prohlížeče pro stahování YouTube videí.

## 📦 Instalace

### Chrome / Chromium / Edge

1. Otevřete správu rozšíření:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`

2. Zapněte **Vývojářský režim** (Developer mode) - přepínač v pravém horním rohu

3. Klikněte na **Načíst rozbalené** (Load unpacked)

4. Vyberte tuto složku (`extension`)

5. Hotovo! 🎉

### Firefox (experimentální)

Firefox používá jiný formát manifestu. Pro Firefox je potřeba upravit `manifest.json`:

1. Změňte `"manifest_version": 3` na `"manifest_version": 2`
2. Přejmenujte `"action"` na `"browser_action"`
3. Nahraďte `"service_worker"` za `"scripts"` v background sekci

## 🎯 Použití

### Na YouTube

Po instalaci se na YouTube videích automaticky objeví tlačítko **"Stáhnout"** pod přehrávačem.

1. Přejděte na libovolné YouTube video
2. Klikněte na tlačítko "Stáhnout"
3. Vyberte formát a kvalitu
4. Soubor se stáhne do prohlížeče

### Přes Popup

1. Klikněte na ikonu rozšíření v toolbaru
2. Zadejte YouTube URL nebo video ID
3. Klikněte na "Načíst"
4. Vyberte formát ke stažení

### S webovou stránkou

Rozšíření automaticky komunikuje s webovou stránkou AdHUB YouTube Downloader.

## 📁 Struktura souborů

```
extension/
├── manifest.json      # Konfigurační soubor rozšíření
├── background.js      # Service worker - hlavní logika
├── content.js         # Script běžící na YouTube stránkách
├── popup.html         # Popup UI
├── popup.js           # Logika popupu
├── icons/             # Ikony rozšíření
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # Tato dokumentace
```

## 🔧 Oprávnění

Rozšíření vyžaduje následující oprávnění:

| Oprávnění | Důvod |
|-----------|-------|
| `activeTab` | Přístup k aktuální YouTube záložce |
| `storage` | Ukládání nastavení |
| `downloads` | Stahování souborů |
| `youtube.com` | Přístup k YouTube pro získání video dat |
| `googlevideo.com` | Přístup k video streamům |

## 🔒 Soukromí

- **Žádné sledování** - Nesbíráme žádná data
- **Lokální zpracování** - Vše běží ve vašem prohlížeči
- **Open source** - Můžete zkontrolovat kód

## 🐛 Řešení problémů

### Tlačítko se nezobrazuje na YouTube

- Obnovte stránku (F5)
- Zkontrolujte, zda je rozšíření aktivní v `chrome://extensions`
- Zkuste deaktivovat a znovu aktivovat rozšíření

### Stahování nefunguje

- Některá videa mohou být chráněná
- Zkontrolujte, zda není video geo-blokované
- Zkuste jiný formát

### Webová stránka nedetekuje rozšíření

- Ujistěte se, že je rozšíření nainstalované a aktivní
- Obnovte webovou stránku
- Zkontrolujte konzoli prohlížeče pro chyby

## 📜 Licence

MIT License

---

Součást projektu AdHUB
