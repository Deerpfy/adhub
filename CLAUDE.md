# Claude Code - AdHUB Project Guide

Dokumentace pro AI asistenty pracujici s projektem AdHUB. Pred kazdou sesi si precti tento soubor a `docs/session-directives.md`.

## Struktura projektu

```
adhub/
├── index.html              # Hlavni stranka hubu (~3200 LOC)
├── script.js               # Logika, konfigurace, preklady (~5000 LOC)
├── styles.css              # Globalni styly (~2000 LOC)
├── CLAUDE.md               # Tento soubor
├── README.md               # Dokumentace projektu
├── docs/                   # Dokumentace a vyzkum (70+ .md souboru)
│   ├── README.md           # Index dokumentace
│   ├── mcp-example.md      # MCP konfigurace
│   ├── session-directives.md # Auto-enforced pravidla pro AI sese
│   ├── research/           # Analyzy a vyzkum (31 souboru)
│   │   ├── external-services/  # Analyzy externich sluzeb (11)
│   │   └── project-research/   # Vyzkum pro projekty (20)
│   ├── artifacts/          # AI artefakty (4 + README)
│   ├── twitch-api/         # Twitch API reference (18 souboru)
│   └── kick-api/           # Kick API reference (13 souboru)
├── projects/               # 26 projektu
│   ├── youtube-downloader/ # Chrome extension, yt-dlp
│   ├── chat-panel/         # Multistream chat + WebSocket server
│   ├── cardharvest/        # Steam farming (Chrome ext + Native Host)
│   ├── paintnook/          # Digitalni malba (Canvas + TensorFlow.js)
│   ├── bg-remover/         # AI background removal (TensorFlow.js)
│   ├── pdf-editor/         # PDF editor (pdf-lib, pdf.js)
│   ├── pdf-merge/          # PDF spojovac (pdf-lib)
│   ├── pdf-search/         # PDF vyhledavani
│   ├── goalix/             # Task manager (localStorage)
│   ├── scribblix/          # Offline dokumentace (PWA)
│   ├── slidersnap/         # Before/after porovnani
│   ├── clipforge/          # Video editing (FFmpeg)
│   ├── ai-prompting/       # AI prompt engineering tools
│   ├── claude-rcs/         # Offline P2P workspace
│   ├── ip-api/             # GeoIP + IP lookup server
│   ├── ip-lookup/          # IP lookup utility
│   ├── print3d-calc/       # 3D printing calculator
│   ├── rust-calculator/    # WASM calculator
│   ├── nimt-tracker/       # Tracker app
│   ├── api-catalog/        # API aggregation reference
│   ├── adanimations/       # Animation utilities
│   ├── server-hub/         # Central hub server
│   ├── samplehub/          # Sample project templates
│   ├── spinning-wheel-giveaway/
│   ├── resignation-bets/
│   ├── komopizza/
│   └── video-editing-analysis/ # Research (no code)
├── server/                 # Node.js WebSocket server
└── .github/                # CI/CD workflows + analyze-projects.py
```

## Hlavni projekty

### YouTube Downloader (`projects/youtube-downloader/`)

**Typ:** Chrome Extension (Manifest V3) + Python Native Host + Node.js server

**Klicove soubory:** `plugin/manifest.json`, `plugin/content.js`, `plugin/background.js`, `plugin/popup.html`, `plugin/popup.js`, `plugin/youtube-ui.css`, `native-host/adhub_yt_host.py`

**Verze musi byt konzistentni ve vsech souborech:**
- `manifest.json`: `"version": "5.5.0"`
- `content.js`: `window.__ADHUB_YT_DL_V55__`
- `background.js`: `version: '5.5'`
- `popup.html` + `popup.js`: `v5.5`
- `native-host/adhub_yt_host.py`: `VERSION = '5.5'`

**Tok dat:** YouTube stranka → content.js (ytInitialPlayerResponse) → background.js → Zakladni rezim (chrome.downloads max 720p) NEBO Rozsireny rezim (Native Messaging → adhub_yt_host.py → yt-dlp + ffmpeg → ~/Downloads/)

### Chat Panel (`projects/chat-panel/`)

**Typ:** Web app + Node.js WebSocket server (`server/`)

### CardHarvest (`projects/cardharvest/`)

**Typ:** Chrome Extension + Native Host (Node.js) + Web UI. Farming az 32 her, 2FA, Steam CM servery. Architektura: Web UI → content.js → background.js → Native Messaging → cardharvest-host.js → steam-user → Steam CM.

### PaintNook / BG Remover (`projects/paintnook/`, `projects/bg-remover/`)

**Typ:** Canvas API + TensorFlow.js. Sdili ML modely (~212MB kazdy).

### Twitch API Documentation (`docs/twitch-api/`)

18 self-contained .md souboru. API Base URL: `https://api.twitch.tv/helix`. PubSub decommissioned 2025-04-14 — pouzivat EventSub.

| Potrebuji... | Soubor |
|---|---|
| Registrace, prvni call | `twitch-getting-started.md` |
| OAuth tokeny | `twitch-authentication.md` |
| Webhooks (HMAC) | `twitch-eventsub-webhooks.md` |
| WebSocket eventy | `twitch-eventsub-websockets.md` |
| EventSub typy | `twitch-eventsub-subscription-types.md` |
| Conduits (scaling) | `twitch-eventsub-conduits.md` |
| Chat, emotes, badges | `twitch-api-chat-whispers.md` |
| Channels, streams, raids | `twitch-api-channels-streams.md` |
| Moderace | `twitch-api-moderation.md` |
| Points, polls, predictions | `twitch-api-channel-points-polls-predictions.md` |
| Users, subscriptions | `twitch-api-users-subscriptions.md` |
| Bits, analytics | `twitch-api-bits-extensions-analytics.md` |
| Clips, videos, search | `twitch-api-clips-videos-games.md` |
| Rate limity, paginace | `twitch-api-concepts-ratelimits-pagination.md` |
| OAuth scopes | `twitch-scopes-reference.md` |
| Extensions | `twitch-extensions.md` |
| PubSub migrace | `twitch-pubsub-migration.md` |
| Master index | `twitch-master-reference.md` |

### Kick API Documentation (`docs/kick-api/`)

13 self-contained .md souboru. API Base URL: `https://api.kick.com/public/v1`. RSA PKCS1v15-SHA256 pro webhook podpisy. Nema WebSocket — chat pres webhook eventy.

| Potrebuji... | Soubor |
|---|---|
| OAuth 2.1 (PKCE) | `kick-oauth2-flow.md` |
| Scopes | `kick-scopes-reference.md` |
| Webhook security | `kick-webhook-security.md` |
| Event typy | `kick-webhook-payloads-event-types.md` |
| Subscriptions | `kick-subscribe-to-events.md` |
| Users | `kick-users-api.md` |
| Channels | `kick-channels-api.md` |
| Chat | `kick-chat-api.md` |
| Moderation | `kick-moderation-api.md` |
| Channel rewards | `kick-channel-rewards-api.md` |
| KICKs | `kick-kicks-api.md` |
| Public key | `kick-public-key-api.md` |
| Master index | `kick-devdocs-master-reference.md` |

---

## Pravidla pro vyvoj

### 1. Bez build procesu

Vsechny projekty jsou vanilla JS/HTML/CSS. Zadny webpack, Vite ani bundler. Spusteni: `python -m http.server 8000` nebo `npx serve .`

### 2. Verzovani

Pri zmene extensions aktualizuj verzi ve VSECH souborech konzistentne (semanticke verzovani MAJOR.MINOR.PATCH).

### 3. Jazykova podpora

Preklady v `script.js` v objektu `BASE_TRANSLATIONS` (cs, en).

### 4. Pridani noveho projektu

1. Vytvor `projects/nazev-projektu/` s `index.html`
2. Pridej do `getLocalizedConfig()` v `script.js`
3. Pridej preklady do `BASE_TRANSLATIONS`
4. Pridej konfiguraci do `.github/scripts/analyze-projects.py` (PROJECT_CONFIGS)

### 5. Automaticka analyza (GitHub Action)

- NEUPRAVUJ rucne `projects/*/ANALYSIS.md` — jsou generovany automaticky pri push do `main`
- Soubory: `.github/workflows/project-analysis.yml`, `.github/scripts/analyze-projects.py`

---

## Documentation Map

| Cesta | Popis |
|---|---|
| `docs/README.md` | Index vsech dokumentu s navigaci |
| `docs/mcp-example.md` | MCP konfigurace |
| `docs/session-directives.md` | Auto-enforced pravidla pro AI sese |
| `docs/artifacts/` | AI artefakty (PDF tools, Steam boost, prompting) |
| `docs/research/external-services/` | Analyzy externich sluzeb (11 souboru) |
| `docs/research/project-research/` | Vyzkum pro projekty (20 souboru, prevazne Chat Panel) |
| `docs/twitch-api/` | Twitch API reference (18 self-contained souboru) |
| `docs/kick-api/` | Kick API reference (13 self-contained souboru) |

---

## Model Routing

Profil projektu: Hub-and-spokes architektura, 26 vanilla JS/HTML/CSS projektu, 2 Chrome extensions s native hosty, 50K+ LOC, Twitch/Kick/Steam API integrace, zadne automaticke testy.

Vychozi model: **Sonnet 4.5**

### Task-to-Model Map

| Task | Model | Duvod |
|---|---|---|
| YouTube Downloader verzovani (6+ souboru sync) | Opus 4.6 | Cross-file dependency, verze musi byt konzistentni |
| Chat Panel + Twitch/Kick API integrace | Opus 4.6 | Multi-service reasoning, OAuth + EventSub + WebSocket |
| CardHarvest Steam protokol zmeny | Opus 4.6 | Security-critical (auth, 2FA), native messaging bridge |
| Architektura novych projektu | Opus 4.6 | Multi-module planning |
| CLAUDE.md aktualizace | Opus 4.6 | Meta-dokumentace, cely kontext projektu |
| Feature implementace v jednom projektu | Sonnet 4.5 | Ohraniceny scope, standardni vyvoj |
| Bug fixy s jasnymi kroky | Sonnet 4.5 | Lokalizovany problem |
| API endpoint implementace | Sonnet 4.5 | Standardni CRUD/REST prace |
| Dokumentace jednotlivych features | Sonnet 4.5 | Psani/aktualizace v docs/ |
| Server-side zmeny (Node.js WebSocket) | Sonnet 4.5 | Backend v ohranicenem scope |
| UI/CSS zmeny v jednom projektu | Sonnet 4.5 | Vizualni prace, nizsi riziko |
| Aktualizace prekladu (BASE_TRANSLATIONS) | Haiku 4.5 | Mechanicke, opakovane, nizke riziko |
| Prejmenovani souboru, import updaty | Haiku 4.5 | Find-and-replace operace |
| Scaffolding novych projektu | Haiku 4.5 | Boilerplate generovani |
| Jednoduche dotazy na codebase | Haiku 4.5 | Quick lookup |
| Commit message generovani | Haiku 4.5 | Kratke, mechanicke |

### Project-Specific Overrides

- **Vsechny zmeny v extension manifest/version souborech** → Opus 4.6 (verze musi byt synchronizovane v 6+ souborech, chyba rozbije extension)
- **Twitch/Kick API doc aktualizace** → Sonnet 4.5 (self-contained soubory, staci lokalni edit)
- **paintnook/bg-remover TensorFlow.js zmeny** → Opus 4.6 (sdilene ML modely, 212MB assets, cross-project impact)
- **Research docs v docs/research/** → Haiku 4.5 (analyticke texty, nizke riziko)

### Auto-Routing Hint

Pred kazdym taskem zhodnotni:
1. Kolik souboru task ovlivni? (1-3: Sonnet/Haiku, 4-10: Sonnet, 10+: Opus)
2. Je to security-critical nebo architektura? (Ano: Opus)
3. Je to mechanicke/opakovane? (Ano: Haiku)
4. Pokud nic z vyse, pouzij Sonnet.

---

## Session Directives (Auto-Enforced)

Podrobna pravidla jsou v `docs/session-directives.md`. Klicove body:

1. **Auto-Versioning**: Kazdy .md soubor MUSI mit YAML frontmatter (`title`, `version`, `last_updated`, `status`). Pri editaci bumpni verzi a aktualizuj datum.
2. **Model Awareness**: Na zacatku tasku over, ze jsi spravny model dle Model Routing tabulky. Pokud ne, upozorni uzivatele.
3. **Token Optimisation**: Odhadni scope tasku pred zacatkem. Male (<2K tokenu), stredni (<8K), velke (<20K).
4. **Documentation Lifecycle**: Po kazde zmene kodu zkontroluj, zda ovlivnuje existujici dokumentaci. Pokud ano, aktualizuj.
5. **Re-Analysis Protocol**: Pri opakovane analyze zacni od Session Logu, zamer se na soubory se stavem "needs-review".

---

## Session Log

| Date | Model | Task Summary | Files Touched | Est. Tokens | Version Changes |
|---|---|---|---|---|---|
| 2026-02-17 | opus-4.6 | Docs restructure, versioning headers, CLAUDE.md rewrite | 73 | ~15000 | 70 docs: 0→1.0.0, docs/README.md: 1.0.0→1.1.0, CLAUDE.md: full rewrite |

---

## Kontakt

**Autor:** Deerpfy
**GitHub:** https://github.com/Deerpfy/adhub
**Web:** https://deerpfy.github.io/adhub/
