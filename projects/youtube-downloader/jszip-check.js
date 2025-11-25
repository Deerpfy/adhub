// Debug script to check if JSZip loaded
console.log('[AdHUB Debug] jszip-check.js loaded');
console.log('[AdHUB Debug] JSZip available:', typeof JSZip !== 'undefined');
if (typeof JSZip !== 'undefined') {
    console.log('[AdHUB Debug] ✅ JSZip version:', JSZip.version);
} else {
    console.error('[AdHUB Debug] ❌ JSZip NOT loaded - checking why...');

    // Check if the script tag exists
    const scripts = document.querySelectorAll('script');
    console.log('[AdHUB Debug] Total scripts on page:', scripts.length);

    scripts.forEach((script, i) => {
        if (script.src && script.src.includes('jszip')) {
            console.log('[AdHUB Debug] JSZip script tag found:', script.src);
            console.log('[AdHUB Debug] Script loaded:', script.readyState);
        }
    });
}
