/**
 * Chat Moderator Extension Download Script
 */

const GITHUB_REPO = 'Deerpfy/adhub';
const GITHUB_BRANCH = 'main';
const EXTENSION_PATH = 'projects/chat-panel/moderator-extension';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

document.getElementById('downloadBtn').addEventListener('click', downloadExtension);

async function downloadExtension() {
    const btn = document.getElementById('downloadBtn');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = `
        <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="30 60"/>
        </svg>
        Stahuji...
    `;

    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);

    try {
        const files = [
            { path: 'manifest.json', binary: false },
            { path: 'background.js', binary: false },
            { path: 'popup.html', binary: false },
            { path: 'popup.js', binary: false },
            { path: 'twitch-content.js', binary: false },
            { path: 'twitch-styles.css', binary: false },
            { path: 'adhub-bridge.js', binary: false },
            { path: 'icons/icon.svg', binary: false },
            { path: 'icons/icon16.png', binary: true },
            { path: 'icons/icon32.png', binary: true },
            { path: 'icons/icon48.png', binary: true },
            { path: 'icons/icon128.png', binary: true },
        ];

        const zip = new JSZip();

        for (const file of files) {
            const url = `${GITHUB_RAW_BASE}/${GITHUB_REPO}/${GITHUB_BRANCH}/${EXTENSION_PATH}/${file.path}`;

            try {
                const response = await fetch(url);
                if (response.ok) {
                    if (file.binary) {
                        const content = await response.arrayBuffer();
                        zip.file(file.path, content);
                    } else {
                        const content = await response.text();
                        zip.file(file.path, content);
                    }
                }
            } catch (e) {
                console.warn(`Failed to fetch ${file.path}:`, e);
            }
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'adhub-chat-moderator-extension.zip';
        a.click();
        URL.revokeObjectURL(downloadUrl);

        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            Stazeno!
        `;

        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }, 3000);

    } catch (error) {
        console.error('Download error:', error);
        btn.innerHTML = 'Chyba - zkuste znovu';
        btn.disabled = false;

        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 3000);
    }
}

// Load JSZip library
if (!window.JSZip) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    document.head.appendChild(script);
}
