# Analýza vektorových nástrojů - PaintNook

> Srovnávací analýza vektorových nástrojů PaintNook vs. profesionální nástroje (Figma, Procreate, Adobe Illustrator)

**Datum:** 2025-12-16
**Verze:** 1.0

---

## Obsah

1. [PaintNook - Současný stav](#1-paintnook---současný-stav)
2. [Srovnání s profesionálními nástroji](#2-srovnání-s-profesionálními-nástroji)
3. [Detailní srovnávací matice](#3-detailní-srovnávací-matice)
4. [Unikátní vlastnosti](#4-unikátní-vlastnosti)
5. [Doporučení pro PaintNook](#5-doporučení-pro-paintnook)
6. [Shrnutí](#6-shrnutí)

---

## 1. PaintNook - Současný stav

### 1.1 Architektura

PaintNook implementuje **duální režim** (raster + vektor):

| Komponenta | Soubor | Řádky | Popis |
|------------|--------|-------|-------|
| **VectorManager** | `app/vector/VectorManager.js` | 1,438 | Hlavní SVG editor |
| **QuickShape** | `app/tools/QuickShape.js` | 313 | Detekce geometrických tvarů |
| **VectorUI** | `app/vector/VectorUI.js` | ~300 | UI panel pro vektorový režim |

### 1.2 Podporované vektorové nástroje

```
┌─────────────────────────────────────────────────────────────────┐
│                    PaintNook Vector Tools                        │
├─────────────────────────────────────────────────────────────────┤
│  Pen/Brush    → Quadratic Bezier paths (Q command)              │
│  Line         → SVG <line> element                              │
│  Rectangle    → SVG <rect> element                              │
│  Ellipse      → SVG <ellipse> element                           │
│  Text         → SVG <text> element                              │
│  Select       → Click/Shift+click, drag to move                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 QuickShape detekce

```javascript
// Podporované tvary s prahovými hodnotami
lineThreshold: 0.95      // Přímka - poměr délky/dráhy
circleThreshold: 0.85    // Kruh - odchylka od středu
rectangleThreshold: 0.80 // Obdélník - body na hranách
```

**Detekované tvary:** Line → Circle/Ellipse → Rectangle/Square → Triangle

### 1.4 Omezení současné implementace

| Chybějící funkce | Popis |
|------------------|-------|
| **Node editing** | Nelze editovat jednotlivé body cesty |
| **Bezier handles** | Žádné kontrolní body pro křivky |
| **Boolean operations** | Chybí union, subtract, intersect, exclude |
| **Gradient fills** | Pouze solid color |
| **Path offset** | Nelze odsadit cestu |
| **Align/Distribute** | Žádné zarovnání objektů |
| **Grouping** | Nelze seskupovat elementy |
| **Transform handles** | Selection box bez resize handles |

---

## 2. Srovnání s profesionálními nástroji

### 2.1 Figma

**Klíčová inovace:** [Vector Networks](https://help.figma.com/hc/en-us/articles/360040450213-Vector-networks)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIGMA Vector System                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  VECTOR NETWORKS (unikátní pro Figma)                           │
│  ├── Mnoho cest může sdílet jeden bod                           │
│  ├── Větvení a spojování cest                                   │
│  └── Ne-lineární topologie (vs. tradiční "řetězec bodů")        │
│                                                                  │
│  PEN TOOL                                                        │
│  ├── Click: Corner point                                        │
│  ├── Click+drag: Smooth point s Bezier handles                  │
│  ├── Alt+drag: Independent handle movement                      │
│  └── Bend tool pro úpravu křivosti                              │
│                                                                  │
│  MIRRORING OPTIONS                                               │
│  ├── No mirroring: Handles nezávislé                            │
│  ├── Mirror angle: Zrcadlení úhlu                               │
│  └── Mirror angle+length: Plné zrcadlení                        │
│                                                                  │
│  BOOLEAN OPERATIONS                                              │
│  ├── Union: Sloučení tvarů                                      │
│  ├── Subtract: Odečtení spodního tvaru                          │
│  ├── Intersect: Průnik tvarů                                    │
│  └── Exclude: Opak intersect (XOR)                              │
│                                                                  │
│  2025 UPDATE                                                     │
│  └── Mixed math pro multi-vertex editing                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Procreate

**Zaměření:** Primárně raster s chytrými vektorovými pomocníky

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROCREATE Approach                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  QUICKSHAPE (inspirace pro PaintNook)                           │
│  ├── Hold na konci tahu → automatická detekce                   │
│  ├── "Edit Shape" → kontrolní body pro úpravu                   │
│  ├── Podporované: Line, Circle, Ellipse, Rectangle, Triangle    │
│  └── Arc a Polylines                                            │
│                                                                  │
│  STREAMLINE                                                      │
│  ├── Vyhlazení tahů v reálném čase                              │
│  └── Nastavitelná úroveň stabilizace                            │
│                                                                  │
│  BRUSH ENGINE (Update 5.4)                                       │
│  ├── 180+ nových štětců                                         │
│  ├── Kyle T. Webster kolaborace                                 │
│  └── Searchable brush library                                   │
│                                                                  │
│  POZNÁMKA: Procreate NENÍ vektorový editor                      │
│  └── Vše je rasterizováno po dokončení tahu                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Adobe Illustrator

**Standard průmyslu:** Nejkomplexnější vektorový systém

```
┌─────────────────────────────────────────────────────────────────┐
│                    ILLUSTRATOR Vector System                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PEN TOOL (tradiční)                                            │
│  ├── Cubic Bezier curves (C command)                            │
│  ├── Anchor points + Direction handles                          │
│  ├── Corner vs Smooth points                                    │
│  └── Direct Selection pro node editing                          │
│                                                                  │
│  CURVATURE TOOL (od 2014)                                       │
│  ├── Zjednodušená tvorba křivek                                 │
│  ├── Click = smooth point, Double-click = corner               │
│  ├── Rubber-banding preview                                     │
│  └── Automatické směrové handles                                │
│                                                                  │
│  2024-2025 UPDATES                                               │
│  ├── Objects on Path: Objekty podél cesty                       │
│  ├── Enhanced Image Trace: Lepší vektorizace                    │
│  ├── Generative Expand: AI rozšíření artwork                    │
│  ├── Real-time Pencil preview                                   │
│  ├── Firefly Vector 3/4: AI generování                          │
│  └── Turntable: 3D rotace 2D objektů                            │
│                                                                  │
│  PATH OPERATIONS                                                 │
│  ├── Pathfinder (Boolean): Unite, Minus, Intersect, Exclude    │
│  ├── Offset Path                                                │
│  ├── Simplify Path                                              │
│  └── Smooth Tool                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailní srovnávací matice

### 3.1 Základní nástroje

| Funkce | PaintNook | Figma | Procreate | Illustrator |
|--------|:---------:|:-----:|:---------:|:-----------:|
| Pen Tool | ⚠️ Basic | ✅ Full | ❌ N/A | ✅ Full |
| Curvature Tool | ❌ | ❌ | ❌ | ✅ |
| Line Tool | ✅ | ✅ | ✅ | ✅ |
| Rectangle | ✅ | ✅ | ✅* | ✅ |
| Ellipse | ✅ | ✅ | ✅* | ✅ |
| Polygon | ✅ Tri | ✅ | ✅* | ✅ |
| Text | ⚠️ Basic | ✅ Full | ✅ | ✅ Full |

*QuickShape - rasterizováno

### 3.2 Editace cest

| Funkce | PaintNook | Figma | Procreate | Illustrator |
|--------|:---------:|:-----:|:---------:|:-----------:|
| Node Selection | ❌ | ✅ | ❌ | ✅ |
| Bezier Handles | ❌ | ✅ | ❌ | ✅ |
| Add/Remove Points | ❌ | ✅ | ❌ | ✅ |
| Convert Corner↔Smooth | ❌ | ✅ | ❌ | ✅ |
| Path Offset | ❌ | ❌ | ❌ | ✅ |
| Path Simplify | ❌ | ❌ | ❌ | ✅ |

### 3.3 Boolean operace

| Funkce | PaintNook | Figma | Procreate | Illustrator |
|--------|:---------:|:-----:|:---------:|:-----------:|
| Union | ❌ | ✅ | ❌ | ✅ |
| Subtract | ❌ | ✅ | ❌ | ✅ |
| Intersect | ❌ | ✅ | ❌ | ✅ |
| Exclude/XOR | ❌ | ✅ | ❌ | ✅ |
| Non-destructive | N/A | ✅ | N/A | ⚠️ |

### 3.4 Fill & Stroke

| Funkce | PaintNook | Figma | Procreate | Illustrator |
|--------|:---------:|:-----:|:---------:|:-----------:|
| Solid Fill | ✅ | ✅ | ✅ | ✅ |
| Linear Gradient | ❌ | ✅ | ✅ | ✅ |
| Radial Gradient | ❌ | ✅ | ❌ | ✅ |
| Pattern Fill | ❌ | ✅ | ❌ | ✅ |
| Variable Width Stroke | ❌ | ❌ | ❌ | ✅ |
| Dashed Stroke | ⚠️ Selection only | ✅ | ❌ | ✅ |

### 3.5 Transformace

| Funkce | PaintNook | Figma | Procreate | Illustrator |
|--------|:---------:|:-----:|:---------:|:-----------:|
| Move | ✅ | ✅ | ✅ | ✅ |
| Scale | ❌ | ✅ | ✅ | ✅ |
| Rotate | ❌ | ✅ | ✅ | ✅ |
| Skew/Shear | ❌ | ✅ | ✅ | ✅ |
| Flip H/V | ❌ | ✅ | ✅ | ✅ |

### 3.6 Organizace

| Funkce | PaintNook | Figma | Procreate | Illustrator |
|--------|:---------:|:-----:|:---------:|:-----------:|
| Layers | ✅ SVG groups | ✅ | ✅ | ✅ |
| Grouping | ❌ | ✅ | ✅ | ✅ |
| Components | ❌ | ✅ | ❌ | ✅ Symbols |
| Align | ❌ | ✅ | ❌ | ✅ |
| Distribute | ❌ | ✅ | ❌ | ✅ |

### 3.7 Export

| Funkce | PaintNook | Figma | Procreate | Illustrator |
|--------|:---------:|:-----:|:---------:|:-----------:|
| SVG | ✅ | ✅ | ❌ | ✅ |
| PDF | ❌ | ✅ | ✅ | ✅ |
| PNG | ✅ 1-4x | ✅ | ✅ | ✅ |
| EPS | ❌ | ❌ | ❌ | ✅ |

---

## 4. Unikátní vlastnosti

### 4.1 PaintNook - silné stránky

1. **Duální režim** - Plynulý přechod mezi raster a vektor
2. **QuickShape** - Inspirováno Procreate, funguje v obou režimech
3. **Offline-first** - PWA s plnou offline podporou
4. **Vanilla JS** - Žádné závislosti, rychlé načítání
5. **SVG native** - Přímá manipulace DOM, bez abstrakční vrstvy

### 4.2 Figma - unikátní

- **Vector Networks** - Revolučně jiný přístup k vektorům
- **Non-destructive Boolean** - Zachování původních tvarů
- **Cloud-native** - Real-time kolaborace
- **Plugin ekosystém** - Rozšiřitelnost

### 4.3 Procreate - unikátní

- **Apple Pencil integration** - Nejlepší podpora stylus
- **Brush engine** - 180+ profesionálních štětců
- **QuickShape + Edit Shape** - Unikátní workflow

### 4.4 Illustrator - unikátní

- **Curvature Tool** - Intuitivní kreslení křivek
- **AI/Firefly** - Generativní rozšíření
- **Image Trace** - Pokročilá vektorizace
- **3D effects** - Nativní 3D

---

## 5. Doporučení pro PaintNook

### 5.1 Priorita 1 - Základní vylepšení

```
┌─────────────────────────────────────────────────────────────────┐
│  1. NODE EDITING (kritické)                                     │
│     ├── Vizualizace anchor points na vybrané cestě              │
│     ├── Drag jednotlivých bodů                                  │
│     ├── Add/Remove point na cestě                               │
│     └── Convert corner ↔ smooth                                 │
│                                                                  │
│  2. BEZIER HANDLES                                               │
│     ├── Vizualizace kontrolních bodů                            │
│     ├── Drag handles pro úpravu křivky                          │
│     └── Mirror options (angle, angle+length, none)              │
│                                                                  │
│  3. TRANSFORM HANDLES                                            │
│     ├── Resize handles na selection box                         │
│     ├── Rotation handle                                         │
│     └── Shift pro zachování poměru stran                        │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Priorita 2 - Produktivita

```
┌─────────────────────────────────────────────────────────────────┐
│  4. BOOLEAN OPERATIONS                                           │
│     ├── Implementace přes paper.js nebo vlastní                 │
│     ├── Union, Subtract, Intersect, Exclude                     │
│     └── Non-destructive (grouping approach)                     │
│                                                                  │
│  5. GRADIENT FILL                                                │
│     ├── SVG linearGradient a radialGradient                     │
│     ├── UI pro editaci gradient stops                           │
│     └── Drag-to-apply na canvas                                 │
│                                                                  │
│  6. ALIGN & DISTRIBUTE                                           │
│     ├── Align left/center/right/top/middle/bottom               │
│     └── Distribute horizontally/vertically                      │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Priorita 3 - Pokročilé

```
┌─────────────────────────────────────────────────────────────────┐
│  7. CURVATURE TOOL (inspirace Illustrator)                      │
│     ├── Zjednodušené kreslení křivek                            │
│     └── Click pro smooth, double-click pro corner               │
│                                                                  │
│  8. PEN TOOL UPGRADE                                             │
│     ├── Cubic Bezier (C command) místo Quadratic (Q)            │
│     ├── Click+drag pro vytvoření handles                        │
│     └── Preview následujícího segmentu                          │
│                                                                  │
│  9. PATH OPERATIONS                                              │
│     ├── Offset path                                             │
│     ├── Simplify path                                           │
│     └── Smooth path                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Shrnutí

### Pozice PaintNook v ekosystému

```
                    PROFESIONÁLNÍ
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    Illustrator       Figma          Affinity
         │               │               │
         └───────────────┼───────────────┘
                         │
                    POKROČILÝ
                         │
         ┌───────────────┼───────────────┐
         │               │               │
      Inkscape       Vectornator     Gravit
         │               │               │
         └───────────────┼───────────────┘
                         │
                    ZÁKLADNÍ
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
 PaintNook         Canva (vector)         Pixlr
 (aktuálně)              │                    │
    │                    │                    │
    └────────────────────┼────────────────────┘
                         │
                     RASTER
                         │
         ┌───────────────┼───────────────┐
         │               │               │
     Procreate      Photoshop        Krita
         │               │               │
         └───────────────┴───────────────┘
```

### Hlavní zjištění

1. **PaintNook** nabízí solidní základy SVG editoru s unikátním duálním režimem
2. **QuickShape** je konkurenceschopná implementace inspirovaná Procreate
3. **Hlavní mezera**: Node/path editing - zásadní pro skutečnou vektorovou práci
4. **Figma Vector Networks** jsou unikátní, ale komplexní na implementaci
5. **Illustrator Curvature Tool** je dobrá inspirace pro intuitivní pen tool

### Doporučený roadmap

| Fáze | Zaměření | Náročnost |
|------|----------|-----------|
| **1** | Node editing + handles | Střední |
| **2** | Transform handles | Nízká |
| **3** | Boolean operations | Vysoká |
| **4** | Gradients | Střední |
| **5** | Curvature tool | Střední |

---

## Zdroje

- [Figma Vector Networks](https://help.figma.com/hc/en-us/articles/360040450213-Vector-networks)
- [Figma Boolean Operations](https://help.figma.com/hc/en-us/articles/360039957534-Boolean-operations)
- [Figma Pen Tool](https://help.figma.com/hc/en-us/articles/360039957634-Edit-vector-layers)
- [Illustrator Pen & Curvature](https://helpx.adobe.com/illustrator/using/drawing-pen-curvature-or-pencil.html)
- [Illustrator What's New 2025](https://helpx.adobe.com/illustrator/using/whats-new/2025.html)
- [Procreate What's New](https://procreate.com/procreate/whats-new)

---

*Tento dokument byl vytvořen jako součást analýzy pro budoucí rozvoj PaintNook vektorových nástrojů.*
