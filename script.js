// Jednoduchý skript pro zobrazení nástrojů a odkazů
let allTools = [];
let allLinks = [];
let currentFilter = 'all';
let currentCategory = null;
let searchQuery = '';

// Výchozí konfigurace - lze upravit přímo zde
const DEFAULT_CONFIG = {
  "tools": [
    {
      "id": "example-tool",
      "name": "Příklad nástroje",
      "description": "Popis nástroje",
      "category": "tools",
      "icon": "🔧",
      "url": "http://localhost:3000",
      "enabled": true,
      "tags": ["example", "tool"]
    }
  ],
  "links": [
    {
      "id": "example-link",
      "name": "Příklad odkazu",
      "description": "Popis odkazu",
      "category": "links",
      "icon": "🔗",
      "url": "https://example.com",
      "type": "external",
      "tags": ["example", "link"]
    }
  ]
};

// Použití výchozí konfigurace
function useDefaultConfig() {
    allTools = DEFAULT_CONFIG.tools || [];
    allLinks = DEFAULT_CONFIG.links || [];
    updateStatus(`Načteno ${allTools.length} nástrojů, ${allLinks.length} odkazů`, true);
    renderTools();
    updateCategoryFilters();
}

// Aktualizace status baru
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

// Vyhledávání a filtrování
function filterItems() {
    const items = [...allTools, ...allLinks];
    
    let filtered = items;
    
    // Filtrování podle typu (tools/links)
    if (currentFilter === 'tools') {
        filtered = allTools;
    } else if (currentFilter === 'links') {
        filtered = allLinks;
    }
    
    // Filtrování podle kategorie
    if (currentCategory) {
        filtered = filtered.filter(item => item.category === currentCategory);
    }
    
    // Vyhledávání
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

// Vykreslení nástrojů
function renderTools() {
    const grid = document.getElementById('toolsGrid');
    const emptyState = document.getElementById('emptyState');
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
        if (item.helperPort !== undefined || item.serverPort !== undefined) {
            // Je to nástroj (server)
            return createToolCard(item);
        } else {
            // Je to odkaz
            return createLinkCard(item);
        }
    }).join('');
}

// Vytvoření karty nástroje
function createToolCard(tool) {
    return `
        <div class="tool-card server" data-id="${tool.id}" data-type="tool">
            <div class="tool-header">
                <div class="tool-title">
                    <span class="tool-icon">${tool.icon || '🔧'}</span>
                    <span class="tool-name">${escapeHtml(tool.name)}</span>
                </div>
                <span class="tool-status stopped">Zastaveno</span>
            </div>
            <p class="tool-description">${escapeHtml(tool.description || 'Bez popisu')}</p>
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
                    <button class="btn btn-primary" onclick="openTool('${tool.url}')" title="Otevřít">
                        🔗 Otevřít
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Vytvoření karty odkazu
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
            <p class="tool-description">${escapeHtml(link.description || 'Bez popisu')}</p>
            <div class="tool-meta">
                <span class="tool-category">${escapeHtml(link.category || 'other')}</span>
                ${link.tags && link.tags.length > 0 ? `
                    <div class="tool-tags">
                        ${link.tags.slice(0, 5).map(tag => `<span class="tool-tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="tool-actions">
                <button class="btn btn-primary" onclick="openLink('${url}')" title="Otevřít">
                    🔗 Otevřít
                </button>
            </div>
        </div>
    `;
}

// Otevření nástroje
function openTool(url) {
    window.open(url, '_blank');
}

// Otevření odkazu
function openLink(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
    } else {
        window.location.href = url;
    }
}

// Aktualizace kategorií ve filtrech
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
    
    // Event listenery pro kategorie
    container.querySelectorAll('.category-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            
            // Toggle aktivní kategorie
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

// Inicializace
document.addEventListener('DOMContentLoaded', () => {
    // Vyhledávání
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderTools();
        });
    }
    
    // Filtry podle typu
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderTools();
        });
    });
    
    // Tlačítko obnovit
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            useDefaultConfig();
        });
    }
    
    // Skrýt tlačítko spustit server a varování
    const startServerBtn = document.getElementById('startServerBtn');
    const fileWarning = document.getElementById('fileProtocolWarning');
    if (startServerBtn) startServerBtn.style.display = 'none';
    if (fileWarning) fileWarning.style.display = 'none';
    
    // Načíst data při startu
    useDefaultConfig();
});

// Export funkcí pro globální použití
window.openTool = openTool;
window.openLink = openLink;
