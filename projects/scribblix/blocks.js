/**
 * Scribblix - Content Blocks Module
 * GitBook-inspired custom markdown blocks
 * Supports: Hints, Tabs, Expandables, Enhanced Code Blocks
 */

const ScribblixBlocks = {
    /**
     * Icon mapping for hint types
     */
    hintIcons: {
        info: 'ℹ️',
        warning: '⚠️',
        danger: '🚫',
        success: '✅',
        tip: '💡',
        note: '📝'
    },

    /**
     * Process markdown content with custom blocks
     * @param {string} html - HTML after marked.js processing
     * @returns {string} - Enhanced HTML with custom blocks
     */
    process(html) {
        // Process hint blocks
        html = this.processHintBlocks(html);

        // Process expandables
        html = this.processExpandables(html);

        // Process tabs
        html = this.processTabs(html);

        // Process enhanced code blocks
        html = this.processCodeBlocks(html);

        return html;
    },

    /**
     * Process hint blocks from markdown
     * Syntax: :::info, :::warning, :::danger, :::success
     * @param {string} html
     * @returns {string}
     */
    processHintBlocks(html) {
        // Pattern: <p>:::type</p> content <p>:::</p>
        const hintPattern = /<p>:::(\w+)<\/p>([\s\S]*?)<p>:::<\/p>/gi;

        return html.replace(hintPattern, (match, type, content) => {
            const validType = ['info', 'warning', 'danger', 'success', 'tip', 'note'].includes(type.toLowerCase())
                ? type.toLowerCase()
                : 'info';

            const icon = this.hintIcons[validType] || this.hintIcons.info;

            // Map tip/note to info styling
            const styleType = ['tip', 'note'].includes(validType) ? 'info' : validType;

            return `
                <div class="hint-block hint-${styleType}" role="note" aria-label="${validType} hint">
                    <span class="hint-block-icon" aria-hidden="true">${icon}</span>
                    <div class="hint-block-content">${content.trim()}</div>
                </div>
            `;
        });
    },

    /**
     * Process expandable/accordion blocks
     * Syntax: <details><summary>Title</summary>Content</details>
     * @param {string} html
     * @returns {string}
     */
    processExpandables(html) {
        // Convert <details> to custom expandable with accessibility
        const detailsPattern = /<details>([\s\S]*?)<summary>(.*?)<\/summary>([\s\S]*?)<\/details>/gi;

        return html.replace(detailsPattern, (match, before, title, content) => {
            const id = 'expand-' + Math.random().toString(36).substr(2, 9);

            return `
                <div class="expandable" data-expandable-id="${id}">
                    <div class="expandable-header"
                         role="button"
                         tabindex="0"
                         aria-expanded="false"
                         aria-controls="${id}-content"
                         onclick="ScribblixBlocks.toggleExpandable(this)">
                        <span class="expandable-icon" aria-hidden="true">▶</span>
                        <span class="expandable-title">${title}</span>
                    </div>
                    <div class="expandable-content" id="${id}-content" role="region">
                        ${content.trim()}
                    </div>
                </div>
            `;
        });
    },

    /**
     * Process tab blocks
     * Syntax: {% tabs %} {% tab title="Tab 1" %} Content {% endtab %} {% endtabs %}
     * Simplified: Uses <tabs> and <tab> pseudo-elements
     * @param {string} html
     * @returns {string}
     */
    processTabs(html) {
        // For now, we'll use a simpler pattern with :::tabs and :::tab
        // :::tabs
        // :::tab Tab 1
        // Content
        // :::
        // :::tab Tab 2
        // Content
        // :::
        // :::endtabs

        const tabsPattern = /<p>:::tabs<\/p>([\s\S]*?)<p>:::endtabs<\/p>/gi;

        return html.replace(tabsPattern, (match, content) => {
            const tabPattern = /<p>:::tab\s+(.+?)<\/p>([\s\S]*?)(?=<p>:::tab|<p>:::endtabs|$)/gi;
            const tabs = [];
            let tabMatch;

            while ((tabMatch = tabPattern.exec(content)) !== null) {
                tabs.push({
                    title: tabMatch[1].trim(),
                    content: tabMatch[2].replace(/<p>:::<\/p>/g, '').trim()
                });
            }

            if (tabs.length === 0) return match;

            const id = 'tabs-' + Math.random().toString(36).substr(2, 9);

            const tabButtons = tabs.map((tab, i) => `
                <button class="tab-btn ${i === 0 ? 'active' : ''}"
                        role="tab"
                        aria-selected="${i === 0}"
                        aria-controls="${id}-panel-${i}"
                        onclick="ScribblixBlocks.switchTab(this, '${id}', ${i})">
                    ${tab.title}
                </button>
            `).join('');

            const tabPanels = tabs.map((tab, i) => `
                <div class="tab-content ${i === 0 ? 'active' : ''}"
                     id="${id}-panel-${i}"
                     role="tabpanel"
                     aria-labelledby="${id}-tab-${i}">
                    ${tab.content}
                </div>
            `).join('');

            return `
                <div class="tabs-container" data-tabs-id="${id}">
                    <div class="tabs-header" role="tablist">
                        ${tabButtons}
                    </div>
                    ${tabPanels}
                </div>
            `;
        });
    },

    /**
     * Process code blocks with enhanced features
     * Adds: language label, copy button, line numbers
     * @param {string} html
     * @returns {string}
     */
    processCodeBlocks(html) {
        // Find pre > code blocks with language class
        const codePattern = /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/gi;

        return html.replace(codePattern, (match, lang, code) => {
            const id = 'code-' + Math.random().toString(36).substr(2, 9);
            const lines = code.split('\n');
            const lineCount = lines.length;

            // Generate line numbers
            const lineNumbers = Array.from({ length: lineCount }, (_, i) =>
                `<span>${i + 1}</span>`
            ).join('');

            return `
                <div class="code-block with-line-numbers" data-code-id="${id}">
                    <div class="code-block-header">
                        <span class="code-block-lang">${lang}</span>
                        <button class="code-block-copy"
                                onclick="ScribblixBlocks.copyCode('${id}')"
                                aria-label="Copy code">
                            Copy
                        </button>
                    </div>
                    <pre><div class="code-line-numbers" aria-hidden="true">${lineNumbers}</div><code class="language-${lang}">${code}</code></pre>
                </div>
            `;
        });
    },

    /**
     * Toggle expandable section
     * @param {HTMLElement} header
     */
    toggleExpandable(header) {
        const expandable = header.closest('.expandable');
        if (!expandable) return;

        const isOpen = expandable.classList.contains('open');
        expandable.classList.toggle('open');
        header.setAttribute('aria-expanded', !isOpen);
    },

    /**
     * Switch tab
     * @param {HTMLElement} btn
     * @param {string} tabsId
     * @param {number} index
     */
    switchTab(btn, tabsId, index) {
        const container = document.querySelector(`[data-tabs-id="${tabsId}"]`);
        if (!container) return;

        // Update buttons
        container.querySelectorAll('.tab-btn').forEach((b, i) => {
            b.classList.toggle('active', i === index);
            b.setAttribute('aria-selected', i === index);
        });

        // Update panels
        container.querySelectorAll('.tab-content').forEach((p, i) => {
            p.classList.toggle('active', i === index);
        });
    },

    /**
     * Copy code to clipboard
     * @param {string} codeId
     */
    async copyCode(codeId) {
        const container = document.querySelector(`[data-code-id="${codeId}"]`);
        if (!container) return;

        const code = container.querySelector('code');
        if (!code) return;

        try {
            await navigator.clipboard.writeText(code.textContent);

            // Show feedback
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
            console.error('[Scribblix Blocks] Copy failed:', err);
        }
    },

    /**
     * Initialize expandables with keyboard support
     */
    initExpandables() {
        document.querySelectorAll('.expandable-header').forEach(header => {
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleExpandable(header);
                }
            });
        });
    },

    /**
     * Initialize tabs with keyboard navigation
     */
    initTabs() {
        document.querySelectorAll('.tabs-header').forEach(header => {
            header.addEventListener('keydown', (e) => {
                const tabs = header.querySelectorAll('.tab-btn');
                const current = header.querySelector('.tab-btn.active');
                const currentIndex = Array.from(tabs).indexOf(current);

                let newIndex = currentIndex;

                if (e.key === 'ArrowRight') {
                    newIndex = (currentIndex + 1) % tabs.length;
                } else if (e.key === 'ArrowLeft') {
                    newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                } else if (e.key === 'Home') {
                    newIndex = 0;
                } else if (e.key === 'End') {
                    newIndex = tabs.length - 1;
                } else {
                    return;
                }

                e.preventDefault();
                tabs[newIndex].click();
                tabs[newIndex].focus();
            });
        });
    }
};

// Make available globally
window.ScribblixBlocks = ScribblixBlocks;

console.log('[Scribblix] Blocks module loaded');
