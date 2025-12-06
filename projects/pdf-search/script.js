/**
 * PDF Search - Fulltextové vyhledávání v PDF souborech
 *
 * Využívá:
 * - pdf.js (Mozilla) pro extrakci textu z PDF v prohlížeči
 * - MiniSearch pro fulltextové vyhledávání s fuzzy matching
 *
 * 100% client-side - soubory nikdy neopouštějí zařízení
 */

// ============================================================================
// Překlady / Translations
// ============================================================================
const TRANSLATIONS = {
    cs: {
        title: 'PDF Search',
        subtitle: 'Fulltextové vyhledávání v PDF souborech',
        drop_title: 'Klikněte pro nahrání PDF',
        drop_subtitle: 'nebo přetáhněte soubory sem',
        drop_hint: 'Můžete nahrát více PDF souborů najednou',
        loading: 'Načítání...',
        extracting: 'Extrahování textu z PDF...',
        indexing: 'Indexování dokumentů...',
        loaded_files: 'Nahraná PDF',
        add_more: 'Přidat další',
        search_placeholder: 'Hledejte v dokumentech...',
        fuzzy_search: 'Fuzzy vyhledávání',
        prefix_search: 'Prefix matching',
        no_results: 'Nenalezeny žádné výsledky',
        results_count: '{count} výsledků',
        results_count_one: '1 výsledek',
        page: 'Stránka',
        pages: 'stránek',
        documents: 'dokumentů',
        indexed: 'zaindexováno',
        remove: 'Odebrat',
        clear_all: 'Odebrat vše',
        error_loading: 'Chyba při načítání PDF',
        error_password: 'PDF je chráněno heslem',
        match_context: 'Kontext',
        score: 'Skóre',
        file: 'Soubor'
    },
    en: {
        title: 'PDF Search',
        subtitle: 'Full-text search in PDF files',
        drop_title: 'Click to upload PDF',
        drop_subtitle: 'or drag and drop files here',
        drop_hint: 'You can upload multiple PDF files at once',
        loading: 'Loading...',
        extracting: 'Extracting text from PDF...',
        indexing: 'Indexing documents...',
        loaded_files: 'Loaded PDFs',
        add_more: 'Add more',
        search_placeholder: 'Search in documents...',
        fuzzy_search: 'Fuzzy search',
        prefix_search: 'Prefix matching',
        no_results: 'No results found',
        results_count: '{count} results',
        results_count_one: '1 result',
        page: 'Page',
        pages: 'pages',
        documents: 'documents',
        indexed: 'indexed',
        remove: 'Remove',
        clear_all: 'Remove all',
        error_loading: 'Error loading PDF',
        error_password: 'PDF is password protected',
        match_context: 'Context',
        score: 'Score',
        file: 'File'
    }
};

// ============================================================================
// Globální stav
// ============================================================================
let currentLang = 'cs';
let searchIndex = null;
let documents = [];     // Array dokumentů pro index
let pdfFiles = [];      // Metadata nahraných PDF souborů
let documentIdCounter = 0;

// ============================================================================
// Inicializace
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initLanguage();
    initEventListeners();
    initSearchIndex();
});

/**
 * Inicializace jazyka z localStorage nebo prohlížeče
 */
function initLanguage() {
    const savedLang = localStorage.getItem('adhub-pdf-search-lang');
    if (savedLang && TRANSLATIONS[savedLang]) {
        currentLang = savedLang;
    } else {
        const browserLang = navigator.language.slice(0, 2);
        currentLang = TRANSLATIONS[browserLang] ? browserLang : 'cs';
    }
    updateLanguage();
}

/**
 * Překlad klíče
 */
function t(key, replacements = {}) {
    let text = TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS.cs[key] || key;
    for (const [k, v] of Object.entries(replacements)) {
        text = text.replace(`{${k}}`, v);
    }
    return text;
}

/**
 * Aktualizace všech překladů na stránce
 */
function updateLanguage() {
    // Aktualizace tlačítek jazyků
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });

    // Aktualizace textů s data-i18n atributem
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    // Aktualizace placeholderů
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
}

/**
 * Inicializace event listenerů
 */
function initEventListeners() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const addMoreBtn = document.getElementById('addMoreBtn');
    const fuzzySearch = document.getElementById('fuzzySearch');
    const prefixSearch = document.getElementById('prefixSearch');

    // Přepínání jazyků
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentLang = btn.dataset.lang;
            localStorage.setItem('adhub-pdf-search-lang', currentLang);
            updateLanguage();
            updateStats();
        });
    });

    // Drop zone
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    // File input
    fileInput.addEventListener('change', handleFileSelect);

    // Add more button
    addMoreBtn.addEventListener('click', () => fileInput.click());

    // Search
    searchInput.addEventListener('input', debounce(performSearch, 150));
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        clearSearch.style.display = 'none';
        performSearch();
    });

    // Search options
    fuzzySearch.addEventListener('change', performSearch);
    prefixSearch.addEventListener('change', performSearch);
}

/**
 * Inicializace MiniSearch indexu
 */
function initSearchIndex() {
    searchIndex = new MiniSearch({
        fields: ['text'],           // Pole pro vyhledávání
        storeFields: ['text', 'pageNum', 'fileName', 'fileId'],  // Pole k uložení
        searchOptions: {
            boost: { text: 1 },
            fuzzy: 0.2,
            prefix: true
        },
        tokenize: (text) => {
            // Vlastní tokenizer pro lepší podporu češtiny
            return text.toLowerCase()
                .replace(/[^\p{L}\p{N}]+/gu, ' ')
                .split(/\s+/)
                .filter(t => t.length > 1);
        }
    });
}

// ============================================================================
// Zpracování souborů
// ============================================================================

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length > 0) {
        processFiles(files);
    }
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        processFiles(files);
    }
    e.target.value = ''; // Reset pro opakované nahrání
}

/**
 * Zpracování PDF souborů - extrakce textu a indexování
 */
async function processFiles(files) {
    showLoading(t('extracting'));

    const dropZone = document.getElementById('dropZone');
    const searchSection = document.getElementById('searchSection');

    for (const file of files) {
        try {
            // Přidání do seznamu souborů
            const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const pdfFile = {
                id: fileId,
                name: file.name,
                size: file.size,
                pageCount: 0,
                documentCount: 0
            };
            pdfFiles.push(pdfFile);

            // Extrakce textu z PDF
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            pdfFile.pageCount = pdf.numPages;

            // Extrahování textu z každé stránky
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const text = textContent.items.map(item => item.str).join(' ');

                if (text.trim()) {
                    const docId = ++documentIdCounter;
                    documents.push({
                        id: docId,
                        text: text,
                        pageNum: pageNum,
                        fileName: file.name,
                        fileId: fileId
                    });
                    pdfFile.documentCount++;
                }
            }

            updateStatus(`${file.name} - ${pdf.numPages} ${t('pages')}`);

        } catch (error) {
            console.error('Error processing PDF:', error);
            if (error.name === 'PasswordException') {
                updateStatus(`${file.name}: ${t('error_password')}`, 'error');
            } else {
                updateStatus(`${file.name}: ${t('error_loading')}`, 'error');
            }
        }
    }

    // Re-indexování všech dokumentů
    showLoading(t('indexing'));
    searchIndex.removeAll();
    searchIndex.addAll(documents);

    hideLoading();

    // Zobrazení search sekce
    if (pdfFiles.length > 0) {
        dropZone.style.display = 'none';
        searchSection.style.display = 'block';
        updateFileList();
        updateStats();
        document.getElementById('searchInput').focus();
    }
}

// ============================================================================
// Vyhledávání
// ============================================================================

/**
 * Provedení vyhledávání
 */
function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const clearBtn = document.getElementById('clearSearch');
    const noResults = document.getElementById('noResults');
    const resultsList = document.getElementById('resultsList');

    clearBtn.style.display = query ? 'flex' : 'none';

    if (!query) {
        resultsList.innerHTML = '';
        noResults.style.display = 'none';
        updateStats();
        return;
    }

    const fuzzyEnabled = document.getElementById('fuzzySearch').checked;
    const prefixEnabled = document.getElementById('prefixSearch').checked;

    const results = searchIndex.search(query, {
        fuzzy: fuzzyEnabled ? 0.2 : false,
        prefix: prefixEnabled,
        combineWith: 'AND'
    });

    if (results.length === 0) {
        resultsList.innerHTML = '';
        noResults.style.display = 'flex';
    } else {
        noResults.style.display = 'none';
        renderResults(results, query);
    }

    updateStats(results.length, query);
}

/**
 * Vykreslení výsledků vyhledávání
 */
function renderResults(results, query) {
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';

    // Omezení na prvních 100 výsledků pro výkon
    const limitedResults = results.slice(0, 100);

    for (const result of limitedResults) {
        const doc = documents.find(d => d.id === result.id);
        if (!doc) continue;

        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';

        // Zvýraznění hledaného textu v kontextu
        const context = getHighlightedContext(doc.text, query, 100);

        resultItem.innerHTML = `
            <div class="result-header">
                <span class="result-file">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    ${escapeHtml(doc.fileName)}
                </span>
                <span class="result-page">${t('page')} ${doc.pageNum}</span>
                <span class="result-score">${(result.score * 10).toFixed(1)}</span>
            </div>
            <div class="result-context">${context}</div>
        `;

        resultsList.appendChild(resultItem);
    }

    if (results.length > 100) {
        const moreInfo = document.createElement('div');
        moreInfo.className = 'more-results';
        moreInfo.textContent = `... a ${results.length - 100} dalších výsledků`;
        resultsList.appendChild(moreInfo);
    }
}

/**
 * Získání kontextu s zvýrazněním hledaného textu
 */
function getHighlightedContext(text, query, contextLength) {
    const lowerText = text.toLowerCase();
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);

    // Najít první výskyt některého z termínů
    let firstMatchIndex = -1;
    for (const term of queryTerms) {
        const idx = lowerText.indexOf(term);
        if (idx !== -1 && (firstMatchIndex === -1 || idx < firstMatchIndex)) {
            firstMatchIndex = idx;
        }
    }

    if (firstMatchIndex === -1) {
        // Žádná přesná shoda, vrátíme začátek textu
        return escapeHtml(text.slice(0, contextLength * 2)) + (text.length > contextLength * 2 ? '...' : '');
    }

    // Extrakce kontextu kolem první shody
    const start = Math.max(0, firstMatchIndex - contextLength);
    const end = Math.min(text.length, firstMatchIndex + contextLength);
    let context = text.slice(start, end);

    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    // Zvýraznění všech termínů
    let highlightedContext = escapeHtml(context);
    for (const term of queryTerms) {
        const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
        highlightedContext = highlightedContext.replace(regex, '<mark>$1</mark>');
    }

    return highlightedContext;
}

// ============================================================================
// UI Helpers
// ============================================================================

/**
 * Aktualizace seznamu souborů
 */
function updateFileList() {
    const fileItems = document.getElementById('fileItems');
    fileItems.innerHTML = '';

    for (const pdfFile of pdfFiles) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span class="file-name">${escapeHtml(pdfFile.name)}</span>
                <span class="file-meta">${pdfFile.pageCount} ${t('pages')}</span>
            </div>
            <button class="remove-file" data-id="${pdfFile.id}" title="${t('remove')}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;

        fileItem.querySelector('.remove-file').addEventListener('click', () => {
            removeFile(pdfFile.id);
        });

        fileItems.appendChild(fileItem);
    }
}

/**
 * Odebrání souboru
 */
function removeFile(fileId) {
    // Odstranění dokumentů z indexu
    const docsToRemove = documents.filter(d => d.fileId === fileId);
    for (const doc of docsToRemove) {
        searchIndex.remove(doc);
    }
    documents = documents.filter(d => d.fileId !== fileId);

    // Odstranění z pole souborů
    pdfFiles = pdfFiles.filter(f => f.id !== fileId);

    // Aktualizace UI
    if (pdfFiles.length === 0) {
        document.getElementById('dropZone').style.display = 'flex';
        document.getElementById('searchSection').style.display = 'none';
        document.getElementById('searchInput').value = '';
    } else {
        updateFileList();
        updateStats();
        performSearch();
    }
}

/**
 * Aktualizace statistik
 */
function updateStats(resultsCount = null, query = null) {
    const statsText = document.getElementById('statsText');

    if (query && resultsCount !== null) {
        if (resultsCount === 1) {
            statsText.textContent = t('results_count_one');
        } else {
            statsText.textContent = t('results_count', { count: resultsCount });
        }
    } else {
        const totalPages = pdfFiles.reduce((sum, f) => sum + f.pageCount, 0);
        statsText.textContent = `${pdfFiles.length} ${t('documents')}, ${totalPages} ${t('pages')} ${t('indexed')}`;
    }
}

/**
 * Aktualizace statusu
 */
function updateStatus(message, type = 'info') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;

    if (type !== 'error') {
        setTimeout(() => {
            status.textContent = '';
        }, 3000);
    }
}

/**
 * Zobrazení loading indikátoru
 */
function showLoading(message) {
    const container = document.getElementById('loadingContainer');
    const text = document.getElementById('loadingText');
    text.textContent = message || t('loading');
    container.style.display = 'flex';
}

/**
 * Skrytí loading indikátoru
 */
function hideLoading() {
    document.getElementById('loadingContainer').style.display = 'none';
}

// ============================================================================
// Utility funkce
// ============================================================================

/**
 * Debounce funkce
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Escape HTML pro bezpečné zobrazení
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escape speciálních znaků pro regex
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
