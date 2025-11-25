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
    
    // Injektujeme skript do stránky pro komunikaci (okamžitě)
    function injectBridgeScript() {
        const script = document.createElement('script');
        script.textContent = `
            // AdHUB Extension Bridge - Injected
            (function() {
                window.adhubExtensionAvailable = true;
                window.adhubExtensionId = "${EXTENSION_ID}";
                window.adhubExtensionVersion = "${EXTENSION_VERSION}";
                
                console.log('[AdHUB] Extension bridge injected, ID:', window.adhubExtensionId);
                
                // Dispatch event pro okamžitou detekci
                window.dispatchEvent(new CustomEvent('adhub-extension-ready', {
                    detail: { 
                        extensionId: window.adhubExtensionId,
                        version: window.adhubExtensionVersion,
                        active: true
                    }
                }));
                
                // Periodicky opakujeme pro případ pozdního načtení stránky
                setTimeout(function() {
                    window.dispatchEvent(new CustomEvent('adhub-extension-ready', {
                        detail: { 
                            extensionId: window.adhubExtensionId,
                            version: window.adhubExtensionVersion,
                            active: true
                        }
                    }));
                }, 500);
                
                setTimeout(function() {
                    window.dispatchEvent(new CustomEvent('adhub-extension-ready', {
                        detail: { 
                            extensionId: window.adhubExtensionId,
                            version: window.adhubExtensionVersion,
                            active: true
                        }
                    }));
                }, 1500);
            })();
        `;
        (document.head || document.documentElement).appendChild(script);
        script.remove();
    }
    
    // Injektujeme hned
    injectBridgeScript();
    
    // A znovu po DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            signalExtensionActive();
            injectBridgeScript();
        });
    }
    
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
