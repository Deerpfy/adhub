/**
 * Internationalization (i18n) Module
 * Supports Czech and English languages
 */

const I18N = {
    currentLang: 'cs',

    translations: {
        cs: {
            // Header
            title: '3D Print Calculator',
            subtitle: 'Kalkulace ceny 3D tisku - 100% offline',
            offline_ready: 'Offline připraven',

            // Tabs
            tab_calculator: 'Kalkulačka',
            tab_settings: 'Nastavení',
            tab_history: 'Historie',

            // Upload
            upload_title: 'Nahrát model',
            drop_title: 'Klikněte pro nahrání STL',
            drop_subtitle: 'nebo přetáhněte soubor',
            drop_hint: 'Podporované formáty: .stl (ASCII/Binary)',
            preview_hint: 'Otáčejte myší, scroll = zoom',

            // Model Info
            info_volume: 'Objem',
            info_weight: 'Váha',
            info_dimensions: 'Rozměry',
            info_triangles: 'Trojúhelníky',

            // Pricing Form
            pricing_title: 'Parametry tisku',
            label_printer: 'Tiskárna',
            printer_default: 'Výchozí tiskárna',
            manage_printers: 'Spravovat tiskárny',
            label_material: 'Materiál',
            material_custom: 'Vlastní...',
            label_infill: 'Výplň',
            label_quantity: 'Počet kusů',
            label_print_time: 'Čas tisku (hodiny)',
            estimate_time: 'Odhadnout čas',
            label_labor: 'Práce (příprava + post-processing)',
            label_urgency: 'Naléhavost',
            urgency_normal: 'Normální',
            urgency_fast: 'Rychlé (+25%)',
            urgency_express: 'Expresní (+50%)',
            urgency_hint: 'Příplatek za rychlejší dodání',
            calculate: 'Vypočítat cenu',

            // Results
            results_title: 'Výsledek kalkulace',
            breakdown_title: 'Rozpis nákladů',
            cost_material: 'Materiál',
            cost_electricity: 'Elektřina',
            cost_depreciation: 'Amortizace',
            cost_maintenance: 'Údržba',
            cost_labor: 'Práce',
            cost_risk: 'Riziko selhání',
            cost_profit: 'Marže',
            total_per_piece: 'Cena za kus',
            total_quantity: 'Celkem za',
            total_pieces: 'ks:',
            save_quote: 'Uložit nabídku',
            export_pdf: 'Export PDF',
            copy_result: 'Kopírovat',

            // Settings
            settings_printers: 'Profily tiskáren',
            add_printer: 'Přidat tiskárnu',
            settings_materials: 'Databáze materiálů',
            add_material: 'Přidat materiál',
            settings_pricing: 'Nastavení cen',
            setting_electricity: 'Cena elektřiny (Kč/kWh)',
            setting_labor_rate: 'Hodinová sazba (Kč/h)',
            setting_maintenance: 'Údržba za hodinu tisku (Kč/h)',
            setting_failure_rate: 'Míra selhání (%)',
            setting_markup: 'Marže (%)',
            setting_currency: 'Měna',
            settings_data: 'Správa dat',
            export_data: 'Exportovat data',
            import_data: 'Importovat data',
            reset_data: 'Resetovat vše',

            // History
            history_title: 'Historie kalkulací',
            clear_history: 'Smazat vše',
            history_empty: 'Žádná historie kalkulací',

            // Modals
            modal_add_printer: 'Přidat tiskárnu',
            modal_edit_printer: 'Upravit tiskárnu',
            printer_name: 'Název tiskárny',
            printer_power: 'Příkon (W)',
            printer_cost: 'Pořizovací cena',
            printer_lifetime: 'Životnost (hodiny)',
            printer_bed_size: 'Velikost podložky (mm)',
            modal_add_material: 'Přidat materiál',
            modal_edit_material: 'Upravit materiál',
            material_name: 'Název materiálu',
            material_density: 'Hustota (g/cm³)',
            material_price: 'Cena za kg',
            material_color: 'Barva (volitelně)',
            material_temp_nozzle: 'Teplota trysky (°C)',
            material_temp_bed: 'Teplota podložky (°C)',
            material_speed: 'Rychlost tisku (mm/s)',
            cancel: 'Zrušit',
            save: 'Uložit',

            // Messages
            msg_saved: 'Uloženo',
            msg_deleted: 'Smazáno',
            msg_copied: 'Zkopírováno do schránky',
            msg_exported: 'Data exportována',
            msg_imported: 'Data importována',
            msg_reset: 'Data resetována',
            msg_error: 'Nastala chyba',
            msg_no_file: 'Nahrajte nejprve STL soubor',
            msg_invalid_file: 'Neplatný STL soubor',

            // Footer
            footer_hint: '100% offline. Data se ukládají pouze v prohlížeči.'
        },

        en: {
            // Header
            title: '3D Print Calculator',
            subtitle: '3D printing cost calculation - 100% offline',
            offline_ready: 'Offline ready',

            // Tabs
            tab_calculator: 'Calculator',
            tab_settings: 'Settings',
            tab_history: 'History',

            // Upload
            upload_title: 'Upload model',
            drop_title: 'Click to upload STL',
            drop_subtitle: 'or drag and drop file',
            drop_hint: 'Supported formats: .stl (ASCII/Binary)',
            preview_hint: 'Rotate with mouse, scroll to zoom',

            // Model Info
            info_volume: 'Volume',
            info_weight: 'Weight',
            info_dimensions: 'Dimensions',
            info_triangles: 'Triangles',

            // Pricing Form
            pricing_title: 'Print parameters',
            label_printer: 'Printer',
            printer_default: 'Default printer',
            manage_printers: 'Manage printers',
            label_material: 'Material',
            material_custom: 'Custom...',
            label_infill: 'Infill',
            label_quantity: 'Quantity',
            label_print_time: 'Print time (hours)',
            estimate_time: 'Estimate time',
            label_labor: 'Labor (prep + post-processing)',
            label_urgency: 'Urgency',
            urgency_normal: 'Normal',
            urgency_fast: 'Fast (+25%)',
            urgency_express: 'Express (+50%)',
            urgency_hint: 'Extra charge for faster delivery',
            calculate: 'Calculate price',

            // Results
            results_title: 'Calculation result',
            breakdown_title: 'Cost breakdown',
            cost_material: 'Material',
            cost_electricity: 'Electricity',
            cost_depreciation: 'Depreciation',
            cost_maintenance: 'Maintenance',
            cost_labor: 'Labor',
            cost_risk: 'Failure risk',
            cost_profit: 'Profit margin',
            total_per_piece: 'Price per piece',
            total_quantity: 'Total for',
            total_pieces: 'pcs:',
            save_quote: 'Save quote',
            export_pdf: 'Export PDF',
            copy_result: 'Copy',

            // Settings
            settings_printers: 'Printer profiles',
            add_printer: 'Add printer',
            settings_materials: 'Material database',
            add_material: 'Add material',
            settings_pricing: 'Pricing settings',
            setting_electricity: 'Electricity price (per kWh)',
            setting_labor_rate: 'Hourly rate',
            setting_maintenance: 'Maintenance per print hour',
            setting_failure_rate: 'Failure rate (%)',
            setting_markup: 'Markup (%)',
            setting_currency: 'Currency',
            settings_data: 'Data management',
            export_data: 'Export data',
            import_data: 'Import data',
            reset_data: 'Reset all',

            // History
            history_title: 'Calculation history',
            clear_history: 'Clear all',
            history_empty: 'No calculation history',

            // Modals
            modal_add_printer: 'Add printer',
            modal_edit_printer: 'Edit printer',
            printer_name: 'Printer name',
            printer_power: 'Power consumption (W)',
            printer_cost: 'Purchase price',
            printer_lifetime: 'Lifetime (hours)',
            printer_bed_size: 'Bed size (mm)',
            modal_add_material: 'Add material',
            modal_edit_material: 'Edit material',
            material_name: 'Material name',
            material_density: 'Density (g/cm³)',
            material_price: 'Price per kg',
            material_color: 'Color (optional)',
            material_temp_nozzle: 'Nozzle temperature (°C)',
            material_temp_bed: 'Bed temperature (°C)',
            material_speed: 'Print speed (mm/s)',
            cancel: 'Cancel',
            save: 'Save',

            // Messages
            msg_saved: 'Saved',
            msg_deleted: 'Deleted',
            msg_copied: 'Copied to clipboard',
            msg_exported: 'Data exported',
            msg_imported: 'Data imported',
            msg_reset: 'Data reset',
            msg_error: 'An error occurred',
            msg_no_file: 'Please upload an STL file first',
            msg_invalid_file: 'Invalid STL file',

            // Footer
            footer_hint: '100% offline. Data is stored only in your browser.'
        }
    },

    /**
     * Initialize i18n with saved language preference
     */
    init() {
        const savedLang = localStorage.getItem('print3d_lang') || 'cs';
        this.setLanguage(savedLang);

        // Setup language buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setLanguage(btn.dataset.lang);
            });
        });
    },

    /**
     * Set current language and update UI
     */
    setLanguage(lang) {
        if (!this.translations[lang]) {
            lang = 'cs';
        }

        this.currentLang = lang;
        localStorage.setItem('print3d_lang', lang);

        // Update active button
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        // Update all translatable elements
        this.updateUI();
    },

    /**
     * Update all elements with data-i18n attribute
     */
    updateUI() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                el.textContent = translation;
            }
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation) {
                el.placeholder = translation;
            }
        });
    },

    /**
     * Get translation for key
     */
    t(key) {
        return this.translations[this.currentLang]?.[key] || this.translations['cs']?.[key] || key;
    }
};

// Export for use in other modules
window.I18N = I18N;
