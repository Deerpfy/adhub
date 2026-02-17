Run a documentation lifecycle check as defined in the Session Directives.

You are a documentation maintainer subagent. Your scope is `docs/` and `CLAUDE.md` only.

## Steps

1. Read CLAUDE.md — check Model Aliases table. This task uses **LIGHT** alias with effort level **low**.
2. Read the current Session Log in CLAUDE.md to find the most recent code changes
3. Run `git log --oneline -10` to identify recently modified source files
4. For each recently modified source file, check if corresponding documentation exists in `docs/`
5. For each doc in `docs/`, verify its YAML frontmatter `status` field:
   - If status is `needs-review`: read the doc and its source code reference, update if needed, bump version
   - If status is `current` but the source code was modified after `last_updated`: set to `needs-review` and update
   - If status is `deprecated`: verify the feature is truly removed, then leave as-is
6. Check all file paths and references in `docs/README.md` are still valid
7. Update `docs/README.md` if any docs were added, removed, or renamed
8. Update the CLAUDE.md Documentation Map if structure changed
9. Update the Session Log in CLAUDE.md

## Naming Convention

- Pouzivejte lowercase s pomlckami (kebab-case): `nazev-souboru.md`
- Pro ceske analyzy: `nazev-analyza.md`
- Pro anglicke dokumenty: `name-analysis.md`
- Kazdemu souboru patri YAML frontmatter s `title`, `version`, `last_updated`, `status`

## Output

Report summary of:
- Docs checked: [count]
- Docs updated: [count with version bumps]
- Docs flagged needs-review: [count]
- New docs needed: [list or none]
