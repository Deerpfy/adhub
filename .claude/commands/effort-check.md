Evaluate the task described in $ARGUMENTS and recommend the optimal model and effort configuration.

## Steps

1. Read CLAUDE.md sections: **Model Aliases** and **Effort Routing**
2. Analyse the task from $ARGUMENTS:
   - How many files will it touch? (estimate from task description)
   - Is it security-critical? (CardHarvest auth, extension native hosts, OAuth flows)
   - Is it mechanical/repetitive? (translations, renaming, scaffolding)
   - Does it require cross-module reasoning? (hub registry + project, extension versioning)
   - Is it a known task type in the Effort Routing table?
3. Check which project(s) are affected and their complexity:
   - Extension projects (youtube-downloader, cardharvest, chat-panel): higher complexity
   - Hub core (script.js, index.html, styles.css): medium-high (5000+ LOC coupling)
   - Standalone projects: lower complexity
   - Documentation: lowest complexity

## Output

```
## Effort Check — $ARGUMENTS

### Recommendation
- **Model alias**: HEAVY / STANDARD / LIGHT
- **Current model ID**: [from alias table]
- **Effort level**: low / medium / high / max
- **Context strategy**: 1M (beta) / 200K / minimal
- **Estimated token budget**: [based on task scope]
- **Agent configuration**: single session / subagent / Agent Teams

### Reasoning
[2-3 sentences explaining why this configuration was chosen]

### Auto-Routing Check
- Files expected: [estimated count]
- Security-critical: [yes/no]
- Mechanical/repetitive: [yes/no]
- Cross-module: [yes/no]
```

If the current session is using a different model than recommended, flag it:
```
⚠ CURRENT SESSION MISMATCH: You are running [current model] but this task recommends [recommended alias].
```
