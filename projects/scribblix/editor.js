/**
 * Scribblix - Editor Module
 * Markdown editor with WYSIWYG preview
 */

class ScribblixEditor {
    constructor() {
        this.textarea = null;
        this.preview = null;
        this.currentPage = null;
        this.isDirty = false;
        this.autoSaveTimer = null;
        this.historyStack = [];
        this.historyIndex = -1;
        this.lastSavedContent = '';

        // Editor settings
        this.settings = {
            autoSave: true,
            autoSaveInterval: 30000,
            spellcheck: false,
            fontSize: 16
        };

        // Markdown parser options
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false
        });
    }

    /**
     * Initialize editor
     */
    init() {
        this.textarea = document.getElementById('editorTextarea');
        this.preview = document.getElementById('previewContent');

        if (!this.textarea || !this.preview) {
            console.error('[Scribblix Editor] Editor elements not found');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();

        // Apply settings
        this.applySettings();

        console.log('[Scribblix Editor] Initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Content change
        this.textarea.addEventListener('input', () => {
            this.onContentChange();
        });

        // Keyboard shortcuts
        this.textarea.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Toolbar buttons
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action) {
                    this.executeAction(action);
                }
            });
        });

        // Mode toggle
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setMode(btn.dataset.mode);
            });
        });

        // Save button
        document.getElementById('saveBtn')?.addEventListener('click', () => {
            this.save();
        });

        // Undo/Redo buttons
        document.getElementById('undoBtn')?.addEventListener('click', () => {
            this.undo();
        });

        document.getElementById('redoBtn')?.addEventListener('click', () => {
            this.redo();
        });
    }

    /**
     * Apply editor settings
     */
    async applySettings() {
        const settings = await window.ScribblixDB.SettingsDB.getAll();
        this.settings = { ...this.settings, ...settings };

        // Apply font size
        if (this.textarea) {
            this.textarea.style.fontSize = `${this.settings.fontSize}px`;
        }

        // Apply spellcheck
        if (this.textarea) {
            this.textarea.spellcheck = this.settings.spellcheck;
        }

        // Setup auto-save
        if (this.settings.autoSave) {
            this.startAutoSave();
        }
    }

    /**
     * Load page into editor
     */
    async loadPage(page) {
        if (!page) return;

        this.currentPage = page;
        this.textarea.value = page.content || '';
        this.lastSavedContent = page.content || '';
        this.isDirty = false;

        // Clear history for new page
        this.historyStack = [page.content || ''];
        this.historyIndex = 0;

        // Update preview
        this.updatePreview();

        // Update TOC
        this.updateTOC();

        // Update undo/redo buttons
        this.updateHistoryButtons();

        // Focus textarea
        this.textarea.focus();
    }

    /**
     * Handle content change
     */
    onContentChange() {
        this.isDirty = true;

        // Update preview
        this.updatePreview();

        // Update TOC
        this.updateTOC();

        // Add to history (debounced)
        this.addToHistory();
    }

    /**
     * Update preview pane
     */
    updatePreview() {
        if (!this.preview) return;

        const content = this.textarea.value;

        // Parse markdown and sanitize
        const html = marked.parse(content);
        const sanitized = DOMPurify.sanitize(html, {
            ADD_TAGS: ['input'],
            ADD_ATTR: ['type', 'checked', 'disabled']
        });

        this.preview.innerHTML = sanitized;

        // Add checkboxes functionality
        this.preview.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                // Update markdown content when checkbox is toggled
                this.toggleCheckbox(e.target);
            });
        });
    }

    /**
     * Toggle checkbox in markdown content
     */
    toggleCheckbox(checkbox) {
        const content = this.textarea.value;
        const lines = content.split('\n');
        const checkboxes = this.preview.querySelectorAll('input[type="checkbox"]');
        const index = Array.from(checkboxes).indexOf(checkbox);

        if (index === -1) return;

        let checkboxCount = 0;
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/^(\s*[-*+]\s*)\[([ x])\]/i);
            if (match) {
                if (checkboxCount === index) {
                    const isChecked = checkbox.checked;
                    lines[i] = lines[i].replace(
                        /\[([ x])\]/i,
                        isChecked ? '[x]' : '[ ]'
                    );
                    break;
                }
                checkboxCount++;
            }
        }

        this.textarea.value = lines.join('\n');
        this.onContentChange();
    }

    /**
     * Update table of contents
     */
    updateTOC() {
        const tocContent = document.getElementById('tocContent');
        if (!tocContent) return;

        const content = this.textarea.value;
        const headings = [];

        // Extract headings from markdown
        const lines = content.split('\n');
        for (const line of lines) {
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            if (match) {
                const level = match[1].length;
                const text = match[2].trim();
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                headings.push({ level, text, id });
            }
        }

        // Render TOC
        if (headings.length === 0) {
            tocContent.innerHTML = '<div class="toc-empty">Zádné nadpisy</div>';
            return;
        }

        tocContent.innerHTML = headings.map(h => `
            <a class="toc-item level-${h.level}" href="#${h.id}" data-heading="${h.id}">
                ${h.text}
            </a>
        `).join('');

        // Add click handlers
        tocContent.querySelectorAll('.toc-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const headingId = item.dataset.heading;
                const heading = this.preview.querySelector(`#${headingId}`);
                if (heading) {
                    heading.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    /**
     * Set editor mode (edit, preview, split)
     */
    setMode(mode) {
        const editPane = document.getElementById('editPane');
        const previewPane = document.getElementById('previewPane');

        // Update buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Update panes
        switch (mode) {
            case 'edit':
                editPane.style.display = 'flex';
                previewPane.style.display = 'none';
                break;
            case 'preview':
                editPane.style.display = 'none';
                previewPane.style.display = 'flex';
                break;
            case 'split':
            default:
                editPane.style.display = 'flex';
                previewPane.style.display = 'flex';
                break;
        }

        // Save preference
        window.ScribblixDB.SettingsDB.set('editorMode', mode);
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeydown(e) {
        const isMac = navigator.platform.includes('Mac');
        const modKey = isMac ? e.metaKey : e.ctrlKey;

        if (modKey) {
            switch (e.key.toLowerCase()) {
                case 's':
                    e.preventDefault();
                    this.save();
                    break;
                case 'b':
                    e.preventDefault();
                    this.executeAction('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    this.executeAction('italic');
                    break;
                case 'k':
                    e.preventDefault();
                    this.executeAction('link');
                    break;
                case 'z':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.redo();
                    } else {
                        e.preventDefault();
                        this.undo();
                    }
                    break;
                case 'y':
                    e.preventDefault();
                    this.redo();
                    break;
            }
        }

        // Tab handling
        if (e.key === 'Tab') {
            e.preventDefault();
            this.insertText('  '); // 2 spaces
        }
    }

    /**
     * Execute toolbar action
     */
    executeAction(action) {
        const selection = this.getSelection();

        switch (action) {
            case 'bold':
                this.wrapSelection('**', '**');
                break;
            case 'italic':
                this.wrapSelection('*', '*');
                break;
            case 'strikethrough':
                this.wrapSelection('~~', '~~');
                break;
            case 'code':
                this.wrapSelection('`', '`');
                break;
            case 'h1':
                this.prependLine('# ');
                break;
            case 'h2':
                this.prependLine('## ');
                break;
            case 'h3':
                this.prependLine('### ');
                break;
            case 'ul':
                this.prependLine('- ');
                break;
            case 'ol':
                this.prependLine('1. ');
                break;
            case 'checklist':
                this.prependLine('- [ ] ');
                break;
            case 'quote':
                this.prependLine('> ');
                break;
            case 'link':
                this.insertLink();
                break;
            case 'image':
                this.insertImage();
                break;
            case 'table':
                this.insertTable();
                break;
            case 'codeblock':
                this.insertCodeBlock();
                break;
            case 'hr':
                this.insertText('\n\n---\n\n');
                break;
        }
    }

    /**
     * Get current selection
     */
    getSelection() {
        return {
            start: this.textarea.selectionStart,
            end: this.textarea.selectionEnd,
            text: this.textarea.value.substring(
                this.textarea.selectionStart,
                this.textarea.selectionEnd
            )
        };
    }

    /**
     * Set selection
     */
    setSelection(start, end) {
        this.textarea.focus();
        this.textarea.setSelectionRange(start, end);
    }

    /**
     * Insert text at cursor
     */
    insertText(text) {
        const { start, end } = this.getSelection();
        const before = this.textarea.value.substring(0, start);
        const after = this.textarea.value.substring(end);

        this.textarea.value = before + text + after;
        this.setSelection(start + text.length, start + text.length);
        this.onContentChange();
    }

    /**
     * Wrap selection with prefix and suffix
     */
    wrapSelection(prefix, suffix) {
        const { start, end, text } = this.getSelection();
        const before = this.textarea.value.substring(0, start);
        const after = this.textarea.value.substring(end);

        const newText = text || 'text';
        this.textarea.value = before + prefix + newText + suffix + after;

        if (text) {
            this.setSelection(start, end + prefix.length + suffix.length);
        } else {
            this.setSelection(start + prefix.length, start + prefix.length + newText.length);
        }

        this.onContentChange();
    }

    /**
     * Prepend text to current line
     */
    prependLine(prefix) {
        const { start } = this.getSelection();
        const content = this.textarea.value;

        // Find line start
        let lineStart = start;
        while (lineStart > 0 && content[lineStart - 1] !== '\n') {
            lineStart--;
        }

        const before = content.substring(0, lineStart);
        const after = content.substring(lineStart);

        this.textarea.value = before + prefix + after;
        this.setSelection(start + prefix.length, start + prefix.length);
        this.onContentChange();
    }

    /**
     * Insert link
     */
    insertLink() {
        const { text } = this.getSelection();
        const linkText = text || 'Link text';
        const url = prompt('Enter URL:', 'https://');

        if (url) {
            this.insertText(`[${linkText}](${url})`);
        }
    }

    /**
     * Insert image
     */
    insertImage() {
        const alt = prompt('Image description:', 'Image');
        const url = prompt('Image URL:', 'https://');

        if (url) {
            this.insertText(`![${alt || 'Image'}](${url})`);
        }
    }

    /**
     * Insert table
     */
    insertTable() {
        const table = `
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
`;
        this.insertText(table.trim() + '\n\n');
    }

    /**
     * Insert code block
     */
    insertCodeBlock() {
        const lang = prompt('Programming language:', 'javascript');
        this.insertText(`\n\`\`\`${lang || ''}\n\n\`\`\`\n`);

        // Move cursor inside code block
        const pos = this.textarea.selectionStart - 5;
        this.setSelection(pos, pos);
    }

    /**
     * Add content to history stack
     */
    addToHistory() {
        clearTimeout(this.historyDebounce);

        this.historyDebounce = setTimeout(() => {
            const content = this.textarea.value;

            // Don't add if same as last entry
            if (this.historyStack[this.historyIndex] === content) {
                return;
            }

            // Remove any redo history
            this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);

            // Add new entry
            this.historyStack.push(content);
            this.historyIndex = this.historyStack.length - 1;

            // Limit history size
            if (this.historyStack.length > 100) {
                this.historyStack.shift();
                this.historyIndex--;
            }

            this.updateHistoryButtons();
        }, 500);
    }

    /**
     * Undo
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.textarea.value = this.historyStack[this.historyIndex];
            this.updatePreview();
            this.updateTOC();
            this.updateHistoryButtons();
        }
    }

    /**
     * Redo
     */
    redo() {
        if (this.historyIndex < this.historyStack.length - 1) {
            this.historyIndex++;
            this.textarea.value = this.historyStack[this.historyIndex];
            this.updatePreview();
            this.updateTOC();
            this.updateHistoryButtons();
        }
    }

    /**
     * Update undo/redo button states
     */
    updateHistoryButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        if (undoBtn) {
            undoBtn.disabled = this.historyIndex <= 0;
        }
        if (redoBtn) {
            redoBtn.disabled = this.historyIndex >= this.historyStack.length - 1;
        }
    }

    /**
     * Save current page
     */
    async save() {
        if (!this.currentPage) return;

        try {
            const content = this.textarea.value;

            // Save to history first
            await window.ScribblixDB.HistoryDB.save(
                this.currentPage.id,
                content,
                this.currentPage.title
            );

            // Update page
            await window.ScribblixDB.PageDB.update(this.currentPage.id, { content });

            // Update search index
            this.currentPage.content = content;
            window.ScribblixSearch.updatePage(this.currentPage);

            this.lastSavedContent = content;
            this.isDirty = false;

            // Show toast
            window.ScribblixApp?.showToast('Uloženo', 'success');

            console.log('[Scribblix Editor] Page saved');
        } catch (error) {
            console.error('[Scribblix Editor] Save error:', error);
            window.ScribblixApp?.showToast('Chyba při ukládání', 'error');
        }
    }

    /**
     * Start auto-save
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(() => {
            if (this.isDirty && this.currentPage) {
                this.save();
            }
        }, this.settings.autoSaveInterval);
    }

    /**
     * Stop auto-save
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        return this.isDirty && this.textarea.value !== this.lastSavedContent;
    }

    /**
     * Get word count
     */
    getWordCount() {
        const text = this.textarea.value.trim();
        if (!text) return 0;
        return text.split(/\s+/).length;
    }

    /**
     * Get character count
     */
    getCharCount() {
        return this.textarea.value.length;
    }
}

// Export for global access
window.ScribblixEditor = new ScribblixEditor();

console.log('[Scribblix] Editor module loaded');
