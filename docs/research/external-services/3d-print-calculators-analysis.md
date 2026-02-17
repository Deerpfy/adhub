---
title: "Analýza webových řešení: Cenové kalkulace 3D tisku na zakázku"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Analýza webových řešení: Cenové kalkulace 3D tisku na zakázku

**Datum analýzy**: 2025-12-28
**Autor**: Claude Code Analysis
**Verze**: 1.0

---

## Shrnutí

Tato analýza pokrývá **8 kategorií řešení** pro online cenové kalkulace 3D tisku - od profesionálních SaaS platforem (AutoQuote3D, DigiFabster) přes bezplatné nástroje (Prusa, OmniCalculator) až po open-source knihovny. Klíčové zjištění: nejefektivnější řešení kombinují automatickou analýzu STL souborů s konfigurovatelným pricing engine a integrací platebních bran. České řešení VOLARYX nabízí kompletní white-label řešení pro lokální trh.

---

## 1. Profesionální SaaS řešení

### 1.1 AutoQuote3D

**URL**: https://autoquote3d.com/
**Typ**: SaaS platforma pro 3D tiskové služby
**Cena**: Od $15/měsíc (Starter), roční plány = 2 měsíce zdarma

#### Technická analýza

| Kategorie | Technologie | Poznámka |
|-----------|-------------|----------|
| Hosting souborů | Cloudflare R2 | Bezpečné úložiště |
| Platby | Stripe | Žádné transakční poplatky navíc |
| Integrace | iframe/HTML snippet | Embed na libovolný web |
| API | Server-to-server | Pro vlastní integrace |

#### Klíčové funkce

| Funkce | Popis | Implementace | Hodnocení |
|--------|-------|--------------|-----------|
| Instant Quoting | Automatické nacenění po uploadu | Slicing engine + algoritmus | ⭐⭐⭐⭐⭐ |
| Multi-technologie | FDM, SLA, SLS, MJF | Konfigurovatelné profily | ⭐⭐⭐⭐⭐ |
| Urgency pricing | Příplatky za rychlé dodání | Procentuální markup | ⭐⭐⭐⭐ |
| Workflow management | Správa objednávek | Dashboard | ⭐⭐⭐⭐ |
| Upselling | Doporučení doplňků | Automatické návrhy | ⭐⭐⭐⭐ |

#### Vzorec pro výpočet ceny

```
Cena = (Materiál + Práce + Provoz) × (1 + Markup%) × Urgency_faktor
```

#### Silné stránky
- Nejnižší vstupní cena na trhu ($15/měsíc)
- Zero transaction fees (pouze Stripe poplatky)
- Připravovaná AI integrace a multi-language support

#### Slabé stránky
- Omezené customization v nižších tierech
- Chybí ShipStation integrace (plánováno)

---

### 1.2 DigiFabster

**URL**: https://digifabster.com/
**Typ**: Enterprise quoting & eCommerce platforma
**Cena**: Tiered pricing (kontaktovat pro ceny), bez provizí

#### Technická analýza

| Kategorie | Technologie | Poznámka |
|-----------|-------------|----------|
| Šifrování | AES-256 | Enterprise-grade |
| ITAR | On-premise varianta | Pro defense sector |
| Integrace | QuickBooks, HubSpot, Shopify | Native connectors |
| API | REST API | Plná integrace |

#### Klíčové funkce

| Funkce | Popis | Implementace | Hodnocení |
|--------|-------|--------------|-----------|
| Multi-manufacturing | 3D tisk, CNC, laser, injection molding | Unified platform | ⭐⭐⭐⭐⭐ |
| CAD File Viewer | 3D náhled před objednávkou | WebGL viewer | ⭐⭐⭐⭐⭐ |
| Manufacturability check | Automatická kontrola vyrobitelnosti | AI analýza | ⭐⭐⭐⭐⭐ |
| Kanban board | Vizuální workflow | Drag & drop | ⭐⭐⭐⭐ |
| Abandoned cart | Sledování opuštěných košíků | Email recovery | ⭐⭐⭐⭐ |

#### Pricing Engine - konfigurovatelné parametry

```javascript
const pricingConfig = {
  machineTime: 0.50,        // $/hod
  materials: {
    PLA: 0.025,             // $/g
    ABS: 0.030,
    PETG: 0.035,
    Nylon: 0.080,
    Resin: 0.120
  },
  labor: {
    setup: 15.00,           // $ per job
    postProcess: 25.00      // $/hod
  },
  finishing: {
    sanding: 10.00,
    painting: 25.00,
    vapor_smoothing: 15.00
  },
  discounts: {
    volume: [
      { qty: 10, discount: 0.05 },
      { qty: 50, discount: 0.10 },
      { qty: 100, discount: 0.15 }
    ]
  },
  rushPremium: 1.5          // 50% příplatek
};
```

#### Silné stránky
- Nejkomplexnější řešení pro manufacturing
- ITAR compliance pro citlivé projekty
- 200+ zákazníků, ověřená platforma

#### Slabé stránky
- Vyšší cena (enterprise positioning)
- Složitější setup
- Reported: občasná nekonzistence v quoting accuracy

---

### 1.3 Layers.app

**URL**: https://layers.app/
**Typ**: 3D print shop management software
**Cena**: ZDARMA (základní), placené enterprise plány

#### Technická analýza

| Kategorie | Technologie | Poznámka |
|-----------|-------------|----------|
| SSL | Automatické certifikáty | HTTPS |
| Platby | Stripe, PayPal | Multi-gateway |
| Lokalizace | Multi-language, multi-currency | Global ready |

#### Klíčové funkce

| Funkce | Popis | Implementace | Hodnocení |
|--------|-------|--------------|-----------|
| Public Auto-quoter | Veřejný widget pro weby | Embed code | ⭐⭐⭐⭐ |
| STL repair | Automatická oprava modelů | Built-in | ⭐⭐⭐⭐⭐ |
| Pricing methods | Čas, objem, váha, bounding box | Konfigurovatelné | ⭐⭐⭐⭐ |
| Coupon management | Slevy specifické pro 3D tisk | Flexibilní pravidla | ⭐⭐⭐⭐ |
| Role management | Přístupy pro tým | RBAC | ⭐⭐⭐ |

#### Silné stránky
- **Kompletně zdarma** pro základní použití
- Integrovaná oprava STL souborů
- Podpora více jazyků a měn

#### Slabé stránky
- Nižší score v recenzích (50/100 Crozdesk)
- Menší komunita uživatelů
- Laser cutting teprve plánován

---

## 2. Bezplatné online kalkulátory

### 2.1 Prusa 3D Printing Price Calculator

**URL**: https://blog.prusa3d.com/3d-printing-price-calculator_38905/
**Typ**: Bezplatný web-based kalkulátor
**Cena**: Zdarma

#### Funkční analýza

| Funkce | Popis | Hodnocení |
|--------|-------|-----------|
| G-code upload | Načtení souboru pro automatické hodnoty | ⭐⭐⭐⭐⭐ |
| Manuální vstup | Čas tisku, váha filamentu | ⭐⭐⭐⭐⭐ |
| Předvyplněné hodnoty | Typické hodnoty pro Prusa tiskárny | ⭐⭐⭐⭐ |
| Export | Uložení, tisk, sdílení výsledků | ⭐⭐⭐⭐ |
| Měny | ~100 různých měn | ⭐⭐⭐⭐⭐ |

#### Struktura nákladů

```
CELKOVÁ CENA = Materiál + Práce + Provoz tiskárny + Marže

Kde:
- Materiál = cena_filamentu × spotřeba_g × (1 + failure_rate)
- Práce = hodinová_sazba × čas_práce
- Provoz = (příkon_W × čas_h × cena_kWh) + údržba
- Marže = Materiál × markup_procento (typicky 30%)
```

#### Příklad výpočtu (z dokumentace)

```
Komplexní model:
- Materiál: 50.39 USD
- Práce: 0.8 USD
- Provoz: 0.21 × 41.8h + 0.023 × 41.8h = 9.74 USD
- Marže (30%): 50.39 × 0.3 = 15.12 USD
- CELKEM: 76.05 USD
```

#### Dodatečné náklady (konfigurovatelné)

- Kapton páska
- Lepicí tyčinky
- Trysky (opotřebení)
- Další spotřební materiál

#### Známý bug
⚠️ Při uploadu G-code s časem "1 den 1 hodina 14 minut" kalkulátor registruje pouze "1 hodina 13 minut"

---

### 2.2 OmniCalculator

**URL**: https://www.omnicalculator.com/other/3d-printing
**Typ**: Bezplatný edukační kalkulátor
**Cena**: Zdarma

#### Vzorec

```
Finální cena = (Náklady na materiál + Náklady na práci) × (100% + Markup)

Náklady na materiál = (váha_tisku_g / váha_cívky_g) × cena_cívky
Náklady na práci = čas_tisku × hodinová_sazba
```

#### Podporované materiály

| Materiál | Hustota (g/cm³) | Typická cena |
|----------|-----------------|--------------|
| PLA | 1.24 | $20-30/kg |
| ABS | 1.04 | $20-35/kg |
| PETG | 1.27 | $25-40/kg |
| TPU | 1.21 | $30-50/kg |
| Nylon | 1.14 | $50-80/kg |
| Custom | Konfigurovatelné | - |

#### Silné stránky
- Jednoduchý, přehledný interface
- Edukační vysvětlení vzorců
- Žádná registrace

#### Slabé stránky
- Bez upload STL/G-code
- Pouze manuální vstup
- Bez pokročilých funkcí

---

## 3. České řešení

### 3.1 VOLARYX

**URL**: https://www.volaryx.com/
**Typ**: SaaS kalkulačka pro české 3D tiskaře
**Autor**: Ondřej Hubáček (For3Dtisk.cz)
**Cena**: Bez skrytých poplatků, bez provizí z prodeje

#### O projektu

- Vytvořeno na základě **2 500+ realizovaných zakázek**
- Řeší problém: automatizace časově náročného naceňování
- Výsledek: místo poptávek chodí rovnou objednávky

#### Klíčové funkce

| Funkce | Popis | Hodnocení |
|--------|-------|-----------|
| Upload 3D modelu | Automatické generování ceny | ⭐⭐⭐⭐ |
| White-label embed | Vložení na vlastní web | ⭐⭐⭐⭐⭐ |
| Workflow customization | Přizpůsobení procesů | ⭐⭐⭐⭐ |
| CZ lokalizace | Plná podpora češtiny | ⭐⭐⭐⭐⭐ |

#### Výhody pro český trh

- Česká podpora a dokumentace
- Znalost lokálního trhu
- Integrace s českými platebními metodami

---

### 3.2 Další české služby

| Služba | URL | Specialita |
|--------|-----|------------|
| For3Dtisk | for3dtisk.cz | Kalkulačka + služby |
| Studio3Dtisk | studio3dtisk.cz | FDM zakázkový tisk |
| MP JET | mpjet.com | STL upload + odhad |
| JL Creative Studio | jlcreativestudio.cz | Sdílitelné výpočty |

---

## 4. WordPress / WooCommerce pluginy

### 4.1 3DPrint Lite / Premium

**URL**: https://www.wp3dprinting.com/
**Typ**: WordPress plugin
**Cena**: Lite = zdarma, Premium = placené

#### Funkce Premium verze

```php
// Pricing modes
$pricing_modes = [
    'weight'           => 'Cena za gram',
    'volume'           => 'Cena za cm³',
    'support_volume'   => 'Cena za support materiál',
    'bounding_box'     => 'Cena za bounding box',
    'per_hour'         => 'Cena za hodinu tisku'
];

// Dodatečné funkce
$features = [
    'woocommerce_integration',
    'bulk_upload',
    'image_to_stl',      // JPG/PNG → STL konverze
    'zip_file_support',
    'infill_calculation',
    'support_calculation'
];
```

### 4.2 Phanes 3DP Calculator

**Cena**: $179/rok
**Specialita**: AstroPrint integrace pro automatické spuštění tisku

### 4.3 3D Print Pricing Calculator (WordPress.org)

**Cena**: Zdarma
**Funkce**:
- STL upload s validací
- Rotace modelu
- Infill kalkulace
- Support material estimate
- Email notifikace
- WP Mail integrace

---

## 5. Open-source řešení (GitHub)

### 5.1 JavaScript/Node.js

#### DigitallyTailored/3d-print-cost-calculator

```javascript
// Architektura
// POST /uploads - upload STL (binary/ASCII)
// Parsování STL → výpočet volume → JSON response

const calculateCost = (meshData, materials, settings) => {
  const volume = calculateMeshVolume(meshData);
  const weight = volume * materials[selected].density;
  const materialCost = weight * materials[selected].pricePerGram;
  const timeCost = estimatePrintTime(meshData) * settings.hourlyRate;

  return {
    volume,
    weight,
    materialCost,
    timeCost,
    total: materialCost + timeCost
  };
};
```

### 5.2 Python

#### W3DPCalc (Terminal-based)

```python
# Faktory pro výpočet
factors = {
    'material_cost': filament_price_per_gram * weight,
    'electricity': power_consumption * time * electricity_rate,
    'depreciation': printer_cost / lifetime_hours * print_time,
    'labor': hourly_rate * labor_time
}

total_cost = sum(factors.values())
price = total_cost * (1 + profit_margin)
```

### 5.3 PHP

#### stl-calc

```php
class STLCalc {
    // Jádro výpočtu - SignedVolumeOfTriangle
    private function SignedVolumeOfTriangle($p1, $p2, $p3) {
        $v321 = $p3[0] * $p2[1] * $p1[2];
        $v231 = $p2[0] * $p3[1] * $p1[2];
        $v312 = $p3[0] * $p1[1] * $p2[2];
        $v132 = $p1[0] * $p3[1] * $p2[2];
        $v213 = $p2[0] * $p1[1] * $p3[2];
        $v123 = $p1[0] * $p2[1] * $p3[2];

        return (1.0/6.0) * (-$v321 + $v231 + $v312 - $v132 - $v213 + $v123);
    }

    // Veřejné metody
    public function GetVolume();      // cm³
    public function GetWeight();       // gramy (dle density)
    public function GetDensity();
    public function SetDensity($d);
    public function GetTrianglesCount();
}
```

### 5.4 C

#### stl-parser

```c
// Podporované materiály s hustotami
typedef struct {
    char* name;
    float density;  // g/cm³
    float price;    // $/g
} Material;

Material materials[] = {
    {"ABS", 1.04, 0.025},
    {"PLA", 1.24, 0.022},
    {"CFRP", 1.55, 0.150},
    {"Aluminum", 2.70, 0.500},
    {"Steel", 7.85, 0.300},
    {"Titanium", 4.50, 1.200},
    {"Resin", 1.10, 0.100}
};
```

---

## 6. Algoritmus výpočtu ceny - detailní rozbor

### 6.1 Základní vzorec

```
TOTAL_PRICE = (MATERIAL + ELECTRICITY + DEPRECIATION + LABOR) × (1 + MARKUP) × RISK_ADJUSTMENT
```

### 6.2 Komponenty výpočtu

#### Materiál

```python
def calculate_material_cost(weight_g, filament_price_per_kg):
    """
    weight_g: váha modelu v gramech (ze sliceru nebo STL analýzy)
    filament_price_per_kg: cena cívky za kg
    """
    price_per_gram = filament_price_per_kg / 1000
    return weight_g * price_per_gram

# Příklad: 50g model, cívka PLA za 500 Kč/kg
# 50 × 0.5 = 25 Kč
```

#### Elektřina

```python
def calculate_electricity_cost(print_time_hours, power_watts, price_per_kwh):
    """
    Typický příkon FDM tiskárny: 100-150W
    Typická cena v ČR: 6-8 Kč/kWh
    """
    kwh_consumed = (power_watts / 1000) * print_time_hours
    return kwh_consumed * price_per_kwh

# Příklad: 10h tisk, 120W, 7 Kč/kWh
# (120/1000) × 10 × 7 = 8.4 Kč
```

#### Amortizace tiskárny

```python
def calculate_depreciation(printer_cost, lifetime_hours, print_time_hours):
    """
    Typická životnost: 5000-10000 hodin
    """
    cost_per_hour = printer_cost / lifetime_hours
    return cost_per_hour * print_time_hours

# Příklad: Tiskárna 20000 Kč, 5000h životnost, 10h tisk
# (20000/5000) × 10 = 40 Kč
```

#### Práce

```python
def calculate_labor_cost(hourly_rate, prep_time, post_process_time):
    """
    Příprava: kontrola modelu, nastavení, spuštění
    Post-processing: odstranění supportů, čištění, balení
    """
    total_labor_hours = prep_time + post_process_time
    return hourly_rate * total_labor_hours

# Příklad: 300 Kč/h, 0.25h příprava, 0.5h post-processing
# 300 × 0.75 = 225 Kč
```

#### Risk adjustment (failure rate)

```python
def adjust_for_failure_rate(base_cost, failure_rate):
    """
    failure_rate: 0.05 = 5% selhání
    """
    return base_cost / (1 - failure_rate)

# Příklad: 100 Kč base, 10% failure rate
# 100 / (1 - 0.1) = 111.11 Kč
```

### 6.3 Kompletní implementace

```python
class PrintCostCalculator:
    def __init__(self, config):
        self.config = config

    def calculate(self, model_weight_g, print_time_h, labor_time_h=0.5):
        # Materiál
        material = model_weight_g * (self.config['filament_price'] / 1000)

        # Elektřina
        electricity = (self.config['printer_power'] / 1000) * print_time_h * self.config['electricity_price']

        # Amortizace
        depreciation = (self.config['printer_cost'] / self.config['lifetime_hours']) * print_time_h

        # Údržba (trysky, pásky, lepidla)
        maintenance = print_time_h * self.config['maintenance_per_hour']

        # Práce
        labor = labor_time_h * self.config['hourly_rate']

        # Základ
        base_cost = material + electricity + depreciation + maintenance + labor

        # Risk adjustment
        adjusted_cost = base_cost / (1 - self.config['failure_rate'])

        # Markup
        final_price = adjusted_cost * (1 + self.config['markup'])

        return {
            'breakdown': {
                'material': round(material, 2),
                'electricity': round(electricity, 2),
                'depreciation': round(depreciation, 2),
                'maintenance': round(maintenance, 2),
                'labor': round(labor, 2),
                'risk_adjustment': round(adjusted_cost - base_cost, 2),
                'profit': round(final_price - adjusted_cost, 2)
            },
            'total': round(final_price, 2)
        }

# Příklad konfigurace pro ČR
config = {
    'filament_price': 500,        # Kč/kg
    'printer_power': 120,          # W
    'electricity_price': 7,        # Kč/kWh
    'printer_cost': 20000,         # Kč
    'lifetime_hours': 5000,        # hodin
    'maintenance_per_hour': 2,     # Kč/h
    'hourly_rate': 300,            # Kč/h
    'failure_rate': 0.05,          # 5%
    'markup': 0.30                 # 30%
}

calc = PrintCostCalculator(config)
result = calc.calculate(model_weight_g=100, print_time_h=8, labor_time_h=0.75)
```

---

## 7. Referenční ceny materiálů

### FDM Filamenty

| Materiál | Cena (Kč/kg) | Hustota (g/cm³) | Použití |
|----------|--------------|-----------------|---------|
| PLA | 400-600 | 1.24 | Prototypy, dekorace |
| ABS | 450-650 | 1.04 | Funkční díly |
| PETG | 500-700 | 1.27 | Mechanické díly |
| TPU | 800-1200 | 1.21 | Pružné díly |
| Nylon | 1200-2000 | 1.14 | Průmyslové díly |
| ASA | 600-900 | 1.07 | Exteriér |
| PC | 1000-1500 | 1.20 | High-temp |
| Carbon fiber | 1500-3000 | 1.30 | Strukturální |

### SLA Resiny

| Materiál | Cena (Kč/L) | Použití |
|----------|-------------|---------|
| Standard | 800-1500 | Prototypy |
| Tough | 1500-2500 | Funkční díly |
| Flexible | 2000-3500 | Pružné díly |
| Dental | 3000-6000 | Medicína |
| Castable | 2500-4000 | Šperky |

### Průmyslové (SLS/MJF)

| Materiál | Cena (Kč/kg) |
|----------|--------------|
| Nylon PA12 | 1500-4000 |
| Nylon PA11 | 2000-5000 |
| TPU (SLS) | 3000-6000 |
| Hliník | 15000+ |
| Titan | 50000+ |

---

## 8. Srovnávací tabulka řešení

| Řešení | Cena | STL Upload | Auto-quote | API | E-commerce | Hodnocení |
|--------|------|------------|------------|-----|------------|-----------|
| **AutoQuote3D** | $15/měs | ✅ | ✅ | ✅ | Stripe/Shopify | ⭐⭐⭐⭐⭐ |
| **DigiFabster** | Enterprise | ✅ | ✅ | ✅ | Plná integrace | ⭐⭐⭐⭐⭐ |
| **Layers.app** | Zdarma | ✅ | ✅ | ❌ | Stripe/PayPal | ⭐⭐⭐⭐ |
| **VOLARYX** | Bez provizí | ✅ | ✅ | ❌ | Embed widget | ⭐⭐⭐⭐ |
| **Prusa Calc** | Zdarma | G-code | ❌ | ❌ | ❌ | ⭐⭐⭐⭐ |
| **OmniCalc** | Zdarma | ❌ | ❌ | ❌ | ❌ | ⭐⭐⭐ |
| **WP 3DPrint** | $179/rok | ✅ | ✅ | ❌ | WooCommerce | ⭐⭐⭐⭐ |
| **Open-source** | Zdarma | ✅ | Vlastní | Vlastní | Vlastní | ⭐⭐⭐ |

---

## 9. Doporučení podle use-case

### Pro začínající 3D tiskovou službu

| Priorita | Doporučení | Důvod |
|----------|------------|-------|
| 1 | **Layers.app** | Zdarma, plně funkční |
| 2 | **AutoQuote3D Starter** | $15/měs, profesionální |
| 3 | **VOLARYX** | České řešení, bez provizí |

### Pro střední firmu

| Priorita | Doporučení | Důvod |
|----------|------------|-------|
| 1 | **AutoQuote3D** | Nejlepší price/value |
| 2 | **DigiFabster** | Komplexní funkce |
| 3 | **Layers.app Enterprise** | Customizace |

### Pro e-shop (WordPress/WooCommerce)

| Priorita | Doporučení | Důvod |
|----------|------------|-------|
| 1 | **3DPrint Premium** | Native WooCommerce |
| 2 | **AutoQuote3D embed** | Widget integrace |
| 3 | **Open-source + custom** | Plná kontrola |

### Pro enterprise/manufacturing

| Priorita | Doporučení | Důvod |
|----------|------------|-------|
| 1 | **DigiFabster** | ITAR, multi-tech |
| 2 | **Custom řešení** | Specifické požadavky |

---

## 10. Technická implementace vlastního řešení

### Architektura

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ STL Upload  │  │ 3D Viewer   │  │ Price Form  │      │
│  │ (drag&drop) │  │ (Three.js)  │  │ (React/Vue) │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      BACKEND                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ STL Parser  │  │ Price Engine│  │ Order Mgmt  │      │
│  │ (volume,    │  │ (materials, │  │ (DB, email, │      │
│  │  weight)    │  │  time, cost)│  │  payments)  │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    INTEGRACE                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   Stripe    │  │  Shipping   │  │   CRM/ERP   │      │
│  │  (platby)   │  │ (doprava)   │  │ (QuickBooks)│      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### Minimální viable product (MVP)

```html
<!-- Frontend: STL upload + kalkulace -->
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <title>3D Tisk Kalkulačka</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js"></script>
</head>
<body>
    <div id="calculator">
        <input type="file" id="stl-upload" accept=".stl">
        <div id="preview"></div>
        <select id="material">
            <option value="pla" data-price="0.5" data-density="1.24">PLA</option>
            <option value="petg" data-price="0.6" data-density="1.27">PETG</option>
            <option value="abs" data-price="0.55" data-density="1.04">ABS</option>
        </select>
        <input type="number" id="quantity" value="1" min="1">
        <div id="result"></div>
    </div>

    <script>
    // STL Volume Calculator
    function calculateSTLVolume(geometry) {
        let volume = 0;
        const positions = geometry.attributes.position.array;

        for (let i = 0; i < positions.length; i += 9) {
            const p1 = [positions[i], positions[i+1], positions[i+2]];
            const p2 = [positions[i+3], positions[i+4], positions[i+5]];
            const p3 = [positions[i+6], positions[i+7], positions[i+8]];

            volume += signedVolumeOfTriangle(p1, p2, p3);
        }

        return Math.abs(volume);
    }

    function signedVolumeOfTriangle(p1, p2, p3) {
        return (
            p1[0] * (p2[1] * p3[2] - p3[1] * p2[2]) -
            p2[0] * (p1[1] * p3[2] - p3[1] * p1[2]) +
            p3[0] * (p1[1] * p2[2] - p2[1] * p1[2])
        ) / 6;
    }

    // Price calculation
    function calculatePrice(volume, material, quantity) {
        const materialEl = document.querySelector(`#material option[value="${material}"]`);
        const pricePerGram = parseFloat(materialEl.dataset.price);
        const density = parseFloat(materialEl.dataset.density);

        const volumeCm3 = volume / 1000; // mm³ → cm³
        const weight = volumeCm3 * density;
        const materialCost = weight * pricePerGram;

        // Přirážky
        const electricityCost = estimatePrintTime(volume) * 0.12 * 7;
        const laborCost = 50; // fixní příprava
        const markup = 0.30;

        const baseCost = materialCost + electricityCost + laborCost;
        const finalPrice = baseCost * (1 + markup) * quantity;

        return {
            weight: weight.toFixed(1),
            materialCost: materialCost.toFixed(2),
            total: finalPrice.toFixed(2)
        };
    }

    function estimatePrintTime(volumeMm3) {
        // Hrubý odhad: 1cm³ ≈ 6 minut při 50mm/s
        return (volumeMm3 / 1000) * 0.1; // hodiny
    }

    // Event handlers
    document.getElementById('stl-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
            const loader = new THREE.STLLoader();
            const geometry = loader.parse(event.target.result);
            const volume = calculateSTLVolume(geometry);

            const material = document.getElementById('material').value;
            const quantity = parseInt(document.getElementById('quantity').value);
            const result = calculatePrice(volume, material, quantity);

            document.getElementById('result').innerHTML = `
                <p>Objem: ${(volume/1000).toFixed(2)} cm³</p>
                <p>Váha: ${result.weight} g</p>
                <p>Materiál: ${result.materialCost} Kč</p>
                <p><strong>Celkem: ${result.total} Kč</strong></p>
            `;
        };

        reader.readAsArrayBuffer(file);
    });
    </script>
</body>
</html>
```

---

## 11. Silné stránky analyzovaných řešení

1. **Automatizace** - eliminace manuálního naceňování (VOLARYX: "místo poptávek chodí rovnou objednávky")
2. **Transparentnost** - zákazník vidí cenu okamžitě
3. **Škálovatelnost** - SaaS řešení zvládnou růst bez dodatečné práce
4. **Integrace** - propojení s platebními branami a e-commerce
5. **STL analýza** - automatický výpočet objemu a váhy

---

## 12. Slabé stránky a doporučení

| Problém | Závažnost | Doporučení | Priorita |
|---------|-----------|------------|----------|
| Přesnost bez G-code | Střední | Použít slicing API nebo vlastní slicer | Vysoká |
| Chybějící API u free tier | Střední | Upgrade na placený plán nebo open-source | Střední |
| Komplexní setup enterprise | Nízká | Využít onboarding podporu | Nízká |
| Bug v Prusa calc (čas) | Nízká | Manuální kontrola při dlouhých tiscích | Nízká |
| Omezená customizace | Střední | Open-source nebo enterprise plán | Střední |

---

## Zdroje

- [Prusa 3D Printing Price Calculator](https://blog.prusa3d.com/3d-printing-price-calculator_38905/)
- [OmniCalculator - 3D Printing](https://www.omnicalculator.com/other/3d-printing)
- [AutoQuote3D](https://autoquote3d.com/)
- [DigiFabster](https://digifabster.com/)
- [Layers.app](https://layers.app/)
- [VOLARYX](https://www.volaryx.com/)
- [GitHub - stl-calc](https://github.com/alexeygrek/stl-calc)
- [GitHub - 3d-print-cost-calculator](https://github.com/DigitallyTailored/3d-print-cost-calculator)
- [WordPress 3DPrint](https://www.wp3dprinting.com/)
- [MaterialPro3D - Jak cenit 3D tisk](https://www.materialpro3d.cz/blog/jak-cenit-3d-tisk/)
