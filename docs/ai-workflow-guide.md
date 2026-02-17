---
title: "AI Workflow Guide — Agent Teams, Effort Routing, Context Strategy"
version: 1.0.0
last_updated: 2026-02-17
status: current
---

# AI Workflow Guide

Detailni konfigurace pro multi-agent orchestraci, effort routing a context management v projektu AdHUB. Referencovano z CLAUDE.md.

## Agent Team Configuration — Detail

### Projekt Profil

AdHUB je hub-and-spokes architektura s 26 nezavislymi vanilla JS/HTML/CSS projekty. Vetsina projektu je plne izolovana — sdileji pouze hub registry (`script.js:getLocalizedConfig()`) a preklady (`BASE_TRANSLATIONS`).

**Paralelizovatelne moduly (nezavisle):**
- Kazdy projekt v `projects/` (26 projektu) — zadne sdilene zavislosti
- `docs/twitch-api/` a `docs/kick-api/` — self-contained reference docs
- Research docs v `docs/research/` — analyticke texty

**Tesne svazane moduly (sekvencni single-agent):**
- YouTube Downloader: 6+ souboru musi mit synchronizovane verze (manifest.json, content.js, background.js, popup.html, popup.js, native-host)
- CardHarvest: Extension + Native Host + Web UI (bridge architektura)
- Hub core: index.html + script.js + styles.css (UI zmena casto dotyka vsechny tri)
- Chat Panel + `server/` (frontend + backend v syncu)

**Security-critical moduly (vyzaduji HEAVY review):**
- CardHarvest (Steam auth, 2FA, credentials, `shared_secret`)
- YouTube Downloader Native Host (Python execution, `adhub_yt_host.py`)
- Chat Panel WebSocket server (potencialni injection/DoS vektory)
- Jakykoli soubor s API klici, tokeny nebo OAuth konfiguraci

### Agent Communication Protocol

Pri pouziti Agent Teams:
1. Lead dekomponuje task na subtasky a vytvori shared task list
2. Kazdy teammate si prevezme tasky odpovidajici jeho roli
3. Teammates hlasi zavislosti a blockery pres task list
4. Po dokonceni prace teammate aktualizuje status a notifikuje Lead
5. Lead syntetizuje vysledky a provede final review
6. Lead aktualizuje Session Log s team composition a per-agent contributions

### Kdy Agent Teams vs Subagenty

| Scenar | Doporuceni | Duvod |
|---|---|---|
| Single-file edit | Ani jedno (single session) | Overhead neni opodstatneny |
| Feature v 1 projektu (2-5 souboru) | Subagent | Rychly, focused delegation |
| Cross-project zmena (5+ souboru) | Agent Teams | Parallelni prace s komunikaci |
| Full hub redesign | Agent Teams | Vyzaduje koordinaci Hub Dev + Extension Dev |
| Security audit | Agent Teams (adversarial) | Dva agenti s konkurencnimi hypotezami |
| Doc-only tasky | Subagent (LIGHT) | Jednoduche, mechanicke |

## Context Strategy Guide — Detail

### 1M Context (beta) — Pouziti

- Full-project audity a re-analyzy
- Cross-module refactoring (10+ souboru)
- Architecture reviews vyzadujici cely projekt v pameti
- Zapni compaction pri 80% threshold pro sese presahujici 800K tokenu

### Standard 200K — Pouziti

- Default pro vetsinu development tasku
- Dostatecny pro single-module praci
- Nacti jen soubory relevantni pro task, ne cely projekt

### Minimal Context — Pouziti

- Mechanicke tasky (formatting, renaming, version headers)
- Nacti POUZE cilove soubory
- Nenacitej CLAUDE.md sekce nesouvisejici s taskem
- Zpracovavej po davkach (napr. 10 souboru najednou)

## Effort Level — Detailni Prehled

| Effort | Vhodne pro | Cena | Rychlost |
|---|---|---|---|
| `low` | Mechanicke/opakovane (rename, format, translate) | Nejnizsi | Nejrychlejsi |
| `medium` | Bug fixy, test generovani, doc updaty | Stredni | Rychly |
| `high` | Feature implementace, code review, API integrace | Vyssi | Standardni |
| `max` | Architektura, security audit, full analyza, CLAUDE.md | Nejvyssi | Nejpomalejsi |
