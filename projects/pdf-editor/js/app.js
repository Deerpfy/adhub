/**
 * PDF Editor - Main Application
 * Coordinates all modules and handles UI interactions
 */

const PDFEditorApp = {
    // Current state
    currentFile: null,
    currentFileData: null,
    currentTab: 'editor',
    isProcessing: false,

    // Module references (initialized in init())
    viewer: null,
    editor: null,
    signer: null,
    compressor: null,
    pages: null,

    // DOM elements
    elements: {},

    // Translations
    translations: {
        cs: {
            title: 'PDF Editor',
            subtitle: 'Editujte, podepisujte, komprimujte a reorganizujte PDF soubory',
            tab_editor: 'Editor',
            tab_sign: 'Podpisy',
            tab_compress: 'Komprese',
            tab_pages: 'Stránky',
            drop_title: 'Klikněte pro nahrání',
            drop_subtitle: 'nebo přetáhněte PDF soubor',
            drop_hint: 'Pouze PDF soubory',
            loading: 'Načítání...',
            processing: 'Zpracovávání...',
            download: 'Stáhnout PDF',
            new_file: 'Nový soubor',
            undo: 'Zpět',
            redo: 'Vpřed',
            clear: 'Vymazat',
            save_changes: 'Uložit změny',
            // Editor tools
            tool_select: 'Výběr',
            tool_text: 'Text',
            tool_highlight: 'Zvýraznění',
            tool_rectangle: 'Obdélník',
            tool_circle: 'Kruh',
            tool_line: 'Čára',
            tool_freehand: 'Kresba',
            tool_whiteout: 'Bílý rámeček',
            tool_delete: 'Smazat',
            // Signature
            sig_draw: 'Nakreslit',
            sig_upload: 'Nahrát',
            sig_text: 'Text',
            sig_clear: 'Vymazat',
            sig_add: 'Přidat podpis',
            sig_save: 'Uložit podpis',
            sig_upload_hint: 'Klikněte nebo přetáhněte obrázek',
            sig_text_placeholder: 'Vaše jméno',
            // Compression
            compress_low: 'Nízká',
            compress_medium: 'Střední',
            compress_high: 'Vysoká',
            compress_btn: 'Komprimovat PDF',
            compress_quality: 'Kvalita',
            compress_size: 'Velikost',
            original_size: 'Původní velikost',
            compressed_size: 'Komprimovaná velikost',
            reduction: 'Úspora',
            // Pages
            pages_delete: 'Smazat vybrané',
            pages_rotate: 'Otočit',
            pages_reset: 'Obnovit',
            pages_apply: 'Použít změny',
            page_of: 'z',
            // Status
            status_ready: 'Připraveno',
            status_loading: 'Načítání PDF...',
            status_error: 'Chyba',
            status_success: 'Úspěch',
            error_invalid_pdf: 'Neplatný PDF soubor',
            error_encrypted: 'PDF je zašifrováno',
            error_processing: 'Chyba při zpracování',
            mobile_warning: 'Pro nejlepší zážitek doporučujeme použít počítač.',
            // Page navigation
            prev_page: 'Předchozí',
            next_page: 'Další',
            zoom_in: 'Přiblížit',
            zoom_out: 'Oddálit',
            // File info
            pages_count: 'stran',
            file_size: 'Velikost'
        },
        en: {
            title: 'PDF Editor',
            subtitle: 'Edit, sign, compress and reorganize PDF files',
            tab_editor: 'Editor',
            tab_sign: 'Signatures',
            tab_compress: 'Compress',
            tab_pages: 'Pages',
            drop_title: 'Click to upload',
            drop_subtitle: 'or drag and drop PDF file',
            drop_hint: 'PDF files only',
            loading: 'Loading...',
            processing: 'Processing...',
            download: 'Download PDF',
            new_file: 'New File',
            undo: 'Undo',
            redo: 'Redo',
            clear: 'Clear',
            save_changes: 'Save Changes',
            tool_select: 'Select',
            tool_text: 'Text',
            tool_highlight: 'Highlight',
            tool_rectangle: 'Rectangle',
            tool_circle: 'Circle',
            tool_line: 'Line',
            tool_freehand: 'Draw',
            tool_whiteout: 'Whiteout',
            tool_delete: 'Delete',
            sig_draw: 'Draw',
            sig_upload: 'Upload',
            sig_text: 'Text',
            sig_clear: 'Clear',
            sig_add: 'Add Signature',
            sig_save: 'Save Signature',
            sig_upload_hint: 'Click or drag image here',
            sig_text_placeholder: 'Your name',
            compress_low: 'Low',
            compress_medium: 'Medium',
            compress_high: 'High',
            compress_btn: 'Compress PDF',
            compress_quality: 'Quality',
            compress_size: 'Size',
            original_size: 'Original size',
            compressed_size: 'Compressed size',
            reduction: 'Reduction',
            pages_delete: 'Delete Selected',
            pages_rotate: 'Rotate',
            pages_reset: 'Reset',
            pages_apply: 'Apply Changes',
            page_of: 'of',
            status_ready: 'Ready',
            status_loading: 'Loading PDF...',
            status_error: 'Error',
            status_success: 'Success',
            error_invalid_pdf: 'Invalid PDF file',
            error_encrypted: 'PDF is encrypted',
            error_processing: 'Error processing file',
            mobile_warning: 'For best experience, use a desktop computer.',
            prev_page: 'Previous',
            next_page: 'Next',
            zoom_in: 'Zoom In',
            zoom_out: 'Zoom Out',
            pages_count: 'pages',
            file_size: 'Size'
        }
    },

    currentLang: 'cs',

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing PDF Editor App...');

        // Get language preference
        this.currentLang = localStorage.getItem('pdfeditor_lang') || 'cs';

        // Initialize storage
        await initializeStorage();

        // Cache DOM elements
        this._cacheElements();

        // Setup event listeners
        this._setupEventListeners();

        // Initialize modules
        this._initializeModules();

        // Apply translations
        this._updateTranslations();

        // Load saved signatures
        await this._loadSavedSignatures();

        console.log('PDF Editor App initialized');
    },

    /**
     * Cache DOM element references
     */
    _cacheElements() {
        this.elements = {
            // Main containers
            dropZone: document.getElementById('dropZone'),
            fileInput: document.getElementById('fileInput'),
            workspace: document.getElementById('workspace'),
            fileInfoBar: document.getElementById('fileInfoBar'),

            // Canvases
            pdfCanvas: document.getElementById('pdfCanvas'),
            fabricCanvas: document.getElementById('fabricCanvas'),

            // Tab navigation
            tabBtns: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),

            // Page navigation
            pageNav: document.getElementById('pageNav'),
            prevPageBtn: document.getElementById('prevPageBtn'),
            nextPageBtn: document.getElementById('nextPageBtn'),
            pageInput: document.getElementById('pageInput'),
            pageTotal: document.getElementById('pageTotal'),
            zoomInBtn: document.getElementById('zoomInBtn'),
            zoomOutBtn: document.getElementById('zoomOutBtn'),
            zoomLevel: document.getElementById('zoomLevel'),

            // Editor toolbar
            toolbar: document.getElementById('toolbar'),
            toolBtns: document.querySelectorAll('.tool-btn[data-tool]'),
            undoBtn: document.getElementById('undoBtn'),
            redoBtn: document.getElementById('redoBtn'),

            // Tool options
            toolOptions: document.getElementById('toolOptions'),
            textColor: document.getElementById('textColor'),
            textSize: document.getElementById('textSize'),
            strokeColor: document.getElementById('strokeColor'),
            strokeWidth: document.getElementById('strokeWidth'),

            // Text formatting
            boldBtn: document.getElementById('boldBtn'),
            italicBtn: document.getElementById('italicBtn'),
            underlineBtn: document.getElementById('underlineBtn'),
            fontFamily: document.getElementById('fontFamily'),

            // Signature elements
            signatureCanvas: document.getElementById('signatureCanvas'),
            sigTabs: document.querySelectorAll('.sig-tab-btn'),
            sigContents: document.querySelectorAll('.sig-tab-content'),
            sigClearBtn: document.getElementById('sigClearBtn'),
            sigAddBtn: document.getElementById('sigAddBtn'),
            sigSaveBtn: document.getElementById('sigSaveBtn'),
            sigUploadArea: document.getElementById('sigUploadArea'),
            sigUploadInput: document.getElementById('sigUploadInput'),
            sigUploadPreview: document.getElementById('sigUploadPreview'),
            sigTextInput: document.getElementById('sigTextInput'),
            sigTextPreview: document.getElementById('sigTextPreview'),
            fontSelector: document.getElementById('fontSelector'),
            savedSignatures: document.getElementById('savedSignatures'),

            // Compression
            compressOptions: document.querySelectorAll('.compress-option'),
            compressBtn: document.getElementById('compressBtn'),
            progressContainer: document.getElementById('progressContainer'),
            progressBar: document.getElementById('progressBar'),
            progressText: document.getElementById('progressText'),

            // Pages
            pageGrid: document.getElementById('pageGrid'),
            pagesDeleteBtn: document.getElementById('pagesDeleteBtn'),
            pagesRotateBtn: document.getElementById('pagesRotateBtn'),
            pagesResetBtn: document.getElementById('pagesResetBtn'),
            pagesApplyBtn: document.getElementById('pagesApplyBtn'),

            // Actions
            downloadBtn: document.getElementById('downloadBtn'),
            newFileBtn: document.getElementById('newFileBtn'),

            // Status
            status: document.getElementById('status'),

            // Language
            langBtns: document.querySelectorAll('.lang-btn'),

            // Loading overlay
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingText: document.getElementById('loadingText')
        };
    },

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        // File drop zone
        if (this.elements.dropZone) {
            this.elements.dropZone.addEventListener('click', () => {
                this.elements.fileInput?.click();
            });

            this.elements.dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.elements.dropZone.classList.add('dragover');
            });

            this.elements.dropZone.addEventListener('dragleave', () => {
                this.elements.dropZone.classList.remove('dragover');
            });

            this.elements.dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.elements.dropZone.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this._handleFileSelect(files[0]);
                }
            });
        }

        // File input
        this.elements.fileInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this._handleFileSelect(e.target.files[0]);
            }
        });

        // Tab navigation
        this.elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this._switchTab(btn.dataset.tab);
            });
        });

        // Language buttons
        this.elements.langBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this._setLanguage(btn.dataset.lang);
            });
        });

        // Page navigation
        this.elements.prevPageBtn?.addEventListener('click', () => this._prevPage());
        this.elements.nextPageBtn?.addEventListener('click', () => this._nextPage());
        this.elements.pageInput?.addEventListener('change', (e) => {
            this._goToPage(parseInt(e.target.value));
        });
        this.elements.zoomInBtn?.addEventListener('click', () => this._zoomIn());
        this.elements.zoomOutBtn?.addEventListener('click', () => this._zoomOut());

        // Editor tools
        this.elements.toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this._setTool(btn.dataset.tool);
            });
        });

        // Undo/Redo
        this.elements.undoBtn?.addEventListener('click', () => this._undo());
        this.elements.redoBtn?.addEventListener('click', () => this._redo());

        // Edit existing text button
        const editTextBtn = document.getElementById('editTextBtn');
        if (editTextBtn) {
            editTextBtn.addEventListener('click', () => this._toggleTextEditing());
        }

        // Tool options
        this.elements.textColor?.addEventListener('input', (e) => {
            PDFEditor.updateSettings({ textColor: e.target.value });
        });
        this.elements.textSize?.addEventListener('input', (e) => {
            PDFEditor.updateSettings({ textSize: parseInt(e.target.value) });
        });
        this.elements.strokeColor?.addEventListener('input', (e) => {
            PDFEditor.updateSettings({ strokeColor: e.target.value });
            PDFSigner.setPenColor(e.target.value);
        });
        this.elements.strokeWidth?.addEventListener('input', (e) => {
            PDFEditor.updateSettings({ strokeWidth: parseInt(e.target.value) });
        });

        // Text formatting buttons
        this.elements.boldBtn?.addEventListener('click', () => this._toggleTextFormat('bold'));
        this.elements.italicBtn?.addEventListener('click', () => this._toggleTextFormat('italic'));
        this.elements.underlineBtn?.addEventListener('click', () => this._toggleTextFormat('underline'));

        this.elements.fontFamily?.addEventListener('change', (e) => {
            this._applyTextFormat('fontFamily', e.target.value);
        });

        this.elements.textSize?.addEventListener('change', (e) => {
            this._applyTextFormat('fontSize', parseInt(e.target.value));
        });

        // Keyboard shortcuts for formatting
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this._toggleTextFormat('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this._toggleTextFormat('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this._toggleTextFormat('underline');
                        break;
                }
            }
        });

        // Signature tabs
        this.elements.sigTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                this._switchSignatureTab(btn.dataset.sigTab);
            });
        });

        // Signature actions
        this.elements.sigClearBtn?.addEventListener('click', () => PDFSigner.clear());
        this.elements.sigAddBtn?.addEventListener('click', () => this._addSignatureToPage());
        this.elements.sigSaveBtn?.addEventListener('click', () => this._saveCurrentSignature());

        // Signature upload
        this.elements.sigUploadArea?.addEventListener('click', () => {
            this.elements.sigUploadInput?.click();
        });
        this.elements.sigUploadInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this._handleSignatureUpload(e.target.files[0]);
            }
        });

        // Signature text
        this.elements.sigTextInput?.addEventListener('input', () => {
            this._updateTextSignaturePreview();
        });

        // Font selector
        this.elements.fontSelector?.querySelectorAll('.font-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this._selectSignatureFont(btn.dataset.font);
            });
        });

        // Compression options
        this.elements.compressOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                this._selectCompressionLevel(opt.dataset.level);
            });
        });
        this.elements.compressBtn?.addEventListener('click', () => this._compressPDF());

        // Pages actions
        this.elements.pagesDeleteBtn?.addEventListener('click', () => this._deleteSelectedPages());
        this.elements.pagesRotateBtn?.addEventListener('click', () => this._rotateSelectedPages());
        this.elements.pagesResetBtn?.addEventListener('click', () => this._resetPages());
        this.elements.pagesApplyBtn?.addEventListener('click', () => this._applyPageChanges());

        // Main actions
        this.elements.downloadBtn?.addEventListener('click', () => this._downloadPDF());
        this.elements.newFileBtn?.addEventListener('click', () => this._newFile());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this._handleKeyDown(e));
    },

    /**
     * Initialize modules
     */
    _initializeModules() {
        // Initialize PDF Viewer
        if (this.elements.pdfCanvas) {
            PDFViewer.init(this.elements.pdfCanvas);
            PDFViewer.onPageChange = (page, total) => this._updatePageNav(page, total);
            PDFViewer.onRenderComplete = (info) => this._onPageRendered(info);
        }

        // Initialize PDF Editor (Fabric.js) - will be initialized when PDF loads
        // This needs canvas dimensions from PDF

        // Initialize Signature Pad
        if (this.elements.signatureCanvas) {
            PDFSigner.init(this.elements.signatureCanvas);
            PDFSigner.loadFonts();
        }

        // Setup compression progress callback
        PDFCompress.onProgress = (progress) => this._updateProgress(progress);

        // Setup pages progress callback
        PDFPages.onProgress = (progress) => this._updateProgress(progress);
        PDFPages.onPageOrderChange = () => this._renderPageGrid();
    },

    /**
     * Handle file selection
     */
    async _handleFileSelect(file) {
        if (!file || file.type !== 'application/pdf') {
            this._showStatus(this.t('error_invalid_pdf'), 'error');
            return;
        }

        this._showLoading(this.t('status_loading'));

        try {
            // Store file reference
            this.currentFile = file;

            // Load PDF
            const info = await PDFViewer.loadPDF(file);
            this.currentFileData = PDFViewer.getRawData();

            // Initialize editor canvas
            const dims = await PDFViewer.getPageDimensions();
            if (this.elements.fabricCanvas) {
                PDFEditor.init('fabricCanvas', dims.width, dims.height);
                PDFEditor.onHistoryChange = (state) => this._updateHistoryButtons(state);

                // Listen for selection changes to update format buttons
                PDFEditor.fabricCanvas.on('selection:created', () => this._updateFormatButtonsState());
                PDFEditor.fabricCanvas.on('selection:updated', () => this._updateFormatButtonsState());
                PDFEditor.fabricCanvas.on('selection:cleared', () => this._updateFormatButtonsState());
            }

            // Initialize pages module
            await PDFPages.init(this.currentFileData);

            // Update UI
            this._updateFileInfo(file, info);
            this._showWorkspace();
            this._renderPageGrid();

            // Save to recent files
            await this._saveToRecent(file, info);

            this._hideLoading();
            this._showStatus(this.t('status_ready'), 'success');

        } catch (error) {
            console.error('Error loading PDF:', error);
            this._hideLoading();

            if (error.message?.includes('password')) {
                this._showStatus(this.t('error_encrypted'), 'error');
            } else {
                this._showStatus(this.t('error_invalid_pdf'), 'error');
            }
        }
    },

    /**
     * Switch active tab
     */
    _switchTab(tabId) {
        this.currentTab = tabId;

        // Update tab buttons
        this.elements.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Update tab contents
        this.elements.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });

        // Special handling for pages tab
        if (tabId === 'pages') {
            this._renderPageGrid();
        }
    },

    /**
     * Switch signature sub-tab
     */
    _switchSignatureTab(tabId) {
        this.elements.sigTabs.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sigTab === tabId);
        });

        this.elements.sigContents.forEach(content => {
            content.classList.toggle('active', content.id === `sig-${tabId}`);
        });
    },

    /**
     * Page navigation
     */
    async _prevPage() {
        this._resetTextEditingState();
        PDFEditor.savePageAnnotations(PDFViewer.currentPage);
        await PDFViewer.prevPage();
        PDFEditor.loadPageAnnotations(PDFViewer.currentPage);
    },

    async _nextPage() {
        this._resetTextEditingState();
        PDFEditor.savePageAnnotations(PDFViewer.currentPage);
        await PDFViewer.nextPage();
        PDFEditor.loadPageAnnotations(PDFViewer.currentPage);
    },

    async _goToPage(pageNum) {
        this._resetTextEditingState();
        PDFEditor.savePageAnnotations(PDFViewer.currentPage);
        await PDFViewer.goToPage(pageNum);
        PDFEditor.loadPageAnnotations(PDFViewer.currentPage);
    },

    /**
     * Reset text editing state
     */
    _resetTextEditingState() {
        if (this.isTextEditingEnabled) {
            PDFEditor.disableTextEditing();
            this.isTextEditingEnabled = false;
            const editTextBtn = document.getElementById('editTextBtn');
            if (editTextBtn) {
                editTextBtn.classList.remove('active');
            }
        }
    },

    async _zoomIn() {
        await PDFViewer.zoomIn();
        this._updateZoomDisplay();
    },

    async _zoomOut() {
        await PDFViewer.zoomOut();
        this._updateZoomDisplay();
    },

    /**
     * Update page navigation UI
     */
    _updatePageNav(page, total) {
        if (this.elements.pageInput) {
            this.elements.pageInput.value = page;
            this.elements.pageInput.max = total;
        }
        if (this.elements.pageTotal) {
            this.elements.pageTotal.textContent = total;
        }
        if (this.elements.prevPageBtn) {
            this.elements.prevPageBtn.disabled = page <= 1;
        }
        if (this.elements.nextPageBtn) {
            this.elements.nextPageBtn.disabled = page >= total;
        }
    },

    _updateZoomDisplay() {
        if (this.elements.zoomLevel) {
            this.elements.zoomLevel.textContent = Math.round(PDFViewer.scale * 100) + '%';
        }
    },

    /**
     * Called when page is rendered
     */
    _onPageRendered(info) {
        // Resize editor canvas to match
        PDFEditor.setDimensions(info.width, info.height);
        this._updateZoomDisplay();
    },

    /**
     * Set editor tool
     */
    _setTool(tool) {
        PDFEditor.setTool(tool);

        // Update UI
        this.elements.toolBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });

        // Show/hide tool options
        const showOptions = ['text', 'highlight', 'rectangle', 'circle', 'line', 'freehand'].includes(tool);
        if (this.elements.toolOptions) {
            this.elements.toolOptions.classList.toggle('active', showOptions);
        }
    },

    /**
     * Undo/Redo
     */
    _undo() {
        PDFEditor.undo();
    },

    _redo() {
        PDFEditor.redo();
    },

    _updateHistoryButtons(state) {
        if (this.elements.undoBtn) {
            this.elements.undoBtn.disabled = !state.canUndo;
        }
        if (this.elements.redoBtn) {
            this.elements.redoBtn.disabled = !state.canRedo;
        }
    },

    /**
     * Toggle text formatting (bold, italic, underline)
     * @param {string} format - Format type ('bold', 'italic', 'underline')
     */
    _toggleTextFormat(format) {
        const activeObject = PDFEditor.fabricCanvas?.getActiveObject();

        if (!activeObject || (activeObject.type !== 'i-text' && activeObject.type !== 'textbox')) {
            this._showStatus('Vyberte text pro formátování', 'warning');
            return;
        }

        let newValue;
        switch (format) {
            case 'bold':
                newValue = activeObject.fontWeight === 'bold' ? 'normal' : 'bold';
                activeObject.set('fontWeight', newValue);
                this.elements.boldBtn?.classList.toggle('active', newValue === 'bold');
                break;
            case 'italic':
                newValue = activeObject.fontStyle === 'italic' ? 'normal' : 'italic';
                activeObject.set('fontStyle', newValue);
                this.elements.italicBtn?.classList.toggle('active', newValue === 'italic');
                break;
            case 'underline':
                newValue = !activeObject.underline;
                activeObject.set('underline', newValue);
                this.elements.underlineBtn?.classList.toggle('active', newValue);
                break;
        }

        PDFEditor.fabricCanvas.renderAll();
        PDFEditor._saveToHistory();
    },

    /**
     * Apply text format property
     * @param {string} property - Property name ('fontFamily', 'fontSize')
     * @param {any} value - Value to set
     */
    _applyTextFormat(property, value) {
        const activeObject = PDFEditor.fabricCanvas?.getActiveObject();

        if (!activeObject || (activeObject.type !== 'i-text' && activeObject.type !== 'textbox')) {
            // Aktualizovat default nastavení pro nový text
            PDFEditor.updateSettings({
                [property === 'fontFamily' ? 'fontFamily' : 'textSize']: value
            });
            return;
        }

        activeObject.set(property, value);
        PDFEditor.fabricCanvas.renderAll();
        PDFEditor._saveToHistory();
    },

    /**
     * Update format buttons state based on selected object
     */
    _updateFormatButtonsState() {
        const activeObject = PDFEditor.fabricCanvas?.getActiveObject();

        if (!activeObject || (activeObject.type !== 'i-text' && activeObject.type !== 'textbox')) {
            // Reset all buttons
            this.elements.boldBtn?.classList.remove('active');
            this.elements.italicBtn?.classList.remove('active');
            this.elements.underlineBtn?.classList.remove('active');
            return;
        }

        // Update button states
        this.elements.boldBtn?.classList.toggle('active', activeObject.fontWeight === 'bold');
        this.elements.italicBtn?.classList.toggle('active', activeObject.fontStyle === 'italic');
        this.elements.underlineBtn?.classList.toggle('active', activeObject.underline === true);

        // Update font family select
        if (this.elements.fontFamily && activeObject.fontFamily) {
            this.elements.fontFamily.value = activeObject.fontFamily;
        }

        // Update font size
        if (this.elements.textSize && activeObject.fontSize) {
            this.elements.textSize.value = activeObject.fontSize;
        }
    },

    // Text editing state
    isTextEditingEnabled: false,

    /**
     * Toggle text editing mode
     */
    async _toggleTextEditing() {
        if (!PDFViewer.pdfDoc) {
            this._showStatus('Please load a PDF first', 'warning');
            return;
        }

        const editTextBtn = document.getElementById('editTextBtn');

        if (this.isTextEditingEnabled) {
            // Disable text editing
            PDFEditor.disableTextEditing();
            this.isTextEditingEnabled = false;
            if (editTextBtn) {
                editTextBtn.classList.remove('active');
            }
            this._showStatus('Text editing disabled', 'success');
        } else {
            // Enable text editing
            this._showLoading('Extracting text...');

            try {
                const page = await PDFViewer.pdfDoc.getPage(PDFViewer.currentPage);
                await PDFEditor.enableTextEditing(page, PDFViewer.scale);
                this.isTextEditingEnabled = true;

                if (editTextBtn) {
                    editTextBtn.classList.add('active');
                }

                this._showStatus('Text editing enabled - click text to edit', 'success');
            } catch (error) {
                console.error('Error enabling text editing:', error);
                this._showStatus('Error extracting text', 'error');
            }

            this._hideLoading();
        }
    },

    /**
     * Signature handling
     */
    async _handleSignatureUpload(file) {
        try {
            const dataUrl = await PDFSigner.processUploadedImage(file);

            if (this.elements.sigUploadPreview) {
                this.elements.sigUploadPreview.innerHTML = '';
                this.elements.sigUploadPreview.appendChild(PDFSigner.createPreviewElement(dataUrl));
                this.elements.sigUploadPreview.classList.add('active');
            }
        } catch (error) {
            this._showStatus(error.message, 'error');
        }
    },

    _selectSignatureFont(font) {
        PDFSigner.settings.font = font;

        // Update UI
        this.elements.fontSelector?.querySelectorAll('.font-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.font === font);
        });

        this._updateTextSignaturePreview();
    },

    _updateTextSignaturePreview() {
        const text = this.elements.sigTextInput?.value || '';
        if (!text) return;

        const dataUrl = PDFSigner.createTextSignature(text);

        if (this.elements.sigTextPreview) {
            this.elements.sigTextPreview.innerHTML = '';
            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.maxHeight = '60px';
            this.elements.sigTextPreview.appendChild(img);
        }
    },

    async _addSignatureToPage() {
        const sigData = PDFSigner.getSignatureData();
        if (!sigData) {
            this._showStatus('No signature to add', 'warning');
            return;
        }

        // Add signature image to editor canvas
        await PDFEditor.addImage(sigData, {
            x: 100,
            y: 100,
            scale: 0.5
        });

        // Switch to editor tab
        this._switchTab('editor');
        this._setTool('select');
    },

    async _saveCurrentSignature() {
        try {
            await PDFSigner.saveSignature('My Signature');
            await this._loadSavedSignatures();
            this._showStatus('Signature saved', 'success');
        } catch (error) {
            this._showStatus(error.message, 'error');
        }
    },

    async _loadSavedSignatures() {
        const signatures = await PDFSigner.loadSavedSignatures();

        if (this.elements.savedSignatures) {
            this.elements.savedSignatures.innerHTML = '';

            signatures.forEach(sig => {
                const item = document.createElement('div');
                item.className = 'saved-signature-item';
                item.innerHTML = `
                    <img src="${sig.data}" alt="${sig.name}" style="max-height: 40px;">
                    <button class="use-sig" data-id="${sig.id}">Use</button>
                    <button class="delete-sig" data-id="${sig.id}">×</button>
                `;

                item.querySelector('.use-sig').addEventListener('click', () => {
                    PDFSigner.setFromSaved(sig);
                    this._addSignatureToPage();
                });

                item.querySelector('.delete-sig').addEventListener('click', async () => {
                    await PDFSigner.deleteSavedSignature(sig.id);
                    await this._loadSavedSignatures();
                });

                this.elements.savedSignatures.appendChild(item);
            });
        }
    },

    /**
     * Compression handling
     */
    _selectCompressionLevel(level) {
        PDFCompress.setLevel(level);

        this.elements.compressOptions.forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.level === level);
        });
    },

    async _compressPDF() {
        if (!this.currentFileData || this.isProcessing) return;

        this.isProcessing = true;
        this._showProgress();

        try {
            const result = await PDFCompress.compress(this.currentFileData);

            // Update current file data
            this.currentFileData = result.data;

            // Auto-download compressed PDF
            const blob = new Blob([result.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const fileName = this.currentFile?.name?.replace('.pdf', '_compressed.pdf') || 'compressed.pdf';

            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Show result
            this._showStatus(
                `Compressed: ${PDFCompress.formatSize(result.originalSize)} → ${PDFCompress.formatSize(result.compressedSize)} (${result.reduction}% saved)`,
                'success'
            );

        } catch (error) {
            console.error('Compression error:', error);
            this._showStatus(this.t('error_processing'), 'error');
        }

        this._hideProgress();
        this.isProcessing = false;
    },

    /**
     * Page management
     */
    async _renderPageGrid() {
        if (!this.elements.pageGrid) return;

        this.elements.pageGrid.innerHTML = '';

        const pageInfo = await PDFPages.getPageInfo();

        for (const page of pageInfo) {
            const thumb = document.createElement('div');
            thumb.className = 'page-thumb';
            thumb.dataset.index = page.displayIndex;
            thumb.draggable = true;

            thumb.innerHTML = `
                <span class="page-thumb-number">${page.displayIndex + 1}</span>
                <canvas class="page-thumb-canvas" id="thumb-${page.originalIndex}"></canvas>
                <div class="page-thumb-actions">
                    <button class="page-thumb-btn rotate" title="Rotate">↻</button>
                    <button class="page-thumb-btn delete" title="Delete">×</button>
                </div>
            `;

            // Render thumbnail
            const canvas = thumb.querySelector('canvas');
            await PDFPages.renderThumbnail(page.originalIndex, canvas);

            // Selection
            thumb.addEventListener('click', (e) => {
                if (e.target.closest('.page-thumb-btn')) return;
                thumb.classList.toggle('selected');
            });

            // Rotate button
            thumb.querySelector('.rotate').addEventListener('click', () => {
                PDFPages.rotatePage(page.displayIndex);
                this._renderPageGrid();
            });

            // Delete button
            thumb.querySelector('.delete').addEventListener('click', () => {
                PDFPages.deletePage(page.displayIndex);
                this._renderPageGrid();
            });

            // Drag and drop
            thumb.addEventListener('dragstart', (e) => {
                thumb.classList.add('dragging');
                e.dataTransfer.setData('text/plain', page.displayIndex);
            });

            thumb.addEventListener('dragend', () => {
                thumb.classList.remove('dragging');
            });

            thumb.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            thumb.addEventListener('drop', (e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = page.displayIndex;
                PDFPages.movePage(fromIndex, toIndex);
                this._renderPageGrid();
            });

            this.elements.pageGrid.appendChild(thumb);
        }
    },

    _deleteSelectedPages() {
        const selected = this.elements.pageGrid?.querySelectorAll('.page-thumb.selected');
        if (!selected || selected.length === 0) return;

        const indices = Array.from(selected).map(el => parseInt(el.dataset.index));
        PDFPages.deletePages(indices);
        this._renderPageGrid();
    },

    _rotateSelectedPages() {
        const selected = this.elements.pageGrid?.querySelectorAll('.page-thumb.selected');
        if (!selected || selected.length === 0) {
            // Rotate all if none selected
            PDFPages.rotateAllPages();
        } else {
            selected.forEach(el => {
                PDFPages.rotatePage(parseInt(el.dataset.index));
            });
        }
        this._renderPageGrid();
    },

    _resetPages() {
        PDFPages.reset();
        this._renderPageGrid();
    },

    async _applyPageChanges() {
        if (!PDFPages.hasChanges() || this.isProcessing) return;

        this.isProcessing = true;
        this._showProgress();

        try {
            this.currentFileData = await PDFPages.applyChanges();

            // Reload viewer with new data
            await PDFViewer.loadPDF(this.currentFileData);
            await PDFPages.init(this.currentFileData);

            this._renderPageGrid();
            this._showStatus('Changes applied', 'success');

        } catch (error) {
            this._showStatus(this.t('error_processing'), 'error');
        }

        this._hideProgress();
        this.isProcessing = false;
    },

    /**
     * Download PDF with all changes
     */
    async _downloadPDF() {
        if (!this.currentFileData || this.isProcessing) return;

        this.isProcessing = true;
        this._showLoading('Preparing PDF...');

        try {
            // Get editor annotations
            const annotations = PDFEditor.getAllAnnotations();

            // Apply annotations to PDF
            let pdfData = this.currentFileData;

            if (Object.keys(annotations).length > 0) {
                pdfData = await this._applyAnnotationsToPDF(pdfData, annotations);
            }

            // Create download
            const blob = new Blob([pdfData], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const fileName = this.currentFile?.name?.replace('.pdf', '_edited.pdf') || 'edited.pdf';

            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);

            this._showStatus('PDF downloaded', 'success');

        } catch (error) {
            console.error('Download error:', error);
            this._showStatus(this.t('error_processing'), 'error');
        }

        this._hideLoading();
        this.isProcessing = false;
    },

    /**
     * Apply Fabric.js annotations to PDF
     * OPRAVENO: Podpora Unicode znaků a filtrování background bloků
     */
    async _applyAnnotationsToPDF(pdfData, annotations) {
        const { PDFDocument, rgb } = PDFLib;
        const pdfDoc = await PDFDocument.load(pdfData);

        // Načíst Unicode font pro podporu českých znaků
        let unicodeFont = null;
        let unicodeFontBold = null;

        try {
            // Načíst Roboto font z Google Fonts CDN (podporuje Unicode)
            const fontUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf';
            const fontBoldUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf';

            const [fontBytes, fontBoldBytes] = await Promise.all([
                fetch(fontUrl).then(r => r.arrayBuffer()),
                fetch(fontBoldUrl).then(r => r.arrayBuffer())
            ]);

            unicodeFont = await pdfDoc.embedFont(fontBytes);
            unicodeFontBold = await pdfDoc.embedFont(fontBoldBytes);
            console.log('Unicode fonts loaded successfully');
        } catch (e) {
            console.warn('Could not load Unicode font, falling back to Helvetica:', e);
        }

        for (const [pageNum, pageAnnotations] of Object.entries(annotations)) {
            if (!pageAnnotations || !pageAnnotations.objects) continue;

            const page = pdfDoc.getPage(parseInt(pageNum) - 1);
            const { height: pageHeight } = page.getSize();
            const scale = PDFViewer.scale;

            for (const obj of pageAnnotations.objects) {
                // OPRAVENO: Přeskočit background bloky z text editingu
                if (obj._isTextBackground) {
                    continue;
                }

                // Convert coordinates (Fabric -> PDF)
                const coords = PDFEditor.toPDFCoordinates(obj, pageHeight, scale);

                switch (obj.type) {
                    case 'i-text':
                    case 'textbox':
                    case 'text':
                        const textContent = obj.text || '';
                        if (!textContent.trim()) break;

                        const isBold = obj.fontWeight === 'bold' || obj.fontWeight >= 700;
                        const fontSize = (obj.fontSize * obj.scaleY) / scale;

                        // Použít Unicode font pokud je dostupný, jinak fallback
                        let font;
                        if (unicodeFont) {
                            font = isBold && unicodeFontBold ? unicodeFontBold : unicodeFont;
                        } else {
                            // Fallback na Helvetica - odstranit problematické znaky
                            let fontName = 'Helvetica';
                            if (isBold) {
                                fontName = 'Helvetica-Bold';
                            }
                            font = await pdfDoc.embedFont(fontName);
                        }

                        try {
                            page.drawText(textContent, {
                                x: coords.x,
                                y: coords.y,
                                size: fontSize,
                                font: font,
                                color: this._hexToRgb(obj.fill || '#000000')
                            });
                        } catch (encodeError) {
                            // Pokud stále selže, zkusit odstranit problematické znaky
                            console.warn('Text encoding error, trying fallback:', encodeError);
                            const safeText = this._sanitizeTextForPDF(textContent);
                            const fallbackFont = await pdfDoc.embedFont('Helvetica');
                            page.drawText(safeText, {
                                x: coords.x,
                                y: coords.y,
                                size: fontSize,
                                font: fallbackFont,
                                color: this._hexToRgb(obj.fill || '#000000')
                            });
                        }
                        break;

                    case 'rect':
                        // OPRAVENO: Přeskočit bílé pozadí bloky
                        if (obj.fill === 'rgba(255, 255, 255, 0.9)' || obj._isTextBackground) {
                            continue;
                        }
                        page.drawRectangle({
                            x: coords.x,
                            y: coords.y,
                            width: coords.width,
                            height: coords.height,
                            color: obj.fill ? this._hexToRgb(obj.fill) : undefined,
                            borderColor: obj.stroke ? this._hexToRgb(obj.stroke) : undefined,
                            borderWidth: obj.strokeWidth / scale
                        });
                        break;

                    case 'circle':
                        page.drawEllipse({
                            x: coords.x + coords.width / 2,
                            y: coords.y + coords.height / 2,
                            xScale: coords.width / 2,
                            yScale: coords.height / 2,
                            color: obj.fill ? this._hexToRgb(obj.fill) : undefined,
                            borderColor: obj.stroke ? this._hexToRgb(obj.stroke) : undefined,
                            borderWidth: obj.strokeWidth / scale
                        });
                        break;

                    case 'line':
                        page.drawLine({
                            start: { x: obj.x1 / scale, y: pageHeight - obj.y1 / scale },
                            end: { x: obj.x2 / scale, y: pageHeight - obj.y2 / scale },
                            color: this._hexToRgb(obj.stroke),
                            thickness: obj.strokeWidth / scale
                        });
                        break;

                    case 'path':
                        // Freehand drawing - export as SVG path
                        if (obj.path) {
                            // Pro kreslení od ruky - exportovat jako obrázek
                            // nebo přeskočit pokud je to příliš složité
                        }
                        break;

                    case 'image':
                        if (obj.src) {
                            try {
                                const imgBytes = await fetch(obj.src).then(r => r.arrayBuffer());
                                let pdfImage;

                                if (obj.src.includes('png') || obj.src.startsWith('data:image/png')) {
                                    pdfImage = await pdfDoc.embedPng(imgBytes);
                                } else {
                                    pdfImage = await pdfDoc.embedJpg(imgBytes);
                                }

                                page.drawImage(pdfImage, {
                                    x: coords.x,
                                    y: coords.y,
                                    width: coords.width,
                                    height: coords.height
                                });
                            } catch (e) {
                                console.error('Failed to embed image:', e);
                            }
                        }
                        break;
                }
            }
        }

        return await pdfDoc.save();
    },

    /**
     * Sanitize text for PDF export (remove unsupported Unicode characters)
     * @param {string} text - Original text
     * @returns {string} - Sanitized text
     */
    _sanitizeTextForPDF(text) {
        // Mapování českých znaků na ASCII ekvivalenty
        const charMap = {
            'á': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e', 'í': 'i',
            'ň': 'n', 'ó': 'o', 'ř': 'r', 'š': 's', 'ť': 't', 'ú': 'u',
            'ů': 'u', 'ý': 'y', 'ž': 'z',
            'Á': 'A', 'Č': 'C', 'Ď': 'D', 'É': 'E', 'Ě': 'E', 'Í': 'I',
            'Ň': 'N', 'Ó': 'O', 'Ř': 'R', 'Š': 'S', 'Ť': 'T', 'Ú': 'U',
            'Ů': 'U', 'Ý': 'Y', 'Ž': 'Z'
        };

        return text.split('').map(char => charMap[char] || char).join('');
    },

    /**
     * Convert hex color to PDF-lib rgb
     */
    _hexToRgb(hex) {
        if (!hex || hex === 'transparent') return undefined;

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return PDFLib.rgb(
                parseInt(result[1], 16) / 255,
                parseInt(result[2], 16) / 255,
                parseInt(result[3], 16) / 255
            );
        }

        // Handle rgba
        const rgbaMatch = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbaMatch) {
            return PDFLib.rgb(
                parseInt(rgbaMatch[1]) / 255,
                parseInt(rgbaMatch[2]) / 255,
                parseInt(rgbaMatch[3]) / 255
            );
        }

        return undefined;
    },

    /**
     * New file - reset everything
     */
    _newFile() {
        // Cleanup
        PDFViewer.close();
        PDFEditor.dispose();
        PDFPages.dispose();

        // Reset state
        this.currentFile = null;
        this.currentFileData = null;

        // Reset UI
        this._hideWorkspace();

        // Clear file input
        if (this.elements.fileInput) {
            this.elements.fileInput.value = '';
        }
    },

    /**
     * UI helpers
     */
    _showWorkspace() {
        if (this.elements.dropZone) {
            this.elements.dropZone.style.display = 'none';
        }
        if (this.elements.workspace) {
            this.elements.workspace.classList.add('active');
        }
    },

    _hideWorkspace() {
        if (this.elements.dropZone) {
            this.elements.dropZone.style.display = 'block';
        }
        if (this.elements.workspace) {
            this.elements.workspace.classList.remove('active');
        }
    },

    _updateFileInfo(file, info) {
        if (this.elements.fileInfoBar) {
            const nameEl = this.elements.fileInfoBar.querySelector('.file-name');
            const metaEl = this.elements.fileInfoBar.querySelector('.file-meta');

            if (nameEl) nameEl.textContent = file.name;
            if (metaEl) {
                metaEl.textContent = `${info.numPages} ${this.t('pages_count')} · ${PDFCompress.formatSize(file.size)}`;
            }
        }
    },

    _showLoading(text) {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('active');
        }
        if (this.elements.loadingText) {
            this.elements.loadingText.textContent = text || this.t('loading');
        }
    },

    _hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.remove('active');
        }
    },

    _showProgress() {
        if (this.elements.progressContainer) {
            this.elements.progressContainer.classList.add('active');
        }
    },

    _hideProgress() {
        if (this.elements.progressContainer) {
            this.elements.progressContainer.classList.remove('active');
        }
    },

    _updateProgress(progress) {
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = progress.percent + '%';
        }
        if (this.elements.progressText) {
            this.elements.progressText.textContent = progress.message;
        }
    },

    _showStatus(message, type = '') {
        if (this.elements.status) {
            this.elements.status.textContent = message;
            this.elements.status.className = 'status ' + type;
        }
    },

    /**
     * Save to recent files
     */
    async _saveToRecent(file, info) {
        try {
            // Create thumbnail
            let thumbnail = null;
            if (this.elements.pdfCanvas) {
                const thumbCanvas = document.createElement('canvas');
                thumbCanvas.width = 100;
                thumbCanvas.height = 140;
                const ctx = thumbCanvas.getContext('2d');
                ctx.drawImage(this.elements.pdfCanvas, 0, 0, 100, 140);
                thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.5);
            }

            await PDFStorage.saveRecentFile({
                name: file.name,
                size: file.size,
                pageCount: info.numPages,
                thumbnail: thumbnail
            });
        } catch (error) {
            console.error('Failed to save to recent:', error);
        }
    },

    /**
     * Keyboard shortcuts
     */
    _handleKeyDown(e) {
        // Global shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this._downloadPDF();
                    break;
                case 'o':
                    e.preventDefault();
                    this.elements.fileInput?.click();
                    break;
            }
        }
    },

    /**
     * Translation helpers
     */
    t(key) {
        return this.translations[this.currentLang]?.[key] ||
               this.translations['cs'][key] ||
               key;
    },

    _setLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('pdfeditor_lang', lang);

        this.elements.langBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        this._updateTranslations();
    },

    _updateTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.t(key);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    PDFEditorApp.init();
});

// Export for use
window.PDFEditorApp = PDFEditorApp;
