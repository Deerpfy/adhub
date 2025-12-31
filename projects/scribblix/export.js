/**
 * Scribblix - Export/Import Module v2.1
 * JSON, Markdown, HTML export functionality
 * Includes standalone HTML documentation generator
 */

class ScribblixExport {
    constructor() {
        this.currentScope = 'all';
        this.currentFormat = 'json';
    }

    /**
     * Export data based on scope and format
     */
    async export(scope = 'all', format = 'json', context = {}) {
        try {
            let data;

            switch (scope) {
                case 'page':
                    if (!context.pageId) {
                        throw new Error('Page ID required for page export');
                    }
                    data = await this.getPageData(context.pageId);
                    break;

                case 'space':
                    if (!context.spaceId) {
                        throw new Error('Space ID required for space export');
                    }
                    data = await this.getSpaceData(context.spaceId);
                    break;

                case 'all':
                default:
                    data = await this.getAllData();
                    break;
            }

            // Generate export based on format
            switch (format) {
                case 'markdown':
                    return await this.exportAsMarkdown(data, scope);

                case 'html':
                    return await this.exportAsHTML(data, scope);

                case 'json':
                default:
                    return this.exportAsJSON(data);
            }
        } catch (error) {
            console.error('[Scribblix Export] Export error:', error);
            throw error;
        }
    }

    /**
     * Get all data for export
     */
    async getAllData() {
        const spaces = await window.ScribblixDB.SpaceDB.getAll();
        const pages = await window.ScribblixDB.PageDB.getAll();
        const settings = await window.ScribblixDB.SettingsDB.getAll();

        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            appVersion: '2.1.0',
            spaces,
            pages,
            settings
        };
    }

    /**
     * Get space data for export
     */
    async getSpaceData(spaceId) {
        const space = await window.ScribblixDB.SpaceDB.getById(spaceId);
        if (!space) {
            throw new Error('Space not found');
        }

        const pages = await window.ScribblixDB.PageDB.getBySpace(spaceId);

        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            appVersion: '2.1.0',
            spaces: [space],
            pages
        };
    }

    /**
     * Get page data for export
     */
    async getPageData(pageId) {
        const page = await window.ScribblixDB.PageDB.getWithSpace(pageId);
        if (!page) {
            throw new Error('Page not found');
        }

        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            appVersion: '2.1.0',
            spaces: page.space ? [page.space] : [],
            pages: [page]
        };
    }

    /**
     * Export as JSON
     */
    exportAsJSON(data) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const filename = `scribblix-export-${this.getTimestamp()}.json`;

        this.downloadBlob(blob, filename);

        return { filename, size: blob.size };
    }

    /**
     * Export as Markdown files
     */
    async exportAsMarkdown(data, scope) {
        // For single page, just download as .md
        if (scope === 'page' && data.pages.length === 1) {
            const page = data.pages[0];
            const content = this.generateMarkdownFile(page);
            const blob = new Blob([content], { type: 'text/markdown' });
            const filename = `${page.slug || 'page'}.md`;

            this.downloadBlob(blob, filename);
            return { filename, size: blob.size };
        }

        // For multiple files, create a downloadable structure
        let combinedContent = `# Scribblix Export\n\n`;
        combinedContent += `Exported: ${new Date().toLocaleString()}\n\n---\n\n`;

        for (const space of data.spaces) {
            combinedContent += `# ${space.icon || '📁'} ${space.name}\n\n`;

            if (space.description) {
                combinedContent += `${space.description}\n\n`;
            }

            const spacePages = data.pages.filter(p => p.spaceId === space.id);
            const tree = window.ScribblixDB.PageDB.buildTree(spacePages, null);

            combinedContent += this.renderPagesAsMarkdown(tree, 2);
            combinedContent += '\n---\n\n';
        }

        const blob = new Blob([combinedContent], { type: 'text/markdown' });
        const filename = `scribblix-export-${this.getTimestamp()}.md`;

        this.downloadBlob(blob, filename);
        return { filename, size: blob.size };
    }

    /**
     * Generate markdown file content for a page
     */
    generateMarkdownFile(page) {
        let content = `---
title: ${page.title}
slug: ${page.slug}
created: ${page.createdAt}
updated: ${page.updatedAt}
---

`;
        content += page.content || '';
        return content;
    }

    /**
     * Render pages tree as markdown
     */
    renderPagesAsMarkdown(pages, level = 2) {
        let content = '';

        for (const page of pages) {
            const heading = '#'.repeat(Math.min(level, 6));
            content += `${heading} ${page.title}\n\n`;

            if (page.content) {
                content += `${page.content}\n\n`;
            }

            if (page.children && page.children.length > 0) {
                content += this.renderPagesAsMarkdown(page.children, level + 1);
            }
        }

        return content;
    }

    /**
     * Export as HTML - Standalone documentation
     */
    async exportAsHTML(data, scope) {
        const html = this.generateStandaloneHTML(data, scope);
        const blob = new Blob([html], { type: 'text/html' });

        // Generate filename based on scope
        let filename;
        if (scope === 'page' && data.pages.length === 1) {
            filename = `${data.pages[0].slug || 'page'}.html`;
        } else if (scope === 'space' && data.spaces.length === 1) {
            filename = `${data.spaces[0].slug || 'documentation'}.html`;
        } else {
            filename = `scribblix-docs-${this.getTimestamp()}.html`;
        }

        this.downloadBlob(blob, filename);
        return { filename, size: blob.size };
    }

    /**
     * Generate standalone HTML document with all styles and scripts inline
     */
    generateStandaloneHTML(data, scope) {
        // Parse all markdown content at export time
        const processedData = this.processMarkdownContent(data);

        // Determine title
        let title = 'Scribblix Documentation';
        if (scope === 'space' && data.spaces.length === 1) {
            title = data.spaces[0].name;
        } else if (scope === 'page' && data.pages.length === 1) {
            title = data.pages[0].title;
        }

        return `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="generator" content="Scribblix v2.1">
    <meta name="theme-color" content="#14b8a6">
    <title>${this.escapeHtml(title)}</title>
    ${this.getInlineStyles()}
</head>
<body data-theme="dark">
    <div class="doc-container">
        ${this.generateSidebar(processedData)}
        <main class="doc-main">
            <header class="doc-header">
                <button class="mobile-menu-btn" onclick="toggleSidebar()" aria-label="Menu">☰</button>
                <h1 class="doc-title">${this.escapeHtml(title)}</h1>
                <div class="header-actions">
                    <button class="theme-toggle" onclick="toggleTheme()" title="Přepnout téma" aria-label="Přepnout světlý/tmavý režim">
                        <span class="icon-sun">☀️</span>
                        <span class="icon-moon">🌙</span>
                    </button>
                </div>
            </header>
            <div class="doc-content-wrapper">
                <article class="doc-content" id="docContent">
                    ${this.generateContent(processedData, scope)}
                </article>
                ${this.generateTOC()}
            </div>
            <footer class="doc-footer">
                <p>Generated by <strong>Scribblix</strong> - Offline Documentation Platform</p>
                <p class="export-date">Exported: ${new Date().toLocaleString('cs-CZ')}</p>
            </footer>
        </main>
    </div>
    ${this.getInlineScripts()}
</body>
</html>`;
    }

    /**
     * Process markdown content for all pages
     */
    processMarkdownContent(data) {
        const processed = { ...data };
        processed.pages = data.pages.map(page => {
            const htmlContent = this.markdownToHTML(page.content || '');
            return {
                ...page,
                htmlContent
            };
        });
        return processed;
    }

    /**
     * Convert markdown to HTML using marked and process blocks
     */
    markdownToHTML(markdown) {
        if (!markdown) return '';

        try {
            // Parse markdown using marked
            let html = marked.parse(markdown);

            // Sanitize with DOMPurify
            html = DOMPurify.sanitize(html, {
                ADD_TAGS: ['details', 'summary'],
                ADD_ATTR: ['open']
            });

            // Process custom blocks
            if (window.ScribblixBlocks) {
                html = window.ScribblixBlocks.process(html);
            }

            return html;
        } catch (error) {
            console.error('[Scribblix Export] Markdown parse error:', error);
            return `<p>${this.escapeHtml(markdown)}</p>`;
        }
    }

    /**
     * Generate sidebar navigation
     */
    generateSidebar(data) {
        let nav = '';

        for (const space of data.spaces) {
            const spacePages = data.pages.filter(p => p.spaceId === space.id);
            const tree = window.ScribblixDB.PageDB.buildTree(spacePages, null);

            nav += `
                <div class="nav-space" data-space="${space.id}">
                    <div class="nav-space-header" onclick="toggleSpace(this)">
                        <span class="nav-toggle">▼</span>
                        <span class="nav-icon">${space.icon || '📁'}</span>
                        <span class="nav-name">${this.escapeHtml(space.name)}</span>
                    </div>
                    <div class="nav-pages">
                        ${this.generateNavTree(tree)}
                    </div>
                </div>
            `;
        }

        return `
        <aside class="doc-sidebar" id="sidebar">
            <div class="sidebar-header">
                <span class="logo-icon">📖</span>
                <span class="logo-text">Scribblix</span>
            </div>
            <div class="sidebar-search">
                <input type="text" id="searchInput" placeholder="Hledat..." oninput="searchPages(this.value)">
                <span class="search-icon">🔍</span>
            </div>
            <nav class="sidebar-nav" id="sidebarNav">
                ${nav}
            </nav>
        </aside>
        <div class="sidebar-overlay" onclick="toggleSidebar()"></div>
        `;
    }

    /**
     * Generate navigation tree
     */
    generateNavTree(pages, level = 0) {
        if (!pages || pages.length === 0) return '';

        return pages.map(page => `
            <div class="nav-page" style="padding-left: ${12 + level * 16}px">
                <a href="#page-${page.id}" onclick="navigateTo('page-${page.id}')">${this.escapeHtml(page.title)}</a>
            </div>
            ${page.children && page.children.length > 0 ? this.generateNavTree(page.children, level + 1) : ''}
        `).join('');
    }

    /**
     * Generate main content
     */
    generateContent(data, scope) {
        let content = '';

        for (const space of data.spaces) {
            const spacePages = data.pages.filter(p => p.spaceId === space.id);
            const tree = window.ScribblixDB.PageDB.buildTree(spacePages, null);

            // Space header (only if multiple spaces)
            if (data.spaces.length > 1) {
                content += `
                    <section class="space-section" id="space-${space.id}">
                        <div class="space-header">
                            <span class="space-icon">${space.icon || '📁'}</span>
                            <h2 class="space-name">${this.escapeHtml(space.name)}</h2>
                        </div>
                        ${space.description ? `<p class="space-desc">${this.escapeHtml(space.description)}</p>` : ''}
                    </section>
                `;
            }

            content += this.generatePagesContent(tree);
        }

        return content;
    }

    /**
     * Generate pages content recursively
     */
    generatePagesContent(pages) {
        if (!pages || pages.length === 0) return '';

        return pages.map(page => `
            <section class="page-section" id="page-${page.id}">
                <header class="page-header">
                    <h2>${this.escapeHtml(page.title)}</h2>
                    <div class="page-meta">
                        <span>📅 ${new Date(page.updatedAt).toLocaleDateString('cs-CZ')}</span>
                    </div>
                </header>
                <div class="page-content">
                    ${page.htmlContent || ''}
                </div>
            </section>
            ${page.children && page.children.length > 0 ? this.generatePagesContent(page.children) : ''}
        `).join('');
    }

    /**
     * Generate Table of Contents placeholder (filled by JS)
     */
    generateTOC() {
        return `
        <aside class="doc-toc" id="toc">
            <div class="toc-header">📑 Obsah stránky</div>
            <nav class="toc-content" id="tocContent">
                <!-- Generated by JavaScript -->
            </nav>
        </aside>
        `;
    }

    /**
     * Get inline CSS styles
     */
    getInlineStyles() {
        return `<style>
/* Scribblix Standalone Documentation Styles v2.1 */
:root {
    --primary: #14b8a6;
    --primary-dark: #0d9488;
    --primary-light: #5eead4;
    --primary-bg: rgba(20, 184, 166, 0.1);

    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    --info: #3b82f6;

    /* Dark theme (default) */
    --bg: #0a0a0f;
    --bg-secondary: #121218;
    --bg-tertiary: #1a1a24;
    --bg-card: #161620;
    --bg-hover: #1e1e2e;

    --text: #ffffff;
    --text-secondary: #a0a0b0;
    --text-muted: #6b6b7d;

    --border: #2a2a3a;
    --border-hover: #3a3a4a;

    --shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    --sidebar-width: 280px;
    --toc-width: 220px;
}

[data-theme="light"] {
    --bg: #ffffff;
    --bg-secondary: #f8fafc;
    --bg-tertiary: #f1f5f9;
    --bg-card: #ffffff;
    --bg-hover: #e2e8f0;

    --text: #1e293b;
    --text-secondary: #475569;
    --text-muted: #94a3b8;

    --border: #e2e8f0;
    --border-hover: #cbd5e1;

    --shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
}

/* Layout */
.doc-container {
    display: flex;
    min-height: 100vh;
}

/* Sidebar */
.doc-sidebar {
    width: var(--sidebar-width);
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 100;
    transition: transform 0.3s ease;
}

.sidebar-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px;
    border-bottom: 1px solid var(--border);
}

.logo-icon {
    font-size: 1.8rem;
}

.logo-text {
    font-size: 1.3rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--primary), var(--primary-light));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.sidebar-search {
    padding: 12px 16px;
    position: relative;
}

.sidebar-search input {
    width: 100%;
    padding: 10px 12px 10px 36px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 0.9rem;
}

.sidebar-search input:focus {
    outline: none;
    border-color: var(--primary);
}

.sidebar-search .search-icon {
    position: absolute;
    left: 28px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.5;
    pointer-events: none;
}

.sidebar-nav {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
}

.nav-space {
    margin-bottom: 8px;
}

.nav-space-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: var(--bg-tertiary);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
}

.nav-space-header:hover {
    background: var(--bg-hover);
}

.nav-toggle {
    font-size: 0.7rem;
    color: var(--text-muted);
    transition: transform 0.2s;
}

.nav-space.collapsed .nav-toggle {
    transform: rotate(-90deg);
}

.nav-space.collapsed .nav-pages {
    display: none;
}

.nav-icon {
    font-size: 1.2rem;
}

.nav-name {
    flex: 1;
    font-weight: 600;
    font-size: 0.9rem;
}

.nav-pages {
    margin-left: 16px;
    padding-left: 12px;
    border-left: 1px solid var(--border);
    margin-top: 4px;
}

.nav-page {
    padding: 8px 12px;
}

.nav-page a {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
    transition: color 0.2s;
    display: block;
}

.nav-page a:hover,
.nav-page a.active {
    color: var(--primary);
}

.sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 90;
}

/* Main Content */
.doc-main {
    flex: 1;
    margin-left: var(--sidebar-width);
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

.doc-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 24px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 50;
}

.mobile-menu-btn {
    display: none;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1.2rem;
}

.doc-title {
    flex: 1;
    font-size: 1.25rem;
    font-weight: 600;
}

.header-actions {
    display: flex;
    gap: 8px;
}

.theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    font-size: 1.2rem;
    transition: all 0.2s;
}

.theme-toggle:hover {
    background: var(--bg-hover);
    border-color: var(--primary);
}

.theme-toggle .icon-sun { display: none; }
.theme-toggle .icon-moon { display: block; }

[data-theme="light"] .theme-toggle .icon-sun { display: block; }
[data-theme="light"] .theme-toggle .icon-moon { display: none; }

.doc-content-wrapper {
    display: flex;
    flex: 1;
}

.doc-content {
    flex: 1;
    padding: 32px 40px;
    max-width: 900px;
}

/* TOC */
.doc-toc {
    width: var(--toc-width);
    padding: 24px 16px;
    position: sticky;
    top: 80px;
    height: calc(100vh - 80px);
    overflow-y: auto;
    border-left: 1px solid var(--border);
}

.toc-header {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 12px;
}

.toc-content a {
    display: block;
    padding: 6px 12px;
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.8rem;
    border-radius: 4px;
    transition: all 0.2s;
}

.toc-content a:hover,
.toc-content a.active {
    background: var(--primary-bg);
    color: var(--primary);
}

.toc-content a.level-2 { padding-left: 24px; }
.toc-content a.level-3 { padding-left: 36px; font-size: 0.75rem; }

/* Page Sections */
.space-section {
    margin-bottom: 40px;
    padding-bottom: 24px;
    border-bottom: 2px solid var(--border);
}

.space-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.space-icon {
    font-size: 2rem;
}

.space-name {
    font-size: 1.75rem;
    font-weight: 700;
}

.space-desc {
    color: var(--text-secondary);
    font-size: 1.05rem;
}

.page-section {
    margin-bottom: 48px;
    scroll-margin-top: 100px;
}

.page-header {
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
}

.page-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--primary);
    margin-bottom: 8px;
}

.page-meta {
    font-size: 0.85rem;
    color: var(--text-muted);
}

/* Content Styles */
.page-content h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--border);
}

.page-content h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 32px 0 16px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border);
}

.page-content h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 24px 0 12px;
}

.page-content h4, .page-content h5, .page-content h6 {
    font-size: 1rem;
    font-weight: 600;
    margin: 20px 0 10px;
}

.page-content p {
    margin: 0 0 16px;
    line-height: 1.7;
}

.page-content a {
    color: var(--primary);
    text-decoration: none;
}

.page-content a:hover {
    text-decoration: underline;
}

.page-content strong {
    font-weight: 600;
}

.page-content code {
    background: var(--bg-tertiary);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.9em;
}

.page-content pre {
    background: var(--bg-tertiary);
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 16px 0;
}

.page-content pre code {
    background: transparent;
    padding: 0;
}

.page-content blockquote {
    border-left: 4px solid var(--primary);
    margin: 16px 0;
    padding: 12px 20px;
    background: var(--primary-bg);
    border-radius: 0 8px 8px 0;
    color: var(--text-secondary);
}

.page-content ul, .page-content ol {
    margin: 16px 0;
    padding-left: 24px;
}

.page-content li {
    margin: 8px 0;
}

.page-content ul li { list-style-type: disc; }
.page-content ol li { list-style-type: decimal; }

.page-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
}

.page-content th, .page-content td {
    padding: 10px 14px;
    border: 1px solid var(--border);
    text-align: left;
}

.page-content th {
    background: var(--bg-tertiary);
    font-weight: 600;
}

.page-content tr:hover {
    background: var(--bg-hover);
}

.page-content hr {
    border: none;
    height: 1px;
    background: var(--border);
    margin: 24px 0;
}

.page-content img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 16px 0;
}

/* Hint Blocks */
.hint-block {
    padding: 16px 20px;
    border-radius: 8px;
    margin: 16px 0;
    display: flex;
    gap: 12px;
    align-items: flex-start;
}

.hint-block-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
}

.hint-block-content {
    flex: 1;
    line-height: 1.6;
}

.hint-block-content p:last-child {
    margin-bottom: 0;
}

.hint-info {
    background: rgba(59, 130, 246, 0.1);
    border-left: 4px solid var(--info);
}

.hint-warning {
    background: rgba(245, 158, 11, 0.1);
    border-left: 4px solid var(--warning);
}

.hint-danger {
    background: rgba(239, 68, 68, 0.1);
    border-left: 4px solid var(--danger);
}

.hint-success {
    background: rgba(16, 185, 129, 0.1);
    border-left: 4px solid var(--success);
}

/* Expandable */
.expandable {
    border: 1px solid var(--border);
    border-radius: 8px;
    margin: 16px 0;
    overflow: hidden;
}

.expandable-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: var(--bg-tertiary);
    cursor: pointer;
    user-select: none;
    transition: background 0.2s;
}

.expandable-header:hover {
    background: var(--bg-hover);
}

.expandable-icon {
    font-size: 0.8rem;
    transition: transform 0.2s;
}

.expandable.open .expandable-icon {
    transform: rotate(90deg);
}

.expandable-title {
    flex: 1;
    font-weight: 600;
    font-size: 0.95rem;
}

.expandable-content {
    display: none;
    padding: 16px;
    border-top: 1px solid var(--border);
}

.expandable.open .expandable-content {
    display: block;
}

/* Tabs */
.tabs-container {
    margin: 16px 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
}

.tabs-header {
    display: flex;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
}

.tab-btn {
    padding: 12px 20px;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    position: relative;
}

.tab-btn:hover {
    color: var(--text);
    background: var(--bg-hover);
}

.tab-btn.active {
    color: var(--primary);
    background: var(--bg-card);
}

.tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--primary);
}

.tab-content {
    display: none;
    padding: 16px;
}

.tab-content.active {
    display: block;
}

/* Code Block */
.code-block {
    position: relative;
    margin: 16px 0;
    border-radius: 8px;
    overflow: hidden;
    background: var(--bg-tertiary);
}

.code-block-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: var(--bg-hover);
    border-bottom: 1px solid var(--border);
    font-size: 0.8rem;
    color: var(--text-muted);
}

.code-block-lang {
    font-family: monospace;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.code-block-copy {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
}

.code-block-copy:hover {
    background: var(--primary-bg);
    border-color: var(--primary);
    color: var(--primary);
}

.code-block-copy.copied {
    background: var(--success);
    border-color: var(--success);
    color: white;
}

.code-block pre {
    margin: 0;
    padding: 16px;
    overflow-x: auto;
}

.code-block.with-line-numbers pre {
    display: flex;
}

.code-line-numbers {
    text-align: right;
    padding-right: 16px;
    border-right: 1px solid var(--border);
    margin-right: 16px;
    color: var(--text-muted);
    user-select: none;
    font-size: 0.85em;
}

.code-line-numbers span {
    display: block;
}

/* Footer */
.doc-footer {
    padding: 24px 40px;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border);
    text-align: center;
    color: var(--text-muted);
    font-size: 0.9rem;
}

.doc-footer strong {
    color: var(--primary);
}

.export-date {
    margin-top: 8px;
    font-size: 0.8rem;
}

/* Search highlight */
.search-highlight {
    background: var(--primary-bg);
    border: 2px solid var(--primary);
    animation: highlight-pulse 0.5s ease;
}

@keyframes highlight-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* Scrollbar */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--border-hover);
}

/* Print styles */
@media print {
    .doc-sidebar,
    .doc-toc,
    .mobile-menu-btn,
    .theme-toggle,
    .sidebar-overlay {
        display: none !important;
    }

    .doc-main {
        margin-left: 0 !important;
    }

    .doc-content {
        max-width: 100%;
        padding: 0;
    }

    .page-section {
        break-inside: avoid;
    }
}

/* Responsive */
@media (max-width: 1200px) {
    .doc-toc {
        display: none;
    }
}

@media (max-width: 768px) {
    .doc-sidebar {
        transform: translateX(-100%);
    }

    .doc-sidebar.open {
        transform: translateX(0);
    }

    .sidebar-overlay.active {
        display: block;
    }

    .doc-main {
        margin-left: 0;
    }

    .mobile-menu-btn {
        display: block;
    }

    .doc-content {
        padding: 20px;
    }

    .doc-footer {
        padding: 20px;
    }
}
</style>`;
    }

    /**
     * Get inline JavaScript
     */
    getInlineScripts() {
        return `<script>
// Scribblix Standalone Documentation Scripts

// Toggle theme
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('scribblix-theme', newTheme);
}

// Load saved theme
(function() {
    const savedTheme = localStorage.getItem('scribblix-theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
    }
})();

// Toggle sidebar (mobile)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

// Toggle space collapse
function toggleSpace(header) {
    const space = header.closest('.nav-space');
    space.classList.toggle('collapsed');
}

// Navigate to section
function navigateTo(id) {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Highlight
        element.classList.add('search-highlight');
        setTimeout(() => element.classList.remove('search-highlight'), 1000);

        // Update active nav
        document.querySelectorAll('.nav-page a').forEach(a => a.classList.remove('active'));
        const navLink = document.querySelector('.nav-page a[href="#' + id + '"]');
        if (navLink) navLink.classList.add('active');

        // Close mobile sidebar
        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
    }
}

// Search pages
function searchPages(query) {
    const pages = document.querySelectorAll('.nav-page');
    const lowerQuery = query.toLowerCase();

    pages.forEach(page => {
        const text = page.textContent.toLowerCase();
        page.style.display = text.includes(lowerQuery) ? '' : 'none';
    });

    // Show all spaces if searching
    if (query) {
        document.querySelectorAll('.nav-space').forEach(s => s.classList.remove('collapsed'));
    }
}

// Generate TOC from content
function generateTOC() {
    const content = document.getElementById('docContent');
    const toc = document.getElementById('tocContent');
    if (!content || !toc) return;

    const headings = content.querySelectorAll('h1, h2, h3');
    let tocHTML = '';

    headings.forEach((heading, i) => {
        const id = heading.id || 'heading-' + i;
        if (!heading.id) heading.id = id;

        const level = parseInt(heading.tagName.charAt(1));
        const text = heading.textContent;

        tocHTML += '<a href="#' + id + '" class="level-' + level + '">' + text + '</a>';
    });

    toc.innerHTML = tocHTML;
}

// Highlight active TOC item on scroll
function updateTOCHighlight() {
    const headings = document.querySelectorAll('#docContent h1[id], #docContent h2[id], #docContent h3[id]');
    const tocLinks = document.querySelectorAll('#tocContent a');

    let current = '';

    headings.forEach(heading => {
        const top = heading.getBoundingClientRect().top;
        if (top < 150) {
            current = heading.id;
        }
    });

    tocLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) {
            link.classList.add('active');
        }
    });
}

// Expandable toggle
function toggleExpandable(header) {
    const expandable = header.closest('.expandable');
    if (expandable) {
        expandable.classList.toggle('open');
        header.setAttribute('aria-expanded', expandable.classList.contains('open'));
    }
}

// Tab switching
function switchTab(btn, tabsId, index) {
    const container = document.querySelector('[data-tabs-id="' + tabsId + '"]');
    if (!container) return;

    container.querySelectorAll('.tab-btn').forEach((b, i) => {
        b.classList.toggle('active', i === index);
        b.setAttribute('aria-selected', i === index);
    });

    container.querySelectorAll('.tab-content').forEach((p, i) => {
        p.classList.toggle('active', i === index);
    });
}

// Copy code
async function copyCode(codeId) {
    const container = document.querySelector('[data-code-id="' + codeId + '"]');
    if (!container) return;

    const code = container.querySelector('code');
    if (!code) return;

    try {
        await navigator.clipboard.writeText(code.textContent);

        const btn = container.querySelector('.code-block-copy');
        if (btn) {
            btn.textContent = 'Copied!';
            btn.classList.add('copied');

            setTimeout(() => {
                btn.textContent = 'Copy';
                btn.classList.remove('copied');
            }, 2000);
        }
    } catch (err) {
        console.error('Copy failed:', err);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    generateTOC();

    // Scroll listener for TOC highlight
    window.addEventListener('scroll', updateTOCHighlight);

    // Set first nav item as active
    const firstPage = document.querySelector('.nav-page a');
    if (firstPage) firstPage.classList.add('active');

    // Expandable keyboard support
    document.querySelectorAll('.expandable-header').forEach(header => {
        header.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleExpandable(header);
            }
        });
    });
});
</script>`;
    }

    /**
     * Import data
     */
    async import(file) {
        const content = await this.readFile(file);
        const extension = file.name.split('.').pop().toLowerCase();

        switch (extension) {
            case 'json':
                return await this.importJSON(content);

            case 'md':
                return await this.importMarkdown(content, file.name);

            default:
                throw new Error(`Unsupported file format: ${extension}`);
        }
    }

    /**
     * Import JSON backup
     */
    async importJSON(content) {
        try {
            const data = JSON.parse(content);

            if (!data.version || !data.spaces) {
                throw new Error('Invalid Scribblix backup format');
            }

            // Ask user for confirmation
            const spacesCount = data.spaces?.length || 0;
            const pagesCount = data.pages?.length || 0;

            const confirmed = confirm(
                `Import ${spacesCount} spaces and ${pagesCount} pages?\n\n` +
                `This will REPLACE all existing data.`
            );

            if (!confirmed) {
                return { cancelled: true };
            }

            await window.ScribblixDB.DBUtils.importAll(data);

            // Reinitialize search
            await window.ScribblixSearch.init();

            return {
                success: true,
                spaces: spacesCount,
                pages: pagesCount
            };
        } catch (error) {
            console.error('[Scribblix Import] JSON import error:', error);
            throw new Error('Failed to parse JSON file');
        }
    }

    /**
     * Import Markdown file
     */
    async importMarkdown(content, filename) {
        // Create a new space for the imported content
        const spaceName = filename.replace('.md', '');

        const space = await window.ScribblixDB.SpaceDB.create({
            name: spaceName,
            icon: '📝',
            description: 'Imported from Markdown'
        });

        // Parse markdown to extract title
        const lines = content.split('\n');
        let title = spaceName;
        let pageContent = content;

        // Check for YAML frontmatter
        if (lines[0] === '---') {
            const endIndex = lines.indexOf('---', 1);
            if (endIndex !== -1) {
                const frontmatter = lines.slice(1, endIndex).join('\n');
                pageContent = lines.slice(endIndex + 1).join('\n');

                // Extract title from frontmatter
                const titleMatch = frontmatter.match(/^title:\s*(.+)$/m);
                if (titleMatch) {
                    title = titleMatch[1].trim();
                }
            }
        }

        // Check for H1 at start
        const h1Match = pageContent.match(/^#\s+(.+)\n/);
        if (h1Match) {
            title = h1Match[1].trim();
        }

        // Create page
        const page = await window.ScribblixDB.PageDB.create({
            spaceId: space.id,
            title,
            content: pageContent.trim()
        });

        // Update search index
        window.ScribblixSearch.addPage(page);

        return {
            success: true,
            spaces: 1,
            pages: 1,
            spaceId: space.id,
            pageId: page.id
        };
    }

    /**
     * Read file as text
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    }

    /**
     * Download blob as file
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Get timestamp for filename
     */
    getTimestamp() {
        const now = new Date();
        return now.toISOString().slice(0, 10);
    }

    /**
     * Escape HTML entities
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format file size
     */
    formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
}

// Export for global access
window.ScribblixExport = new ScribblixExport();

console.log('[Scribblix] Export module v2.1 loaded');
