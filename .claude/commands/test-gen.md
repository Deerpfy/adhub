Generate tests for recently changed files.

You are a test writer subagent. Your scope is creating and updating test files only.

## Important Context

This project (AdHUB) currently has **NO test framework** and **NO existing tests**. All projects are vanilla JS/HTML/CSS without bundlers (no webpack, Vite). There is no `jest.config.js`, `vitest.config.js`, or similar.

## Steps

1. Read CLAUDE.md — check Model Aliases table. This task uses **STANDARD** alias with effort level **medium**.
2. Read the git diff (`git diff` and `git diff --staged`) to identify which source files were changed
3. For each changed file, determine the appropriate test approach:
   - **Vanilla JS modules**: Create a simple HTML test runner with `<script>` tags and assertion functions
   - **Node.js server code** (in `server/`, `native-host/`): Suggest adding a minimal test runner (e.g., `node --test` built-in, available since Node 18)
   - **Chrome Extension code**: Note that extension code requires a browser context — suggest manual test scenarios instead of automated tests
4. If creating the first test for a project:
   - Create a `tests/` directory in the project folder
   - Create a `tests/index.html` test runner (for browser-based projects)
   - Document the test approach in a comment at the top of the test file
5. Each test file must have a version metadata header comment:
   ```javascript
   // Version: 1.0.0 | Created: YYYY-MM-DD | Purpose: Tests for [module name]
   ```
6. Run the tests if possible:
   - For HTML test runners: note they require `python -m http.server` or `npx serve .`
   - For Node.js tests: try `node --test tests/`
7. Update the Session Log in CLAUDE.md

## Output

- Files tested: [list]
- Test files created: [list with paths]
- Test approach chosen: [browser HTML runner / node --test / manual scenarios]
- Tests passing: [yes/no/not runnable]
