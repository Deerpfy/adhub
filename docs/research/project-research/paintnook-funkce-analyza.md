---
title: "PaintNook - Komplexni analyza funkcionalit pro webovou aplikaci"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# PaintNook - Komplexni analyza funkcionalit pro webovou aplikaci

## Metadata analyzy

| Parametr | Hodnota |
|----------|---------|
| Datum analyzy | 2025-12-15 |
| Pocet analyzovanych zdroju | 5 PDF dokumentu |
| Cilova aplikace | PaintNook - webovy design/graficky editor |
| Zamereni | Web design, tisk, hry, pixel art |

---

# CAST I: ZAKLADNI NASTROJE EDITORU

## Kapitola 1: Vektorova grafika a tvary

### 1.1 Zakladni geometricke tvary

**Popis funkce:**
Uzivatel musi mit moznost rychle vytvaret zakladni geometricke tvary bez nutnosti je kreslit rucne.

**Pozadovane prvky:**
- Obdelnik/ctverec s nastavitelnym zaoblenim rohu
- Kruh/elipsa
- Polygon (trojuhelnik, petihran, sestiuhelnik atd.)
- Hvezda s nastavitelnym poctem casu
- Cara a sipka
- Specialni tvary pro UI (squircle pro iOS styl)

**Technicka implementace:**

```typescript
interface ShapeConfig {
  type: 'rectangle' | 'ellipse' | 'polygon' | 'star' | 'line' | 'squircle';
  width: number;
  height: number;
  cornerRadius?: number | number[]; // podpora ruzneho zaobleni pro kazdy roh
  sides?: number; // pro polygon
  innerRadius?: number; // pro hvezdu
  strokeWidth?: number;
  strokeColor?: string;
  fillColor?: string;
}

class ShapeFactory {
  static createShape(config: ShapeConfig): SVGElement {
    switch(config.type) {
      case 'squircle':
        // iOS zaoblene rohy pouzivaji superelipsu, ne kruhovy oblouk
        return this.createSquircle(config);
      case 'polygon':
        return this.createPolygon(config.sides, config.width, config.height);
      // ...
    }
  }
  
  private static createSquircle(config: ShapeConfig): SVGElement {
    // Squircle pouziva plynulejsi krivku nez standardni border-radius
    // Vzorec: |x/a|^n + |y/b|^n = 1, kde n ~ 4-5 pro iOS styl
    const n = 4.5;
    // Generovat path pomoci parametricke krivky
  }
}
```

**CSS pro squircle (alternativa):**
```css
.squircle {
  /* iOS-style zaobleni nelze dosahnout pouze border-radius */
  /* Pouzit SVG clip-path nebo canvas */
  clip-path: url(#squircle-path);
}
```

**Zdroj:** Hindtech syllabus - "Squircle buttons with ios rounded courses in Figma"

---

### 1.2 Booleovske operace s tvary

**Popis funkce:**
Kombinovani a modifikace tvaru pomoci mnozinových operaci - esencialni pro tvorbu komplexnich ikon a grafiky.

**Pozadovane operace:**
- **Union (sjednoceni)** - slouci tvary do jednoho
- **Subtract (odecteni)** - odecte jeden tvar od druheho
- **Intersect (prunik)** - zachova pouze prekryv
- **Exclude (vylouceni)** - zachova vse krome prekryvu
- **Flatten** - prevede vysledek na jednoduchou cestu

**Technicka implementace:**

```typescript
interface BooleanOperation {
  type: 'union' | 'subtract' | 'intersect' | 'exclude';
  shapes: Path[];
  resultMode: 'compound' | 'flatten';
}

class PathBoolean {
  // Pouzit knihovnu paper.js nebo vlastni implementaci Weiler-Atherton algoritmu
  static operate(op: BooleanOperation): Path {
    const pathA = op.shapes[0];
    const pathB = op.shapes[1];
    
    switch(op.type) {
      case 'union':
        return paper.Path.unite(pathA, pathB);
      case 'subtract':
        return paper.Path.subtract(pathA, pathB);
      case 'intersect':
        return paper.Path.intersect(pathA, pathB);
      case 'exclude':
        return paper.Path.exclude(pathA, pathB);
    }
  }
}
```

**Rozdil Union vs Flatten:**
- **Union**: Zachovava editovatelnost - tvary lze rozdelit zpet
- **Flatten**: Nevratna operace - vytvori jednu finalni cestu

**Zdroj:** Hindtech syllabus - "Boolean Union Subtract Intersect Exclude Pathfinder in Figma"

---

### 1.3 Pen Tool a editace cest

**Popis funkce:**
Profesionalni nastroj pro kresleni beziérovych krivek s moznosti presne editace kontrolnich bodu.

**Pozadovane prvky:**
- Pridavani kotevnich bodu
- Prevod mezi ostrymi a hladkymi body
- Editace ricidich bodu (handles)
- Zjednoduseni cesty (reduce points)
- Uzavreni cesty

**Technicka implementace:**

```typescript
interface AnchorPoint {
  position: Point;
  handleIn?: Point;  // ricidi bod pred
  handleOut?: Point; // ricidi bod za
  type: 'corner' | 'smooth' | 'symmetric';
}

interface PathData {
  points: AnchorPoint[];
  closed: boolean;
}

class PenTool {
  private currentPath: PathData;
  
  addPoint(position: Point, type: 'corner' | 'smooth'): void {
    const point: AnchorPoint = {
      position,
      type,
      handleIn: type === 'smooth' ? this.calculateHandle(position, 'in') : undefined,
      handleOut: type === 'smooth' ? this.calculateHandle(position, 'out') : undefined
    };
    this.currentPath.points.push(point);
  }
  
  convertPointType(index: number, newType: 'corner' | 'smooth' | 'symmetric'): void {
    const point = this.currentPath.points[index];
    if (newType === 'corner') {
      point.handleIn = undefined;
      point.handleOut = undefined;
    } else if (newType === 'symmetric') {
      // Handles jsou zrcadlove
      const handleLength = this.getAverageHandleLength(point);
      point.handleOut = this.mirrorHandle(point.handleIn, handleLength);
    }
    point.type = newType;
  }
}
```

**Zdroj:** Path Unbound syllabus - "Adobe Illustrator", Hindtech - "Drawing tips and tricks"

---

## Kapitola 2: Barevny system a Color Theory

### 2.1 Barevne modely a konverze

**Popis funkce:**
Aplikace musi podporovat vice barevnych modelu a umoznovat jejich vzajemnou konverzi pro ruzne vyuziti (web, tisk, hry).

**Podporovane barevne modely:**
- **RGB** - pro digitalni zobrazeni (web, hry)
- **HSB/HSL** - intuitivni pro design (odstin, sytost, jas)
- **CMYK** - pro tiskovou pripravu
- **HEX** - webovy standard
- **LAB** - perceptualne uniformni prostor

**Technicka implementace:**

```typescript
interface ColorRGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a?: number; // 0-1 alpha
}

interface ColorHSB {
  h: number; // 0-360 stupnu (odstin)
  s: number; // 0-100% (sytost)
  b: number; // 0-100% (jas)
  a?: number;
}

interface ColorCMYK {
  c: number; // 0-100%
  m: number; // 0-100%
  y: number; // 0-100%
  k: number; // 0-100%
}

class ColorConverter {
  static rgbToHsb(rgb: ColorRGB): ColorHSB {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    let h = 0;
    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    
    const s = max === 0 ? 0 : Math.round((delta / max) * 100);
    const brightness = Math.round(max * 100);
    
    return { h, s, b: brightness, a: rgb.a };
  }
  
  static rgbToCmyk(rgb: ColorRGB): ColorCMYK {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    
    const k = 1 - Math.max(r, g, b);
    const c = (1 - r - k) / (1 - k) || 0;
    const m = (1 - g - k) / (1 - k) || 0;
    const y = (1 - b - k) / (1 - k) || 0;
    
    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100)
    };
  }
}
```

**Zdroj:** Hindtech syllabus - "How to use colour in Figma", akademicky clanek - HSB color system practicke ulohy

---

### 2.2 Generovani barevnych palet

**Popis funkce:**
Automaticke generovani harmonickych barevnych palet na zaklade teorie barev.

**Typy palet:**
- **Complementary** - doplnkove barvy (protilehle na kruhu)
- **Analogous** - sousedni barvy
- **Triadic** - tri barvy rovnomerne rozlozene
- **Split-complementary** - doplnkova + sousedni
- **Tetradic/Square** - ctyri barvy
- **Monochromatic** - odstiny jedne barvy

**Technicka implementace:**

```typescript
type PaletteType = 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic' | 'monochromatic';

class PaletteGenerator {
  static generate(baseColor: ColorHSB, type: PaletteType, count: number = 5): ColorHSB[] {
    const palette: ColorHSB[] = [baseColor];
    
    switch(type) {
      case 'complementary':
        palette.push({
          h: (baseColor.h + 180) % 360,
          s: baseColor.s,
          b: baseColor.b
        });
        break;
        
      case 'analogous':
        // Sousedni barvy v rozmezi 30 stupnu
        for (let i = 1; i <= count - 1; i++) {
          const offset = (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * 30;
          palette.push({
            h: (baseColor.h + offset + 360) % 360,
            s: baseColor.s,
            b: baseColor.b
          });
        }
        break;
        
      case 'triadic':
        palette.push(
          { h: (baseColor.h + 120) % 360, s: baseColor.s, b: baseColor.b },
          { h: (baseColor.h + 240) % 360, s: baseColor.s, b: baseColor.b }
        );
        break;
        
      case 'monochromatic':
        // Ruzne urovne sytosti a jasu
        for (let i = 1; i < count; i++) {
          palette.push({
            h: baseColor.h,
            s: Math.max(10, baseColor.s - i * 15),
            b: Math.min(100, baseColor.b + i * 10)
          });
        }
        break;
    }
    
    return palette;
  }
}
```

**Psychologie barev - tabulka emoci:**

| Barva | Emoce/Nalada | Vhodne pouziti |
|-------|--------------|----------------|
| Cervena | Energie, vášen, naléhavost | CTA tlacitka, varovani |
| Modra | Duvera, klid, profesionalita | Korporatni design, finance |
| Zelena | Rust, priroda, zdravi | Eko produkty, uspech |
| Zluta | Optimismus, pozornost | Upozorneni, akcent |
| Oranzova | Kreativita, pratelstvi | Mlada cilova skupina |
| Fialova | Luxus, tajemno, kreativita | Premium produkty |

**Zdroj:** Path Unbound - "Color Theory", Hindtech - "Understanding the Mood of Your Colour Palette", PW Skills - "Colour in User Interface Design"

---

### 2.3 Eyedropper a vzorkovani barev

**Popis funkce:**
Nastroj pro vyber barvy z libovolneho mista na platne nebo z nahraneno obrazku.

**Technicka implementace:**

```typescript
class EyedropperTool {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  async pickColorFromScreen(): Promise<ColorRGB> {
    // Pouzit EyeDropper API (Chrome 95+)
    if ('EyeDropper' in window) {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      return this.hexToRgb(result.sRGBHex);
    }
    // Fallback pro starsi prohlizece
    return this.pickFromCanvas();
  }
  
  pickColorAtPoint(x: number, y: number, sampleSize: number = 1): ColorRGB {
    const imageData = this.ctx.getImageData(
      x - Math.floor(sampleSize / 2),
      y - Math.floor(sampleSize / 2),
      sampleSize,
      sampleSize
    );
    
    // Prumer barev v oblasti pro lepsi presnost
    let r = 0, g = 0, b = 0;
    const pixelCount = sampleSize * sampleSize;
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      r += imageData.data[i];
      g += imageData.data[i + 1];
      b += imageData.data[i + 2];
    }
    
    return {
      r: Math.round(r / pixelCount),
      g: Math.round(g / pixelCount),
      b: Math.round(b / pixelCount)
    };
  }
}
```

**Zdroj:** Hindtech syllabus - "Color Inspiration and the eyedropper in Figma"

---

### 2.4 Gradienty

**Popis funkce:**
Tvorba linearnich, radialnich a uhlových prechodu s podporou vice barevnych zastavek.

**Typy gradientu:**
- **Linear** - linearni prechod
- **Radial** - kruhovy prechod
- **Angular/Conic** - uhlovy prechod
- **Diamond** - diamantovy tvar

**Technicka implementace:**

```typescript
interface GradientStop {
  color: ColorRGB;
  position: number; // 0-1
}

interface Gradient {
  type: 'linear' | 'radial' | 'angular' | 'diamond';
  stops: GradientStop[];
  angle?: number; // pro linear
  center?: Point; // pro radial/angular
  focalPoint?: Point; // pro radial s offset stredem
}

class GradientEditor {
  private stops: GradientStop[] = [];
  
  addStop(color: ColorRGB, position: number): void {
    this.stops.push({ color, position });
    this.stops.sort((a, b) => a.position - b.position);
  }
  
  removeStop(index: number): void {
    if (this.stops.length > 2) {
      this.stops.splice(index, 1);
    }
  }
  
  toCSSLinear(angle: number): string {
    const stopsCSS = this.stops
      .map(s => `rgba(${s.color.r},${s.color.g},${s.color.b},${s.color.a ?? 1}) ${s.position * 100}%`)
      .join(', ');
    return `linear-gradient(${angle}deg, ${stopsCSS})`;
  }
  
  toCSSRadial(shape: 'circle' | 'ellipse' = 'circle'): string {
    const stopsCSS = this.stops
      .map(s => `rgba(${s.color.r},${s.color.g},${s.color.b},${s.color.a ?? 1}) ${s.position * 100}%`)
      .join(', ');
    return `radial-gradient(${shape}, ${stopsCSS})`;
  }
}
```

**Zdroj:** Hindtech syllabus - "How to make gradients in Figma"

---

## Kapitola 3: Typografie

### 3.1 Fontovy system

**Popis funkce:**
Komplexni prace s pismy vcetne parování fontu, velikostnich hierarchii a textovych stylu.

**Kategorie fontu:**
- **Serif** - patky (Times, Georgia) - tradicni, formalni
- **Sans-serif** - bezpatkove (Arial, Helvetica) - moderni, cisty
- **Monospace** - neproporcionalni (Courier) - kod, tabulky
- **Display/Decorative** - dekorativni - nadpisy, loga
- **Handwriting/Script** - rukopisne - osobni dotek

**Doporucene parovani fontu:**

| Nadpis | Telo textu | Pouziti |
|--------|------------|---------|
| Playfair Display | Source Sans Pro | Elegantni |
| Montserrat | Open Sans | Moderni |
| Oswald | Lato | Odvazne |
| Merriweather | Roboto | Citelne |

**Technicka implementace:**

```typescript
interface FontStyle {
  family: string;
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style: 'normal' | 'italic';
  size: number;
  lineHeight: number | 'auto';
  letterSpacing: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

interface TextStyle {
  name: string;
  font: FontStyle;
  color: ColorRGB;
  paragraphSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

// Preddefinovane typograficke styly
const typographyScale = {
  h1: { size: 48, lineHeight: 56, weight: 700 },
  h2: { size: 36, lineHeight: 44, weight: 700 },
  h3: { size: 28, lineHeight: 36, weight: 600 },
  h4: { size: 24, lineHeight: 32, weight: 600 },
  h5: { size: 20, lineHeight: 28, weight: 500 },
  h6: { size: 18, lineHeight: 24, weight: 500 },
  body1: { size: 16, lineHeight: 24, weight: 400 },
  body2: { size: 14, lineHeight: 20, weight: 400 },
  caption: { size: 12, lineHeight: 16, weight: 400 },
  overline: { size: 10, lineHeight: 14, weight: 500, textTransform: 'uppercase' }
};
```

**Pravidlo 15-20 znaku pro UI:**
Podle kognitivni psychologie - izolované slovo (do 20 znaku) se cte pomaleji nez slovo v kontextu. Task-oriented interface (tlacitka, menu) proto vyzaduje peclive vyber fontu kvuli absenci kontextu.

**Zdroj:** Path Unbound - "Typography", Hindtech - "How Typography Determines Readability", akademicky clanek - psychologie cteni

---

### 3.2 Text Styles (Character Styles)

**Popis funkce:**
Centralizovana sprava textovych stylu pro konzistenci naprici celym projektem.

**Technicka implementace:**

```typescript
class TextStyleManager {
  private styles: Map<string, TextStyle> = new Map();
  
  createStyle(name: string, style: TextStyle): void {
    this.styles.set(name, style);
  }
  
  applyStyle(textElement: TextElement, styleName: string): void {
    const style = this.styles.get(styleName);
    if (style) {
      textElement.fontFamily = style.font.family;
      textElement.fontSize = style.font.size;
      textElement.fontWeight = style.font.weight;
      textElement.lineHeight = style.font.lineHeight;
      textElement.letterSpacing = style.font.letterSpacing;
      textElement.color = style.color;
    }
  }
  
  updateStyle(name: string, updates: Partial<TextStyle>): void {
    const existing = this.styles.get(name);
    if (existing) {
      this.styles.set(name, { ...existing, ...updates });
      // Propagovat zmeny na vsechny elementy pouzivajici tento styl
      this.propagateStyleUpdate(name);
    }
  }
  
  exportStyles(): Record<string, TextStyle> {
    return Object.fromEntries(this.styles);
  }
}
```

**Zdroj:** Hindtech syllabus - "How to make Character Styles in Figma", "Creating Text Styles"

---

### 3.3 Typesetting a paragrafove vlastnosti

**Popis funkce:**
Pokrocile nastaveni pro sazbu velkych bloku textu - duležite pro tiskove materialy a dokumenty.

**Nastavitelne vlastnosti:**
- Odsazeni prvniho radku (indent)
- Mezery mezi odstavci (spacing before/after)
- Sirka sloupce a pocet sloupcu
- Zalamovani slov (hyphenation)
- Odsazeni odrážek (bullet indent)
- Vdovy a sirotci (widows/orphans)

**Technicka implementace:**

```typescript
interface ParagraphStyle {
  textIndent: number;
  marginTop: number;
  marginBottom: number;
  columns?: number;
  columnGap?: number;
  hyphenation: boolean;
  widowsOrphans: number; // minimalni pocet radku
  listStyle?: {
    type: 'none' | 'disc' | 'decimal' | 'custom';
    customBullet?: string;
    indent: number;
  };
}

class TextBlock {
  private paragraphs: Paragraph[] = [];
  
  applyColumnLayout(columns: number, gap: number): void {
    // CSS Multi-column layout
    this.element.style.columnCount = columns.toString();
    this.element.style.columnGap = `${gap}px`;
  }
  
  enableHyphenation(language: string = 'cs'): void {
    this.element.style.hyphens = 'auto';
    this.element.lang = language;
  }
  
  preventWidowsOrphans(minLines: number): void {
    // CSS orphans a widows
    this.element.style.orphans = minLines.toString();
    this.element.style.widows = minLines.toString();
  }
}
```

**Zdroj:** Path Unbound - "Typesetting - the art of crafting text into clean, beautiful paragraphs"

---

## Kapitola 4: Layout a Gridy

### 4.1 Grid system

**Popis funkce:**
Flexibilni mrížkový system pro presne rozmisteni prvku - zaklad responzivniho designu.

**Typy gridu:**
- **Column grid** - sloupcova mrizka (nejcastejsi pro web)
- **Modular grid** - modulova mrizka (radky i sloupce)
- **Baseline grid** - zarovnani na zakladovou linii textu
- **Custom grid** - vlastni definice

**Technicka implementace:**

```typescript
interface GridConfig {
  type: 'column' | 'modular' | 'baseline' | 'custom';
  columns?: number;
  rows?: number;
  gutter: number; // mezera mezi sloupci
  margin: number; // okraje
  columnWidth?: number | 'auto';
  rowHeight?: number;
  baselineHeight?: number; // pro baseline grid
}

class GridSystem {
  private config: GridConfig;
  private containerWidth: number;
  
  constructor(config: GridConfig, containerWidth: number) {
    this.config = config;
    this.containerWidth = containerWidth;
  }
  
  calculateColumnWidth(): number {
    if (this.config.columnWidth === 'auto' || !this.config.columnWidth) {
      const availableWidth = this.containerWidth - (2 * this.config.margin);
      const gutterSpace = (this.config.columns! - 1) * this.config.gutter;
      return (availableWidth - gutterSpace) / this.config.columns!;
    }
    return this.config.columnWidth;
  }
  
  getColumnPosition(columnIndex: number): number {
    const colWidth = this.calculateColumnWidth();
    return this.config.margin + (columnIndex * (colWidth + this.config.gutter));
  }
  
  snapToGrid(x: number, y: number): { x: number; y: number } {
    const colWidth = this.calculateColumnWidth();
    const snappedX = Math.round(x / (colWidth + this.config.gutter)) * (colWidth + this.config.gutter);
    
    let snappedY = y;
    if (this.config.baselineHeight) {
      snappedY = Math.round(y / this.config.baselineHeight) * this.config.baselineHeight;
    }
    
    return { x: snappedX + this.config.margin, y: snappedY };
  }
  
  renderGridOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.2)';
    ctx.lineWidth = 1;
    
    const colWidth = this.calculateColumnWidth();
    
    for (let i = 0; i < this.config.columns!; i++) {
      const x = this.getColumnPosition(i);
      ctx.fillStyle = 'rgba(255, 0, 255, 0.1)';
      ctx.fillRect(x, 0, colWidth, ctx.canvas.height);
    }
  }
}
```

**Bootstrap breakpointy pro responzivitu:**

| Breakpoint | Prefix | Sirka | Sloupce |
|------------|--------|-------|---------|
| Extra small | xs | <576px | 4 |
| Small | sm | >=576px | 6 |
| Medium | md | >=768px | 8 |
| Large | lg | >=992px | 12 |
| Extra large | xl | >=1200px | 12 |
| XXL | xxl | >=1400px | 12 |

**Zdroj:** Path Unbound - "Layout and Grids", Hindtech - "How to work with Columns and Grid in Figma"

---

### 4.2 Constraints a Responsive Design

**Popis funkce:**
Definovani pravidel pro chovani prvku pri zmene velikosti rodicovskeho kontejneru.

**Typy omezeni:**
- **Fixed** - zachovava absolutni pozici/velikost
- **Scale** - proporcionalne se skaluje
- **Left/Right/Top/Bottom** - kotvi k dane strane
- **Left and Right** - roztahuje se horizontalne
- **Center** - zustava vycentrovano

**Technicka implementace:**

```typescript
interface Constraints {
  horizontal: 'left' | 'right' | 'left-right' | 'center' | 'scale';
  vertical: 'top' | 'bottom' | 'top-bottom' | 'center' | 'scale';
}

class ResponsiveElement {
  private element: HTMLElement;
  private constraints: Constraints;
  private parentSize: { width: number; height: number };
  private initialBounds: DOMRect;
  
  applyConstraints(newParentSize: { width: number; height: number }): void {
    const widthRatio = newParentSize.width / this.parentSize.width;
    const heightRatio = newParentSize.height / this.parentSize.height;
    
    let newLeft: number, newWidth: number, newTop: number, newHeight: number;
    
    // Horizontalni omezeni
    switch (this.constraints.horizontal) {
      case 'left':
        newLeft = this.initialBounds.left;
        newWidth = this.initialBounds.width;
        break;
      case 'right':
        newLeft = newParentSize.width - (this.parentSize.width - this.initialBounds.left);
        newWidth = this.initialBounds.width;
        break;
      case 'left-right':
        newLeft = this.initialBounds.left;
        newWidth = newParentSize.width - this.initialBounds.left - 
                   (this.parentSize.width - this.initialBounds.right);
        break;
      case 'center':
        newWidth = this.initialBounds.width;
        newLeft = (newParentSize.width - newWidth) / 2;
        break;
      case 'scale':
        newLeft = this.initialBounds.left * widthRatio;
        newWidth = this.initialBounds.width * widthRatio;
        break;
    }
    
    // Aplikovat nove hodnoty
    this.element.style.left = `${newLeft}px`;
    this.element.style.width = `${newWidth}px`;
    // ... obdobne pro vertical
  }
}
```

**Zdroj:** Hindtech syllabus - "How to use constraints in figma", "Constraints Exercise Solution"

---

### 4.3 Auto Layout

**Popis funkce:**
Automaticke usporadani prvku v radku nebo sloupci s dynamickym prizpusobenim obsahu - ekvivalent CSS Flexbox.

**Vlastnosti Auto Layout:**
- Smer (horizontalni/vertikalni)
- Mezery mezi prvky (gap)
- Padding (vnitrni odsazeni)
- Zarovnani (align)
- Distribuce (space-between, packed)
- Wrap (zalamovani)

**Technicka implementace:**

```typescript
interface AutoLayoutConfig {
  direction: 'horizontal' | 'vertical';
  gap: number;
  padding: { top: number; right: number; bottom: number; left: number };
  alignment: 'start' | 'center' | 'end' | 'stretch';
  distribution: 'packed' | 'space-between';
  wrap: boolean;
  resizing: 'hug' | 'fill' | 'fixed';
}

class AutoLayoutContainer {
  private config: AutoLayoutConfig;
  private children: HTMLElement[] = [];
  
  toCSSFlexbox(): Record<string, string> {
    return {
      display: 'flex',
      flexDirection: this.config.direction === 'horizontal' ? 'row' : 'column',
      gap: `${this.config.gap}px`,
      padding: `${this.config.padding.top}px ${this.config.padding.right}px ${this.config.padding.bottom}px ${this.config.padding.left}px`,
      alignItems: this.mapAlignment(this.config.alignment),
      justifyContent: this.config.distribution === 'space-between' ? 'space-between' : 'flex-start',
      flexWrap: this.config.wrap ? 'wrap' : 'nowrap'
    };
  }
  
  private mapAlignment(alignment: string): string {
    const map: Record<string, string> = {
      'start': 'flex-start',
      'center': 'center',
      'end': 'flex-end',
      'stretch': 'stretch'
    };
    return map[alignment];
  }
  
  addChild(element: HTMLElement, sizing: 'hug' | 'fill' | 'fixed' = 'hug'): void {
    switch (sizing) {
      case 'fill':
        element.style.flex = '1';
        break;
      case 'hug':
        element.style.flex = '0 0 auto';
        break;
      case 'fixed':
        element.style.flex = 'none';
        break;
    }
    this.children.push(element);
  }
}
```

**Zdroj:** Hindtech syllabus - "Autolayout and Constraints", "Auto Layout for spacing", PW Skills - "Figma Auto Layout"

---

## Kapitola 5: Vrstvy a organizace

### 5.1 Frames vs Groups

**Popis funkce:**
Dva odlisne zpusoby seskupovani prvku s ruznymi vlastnostmi a chovani.

**Rozdily:**

| Vlastnost | Frame | Group |
|-----------|-------|-------|
| Vlastni velikost | Ano | Ne (odvozena od obsahu) |
| Clip content | Ano | Ne |
| Auto Layout | Ano | Ne |
| Constraints | Ano | Ne |
| Background | Ano | Ne |
| Orezova maska | Ano | Jen pres masku |

**Technicka implementace:**

```typescript
interface Frame {
  id: string;
  type: 'frame';
  name: string;
  width: number;
  height: number;
  clipContent: boolean;
  background?: Fill;
  children: (Frame | Group | Element)[];
  autoLayout?: AutoLayoutConfig;
  constraints?: Constraints;
}

interface Group {
  id: string;
  type: 'group';
  name: string;
  // Velikost se automaticky pocita z obsahu
  children: Element[];
}

class LayerManager {
  getGroupBounds(group: Group): DOMRect {
    // Group nema vlastni velikost - pocita se z deti
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const child of group.children) {
      const bounds = child.getBounds();
      minX = Math.min(minX, bounds.left);
      minY = Math.min(minY, bounds.top);
      maxX = Math.max(maxX, bounds.right);
      maxY = Math.max(maxY, bounds.bottom);
    }
    
    return new DOMRect(minX, minY, maxX - minX, maxY - minY);
  }
}
```

**Zdroj:** Hindtech syllabus - "Frames vs Groups in Figma"

---

### 5.2 Komponenty a Instance

**Popis funkce:**
System znovupouzitelnych prvku - hlavni komponenta (master) a jejich instance, které dedi vlastnosti.

**Klicove vlastnosti:**
- Zmena hlavni komponenty se propaguje do vsech instanci
- Instance lze lokalne prepsovat (overrides)
- Hlavni komponenty nelze smazat pokud existuji instance
- Pojmenovani s lomitkem vytvari hierarchii (Button/Primary, Button/Secondary)

**Technicka implementace:**

```typescript
interface Component {
  id: string;
  type: 'component';
  name: string;
  description?: string;
  children: Element[];
  properties: ComponentProperty[];
}

interface ComponentInstance {
  id: string;
  type: 'instance';
  componentId: string; // reference na hlavni komponentu
  overrides: Map<string, any>; // lokalni prepisy
}

interface ComponentProperty {
  name: string;
  type: 'text' | 'boolean' | 'instance-swap' | 'variant';
  defaultValue: any;
}

class ComponentManager {
  private components: Map<string, Component> = new Map();
  private instances: Map<string, ComponentInstance> = new Map();
  
  createInstance(componentId: string): ComponentInstance {
    const component = this.components.get(componentId);
    if (!component) throw new Error('Component not found');
    
    const instance: ComponentInstance = {
      id: generateId(),
      type: 'instance',
      componentId,
      overrides: new Map()
    };
    
    this.instances.set(instance.id, instance);
    return instance;
  }
  
  updateComponent(componentId: string, updates: Partial<Component>): void {
    const component = this.components.get(componentId);
    if (!component) return;
    
    Object.assign(component, updates);
    
    // Propagovat zmeny do instanci (krome overrides)
    this.instances.forEach(instance => {
      if (instance.componentId === componentId) {
        this.applyComponentUpdates(instance, updates);
      }
    });
  }
  
  setOverride(instanceId: string, property: string, value: any): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.overrides.set(property, value);
    }
  }
  
  resetOverride(instanceId: string, property: string): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.overrides.delete(property);
    }
  }
}
```

**Zdroj:** Hindtech syllabus - "What are components in Figma", "You can't kill main components"

---

### 5.3 Varianty komponent

**Popis funkce:**
Seskupeni variant jedne komponenty (napr. stavy tlacitka, velikosti) do jednoho celku s moznosti prepinani.

**Priklady variant:**
- Tlacitko: Primary/Secondary/Tertiary
- Stav: Default/Hover/Active/Disabled
- Velikost: Small/Medium/Large
- Typ: Filled/Outlined/Text

**Technicka implementace:**

```typescript
interface VariantProperty {
  name: string; // napr. "State", "Size", "Type"
  values: string[]; // napr. ["Default", "Hover", "Active"]
}

interface ComponentSet {
  id: string;
  type: 'component-set';
  name: string;
  variantProperties: VariantProperty[];
  variants: Component[]; // kazda varianta je plnohodnotna komponenta
}

class VariantManager {
  private componentSets: Map<string, ComponentSet> = new Map();
  
  createVariant(setId: string, variantValues: Record<string, string>): Component {
    const set = this.componentSets.get(setId);
    if (!set) throw new Error('Component set not found');
    
    // Nazev varianty z hodnot (napr. "State=Hover, Size=Large")
    const variantName = Object.entries(variantValues)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
    
    const variant: Component = {
      id: generateId(),
      type: 'component',
      name: variantName,
      children: [],
      properties: []
    };
    
    set.variants.push(variant);
    return variant;
  }
  
  switchVariant(instanceId: string, newVariantValues: Record<string, string>): void {
    // Najit instanci, najit odpovidajici variantu, prepnout
    const instance = this.instances.get(instanceId);
    if (!instance) return;
    
    const set = this.findSetForComponent(instance.componentId);
    if (!set) return;
    
    const targetVariant = set.variants.find(v => 
      this.matchesVariantValues(v.name, newVariantValues)
    );
    
    if (targetVariant) {
      instance.componentId = targetVariant.id;
    }
  }
}
```

**Zdroj:** Hindtech syllabus - "Variants", "Using Variants to Create Component Groups"

---

## Kapitola 6: Prototypovani

### 6.1 Interaktivni propojeni

**Popis funkce:**
Vytvareni navigacnich vazeb mezi obrazovkami/framy pro simulaci funkcni aplikace.

**Typy spousteci:**
- **On Click/Tap** - klepnuti
- **On Hover** - najetí mysi
- **On Press** - drzeni
- **On Drag** - tazeni
- **After Delay** - po uplynuti casu
- **Mouse Enter/Leave** - vstup/vystup kurzoru

**Akce:**
- Navigate to (presmerovani)
- Open overlay (modalni okno)
- Swap overlay (vymena overlaye)
- Close overlay
- Back (zpet v historii)
- Scroll to (posuv na element)
- Open link (externi URL)

**Technicka implementace:**

```typescript
interface PrototypeConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  trigger: 'click' | 'hover' | 'press' | 'drag' | 'after-delay' | 'mouse-enter' | 'mouse-leave';
  delay?: number; // ms pro after-delay
  action: PrototypeAction;
}

type PrototypeAction = 
  | { type: 'navigate'; destinationId: string; transition: Transition }
  | { type: 'overlay'; destinationId: string; position: OverlayPosition; transition: Transition }
  | { type: 'swap-overlay'; destinationId: string; transition: Transition }
  | { type: 'close-overlay' }
  | { type: 'back' }
  | { type: 'scroll-to'; nodeId: string; behavior: 'smooth' | 'instant' }
  | { type: 'open-link'; url: string };

interface Transition {
  type: 'instant' | 'dissolve' | 'smart-animate' | 'move-in' | 'move-out' | 'push' | 'slide-in' | 'slide-out';
  direction?: 'left' | 'right' | 'top' | 'bottom';
  duration: number; // ms
  easing: EasingFunction;
}

interface OverlayPosition {
  type: 'center' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'manual';
  x?: number;
  y?: number;
}

class PrototypeEngine {
  private connections: Map<string, PrototypeConnection[]> = new Map();
  private currentFrameId: string;
  private history: string[] = [];
  
  handleTrigger(nodeId: string, triggerType: string): void {
    const connections = this.connections.get(nodeId) || [];
    const connection = connections.find(c => c.trigger === triggerType);
    
    if (connection) {
      this.executeAction(connection.action);
    }
  }
  
  private executeAction(action: PrototypeAction): void {
    switch (action.type) {
      case 'navigate':
        this.history.push(this.currentFrameId);
        this.navigateTo(action.destinationId, action.transition);
        break;
      case 'overlay':
        this.showOverlay(action.destinationId, action.position, action.transition);
        break;
      case 'back':
        const previousId = this.history.pop();
        if (previousId) this.navigateTo(previousId, { type: 'instant', duration: 0, easing: 'linear' });
        break;
      // ...
    }
  }
}
```

**Zdroj:** Hindtech syllabus - "How to prototype in Figma", "Adding Connections between Frames"

---

### 6.2 Smart Animate

**Popis funkce:**
Automaticka animace mezi dvema stavy - Figma interpoluje rozdily ve vlastnostech prvku se shodnym nazvem.

**Co se animuje:**
- Pozice (x, y)
- Velikost (width, height)
- Rotace
- Pruhlednost (opacity)
- Fill (vcetne gradientu)
- Stroke
- Corner radius
- Efekty (shadows, blur)

**Pozadavky:**
- Prvky musi mit SHODNE NAZVY v obou framech
- Prvky musi byt na STEJNE UROVNI hierarchie

**Technicka implementace:**

```typescript
interface AnimatableProperties {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  cornerRadius: number | number[];
  fill: Fill;
  stroke: Stroke;
  effects: Effect[];
}

class SmartAnimator {
  animate(
    sourceElements: Map<string, AnimatableProperties>,
    targetElements: Map<string, AnimatableProperties>,
    duration: number,
    easing: EasingFunction
  ): Animation[] {
    const animations: Animation[] = [];
    
    sourceElements.forEach((sourceProps, name) => {
      const targetProps = targetElements.get(name);
      if (!targetProps) return; // Element neexistuje v cilovem stavu
      
      // Vypocitat rozdily a vytvorit animace
      const keyframes = this.createKeyframes(sourceProps, targetProps);
      
      animations.push({
        name,
        keyframes,
        duration,
        easing: this.getEasingFunction(easing)
      });
    });
    
    return animations;
  }
  
  private createKeyframes(from: AnimatableProperties, to: AnimatableProperties): Keyframe[] {
    return [
      {
        offset: 0,
        transform: `translate(${from.x}px, ${from.y}px) rotate(${from.rotation}deg)`,
        width: `${from.width}px`,
        height: `${from.height}px`,
        opacity: from.opacity,
        borderRadius: this.formatCornerRadius(from.cornerRadius)
      },
      {
        offset: 1,
        transform: `translate(${to.x}px, ${to.y}px) rotate(${to.rotation}deg)`,
        width: `${to.width}px`,
        height: `${to.height}px`,
        opacity: to.opacity,
        borderRadius: this.formatCornerRadius(to.cornerRadius)
      }
    ];
  }
}
```

**Zdroj:** Hindtech syllabus - "What is Smart Animation and delays in Figma", "How to make animated transitions"

---

### 6.3 Microinterakce

**Popis funkce:**
Male, jednoúcelove animace reagujici na uzivatelske akce - poskytují zpětnou vazbu a delaji rozhrani "zive".

**Priklady microinterakci:**
- Zmena stavu tlacitka pri hoveru
- Loading spinner
- Toggle switch animace
- Like heart animace
- Pull-to-refresh
- Hamburger menu transformace na krizek

**Technicka implementace hamburger menu:**

```typescript
// Komponenta s interactive components pro hamburger-to-X animaci
interface HamburgerMenuVariants {
  open: {
    topLine: { rotation: 45, y: 0 };
    middleLine: { opacity: 0, scaleX: 0 };
    bottomLine: { rotation: -45, y: 0 };
  };
  closed: {
    topLine: { rotation: 0, y: -8 };
    middleLine: { opacity: 1, scaleX: 1 };
    bottomLine: { rotation: 0, y: 8 };
  };
}

class HamburgerMenu {
  private isOpen: boolean = false;
  private lines: HTMLElement[];
  
  toggle(): void {
    this.isOpen = !this.isOpen;
    this.animate();
  }
  
  private animate(): void {
    const state = this.isOpen ? 'open' : 'closed';
    
    // Top line
    this.lines[0].animate([
      { transform: `translateY(${this.isOpen ? -8 : 0}px) rotate(${this.isOpen ? 0 : 45}deg)` },
      { transform: `translateY(${this.isOpen ? 0 : 0}px) rotate(${this.isOpen ? 45 : 0}deg)` }
    ], { duration: 300, fill: 'forwards', easing: 'ease-out' });
    
    // Middle line
    this.lines[1].animate([
      { opacity: this.isOpen ? 1 : 0, transform: `scaleX(${this.isOpen ? 1 : 0})` },
      { opacity: this.isOpen ? 0 : 1, transform: `scaleX(${this.isOpen ? 0 : 1})` }
    ], { duration: 300, fill: 'forwards' });
    
    // Bottom line
    this.lines[2].animate([
      { transform: `translateY(${this.isOpen ? 8 : 0}px) rotate(${this.isOpen ? 0 : -45}deg)` },
      { transform: `translateY(${this.isOpen ? 0 : 0}px) rotate(${this.isOpen ? -45 : 0}deg)` }
    ], { duration: 300, fill: 'forwards', easing: 'ease-out' });
  }
}
```

**CSS alternativa:**

```css
.hamburger-line {
  transition: all 0.3s ease-out;
  transform-origin: center;
}

.hamburger.open .line-top {
  transform: translateY(8px) rotate(45deg);
}

.hamburger.open .line-middle {
  opacity: 0;
  transform: scaleX(0);
}

.hamburger.open .line-bottom {
  transform: translateY(-8px) rotate(-45deg);
}
```

**Zdroj:** Hindtech syllabus - "Micro interactions using interactive components", "Micro Interaction burger menu turned into cross"

---

### 6.4 Easing funkce

**Popis funkce:**
Krivky urcujici prubeh animace v case - linearni vs. zrychlujici/zpomalujici.

**Zakladni typy:**
- **Linear** - konstantni rychlost
- **Ease-in** - zacina pomalu, zrychluje
- **Ease-out** - zacina rychle, zpomaluje
- **Ease-in-out** - zacina a konci pomalu
- **Custom cubic-bezier** - vlastni krivka

**Technicka implementace:**

```typescript
type EasingFunction = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring' | CustomBezier;

interface CustomBezier {
  type: 'cubic-bezier';
  p1: { x: number; y: number };
  p2: { x: number; y: number };
}

const easingPresets: Record<string, string> = {
  'linear': 'linear',
  'ease': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  'ease-in': 'cubic-bezier(0.42, 0, 1, 1)',
  'ease-out': 'cubic-bezier(0, 0, 0.58, 1)',
  'ease-in-out': 'cubic-bezier(0.42, 0, 0.58, 1)',
  // Material Design easings
  'standard': 'cubic-bezier(0.4, 0, 0.2, 1)',
  'decelerate': 'cubic-bezier(0, 0, 0.2, 1)',
  'accelerate': 'cubic-bezier(0.4, 0, 1, 1)',
  // Bounce
  'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

class EasingEditor {
  private canvas: HTMLCanvasElement;
  private p1: Point = { x: 0.25, y: 0.1 };
  private p2: Point = { x: 0.25, y: 1 };
  
  drawCurve(): void {
    const ctx = this.canvas.getContext('2d')!;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    // Nakreslit bezierovu krivku
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.bezierCurveTo(
      this.p1.x * w, h - this.p1.y * h,
      this.p2.x * w, h - this.p2.y * h,
      w, 0
    );
    ctx.strokeStyle = '#007AFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  toCSSValue(): string {
    return `cubic-bezier(${this.p1.x}, ${this.p1.y}, ${this.p2.x}, ${this.p2.y})`;
  }
}
```

**Zdroj:** Hindtech syllabus - "Prototype animation and easing in Figma", "Animation with custom easing"

---

# CAST II: POKROCILE FUNKCE

## Kapitola 7: Design System

### 7.1 Color Styles

**Popis funkce:**
Centralizovana definice barev pouzivanych v projektu - zmena stylu se propaguje vsude.

**Struktura barevneho systemu:**

```
Primary/
  - primary-50 (nejsvetlejsi)
  - primary-100
  - primary-200
  - primary-300
  - primary-400
  - primary-500 (zakladni)
  - primary-600
  - primary-700
  - primary-800
  - primary-900 (nejtmavsi)

Semantic/
  - success
  - warning
  - error
  - info

Neutral/
  - white
  - gray-50 az gray-900
  - black
```

**Technicka implementace:**

```typescript
interface ColorStyle {
  id: string;
  name: string; // napr. "Primary/500"
  color: ColorRGB;
  description?: string;
}

class ColorStyleManager {
  private styles: Map<string, ColorStyle> = new Map();
  private usages: Map<string, Set<string>> = new Map(); // styleId -> elementIds
  
  createStyle(name: string, color: ColorRGB): ColorStyle {
    const style: ColorStyle = {
      id: generateId(),
      name,
      color,
    };
    this.styles.set(style.id, style);
    return style;
  }
  
  updateStyle(styleId: string, newColor: ColorRGB): void {
    const style = this.styles.get(styleId);
    if (!style) return;
    
    style.color = newColor;
    
    // Propagovat zmenu do vsech pouziti
    const usedIn = this.usages.get(styleId);
    if (usedIn) {
      usedIn.forEach(elementId => {
        this.updateElementColor(elementId, newColor);
      });
    }
  }
  
  applyToElement(styleId: string, elementId: string): void {
    const style = this.styles.get(styleId);
    if (!style) return;
    
    // Zaregistrovat pouziti
    if (!this.usages.has(styleId)) {
      this.usages.set(styleId, new Set());
    }
    this.usages.get(styleId)!.add(elementId);
    
    // Aplikovat barvu
    this.updateElementColor(elementId, style.color);
  }
  
  exportAsCSS(): string {
    let css = ':root {\n';
    this.styles.forEach(style => {
      const varName = this.nameToVar(style.name);
      css += `  --${varName}: rgb(${style.color.r}, ${style.color.g}, ${style.color.b});\n`;
    });
    css += '}';
    return css;
  }
  
  private nameToVar(name: string): string {
    return name.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-');
  }
}
```

**Zdroj:** Hindtech syllabus - "How to create and use Color Styles in Figma", Path Unbound - "Design Systems"

---

### 7.2 Effect Styles

**Popis funkce:**
Znovupouzitelne efekty jako stiny, rozmazani - soucast design systemu.

**Typy efektu:**
- **Drop Shadow** - stin pod objektem
- **Inner Shadow** - vnitrni stin
- **Layer Blur** - rozmazani vrstvy
- **Background Blur** - rozmazani pozadi (sklo efekt)

**Technicka implementace:**

```typescript
interface DropShadow {
  type: 'drop-shadow';
  color: ColorRGB;
  offset: { x: number; y: number };
  blur: number;
  spread: number;
}

interface InnerShadow {
  type: 'inner-shadow';
  color: ColorRGB;
  offset: { x: number; y: number };
  blur: number;
}

interface LayerBlur {
  type: 'layer-blur';
  radius: number;
}

interface BackgroundBlur {
  type: 'background-blur';
  radius: number;
}

type Effect = DropShadow | InnerShadow | LayerBlur | BackgroundBlur;

interface EffectStyle {
  id: string;
  name: string;
  effects: Effect[];
}

// Elevation system (Material Design inspired)
const elevationStyles: Record<number, DropShadow[]> = {
  0: [],
  1: [{ type: 'drop-shadow', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 1 }, blur: 3, spread: 0 }],
  2: [{ type: 'drop-shadow', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 }, blur: 6, spread: 0 }],
  3: [{ type: 'drop-shadow', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 4 }, blur: 12, spread: 0 }],
  4: [{ type: 'drop-shadow', color: { r: 0, g: 0, b: 0, a: 0.15 }, offset: { x: 0, y: 8 }, blur: 24, spread: 0 }],
  5: [{ type: 'drop-shadow', color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 0, y: 16 }, blur: 48, spread: 0 }],
};

function effectToCSS(effect: Effect): string {
  switch (effect.type) {
    case 'drop-shadow':
      return `${effect.offset.x}px ${effect.offset.y}px ${effect.blur}px ${effect.spread}px rgba(${effect.color.r},${effect.color.g},${effect.color.b},${effect.color.a ?? 1})`;
    case 'inner-shadow':
      return `inset ${effect.offset.x}px ${effect.offset.y}px ${effect.blur}px rgba(${effect.color.r},${effect.color.g},${effect.color.b},${effect.color.a ?? 1})`;
    case 'layer-blur':
      return `blur(${effect.radius}px)`;
    case 'background-blur':
      return `blur(${effect.radius}px)`; // pouzit s backdrop-filter
  }
}
```

**Neumorphism styl:**

```typescript
// Neomorphic efekt - moderni "soft UI"
function createNeumorphicEffect(
  backgroundColor: ColorRGB,
  intensity: number = 0.15
): Effect[] {
  const lightShadow = {
    r: Math.min(255, backgroundColor.r + 30),
    g: Math.min(255, backgroundColor.g + 30),
    b: Math.min(255, backgroundColor.b + 30),
    a: intensity
  };
  
  const darkShadow = {
    r: Math.max(0, backgroundColor.r - 30),
    g: Math.max(0, backgroundColor.g - 30),
    b: Math.max(0, backgroundColor.b - 30),
    a: intensity
  };
  
  return [
    { type: 'drop-shadow', color: darkShadow, offset: { x: 5, y: 5 }, blur: 10, spread: 0 },
    { type: 'drop-shadow', color: lightShadow, offset: { x: -5, y: -5 }, blur: 10, spread: 0 }
  ];
}
```

**Zdroj:** Hindtech syllabus - "Nice drop shadow and Inner drop shadow effects", "How to make Neuromorphic ui buttons"

---

### 7.3 Team Libraries

**Popis funkce:**
Sdileni komponent, stylu a assetu mezi vice soubory a cleny tymu.

**Technicka implementace:**

```typescript
interface Library {
  id: string;
  name: string;
  description: string;
  publishedAt: Date;
  version: string;
  components: Component[];
  colorStyles: ColorStyle[];
  textStyles: TextStyle[];
  effectStyles: EffectStyle[];
}

interface LibrarySubscription {
  libraryId: string;
  projectId: string;
  autoUpdate: boolean;
  lastSyncedVersion: string;
}

class LibraryManager {
  private libraries: Map<string, Library> = new Map();
  private subscriptions: Map<string, LibrarySubscription[]> = new Map();
  
  publishLibrary(library: Library): void {
    library.publishedAt = new Date();
    library.version = this.incrementVersion(library.version);
    this.libraries.set(library.id, library);
    
    // Notifikovat subscribery o aktualizaci
    this.notifySubscribers(library.id);
  }
  
  subscribeToLibrary(projectId: string, libraryId: string): void {
    const subscription: LibrarySubscription = {
      libraryId,
      projectId,
      autoUpdate: false,
      lastSyncedVersion: this.libraries.get(libraryId)?.version || '0.0.0'
    };
    
    if (!this.subscriptions.has(projectId)) {
      this.subscriptions.set(projectId, []);
    }
    this.subscriptions.get(projectId)!.push(subscription);
  }
  
  getAvailableUpdates(projectId: string): Array<{ library: Library; currentVersion: string }> {
    const subs = this.subscriptions.get(projectId) || [];
    const updates: Array<{ library: Library; currentVersion: string }> = [];
    
    for (const sub of subs) {
      const library = this.libraries.get(sub.libraryId);
      if (library && library.version !== sub.lastSyncedVersion) {
        updates.push({ library, currentVersion: sub.lastSyncedVersion });
      }
    }
    
    return updates;
  }
}
```

**Zdroj:** Hindtech syllabus - "How do you use team libraries in Figma"

---

## Kapitola 8: Obrazky a media

### 8.1 Prace s obrazky

**Popis funkce:**
Import, editace a manipulace s rastrovymi obrazky.

**Podporovane formaty:**
- PNG (s pruhlednosti)
- JPEG/JPG
- GIF (vcetne animovanych)
- WebP
- SVG (vektory)
- AVIF

**Funkce pro obrazky:**
- Zmena velikosti (scale)
- Orez (crop)
- Maskovani (clipping)
- Filtry a uprava barev
- Nahrazeni obrazku v ramcich

**Technicka implementace:**

```typescript
interface ImageFilters {
  brightness: number; // 0-200, default 100
  contrast: number; // 0-200, default 100
  saturation: number; // 0-200, default 100
  hue: number; // 0-360, default 0
  blur: number; // 0-100, default 0
  grayscale: number; // 0-100, default 0
  sepia: number; // 0-100, default 0
  invert: number; // 0-100, default 0
}

class ImageEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private originalImageData: ImageData;
  
  applyFilters(filters: Partial<ImageFilters>): void {
    // Reset na original
    this.ctx.putImageData(this.originalImageData, 0, 0);
    
    // CSS filter string
    const filterString = [
      `brightness(${filters.brightness ?? 100}%)`,
      `contrast(${filters.contrast ?? 100}%)`,
      `saturate(${filters.saturation ?? 100}%)`,
      `hue-rotate(${filters.hue ?? 0}deg)`,
      `blur(${filters.blur ?? 0}px)`,
      `grayscale(${filters.grayscale ?? 0}%)`,
      `sepia(${filters.sepia ?? 0}%)`,
      `invert(${filters.invert ?? 0}%)`
    ].join(' ');
    
    this.ctx.filter = filterString;
    this.ctx.drawImage(this.canvas, 0, 0);
    this.ctx.filter = 'none';
  }
  
  cropImage(rect: { x: number; y: number; width: number; height: number }): ImageData {
    return this.ctx.getImageData(rect.x, rect.y, rect.width, rect.height);
  }
  
  maskWithShape(maskPath: Path2D): void {
    this.ctx.save();
    this.ctx.clip(maskPath);
    this.ctx.drawImage(this.canvas, 0, 0);
    this.ctx.restore();
  }
}
```

**Zdroj:** Hindtech syllabus - "Tips and tricks for using images", "Masking Cropping images"

---

### 8.2 GIF prehravani

**Popis funkce:**
Podpora animovanych GIFu v prototypech pro demonstraci animaci a ilustraci.

**Technicka implementace:**

```typescript
class GIFPlayer {
  private frames: ImageData[] = [];
  private frameDelays: number[] = [];
  private currentFrame: number = 0;
  private isPlaying: boolean = false;
  private canvas: HTMLCanvasElement;
  
  async loadGIF(url: string): Promise<void> {
    // Pouzit knihovnu gifuct-js pro dekodovani GIF
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const gif = parseGIF(buffer);
    const frames = decompressFrames(gif, true);
    
    this.frames = frames.map(f => this.frameToImageData(f));
    this.frameDelays = frames.map(f => f.delay);
  }
  
  play(): void {
    this.isPlaying = true;
    this.renderLoop();
  }
  
  pause(): void {
    this.isPlaying = false;
  }
  
  private renderLoop(): void {
    if (!this.isPlaying) return;
    
    const ctx = this.canvas.getContext('2d')!;
    ctx.putImageData(this.frames[this.currentFrame], 0, 0);
    
    const delay = this.frameDelays[this.currentFrame] || 100;
    
    setTimeout(() => {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.renderLoop();
    }, delay);
  }
}
```

**Zdroj:** Hindtech syllabus - "Playing GIFs"

---

## Kapitola 9: Spoluprace a sdileni

### 9.1 Real-time kolaborace

**Popis funkce:**
Vice uzivatelu muze soucasne pracovat na stejnem dokumentu s viditelnymi kurzory ostatnich.

**Technicka implementace:**

```typescript
interface CollaboratorCursor {
  userId: string;
  userName: string;
  color: string;
  position: { x: number; y: number };
  selection?: string[]; // IDs vybranych prvku
}

class CollaborationManager {
  private websocket: WebSocket;
  private cursors: Map<string, CollaboratorCursor> = new Map();
  private localUserId: string;
  
  connect(documentId: string): void {
    this.websocket = new WebSocket(`wss://api.paintnook.com/collab/${documentId}`);
    
    this.websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
  }
  
  private handleMessage(message: CollabMessage): void {
    switch (message.type) {
      case 'cursor-move':
        this.cursors.set(message.userId, {
          ...this.cursors.get(message.userId)!,
          position: message.position
        });
        this.renderCursors();
        break;
        
      case 'selection-change':
        this.cursors.set(message.userId, {
          ...this.cursors.get(message.userId)!,
          selection: message.selectedIds
        });
        this.renderSelections();
        break;
        
      case 'element-update':
        // Aplikovat zmenu od jineho uzivatele
        this.applyRemoteUpdate(message.elementId, message.changes);
        break;
        
      case 'user-joined':
        this.cursors.set(message.userId, {
          userId: message.userId,
          userName: message.userName,
          color: this.assignColor(message.userId),
          position: { x: 0, y: 0 }
        });
        break;
        
      case 'user-left':
        this.cursors.delete(message.userId);
        this.renderCursors();
        break;
    }
  }
  
  sendCursorPosition(x: number, y: number): void {
    this.websocket.send(JSON.stringify({
      type: 'cursor-move',
      userId: this.localUserId,
      position: { x, y }
    }));
  }
  
  private renderCursors(): void {
    // Vykreslit kurzory ostatnich uzivatelu
    this.cursors.forEach((cursor, id) => {
      if (id === this.localUserId) return;
      
      const cursorEl = document.getElementById(`cursor-${id}`) || this.createCursorElement(id);
      cursorEl.style.transform = `translate(${cursor.position.x}px, ${cursor.position.y}px)`;
    });
  }
}
```

**Zdroj:** Hindtech syllabus - "Share editing with other UX designers", akademicky clanek - "Real-Time Collaboration"

---

### 9.2 Komentare

**Popis funkce:**
Moznost pridat komentare k urcitym mistum v designu pro zpetnou vazbu.

**Technicka implementace:**

```typescript
interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  position: { x: number; y: number };
  attachedTo?: string; // ID elementu
  resolved: boolean;
  replies: Reply[];
}

interface Reply {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

class CommentManager {
  private comments: Map<string, Comment> = new Map();
  
  addComment(content: string, position: { x: number; y: number }, attachedTo?: string): Comment {
    const comment: Comment = {
      id: generateId(),
      authorId: getCurrentUserId(),
      authorName: getCurrentUserName(),
      content,
      createdAt: new Date(),
      position,
      attachedTo,
      resolved: false,
      replies: []
    };
    
    this.comments.set(comment.id, comment);
    this.renderCommentPin(comment);
    
    return comment;
  }
  
  replyToComment(commentId: string, content: string): void {
    const comment = this.comments.get(commentId);
    if (!comment) return;
    
    comment.replies.push({
      id: generateId(),
      authorId: getCurrentUserId(),
      authorName: getCurrentUserName(),
      content,
      createdAt: new Date()
    });
  }
  
  resolveComment(commentId: string): void {
    const comment = this.comments.get(commentId);
    if (comment) {
      comment.resolved = true;
      this.updateCommentPin(comment);
    }
  }
  
  private renderCommentPin(comment: Comment): void {
    const pin = document.createElement('div');
    pin.className = `comment-pin ${comment.resolved ? 'resolved' : ''}`;
    pin.style.left = `${comment.position.x}px`;
    pin.style.top = `${comment.position.y}px`;
    pin.dataset.commentId = comment.id;
    pin.innerHTML = `<span class="pin-number">${this.comments.size}</span>`;
    
    pin.addEventListener('click', () => this.showCommentThread(comment.id));
    
    document.getElementById('comments-layer')?.appendChild(pin);
  }
}
```

**Zdroj:** Hindtech syllabus - "Sharing and Commenting on Figma file with Stakeholders"

---

### 9.3 Sdileni a export

**Popis funkce:**
Export designu v ruznych formatech a sdileni pro vyvojare.

**Podporovane exportni formaty:**
- PNG (s moznosti 1x, 2x, 3x, 4x)
- JPG
- SVG
- PDF
- WebP

**Developer handoff:**

```typescript
interface ExportSettings {
  format: 'png' | 'jpg' | 'svg' | 'pdf' | 'webp';
  scale: number; // 1, 2, 3, 4
  quality?: number; // pro jpg, 0-100
  includeBackground?: boolean;
  constraint?: { type: 'width' | 'height'; value: number };
}

interface CodeOutput {
  css: string;
  html?: string;
  react?: string;
  swift?: string;
  android?: string;
}

class ExportManager {
  exportElement(elementId: string, settings: ExportSettings): Blob {
    const element = getElementById(elementId);
    
    switch (settings.format) {
      case 'svg':
        return this.exportAsSVG(element);
      case 'png':
        return this.exportAsPNG(element, settings.scale);
      case 'jpg':
        return this.exportAsJPG(element, settings.quality ?? 90);
      case 'pdf':
        return this.exportAsPDF(element);
    }
  }
  
  generateCode(elementId: string): CodeOutput {
    const element = getElementById(elementId);
    const styles = this.extractStyles(element);
    
    return {
      css: this.stylesToCSS(styles),
      react: this.stylesToReactStyle(styles),
      swift: this.stylesToSwift(styles),
      android: this.stylesToAndroidXML(styles)
    };
  }
  
  private stylesToCSS(styles: ComputedStyles): string {
    return `
.element {
  width: ${styles.width}px;
  height: ${styles.height}px;
  background: ${styles.background};
  border-radius: ${styles.borderRadius}px;
  box-shadow: ${styles.boxShadow};
  /* ... */
}`.trim();
  }
}
```

**Zdroj:** Hindtech syllabus - "How to export Images out of Figma", "Sharing Figma with developers and engineers handoff"

---

## Kapitola 10: Plugins a rozsireni

### 10.1 Plugin system

**Popis funkce:**
Moznost rozsirit funkcionalitu aplikace pomoci pluginu tretich stran.

**Technicka implementace:**

```typescript
interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  main: string; // vstupni soubor
  ui?: string; // HTML pro UI
  permissions: PluginPermission[];
}

type PluginPermission = 
  | 'read-document'
  | 'write-document'
  | 'create-elements'
  | 'delete-elements'
  | 'access-network'
  | 'show-ui';

interface PluginAPI {
  // Cteni
  getSelection(): Element[];
  getDocumentNode(): DocumentNode;
  findAll(criteria: FindCriteria): Element[];
  
  // Zapis
  createRectangle(): RectangleNode;
  createText(): TextNode;
  createFrame(): FrameNode;
  
  // UI
  showUI(html: string, options?: UIOptions): void;
  closeUI(): void;
  
  // Komunikace s UI
  postMessage(message: any): void;
  onMessage(callback: (message: any) => void): void;
  
  // Notifikace
  notify(message: string, options?: NotifyOptions): void;
}

// Priklad pluginu pro generovani Lorem Ipsum
const loremIpsumPlugin: Plugin = {
  manifest: {
    id: 'lorem-ipsum-generator',
    name: 'Lorem Ipsum Generator',
    version: '1.0.0',
    description: 'Generates placeholder text',
    author: 'PaintNook',
    main: 'code.js',
    permissions: ['read-document', 'write-document', 'show-ui']
  },
  
  run(api: PluginAPI): void {
    const selection = api.getSelection();
    
    if (selection.length === 0) {
      api.notify('Please select a text element');
      return;
    }
    
    for (const node of selection) {
      if (node.type === 'TEXT') {
        const paragraphs = Math.ceil(Math.random() * 3);
        node.characters = generateLoremIpsum(paragraphs);
      }
    }
    
    api.notify('Lorem ipsum generated!');
  }
};
```

**Zdroj:** Hindtech syllabus - "How to use Plugins in Figma for icons", "Plugins"

---

### 10.2 Integrace ikonovych knihoven

**Popis funkce:**
Pristup k rozsirenycm knihovnam ikon primo z aplikace.

**Zdroje ikon:**
- Material Icons (Google)
- Font Awesome
- Heroicons
- Feather Icons
- Lucide
- Ionicons

**Technicka implementace:**

```typescript
interface IconLibrary {
  id: string;
  name: string;
  searchEndpoint: string;
  categories: string[];
}

interface Icon {
  id: string;
  name: string;
  svg: string;
  tags: string[];
  library: string;
}

class IconBrowser {
  private libraries: IconLibrary[] = [
    { id: 'material', name: 'Material Icons', searchEndpoint: '/api/icons/material', categories: ['action', 'alert', 'av', 'communication', 'content'] },
    { id: 'feather', name: 'Feather Icons', searchEndpoint: '/api/icons/feather', categories: ['arrows', 'general', 'devices'] },
    // ...
  ];
  
  async searchIcons(query: string, library?: string): Promise<Icon[]> {
    const libs = library ? [this.libraries.find(l => l.id === library)!] : this.libraries;
    
    const results: Icon[] = [];
    
    for (const lib of libs) {
      const response = await fetch(`${lib.searchEndpoint}?q=${encodeURIComponent(query)}`);
      const icons = await response.json();
      results.push(...icons.map((i: any) => ({ ...i, library: lib.id })));
    }
    
    return results;
  }
  
  insertIcon(icon: Icon, position: { x: number; y: number }): SVGElement {
    const parser = new DOMParser();
    const doc = parser.parseFromString(icon.svg, 'image/svg+xml');
    const svgElement = doc.documentElement;
    
    svgElement.setAttribute('x', position.x.toString());
    svgElement.setAttribute('y', position.y.toString());
    
    return svgElement;
  }
}
```

**Zdroj:** Hindtech syllabus - "Where to get Free icons for Figma", "Matching the stroke of our icons"

---

# CAST III: UX FUNKCE A METODOLOGIE

## Kapitola 11: User Research nastroje

### 11.1 User Personas

**Popis funkce:**
Sablony a nastroje pro vytvareni user person - fiktivnich reprezentantu cilovych uzivatelu.

**Struktura persony:**

```typescript
interface UserPersona {
  id: string;
  name: string;
  photo?: string;
  demographics: {
    age: number;
    gender: string;
    location: string;
    occupation: string;
    education: string;
    income?: string;
  };
  biography: string;
  goals: string[];
  frustrations: string[]; // pain points
  motivations: string[];
  behaviors: string[];
  quote: string; // charakteristicka citace
  technicalProficiency: 'low' | 'medium' | 'high';
  preferredDevices: string[];
  brandAffinity?: string[];
}

// Sablona pro vytvoreni persony
const personaTemplate: Partial<UserPersona> = {
  demographics: {
    age: 0,
    gender: '',
    location: '',
    occupation: '',
    education: ''
  },
  goals: ['', '', ''],
  frustrations: ['', '', ''],
  motivations: ['', '', ''],
  behaviors: ['', '', '']
};
```

**Vizualni sablona (komponenta):**
- Fotografie/avatar
- Jmeno a zakladni info
- Citace
- Cile a motivace
- Frustrace/pain points
- Technicka zdatnost (progress bar)
- Preferovane kanaly

**Zdroj:** PW Skills - "Creating User Personas", Beginner's Guide - "User Research"

---

### 11.2 User Journey Maps

**Popis funkce:**
Vizualizace cesty uzivatele pri interakci s produktem vcetne emoci a touchpointu.

**Technicka implementace:**

```typescript
interface JourneyStage {
  id: string;
  name: string;
  description: string;
  duration?: string;
}

interface Touchpoint {
  id: string;
  stageId: string;
  channel: 'web' | 'mobile' | 'email' | 'phone' | 'in-person' | 'social';
  action: string;
  emotion: -2 | -1 | 0 | 1 | 2; // velmi negativni az velmi pozitivni
  painPoints?: string[];
  opportunities?: string[];
}

interface JourneyMap {
  id: string;
  personaId: string;
  scenario: string;
  stages: JourneyStage[];
  touchpoints: Touchpoint[];
  emotionCurve: Array<{ stageId: string; emotion: number }>;
}

class JourneyMapBuilder {
  private map: JourneyMap;
  
  addStage(name: string, description: string): JourneyStage {
    const stage: JourneyStage = {
      id: generateId(),
      name,
      description
    };
    this.map.stages.push(stage);
    return stage;
  }
  
  addTouchpoint(stageId: string, touchpoint: Omit<Touchpoint, 'id' | 'stageId'>): void {
    this.map.touchpoints.push({
      id: generateId(),
      stageId,
      ...touchpoint
    });
    
    // Aktualizovat emotion curve
    this.recalculateEmotionCurve();
  }
  
  renderEmotionCurve(ctx: CanvasRenderingContext2D): void {
    // Nakreslit krivku emoci
    ctx.beginPath();
    
    const stageWidth = ctx.canvas.width / this.map.stages.length;
    const midY = ctx.canvas.height / 2;
    const emotionScale = ctx.canvas.height / 4;
    
    this.map.emotionCurve.forEach((point, index) => {
      const x = index * stageWidth + stageWidth / 2;
      const y = midY - (point.emotion * emotionScale);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        // Smooth bezier curve
        const prevX = (index - 1) * stageWidth + stageWidth / 2;
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(cpX, y, x, y);
      }
    });
    
    ctx.strokeStyle = '#007AFF';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}
```

**Zdroj:** PW Skills - "User Journey Maps", Beginner's Guide - "UX Design Process"

---

### 11.3 User Flow diagramy

**Popis funkce:**
Vizualni mapovani cest uzivatele skrz aplikaci - rozhodovaci body, akce, obrazovky.

**Symboly:**

| Symbol | Vyznam |
|--------|--------|
| Obdelnik | Obrazovka/stav |
| Kosoctverec | Rozhodovaci bod |
| Oval | Zacatek/konec |
| Sipka | Prechod |
| Rovnobeznik | Vstup uzivatele |

**Technicka implementace:**

```typescript
type FlowNodeType = 'screen' | 'decision' | 'start' | 'end' | 'input' | 'action';

interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  description?: string;
  position: { x: number; y: number };
}

interface FlowConnection {
  id: string;
  fromId: string;
  toId: string;
  label?: string; // "Yes", "No" pro decision
  condition?: string;
}

interface UserFlow {
  id: string;
  name: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
}

class UserFlowEditor {
  private flow: UserFlow;
  private canvas: HTMLCanvasElement;
  
  addNode(type: FlowNodeType, label: string, position: { x: number; y: number }): FlowNode {
    const node: FlowNode = {
      id: generateId(),
      type,
      label,
      position
    };
    this.flow.nodes.push(node);
    this.render();
    return node;
  }
  
  connect(fromId: string, toId: string, label?: string): void {
    this.flow.connections.push({
      id: generateId(),
      fromId,
      toId,
      label
    });
    this.render();
  }
  
  private drawNode(ctx: CanvasRenderingContext2D, node: FlowNode): void {
    ctx.save();
    ctx.translate(node.position.x, node.position.y);
    
    switch (node.type) {
      case 'screen':
        // Obdelnik
        ctx.strokeRect(-50, -25, 100, 50);
        break;
      case 'decision':
        // Kosoctverec
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(50, 0);
        ctx.lineTo(0, 35);
        ctx.lineTo(-50, 0);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'start':
      case 'end':
        // Oval
        ctx.beginPath();
        ctx.ellipse(0, 0, 40, 25, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
    }
    
    // Label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, 0, 0);
    
    ctx.restore();
  }
}
```

**Zdroj:** Hindtech syllabus - "How to Create a User Flow Diagram", PW Skills - "User Journey Maps"

---

## Kapitola 12: Wireframing

### 12.1 Lo-Fi Wireframes

**Popis funkce:**
Rychle, nizkodetailni nacrty struktury obrazovky bez vizualnich detailu.

**Charakteristiky Lo-Fi:**
- Seda paleta / obrysove tvary
- Placeholder texty ("Lorem ipsum")
- Zakladni tvary misto obrazku
- Zadne barvy, stiny, gradienty
- Duraz na layout a hierarchii

**Technicka implementace:**

```typescript
interface WireframePreset {
  name: string;
  fill: string;
  stroke: string;
  textPlaceholder: boolean;
  imagePlaceholder: boolean;
}

const lofiPreset: WireframePreset = {
  name: 'Lo-Fi',
  fill: '#F0F0F0',
  stroke: '#CCCCCC',
  textPlaceholder: true,
  imagePlaceholder: true
};

class WireframeMode {
  private preset: WireframePreset;
  
  applyToElement(element: Element): void {
    // Zjednodusit element pro wireframe
    if (element.type === 'rectangle' || element.type === 'frame') {
      element.fill = this.preset.fill;
      element.stroke = this.preset.stroke;
      element.strokeWidth = 1;
      element.cornerRadius = 0;
      element.effects = []; // odstranit stiny
    }
    
    if (element.type === 'text' && this.preset.textPlaceholder) {
      element.characters = this.generatePlaceholder(element.characters.length);
    }
    
    if (element.type === 'image' && this.preset.imagePlaceholder) {
      // Nahradit obrazek placeholderem s ikonou
      element.fill = this.preset.fill;
      element.showPlaceholderIcon = true;
    }
  }
  
  private generatePlaceholder(length: number): string {
    // Generovat "text" o dane delce
    const words = ['Lorem', 'ipsum', 'dolor', 'sit', 'amet'];
    let result = '';
    while (result.length < length) {
      result += words[Math.floor(Math.random() * words.length)] + ' ';
    }
    return result.substring(0, length);
  }
}
```

**Zdroj:** Hindtech syllabus - "What is Lo Fi Wireframe vs High Fidelity", PW Skills - "How to Sketch for Design"

---

### 12.2 Hi-Fi Mockups

**Popis funkce:**
Vysoce detailni vizualni navrhy reprezentujici finalni vzhled produktu.

**Charakteristiky Hi-Fi:**
- Skutecne barvy a typografie
- Realne obrazky a ikony
- Komponenty ve finalnim designu
- Detailni spacing a alignment
- Pripraveno pro developer handoff

**Prechod z Lo-Fi do Hi-Fi:**

```typescript
class MockupTransition {
  upgradeToHiFi(element: Element, designSystem: DesignSystem): void {
    // Aplikovat design system na wireframe element
    
    if (element.type === 'rectangle' || element.type === 'frame') {
      // Najit nejblizsi komponentu v design systemu
      const matchingComponent = this.findMatchingComponent(element, designSystem);
      if (matchingComponent) {
        this.replaceWithComponent(element, matchingComponent);
      } else {
        // Aplikovat styly
        element.fill = designSystem.colors.background;
        element.cornerRadius = designSystem.borderRadius.medium;
        element.effects = designSystem.effects.elevation1;
      }
    }
    
    if (element.type === 'text') {
      // Aplikovat text style
      const textStyle = this.inferTextStyle(element, designSystem);
      this.applyTextStyle(element, textStyle);
    }
  }
  
  private findMatchingComponent(element: Element, ds: DesignSystem): Component | null {
    // Heuristika pro urceni typu komponenty
    const ratio = element.width / element.height;
    const size = element.width * element.height;
    
    if (ratio > 2 && ratio < 5 && size < 10000) {
      return ds.components.button;
    }
    if (ratio > 0.8 && ratio < 1.2 && size > 5000) {
      return ds.components.card;
    }
    // ...
    return null;
  }
}
```

**Zdroj:** Hindtech syllabus - "How to Create Professional Mockups", PW Skills - "From Wireframes to Prototypes"

---

## Kapitola 13: Pristupnost (Accessibility)

### 13.1 Barevny kontrast

**Popis funkce:**
Kontrola a zajisteni dostatecneho kontrastu textu vuci pozadi dle WCAG standardu.

**WCAG pozadavky:**

| Uroven | Normalni text | Velky text |
|--------|--------------|------------|
| AA | 4.5:1 | 3:1 |
| AAA | 7:1 | 4.5:1 |

**Technicka implementace:**

```typescript
class ContrastChecker {
  // Vypocet relativni svetlosti
  private getLuminance(color: ColorRGB): number {
    const [r, g, b] = [color.r, color.g, color.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  
  // Vypocet kontrastniho pomeru
  getContrastRatio(foreground: ColorRGB, background: ColorRGB): number {
    const l1 = this.getLuminance(foreground);
    const l2 = this.getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }
  
  // Kontrola WCAG compliance
  checkCompliance(
    foreground: ColorRGB,
    background: ColorRGB,
    isLargeText: boolean = false
  ): { aa: boolean; aaa: boolean; ratio: number } {
    const ratio = this.getContrastRatio(foreground, background);
    
    return {
      ratio: Math.round(ratio * 100) / 100,
      aa: isLargeText ? ratio >= 3 : ratio >= 4.5,
      aaa: isLargeText ? ratio >= 4.5 : ratio >= 7
    };
  }
  
  // Navrhnout alternativni barvu s dostatecnym kontrastem
  suggestAccessibleColor(
    color: ColorRGB,
    background: ColorRGB,
    targetRatio: number = 4.5
  ): ColorRGB {
    const hsb = rgbToHsb(color);
    let adjustedColor = { ...color };
    
    // Zkusit upravit brightness
    for (let i = 0; i <= 100; i++) {
      const testHsb = { ...hsb, b: i };
      const testRgb = hsbToRgb(testHsb);
      if (this.getContrastRatio(testRgb, background) >= targetRatio) {
        return testRgb;
      }
    }
    
    return adjustedColor;
  }
}
```

**Zdroj:** Path Unbound - "Design Accessibility", Beginner's Guide - "Accessibility is a critical principle"

---

### 13.2 Velikost interaktivnich prvku

**Popis funkce:**
Minimalni velikosti pro tlacitka a ovladaci prvky pro snadne ovladani.

**Doporuceni:**

| Platforma | Minimalni velikost | Doporucena |
|-----------|-------------------|------------|
| iOS | 44x44pt | 44x44pt |
| Android | 48x48dp | 48x48dp |
| Web (myš) | 24x24px | 32x32px |
| Web (dotyk) | 44x44px | 48x48px |

**Technicka implementace:**

```typescript
interface AccessibilityAudit {
  elementId: string;
  issues: AccessibilityIssue[];
}

interface AccessibilityIssue {
  type: 'contrast' | 'touch-target' | 'missing-alt' | 'keyboard-focus';
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
}

class AccessibilityChecker {
  auditElement(element: Element, platform: 'ios' | 'android' | 'web'): AccessibilityAudit {
    const issues: AccessibilityIssue[] = [];
    
    // Kontrola velikosti interaktivnich prvku
    if (element.isInteractive) {
      const minSize = this.getMinTouchTarget(platform);
      
      if (element.width < minSize || element.height < minSize) {
        issues.push({
          type: 'touch-target',
          severity: 'error',
          message: `Touch target too small: ${element.width}x${element.height}px`,
          suggestion: `Increase to at least ${minSize}x${minSize}px`
        });
      }
    }
    
    // Kontrola alt textu pro obrazky
    if (element.type === 'image' && !element.altText) {
      issues.push({
        type: 'missing-alt',
        severity: 'warning',
        message: 'Image missing alternative text',
        suggestion: 'Add descriptive alt text for screen readers'
      });
    }
    
    return { elementId: element.id, issues };
  }
  
  private getMinTouchTarget(platform: string): number {
    const targets: Record<string, number> = {
      'ios': 44,
      'android': 48,
      'web': 44
    };
    return targets[platform] || 44;
  }
}
```

**Zdroj:** Path Unbound - "Design Accessibility", Beginner's Guide - "Accessibility"

---

### 13.3 Semanticka struktura

**Popis funkce:**
Spravna hierarchie nadpisu a ARIA role pro screen readery.

**Pravidla:**
- Pouze jeden H1 na stranku
- Nadpisy v logickem poradi (H1 > H2 > H3, bez preskoku)
- Interaktivni prvky maji spravne role
- Formulare maji labels

**Technicka implementace:**

```typescript
interface SemanticStructure {
  headings: Array<{ level: number; text: string; elementId: string }>;
  landmarks: Array<{ role: string; label?: string; elementId: string }>;
  forms: Array<{ hasLabels: boolean; elementId: string }>;
}

class SemanticAnalyzer {
  analyzeDocument(): SemanticStructure {
    const headings = this.findHeadings();
    const landmarks = this.findLandmarks();
    const forms = this.findForms();
    
    return { headings, landmarks, forms };
  }
  
  validateHeadingStructure(headings: SemanticStructure['headings']): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    // Kontrola vice H1
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count > 1) {
      issues.push({
        type: 'heading-structure',
        severity: 'warning',
        message: `Multiple H1 elements found (${h1Count})`,
        suggestion: 'Use only one H1 per page'
      });
    }
    
    // Kontrola preskoku urovni
    for (let i = 1; i < headings.length; i++) {
      const diff = headings[i].level - headings[i - 1].level;
      if (diff > 1) {
        issues.push({
          type: 'heading-structure',
          severity: 'error',
          message: `Skipped heading level: H${headings[i - 1].level} to H${headings[i].level}`,
          suggestion: `Add H${headings[i - 1].level + 1} between them`
        });
      }
    }
    
    return issues;
  }
  
  generateARIAAttributes(element: Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    
    if (element.type === 'button' && element.hasIcon && !element.hasText) {
      attrs['aria-label'] = element.iconName || 'Button';
    }
    
    if (element.type === 'input') {
      if (element.label) {
        attrs['aria-labelledby'] = element.label.id;
      } else {
        attrs['aria-label'] = element.placeholder || 'Input';
      }
    }
    
    return attrs;
  }
}
```

**Zdroj:** Path Unbound - "Design Accessibility", Beginner's Guide - "Accessibility"

---

## Kapitola 14: Platformni specificka pravidla

### 14.1 iOS vs Android design

**Popis funkce:**
Dodrzovani specifickych design guidelines pro kazdou platformu.

**Klicove rozdily:**

| Aspekt | iOS (Human Interface Guidelines) | Android (Material Design) |
|--------|----------------------------------|---------------------------|
| Navigace | Tab bar dole, zpet v nav bar | Bottom nav nebo drawer, system back |
| Tlacitka | Zaoblene, bez elevation | Elevation, ripple efekt |
| Typografie | SF Pro | Roboto |
| Ikony | Plne/outline konzistentne | Material icons |
| Gesta | Swipe from edge = back | - |
| Cards | Subtle shadows | Prominent elevation |

**Technicka implementace:**

```typescript
interface PlatformDesignSystem {
  platform: 'ios' | 'android' | 'web';
  typography: {
    primary: string;
    secondary: string;
    sizes: Record<string, number>;
  };
  colors: {
    primary: ColorRGB;
    background: ColorRGB;
    surface: ColorRGB;
    error: ColorRGB;
  };
  spacing: {
    unit: number;
    margins: Record<string, number>;
  };
  components: {
    button: ComponentStyle;
    card: ComponentStyle;
    navigation: ComponentStyle;
  };
}

const iosDesignSystem: PlatformDesignSystem = {
  platform: 'ios',
  typography: {
    primary: 'SF Pro Display',
    secondary: 'SF Pro Text',
    sizes: {
      largeTitle: 34,
      title1: 28,
      title2: 22,
      title3: 20,
      headline: 17,
      body: 17,
      callout: 16,
      subhead: 15,
      footnote: 13,
      caption1: 12,
      caption2: 11
    }
  },
  colors: {
    primary: { r: 0, g: 122, b: 255 }, // iOS Blue
    background: { r: 242, g: 242, b: 247 },
    surface: { r: 255, g: 255, b: 255 },
    error: { r: 255, g: 59, b: 48 }
  },
  spacing: {
    unit: 8,
    margins: { small: 8, medium: 16, large: 20 }
  },
  components: {
    button: {
      cornerRadius: 10,
      minHeight: 44,
      padding: { h: 16, v: 12 }
    },
    card: {
      cornerRadius: 12,
      elevation: 0,
      shadowOpacity: 0.1
    },
    navigation: {
      type: 'tab-bar',
      position: 'bottom'
    }
  }
};

const materialDesignSystem: PlatformDesignSystem = {
  platform: 'android',
  typography: {
    primary: 'Roboto',
    secondary: 'Roboto',
    sizes: {
      h1: 96,
      h2: 60,
      h3: 48,
      h4: 34,
      h5: 24,
      h6: 20,
      subtitle1: 16,
      subtitle2: 14,
      body1: 16,
      body2: 14,
      button: 14,
      caption: 12,
      overline: 10
    }
  },
  colors: {
    primary: { r: 98, g: 0, b: 238 }, // Material Purple
    background: { r: 255, g: 255, b: 255 },
    surface: { r: 255, g: 255, b: 255 },
    error: { r: 176, g: 0, b: 32 }
  },
  spacing: {
    unit: 8,
    margins: { small: 8, medium: 16, large: 24 }
  },
  components: {
    button: {
      cornerRadius: 4,
      minHeight: 48,
      padding: { h: 16, v: 14 },
      elevation: 2
    },
    card: {
      cornerRadius: 4,
      elevation: 1
    },
    navigation: {
      type: 'bottom-navigation',
      position: 'bottom'
    }
  }
};
```

**Zdroj:** Hindtech syllabus - "Android vs. iOS Design", "Flat Design vs. Material Design"

---

# CAST IV: AI INTEGRACE

## Kapitola 15: AI nastroje pro design

### 15.1 AI generovani obrazku

**Popis funkce:**
Integrace AI modelu pro generovani obrazku a ilustraci primo v aplikaci.

**Podporovane funkce:**
- Text-to-image generovani
- Image-to-image (uprava existujiciho)
- Inpainting (lokalni uprava)
- Background removal
- Upscaling

**Technicka implementace:**

```typescript
interface AIImageRequest {
  type: 'text-to-image' | 'image-to-image' | 'inpainting' | 'remove-bg' | 'upscale';
  prompt?: string;
  negativePrompt?: string;
  sourceImage?: Blob;
  mask?: Blob; // pro inpainting
  width?: number;
  height?: number;
  style?: 'realistic' | 'illustration' | 'abstract' | 'pixel-art';
  seed?: number;
}

interface AIImageResponse {
  images: Blob[];
  metadata: {
    seed: number;
    model: string;
    processingTime: number;
  };
}

class AIImageGenerator {
  private apiEndpoint: string;
  
  async generate(request: AIImageRequest): Promise<AIImageResponse> {
    const formData = new FormData();
    formData.append('type', request.type);
    
    if (request.prompt) formData.append('prompt', request.prompt);
    if (request.negativePrompt) formData.append('negative_prompt', request.negativePrompt);
    if (request.sourceImage) formData.append('source_image', request.sourceImage);
    if (request.mask) formData.append('mask', request.mask);
    if (request.width) formData.append('width', request.width.toString());
    if (request.height) formData.append('height', request.height.toString());
    if (request.style) formData.append('style', request.style);
    
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  }
  
  async removeBackground(image: Blob): Promise<Blob> {
    const response = await this.generate({
      type: 'remove-bg',
      sourceImage: image
    });
    return response.images[0];
  }
  
  async upscale(image: Blob, scale: 2 | 4 = 2): Promise<Blob> {
    const response = await this.generate({
      type: 'upscale',
      sourceImage: image,
      width: (await this.getImageDimensions(image)).width * scale
    });
    return response.images[0];
  }
}
```

**Zdroj:** Path Unbound - "Designing with AI", PW Skills - "AI Tools for UI/UX Professionals"

---

### 15.2 AI textove nastroje

**Popis funkce:**
AI asistent pro generovani a upravu textu v designech.

**Funkce:**
- Generovani placeholder textu
- Preklad
- Rewrite (zmena tonu)
- Zkraceni/prodlouzeni
- Gramaticka kontrola

**Technicka implementace:**

```typescript
interface AITextRequest {
  action: 'generate' | 'translate' | 'rewrite' | 'shorten' | 'expand' | 'grammar';
  text?: string;
  context?: string; // kontext pro lepsi vysledky
  targetLanguage?: string;
  tone?: 'formal' | 'casual' | 'professional' | 'friendly';
  maxLength?: number;
}

class AITextAssistant {
  async processText(request: AITextRequest): Promise<string> {
    switch (request.action) {
      case 'generate':
        return this.generateCopy(request.context!, request.tone);
      case 'translate':
        return this.translate(request.text!, request.targetLanguage!);
      case 'rewrite':
        return this.rewrite(request.text!, request.tone!);
      case 'shorten':
        return this.shorten(request.text!, request.maxLength);
      case 'expand':
        return this.expand(request.text!, request.maxLength);
      case 'grammar':
        return this.checkGrammar(request.text!);
    }
  }
  
  async generateCopy(context: string, tone?: string): Promise<string> {
    // Volani LLM API
    const prompt = `Generate marketing copy for: ${context}. Tone: ${tone || 'professional'}`;
    return this.callLLM(prompt);
  }
  
  async translate(text: string, targetLang: string): Promise<string> {
    const prompt = `Translate to ${targetLang}: ${text}`;
    return this.callLLM(prompt);
  }
}
```

**Zdroj:** Path Unbound - "Designing with AI", PW Skills - "AI Tools"

---

### 15.3 AI navrhy designu

**Popis funkce:**
AI doporuceni pro zlepseni designu na zaklade best practices.

**Oblasti analyzy:**
- Vizualni hierarchie
- Barevna pristupnost
- Spacing konzistence
- Typograficka hierarchie
- UX patterns

**Technicka implementace:**

```typescript
interface DesignSuggestion {
  category: 'hierarchy' | 'accessibility' | 'spacing' | 'typography' | 'ux';
  severity: 'info' | 'warning' | 'error';
  element?: string;
  message: string;
  autoFix?: () => void;
}

class AIDesignAnalyzer {
  analyzeDesign(document: Document): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    
    // Analyzovat vizualni hierarchii
    suggestions.push(...this.analyzeHierarchy(document));
    
    // Kontrola pristupnosti
    suggestions.push(...this.analyzeAccessibility(document));
    
    // Konzistence spacingu
    suggestions.push(...this.analyzeSpacing(document));
    
    // Typograficka hierarchie
    suggestions.push(...this.analyzeTypography(document));
    
    return suggestions;
  }
  
  private analyzeHierarchy(doc: Document): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    
    // Detekovat chybejici vizualni hierarchii
    const textElements = doc.findAll({ type: 'text' });
    const sizes = textElements.map(t => t.fontSize);
    const uniqueSizes = new Set(sizes);
    
    if (uniqueSizes.size < 3) {
      suggestions.push({
        category: 'hierarchy',
        severity: 'warning',
        message: 'Limited visual hierarchy - consider using more text size variations'
      });
    }
    
    return suggestions;
  }
  
  private analyzeSpacing(doc: Document): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    
    // Najit nekonzistentni mezery
    const gaps = this.extractGaps(doc);
    const commonGap = this.findMostCommon(gaps);
    
    gaps.forEach((gap, index) => {
      if (gap !== commonGap && Math.abs(gap - commonGap) < 4) {
        suggestions.push({
          category: 'spacing',
          severity: 'info',
          message: `Inconsistent spacing: ${gap}px could be ${commonGap}px`,
          autoFix: () => this.adjustGap(index, commonGap)
        });
      }
    });
    
    return suggestions;
  }
}
```

**Zdroj:** Path Unbound - "Designing with AI", akademicky clanek - UI design principles

---

# CAST V: SPECIFICKE NASTROJE PRO PAINTNOOK

## Kapitola 16: Pixel Art nastroje

### 16.1 Pixel grid editor

**Popis funkce:**
Specializovany editor pro pixel art s podporou nizkeho rozliseni a palety barev.

**Funkce:**
- Snap na pixelovou mrizku
- Zoom bez rozmazani (nearest neighbor)
- Omezena paleta
- Dithering nastroje
- Symetricke kresleni

**Technicka implementace:**

```typescript
interface PixelArtConfig {
  width: number; // typicky 16, 32, 64, 128
  height: number;
  palette: ColorRGB[];
  maxColors: number;
}

class PixelArtEditor {
  private config: PixelArtConfig;
  private pixels: number[][]; // indexy do palety
  private canvas: HTMLCanvasElement;
  private zoom: number = 16; // kazdy pixel = 16x16 screen px
  
  constructor(config: PixelArtConfig) {
    this.config = config;
    this.pixels = Array(config.height).fill(null)
      .map(() => Array(config.width).fill(-1)); // -1 = transparent
    
    // Nastavit canvas s nearest neighbor scalingem
    this.canvas = document.createElement('canvas');
    this.canvas.width = config.width * this.zoom;
    this.canvas.height = config.height * this.zoom;
    this.canvas.style.imageRendering = 'pixelated';
  }
  
  setPixel(x: number, y: number, colorIndex: number): void {
    if (x < 0 || x >= this.config.width || y < 0 || y >= this.config.height) return;
    this.pixels[y][x] = colorIndex;
    this.renderPixel(x, y);
  }
  
  // Dithering pattern
  applyDithering(
    x: number, 
    y: number, 
    color1Index: number, 
    color2Index: number, 
    pattern: 'checker' | 'bayer' | 'noise'
  ): void {
    const useColor1 = this.getDitherValue(x, y, pattern) > 0.5;
    this.setPixel(x, y, useColor1 ? color1Index : color2Index);
  }
  
  private getDitherValue(x: number, y: number, pattern: string): number {
    switch (pattern) {
      case 'checker':
        return (x + y) % 2;
      case 'bayer':
        // 4x4 Bayer matrix
        const bayer = [
          [0, 8, 2, 10],
          [12, 4, 14, 6],
          [3, 11, 1, 9],
          [15, 7, 13, 5]
        ];
        return bayer[y % 4][x % 4] / 16;
      case 'noise':
        return Math.random();
      default:
        return 0.5;
    }
  }
  
  // Symetricke kresleni
  enableSymmetry(type: 'horizontal' | 'vertical' | 'both'): void {
    this.symmetryMode = type;
  }
  
  private drawWithSymmetry(x: number, y: number, colorIndex: number): void {
    this.setPixel(x, y, colorIndex);
    
    if (this.symmetryMode === 'horizontal' || this.symmetryMode === 'both') {
      this.setPixel(this.config.width - 1 - x, y, colorIndex);
    }
    if (this.symmetryMode === 'vertical' || this.symmetryMode === 'both') {
      this.setPixel(x, this.config.height - 1 - y, colorIndex);
    }
    if (this.symmetryMode === 'both') {
      this.setPixel(this.config.width - 1 - x, this.config.height - 1 - y, colorIndex);
    }
  }
  
  exportAsPNG(scale: number = 1): Blob {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.config.width * scale;
    exportCanvas.height = this.config.height * scale;
    const ctx = exportCanvas.getContext('2d')!;
    
    // Disable antialiasing
    ctx.imageSmoothingEnabled = false;
    
    // Draw scaled pixels
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        const colorIndex = this.pixels[y][x];
        if (colorIndex >= 0) {
          const color = this.config.palette[colorIndex];
          ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    
    return new Promise(resolve => {
      exportCanvas.toBlob(blob => resolve(blob!), 'image/png');
    });
  }
}
```

**Zdroj:** Analyza pozadavku - pixel art pro hry

---

### 16.2 Tilemap editor

**Popis funkce:**
Editor pro vytvareni opakujicich se dlazdic (tiles) pro hernı mapy.

**Technicka implementace:**

```typescript
interface Tile {
  id: string;
  pixels: number[][];
  tags: string[]; // 'ground', 'wall', 'decoration'
}

interface TileSet {
  tiles: Tile[];
  tileWidth: number;
  tileHeight: number;
  palette: ColorRGB[];
}

interface TileMap {
  width: number; // v poctu tiles
  height: number;
  layers: TileMapLayer[];
}

interface TileMapLayer {
  name: string;
  data: (string | null)[][]; // tile IDs nebo null
  visible: boolean;
  opacity: number;
}

class TileMapEditor {
  private tileset: TileSet;
  private map: TileMap;
  
  placeTile(layerIndex: number, x: number, y: number, tileId: string): void {
    this.map.layers[layerIndex].data[y][x] = tileId;
    this.renderTile(layerIndex, x, y);
  }
  
  // Auto-tile - automaticke spojovani tiles
  autoTile(layerIndex: number, x: number, y: number, tileGroup: string): void {
    // Analyzovat sousedy
    const neighbors = this.getNeighborMask(layerIndex, x, y, tileGroup);
    
    // Vybrat spravny tile na zaklade sousedu
    const tileId = this.selectAutoTile(tileGroup, neighbors);
    this.placeTile(layerIndex, x, y, tileId);
    
    // Aktualizovat sousedy
    this.updateNeighbors(layerIndex, x, y, tileGroup);
  }
  
  private getNeighborMask(layer: number, x: number, y: number, group: string): number {
    let mask = 0;
    const directions = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],          [1, 0],
      [-1, 1],  [0, 1],  [1, 1]
    ];
    
    directions.forEach((dir, index) => {
      const nx = x + dir[0];
      const ny = y + dir[1];
      const neighbor = this.map.layers[layer].data[ny]?.[nx];
      if (neighbor && this.getTile(neighbor)?.tags.includes(group)) {
        mask |= (1 << index);
      }
    });
    
    return mask;
  }
  
  exportToJSON(): string {
    return JSON.stringify({
      tileset: {
        tileWidth: this.tileset.tileWidth,
        tileHeight: this.tileset.tileHeight,
        tiles: this.tileset.tiles.map(t => t.id)
      },
      map: this.map
    });
  }
}
```

**Zdroj:** Analyza pozadavku - game development

---

## Kapitola 17: Tiskova priprava

### 17.1 CMYK podpora

**Popis funkce:**
Spravna priprava pro profesionalni tisk vcetne spadavek a orizovych znacek.

**Technicka implementace:**

```typescript
interface PrintSettings {
  colorMode: 'cmyk' | 'rgb';
  bleed: number; // mm
  cropMarks: boolean;
  registrationMarks: boolean;
  colorBars: boolean;
  resolution: number; // DPI, typicky 300
}

class PrintExporter {
  private settings: PrintSettings;
  
  exportForPrint(document: Document): Blob {
    // Konvertovat barvy do CMYK
    if (this.settings.colorMode === 'cmyk') {
      this.convertToCMYK(document);
    }
    
    // Pridat bleed
    const withBleed = this.addBleed(document, this.settings.bleed);
    
    // Pridat znacky
    if (this.settings.cropMarks) {
      this.addCropMarks(withBleed);
    }
    if (this.settings.registrationMarks) {
      this.addRegistrationMarks(withBleed);
    }
    if (this.settings.colorBars) {
      this.addColorBars(withBleed);
    }
    
    // Exportovat jako PDF
    return this.exportPDF(withBleed, this.settings.resolution);
  }
  
  private addBleed(doc: Document, bleedMm: number): Document {
    const bleedPx = this.mmToPixels(bleedMm, this.settings.resolution);
    
    // Rozsirit canvas o bleed
    const newWidth = doc.width + (bleedPx * 2);
    const newHeight = doc.height + (bleedPx * 2);
    
    // Posunout obsah
    doc.children.forEach(child => {
      child.x += bleedPx;
      child.y += bleedPx;
    });
    
    return doc;
  }
  
  private addCropMarks(doc: Document): void {
    const markLength = this.mmToPixels(5, this.settings.resolution);
    const markOffset = this.mmToPixels(3, this.settings.resolution);
    
    // Levy horni roh
    this.drawLine(doc, 0, markOffset, markLength, markOffset); // horizontalni
    this.drawLine(doc, markOffset, 0, markOffset, markLength); // vertikalni
    
    // Pravy horni roh
    // ... obdobne pro vsechny rohy
  }
  
  private mmToPixels(mm: number, dpi: number): number {
    return (mm / 25.4) * dpi;
  }
}
```

**Zdroj:** Analyza pozadavku - print design

---

### 17.2 Spot colors a specialni barvy

**Popis funkce:**
Podpora Pantone a jinych specializovanych barevnych systemu.

**Technicka implementace:**

```typescript
interface SpotColor {
  id: string;
  name: string; // napr. "Pantone 185 C"
  type: 'pantone' | 'custom';
  cmykFallback: ColorCMYK;
  rgbPreview: ColorRGB;
  labValues?: { l: number; a: number; b: number };
}

class SpotColorManager {
  private spotColors: Map<string, SpotColor> = new Map();
  
  addPantoneColor(pantoneName: string): SpotColor {
    // Lookup v Pantone databazi
    const pantoneData = this.lookupPantone(pantoneName);
    
    const spot: SpotColor = {
      id: generateId(),
      name: pantoneName,
      type: 'pantone',
      cmykFallback: pantoneData.cmyk,
      rgbPreview: pantoneData.rgb,
      labValues: pantoneData.lab
    };
    
    this.spotColors.set(spot.id, spot);
    return spot;
  }
  
  exportWithSpotColors(doc: Document): Blob {
    // Pri exportu do PDF zachovat spot colors jako separatni kanal
    // Kazda spot color = samostatna tiskova deska
  }
}
```

**Zdroj:** Analyza pozadavku - professional print

---

## Kapitola 18: Mood Board nastroje

### 18.1 Inspiration collector

**Popis funkce:**
Nastroj pro sber a organizaci vizualnich inspiraci.

**Technicka implementace:**

```typescript
interface MoodBoardItem {
  id: string;
  type: 'image' | 'color' | 'font' | 'text' | 'link';
  content: any;
  position: { x: number; y: number };
  size: { width: number; height: number };
  tags: string[];
  source?: string; // URL zdroje
}

interface MoodBoard {
  id: string;
  name: string;
  description?: string;
  items: MoodBoardItem[];
  extractedColors: ColorRGB[];
  extractedFonts: string[];
}

class MoodBoardEditor {
  private board: MoodBoard;
  
  async addImageFromURL(url: string): Promise<MoodBoardItem> {
    const response = await fetch(url);
    const blob = await response.blob();
    
    // Extrahovat dominantni barvy
    const colors = await this.extractColors(blob);
    this.board.extractedColors.push(...colors);
    
    const item: MoodBoardItem = {
      id: generateId(),
      type: 'image',
      content: blob,
      position: this.findEmptyPosition(),
      size: await this.getImageSize(blob),
      tags: [],
      source: url
    };
    
    this.board.items.push(item);
    return item;
  }
  
  async extractColors(image: Blob, count: number = 5): Promise<ColorRGB[]> {
    // Pouzit color quantization (median cut nebo k-means)
    const imageData = await this.getImageData(image);
    return this.medianCutQuantize(imageData, count);
  }
  
  generateColorPalette(): ColorRGB[] {
    // Vybrat nejcastejsi/nejvyraznejsi barvy z mood boardu
    const allColors = this.board.extractedColors;
    return this.clusterColors(allColors, 5);
  }
}
```

**Zdroj:** Hindtech syllabus - "How to create a mood board in Figma", "How I get inspiration for UX projects"

---

# CAST VI: INTEGRACE S VYVOJEM

## Kapitola 19: Developer Handoff

### 19.1 Code generation

**Popis funkce:**
Automaticke generovani kodu z designu pro ruzne platformy.

**Podporovane vystupy:**
- CSS
- React/JSX
- Swift (iOS)
- Kotlin/XML (Android)
- Flutter

**Technicka implementace:**

```typescript
interface CodeGenerator {
  platform: 'css' | 'react' | 'swift' | 'kotlin' | 'flutter';
  generate(element: Element): string;
}

class CSSGenerator implements CodeGenerator {
  platform: 'css' = 'css';
  
  generate(element: Element): string {
    const styles: string[] = [];
    
    // Pozice a velikost
    styles.push(`width: ${element.width}px;`);
    styles.push(`height: ${element.height}px;`);
    
    // Pozadi
    if (element.fill) {
      if (element.fill.type === 'solid') {
        const c = element.fill.color;
        styles.push(`background-color: rgba(${c.r}, ${c.g}, ${c.b}, ${c.a ?? 1});`);
      } else if (element.fill.type === 'gradient') {
        styles.push(`background: ${this.gradientToCSS(element.fill)};`);
      }
    }
    
    // Border radius
    if (element.cornerRadius) {
      if (typeof element.cornerRadius === 'number') {
        styles.push(`border-radius: ${element.cornerRadius}px;`);
      } else {
        styles.push(`border-radius: ${element.cornerRadius.join('px ')}px;`);
      }
    }
    
    // Stiny
    if (element.effects?.length) {
      const shadows = element.effects
        .filter(e => e.type === 'drop-shadow')
        .map(e => `${e.offset.x}px ${e.offset.y}px ${e.blur}px rgba(${e.color.r},${e.color.g},${e.color.b},${e.color.a})`)
        .join(', ');
      if (shadows) styles.push(`box-shadow: ${shadows};`);
    }
    
    return `.${this.generateClassName(element.name)} {\n  ${styles.join('\n  ')}\n}`;
  }
}

class ReactGenerator implements CodeGenerator {
  platform: 'react' = 'react';
  
  generate(element: Element): string {
    const styleObject = this.generateStyleObject(element);
    const componentName = this.toPascalCase(element.name);
    
    return `
const ${componentName} = () => {
  return (
    <div style={${JSON.stringify(styleObject, null, 2)}}>
      ${this.generateChildren(element.children)}
    </div>
  );
};

export default ${componentName};
`.trim();
  }
  
  private generateStyleObject(element: Element): Record<string, string | number> {
    return {
      width: element.width,
      height: element.height,
      backgroundColor: this.colorToString(element.fill?.color),
      borderRadius: element.cornerRadius,
      // ...
    };
  }
}
```

**Zdroj:** Hindtech syllabus - "Code Handoff", "Talking to your developer early"

---

### 19.2 Design tokens export

**Popis funkce:**
Export design tokenu v standardnim formatu pro pouziti v kodu.

**Format (Style Dictionary kompatibilni):**

```json
{
  "color": {
    "primary": {
      "value": "#007AFF",
      "type": "color"
    },
    "secondary": {
      "value": "#5856D6",
      "type": "color"
    }
  },
  "spacing": {
    "xs": { "value": "4px", "type": "spacing" },
    "sm": { "value": "8px", "type": "spacing" },
    "md": { "value": "16px", "type": "spacing" }
  },
  "typography": {
    "heading1": {
      "value": {
        "fontFamily": "SF Pro Display",
        "fontSize": "34px",
        "fontWeight": "700",
        "lineHeight": "41px"
      },
      "type": "typography"
    }
  }
}
```

**Technicka implementace:**

```typescript
interface DesignToken {
  value: any;
  type: 'color' | 'spacing' | 'typography' | 'shadow' | 'borderRadius';
  description?: string;
}

interface DesignTokens {
  [category: string]: {
    [name: string]: DesignToken;
  };
}

class DesignTokenExporter {
  exportTokens(designSystem: DesignSystem): DesignTokens {
    const tokens: DesignTokens = {};
    
    // Barvy
    tokens.color = {};
    designSystem.colorStyles.forEach((style, name) => {
      tokens.color[name] = {
        value: this.colorToHex(style.color),
        type: 'color'
      };
    });
    
    // Typografie
    tokens.typography = {};
    designSystem.textStyles.forEach((style, name) => {
      tokens.typography[name] = {
        value: {
          fontFamily: style.font.family,
          fontSize: `${style.font.size}px`,
          fontWeight: style.font.weight.toString(),
          lineHeight: `${style.font.lineHeight}px`
        },
        type: 'typography'
      };
    });
    
    return tokens;
  }
  
  toCSS(tokens: DesignTokens): string {
    let css = ':root {\n';
    
    Object.entries(tokens).forEach(([category, values]) => {
      Object.entries(values).forEach(([name, token]) => {
        const varName = `--${category}-${name}`.toLowerCase().replace(/\s+/g, '-');
        css += `  ${varName}: ${this.tokenValueToCSS(token)};\n`;
      });
    });
    
    css += '}';
    return css;
  }
  
  toSCSS(tokens: DesignTokens): string {
    let scss = '';
    
    Object.entries(tokens).forEach(([category, values]) => {
      Object.entries(values).forEach(([name, token]) => {
        const varName = `$${category}-${name}`.toLowerCase().replace(/\s+/g, '-');
        scss += `${varName}: ${this.tokenValueToCSS(token)};\n`;
      });
    });
    
    return scss;
  }
}
```

**Zdroj:** Hindtech syllabus - "What are the next level handoffs aka design systems"

---

# SOUHRN KLICOVYCH FUNKCI

## Priorita 1 - Zakladni nastroje

| Funkce | Kapitola | Komplexita |
|--------|----------|------------|
| Vektorove tvary | 1.1, 1.2, 1.3 | Stredni |
| Barevny system (RGB/HSB/CMYK) | 2.1-2.4 | Stredni |
| Typografie a text styles | 3.1-3.3 | Stredni |
| Grid system | 4.1 | Nizka |
| Vrstvy a groups | 5.1 | Nizka |

## Priorita 2 - Design System

| Funkce | Kapitola | Komplexita |
|--------|----------|------------|
| Komponenty a varianty | 5.2, 5.3 | Vysoka |
| Color/Text/Effect styles | 7.1-7.2 | Stredni |
| Auto Layout | 4.3 | Vysoka |
| Constraints | 4.2 | Stredni |

## Priorita 3 - Prototypovani

| Funkce | Kapitola | Komplexita |
|--------|----------|------------|
| Interaktivni propojeni | 6.1 | Vysoka |
| Smart Animate | 6.2 | Vysoka |
| Microinterakce | 6.3 | Stredni |
| Easing editor | 6.4 | Nizka |

## Priorita 4 - Spoluprace

| Funkce | Kapitola | Komplexita |
|--------|----------|------------|
| Real-time kolaborace | 9.1 | Velmi vysoka |
| Komentare | 9.2 | Stredni |
| Export a sdileni | 9.3 | Stredni |

## Priorita 5 - Specificke pro PaintNook

| Funkce | Kapitola | Komplexita |
|--------|----------|------------|
| Pixel Art editor | 16.1 | Stredni |
| Tilemap editor | 16.2 | Vysoka |
| Tiskova priprava | 17.1-17.2 | Stredni |
| AI integrace | 15.1-15.3 | Vysoka |

---

## Zdroje a reference

1. Path Unbound School of UI/UX Design - Course Syllabus 2023
2. PW Skills - UI/UX Design Course
3. Hindtech Learning Point - UI/UX Design Training Syllabus
4. UI/UX Beginner's Career Guide
5. Bilousova et al. - "Fundamentals of UI/UX design as a component of the pre-service specialist's curriculum" (ICHTML 2021)
