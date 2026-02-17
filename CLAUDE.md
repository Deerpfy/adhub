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
| `docs/ai-workflow-guide.md` | Agent Teams, Effort Routing, Context Strategy |
| `docs/prompt-registry/` | Reusable prompt formulas pro cross-session pouziti |

---

## Model Aliases

Vsechny routing pravidla pouzivaji aliasy. Pri novem modelu aktualizuj POUZE tuto tabulku.

| Alias | Model ID | Context | Effort Levels | $/MTok (in/out) | Updated |
|---|---|---|---|---|---|
| HEAVY | claude-opus-4-6 | 1M (beta) | low/medium/high/max | $15/$75 | 2026-02-17 |
| STANDARD | claude-sonnet-4-5-20250929 | 200K | high (default) | $3/$15 | 2026-02-17 |
| LIGHT | claude-haiku-4-5-20251001 | 200K | low (default) | $1/$5 | 2026-02-17 |

**Migrace:** Otestuj novy model na nekritickym tasku → porovnej kvalitu/cenu → aktualizuj alias → spust re-analyzu docs → zaloguj do Session Logu.

---

## Model Routing

Profil projektu: Hub-and-spokes architektura, 26 vanilla JS/HTML/CSS projektu, 2 Chrome extensions s native hosty, 50K+ LOC, Twitch/Kick/Steam API integrace, zadne automaticke testy.

Vychozi model: **STANDARD**

### Task-to-Model Map

| Task | Alias | Duvod |
|---|---|---|
| YouTube Downloader verzovani (6+ souboru sync) | HEAVY | Cross-file dependency, verze musi byt konzistentni |
| Chat Panel + Twitch/Kick API integrace | HEAVY | Multi-service reasoning, OAuth + EventSub + WebSocket |
| CardHarvest Steam protokol zmeny | HEAVY | Security-critical (auth, 2FA), native messaging bridge |
| Architektura novych projektu | HEAVY | Multi-module planning |
| CLAUDE.md aktualizace | HEAVY | Meta-dokumentace, cely kontext projektu |
| Feature implementace v jednom projektu | STANDARD | Ohraniceny scope, standardni vyvoj |
| Bug fixy s jasnymi kroky | STANDARD | Lokalizovany problem |
| API endpoint implementace | STANDARD | Standardni CRUD/REST prace |
| Dokumentace jednotlivych features | STANDARD | Psani/aktualizace v docs/ |
| Server-side zmeny (Node.js WebSocket) | STANDARD | Backend v ohranicenem scope |
| UI/CSS zmeny v jednom projektu | STANDARD | Vizualni prace, nizsi riziko |
| Hub registry update (script.js config) | STANDARD | Centralni coupling point, 5000+ LOC |
| Aktualizace prekladu (BASE_TRANSLATIONS) | LIGHT | Mechanicke, opakovane, nizke riziko |
| Prejmenovani souboru, import updaty | LIGHT | Find-and-replace operace |
| Scaffolding novych projektu | LIGHT | Boilerplate generovani |
| Jednoduche dotazy na codebase | LIGHT | Quick lookup |
| Commit message generovani | LIGHT | Kratke, mechanicke |

### Project-Specific Overrides

- **Vsechny zmeny v extension manifest/version souborech** → HEAVY (verze musi byt synchronizovane v 6+ souborech, chyba rozbije extension)
- **Twitch/Kick API doc aktualizace** → STANDARD (self-contained soubory, staci lokalni edit)
- **paintnook/bg-remover TensorFlow.js zmeny** → HEAVY (sdilene ML modely, 212MB assets, cross-project impact)
- **Research docs v docs/research/** → LIGHT (analyticke texty, nizke riziko)

### Auto-Routing Hint

Pred kazdym taskem zhodnotni:
1. Kolik souboru task ovlivni? (1-3: STANDARD/LIGHT, 4-10: STANDARD, 10+: HEAVY)
2. Je to security-critical nebo architektura? (Ano: HEAVY)
3. Je to mechanicke/opakovane? (Ano: LIGHT)
4. Pokud nic z vyse, pouzij STANDARD.

### Effort Routing

Effort levels ridi hloubku reasoning vs rychlost/cenu. Pouzivej s aliasy vyse.

| Task Type | Alias | Effort | Context Strategy |
|---|---|---|---|
| Architektura / refactor 10+ souboru | HEAVY | max | 1M context (beta) + compaction |
| Security audit (CardHarvest, extensions) | HEAVY | high | Vsechny relevantni moduly |
| Extension verzovani (6+ souboru sync) | HEAVY | high | Vsechny version soubory |
| Feature v jednom projektu | STANDARD | high | Standard 200K |
| Bug fix s jasnymi kroky | STANDARD | medium | Relevantni soubory |
| Hub registry update (script.js) | STANDARD | high | script.js + cílový projekt |
| Twitch/Kick API doc update | STANDARD | medium | Cilovy doc + master-reference |
| Dokumentace, version headers | LIGHT | low | Cilovy doc + zdrojovy kod |
| Preklady, rename, scaffold | LIGHT | low | Cilove soubory |
| Full codebase analyza / re-analyza | HEAVY | max | 1M context + compaction na 80% |
| CLAUDE.md update | HEAVY | high | Cely CLAUDE.md + projekt struktura |

---

## Agent Team Configuration

Multi-agent orchestrace pres Agent Teams (experimental, flag `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`) a subagenty (stable). Podrobnosti v `docs/ai-workflow-guide.md`.

### Team Roles

| Role | Scope | Alias | Effort | Spawn When |
|---|---|---|---|---|
| Lead / Architect | Dekompozice tasku, CLAUDE.md, cross-project zmeny | HEAVY | high | Vzdy pritomen jako orchestrator |
| Extension Developer | youtube-downloader, cardharvest, chat-panel plugin/ | HEAVY | high | Extension/native host zmeny |
| Hub & Web Developer | index.html, script.js, styles.css, standalone projekty | STANDARD | high | Hub UI, feature prace, registry |
| Docs Maintainer | docs/, version headers, README.md, ANALYSIS.md | LIGHT | low | Dokumentacni tasky |

### Spawn Rules

| Pattern | Agents | Mode |
|---|---|---|
| Single-file bug fix | Zadny (single session) | N/A |
| Feature (2-5 souboru) | Developer + subagent | Subagent report |
| Cross-module refactor (5+) | Full team | Agent Teams (experimental) |
| Security-critical zmena | Security Analyst + Lead | Adversarial review |
| Extension verzovani | Lead (HEAVY, single session) | Sekvencni (6+ souboru musi byt atomic) |
| Dokumentace | Docs Maintainer (subagent) | Subagent report |

### Doporuceni

Pro tento projekt jsou **subagenty vhodnejsi nez Agent Teams** — 26 projektu je nezavislych, vetsina tasku se tyka 1-3 souboru. Agent Teams pouzij jen pro full hub redesign nebo cross-project refactoring.

---

## Session Directives (Auto-Enforced)

Podrobna pravidla jsou v `docs/session-directives.md`. Klicove body:

1. **Auto-Versioning**: Kazdy .md soubor MUSI mit YAML frontmatter (`title`, `version`, `last_updated`, `status`). Pri editaci bumpni verzi a aktualizuj datum.
2. **Model Awareness**: Na zacatku tasku over, ze jsi spravny model dle Model Routing tabulky. Pokud ne, upozorni uzivatele.
3. **Token Optimisation**: Odhadni scope tasku pred zacatkem. Male (<2K tokenu), stredni (<8K), velke (<20K).
4. **Documentation Lifecycle**: Po kazde zmene kodu zkontroluj, zda ovlivnuje existujici dokumentaci. Pokud ano, aktualizuj.
5. **Re-Analysis Protocol**: Pri opakovane analyze zacni od Session Logu, zamer se na soubory se stavem "needs-review".
6. **Think-Before-Act**: Pro complex tasky (3+ souboru): GATHER → THINK → PLAN → ACT → VERIFY. Pro single-file edity staci lightweight reasoning.
7. **Long Session Strategy**: Pri 1M kontextu compaction na 80%. Pri preteceni commitnout hotove zmeny, zalogovat partial session, rozdelit zbytek na subtasky.

---

## Session Log

| Date | Model | Teammates | Task Summary | Files Touched | Est. Tokens | Version Changes |
|---|---|---|---|---|---|---|
| 2026-02-17 | opus-4.6 | N/A | Docs restructure, versioning headers, CLAUDE.md rewrite | 73 | ~15000 | 70 docs: 0→1.0.0, docs/README.md: 1.0.0→1.1.0, CLAUDE.md: full rewrite |
| 2026-02-17 | opus-4.6 | N/A | Multi-agent upgrade: aliases, effort routing, agent teams, slash commands, prompt registry | 12 | ~18000 | CLAUDE.md: rewrite→2.0.0, session-directives: 1.0.0→1.1.0 |

---

## Kontakt

**Autor:** Deerpfy
**GitHub:** https://github.com/Deerpfy/adhub
**Web:** https://deerpfy.github.io/adhub/
