---
title: "Technická analýza Steam hour boosting nástrojů"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Technická analýza Steam hour boosting nástrojů

Nástroje pro simulaci hraní Steam her využívají přímou komunikaci se Steam servery prostřednictvím reverzně inženýrovaného protokolu, přičemž **žádný z nich nevyžaduje skutečné spuštění hry**. Klíčem je knihovna SteamKit2 (C#) nebo steam-user (Node.js), které odesílají zprávu `CMsgClientGamesPlayed` informující Steam o "hraní" až **32 her současně**. Webová implementace vyžaduje backend server – browser-only řešení je technicky nemožné kvůli Steam protokolu a CORS omezením.

## Přehled hlavních open-source projektů

Ekosystém Steam idling nástrojů zahrnuje několik aktivně vyvíjených projektů s různými technologickými přístupy. **ArchiSteamFarm** dominuje s 12,700+ hvězdičkami na GitHubu a komplexní architekturou v C#/.NET. Novější **Steam Game Idler** využívá moderní stack Tauri (TypeScript + Rust) s propracovaným GUI.

| Projekt | Jazyk | GitHub Stars | Stav (2025) | Vyžaduje Steam klient |
|---------|-------|--------------|-------------|----------------------|
| ArchiSteamFarm | C# (.NET 10) | 12,700+ | Velmi aktivní | Ne |
| Steam Game Idler | TypeScript/Rust | 409+ | Velmi aktivní | Ano |
| Idle Master Extended | C# | 3,100+ | Udržovaný | Ano |
| node-steam-user projekty | JavaScript | Různé | Aktivní | Ne |
| HourBoostr | C# | 608 | Opuštěný (2018) | Ne |

Zásadní architektonický rozdíl spočívá v přístupu ke komunikaci. Projekty jako ASF nebo Node.js řešení fungují jako **standalone Steam klienti** – komunikují přímo se Steam CM servery bez nutnosti instalovaného Steam. Naproti tomu Idle Master a Steam Game Idler využívají **Steamworks SDK wrapper** a vyžadují běžící Steam klient.

## ArchiSteamFarm jako referenční implementace

ASF představuje nejkomplexnější open-source řešení s modulární architekturou postavenou na moderním .NET 10. Projekt využívá **SteamKit2** pro nízkoúrovňovou komunikaci a nabízí rozšiřitelný plugin systém založený na MEF (Managed Extensibility Framework).

```
ArchiSteamFarm/
├── ArchiSteamFarm.exe     # Hlavní binárka
├── config/
│   ├── ASF.json           # Globální konfigurace
│   ├── BotName.json       # Konfigurace jednotlivých účtů
│   └── BotName.db         # Session cache (SQLite)
├── plugins/               # Rozšíření
└── www/                   # ASF-ui web interface
```

Klíčové moduly zahrnují **Bot** (reprezentace Steam účtu), **ArchiWebHandler** (HTTP komunikace), **CardsFarmer** (logika farmení) a **IPC Server** (REST API na portu 1242). Konfigurace probíhá přes JSON soubory:

```json
{
    "Enabled": true,
    "SteamLogin": "username",
    "SteamPassword": "password",
    "HoursUntilCardDrops": 0,
    "GamesPlayedWhileIdle": [730, 570],
    "FarmingOrders": [0]
}
```

ASF implementuje dva farming algoritmy: **Simple** (jedna hra postupně) a **Complex** (více her simultánně pro bump hodin, pak přepnutí na Simple). Parametr `HoursUntilCardDrops` určuje, zda účet podléhá restrikci vyžadující 2+ hodiny hraní před prvním dropem karty.

## Steam protokol a mechanismus "hraní"

Steam komunikace probíhá přes **CM (Connection Manager) servery** pomocí binárního protokolu serializovaného Protocol Buffers. Připojení využívá WebSocket na portu 443 s TLS 1.2 šifrováním, alternativně TCP s AES-256-CBC.

Simulace hraní spočívá v odeslání zprávy **CMsgClientGamesPlayed**:

```protobuf
message CMsgClientGamesPlayed {
    message GamePlayed {
        optional fixed64 game_id = 2;        // AppID hry
        optional string game_extra_info = 7; // Custom text pro non-Steam hry
        optional uint32 process_id = 9;      // Process ID (idling nástroje neposílají)
    }
    repeated GamePlayed games_played = 1;
}
```

V Node.js implementaci pomocí knihovny **steam-user** vypadá kód takto:

```javascript
const SteamUser = require('steam-user');
const client = new SteamUser();

client.logOn({
    refreshToken: 'eyJ...'  // JWT token s platností ~200 dní
});

client.on('loggedOn', () => {
    client.setPersona(SteamUser.EPersonaState.Online);
    client.gamesPlayed([730, 570, 440]);  // CS2, Dota 2, TF2 - max 32 her
});
```

Steam detekuje aktivitu pouze na základě této zprávy – **nekontroluje skutečný proces ani síťovou aktivitu hry**. Jediným požadavkem je udržování aktivního spojení s heartbeat zprávami (automaticky spravováno knihovnami, interval ~30 sekund).

## Autentizační flow a bezpečnost

Od září 2022 Steam používá **JWT refresh tokeny** namísto tradičních session cookies. Přihlašovací proces zahrnuje:

1. Odeslání `CMsgClientLogon` s username/password
2. Obdržení výzvy pro Steam Guard (email kód nebo TOTP)
3. Validace 2FA a získání refresh tokenu
4. Uložení tokenu pro automatické přihlášení (platnost ~200 dní)

Generování TOTP kódu pro mobilní authenticator:

```python
import hmac, hashlib, base64, struct, time

def generate_steam_totp(shared_secret):
    timestamp = int(time.time()) // 30
    msg = struct.pack('>Q', timestamp)
    key = base64.b64decode(shared_secret)
    hmac_hash = hmac.new(key, msg, hashlib.sha1).digest()
    offset = hmac_hash[-1] & 0x0F
    code = struct.unpack('>I', hmac_hash[offset:offset+4])[0] & 0x7FFFFFFF
    chars = '23456789BCDFGHJKMNPQRTVWXY'
    return ''.join([chars[code // (len(chars)**i) % len(chars)] for i in range(5)])
```

Nástroje jako ASF uchovávají autentizační data v **maFile formátu** obsahujícím `shared_secret`, `identity_secret` a `device_id`. Session data jsou cachována v SQLite databázích (`.db` soubory).

## Webová implementace a její omezení

Browser-only řešení **není technicky možné** ze tří důvodů: Steam CM používá proprietární binární protokol, Steam Web API nemá CORS headers, a prohlížeč neumožňuje raw TCP/UDP sockety.

```
┌─────────────────┐     HTTP/WS      ┌─────────────────┐    Steam Protocol
│   Web Browser   │ ←──────────────→ │  Backend Server │ ←───────────────→ Steam CM
│   (Frontend)    │                  │  (Node.js)      │
└─────────────────┘                  └─────────────────┘
     Vue.js/React                       steam-user lib
```

**ASF-ui** slouží jako referenční webové rozhraní – Vue.js frontend komunikující s Kestrel HTTP serverem přes REST API:

```javascript
// Frontend API volání
async function startIdling(botName, games) {
    const response = await fetch(`/Api/Bot/${botName}/GamesPlay`, {
        method: 'POST',
        headers: { 
            'Authentication': 'your_ipc_password',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ GamesToPlay: games })
    });
    return response.json();
}
```

Existující webové služby (FreeHourBoost, HourBoost.net) provozují backend servery s knihovnou steam-user. **Uživatel poskytuje credentials**, které služba použije pro přihlášení na svých serverech – což představuje značné bezpečnostní riziko.

## Technický stack pro vlastní implementaci

Pro vytvoření vlastního nástroje doporučuji následující architekturu:

**Backend (Node.js):**
```javascript
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const express = require('express');

const app = express();
const clients = new Map();

app.post('/api/login', (req, res) => {
    const { username, password, sharedSecret } = req.body;
    const client = new SteamUser({ autoRelogin: true });
    
    client.logOn({
        accountName: username,
        password: password,
        twoFactorCode: sharedSecret ? SteamTotp.generateAuthCode(sharedSecret) : undefined
    });
    
    client.on('loggedOn', () => {
        clients.set(username, client);
        res.json({ success: true, steamId: client.steamID.toString() });
    });
    
    client.on('steamGuard', (domain, callback) => {
        // Vyžádat kód od uživatele přes WebSocket
    });
});

app.post('/api/idle', (req, res) => {
    const { username, games } = req.body;
    const client = clients.get(username);
    client.setPersona(SteamUser.EPersonaState.Online);
    client.gamesPlayed(games);  // Max 32 AppIDs
    res.json({ playing: games });
});
```

**Klíčové dependencies:**
- `steam-user` (5.x) – Steam klient protokol
- `steam-session` – Moderní autentizace s refresh tokeny
- `steam-totp` – Generování 2FA kódů
- `express` + `ws` – HTTP server a WebSocket

## Bezpečnostní aspekty a Steam ToS

Použití idling nástrojů **technicky porušuje Steam Subscriber Agreement** (sekce o automatizaci a emulaci klienta). V praxi Valve toleruje nástroje pro farming trading cards, ale může zavést restrikce:

- **Omezení card dropů** – Účty s podezřelou aktivitou vyžadují 2+ hodiny hraní před prvním dropem
- **Trade hold** – Nové počítače/zařízení podléhají 15dennímu trade holdu
- **Rate limiting** – Příliš časté změny her mohou vést k dočasnému bloku

Nástroje by měly implementovat bezpečné zacházení s credentials: **nikdy nelogovat hesla**, šifrovat uložené tokeny, používat refresh tokeny místo hesel kde možné, a umožnit uživateli "deauthorize all computers" po použití sdílené služby.

## Klíčové GitHub repozitáře

| Projekt | URL | Technologie |
|---------|-----|-------------|
| ArchiSteamFarm | github.com/JustArchiNET/ArchiSteamFarm | C#, .NET 10, SteamKit2 |
| ASF-ui | github.com/JustArchiNET/ASF-ui | Vue.js, SCSS |
| SteamKit2 | github.com/SteamRE/SteamKit | C#, Protobuf |
| node-steam-user | github.com/DoctorMcKay/node-steam-user | JavaScript |
| Steam Game Idler | github.com/zevnda/steam-game-idler | TypeScript, Rust, Tauri |
| Steam Protobufs | github.com/SteamDatabase/Protobufs | Protobuf definice |

## Závěr

Steam hour boosting nástroje fungují díky reverznímu inženýrství Steam protokolu, konkrétně odesíláním zprávy `CMsgClientGamesPlayed` přes autentizované spojení s CM servery. **SteamKit2** (C#) a **steam-user** (Node.js) představují nejspolehlivější knihovny pro implementaci. Webová verze vyžaduje backend server – čistě frontendové řešení není realizovatelné. Pro vlastní implementaci doporučuji Node.js stack s expresním API a Vue.js frontendem inspirovaným ASF-ui, s důrazem na bezpečné zacházení s autentizačními údaji a respektování rate limitů Steam API.