---
title: "Prompt Formula Registry"
version: 1.0.0
last_updated: 2026-02-17
last_reviewed_by: opus-4.6
status: current
---

# Prompt Formula Registry

Uloziste znovupouzitelnych prompt formuli testovanych na tomto projektu. Kazda formula je .md soubor s YAML metadata headerem.

## Registry Index

| Formula | Zdroj | Verze | Posledni pouziti | Status |
|---|---|---|---|---|
| Web Analysis Prompt | `docs/artifacts/web-analysis-prompt.md` | 1.0.0 | 2026-02-17 | needs-review |
| AI Prompt Strategy Guide | `docs/artifacts/ai-prompt-strategy.md` | 1.0.0 | 2026-02-17 | needs-review |
| Docs Restructure Formula | (tato sese) | 1.0.0 | 2026-02-17 | current |
| Multi-Agent Upgrade Formula | (tato sese) | 1.0.0 | 2026-02-17 | current |

## Pouziti

Pred zahajenim noveho tasku ktery odpovida existujici formuli:
1. Zkontroluj tento registr pro odpovidajici nebo podobnou formuli
2. Adaptuj formuli na aktualni task (NEUPRAVUJ registrovou kopii)
3. Po dokonceni tasku aktualizuj "Posledni pouziti" datum v registru
4. Pokud je adaptovana formula vyrazne odlisna, vytvor novy zaznam

## Tvorba Novych Formuli

Kazda prompt formula musi obsahovat:
1. YAML metadata header (`title`, `version`, `last_updated`, `model_used`, `status`)
2. Plny prompt ve standardnim formatu (`<context>`, `<task>`, `<constraints>`, `<output_format>`)
3. Sekce "## Results" (pridana po prvnim pouziti) dokumentujici co formula vyprodukovala

## Existujici Formule (z docs/artifacts/)

Dve formule byly detekovany v projektu pri inicializaci:

### 1. Web Analysis Prompt
- **Soubor:** `docs/artifacts/web-analysis-prompt.md`
- **Ucel:** Systematicka diagnostika a analyza webovych stranek
- **Format:** XML-strukturovany prompt s role/context/task sekcemi
- **Jazyk:** CZ

### 2. AI Prompt Strategy Guide
- **Soubor:** `docs/artifacts/ai-prompt-strategy.md`
- **Ucel:** Strategie pro AI prompt formatter s 10+ kategoriemi
- **Format:** Analyticka studie s doporucenim
- **Jazyk:** EN
