# Contributing to AdHub

Thank you for your interest in contributing to AdHub! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Project Structure](#project-structure)
- [Code Style](#code-style)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

### Prerequisites

- Git
- A modern web browser (Chrome, Firefox, Edge)
- A local HTTP server (Python, Node.js, or any static server)
- For extension development: Chrome/Chromium browser

### Setting Up Your Development Environment

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/adhub.git
   cd adhub
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/Deerpfy/adhub.git
   ```

3. **Start a local server**
   ```bash
   # Using Python
   python -m http.server 8000

   # Or using Node.js
   npx serve .
   ```

4. **Open in browser**
   ```
   http://localhost:8000
   ```

## How to Contribute

### Types of Contributions

We welcome many types of contributions:

- **Bug fixes** - Fix issues and improve stability
- **New features** - Add functionality to existing projects
- **New projects** - Add entirely new tools to the hub
- **Documentation** - Improve docs, fix typos, add examples
- **Translations** - Add or improve language support
- **Design** - Improve UI/UX and accessibility
- **Testing** - Test on different browsers/platforms

### Finding Issues to Work On

- Check [open issues](https://github.com/Deerpfy/adhub/issues) for tasks
- Look for issues labeled `good first issue` for beginner-friendly tasks
- Issues labeled `help wanted` are actively seeking contributors
- Feel free to ask questions on any issue before starting

## Development Workflow

### Branch Naming Convention

Use descriptive branch names with prefixes:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features | `feature/dark-mode` |
| `fix/` | Bug fixes | `fix/download-button` |
| `docs/` | Documentation | `docs/api-guide` |
| `refactor/` | Code refactoring | `refactor/utils` |
| `style/` | Code style/formatting | `style/eslint-fixes` |
| `test/` | Adding tests | `test/unit-tests` |

### Workflow Steps

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, readable code
   - Follow the existing code style
   - Test your changes locally

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(project): add new feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Go to your fork on GitHub
   - Click "Compare & pull request"
   - Fill out the PR template

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, semicolons, etc.) |
| `refactor` | Code refactoring (no feature/fix) |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |

### Scopes

Use the project name or component:

- `youtube-downloader`
- `chat-panel`
- `pdf-editor`
- `goalix`
- `cardharvest`
- `hub` (for main hub changes)
- `docs` (for documentation)

### Examples

```bash
# Feature
git commit -m "feat(youtube-downloader): add playlist download support"

# Bug fix
git commit -m "fix(pdf-editor): resolve page rotation issue"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Multiple lines
git commit -m "feat(goalix): add task categories

- Add category selection dropdown
- Add category colors
- Update localStorage schema

Closes #123"
```

## Pull Request Process

### Before Submitting

1. **Test your changes** thoroughly
2. **Update documentation** if needed
3. **Ensure no breaking changes** (or document them)
4. **Sync with upstream** to avoid conflicts

### PR Requirements

- Fill out the PR template completely
- Link related issues using `Closes #123` or `Fixes #123`
- Provide screenshots for UI changes
- Keep PRs focused - one feature/fix per PR

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, a maintainer will merge your PR

### After Merge

Your contribution will be deployed automatically via GitHub Actions.

## Issue Guidelines

### Reporting Bugs

When reporting bugs, please include:

- **Clear title** describing the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Browser/OS** information
- **Console errors** if any

### Requesting Features

For feature requests, please include:

- **Clear description** of the feature
- **Use case** - why is this needed?
- **Possible implementation** (optional)
- **Mockups/examples** (optional)

## Project Structure

### Adding a New Project

1. Create folder `projects/your-project/`
2. Add `index.html` as entry point
3. Update `script.js`:
   - Add to `getLocalizedConfig()` function
   - Add translations to `BASE_TRANSLATIONS`
4. Update `.github/scripts/analyze-projects.py`:
   - Add configuration to `PROJECT_CONFIGS`

### Project Folder Structure

```
projects/your-project/
├── index.html          # Entry point (required)
├── script.js           # Main JavaScript
├── styles.css          # Styles
├── README.md           # Project documentation (optional)
└── assets/             # Images, icons, etc. (optional)
```

For projects with servers:

```
projects/your-project/
├── index.html
├── script.js
├── styles.css
└── server/
    ├── index.js        # Server entry point
    ├── package.json    # Dependencies
    └── ...
```

## Code Style

### General Guidelines

- **No build process** - Use vanilla JS, HTML, CSS
- **Readable code** - Use meaningful variable/function names
- **Comments** - Add comments for complex logic
- **Consistency** - Follow existing patterns in the codebase

### JavaScript

```javascript
// Use const/let, not var
const element = document.getElementById('app');
let counter = 0;

// Use template literals
const message = `Hello, ${name}!`;

// Use arrow functions for callbacks
items.forEach(item => processItem(item));

// Use async/await over .then()
async function fetchData() {
    const response = await fetch(url);
    return response.json();
}
```

### HTML

```html
<!-- Use semantic HTML -->
<header>...</header>
<main>...</main>
<footer>...</footer>

<!-- Use meaningful class names -->
<button class="download-btn primary">Download</button>

<!-- Include alt text for images -->
<img src="icon.png" alt="Download icon">
```

### CSS

```css
/* Use CSS custom properties for theming */
:root {
    --primary-color: #007bff;
    --text-color: #333;
}

/* Use meaningful class names */
.card-container { }
.card-title { }
.card-content { }

/* Mobile-first approach */
.container {
    width: 100%;
}

@media (min-width: 768px) {
    .container {
        max-width: 720px;
    }
}
```

## Questions?

- Open an issue with the `question` label
- Check existing issues and documentation first
- Be specific about what you need help with

---

Thank you for contributing to AdHub! Your help makes this project better for everyone.
