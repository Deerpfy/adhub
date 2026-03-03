# Agent Workflow

## Two-Commit Pipeline

1. Developer (human or agent) implements changes -> COMMIT 1
2. User invokes post-commit-reviewer -> syncs CLAUDE.md, README.md -> COMMIT 2

## Available Agents (all explicit invocation only)

| Agent | Description | Model | Tools |
|---|---|---|---|
| post-commit-reviewer | Reviews recent commits, syncs CLAUDE.md and README.md, checks hub registry/version/translation consistency | sonnet | Read, Write, Edit, Bash, Glob, Grep |
| extension-developer | Develops Chrome extensions and native messaging hosts (youtube-downloader, cardharvest, chat-panel/extension) | opus | Read, Write, Edit, Bash, Glob, Grep |
| hub-developer | Develops hub core (index.html, script.js, styles.css) and standalone vanilla JS/HTML/CSS web projects | sonnet | Read, Write, Edit, Bash, Glob, Grep |
| docs-maintainer | Updates documentation in docs/, CLAUDE.md, README.md with YAML frontmatter versioning and lifecycle checks | haiku | Read, Write, Edit, Glob, Grep |

## How to Invoke

All agents are on-demand. To use an agent:

```
"Use the [agent-name] agent to [task description]."
```

Examples:
- "Use the post-commit-reviewer agent to sync docs with my last commit."
- "Use the extension-developer agent to update YouTube Downloader to version 5.7."
- "Use the hub-developer agent to add a new project to the hub registry."
- "Use the docs-maintainer agent to run a documentation lifecycle check."

## Recommended Workflow

| Task Pattern | Agents to Request |
|---|---|
| Single-file fix | No delegation needed |
| Feature (2-5 files, one module) | Module agent (hub-developer or extension-developer) |
| Cross-module change (5+ files) | All relevant module agents |
| Extension version update | extension-developer (opus) |
| Docs-only change | docs-maintainer (haiku) |
| Post-commit documentation sync | post-commit-reviewer |

## Slash Commands (pre-existing)

| Command | File | Purpose |
|---|---|---|
| /doc-sync | `commands/doc-sync.md` | Documentation lifecycle check |
| /effort-check | `commands/effort-check.md` | Model and effort routing recommendation |
| /security-review | `commands/security-review.md` | Git diff security analysis |
| /test-gen | `commands/test-gen.md` | Generate tests for changed files |

## Project Profile

- Languages: JavaScript (primary), HTML, CSS, Python (youtube-downloader native host), Rust (WASM calculator)
- Frameworks: None (vanilla JS/HTML/CSS, no bundler). React 18 via CDN in ai-prompting and goalix only.
- Test: Not detected — no automated tests exist
- Build: Not detected — static files served via `python -m http.server` or `npx serve .`
- Security areas: cardharvest (Steam auth, 2FA, AES-256), youtube-downloader (native messaging, yt-dlp execution), chat-panel (OAuth, WebSocket)
- Module count: 29 projects + hub core (index.html, script.js, styles.css)
