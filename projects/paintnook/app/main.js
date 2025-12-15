/**
 * PaintNook - Main Entry Point
 * Offline-first digital painting application
 */

import { PaintApp } from './core/PaintApp.js';
import { WelcomeScreen } from './ui/WelcomeScreen.js';
import { FileImporter } from './utils/FileImporter.js';

// Global state
let welcomeScreen = null;
let fileImporter = null;

/**
 * Initialize the welcome screen flow
 */
async function initWelcomeFlow() {
    // Hide main app initially
    const appElement = document.getElementById('app');
    if (appElement) {
        appElement.style.display = 'none';
    }

    // Create and show welcome screen
    welcomeScreen = new WelcomeScreen();
    await welcomeScreen.init({
        onProjectCreate: handleProjectCreate,
        onProjectLoad: handleProjectLoad,
        onFileImport: handleFileImport
    });
    welcomeScreen.show();
}

/**
 * Handle new project creation from welcome screen
 */
async function handleProjectCreate(config) {
    try {
        // Show main app
        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.style.display = 'flex';
        }

        // Initialize PaintApp if not already done
        if (!window.paintApp) {
            window.paintApp = new PaintApp();
        }

        // Apply profile-specific settings
        if (config.pixelArtMode) {
            window.paintApp.settings.pixelArtMode = true;
            // Signal that we'll apply config from welcome screen
            // This prevents loadSettings() from overwriting our values
            window.paintApp.pixelArtConfigPending = config;
        }

        // Initialize the application
        await window.paintApp.init();

        // Create project with config
        await window.paintApp.newProject({
            name: config.name,
            width: config.width,
            height: config.height,
            backgroundColor: config.backgroundColor
        });

        // Enable pixel art mode if selected
        if (config.pixelArtMode && window.paintApp.ui?.pixelArtUI) {
            // Update the checkbox state
            const toggle = document.getElementById('pixelArtModeToggle');
            if (toggle) {
                toggle.checked = true;
            }
            // Use UI controller to properly enable pixel art mode (updates both manager and UI)
            window.paintApp.ui.pixelArtUI.togglePixelArtMode(true);

            // First update grid options based on new canvas dimensions
            window.paintApp.ui.pixelArtUI.updateGridSizeOptions();

            // Then set grid size from config
            if (config.gridSize) {
                window.paintApp.pixelArt.setGridSize(config.gridSize);
                window.paintApp.pixelArt.grid.size = config.gridSize;
                // Sync UI dropdown after options are updated
                const gridSizeSelect = document.getElementById('gridSize');
                if (gridSizeSelect) {
                    gridSizeSelect.value = config.gridSize.toString();
                }
            }

            // Auto-set grid color based on background
            // Transparent background → white grid, colored background → black grid
            const isTransparent = !config.backgroundColor || config.backgroundColor === 'transparent';
            const gridColor = isTransparent ? '#ffffff' : '#000000';
            window.paintApp.pixelArt.grid.color = gridColor;
            // Update UI color picker
            const gridColorInput = document.getElementById('gridColor');
            if (gridColorInput) {
                gridColorInput.value = gridColor;
            }

            // Refresh grid overlay with new settings
            window.paintApp.ui.pixelArtUI.updateGridOverlay();

            // Save settings to persist config values
            window.paintApp.pixelArt.saveSettings();

            // Clear the pending config flag
            delete window.paintApp.pixelArtConfigPending;
        }

        // Initialize file importer
        fileImporter = new FileImporter(window.paintApp);

        console.log('PaintNook initialized with config:', config);

    } catch (error) {
        console.error('Failed to create project:', error);
        // Show welcome screen again on error
        welcomeScreen?.show();
    }
}

/**
 * Handle project load from welcome screen
 */
async function handleProjectLoad(projectId) {
    try {
        // Show main app
        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.style.display = 'flex';
        }

        // Initialize PaintApp if not already done
        if (!window.paintApp) {
            window.paintApp = new PaintApp();
            await window.paintApp.init();
        }

        if (projectId) {
            // Load specific project
            await window.paintApp.loadProject(projectId);
        } else {
            // Open project browser (null projectId)
            window.paintApp.ui?.showProjectBrowser?.();
        }

        // Initialize file importer
        fileImporter = new FileImporter(window.paintApp);

        console.log('Project loaded:', projectId);

    } catch (error) {
        console.error('Failed to load project:', error);
        welcomeScreen?.show();
    }
}

/**
 * Handle file import from welcome screen
 */
async function handleFileImport(files, importType) {
    try {
        // Show main app
        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.style.display = 'flex';
        }

        // Initialize PaintApp if not already done
        if (!window.paintApp) {
            window.paintApp = new PaintApp();
            await window.paintApp.init();
        }

        // Initialize file importer
        if (!fileImporter) {
            fileImporter = new FileImporter(window.paintApp);
        }

        // Import files
        const results = await fileImporter.importFiles(files, importType);

        // Show results
        if (results.success.length > 0) {
            window.paintApp.ui?.showNotification(
                `Importováno ${results.success.length} soubor(ů)`,
                'success'
            );
        }

        if (results.failed.length > 0) {
            for (const failed of results.failed) {
                window.paintApp.ui?.showNotification(
                    `Chyba: ${failed.file} - ${failed.error}`,
                    'error'
                );
            }
        }

        console.log('Import results:', results);

    } catch (error) {
        console.error('Failed to import files:', error);
        welcomeScreen?.show();
    }
}

/**
 * Check for skip welcome parameter (for direct editor access)
 */
function shouldSkipWelcome() {
    const params = new URLSearchParams(window.location.search);
    return params.has('skipWelcome') || params.has('project');
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Check if we should skip welcome screen
    if (shouldSkipWelcome()) {
        // Direct initialization (legacy behavior)
        window.paintApp = new PaintApp();
        await window.paintApp.init();
        fileImporter = new FileImporter(window.paintApp);
        console.log('PaintNook initialized (direct mode)');
    } else {
        // Show welcome screen first
        await initWelcomeFlow();
    }
});

// Handle visibility change for performance
document.addEventListener('visibilitychange', () => {
    if (window.paintApp) {
        if (document.hidden) {
            window.paintApp.pause();
        } else {
            window.paintApp.resume();
        }
    }
});

// Handle before unload - warn if unsaved changes
window.addEventListener('beforeunload', (e) => {
    if (window.paintApp && window.paintApp.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
    }
});
