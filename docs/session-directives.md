---
title: "Session Directives for AI-Assisted Development"
version: 1.1.0
last_updated: 2026-02-17
status: current
---

# Session Directives (Auto-Enforced)

These directives are automatically active for every AI-assisted session.
Any AI model reading this file MUST follow these rules without being asked.

## Auto-Versioning

Every time you CREATE or MODIFY a .md file anywhere in this repository:

1. If the file has no metadata header, add one:
   ```
   ---
   title: [Document Title]
   version: 1.0.0
   last_updated: [YYYY-MM-DD]
   last_reviewed_by: [model name, e.g., "opus-4.6" or "sonnet-4.5"]
   status: current
   token_cost_estimate: [estimated tokens used for this operation]
   ---
   ```
2. If the file already has a metadata header:
   - Bump the patch version (X.Y.Z -> X.Y.Z+1) for content fixes and small updates
   - Bump the minor version (X.Y.Z -> X.Y+1.0) for new sections, significant rewrites, or structural changes
   - Bump the major version (X.Y.Z -> X+1.0.0) for complete rewrites or fundamental scope changes
   - Update `last_updated` to today's date
   - Update `last_reviewed_by` to your model name
   - Update `token_cost_estimate` with the approximate tokens consumed for this edit
   - Update `status` if applicable (current, needs-review, deprecated)
3. If you create a NEW code file (.js, .py, .css, .html, etc.):
   - Add a file header comment with version, date, and purpose
   - JS example: `// Version: 1.0.0 | Created: YYYY-MM-DD | Purpose: [one-line]`
   - Python example: `# Version: 1.0.0 | Created: YYYY-MM-DD | Purpose: [one-line]`

## Model Awareness

At the start of every task, before writing any code or documentation:

1. Identify which model you are (Opus, Sonnet, or Haiku)
2. Check the "Model Routing" section in CLAUDE.md to verify you are the appropriate model for this task
3. If you are a LOWER-tier model than recommended:
   - Proceed with caution and flag: "NOTE: This task is recommended for [higher model]. Results may benefit from review."
   - For security-critical tasks: STOP and recommend the user switches to the appropriate model
4. If you are a HIGHER-tier model than needed:
   - Complete the task but note: "TIP: This task could be handled by [lower model] to save tokens."
5. Always record which model performed the task in the file's metadata header (`last_reviewed_by` field)

## Token Optimisation

Every AI session must be token-aware:

1. Before starting a task, estimate its scope:
   - Small (single file, minor edit): target under 2,000 output tokens
   - Medium (multi-file, feature work): target under 8,000 output tokens
   - Large (architecture, full analysis): budget up to 20,000 output tokens
2. Avoid unnecessary re-reading of files already in context
3. When updating documentation, edit in-place rather than rewriting entire files when possible
4. For large codebases, scan directory structure first, then only read files relevant to the task
5. When producing reports or summaries, use tables over prose where data is structured
6. If a task would exceed the estimated token budget significantly, split it into subtasks

## Documentation Lifecycle

Whenever you perform ANY task in this repository (code changes, bug fixes, new features, refactoring):

1. Check if the change affects any existing documentation in docs/
   - If yes: update the affected doc(s), bump their version, update timestamp
   - If a doc becomes outdated due to your change: set its status to "needs-review"
2. Check if the change introduces something that SHOULD be documented but is not
   - If yes: create a new .md file in the appropriate docs/ subdirectory with full metadata header
3. Update docs/README.md if any files were added, removed, or renamed
4. If you modified 3+ documentation files in a single session, update the CLAUDE.md "Documentation Map" section
5. Never leave documentation in a state where it contradicts the codebase

## Re-Analysis Protocol

If asked to re-run documentation analysis, structure review, or full audit:

1. Read the current "Session Log" in CLAUDE.md to understand what changed since the last analysis
2. Compare current file versions (from metadata headers) against what was last reviewed
3. Focus effort on files with status "needs-review" or files modified since their last_updated date
4. Do NOT re-review files marked "current" unless their source code dependencies have changed
5. After the re-analysis, bump all reviewed files' versions and update their timestamps
6. Append a new entry to the Session Log
7. Re-evaluate the Model Routing task-to-model table if the project scope has changed
8. Estimate and report total tokens consumed for the re-analysis

## Think-Before-Act Protocol

Pro complex multi-step tasky (3+ sekvencnich tool calls) pouzij strukturovane reasoning pauzy:

1. **GATHER**: Precti vsechny relevantni soubory. NEZACINEJ menit.
2. **THINK**: Po shromazdeni informaci posud:
   - Mam vsechny informace pro pokracovani?
   - Jake jsou zavislosti mezi zmenami?
   - Co se muze pokazit? Jake edge cases existuji?
   - Existuje jednodussi pristup?
   - Jsem spravny model tier pro tento task? (Zkontroluj Effort Routing)
3. **PLAN**: Zapis sekvenci zmen pred provedenim:
   - Soubory k uprave v poradi zavislosti
   - Ktere zmeny musi byt atomicke (all-or-nothing)
   - Verifikacni kroky (testy, build check)
4. **ACT**: Proved plan krok po kroku.
5. **VERIFY**: Po vsech zmenach zkontroluj:
   - Konzistence mezi upravenymi soubory
   - Zadne rozbite reference nebo importy
   - Dokumentace stale odpovida kodu
   - Version headers aktualizovany

**Kdy pouzit plny protokol:**
- Task dotykajici se 3+ souboru
- Security-critical modifikace
- Zmeny build/deploy konfigurace
- Jakakoli zmena CLAUDE.md

**Kdy staci lightweight reasoning:**
- Single-file edity s jasnym scopem
- Dokumentacni zmeny v jednom souboru
- Formatting / linting fixy

## Long Session Strategy

Pro sese ktere mohou prekrocit standardni context limity:

1. **Full project audity**: Pouzij HEAVY s 1M kontextem (beta) + compaction
   - Compaction threshold na 80% context window
   - Pri compaction zachovat: klicova rozhodnuti, seznam upravenych souboru, version zmeny
   - Zahodit: verbose obsah jiz zpracovanych souboru, intermediate reasoning
2. **Cilene reviews**: Pouzij STANDARD s 200K kontextem
   - Pre-filtruj soubory na relevantni
   - Pokud se kontext naplni pred dokoncenim, rozdel na subtasky
3. **Batch mechanicke operace**: Pouzij LIGHT s minimalnim kontextem
   - Zpracovavej soubory sekvencne, uvolnuj kontext mezi davkami
4. **Pri detekci bliziciho se limitu**:
   - Uloz aktualni progress (seznam hotovych a zbyvajicich subtasku)
   - Commitni vsechny dokoncene zmeny
   - Zaloguj partial session do Session Logu se statusem "partial"
   - Report zbyvajici praci jako continuation prompt
