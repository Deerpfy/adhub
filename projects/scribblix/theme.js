/**
 * Scribblix - Theme Manager
 * Handles dark/light mode switching with system preference support
 */

const ScribblixTheme = {
    /** Current theme */
    currentTheme: 'dark',

    /** Available themes */
    themes: ['dark', 'light', 'system'],

    /**
     * Initialize theme manager
     */
    async init() {
        // Load saved theme preference
        const savedTheme = await window.ScribblixDB.SettingsDB.get('theme');
        this.currentTheme = savedTheme || 'dark';

        // Apply theme
        this.applyTheme(this.currentTheme);

        // Listen for system preference changes
        this.watchSystemPreference();

        // Setup toggle button
        this.setupToggle();

        console.log('[Scribblix Theme] Initialized with theme:', this.currentTheme);
    },

    /**
     * Apply theme to document
     * @param {string} theme - 'dark', 'light', or 'system'
     */
    applyTheme(theme) {
        let effectiveTheme = theme;

        // Handle system preference
        if (theme === 'system') {
            effectiveTheme = this.getSystemPreference();
        }

        // Apply to document
        document.documentElement.setAttribute('data-theme', effectiveTheme);

        // Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content',
                effectiveTheme === 'light' ? '#ffffff' : '#0a0a0f'
            );
        }

        // Update toggle button state
        this.updateToggleButton(effectiveTheme);

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: effectiveTheme, setting: theme }
        }));
    },

    /**
     * Get system preference
     * @returns {string} 'dark' or 'light'
     */
    getSystemPreference() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    },

    /**
     * Watch for system preference changes
     */
    watchSystemPreference() {
        window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', (e) => {
                if (this.currentTheme === 'system') {
                    this.applyTheme('system');
                }
            });
    },

    /**
     * Toggle between themes
     */
    async toggle() {
        // Simple toggle between dark and light
        const newTheme = this.getEffectiveTheme() === 'dark' ? 'light' : 'dark';
        this.currentTheme = newTheme;

        // Save preference
        await window.ScribblixDB.SettingsDB.set('theme', newTheme);

        // Apply
        this.applyTheme(newTheme);

        // Show toast
        if (window.ScribblixApp) {
            window.ScribblixApp.showToast(
                newTheme === 'light' ? 'Light mode' : 'Dark mode',
                'info'
            );
        }
    },

    /**
     * Set specific theme
     * @param {string} theme
     */
    async setTheme(theme) {
        if (!this.themes.includes(theme)) {
            console.warn('[Scribblix Theme] Invalid theme:', theme);
            return;
        }

        this.currentTheme = theme;
        await window.ScribblixDB.SettingsDB.set('theme', theme);
        this.applyTheme(theme);
    },

    /**
     * Get effective theme (resolved system preference)
     * @returns {string} 'dark' or 'light'
     */
    getEffectiveTheme() {
        if (this.currentTheme === 'system') {
            return this.getSystemPreference();
        }
        return this.currentTheme;
    },

    /**
     * Setup toggle button
     */
    setupToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    },

    /**
     * Update toggle button appearance
     * @param {string} theme
     */
    updateToggleButton(theme) {
        const toggleBtn = document.getElementById('themeToggle');
        if (!toggleBtn) return;

        const sunIcon = toggleBtn.querySelector('.icon-sun');
        const moonIcon = toggleBtn.querySelector('.icon-moon');

        if (sunIcon && moonIcon) {
            sunIcon.style.display = theme === 'light' ? 'block' : 'none';
            moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
        }

        toggleBtn.setAttribute('aria-label',
            theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
        );
    }
};

// Make available globally
window.ScribblixTheme = ScribblixTheme;

console.log('[Scribblix] Theme module loaded');
