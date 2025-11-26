// Správa vícejazyčnosti aplikace

class LanguageManager {
    constructor() {
        this.currentLang = 'cs'; // Výchozí jazyk
        this.translations = {};
        this.supportedLanguages = ['cs', 'en'];
    }

    // Inicializace - načtení uloženého jazyka a načtení překladů
    async init() {
        const savedLang = localStorage.getItem('app_language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            this.currentLang = savedLang;
        }
        await this.loadLanguage(this.currentLang);
    }

    // Načtení překladů z JSON souboru
    async loadLanguage(langCode) {
        try {
            const response = await fetch(`locales/${langCode}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load language: ${langCode}`);
            }
            this.translations = await response.json();
            this.currentLang = langCode;
            return true;
        } catch (error) {
            console.error('Error loading language:', error);
            // Fallback na češtinu pokud se nepodaří načíst
            if (langCode !== 'cs') {
                await this.loadLanguage('cs');
            }
            return false;
        }
    }

    // Nastavení jazyka a uložení do localStorage
    async setLanguage(langCode) {
        if (!this.supportedLanguages.includes(langCode)) {
            console.error(`Unsupported language: ${langCode}`);
            return false;
        }

        const success = await this.loadLanguage(langCode);
        if (success) {
            localStorage.setItem('app_language', langCode);
            this.translatePage();

            // Vyvolat custom event pro případné další komponenty
            document.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { language: langCode }
            }));

            return true;
        }
        return false;
    }

    // Získání aktuálního jazyka
    getLanguage() {
        return this.currentLang;
    }

    // Získání překladu podle klíče
    t(key) {
        return this.translations[key] || key;
    }

    // Přeložení všech elementů na stránce s atributem data-i18n
    translatePage() {
        // Překlad textového obsahu elementů
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });

        // Překlad placeholder atributů
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Překlad title atributů (pro tooltipy)
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // Aktualizace title stránky
        const titleKey = document.querySelector('title')?.getAttribute('data-i18n');
        if (titleKey) {
            document.title = this.t(titleKey);
        }
    }

    // Získání seznamu podporovaných jazyků
    getSupportedLanguages() {
        return this.supportedLanguages;
    }

    // Získání názvu jazyka pro zobrazení
    getLanguageName(langCode) {
        const names = {
            'cs': 'Čeština',
            'en': 'English'
        };
        return names[langCode] || langCode;
    }

    // Získání emoji vlajky pro jazyk
    getLanguageFlag(langCode) {
        const flags = {
            'cs': '🇨🇿',
            'en': '🇬🇧'
        };
        return flags[langCode] || '🌐';
    }
}

// Export singleton instance
const langManager = new LanguageManager();
