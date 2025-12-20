# Analýza: CapCut

**URL**: https://www.capcut.com/
**Datum analýzy**: 20. prosince 2025
**Verze**: Web, Desktop, Mobile

---

## Shrnutí

CapCut je all-in-one AI-powered video editor od ByteDance (vlastník TikTok), dostupný na webu, desktopu i mobilních zařízeních. S více než 1 miliardou stažení je nejpopulárnějším bezplatným video editorem pro sociální média. Jeho hlavní výhodou je generózní free tier (1080p export bez vodoznaku) a hluboká integrace s TikTok trendy a efekty.

**Důležitá poznámka**: Jako produkt ByteDance podléhá CapCut potenciálním regulatorním omezením. Deadline pro potenciální zákaz v USA byl prodloužen do 18. června 2025.

---

## 1. Technická analýza

### Použité technologie

| Kategorie | Technologie | Poznámka |
|-----------|-------------|----------|
| **Web** | WebAssembly, WebGL | Browser-based rendering |
| **Desktop** | Electron-like framework | Cross-platform |
| **Mobile** | Native iOS/Android | Optimalizováno pro mobile-first |
| **AI** | Vlastní ML modely | On-device + cloud hybrid |
| **Cloud** | ByteDance infrastructure | Globální CDN |
| **Export** | H.264, H.265, ProRes | Až 4K 60fps |

### Podporované platformy

| Platforma | Dostupnost | Max rozlišení (Free) | Max rozlišení (Pro) |
|-----------|------------|---------------------|---------------------|
| **Web** | capcut.com | 1080p | 4K |
| **Windows** | Desktop app | 1080p | 4K |
| **macOS** | Desktop app | 1080p | 4K |
| **iOS** | App Store | 1080p | 4K |
| **Android** | Google Play | 1080p | 4K |

### Výkonnostní charakteristiky

```
EXPORT RYCHLOST (1min video, 1080p H.264)
Desktop App    ████████████████████ ~30s (rychlý)
Web Editor     ████████████████ ~45s (závisí na připojení)
Mobile         ██████████████ ~60s (závisí na zařízení)

CROSS-PLATFORM SYNC
- Projekty synchronizovány přes cloud
- Seamless přechod mezi zařízeními
- Auto-save enabled
```

---

## 2. Funkční analýza

### Klíčové funkce

| Funkce | Popis | Free | Pro | Hodnocení |
|--------|-------|------|-----|-----------|
| **Timeline Editor** | Multi-track editing | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Auto Captions** | AI titulky | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Text-to-Speech** | AI hlasy | ✅ Limited | ✅ | ⭐⭐⭐⭐ |
| **Background Removal** | AI pozadí | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Templates** | Ready-made templates | ✅ Limited | ✅ Všechny | ⭐⭐⭐⭐⭐ |
| **Effects & Filters** | Trendy efekty | ✅ Limited | ✅ | ⭐⭐⭐⭐⭐ |
| **Keyframe Animation** | Pokročilé animace | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Chroma Key** | Green screen | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Speed Ramping** | Dynamická rychlost | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Music Library** | Royalty-free hudba | ✅ Limited | ✅ Full | ⭐⭐⭐⭐ |

### AI funkce (2025)

```
AI FEATURES BREAKDOWN
┌─────────────────────────────────────────────────────────────────┐
│ AI SCRIPT GENERATOR                                             │
│ ├── Generuje kreativní video skripty                            │
│ ├── Hooks, storytelling, CTA                                    │
│ └── Optimalizováno pro Shorts/Reels/TikTok                      │
├─────────────────────────────────────────────────────────────────┤
│ AI VIDEO GENERATOR (Text-to-Video)                              │
│ ├── Vytvoří video z textového promptu                           │
│ ├── Automatický výběr stock footage                             │
│ ├── AI výběr hudby a přechodů                                   │
│ └── Ready-to-share za minuty                                    │
├─────────────────────────────────────────────────────────────────┤
│ AI OBJECT ERASER (2025)                                         │
│ ├── Odstranění nežádoucích objektů                              │
│ ├── Content-aware fill                                          │
│ └── Photobombers, loga, dráty                                   │
├─────────────────────────────────────────────────────────────────┤
│ AUTO CAPTIONS                                                   │
│ ├── 40+ jazyků                                                  │
│ ├── Animované styly                                             │
│ └── Automatická synchronizace                                   │
├─────────────────────────────────────────────────────────────────┤
│ AI BACKGROUND REMOVAL                                           │
│ ├── Real-time segmentace                                        │
│ ├── Nahrazení pozadí                                            │
│ └── Bez green screenu                                           │
├─────────────────────────────────────────────────────────────────┤
│ AI VOICE FEATURES                                               │
│ ├── Text-to-Speech (10+ jazyků)                                 │
│ ├── Voice Effects                                               │
│ └── Noise Reduction                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Template system

```
TEMPLATE CATEGORIES
├── TikTok Trends
│   ├── Dance templates
│   ├── Transition templates
│   └── Effect templates
├── Instagram Reels
│   ├── Fashion
│   ├── Food
│   └── Travel
├── YouTube Shorts
│   ├── Gaming
│   ├── Education
│   └── Commentary
├── Business
│   ├── Product showcase
│   ├── Testimonials
│   └── Promotions
└── Special Occasions
    ├── Birthday
    ├── Wedding
    └── Holiday

TEMPLATE USAGE
1. Browse/Search templates
2. Tap to preview
3. "Use Template"
4. Replace footage/text
5. Export
```

---

## 3. UX/Design analýza

### Rozhraní (Desktop)

```
CAPCUT DESKTOP INTERFACE
┌─────────────────────────────────────────────────────────────────┐
│  [Import] [Templates] [Text] [Stickers] [Effects] [Transitions]│
├─────────────┬───────────────────────────────┬───────────────────┤
│  Media      │         Preview               │   Properties      │
│  ───────    │                               │   ──────────      │
│  📁 Import  │   ┌─────────────────────┐     │   Video           │
│  📁 Audio   │   │                     │     │   - Speed         │
│  📁 Text    │   │   [video preview]   │     │   - Animation     │
│  📁 Stickers│   │                     │     │   - Color         │
│  📁 Effects │   └─────────────────────┘     │   Audio           │
│  📁 Trans.  │                               │   - Volume        │
│             │   [◀] [▶] [⏸] 00:15/01:30    │   - Fade          │
├─────────────┴───────────────────────────────┴───────────────────┤
│  Timeline                                                       │
│  V2: [text][text]                                               │
│  V1: [clip    ][clip    ][clip    ][clip    ]                   │
│  A1: [audio                                    ]                │
│  🎵: [music track                              ]                │
├─────────────────────────────────────────────────────────────────┤
│  [Undo] [Redo] [Split] [Delete]    [Export ▼] [1080p] [Share]   │
└─────────────────────────────────────────────────────────────────┘
```

### Hodnocení UX

| Aspekt | Hodnocení | Poznámka |
|--------|-----------|----------|
| **Křivka učení** | ⭐⭐⭐⭐⭐ | Extrémně intuitivní |
| **Mobile-first design** | ⭐⭐⭐⭐⭐ | Optimalizováno pro dotyk |
| **Desktop adaptace** | ⭐⭐⭐⭐ | Dobrá, ale mobile DNA |
| **Template workflow** | ⭐⭐⭐⭐⭐ | Nejrychlejší start |
| **AI integrace** | ⭐⭐⭐⭐⭐ | Seamless, jeden klik |
| **Export flow** | ⭐⭐⭐⭐⭐ | Přímá publikace na platformy |

### Aspect Ratio presets

```
SOCIAL MEDIA FORMATS
┌────────────────────────────────────────┐
│  📱 9:16 (TikTok, Reels, Shorts)       │
│  📱 4:5 (Instagram Feed)               │
│  🖥️ 16:9 (YouTube, Standard)           │
│  ⬜ 1:1 (Instagram Square)             │
│  🎬 21:9 (Cinematic)                   │
│  📺 4:3 (Classic TV)                   │
└────────────────────────────────────────┘

AUTO-REFRAME
- AI automaticky detekuje subjects
- Udržuje hlavní obsah v rámu
- Batch processing pro více videí
```

---

## 4. Cenová analýza

### Pricing (2025)

| Plán | Cena | Funkce |
|------|------|--------|
| **Free** | $0 | 1080p, bez vodoznaku, omezené efekty |
| **Pro (měsíční)** | $9.99/měsíc | 4K, všechny efekty, premium templates |
| **Pro (roční)** | $74.99/rok ($6.25/měs) | Totéž, 37% sleva |
| **Team** | Custom | Collaboration, brand kit |

### Free vs Pro srovnání

```
FEATURE COMPARISON
┌─────────────────────────────┬─────────┬─────────┐
│ Feature                     │  Free   │   Pro   │
├─────────────────────────────┼─────────┼─────────┤
│ Export resolution           │  1080p  │   4K    │
│ Watermark                   │   ❌    │   ❌    │
│ Cloud storage               │  1 GB   │  100 GB │
│ Premium templates           │ Limited │   All   │
│ Premium effects             │ Limited │   All   │
│ Premium music               │ Limited │   All   │
│ Priority rendering          │   ❌    │   ✅    │
│ Remove background (HD)      │   ✅    │   ✅    │
│ Auto captions               │   ✅    │   ✅    │
│ Text-to-speech (premium)    │ Limited │   All   │
│ Export frame rate           │  30fps  │  60fps  │
│ Commercial use              │   ⚠️    │   ✅    │
└─────────────────────────────┴─────────┴─────────┘
```

---

## 5. Právní a bezpečnostní analýza

### Regulatorní rizika

| Aspekt | Status | Detail |
|--------|--------|--------|
| **US Ban** | Prodlouženo | Deadline: 18. června 2025 |
| **EU** | Monitorováno | GDPR compliance pod dohledem |
| **Data Collection** | Aktivní | ByteDance data policies |
| **Vlastnictví obsahu** | Uživatel | Ale licence pro ByteDance |

### Privacy concerns

```
DATA COLLECTION (dle Privacy Policy)
├── Account information
├── Device identifiers
├── Usage analytics
├── Content metadata
├── Location (optional)
└── Contacts (optional, pro sharing)

DATA STORAGE
├── Servers: USA, Singapore, Ireland
├── Retention: Varies by data type
└── Deletion: Na žádost (30 dní)

DOPORUČENÍ PRO UŽIVATELE
1. Používat pouze pro non-sensitive obsah
2. Nepropojovat business účty
3. Zvážit alternativy pro korporátní použití
4. Sledovat regulatorní vývoj
```

### Licence obsahu

| Obsah | Licence | Komerční použití |
|-------|---------|------------------|
| **Templates** | CapCut licence | ✅ S Pro |
| **Music** | Royalty-free (CapCut) | ⚠️ Ověřit |
| **Stock footage** | CapCut licence | ✅ S Pro |
| **Effects** | CapCut licence | ✅ |
| **Váš obsah** | Vy vlastníte | ✅ |

---

## Silné stránky

1. **Nejlepší free tier** - 1080p bez vodoznaku je unikátní
2. **TikTok integrace** - Přímý přístup k trendům a efektům
3. **Intuitivní UX** - Nejnižší vstupní bariéra
4. **Cross-platform** - Stejný projekt na všech zařízeních
5. **AI nástroje** - Auto captions, background removal zdarma
6. **Template knihovna** - Tisíce ready-made templates

## Slabé stránky a doporučení

| Problém | Závažnost | Doporučení | Priorita |
|---------|-----------|------------|----------|
| Regulatorní riziko (US ban) | Vysoká | Mít backup plán (Clipchamp, VEED) | P1 |
| Data privacy obavy | Vysoká | Nepoužívat pro citlivý obsah | P1 |
| Omezené pro dlouhá videa | Střední | Pro 10+ min zvážit desktop NLE | P2 |
| Freemium model agresivní | Střední | Důkladně zvážit, co potřebujete | P2 |
| Profesionální limity | Střední | Není náhrada za Premiere/Resolve | P3 |
| Závislost na internetu | Nízká | Desktop app funguje i offline | P3 |

---

## Technické detaily

### Export presets

```javascript
// CapCut export konfigurace (interní struktura)
const exportPresets = {
  tiktok: {
    resolution: { width: 1080, height: 1920 },
    aspectRatio: "9:16",
    fps: 30,
    codec: "h264",
    bitrate: "8M",
    audio: { codec: "aac", bitrate: "192k" }
  },
  youtube: {
    resolution: { width: 3840, height: 2160 }, // Pro only
    aspectRatio: "16:9",
    fps: 60,
    codec: "h265",
    bitrate: "30M",
    audio: { codec: "aac", bitrate: "320k" }
  },
  instagram_reel: {
    resolution: { width: 1080, height: 1920 },
    aspectRatio: "9:16",
    fps: 30,
    codec: "h264",
    bitrate: "8M",
    audio: { codec: "aac", bitrate: "192k" }
  },
  instagram_feed: {
    resolution: { width: 1080, height: 1350 },
    aspectRatio: "4:5",
    fps: 30,
    codec: "h264",
    bitrate: "8M",
    audio: { codec: "aac", bitrate: "192k" }
  }
};
```

### Auto Caption styling (CSS-like)

```css
/* CapCut caption styling options */
.caption-style-default {
  font-family: "CapCut Sans", system-ui;
  font-size: 48px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  text-align: center;
  background: transparent;
}

.caption-style-box {
  font-family: "CapCut Sans", system-ui;
  font-size: 36px;
  font-weight: 600;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 16px;
  border-radius: 8px;
}

.caption-style-animated {
  /* Animované styly využívají keyframes */
  animation: pop-in 0.3s ease-out;
}

@keyframes pop-in {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* Highlight active word */
.caption-word-highlight {
  color: #00ff88;
  background: linear-gradient(90deg, #00ff88, #00ccff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Keyframe animation system

```
CAPCUT KEYFRAME WORKFLOW
┌─────────────────────────────────────────────────────────────┐
│ Timeline with Keyframes                                     │
│                                                             │
│ Position X: ●───────────────●───────────────●              │
│             0s    (linear)  1s   (ease-out)  2s            │
│                                                             │
│ Scale:      ●───────────────●                               │
│             100%           150%                             │
│                                                             │
│ Opacity:    ●───────────────────────────────●              │
│             0%                              100%            │
└─────────────────────────────────────────────────────────────┘

EASING OPTIONS:
├── Linear (konstantní rychlost)
├── Ease In (pomalý start)
├── Ease Out (pomalý konec)
├── Ease In-Out (pomalý start i konec)
└── Bezier (custom křivka)
```

---

## Zdroje

- [CapCut Official](https://www.capcut.com/)
- [CapCut Review 2025 - Zebracat](https://www.zebracat.ai/post/i-tried-capcut)
- [CapCut Desktop Review - BigVu](https://bigvu.tv/blog/capcut-online-desktop-editor-review)
- [CapCut AI Features 2025 - Fahimai](https://www.fahimai.com/capcut)
- [CapCut Pro vs Free - VideoCaptionStudio](https://videocaptionstudio.com/blog/capcut-pro-vs-free-2025.html)
- [VEED - CapCut Alternatives](https://www.veed.io/learn/capcut-alternative)
