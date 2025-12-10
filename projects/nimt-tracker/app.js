/**
 * AI Visibility Tracker - Main Application
 *
 * Offline-first PWA for tracking brand visibility in AI search engines
 * Inspired by NIMT.AI functionality, adapted for AdHub design
 */

// AI Models configuration
const AI_MODELS = {
    chatgpt: { name: 'ChatGPT', icon: '🤖', color: '#10a37f' },
    perplexity: { name: 'Perplexity', icon: '🔍', color: '#20b2aa' },
    gemini: { name: 'Gemini', icon: '💫', color: '#4285f4' },
    claude: { name: 'Claude', icon: '🧠', color: '#cc785c' },
    'google-ai': { name: 'Google AI', icon: '🔮', color: '#ea4335' }
};

// Source types configuration
const SOURCE_TYPES = {
    editorial: { name: 'Editoriální média', icon: '📰' },
    'own-web': { name: 'Vlastní web', icon: '🌐' },
    reviews: { name: 'Recenze & Fóra', icon: '💬' },
    other: { name: 'Ostatní', icon: '📄' }
};

// Application state
let currentTab = 'dashboard';
let charts = {};
let deleteCallback = null;

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize database
        await db.init();
        console.log('Database ready');

        // Initialize UI
        initNavigation();
        initModals();
        initForms();
        initTheme();
        initExportImport();

        // Load initial data
        await refreshDashboard();
        await loadBrands();
        await loadPrompts();
        await loadSources();
        await loadCompetitors();

        // Register Service Worker
        registerServiceWorker();

        showToast('Aplikace připravena', 'success');
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Chyba při inicializaci: ' + error.message, 'error');
    }
});

// =============================================
// NAVIGATION
// =============================================

function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            switchTab(targetTab);
        });
    });
}

function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });

    currentTab = tabName;

    // Refresh charts when switching to dashboard
    if (tabName === 'dashboard') {
        refreshDashboard();
    }
}

// =============================================
// MODALS
// =============================================

function initModals() {
    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay.id);
            }
        });
    });

    // Close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) closeModal(modal.id);
        });
    });

    // Add buttons
    document.getElementById('addBrandBtn').addEventListener('click', () => openBrandModal());
    document.getElementById('addPromptBtn').addEventListener('click', () => openPromptModal());
    document.getElementById('addSourceBtn').addEventListener('click', () => openSourceModal());
    document.getElementById('addCompetitorBtn').addEventListener('click', () => openCompetitorModal());

    // Confirm delete
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        if (deleteCallback) {
            await deleteCallback();
            deleteCallback = null;
        }
        closeModal('confirmModal');
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function confirmDelete(message, callback) {
    document.getElementById('confirmMessage').textContent = message;
    deleteCallback = callback;
    openModal('confirmModal');
}

// =============================================
// FORMS
// =============================================

function initForms() {
    // Brand form
    document.getElementById('brandForm').addEventListener('submit', handleBrandSubmit);

    // Prompt form
    document.getElementById('promptForm').addEventListener('submit', handlePromptSubmit);

    // Source form
    document.getElementById('sourceForm').addEventListener('submit', handleSourceSubmit);

    // Competitor form
    document.getElementById('competitorForm').addEventListener('submit', handleCompetitorSubmit);

    // Prompt generator
    document.getElementById('generatePromptsBtn').addEventListener('click', generatePrompts);
}

// =============================================
// BRAND MANAGEMENT
// =============================================

function openBrandModal(brand = null) {
    const isEdit = brand !== null;
    document.getElementById('brandModalTitle').textContent = isEdit ? 'Upravit značku' : 'Přidat značku';
    document.getElementById('brandId').value = brand?.id || '';
    document.getElementById('brandName').value = brand?.name || '';
    document.getElementById('brandUrl').value = brand?.url || '';
    document.getElementById('brandKeywords').value = brand?.keywords?.join(', ') || '';
    document.getElementById('brandIsPrimary').checked = brand?.isPrimary || false;
    openModal('brandModal');
}

async function handleBrandSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('brandId').value;
    const brand = {
        name: document.getElementById('brandName').value.trim(),
        url: document.getElementById('brandUrl').value.trim(),
        keywords: document.getElementById('brandKeywords').value
            .split(',')
            .map(k => k.trim())
            .filter(k => k),
        isPrimary: document.getElementById('brandIsPrimary').checked
    };

    try {
        if (id) {
            brand.id = parseInt(id);
            await db.updateBrand(brand);
            showToast('Značka aktualizována', 'success');
        } else {
            await db.addBrand(brand);
            showToast('Značka přidána', 'success');
        }

        closeModal('brandModal');
        await loadBrands();
        await refreshDashboard();
        await updateBrandSelects();
    } catch (error) {
        showToast('Chyba: ' + error.message, 'error');
    }
}

async function loadBrands() {
    const brands = await db.getAllBrands();
    const grid = document.getElementById('brandsGrid');

    if (brands.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏷️</div>
                <p class="empty-title">Žádné značky</p>
                <p class="empty-text">Přidejte značku pro začátek sledování</p>
            </div>
        `;
        return;
    }

    // Get prompts for each brand
    const prompts = await db.getAllPrompts();

    grid.innerHTML = brands.map(brand => {
        const brandPrompts = prompts.filter(p => p.brandId === brand.id);
        const mentions = brandPrompts.filter(p => p.mentioned).length;

        return `
            <div class="brand-card ${brand.isPrimary ? 'primary' : ''}" data-id="${brand.id}">
                <div class="brand-actions">
                    <button class="btn-icon-small" onclick="openBrandModal(${JSON.stringify(brand).replace(/"/g, '&quot;')})" title="Upravit">✏️</button>
                    <button class="btn-icon-small danger" onclick="deleteBrand(${brand.id})" title="Smazat">🗑️</button>
                </div>
                <div class="brand-header">
                    <span class="brand-name">${escapeHtml(brand.name)}</span>
                    ${brand.isPrimary ? '<span class="brand-badge">Moje značka</span>' : ''}
                </div>
                ${brand.url ? `<a href="${escapeHtml(brand.url)}" class="brand-url" target="_blank">${escapeHtml(brand.url)}</a>` : ''}
                <div class="brand-keywords">
                    ${brand.keywords?.map(k => `<span class="keyword-tag">${escapeHtml(k)}</span>`).join('') || ''}
                </div>
                <div class="brand-stats">
                    <div class="brand-stat">
                        <span class="brand-stat-value">${brandPrompts.length}</span>
                        <span class="brand-stat-label">Promptů</span>
                    </div>
                    <div class="brand-stat">
                        <span class="brand-stat-value">${mentions}</span>
                        <span class="brand-stat-label">Zmínek</span>
                    </div>
                    <div class="brand-stat">
                        <span class="brand-stat-value">${brandPrompts.length > 0 ? Math.round((mentions / brandPrompts.length) * 100) : 0}%</span>
                        <span class="brand-stat-label">Úspěšnost</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteBrand(id) {
    confirmDelete('Opravdu chcete smazat tuto značku?', async () => {
        try {
            await db.deleteBrand(id);
            showToast('Značka smazána', 'success');
            await loadBrands();
            await refreshDashboard();
            await updateBrandSelects();
        } catch (error) {
            showToast('Chyba: ' + error.message, 'error');
        }
    });
}

async function updateBrandSelects() {
    const brands = await db.getAllBrands();
    const selects = ['promptBrand', 'sourceBrand'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentValue = select.value;
        const isOptional = selectId === 'sourceBrand';

        select.innerHTML = `
            ${isOptional ? '<option value="">Obecný zdroj</option>' : '<option value="">Vyberte značku</option>'}
            ${brands.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('')}
        `;

        if (currentValue) select.value = currentValue;
    });
}

// =============================================
// PROMPT MANAGEMENT
// =============================================

function openPromptModal(prompt = null) {
    const isEdit = prompt !== null;
    document.getElementById('promptModalTitle').textContent = isEdit ? 'Upravit prompt' : 'Přidat prompt';
    document.getElementById('promptId').value = prompt?.id || '';
    document.getElementById('promptText').value = prompt?.text || '';
    document.getElementById('promptBrand').value = prompt?.brandId || '';
    document.getElementById('promptAiModel').value = prompt?.aiModel || 'chatgpt';
    document.getElementById('promptMentioned').checked = prompt?.mentioned || false;
    document.getElementById('promptCited').checked = prompt?.cited || false;
    document.getElementById('promptRecommended').checked = prompt?.recommended || false;
    document.getElementById('promptNotes').value = prompt?.notes || '';

    updateBrandSelects();
    openModal('promptModal');
}

async function handlePromptSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('promptId').value;
    const prompt = {
        text: document.getElementById('promptText').value.trim(),
        brandId: parseInt(document.getElementById('promptBrand').value),
        aiModel: document.getElementById('promptAiModel').value,
        mentioned: document.getElementById('promptMentioned').checked,
        cited: document.getElementById('promptCited').checked,
        recommended: document.getElementById('promptRecommended').checked,
        notes: document.getElementById('promptNotes').value.trim()
    };

    try {
        if (id) {
            prompt.id = parseInt(id);
            await db.updatePrompt(prompt);
            showToast('Prompt aktualizován', 'success');
        } else {
            await db.addPrompt(prompt);
            showToast('Prompt přidán', 'success');
        }

        closeModal('promptModal');
        await loadPrompts();
        await loadBrands();
        await refreshDashboard();
    } catch (error) {
        showToast('Chyba: ' + error.message, 'error');
    }
}

async function loadPrompts() {
    const prompts = await db.getAllPrompts();
    const brands = await db.getAllBrands();
    const brandMap = Object.fromEntries(brands.map(b => [b.id, b]));
    const section = document.getElementById('promptsListSection');

    if (prompts.length === 0) {
        section.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💬</div>
                <p class="empty-title">Žádné prompty</p>
                <p class="empty-text">Přidejte prompt nebo použijte generátor</p>
            </div>
        `;
        return;
    }

    section.innerHTML = prompts.map(prompt => {
        const brand = brandMap[prompt.brandId];
        const aiModel = AI_MODELS[prompt.aiModel] || { name: prompt.aiModel, icon: '🤖' };

        return `
            <div class="prompt-card" data-id="${prompt.id}">
                <div class="prompt-actions">
                    <button class="btn-icon-small" onclick="openPromptModal(${JSON.stringify(prompt).replace(/"/g, '&quot;')})" title="Upravit">✏️</button>
                    <button class="btn-icon-small danger" onclick="deletePrompt(${prompt.id})" title="Smazat">🗑️</button>
                </div>
                <p class="prompt-text">${escapeHtml(prompt.text)}</p>
                <div class="prompt-meta">
                    <span class="prompt-tag ai-model">${aiModel.icon} ${aiModel.name}</span>
                    ${brand ? `<span class="prompt-tag brand">🏷️ ${escapeHtml(brand.name)}</span>` : ''}
                </div>
                <div class="prompt-results">
                    <span class="result-badge ${prompt.mentioned ? 'positive' : 'negative'}">
                        ${prompt.mentioned ? '✓' : '✗'} Zmíněno
                    </span>
                    <span class="result-badge ${prompt.cited ? 'positive' : 'negative'}">
                        ${prompt.cited ? '✓' : '✗'} Citováno
                    </span>
                    <span class="result-badge ${prompt.recommended ? 'positive' : 'negative'}">
                        ${prompt.recommended ? '✓' : '✗'} Doporučeno
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

async function deletePrompt(id) {
    confirmDelete('Opravdu chcete smazat tento prompt?', async () => {
        try {
            await db.deletePrompt(id);
            showToast('Prompt smazán', 'success');
            await loadPrompts();
            await loadBrands();
            await refreshDashboard();
        } catch (error) {
            showToast('Chyba: ' + error.message, 'error');
        }
    });
}

// =============================================
// PROMPT GENERATOR
// =============================================

function generatePrompts() {
    const url = document.getElementById('generateUrlInput').value.trim();

    if (!url) {
        showToast('Zadejte URL webu', 'warning');
        return;
    }

    // Extract domain for prompts
    let domain;
    try {
        domain = new URL(url).hostname.replace('www.', '');
    } catch {
        showToast('Neplatná URL', 'error');
        return;
    }

    // Generate prompts based on domain
    const prompts = [
        `What is ${domain}?`,
        `Is ${domain} a good choice for [category]?`,
        `What are the alternatives to ${domain}?`,
        `${domain} review - is it worth it?`,
        `Best ${domain} competitors`,
        `How does ${domain} compare to [competitor]?`,
        `What do people say about ${domain}?`,
        `Is ${domain} reliable and trustworthy?`,
        `${domain} pros and cons`,
        `Should I use ${domain}?`
    ];

    // Display generated prompts
    const container = document.getElementById('generatedPrompts');
    const list = document.getElementById('generatedPromptsList');

    list.innerHTML = prompts.map((prompt, index) => `
        <div class="generated-prompt-item" style="display: flex; gap: 12px; align-items: center; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px;">
            <span style="flex: 1; color: var(--text-primary);">${escapeHtml(prompt)}</span>
            <button class="btn btn-small btn-secondary" onclick="useGeneratedPrompt('${escapeHtml(prompt)}')">Použít</button>
        </div>
    `).join('');

    container.style.display = 'block';
    showToast(`Vygenerováno ${prompts.length} promptů`, 'success');
}

async function useGeneratedPrompt(text) {
    document.getElementById('promptText').value = text;
    await updateBrandSelects();
    openModal('promptModal');
}

// Make function globally accessible
window.useGeneratedPrompt = useGeneratedPrompt;

// =============================================
// SOURCE MANAGEMENT
// =============================================

function openSourceModal(source = null) {
    const isEdit = source !== null;
    document.getElementById('sourceModalTitle').textContent = isEdit ? 'Upravit zdroj' : 'Přidat zdroj';
    document.getElementById('sourceId').value = source?.id || '';
    document.getElementById('sourceName').value = source?.name || '';
    document.getElementById('sourceUrl').value = source?.url || '';
    document.getElementById('sourceType').value = source?.type || 'editorial';
    document.getElementById('sourceBrand').value = source?.brandId || '';
    document.getElementById('sourceCitations').value = source?.citations || 1;

    updateBrandSelects();
    openModal('sourceModal');
}

async function handleSourceSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('sourceId').value;
    const source = {
        name: document.getElementById('sourceName').value.trim(),
        url: document.getElementById('sourceUrl').value.trim(),
        type: document.getElementById('sourceType').value,
        brandId: document.getElementById('sourceBrand').value ? parseInt(document.getElementById('sourceBrand').value) : null,
        citations: parseInt(document.getElementById('sourceCitations').value) || 1
    };

    try {
        if (id) {
            source.id = parseInt(id);
            await db.updateSource(source);
            showToast('Zdroj aktualizován', 'success');
        } else {
            await db.addSource(source);
            showToast('Zdroj přidán', 'success');
        }

        closeModal('sourceModal');
        await loadSources();
        await refreshDashboard();
    } catch (error) {
        showToast('Chyba: ' + error.message, 'error');
    }
}

async function loadSources() {
    const sources = await db.getAllSources();
    const stats = await db.getSourceStats();
    const grid = document.getElementById('sourcesGrid');

    // Update stats bars
    const types = ['editorial', 'own-web', 'reviews', 'other'];
    types.forEach(type => {
        const percent = stats.total > 0 ? Math.round((stats[type] / stats.total) * 100) : 0;
        const fillEl = document.getElementById(`${type.replace('-', '')}Fill`) ||
                       document.getElementById(`${type}Fill`);
        const percentEl = document.getElementById(`${type.replace('-', '')}Percent`) ||
                          document.getElementById(`${type}Percent`);

        if (fillEl) fillEl.style.width = `${percent}%`;
        if (percentEl) percentEl.textContent = `${percent}%`;
    });

    if (sources.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔗</div>
                <p class="empty-title">Žádné zdroje</p>
                <p class="empty-text">Přidejte zdroje citací z AI odpovědí</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = sources.map(source => {
        const typeInfo = SOURCE_TYPES[source.type] || { name: source.type, icon: '📄' };

        return `
            <div class="source-card" data-id="${source.id}">
                <div class="source-header">
                    <span class="source-name">${escapeHtml(source.name)}</span>
                    <span class="source-type-badge ${source.type}">${typeInfo.name}</span>
                </div>
                <a href="${escapeHtml(source.url)}" class="source-url" target="_blank">${escapeHtml(source.url)}</a>
                <div class="source-footer">
                    <span class="source-citations"><strong>${source.citations || 1}</strong> citací</span>
                    <div class="source-actions">
                        <button class="btn-icon-small" onclick="openSourceModal(${JSON.stringify(source).replace(/"/g, '&quot;')})" title="Upravit">✏️</button>
                        <button class="btn-icon-small danger" onclick="deleteSource(${source.id})" title="Smazat">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteSource(id) {
    confirmDelete('Opravdu chcete smazat tento zdroj?', async () => {
        try {
            await db.deleteSource(id);
            showToast('Zdroj smazán', 'success');
            await loadSources();
            await refreshDashboard();
        } catch (error) {
            showToast('Chyba: ' + error.message, 'error');
        }
    });
}

// =============================================
// COMPETITOR MANAGEMENT
// =============================================

function openCompetitorModal(competitor = null) {
    const isEdit = competitor !== null;
    document.getElementById('competitorModalTitle').textContent = isEdit ? 'Upravit konkurenta' : 'Přidat konkurenta';
    document.getElementById('competitorId').value = competitor?.id || '';
    document.getElementById('competitorName').value = competitor?.name || '';
    document.getElementById('competitorUrl').value = competitor?.url || '';
    document.getElementById('competitorMentions').value = competitor?.mentions || 0;
    document.getElementById('competitorSov').value = competitor?.sov || 0;
    openModal('competitorModal');
}

async function handleCompetitorSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('competitorId').value;
    const competitor = {
        name: document.getElementById('competitorName').value.trim(),
        url: document.getElementById('competitorUrl').value.trim(),
        mentions: parseInt(document.getElementById('competitorMentions').value) || 0,
        sov: parseInt(document.getElementById('competitorSov').value) || 0
    };

    try {
        if (id) {
            competitor.id = parseInt(id);
            await db.updateCompetitor(competitor);
            showToast('Konkurent aktualizován', 'success');
        } else {
            await db.addCompetitor(competitor);
            showToast('Konkurent přidán', 'success');
        }

        closeModal('competitorModal');
        await loadCompetitors();
        await refreshDashboard();
    } catch (error) {
        showToast('Chyba: ' + error.message, 'error');
    }
}

async function loadCompetitors() {
    const competitors = await db.getAllCompetitors();
    const grid = document.getElementById('competitorsGrid');

    // Update SoV chart
    updateSovChart(competitors);

    if (competitors.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚔️</div>
                <p class="empty-title">Žádní konkurenti</p>
                <p class="empty-text">Přidejte konkurenty pro srovnání</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = competitors.map(competitor => `
        <div class="competitor-card" data-id="${competitor.id}">
            <div class="competitor-actions">
                <button class="btn-icon-small" onclick="openCompetitorModal(${JSON.stringify(competitor).replace(/"/g, '&quot;')})" title="Upravit">✏️</button>
                <button class="btn-icon-small danger" onclick="deleteCompetitor(${competitor.id})" title="Smazat">🗑️</button>
            </div>
            <div class="competitor-header">
                <div class="competitor-avatar">⚔️</div>
                <div class="competitor-info">
                    <h4>${escapeHtml(competitor.name)}</h4>
                    ${competitor.url ? `<a href="${escapeHtml(competitor.url)}" target="_blank">${escapeHtml(competitor.url)}</a>` : ''}
                </div>
            </div>
            <div class="competitor-stats">
                <div class="competitor-stat">
                    <span class="competitor-stat-value">${competitor.mentions || 0}</span>
                    <span class="competitor-stat-label">Zmínek</span>
                </div>
                <div class="competitor-stat">
                    <span class="competitor-stat-value">${competitor.sov || 0}%</span>
                    <span class="competitor-stat-label">SoV</span>
                </div>
            </div>
        </div>
    `).join('');
}

async function deleteCompetitor(id) {
    confirmDelete('Opravdu chcete smazat tohoto konkurenta?', async () => {
        try {
            await db.deleteCompetitor(id);
            showToast('Konkurent smazán', 'success');
            await loadCompetitors();
            await refreshDashboard();
        } catch (error) {
            showToast('Chyba: ' + error.message, 'error');
        }
    });
}

// =============================================
// DASHBOARD & CHARTS
// =============================================

async function refreshDashboard() {
    try {
        const stats = await db.getOverviewStats();

        // Update stat cards
        document.getElementById('totalMentions').textContent = stats.totalMentions;
        document.getElementById('shareOfVoice').textContent = stats.shareOfVoice + '%';
        document.getElementById('totalSources').textContent = stats.totalSources;
        document.getElementById('totalPrompts').textContent = stats.totalPrompts;

        // Update charts
        await updateAiModelsChart();
        await updateTrendChart();
        await updateSourceDistribution();
        await updateActivityList();
    } catch (error) {
        console.error('Dashboard refresh error:', error);
    }
}

async function updateAiModelsChart() {
    const stats = await db.getAiModelStats();
    const ctx = document.getElementById('aiModelsChart');

    if (!ctx) return;

    const labels = [];
    const mentioned = [];
    const total = [];
    const colors = [];

    Object.entries(stats).forEach(([model, data]) => {
        const modelInfo = AI_MODELS[model] || { name: model, color: '#888' };
        labels.push(modelInfo.name);
        mentioned.push(data.mentioned);
        total.push(data.total - data.mentioned);
        colors.push(modelInfo.color);
    });

    // Destroy existing chart if exists
    if (charts.aiModels) {
        charts.aiModels.destroy();
    }

    if (labels.length === 0) {
        ctx.parentElement.innerHTML = '<div class="chart-fallback">Zatím žádná data o AI modelech</div>';
        return;
    }

    charts.aiModels = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Zmíněno',
                    data: mentioned,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Nezmíněno',
                    data: total,
                    backgroundColor: 'rgba(107, 107, 125, 0.5)',
                    borderColor: 'rgba(107, 107, 125, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#a0a0b0' }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: 'rgba(42, 42, 58, 0.5)' },
                    ticks: { color: '#a0a0b0' }
                },
                y: {
                    stacked: true,
                    grid: { color: 'rgba(42, 42, 58, 0.5)' },
                    ticks: { color: '#a0a0b0' }
                }
            }
        }
    });
}

async function updateTrendChart() {
    const trendData = await db.getTrendData(30);
    const ctx = document.getElementById('trendChart');

    if (!ctx) return;

    const dates = Object.keys(trendData).sort();
    const mentionsData = dates.map(d => trendData[d].mentions);
    const totalData = dates.map(d => trendData[d].total);

    // Destroy existing chart if exists
    if (charts.trend) {
        charts.trend.destroy();
    }

    if (dates.length === 0) {
        ctx.parentElement.innerHTML = '<div class="chart-fallback">Zatím žádná data o trendech</div>';
        return;
    }

    charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(d => {
                const date = new Date(d);
                return `${date.getDate()}.${date.getMonth() + 1}`;
            }),
            datasets: [
                {
                    label: 'Zmínky',
                    data: mentionsData,
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Celkem promptů',
                    data: totalData,
                    borderColor: 'rgba(139, 92, 246, 1)',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#a0a0b0' }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(42, 42, 58, 0.5)' },
                    ticks: { color: '#a0a0b0' }
                },
                y: {
                    grid: { color: 'rgba(42, 42, 58, 0.5)' },
                    ticks: { color: '#a0a0b0' }
                }
            }
        }
    });
}

async function updateSovChart(competitors) {
    const ctx = document.getElementById('sovChart');
    if (!ctx) return;

    // Destroy existing chart if exists
    if (charts.sov) {
        charts.sov.destroy();
    }

    // Get primary brand stats
    const primaryBrand = await db.getPrimaryBrand();
    const prompts = primaryBrand ? await db.getPromptsByBrand(primaryBrand.id) : [];
    const myMentions = prompts.filter(p => p.mentioned).length;

    const labels = [];
    const data = [];
    const colors = ['rgba(16, 185, 129, 0.8)'];
    const borderColors = ['rgba(16, 185, 129, 1)'];

    // Add primary brand
    if (primaryBrand) {
        labels.push(primaryBrand.name + ' (Vy)');
        data.push(myMentions);
    }

    // Add competitors
    competitors.forEach((c, i) => {
        labels.push(c.name);
        data.push(c.mentions || 0);
        const hue = (i * 60 + 240) % 360;
        colors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
        borderColors.push(`hsla(${hue}, 70%, 60%, 1)`);
    });

    if (labels.length === 0) {
        ctx.parentElement.innerHTML = '<div class="chart-fallback">Přidejte značku a konkurenty pro zobrazení grafu</div>';
        return;
    }

    charts.sov = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#a0a0b0' }
                }
            }
        }
    });
}

async function updateSourceDistribution() {
    const stats = await db.getSourceStats();
    const container = document.getElementById('sourceDistribution');

    if (stats.total === 0) {
        container.innerHTML = `
            <div class="empty-state small">
                <p>Zatím žádná data. Přidejte zdroje v sekci "Zdroje".</p>
            </div>
        `;
        return;
    }

    const types = [
        { key: 'editorial', class: 'editorial' },
        { key: 'own-web', class: 'own-web' },
        { key: 'reviews', class: 'reviews' },
        { key: 'other', class: 'other' }
    ];

    container.innerHTML = types.map(type => {
        const info = SOURCE_TYPES[type.key];
        const value = stats[type.key] || 0;
        const percent = Math.round((value / stats.total) * 100);

        return `
            <div class="source-bar">
                <span class="source-bar-label">${info.icon} ${info.name}</span>
                <div class="source-bar-track">
                    <div class="source-bar-fill ${type.class}" style="width: ${percent}%"></div>
                </div>
                <span class="source-bar-value">${percent}%</span>
            </div>
        `;
    }).join('');
}

async function updateActivityList() {
    const activities = await db.getRecentActivity(10);
    const container = document.getElementById('activityList');

    if (activities.length === 0) {
        container.innerHTML = `
            <div class="empty-state small">
                <p>Zatím žádná aktivita.</p>
            </div>
        `;
        return;
    }

    const icons = {
        brand_add: '🏷️',
        brand_update: '✏️',
        brand_delete: '🗑️',
        prompt_add: '💬',
        prompt_update: '✏️',
        prompt_delete: '🗑️',
        source_add: '🔗',
        source_update: '✏️',
        source_delete: '🗑️',
        competitor_add: '⚔️',
        competitor_update: '✏️',
        competitor_delete: '🗑️',
        import: '📥',
        export: '📤'
    };

    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <span class="activity-icon">${icons[activity.type] || '📌'}</span>
            <div class="activity-content">
                <span class="activity-text">${escapeHtml(activity.message)}</span>
                <span class="activity-time">${formatRelativeTime(activity.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

// =============================================
// THEME TOGGLE
// =============================================

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    document.getElementById('themeToggle').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = current === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    document.getElementById('themeIcon').textContent = theme === 'dark' ? '🌙' : '☀️';
}

// =============================================
// EXPORT & IMPORT
// =============================================

function initExportImport() {
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', importData);
}

async function exportData() {
    try {
        const data = await db.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-visibility-tracker-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        await db.logActivity('export', 'Data exportována');
        showToast('Data exportována', 'success');
    } catch (error) {
        showToast('Chyba při exportu: ' + error.message, 'error');
    }
}

async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        await db.importData(data);

        // Refresh all views
        await loadBrands();
        await loadPrompts();
        await loadSources();
        await loadCompetitors();
        await refreshDashboard();

        showToast('Data úspěšně importována', 'success');
    } catch (error) {
        showToast('Chyba při importu: ' + error.message, 'error');
    }

    // Reset input
    e.target.value = '';
}

// =============================================
// SERVICE WORKER
// =============================================

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration.scope);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
}

// =============================================
// UTILITIES
// =============================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Právě teď';
    if (minutes < 60) return `Před ${minutes} min`;
    if (hours < 24) return `Před ${hours} hod`;
    if (days < 7) return `Před ${days} dny`;

    return new Date(timestamp).toLocaleDateString('cs-CZ');
}

// Make functions globally accessible for inline handlers
window.openBrandModal = openBrandModal;
window.deleteBrand = deleteBrand;
window.openPromptModal = openPromptModal;
window.deletePrompt = deletePrompt;
window.openSourceModal = openSourceModal;
window.deleteSource = deleteSource;
window.openCompetitorModal = openCompetitorModal;
window.deleteCompetitor = deleteCompetitor;
