# SampleHub - Offline Sample Pack Manager

Offline-first webová aplikace pro správu sample packů, navržená jako open-source alternativa ke službám jako Splice.

## Funkce

### Klíčové vlastnosti
- **100% Offline** - Všechna data uložena lokálně v IndexedDB
- **Audio přehrávač** - Web Audio API s waveform vizualizací
- **Organizace** - Packy, oblíbené, filtry a vyhledávání
- **Import** - Podpora WAV, MP3, FLAC, AIFF, OGG
- **Automatická detekce** - BPM a tónina z audio souborů
- **PWA** - Instalovatelná jako nativní aplikace

### Podporované formáty
| Formát | Přehrávání | Import | Metadata |
|--------|------------|--------|----------|
| WAV    | ✅         | ✅     | ✅       |
| MP3    | ✅         | ✅     | ✅       |
| FLAC   | ✅         | ✅     | ✅       |
| AIFF   | ✅         | ✅     | ✅       |
| OGG    | ✅         | ✅     | ✅       |

## Architektura

```
SampleHub/
├── index.html      # Hlavní HTML
├── styles.css      # AdHub design system
├── script.js       # UI logika a event handling
├── db.js           # IndexedDB databázová vrstva
├── audio.js        # Web Audio API engine
├── sw.js           # Service Worker pro offline
├── manifest.json   # PWA manifest
└── README.md       # Dokumentace
```

### Technologie
- **Frontend**: Vanilla JavaScript (ES6+)
- **Databáze**: IndexedDB
- **Audio**: Web Audio API
- **Offline**: Service Worker + Cache API
- **Design**: AdHub design system (CSS variables)

### Datový model

```javascript
// Sample
{
  id: number,
  name: string,
  filename: string,
  format: 'wav' | 'mp3' | 'flac' | 'aiff' | 'ogg',
  size: number,
  type: 'drum' | 'bass' | 'synth' | 'vocal' | 'fx' | 'loop' | 'oneshot',
  genre: string,
  packId: number | null,
  packName: string | null,
  duration: number,
  bpm: number | null,
  key: string | null,
  favorite: boolean,
  audioBlob: Blob,
  addedAt: string
}

// Pack
{
  id: number,
  name: string,
  genre: string,
  description: string,
  createdAt: string
}
```

## Použití

### Instalace
1. Stáhněte nebo naklonujte repozitář
2. Spusťte HTTP server: `python -m http.server 8000`
3. Otevřete `http://localhost:8000/projects/samplehub/`

### Import samplů
1. Klikněte na **Import** v sidebaru
2. Přetáhněte soubory nebo klikněte pro výběr
3. Volitelně povolte automatickou detekci BPM/Key
4. Samply budou přidány do knihovny

### Organizace
- **Packy**: Seskupte samply do packů při importu
- **Oblíbené**: Označte samply hvězdičkou
- **Filtry**: Filtrujte podle žánru, typu, BPM, tóniny
- **Vyhledávání**: Hledejte podle názvu

### Klávesové zkratky
| Zkratka | Akce |
|---------|------|
| `Space` | Play/Pause |
| `Ctrl+←` | Předchozí sample |
| `Ctrl+→` | Další sample |
| `Escape` | Zavřít modal |

## Mapování analýzy

Tento projekt vychází z analýzy v `docs/sample-pack-manager-analysis.md`.

| Funkce z analýzy | Implementace | Stav |
|------------------|--------------|------|
| Multi-source Search | Lokální vyhledávání | ✅ Implementováno |
| Content Browser | Procházení kategorií | ✅ Implementováno |
| Selective Download | Import vybraných souborů | ✅ Implementováno |
| Audio Preview | Web Audio API + waveform | ✅ Implementováno |
| Metadata Tagging | Auto BPM/key detection | ✅ Implementováno |
| Local Library | IndexedDB storage | ✅ Implementováno |
| Waveform Display | Canvas visualization | ✅ Implementováno |
| DAW Drag & Drop | - | ❌ V plánu |
| Torrent podpora | - | ❌ Není (browser limitation) |
| Freesound API | - | ❌ V plánu |

### Odchylky od původní analýzy
1. **Bez torrent podpory** - Browser nepodporuje BitTorrent protokol
2. **Bez externích API** - Offline-first architektura
3. **Vanilla JS místo React** - Konzistence s AdHub projekty
4. **IndexedDB místo SQLite** - Browser-native řešení

## Rozšíření

### Možná vylepšení
- [ ] Freesound.org API integrace (online mode)
- [ ] Audio export s úpravami (trim, fade)
- [ ] Pokročilá BPM detekce (essentia.js)
- [ ] Playlists
- [ ] Tagy a štítky
- [ ] Sync s cloudem (optional)
- [ ] MIDI file support
- [ ] Audio effects preview

## Licence

MIT License - volně použitelné pro osobní i komerční účely.

## Autor

Vytvořeno jako součást AdHUB projektu.
