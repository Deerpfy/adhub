---
title: "JuxtaposeJS - Analyza externich zavislosti pro offline PWA"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# JuxtaposeJS - Analyza externich zavislosti pro offline PWA

**Datum:** 13. prosince 2025
**Zdroj:** Analyza_JuxtaposeJS.md

---

## Projekt

| Polozka | Hodnota |
|---------|---------|
| Nazev | JuxtaposeJS (Before/After Image Slider) |
| Autor | Northwestern University Knight Lab |
| Licence | MPL-2.0 |
| Technologie | Vanilla JavaScript, vlastni CSS |
| Zavislosti | Zero-dependency (zadny jQuery) |

---

## Externi zavislosti

### 1. CDN knihovny (kriticke)

| Soubor | URL | Velikost |
|--------|-----|----------|
| juxtapose.min.js | cdn.knightlab.com/libs/juxtapose/latest/js/juxtapose.min.js | ~15 KB |
| juxtapose.css | cdn.knightlab.com/libs/juxtapose/latest/css/juxtapose.css | ~5 KB |

### 2. Externi API sluzby

| Sluzba | Typ | Offline reseni |
|--------|-----|----------------|
| Flickr API | REST API | Odstranit nebo nahradit lokalnim nahranim |
| Dropbox Chooser | JavaScript SDK | Nahradit `<input type="file">` |
| Google Picker API | JavaScript SDK | Nahradit `<input type="file">` |
| Knight Lab GIF backend | Server-side | Nahradit client-side gif.js |

### 3. Fonty a design

| Zavislost | Zdroj | Odhad velikosti |
|-----------|-------|-----------------|
| TypeNetwork Cloud fonty | cloud.typenetwork.com | ~50-150 KB |
| Orangeline design system | Knight Lab CDN | ~20-50 KB |

### 4. WASM / AI modely

- Zadne WASM soubory
- Zadne AI modely

---

## Aktualni stav (vyzaduje internet)

1. **Nacteni knihovny** - cdn.knightlab.com
2. **Nacteni obrazku** - externi URL
3. **Flickr integrace** - API volani
4. **Cloud file pickers** - Dropbox/Google SDK
5. **GIF export** - server-side Knight Lab
6. **Webove fonty** - TypeNetwork Cloud

---

## Cilovy stav: Plne offline po prvnim nacteni

### Priorita 1 - Kriticke (den 1)

```
/assets/
  /js/
    juxtapose.min.js        (~15 KB)
  /css/
    juxtapose.css           (~5 KB)
  /fonts/
    [self-hosted fonty]     (~100 KB)
```

### Priorita 2 - Funkcni (den 2)

- Service Worker pro caching
- Manifest.json pro PWA instalaci
- Nahradit cloud file pickers lokalnim `<input type="file">`
- Odstranit Flickr API zavislost

### Priorita 3 - Rozsirene (den 3)

- Client-side GIF generovani (gif.js ~50 KB + worker)
- IndexedDB pro ukladani projektu
- Drag & drop upload obrazku

---

## Celkova velikost offline bundlu

| Komponenta | Velikost |
|------------|----------|
| JuxtaposeJS (JS + CSS) | ~20 KB |
| Lokalni fonty | ~100-150 KB |
| GIF export (gif.js) | ~50-80 KB |
| PWA shell | ~5 KB |
| **CELKEM** | **~175-255 KB** |

---

## Poznamky

### Vyhody pro offline prevod

- Zero-dependency - zadny jQuery ani externi knihovny
- Maly footprint - pouze ~20 KB
- IIFE pattern - funguje bez bundleru
- Responzivni - plna mobilni podpora

### Vyzvy

1. **GIF export** - nutno reimplementovat client-side
2. **Flickr API** - nutno odstranit nebo nahradit
3. **Zastaraly codebase** - posledni verze 2020

### Doporuceni

Pro plnou offline funkcionalitu doporucuji:
1. Stazeni knihovny lokalne (npm install juxtaposejs)
2. Self-hosting fontu
3. Implementace Service Workeru s cache-first strategii
4. Nahrazeni externich API lokalnimi alternativami

---

*Vygenerovano automaticky z Analyza_JuxtaposeJS.md*
