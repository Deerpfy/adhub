/**
 * Scribblix - Export/Import Module
 * JSON, Markdown, HTML export functionality
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
            appVersion: '1.0.0',
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
            appVersion: '1.0.0',
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
            appVersion: '1.0.0',
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
        // Since we can't create ZIP without a library, we'll export as a single combined file
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
     * Export as HTML
     */
    async exportAsHTML(data, scope) {
        const html = this.generateHTMLDocument(data);
        const blob = new Blob([html], { type: 'text/html' });
        const filename = `scribblix-export-${this.getTimestamp()}.html`;

        this.downloadBlob(blob, filename);
        return { filename, size: blob.size };
    }

    /**
     * Generate HTML document
     */
    generateHTMLDocument(data) {
        let html = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scribblix Export</title>
    <style>
        :root {
            --primary: #14b8a6;
            --bg: #0a0a0f;
            --card: #161620;
            --text: #ffffff;
            --text-muted: #a0a0b0;
            --border: #2a2a3a;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 40px 20px;
        }
        .container { max-width: 900px; margin: 0 auto; }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border);
        }
        .header h1 { color: var(--primary); font-size: 2.5rem; }
        .header p { color: var(--text-muted); margin-top: 10px; }
        .space {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }
        .space-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border);
        }
        .space-icon { font-size: 1.5rem; }
        .space-name { font-size: 1.5rem; font-weight: 600; }
        .space-desc { color: var(--text-muted); margin-bottom: 16px; }
        .page { margin-bottom: 24px; }
        .page h2 { color: var(--primary); margin-bottom: 12px; }
        .page h3, .page h4 { margin: 16px 0 8px; }
        .page p { margin-bottom: 12px; }
        .page code {
            background: rgba(255,255,255,0.1);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
        }
        .page pre {
            background: rgba(0,0,0,0.3);
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 16px 0;
        }
        .page pre code { background: transparent; padding: 0; }
        .page blockquote {
            border-left: 4px solid var(--primary);
            padding: 12px 20px;
            background: rgba(20,184,166,0.1);
            margin: 16px 0;
            border-radius: 0 8px 8px 0;
        }
        .page table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .page th, .page td { padding: 10px; border: 1px solid var(--border); text-align: left; }
        .page th { background: rgba(255,255,255,0.05); }
        .page ul, .page ol { padding-left: 24px; margin: 12px 0; }
        .page a { color: var(--primary); }
        .page img { max-width: 100%; height: auto; border-radius: 8px; }
        .page hr { border: none; height: 1px; background: var(--border); margin: 24px 0; }
        .nested { margin-left: 20px; padding-left: 20px; border-left: 2px dashed var(--border); }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>📖 Scribblix</h1>
            <p>Exported: ${new Date().toLocaleString()}</p>
        </header>
        <main>
`;

        for (const space of data.spaces) {
            html += `
            <section class="space">
                <div class="space-header">
                    <span class="space-icon">${space.icon || '📁'}</span>
                    <span class="space-name">${this.escapeHtml(space.name)}</span>
                </div>
`;

            if (space.description) {
                html += `<p class="space-desc">${this.escapeHtml(space.description)}</p>`;
            }

            const spacePages = data.pages.filter(p => p.spaceId === space.id);
            const tree = window.ScribblixDB.PageDB.buildTree(spacePages, null);

            html += this.renderPagesAsHTML(tree);
            html += `</section>`;
        }

        html += `
        </main>
        <footer class="footer">
            <p>Generated by Scribblix - Offline Documentation Platform</p>
        </footer>
    </div>
</body>
</html>`;

        return html;
    }

    /**
     * Render pages tree as HTML
     */
    renderPagesAsHTML(pages, isNested = false) {
        let html = isNested ? '<div class="nested">' : '';

        for (const page of pages) {
            html += `<article class="page">`;
            html += `<h2>${this.escapeHtml(page.title)}</h2>`;

            if (page.content) {
                // Parse markdown to HTML
                const contentHtml = marked.parse(page.content);
                html += DOMPurify.sanitize(contentHtml);
            }

            if (page.children && page.children.length > 0) {
                html += this.renderPagesAsHTML(page.children, true);
            }

            html += `</article>`;
        }

        html += isNested ? '</div>' : '';
        return html;
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

console.log('[Scribblix] Export module loaded');
