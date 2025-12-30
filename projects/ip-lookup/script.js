/**
 * IP Lookup - Offline-First IP Address Tool
 * Uses ipify API with local caching for offline support
 * Version: 1.0.0
 */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    // API endpoints with fallbacks
    endpoints: [
        'https://api.ipify.org?format=json',
        'https://api4.ipify.org?format=json',
        'https://api64.ipify.org?format=json'
    ],
    // Cache TTL: 5 minutes (IP changes are rare)
    cacheTTL: 5 * 60 * 1000,
    // Max history items to store
    maxHistoryItems: 20,
    // Request timeout
    timeout: 5000,
    // Storage keys
    storageKeys: {
        ip: 'ip_lookup_current_ip',
        history: 'ip_lookup_history',
        lang: 'ip_lookup_lang'
    }
};

// ============================================
// TRANSLATIONS
// ============================================

const TRANSLATIONS = {
    cs: {
        your_ip: 'Vaše veřejná IP adresa',
        loading: 'Načítám...',
        error_offline: 'Offline - zobrazuji poslední známou IP',
        offline_notice: 'Jste offline. Zobrazena cached IP.',
        powered_by: 'Powered by',
        ip_history: 'Historie IP',
        no_history: 'Zatím žádná historie',
        ip_validator: 'Validátor IP',
        validate: 'Ověřit',
        api_endpoints: 'API Endpointy',
        dual_stack: 'Dual-stack',
        test: 'Test',
        code_examples: 'Příklady kódu',
        copied: 'Zkopírováno!',
        valid_ipv4: 'Platná IPv4 adresa',
        valid_ipv6: 'Platná IPv6 adresa',
        invalid_ip: 'Neplatná IP adresa',
        status_online: 'Online',
        status_offline: 'Offline',
        status_connecting: 'Připojování...',
        clear_confirm: 'Opravdu vymazat historii?',
        testing: 'Testování...',
        success: 'OK',
        error: 'Chyba',
        before_image: 'PŘED',
        after_image: 'PO',
        just_now: 'právě teď',
        minute_ago: 'před minutou',
        minutes_ago: 'před {n} minutami',
        hour_ago: 'před hodinou',
        hours_ago: 'před {n} hodinami',
        today: 'dnes',
        yesterday: 'včera'
    },
    en: {
        your_ip: 'Your Public IP Address',
        loading: 'Loading...',
        error_offline: 'Offline - showing last known IP',
        offline_notice: 'You are offline. Showing cached IP.',
        powered_by: 'Powered by',
        ip_history: 'IP History',
        no_history: 'No history yet',
        ip_validator: 'IP Validator',
        validate: 'Validate',
        api_endpoints: 'API Endpoints',
        dual_stack: 'Dual-stack',
        test: 'Test',
        code_examples: 'Code Examples',
        copied: 'Copied!',
        valid_ipv4: 'Valid IPv4 address',
        valid_ipv6: 'Valid IPv6 address',
        invalid_ip: 'Invalid IP address',
        status_online: 'Online',
        status_offline: 'Offline',
        status_connecting: 'Connecting...',
        clear_confirm: 'Clear history?',
        testing: 'Testing...',
        success: 'OK',
        error: 'Error',
        before_image: 'BEFORE',
        after_image: 'AFTER',
        just_now: 'just now',
        minute_ago: '1 minute ago',
        minutes_ago: '{n} minutes ago',
        hour_ago: '1 hour ago',
        hours_ago: '{n} hours ago',
        today: 'today',
        yesterday: 'yesterday'
    }
};

// ============================================
// CODE EXAMPLES
// ============================================

const CODE_EXAMPLES = {
    js: `// JavaScript (Fetch API)
async function getIP() {
  const response = await fetch('https://api.ipify.org?format=json');
  const data = await response.json();
  return data.ip;
}

// Usage
getIP().then(ip => console.log('IP:', ip));`,

    python: `# Python
import requests

# Simple GET request
ip = requests.get('https://api.ipify.org').text
print(f"My IP: {ip}")

# JSON format
response = requests.get('https://api.ipify.org?format=json')
ip = response.json()['ip']
print(f"IP: {ip}")`,

    bash: `# Bash / cURL

# Plain text
curl https://api.ipify.org

# JSON format
curl https://api.ipify.org?format=json

# Pretty print with jq
curl -s https://api.ipify.org?format=json | jq .`
};

// ============================================
// STATE
// ============================================

let currentLang = 'cs';
let isOnline = navigator.onLine;
let currentIP = null;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function t(key) {
    return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS.en[key] || key;
}

function formatTimestamp(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return t('just_now');
    if (minutes === 1) return t('minute_ago');
    if (minutes < 60) return t('minutes_ago').replace('{n}', minutes);
    if (hours === 1) return t('hour_ago');
    if (hours < 24) return t('hours_ago').replace('{n}', hours);

    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return t('today') + ' ' + date.toLocaleTimeString(currentLang, { hour: '2-digit', minute: '2-digit' });
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return t('yesterday') + ' ' + date.toLocaleTimeString(currentLang, { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString(currentLang, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function isValidIPv4(ip) {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!pattern.test(ip)) return false;
    return ip.split('.').every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
    });
}

function isValidIPv6(ip) {
    const pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$/;
    return pattern.test(ip);
}

function getIPType(ip) {
    if (isValidIPv4(ip)) return 'IPv4';
    if (isValidIPv6(ip)) return 'IPv6';
    return 'Unknown';
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ============================================
// STORAGE FUNCTIONS
// ============================================

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn('Storage error:', e);
    }
}

function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.warn('Storage error:', e);
        return null;
    }
}

function getCachedIP() {
    const cached = loadFromStorage(CONFIG.storageKeys.ip);
    if (cached && cached.ip && cached.timestamp) {
        const age = Date.now() - cached.timestamp;
        return {
            ...cached,
            isStale: age > CONFIG.cacheTTL
        };
    }
    return null;
}

function cacheIP(ip) {
    const data = {
        ip,
        timestamp: Date.now(),
        type: getIPType(ip)
    };
    saveToStorage(CONFIG.storageKeys.ip, data);
    addToHistory(ip);
    return data;
}

function getHistory() {
    return loadFromStorage(CONFIG.storageKeys.history) || [];
}

function addToHistory(ip) {
    let history = getHistory();

    // Don't add duplicate consecutive entries
    if (history.length > 0 && history[0].ip === ip) {
        return;
    }

    history.unshift({
        ip,
        timestamp: Date.now(),
        type: getIPType(ip)
    });

    // Limit history size
    if (history.length > CONFIG.maxHistoryItems) {
        history = history.slice(0, CONFIG.maxHistoryItems);
    }

    saveToStorage(CONFIG.storageKeys.history, history);
}

function clearHistory() {
    saveToStorage(CONFIG.storageKeys.history, []);
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchIP(endpoint = CONFIG.endpoints[0]) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

    try {
        const response = await fetch(endpoint, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.ip;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function fetchIPWithFallback() {
    for (const endpoint of CONFIG.endpoints) {
        try {
            return await fetchIP(endpoint);
        } catch (error) {
            console.warn(`Endpoint ${endpoint} failed:`, error.message);
        }
    }
    throw new Error('All endpoints failed');
}

// ============================================
// UI FUNCTIONS
// ============================================

function updateStatusBadge(status) {
    const badge = document.getElementById('statusBadge');
    const text = document.getElementById('statusText');

    badge.classList.remove('offline', 'loading');

    switch (status) {
        case 'online':
            text.textContent = t('status_online');
            break;
        case 'offline':
            badge.classList.add('offline');
            text.textContent = t('status_offline');
            break;
        case 'loading':
            badge.classList.add('loading');
            text.textContent = t('status_connecting');
            break;
    }
}

function showLoading() {
    document.getElementById('ipLoading').style.display = 'flex';
    document.getElementById('ipResult').style.display = 'none';
    document.getElementById('ipError').style.display = 'none';
}

function showResult(ip, timestamp, isOffline = false) {
    document.getElementById('ipLoading').style.display = 'none';
    document.getElementById('ipResult').style.display = 'block';
    document.getElementById('ipError').style.display = 'none';

    document.getElementById('ipValue').textContent = ip;
    document.getElementById('ipType').textContent = getIPType(ip);
    document.getElementById('ipTimestamp').textContent = formatTimestamp(timestamp);

    const offlineNotice = document.getElementById('offlineNotice');
    offlineNotice.style.display = isOffline ? 'flex' : 'none';

    currentIP = ip;
}

function showError(message) {
    document.getElementById('ipLoading').style.display = 'none';
    document.getElementById('ipResult').style.display = 'none';
    document.getElementById('ipError').style.display = 'flex';
    document.getElementById('errorMessage').textContent = message;
}

function renderHistory() {
    const history = getHistory();
    const container = document.getElementById('historyList');

    if (history.length === 0) {
        container.innerHTML = `<p class="empty-state">${t('no_history')}</p>`;
        return;
    }

    container.innerHTML = history.map(item => `
        <div class="history-item">
            <span class="history-ip">${item.ip}</span>
            <span class="history-time">${formatTimestamp(item.timestamp)}</span>
        </div>
    `).join('');
}

function updateCodeExample(lang) {
    const code = CODE_EXAMPLES[lang];
    document.getElementById('codeContent').textContent = code;

    // Update active tab
    document.querySelectorAll('.code-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.lang === lang);
    });
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
}

// ============================================
// MAIN FUNCTIONS
// ============================================

async function refreshIP() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.classList.add('spinning');
    updateStatusBadge('loading');
    showLoading();

    try {
        const ip = await fetchIPWithFallback();
        const cached = cacheIP(ip);
        showResult(ip, cached.timestamp, false);
        updateStatusBadge('online');
        renderHistory();
    } catch (error) {
        console.error('Failed to fetch IP:', error);
        updateStatusBadge('offline');

        // Try to show cached IP
        const cached = getCachedIP();
        if (cached) {
            showResult(cached.ip, cached.timestamp, true);
        } else {
            showError(t('error_offline'));
        }
    } finally {
        refreshBtn.classList.remove('spinning');
    }
}

function validateIP() {
    const input = document.getElementById('validateInput');
    const result = document.getElementById('validationResult');
    const ip = input.value.trim();

    if (!ip) {
        result.className = 'validation-result';
        result.textContent = '';
        return;
    }

    if (isValidIPv4(ip)) {
        result.className = 'validation-result valid';
        result.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2"/></svg> ${t('valid_ipv4')}`;
    } else if (isValidIPv6(ip)) {
        result.className = 'validation-result valid';
        result.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2"/></svg> ${t('valid_ipv6')}`;
    } else {
        result.className = 'validation-result invalid';
        result.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/></svg> ${t('invalid_ip')}`;
    }
}

async function testEndpoint(button, endpoint) {
    if (button.classList.contains('testing')) return;

    button.classList.add('testing');
    button.textContent = t('testing');

    try {
        const start = performance.now();
        await fetchIP(endpoint);
        const latency = Math.round(performance.now() - start);

        button.classList.remove('testing');
        button.classList.add('success');
        button.textContent = `${latency}ms`;

        setTimeout(() => {
            button.classList.remove('success');
            button.textContent = t('test');
        }, 3000);
    } catch (error) {
        button.classList.remove('testing');
        button.classList.add('error');
        button.textContent = t('error');

        setTimeout(() => {
            button.classList.remove('error');
            button.textContent = t('test');
        }, 3000);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(t('copied'));
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}

function setLanguage(lang) {
    currentLang = lang;
    saveToStorage(CONFIG.storageKeys.lang, lang);

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    applyTranslations();
    renderHistory();

    // Update dynamic content
    const cached = getCachedIP();
    if (cached) {
        document.getElementById('ipTimestamp').textContent = formatTimestamp(cached.timestamp);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', refreshIP);

    // Copy IP button
    document.getElementById('copyBtn').addEventListener('click', () => {
        if (currentIP) {
            const btn = document.getElementById('copyBtn');
            const defaultIcon = btn.querySelector('svg:not(.copy-success)');
            const successIcon = btn.querySelector('.copy-success');

            copyToClipboard(currentIP);
            btn.classList.add('success');
            defaultIcon.style.display = 'none';
            successIcon.style.display = 'block';

            setTimeout(() => {
                btn.classList.remove('success');
                defaultIcon.style.display = 'block';
                successIcon.style.display = 'none';
            }, 2000);
        }
    });

    // Clear history
    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        if (confirm(t('clear_confirm'))) {
            clearHistory();
            renderHistory();
        }
    });

    // Validate IP
    document.getElementById('validateBtn').addEventListener('click', validateIP);
    document.getElementById('validateInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') validateIP();
    });
    document.getElementById('validateInput').addEventListener('input', validateIP);

    // Test endpoints
    document.querySelectorAll('.endpoint-item').forEach(item => {
        const endpoint = item.dataset.endpoint;
        const button = item.querySelector('.test-btn');
        button.addEventListener('click', () => testEndpoint(button, endpoint));
    });

    // Code tabs
    document.querySelectorAll('.code-tab').forEach(tab => {
        tab.addEventListener('click', () => updateCodeExample(tab.dataset.lang));
    });

    // Copy code
    document.getElementById('copyCodeBtn').addEventListener('click', () => {
        const code = document.getElementById('codeContent').textContent;
        copyToClipboard(code);
    });

    // Language selector
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });

    // Online/offline events
    window.addEventListener('online', () => {
        isOnline = true;
        updateStatusBadge('online');
        refreshIP();
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        updateStatusBadge('offline');
        document.getElementById('offlineNotice').style.display = 'flex';
    });
}

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('ServiceWorker registered:', registration.scope);
        } catch (error) {
            console.warn('ServiceWorker registration failed:', error);
        }
    }
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    // Load saved language
    const savedLang = loadFromStorage(CONFIG.storageKeys.lang);
    if (savedLang) {
        currentLang = savedLang;
    }

    // Setup UI
    setLanguage(currentLang);
    setupEventListeners();
    renderHistory();
    updateCodeExample('js');

    // Register service worker
    await registerServiceWorker();

    // Initial IP fetch
    updateStatusBadge('loading');

    // First, show cached IP if available
    const cached = getCachedIP();
    if (cached) {
        showResult(cached.ip, cached.timestamp, !isOnline || cached.isStale);
    }

    // Then try to refresh if online
    if (isOnline) {
        await refreshIP();
    } else {
        updateStatusBadge('offline');
        if (!cached) {
            showError(t('error_offline'));
        }
    }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
