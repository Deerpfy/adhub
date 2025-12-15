/**
 * WelcomeScreen - Landing page with project creation and import options
 * Shows before the main editor loads
 */

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
        description: 'Připraveno pro budoucí vektorovou podporu (SVG export)',
        icon: 'vector',
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
            { name: 'A4 Portrait', width: 2480, height: 3508 },
            { name: 'A4 Landscape', width: 3508, height: 2480 }
        ],
        notice: 'Plná vektorová podpora bude přidána v budoucí verzi'
    },
    [PROJECT_PROFILES.PIXEL_ART]: {
        name: 'Pixel Art',
        description: 'Optimalizováno pro pixel art s mřížkou a speciálními nástroji',
        icon: 'pixelart',
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
        this.recentProjects = [];
    }

    /**
     * Initialize welcome screen
     */
    async init(callbacks = {}) {
        this.onProjectCreate = callbacks.onProjectCreate || (() => {});
        this.onProjectLoad = callbacks.onProjectLoad || (() => {});
        this.onFileImport = callbacks.onFileImport || (() => {});

        // Load recent projects from storage
        await this.loadRecentProjects();

        // Create and show the welcome screen
        this.render();
        this.attachEventListeners();
    }

    /**
     * Load recent projects from localStorage
     */
    async loadRecentProjects() {
        try {
            const stored = localStorage.getItem('paintnook-recent-projects');
            if (stored) {
                this.recentProjects = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load recent projects:', e);
            this.recentProjects = [];
        }
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

                    <!-- Recent Projects Section -->
                    <section class="welcome-section">
                        <h2 class="section-title">
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" fill="currentColor"/>
                            </svg>
                            Poslední projekty
                        </h2>
                        <div class="recent-projects">
                            ${this.renderRecentProjects()}
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
                ${profile.notice ? `<span class="profile-notice">${profile.notice}</span>` : ''}
            </button>
        `).join('');
    }

    /**
     * Render recent projects list
     */
    renderRecentProjects() {
        if (this.recentProjects.length === 0) {
            return `
                <div class="no-recent">
                    <svg viewBox="0 0 24 24" width="48" height="48">
                        <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" fill="currentColor"/>
                    </svg>
                    <p>Zatím žádné projekty</p>
                    <small>Vytvořte nový projekt nebo importujte soubor</small>
                </div>
            `;
        }

        return `
            <div class="recent-list">
                ${this.recentProjects.slice(0, 6).map(project => `
                    <button class="recent-item" data-project-id="${this.escapeHtml(project.id)}">
                        <div class="recent-thumb" style="background-image: url('${this.escapeHtml(project.thumbnail || '')}')">
                            ${!project.thumbnail ? `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/></svg>` : ''}
                        </div>
                        <div class="recent-info">
                            <span class="recent-name">${this.escapeHtml(project.name)}</span>
                            <span class="recent-date">${this.formatDate(project.modified)}</span>
                            <span class="recent-size">${project.width}×${project.height}</span>
                        </div>
                    </button>
                `).join('')}
            </div>
            <button class="btn-see-all" id="seeAllProjectsBtn">
                Zobrazit všechny projekty
            </button>
        `;
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

        // Recent projects
        this.container.querySelectorAll('.recent-item').forEach(item => {
            item.addEventListener('click', () => {
                const projectId = item.dataset.projectId;
                this.loadProject(projectId);
            });
        });

        // Import buttons
        this.container.querySelectorAll('.import-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const importType = btn.dataset.import;
                this.handleImport(importType);
            });
        });

        // See all projects
        const seeAllBtn = this.container.querySelector('#seeAllProjectsBtn');
        if (seeAllBtn) {
            seeAllBtn.addEventListener('click', () => this.showAllProjects());
        }

        // File input change
        const fileInput = this.container.querySelector('#welcomeFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
    }

    /**
     * Show profile configuration dialog
     */
    showProfileConfig(profileKey) {
        const profile = PROFILE_CONFIGS[profileKey];
        if (!profile) return;

        // Create modal
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

                    ${profile.notice ? `
                        <div class="form-notice">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/>
                            </svg>
                            ${profile.notice}
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

        // Function to update grid size options based on canvas dimensions
        const updateGridSizeOptions = () => {
            const gridSelect = modal.querySelector('#gridSize');
            if (!gridSelect) return;

            const width = parseInt(modal.querySelector('#projectWidth').value) || 64;
            const height = parseInt(modal.querySelector('#projectHeight').value) || 64;
            const minDimension = Math.min(width, height);
            // Require at least 4 cells per dimension
            const maxGridSize = Math.floor(minDimension / 4);

            // Find nearest power of 2 that's <= maxSize
            const validSizes = [1, 2, 4, 8, 16, 32, 64];
            let maxAllowed = 1;
            for (let i = validSizes.length - 1; i >= 0; i--) {
                if (validSizes[i] <= maxGridSize) {
                    maxAllowed = validSizes[i];
                    break;
                }
            }

            // Update options
            Array.from(gridSelect.options).forEach(option => {
                const size = parseInt(option.value);
                const isDisabled = size > maxAllowed;
                option.disabled = isDisabled;
                option.textContent = isDisabled ? `${size}px 🔒` : `${size}px`;
            });

            // If current value is disabled, select max allowed
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

        // Update grid options on dimension change
        modal.querySelector('#projectWidth')?.addEventListener('input', updateGridSizeOptions);
        modal.querySelector('#projectHeight')?.addEventListener('input', updateGridSizeOptions);

        // Initial update
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

        // Reset input
        e.target.value = '';
    }

    /**
     * Show all projects modal
     */
    showAllProjects() {
        // This will be handled by the main app's project browser
        this.hide();
        this.onProjectLoad(null); // null signals to open project browser
    }

    /**
     * Show the welcome screen
     */
    show() {
        if (this.container) {
            this.container.classList.add('visible');
        }
    }

    /**
     * Hide the welcome screen
     */
    hide() {
        if (this.container) {
            this.container.classList.remove('visible');
            // Delayed removal for animation
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

        // Within last hour
        if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return `před ${mins} min`;
        }
        // Within last day
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `před ${hours} h`;
        }
        // Within last week
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `před ${days} dny`;
        }
        // Older
        return date.toLocaleDateString('cs-CZ');
    }
}

// Export constants for use elsewhere
export { PROJECT_PROFILES, PROFILE_CONFIGS };
