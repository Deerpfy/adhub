# Analyza webu: JuxtaposeJS (Knight Lab)

**URL**: https://juxtapose.knightlab.com/  
**Datum analyzy**: 13. prosince 2025

---

## Shrnuti

JuxtaposeJS je open-source JavaScript knihovna pro vytvareni before/after image slideru, vyvinuta Northwestern University Knight Lab. Nastroj je zamereny na novinare a vypravece pribehu, umoznuje porovnavani dvou obrazku prostrednictvim interaktivniho slideru nebo animovaneho GIFu. Hlavni vyhody zahrnuji nulovou zavislost na jQuery, jednoduchy workflow bez nutnosti programovani a plnou podporu dotykovych zarizeni. Mezi hlavni problemy patri zastaralost codebase (posledni vydana verze 1.0.9 z roku 2014), omezena pristupnost pro screenreadery a absence nativniho uploadovani obrazku.

---

## 1. Technicka analyza

### Pouzite technologie

| Kategorie | Technologie | Poznamka |
|-----------|-------------|----------|
| Frontend Framework | Vanilla JavaScript | Zadna zavislost na jQuery - zvysuje vykon |
| CSS Framework | Vlastni CSS (juxtapose.css) | Minimalisticky design |
| Hosting | Knight Lab CDN | cdn.knightlab.com |
| Backend (website) | Python/Flask (fabfile.py) | Pro generovani embed kodu |
| Sprava balicku | npm, Bower | `npm install juxtaposejs` |
| Licence | MPL-2.0 | Mozilla Public License |
| Repository | GitHub | NUKnightLab/juxtapose |
| Externi API | Flickr API | Pro automatickou konverzi Flickr URL |
| Externi sluzby | Dropbox API, Google API | Pro vyber souboru |
| Design System | Orangeline | Interni Knight Lab design system |
| Fonty | TypeNetwork Cloud | Webove fonty |

### Vykonnostni metriky (odhadovane)

| Metrika | Hodnota | Hodnoceni |
|---------|---------|-----------|
| Velikost JS | ~15 KB (min) | Vyborne - velmi lehky |
| Velikost CSS | ~5 KB | Vyborne |
| Zavislosti | 0 | Vyborne - zero-dependency |
| Podpora prohlizecu | IE9+ (s polyfill) | Dobre |
| Mobile support | Plna | Vyborne |

### Zjisteni

**Pozitivni**:
- Knihovna je extemne lehka bez externich zavislosti
- Pouziva nativni JavaScript event handling (addEventListener s polyfill pro stare prohlizece)
- Responzivni iframe implementace s automatickym prizpusobenim rozmeru
- Podpora touch eventu pro mobilni zarizeni
- CDN distribuce zajistuje rychle nacteni

**Negativni**:
- Posledni stabilni verze 1.2.2 je z roku 2020, verze 1.0.9 release z 2014
- Chybi moderni build system (webpack, vite)
- Pouziti IIFE patternu misto ES6 modulu
- Zadna TypeScript podpora
- 46 otevrenych issues na GitHubu
- Potencialni XSS zranitelnost v `data-credit` atributu (dokumentovana jako zamerna)

### Kod analyza (JavaScript)

```javascript
// Hlavni struktura - IIFE pattern
(function(document, window) {
    var juxtapose = {
        sliders: [],
        OPTIMIZATION_ACCEPTED: 1,
        OPTIMIZATION_WAS_CONSTRAINED: 2
    };
    // ...
    window.juxtapose = juxtapose;
    juxtapose.scanPage();
}(document, window));
```

**Klicove komponenty**:
- `Graphic` - trida pro standardni obrazky
- `FlickrGraphic` - trida pro Flickr obrazky s API integraci
- `JXSlider` - hlavni slider trida
- Polyfill pro `addEventListener` pro IE kompatibilitu

**Konfigurabilni parametry**:
```javascript
options = {
    animate: true,           // Animace posunu
    showLabels: true,        // Zobrazeni popisku
    showCredits: true,       // Zobrazeni kreditu
    makeResponsive: true,    // Responzivni chovani
    startingPosition: "50%", // Vychozi pozice slideru
    mode: 'horizontal',      // Orientace (horizontal/vertical)
    callback: null           // Callback funkce
}
```

---

## 2. Funkcni analyza

### Klicove funkce

| Funkce | Popis | Implementace | Hodnoceni |
|--------|-------|--------------|-----------|
| Image Slider | Interaktivni porovnani dvou obrazku | JavaScript drag/touch events | Vyborne |
| GIF Export | Generovani animovaneho GIFu | Server-side processing | Dobre |
| Flickr integrace | Automaticka konverze Flickr URL | API s vlastnim klicem | Dobre |
| Embed generator | Vytvoreni iframe kodu | Web formular | Vyborne |
| Labels | Popisky pro kazdy obrazek | data-label atribut | Vyborne |
| Credits | Kredity fotografu | data-credit atribut | Dobre |
| Vertical mode | Vertikalni slider orientace | CSS class + JS logika | Dobre |
| Klavesnicova navigace | Ovladani sipkami | Arrow keys (37, 39) | Zakladni |

### Uzivatelske toky

**Tok 1: Vytvoreni interaktivniho Juxtapose (bez kodu)**
1. Uzivatel navstivi https://juxtapose.knightlab.com/#make
2. Zada URL leveho obrazku
3. Zada URL praveho obrazku
4. Volitelne: prida popisky a kredity
5. Nastavi moznosti (startovni pozice, animace)
6. Zkopiruje vygenerovany iframe kod
7. Vlozi kod do sve stranky

**Tok 2: Vytvoreni GIF Juxtapose**
1. Uzivatel vybere zakladku "GIF" v rozhrani
2. Zada URL obrazku
3. Nastavi parametry animace
4. Stahne vygenerovany GIF

**Tok 3: Programaticka implementace (HTML)**
```html
<div class="juxtapose">
    <img src="before.jpg" data-label="2009" data-credit="Fotograf" />
    <img src="after.jpg" data-label="2024" data-credit="Fotograf" />
</div>
<script src="https://cdn.knightlab.com/libs/juxtapose/latest/js/juxtapose.min.js"></script>
<link rel="stylesheet" href="https://cdn.knightlab.com/libs/juxtapose/latest/css/juxtapose.css">
```

**Tok 4: Programaticka implementace (JavaScript)**
```javascript
var slider = new juxtapose.JXSlider('#container',
    [
        { src: 'before.jpg', label: '2009', credit: 'Fotograf' },
        { src: 'after.jpg', label: '2024', credit: 'Fotograf' }
    ],
    { animate: true, startingPosition: "50%" }
);
```

### Interaktivni prvky

| Prvek | Typ | Funkcnost |
|-------|-----|-----------|
| Slider handle | Drag & Drop | Tahani mysi/prstem |
| Slider area | Click | Kliknuti na pozici |
| Arrows | Visual | Indikace smeru |
| Controller | Keyboard | Focus + sipky |
| Labels | Display | Staticke popisky |

### API/Integrace

| Sluzba | Ucel | Stav |
|--------|------|------|
| Flickr API | Konverze Flickr URL na prime obrazky | Funkcni |
| Dropbox Chooser | Vyber souboru z Dropboxu | Funkcni |
| Google Picker | Vyber souboru z Google Drive | Funkcni |
| Knight Lab CDN | Distribuce knihovny | Funkcni |

### Chybove stavy

| Situace | Reakce |
|---------|--------|
| Obrazky ruznych pomeru | Console warning: "Check that the two images have the same aspect ratio" |
| Neplatna Flickr URL | Console error: "There was an error getting the picture from Flickr" |
| Chybejici obrazky | Slider se nevytvori (tiche selhani) |
| Prilis velke obrazky | Upozorneni v preview + resize doporuceni |

---

## 3. UX/Design analyza

### Vizualni hierarchie

**Webova stranka (juxtapose.knightlab.com)**:
- Ciste rozlozeni s jasnym CTA "Make a Juxtapose"
- Orangeline design system - konzistentni s ostatnimi Knight Lab nastroji
- Demo slider jako hero prvek - okamzita demonstrace funkcionality
- FAQ sekce ve spodni casti stranky

**Slider komponenta**:
- Minimalisticky design - nezasahuje do obsahu
- Sediva handle s sipkami
- Knight Lab logo v rohu (lze skryt)
- Popisky v rozich obrazku
- Kredity pod sliderem

### Barevne schema

| Prvek | Barva | Hex |
|-------|-------|-----|
| Handle | Seda | #222222 |
| Arrows | Bila | #FFFFFF |
| Labels pozadi | Cerna s pruhlednosti | rgba(0,0,0,0.7) |
| Labels text | Bila | #FFFFFF |
| Knight Lab akcent | Oranzova | (Orangeline) |

### Navigace

**Hlavni webova stranka**:
- Horizontalni menu (Knight Lab, Tools, Projects, Blog, About)
- Anchor navigace (#make, #how-to, #faq)
- Drobeckova navigace: Knight Lab > Juxtapose

**Slider komponenta**:
- Zadna navigace - single-purpose komponenta
- Focus states pro klavesnicovou navigaci

### CTA prvky

| CTA | Umisteni | Efektivita |
|-----|----------|------------|
| "Make a Juxtapose" | Hero sekce | Vysoka - jasny action |
| "Get the code" | Po vyplneni formulare | Vysoka |
| Fork on GitHub | Pata stranky | Stredni |
| Send feedback | FAQ | Nizka - skryte |

### Mikrointerakce

| Interakce | Popis | Hodnoceni |
|-----------|-------|-----------|
| Slider drag | Plynula animace s transition | Vyborne |
| Click to position | Animovany presun handle | Vyborne |
| Hover states | Minimalni | Zakladni |
| Loading state | Zadny (ceka na nacteni obrazku) | Slabe |
| Error feedback | Pouze console.warn | Slabe |

### Pristupnost (WCAG)

**Implementovane**:
- `tabindex="0"` na controlleru
- `role="slider"` ARIA role
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` atributy
- Klavesnicova navigace sipkami (37=vlevo, 39=vpravo)
- Enter/Space na obrazcich pro prepnuti (90%/10%)
- Alt texty pro obrazky (konfigurovatelne)

**Chybejici**:
- Zadny `aria-label` s popisem funkcionality
- Chybi `aria-live` pro oznameni zmen
- Nedostatecny focus indicator
- Zadna skip navigation
- Neni testovano se screenreadery

### Responzivita

| Breakpoint | Chovani |
|------------|---------|
| Desktop | Plna sirka kontejneru |
| Tablet | Automaticke prizpusobeni |
| Mobile | Touch-optimized, plna podpora swipe |
| iframe | Responzivni s aspect ratio zachovanim |

---

## 4. SEO analyza

### On-page SEO

| Prvek | Stav | Poznamka |
|-------|------|----------|
| Title tag | Dobre | "Juxtapose - Knight Lab" |
| Meta description | Dobre | Popisuje funkcionalitu |
| H1 | Dobre | Jeden hlavni nadpis |
| Alt texty | Castecne | V demo obrazcich |
| Schema markup | Chybi | Zadna strukturovana data |

### Struktura URL

| URL | Hodnoceni |
|-----|-----------|
| /index.html | Standardni |
| /#make | Anchor - SPA navigace |
| /#how-to | Anchor |
| /#faq | Anchor |

**Poznamka**: Hash-based navigace neni SEO-friendly, ale pro single-page tool je akceptovatelna.

### Open Graph / Twitter Cards

```html
<meta property="og:image" content=".../screenshot-juxtapose.jpg" />
<meta property="og:url" content="https://juxtapose.knightlab.com" />
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@knightlab">
```

**Hodnoceni**: Dobre implementovano pro socialni sdileni.

### Kvalita obsahu

| Aspekt | Hodnoceni |
|--------|-----------|
| Jasnost ucelu | Vyborne |
| How-to dokumentace | Dobre |
| FAQ | Dobre - pokryva bezne otazky |
| Priklady pouziti | Vyborne - demo na stranke |
| GitHub dokumentace | Vyborne - detailni README |

---

## 5. Pravni soulad

### GDPR

| Prvek | Stav | Poznamka |
|-------|------|----------|
| Cookie lista | Nezjisteno | Pravdepodobne Google Analytics |
| Souhlas se zpracovanim | Nezjisteno | Nutno overit primo na webu |
| Privacy Policy | Knight Lab policy | Odkazuje na Northwestern |

### Bezpecnost

| Aspekt | Stav |
|--------|------|
| HTTPS | Ano - cdn.knightlab.com |
| XSS | Dokumentovana zranitelnost v credit poli |
| CSP hlavicky | Nezjisteno |
| rel="noopener" | Ano - na externich odkazech |

**Poznamka k XSS**: Dokumentace explicitne uvadi, ze `data-credit` atribut je renderovan primo jako HTML, coz predstavuje XSS riziko. Autori toto povazuji za vhodne pro flexibilitu nastroje a prenechavaji sanitizaci na implementatorech.

### Licence a prava

| Polozka | Detail |
|---------|--------|
| Software licence | MPL-2.0 (Mozilla Public License) |
| Uziti obrazku | Nutny souhlas vlastnika |
| Komercni pouziti | Povoleno pod MPL-2.0 |
| Modifikace | Povolena s zachovanim licence |

---

## Silne stranky

1. **Nulova zavislost** - Knihovna nepotrebuje jQuery ani jine frameworky, coz zajistuje rychle nacteni a snadnou integraci
2. **Uzivatelsky pritulny** - Web generator umoznuje vytvoreni slideru bez jakychkoli programatorskych znalosti
3. **Plna mobilni podpora** - Touch eventy a swipe gesta funguji bezchybne na vsech dotykocych zarizenich
4. **Flexibilni implementace** - Tri zpusoby pouziti (iframe, HTML, JavaScript) pokryvaji ruzne urovne technickych znalosti
5. **Open source** - Aktivni GitHub repositar s 872 hvezdami a moznosti prispevatosty
6. **Flickr integrace** - Automaticka konverze Flickr URL eliminuje potrebu manualniho hledani primych URL obrazku
7. **GIF export** - Unikatni funkce pro vytvareni animovanych porovnani pro socialni site
8. **CDN distribuce** - Rychle a spolehive dorukovani knihovny pres Knight Lab CDN

---

## Slabe stranky a doporuceni

| Problem | Zavaznost | Doporuceni | Priorita |
|---------|-----------|------------|----------|
| Zastaraly codebase (2020) | Vysoka | Modernizace na ES6+, pridani TypeScript | 1 |
| Chybi nativni upload obrazku | Vysoka | Implementace drag-and-drop uploadu s docasnym ulozistem | 1 |
| Omezena pristupnost | Stredni | Pridani aria-label, aria-live, lepsich focus states | 2 |
| XSS zranitelnost | Stredni | Pridani volitelne sanitizace nebo warning v UI | 2 |
| Chybi loading state | Nizka | Pridani spinneru behem nacitani obrazku | 3 |
| Chybi error handling v UI | Nizka | Zobrazeni chyb uzivateli, ne jen do console | 3 |
| Zadna offline podpora | Nizka | Service worker pro offline funkcionalitu | 4 |
| Chybi dark mode | Nizka | CSS variables pro tematy | 4 |
| Chybi animovane prechody | Nizka | Volitelne fade/slide prechody | 4 |
| Chybi zoom funkcionalita | Nizka | Pinch-to-zoom pro detailni prohlizeni | 5 |

---

## Konkurencni porovnani

| Funkce | JuxtaposeJS | TwentyTwenty | Beer Slider | Cocoen |
|--------|-------------|--------------|-------------|--------|
| Velikost | ~15KB | ~25KB | ~10KB | ~5KB |
| jQuery zavislost | Ne | Ano | Ne | Ne |
| Touch podpora | Ano | Ano | Ano | Ano |
| Vertical mode | Ano | Ano | Ne | Ano |
| Labels | Ano | Ne | Ne | Ne |
| GIF export | Ano | Ne | Ne | Ne |
| Embed generator | Ano | Ne | Ne | Ne |
| Aktivni vyvoj | Omezeny | Omezeny | Aktivni | Omezeny |

**Zaver**: JuxtaposeJS zustava relevantni diky jednoducnosti pouziti, embed generatoru a GIF exportu, prestoze nektere alternativy nabizeji modernedsi codebase.

---

## Technicke doporuceni pro reimplementaci

### Doporucena architektura

```typescript
// Moderni TypeScript reimplementace
interface JuxtaposeOptions {
  animate?: boolean;
  showLabels?: boolean;
  showCredits?: boolean;
  startingPosition?: string;
  mode?: 'horizontal' | 'vertical';
  theme?: 'light' | 'dark';
  lazyLoad?: boolean;
}

interface ImageConfig {
  src: string;
  label?: string;
  credit?: string;
  alt?: string;
}

class JuxtaposeSlider extends HTMLElement {
  // Web Components implementace
  static get observedAttributes() {
    return ['position', 'mode'];
  }
  
  connectedCallback() { /* ... */ }
  disconnectedCallback() { /* ... */ }
}

customElements.define('juxtapose-slider', JuxtaposeSlider);
```

### CSS vylepseni

```css
/* CSS Custom Properties pro snadne temovani */
:root {
  --jx-handle-color: #222;
  --jx-handle-width: 40px;
  --jx-label-bg: rgba(0, 0, 0, 0.7);
  --jx-label-color: #fff;
  --jx-transition-duration: 0.3s;
}

/* Lepsi focus states */
.jx-controller:focus {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --jx-handle-color: #fff;
    --jx-label-bg: rgba(255, 255, 255, 0.2);
  }
}
```

### Pristupnost vylepseni

```html
<!-- Vylepsena ARIA struktura -->
<div 
  role="slider" 
  aria-label="Image comparison slider. Use left and right arrow keys to adjust."
  aria-valuenow="50"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuetext="50% showing before image"
  tabindex="0"
>
  <!-- ... -->
</div>

<!-- Screen reader announcements -->
<div aria-live="polite" class="sr-only">
  <!-- Dynamic announcements -->
</div>
```

---

## Zaver

JuxtaposeJS je solidni, zaverecny nastroj pro vytvareni before/after porovnani obrazku. Jeho hlavni silou je jednoduchost pouziti a nulova zavislost na externich knihovnach. Prestoze codebase je castecne zastaraly, knihovna stale splnuje svuj primarni ucel efektivne.

Pro pokracovani v pouzivani doporucuji:
1. Monitorovat GitHub repositar pro bezpecnostni aktualizace
2. Implementovat vlastni sanitizaci credit poli pri pouziti user-generated obsahu
3. Testovat pristupnost s realnymi assistivnimi technologiemi
4. Zvazit fork a modernizaci pro produkcni projekty vyzadujici dlouhodobou podporu

---

*Analyza provedena na zaklade verejne dostupneho zdrojoveho kodu, dokumentace a funkcni analyzy webu.*
