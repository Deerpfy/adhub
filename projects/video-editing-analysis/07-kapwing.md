# Analýza: Kapwing

**URL**: https://www.kapwing.com/
**Datum analýzy**: 20. prosince 2025
**Typ**: Cloud-based video editor

---

## Shrnutí

Kapwing je browser-based video editor zaměřený na týmovou spolupráci a AI-powered automatizaci. Vyniká ve funkcích jako text-based editing, automatické odstranění ticha (Smart Cut) a AI generování videí z textových promptů. Je ideální pro marketéry, social media manažery a týmy, které potřebují rychle produkovat obsah.

---

## 1. Technická analýza

### Použité technologie

| Kategorie | Technologie | Poznámka |
|-----------|-------------|----------|
| **Frontend** | React | SPA |
| **Backend** | Node.js | Microservices |
| **AI** | OpenAI, Whisper, vlastní ML | Text-to-video, transcription |
| **Storage** | AWS S3 | Cloud storage |
| **Rendering** | Cloud-based | GPU clusters |
| **Collaboration** | Real-time sync | WebSocket |
| **API** | REST + webhooks | Integrace |

### Systémové požadavky

| Aspekt | Minimum | Doporučeno |
|--------|---------|------------|
| **Prohlížeč** | Chrome 80+, Firefox 75+ | Chrome latest |
| **Připojení** | 10 Mbps | 50+ Mbps |
| **Upload limit** | 250 MB (Free) | 6 GB (Pro) |
| **Video length** | 4 min (Free) | 2 hod (Pro) |

### Výkonnostní charakteristiky

```
PROCESSING TIMES (benchmark)
┌─────────────────────────────────────────────────────────────────┐
│ Operation                    │ Free      │ Pro/Business         │
├─────────────────────────────────────────────────────────────────┤
│ Auto-subtitles (5 min)       │ ~60 sec   │ ~30 sec (priority)   │
│ Smart Cut (10 min)           │ ~3 min    │ ~1 min               │
│ AI Video Generation          │ N/A       │ ~2-5 min             │
│ Export 1080p (5 min)         │ ~3-5 min  │ ~1-2 min             │
│ Export 4K (5 min)            │ N/A       │ ~3-5 min             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Funkční analýza

### Klíčové funkce

| Funkce | Popis | Free | Pro | Business | Hodnocení |
|--------|-------|------|-----|----------|-----------|
| **Smart Cut** | Automatické odstranění ticha | ✅ Limited | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Magic Subtitles** | AI titulky + styling | ✅ Limited | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Text-Based Editing** | Editace přes transkript | ✅ | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **AI Video Generator** | Text-to-video | ❌ | ✅ | ✅ | ⭐⭐⭐⭐ |
| **AI Script Writer** | Generování skriptů | ❌ | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Background Removal** | AI pozadí | ✅ | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Eye Contact AI** | Korekce pohledu | ❌ | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Voice Clone** | ElevenLabs integrace | ❌ | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Team Collaboration** | Real-time editing | ✅ Limited | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Brand Kit** | Barvy, fonty, loga | ❌ | ✅ | ✅ | ⭐⭐⭐⭐ |

### AI nástroje detailně

```
SMART CUT (Silence Remover)
┌─────────────────────────────────────────────────────────────────┐
│ INPUT: Video s mluveným slovem                                  │
│   ↓                                                             │
│ AUDIO ANALYSIS                                                  │
│   ├── Waveform detection                                        │
│   ├── Speech vs silence classification                          │
│   └── Filler word detection ("um", "uh", "like")                │
│   ↓                                                             │
│ CUT POINTS GENERATION                                           │
│   ├── Silence threshold (adjustable)                            │
│   ├── Minimum pause length                                      │
│   └── Padding (before/after speech)                             │
│   ↓                                                             │
│ OUTPUT                                                          │
│   ├── Automatic cuts in timeline                                │
│   ├── Review & adjust capability                                │
│   └── One-click export                                          │
└─────────────────────────────────────────────────────────────────┘

TEXT-BASED EDITING
┌─────────────────────────────────────────────────────────────────┐
│ Traditional Timeline:                                           │
│ [clip][clip][clip] → Visual scrubbing → Manual cuts             │
│                                                                 │
│ Kapwing Text-Based:                                             │
│ "Hello everyone, um, welcome to this tutorial"                  │
│              ↓                                                  │
│ Select "um" → Delete → Video auto-adjusts                       │
│              ↓                                                  │
│ "Hello everyone, welcome to this tutorial"                      │
└─────────────────────────────────────────────────────────────────┘

AI VIDEO GENERATOR
┌─────────────────────────────────────────────────────────────────┐
│ INPUT: Text prompt / Script                                     │
│   "Create a 60-second video about sustainable fashion"          │
│   ↓                                                             │
│ AI PROCESSING                                                   │
│   ├── Script analysis                                           │
│   ├── B-roll selection (stock library)                          │
│   ├── Music matching                                            │
│   ├── Voice-over generation (optional)                          │
│   └── Subtitle generation                                       │
│   ↓                                                             │
│ OUTPUT                                                          │
│   └── Complete video (fully editable)                           │
└─────────────────────────────────────────────────────────────────┘
```

### Collaboration features

```
REAL-TIME COLLABORATION
┌─────────────────────────────────────────────────────────────────┐
│                        KAPWING PROJECT                          │
├─────────────────────────────────────────────────────────────────┤
│  Team Members:                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                           │
│  │ 👤 A │ │ 👤 B │ │ 👤 C │ │ 👤 D │                           │
│  │Editor│ │Editor│ │Viewer│ │Admin │                           │
│  └──────┘ └──────┘ └──────┘ └──────┘                           │
├─────────────────────────────────────────────────────────────────┤
│  Features:                                                      │
│  ├── Simultaneous editing (like Google Docs)                    │
│  ├── Cursor visibility                                          │
│  ├── Comments & annotations                                     │
│  ├── Version history                                            │
│  ├── Role-based permissions                                     │
│  └── @mentions in comments                                      │
└─────────────────────────────────────────────────────────────────┘

SHARING & APPROVAL WORKFLOW
1. Editor creates video
2. Share link with stakeholders
3. Stakeholders leave timestamped comments
4. Editor addresses feedback
5. Approve & export
```

---

## 3. UX/Design analýza

### Rozhraní

```
KAPWING STUDIO INTERFACE
┌─────────────────────────────────────────────────────────────────┐
│  [Kapwing] [My Workspace ▼] [Project Name]   [Share] [Export ▼] │
├─────────────┬───────────────────────────────┬───────────────────┤
│  Tools      │         Canvas                │   Editor Panel    │
│  ───────    │                               │   ────────────    │
│  📹 Upload  │   ┌─────────────────────┐     │   Transcript      │
│  🎬 Record  │   │                     │     │   ──────────      │
│  📝 Text    │   │   [video preview]   │     │   "Hello, this    │
│  🖼️ Images  │   │                     │     │   is a sample     │
│  🎵 Audio   │   └─────────────────────┘     │   transcript..."  │
│  ⬜ Elements│                               │                   │
│  🔧 AI Tools│   [Aspect Ratio ▼] [Zoom ▼]   │   [AI Actions ▼]  │
├─────────────┴───────────────────────────────┴───────────────────┤
│  Layers │ Timeline                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🎬 Video  [clip                                        ]    ││
│  │ 📝 Text   [    ][title    ][subtitle  ]                     ││
│  │ 🎵 Audio  [music track                                 ]    ││
│  │ 📊 Graph  [          ][chart      ]                         ││
│  └─────────────────────────────────────────────────────────────┘│
│  00:00                                                   02:30  │
└─────────────────────────────────────────────────────────────────┘
```

### Hodnocení UX

| Aspekt | Hodnocení | Poznámka |
|--------|-----------|----------|
| **Intuitivnost** | ⭐⭐⭐⭐ | Čisté, přehledné |
| **Text-based workflow** | ⭐⭐⭐⭐⭐ | Revoluční přístup |
| **Collaboration** | ⭐⭐⭐⭐⭐ | Nejlepší v kategorii |
| **AI integrace** | ⭐⭐⭐⭐⭐ | Seamless, jeden klik |
| **Learning curve** | ⭐⭐⭐⭐ | Nízká |
| **Mobile support** | ⭐⭐ | Pouze preview |

### Workspace management

```
WORKSPACE HIERARCHY
Workspace (Team)
├── Folders
│   ├── Client A
│   │   ├── Project 1
│   │   ├── Project 2
│   │   └── Templates/
│   ├── Client B
│   └── Internal/
├── Brand Kit
│   ├── Logos
│   ├── Colors
│   ├── Fonts
│   └── Intros/Outros
└── Team Members
    ├── Admins
    ├── Editors
    └── Viewers
```

---

## 4. Cenová analýza

### Pricing (2025)

| Plán | Měsíčně | Ročně | Klíčové funkce |
|------|---------|-------|----------------|
| **Free** | $0 | $0 | 720p, watermark, 4 min video, 250 MB upload |
| **Pro** | $24/měs | $16/měs | 1080p/4K, no watermark, 2h video, 300 min AI |
| **Business** | $69/user/měs | $50/user/měs | 900 min AI, voice clone, priority |
| **Enterprise** | Custom | Custom | Unlimited, SSO, dedicated support |

### Feature comparison

```
PLAN COMPARISON
┌─────────────────────────┬─────────┬─────────┬──────────┬────────────┐
│ Feature                 │  Free   │   Pro   │ Business │ Enterprise │
├─────────────────────────┼─────────┼─────────┼──────────┼────────────┤
│ Export resolution       │  720p   │  4K     │   4K     │    4K      │
│ Watermark               │   ✅    │   ❌    │   ❌     │    ❌      │
│ Video length            │  4 min  │  2 hr   │  4 hr    │ Unlimited  │
│ File upload             │ 250 MB  │  6 GB   │  6 GB    │ Unlimited  │
│ AI subtitle minutes     │ 60/mo   │ 300/mo  │ 900/mo   │ Unlimited  │
│ AI video generator      │   ❌    │   ✅    │   ✅     │    ✅      │
│ Smart Cut               │ Limited │   ✅    │   ✅     │    ✅      │
│ Voice clone             │   ❌    │   ❌    │   ✅     │    ✅      │
│ Brand kit               │   ❌    │   ✅    │   ✅     │    ✅      │
│ Team collaboration      │   ❌    │ Limited │   ✅     │    ✅      │
│ Priority rendering      │   ❌    │   ❌    │   ✅     │    ✅      │
│ API access              │   ❌    │   ❌    │   ✅     │    ✅      │
└─────────────────────────┴─────────┴─────────┴──────────┴────────────┘
```

---

## 5. Právní a bezpečnostní analýza

### Compliance

| Aspekt | Status |
|--------|--------|
| **GDPR** | ✅ Compliant |
| **SOC 2** | ✅ Type II |
| **CCPA** | ✅ Compliant |
| **Data location** | US (AWS) |
| **Encryption** | TLS 1.3, AES-256 |

### Privacy

```
DATA HANDLING
├── Video processing: Cloud (temporary)
├── Project storage: Persistent (user controls)
├── Transcripts: Stored for editing
├── AI training: Opt-out available (Enterprise)
└── Third-party AI: OpenAI, ElevenLabs

RETENTION
├── Free: 7 dní po neaktivitě
├── Pro: 30 dní po neaktivitě
├── Business/Enterprise: Unlimited
└── Deleted: 30 dní recovery
```

---

## Silné stránky

1. **Text-based editing** - Revoluční přístup k video editaci
2. **Smart Cut** - Nejlepší automatické odstranění ticha
3. **Collaboration** - Google Docs pro video
4. **AI Video Generator** - Kompletní videa z textu
5. **ElevenLabs integrace** - Profesionální voice clone
6. **Brand Kit** - Konzistence napříč projekty

## Slabé stránky a doporučení

| Problém | Závažnost | Doporučení | Priorita |
|---------|-----------|------------|----------|
| Cena Pro plánu | Střední | Zvážit roční předplatné (33% sleva) | P2 |
| Free tier velmi omezený | Vysoká | Pro seriózní práci nutný Pro | P1 |
| Velké soubory = pomalé | Střední | Optimalizovat média před uploadem | P2 |
| Omezené video efekty | Střední | Pro VFX kombinovat s jinými nástroji | P3 |
| Není pro cinematický obsah | Nízká | Kapwing je pro marketing/social, ne film | P3 |
| API pouze Business+ | Střední | Pro automatizaci nutný vyšší plán | P2 |

---

## Technické detaily

### Smart Cut konfigurace

```javascript
// Kapwing Smart Cut configuration
const smartCutConfig = {
  // Silence detection
  silenceThreshold: -40, // dB
  minSilenceDuration: 0.5, // seconds

  // Filler word removal
  fillerWords: ["um", "uh", "like", "you know", "basically", "actually"],
  fillerWordConfidence: 0.8, // 80% confidence threshold

  // Padding around speech
  padding: {
    before: 0.1, // seconds before speech starts
    after: 0.2   // seconds after speech ends
  },

  // Preview options
  previewCuts: true,
  allowManualAdjustment: true
};

// Apply Smart Cut
async function applySmartCut(videoId) {
  const response = await fetch('/api/smart-cut', {
    method: 'POST',
    body: JSON.stringify({
      videoId,
      config: smartCutConfig
    })
  });

  return response.json(); // Returns cut points for review
}
```

### API příklad (Business+)

```javascript
// Kapwing API - Create video from template
const KAPWING_API_KEY = 'your_api_key';

async function createVideoFromTemplate(templateId, variables) {
  const response = await fetch('https://api.kapwing.com/v1/videos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KAPWING_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      templateId: templateId,
      variables: {
        headline: variables.headline,
        subheadline: variables.subheadline,
        logoUrl: variables.logoUrl,
        backgroundColor: variables.backgroundColor,
        primaryVideo: variables.primaryVideoUrl
      },
      output: {
        format: 'mp4',
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    })
  });

  const result = await response.json();
  return result.downloadUrl;
}

// Batch video generation
async function batchGenerate(products) {
  const videos = await Promise.all(
    products.map(product => createVideoFromTemplate(
      'product-showcase-template',
      {
        headline: product.name,
        subheadline: product.tagline,
        primaryVideoUrl: product.demoVideoUrl
      }
    ))
  );

  return videos;
}
```

### CSS - Kapwing-inspired styling

```css
/* Kapwing-inspired UI components */
:root {
  --kapwing-primary: #ff5c35;
  --kapwing-bg: #121212;
  --kapwing-panel: #1e1e1e;
  --kapwing-border: #2a2a2a;
  --kapwing-text: #ffffff;
  --kapwing-muted: #888888;
}

.kapwing-editor {
  background: var(--kapwing-bg);
  color: var(--kapwing-text);
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  height: 100vh;
}

.kapwing-sidebar {
  background: var(--kapwing-panel);
  border-right: 1px solid var(--kapwing-border);
  padding: 16px;
}

.kapwing-canvas {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
  padding: 24px;
}

.kapwing-transcript-panel {
  background: var(--kapwing-panel);
  border-left: 1px solid var(--kapwing-border);
  padding: 16px;
  overflow-y: auto;
}

.kapwing-button-primary {
  background: var(--kapwing-primary);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.kapwing-button-primary:hover {
  background: #ff7a5a;
  transform: translateY(-1px);
}

/* Transcript word styling */
.transcript-word {
  display: inline;
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.1s ease;
}

.transcript-word:hover {
  background: rgba(255, 92, 53, 0.2);
}

.transcript-word.selected {
  background: var(--kapwing-primary);
  color: white;
}

.transcript-word.filler {
  color: var(--kapwing-muted);
  text-decoration: line-through;
}

/* Smart Cut visualization */
.smart-cut-marker {
  position: absolute;
  width: 2px;
  height: 100%;
  background: var(--kapwing-primary);
  opacity: 0.8;
}

.smart-cut-range {
  position: absolute;
  height: 100%;
  background: repeating-linear-gradient(
    45deg,
    rgba(255, 92, 53, 0.1),
    rgba(255, 92, 53, 0.1) 2px,
    transparent 2px,
    transparent 4px
  );
}
```

---

## Zdroje

- [Kapwing Official](https://www.kapwing.com/)
- [Kapwing Review - AllAboutAI](https://www.allaboutai.com/ai-reviews/kapwing/)
- [Kapwing Review 2025 - Quso.ai](https://quso.ai/blog/kapwing-review)
- [Kapwing vs Clipchamp - Vertu](https://vertu.com/guides/kapwing-vs-clipchamp-user-friendly-editor-in-2025/)
- [Kapwing AI Video Tools - HyzenPro](https://hyzenpro.com/kapwing-review/)
- [Kapwing vs Descript - Podymos](https://podymos.com/learning-center/ai-video-editing-software-an-honest-review-of-kapwing-and-descript)
