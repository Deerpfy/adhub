// AdHUB YouTube Downloader - Page Bridge Script
// Běží na localhost stránkách pro komunikaci s rozšířením

(function() {
    'use strict';
    
    console.log('[AdHUB] Page bridge loaded');
    
    // Signalizace, že rozšíření je aktivní
    try {
        localStorage.setItem('adhub_extension_active', 'true');
        localStorage.setItem('adhub_extension_timestamp', Date.now().toString());
        localStorage.setItem('adhub_extension_id', chrome.runtime.id);
    } catch (e) {
        // localStorage nemusí být dostupný
    }
    
    // Odpověď na check event z webové stránky
    window.addEventListener('adhub-extension-check', () => {
        console.log('[AdHUB] Extension check received, responding...');
        window.dispatchEvent(new CustomEvent('adhub-extension-response', {
            detail: { 
                extensionId: chrome.runtime.id,
                version: '1.0.0',
                active: true
            }
        }));
    });
    
    // Injektujeme skript do stránky pro komunikaci
    const script = document.createElement('script');
    script.textContent = `
        // AdHUB Extension Bridge
        window.adhubExtensionAvailable = true;
        window.adhubExtensionId = "${chrome.runtime.id}";
        console.log('[AdHUB] Extension bridge injected, ID:', window.adhubExtensionId);
        
        // Dispatch event pro okamžitou detekci
        window.dispatchEvent(new CustomEvent('adhub-extension-ready', {
            detail: { 
                extensionId: window.adhubExtensionId,
                version: '1.0.0'
            }
        }));
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
    
    // Forward zprávy z stránky do rozšíření
    window.addEventListener('message', async (event) => {
        if (event.source !== window) return;
        if (!event.data || event.data.type !== 'ADHUB_REQUEST') return;
        
        const { id, action, payload } = event.data;
        
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
            window.postMessage({
                type: 'ADHUB_RESPONSE',
                id: id,
                success: false,
                error: error.message
            }, '*');
        }
    });
    
})();
