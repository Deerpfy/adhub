---
title: "Open-source webové alternativy k Procreate pro digitální malbu"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Open-source webové alternativy k Procreate pro digitální malbu

**Procreate dominuje iPadu, ale existuje pouze 6 skutečně open-source webových nástrojů pro digitální malbu.** Z desítky kandidátů pouze Kleki, Drawpile, miniPaint, Graphite, JS Paint a DPaint.js splňují všechna kritéria – open-source licence, běh v prohlížeči a funkce pro digitální malbu. Photopea, často zmiňovaná jako alternativa, je proprietární software. Krita nemá žádnou oficiální web verzi. Nejblíže profesionálnímu malování se přibližuje **Kleki** pro individuální práci a **Drawpile** pro kolaborativní tvorbu.

---

## Přehled kandidátů a jejich eligibilita

Mnoho často doporučovaných nástrojů nesplňuje základní požadavky této analýzy:

| Nástroj | Open-source | Web-based | Painting funkce | **Splňuje kritéria** |
|---------|:-----------:|:---------:|:---------------:|:--------------------:|
| **Kleki/Klecks** | ✅ MIT | ✅ | ✅ | ✅ **ANO** |
| **Drawpile** | ✅ GPL-3.0 | ✅ | ✅ | ✅ **ANO** |
| **miniPaint** | ✅ MIT | ✅ | ✅ | ✅ **ANO** |
| **Graphite** | ✅ Apache 2.0 | ✅ | ⚠️ Alpha | ✅ **ANO** |
| **JS Paint** | ✅ MIT | ✅ | ⚠️ Základní | ✅ **ANO** |
| **DPaint.js** | ✅ Open | ✅ | ⚠️ Pixel art | ✅ **ANO** |
| Photopea | ❌ Proprietární | ✅ | ✅ | ❌ |
| Krita | ✅ GPL | ❌ Desktop only | ✅ | ❌ |
| Excalidraw | ✅ MIT | ✅ | ❌ Whiteboard | ❌ |
| Tldraw | ❌ Placená licence | ✅ | ❌ Whiteboard | ❌ |
| Aggie.io/Magma | ❌ Proprietární | ✅ | ✅ | ❌ |
| Sumo Paint | ❌ Proprietární | ✅ | ✅ | ❌ |
| Pixilart | ❌ Proprietární | ✅ | ⚠️ Pixel art | ❌ |

---

## Hloubková analýza kvalifikovaných nástrojů

### 1. Kleki/Klecks – nejbližší alternativa k Procreate

Kleki představuje **nejvyváženější kombinaci** jednoduchosti a profesionálních funkcí mezi open-source webovými nástroji. Vývoj probíhá od roku 2010 a nástroj aktivně spravuje umělec bitbof.

**Technická specifikace:**
- **Technologie:** Canvas + WebGL rendering, TypeScript, glfx.js pro filtry, ag-psd pro PSD podporu
- **GitHub:** 303 hvězd, 103 forků, MIT licence
- **Stylus podpora:** Plná pressure sensitivity pro Wacom, Apple Pencil a další tablety
- **Offline:** Zatím bez PWA podpory (plánováno)
- **Prohlížeče:** Chrome, Firefox, Safari, Edge – cross-platform včetně iPadu

**Funkční výbava:**

| Kategorie | Dostupné funkce |
|-----------|-----------------|
| Štětce | 7 typů: Pen, Blend, Sketchy, Pixel, Chemy, Smudge, Eraser |
| Vrstvy | **16 vrstev** s blend modes (Multiply, Screen aj.) |
| Nástroje | Selection, Paint bucket, Text, Shapes, Gradient, Transform |
| Filtry | Blur, Curves, Hue/Sat, Sharpen, Noise, Distort, Lineart extraction |
| Export | **PNG, PSD** (s vrstvami), import obrázků |

**Co chybí oproti Procreate:** Animace, neomezené vrstvy, rozsáhlá knihovna štětců, tilt podpora, quickshape, reference images, timelapse. Stabilizátor tahů je přítomen, ale méně sofistikovaný.

**Ideální pro:** Hobby ilustrátory, začátečníky v digitální malbě, rychlé skici, situace vyžadující cross-platform přístup bez instalace.

---

### 2. Drawpile – profesionální kolaborativní platforma

Drawpile je **jediný open-source nástroj** kombinující plnohodnotné malířské funkce s real-time kolaborací až 50 umělců. Od verze 2.2.1 (únor 2024) funguje přímo v prohlížeči na **web.drawpile.net**.

**Technická specifikace:**
- **Technologie:** C/C++ s Qt frameworkem, Rust komponenty, WebSocket pro browser klient
- **GitHub:** ~1,200 hvězd, **10,122 commitů**, 87 přispěvatelů, GPL-3.0 licence
- **Nejnovější verze:** 2.3.0 (listopad 2025) – velmi aktivní vývoj
- **Stylus podpora:** Plná pressure sensitivity na všech platformách
- **Prohlížeče:** Chrome funguje nejlépe, podpora Firefox a Safari; vyžaduje SharedArrayBuffer

**Funkční výbava překračující konkurenci:**

Drawpile nabízí **200+ vestavěných štětců** s plným brush editorem, což je výrazně více než jakýkoli jiný open-source webový nástroj. Verze 2.3.0 přinesla **OKLAB a Pigment blend modes** pro realistické míchání barev – funkce, kterou má minimum nástrojů včetně Procreate.

- **Vrstvy:** Skupiny vrstev (složky), blend modes, alpha preserve, clipping groups, masking, alpha lock
- **Animace:** Timeline s onion skinning
- **Nástroje:** Selection, transforms, flood fill, gradient tool, lasso fill
- **Export:** OpenRaster (ORA), **PSD formát**
- **Kolaborace:** Dedikované servery, session recording, end-to-end šifrování

**Unikátní aspekt:** Projekt běží jako nezisková organizace „Drawpile gemeinnützige UG" – bez reklam, bez AI trénování na uživatelském obsahu, spravován umělci pro umělce.

**Co chybí oproti Procreate:** QuickShape, sophisticated liquify/warp, rozsáhlé transform nástroje, timelapse export. Webová verze může být pomalejší než nativní iPad aplikace.

**Ideální pro:** Art jamy, výuku kresby, týmové projekty, profesionální umělce hledající kolaborativní workflow, iOS uživatele (jediná cesta k Drawpile na iPhone/iPad).

---

### 3. miniPaint – Photoshop-lite v prohlížeči

MiniPaint cílí na **image editing workflow** podobný Photoshopu, nikoli čistě na malování. Je to nejstabilnější a nejlépe dokumentovaný projekt v této kategorii.

**Technická specifikace:**
- **GitHub:** 3,100+ hvězd, MIT licence
- **Technologie:** Čisté HTML5 Canvas + JavaScript, zero dependencies
- **Offline:** Běží lokálně bez serveru, ale není PWA

**Funkční výbava:**
- **Vrstvy:** Neomezené s transparency, merge, flatten
- **Štětce:** Pencil, brush, clone, blur, sharpen
- **Selection:** Magic wand, lasso, rectangular
- **Filtry:** Gaussian blur, emboss, sepia, vignette, Instagram filtry (1977, Aden, Clarendon...)
- **Export:** PNG, JPG, WEBP, **animated GIF**, TIFF, JSON (vrstvy)
- **Speciální:** EXIF data reading, color corrections

**Co chybí oproti Procreate:** Pressure sensitivity, brush customization, pokročilé blend modes, transform nástroje. Zaměření na photo editing, ne ilustraci.

**Ideální pro:** Rychlé úpravy obrázků v prohlížeči, uživatele preferující privacy (vše běží lokálně), základní kompozice s vrstvami.

---

### 4. Graphite – budoucnost node-based editingu

Graphite představuje **radikálně odlišný přístup** – procedurální, node-based editing kombinující vektor a raster. Projekt je v alpha fázi, ale má obrovský potenciál.

**Technická specifikace:**
- **GitHub:** **22,800+ hvězd** – největší komunita mezi kandidáty
- **Technologie:** Rust kompilovaný do WebAssembly, WebGPU podpora
- **Licence:** Apache 2.0
- **Desktopové aplikace:** Plánované na prosinec 2025

**Klíčová diferenciace:** Namísto destruktivních operací vytváříte **node graph**, kde každá operace je editovatelná kdykoliv. Změna parametru štětce retroaktivně ovlivní všechny tahy.

**Současné funkce:**
- Pen tool, shapes, gradients, fill
- Layer-based compositing s maskami a blend modes
- Non-destructive editing workflow
- Vector + raster hybrid

**Co chybí (zatím):** Plnohodnotný brush engine, heal/clone stamp tools (plánováno), stabilizátor tahů, pressure sensitivity optimalizace. Alpha status znamená nestabilitu.

**Ideální pro:** Technicky orientované umělce, vector ilustrátory, experimentátory hledající next-gen workflow. **Není vhodný** pro produkční práci kvůli alpha stavu.

---

### 5. JS Paint – nostalgický MS Paint s moderními vylepšeními

JS Paint je **pixel-perfect replika** MS Paint z Windows 95/98 s přidanými moderními funkcemi. Zaměřuje se na jednoduchost a přístupnost.

**Technická specifikace:**
- **GitHub:** 12,000+ hvězd, MIT licence
- **PWA:** Instalovatelný jako aplikace
- **Desktop:** Electron verze pro Windows/macOS/Linux

**Unikátní funkce oproti originálu:**
- **Unlimited undo/redo** (vs. 3 v originále)
- **Nelineární historie** – možnost větvení
- **Speech recognition** pro ovládání
- **Eye gaze mode** – přístupnost pro uživatele s omezenou hybností
- **Multiplayer** – experimentální kolaborace
- **26 jazykových mutací**
- Export animated GIF z historie

**Co chybí oproti Procreate:** Prakticky vše – layers, blend modes, pressure sensitivity, profesionální štětce. JS Paint je záměrně jednoduchý.

**Ideální pro:** Pixel art, rychlé skici, nostalgiky, přístupnost (speech/eye control), vzdělávací účely.

---

### 6. DPaint.js – retro pixel art specialista

DPaint.js rekonstruuje legendární **Deluxe Paint** z Amiga éry. Unikátně podporuje čtení a zápis originálních Amiga formátů.

**Technická specifikace:**
- **Technologie:** ES6 modules, HTML5 Canvas, zero dependencies
- **Speciální:** Embedded Amiga emulátor pro preview, podpora ADF disků

**Unikátní funkce:**
- **IFF ILBM** formát (Amiga standard)
- Sofistikované **dithering nástroje** pro indexed color palettes
- Color reduction s jemným ditherováním
- Touch-screen optimalizace (iPad friendly)
- Vrstvy, selections, masking, transformace

**Ideální pro:** Retro/pixel art umělce, demoscénu, práci s indexed color palettes, Amiga enthusiasty.

---

## Srovnávací matice funkcí

### Technické parametry

| Nástroj | Rendering | Pressure | Tilt | PWA/Offline | Nejlepší prohlížeč |
|---------|-----------|:--------:|:----:|:-----------:|:------------------:|
| Kleki | Canvas+WebGL | ✅ | ❌ | ❌ Plánováno | Všechny |
| Drawpile | Qt/WebSocket | ✅ | ❌ | ❌ | Chrome |
| miniPaint | Canvas | ❌ | ❌ | ❌ | Všechny |
| Graphite | WebAssembly/WebGPU | ⚠️ WIP | ❌ | ❌ | Chrome |
| JS Paint | Canvas | ⚠️ Limitovaná | ❌ | ✅ | Chrome 76+ |
| DPaint.js | Canvas | ❌ | ❌ | ❌ | Všechny |

### Malířské funkce

| Nástroj | Štětce | Vrstvy | Blend modes | PSD export | Animace |
|---------|:------:|:------:|:-----------:|:----------:|:-------:|
| **Kleki** | 7 | 16 | ✅ | ✅ | ❌ |
| **Drawpile** | **200+** | ∞ | ✅ OKLAB | ✅ | ✅ |
| miniPaint | 5 | ∞ | ⚠️ Základní | ❌ | ⚠️ GIF |
| Graphite | WIP | ✅ | ✅ | ❌ | ❌ |
| JS Paint | 3 | ❌ | ❌ | ❌ | ⚠️ GIF |
| DPaint.js | Retro | ✅ | ⚠️ | ❌ | ❌ |

### Projekt a komunita

| Nástroj | GitHub ⭐ | Licence | Poslední release | Aktivita |
|---------|:---------:|:-------:|:----------------:|:--------:|
| Kleki | 303 | MIT | Průběžně | ⚠️ Střední |
| Drawpile | ~1,200 | GPL-3.0 | 11/2025 | ✅ Vysoká |
| miniPaint | 3,100 | MIT | Průběžně | ✅ Střední |
| Graphite | **22,800** | Apache 2.0 | Průběžně | ✅ Vysoká |
| JS Paint | 12,000 | MIT | Průběžně | ⚠️ Střední |
| DPaint.js | 700+ | Open | Průběžně | ⚠️ Nízká |

---

## Srovnání s Procreate

### Co všem open-source alternativám chybí

Žádný z analyzovaných nástrojů nedosahuje úrovně Procreate v těchto oblastech:

1. **Brush engine sophistication** – Procreate má 400+ štětců s komplexní customizací (dual brush, shape dynamics, color dynamics, wet mix)
2. **Tilt support** – žádný webový nástroj nepodporuje náklon stylusu
3. **QuickShape** – automatické vyhlazování geometrických tvarů
4. **Liquify/Warp tools** – pokročilé deformace
5. **Perspective/Isometric guides** – drawing assists
6. **Timelapse recording** – automatický export procesu
7. **Color Harmony** – pokročilé color management nástroje
8. **Reference companion** – split-screen reference images

### Co open-source alternativy nabízejí navíc

| Výhoda | Nástroje |
|--------|----------|
| **Cross-platform** – běží všude | Všechny |
| **Bez jednorázové platby** | Všechny (Procreate $12.99) |
| **Kolaborace v reálném čase** | Drawpile |
| **Node-based editing** | Graphite |
| **PSD export s vrstvami** | Kleki, Drawpile |
| **Self-hosting možnost** | Všechny |
| **Přístupnost (speech, eye-gaze)** | JS Paint |
| **OKLAB color blending** | Drawpile |

---

## Doporučení podle use case

### 🎨 Hobby ilustrátor (nejlepší celkový zážitek)
**→ Kleki** 
- Nejlépe vyvážená kombinace jednoduchosti a funkcí
- Pressure sensitivity, 16 vrstev, PSD export
- Žádná registrace, okamžitý start

### 👥 Týmová tvorba a výuka
**→ Drawpile**
- Jediná open-source volba s profesionální kolaborací
- 200+ štětců, OKLAB blending, animace
- Webová verze funguje i na iPad

### 🖼️ Rychlé úpravy a kompozice
**→ miniPaint**
- Photoshop-like workflow
- Nejvíce filtrů a color correction
- Běží 100% lokálně (privacy)

### 🔮 Experimentátoři a tech-savvy umělci
**→ Graphite** (s výhradou alpha stavu)
- Revoluční node-based přístup
- Největší komunita a momentum
- Sledujte vývoj pro budoucí produkční použití

### 👾 Pixel art a retro estetika
**→ JS Paint** nebo **DPaint.js**
- JS Paint pro jednoduchost a přístupnost
- DPaint.js pro sofistikované indexed color a dithering

### 🏢 Profesionální produkce
**→ Žádná plně nevyhovuje**
- Pro profesionální práci zůstává Procreate (iPad) nebo Krita (desktop) lepší volbou
- Drawpile se nejvíce blíží, ale webová verze má limity
- Pokud je open-source nutností a web není podmínkou: **Krita** (GPL, desktop)

---

## Závěrečné hodnocení

Open-source webových alternativ k Procreate existuje **překvapivě málo**. Z původních 12+ kandidátů pouze 6 skutečně splňuje kritéria, a z nich pouze **Kleki a Drawpile** nabízejí reálně použitelný painting workflow.

**Kleki** vyniká jako nejpřístupnější volba pro individuální tvorbu s pressure sensitivity a PSD exportem. **Drawpile** dominuje v kolaborativním prostředí s profesionálními funkcemi převyšujícími ostatní kandidáty. **Graphite** představuje nejzajímavější budoucnost, ale jeho alpha stav ho zatím diskvalifikuje pro produkční práci.

Důležité zjištění: **Photopea není open-source** (pouze issue tracker na GitHubu) a **Krita nemá oficiální web verzi** – dva mýty, které tato analýza vyvrací. Tldraw změnil licenční model a vyžaduje placenou licenci pro produkční nasazení.

Pro umělce hledající kompromis mezi otevřeností a funkcionalitou doporučuji kombinaci **Kleki pro rychlé skici v prohlížeči** a **Krita jako desktop backup** pro komplexnější projekty – obojí MIT/GPL, obojí aktivně vyvíjené, dohromady pokrývají většinu potřeb digitálního ilustrátora.