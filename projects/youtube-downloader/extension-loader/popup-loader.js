// AdHUB YouTube Downloader - Popup Script for Loader

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[AdHUB Popup] Initializing...');

    // Načti informace o stavu
    await updateStatus();

    // Update button
    document.getElementById('updateBtn').addEventListener('click', async () => {
        const btn = document.getElementById('updateBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner">⏳</span> Aktualizuji...';

        const response = await chrome.runtime.sendMessage({ action: 'checkUpdate' });

        if (response.success) {
            btn.innerHTML = '✅ Aktualizováno!';
            setTimeout(async () => {
                btn.disabled = false;
                btn.innerHTML = '🔄 Zkontrolovat aktualizace';
                await updateStatus();
            }, 2000);
        } else {
            btn.innerHTML = '❌ Chyba při aktualizaci';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '🔄 Zkontrolovat aktualizace';
            }, 2000);
        }
    });

    // YouTube button
    document.getElementById('youtubeBtn').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://www.youtube.com' });
    });
});

async function updateStatus() {
    try {
        // Načti info ze storage
        const result = await chrome.storage.local.get([
            'lastUpdate',
            'content.js',
            'page-bridge.js',
            'popup.js',
            'popup.html'
        ]);

        // Status
        const filesLoaded = Object.keys(result).filter(k => k !== 'lastUpdate').length;
        document.getElementById('status').innerHTML = filesLoaded > 0
            ? '<span class="update-badge">✅ Aktivní</span>'
            : '⚠️ Neaktivní';

        // Počet souborů
        document.getElementById('filesCount').textContent = `${filesLoaded}/4`;

        // Poslední aktualizace
        if (result.lastUpdate) {
            const date = new Date(result.lastUpdate);
            const now = new Date();
            const diffMinutes = Math.floor((now - date) / 1000 / 60);

            let timeStr;
            if (diffMinutes < 1) {
                timeStr = 'Právě teď';
            } else if (diffMinutes < 60) {
                timeStr = `Před ${diffMinutes} min`;
            } else {
                const diffHours = Math.floor(diffMinutes / 60);
                timeStr = `Před ${diffHours}h`;
            }

            document.getElementById('lastUpdate').textContent = timeStr;
        } else {
            document.getElementById('lastUpdate').textContent = 'Nikdy';
        }

    } catch (error) {
        console.error('[AdHUB Popup] Error updating status:', error);
    }
}
