/**
 * AdHub Youtube Downloader - Client Script
 * Verze: 2.0.0
 *
 * Tento skript obsluhuje webovou stranku pro stahovani YouTube videi.
 * Obsahuje logiku pro:
 * - Detekci pluginu
 * - Nacteni informaci o commitu z GitHub
 * - Generovani ZIP souboru s pluginem
 * - Komunikaci s pluginem
 *
 * DULEZITE: Zadne cykly, zadne memory leaky!
 */

console.log('[AdHub] Script loaded');

// ============================================================================
// KONSTANTY
// ============================================================================

const GITHUB_REPO = 'Deerpfy/adhub';
const GITHUB_BRANCH = 'main';
const PLUGIN_PATH = 'projects/youtube-downloader/plugin';
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

// ============================================================================
// STAV APLIKACE
// ============================================================================

const state = {
    pluginConnected: false,
    pluginVersion: null,
    latestCommit: null,
    latestManifestVersion: null, // Verze z manifestu na GitHubu
    currentVideoInfo: null,
    currentFormats: null
};

// ============================================================================
// DOM ELEMENTY
// ============================================================================

let elements = {};

// ============================================================================
// INICIALIZACE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[AdHub] DOMContentLoaded');

    initializeDOMElements();
    setupEventListeners();
    loadDownloadsHistory();

    // Poslouchej na plugin ready event
    window.addEventListener('adhub-extension-ready', handlePluginReady);

    // Kontrola pluginu
    checkPlugin();

    // Nacteni informaci o commitu
    loadLatestCommitInfo();

    console.log('[AdHub] Inicializace dokoncena');
});

function initializeDOMElements() {
    elements = {
        // Status
        extensionStatus: document.getElementById('extensionStatus'),
        extensionStatusText: document.getElementById('extensionStatusText'),
        pluginInfoBar: document.getElementById('pluginInfoBar'),
        pluginVersion: document.getElementById('pluginVersion'),
        pluginCommit: document.getElementById('pluginCommit'),

        // Sekce
        installSection: document.getElementById('installSection'),
        downloadSection: document.getElementById('downloadSection'),

        // Commit info
        commitLoading: document.getElementById('commitLoading'),
        commitDetails: document.getElementById('commitDetails'),
        latestCommitId: document.getElementById('latestCommitId'),
        latestCommitDate: document.getElementById('latestCommitDate'),
        latestCommitMessage: document.getElementById('latestCommitMessage'),

        // Download
        downloadPluginBtn: document.getElementById('downloadPluginBtn'),
        downloadProgress: document.getElementById('downloadProgress'),
        downloadProgressFill: document.getElementById('downloadProgressFill'),
        downloadProgressText: document.getElementById('downloadProgressText'),

        // Video form
        videoForm: document.getElementById('videoForm'),
        videoUrl: document.getElementById('videoUrl'),
        fetchInfoBtn: document.getElementById('fetchInfoBtn'),
        videoInfoCard: document.getElementById('videoInfoCard'),
        videoThumbnail: document.getElementById('videoThumbnail'),
        videoTitle: document.getElementById('videoTitle'),
        videoUploader: document.getElementById('videoUploader'),
        videoDuration: document.getElementById('videoDuration'),

        // Formaty
        formatsCard: document.getElementById('formatsCard'),
        combinedFormatsSection: document.getElementById('combinedFormatsSection'),
        videoFormatsSection: document.getElementById('videoFormatsSection'),
        audioFormatsSection: document.getElementById('audioFormatsSection'),
        combinedFormatsList: document.getElementById('combinedFormatsList'),
        videoFormatsList: document.getElementById('videoFormatsList'),
        audioFormatsList: document.getElementById('audioFormatsList'),

        // Historie
        downloadsList: document.getElementById('downloadsList'),

        // Toast
        toastContainer: document.getElementById('toastContainer'),

        // Download plugin small (v sidebaru)
        downloadPluginBtnSmall: document.getElementById('downloadPluginBtnSmall'),
        downloadProgressSmall: document.getElementById('downloadProgressSmall'),
        downloadProgressFillSmall: document.getElementById('downloadProgressFillSmall'),
        downloadProgressTextSmall: document.getElementById('downloadProgressTextSmall'),
        commitIdSmall: document.getElementById('commitIdSmall')
    };
}

function setupEventListeners() {
    // Download plugin button (hlavni)
    if (elements.downloadPluginBtn) {
        elements.downloadPluginBtn.addEventListener('click', () => handleDownloadPlugin('main'));
    }

    // Download plugin button (v sidebaru)
    if (elements.downloadPluginBtnSmall) {
        elements.downloadPluginBtnSmall.addEventListener('click', () => handleDownloadPlugin('small'));
    }

    // Go to YouTube button
    const goToYoutubeBtn = document.getElementById('goToYoutubeBtn');
    if (goToYoutubeBtn) {
        goToYoutubeBtn.addEventListener('click', () => {
            window.open('https://www.youtube.com', '_blank');
        });
    }

    // Video form
    if (elements.videoForm) {
        elements.videoForm.addEventListener('submit', handleVideoSubmit);
    }
}

// ============================================================================
// DETEKCE PLUGINU
// ============================================================================

function handlePluginReady(event) {
    console.log('[AdHub] Plugin ready event received:', event.detail);
    if (event.detail && event.detail.id) {
        state.pluginConnected = true;
        state.pluginId = event.detail.id;
        state.pluginVersion = event.detail.version;
        updatePluginStatus(true);

        // Po detekci pluginu zkontrolujeme verzi
        checkPluginVersion();
    }
}

async function checkPlugin() {
    console.log('[AdHub] Kontroluji plugin...');

    // DULEZITE: Vymaz stare localStorage signaly - zustavaji i po deaktivaci pluginu!
    // Plugin je nastavi znovu, pokud bezi
    clearStalePluginSignals();

    try {
        // Pockej na plugin - pouzijeme jen event-based detekci
        // Protoze localStorage neni spolehlivy (zustavaji stare hodnoty)
        const detected = await detectPluginViaEvent();

        if (detected) {
            console.log('[AdHub] Plugin detekovan');
            state.pluginConnected = true;
            updatePluginStatus(true);

            // Po detekci pluginu zkontrolujeme verzi
            checkPluginVersion();
            return;
        }

        console.log('[AdHub] Plugin nedetekovan');
        state.pluginConnected = false;
        updatePluginStatus(false);

    } catch (error) {
        console.error('[AdHub] Chyba pri detekci pluginu:', error);
        state.pluginConnected = false;
        updatePluginStatus(false);
    }
}

function clearStalePluginSignals() {
    // Kontrola timestamp - pokud je starsi nez 60 sekund, plugin uz nebezi
    const timestamp = localStorage.getItem('adhub_extension_timestamp');
    const now = Date.now();
    const maxAge = 60 * 1000; // 60 sekund

    if (timestamp) {
        const age = now - parseInt(timestamp, 10);
        if (age > maxAge) {
            console.log('[AdHub] Plugin timestamp je stary (' + Math.round(age / 1000) + 's), mazem signaly');
            localStorage.removeItem('adhub_extension_active');
            localStorage.removeItem('adhub_extension_version');
            localStorage.removeItem('adhub_extension_name');
            localStorage.removeItem('adhub_extension_timestamp');
        } else {
            console.log('[AdHub] Plugin timestamp je aktualni (' + Math.round(age / 1000) + 's)');
        }
    } else {
        // Zadny timestamp = stare data, smazat
        console.log('[AdHub] Zadny timestamp, mazem stare signaly');
        localStorage.removeItem('adhub_extension_active');
        localStorage.removeItem('adhub_extension_version');
        localStorage.removeItem('adhub_extension_name');
    }
}

function detectPluginViaEvent() {
    return new Promise((resolve) => {
        // Nejprve zkontroluj localStorage s aktualnim timestamp
        const timestamp = localStorage.getItem('adhub_extension_timestamp');
        const now = Date.now();
        const maxAge = 60 * 1000; // 60 sekund

        if (timestamp && (now - parseInt(timestamp, 10)) < maxAge) {
            const active = localStorage.getItem('adhub_extension_active');
            const version = localStorage.getItem('adhub_extension_version');

            if (active === 'true' && version) {
                console.log('[AdHub] Plugin detekovan z localStorage (timestamp aktualni)');
                state.pluginVersion = version;
                resolve(true);
                return;
            }
        }

        // Timeout 3 sekundy - pokud plugin neodpovi, neni aktivni
        const timeout = setTimeout(() => {
            console.log('[AdHub] Plugin timeout - neni aktivni');
            window.removeEventListener('adhub-extension-ready', readyHandler);
            window.removeEventListener('adhub-extension-response', responseHandler);
            resolve(false);
        }, 3000);

        const readyHandler = (event) => {
            console.log('[AdHub] Prijat adhub-extension-ready event');
            clearTimeout(timeout);
            window.removeEventListener('adhub-extension-ready', readyHandler);
            window.removeEventListener('adhub-extension-response', responseHandler);

            if (event.detail && event.detail.version) {
                state.pluginVersion = event.detail.version;
            }
            resolve(true);
        };

        const responseHandler = (event) => {
            console.log('[AdHub] Prijat adhub-extension-response event');
            clearTimeout(timeout);
            window.removeEventListener('adhub-extension-ready', readyHandler);
            window.removeEventListener('adhub-extension-response', responseHandler);

            if (event.detail && event.detail.version) {
                state.pluginVersion = event.detail.version;
            }
            resolve(true);
        };

        // Poslouchej oba eventy
        window.addEventListener('adhub-extension-ready', readyHandler);
        window.addEventListener('adhub-extension-response', responseHandler);

        // Pozadej plugin o odpoved
        window.dispatchEvent(new CustomEvent('adhub-extension-check'));
    });
}

// ============================================================================
// KONTROLA VERZE PLUGINU
// ============================================================================

function checkPluginVersion() {
    console.log('[AdHub] Kontroluji verzi pluginu...');

    // Porovnej commit ID stazeneho pluginu s nejnovejsim commitem na GitHubu
    const downloadedCommit = localStorage.getItem('adhub_downloaded_commit');
    const latestCommit = state.latestCommit;
    const installedVersion = state.pluginVersion;
    const latestVersion = state.latestManifestVersion;

    if (!installedVersion) {
        console.log('[AdHub] Nemame verzi nainstalovaneho pluginu');
        // Zkontroluj jestli mame stazeny commit - pro install sekci
        checkDownloadedCommitVersion();
        return;
    }

    if (!downloadedCommit) {
        console.log('[AdHub] Zadny stazeny commit v localStorage - plugin nebyl stazen pres tento web');
        // Pokud nemame commit, porovname aspon verze
        if (installedVersion && latestVersion) {
            const isOutdated = compareVersions(installedVersion, latestVersion) < 0;
            if (isOutdated) {
                showUpdateNotification(installedVersion, latestVersion, null, null);
            } else {
                hideUpdateNotification();
                showUpToDateBadge();
            }
        }
        return;
    }

    if (!latestCommit) {
        console.log('[AdHub] Zatim nemame info o nejnovejsim commitu z GitHubu');
        return;
    }

    const downloadedShort = downloadedCommit.substring(0, 7);
    const latestShort = latestCommit.sha.substring(0, 7);

    console.log('[AdHub] Porovnani commitu:', { downloaded: downloadedShort, latest: latestShort });

    if (downloadedShort !== latestShort) {
        console.log('[AdHub] Je k dispozici nova verze (novy commit)!');
        showUpdateNotification(installedVersion, latestVersion, downloadedShort, latestShort);
    } else {
        console.log('[AdHub] Plugin je aktualni');
        hideUpdateNotification();
        showUpToDateBadge();
    }
}

// Porovnani semver verzi: -1 = a < b, 0 = a == b, 1 = a > b
function compareVersions(a, b) {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    const len = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < len; i++) {
        const numA = partsA[i] || 0;
        const numB = partsB[i] || 0;
        if (numA < numB) return -1;
        if (numA > numB) return 1;
    }
    return 0;
}

function showUpToDateBadge() {
    // Zobraz badge ze plugin je aktualni
    if (elements.extensionStatusText) {
        const version = state.pluginVersion || state.latestManifestVersion;
        elements.extensionStatusText.innerHTML = 'Plugin aktivni <span class="version-ok">v' + version + ' (aktualni)</span>';
    }
}

function showUpdateNotification(oldVersion, newVersion, oldCommit, newCommit) {
    // Zobraz banner o dostupne aktualizaci
    let updateBanner = document.getElementById('updateBanner');

    if (!updateBanner) {
        updateBanner = document.createElement('div');
        updateBanner.id = 'updateBanner';
        updateBanner.className = 'update-banner';
    }

    // Zobraz commit ID pokud jsou k dispozici, jinak verze
    let changeInfo = '';
    if (oldCommit && newCommit) {
        changeInfo = `Tvuj commit: <code>${oldCommit}</code> → Nejnovejsi: <code>${newCommit}</code>`;
        if (oldVersion && newVersion && oldVersion !== newVersion) {
            changeInfo += ` (v${oldVersion} → v${newVersion})`;
        }
    } else if (oldVersion && newVersion) {
        changeInfo = `Tvuj plugin: <code>v${oldVersion}</code> → Nejnovejsi: <code>v${newVersion}</code>`;
    }

    updateBanner.innerHTML = `
        <div class="update-banner-content">
            <span class="update-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </span>
            <div class="update-text">
                <strong>Je k dispozici aktualizace!</strong>
                <span>${changeInfo}</span>
            </div>
            <button class="btn btn-update" onclick="handleDownloadPlugin('main')">
                Aktualizovat
            </button>
        </div>
    `;

    // Aktualizuj i status text
    if (elements.extensionStatusText) {
        const version = oldVersion || state.pluginVersion;
        const commitText = oldCommit ? ` (${oldCommit})` : '';
        elements.extensionStatusText.innerHTML = 'Plugin aktivni <span class="version-outdated">v' + version + commitText + ' (zastaraly)</span>';
    }

    // Vloz banner za header
    const container = document.querySelector('.container');
    const header = document.querySelector('header');
    if (container && header && !document.getElementById('updateBanner')) {
        header.after(updateBanner);
    }

    updateBanner.style.display = 'block';
}

function hideUpdateNotification() {
    const updateBanner = document.getElementById('updateBanner');
    if (updateBanner) {
        updateBanner.style.display = 'none';
    }
}

// Kontrola verze pro uzivatele bez aktivniho pluginu (install sekce)
function checkDownloadedCommitVersion() {
    const downloadedCommit = localStorage.getItem('adhub_downloaded_commit');

    if (!downloadedCommit || !state.latestCommit) {
        return;
    }

    const latestShort = state.latestCommit.sha.substring(0, 7);
    const downloadedShort = downloadedCommit.substring(0, 7);

    console.log('[AdHub] Porovnani stazenych verzi:', { downloaded: downloadedShort, latest: latestShort });

    if (downloadedShort !== latestShort) {
        console.log('[AdHub] Stazena verze je zastarala');
        showCommitUpdateNotification(downloadedShort, latestShort);
    }
}

function showCommitUpdateNotification(oldCommit, newCommit) {
    let updateBanner = document.getElementById('updateBanner');

    if (!updateBanner) {
        updateBanner = document.createElement('div');
        updateBanner.id = 'updateBanner';
        updateBanner.className = 'update-banner';
    }

    updateBanner.innerHTML = `
        <div class="update-banner-content">
            <span class="update-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </span>
            <div class="update-text">
                <strong>Je k dispozici nova verze!</strong>
                <span>Stazeno: <code>${oldCommit}</code> → Aktualni: <code>${newCommit}</code></span>
            </div>
            <button class="btn btn-update" onclick="handleDownloadPlugin('main')">
                Stahnout novou verzi
            </button>
        </div>
    `;

    // V install sekci vloz za hero
    const installSection = document.getElementById('installSection');
    if (installSection && !installSection.contains(updateBanner)) {
        const installHero = installSection.querySelector('.install-hero');
        if (installHero && installHero.nextSibling) {
            installSection.insertBefore(updateBanner, installHero.nextSibling);
        } else {
            installSection.insertBefore(updateBanner, installSection.firstChild);
        }
    }

    updateBanner.style.display = 'block';
}

function updatePluginStatus(connected) {
    if (connected) {
        if (elements.extensionStatus) {
            elements.extensionStatus.className = 'extension-status extension-status-on';
        }
        if (elements.extensionStatusText) {
            // Zobraz verzi pokud je dostupna
            if (state.pluginVersion) {
                elements.extensionStatusText.innerHTML = 'Plugin aktivni <span class="version-badge-inline">v' + state.pluginVersion + '</span>';
            } else {
                elements.extensionStatusText.textContent = 'Plugin aktivni';
            }
        }
        if (elements.installSection) {
            elements.installSection.style.display = 'none';
        }
        if (elements.downloadSection) {
            elements.downloadSection.style.display = 'block';
        }
        if (elements.pluginInfoBar) {
            elements.pluginInfoBar.style.display = 'block';
        }
        if (elements.pluginVersion && state.pluginVersion) {
            elements.pluginVersion.textContent = 'v' + state.pluginVersion;
        }
        if (elements.pluginCommit && state.latestCommit) {
            elements.pluginCommit.textContent = state.latestCommit.sha.substring(0, 7);
        }
    } else {
        if (elements.extensionStatus) {
            elements.extensionStatus.className = 'extension-status extension-status-off';
        }
        if (elements.extensionStatusText) {
            elements.extensionStatusText.textContent = 'Plugin neni nainstalovany';
        }
        if (elements.installSection) {
            elements.installSection.style.display = 'block';
        }
        if (elements.downloadSection) {
            elements.downloadSection.style.display = 'none';
        }
        if (elements.pluginInfoBar) {
            elements.pluginInfoBar.style.display = 'none';
        }
    }
}

// ============================================================================
// GITHUB API - NACTENI COMMITU
// ============================================================================

async function loadLatestCommitInfo() {
    console.log('[AdHub] Nacitam informace o poslednim commitu a verzi...');

    try {
        // Nacti commit info a manifest.json paralelne
        const [commitResponse, manifestResponse] = await Promise.all([
            fetch(`${GITHUB_API_BASE}/repos/${GITHUB_REPO}/commits?path=${PLUGIN_PATH}&per_page=1`),
            fetch(`${GITHUB_RAW_BASE}/${GITHUB_REPO}/${GITHUB_BRANCH}/${PLUGIN_PATH}/manifest.json`)
        ]);

        // Zpracuj commit info
        if (commitResponse.ok) {
            const commits = await commitResponse.json();
            if (commits.length > 0) {
                const commit = commits[0];
                state.latestCommit = commit;
                console.log('[AdHub] Posledni commit:', commit.sha.substring(0, 7));

                // Aktualizace UI - commit info
                if (elements.commitLoading) {
                    elements.commitLoading.style.display = 'none';
                }
                if (elements.commitDetails) {
                    elements.commitDetails.style.display = 'block';
                }
                if (elements.latestCommitId) {
                    elements.latestCommitId.textContent = commit.sha.substring(0, 7);
                }
                if (elements.latestCommitDate) {
                    const date = new Date(commit.commit.author.date);
                    elements.latestCommitDate.textContent = date.toLocaleDateString('cs-CZ') + ' ' +
                        date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
                }
                if (elements.latestCommitMessage) {
                    const message = commit.commit.message.split('\n')[0];
                    elements.latestCommitMessage.textContent = message.substring(0, 60) +
                        (message.length > 60 ? '...' : '');
                }
                if (elements.pluginCommit) {
                    elements.pluginCommit.textContent = commit.sha.substring(0, 7);
                }
                if (elements.commitIdSmall) {
                    elements.commitIdSmall.textContent = commit.sha.substring(0, 7);
                }
            }
        }

        // Zpracuj manifest.json pro verzi
        if (manifestResponse.ok) {
            const manifest = await manifestResponse.json();
            if (manifest.version) {
                state.latestManifestVersion = manifest.version;
                console.log('[AdHub] Nejnovejsi verze z manifestu:', manifest.version);

                // Aktualizuj UI s verzi
                updateLatestVersionUI(manifest.version);
            }
        }

        // Zkontroluj verzi pluginu (pokud uz byl detekovan, nebo pro install sekci)
        checkPluginVersion();

    } catch (error) {
        console.error('[AdHub] Chyba pri nacitani informaci:', error);

        if (elements.commitLoading) {
            elements.commitLoading.innerHTML = `<span style="color: #ef4444;">Chyba: ${error.message}</span>`;
        }
    }
}

function updateLatestVersionUI(version) {
    // Aktualizuj commit info sekci aby ukazovala i verzi
    const commitDetails = elements.commitDetails;
    if (commitDetails && !document.getElementById('latestVersionRow')) {
        const versionRow = document.createElement('div');
        versionRow.id = 'latestVersionRow';
        versionRow.className = 'commit-row';
        versionRow.innerHTML = `
            <span class="commit-label">Verze:</span>
            <code id="latestVersion" class="commit-id version-highlight">v${version}</code>
        `;
        commitDetails.insertBefore(versionRow, commitDetails.firstChild);
    } else if (document.getElementById('latestVersion')) {
        document.getElementById('latestVersion').textContent = 'v' + version;
    }

    // Aktualizuj i maly panel v sidebaru
    if (elements.commitIdSmall) {
        elements.commitIdSmall.innerHTML = `v${version}`;
    }
}

// ============================================================================
// STAHOVANI PLUGINU
// ============================================================================

async function handleDownloadPlugin(type = 'main') {
    console.log('[AdHub] Zacinam stahovani pluginu...', type);

    // Vyber spravnych elementu podle typu
    const isSmall = type === 'small';
    const btn = isSmall ? elements.downloadPluginBtnSmall : elements.downloadPluginBtn;
    const progress = isSmall ? elements.downloadProgressSmall : elements.downloadProgress;
    const progressFill = isSmall ? elements.downloadProgressFillSmall : elements.downloadProgressFill;
    const progressText = isSmall ? elements.downloadProgressTextSmall : elements.downloadProgressText;

    if (!btn) {
        console.error('[AdHub] Tlacitko nenalezeno');
        return;
    }

    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Stahuji...';
    if (progress) progress.style.display = 'block';
    if (progressText) progressText.textContent = 'Nacitam soubory z GitHubu...';
    if (progressFill) progressFill.style.width = '10%';

    try {
        // Krok 1: Ziskani seznamu souboru
        console.log('[AdHub] Krok 1: Ziskavam seznam souboru');
        const filesUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${PLUGIN_PATH}?ref=${GITHUB_BRANCH}`;
        const filesResponse = await fetch(filesUrl);

        if (!filesResponse.ok) {
            throw new Error(`Nelze nacist seznam souboru: ${filesResponse.status}`);
        }

        const files = await filesResponse.json();
        if (progressFill) progressFill.style.width = '20%';
        if (progressText) progressText.textContent = `Nalezeno ${files.length} souboru...`;

        // Krok 2: Stazeni vsech souboru
        console.log('[AdHub] Krok 2: Stahuji soubory');
        const zip = new JSZip();
        const pluginFolder = zip.folder('adhub-youtube-downloader');

        let downloadedCount = 0;
        for (const file of files) {
            if (file.type === 'file') {
                const content = await fetchFileContent(file.download_url);
                pluginFolder.file(file.name, content);
                downloadedCount++;
                if (progressFill) progressFill.style.width = `${20 + (downloadedCount / files.length) * 50}%`;
                if (progressText) progressText.textContent = `Stahuji: ${file.name}`;
            } else if (file.type === 'dir' && file.name === 'icons') {
                // Zpracovani slozky icons
                const iconsFolder = pluginFolder.folder('icons');
                const iconsUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${PLUGIN_PATH}/icons?ref=${GITHUB_BRANCH}`;
                const iconsResponse = await fetch(iconsUrl);
                const icons = await iconsResponse.json();

                for (const icon of icons) {
                    if (icon.type === 'file') {
                        const iconContent = await fetchFileContent(icon.download_url, true);
                        iconsFolder.file(icon.name, iconContent);
                    }
                }
            }
        }

        if (progressFill) progressFill.style.width = '80%';
        if (progressText) progressText.textContent = 'Generuji ZIP soubor...';

        // Krok 3: Generovani ZIP
        console.log('[AdHub] Krok 3: Generuji ZIP');
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });

        if (progressFill) progressFill.style.width = '90%';
        if (progressText) progressText.textContent = 'Pripravuji ke stazeni...';

        // Krok 4: Stahovani
        console.log('[AdHub] Krok 4: Spoustim stahovani');
        const downloadUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;

        // Pridani commit ID do nazvu souboru
        const commitId = state.latestCommit ? state.latestCommit.sha.substring(0, 7) : 'latest';
        a.download = `adhub-youtube-downloader-${commitId}.zip`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        // Uloz commit ID do localStorage pro pozdejsi kontrolu verze
        if (state.latestCommit) {
            localStorage.setItem('adhub_downloaded_commit', state.latestCommit.sha);
            console.log('[AdHub] Ulozen stazeny commit:', state.latestCommit.sha.substring(0, 7));
            // Skryj update banner pokud je videt
            hideUpdateNotification();
        }

        if (progressFill) progressFill.style.width = '100%';
        if (progressText) progressText.textContent = 'Stahovani dokonceno!';

        showToast('Plugin uspesne stazen! Rozbalte ZIP a nainstalujte podle navodu.', 'success');

        btn.innerHTML = 'Stazeno!';
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalBtnHtml;
            if (progress) progress.style.display = 'none';
            if (progressFill) progressFill.style.width = '0%';
        }, 2000);

    } catch (error) {
        console.error('[AdHub] Chyba pri stahovani:', error);
        showToast('Chyba pri stahovani: ' + error.message, 'error');

        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
        if (progress) progress.style.display = 'none';
    }
}

async function fetchFileContent(url, isBinary = false) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Nelze stahnout soubor: ${url}`);
    }

    if (isBinary) {
        return await response.arrayBuffer();
    }
    return await response.text();
}

// ============================================================================
// VIDEO FORM
// ============================================================================

async function handleVideoSubmit(e) {
    e.preventDefault();

    const url = elements.videoUrl.value.trim();
    if (!url) {
        showToast('Zadej YouTube URL', 'error');
        return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
        showToast('Neplatna YouTube URL', 'error');
        return;
    }

    if (!state.pluginConnected) {
        showToast('Plugin neni nainstalovany', 'error');
        return;
    }

    elements.fetchInfoBtn.disabled = true;
    elements.fetchInfoBtn.textContent = 'Nacitam...';

    if (elements.videoInfoCard) elements.videoInfoCard.style.display = 'none';
    if (elements.formatsCard) elements.formatsCard.style.display = 'none';

    try {
        // Ziskani informaci pres bridge
        const videoInfo = await sendMessageViaBridge('getVideoInfo', { videoId });

        if (!videoInfo || !videoInfo.success) {
            throw new Error(videoInfo?.error || 'Nelze ziskat informace');
        }

        state.currentVideoInfo = videoInfo;
        displayVideoInfo(videoInfo);

        // Ziskani formatu
        const formatsResult = await sendMessageViaBridge('getDownloadLinks', { videoId });

        if (!formatsResult || !formatsResult.success) {
            throw new Error(formatsResult?.error || 'Nelze ziskat formaty');
        }

        state.currentFormats = formatsResult;
        displayFormats(formatsResult);

    } catch (error) {
        showToast(`Chyba: ${error.message}`, 'error');
    } finally {
        elements.fetchInfoBtn.disabled = false;
        elements.fetchInfoBtn.textContent = 'Ziskat informace';
    }
}

function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// ============================================================================
// KOMUNIKACE S PLUGINEM
// ============================================================================

function sendMessageViaBridge(action, payload) {
    return new Promise((resolve, reject) => {
        const id = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        const timeout = setTimeout(() => {
            window.removeEventListener('message', handler);
            reject(new Error('Casovy limit vyprseny'));
        }, 30000);

        const handler = (event) => {
            if (event.source !== window) return;
            if (!event.data || event.data.type !== 'ADHUB_RESPONSE') return;
            if (event.data.requestId !== id) return;

            clearTimeout(timeout);
            window.removeEventListener('message', handler);

            if (event.data.success) {
                resolve(event.data.data);
            } else {
                reject(new Error(event.data.error || 'Pozadavek selhal'));
            }
        };

        window.addEventListener('message', handler);

        window.postMessage({
            type: 'ADHUB_REQUEST',
            requestId: id,
            action: action,
            payload: payload
        }, '*');
    });
}

// ============================================================================
// ZOBRAZENI DAT
// ============================================================================

function displayVideoInfo(info) {
    if (elements.videoThumbnail) {
        elements.videoThumbnail.src = info.thumbnail || info.thumbnailMedium;
    }
    if (elements.videoTitle) {
        elements.videoTitle.textContent = info.title || 'Neznamy nazev';
    }
    if (elements.videoUploader) {
        elements.videoUploader.textContent = info.author || 'Neznamy';
    }
    if (elements.videoInfoCard) {
        elements.videoInfoCard.style.display = 'block';
    }
}

function displayFormats(data) {
    // Reset
    if (elements.combinedFormatsList) elements.combinedFormatsList.innerHTML = '';
    if (elements.videoFormatsList) elements.videoFormatsList.innerHTML = '';
    if (elements.audioFormatsList) elements.audioFormatsList.innerHTML = '';

    if (elements.combinedFormatsSection) elements.combinedFormatsSection.style.display = 'none';
    if (elements.videoFormatsSection) elements.videoFormatsSection.style.display = 'none';
    if (elements.audioFormatsSection) elements.audioFormatsSection.style.display = 'none';

    if (!data.formats) {
        showToast('Zadne formaty nejsou dostupne', 'error');
        return;
    }

    const formats = data.formats;

    // Combined formaty
    const combined = [...(formats.combined?.mp4 || []), ...(formats.combined?.webm || [])];
    if (combined.length > 0 && elements.combinedFormatsSection) {
        elements.combinedFormatsSection.style.display = 'block';
        combined.forEach(format => {
            elements.combinedFormatsList.appendChild(createFormatItem(format, data.videoId));
        });
    }

    // Video formaty
    const video = [...(formats.video?.mp4 || []), ...(formats.video?.webm || [])].slice(0, 5);
    if (video.length > 0 && elements.videoFormatsSection) {
        elements.videoFormatsSection.style.display = 'block';
        video.forEach(format => {
            elements.videoFormatsList.appendChild(createFormatItem(format, data.videoId));
        });
    }

    // Audio formaty
    const audio = [...(formats.audio?.m4a || []), ...(formats.audio?.webm || [])].slice(0, 4);
    if (audio.length > 0 && elements.audioFormatsSection) {
        elements.audioFormatsSection.style.display = 'block';
        audio.forEach(format => {
            elements.audioFormatsList.appendChild(createFormatItem(format, data.videoId));
        });
    }

    if (elements.formatsCard) {
        elements.formatsCard.style.display = 'block';
    }
}

function createFormatItem(format, videoId) {
    const div = document.createElement('div');
    div.className = 'format-item';

    let quality = format.quality || format.audioQuality || 'Neznama';
    if (format.type === 'audio' && format.bitrate) {
        quality = Math.round(format.bitrate / 1000) + ' kbps';
    }

    const size = format.fileSize ? formatFileSize(format.fileSize) : '-';
    const container = format.container?.toUpperCase() || 'MP4';

    const title = state.currentVideoInfo?.title || 'video';
    const safeTitle = title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 80);
    const filename = `${safeTitle}_${quality}.${format.container || 'mp4'}`;

    div.innerHTML = `
        <div class="format-info">
            <span class="format-quality">${quality}</span>
            <span class="format-details">${container} | ${size}</span>
        </div>
        <button class="btn btn-download-format">Stahnout</button>
    `;

    const btn = div.querySelector('.btn-download-format');
    btn.addEventListener('click', () => handleFormatDownload(btn, format.url, filename, videoId));

    return div;
}

async function handleFormatDownload(button, url, filename, videoId) {
    button.disabled = true;
    button.textContent = 'Stahuji...';

    try {
        const response = await sendMessageViaBridge('downloadVideo', {
            url: url,
            filename: filename,
            videoId: videoId
        });

        if (response && response.success) {
            button.textContent = 'Stazeno!';
            button.style.background = '#22c55e';

            addToDownloadsHistory({
                filename: filename,
                date: new Date().toISOString(),
                videoId: videoId
            });

            showToast(`Stahovani zahajeno: ${filename}`, 'success');
        } else {
            throw new Error(response?.error || 'Stahovani selhalo');
        }

    } catch (error) {
        button.textContent = 'Chyba!';
        button.style.background = '#ef4444';
        showToast(`Chyba: ${error.message}`, 'error');
    }

    setTimeout(() => {
        button.disabled = false;
        button.textContent = 'Stahnout';
        button.style.background = '';
    }, 3000);
}

// ============================================================================
// HISTORIE
// ============================================================================

function loadDownloadsHistory() {
    if (!elements.downloadsList) return;

    let history = JSON.parse(localStorage.getItem('adhub_downloads_history') || '[]');

    // Smazat stare polozky (>48h)
    const now = Date.now();
    const maxAge = 48 * 60 * 60 * 1000;

    history = history.filter(item => {
        const itemAge = now - new Date(item.date).getTime();
        return itemAge < maxAge;
    });

    localStorage.setItem('adhub_downloads_history', JSON.stringify(history));

    if (history.length === 0) {
        elements.downloadsList.innerHTML = '<p class="empty-state-text">Zatim zadne stazene soubory</p>';
        return;
    }

    elements.downloadsList.innerHTML = '';
    history.slice(0, 10).forEach(item => {
        const div = document.createElement('div');
        div.className = 'download-item';
        div.style.cursor = 'pointer';

        const date = new Date(item.date);
        const dateStr = date.toLocaleDateString('cs-CZ') + ' ' +
            date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

        const itemAge = now - date.getTime();
        const hoursRemaining = Math.floor((maxAge - itemAge) / (60 * 60 * 1000));

        div.innerHTML = `
            <div class="download-item-info">
                <div class="filename">${item.filename}</div>
                <div class="file-date">${dateStr} (${hoursRemaining}h zbyva)</div>
            </div>
        `;

        if (item.videoId) {
            div.addEventListener('click', () => {
                elements.videoUrl.value = item.videoId;
                elements.videoForm.dispatchEvent(new Event('submit'));
            });
        }

        elements.downloadsList.appendChild(div);
    });
}

function addToDownloadsHistory(item) {
    const history = JSON.parse(localStorage.getItem('adhub_downloads_history') || '[]');
    history.unshift(item);
    if (history.length > 20) history.pop();
    localStorage.setItem('adhub_downloads_history', JSON.stringify(history));
    loadDownloadsHistory();
}

// ============================================================================
// UTILITY
// ============================================================================

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
}

function showToast(message, type = 'info') {
    if (!elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Globalni funkce pro kopirovani
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Zkopirovano!', 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Zkopirovano!', 'success');
    });
};

// Globalni funkce pro stahovani pluginu (pro onclick v HTML)
window.handleDownloadPlugin = handleDownloadPlugin;
