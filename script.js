// AdHUB - Central Hub Script
// Version management
const APP_VERSION = '1.0.0';

// All available languages for translation (ISO 639-1 codes)
const AVAILABLE_LANGUAGES = [
    { code: 'cs', name: 'Czech', native: 'Čeština', flag: '🇨🇿' },
    { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
    { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇵🇹' },
    { code: 'pl', name: 'Polish', native: 'Polski', flag: '🇵🇱' },
    { code: 'sk', name: 'Slovak', native: 'Slovenčina', flag: '🇸🇰' },
    { code: 'nl', name: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
    { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
    { code: 'uk', name: 'Ukrainian', native: 'Українська', flag: '🇺🇦' },
    { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
    { code: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳' },
    { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷' },
    { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
    { code: 'sv', name: 'Swedish', native: 'Svenska', flag: '🇸🇪' },
    { code: 'da', name: 'Danish', native: 'Dansk', flag: '🇩🇰' },
    { code: 'fi', name: 'Finnish', native: 'Suomi', flag: '🇫🇮' },
    { code: 'no', name: 'Norwegian', native: 'Norsk', flag: '🇳🇴' },
    { code: 'el', name: 'Greek', native: 'Ελληνικά', flag: '🇬🇷' },
    { code: 'hu', name: 'Hungarian', native: 'Magyar', flag: '🇭🇺' },
    { code: 'ro', name: 'Romanian', native: 'Română', flag: '🇷🇴' },
    { code: 'bg', name: 'Bulgarian', native: 'Български', flag: '🇧🇬' },
    { code: 'hr', name: 'Croatian', native: 'Hrvatski', flag: '🇭🇷' },
    { code: 'sl', name: 'Slovenian', native: 'Slovenščina', flag: '🇸🇮' },
    { code: 'sr', name: 'Serbian', native: 'Српски', flag: '🇷🇸' },
    { code: 'he', name: 'Hebrew', native: 'עברית', flag: '🇮🇱' },
    { code: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭' },
    { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', flag: '🇲🇾' },
    { code: 'lt', name: 'Lithuanian', native: 'Lietuvių', flag: '🇱🇹' },
    { code: 'lv', name: 'Latvian', native: 'Latviešu', flag: '🇱🇻' },
    { code: 'et', name: 'Estonian', native: 'Eesti', flag: '🇪🇪' },
    { code: 'ca', name: 'Catalan', native: 'Català', flag: '🏴󠁥󠁳󠁣󠁴󠁿' },
    { code: 'af', name: 'Afrikaans', native: 'Afrikaans', flag: '🇿🇦' },
    { code: 'sw', name: 'Swahili', native: 'Kiswahili', flag: '🇰🇪' }
];

// Base translations (Czech and English as defaults)
const BASE_TRANSLATIONS = {
    cs: {
        search_placeholder: 'Vyhledat nástroj, odkaz...',
        loading: 'Načítání...',
        refresh_title: 'Obnovit',
        no_results: 'Žádné výsledky',
        try_different: 'Zkuste změnit vyhledávání nebo filtry',
        footer_text: 'AdHUB - Centrální Hub pro nástroje a utility',
        filter_all: 'Vše',
        filter_tools: 'Nástroje',
        filter_links: 'Odkazy',
        status_loaded: 'Načteno {tools} nástrojů, {links} odkazů',
        open: 'Otevřít',
        local_badge: '📦 Lokální',
        no_description: 'Bez popisu',
        category_video: 'video',
        category_streaming: 'streaming',
        category_demos: 'demo',
        category_setup: 'setup',
        tool_youtube_name: 'AdHUB YouTube Downloader',
        tool_youtube_desc: 'Stáhněte si rozšíření pro Chrome/Edge/Brave a stahujte YouTube videa přímo z prohlížeče.',
        tool_chat_name: 'AdHUB Multistream Chat Panel',
        tool_chat_desc: 'Unified chat pro Twitch, Kick a YouTube s overlay módy. Vyžaduje spuštění lokálního serveru.',
        tool_pizza_name: 'AdHUB KomoPizza Demo',
        tool_pizza_desc: 'Ukázková objednávková aplikace pro rychlé prototypování UI konceptů.',
        link_ninite_name: 'Ninite – rychlá instalace Windows aplikací',
        link_ninite_desc: 'Vyber aplikace a nainstaluj je jedním kliknutím po čisté instalaci Windows.',
        link_winget_name: 'Winget.run katalog balíčků',
        link_winget_desc: 'Webový katalog pro Microsoft WinGet – rychlé skripty a příkazy k instalaci.',
        link_obs_name: 'OBS Studio Download',
        link_obs_desc: 'Oficiální stránka s instalátory OBS Studio pro streamování a záznam.',
        link_ytdlp_name: 'yt-dlp Releases',
        link_ytdlp_desc: 'Poslední buildy yt-dlp potřebné pro náš downloader, včetně návodu k instalaci.',
        translating: 'Překládám...',
        translation_error: 'Chyba překladu',
        search_language: 'Hledat jazyk...'
    },
    en: {
        search_placeholder: 'Search tool, link...',
        loading: 'Loading...',
        refresh_title: 'Refresh',
        no_results: 'No results',
        try_different: 'Try changing your search or filters',
        footer_text: 'AdHUB - Central Hub for tools and utilities',
        filter_all: 'All',
        filter_tools: 'Tools',
        filter_links: 'Links',
        status_loaded: 'Loaded {tools} tools, {links} links',
        open: 'Open',
        local_badge: '📦 Local',
        no_description: 'No description',
        category_video: 'video',
        category_streaming: 'streaming',
        category_demos: 'demo',
        category_setup: 'setup',
        tool_youtube_name: 'AdHUB YouTube Downloader',
        tool_youtube_desc: 'Download the extension for Chrome/Edge/Brave and download YouTube videos directly from your browser.',
        tool_chat_name: 'AdHUB Multistream Chat Panel',
        tool_chat_desc: 'Unified chat for Twitch, Kick and YouTube with overlay modes. Requires running a local server.',
        tool_pizza_name: 'AdHUB KomoPizza Demo',
        tool_pizza_desc: 'Sample ordering application for rapid UI concept prototyping.',
        link_ninite_name: 'Ninite – Quick Windows App Installation',
        link_ninite_desc: 'Select apps and install them with one click after a clean Windows installation.',
        link_winget_name: 'Winget.run Package Catalog',
        link_winget_desc: 'Web catalog for Microsoft WinGet – quick scripts and installation commands.',
        link_obs_name: 'OBS Studio Download',
        link_obs_desc: 'Official OBS Studio installers page for streaming and recording.',
        link_ytdlp_name: 'yt-dlp Releases',
        link_ytdlp_desc: 'Latest yt-dlp builds needed for our downloader, including installation guide.',
        translating: 'Translating...',
        translation_error: 'Translation error',
        search_language: 'Search language...'
    }
};

// Dynamic translations storage (cached translations)
let TRANSLATIONS = JSON.parse(JSON.stringify(BASE_TRANSLATIONS));

// Current language
let currentLanguage = localStorage.getItem('adhub_language') || 
    (navigator.language.startsWith('cs') ? 'cs' : 'en');

// Translation cache from localStorage
let translationCache = JSON.parse(localStorage.getItem('adhub_translation_cache') || '{}');

// State variables
let allTools = [];
let allLinks = [];
let currentFilter = 'all';
let currentCategory = null;
let searchQuery = '';
let isTranslating = false;

// Get translation
function t(key, params = {}) {
    let text = TRANSLATIONS[currentLanguage]?.[key] || TRANSLATIONS['en'][key] || key;
    
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
}

// Get language info by code
function getLanguageInfo(code) {
    return AVAILABLE_LANGUAGES.find(lang => lang.code === code) || AVAILABLE_LANGUAGES[1]; // Default to English
}

// Translate text using MyMemory API
async function translateText(text, fromLang, toLang) {
    if (!text || text.trim() === '') return text;
    if (fromLang === toLang) return text;
    
    // Check cache first
    const cacheKey = `${fromLang}_${toLang}_${text}`;
    if (translationCache[cacheKey]) {
        return translationCache[cacheKey];
    }
    
    try {
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`
        );
        
        if (!response.ok) throw new Error('Translation API error');
        
        const data = await response.json();
        
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
            const translated = data.responseData.translatedText;
            // Cache the translation
            translationCache[cacheKey] = translated;
            // Save cache to localStorage (limit size)
            const cacheKeys = Object.keys(translationCache);
            if (cacheKeys.length > 500) {
                // Remove oldest entries
                const keysToRemove = cacheKeys.slice(0, 100);
                keysToRemove.forEach(k => delete translationCache[k]);
            }
            localStorage.setItem('adhub_translation_cache', JSON.stringify(translationCache));
            return translated;
        }
        
        return text;
    } catch (error) {
        console.warn('Translation failed:', error);
        return text;
    }
}

// Translate all base translations to target language
async function translateAllTexts(targetLang) {
    if (targetLang === 'cs' || targetLang === 'en') {
        // Use base translations directly
        TRANSLATIONS[targetLang] = BASE_TRANSLATIONS[targetLang];
        return true;
    }
    
    // Check if we already have cached translations for this language
    const cachedTranslations = localStorage.getItem(`adhub_translations_${targetLang}`);
    if (cachedTranslations) {
        TRANSLATIONS[targetLang] = JSON.parse(cachedTranslations);
        return true;
    }
    
    // Translate from English (as base)
    const sourceLang = 'en';
    const sourceTexts = BASE_TRANSLATIONS[sourceLang];
    const translatedTexts = {};
    
    // Batch translations for efficiency
    const keys = Object.keys(sourceTexts);
    const batchSize = 5;
    
    for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const translations = await Promise.all(
            batch.map(key => translateText(sourceTexts[key], sourceLang, targetLang))
        );
        
        batch.forEach((key, index) => {
            translatedTexts[key] = translations[index];
        });
        
        // Small delay to avoid rate limiting
        if (i + batchSize < keys.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    TRANSLATIONS[targetLang] = translatedTexts;
    
    // Cache the translations
    localStorage.setItem(`adhub_translations_${targetLang}`, JSON.stringify(translatedTexts));
    
    return true;
}

// Show/hide translation indicator
function showTranslationIndicator(show) {
    const indicator = document.getElementById('translationIndicator');
    if (indicator) {
        indicator.style.display = show ? 'flex' : 'none';
    }
}

// Set language and update UI
async function setLanguage(lang) {
    if (isTranslating) return;
    
    const langInfo = getLanguageInfo(lang);
    if (!langInfo) return;
    
    isTranslating = true;
    showTranslationIndicator(true);
    
    try {
        // Translate all texts if not already available
        await translateAllTexts(lang);
        
        currentLanguage = lang;
        localStorage.setItem('adhub_language', lang);
        document.documentElement.lang = lang;
        
        // Update current language display
        updateCurrentLanguageDisplay(langInfo);
        
        // Update page title
        const titleTranslations = {
            cs: 'AdHUB - Centrální Hub',
            en: 'AdHUB - Central Hub',
            de: 'AdHUB - Zentraler Hub',
            fr: 'AdHUB - Hub Central',
            es: 'AdHUB - Centro Principal'
        };
        document.title = titleTranslations[lang] || `AdHUB - ${langInfo.native}`;
        
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });
        
        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = t(key);
        });
        
        // Update titles
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = t(key);
        });
        
        // Update language search placeholder
        const langSearch = document.getElementById('langSearchInput');
        if (langSearch) {
            langSearch.placeholder = t('search_language');
        }
        
        // Update active language in list
        updateLanguageList();
        
        // Re-render tools to update their translations
        renderTools();
        
        // Update status
        updateStatus(t('status_loaded', { tools: allTools.length, links: allLinks.length }), true);
        
    } catch (error) {
        console.error('Failed to set language:', error);
        updateStatus(t('translation_error'), false);
    } finally {
        isTranslating = false;
        showTranslationIndicator(false);
    }
}

// Update current language display in header
function updateCurrentLanguageDisplay(langInfo) {
    const flagEl = document.getElementById('currentLangFlag');
    const nameEl = document.getElementById('currentLangName');
    
    if (flagEl) flagEl.textContent = langInfo.flag;
    if (nameEl) nameEl.textContent = langInfo.native;
}

// Populate and update language list
function updateLanguageList(filter = '') {
    const langList = document.getElementById('langList');
    if (!langList) return;
    
    const filterLower = filter.toLowerCase();
    const filteredLanguages = AVAILABLE_LANGUAGES.filter(lang => {
        if (!filter) return true;
        return lang.name.toLowerCase().includes(filterLower) ||
               lang.native.toLowerCase().includes(filterLower) ||
               lang.code.toLowerCase().includes(filterLower);
    });
    
    langList.innerHTML = filteredLanguages.map(lang => `
        <div class="lang-item ${lang.code === currentLanguage ? 'active' : ''}" data-lang="${lang.code}">
            <span class="lang-flag">${lang.flag}</span>
            <div class="lang-info">
                <span class="lang-name">${lang.native}</span>
                <span class="lang-native">${lang.name}</span>
            </div>
            <span class="lang-code-badge">${lang.code}</span>
        </div>
    `).join('');
    
    // Add click handlers
    langList.querySelectorAll('.lang-item').forEach(item => {
        item.addEventListener('click', () => {
            const lang = item.dataset.lang;
            setLanguage(lang);
            closeLanguageDropdown();
        });
    });
}

// Toggle language dropdown
function toggleLanguageDropdown() {
    const dropdown = document.querySelector('.language-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('open');
        
        if (dropdown.classList.contains('open')) {
            const searchInput = document.getElementById('langSearchInput');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
                updateLanguageList();
            }
        }
    }
}

// Close language dropdown
function closeLanguageDropdown() {
    const dropdown = document.querySelector('.language-dropdown');
    if (dropdown) {
        dropdown.classList.remove('open');
    }
}

// Default configuration - can be modified directly here
function getLocalizedConfig() {
    return {
        "tools": [
            {
                "id": "youtube-downloader",
                "name": t('tool_youtube_name'),
                "description": t('tool_youtube_desc'),
                "category": "video",
                "icon": "🎥",
                "url": "projects/youtube-downloader/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["extension", "download", "audio", "video", "youtube", "chrome"]
            },
            {
                "id": "chat-panel",
                "name": t('tool_chat_name'),
                "description": t('tool_chat_desc'),
                "category": "streaming",
                "icon": "💬",
                "url": "projects/chat-panel/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["twitch", "kick", "youtube", "chat", "overlay"]
            },
            {
                "id": "komopizza-demo",
                "name": t('tool_pizza_name'),
                "description": t('tool_pizza_desc'),
                "category": "demos",
                "icon": "🍕",
                "url": "projects/komopizza/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["frontend", "demo", "proto", "ui"]
            }
        ],
        "links": [
            {
                "id": "ninite-installer-pack",
                "name": t('link_ninite_name'),
                "description": t('link_ninite_desc'),
                "category": "setup",
                "icon": "⚙️",
                "url": "https://ninite.com/",
                "type": "external",
                "tags": ["windows", "install", "automation"]
            },
            {
                "id": "winget-catalog",
                "name": t('link_winget_name'),
                "description": t('link_winget_desc'),
                "category": "setup",
                "icon": "🪟",
                "url": "https://winget.run/",
                "type": "external",
                "tags": ["windows", "cli", "packages"]
            },
            {
                "id": "obs-project",
                "name": t('link_obs_name'),
                "description": t('link_obs_desc'),
                "category": "streaming",
                "icon": "🎥",
                "url": "https://obsproject.com/download",
                "type": "external",
                "tags": ["streaming", "recording", "tools"]
            },
            {
                "id": "yt-dlp-releases",
                "name": t('link_ytdlp_name'),
                "description": t('link_ytdlp_desc'),
                "category": "video",
                "icon": "⬇️",
                "url": "https://github.com/yt-dlp/yt-dlp/releases/latest",
                "type": "external",
                "tags": ["yt-dlp", "download", "cli"]
            }
        ]
    };
}

// Use default configuration
function useDefaultConfig() {
    const config = getLocalizedConfig();
    allTools = config.tools || [];
    allLinks = config.links || [];
    updateStatus(t('status_loaded', { tools: allTools.length, links: allLinks.length }), true);
    renderTools();
    updateCategoryFilters();
}

// Update status bar
function updateStatus(text, success = true) {
    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
        const statusText = statusBar.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = text;
            statusText.style.color = success ? 'var(--text-secondary)' : 'var(--danger-color)';
        }
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Search and filter
function filterItems() {
    const items = [...allTools, ...allLinks];
    
    let filtered = items;
    
    // Filter by type (tools/links)
    if (currentFilter === 'tools') {
        filtered = allTools;
    } else if (currentFilter === 'links') {
        filtered = allLinks;
    }
    
    // Filter by category
    if (currentCategory) {
        filtered = filtered.filter(item => item.category === currentCategory);
    }
    
    // Search
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(item => {
            const nameMatch = item.name.toLowerCase().includes(query);
            const descMatch = (item.description || '').toLowerCase().includes(query);
            const tagMatch = (item.tags || []).some(tag => tag.toLowerCase().includes(query));
            const categoryMatch = (item.category || '').toLowerCase().includes(query);
            
            return nameMatch || descMatch || tagMatch || categoryMatch;
        });
    }
    
    return filtered;
}

// Render tools
function renderTools() {
    const grid = document.getElementById('toolsGrid');
    const emptyState = document.getElementById('emptyState');
    
    // Re-fetch localized config to get updated translations
    const config = getLocalizedConfig();
    allTools = config.tools || [];
    allLinks = config.links || [];
    
    const filtered = filterItems();
    
    if (!grid || !emptyState) return;
    
    if (filtered.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    grid.innerHTML = filtered.map(item => {
        // Distinguish: tools have id and are in tools array, links have type: "external"
        if (allTools.includes(item)) {
            return createToolCard(item);
        } else {
            return createLinkCard(item);
        }
    }).join('');
}

// Create tool card
function createToolCard(tool) {
    const isLocalFile = tool.type === 'local' || !tool.url.startsWith('http');
    return `
        <div class="tool-card" data-id="${tool.id}" data-type="tool">
            <div class="tool-header">
                <div class="tool-title">
                    <span class="tool-icon">${tool.icon || '🔧'}</span>
                    <span class="tool-name">${escapeHtml(tool.name)}</span>
                </div>
                ${isLocalFile ? `<span class="tool-badge">${t('local_badge')}</span>` : ''}
            </div>
            <p class="tool-description">${escapeHtml(tool.description || t('no_description'))}</p>
            <div class="tool-meta">
                <span class="tool-category">${escapeHtml(tool.category || 'other')}</span>
                ${tool.tags && tool.tags.length > 0 ? `
                    <div class="tool-tags">
                        ${tool.tags.slice(0, 5).map(tag => `<span class="tool-tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="tool-actions">
                ${tool.url ? `
                    <button class="btn btn-primary" onclick="openTool('${tool.url}')">
                        🔗 ${t('open')}
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Create link card
function createLinkCard(link) {
    const url = link.type === 'local' ? link.url : link.url;
    
    return `
        <div class="tool-card link" data-id="${link.id}" data-type="link" onclick="openLink('${url}')">
            <div class="tool-header">
                <div class="tool-title">
                    <span class="tool-icon">${link.icon || '🔗'}</span>
                    <span class="tool-name">${escapeHtml(link.name)}</span>
                </div>
            </div>
            <p class="tool-description">${escapeHtml(link.description || t('no_description'))}</p>
            <div class="tool-meta">
                <span class="tool-category">${escapeHtml(link.category || 'other')}</span>
                ${link.tags && link.tags.length > 0 ? `
                    <div class="tool-tags">
                        ${link.tags.slice(0, 5).map(tag => `<span class="tool-tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="tool-actions">
                <button class="btn btn-primary" onclick="openLink('${url}')">
                    🔗 ${t('open')}
                </button>
            </div>
        </div>
    `;
}

// Open tool
function openTool(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
    } else {
        // Local file - open in current window or new tab
        window.location.href = url;
    }
}

// Open link
function openLink(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
    } else {
        window.location.href = url;
    }
}

// Update category filters
function updateCategoryFilters() {
    const categories = new Set();
    
    [...allTools, ...allLinks].forEach(item => {
        if (item.category) {
            categories.add(item.category);
        }
    });
    
    const container = document.getElementById('categoryFilters');
    if (!container) return;
    
    container.innerHTML = Array.from(categories).sort().map(cat => `
        <button class="category-chip" data-category="${cat}">
            ${escapeHtml(cat)}
        </button>
    `).join('');
    
    // Event listeners for categories
    container.querySelectorAll('.category-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            
            // Toggle active category
            if (currentCategory === category) {
                currentCategory = null;
                btn.classList.remove('active');
            } else {
                currentCategory = category;
                container.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
            
            renderTools();
        });
    });
}

// Update version display
function updateVersionDisplay() {
    const versionBadge = document.getElementById('versionBadge');
    const footerVersion = document.getElementById('footerVersion');
    
    if (versionBadge) {
        versionBadge.textContent = `v${APP_VERSION}`;
    }
    if (footerVersion) {
        footerVersion.textContent = currentLanguage === 'cs' 
            ? `Verze ${APP_VERSION}` 
            : `Version ${APP_VERSION}`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set initial language display
    const langInfo = getLanguageInfo(currentLanguage);
    updateCurrentLanguageDisplay(langInfo);
    
    document.documentElement.lang = currentLanguage;
    
    // Update version display
    updateVersionDisplay();
    
    // Initialize language dropdown
    const currentLangBtn = document.getElementById('currentLangBtn');
    if (currentLangBtn) {
        currentLangBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLanguageDropdown();
        });
    }
    
    // Language search
    const langSearchInput = document.getElementById('langSearchInput');
    if (langSearchInput) {
        langSearchInput.addEventListener('input', (e) => {
            updateLanguageList(e.target.value);
        });
        langSearchInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('.language-dropdown');
        if (dropdown && !dropdown.contains(e.target)) {
            closeLanguageDropdown();
        }
    });
    
    // Close dropdown on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLanguageDropdown();
        }
    });
    
    // Populate language list
    updateLanguageList();
    
    // Apply initial translations
    setLanguage(currentLanguage);
    
    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderTools();
        });
    }
    
    // Type filters
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderTools();
        });
    });
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            useDefaultConfig();
        });
    }
    
    // Hide server buttons and warnings (legacy)
    const startServerBtn = document.getElementById('startServerBtn');
    const fileWarning = document.getElementById('fileProtocolWarning');
    if (startServerBtn) startServerBtn.style.display = 'none';
    if (fileWarning) fileWarning.style.display = 'none';
    
    // Load data on startup
    useDefaultConfig();
});

// Export functions for global use
window.openTool = openTool;
window.openLink = openLink;
window.setLanguage = setLanguage;
window.APP_VERSION = APP_VERSION;
