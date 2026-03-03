---
title: AdHUB Agent Workflow
version: 1.0.0
last_updated: 2026-03-03
---

# Agent Workflow Pipeline

## Project Profile

- **Architecture:** Hub-and-spokes — central hub (index.html, script.js, styles.css) + 29 independent projects
- **Languages:** JavaScript (primary), HTML, CSS, Python (youtube-downloader native host), Rust (WASM calculator)
- **Frameworks:** None (vanilla JS/HTML/CSS, no bundler). React 18 via CDN in ai-prompting and goalix only.
- **Test framework:** None — no automated tests exist
- **Build system:** None — static files served via `python -m http.server` or `npx serve .`
- **Security-critical areas:** cardharvest (Steam auth, 2FA, AES-256), youtube-downloader (native messaging, yt-dlp execution), chat-panel (OAuth, WebSocket)
- **Source files:** ~258 across 29 projects (large category)

## Agent Pipeline

```
Developer commits code
        │
        ▼
┌──────────────────────┐
│ post-commit-reviewer │  ← Auto-invoked after every commit
│  (read-only, haiku)  │  ← Checks: registry sync, version consistency,
└──────────┬───────────┘    translation coverage, doc accuracy
           │
           ▼
   Issues reported to user
```

## Agent Inventory

| Agent | File | Model | Tools | Auto-Invoke |
|---|---|---|---|---|
| post-commit-reviewer | `agents/post-commit-reviewer.md` | haiku | Read, Grep, Glob | Yes |
| extension-developer | `agents/extension-developer.md` | opus | Read, Edit, Write, Grep, Glob, Bash | No |
| hub-developer | `agents/hub-developer.md` | sonnet | Read, Edit, Write, Grep, Glob, Bash | No |
| docs-maintainer | `agents/docs-maintainer.md` | haiku | Read, Grep, Glob | No |

## Slash Commands (pre-existing)

| Command | File | Purpose |
|---|---|---|
| /doc-sync | `commands/doc-sync.md` | Documentation lifecycle check |
| /effort-check | `commands/effort-check.md` | Model and effort routing recommendation |
| /security-review | `commands/security-review.md` | Git diff security analysis |
| /test-gen | `commands/test-gen.md` | Generate tests for changed files |

## Delegation Rules

| Task Pattern | Agent | Reason |
|---|---|---|
| Extension bug fix or feature | extension-developer | Manifest V3, native messaging expertise |
| Hub UI change, new project scaffold | hub-developer | script.js registry, translations |
| Documentation update, doc lifecycle | docs-maintainer | YAML frontmatter, doc structure |
| Any commit (automatic) | post-commit-reviewer | Catches registry/version/doc drift |
| Security audit | /security-review command | Specialized security analysis |

## Scaling Notes

- 29 projects, 258 source files → 4 agents (within max-7 limit for 100+ files)
- Most tasks touch 1-3 files → subagent delegation preferred over Agent Teams
- Agent Teams (experimental) only for full hub redesign or cross-project refactoring
