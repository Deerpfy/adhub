/**
 * PaintNook - Main Entry Point
 * Offline-first digital painting application
 */

import { PaintApp } from './core/PaintApp.js';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create global app instance
    window.paintApp = new PaintApp();

    // Initialize the application
    window.paintApp.init().then(() => {
        console.log('PaintNook initialized successfully');
    }).catch(error => {
        console.error('Failed to initialize PaintNook:', error);
    });
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
