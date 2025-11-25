// AdHUB YouTube Downloader - Page Bridge Script
// Běží na localhost, file:// a GitHub Pages stránkách pro komunikaci s rozšířením

(function() {
    'use strict';
    
    const EXTENSION_VERSION = '1.1.0';
    const EXTENSION_ID = chrome.runtime.id;
    
    console.log('[AdHUB] Page bridge loaded, Extension ID:', EXTENSION_ID);
    
    // Signalizace, že rozšíření je aktivní - uložíme do více míst
    function signalExtensionActive() {
        try {
            localStorage.setItem('adhub_extension_active', 'true');
            localStorage.setItem('adhub_extension_timestamp', Date.now().toString());
            localStorage.setItem('adhub_extension_id', EXTENSION_ID);
            localStorage.setItem('adhub_extension_version', EXTENSION_VERSION);
        } catch (e) {
            console.log('[AdHUB] localStorage not available');
        }
        
        // Nastavíme také data atribut na document element
        try {
            document.documentElement.setAttribute('data-adhub-extension', 'true');
            document.documentElement.setAttribute('data-adhub-extension-id', EXTENSION_ID);
            document.documentElement.setAttribute('data-adhub-extension-version', EXTENSION_VERSION);
        } catch (e) {
            console.log('[AdHUB] Could not set data attributes');
        }
    }
    
    // Okamžitě signalizujeme
    signalExtensionActive();
    
    // Odpověď na check event z webové stránky
    window.addEventListener('adhub-extension-check', () => {
        console.log('[AdHUB] Extension check received, responding...');
        signalExtensionActive();
        window.dispatchEvent(new CustomEvent('adhub-extension-response', {
            detail: { 
                extensionId: EXTENSION_ID,
                version: EXTENSION_VERSION,
                active: true
            }
        }));
    });
    
    // Dispatch events přímo bez inline script injection (CSP-safe)
    function dispatchExtensionReady() {
        console.log('[AdHUB] Dispatching extension-ready event');

        // Dispatch custom event - CSP safe
        window.dispatchEvent(new CustomEvent('adhub-extension-ready', {
            detail: {
                extensionId: EXTENSION_ID,
                version: EXTENSION_VERSION,
                active: true
            }
        }));
    }

    // Dispatch hned
    dispatchExtensionReady();

    // A znovu po DOM ready a s opakováním
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            signalExtensionActive();
            dispatchExtensionReady();
        });
    } else {
        // DOM už je ready, dispatchni hned
        dispatchExtensionReady();
    }

    // Periodické opakování pro pozdní načtení
    setTimeout(() => {
        signalExtensionActive();
        dispatchExtensionReady();
    }, 500);

    setTimeout(() => {
        signalExtensionActive();
        dispatchExtensionReady();
    }, 1500);
    
    // Forward zprávy z stránky do rozšíření
    window.addEventListener('message', async (event) => {
        if (event.source !== window) return;
        if (!event.data || event.data.type !== 'ADHUB_REQUEST') return;
        
        const { id, action, payload } = event.data;
        
        console.log('[AdHUB] Bridge received request:', action);
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: action,
                ...payload
            });
            
            window.postMessage({
                type: 'ADHUB_RESPONSE',
                id: id,
                success: true,
                data: response
            }, '*');
            
        } catch (error) {
            console.error('[AdHUB] Bridge error:', error);
            window.postMessage({
                type: 'ADHUB_RESPONSE',
                id: id,
                success: false,
                error: error.message
            }, '*');
        }
    });
    
})();
