# Scribblix v2.0

**100% Offline dokumentační platforma inspirovaná GitBook**

Scribblix je lokální, offline-first dokumentační nástroj, který kombinuje intuitivní WYSIWYG editor s pokročilými funkcemi inspirovanými platformou GitBook.

## Nové funkce v2.0

### Content Blocks (GitBook-style)

Rozšířená markdown syntaxe pro vytváření bohatého obsahu:

#### Hint Blocks
```markdown
:::info
Toto je informační blok
:::

:::warning
Toto je varovný blok
:::

:::danger
Toto je blok s chybou/nebezpečím
:::

:::success
Toto je blok úspěchu
:::
```

#### Rozbalovací sekce (Expandables)
```markdown
<details>
<summary>Klikněte pro rozbalení</summary>

Skrytý obsah...

</details>
```

#### Záložky (Tabs)
```markdown
:::tabs
:::tab JavaScript
console.log('Hello');
:::
:::tab Python
print('Hello')
:::
:::endtabs
```

### Dark/Light Mode

- Automatické přepínání tématu
- Podpora systémových preferencí (`prefers-color-scheme`)
- Uložení preference do IndexedDB

### Historie verzí

- Automatické ukládání verzí stránek
- Možnost obnovení starších verzí
- Max 50 verzí na stránku

### Vylepšená přístupnost (WCAG 2.1)

- Skip to content link
- Focus visible pro všechny interaktivní prvky
- ARIA atributy pro screen readery
- Podpora klávesnicové navigace
- Respektování `prefers-reduced-motion`

## Technologie

| Knihovna | Verze | Licence | Účel |
|----------|-------|---------|------|
| Dexie.js | 3.2.4 | Apache 2.0 | IndexedDB wrapper |
| Marked.js | 11.1.1 | MIT | Markdown parser |
| DOMPurify | 3.0.6 | Apache 2.0/MIT | XSS sanitizace |
| FlexSearch | 0.7.31 | Apache 2.0 | Full-text search |

## Struktura projektu

```
scribblix/
├── index.html          # Hlavní HTML s UI
├── styles.css          # CSS styly (vč. light/dark theme)
├── db.js               # Databázová vrstva (Dexie.js)
├── editor.js           # Markdown editor
├── blocks.js           # Content blocks procesor
├── theme.js            # Theme manager
├── search.js           # Full-text vyhledávání
├── export.js           # Export/import funkcionalita
├── app.js              # Hlavní aplikační logika
├── sw.js               # Service Worker pro PWA
├── manifest.json       # PWA manifest
└── icons/              # Ikony aplikace
```

## Klíčové funkce

### Editor
- WYSIWYG Markdown editor
- Real-time preview
- Toolbar s formátováním
- Undo/Redo
- Auto-save (každých 30s)

### Organizace
- Spaces (prostory/projekty)
- Hierarchické stránky
- Drag & drop řazení

### Vyhledávání
- Full-text search přes obsah
- Rychlý přístup (Ctrl+K)

### Export/Import
- JSON (kompletní záloha)
- Markdown soubory
- HTML export

## Mapování GitBook funkcí

| GitBook funkce | Scribblix implementace |
|----------------|------------------------|
| WYSIWYG Editor | Marked.js + custom preview |
| Git Sync | ❌ (offline only) |
| AI Search | FlexSearch (lokální) |
| Hints | Custom markdown syntax |
| Tabs | Custom markdown syntax |
| Expandables | HTML details/summary |
| Dark Mode | CSS variables + theme.js |
| Verzování | IndexedDB history |
| SSO/SAML | ❌ (N/A pro offline) |

## Instalace

1. Stáhněte projekt
2. Otevřete `index.html` v prohlížeči
3. Nebo nainstalujte jako PWA

## Použití

### Vytvoření prostoru
1. Klikněte na "Nový prostor"
2. Zadejte název a vyberte ikonu
3. Automaticky se vytvoří první stránka

### Psaní dokumentace
- Použijte markdown syntaxi
- Toolbar pro rychlé formátování
- Ctrl+S pro manuální uložení

### Content Blocks
- Klikněte na ikony ℹ️ ⚠️ 🚫 ✅ v toolbaru
- Nebo použijte markdown syntaxi `:::type`

### Historie verzí
- Klikněte na 🕐 v header editoru
- Vyberte verzi pro obnovení

## Odchylky od GitBook

1. **Offline-only** - Žádná serverová komponenta
2. **Bez Git integrace** - Data v IndexedDB
3. **Bez AI** - Lokální full-text search
4. **Bez autentizace** - Lokální aplikace
5. **Vlastní markdown rozšíření** - Jiná syntaxe pro bloky

## Licence

Projekt využívá výhradně open-source knihovny s permisivními licencemi (MIT, Apache 2.0).

---

*Inspirováno analýzou platformy GitBook*
*Verze: 2.0.0*
