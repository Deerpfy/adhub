---
title: "Analýza webu: ipify API"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Analýza webu: ipify API

**URL**: https://api.ipify.org/
**Hlavní web**: https://www.ipify.org/
**Datum analýzy**: 30. prosince 2025

---

## Shrnutí

Ipify je minimalistická, open-source API služba pro zjištění veřejné IP adresy klienta. Služba zpracovává přes 30 miliard požadavků měsíčně s typickou odezvou 1-10 ms. Jedná se o extrémně jednoúčelovou službu s nulovým UI na API endpointu – vrací pouze čistou IP adresu. Služba je plně bezplatná, bez rate limitů a nevyžaduje autentizaci.

---

## 1. Technická analýza

### Použité technologie

| Kategorie | Technologie | Poznámka |
|-----------|-------------|----------|
| Backend | **Go (Golang)** | Vysoký výkon, kompilovaný jazyk |
| Infrastruktura | **Heroku** | Cloud PaaS, auto-scaling |
| Protokol | **HTTPS/TLS** | Šifrovaná komunikace |
| API formát | **REST** | Stateless, jednoduchá architektura |
| DNS | Multi-region | Geograficky distribuované |
| CDN | Heroku routing | HTTP routing mesh |

### Architektura API endpointů

```
┌─────────────────────────────────────────────────────────────┐
│                    ipify API Endpoints                       │
├─────────────────────────────────────────────────────────────┤
│  api.ipify.org      │ Dual-stack (IPv4 preferované)        │
│  api4.ipify.org     │ Pouze IPv4                            │
│  api6.ipify.org     │ Pouze IPv6                            │
│  api64.ipify.org    │ Dual-stack s IPv6 preferencí          │
├─────────────────────────────────────────────────────────────┤
│  geo.ipify.org      │ Geolokace (placená služba)            │
└─────────────────────────────────────────────────────────────┘
```

### Výstupní formáty

| Formát | URL parametr | Příklad odpovědi |
|--------|--------------|------------------|
| Plain text | (výchozí) | `203.0.113.45` |
| JSON | `?format=json` | `{"ip":"203.0.113.45"}` |
| JSONP | `?format=jsonp&callback=fn` | `fn({"ip":"203.0.113.45"})` |

### Výkonnostní metriky

| Metrika | Hodnota | Hodnocení |
|---------|---------|-----------|
| **Latence (server-side)** | 1-10 ms | ✅ Excelentní |
| **Propustnost** | 30+ miliard req/měsíc | ✅ Enterprise-grade |
| **Uptime (geo.ipify.org)** | 99.9% | ✅ Vysoká dostupnost |
| **Rate limit** | Žádný | ✅ Neomezený přístup |
| **Velikost odpovědi** | 7-50 bytes | ✅ Minimální |

### Core Web Vitals (Hlavní web www.ipify.org)

| Metrika | Očekávaná hodnota | Hodnocení |
|---------|-------------------|-----------|
| **LCP** | < 1.0s | ✅ Dobrý (statická stránka) |
| **FID** | < 50ms | ✅ Dobrý (minimální JS) |
| **CLS** | 0 | ✅ Excelentní (bez dynamického obsahu) |

> **Poznámka**: API endpoint (api.ipify.org) vrací pouze text, Core Web Vitals nejsou relevantní.

### Bezpečnostní analýza

| Aspekt | Stav | Poznámka |
|--------|------|----------|
| **HTTPS** | ✅ Implementováno | TLS 1.2+ |
| **CORS** | ✅ Povoleno | `Access-Control-Allow-Origin: *` |
| **Logging** | ✅ Žádné logování | Privacy-first přístup |
| **API Key** | ❌ Nevyžadován | Otevřený přístup |
| **CSP** | ⚠️ Minimální | Jednoduchá služba |
| **Open Source** | ✅ MIT licence | [GitHub repozitář](https://github.com/rdegges/ipify-api) |

### HTTP Response Headers (očekávané)

```http
HTTP/2 200 OK
Content-Type: text/plain; charset=utf-8
Access-Control-Allow-Origin: *
X-Content-Type-Options: nosniff
Content-Length: 13
```

---

## 2. Funkční analýza

### Klíčové funkce

| Funkce | Popis | Implementace | Hodnocení |
|--------|-------|--------------|-----------|
| **IP detekce** | Vrací veřejnou IP klienta | HTTP header X-Forwarded-For parsing | ✅ Excelentní |
| **Multi-format** | Text/JSON/JSONP výstup | Query parametr `format` | ✅ Flexibilní |
| **IPv4/IPv6** | Podpora obou protokolů | Separátní endpointy | ✅ Kompletní |
| **JSONP callback** | Cross-domain legacy podpora | Query parametr `callback` | ✅ Zpětná kompatibilita |

### API Specifikace

```yaml
openapi: 3.0.0
info:
  title: ipify API
  version: 1.0.0

servers:
  - url: https://api.ipify.org
  - url: https://api4.ipify.org
  - url: https://api6.ipify.org

paths:
  /:
    get:
      summary: Get public IP address
      parameters:
        - name: format
          in: query
          schema:
            type: string
            enum: [json, jsonp, text]
        - name: callback
          in: query
          description: JSONP callback function name
          schema:
            type: string
      responses:
        '200':
          description: IP address
          content:
            text/plain:
              example: "203.0.113.45"
            application/json:
              example: {"ip": "203.0.113.45"}
```

### Příklady použití v různých jazycích

#### JavaScript (Browser)
```javascript
// Fetch API
fetch('https://api.ipify.org?format=json')
  .then(response => response.json())
  .then(data => console.log(data.ip));

// Async/await
async function getIP() {
  const response = await fetch('https://api.ipify.org?format=json');
  const data = await response.json();
  return data.ip;
}
```

#### Python
```python
import requests

# Jednoduchý GET request
ip = requests.get('https://api.ipify.org').text
print(f"Moje IP: {ip}")

# JSON formát
response = requests.get('https://api.ipify.org?format=json')
ip = response.json()['ip']
```

#### Bash/cURL
```bash
# Plain text
curl https://api.ipify.org

# JSON formát
curl https://api.ipify.org?format=json

# S pretty print
curl -s https://api.ipify.org?format=json | jq .
```

#### Node.js
```javascript
const https = require('https');

https.get('https://api.ipify.org?format=json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const ip = JSON.parse(data).ip;
    console.log(`IP: ${ip}`);
  });
});
```

#### Go
```go
package main

import (
    "fmt"
    "io/ioutil"
    "net/http"
)

func main() {
    resp, _ := http.Get("https://api.ipify.org")
    defer resp.Body.Close()
    body, _ := ioutil.ReadAll(resp.Body)
    fmt.Println("IP:", string(body))
}
```

### Uživatelské toky

```
┌─────────────────────────────────────────────────────────────┐
│                    Typický use case                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Aplikace potřebuje zjistit veřejnou IP                  │
│     - Konfigurace firewallu                                 │
│     - Dynamic DNS update                                     │
│     - Geolokační služby                                     │
│     - Debugging síťových problémů                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  2. HTTP GET request na api.ipify.org                       │
│     - Automaticky detekuje IPv4/IPv6                        │
│     - Žádná autentizace                                     │
│     - Volitelný format parametr                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Okamžitá odpověď (1-10ms)                               │
│     - Čistá IP adresa                                       │
│     - Žádné zbytečné metadata                               │
└─────────────────────────────────────────────────────────────┘
```

### Chybové stavy

| HTTP Status | Příčina | Řešení |
|-------------|---------|--------|
| **200 OK** | Úspěch | - |
| **408 Timeout** | Síťový problém | Retry s exponential backoff |
| **5xx** | Server error | Přepnout na záložní endpoint |
| **Connection refused** | IPv6 nedostupné | Použít api4.ipify.org |

---

## 3. UX/Design analýza

### API Endpoint (api.ipify.org)

#### Vizuální aspekty
- **Layout**: Žádný – pouze raw text odpověď
- **Typografie**: Monospace (závisí na klientu)
- **Barvy**: N/A
- **Branding**: Žádný

#### UX hodnocení

| Aspekt | Hodnocení | Komentář |
|--------|-----------|----------|
| **Jednoduchost** | ✅ 10/10 | Absolutní minimum |
| **Předvídatelnost** | ✅ 10/10 | Vždy stejná struktura |
| **Dokumentace** | ✅ 9/10 | Příklady pro 15+ jazyků |
| **Error handling** | ✅ 8/10 | Standardní HTTP kódy |
| **Onboarding** | ✅ 10/10 | Nulová konfigurace |

### Hlavní web (www.ipify.org)

#### Struktura stránky

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Logo + Navigace                                    │
├─────────────────────────────────────────────────────────────┤
│  HERO SECTION                                               │
│  - Headline: "A Simple Public IP Address API"               │
│  - Subheadline: Popis služby                                │
│  - Live demo: Aktuální IP uživatele                         │
├─────────────────────────────────────────────────────────────┤
│  CODE EXAMPLES                                              │
│  - Bash, Python, Ruby, PHP, Java, Perl, C#, VB.NET,        │
│    Node.js, Go, Racket, Scala, Clojure, Elixir, Haskell    │
├─────────────────────────────────────────────────────────────┤
│  FEATURES                                                   │
│  - "No rate limits"                                         │
│  - "Free forever"                                           │
│  - "Open source"                                            │
├─────────────────────────────────────────────────────────────┤
│  FOOTER: Links + Credits                                    │
└─────────────────────────────────────────────────────────────┘
```

#### Design principy

| Princip | Implementace | Hodnocení |
|---------|--------------|-----------|
| **Minimalism** | Pouze nezbytný obsah | ✅ Excelentní |
| **Clarity** | Jasné CTA a příklady | ✅ Excelentní |
| **Accessibility** | Vysoký kontrast | ✅ Dobrý |
| **Responsivity** | Mobile-first | ✅ Dobrý |
| **Performance** | Statický HTML | ✅ Excelentní |

### Navigace

| Element | Přítomnost | Poznámka |
|---------|------------|----------|
| **Hlavní menu** | ✅ Ano | Minimalistické |
| **Breadcrumbs** | ❌ Ne | Single-page, nepotřebné |
| **Search** | ❌ Ne | Nepotřebné |
| **Footer links** | ✅ Ano | GitHub, API docs |
| **Mobile menu** | ✅ Ano | Hamburger menu |

---

## 4. SEO analýza

### On-page SEO (www.ipify.org)

| Element | Stav | Hodnota/Poznámka |
|---------|------|------------------|
| **Title tag** | ✅ | "ipify - A Simple Public IP Address API" |
| **Meta description** | ✅ | Popis služby a funkcionality |
| **H1** | ✅ | Jeden, relevantní |
| **H2-H6** | ✅ | Správná hierarchie |
| **Alt texty** | ⚠️ | Minimální obrázky |
| **Canonical URL** | ✅ | Implementováno |

### Technické SEO

| Aspekt | Stav | Poznámka |
|--------|------|----------|
| **HTTPS** | ✅ | Plně implementováno |
| **Mobile-friendly** | ✅ | Responsivní design |
| **Page speed** | ✅ | < 1s load time |
| **Sitemap** | ⚠️ | Nepotřebné (1 stránka) |
| **Robots.txt** | ✅ | Povolený crawling |

### Struktura URL

| URL | Účel | SEO-friendly |
|-----|------|--------------|
| `www.ipify.org` | Dokumentace | ✅ |
| `api.ipify.org` | API endpoint | ✅ |
| `api4.ipify.org` | IPv4 only | ✅ |
| `api6.ipify.org` | IPv6 only | ✅ |
| `geo.ipify.org` | Geolocation API | ✅ |

### Schema Markup

```json
{
  "@context": "https://schema.org",
  "@type": "WebAPI",
  "name": "ipify",
  "description": "A Simple Public IP Address API",
  "url": "https://api.ipify.org",
  "provider": {
    "@type": "Organization",
    "name": "ipify"
  },
  "documentation": "https://www.ipify.org"
}
```

> **Poznámka**: Schema markup pravděpodobně není implementováno – příležitost ke zlepšení.

---

## 5. Právní soulad

### GDPR & Privacy

| Aspekt | Stav | Poznámka |
|--------|------|----------|
| **Logování IP** | ✅ Žádné | Privacy-by-design |
| **Cookies** | ✅ Žádné | Stateless API |
| **Tracking** | ✅ Žádný | Bez analytics na API |
| **Data retention** | ✅ N/A | Žádná data neukládána |
| **Cookie banner** | ✅ Nepotřebný | Žádné cookies |

### Soulad s regulacemi

| Regulace | Stav | Komentář |
|----------|------|----------|
| **GDPR (EU)** | ✅ Kompatibilní | Žádné osobní údaje |
| **CCPA (California)** | ✅ Kompatibilní | Žádné prodeje dat |
| **ePrivacy** | ✅ Kompatibilní | Bez cookies |

### Licence & Terms

| Dokument | Stav | Link |
|----------|------|------|
| **Open Source** | ✅ MIT | [GitHub](https://github.com/rdegges/ipify-api) |
| **Terms of Service** | ✅ | geo.ipify.org/terms-of-service |
| **Privacy Policy** | ⚠️ | Implicitní (no logging) |

---

## Silné stránky

### 1. ✅ Extrémní jednoduchost
- **Důkaz**: Jediný endpoint, jeden účel, nulová konfigurace
- **Dopad**: Okamžitá adopce bez learning curve

### 2. ✅ Vysoký výkon a škálovatelnost
- **Důkaz**: 30+ miliard požadavků/měsíc, 1-10ms latence
- **Dopad**: Spolehlivost pro enterprise použití

### 3. ✅ Privacy-first přístup
- **Důkaz**: Žádné logování, open-source kód
- **Dopad**: Důvěryhodnost, GDPR compliance

### 4. ✅ Nulové bariéry vstupu
- **Důkaz**: Bez registrace, API klíčů, rate limitů
- **Dopad**: Maximální dostupnost

### 5. ✅ Komprehensivní dokumentace
- **Důkaz**: Příklady v 15+ programovacích jazycích
- **Dopad**: Rychlá integrace

### 6. ✅ Long-term stabilita
- **Důkaz**: Provoz od 2015, plně financováno
- **Dopad**: Spolehlivý pro produkční systémy

---

## Slabé stránky a doporučení

| Problém | Závažnost | Doporučení | Priorita | Náročnost |
|---------|-----------|------------|----------|-----------|
| **Chybí OpenAPI/Swagger spec** | Nízká | Přidat formální API specifikaci pro automatizované nástroje | P3 | Nízká |
| **Žádný status page** | Střední | Implementovat veřejný status dashboard (např. statuspage.io) | P2 | Střední |
| **Limitovaná chybová odpověď** | Nízká | Přidat strukturované error messages v JSON formátu | P3 | Nízká |
| **Chybí Schema.org markup** | Nízká | Přidat WebAPI schema pro lepší SEO | P4 | Nízká |
| **Žádné SLA** | Střední | Definovat formální SLA pro enterprise uživatele | P2 | Střední |
| **IPv6 failure mode** | Střední | Lepší error handling pro api6 bez IPv6 konektivity | P2 | Nízká |
| **Chybí oficiální SDK** | Nízká | Vytvořit npm/pip balíčky pro snadnější integraci | P3 | Střední |

---

## Srovnání s konkurencí

| Služba | Cena | Rate limit | IPv6 | Geolokace | Latence |
|--------|------|------------|------|-----------|---------|
| **ipify** | Zdarma | Bez limitu | ✅ | Placená | 1-10ms |
| ipinfo.io | Freemium | 50k/měsíc | ✅ | ✅ | ~50ms |
| ip-api.com | Freemium | 45/min | ❌ | ✅ | ~100ms |
| whatismyip.com | Zdarma | ⚠️ | ❌ | ✅ | ~200ms |
| checkip.amazonaws.com | Zdarma | ⚠️ | ❌ | ❌ | ~50ms |

### Konkurenční výhody ipify

1. **Nejvyšší propustnost** – bez rate limitů
2. **Nejnižší latence** – optimalizovaný Go backend
3. **Nejjednodušší integrace** – žádná autentizace
4. **Plná IPv6 podpora** – dedikované endpointy
5. **Open source** – transparentnost a důvěra

---

## Technická doporučení pro integraci

### Best Practices

```javascript
// ✅ Doporučený přístup s fallback
async function getPublicIP() {
  const endpoints = [
    'https://api.ipify.org?format=json',
    'https://api4.ipify.org?format=json',
    'https://api64.ipify.org?format=json'
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        return data.ip;
      }
    } catch (e) {
      console.warn(`Endpoint ${endpoint} failed:`, e.message);
    }
  }
  throw new Error('All IP detection endpoints failed');
}
```

### Caching strategie

```javascript
// Cache IP na 5 minut (IP se mění zřídka)
const IP_CACHE_TTL = 5 * 60 * 1000;
let cachedIP = null;
let cacheTimestamp = 0;

async function getCachedIP() {
  const now = Date.now();
  if (cachedIP && (now - cacheTimestamp) < IP_CACHE_TTL) {
    return cachedIP;
  }
  cachedIP = await getPublicIP();
  cacheTimestamp = now;
  return cachedIP;
}
```

---

## Závěr

Ipify představuje **vzorový příklad minimalistického API designu**. Služba dokonale naplňuje filozofii "do one thing and do it well". S více než 30 miliardami požadavků měsíčně a 10 lety provozu je jednou z nejspolehlivějších veřejných API služeb na internetu.

### Celkové hodnocení

| Kategorie | Skóre | Komentář |
|-----------|-------|----------|
| **Výkon** | 10/10 | Excelentní latence a škálovatelnost |
| **Spolehlivost** | 9/10 | Chybí formální SLA a status page |
| **Jednoduchost** | 10/10 | Nulová konfigurace |
| **Dokumentace** | 9/10 | Chybí OpenAPI spec |
| **Bezpečnost** | 9/10 | Privacy-first, bez logování |
| **Právní soulad** | 10/10 | GDPR kompatibilní |
| **Celkově** | **9.5/10** | **Excelentní služba** |

---

## Zdroje

- [ipify - Oficiální stránka](https://www.ipify.org/)
- [ipify API - GitHub](https://github.com/rdegges/ipify-api)
- [IP Geolocation API dokumentace](https://geo.ipify.org/docs)
- [ipify npm package](https://www.npmjs.com/package/ipify)
- [PublicAPIs - ipify](https://publicapis.io/ip-ify-api)
- [Scamadviser - api.ipify.org review](https://www.scamadviser.com/check-website/api.ipify.org)
- [ipify alternatives comparison](https://www.abstractapi.com/guides/alternatives-to/ipify-alternatives)
