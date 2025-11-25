// AdHUB - Central Hub Script
// Version management
const APP_VERSION = '1.0.0';

// Translations - Internationalization (i18n)
const TRANSLATIONS = {
    cs: {
        // General
        search_placeholder: 'Vyhledat nástroj, odkaz...',
        loading: 'Načítání...',
        refresh_title: 'Obnovit',
        no_results: 'Žádné výsledky',
        try_different: 'Zkuste změnit vyhledávání nebo filtry',
        footer_text: 'AdHUB - Centrální Hub pro nástroje a utility',
        
        // Filters
        filter_all: 'Vše',
        filter_tools: 'Nástroje',
        filter_links: 'Odkazy',
        
        // Status
        status_loaded: 'Načteno {tools} nástrojů, {links} odkazů',
        
        // Cards
        open: 'Otevřít',
        local_badge: '📦 Lokální',
        no_description: 'Bez popisu',
        
        // Categories
        category_video: 'video',
        category_streaming: 'streaming',
        category_demos: 'demo',
        category_setup: 'setup',
        
        // Tools & Links descriptions
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
        link_ytdlp_desc: 'Poslední buildy yt-dlp potřebné pro náš downloader, včetně návodu k instalaci.'
    },
    en: {
        // General
        search_placeholder: 'Search tool, link...',
        loading: 'Loading...',
        refresh_title: 'Refresh',
        no_results: 'No results',
        try_different: 'Try changing your search or filters',
        footer_text: 'AdHUB - Central Hub for tools and utilities',
        
        // Filters
        filter_all: 'All',
        filter_tools: 'Tools',
        filter_links: 'Links',
        
        // Status
        status_loaded: 'Loaded {tools} tools, {links} links',
        
        // Cards
        open: 'Open',
        local_badge: '📦 Local',
        no_description: 'No description',
        
        // Categories
        category_video: 'video',
        category_streaming: 'streaming',
        category_demos: 'demo',
        category_setup: 'setup',
        
        // Tools & Links descriptions
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
        link_ytdlp_desc: 'Latest yt-dlp builds needed for our downloader, including installation guide.'
    }
};

// Current language (default: detect from browser or use English)
let currentLanguage = localStorage.getItem('adhub_language') || 
    (navigator.language.startsWith('cs') ? 'cs' : 'en');

// State variables
let allTools = [];
let allLinks = [];
let currentFilter = 'all';
let currentCategory = null;
let searchQuery = '';

// Get translation
function t(key, params = {}) {
    let text = TRANSLATIONS[currentLanguage]?.[key] || TRANSLATIONS['en'][key] || key;
    
    // Replace placeholders like {tools} with actual values
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
}

// Set language and update UI
function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    
    currentLanguage = lang;
    localStorage.setItem('adhub_language', lang);
    document.documentElement.lang = lang;
    
    // Update page title
    document.title = lang === 'cs' ? 'AdHUB - Centrální Hub' : 'AdHUB - Central Hub';
    
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
    
    // Update active language button
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    
    // Re-render tools to update their translations
    renderTools();
    
    // Update status
    updateStatus(t('status_loaded', { tools: allTools.length, links: allLinks.length }), true);
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
    // Set initial language
    document.documentElement.lang = currentLanguage;
    
    // Update version display
    updateVersionDisplay();
    
    // Language selector
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setLanguage(btn.dataset.lang);
            updateVersionDisplay();
        });
        // Set initial active state
        if (btn.dataset.lang === currentLanguage) {
            btn.classList.add('active');
        }
    });
    
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
