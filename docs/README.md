# AdHUB Documentation

Tato slozka obsahuje dokumentaci, vyzkumne materialy a artefakty pro projekt AdHUB.

## Struktura

```
docs/
├── mcp-example.md          # Priklad MCP konfigurace pro Claude Code
├── research/               # Vyzkumne analyzy a dokumentace
│   ├── external-services/  # Analyzy externich sluzeb a produktu
│   └── project-research/   # Vyzkum pro konkretni AdHUB projekty
├── artifacts/              # AI artefakty a generovane dokumenty
├── twitch-api/             # Kompletni Twitch API referencni dokumentace (18 souboru)
└── kick-api/               # Kompletni Kick API referencni dokumentace (13 souboru)
```

## Hlavni dokumenty

- **mcp-example.md** - Priklad konfigurace MCP (Model Context Protocol) pro Claude Code

## Slozky

### research/external-services/

Analyzy externich sluzeb, platform a nastroju ktere mohou byt relevantni pro inspiraci nebo integraci:

- **Gitbook-analyza.md** - Komplexni audit dokumentacni platformy GitBook
- **Procreate-analyza.md** - Analyza aplikace Procreate pro digitalni malbu
- **remobebg-analyza.md** - Analyza sluzby remove.bg pro odstranovani pozadi
- **NIMT.AI-analyza.md** - Analyza platformy pro AI visibility tracking
- **API-mega-list-analyza.md** - Analyza repozitare s API sbirkou
- **xcloud-analyza.md** - Analyza xCloud WordPress hostingu

### research/project-research/

Vyzkum a analyzy specificke pro projekty v AdHUB:

- **Analyza_JuxtaposeJS.md** - Analyza JuxtaposeJS knihovny (pro SliderSnap)
- **JuxtaposeJS_Dependencies.md** - Zavislosti JuxtaposeJS pro offline PWA
- **gif-analyza.md** - Analyza nastroju pro before/after GIF (pro SliderSnap)
- **paintnook-funkce-analyza.md** - Analyza funkci pro PaintNook
- **procreate-alternativa-analyza.md** - Open-source alternativy k Procreate
- **kapi-kit-analyza.md** - Analyza KICK API knihovny (pro Chat Panel)
- **Rust-cal-analyza.md** - Analyza Rust game API a kalkulatoru

### artifacts/

AI artefakty - dokumenty generovane AI asistenty:

- **pdf-search-tools.md** - Pruvodce open-source nastroji pro PDF vyhledavani
- **steam-hour-boosting.md** - Technicka analyza Steam hour boosting nastroju
- **ai-prompt-strategy.md** - AI Prompt Formatter strategie 2024-2025
- **web-analysis-prompt.md** - Znovupouzitelny prompt pro analyzu webovych stranek

### twitch-api/

Kompletni referencni dokumentace Twitch API (Helix). 18 samostatnych souboru pokryvajicich vsechny aspekty Twitch API — kazdy soubor je self-contained a slouzi jako single-source-of-truth pro sve tema.

**Zakladni soubory (Foundation):**

| Soubor | Obsah |
|--------|-------|
| `twitch-getting-started.md` | Registrace aplikace, prvni API volani, nastaveni CLI, Developer Console |
| `twitch-authentication.md` | OAuth 2.0 — Authorization Code Grant, Client Credentials, OIDC, token refresh/validace/revokace |
| `twitch-eventsub-subscription-types.md` | Vsech 74+ EventSub subscription typu s condition/payload schematy |
| `twitch-eventsub-webhooks.md` | Webhook transport — HMAC-SHA256 verifikace, challenge/response, TypeScript/Python priklady |
| `twitch-eventsub-websockets.md` | WebSocket transport — lifecycle (Welcome/Keepalive/Reconnect), session management, limity |
| `twitch-eventsub-conduits.md` | Conduit transport — shard management, load balancing, scaling patterns |
| `twitch-scopes-reference.md` | Kompletni tabulka 80+ OAuth scopes s mapovanim na endpointy a EventSub typy |

**Helix API kategorie:**

| Soubor | Endpointy |
|--------|-----------|
| `twitch-api-channels-streams.md` | Channels, Streams, Raids, Schedule, Teams (~23 endpointu) |
| `twitch-api-chat-whispers.md` | Chat, Whispers, Emotes, Badges, Shoutouts, Send Message (~16 endpointu) |
| `twitch-api-channel-points-polls-predictions.md` | Channel Points, Polls, Predictions, Hype Train, Goals, Charity (~16 endpointu) |
| `twitch-api-moderation.md` | AutoMod, Bans, Blocked Terms, Shield Mode, Warnings, VIPs (~23 endpointu) |
| `twitch-api-users-subscriptions.md` | Users, Subscriptions (~10 endpointu) |
| `twitch-api-bits-extensions-analytics.md` | Bits, Extension Transactions, Analytics, Entitlements, CCLs (~20 endpointu) |
| `twitch-api-clips-videos-games.md` | Clips, Videos, Games/Categories, Search, Ads (~11 endpointu) |
| `twitch-api-concepts-ratelimits-pagination.md` | Rate limity (token-bucket), paginace, error format, required headers |

**Specializovane soubory:**

| Soubor | Obsah |
|--------|-------|
| `twitch-extensions.md` | Extensions JS Helper, JWT schema, Bits in Extensions, Configuration Service |
| `twitch-pubsub-migration.md` | PubSub → EventSub migracni tabulka, scope rozdily, behavioral zmeny |
| `twitch-master-reference.md` | Hlavni index — sitemap, endpoint index, scope tabulka, EventSub type index, CLI reference |

### kick-api/

Kompletni referencni dokumentace Kick Developer API. 13 samostatnych souboru pokryvajicich vsechny aspekty Kick API — kazdy soubor je self-contained a slouzi jako single-source-of-truth pro sve tema.

**Zakladni soubory (Foundation):**

| Soubor | Obsah |
|--------|-------|
| `kick-oauth2-flow.md` | OAuth 2.1 — Authorization Code Grant s PKCE, Client Credentials, token refresh/revokace/introspekce |
| `kick-scopes-reference.md` | Vsech 11 OAuth scopes s mapovanim na endpointy a minimum scope sets pro 6 use cases |
| `kick-webhook-security.md` | RSA PKCS1v15-SHA256 verifikace, 6 webhook hlavicek, replay ochrana, Go/TS/Python priklady |
| `kick-webhook-payloads-event-types.md` | Vsech 10 webhook event typu s kompletnymi JSON payload schematy |
| `kick-subscribe-to-events.md` | GET/POST/DELETE subscription endpointy, limity, auto-unsubscribe pravidla |

**API kategorie:**

| Soubor | Endpointy |
|--------|-----------|
| `kick-users-api.md` | Users API — GET uzivatelskych informaci (1 endpoint) |
| `kick-channels-api.md` | Channels API — GET + PATCH kanal/stream metadata (2 endpointy) |
| `kick-chat-api.md` | Chat API — odeslani/smazani zprav, bot anti-loop patterny (2 endpointy) |
| `kick-moderation-api.md` | Moderation API — ban/unban/timeout, permission model (2 endpointy) |
| `kick-channel-rewards-api.md` | Channel Rewards API — CRUD rewards + accept/reject redemptions (7 endpointu) |
| `kick-kicks-api.md` | KICKs API — leaderboard, gift properties (1 endpoint) |
| `kick-public-key-api.md` | Public Key API — RSA klic pro webhook verifikaci, caching strategie (1 endpoint) |

**Master reference:**

| Soubor | Obsah |
|--------|-------|
| `kick-devdocs-master-reference.md` | Hlavni index — repo mapa, kompletni endpoint index (28 endpointu), changelog, scope tabulka, getting started guide |

## Pojmenovani souboru

- Pouzivejte lowercase s pomlckami: `nazev-souboru.md`
- Pro ceske analyzy: `nazev-analyza.md`
- Pro anglicke dokumenty: `name-analysis.md`
