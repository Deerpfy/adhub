# 3D Print Calculator

Offline webová aplikace pro kalkulaci ceny 3D tisku na zakázku. Funguje 100% offline bez závislosti na serveru.

## Funkce

### Klíčové funkce (z analýzy)

| Funkce | Popis | Implementace |
|--------|-------|--------------|
| **STL Upload** | Nahrání STL souborů (ASCII/Binary) | Three.js STLLoader |
| **3D Náhled** | Interaktivní 3D vizualizace modelu | Three.js + OrbitControls |
| **Výpočet objemu** | Automatický výpočet objemu ze STL | Signed tetrahedron method |
| **Výpočet váhy** | Váha dle materiálu a infillu | density × volume × infill |
| **Pricing engine** | Komplexní výpočet ceny | 7 komponent nákladů |
| **Profily tiskáren** | Správa více tiskáren | IndexedDB |
| **Databáze materiálů** | Editovatelná databáze materiálů | IndexedDB |
| **Historie kalkulací** | Ukládání výpočtů | IndexedDB |
| **Export** | PDF, JSON, clipboard | Native APIs |
| **Offline režim** | 100% offline funkcionalita | Service Worker + IndexedDB |
| **PWA** | Instalovatelná aplikace | manifest.json |
| **i18n** | Čeština a angličtina | Vlastní i18n modul |

### Vzorec pro výpočet ceny

```
CELKOVÁ_CENA = (MATERIÁL + ELEKTŘINA + AMORTIZACE + ÚDRŽBA + PRÁCE)
               × (1 / (1 - FAILURE_RATE))
               × (1 + MARKUP)
               × URGENCY_FACTOR
```

#### Komponenty výpočtu:

1. **Materiál** = váha_g × (cena_kg / 1000)
2. **Elektřina** = (příkon_W / 1000) × čas_h × cena_kWh
3. **Amortizace** = (cena_tiskárny / životnost_h) × čas_h
4. **Údržba** = sazba_údržby × čas_h
5. **Práce** = hodinová_sazba × čas_práce
6. **Riziko** = base_cost / (1 - failure_rate)
7. **Marže** = adjusted_cost × markup_procento

## Architektura

```
print3d-calc/
├── index.html          # Hlavní HTML struktura
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker pro offline
├── css/
│   └── style.css       # AdHUB design systém
├── js/
│   ├── i18n.js         # Lokalizace (CS/EN)
│   ├── db.js           # IndexedDB wrapper
│   ├── stl-parser.js   # STL parsing + 3D viewer
│   ├── pricing-engine.js # Cenová kalkulace
│   └── app.js          # Hlavní aplikační logika
└── assets/
    └── icon.svg        # PWA ikona
```

### Technologie

| Kategorie | Technologie | Licence |
|-----------|-------------|---------|
| 3D Rendering | Three.js r160 | MIT |
| STL Parsing | Three.js STLLoader | MIT |
| 3D Controls | Three.js OrbitControls | MIT |
| Databáze | IndexedDB | Native |
| Offline | Service Worker | Native |
| PWA | Web App Manifest | Native |

## Instalace

1. Otevřete `index.html` v prohlížeči (doporučeno přes HTTP server)
2. Aplikace se automaticky nainstaluje jako PWA
3. Pro offline režim počkejte na cache všech assets

### Lokální vývoj

```bash
# Spuštění HTTP serveru
cd projects/print3d-calc
python -m http.server 8000

# Nebo
npx serve .
```

## Použití

### 1. Nahrání modelu

- Klikněte na drop zónu nebo přetáhněte STL soubor
- Podporované formáty: .stl (ASCII i Binary)
- Model se zobrazí v 3D náhledu

### 2. Nastavení parametrů

- **Tiskárna**: Výběr z uložených profilů
- **Materiál**: Výběr materiálu (PLA, PETG, ABS, ...)
- **Infill**: 5-100% výplň
- **Počet kusů**: 1-999
- **Čas tisku**: Manuálně nebo odhadem
- **Práce**: Čas přípravy a post-processingu
- **Priorita**: Normální, rychlá (+25%), expresní (+50%)

### 3. Výpočet

- Klikněte "Vypočítat cenu"
- Zobrazí se detailní rozpis nákladů
- Možnost uložit, exportovat nebo zkopírovat

### 4. Správa profilů

V záložce "Nastavení":
- Přidávání/editace tiskáren
- Přidávání/editace materiálů
- Globální nastavení cen
- Export/import dat

## Datový model

### Tiskárna

```javascript
{
    id: "printer_123",
    name: "Prusa MK4",
    power: 120,           // W
    cost: 20000,          // Kč
    lifetime: 5000,       // hodin
    bedX: 250,            // mm
    bedY: 210,            // mm
    bedZ: 210             // mm
}
```

### Materiál

```javascript
{
    id: "pla",
    name: "PLA",
    density: 1.24,        // g/cm³
    pricePerKg: 500,      // Kč/kg
    color: "#4ade80"
}
```

### Nastavení

```javascript
{
    electricityPrice: 7,   // Kč/kWh
    laborRate: 300,        // Kč/h
    maintenanceRate: 2,    // Kč/h tisku
    failureRate: 5,        // %
    markupRate: 30,        // %
    currency: "CZK"
}
```

## Offline funkcionalita

Aplikace funguje plně offline díky:

1. **Service Worker** - cachuje všechny statické assety
2. **IndexedDB** - ukládá všechna data lokálně
3. **Žádné externí API** - vše běží v prohlížeči

### Podporované prohlížeče

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+

## Rozdíly oproti analyzovaným řešením

| Aspekt | Komerční SaaS | Tato aplikace |
|--------|---------------|---------------|
| Cena | $15-199/měsíc | Zdarma |
| Online závislost | Ano | Ne (100% offline) |
| STL analýza | Server-side | Client-side |
| Data | Cloud | Lokální (IndexedDB) |
| Přesnost | Přesný slicing | Odhad z objemu |
| Integrace | API, webhooks | Export JSON/PDF |

## Možnosti rozšíření

1. **G-code parsing** - přesnější odhad času z G-code
2. **STEP/OBJ podpora** - další 3D formáty
3. **Cloud sync** - volitelná synchronizace
4. **Více měn** - automatické kurzy
5. **Šablony nabídek** - profesionální PDF export
6. **Srovnání materiálů** - vizuální porovnání

## Zdroje

Aplikace je založena na analýze:
- [Prusa 3D Printing Price Calculator](https://blog.prusa3d.com/3d-printing-price-calculator_38905/)
- [AutoQuote3D](https://autoquote3d.com/)
- [DigiFabster](https://digifabster.com/)
- [VOLARYX](https://www.volaryx.com/)
- [GitHub open-source kalkulátory](https://github.com/topics/3d-printing)

## Licence

MIT - volně použitelné pro osobní i komerční účely.

---

**AdHUB** - 3D Print Calculator v1.0
