/**
 * WelcomeScreen - Landing page with project browsing, tags, and filtering
 * Loads projects from IndexedDB via StorageManager
 */

import { StorageManager } from '../utils/StorageManager.js';

// Project profile types
const PROJECT_PROFILES = {
    DIGITAL: 'digital',
    VECTOR: 'vector',
    PIXEL_ART: 'pixelart'
};

// Default configurations for each profile
const PROFILE_CONFIGS = {
    [PROJECT_PROFILES.DIGITAL]: {
        name: 'Digitální malba',
        description: 'Klasické pixelové kreslení s vrstvami, štětci a efekty',
        icon: 'brush',
        badge: { bg: '#3b82f6', text: 'Digitální' },
        defaults: {
            width: 1920,
            height: 1080,
            backgroundColor: '#ffffff',
            pixelArtMode: false,
            dpi: 300
        },
        presets: [
            { name: 'HD (1920×1080)', width: 1920, height: 1080 },
            { name: '4K (3840×2160)', width: 3840, height: 2160 },
            { name: 'A4 300 DPI', width: 2480, height: 3508 },
            { name: 'Instagram (1080×1080)', width: 1080, height: 1080 },
            { name: 'YouTube Thumbnail', width: 1280, height: 720 }
        ]
    },
    [PROJECT_PROFILES.VECTOR]: {
        name: 'Vektorové prostředí',
        description: 'SVG grafika s plynulým zoomem, export do SVG a PNG',
        icon: 'vector',
        badge: { bg: '#8b5cf6', text: 'Vektor' },
        defaults: {
            width: 1920,
            height: 1080,
            backgroundColor: '#ffffff',
            pixelArtMode: false,
            vectorMode: true
        },
        presets: [
            { name: 'Logo (512×512)', width: 512, height: 512 },
            { name: 'Icon (256×256)', width: 256, height: 256 },
            { name: 'Banner (1200×630)', width: 1200, height: 630 },
            { name: 'HD (1920×1080)', width: 1920, height: 1080 },
            { name: 'A4 Portrait', width: 2480, height: 3508 },
            { name: 'A4 Landscape', width: 3508, height: 2480 }
        ]
    },
    [PROJECT_PROFILES.PIXEL_ART]: {
        name: 'Pixel Art',
        description: 'Optimalizováno pro pixel art s mřížkou a speciálními nástroji',
        icon: 'pixelart',
        badge: { bg: '#22c55e', text: 'Pixel Art' },
        defaults: {
            width: 64,
            height: 64,
            backgroundColor: 'transparent',
            pixelArtMode: true,
            gridSize: 16
        },
        presets: [
            { name: 'Sprite 16×16', width: 16, height: 16 },
            { name: 'Sprite 32×32', width: 32, height: 32 },
            { name: 'Sprite 64×64', width: 64, height: 64 },
            { name: 'Tile 128×128', width: 128, height: 128 },
            { name: 'Scene 256×256', width: 256, height: 256 },
            { name: 'GameBoy (160×144)', width: 160, height: 144 },
            { name: 'NES (256×240)', width: 256, height: 240 }
        ]
    }
};

export class WelcomeScreen {
    constructor() {
        this.container = null;
        this.onProjectCreate = null;
        this.onProjectLoad = null;
        this.onFileImport = null;

        // Data
        this.projects = [];
        this.tags = [];
        this.storage = null;

        // Filter state
        this.filterProfile = null; // null = all profiles
        this.filterTagId = null;   // null = all tags
        this.searchQuery = '';

        // Make instance accessible globally for UIController
        window.welcomeScreenInstance = this;
    }

    /**
     * Initialize welcome screen
     */
    async init(callbacks = {}) {
        this.onProjectCreate = callbacks.onProjectCreate || (() => {});
        this.onProjectLoad = callbacks.onProjectLoad || (() => {});
        this.onFileImport = callbacks.onFileImport || (() => {});

        // Initialize storage
        this.storage = new StorageManager();
        await this.storage.init();

        // Load data from IndexedDB
        await this.loadData();

        // Create and show the welcome screen
        this.render();
        this.attachEventListeners();
    }

    /**
     * Load projects and tags from IndexedDB
     */
    async loadData() {
        try {
            this.projects = await this.storage.listProjects();
            this.tags = await this.storage.getAllTags();
        } catch (e) {
            console.warn('Failed to load data from IndexedDB:', e);
            this.projects = [];
            this.tags = [];
        }
    }

    /**
     * Refresh projects (called when returning from editor)
     */
    async refreshProjects() {
        await this.loadData();
        this.updateProjectsList();
    }

    /**
     * Get filtered projects based on current filters
     */
    getFilteredProjects() {
        let filtered = [...this.projects];

        // Filter by profile
        if (this.filterProfile) {
            filtered = filtered.filter(p => p.profile === this.filterProfile);
        }

        // Filter by tag
        if (this.filterTagId) {
            filtered = filtered.filter(p => p.tags && p.tags.includes(this.filterTagId));
        }

        // Filter by search query
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase().trim();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.profile && PROFILE_CONFIGS[p.profile]?.name.toLowerCase().includes(query))
            );
        }

        return filtered;
    }

    /**
     * Render the welcome screen HTML
     */
    render() {
        this.container = document.getElementById('welcomeScreen');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'welcomeScreen';
            this.container.className = 'welcome-screen';
            document.body.appendChild(this.container);
        }

        this.container.innerHTML = `
            <div class="welcome-content">
                <header class="welcome-header">
                    <div class="welcome-logo">
                        <svg class="welcome-logo-icon" viewBox="0 0 24 24" width="48" height="48">
                            <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83zM3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>
                        </svg>
                        <h1>PaintNook</h1>
                    </div>
                    <p class="welcome-tagline">Profesionální offline malba a ilustrace</p>
                </header>

                <main class="welcome-main">
                    <!-- New Project Section -->
                    <section class="welcome-section">
                        <h2 class="section-title">
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                            </svg>
                            Nový projekt
                        </h2>
                        <div class="profile-cards">
                            ${this.renderProfileCards()}
                        </div>
                    </section>

                    <!-- Projects Section with Filters -->
                    <section class="welcome-section projects-section">
                        <div class="section-header-with-filters">
                            <h2 class="section-title">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" fill="currentColor"/>
                                </svg>
                                Moje projekty
                                <span class="projects-count">(${this.projects.length})</span>
                            </h2>

                            <div class="projects-toolbar">
                                <!-- Search -->
                                <div class="search-box">
                                    <svg viewBox="0 0 24 24" width="18" height="18">
                                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                                    </svg>
                                    <input type="text" id="projectSearch" placeholder="Hledat projekty..." value="${this.escapeHtml(this.searchQuery)}">
                                </div>

                                <!-- Profile filter -->
                                <div class="filter-group">
                                    <label>Prostředí:</label>
                                    <select id="filterProfile">
                                        <option value="">Všechna</option>
                                        <option value="digital" ${this.filterProfile === 'digital' ? 'selected' : ''}>Digitální malba</option>
                                        <option value="vector" ${this.filterProfile === 'vector' ? 'selected' : ''}>Vektorové</option>
                                        <option value="pixelart" ${this.filterProfile === 'pixelart' ? 'selected' : ''}>Pixel Art</option>
                                    </select>
                                </div>

                                <!-- Tag filter -->
                                <div class="filter-group">
                                    <label>Tag:</label>
                                    <select id="filterTag">
                                        <option value="">Všechny tagy</option>
                                        ${this.tags.map(tag => {
                                            const color = StorageManager.getTagColor(tag.color);
                                            return `<option value="${tag.id}" ${this.filterTagId === tag.id ? 'selected' : ''}>${this.escapeHtml(tag.name)}</option>`;
                                        }).join('')}
                                    </select>
                                </div>

                                <!-- Tags manager button -->
                                <button class="btn-manage-tags" id="manageTagsBtn" title="Spravovat tagy">
                                    <svg viewBox="0 0 24 24" width="18" height="18">
                                        <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" fill="currentColor"/>
                                    </svg>
                                    Tagy
                                </button>
                            </div>
                        </div>

                        <!-- Active filters display -->
                        ${this.renderActiveFilters()}

                        <!-- Projects grid -->
                        <div class="projects-grid" id="projectsGrid">
                            ${this.renderProjects()}
                        </div>
                    </section>

                    <!-- Import Section -->
                    <section class="welcome-section">
                        <h2 class="section-title">
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" fill="currentColor"/>
                            </svg>
                            Import
                        </h2>
                        <div class="import-options">
                            <button class="import-btn" data-import="image">
                                <svg viewBox="0 0 24 24" width="32" height="32">
                                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
                                </svg>
                                <span>Obrázky</span>
                                <small>PNG, JPG, GIF, WebP, SVG</small>
                            </button>
                            <button class="import-btn" data-import="pdf">
                                <svg viewBox="0 0 24 24" width="32" height="32">
                                    <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" fill="currentColor"/>
                                </svg>
                                <span>PDF</span>
                                <small>Konverze na rastrové vrstvy</small>
                            </button>
                            <button class="import-btn" data-import="psd">
                                <svg viewBox="0 0 24 24" width="32" height="32">
                                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 14H9V7h4v10z" fill="currentColor"/>
                                </svg>
                                <span>PSD</span>
                                <small>Adobe Photoshop</small>
                            </button>
                            <button class="import-btn" data-import="procreate">
                                <svg viewBox="0 0 24 24" width="32" height="32">
                                    <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 00-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z" fill="currentColor"/>
                                </svg>
                                <span>Procreate</span>
                                <small>.procreate soubory</small>
                            </button>
                            <button class="import-btn" data-import="figma">
                                <svg viewBox="0 0 24 24" width="32" height="32">
                                    <path d="M15.332 8.668a3.333 3.333 0 000-6.666H8.668a3.333 3.333 0 000 6.666 3.333 3.333 0 000 6.665 3.333 3.333 0 003.334 3.333V12a3.333 3.333 0 013.33-3.332zm0 0a3.333 3.333 0 100 6.665 3.333 3.333 0 000-6.665z" fill="currentColor"/>
                                </svg>
                                <span>Figma</span>
                                <small>Export z Figma</small>
                            </button>
                            <button class="import-btn" data-import="other">
                                <svg viewBox="0 0 24 24" width="32" height="32">
                                    <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z" fill="currentColor"/>
                                </svg>
                                <span>Další formáty</span>
                                <small>Krita, GIMP, Clip Studio...</small>
                            </button>
                        </div>
                    </section>
                </main>

                <footer class="welcome-footer">
                    <p>PaintNook v1.0 &bull; 100% Offline &bull; Žádné účty &bull; Vaše data zůstávají u vás</p>
                </footer>
            </div>

            <!-- Hidden file input for imports -->
            <input type="file" id="welcomeFileInput" hidden multiple>
        `;
    }

    /**
     * Render profile selection cards
     */
    renderProfileCards() {
        const icons = {
            brush: `<svg viewBox="0 0 24 24" width="48" height="48">
                <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 00-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z" fill="currentColor"/>
            </svg>`,
            vector: `<svg viewBox="0 0 24 24" width="48" height="48">
                <path d="M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3h-6zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3v6zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6h6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6v-6z" fill="currentColor"/>
            </svg>`,
            pixelart: `<svg viewBox="0 0 24 24" width="48" height="48">
                <path d="M3 3h6v6H3zm12 0h6v6h-6zM3 15h6v6H3zm12 0h6v6h-6zm-6-6h6v6H9z" fill="currentColor"/>
            </svg>`
        };

        return Object.entries(PROFILE_CONFIGS).map(([key, profile]) => `
            <button class="profile-card" data-profile="${key}">
                <div class="profile-icon">${icons[profile.icon]}</div>
                <h3>${profile.name}</h3>
                <p>${profile.description}</p>
            </button>
        `).join('');
    }

    /**
     * Render active filters display
     */
    renderActiveFilters() {
        const hasFilters = this.filterProfile || this.filterTagId || this.searchQuery.trim();
        if (!hasFilters) return '';

        const filters = [];

        if (this.filterProfile) {
            const profile = PROFILE_CONFIGS[this.filterProfile];
            filters.push(`
                <span class="active-filter" data-clear="profile" style="background: ${profile.badge.bg}">
                    ${profile.badge.text}
                    <button class="clear-filter">&times;</button>
                </span>
            `);
        }

        if (this.filterTagId) {
            const tag = this.tags.find(t => t.id === this.filterTagId);
            if (tag) {
                const color = StorageManager.getTagColor(tag.color);
                filters.push(`
                    <span class="active-filter" data-clear="tag" style="background: ${color.bg}; color: ${color.text}">
                        ${this.escapeHtml(tag.name)}
                        <button class="clear-filter">&times;</button>
                    </span>
                `);
            }
        }

        if (this.searchQuery.trim()) {
            filters.push(`
                <span class="active-filter" data-clear="search" style="background: #374151">
                    Hledání: "${this.escapeHtml(this.searchQuery)}"
                    <button class="clear-filter">&times;</button>
                </span>
            `);
        }

        return `
            <div class="active-filters">
                ${filters.join('')}
                <button class="clear-all-filters" id="clearAllFilters">Zrušit vše</button>
            </div>
        `;
    }

    /**
     * Render projects grid
     */
    renderProjects() {
        const filtered = this.getFilteredProjects();

        if (filtered.length === 0) {
            if (this.projects.length === 0) {
                return `
                    <div class="no-projects">
                        <svg viewBox="0 0 24 24" width="48" height="48">
                            <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" fill="currentColor"/>
                        </svg>
                        <p>Zatím žádné projekty</p>
                        <small>Vytvořte nový projekt nebo importujte soubor</small>
                    </div>
                `;
            }
            return `
                <div class="no-projects">
                    <svg viewBox="0 0 24 24" width="48" height="48">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                    </svg>
                    <p>Žádné projekty neodpovídají filtrům</p>
                    <small>Zkuste změnit nebo zrušit filtry</small>
                </div>
            `;
        }

        return filtered.map(project => {
            const profile = PROFILE_CONFIGS[project.profile] || PROFILE_CONFIGS.digital;
            const projectTags = (project.tags || [])
                .map(tagId => this.tags.find(t => t.id === tagId))
                .filter(Boolean);

            return `
                <div class="project-card" data-project-id="${this.escapeHtml(project.id)}">
                    <div class="project-thumb" style="background-image: url('${this.escapeHtml(project.thumbnail || '')}')">
                        ${!project.thumbnail ? `
                            <svg viewBox="0 0 24 24" width="32" height="32">
                                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
                            </svg>
                        ` : ''}
                        <span class="project-profile-badge" style="background: ${profile.badge.bg}">${profile.badge.text}</span>
                    </div>
                    <div class="project-info">
                        <h4 class="project-name">${this.escapeHtml(project.name)}</h4>
                        <div class="project-meta">
                            <span class="project-size">${project.width}×${project.height}</span>
                            <span class="project-date">${this.formatDate(project.modified)}</span>
                        </div>
                        ${projectTags.length > 0 ? `
                            <div class="project-tags">
                                ${projectTags.slice(0, 3).map(tag => {
                                    const color = StorageManager.getTagColor(tag.color);
                                    return `<span class="project-tag" style="background: ${color.bg}; color: ${color.text}">${this.escapeHtml(tag.name)}</span>`;
                                }).join('')}
                                ${projectTags.length > 3 ? `<span class="project-tag-more">+${projectTags.length - 3}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="project-actions">
                        <button class="project-action-btn edit-tags-btn" data-project-id="${this.escapeHtml(project.id)}" title="Upravit tagy">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" fill="currentColor"/>
                            </svg>
                        </button>
                        <button class="project-action-btn delete-btn" data-project-id="${this.escapeHtml(project.id)}" title="Smazat projekt">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update only the projects list (for filtering)
     */
    updateProjectsList() {
        const grid = this.container.querySelector('#projectsGrid');
        if (grid) {
            grid.innerHTML = this.renderProjects();
            this.attachProjectEventListeners();
        }

        // Update count
        const count = this.container.querySelector('.projects-count');
        if (count) {
            const filtered = this.getFilteredProjects();
            count.textContent = `(${filtered.length}/${this.projects.length})`;
        }

        // Update active filters
        const filtersArea = this.container.querySelector('.active-filters');
        const newFilters = this.renderActiveFilters();
        if (filtersArea) {
            const temp = document.createElement('div');
            temp.innerHTML = newFilters;
            filtersArea.replaceWith(temp.firstElementChild || document.createTextNode(''));
        } else if (newFilters) {
            const sectionHeader = this.container.querySelector('.section-header-with-filters');
            if (sectionHeader) {
                const temp = document.createElement('div');
                temp.innerHTML = newFilters;
                sectionHeader.insertAdjacentElement('afterend', temp.firstElementChild);
            }
        }

        // Re-attach filter clear listeners
        this.attachFilterClearListeners();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Profile cards
        this.container.querySelectorAll('.profile-card').forEach(card => {
            card.addEventListener('click', () => {
                const profileKey = card.dataset.profile;
                this.showProfileConfig(profileKey);
            });
        });

        // Import buttons
        this.container.querySelectorAll('.import-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const importType = btn.dataset.import;
                this.handleImport(importType);
            });
        });

        // File input change
        const fileInput = this.container.querySelector('#welcomeFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Search
        const searchInput = this.container.querySelector('#projectSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value;
                    this.updateProjectsList();
                }, 300);
            });
        }

        // Profile filter
        const profileFilter = this.container.querySelector('#filterProfile');
        if (profileFilter) {
            profileFilter.addEventListener('change', (e) => {
                this.filterProfile = e.target.value || null;
                this.updateProjectsList();
            });
        }

        // Tag filter
        const tagFilter = this.container.querySelector('#filterTag');
        if (tagFilter) {
            tagFilter.addEventListener('change', (e) => {
                this.filterTagId = e.target.value || null;
                this.updateProjectsList();
            });
        }

        // Manage tags button
        const manageTagsBtn = this.container.querySelector('#manageTagsBtn');
        if (manageTagsBtn) {
            manageTagsBtn.addEventListener('click', () => this.showTagsManager());
        }

        this.attachProjectEventListeners();
        this.attachFilterClearListeners();
    }

    /**
     * Attach project-specific event listeners
     */
    attachProjectEventListeners() {
        // Project cards click
        this.container.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Ignore if clicking action buttons
                if (e.target.closest('.project-action-btn')) return;

                const projectId = card.dataset.projectId;
                this.loadProject(projectId);
            });
        });

        // Edit tags buttons
        this.container.querySelectorAll('.edit-tags-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projectId = btn.dataset.projectId;
                this.showEditProjectTags(projectId);
            });
        });

        // Delete buttons
        this.container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projectId = btn.dataset.projectId;
                this.confirmDeleteProject(projectId);
            });
        });
    }

    /**
     * Attach filter clear listeners
     */
    attachFilterClearListeners() {
        // Individual filter clear
        this.container.querySelectorAll('.active-filter').forEach(filter => {
            filter.querySelector('.clear-filter')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const clearType = filter.dataset.clear;
                if (clearType === 'profile') {
                    this.filterProfile = null;
                    this.container.querySelector('#filterProfile').value = '';
                } else if (clearType === 'tag') {
                    this.filterTagId = null;
                    this.container.querySelector('#filterTag').value = '';
                } else if (clearType === 'search') {
                    this.searchQuery = '';
                    this.container.querySelector('#projectSearch').value = '';
                }
                this.updateProjectsList();
            });
        });

        // Clear all filters
        this.container.querySelector('#clearAllFilters')?.addEventListener('click', () => {
            this.filterProfile = null;
            this.filterTagId = null;
            this.searchQuery = '';
            this.container.querySelector('#filterProfile').value = '';
            this.container.querySelector('#filterTag').value = '';
            this.container.querySelector('#projectSearch').value = '';
            this.updateProjectsList();
        });
    }

    /**
     * Show profile configuration dialog
     */
    showProfileConfig(profileKey) {
        const profile = PROFILE_CONFIGS[profileKey];
        if (!profile) return;

        const modal = document.createElement('div');
        modal.className = 'welcome-modal';
        modal.innerHTML = `
            <div class="welcome-modal-content config-modal">
                <button class="modal-close" aria-label="Zavřít">&times;</button>
                <h2>Nový projekt: ${profile.name}</h2>

                <form id="projectConfigForm">
                    <div class="form-group">
                        <label for="projectName">Název projektu</label>
                        <input type="text" id="projectName" value="Nový projekt" required>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="projectWidth">Šířka (px)</label>
                            <input type="number" id="projectWidth" value="${profile.defaults.width}" min="1" max="8192" required>
                        </div>
                        <div class="form-group">
                            <label for="projectHeight">Výška (px)</label>
                            <input type="number" id="projectHeight" value="${profile.defaults.height}" min="1" max="8192" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Rychlé předvolby</label>
                        <div class="preset-buttons">
                            ${profile.presets.map(preset => `
                                <button type="button" class="preset-btn" data-width="${preset.width}" data-height="${preset.height}">
                                    ${preset.name}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="projectBgColor">Barva pozadí</label>
                        <div class="color-input-row">
                            <input type="color" id="projectBgColor" value="${profile.defaults.backgroundColor === 'transparent' ? '#ffffff' : profile.defaults.backgroundColor}">
                            <label class="checkbox-label">
                                <input type="checkbox" id="transparentBg" ${profile.defaults.backgroundColor === 'transparent' ? 'checked' : ''}>
                                Průhledné pozadí
                            </label>
                        </div>
                    </div>

                    ${profileKey === PROJECT_PROFILES.PIXEL_ART ? `
                        <div class="form-group">
                            <label for="gridSize">Velikost mřížky (px)</label>
                            <select id="gridSize">
                                <option value="1" ${profile.defaults.gridSize === 1 ? 'selected' : ''}>1px</option>
                                <option value="2" ${profile.defaults.gridSize === 2 ? 'selected' : ''}>2px</option>
                                <option value="4" ${profile.defaults.gridSize === 4 ? 'selected' : ''}>4px</option>
                                <option value="8" ${profile.defaults.gridSize === 8 ? 'selected' : ''}>8px</option>
                                <option value="16" ${profile.defaults.gridSize === 16 ? 'selected' : ''}>16px</option>
                                <option value="32" ${profile.defaults.gridSize === 32 ? 'selected' : ''}>32px</option>
                                <option value="64" ${profile.defaults.gridSize === 64 ? 'selected' : ''}>64px</option>
                            </select>
                        </div>
                    ` : ''}

                    <div class="form-actions">
                        <button type="button" class="btn-cancel">Zrušit</button>
                        <button type="submit" class="btn-create">Vytvořit projekt</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Update grid size options
        const updateGridSizeOptions = () => {
            const gridSelect = modal.querySelector('#gridSize');
            if (!gridSelect) return;

            const width = parseInt(modal.querySelector('#projectWidth').value) || 64;
            const height = parseInt(modal.querySelector('#projectHeight').value) || 64;
            const minDimension = Math.min(width, height);
            const maxGridSize = Math.floor(minDimension / 4);

            const validSizes = [1, 2, 4, 8, 16, 32, 64];
            let maxAllowed = 1;
            for (let i = validSizes.length - 1; i >= 0; i--) {
                if (validSizes[i] <= maxGridSize) {
                    maxAllowed = validSizes[i];
                    break;
                }
            }

            Array.from(gridSelect.options).forEach(option => {
                const size = parseInt(option.value);
                const isDisabled = size > maxAllowed;
                option.disabled = isDisabled;
                option.textContent = isDisabled ? `${size}px` : `${size}px`;
            });

            if (parseInt(gridSelect.value) > maxAllowed) {
                gridSelect.value = maxAllowed.toString();
            }
        };

        // Preset buttons
        modal.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelector('#projectWidth').value = btn.dataset.width;
                modal.querySelector('#projectHeight').value = btn.dataset.height;
                updateGridSizeOptions();
            });
        });

        modal.querySelector('#projectWidth')?.addEventListener('input', updateGridSizeOptions);
        modal.querySelector('#projectHeight')?.addEventListener('input', updateGridSizeOptions);
        updateGridSizeOptions();

        // Close handlers
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('.btn-cancel').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Form submit
        modal.querySelector('#projectConfigForm').addEventListener('submit', (e) => {
            e.preventDefault();

            const config = {
                name: modal.querySelector('#projectName').value,
                width: parseInt(modal.querySelector('#projectWidth').value),
                height: parseInt(modal.querySelector('#projectHeight').value),
                backgroundColor: modal.querySelector('#transparentBg').checked
                    ? 'transparent'
                    : modal.querySelector('#projectBgColor').value,
                profile: profileKey,
                pixelArtMode: profileKey === PROJECT_PROFILES.PIXEL_ART,
                vectorMode: profileKey === PROJECT_PROFILES.VECTOR
            };

            if (profileKey === PROJECT_PROFILES.PIXEL_ART) {
                config.gridSize = parseInt(modal.querySelector('#gridSize')?.value || 16);
            }

            modal.remove();
            this.createProject(config);
        });
    }

    /**
     * Show tags manager modal
     */
    async showTagsManager() {
        const modal = document.createElement('div');
        modal.className = 'welcome-modal';

        const renderTagsList = () => {
            return this.tags.map(tag => {
                const color = StorageManager.getTagColor(tag.color);
                return `
                    <div class="tag-item" data-tag-id="${tag.id}">
                        <span class="tag-preview" style="background: ${color.bg}; color: ${color.text}">${this.escapeHtml(tag.name)}</span>
                        <div class="tag-actions">
                            <button class="tag-edit-btn" data-tag-id="${tag.id}" title="Upravit">
                                <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                                </svg>
                            </button>
                            <button class="tag-delete-btn" data-tag-id="${tag.id}" title="Smazat">
                                <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
            }).join('') || '<p class="no-tags-msg">Zatím žádné tagy</p>';
        };

        const renderColorPicker = (selectedColor = 'blue') => {
            return StorageManager.getTagColors().map(c => `
                <button type="button" class="color-option ${c.id === selectedColor ? 'selected' : ''}"
                        data-color="${c.id}"
                        style="background: ${c.bg}; color: ${c.text}"
                        title="${c.id}">
                </button>
            `).join('');
        };

        modal.innerHTML = `
            <div class="welcome-modal-content tags-modal">
                <button class="modal-close" aria-label="Zavřít">&times;</button>
                <h2>Správa tagů</h2>

                <div class="tags-manager">
                    <div class="new-tag-form">
                        <input type="text" id="newTagName" placeholder="Název nového tagu" maxlength="30">
                        <div class="color-picker">
                            ${renderColorPicker()}
                        </div>
                        <button type="button" id="addTagBtn" class="btn-add-tag">Přidat tag</button>
                    </div>

                    <div class="tags-list" id="tagsList">
                        ${renderTagsList()}
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn-done">Hotovo</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        let selectedColor = 'blue';

        // Color picker
        modal.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedColor = btn.dataset.color;
            });
        });

        // Add tag
        modal.querySelector('#addTagBtn').addEventListener('click', async () => {
            const nameInput = modal.querySelector('#newTagName');
            const name = nameInput.value.trim();
            if (!name) return;

            const tag = await this.storage.createTag(name, selectedColor);
            this.tags.push(tag);
            nameInput.value = '';

            modal.querySelector('#tagsList').innerHTML = renderTagsList();
            this.attachTagsListeners(modal, renderTagsList);
            this.updateTagsFilter();
        });

        // Enter to add
        modal.querySelector('#newTagName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                modal.querySelector('#addTagBtn').click();
            }
        });

        this.attachTagsListeners(modal, renderTagsList);

        // Close handlers
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('.btn-done').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * Attach tags list event listeners
     */
    attachTagsListeners(modal, renderTagsList) {
        // Edit tag
        modal.querySelectorAll('.tag-edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const tagId = btn.dataset.tagId;
                const tag = this.tags.find(t => t.id === tagId);
                if (!tag) return;

                const newName = prompt('Nový název tagu:', tag.name);
                if (newName && newName.trim()) {
                    await this.storage.updateTag(tagId, newName.trim(), tag.color);
                    tag.name = newName.trim();
                    modal.querySelector('#tagsList').innerHTML = renderTagsList();
                    this.attachTagsListeners(modal, renderTagsList);
                    this.updateTagsFilter();
                    this.updateProjectsList();
                }
            });
        });

        // Delete tag
        modal.querySelectorAll('.tag-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const tagId = btn.dataset.tagId;
                if (!confirm('Opravdu chcete smazat tento tag? Bude odstraněn ze všech projektů.')) return;

                await this.storage.deleteTag(tagId);
                this.tags = this.tags.filter(t => t.id !== tagId);

                if (this.filterTagId === tagId) {
                    this.filterTagId = null;
                }

                modal.querySelector('#tagsList').innerHTML = renderTagsList();
                this.attachTagsListeners(modal, renderTagsList);
                this.updateTagsFilter();
                this.updateProjectsList();
            });
        });
    }

    /**
     * Update tags filter dropdown
     */
    updateTagsFilter() {
        const tagFilter = this.container.querySelector('#filterTag');
        if (tagFilter) {
            tagFilter.innerHTML = `
                <option value="">Všechny tagy</option>
                ${this.tags.map(tag => `<option value="${tag.id}" ${this.filterTagId === tag.id ? 'selected' : ''}>${this.escapeHtml(tag.name)}</option>`).join('')}
            `;
        }
    }

    /**
     * Show edit project tags modal
     */
    async showEditProjectTags(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        const modal = document.createElement('div');
        modal.className = 'welcome-modal';

        const projectTags = new Set(project.tags || []);

        modal.innerHTML = `
            <div class="welcome-modal-content tags-select-modal">
                <button class="modal-close" aria-label="Zavřít">&times;</button>
                <h2>Tagy pro "${this.escapeHtml(project.name)}"</h2>

                <div class="tags-select-list">
                    ${this.tags.length === 0 ? '<p class="no-tags-msg">Zatím nemáte žádné tagy. Vytvořte je ve správě tagů.</p>' : ''}
                    ${this.tags.map(tag => {
                        const color = StorageManager.getTagColor(tag.color);
                        const isSelected = projectTags.has(tag.id);
                        return `
                            <label class="tag-checkbox ${isSelected ? 'selected' : ''}">
                                <input type="checkbox" value="${tag.id}" ${isSelected ? 'checked' : ''}>
                                <span class="tag-label" style="background: ${color.bg}; color: ${color.text}">${this.escapeHtml(tag.name)}</span>
                            </label>
                        `;
                    }).join('')}
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn-cancel">Zrušit</button>
                    <button type="button" class="btn-save" id="saveProjectTags">Uložit</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Toggle visual selection
        modal.querySelectorAll('.tag-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                checkbox.closest('.tag-checkbox').classList.toggle('selected', checkbox.checked);
            });
        });

        // Save
        modal.querySelector('#saveProjectTags').addEventListener('click', async () => {
            const selectedTags = Array.from(modal.querySelectorAll('.tag-checkbox input:checked'))
                .map(cb => cb.value);

            await this.storage.updateProjectTags(projectId, selectedTags);
            project.tags = selectedTags;

            modal.remove();
            this.updateProjectsList();
        });

        // Close handlers
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('.btn-cancel').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * Confirm delete project
     */
    async confirmDeleteProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        if (!confirm(`Opravdu chcete smazat projekt "${project.name}"? Tuto akci nelze vrátit.`)) {
            return;
        }

        await this.storage.deleteProject(projectId);
        this.projects = this.projects.filter(p => p.id !== projectId);
        this.updateProjectsList();
    }

    /**
     * Create a new project with given config
     */
    createProject(config) {
        this.hide();
        this.onProjectCreate(config);
    }

    /**
     * Load an existing project
     */
    loadProject(projectId) {
        this.hide();
        this.onProjectLoad(projectId);
    }

    /**
     * Handle import based on type
     */
    handleImport(importType) {
        const fileInput = this.container.querySelector('#welcomeFileInput');

        const acceptMap = {
            image: 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml',
            pdf: 'application/pdf',
            psd: '.psd',
            procreate: '.procreate',
            figma: '.fig',
            other: '.kra,.ora,.xcf,.clip,.csp'
        };

        fileInput.accept = acceptMap[importType] || '*/*';
        fileInput.dataset.importType = importType;
        fileInput.click();
    }

    /**
     * Handle file selection
     */
    async handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const importType = e.target.dataset.importType;

        this.hide();
        this.onFileImport(files, importType);

        e.target.value = '';
    }

    /**
     * Show the welcome screen
     */
    show() {
        if (this.container) {
            this.container.style.display = '';
            this.container.classList.add('visible');
        }
    }

    /**
     * Hide the welcome screen
     */
    hide() {
        if (this.container) {
            this.container.classList.remove('visible');
            setTimeout(() => {
                if (this.container && !this.container.classList.contains('visible')) {
                    this.container.style.display = 'none';
                }
            }, 300);
        }
    }

    /**
     * Destroy the welcome screen
     */
    destroy() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        window.welcomeScreenInstance = null;
    }

    /**
     * Escape HTML for safe insertion
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Format date for display
     */
    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return `před ${mins} min`;
        }
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `před ${hours} h`;
        }
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `před ${days} dny`;
        }
        return date.toLocaleDateString('cs-CZ');
    }
}

// Export constants for use elsewhere
export { PROJECT_PROFILES, PROFILE_CONFIGS };
