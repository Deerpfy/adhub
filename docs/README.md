---
title: "AdHUB Documentation"
version: 1.1.0
last_updated: 2026-02-17
status: current
---

# AdHUB Documentation

Tato slozka obsahuje dokumentaci, vyzkumne materialy a artefakty pro projekt AdHUB.

## Struktura

```
docs/
├── README.md               # Tento soubor - index dokumentace
├── mcp-example.md          # Priklad MCP konfigurace
├── research/               # Vyzkumne analyzy a dokumentace
│   ├── external-services/  # Analyzy externich sluzeb a produktu (11 souboru)
│   └── project-research/   # Vyzkum pro konkretni AdHUB projekty (20 souboru)
├── artifacts/              # AI artefakty a generovane dokumenty (4 soubory + README)
├── twitch-api/             # Kompletni Twitch API referencni dokumentace (18 souboru)
└── kick-api/               # Kompletni Kick API referencni dokumentace (13 souboru)
```

## Hlavni dokumenty

- **mcp-example.md** - Priklad konfigurace MCP (Model Context Protocol)

## Slozky

### research/external-services/

Analyzy externich sluzeb, platform a nastroju pro inspiraci nebo integraci:

| Soubor | Tema |
|--------|------|
| `3d-print-calculators-analysis.md` | Analyza 3D print kalkulacek |
| `adhub-index-analysis.md` | Analyza AdHUB hub implementace |
| `api-mega-list-analyza.md` | Analyza repozitare s API sbirkou |
| `gitbook-analyza.md` | Audit dokumentacni platformy GitBook (CZ) |
| `gitbook-analysis.md` | Analyza GitBook (EN) |
| `ipify-api-analysis.md` | Analyza ipify IP detection API |
| `nimt-ai-analyza.md` | Analyza NIMT.AI SEO/AEO platformy |
| `procreate-analyza.md` | Analyza Procreate pro digitalni malbu (CZ) |
| `procreate-analysis.md` | Analyza Procreate (EN) |
| `remobebg-analyza.md` | Analyza remove.bg pro odstranovani pozadi |
| `xcloud-analyza.md` | Analyza xCloud WordPress hostingu |

### research/project-research/

Vyzkum a analyzy specificke pro projekty v AdHUB:

| Soubor | Projekt | Pouziti |
|--------|---------|---------|
| `juxtaposejs-analyza.md` | SliderSnap | Zakladni knihovna |
| `juxtaposejs-dependencies.md` | SliderSnap | Offline PWA planovani |
| `gif-analyza.md` | SliderSnap | GIF export funkce |
| `paintnook-funkce-analyza.md` | PaintNook | Feature planning |
| `procreate-alternativa-analyza.md` | PaintNook | Konkurencni analyza |
| `kapi-kit-analyza.md` | Chat Panel | KICK integrace |
| `rust-cal-analyza.md` | (potencialni) | Rust game tools |
| `chat-panel-analyza.md` | Chat Panel | Hlavni technicka analyza |
| `chat-panel-implementacni-plan.md` | Chat Panel | Implementacni plan |
| `chat-panel-doc-donations.md` | Chat Panel | Donace/tipy integrace |
| `chat-panel-doc-event-alerts.md` | Chat Panel | Event alert system doc |
| `chat-panel-event-alerts.md` | Chat Panel | Detailni implementace alertu |
| `chat-panel-doc-obs-browser-source.md` | Chat Panel | OBS browser source |
| `chat-panel-obs-api.md` | Chat Panel | OBS API integrace |
| `chat-panel-doc-streamlabs-css-import.md` | Chat Panel | Streamlabs CSS import |
| `chat-panel-streamlabs-import.md` | Chat Panel | Streamlabs integrace |
| `chat-panel-doc-twitch-eventsub.md` | Chat Panel | Twitch EventSub |
| `cpp-local-ip-detection.md` | IP API | C++ IP detekce |
| `ip-detection-bypass-analysis.md` | IP API | Bypass metody |
| `ip-detection-methods-analysis.md` | IP API | Detekce techniky |

### artifacts/

AI artefakty - dokumenty generovane AI asistenty jako reference a inspirace:

| Soubor | Tema |
|--------|------|
| `pdf-search-tools.md` | Open-source nastroje pro PDF vyhledavani |
| `steam-hour-boosting.md` | Technicka analyza Steam hour boosting |
| `ai-prompt-strategy.md` | AI Prompt Formatter strategie 2024-2025 |
| `web-analysis-prompt.md` | Znovupouzitelny prompt pro analyzu webu |

### twitch-api/

Kompletni referencni dokumentace Twitch API (Helix). 18 self-contained souboru — navigacni tabulka viz CLAUDE.md.

### kick-api/

Kompletni referencni dokumentace Kick Developer API. 13 self-contained souboru — navigacni tabulka viz CLAUDE.md.

## Pojmenovani souboru

- Pouzivejte lowercase s pomlckami (kebab-case): `nazev-souboru.md`
- Pro ceske analyzy: `nazev-analyza.md`
- Pro anglicke dokumenty: `name-analysis.md`
- Kazdemu souboru patri YAML frontmatter s `title`, `version`, `last_updated`, `status`
