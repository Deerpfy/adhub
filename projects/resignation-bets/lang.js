// Správa vícejazyčnosti aplikace

// ============================================
// GEO-LOCATION BASED LANGUAGE DETECTION
// ============================================
const GEO_CACHE_KEY = 'adhub_geo_country';
const GEO_CACHE_TIME_KEY = 'adhub_geo_cache_time';
const GEO_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CZECH_COUNTRIES = ['CZ', 'SK'];

async function detectCountryFromIP() {
    const cachedCountry = localStorage.getItem(GEO_CACHE_KEY);
    const cacheTime = localStorage.getItem(GEO_CACHE_TIME_KEY);

    if (cachedCountry && cacheTime) {
        const age = Date.now() - parseInt(cacheTime, 10);
        if (age < GEO_CACHE_DURATION) {
            return cachedCountry;
        }
    }

    try {
        const response = await fetch('https://ipapi.co/country_code/', {
            method: 'GET',
            headers: { 'Accept': 'text/plain' },
            signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
            const countryCode = (await response.text()).trim().toUpperCase();
            if (countryCode && countryCode.length === 2) {
                localStorage.setItem(GEO_CACHE_KEY, countryCode);
                localStorage.setItem(GEO_CACHE_TIME_KEY, Date.now().toString());
                return countryCode;
            }
        }
    } catch (e) { /* ignore */ }

    try {
        const response = await fetch('http://ip-api.com/json/?fields=countryCode', {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
            const data = await response.json();
            if (data.countryCode) {
                const countryCode = data.countryCode.toUpperCase();
                localStorage.setItem(GEO_CACHE_KEY, countryCode);
                localStorage.setItem(GEO_CACHE_TIME_KEY, Date.now().toString());
                return countryCode;
            }
        }
    } catch (e) { /* ignore */ }

    return null;
}
// ============================================

class LanguageManager {
    constructor() {
        this.currentLang = 'cs'; // Výchozí jazyk
        this.translations = {};
        this.supportedLanguages = ['cs', 'en'];
    }

    // Inicializace - načtení uloženého jazyka a načtení překladů (s IP geolokací)
    async init() {
        // Check saved preference first
        const savedLang = localStorage.getItem('app_language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            this.currentLang = savedLang;
        } else {
            // Detect from IP
            const country = await detectCountryFromIP();
            if (country && CZECH_COUNTRIES.includes(country)) {
                this.currentLang = 'cs';
            } else {
                // Fallback to browser language
                this.currentLang = navigator.language.startsWith('cs') ? 'cs' : 'en';
            }
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
