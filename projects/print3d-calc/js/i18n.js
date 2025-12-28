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
            offline_ready: 'Offline ready',

            // Tabs
            tab_calculator: 'Kalkulacka',
            tab_settings: 'Nastaveni',
            tab_history: 'Historie',

            // Upload
            upload_title: 'Nahrat model',
            drop_title: 'Kliknete pro nahrani STL',
            drop_subtitle: 'nebo pretahnete soubor',
            drop_hint: 'Podporovane formaty: .stl (ASCII/Binary)',
            preview_hint: 'Otacejte mysi, scroll = zoom',

            // Model Info
            info_volume: 'Objem',
            info_weight: 'Vaha',
            info_dimensions: 'Rozmery',
            info_triangles: 'Trojuhelniky',

            // Pricing Form
            pricing_title: 'Parametry tisku',
            label_printer: 'Tiskarna',
            printer_default: 'Vychozi tiskarna',
            manage_printers: 'Spravovat tiskarny',
            label_material: 'Material',
            material_custom: 'Vlastni...',
            label_infill: 'Vyplnen',
            label_quantity: 'Pocet kusu',
            label_print_time: 'Cas tisku (hodiny)',
            estimate_time: 'Odhadnout cas',
            label_labor: 'Prace (priprava + post-processing)',
            label_urgency: 'Priorita',
            urgency_normal: 'Normalni',
            urgency_fast: 'Rychle (+25%)',
            urgency_express: 'Expresni (+50%)',
            calculate: 'Vypocitat cenu',

            // Results
            results_title: 'Vysledek kalkulace',
            breakdown_title: 'Rozpis nakladu',
            cost_material: 'Material',
            cost_electricity: 'Elektrina',
            cost_depreciation: 'Amortizace',
            cost_maintenance: 'Udrzba',
            cost_labor: 'Prace',
            cost_risk: 'Riziko selhani',
            cost_profit: 'Marze',
            total_per_piece: 'Cena za kus',
            total_quantity: 'Celkem za',
            total_pieces: 'ks:',
            save_quote: 'Ulozit nabidku',
            export_pdf: 'Export PDF',
            copy_result: 'Kopirovat',

            // Settings
            settings_printers: 'Profily tiskaren',
            add_printer: 'Pridat tiskarnu',
            settings_materials: 'Databaze materialu',
            add_material: 'Pridat material',
            settings_pricing: 'Nastaveni cen',
            setting_electricity: 'Cena elektriny (Kc/kWh)',
            setting_labor_rate: 'Hodinova sazba (Kc/h)',
            setting_maintenance: 'Udrzba za hodinu tisku (Kc/h)',
            setting_failure_rate: 'Mira selhani (%)',
            setting_markup: 'Marze (%)',
            setting_currency: 'Mena',
            settings_data: 'Sprava dat',
            export_data: 'Exportovat data',
            import_data: 'Importovat data',
            reset_data: 'Resetovat vse',

            // History
            history_title: 'Historie kalkulaci',
            clear_history: 'Smazat vse',
            history_empty: 'Zadna historie kalkulaci',

            // Modals
            modal_add_printer: 'Pridat tiskarnu',
            modal_edit_printer: 'Upravit tiskarnu',
            printer_name: 'Nazev tiskarny',
            printer_power: 'Prikon (W)',
            printer_cost: 'Porizovaci cena',
            printer_lifetime: 'Zivotnost (hodiny)',
            printer_bed_size: 'Velikost podlozky (mm)',
            modal_add_material: 'Pridat material',
            modal_edit_material: 'Upravit material',
            material_name: 'Nazev materialu',
            material_density: 'Hustota (g/cm³)',
            material_price: 'Cena za kg',
            material_color: 'Barva (volitelne)',
            cancel: 'Zrusit',
            save: 'Ulozit',

            // Messages
            msg_saved: 'Ulozeno',
            msg_deleted: 'Smazano',
            msg_copied: 'Zkopirovano do schranky',
            msg_exported: 'Data exportovana',
            msg_imported: 'Data importovana',
            msg_reset: 'Data resetovana',
            msg_error: 'Nastala chyba',
            msg_no_file: 'Nahrajte nejprve STL soubor',
            msg_invalid_file: 'Neplatny STL soubor',

            // Footer
            footer_hint: '100% offline. Data se ukladaji pouze v prohlizeci.'
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
            label_urgency: 'Priority',
            urgency_normal: 'Normal',
            urgency_fast: 'Fast (+25%)',
            urgency_express: 'Express (+50%)',
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
