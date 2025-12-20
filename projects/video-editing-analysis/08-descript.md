# Analýza: Descript

**URL**: https://www.descript.com/
**Datum analýzy**: 20. prosince 2025
**Typ**: Desktop + Cloud hybrid

---

## Shrnutí

Descript je revoluční video a audio editor, který přináší paradigm shift v podobě text-based editing. Místo práce s timeline editujete transkript - smažete slovo a video se automaticky upraví. Specializuje se na podcasting, talking-head videa a content repurposing. V roce 2025 představil Underlord AI, který umožňuje vytvářet a editovat videa pomocí přirozeného jazyka.

---

## 1. Technická analýza

### Použité technologie

| Kategorie | Technologie | Poznámka |
|-----------|-------------|----------|
| **Desktop App** | Electron | Cross-platform |
| **Rendering** | Local + Cloud hybrid | GPU accelerated |
| **AI Engine** | Whisper + vlastní ML | Transcription, Overdub |
| **Overdub** | Custom voice synthesis | Vlastní natrénovaný model |
| **Storage** | Cloud sync | Drive integration |
| **Collaboration** | Real-time | Multi-user editing |

### Systémové požadavky

| Komponenta | Minimum | Doporučeno |
|------------|---------|------------|
| **OS** | Win 10/11, macOS 10.15+ | Latest |
| **RAM** | 8 GB | 16+ GB |
| **CPU** | Intel i5 / M1 | Intel i7 / M2+ |
| **GPU** | Integrated | Dedicated (NVIDIA/AMD) |
| **Storage** | SSD 10 GB | SSD 50+ GB |
| **Internet** | 10 Mbps | 50+ Mbps (pro cloud features) |

### Výkonnostní charakteristiky

```
TRANSCRIPTION SPEED
┌─────────────────────────────────────────────────────────────────┐
│ 10 min audio → ~30-60 sekund                                    │
│ 1 hodina audio → ~5-10 minut                                    │
│                                                                 │
│ Accuracy:                                                       │
│ ├── English: ~95%                                               │
│ ├── Čeština: ~90%                                               │
│ └── Ostatní: ~88-93%                                            │
└─────────────────────────────────────────────────────────────────┘

OVERDUB GENERATION
┌─────────────────────────────────────────────────────────────────┐
│ Voice model training: ~15-30 min (initial setup)                │
│ Text-to-speech generation: Real-time                            │
│ Quality: Near-studio quality (s nattrénovaným hlasem)           │
└─────────────────────────────────────────────────────────────────┘

EXPORT TIMES (10 min video)
┌─────────────────────────────────────────────────────────────────┐
│ 1080p local export: ~2-5 min                                    │
│ 4K local export: ~5-10 min                                      │
│ Cloud export: +upload time                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Funkční analýza

### Text-Based Editing - Core Feature

```
TRADIČNÍ VIDEO EDITING
┌─────────────────────────────────────────────────────────────────┐
│  Timeline: [clip][clip][clip]                                   │
│                                                                 │
│  Workflow:                                                      │
│  1. Scrub through video                                         │
│  2. Find mistake at 2:34:15                                     │
│  3. Set in/out points                                           │
│  4. Delete/ripple                                               │
│  5. Check audio sync                                            │
│  6. Repeat...                                                   │
│                                                                 │
│  Time: 30 min per 10 min video (experienced editor)             │
└─────────────────────────────────────────────────────────────────┘

DESCRIPT TEXT-BASED EDITING
┌─────────────────────────────────────────────────────────────────┐
│  Transcript:                                                    │
│  "Hello everyone, um, welcome to this, uh, tutorial.            │
│   Today we'll talk about [cough] video editing."                │
│                                                                 │
│  Workflow:                                                      │
│  1. Select "um"                                                 │
│  2. Press Delete                                                │
│  3. Video automatically adjusts                                 │
│  4. Or: "Remove all filler words" (one click)                   │
│                                                                 │
│  Time: 5 min per 10 min video (any skill level)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Klíčové funkce

| Funkce | Popis | Free | Creator | Pro | Hodnocení |
|--------|-------|------|---------|-----|-----------|
| **Text-Based Editing** | Edit video jako dokument | ✅ | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Transcription** | AI přepis | 1 hr/mo | 10 hr/mo | 30 hr/mo | ⭐⭐⭐⭐⭐ |
| **Overdub** | AI voice synthesis | ❌ | ✅ Stock | ✅ Custom | ⭐⭐⭐⭐⭐ |
| **Studio Sound** | Audio enhancement | ❌ | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Filler Word Removal** | Automatické odstranění | ✅ | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Eye Contact AI** | Korekce pohledu | ❌ | ✅ | ✅ | ⭐⭐⭐⭐ |
| **AI Green Screen** | Odstranění pozadí | ❌ | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Underlord AI** | AI video assistant | ❌ | Limited | ✅ | ⭐⭐⭐⭐ |
| **Screen Recording** | Built-in | ✅ | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Multitrack** | Audio/video layers | ✅ | ✅ | ✅ | ⭐⭐⭐⭐ |

### Overdub - AI Voice Synthesis

```
OVERDUB WORKFLOW
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Voice Training                                          │
│   ├── Record 30+ min of your voice                              │
│   ├── Read provided scripts                                     │
│   ├── AI learns your voice patterns                             │
│   └── Model ready in ~30 min                                    │
├─────────────────────────────────────────────────────────────────┤
│ STEP 2: Usage                                                   │
│   ├── Type text in transcript                                   │
│   ├── Select "Overdub"                                          │
│   ├── AI generates your voice                                   │
│   └── Seamlessly integrated into video                          │
├─────────────────────────────────────────────────────────────────┤
│ USE CASES                                                       │
│   ├── Fix mispronunciations                                     │
│   ├── Add forgotten content                                     │
│   ├── Change script after recording                             │
│   └── Create variations quickly                                 │
└─────────────────────────────────────────────────────────────────┘

OVERDUB SAFETY
├── Consent verification required
├── Watermark on voice model
├── Usage tracking
└── Terms prohibit impersonation
```

### Underlord AI (2025)

```
UNDERLORD AI CAPABILITIES
┌─────────────────────────────────────────────────────────────────┐
│ "Edit this video to be 60 seconds"                              │
│   → AI identifies key moments                                   │
│   → Creates condensed version                                   │
│   → Maintains narrative flow                                    │
├─────────────────────────────────────────────────────────────────┤
│ "Add B-roll when I mention the product"                         │
│   → AI identifies product mentions                              │
│   → Suggests/inserts relevant stock footage                     │
│   → Syncs with narration                                        │
├─────────────────────────────────────────────────────────────────┤
│ "Make this more engaging"                                       │
│   → Adds dynamic captions                                       │
│   → Suggests music                                              │
│   → Adds transitions                                            │
├─────────────────────────────────────────────────────────────────┤
│ "Create a YouTube short from this podcast"                      │
│   → Extracts viral-worthy segments                              │
│   → Reformats to 9:16                                           │
│   → Adds trending caption style                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. UX/Design analýza

### Rozhraní

```
DESCRIPT INTERFACE
┌─────────────────────────────────────────────────────────────────┐
│  [Descript] [Project Name]              [Share] [Publish ▼]     │
├─────────────────────────────────────────────────────────────────┤
│  Sidebar    │         Script (Main Editor)         │  Preview   │
│  ────────   │                                      │  ────────  │
│  📁 Files   │  Hello everyone, welcome to this     │  ┌──────┐  │
│  🎬 Scenes  │  tutorial about Descript. Today      │  │      │  │
│  📊 Media   │  we'll learn how to edit video       │  │ [▶]  │  │
│  🎵 Audio   │  just by editing text.               │  │      │  │
│  📝 Trans.  │                                      │  └──────┘  │
│  ⚙️ Settings│  [This is a highlighted speaker]     │            │
│             │                                      │  Timeline  │
│             │  The process is incredibly simple.   │  ────────  │
│             │  You just delete words and the       │  [■■■■■]   │
│             │  video updates automatically.        │  00:45     │
├─────────────┴──────────────────────────────────────┴────────────┤
│  Toolbar: [B][I][U] | [Heading ▼] | [Speaker ▼] | [AI ▼]        │
└─────────────────────────────────────────────────────────────────┘
```

### Hodnocení UX

| Aspekt | Hodnocení | Poznámka |
|--------|-----------|----------|
| **Paradigm shift** | ⭐⭐⭐⭐⭐ | Revoluční přístup |
| **Intuitivnost** | ⭐⭐⭐⭐⭐ | Jako psaní dokumentu |
| **Learning curve** | ⭐⭐⭐⭐ | Nízká pro basic, střední pro advanced |
| **Desktop app quality** | ⭐⭐⭐⭐ | Občasné stability issues |
| **Collaboration** | ⭐⭐⭐⭐ | Real-time, ale ne tak smooth jako Kapwing |
| **Mobile** | ⭐⭐ | Žádná mobilní app |

### Composition workflow

```
COMPOSITION (SCENES) SYSTEM
┌─────────────────────────────────────────────────────────────────┐
│ Project                                                         │
│ ├── Composition 1: "Full Interview"                             │
│ │   └── [transcript + media]                                    │
│ ├── Composition 2: "Highlight Reel"                             │
│ │   └── [selected segments from Comp 1]                         │
│ ├── Composition 3: "YouTube Short"                              │
│ │   └── [vertical reformat]                                     │
│ └── Composition 4: "Audio Only (Podcast)"                       │
│     └── [audio export]                                          │
└─────────────────────────────────────────────────────────────────┘

→ Multiple outputs from single source
→ Changes to source auto-propagate (optional)
→ Efficient content repurposing
```

---

## 4. Cenová analýza

### Pricing (2025)

| Plán | Měsíčně | Ročně | Klíčové funkce |
|------|---------|-------|----------------|
| **Free** | $0 | $0 | 1 hr transcription, 720p, 1 watermark-free |
| **Creator** | $15/měs | $12/měs | 10 hr trans., 4K, Overdub (stock), AI effects |
| **Pro** | $30/měs | $24/měs | 30 hr trans., custom Overdub, unlimited AI |
| **Business** | $50/user/měs | $40/user/měs | 300 min AI, SSO, admin controls |
| **Enterprise** | Custom | Custom | Unlimited, dedicated support |

### Value proposition

```
ČASOVÁ ÚSPORA

Tradiční editing (10 min video):
├── Rough cut: 30 min
├── Fine cut: 30 min
├── Audio cleanup: 20 min
├── Captions: 20 min
└── TOTAL: ~100 min

Descript editing (10 min video):
├── Import + transcription: 2 min
├── Text-based edit: 10 min
├── Studio Sound: 1 click
├── Auto-captions: 1 click
└── TOTAL: ~15 min

ÚSPORA: 85 minut per video
At $30/hour freelance rate: $42.50 saved per video
Break-even: ~1 video/month pro Creator plan
```

---

## 5. Právní a bezpečnostní analýza

### Compliance

| Aspekt | Status |
|--------|--------|
| **GDPR** | ✅ Compliant |
| **SOC 2** | ✅ Type II |
| **CCPA** | ✅ Compliant |
| **Voice consent** | ✅ Required for Overdub |
| **Encryption** | TLS 1.3, AES-256 |

### Overdub Ethics

```
OVERDUB SAFETY MEASURES
┌─────────────────────────────────────────────────────────────────┐
│ CONSENT REQUIREMENTS                                            │
│ ├── User must verbally consent during training                  │
│ ├── "I [name] authorize Descript to create..."                  │
│ ├── Recording of consent stored                                 │
│ └── Cannot be bypassed                                          │
├─────────────────────────────────────────────────────────────────┤
│ USAGE RESTRICTIONS                                              │
│ ├── Only your own voice (or with explicit permission)           │
│ ├── No impersonation of public figures                          │
│ ├── No fraudulent use                                           │
│ └── Descript can revoke access                                  │
├─────────────────────────────────────────────────────────────────┤
│ DETECTION                                                       │
│ ├── Invisible watermark in audio                                │
│ ├── Traceable to account                                        │
│ └── Forensic verification available                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Silné stránky

1. **Text-based editing** - Game-changer pro dialogue-driven content
2. **Overdub** - Opravte nahrávky bez re-recordingu
3. **Studio Sound** - Profesionální audio jedním klikem
4. **Filler word removal** - Automatické "um", "uh" odstranění
5. **Content repurposing** - Jeden zdroj, více outputů
6. **Underlord AI** - Budoucnost video editace

## Slabé stránky a doporučení

| Problém | Závažnost | Doporučení | Priorita |
|---------|-----------|------------|----------|
| Není pro cinematický obsah | Vysoká | Pro VFX/color použít DaVinci/Premiere | P1 |
| Stabilita desktop app | Střední | Časté ukládání, auto-backup | P2 |
| Transcription accuracy (non-EN) | Střední | Manuální review pro kritický obsah | P2 |
| Žádná mobilní app | Střední | Web access omezený | P2 |
| Internet dependency | Střední | Většina funkcí vyžaduje připojení | P2 |
| Overdub learning curve | Nízká | 30+ min kvalitního záznamu pro trénink | P3 |

---

## Technické detaily

### Export formáty

```javascript
// Descript export options
const exportFormats = {
  video: {
    mp4: {
      resolutions: ['720p', '1080p', '4K'],
      codecs: ['h264', 'h265'],
      frameRates: [24, 25, 30, 60]
    },
    mov: {
      resolutions: ['720p', '1080p', '4K', 'ProRes'],
      codecs: ['prores_422', 'prores_4444']
    },
    gif: {
      maxDuration: 30, // seconds
      maxResolution: '720p'
    }
  },
  audio: {
    mp3: { bitrates: ['128k', '192k', '320k'] },
    wav: { sampleRates: [44100, 48000, 96000] },
    flac: { lossless: true }
  },
  text: {
    srt: true,
    vtt: true,
    txt: true,
    docx: true // with formatting
  }
};
```

### Descript project structure

```
project.descript/
├── project.json           # Project metadata
├── media/
│   ├── video_001.mp4     # Original media
│   ├── video_002.mp4
│   └── audio_001.wav
├── transcripts/
│   ├── video_001.json    # Word-level timestamps
│   └── video_002.json
├── compositions/
│   ├── main.json         # Main edit
│   ├── short_1.json      # Derivative
│   └── podcast.json      # Audio-only
├── overdub/
│   ├── voice_model.bin   # Your voice model
│   └── generated/        # AI-generated audio
└── exports/
    └── [exported files]
```

### Python SDK example

```python
# Descript API (unofficial/conceptual)
import descript

# Initialize client
client = descript.Client(api_key="your_api_key")

# Create new project
project = client.create_project(
    name="Podcast Episode 42",
    media=["episode_42.wav"]
)

# Get transcription
transcript = project.transcribe(
    language="en",
    speaker_labels=True,
    punctuation=True
)

# Apply edits via transcript
edits = transcript.find_and_remove(
    patterns=["um", "uh", "like", "you know"],
    type="filler_words"
)

# Apply Studio Sound
project.enhance_audio(
    studio_sound=True,
    remove_background_noise=True,
    level_audio=True
)

# Export
project.export(
    format="mp4",
    resolution="1080p",
    include_captions=True,
    caption_style="animated"
)
```

### Keyboard shortcuts

```
DESCRIPT SHORTCUTS
─────────────────────────────
PLAYBACK
Space       - Play/Pause
J/K/L       - Reverse/Pause/Forward
← →         - Word by word
Shift+← →   - Sentence by sentence

EDITING (TEXT MODE)
Cmd/Ctrl+B  - Bold
Cmd/Ctrl+I  - Italic
Cmd/Ctrl+K  - Add link
Delete      - Remove word (and video)
Cmd/Ctrl+Z  - Undo
Cmd/Ctrl+Shift+Z - Redo

TIMELINE MODE
[ ]         - Set In/Out points
Cmd/Ctrl+T  - Split at playhead
M           - Add marker
S           - Toggle snap

AI FEATURES
Cmd/Ctrl+Shift+F - Filler word removal
Cmd/Ctrl+Shift+S - Studio Sound
Cmd/Ctrl+Shift+O - Overdub mode

COMPOSITION
Cmd/Ctrl+N  - New composition
Cmd/Ctrl+D  - Duplicate scene
```

### CSS - Descript-inspired transcript styling

```css
/* Descript-inspired transcript editor */
:root {
  --descript-bg: #1a1a1a;
  --descript-text: #e0e0e0;
  --descript-accent: #6366f1;
  --descript-speaker-1: #22c55e;
  --descript-speaker-2: #3b82f6;
  --descript-filler: #ef4444;
  --descript-selection: rgba(99, 102, 241, 0.3);
}

.descript-editor {
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 18px;
  line-height: 1.8;
  background: var(--descript-bg);
  color: var(--descript-text);
  padding: 32px;
  max-width: 800px;
  margin: 0 auto;
}

.descript-word {
  display: inline;
  cursor: pointer;
  padding: 2px 0;
  border-radius: 2px;
  transition: background 0.1s ease;
}

.descript-word:hover {
  background: var(--descript-selection);
}

.descript-word.playing {
  background: var(--descript-accent);
  color: white;
}

.descript-word.filler {
  color: var(--descript-filler);
  text-decoration: line-through;
  opacity: 0.6;
}

.descript-speaker-label {
  display: block;
  font-weight: 600;
  font-size: 14px;
  margin-top: 24px;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.descript-speaker-label.speaker-1 {
  color: var(--descript-speaker-1);
}

.descript-speaker-label.speaker-2 {
  color: var(--descript-speaker-2);
}

/* Overdub indicator */
.descript-word.overdub {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.2),
    rgba(139, 92, 246, 0.2)
  );
  border-bottom: 2px solid var(--descript-accent);
}

/* Timestamp tooltip */
.descript-word[data-timestamp]:hover::after {
  content: attr(data-timestamp);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}
```

---

## Zdroje

- [Descript Official](https://www.descript.com/)
- [Descript Review - AllAboutAI](https://www.allaboutai.com/ai-reviews/descript-ai/)
- [Descript Pricing](https://www.descript.com/pricing)
- [Descript Review 2025 - Notta](https://www.notta.ai/en/blog/descript-review)
- [Is Text-Based Editing the Future? - SkyWork](https://skywork.ai/skypage/en/Descript-AI-Review-(2025)-Is-Text-Based-Editing-the-Future/)
- [Kapwing vs Descript - Podymos](https://podymos.com/learning-center/ai-video-editing-software-an-honest-review-of-kapwing-and-descript)
