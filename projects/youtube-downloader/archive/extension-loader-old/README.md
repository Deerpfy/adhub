# AdHUB YouTube Downloader - Auto-Update Extension

## ✨ Vlastnosti

- 🔄 **Automatické aktualizace z GitHubu** - Stačí jednou nainstalovat
- ⚡ **Vždy aktuální kód** - Žádné ruční stahování nových verzí
- 🎯 **Jednoduchá instalace** - Nainstaluj jednou, používej pořád
- 💾 **Inteligentní cache** - Funguje i offline s naposledy staženou verzí

## 📦 Instalace (Jednou provždy!)

### 1. Stáhněte tuto složku

Stáhněte celou složku `extension-loader` nebo ji naklonujte z GitHubu:

```bash
git clone https://github.com/Deerpfy/adhub.git
cd adhub/projects/youtube-downloader/extension-loader
```

### 2. Nainstalujte jako Developer Extension

1. Otevřete Chrome/Edge/Brave
2. Jděte na: `chrome://extensions/` (nebo `edge://extensions/`, `brave://extensions/`)
3. Zapněte **"Vývojářský režim"** (Developer mode) v pravém horním rohu
4. Klikněte na **"Načíst rozbalené"** (Load unpacked)
5. Vyberte složku `extension-loader`

### 3. Hotovo! ✅

Rozšíření je nainstalováno a **automaticky se aktualizuje** z GitHubu!

## 🔄 Jak fungují aktualizace?

1. **Při startu browseru** - Zkontroluje aktualizace z GitHubu
2. **Každou hodinu** - Automatická kontrola nové verze
3. **Ručně** - Klikněte na tlačítko "Zkontrolovat aktualizace" v popupu
4. **Po změnách** - Stačí kliknout na "🔄 Reload" v `chrome://extensions/`

## 📖 Jak používat?

1. Jděte na YouTube video
2. Klikněte na tlačítko **"Stáhnout"** pod videem
3. Vyberte kvalitu a formát
4. Stahujte! 🎉

## 🛠️ Pro vývojáře

### Struktura projektu

```
extension-loader/
├── manifest.json          # Konfigurace rozšíření
├── background.js          # Auto-update logika + service worker
├── injector.js           # Injector pro content.js
├── injector-bridge.js    # Injector pro page-bridge.js
├── popup.html            # Popup UI
├── popup-loader.js       # Popup logika
└── icons/                # Ikony rozšíření
```

### Jak to funguje?

1. **background.js** načte aktuální kód z GitHub Raw URLs
2. Uloží ho do `chrome.storage.local`
3. **injector.js** načte kód ze storage a injektuje ho na YouTube stránky
4. Při každém reloadu extensionu se kód automaticky aktualizuje

### GitHub Raw URLs

Rozšíření načítá kód z:
```
https://raw.githubusercontent.com/Deerpfy/adhub/main/projects/youtube-downloader/extension/
```

### Vývoj nové funkce

1. Upravte soubory v `/projects/youtube-downloader/extension/`
2. Commitněte a pushněte do GitHubu
3. V Chrome klikněte na "Zkontrolovat aktualizace" v popupu NEBO
4. Klikněte na 🔄 Reload v `chrome://extensions/`
5. Hotovo! Nová verze je načtena

## 🚀 Výhody oproti ZIP stahování

| Starý způsob (ZIP) | Nový způsob (Loader) |
|-------------------|---------------------|
| ❌ Stahovat při každé změně | ✅ Jednou nainstalovat |
| ❌ Manuální update | ✅ Automatické updaty |
| ❌ Zdlouhavé | ✅ Instant refresh |
| ❌ Riziko zastaralé verze | ✅ Vždy nejnovější |

## ⚙️ Nastavení

### Změna intervalu aktualizací

V `background.js` změňte:
```javascript
const CHECK_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hodina
```

### Vlastní GitHub repository

V `background.js` změňte:
```javascript
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/...';
```

## 🐛 Troubleshooting

### Rozšíření nefunguje

1. Otevřete `chrome://extensions/`
2. Najděte "AdHUB YouTube Downloader (Auto-Update)"
3. Klikněte na "🔄 Reload"
4. Otevřete popup a klikněte na "Zkontrolovat aktualizace"

### Nejsou dostupné aktualizace

- Zkontrolujte internetové připojení
- Zkontrolujte, že GitHub repository je dostupné
- Podívejte se do konzole (F12 → Console) na chybové hlášky

### Cache problémy

Rozšíření ukládá načtený kód do `chrome.storage.local`. Pro vymazání:

1. Otevřete DevTools (F12)
2. Application → Storage → Local Storage
3. Smažte položky začínající na "content.js", "page-bridge.js" atd.
4. Reload extension

## 📝 Licence

Stejná jako hlavní AdHUB projekt.

## 👨‍💻 Autor

AdHUB Team

---

**Pro více informací navštivte:** https://github.com/Deerpfy/adhub
