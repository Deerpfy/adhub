# Analýza metod detekce veřejné IP adresy

**Datum**: 30. prosince 2025
**Účel**: Najít řešení pro zobrazení raw IP adresy bez vlastního serveru

---

## Shrnutí

Po důkladné analýze existují **3 potenciální přístupy** pro detekci veřejné IP bez vlastního backendu:

| Metoda | Funguje? | Registrace | Spolehlivost | Doporučení |
|--------|----------|------------|--------------|------------|
| **WebRTC + STUN** | ⚠️ Částečně | ❌ Ne | ⚠️ Nespolehlivé | Nepoužívat |
| **Cloudflare Workers** | ✅ Ano | ⚠️ Zdarma účet | ✅ Vysoká | **Doporučeno** |
| **Veřejná API** | ✅ Ano | ❌ Ne | ✅ Vysoká | Záložní řešení |

---

## 1. WebRTC + STUN servery (Client-side)

### Jak to funguje

WebRTC umožňuje prohlížeči komunikovat s STUN (Session Traversal Utilities for NAT) servery, které vrací veřejnou IP adresu klienta.

```javascript
// Teoretický kód
const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});
pc.createDataChannel('');
pc.createOffer().then(offer => pc.setLocalDescription(offer));
pc.onicecandidate = (e) => {
    if (e.candidate) {
        // Parse IP z candidate stringu
        const ip = extractIP(e.candidate.candidate);
    }
};
```

### Veřejné STUN servery (zdarma)

| Provider | Server | Port |
|----------|--------|------|
| Google | `stun.l.google.com` | 19302 |
| Google | `stun1.l.google.com` | 19302 |
| Google | `stun2.l.google.com` | 19302 |
| Mozilla | `stun.services.mozilla.com` | 3478 |
| Twilio | `global.stun.twilio.com` | 3478 |

### Kritické problémy

#### 1. mDNS obfuskace (od 2019+)
Moderní prohlížeče nahrazují lokální IP adresy mDNS hostnames pro ochranu soukromí.

```
Očekáváno:  192.168.1.100
Realita:    a]f4b2c3d.local
```

#### 2. Veřejná IP stále exponována, ALE...
- Funguje pouze pokud uživatel **nemá VPN**
- Může vrátit **IPv6** místo IPv4
- **Nespolehlivé** napříč prohlížeči
- Blokováno privacy extensions (uBlock, etc.)

#### 3. Browser-specific chování

| Prohlížeč | Stav 2024 |
|-----------|-----------|
| Chrome | mDNS pro lokální, veřejná OK |
| Firefox | Může být zakázáno (`media.peerconnection.enabled`) |
| Safari | mDNS, omezená podpora |
| Mobile | Android/iOS - velmi nespolehlivé |

### Verdikt: ❌ NEPOUŽÍVAT

WebRTC/STUN je **nespolehlivé** pro produkční použití:
- Funguje jen někdy
- Různé chování v různých prohlížečích
- Privacy rozšíření to blokují
- Může vrátit špatnou IP (VPN, proxy)

**Zdroje**:
- [diafygi/webrtc-ips](https://github.com/diafygi/webrtc-ips)
- [WebRTC IP Leaks](https://getstream.io/blog/webrtc-ip-leaks/)
- [W3C Privacy/IPAddresses](https://www.w3.org/wiki/Privacy/IPAddresses)

---

## 2. Cloudflare Workers (Serverless)

### Jak to funguje

Cloudflare Workers běží na edge serverech a mají přístup k hlavičce `CF-Connecting-IP`, která obsahuje skutečnou IP klienta.

```javascript
// worker.js - KOMPLETNÍ KÓD
export default {
    async fetch(request) {
        const ip = request.headers.get('CF-Connecting-IP');
        return new Response(ip, {
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
```

### Výhody

| Aspekt | Hodnota |
|--------|---------|
| Cena | **Zdarma** (100k req/den) |
| Latence | ~10-50ms (edge) |
| Spolehlivost | 99.99% |
| Registrace | Ano, ale zdarma |
| Vlastní doména | Volitelné |

### Deployment

```bash
# 1. Instalace Wrangler CLI
npm install -g wrangler

# 2. Login (jednorázově)
wrangler login

# 3. Vytvoření projektu
wrangler init ip-api

# 4. Deploy
wrangler deploy
```

### Výsledná URL

```
https://ip-api.<tvuj-subdomain>.workers.dev
```

### Verdikt: ✅ DOPORUČENO

Cloudflare Workers je **nejlepší řešení** pokud akceptuješ jednorázovou registraci:
- Zdarma
- Spolehlivé
- Rychlé (edge)
- Vrací čistou IP

**Zdroje**:
- [Creating IP-Check Tool with Cloudflare Workers](https://niksec.com/creating-a-simple-ip-check-tool-with-cloudflare-workers/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)

---

## 3. Veřejná API (bez registrace)

### Seznam spolehlivých API

| API | URL | Formát | Rate Limit |
|-----|-----|--------|------------|
| **ipify** | `api.ipify.org` | text/json | Bez limitu |
| **ipify v4** | `api4.ipify.org` | text/json | Bez limitu |
| **ipify v6** | `api6.ipify.org` | text/json | Bez limitu |
| **icanhazip** | `icanhazip.com` | text | Bez limitu |
| **ifconfig.me** | `ifconfig.me/ip` | text | Bez limitu |
| **ipecho** | `ipecho.net/plain` | text | Bez limitu |
| **ident.me** | `ident.me` | text | Bez limitu |

### Příklad použití

```javascript
// Více endpointů pro fallback
const endpoints = [
    'https://api.ipify.org',
    'https://icanhazip.com',
    'https://ifconfig.me/ip',
    'https://ident.me'
];

async function getIP() {
    for (const url of endpoints) {
        try {
            const res = await fetch(url);
            if (res.ok) return (await res.text()).trim();
        } catch (e) { continue; }
    }
    throw new Error('All endpoints failed');
}
```

### Výhody a nevýhody

| ✅ Výhody | ❌ Nevýhody |
|-----------|-------------|
| Žádná registrace | Závislost na třetí straně |
| Žádný vlastní server | Může být nedostupné |
| Zdarma | Žádná kontrola |
| Spolehlivé (ipify) | Latence (~50-200ms) |

### Verdikt: ✅ DOBRÁ ALTERNATIVA

Pokud nechceš žádnou registraci, veřejná API jako **ipify** jsou nejlepší volba.

**Zdroje**:
- [ipify.org](https://www.ipify.org/)
- [icanhazip.com](https://icanhazip.com/)

---

## 4. Alternativy vyžadující hosting

### 4.1 GitHub Actions + Artifact

Teoreticky možné, ale **nepraktické**:
- GitHub Actions může zjistit IP runneru
- Ale to není IP uživatele
- ❌ Nefunguje pro tento use case

### 4.2 Netlify Edge Functions

Podobné jako Cloudflare Workers:

```javascript
// netlify/edge-functions/ip.js
export default async (request) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0];
    return new Response(ip);
};
```

Vyžaduje registraci na Netlify.

### 4.3 Vercel Edge Functions

```javascript
// api/ip.js
export const config = { runtime: 'edge' };
export default function handler(request) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0];
    return new Response(ip);
}
```

Vyžaduje registraci na Vercel.

### 4.4 PHP na webhostingu

Pokud máš jakýkoliv webhosting s PHP:

```php
<?php
header('Content-Type: text/plain');
header('Access-Control-Allow-Origin: *');
$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'];
echo explode(',', $ip)[0];
```

---

## 5. Srovnávací tabulka

| Řešení | Registrace | Vlastní server | Spolehlivost | Raw IP | Doporučení |
|--------|------------|----------------|--------------|--------|------------|
| WebRTC/STUN | ❌ | ❌ | ⚠️ 30% | ✅ | ❌ |
| Cloudflare Workers | ✅ Zdarma | ❌ | ✅ 99.9% | ✅ | ⭐⭐⭐ |
| ipify API | ❌ | ❌ | ✅ 99.9% | ✅ | ⭐⭐⭐ |
| icanhazip | ❌ | ❌ | ✅ 95% | ✅ | ⭐⭐ |
| Vlastní Node.js | ❌ | ✅ | ✅ 100% | ✅ | ⭐⭐ |
| PHP hosting | ❌ | ✅ (hosting) | ✅ 99% | ✅ | ⭐⭐ |

---

## 6. Finální doporučení

### Pokud NECHCEŠ registraci:

**→ Použij ipify API**

```html
<!-- Minimální stránka -->
<!DOCTYPE html>
<html>
<body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#000;color:#fff;font-family:monospace;font-size:3rem">
<div id="ip">...</div>
<script>
fetch('https://api.ipify.org').then(r=>r.text()).then(ip=>document.getElementById('ip').textContent=ip);
</script>
</body>
</html>
```

### Pokud AKCEPTUJEŠ jednorázovou registraci:

**→ Použij Cloudflare Workers** (10 minut setup, 100% kontrola)

### Pokud MÁŠ webhosting:

**→ Použij PHP skript** (1 soubor, žádná údržba)

---

## 7. Závěr

**Neexistuje způsob, jak zjistit veřejnou IP adresu čistě v prohlížeči bez jakéhokoliv externího serveru.**

To je fundamentální technické omezení - prohlížeč prostě neví svou veřejnou IP. Tu vidí pouze server na druhé straně spojení.

Nejbližší k "bez registrace, bez serveru" je použití veřejných API jako ipify, které jsou:
- Zdarma
- Bez registrace
- Spolehlivé
- Open-source

---

## Zdroje

- [ipify.org](https://www.ipify.org/)
- [GitHub: diafygi/webrtc-ips](https://github.com/diafygi/webrtc-ips)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [WebRTC IP Leaks Analysis](https://getstream.io/blog/webrtc-ip-leaks/)
- [Public STUN Server List](https://gist.github.com/mondain/b0ec1cf5f60ae726202e)
- [NikSec: IP-Check with Cloudflare](https://niksec.com/creating-a-simple-ip-check-tool-with-cloudflare-workers/)
