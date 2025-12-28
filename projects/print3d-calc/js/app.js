/**
 * Main Application Module
 * Handles UI interactions and orchestrates other modules
 */

const App = {
    currentFile: null,
    currentResult: null,

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Initialize database
            await DB.init();
            await DB.ensureDefaults();

            // Initialize i18n
            I18N.init();

            // Initialize STL viewer
            STLParser.initViewer('preview3d');

            // Setup event listeners
            this.setupEventListeners();

            // Load UI data
            await this.loadPrinters();
            await this.loadMaterials();
            await this.loadSettings();
            await this.loadHistory();

            console.log('App initialized successfully');
        } catch (error) {
            console.error('App initialization error:', error);
            this.showToast(I18N.t('msg_error'), 'error');
        }
    },

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // File upload with improved drag & drop
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        dropZone.addEventListener('click', () => fileInput.click());

        // Prevent default drag behaviors on document to enable drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.body.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        // Highlight drop zone when dragging over
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('dragover');
            }, false);
        });

        // Handle file drop
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        }, false);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFileUpload(file);
        });

        // Remove file
        document.getElementById('removeFileBtn').addEventListener('click', () => this.removeFile());

        // Reset view
        document.getElementById('resetViewBtn').addEventListener('click', () => STLParser.resetView());

        // Infill slider
        const infillSlider = document.getElementById('infillSlider');
        infillSlider.addEventListener('input', () => {
            document.getElementById('infillValue').textContent = infillSlider.value + '%';
            this.updateModelInfo();
        });

        // Quantity controls
        const qtyInput = document.getElementById('quantityInput');
        document.getElementById('qtyMinus').addEventListener('click', () => {
            const currentValue = parseInt(qtyInput.value) || 1;
            if (currentValue > 1) {
                qtyInput.value = currentValue - 1;
            }
        });
        document.getElementById('qtyPlus').addEventListener('click', () => {
            const currentValue = parseInt(qtyInput.value) || 1;
            qtyInput.value = currentValue + 1;
        });
        // Ensure quantity is always valid on change
        qtyInput.addEventListener('change', () => {
            let val = parseInt(qtyInput.value) || 1;
            if (val < 1) val = 1;
            if (val > 999) val = 999;
            qtyInput.value = val;
        });

        // Estimate time button
        document.getElementById('estimateTimeBtn').addEventListener('click', () => this.estimatePrintTime());

        // Calculate button
        document.getElementById('calculateBtn').addEventListener('click', () => this.calculate());

        // Result actions
        document.getElementById('saveQuoteBtn').addEventListener('click', () => this.saveQuote());
        document.getElementById('exportPdfBtn').addEventListener('click', () => this.exportPDF());
        document.getElementById('copyResultBtn').addEventListener('click', () => this.copyResult());

        // Settings - Printers
        document.getElementById('addPrinterBtn').addEventListener('click', () => this.openPrinterModal());
        document.getElementById('savePrinterBtn').addEventListener('click', () => this.savePrinter());
        document.getElementById('managePrintersBtn').addEventListener('click', () => {
            this.switchTab('settings');
            // Scroll to printer section
            setTimeout(() => {
                const printerSection = document.getElementById('printerList');
                if (printerSection) {
                    printerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        });

        // Settings - Materials
        document.getElementById('addMaterialBtn').addEventListener('click', () => this.openMaterialModal());
        document.getElementById('saveMaterialBtn').addEventListener('click', () => this.saveMaterial());

        // Settings - Data
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importDataBtn').addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });
        document.getElementById('importFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.importData(file);
        });
        document.getElementById('resetDataBtn').addEventListener('click', () => this.resetData());

        // Settings - Save on change
        ['electricityPrice', 'laborRate', 'maintenanceRate', 'failureRate', 'markupRate', 'currencySelect'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.saveSettings());
        });

        // History
        document.getElementById('clearHistoryBtn').addEventListener('click', () => this.clearHistory());

        // Modal close buttons
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.closeModal;
                this.closeModal(modalId);
            });
        });

        // Close modal on overlay click - but only if mousedown started on overlay
        // This prevents closing when dragging from input to outside
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            let mouseDownOnOverlay = false;

            overlay.addEventListener('mousedown', (e) => {
                mouseDownOnOverlay = (e.target === overlay);
            });

            overlay.addEventListener('mouseup', (e) => {
                if (mouseDownOnOverlay && e.target === overlay) {
                    overlay.classList.remove('active');
                }
                mouseDownOnOverlay = false;
            });
        });

        // Material select change
        document.getElementById('materialSelect').addEventListener('change', () => this.updateModelInfo());
    },

    /**
     * Switch tab
     */
    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === 'tab-' + tabId);
        });
    },

    /**
     * Handle file upload
     */
    async handleFileUpload(file) {
        if (!file.name.toLowerCase().endsWith('.stl')) {
            this.showToast(I18N.t('msg_invalid_file'), 'error');
            return;
        }

        try {
            this.currentFile = file;

            // Show preview container
            document.getElementById('dropZone').style.display = 'none';
            document.getElementById('previewContainer').style.display = 'block';
            document.getElementById('modelInfo').style.display = 'block';
            document.getElementById('fileName').textContent = file.name;

            // Refresh viewer now that container is visible
            STLParser.refreshViewer();

            // Load and parse STL
            await STLParser.loadSTL(file);

            // Update model info
            this.updateModelInfo();

            // Estimate print time
            this.estimatePrintTime();

        } catch (error) {
            console.error('File upload error:', error);
            this.showToast(I18N.t('msg_invalid_file'), 'error');
            this.removeFile();
        }
    },

    /**
     * Remove current file
     */
    removeFile() {
        this.currentFile = null;
        STLParser.clear();

        document.getElementById('dropZone').style.display = 'block';
        document.getElementById('previewContainer').style.display = 'none';
        document.getElementById('modelInfo').style.display = 'none';
        document.getElementById('resultsPanel').style.display = 'none';
        document.getElementById('fileInput').value = '';
    },

    /**
     * Update model info display
     */
    async updateModelInfo() {
        if (!this.currentFile) return;

        const materialSelect = document.getElementById('materialSelect');
        const materialId = materialSelect.value;
        const material = await DB.getMaterial(materialId);

        const density = material?.density || 1.24;
        const infill = parseInt(document.getElementById('infillSlider').value);

        const data = STLParser.getFormattedData(density, infill);

        document.getElementById('infoVolume').textContent = data.volume;
        document.getElementById('infoWeight').textContent = data.weight;
        document.getElementById('infoDimensions').textContent = data.dimensions;
        document.getElementById('infoTriangles').textContent = data.triangles;
    },

    /**
     * Estimate print time
     */
    estimatePrintTime() {
        if (!STLParser.modelData.volume) return;

        const infill = parseInt(document.getElementById('infillSlider').value);
        const hours = STLParser.estimatePrintTime(infill);

        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);

        document.getElementById('printTimeHours').value = wholeHours;
        document.getElementById('printTimeMinutes').value = minutes;
    },

    /**
     * Calculate price
     */
    async calculate() {
        if (!this.currentFile) {
            this.showToast(I18N.t('msg_no_file'), 'warning');
            return;
        }

        try {
            const materialId = document.getElementById('materialSelect').value;
            const printerId = document.getElementById('printerSelect').value;

            const material = await DB.getMaterial(materialId) || DB.defaultMaterials[0];
            const printer = await DB.getPrinter(printerId) || DB.defaultPrinters[0];

            const hours = parseInt(document.getElementById('printTimeHours').value) || 0;
            const minutes = parseInt(document.getElementById('printTimeMinutes').value) || 0;
            const printTimeHours = hours + (minutes / 60);

            const infill = parseInt(document.getElementById('infillSlider').value);

            // Calculate weight with infill
            STLParser.calculateWeight(material.density, infill);

            const result = await PricingEngine.calculate({
                volume: STLParser.modelData.volume,
                weight: STLParser.modelData.weight,
                printTimeHours,
                laborTimeHours: parseFloat(document.getElementById('laborTime').value) || 0.5,
                quantity: parseInt(document.getElementById('quantityInput').value) || 1,
                material,
                printer,
                urgencyFactor: parseFloat(document.getElementById('urgencySelect').value) || 1,
                infillPercent: infill
            });

            this.currentResult = result;
            this.displayResult(result);

        } catch (error) {
            console.error('Calculation error:', error);
            this.showToast(I18N.t('msg_error'), 'error');
        }
    },

    /**
     * Display calculation result
     */
    displayResult(result) {
        const panel = document.getElementById('resultsPanel');
        panel.style.display = 'block';

        // Breakdown
        const breakdownList = document.getElementById('breakdownList');
        const breakdownItems = [
            ['cost_material', result.formatted.breakdown.material],
            ['cost_electricity', result.formatted.breakdown.electricity],
            ['cost_depreciation', result.formatted.breakdown.depreciation],
            ['cost_maintenance', result.formatted.breakdown.maintenance],
            ['cost_labor', result.formatted.breakdown.labor],
            ['cost_risk', result.formatted.breakdown.risk],
            ['cost_profit', result.formatted.breakdown.profit]
        ];

        breakdownList.innerHTML = breakdownItems.map(([key, value]) => `
            <div class="breakdown-item">
                <span class="breakdown-label">${I18N.t(key)}</span>
                <span class="breakdown-value">${value}</span>
            </div>
        `).join('');

        // Totals
        document.getElementById('pricePerPiece').textContent = result.formatted.pricePerPiece;
        document.getElementById('totalQuantity').textContent = result.quantity;
        document.getElementById('grandTotal').textContent = result.formatted.totalPrice;

        // Scroll to results
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Save quote to history
     */
    async saveQuote() {
        if (!this.currentResult) return;

        await DB.addToHistory({
            fileName: this.currentFile?.name || 'Unknown',
            result: this.currentResult
        });

        this.showToast(I18N.t('msg_saved'), 'success');
        await this.loadHistory();
    },

    /**
     * Export as PDF
     */
    exportPDF() {
        if (!this.currentResult) return;

        const html = PricingEngine.generateQuoteHTML(this.currentResult);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'quote_' + new Date().toISOString().split('T')[0] + '.html';
        a.click();

        URL.revokeObjectURL(url);
    },

    /**
     * Copy result to clipboard
     */
    async copyResult() {
        if (!this.currentResult) return;

        const summary = PricingEngine.generateQuoteSummary(this.currentResult);

        try {
            await navigator.clipboard.writeText(summary);
            this.showToast(I18N.t('msg_copied'), 'success');
        } catch {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = summary;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast(I18N.t('msg_copied'), 'success');
        }
    },

    /**
     * Load printers into UI
     */
    async loadPrinters() {
        const printers = await DB.getPrinters();

        // Update select
        const select = document.getElementById('printerSelect');
        select.innerHTML = printers.map(p => `
            <option value="${p.id}">${p.name}</option>
        `).join('');

        // Update settings list
        const list = document.getElementById('printerList');
        list.innerHTML = printers.map(p => `
            <div class="list-item">
                <div class="list-item-info">
                    <span class="list-item-name">${this.escapeHtml(p.name)}</span>
                    <span class="list-item-meta">${p.power}W | ${p.bedX}x${p.bedY}x${p.bedZ}mm</span>
                </div>
                <div class="list-item-actions">
                    <button class="btn-icon" onclick="App.editPrinter('${this.escapeHtml(p.id)}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="App.deletePrinter('${this.escapeHtml(p.id)}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    },

    /**
     * Load materials into UI
     */
    async loadMaterials() {
        const materials = await DB.getMaterials();

        // Update select
        const select = document.getElementById('materialSelect');
        select.innerHTML = materials.map(m => `
            <option value="${m.id}">${m.name}</option>
        `).join('');

        // Update settings list
        const list = document.getElementById('materialList');
        list.innerHTML = materials.map(m => `
            <div class="list-item">
                <div class="list-item-info" style="display: flex; align-items: center; gap: 10px;">
                    <span style="width: 20px; height: 20px; background: ${this.escapeHtml(m.color || '#808080')}; border-radius: 4px;"></span>
                    <div>
                        <span class="list-item-name">${this.escapeHtml(m.name)}</span>
                        <span class="list-item-meta">${m.density} g/cm³ | ${m.pricePerKg} Kč/kg | ${m.tempNozzle || 200}°C</span>
                    </div>
                </div>
                <div class="list-item-actions">
                    <button class="btn-icon" onclick="App.editMaterial('${this.escapeHtml(m.id)}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="App.deleteMaterial('${this.escapeHtml(m.id)}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    },

    /**
     * Load settings into UI
     */
    async loadSettings() {
        const settings = await DB.getSettings();

        document.getElementById('electricityPrice').value = settings.electricityPrice || 7;
        document.getElementById('laborRate').value = settings.laborRate || 300;
        document.getElementById('maintenanceRate').value = settings.maintenanceRate || 2;
        document.getElementById('failureRate').value = settings.failureRate || 5;
        document.getElementById('markupRate').value = settings.markupRate || 30;
        document.getElementById('currencySelect').value = settings.currency || 'CZK';
    },

    /**
     * Save settings
     */
    async saveSettings() {
        await DB.setSetting('electricityPrice', parseFloat(document.getElementById('electricityPrice').value));
        await DB.setSetting('laborRate', parseFloat(document.getElementById('laborRate').value));
        await DB.setSetting('maintenanceRate', parseFloat(document.getElementById('maintenanceRate').value));
        await DB.setSetting('failureRate', parseFloat(document.getElementById('failureRate').value));
        await DB.setSetting('markupRate', parseFloat(document.getElementById('markupRate').value));
        await DB.setSetting('currency', document.getElementById('currencySelect').value);
    },

    /**
     * Load history into UI
     */
    async loadHistory() {
        const history = await DB.getHistory();
        const list = document.getElementById('historyList');
        const empty = document.getElementById('emptyHistory');

        if (history.length === 0) {
            empty.style.display = 'block';
            list.innerHTML = '';
            list.appendChild(empty);
            return;
        }

        empty.style.display = 'none';
        list.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="history-item-info">
                    <span class="history-item-name">${item.fileName}</span>
                    <span class="history-item-date">${new Date(item.date).toLocaleString()}</span>
                </div>
                <span class="history-item-price">${item.result.formatted.totalPrice}</span>
            </div>
        `).join('');
    },

    /**
     * Clear history
     */
    async clearHistory() {
        if (!confirm('Opravdu smazat celou historii?')) return;

        await DB.clearHistory();
        await this.loadHistory();
        this.showToast(I18N.t('msg_deleted'), 'success');
    },

    // ========== Printer Modal ==========

    openPrinterModal(printer = null) {
        const modal = document.getElementById('printerModal');
        const title = document.getElementById('printerModalTitle');

        if (printer) {
            title.textContent = I18N.t('modal_edit_printer');
            document.getElementById('printerEditId').value = printer.id;
            document.getElementById('printerName').value = printer.name;
            document.getElementById('printerPower').value = printer.power;
            document.getElementById('printerCost').value = printer.cost;
            document.getElementById('printerLifetime').value = printer.lifetime;
            document.getElementById('printerBedX').value = printer.bedX;
            document.getElementById('printerBedY').value = printer.bedY;
            document.getElementById('printerBedZ').value = printer.bedZ;
        } else {
            title.textContent = I18N.t('modal_add_printer');
            document.getElementById('printerEditId').value = '';
            document.getElementById('printerName').value = '';
            document.getElementById('printerPower').value = 120;
            document.getElementById('printerCost').value = 20000;
            document.getElementById('printerLifetime').value = 5000;
            document.getElementById('printerBedX').value = 250;
            document.getElementById('printerBedY').value = 210;
            document.getElementById('printerBedZ').value = 210;
        }

        modal.classList.add('active');
    },

    async editPrinter(id) {
        const printer = await DB.getPrinter(id);
        if (printer) this.openPrinterModal(printer);
    },

    async savePrinter() {
        const id = document.getElementById('printerEditId').value;
        const printer = {
            id: id || 'printer_' + Date.now(),
            name: document.getElementById('printerName').value,
            power: parseInt(document.getElementById('printerPower').value),
            cost: parseInt(document.getElementById('printerCost').value),
            lifetime: parseInt(document.getElementById('printerLifetime').value),
            bedX: parseInt(document.getElementById('printerBedX').value),
            bedY: parseInt(document.getElementById('printerBedY').value),
            bedZ: parseInt(document.getElementById('printerBedZ').value)
        };

        await DB.savePrinter(printer);
        await this.loadPrinters();
        this.closeModal('printerModal');
        this.showToast(I18N.t('msg_saved'), 'success');
    },

    async deletePrinter(id) {
        if (!confirm('Smazat tiskárnu?')) return;
        await DB.deletePrinter(id);
        await this.loadPrinters();
        this.showToast(I18N.t('msg_deleted'), 'success');
    },

    // ========== Material Modal ==========

    openMaterialModal(material = null) {
        const modal = document.getElementById('materialModal');
        const title = document.getElementById('materialModalTitle');

        if (material) {
            title.textContent = I18N.t('modal_edit_material');
            document.getElementById('materialEditId').value = material.id;
            document.getElementById('materialName').value = material.name;
            document.getElementById('materialDensity').value = material.density;
            document.getElementById('materialPrice').value = material.pricePerKg;
            document.getElementById('materialColor').value = material.color || '#808080';
            document.getElementById('materialTempNozzle').value = material.tempNozzle || 200;
            document.getElementById('materialTempBed').value = material.tempBed || 60;
            document.getElementById('materialSpeed').value = material.printSpeed || 50;
        } else {
            title.textContent = I18N.t('modal_add_material');
            document.getElementById('materialEditId').value = '';
            document.getElementById('materialName').value = '';
            document.getElementById('materialDensity').value = 1.24;
            document.getElementById('materialPrice').value = 500;
            document.getElementById('materialColor').value = '#808080';
            document.getElementById('materialTempNozzle').value = 200;
            document.getElementById('materialTempBed').value = 60;
            document.getElementById('materialSpeed').value = 50;
        }

        modal.classList.add('active');
    },

    async editMaterial(id) {
        const material = await DB.getMaterial(id);
        if (material) this.openMaterialModal(material);
    },

    async saveMaterial() {
        const id = document.getElementById('materialEditId').value;
        const name = document.getElementById('materialName').value.trim();

        if (!name) {
            this.showToast(I18N.t('msg_error'), 'error');
            return;
        }

        const material = {
            id: id || 'material_' + Date.now(),
            name: name,
            density: parseFloat(document.getElementById('materialDensity').value) || 1.24,
            pricePerKg: parseInt(document.getElementById('materialPrice').value) || 500,
            color: document.getElementById('materialColor').value || '#808080',
            tempNozzle: parseInt(document.getElementById('materialTempNozzle').value) || 200,
            tempBed: parseInt(document.getElementById('materialTempBed').value) || 60,
            printSpeed: parseInt(document.getElementById('materialSpeed').value) || 50
        };

        await DB.saveMaterial(material);
        await this.loadMaterials();
        this.closeModal('materialModal');
        this.showToast(I18N.t('msg_saved'), 'success');
    },

    async deleteMaterial(id) {
        if (!confirm('Smazat materiál?')) return;
        await DB.deleteMaterial(id);
        await this.loadMaterials();
        this.showToast(I18N.t('msg_deleted'), 'success');
    },

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    // ========== Data Export/Import ==========

    async exportData() {
        const data = await DB.exportAll();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'print3d_data_' + new Date().toISOString().split('T')[0] + '.json';
        a.click();

        URL.revokeObjectURL(url);
        this.showToast(I18N.t('msg_exported'), 'success');
    },

    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            await DB.importAll(data);

            await this.loadPrinters();
            await this.loadMaterials();
            await this.loadSettings();
            await this.loadHistory();

            this.showToast(I18N.t('msg_imported'), 'success');
        } catch (error) {
            console.error('Import error:', error);
            this.showToast(I18N.t('msg_error'), 'error');
        }
    },

    async resetData() {
        if (!confirm('Opravdu resetovat všechna data na výchozí hodnoty?')) return;

        await DB.resetAll();
        await this.loadPrinters();
        await this.loadMaterials();
        await this.loadSettings();
        await this.loadHistory();

        this.showToast(I18N.t('msg_reset'), 'success');
    },

    // ========== Toast Notifications ==========

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span class="toast-message">${this.escapeHtml(message)}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(str) {
        if (typeof str !== 'string') return str;
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

// Export for global access
window.App = App;
