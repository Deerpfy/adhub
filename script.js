// AdHUB - Central Hub Script
// Version management
const APP_VERSION = '1.3.0';

// ============================================
// GITHUB API - YouTube Downloader Plugin Version
// ============================================
const GITHUB_REPO = 'Deerpfy/adhub';
const GITHUB_BRANCH = 'main';
const PLUGIN_PATH = 'projects/youtube-downloader/plugin';
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

// Plugin version state
let pluginLatestCommit = null;
let pluginLatestVersion = null;

// ============================================
// VIEW COUNTER MODULE - Firebase Realtime Database
// ============================================
// Pro správné fungování počítadla návštěvnosti je potřeba:
// 1. Vytvořit Firebase projekt na https://console.firebase.google.com/
// 2. Vytvořit Realtime Database (Start in test mode)
// 3. Nastavit pravidla databáze (viz níže)
// 4. Zkopírovat konfiguraci do FIREBASE_CONFIG
//
// Pravidla pro Firebase Realtime Database:
// {
//   "rules": {
//     "views": {
//       ".read": true,
//       "$tool_id": {
//         ".write": true,
//         ".validate": "newData.isNumber() && newData.val() === data.val() + 1"
//       }
//     }
//   }
// }
// ============================================

// Firebase konfigurace pro AdHUB
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBVB12MdkfloLnyaPp34CMCmb4ZUnfkZ24",
    authDomain: "adhub-views.firebaseapp.com",
    databaseURL: "https://adhub-views-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "adhub-views",
    storageBucket: "adhub-views.firebasestorage.app",
    messagingSenderId: "248696540700",
    appId: "1:248696540700:web:d3bbd247c4a091e29119d9"
};

// Stav počítadla návštěv
let viewCounts = {};
let firebaseInitialized = false;
let firebaseDb = null;
let pendingIncrements = new Set(); // Ochrana proti vícenásobnému volání

// Inicializace Firebase (pouze pokud je nakonfigurováno)
async function initFirebase() {
    if (!FIREBASE_CONFIG.databaseURL) {
        console.log('[ViewCounter] Firebase není nakonfigurováno, používám localStorage jako fallback');
        loadViewCountsFromLocalStorage();
        return false;
    }

    try {
        // Dynamické načtení Firebase SDK
        if (typeof firebase === 'undefined') {
            await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
            await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js');
        }

        // Inicializace Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }

        firebaseDb = firebase.database();
        firebaseInitialized = true;

        // Načtení počtů z Firebase
        await loadViewCountsFromFirebase();

        console.log('[ViewCounter] Firebase inicializováno úspěšně');
        return true;
    } catch (error) {
        console.error('[ViewCounter] Chyba při inicializaci Firebase:', error);
        loadViewCountsFromLocalStorage();
        return false;
    }
}

// Pomocná funkce pro dynamické načtení skriptu
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Načtení počtů z Firebase
async function loadViewCountsFromFirebase() {
    if (!firebaseDb) return;

    try {
        const snapshot = await firebaseDb.ref('views').once('value');
        const data = snapshot.val() || {};
        viewCounts = data;

        // Uložení do localStorage jako cache
        localStorage.setItem('adhub_view_counts', JSON.stringify(viewCounts));

        // Aktualizace UI
        updateViewCountsUI();
    } catch (error) {
        console.error('[ViewCounter] Chyba při načítání z Firebase:', error);
        loadViewCountsFromLocalStorage();
    }
}

// Načtení počtů z localStorage (fallback)
function loadViewCountsFromLocalStorage() {
    try {
        const cached = localStorage.getItem('adhub_view_counts');
        viewCounts = cached ? JSON.parse(cached) : {};
        updateViewCountsUI();
    } catch (error) {
        console.error('[ViewCounter] Chyba při načítání z localStorage:', error);
        viewCounts = {};
    }
}

// Inkrementace počtu návštěv pro konkrétní nástroj
async function incrementViewCount(toolId) {
    if (!toolId) return;

    // Ochrana proti vícenásobnému volání (debounce)
    if (pendingIncrements.has(toolId)) {
        console.log(`[ViewCounter] ${toolId}: již probíhá, přeskakuji`);
        return;
    }
    pendingIncrements.add(toolId);

    // Odeslání do Firebase (pokud je nakonfigurováno)
    if (firebaseInitialized && firebaseDb) {
        try {
            // Použijeme serverValue.increment pro atomickou operaci
            await firebaseDb.ref(`views/${toolId}`).set(
                firebase.database.ServerValue.increment(1)
            );

            // Po úspěšném zápisu načteme aktuální hodnotu
            const snapshot = await firebaseDb.ref(`views/${toolId}`).once('value');
            const newValue = snapshot.val() || 0;
            viewCounts[toolId] = newValue;

            // Uložení do localStorage jako cache
            localStorage.setItem('adhub_view_counts', JSON.stringify(viewCounts));

            // Aktualizace UI
            updateViewCountUI(toolId);

            console.log(`[ViewCounter] ${toolId}: ${newValue}`);
        } catch (error) {
            console.error('[ViewCounter] Chyba při ukládání do Firebase:', error);
            // Fallback na lokální inkrementaci
            viewCounts[toolId] = (viewCounts[toolId] || 0) + 1;
            localStorage.setItem('adhub_view_counts', JSON.stringify(viewCounts));
            updateViewCountUI(toolId);
        }
    } else {
        // Fallback - pouze localStorage
        viewCounts[toolId] = (viewCounts[toolId] || 0) + 1;
        localStorage.setItem('adhub_view_counts', JSON.stringify(viewCounts));
        updateViewCountUI(toolId);
    }

    // Uvolnění zámku po krátké době
    setTimeout(() => pendingIncrements.delete(toolId), 1000);
}

// Aktualizace UI pro všechny počítadla
function updateViewCountsUI() {
    Object.keys(viewCounts).forEach(toolId => {
        updateViewCountUI(toolId);
    });
}

// Aktualizace UI pro jedno počítadlo
function updateViewCountUI(toolId) {
    const countElement = document.querySelector(`[data-view-count="${toolId}"]`);
    if (countElement) {
        const count = viewCounts[toolId] || 0;
        countElement.textContent = formatViewCount(count);
        countElement.title = `${count} ${t('view_count_title')}`;
    }
}

// Formátování čísla návštěv (1234 -> 1.2k)
function formatViewCount(count) {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return count.toString();
}

// Získání počtu návštěv pro nástroj
function getViewCount(toolId) {
    return viewCounts[toolId] || 0;
}

// All available languages for translation (ISO 639-1 codes)
const AVAILABLE_LANGUAGES = [
    { code: 'cs', name: 'Czech', native: 'Čeština', flag: '🇨🇿' },
    { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
    { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇵🇹' },
    { code: 'pl', name: 'Polish', native: 'Polski', flag: '🇵🇱' },
    { code: 'sk', name: 'Slovak', native: 'Slovenčina', flag: '🇸🇰' },
    { code: 'nl', name: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
    { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
    { code: 'uk', name: 'Ukrainian', native: 'Українська', flag: '🇺🇦' },
    { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
    { code: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳' },
    { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷' },
    { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
    { code: 'sv', name: 'Swedish', native: 'Svenska', flag: '🇸🇪' },
    { code: 'da', name: 'Danish', native: 'Dansk', flag: '🇩🇰' },
    { code: 'fi', name: 'Finnish', native: 'Suomi', flag: '🇫🇮' },
    { code: 'no', name: 'Norwegian', native: 'Norsk', flag: '🇳🇴' },
    { code: 'el', name: 'Greek', native: 'Ελληνικά', flag: '🇬🇷' },
    { code: 'hu', name: 'Hungarian', native: 'Magyar', flag: '🇭🇺' },
    { code: 'ro', name: 'Romanian', native: 'Română', flag: '🇷🇴' },
    { code: 'bg', name: 'Bulgarian', native: 'Български', flag: '🇧🇬' },
    { code: 'hr', name: 'Croatian', native: 'Hrvatski', flag: '🇭🇷' },
    { code: 'sl', name: 'Slovenian', native: 'Slovenščina', flag: '🇸🇮' },
    { code: 'sr', name: 'Serbian', native: 'Српски', flag: '🇷🇸' },
    { code: 'he', name: 'Hebrew', native: 'עברית', flag: '🇮🇱' },
    { code: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭' },
    { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', flag: '🇲🇾' },
    { code: 'lt', name: 'Lithuanian', native: 'Lietuvių', flag: '🇱🇹' },
    { code: 'lv', name: 'Latvian', native: 'Latviešu', flag: '🇱🇻' },
    { code: 'et', name: 'Estonian', native: 'Eesti', flag: '🇪🇪' },
    { code: 'ca', name: 'Catalan', native: 'Català', flag: '🏴󠁥󠁳󠁣󠁴󠁿' },
    { code: 'af', name: 'Afrikaans', native: 'Afrikaans', flag: '🇿🇦' },
    { code: 'sw', name: 'Swahili', native: 'Kiswahili', flag: '🇰🇪' }
];

// Base translations (Czech and English as defaults)
const BASE_TRANSLATIONS = {
    cs: {
        search_placeholder: 'Vyhledat nástroj, odkaz...',
        loading: 'Načítání...',
        refresh_title: 'Obnovit',
        no_results: 'Žádné výsledky',
        try_different: 'Zkuste změnit vyhledávání nebo filtry',
        footer_text: 'AdHUB - Centrální Hub pro nástroje a utility',
        filter_all: 'Vše',
        filter_tools: 'Nástroje',
        filter_links: 'Odkazy',
        status_loaded: 'Načteno {tools} nástrojů, {links} odkazů',
        open: 'Otevřít',
        local_badge: '📦 Lokální',
        no_description: 'Bez popisu',
        category_video: 'video',
        category_streaming: 'streaming',
        category_demos: 'demo',
        category_setup: 'setup',
        tool_youtube_name: 'YouTube Downloader',
        tool_youtube_desc: 'Stáhněte si rozšíření pro Chrome/Edge/Brave a stahujte YouTube videa přímo z prohlížeče.',
        tool_chat_name: 'Multistream Chat Panel',
        tool_chat_desc: 'Unified chat pro Twitch, Kick a YouTube s overlay módy. Vyžaduje spuštění lokálního serveru.',
        tool_chat_mod_name: 'Chat Moderator Extension',
        tool_chat_mod_desc: 'Chrome rozšíření pro moderaci Twitch chatu. Ban, timeout a mazání zpráv přímo z Multistream Chat.',
        tool_pizza_name: 'KomoPizza Demo',
        tool_pizza_desc: 'Ukázková objednávková aplikace pro rychlé prototypování UI konceptů.',
        tool_spinning_name: 'Spinning Wheel Giveaway',
        tool_spinning_desc: 'Interaktivní kolotoč pro losování výherců na streamech a giveaway akcích.',
        tool_resignation_name: 'Sázky na výpověď',
        tool_resignation_desc: 'Casino aplikace pro sázení na to, kdo dá dřív výpověď z práce. Zábavná ruleta s offline úložištěm.',
        tool_ai_prompting_name: 'AI Prompting',
        tool_ai_prompting_desc: 'Profesionální formátovač promptů s 7 metodami (CoT, Few-Shot, ToT, atd.), 5 jazyky a lokálním úložištěm.',
        tool_pdf_merge_name: 'PDF Merge',
        tool_pdf_merge_desc: 'Spojte více PDF souborů do jednoho dokumentu. Jednoduché přetažení, náhled stránek a změna pořadí.',
        tool_pdf_editor_name: 'PDF Editor',
        tool_pdf_editor_desc: 'Editujte, podepisujte, komprimujte a reorganizujte PDF soubory. 100% client-side zpracování.',
        tool_pdf_search_name: 'PDF Search',
        tool_pdf_search_desc: 'Fulltextové vyhledávání v PDF souborech. Nahrajte více PDF a hledejte v nich pomocí MiniSearch. 100% client-side.',
        tool_mindhub_name: 'MindHub',
        tool_mindhub_desc: 'Osobní koordinační platforma pro správu myšlenek, úkolů a myšlenkových map. Organizujte své nápady vizuálně.',
        tool_steam_farm_name: 'Steam Farm',
        tool_steam_farm_desc: 'Farming Steam hodin a trading cards. Simuluje hraní až 32 her současně. Vyžaduje rozšíření a Native Host.',
        tool_rust_calculator_name: 'Rust Calculator',
        tool_rust_calculator_desc: 'Offline kalkulátor pro hru Rust - raid náklady, crafting recepty a suroviny. PWA fungující 100% offline.',
        tool_docbook_name: 'DocBook',
        tool_docbook_desc: 'Offline dokumentační platforma inspirovaná GitBookem. WYSIWYG Markdown editor, hierarchická navigace, fulltext vyhledávání a export. 100% offline PWA.',
        tool_nimt_tracker_name: 'AI Visibility Tracker',
        tool_nimt_tracker_desc: 'Sledujte viditelnost vaší značky v AI vyhledávačích. Share of Voice, citace zdrojů, konkurenční analýza. 100% offline PWA.',
        tool_api_catalog_name: 'API Katalog',
        tool_api_catalog_desc: 'Offline-first katalog 10,000+ API. Procházejte, vyhledávejte a spravujte API podle kategorií. PWA s IndexedDB, import/export dat. Založeno na analýze API-mega-list.',
        tool_server_hub_name: 'Server Hub',
        tool_server_hub_desc: 'Offline-first PWA pro správu serverů, webů a záloh. Inspirováno xCloud control panelem. IndexedDB databáze, export/import dat.',
        category_gaming: 'gaming',
        category_documentation: 'dokumentace',
        link_ninite_name: 'Ninite – rychlá instalace Windows aplikací',
        link_ninite_desc: 'Vyber aplikace a nainstaluj je jedním kliknutím po čisté instalaci Windows.',
        link_winget_name: 'Winget.run katalog balíčků',
        link_winget_desc: 'Webový katalog pro Microsoft WinGet – rychlé skripty a příkazy k instalaci.',
        link_obs_name: 'OBS Studio Download',
        link_obs_desc: 'Oficiální stránka s instalátory OBS Studio pro streamování a záznam.',
        link_ytdlp_name: 'yt-dlp Releases',
        link_ytdlp_desc: 'Poslední buildy yt-dlp potřebné pro náš downloader, včetně návodu k instalaci.',
        link_hibp_name: 'Have I Been Pwned',
        link_hibp_desc: 'Zkontrolujte, zda vaše e-mailová adresa nebo heslo unikly při úniku dat. Bezpečnostní nástroj od Troye Hunta.',
        translating: 'Překládám...',
        translation_error: 'Chyba překladu',
        search_language: 'Hledat jazyk...',
        idea_button: 'Sdílet nápad',
        idea_modal_title: 'Sdílejte svůj nápad',
        idea_modal_description: 'Máte nápad na novou funkci nebo vylepšení? Připojte se k našemu Discord serveru a sdílejte své nápady v AI kanálu!',
        view_count: 'zobrazení',
        view_count_title: 'zobrazení',
        top_clicked_title: 'Nejproklikávanější položka',
        // Lazy loading
        load_more: 'Načíst další',
        loading_more: 'Načítám...',
        showing_items: 'Zobrazeno {current} z {total} položek',
        all_items_loaded: 'Všechny položky načteny',
        // Sections
        section_our_tools: 'Naše nástroje',
        section_our_tools_badge: 'Lokální projekty',
        section_external_links: 'Externí nástroje',
        section_external_links_badge: 'Bezplatné online služby',
        // Security & Privacy
        link_virustotal_name: 'VirusTotal',
        link_virustotal_desc: 'Skenujte soubory a URL pomocí 70+ antivirových enginů současně.',
        link_ssllabs_name: 'SSL Labs SSL Test',
        link_ssllabs_desc: 'Hloubková analýza SSL/TLS konfigurace pro jakýkoli veřejný web server.',
        link_mozilla_observatory_name: 'Mozilla HTTP Observatory',
        link_mozilla_observatory_desc: 'Komplexní hodnocení HTTP bezpečnostních hlaviček s doporučeními.',
        link_hybrid_analysis_name: 'Hybrid Analysis',
        link_hybrid_analysis_desc: 'Bezplatný malware sandbox využívající behaviorální analýzu.',
        link_amiunique_name: 'Am I Unique?',
        link_amiunique_desc: 'Testuje unikátnost otisku prohlížeče pro posouzení expozice soukromí.',
        link_securityheaders_name: 'Security Headers',
        link_securityheaders_desc: 'Okamžitá analýza a hodnocení HTTP bezpečnostních hlaviček.',
        // System Utilities
        link_patchmypc_name: 'Patch My PC',
        link_patchmypc_desc: 'Automaticky skenuje a aktualizuje 300+ Windows programů.',
        link_jotti_name: 'Jotti\'s Malware Scan',
        link_jotti_desc: 'Multi-engine skener souborů, až 250MB na soubor.',
        link_metadefender_name: 'MetaDefender Cloud',
        link_metadefender_desc: '20+ antivirových enginů plus sanitizace souborů.',
        link_internxt_name: 'Internxt Virus Scanner',
        link_internxt_desc: 'Skenování virů zaměřené na soukromí s nulovou znalostí.',
        // File Conversion
        link_ilovepdf_name: 'iLovePDF',
        link_ilovepdf_desc: 'Kompletní PDF nástroje: slučování, rozdělování, komprese, konverze.',
        link_pdf24_name: 'PDF24 Tools',
        link_pdf24_desc: '100% bezplatný PDF konvertor a editor bez limitů.',
        link_smallpdf_name: 'Smallpdf',
        link_smallpdf_desc: 'Cloudová PDF konverze s rozhraním drag-and-drop.',
        link_cloudconvert_name: 'CloudConvert',
        link_cloudconvert_desc: 'Univerzální konvertor podporující téměř všechny formáty (25 zdarma/den).',
        link_zamzar_name: 'Zamzar',
        link_zamzar_desc: 'Podpora 1200+ formátů od roku 2006.',
        link_onlineconvert_name: 'Online-Convert',
        link_onlineconvert_desc: 'Komplexní konvertor pro audio, video, dokumenty, e-knihy.',
        link_freeconvert_name: 'FreeConvert',
        link_freeconvert_desc: 'Konverze obrázků, videa, audia s limitem 1GB.',
        link_convertio_name: 'Convertio',
        link_convertio_desc: 'Univerzální konvertor s 300+ formáty, automatické mazání souborů.',
        link_tinypng_name: 'TinyPNG',
        link_tinypng_desc: 'Chytrá komprese snižující velikost obrázku o 40-80% při zachování kvality.',
        link_removebg_name: 'Remove.bg',
        link_removebg_desc: 'AI automatické odstranění pozadí za 5 sekund.',
        link_audioconverter_name: 'Online Audio Converter',
        link_audioconverter_desc: 'Převod audia na MP3, WAV, FLAC, OGG a další.',
        link_toepub_name: 'ToEpub',
        link_toepub_desc: 'Konvertor e-knih podporující 36 vstupních formátů.',
        // Developer Tools
        link_regex101_name: 'Regex101',
        link_regex101_desc: 'Zlatý standard regex testeru s automaticky generovanými vysvětleními.',
        link_regexr_name: 'RegExr',
        link_regexr_desc: 'Interaktivní regex nástroj s knihovnou komunitních vzorů.',
        link_jsonlint_name: 'JSONLint',
        link_jsonlint_desc: 'Originální JSON validátor a reformátor.',
        link_jsoneditor_name: 'JSON Editor Online',
        link_jsoneditor_desc: 'Prohlížení, editace, formátování, porovnávání a transformace JSON.',
        link_jsoncrack_name: 'JSON Crack',
        link_jsoncrack_desc: 'Vizualizace JSON jako interaktivní grafy a stromové pohledy.',
        link_hoppscotch_name: 'Hoppscotch',
        link_hoppscotch_desc: 'Open-source alternativa Postman pro testování API.',
        link_reqbin_name: 'ReqBin',
        link_reqbin_desc: 'Testování REST API s přesností na milisekundy.',
        link_codepen_name: 'CodePen',
        link_codepen_desc: 'Front-end hřiště pro HTML, CSS, JavaScript.',
        link_jsfiddle_name: 'JSFiddle',
        link_jsfiddle_desc: 'Kódovací hřiště s podporou frameworků a kolaborace.',
        link_playcode_name: 'PlayCode',
        link_playcode_desc: 'Rychlé JS hřiště s podporou React, Vue, TypeScript.',
        link_diffchecker_name: 'Diffchecker',
        link_diffchecker_desc: 'Porovnání textů, souborů, obrázků a kódu vedle sebe.',
        link_base64_name: 'Base64 Decode/Encode',
        link_base64_desc: 'Čisté Base64 kódování/dekódování s podporou souborů.',
        link_crontab_name: 'Crontab.guru',
        link_crontab_desc: 'Definitivní editor cron výrazů s vysvětlením v přirozeném jazyce.',
        link_uuid_name: 'UUID Generator',
        link_uuid_desc: 'Generování UUID v1, v4, v7 jednotlivě nebo hromadně.',
        link_beautifier_name: 'Beautifier.io',
        link_beautifier_desc: 'Originální JS/HTML/CSS beautifier.',
        link_codebeautify_name: 'CodeBeautify',
        link_codebeautify_desc: 'Multi-jazyková sada formátovačů, validátorů a konvertorů.',
        link_minifier_name: 'Minifier.org',
        link_minifier_desc: 'Minifikace JavaScript a CSS.',
        // Design & Graphics
        link_photopea_name: 'Photopea',
        link_photopea_desc: 'Plnohodnotná alternativa Photoshopu běžící kompletně v prohlížeči.',
        link_pixlr_name: 'Pixlr',
        link_pixlr_desc: 'Bohatý foto editor s AI nástroji a filtry.',
        link_coolors_name: 'Coolors',
        link_coolors_desc: 'Bleskově rychlý generátor barevných palet (mezerník pro náhodný výběr).',
        link_paletton_name: 'Paletton',
        link_paletton_desc: 'Nástroj pro barvy využívající klasickou RYB teorii barevného kola.',
        link_colormind_name: 'Colormind',
        link_colormind_desc: 'AI generátor barevných palet využívající deep learning.',
        link_favicon_name: 'Favicon.io',
        link_favicon_desc: 'Generování favicon z textu, obrázků nebo emoji.',
        link_realfavicon_name: 'RealFaviconGenerator',
        link_realfavicon_desc: 'Generátor favicon pro všechny platformy s HTML značkami.',
        link_svgrepo_name: 'SVG Repo',
        link_svgrepo_desc: '500 000+ bezplatných SVG vektorů a ikon.',
        link_iconoir_name: 'Iconoir',
        link_iconoir_desc: 'Největší open-source knihovna ikon, bez premium úrovně.',
        link_patternmonster_name: 'Pattern Monster',
        link_patternmonster_desc: 'SVG generátor vzorů pro pozadí.',
        link_doodad_name: 'Doodad Pattern Generator',
        link_doodad_desc: 'Bezešvé SVG, CSS, PNG generátor vzorů.',
        link_cssgradient_name: 'CSS Gradient',
        link_cssgradient_desc: 'Generátor lineárních a radiálních CSS gradientů.',
        link_joshgradient_name: 'Josh Comeau Gradient Generator',
        link_joshgradient_desc: 'Pokročilé gradienty s perceptuálně uniformní interpolací barev.',
        link_placehold_name: 'Placehold.co',
        link_placehold_desc: 'Zástupné obrázky přes URL parametry.',
        link_methoddraw_name: 'Method Draw',
        link_methoddraw_desc: 'Open-source SVG editor pro web.',
        link_screenzy_name: 'Screenzy',
        link_screenzy_desc: 'Transformace snímků obrazovky na úchvatné vizuály.',
        link_fontjoy_name: 'Fontjoy',
        link_fontjoy_desc: 'AI generátor párování fontů.',
        link_mockupbro_name: 'MockupBro',
        link_mockupbro_desc: 'Generátor produktových mockupů, bez designového softwaru.',
        link_namecheap_logo_name: 'Namecheap Logo Maker',
        link_namecheap_logo_desc: 'AI tvůrce log s bezplatnými PNG a SVG staženími.',
        // Text & Writing
        link_scribbr_grammar_name: 'Scribbr Grammar Checker',
        link_scribbr_grammar_desc: 'AI kontrola gramatiky bez omezení znaků.',
        link_quillbot_grammar_name: 'QuillBot Grammar Check',
        link_quillbot_grammar_desc: 'Opravuje gramatiku, pravopis, interpunkci při psaní.',
        link_stackedit_name: 'StackEdit',
        link_stackedit_desc: 'Markdown editor v prohlížeči s podporou LaTeX a synchronizace.',
        link_dillinger_name: 'Dillinger',
        link_dillinger_desc: 'Cloudový Markdown editor synchronizující s GitHub a Dropbox.',
        link_wordcounter_name: 'WordCounter.net',
        link_wordcounter_desc: 'Počítadlo slov/znaků s analýzou hustoty klíčových slov.',
        link_convertcase_name: 'Convert Case',
        link_convertcase_desc: 'Konvertor velkých/malých písmen (věta, nadpis, velká, malá).',
        link_lipsum_name: 'Lipsum.com',
        link_lipsum_desc: 'Referenční generátor Lorem Ipsum.',
        link_hemingway_name: 'Hemingway Editor',
        link_hemingway_desc: 'Bezplatná kontrola čitelnosti s hodnocením úrovně.',
        link_textcompare_name: 'Text-Compare',
        link_textcompare_desc: 'Jednoduchý diff nástroj zvýrazňující změny mezi texty.',
        // SEO & Web Analysis
        link_pagespeed_name: 'Google PageSpeed Insights',
        link_pagespeed_desc: 'Oficiální Google analyzátor výkonu s Core Web Vitals.',
        link_gtmetrix_name: 'GTmetrix',
        link_gtmetrix_desc: 'Komplexní testování výkonu s Lighthouse.',
        link_webpagetest_name: 'WebPageTest',
        link_webpagetest_desc: 'Open-source nástroj s testováním v reálných prohlížečích z globálních lokací.',
        link_pingdom_name: 'Pingdom',
        link_pingdom_desc: 'Analýza rychlosti načítání webu s rozpisem obsahu.',
        link_seobility_name: 'Seobility SEO Checker',
        link_seobility_desc: 'Komplexní SEO analyzátor s prioritizovanými seznamy úkolů.',
        link_seoptimer_name: 'SEOptimer',
        link_seoptimer_desc: 'Okamžitý SEO audit s hodnocením použitelnosti a výkonu.',
        link_schemavalidator_name: 'Schema.org Validator',
        link_schemavalidator_desc: 'Oficiální validátor strukturovaných dat.',
        link_richresults_name: 'Google Rich Results Test',
        link_richresults_desc: 'Test jak stránky vypadají ve výsledcích vyhledávání Google.',
        link_brokenlinkcheck_name: 'Broken Link Check',
        link_brokenlinkcheck_desc: 'Najděte mrtvé odkazy na jakékoli stránce během minut.',
        link_xmlsitemaps_name: 'XML-Sitemaps',
        link_xmlsitemaps_desc: 'Bezplatný generátor XML sitemap pro weby do 500 stránek.',
        // Network & DNS
        link_mxtoolbox_name: 'MXToolbox',
        link_mxtoolbox_desc: 'DNS lookup, MX záznamy, kontrola blacklistů (100+ RBL).',
        link_centralops_name: 'CentralOps',
        link_centralops_desc: 'Traceroute, nslookup, dig, whois, ping, podpora IPv6.',
        link_whois_name: 'Who.is',
        link_whois_desc: 'WHOIS a RDAP lookup pro domény a IP.',
        link_pingeu_name: 'Ping.eu',
        link_pingeu_desc: '10+ síťových nástrojů: ping, traceroute, kontrola portů, WHOIS.',
        link_dnschecker_name: 'DNSChecker',
        link_dnschecker_desc: 'Kontrola propagace DNS a lookup nástroje.',
        link_hackertarget_name: 'HackerTarget',
        link_hackertarget_desc: 'Port scanner poháněný Nmapem a síťová diagnostika.',
        link_fast_name: 'Fast.com',
        link_fast_desc: 'Jednoduchý test rychlosti internetu od Netflixu bez reklam.',
        link_testmynet_name: 'TestMy.net',
        link_testmynet_desc: 'Nezávislý test rychlosti broadbandu od roku 1996.',
        link_ipvoid_name: 'IPVoid',
        link_ipvoid_desc: 'Kontrola IP blacklistu, reverse DNS, geolokace.',
        // Data & Calculation
        link_desmos_scientific_name: 'Desmos Scientific',
        link_desmos_scientific_desc: 'Krásná online vědecká kalkulačka.',
        link_calculatornet_name: 'Calculator.net',
        link_calculatornet_desc: '200+ kalkulátorů: finanční, statistické, datové, procentní.',
        link_unitconverters_name: 'UnitConverters.net',
        link_unitconverters_desc: '77+ kategorií převodu jednotek.',
        link_timeanddate_name: 'TimeAndDate Converter',
        link_timeanddate_desc: 'Převodník časových zón pro mezinárodní plánování.',
        link_worldtimebuddy_name: 'World Time Buddy',
        link_worldtimebuddy_desc: 'Vizuální porovnání časových zón pro schůzky.',
        link_chartgo_name: 'ChartGo',
        link_chartgo_desc: 'Tvorba grafů bez registrace (sloupcové, čárové, koláčové, plošné).',
        link_rawgraphs_name: 'RAWGraphs',
        link_rawgraphs_desc: 'Open-source vizualizace dat pro nekonvenční grafy.',
        link_livegap_name: 'LiveGap Charts',
        link_livegap_desc: '50+ šablon grafů s náhledem v reálném čase.',
        link_socsci_name: 'Social Science Statistics',
        link_socsci_desc: 'Kalkulátory Chi-square, t-test, Pearsonova r.',
        // Compression & Archive
        link_ezyzip_name: 'ezyZip',
        link_ezyzip_desc: 'Archivační nástroj v prohlížeči, bez nahrávání na server (ZIP, RAR, 7z, TAR).',
        link_zipextractor_name: 'ZIP Extractor',
        link_zipextractor_desc: 'Integrace s Google Drive, 200M+ uživatelů.',
        link_unziponline_name: 'Unzip-Online',
        link_unziponline_desc: 'Extrakce ZIP/RAR bez instalovaného softwaru.',
        link_archiveconvert_name: 'CloudConvert Archive',
        link_archiveconvert_desc: 'Konverze mezi archivními formáty.',
        link_aspose_zip_name: 'Aspose ZIP Extractor',
        link_aspose_zip_desc: 'Rychlá extrakce, soubory dostupné 24 hodin.',
        // QR Code Generators
        link_qrmonkey_name: 'QRCode Monkey',
        link_qrmonkey_desc: 'Vlastní loga, barvy, vysoké rozlišení stahování (PNG, SVG, PDF).',
        link_qrstuff_name: 'QRStuff',
        link_qrstuff_desc: '20+ typů dat: URL, WiFi, vCards, SMS.',
        link_goqr_name: 'goQR.me',
        link_goqr_desc: 'Povoleno komerční využití, vložení log.',
        link_qrcreator_name: 'QR Creator',
        link_qrcreator_desc: 'Bez expirace, bez předplatného, vektorové formáty.',
        link_qrgenerator_name: 'QRGenerator.org',
        link_qrgenerator_desc: 'Neomezené skenování, doživotní platnost, přizpůsobitelné.',
        // Screenshot & Screen Recording
        link_screenpal_name: 'ScreenPal',
        link_screenpal_desc: 'Záznam obrazovky v prohlížeči, bez vodoznaků, webkamera + audio.',
        link_recordcast_name: 'RecordCast',
        link_recordcast_desc: 'Záznam obrazovky s vestavěným video editorem.',
        link_panopto_name: 'Panopto Express',
        link_panopto_desc: 'Bez časových limitů nebo vodoznaků, nahrávání na YouTube.',
        link_screencapture_name: 'ScreenCapture.com',
        link_screencapture_desc: 'Záznam celé obrazovky nebo vlastní oblasti.',
        link_screenshotguru_name: 'Screenshot Guru',
        link_screenshotguru_desc: 'Snímky celé stránky jakékoli URL.',
        link_gemoo_name: 'Gemoo Screenshot',
        link_gemoo_desc: 'Zachycení desktopového a mobilního rozložení.',
        // Temporary & Disposable Services
        link_guerrillamail_name: 'Guerrilla Mail',
        link_guerrillamail_desc: '60minutový jednorázový email, zpracováno 20B+ emailů.',
        link_tempmail_name: 'Temp-Mail',
        link_tempmail_desc: 'Automaticky generovaný dočasný email, více domén.',
        link_maildrop_name: 'Maildrop',
        link_maildrop_desc: 'Vyberte libovolnou @maildrop.cc adresu okamžitě.',
        link_privatebin_name: 'PrivateBin',
        link_privatebin_desc: 'Šifrovaný pastebin s nulovou znalostí, smazání po přečtení.',
        link_pastesio_name: 'Pastes.io',
        link_pastesio_desc: 'Šifrované pasty s ochranou heslem.',
        link_fileio_name: 'File.io',
        link_fileio_desc: 'Automatické smazání po stažení, až 4GB.',
        link_wetransfer_name: 'WeTransfer',
        link_wetransfer_desc: 'Odeslání až 2GB zdarma, dostupné 2 týdny.',
        link_privnote_name: 'Privnote',
        link_privnote_desc: 'Samodestrukční šifrované poznámky.',
        link_chattory_name: 'Chattory',
        link_chattory_desc: 'Okamžité dočasné chatovací místnosti.',
        // AI & Automation
        link_tinywow_name: 'TinyWow',
        link_tinywow_desc: '700+ AI nástrojů: psaní, PDF, obrázky, vše zdarma.',
        link_perchance_name: 'Perchance AI Chat',
        link_perchance_desc: 'Neomezený AI chat, bez registrace.',
        link_deepai_name: 'DeepAI Chat',
        link_deepai_desc: 'Bezplatný AI chatbot pro psaní a kód.',
        link_ocrspace_name: 'OCR.space',
        link_ocrspace_desc: 'Bezplatné OCR API převádějící obrázky/PDF na text.',
        link_newocr_name: 'NewOCR',
        link_newocr_desc: '122 jazyků, neomezené nahrávání.',
        link_i2ocr_name: 'i2OCR',
        link_i2ocr_desc: '100+ jazykové OCR s více výstupními formáty.',
        link_quillbot_summarize_name: 'QuillBot Summarizer',
        link_quillbot_summarize_desc: 'AI sumarizátor textu, odrážky nebo odstavce.',
        link_scribbr_summarize_name: 'Scribbr Summarizer',
        link_scribbr_summarize_desc: 'Flexibilní délka shrnutí, bez registrace.',
        // Learning & Reference
        link_desmos_graphing_name: 'Desmos Graphing',
        link_desmos_graphing_desc: 'Interaktivní grafická kalkulačka.',
        link_onlineconversion_name: 'OnlineConversion',
        link_onlineconversion_desc: 'Tisíce převodů jednotek.',
        link_typingclub_name: 'TypingClub',
        link_typingclub_desc: 'Bezplatný tutor psaní všemi deseti s hrami.',
        link_keybr_name: 'Keybr',
        link_keybr_desc: 'Adaptivní lekce psaní cílící na slabiny.',
        link_wolframalpha_name: 'Wolfram Alpha',
        link_wolframalpha_desc: 'Výpočetní znalostní engine.',
        // Browser-based Productivity
        link_drawio_name: 'draw.io (diagrams.net)',
        link_drawio_desc: 'Standardní bezplatné diagramy—vývojové diagramy, UML, ER.',
        link_excalidraw_name: 'Excalidraw',
        link_excalidraw_desc: 'Tabule ve stylu ručně kresleném s kolaborací v reálném čase.',
        link_tldraw_name: 'tldraw',
        link_tldraw_desc: 'Okamžitá tabule, funguje na jakémkoli zařízení.',
        link_pomofocus_name: 'Pomofocus',
        link_pomofocus_desc: 'Populární Pomodoro časovač se seznamy úkolů.',
        link_tomatotimers_name: 'TomatoTimers',
        link_tomatotimers_desc: 'Přizpůsobitelné Pomodoro s přestávkami.',
        link_protectedtext_name: 'ProtectedText',
        link_protectedtext_desc: 'Šifrovaný poznámkový blok s ochranou heslem.',
        link_onlinenotepad_name: 'OnlineNotepad',
        link_onlinenotepad_desc: 'Poznámkový blok v prohlížeči s automatickým ukládáním.',
        link_simplemindmap_name: 'Simple Mindmap',
        link_simplemindmap_desc: 'Minimalistické myšlenkové mapy, všechna zařízení.',
        link_pdf24annotate_name: 'PDF24 Annotate',
        link_pdf24annotate_desc: 'Bezplatné anotace PDF s kreslením a tvary.',
        link_pdfgear_name: 'PDFgear Online',
        link_pdfgear_desc: 'Bezplatný PDF editor, bez vodoznaků.'
    },
    en: {
        search_placeholder: 'Search tool, link...',
        loading: 'Loading...',
        refresh_title: 'Refresh',
        no_results: 'No results',
        try_different: 'Try changing your search or filters',
        footer_text: 'AdHUB - Central Hub for tools and utilities',
        filter_all: 'All',
        filter_tools: 'Tools',
        filter_links: 'Links',
        status_loaded: 'Loaded {tools} tools, {links} links',
        open: 'Open',
        local_badge: '📦 Local',
        no_description: 'No description',
        category_video: 'video',
        category_streaming: 'streaming',
        category_demos: 'demo',
        category_setup: 'setup',
        tool_youtube_name: 'YouTube Downloader',
        tool_youtube_desc: 'Download the extension for Chrome/Edge/Brave and download YouTube videos directly from your browser.',
        tool_chat_name: 'Multistream Chat Panel',
        tool_chat_desc: 'Unified chat for Twitch, Kick and YouTube with overlay modes. Requires running a local server.',
        tool_chat_mod_name: 'Chat Moderator Extension',
        tool_chat_mod_desc: 'Chrome extension for Twitch chat moderation. Ban, timeout and delete messages directly from Multistream Chat.',
        tool_pizza_name: 'KomoPizza Demo',
        tool_pizza_desc: 'Sample ordering application for rapid UI concept prototyping.',
        tool_spinning_name: 'Spinning Wheel Giveaway',
        tool_spinning_desc: 'Interactive spinning wheel for drawing winners on streams and giveaway events.',
        tool_resignation_name: 'Resignation Bets',
        tool_resignation_desc: 'Casino app for betting on who will resign from work first. Fun roulette with offline storage.',
        tool_ai_prompting_name: 'AI Prompting',
        tool_ai_prompting_desc: 'Professional prompt formatter with 7 methods (CoT, Few-Shot, ToT, etc.), 5 languages and local storage.',
        tool_pdf_merge_name: 'PDF Merge',
        tool_pdf_merge_desc: 'Combine multiple PDF files into one document. Simple drag and drop, page preview and reordering.',
        tool_pdf_editor_name: 'PDF Editor',
        tool_pdf_editor_desc: 'Edit, sign, compress and reorganize PDF files. 100% client-side processing.',
        tool_pdf_search_name: 'PDF Search',
        tool_pdf_search_desc: 'Full-text search in PDF files. Upload multiple PDFs and search with MiniSearch. 100% client-side.',
        tool_mindhub_name: 'MindHub',
        tool_mindhub_desc: 'Personal coordination platform for managing thoughts, tasks and mind maps. Organize your ideas visually.',
        tool_steam_farm_name: 'Steam Farm',
        tool_steam_farm_desc: 'Farm Steam hours and trading cards. Simulates playing up to 32 games simultaneously. Requires extension and Native Host.',
        tool_rust_calculator_name: 'Rust Calculator',
        tool_rust_calculator_desc: 'Offline calculator for Rust game - raid costs, crafting recipes and raw materials. PWA working 100% offline.',
        tool_docbook_name: 'DocBook',
        tool_docbook_desc: 'Offline documentation platform inspired by GitBook. WYSIWYG Markdown editor, hierarchical navigation, fulltext search and export. 100% offline PWA.',
        tool_nimt_tracker_name: 'AI Visibility Tracker',
        tool_nimt_tracker_desc: 'Track your brand visibility in AI search engines. Share of Voice, source citations, competitive analysis. 100% offline PWA.',
        tool_api_catalog_name: 'API Catalog',
        tool_api_catalog_desc: 'Offline-first catalog of 10,000+ APIs. Browse, search and manage APIs by category. PWA with IndexedDB, data import/export. Based on API-mega-list analysis.',
        tool_server_hub_name: 'Server Hub',
        tool_server_hub_desc: 'Offline-first PWA for managing servers, sites, and backups. Inspired by xCloud control panel. IndexedDB database, data export/import.',
        category_gaming: 'gaming',
        category_documentation: 'documentation',
        link_ninite_name: 'Ninite – Quick Windows App Installation',
        link_ninite_desc: 'Select apps and install them with one click after a clean Windows installation.',
        link_winget_name: 'Winget.run Package Catalog',
        link_winget_desc: 'Web catalog for Microsoft WinGet – quick scripts and installation commands.',
        link_obs_name: 'OBS Studio Download',
        link_obs_desc: 'Official OBS Studio installers page for streaming and recording.',
        link_ytdlp_name: 'yt-dlp Releases',
        link_ytdlp_desc: 'Latest yt-dlp builds needed for our downloader, including installation guide.',
        link_hibp_name: 'Have I Been Pwned',
        link_hibp_desc: 'Check if your email address or password has been compromised in a data breach. Security tool by Troy Hunt.',
        translating: 'Translating...',
        translation_error: 'Translation error',
        search_language: 'Search language...',
        idea_button: 'Share idea',
        idea_modal_title: 'Share your idea',
        idea_modal_description: 'Have an idea for a new feature or improvement? Join our Discord server and share your ideas in the AI channel!',
        view_count: 'views',
        view_count_title: 'views',
        top_clicked_title: 'Most clicked item',
        // Lazy loading
        load_more: 'Load more',
        loading_more: 'Loading...',
        showing_items: 'Showing {current} of {total} items',
        all_items_loaded: 'All items loaded',
        // Sections
        section_our_tools: 'Our Tools',
        section_our_tools_badge: 'Local projects',
        section_external_links: 'External Tools',
        section_external_links_badge: 'Free online services',
        // Security & Privacy
        link_virustotal_name: 'VirusTotal',
        link_virustotal_desc: 'Scan files and URLs with 70+ antivirus engines simultaneously.',
        link_ssllabs_name: 'SSL Labs SSL Test',
        link_ssllabs_desc: 'Deep analysis of SSL/TLS configuration for any public web server.',
        link_mozilla_observatory_name: 'Mozilla HTTP Observatory',
        link_mozilla_observatory_desc: 'Comprehensive HTTP security header assessment with recommendations.',
        link_hybrid_analysis_name: 'Hybrid Analysis',
        link_hybrid_analysis_desc: 'Free malware sandbox using behavioral analysis.',
        link_amiunique_name: 'Am I Unique?',
        link_amiunique_desc: 'Tests browser fingerprint uniqueness to assess privacy exposure.',
        link_securityheaders_name: 'Security Headers',
        link_securityheaders_desc: 'Instant HTTP security header analysis and grading.',
        // System Utilities
        link_patchmypc_name: 'Patch My PC',
        link_patchmypc_desc: 'Scans and updates 300+ Windows programs automatically.',
        link_jotti_name: 'Jotti\'s Malware Scan',
        link_jotti_desc: 'Multi-engine file scanner, up to 250MB per file.',
        link_metadefender_name: 'MetaDefender Cloud',
        link_metadefender_desc: '20+ antivirus engines plus file sanitization.',
        link_internxt_name: 'Internxt Virus Scanner',
        link_internxt_desc: 'Privacy-focused zero-knowledge virus scanning.',
        // File Conversion
        link_ilovepdf_name: 'iLovePDF',
        link_ilovepdf_desc: 'Complete PDF toolkit: merge, split, compress, convert.',
        link_pdf24_name: 'PDF24 Tools',
        link_pdf24_desc: '100% free PDF converter and editor with no limits.',
        link_smallpdf_name: 'Smallpdf',
        link_smallpdf_desc: 'Cloud-based PDF conversion with drag-and-drop interface.',
        link_cloudconvert_name: 'CloudConvert',
        link_cloudconvert_desc: 'Universal converter supporting nearly all file formats (25 free/day).',
        link_zamzar_name: 'Zamzar',
        link_zamzar_desc: '1,200+ format support since 2006.',
        link_onlineconvert_name: 'Online-Convert',
        link_onlineconvert_desc: 'Comprehensive converter for audio, video, documents, ebooks.',
        link_freeconvert_name: 'FreeConvert',
        link_freeconvert_desc: 'Image, video, audio conversion with 1GB file limit.',
        link_convertio_name: 'Convertio',
        link_convertio_desc: 'Universal converter with 300+ formats, files auto-delete.',
        link_tinypng_name: 'TinyPNG',
        link_tinypng_desc: 'Smart compression reducing image size 40-80% while preserving quality.',
        link_removebg_name: 'Remove.bg',
        link_removebg_desc: 'AI-powered automatic background removal in 5 seconds.',
        link_audioconverter_name: 'Online Audio Converter',
        link_audioconverter_desc: 'Convert audio to MP3, WAV, FLAC, OGG and more.',
        link_toepub_name: 'ToEpub',
        link_toepub_desc: 'Ebook converter supporting 36 input formats.',
        // Developer Tools
        link_regex101_name: 'Regex101',
        link_regex101_desc: 'Gold-standard regex tester with auto-generated explanations.',
        link_regexr_name: 'RegExr',
        link_regexr_desc: 'Interactive regex tool with community patterns library.',
        link_jsonlint_name: 'JSONLint',
        link_jsonlint_desc: 'The original JSON validator and reformatter.',
        link_jsoneditor_name: 'JSON Editor Online',
        link_jsoneditor_desc: 'View, edit, format, compare, and transform JSON.',
        link_jsoncrack_name: 'JSON Crack',
        link_jsoncrack_desc: 'Visualize JSON as interactive graphs and tree views.',
        link_hoppscotch_name: 'Hoppscotch',
        link_hoppscotch_desc: 'Open-source Postman alternative for API testing.',
        link_reqbin_name: 'ReqBin',
        link_reqbin_desc: 'REST API testing with millisecond timing accuracy.',
        link_codepen_name: 'CodePen',
        link_codepen_desc: 'Front-end playground for HTML, CSS, JavaScript.',
        link_jsfiddle_name: 'JSFiddle',
        link_jsfiddle_desc: 'Code playground with framework support and collaboration.',
        link_playcode_name: 'PlayCode',
        link_playcode_desc: 'Fast JS playground with React, Vue, TypeScript support.',
        link_diffchecker_name: 'Diffchecker',
        link_diffchecker_desc: 'Compare text, files, images, and code side-by-side.',
        link_base64_name: 'Base64 Decode/Encode',
        link_base64_desc: 'Clean Base64 encoding/decoding with file support.',
        link_crontab_name: 'Crontab.guru',
        link_crontab_desc: 'Definitive cron expression editor with plain-English explanations.',
        link_uuid_name: 'UUID Generator',
        link_uuid_desc: 'Generate UUID v1, v4, v7 individually or in bulk.',
        link_beautifier_name: 'Beautifier.io',
        link_beautifier_desc: 'The original JS/HTML/CSS beautifier.',
        link_codebeautify_name: 'CodeBeautify',
        link_codebeautify_desc: 'Multi-language formatter, validator, and converter suite.',
        link_minifier_name: 'Minifier.org',
        link_minifier_desc: 'JavaScript and CSS minification.',
        // Design & Graphics
        link_photopea_name: 'Photopea',
        link_photopea_desc: 'Full Photoshop alternative running entirely in browser.',
        link_pixlr_name: 'Pixlr',
        link_pixlr_desc: 'Feature-rich photo editor with AI tools and filters.',
        link_coolors_name: 'Coolors',
        link_coolors_desc: 'Lightning-fast color palette generator (spacebar to shuffle).',
        link_paletton_name: 'Paletton',
        link_paletton_desc: 'Color tool using classical RYB color wheel theory.',
        link_colormind_name: 'Colormind',
        link_colormind_desc: 'AI-powered deep learning color palette generator.',
        link_favicon_name: 'Favicon.io',
        link_favicon_desc: 'Generate favicons from text, images, or emojis.',
        link_realfavicon_name: 'RealFaviconGenerator',
        link_realfavicon_desc: 'All-platform favicon generator with HTML markup.',
        link_svgrepo_name: 'SVG Repo',
        link_svgrepo_desc: '500,000+ free SVG vectors and icons.',
        link_iconoir_name: 'Iconoir',
        link_iconoir_desc: 'Largest open-source icon library, no premium tier.',
        link_patternmonster_name: 'Pattern Monster',
        link_patternmonster_desc: 'SVG pattern generator for backgrounds.',
        link_doodad_name: 'Doodad Pattern Generator',
        link_doodad_desc: 'Seamless SVG, CSS, PNG pattern maker.',
        link_cssgradient_name: 'CSS Gradient',
        link_cssgradient_desc: 'Linear and radial CSS gradient generator.',
        link_joshgradient_name: 'Josh Comeau Gradient Generator',
        link_joshgradient_desc: 'Advanced gradients with perceptually uniform color interpolation.',
        link_placehold_name: 'Placehold.co',
        link_placehold_desc: 'Placeholder images via URL parameters.',
        link_methoddraw_name: 'Method Draw',
        link_methoddraw_desc: 'Open-source SVG editor for the web.',
        link_screenzy_name: 'Screenzy',
        link_screenzy_desc: 'Transform screenshots into stunning visuals.',
        link_fontjoy_name: 'Fontjoy',
        link_fontjoy_desc: 'AI-powered font pairing generator.',
        link_mockupbro_name: 'MockupBro',
        link_mockupbro_desc: 'Product mockup generator, no design software needed.',
        link_namecheap_logo_name: 'Namecheap Logo Maker',
        link_namecheap_logo_desc: 'AI logo creator with free PNG and SVG downloads.',
        // Text & Writing
        link_scribbr_grammar_name: 'Scribbr Grammar Checker',
        link_scribbr_grammar_desc: 'AI grammar checker with no character limits.',
        link_quillbot_grammar_name: 'QuillBot Grammar Check',
        link_quillbot_grammar_desc: 'Fixes grammar, spelling, punctuation as you type.',
        link_stackedit_name: 'StackEdit',
        link_stackedit_desc: 'In-browser Markdown editor with LaTeX and sync support.',
        link_dillinger_name: 'Dillinger',
        link_dillinger_desc: 'Cloud Markdown editor syncing with GitHub and Dropbox.',
        link_wordcounter_name: 'WordCounter.net',
        link_wordcounter_desc: 'Word/character counter with keyword density analysis.',
        link_convertcase_name: 'Convert Case',
        link_convertcase_desc: 'Text case converter (sentence, title, upper, lower).',
        link_lipsum_name: 'Lipsum.com',
        link_lipsum_desc: 'The reference Lorem Ipsum generator.',
        link_hemingway_name: 'Hemingway Editor',
        link_hemingway_desc: 'Free readability checker with grade-level scoring.',
        link_textcompare_name: 'Text-Compare',
        link_textcompare_desc: 'Simple diff tool highlighting changes between texts.',
        // SEO & Web Analysis
        link_pagespeed_name: 'Google PageSpeed Insights',
        link_pagespeed_desc: 'Official Google performance analyzer with Core Web Vitals.',
        link_gtmetrix_name: 'GTmetrix',
        link_gtmetrix_desc: 'Comprehensive performance testing with Lighthouse.',
        link_webpagetest_name: 'WebPageTest',
        link_webpagetest_desc: 'Open-source tool with real-browser testing from global locations.',
        link_pingdom_name: 'Pingdom',
        link_pingdom_desc: 'Website load speed analysis with content breakdown.',
        link_seobility_name: 'Seobility SEO Checker',
        link_seobility_desc: 'Comprehensive SEO analyzer with prioritized task lists.',
        link_seoptimer_name: 'SEOptimer',
        link_seoptimer_desc: 'Instant SEO audit with usability and performance scores.',
        link_schemavalidator_name: 'Schema.org Validator',
        link_schemavalidator_desc: 'Official structured data validator.',
        link_richresults_name: 'Google Rich Results Test',
        link_richresults_desc: 'Test how pages appear in Google search results.',
        link_brokenlinkcheck_name: 'Broken Link Check',
        link_brokenlinkcheck_desc: 'Find dead links on any website in minutes.',
        link_xmlsitemaps_name: 'XML-Sitemaps',
        link_xmlsitemaps_desc: 'Free XML sitemap generator for sites up to 500 pages.',
        // Network & DNS
        link_mxtoolbox_name: 'MXToolbox',
        link_mxtoolbox_desc: 'DNS lookups, MX records, blacklist checking (100+ RBLs).',
        link_centralops_name: 'CentralOps',
        link_centralops_desc: 'Traceroute, nslookup, dig, whois, ping, IPv6 support.',
        link_whois_name: 'Who.is',
        link_whois_desc: 'WHOIS and RDAP lookup for domains and IPs.',
        link_pingeu_name: 'Ping.eu',
        link_pingeu_desc: '10+ network tools: ping, traceroute, port check, WHOIS.',
        link_dnschecker_name: 'DNSChecker',
        link_dnschecker_desc: 'DNS propagation checker and lookup tools.',
        link_hackertarget_name: 'HackerTarget',
        link_hackertarget_desc: 'Nmap-powered port scanner and network diagnostics.',
        link_fast_name: 'Fast.com',
        link_fast_desc: 'Netflix\'s simple, ad-free internet speed test.',
        link_testmynet_name: 'TestMy.net',
        link_testmynet_desc: 'Independent broadband speed test since 1996.',
        link_ipvoid_name: 'IPVoid',
        link_ipvoid_desc: 'IP blacklist check, reverse DNS, geolocation.',
        // Data & Calculation
        link_desmos_scientific_name: 'Desmos Scientific',
        link_desmos_scientific_desc: 'Beautiful online scientific calculator.',
        link_calculatornet_name: 'Calculator.net',
        link_calculatornet_desc: '200+ calculators: financial, statistical, date, percentage.',
        link_unitconverters_name: 'UnitConverters.net',
        link_unitconverters_desc: '77+ unit conversion categories.',
        link_timeanddate_name: 'TimeAndDate Converter',
        link_timeanddate_desc: 'Time zone converter for international scheduling.',
        link_worldtimebuddy_name: 'World Time Buddy',
        link_worldtimebuddy_desc: 'Visual time zone comparison for meetings.',
        link_chartgo_name: 'ChartGo',
        link_chartgo_desc: 'No-signup chart maker (bar, line, pie, area).',
        link_rawgraphs_name: 'RAWGraphs',
        link_rawgraphs_desc: 'Open-source data visualization for unconventional charts.',
        link_livegap_name: 'LiveGap Charts',
        link_livegap_desc: '50+ chart templates with real-time preview.',
        link_socsci_name: 'Social Science Statistics',
        link_socsci_desc: 'Chi-square, t-test, Pearson\'s r calculators.',
        // Compression & Archive
        link_ezyzip_name: 'ezyZip',
        link_ezyzip_desc: 'Browser-based archive tool, no server uploads (ZIP, RAR, 7z, TAR).',
        link_zipextractor_name: 'ZIP Extractor',
        link_zipextractor_desc: 'Google Drive integration, 200M+ users.',
        link_unziponline_name: 'Unzip-Online',
        link_unziponline_desc: 'Extract ZIP/RAR without installed software.',
        link_archiveconvert_name: 'CloudConvert Archive',
        link_archiveconvert_desc: 'Convert between archive formats.',
        link_aspose_zip_name: 'Aspose ZIP Extractor',
        link_aspose_zip_desc: 'Fast extraction, files available 24 hours.',
        // QR Code Generators
        link_qrmonkey_name: 'QRCode Monkey',
        link_qrmonkey_desc: 'Custom logos, colors, high-res downloads (PNG, SVG, PDF).',
        link_qrstuff_name: 'QRStuff',
        link_qrstuff_desc: '20+ data types: URLs, WiFi, vCards, SMS.',
        link_goqr_name: 'goQR.me',
        link_goqr_desc: 'Commercial use permitted, embed logos.',
        link_qrcreator_name: 'QR Creator',
        link_qrcreator_desc: 'No expiration, no subscription, vector formats.',
        link_qrgenerator_name: 'QRGenerator.org',
        link_qrgenerator_desc: 'Unlimited scans, lifetime validity, customizable.',
        // Screenshot & Screen Recording
        link_screenpal_name: 'ScreenPal',
        link_screenpal_desc: 'Browser screen recorder, no watermarks, webcam + audio.',
        link_recordcast_name: 'RecordCast',
        link_recordcast_desc: 'Screen recorder with built-in video editor.',
        link_panopto_name: 'Panopto Express',
        link_panopto_desc: 'No time limits or watermarks, YouTube upload.',
        link_screencapture_name: 'ScreenCapture.com',
        link_screencapture_desc: 'Full screen or custom area recording.',
        link_screenshotguru_name: 'Screenshot Guru',
        link_screenshotguru_desc: 'Full-page screenshots of any URL.',
        link_gemoo_name: 'Gemoo Screenshot',
        link_gemoo_desc: 'Desktop and mobile layout captures.',
        // Temporary & Disposable Services
        link_guerrillamail_name: 'Guerrilla Mail',
        link_guerrillamail_desc: '60-minute disposable email, 20B+ emails processed.',
        link_tempmail_name: 'Temp-Mail',
        link_tempmail_desc: 'Auto-generated temporary email, multiple domains.',
        link_maildrop_name: 'Maildrop',
        link_maildrop_desc: 'Pick any @maildrop.cc address instantly.',
        link_privatebin_name: 'PrivateBin',
        link_privatebin_desc: 'Zero-knowledge encrypted pastebin, burn-after-reading.',
        link_pastesio_name: 'Pastes.io',
        link_pastesio_desc: 'Encrypted pastes with password protection.',
        link_fileio_name: 'File.io',
        link_fileio_desc: 'Auto-delete after download, up to 4GB.',
        link_wetransfer_name: 'WeTransfer',
        link_wetransfer_desc: 'Send up to 2GB free, available 2 weeks.',
        link_privnote_name: 'Privnote',
        link_privnote_desc: 'Self-destructing encrypted notes.',
        link_chattory_name: 'Chattory',
        link_chattory_desc: 'Instant temporary chat rooms.',
        // AI & Automation
        link_tinywow_name: 'TinyWow',
        link_tinywow_desc: '700+ AI tools: writing, PDF, images, all free.',
        link_perchance_name: 'Perchance AI Chat',
        link_perchance_desc: 'Unlimited AI chat, no signup required.',
        link_deepai_name: 'DeepAI Chat',
        link_deepai_desc: 'Free AI chatbot for writing and code.',
        link_ocrspace_name: 'OCR.space',
        link_ocrspace_desc: 'Free OCR API converting images/PDFs to text.',
        link_newocr_name: 'NewOCR',
        link_newocr_desc: '122 languages, unlimited uploads.',
        link_i2ocr_name: 'i2OCR',
        link_i2ocr_desc: '100+ language OCR with multiple output formats.',
        link_quillbot_summarize_name: 'QuillBot Summarizer',
        link_quillbot_summarize_desc: 'AI text summarizer, bullet points or paragraphs.',
        link_scribbr_summarize_name: 'Scribbr Summarizer',
        link_scribbr_summarize_desc: 'Flexible summary length, no signup.',
        // Learning & Reference
        link_desmos_graphing_name: 'Desmos Graphing',
        link_desmos_graphing_desc: 'Interactive graphing calculator.',
        link_onlineconversion_name: 'OnlineConversion',
        link_onlineconversion_desc: 'Thousands of unit conversions.',
        link_typingclub_name: 'TypingClub',
        link_typingclub_desc: 'Free touch typing tutor with games.',
        link_keybr_name: 'Keybr',
        link_keybr_desc: 'Adaptive typing lessons targeting weaknesses.',
        link_wolframalpha_name: 'Wolfram Alpha',
        link_wolframalpha_desc: 'Computational knowledge engine.',
        // Browser-based Productivity
        link_drawio_name: 'draw.io (diagrams.net)',
        link_drawio_desc: 'Industry-standard free diagramming—flowcharts, UML, ER.',
        link_excalidraw_name: 'Excalidraw',
        link_excalidraw_desc: 'Hand-drawn style whiteboard with real-time collaboration.',
        link_tldraw_name: 'tldraw',
        link_tldraw_desc: 'Instant whiteboard, works on any device.',
        link_pomofocus_name: 'Pomofocus',
        link_pomofocus_desc: 'Popular Pomodoro timer with task lists.',
        link_tomatotimers_name: 'TomatoTimers',
        link_tomatotimers_desc: 'Customizable Pomodoro with breaks.',
        link_protectedtext_name: 'ProtectedText',
        link_protectedtext_desc: 'Encrypted notepad with password protection.',
        link_onlinenotepad_name: 'OnlineNotepad',
        link_onlinenotepad_desc: 'Browser notepad with autosave.',
        link_simplemindmap_name: 'Simple Mindmap',
        link_simplemindmap_desc: 'Minimalist mind mapping, all devices.',
        link_pdf24annotate_name: 'PDF24 Annotate',
        link_pdf24annotate_desc: 'Free PDF annotation with drawing and shapes.',
        link_pdfgear_name: 'PDFgear Online',
        link_pdfgear_desc: 'Free PDF editor, no watermarks.'
    }
};

// Dynamic translations storage (cached translations)
let TRANSLATIONS = JSON.parse(JSON.stringify(BASE_TRANSLATIONS));

// ============================================
// GEO-LOCATION BASED LANGUAGE DETECTION
// ============================================

// Geolocation cache settings
const GEO_CACHE_KEY = 'adhub_geo_country';
const GEO_CACHE_TIME_KEY = 'adhub_geo_cache_time';
const GEO_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Countries that should use Czech language
const CZECH_COUNTRIES = ['CZ', 'SK'];

/**
 * Detect user's country from IP address using free geolocation APIs
 * Uses ipapi.co as primary, ip-api.com as fallback
 * @returns {Promise<string|null>} Country code (e.g., 'CZ', 'US') or null if detection fails
 */
async function detectCountryFromIP() {
    // Check cache first
    const cachedCountry = localStorage.getItem(GEO_CACHE_KEY);
    const cacheTime = localStorage.getItem(GEO_CACHE_TIME_KEY);

    if (cachedCountry && cacheTime) {
        const age = Date.now() - parseInt(cacheTime, 10);
        if (age < GEO_CACHE_DURATION) {
            console.log(`[GeoLang] Using cached country: ${cachedCountry}`);
            return cachedCountry;
        }
    }

    // Try ipapi.co first (reliable, CORS-friendly)
    try {
        const response = await fetch('https://ipapi.co/country_code/', {
            method: 'GET',
            headers: { 'Accept': 'text/plain' },
            signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
            const countryCode = (await response.text()).trim().toUpperCase();
            if (countryCode && countryCode.length === 2) {
                localStorage.setItem(GEO_CACHE_KEY, countryCode);
                localStorage.setItem(GEO_CACHE_TIME_KEY, Date.now().toString());
                console.log(`[GeoLang] Detected country (ipapi.co): ${countryCode}`);
                return countryCode;
            }
        }
    } catch (error) {
        console.warn('[GeoLang] ipapi.co failed:', error.message);
    }

    // Fallback to ip-api.com
    try {
        const response = await fetch('http://ip-api.com/json/?fields=countryCode', {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
            const data = await response.json();
            if (data.countryCode) {
                const countryCode = data.countryCode.toUpperCase();
                localStorage.setItem(GEO_CACHE_KEY, countryCode);
                localStorage.setItem(GEO_CACHE_TIME_KEY, Date.now().toString());
                console.log(`[GeoLang] Detected country (ip-api.com): ${countryCode}`);
                return countryCode;
            }
        }
    } catch (error) {
        console.warn('[GeoLang] ip-api.com failed:', error.message);
    }

    console.warn('[GeoLang] All geolocation APIs failed');
    return null;
}

/**
 * Get appropriate language code based on country
 * @param {string|null} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {string} Language code ('cs' or 'en')
 */
function getLanguageFromCountry(countryCode) {
    if (countryCode && CZECH_COUNTRIES.includes(countryCode)) {
        return 'cs';
    }
    return 'en';
}

/**
 * Initialize language based on: 1) localStorage, 2) IP geolocation, 3) navigator.language
 * @returns {Promise<string>} Language code
 */
async function initializeLanguageFromGeo() {
    // 1. Check if user has explicitly set a language preference
    const savedLang = localStorage.getItem('adhub_language');
    if (savedLang) {
        console.log(`[GeoLang] Using saved language preference: ${savedLang}`);
        return savedLang;
    }

    // 2. Try to detect country from IP
    const country = await detectCountryFromIP();
    if (country) {
        const lang = getLanguageFromCountry(country);
        console.log(`[GeoLang] Setting language based on country ${country}: ${lang}`);
        return lang;
    }

    // 3. Fallback to browser language
    const browserLang = navigator.language.startsWith('cs') ? 'cs' : 'en';
    console.log(`[GeoLang] Using browser language fallback: ${browserLang}`);
    return browserLang;
}

// ============================================

// Current language (will be properly initialized in DOMContentLoaded)
let currentLanguage = localStorage.getItem('adhub_language') ||
    (navigator.language.startsWith('cs') ? 'cs' : 'en');

// Translation cache from localStorage
let translationCache = JSON.parse(localStorage.getItem('adhub_translation_cache') || '{}');

// State variables
let allTools = [];
let allLinks = [];
let currentFilter = 'all';

// Lazy loading configuration
const INITIAL_LINKS_COUNT = 24; // Show 24 links initially (4 rows of 6)
const LOAD_MORE_COUNT = 24; // Load 24 more each time
let displayedLinksCount = INITIAL_LINKS_COUNT;
let isLoadingMore = false;
let currentCategory = null;
let searchQuery = '';
let isTranslating = false;

// Get translation
function t(key, params = {}) {
    let text = TRANSLATIONS[currentLanguage]?.[key] || TRANSLATIONS['en'][key] || key;
    
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
}

// Get language info by code
function getLanguageInfo(code) {
    return AVAILABLE_LANGUAGES.find(lang => lang.code === code) || AVAILABLE_LANGUAGES[1]; // Default to English
}

// Translate text using MyMemory API
async function translateText(text, fromLang, toLang) {
    if (!text || text.trim() === '') return text;
    if (fromLang === toLang) return text;
    
    // Check cache first
    const cacheKey = `${fromLang}_${toLang}_${text}`;
    if (translationCache[cacheKey]) {
        return translationCache[cacheKey];
    }
    
    try {
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`
        );
        
        if (!response.ok) throw new Error('Translation API error');
        
        const data = await response.json();
        
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
            const translated = data.responseData.translatedText;
            // Cache the translation
            translationCache[cacheKey] = translated;
            // Save cache to localStorage (limit size)
            const cacheKeys = Object.keys(translationCache);
            if (cacheKeys.length > 500) {
                // Remove oldest entries
                const keysToRemove = cacheKeys.slice(0, 100);
                keysToRemove.forEach(k => delete translationCache[k]);
            }
            localStorage.setItem('adhub_translation_cache', JSON.stringify(translationCache));
            return translated;
        }
        
        return text;
    } catch (error) {
        console.warn('Translation failed:', error);
        return text;
    }
}

// Translate all base translations to target language
async function translateAllTexts(targetLang) {
    if (targetLang === 'cs' || targetLang === 'en') {
        // Use base translations directly
        TRANSLATIONS[targetLang] = BASE_TRANSLATIONS[targetLang];
        return true;
    }
    
    // Check if we already have cached translations for this language
    const cachedTranslations = localStorage.getItem(`adhub_translations_${targetLang}`);
    if (cachedTranslations) {
        TRANSLATIONS[targetLang] = JSON.parse(cachedTranslations);
        return true;
    }
    
    // Translate from English (as base)
    const sourceLang = 'en';
    const sourceTexts = BASE_TRANSLATIONS[sourceLang];
    const translatedTexts = {};
    
    // Batch translations for efficiency
    const keys = Object.keys(sourceTexts);
    const batchSize = 5;
    
    for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const translations = await Promise.all(
            batch.map(key => translateText(sourceTexts[key], sourceLang, targetLang))
        );
        
        batch.forEach((key, index) => {
            translatedTexts[key] = translations[index];
        });
        
        // Small delay to avoid rate limiting
        if (i + batchSize < keys.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    TRANSLATIONS[targetLang] = translatedTexts;
    
    // Cache the translations
    localStorage.setItem(`adhub_translations_${targetLang}`, JSON.stringify(translatedTexts));
    
    return true;
}

// Show/hide translation indicator
function showTranslationIndicator(show) {
    const indicator = document.getElementById('translationIndicator');
    if (indicator) {
        indicator.style.display = show ? 'flex' : 'none';
    }
}

// Set language and update UI
async function setLanguage(lang) {
    if (isTranslating) return;
    
    const langInfo = getLanguageInfo(lang);
    if (!langInfo) return;
    
    isTranslating = true;
    showTranslationIndicator(true);
    
    try {
        // Translate all texts if not already available
        await translateAllTexts(lang);
        
        currentLanguage = lang;
        localStorage.setItem('adhub_language', lang);
        document.documentElement.lang = lang;
        
        // Update current language display
        updateCurrentLanguageDisplay(langInfo);
        
        // Update page title
        const titleTranslations = {
            cs: 'AdHUB - Centrální Hub',
            en: 'AdHUB - Central Hub',
            de: 'AdHUB - Zentraler Hub',
            fr: 'AdHUB - Hub Central',
            es: 'AdHUB - Centro Principal'
        };
        document.title = titleTranslations[lang] || `AdHUB - ${langInfo.native}`;
        
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });
        
        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = t(key);
        });
        
        // Update titles
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = t(key);
        });
        
        // Update language search placeholder
        const langSearch = document.getElementById('langSearchInput');
        if (langSearch) {
            langSearch.placeholder = t('search_language');
        }
        
        // Update active language in list
        updateLanguageList();
        
        // Re-render tools to update their translations
        renderTools();

    } catch (error) {
        console.error('Failed to set language:', error);
    } finally {
        isTranslating = false;
        showTranslationIndicator(false);
    }
}

// Update current language display in header
function updateCurrentLanguageDisplay(langInfo) {
    const flagEl = document.getElementById('currentLangFlag');
    const nameEl = document.getElementById('currentLangName');
    
    if (flagEl) flagEl.textContent = langInfo.flag;
    if (nameEl) nameEl.textContent = langInfo.native;
}

// Populate and update language list
function updateLanguageList(filter = '') {
    const langList = document.getElementById('langList');
    if (!langList) return;
    
    const filterLower = filter.toLowerCase();
    const filteredLanguages = AVAILABLE_LANGUAGES.filter(lang => {
        if (!filter) return true;
        return lang.name.toLowerCase().includes(filterLower) ||
               lang.native.toLowerCase().includes(filterLower) ||
               lang.code.toLowerCase().includes(filterLower);
    });
    
    langList.innerHTML = filteredLanguages.map(lang => `
        <div class="lang-item ${lang.code === currentLanguage ? 'active' : ''}" data-lang="${lang.code}">
            <span class="lang-flag">${lang.flag}</span>
            <div class="lang-info">
                <span class="lang-name">${lang.native}</span>
                <span class="lang-native">${lang.name}</span>
            </div>
            <span class="lang-code-badge">${lang.code}</span>
        </div>
    `).join('');
    
    // Add click handlers
    langList.querySelectorAll('.lang-item').forEach(item => {
        item.addEventListener('click', () => {
            const lang = item.dataset.lang;
            setLanguage(lang);
            closeLanguageDropdown();
        });
    });
}

// Toggle language dropdown
function toggleLanguageDropdown() {
    const dropdown = document.querySelector('.language-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('open');
        
        if (dropdown.classList.contains('open')) {
            const searchInput = document.getElementById('langSearchInput');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
                updateLanguageList();
            }
        }
    }
}

// Close language dropdown
function closeLanguageDropdown() {
    const dropdown = document.querySelector('.language-dropdown');
    if (dropdown) {
        dropdown.classList.remove('open');
    }
}

// Default configuration - can be modified directly here
function getLocalizedConfig() {
    return {
        "tools": [
            {
                "id": "youtube-downloader",
                "name": t('tool_youtube_name'),
                "description": t('tool_youtube_desc'),
                "category": "video",
                "icon": "🎥",
                "url": "projects/youtube-downloader/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["video", "download", "browser"]
            },
            {
                "id": "chat-panel",
                "name": t('tool_chat_name'),
                "description": t('tool_chat_desc'),
                "category": "streaming",
                "icon": "💬",
                "url": "projects/chat-panel/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["streaming", "chat", "overlay"]
            },
            {
                "id": "chat-moderator",
                "name": t('tool_chat_mod_name'),
                "description": t('tool_chat_mod_desc'),
                "category": "streaming",
                "icon": "🛡️",
                "url": "projects/chat-panel/moderator.html",
                "type": "local",
                "enabled": true,
                "tags": ["streaming", "moderation", "twitch", "extension"]
            },
            {
                "id": "komopizza-demo",
                "name": t('tool_pizza_name'),
                "description": t('tool_pizza_desc'),
                "category": "demos",
                "icon": "🍕",
                "url": "projects/komopizza/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["demo", "ui", "prototype"]
            },
            {
                "id": "spinning-wheel-giveaway",
                "name": t('tool_spinning_name'),
                "description": t('tool_spinning_desc'),
                "category": "streaming",
                "icon": "🎡",
                "url": "projects/spinning-wheel-giveaway/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["streaming", "giveaway", "interactive"]
            },
            {
                "id": "resignation-bets",
                "name": t('tool_resignation_name'),
                "description": t('tool_resignation_desc'),
                "category": "demos",
                "icon": "🎰",
                "url": "projects/resignation-bets/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["demo", "game", "fun"]
            },
            {
                "id": "ai-prompting",
                "name": t('tool_ai_prompting_name'),
                "description": t('tool_ai_prompting_desc'),
                "category": "tools",
                "icon": "🤖",
                "url": "projects/ai-prompting/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["ai", "productivity", "formatter"]
            },
            {
                "id": "pdf-merge",
                "name": t('tool_pdf_merge_name'),
                "description": t('tool_pdf_merge_desc'),
                "category": "tools",
                "icon": "📄",
                "url": "projects/pdf-merge/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["pdf", "documents", "utility"]
            },
            {
                "id": "pdf-editor",
                "name": t('tool_pdf_editor_name'),
                "description": t('tool_pdf_editor_desc'),
                "category": "tools",
                "icon": "✏️",
                "url": "projects/pdf-editor/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["pdf", "editor", "documents"]
            },
            {
                "id": "pdf-search",
                "name": t('tool_pdf_search_name'),
                "description": t('tool_pdf_search_desc'),
                "category": "tools",
                "icon": "🔍",
                "url": "projects/pdf-search/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["pdf", "search", "documents", "fulltext"]
            },
            {
                "id": "mindhub",
                "name": t('tool_mindhub_name'),
                "description": t('tool_mindhub_desc'),
                "category": "tools",
                "icon": "🧠",
                "url": "projects/mindhub/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["productivity", "tasks", "organization"]
            },
            {
                "id": "steam-farm",
                "name": t('tool_steam_farm_name'),
                "description": t('tool_steam_farm_desc'),
                "category": "gaming",
                "icon": "🎮",
                "url": "projects/steam-farm/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["gaming", "steam", "farming", "cards"]
            },
            {
                "id": "rust-calculator",
                "name": t('tool_rust_calculator_name'),
                "description": t('tool_rust_calculator_desc'),
                "category": "gaming",
                "icon": "⚡",
                "url": "projects/rust-calculator/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["gaming", "rust", "calculator", "raid", "crafting", "offline"]
            },
            {
                "id": "docbook",
                "name": t('tool_docbook_name'),
                "description": t('tool_docbook_desc'),
                "category": "tools",
                "icon": "📖",
                "url": "projects/docbook/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["documentation", "markdown", "editor", "offline", "pwa"]
            },
            {
                "id": "nimt-tracker",
                "name": t('tool_nimt_tracker_name'),
                "description": t('tool_nimt_tracker_desc'),
                "category": "tools",
                "icon": "📊",
                "url": "projects/nimt-tracker/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["ai", "seo", "analytics", "visibility", "offline", "pwa"]
            },
            {
                "id": "api-catalog",
                "name": t('tool_api_catalog_name'),
                "description": t('tool_api_catalog_desc'),
                "category": "tools",
                "icon": "🔌",
                "url": "projects/api-catalog/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["api", "catalog", "offline", "pwa", "database"]
            },
            {
                "id": "server-hub",
                "name": t('tool_server_hub_name'),
                "description": t('tool_server_hub_desc'),
                "category": "tools",
                "icon": "🖥️",
                "url": "projects/server-hub/index.html",
                "type": "local",
                "enabled": true,
                "tags": ["server", "hosting", "management", "offline", "pwa"]
            }
        ],
        "links": [
            {
                "id": "ninite-installer-pack",
                "name": t('link_ninite_name'),
                "description": t('link_ninite_desc'),
                "category": "setup",
                "icon": "⚙️",
                "url": "https://ninite.com/",
                "type": "external",
                "tags": ["windows", "setup"]
            },
            {
                "id": "winget-catalog",
                "name": t('link_winget_name'),
                "description": t('link_winget_desc'),
                "category": "setup",
                "icon": "🪟",
                "url": "https://winget.run/",
                "type": "external",
                "tags": ["windows", "packages"]
            },
            {
                "id": "obs-project",
                "name": t('link_obs_name'),
                "description": t('link_obs_desc'),
                "category": "streaming",
                "icon": "🎥",
                "url": "https://obsproject.com/download",
                "type": "external",
                "tags": ["streaming", "recording"]
            },
            {
                "id": "yt-dlp-releases",
                "name": t('link_ytdlp_name'),
                "description": t('link_ytdlp_desc'),
                "category": "video",
                "icon": "⬇️",
                "url": "https://github.com/yt-dlp/yt-dlp/releases/latest",
                "type": "external",
                "tags": ["video", "download"]
            },
            {
                "id": "haveibeenpwned",
                "name": t('link_hibp_name'),
                "description": t('link_hibp_desc'),
                "category": "security",
                "icon": "🔐",
                "url": "https://haveibeenpwned.com/",
                "type": "external",
                "tags": ["security", "privacy", "breach"]
            },
            // Security & Privacy
            {
                "id": "virustotal",
                "name": t('link_virustotal_name'),
                "description": t('link_virustotal_desc'),
                "category": "security",
                "icon": "🛡️",
                "url": "https://www.virustotal.com/",
                "type": "external",
                "tags": ["security", "antivirus", "malware"]
            },
            {
                "id": "ssllabs",
                "name": t('link_ssllabs_name'),
                "description": t('link_ssllabs_desc'),
                "category": "security",
                "icon": "🔒",
                "url": "https://www.ssllabs.com/ssltest/",
                "type": "external",
                "tags": ["security", "ssl", "testing"]
            },
            {
                "id": "mozilla-observatory",
                "name": t('link_mozilla_observatory_name'),
                "description": t('link_mozilla_observatory_desc'),
                "category": "security",
                "icon": "🦊",
                "url": "https://developer.mozilla.org/en-US/observatory",
                "type": "external",
                "tags": ["security", "headers", "analysis"]
            },
            {
                "id": "hybrid-analysis",
                "name": t('link_hybrid_analysis_name'),
                "description": t('link_hybrid_analysis_desc'),
                "category": "security",
                "icon": "🔬",
                "url": "https://www.hybrid-analysis.com/",
                "type": "external",
                "tags": ["security", "malware", "sandbox"]
            },
            {
                "id": "amiunique",
                "name": t('link_amiunique_name'),
                "description": t('link_amiunique_desc'),
                "category": "security",
                "icon": "🔍",
                "url": "https://amiunique.org/",
                "type": "external",
                "tags": ["privacy", "fingerprint", "browser"]
            },
            {
                "id": "securityheaders",
                "name": t('link_securityheaders_name'),
                "description": t('link_securityheaders_desc'),
                "category": "security",
                "icon": "📋",
                "url": "https://securityheaders.com/",
                "type": "external",
                "tags": ["security", "headers", "analysis"]
            },
            // System Utilities
            {
                "id": "patchmypc",
                "name": t('link_patchmypc_name'),
                "description": t('link_patchmypc_desc'),
                "category": "setup",
                "icon": "🔄",
                "url": "https://patchmypc.com/home-updater",
                "type": "external",
                "tags": ["windows", "updater", "software"]
            },
            {
                "id": "jotti",
                "name": t('link_jotti_name'),
                "description": t('link_jotti_desc'),
                "category": "security",
                "icon": "🔎",
                "url": "https://virusscan.jotti.org/",
                "type": "external",
                "tags": ["security", "antivirus", "scanner"]
            },
            {
                "id": "metadefender",
                "name": t('link_metadefender_name'),
                "description": t('link_metadefender_desc'),
                "category": "security",
                "icon": "🛡️",
                "url": "https://metadefender.com/",
                "type": "external",
                "tags": ["security", "antivirus", "sanitization"]
            },
            {
                "id": "internxt",
                "name": t('link_internxt_name'),
                "description": t('link_internxt_desc'),
                "category": "security",
                "icon": "🔐",
                "url": "https://internxt.com/virus-scanner",
                "type": "external",
                "tags": ["security", "privacy", "scanner"]
            },
            // File Conversion
            {
                "id": "ilovepdf",
                "name": t('link_ilovepdf_name'),
                "description": t('link_ilovepdf_desc'),
                "category": "conversion",
                "icon": "📕",
                "url": "https://www.ilovepdf.com/",
                "type": "external",
                "tags": ["pdf", "conversion", "merge"]
            },
            {
                "id": "pdf24",
                "name": t('link_pdf24_name'),
                "description": t('link_pdf24_desc'),
                "category": "conversion",
                "icon": "📄",
                "url": "https://tools.pdf24.org/",
                "type": "external",
                "tags": ["pdf", "conversion", "editor"]
            },
            {
                "id": "smallpdf",
                "name": t('link_smallpdf_name'),
                "description": t('link_smallpdf_desc'),
                "category": "conversion",
                "icon": "📑",
                "url": "https://smallpdf.com/",
                "type": "external",
                "tags": ["pdf", "conversion", "cloud"]
            },
            {
                "id": "cloudconvert",
                "name": t('link_cloudconvert_name'),
                "description": t('link_cloudconvert_desc'),
                "category": "conversion",
                "icon": "☁️",
                "url": "https://cloudconvert.com/",
                "type": "external",
                "tags": ["conversion", "universal", "formats"]
            },
            {
                "id": "zamzar",
                "name": t('link_zamzar_name'),
                "description": t('link_zamzar_desc'),
                "category": "conversion",
                "icon": "🔄",
                "url": "https://www.zamzar.com/",
                "type": "external",
                "tags": ["conversion", "formats", "universal"]
            },
            {
                "id": "online-convert",
                "name": t('link_onlineconvert_name'),
                "description": t('link_onlineconvert_desc'),
                "category": "conversion",
                "icon": "📁",
                "url": "https://www.online-convert.com/",
                "type": "external",
                "tags": ["conversion", "audio", "video"]
            },
            {
                "id": "freeconvert",
                "name": t('link_freeconvert_name'),
                "description": t('link_freeconvert_desc'),
                "category": "conversion",
                "icon": "🔃",
                "url": "https://www.freeconvert.com/",
                "type": "external",
                "tags": ["conversion", "image", "video"]
            },
            {
                "id": "convertio",
                "name": t('link_convertio_name'),
                "description": t('link_convertio_desc'),
                "category": "conversion",
                "icon": "↔️",
                "url": "https://convertio.co/",
                "type": "external",
                "tags": ["conversion", "universal", "formats"]
            },
            {
                "id": "tinypng",
                "name": t('link_tinypng_name'),
                "description": t('link_tinypng_desc'),
                "category": "conversion",
                "icon": "🐼",
                "url": "https://tinypng.com/",
                "type": "external",
                "tags": ["image", "compression", "optimization"]
            },
            {
                "id": "removebg",
                "name": t('link_removebg_name'),
                "description": t('link_removebg_desc'),
                "category": "design",
                "icon": "✂️",
                "url": "https://www.remove.bg/",
                "type": "external",
                "tags": ["image", "background", "ai"]
            },
            {
                "id": "audioconverter",
                "name": t('link_audioconverter_name'),
                "description": t('link_audioconverter_desc'),
                "category": "conversion",
                "icon": "🎵",
                "url": "https://online-audio-converter.com/",
                "type": "external",
                "tags": ["audio", "conversion", "mp3"]
            },
            {
                "id": "toepub",
                "name": t('link_toepub_name'),
                "description": t('link_toepub_desc'),
                "category": "conversion",
                "icon": "📚",
                "url": "https://toepub.com/",
                "type": "external",
                "tags": ["ebook", "conversion", "epub"]
            },
            // Developer Tools
            {
                "id": "regex101",
                "name": t('link_regex101_name'),
                "description": t('link_regex101_desc'),
                "category": "developer",
                "icon": "🔤",
                "url": "https://regex101.com/",
                "type": "external",
                "tags": ["regex", "developer", "testing"]
            },
            {
                "id": "regexr",
                "name": t('link_regexr_name'),
                "description": t('link_regexr_desc'),
                "category": "developer",
                "icon": "🔡",
                "url": "https://regexr.com/",
                "type": "external",
                "tags": ["regex", "developer", "patterns"]
            },
            {
                "id": "jsonlint",
                "name": t('link_jsonlint_name'),
                "description": t('link_jsonlint_desc'),
                "category": "developer",
                "icon": "📋",
                "url": "https://jsonlint.com/",
                "type": "external",
                "tags": ["json", "validator", "developer"]
            },
            {
                "id": "jsoneditor",
                "name": t('link_jsoneditor_name'),
                "description": t('link_jsoneditor_desc'),
                "category": "developer",
                "icon": "📝",
                "url": "https://jsoneditoronline.org/",
                "type": "external",
                "tags": ["json", "editor", "developer"]
            },
            {
                "id": "jsoncrack",
                "name": t('link_jsoncrack_name'),
                "description": t('link_jsoncrack_desc'),
                "category": "developer",
                "icon": "🌳",
                "url": "https://jsoncrack.com/",
                "type": "external",
                "tags": ["json", "visualization", "developer"]
            },
            {
                "id": "hoppscotch",
                "name": t('link_hoppscotch_name'),
                "description": t('link_hoppscotch_desc'),
                "category": "developer",
                "icon": "🦗",
                "url": "https://hoppscotch.io/",
                "type": "external",
                "tags": ["api", "testing", "developer"]
            },
            {
                "id": "reqbin",
                "name": t('link_reqbin_name'),
                "description": t('link_reqbin_desc'),
                "category": "developer",
                "icon": "📡",
                "url": "https://reqbin.com/",
                "type": "external",
                "tags": ["api", "rest", "testing"]
            },
            {
                "id": "codepen",
                "name": t('link_codepen_name'),
                "description": t('link_codepen_desc'),
                "category": "developer",
                "icon": "✒️",
                "url": "https://codepen.io/",
                "type": "external",
                "tags": ["frontend", "playground", "code"]
            },
            {
                "id": "jsfiddle",
                "name": t('link_jsfiddle_name'),
                "description": t('link_jsfiddle_desc'),
                "category": "developer",
                "icon": "🎻",
                "url": "https://jsfiddle.net/",
                "type": "external",
                "tags": ["javascript", "playground", "code"]
            },
            {
                "id": "playcode",
                "name": t('link_playcode_name'),
                "description": t('link_playcode_desc'),
                "category": "developer",
                "icon": "▶️",
                "url": "https://playcode.io/",
                "type": "external",
                "tags": ["javascript", "react", "playground"]
            },
            {
                "id": "diffchecker",
                "name": t('link_diffchecker_name'),
                "description": t('link_diffchecker_desc'),
                "category": "developer",
                "icon": "📊",
                "url": "https://www.diffchecker.com/",
                "type": "external",
                "tags": ["diff", "compare", "developer"]
            },
            {
                "id": "base64",
                "name": t('link_base64_name'),
                "description": t('link_base64_desc'),
                "category": "developer",
                "icon": "🔢",
                "url": "https://www.base64decode.org/",
                "type": "external",
                "tags": ["base64", "encode", "decode"]
            },
            {
                "id": "crontab",
                "name": t('link_crontab_name'),
                "description": t('link_crontab_desc'),
                "category": "developer",
                "icon": "⏰",
                "url": "https://crontab.guru/",
                "type": "external",
                "tags": ["cron", "scheduler", "developer"]
            },
            {
                "id": "uuid",
                "name": t('link_uuid_name'),
                "description": t('link_uuid_desc'),
                "category": "developer",
                "icon": "🆔",
                "url": "https://www.uuidgenerator.net/",
                "type": "external",
                "tags": ["uuid", "generator", "developer"]
            },
            {
                "id": "beautifier",
                "name": t('link_beautifier_name'),
                "description": t('link_beautifier_desc'),
                "category": "developer",
                "icon": "✨",
                "url": "https://beautifier.io/",
                "type": "external",
                "tags": ["beautify", "format", "code"]
            },
            {
                "id": "codebeautify",
                "name": t('link_codebeautify_name'),
                "description": t('link_codebeautify_desc'),
                "category": "developer",
                "icon": "🎨",
                "url": "https://codebeautify.org/",
                "type": "external",
                "tags": ["format", "validator", "converter"]
            },
            {
                "id": "minifier",
                "name": t('link_minifier_name'),
                "description": t('link_minifier_desc'),
                "category": "developer",
                "icon": "📦",
                "url": "https://www.minifier.org/",
                "type": "external",
                "tags": ["minify", "javascript", "css"]
            },
            // Design & Graphics
            {
                "id": "photopea",
                "name": t('link_photopea_name'),
                "description": t('link_photopea_desc'),
                "category": "design",
                "icon": "🖼️",
                "url": "https://www.photopea.com/",
                "type": "external",
                "tags": ["photoshop", "editor", "design"]
            },
            {
                "id": "pixlr",
                "name": t('link_pixlr_name'),
                "description": t('link_pixlr_desc'),
                "category": "design",
                "icon": "📸",
                "url": "https://pixlr.com/",
                "type": "external",
                "tags": ["photo", "editor", "ai"]
            },
            {
                "id": "coolors",
                "name": t('link_coolors_name'),
                "description": t('link_coolors_desc'),
                "category": "design",
                "icon": "🎨",
                "url": "https://coolors.co/",
                "type": "external",
                "tags": ["colors", "palette", "design"]
            },
            {
                "id": "paletton",
                "name": t('link_paletton_name'),
                "description": t('link_paletton_desc'),
                "category": "design",
                "icon": "🌈",
                "url": "https://paletton.com/",
                "type": "external",
                "tags": ["colors", "palette", "wheel"]
            },
            {
                "id": "colormind",
                "name": t('link_colormind_name'),
                "description": t('link_colormind_desc'),
                "category": "design",
                "icon": "🧠",
                "url": "http://colormind.io/",
                "type": "external",
                "tags": ["colors", "ai", "palette"]
            },
            {
                "id": "favicon",
                "name": t('link_favicon_name'),
                "description": t('link_favicon_desc'),
                "category": "design",
                "icon": "🔖",
                "url": "https://favicon.io/",
                "type": "external",
                "tags": ["favicon", "generator", "design"]
            },
            {
                "id": "realfavicon",
                "name": t('link_realfavicon_name'),
                "description": t('link_realfavicon_desc'),
                "category": "design",
                "icon": "📱",
                "url": "https://realfavicongenerator.net/",
                "type": "external",
                "tags": ["favicon", "generator", "multiplatform"]
            },
            {
                "id": "svgrepo",
                "name": t('link_svgrepo_name'),
                "description": t('link_svgrepo_desc'),
                "category": "design",
                "icon": "🎯",
                "url": "https://www.svgrepo.com/",
                "type": "external",
                "tags": ["svg", "icons", "vectors"]
            },
            {
                "id": "iconoir",
                "name": t('link_iconoir_name'),
                "description": t('link_iconoir_desc'),
                "category": "design",
                "icon": "⭐",
                "url": "https://iconoir.com/",
                "type": "external",
                "tags": ["icons", "opensource", "library"]
            },
            {
                "id": "patternmonster",
                "name": t('link_patternmonster_name'),
                "description": t('link_patternmonster_desc'),
                "category": "design",
                "icon": "🔲",
                "url": "https://pattern.monster/",
                "type": "external",
                "tags": ["patterns", "svg", "backgrounds"]
            },
            {
                "id": "doodad",
                "name": t('link_doodad_name'),
                "description": t('link_doodad_desc'),
                "category": "design",
                "icon": "🧩",
                "url": "https://doodad.dev/pattern-generator/",
                "type": "external",
                "tags": ["patterns", "generator", "seamless"]
            },
            {
                "id": "cssgradient",
                "name": t('link_cssgradient_name'),
                "description": t('link_cssgradient_desc'),
                "category": "design",
                "icon": "🌅",
                "url": "https://cssgradient.io/",
                "type": "external",
                "tags": ["css", "gradient", "generator"]
            },
            {
                "id": "joshgradient",
                "name": t('link_joshgradient_name'),
                "description": t('link_joshgradient_desc'),
                "category": "design",
                "icon": "🎭",
                "url": "https://www.joshwcomeau.com/gradient-generator/",
                "type": "external",
                "tags": ["css", "gradient", "advanced"]
            },
            {
                "id": "placehold",
                "name": t('link_placehold_name'),
                "description": t('link_placehold_desc'),
                "category": "design",
                "icon": "🖼️",
                "url": "https://placehold.co/",
                "type": "external",
                "tags": ["placeholder", "images", "design"]
            },
            {
                "id": "methoddraw",
                "name": t('link_methoddraw_name'),
                "description": t('link_methoddraw_desc'),
                "category": "design",
                "icon": "✏️",
                "url": "https://editor.method.ac/",
                "type": "external",
                "tags": ["svg", "editor", "opensource"]
            },
            {
                "id": "screenzy",
                "name": t('link_screenzy_name'),
                "description": t('link_screenzy_desc'),
                "category": "design",
                "icon": "📷",
                "url": "https://screenzy.io/",
                "type": "external",
                "tags": ["screenshot", "mockup", "design"]
            },
            {
                "id": "fontjoy",
                "name": t('link_fontjoy_name'),
                "description": t('link_fontjoy_desc'),
                "category": "design",
                "icon": "🔤",
                "url": "https://fontjoy.com/",
                "type": "external",
                "tags": ["fonts", "pairing", "ai"]
            },
            {
                "id": "mockupbro",
                "name": t('link_mockupbro_name'),
                "description": t('link_mockupbro_desc'),
                "category": "design",
                "icon": "📱",
                "url": "https://mockupbro.com/",
                "type": "external",
                "tags": ["mockup", "product", "design"]
            },
            {
                "id": "namecheap-logo",
                "name": t('link_namecheap_logo_name'),
                "description": t('link_namecheap_logo_desc'),
                "category": "design",
                "icon": "🏷️",
                "url": "https://www.namecheap.com/logo-maker/",
                "type": "external",
                "tags": ["logo", "ai", "generator"]
            },
            // Text & Writing
            {
                "id": "scribbr-grammar",
                "name": t('link_scribbr_grammar_name'),
                "description": t('link_scribbr_grammar_desc'),
                "category": "writing",
                "icon": "✍️",
                "url": "https://www.scribbr.com/grammar-checker/",
                "type": "external",
                "tags": ["grammar", "ai", "writing"]
            },
            {
                "id": "quillbot-grammar",
                "name": t('link_quillbot_grammar_name'),
                "description": t('link_quillbot_grammar_desc'),
                "category": "writing",
                "icon": "🖊️",
                "url": "https://quillbot.com/grammar-check",
                "type": "external",
                "tags": ["grammar", "spelling", "writing"]
            },
            {
                "id": "stackedit",
                "name": t('link_stackedit_name'),
                "description": t('link_stackedit_desc'),
                "category": "writing",
                "icon": "📝",
                "url": "https://stackedit.io/",
                "type": "external",
                "tags": ["markdown", "editor", "latex"]
            },
            {
                "id": "dillinger",
                "name": t('link_dillinger_name'),
                "description": t('link_dillinger_desc'),
                "category": "writing",
                "icon": "📑",
                "url": "https://dillinger.io/",
                "type": "external",
                "tags": ["markdown", "cloud", "editor"]
            },
            {
                "id": "wordcounter",
                "name": t('link_wordcounter_name'),
                "description": t('link_wordcounter_desc'),
                "category": "writing",
                "icon": "🔢",
                "url": "https://wordcounter.net/",
                "type": "external",
                "tags": ["counter", "words", "analysis"]
            },
            {
                "id": "convertcase",
                "name": t('link_convertcase_name'),
                "description": t('link_convertcase_desc'),
                "category": "writing",
                "icon": "🔠",
                "url": "https://convertcase.net/",
                "type": "external",
                "tags": ["text", "case", "converter"]
            },
            {
                "id": "lipsum",
                "name": t('link_lipsum_name'),
                "description": t('link_lipsum_desc'),
                "category": "writing",
                "icon": "📜",
                "url": "https://www.lipsum.com/",
                "type": "external",
                "tags": ["lorem", "ipsum", "generator"]
            },
            {
                "id": "hemingway",
                "name": t('link_hemingway_name'),
                "description": t('link_hemingway_desc'),
                "category": "writing",
                "icon": "📖",
                "url": "https://hemingwayapp.com/readability-checker",
                "type": "external",
                "tags": ["readability", "writing", "checker"]
            },
            {
                "id": "textcompare",
                "name": t('link_textcompare_name'),
                "description": t('link_textcompare_desc'),
                "category": "writing",
                "icon": "📊",
                "url": "https://text-compare.com/",
                "type": "external",
                "tags": ["diff", "compare", "text"]
            },
            // SEO & Web Analysis
            {
                "id": "pagespeed",
                "name": t('link_pagespeed_name'),
                "description": t('link_pagespeed_desc'),
                "category": "seo",
                "icon": "⚡",
                "url": "https://pagespeed.web.dev/",
                "type": "external",
                "tags": ["performance", "google", "webvitals"]
            },
            {
                "id": "gtmetrix",
                "name": t('link_gtmetrix_name'),
                "description": t('link_gtmetrix_desc'),
                "category": "seo",
                "icon": "📈",
                "url": "https://gtmetrix.com/",
                "type": "external",
                "tags": ["performance", "lighthouse", "testing"]
            },
            {
                "id": "webpagetest",
                "name": t('link_webpagetest_name'),
                "description": t('link_webpagetest_desc'),
                "category": "seo",
                "icon": "🌐",
                "url": "https://www.webpagetest.org/",
                "type": "external",
                "tags": ["performance", "testing", "global"]
            },
            {
                "id": "pingdom",
                "name": t('link_pingdom_name'),
                "description": t('link_pingdom_desc'),
                "category": "seo",
                "icon": "📊",
                "url": "https://tools.pingdom.com/",
                "type": "external",
                "tags": ["speed", "analysis", "testing"]
            },
            {
                "id": "seobility",
                "name": t('link_seobility_name'),
                "description": t('link_seobility_desc'),
                "category": "seo",
                "icon": "🔍",
                "url": "https://www.seobility.net/en/seocheck/",
                "type": "external",
                "tags": ["seo", "analyzer", "audit"]
            },
            {
                "id": "seoptimer",
                "name": t('link_seoptimer_name'),
                "description": t('link_seoptimer_desc'),
                "category": "seo",
                "icon": "📋",
                "url": "https://www.seoptimer.com/",
                "type": "external",
                "tags": ["seo", "audit", "performance"]
            },
            {
                "id": "schemavalidator",
                "name": t('link_schemavalidator_name'),
                "description": t('link_schemavalidator_desc'),
                "category": "seo",
                "icon": "✅",
                "url": "https://validator.schema.org/",
                "type": "external",
                "tags": ["schema", "validator", "structured"]
            },
            {
                "id": "richresults",
                "name": t('link_richresults_name'),
                "description": t('link_richresults_desc'),
                "category": "seo",
                "icon": "🌟",
                "url": "https://search.google.com/test/rich-results",
                "type": "external",
                "tags": ["google", "rich", "testing"]
            },
            {
                "id": "brokenlinkcheck",
                "name": t('link_brokenlinkcheck_name'),
                "description": t('link_brokenlinkcheck_desc'),
                "category": "seo",
                "icon": "🔗",
                "url": "https://brokenlinkcheck.com/",
                "type": "external",
                "tags": ["links", "broken", "checker"]
            },
            {
                "id": "xmlsitemaps",
                "name": t('link_xmlsitemaps_name'),
                "description": t('link_xmlsitemaps_desc'),
                "category": "seo",
                "icon": "🗺️",
                "url": "https://www.xml-sitemaps.com/",
                "type": "external",
                "tags": ["sitemap", "xml", "generator"]
            },
            // Network & DNS
            {
                "id": "mxtoolbox",
                "name": t('link_mxtoolbox_name'),
                "description": t('link_mxtoolbox_desc'),
                "category": "network",
                "icon": "📧",
                "url": "https://mxtoolbox.com/",
                "type": "external",
                "tags": ["dns", "mx", "blacklist"]
            },
            {
                "id": "centralops",
                "name": t('link_centralops_name'),
                "description": t('link_centralops_desc'),
                "category": "network",
                "icon": "🌐",
                "url": "https://centralops.net/co/",
                "type": "external",
                "tags": ["network", "traceroute", "whois"]
            },
            {
                "id": "whois",
                "name": t('link_whois_name'),
                "description": t('link_whois_desc'),
                "category": "network",
                "icon": "🔎",
                "url": "https://who.is/",
                "type": "external",
                "tags": ["whois", "domain", "lookup"]
            },
            {
                "id": "pingeu",
                "name": t('link_pingeu_name'),
                "description": t('link_pingeu_desc'),
                "category": "network",
                "icon": "📡",
                "url": "https://ping.eu/",
                "type": "external",
                "tags": ["ping", "traceroute", "network"]
            },
            {
                "id": "dnschecker",
                "name": t('link_dnschecker_name'),
                "description": t('link_dnschecker_desc'),
                "category": "network",
                "icon": "🔄",
                "url": "https://dnschecker.org/",
                "type": "external",
                "tags": ["dns", "propagation", "lookup"]
            },
            {
                "id": "hackertarget",
                "name": t('link_hackertarget_name'),
                "description": t('link_hackertarget_desc'),
                "category": "network",
                "icon": "🎯",
                "url": "https://hackertarget.com/",
                "type": "external",
                "tags": ["nmap", "port", "scanner"]
            },
            {
                "id": "fast",
                "name": t('link_fast_name'),
                "description": t('link_fast_desc'),
                "category": "network",
                "icon": "⚡",
                "url": "https://fast.com/",
                "type": "external",
                "tags": ["speed", "test", "netflix"]
            },
            {
                "id": "testmynet",
                "name": t('link_testmynet_name'),
                "description": t('link_testmynet_desc'),
                "category": "network",
                "icon": "📶",
                "url": "https://testmy.net/",
                "type": "external",
                "tags": ["speed", "broadband", "test"]
            },
            {
                "id": "ipvoid",
                "name": t('link_ipvoid_name'),
                "description": t('link_ipvoid_desc'),
                "category": "network",
                "icon": "🌍",
                "url": "https://www.ipvoid.com/",
                "type": "external",
                "tags": ["ip", "blacklist", "geolocation"]
            },
            // Data & Calculation
            {
                "id": "desmos-scientific",
                "name": t('link_desmos_scientific_name'),
                "description": t('link_desmos_scientific_desc'),
                "category": "calculation",
                "icon": "🔢",
                "url": "https://www.desmos.com/scientific",
                "type": "external",
                "tags": ["calculator", "scientific", "math"]
            },
            {
                "id": "calculatornet",
                "name": t('link_calculatornet_name'),
                "description": t('link_calculatornet_desc'),
                "category": "calculation",
                "icon": "🧮",
                "url": "https://www.calculator.net/",
                "type": "external",
                "tags": ["calculator", "financial", "statistics"]
            },
            {
                "id": "unitconverters",
                "name": t('link_unitconverters_name'),
                "description": t('link_unitconverters_desc'),
                "category": "calculation",
                "icon": "📏",
                "url": "https://www.unitconverters.net/",
                "type": "external",
                "tags": ["units", "converter", "measurement"]
            },
            {
                "id": "timeanddate",
                "name": t('link_timeanddate_name'),
                "description": t('link_timeanddate_desc'),
                "category": "calculation",
                "icon": "🕐",
                "url": "https://www.timeanddate.com/worldclock/converter.html",
                "type": "external",
                "tags": ["timezone", "converter", "international"]
            },
            {
                "id": "worldtimebuddy",
                "name": t('link_worldtimebuddy_name'),
                "description": t('link_worldtimebuddy_desc'),
                "category": "calculation",
                "icon": "🌎",
                "url": "https://www.worldtimebuddy.com/",
                "type": "external",
                "tags": ["timezone", "meeting", "comparison"]
            },
            {
                "id": "chartgo",
                "name": t('link_chartgo_name'),
                "description": t('link_chartgo_desc'),
                "category": "calculation",
                "icon": "📊",
                "url": "https://www.chartgo.com/",
                "type": "external",
                "tags": ["charts", "graphs", "visualization"]
            },
            {
                "id": "rawgraphs",
                "name": t('link_rawgraphs_name'),
                "description": t('link_rawgraphs_desc'),
                "category": "calculation",
                "icon": "📈",
                "url": "https://app.rawgraphs.io/",
                "type": "external",
                "tags": ["visualization", "data", "opensource"]
            },
            {
                "id": "livegap",
                "name": t('link_livegap_name'),
                "description": t('link_livegap_desc'),
                "category": "calculation",
                "icon": "📉",
                "url": "https://charts.livegap.com/",
                "type": "external",
                "tags": ["charts", "templates", "realtime"]
            },
            {
                "id": "socsci",
                "name": t('link_socsci_name'),
                "description": t('link_socsci_desc'),
                "category": "calculation",
                "icon": "📐",
                "url": "https://www.socscistatistics.com/tests/",
                "type": "external",
                "tags": ["statistics", "calculator", "science"]
            },
            // Compression & Archive
            {
                "id": "ezyzip",
                "name": t('link_ezyzip_name'),
                "description": t('link_ezyzip_desc'),
                "category": "archive",
                "icon": "🗜️",
                "url": "https://www.ezyzip.com/",
                "type": "external",
                "tags": ["zip", "archive", "browser"]
            },
            {
                "id": "zipextractor",
                "name": t('link_zipextractor_name'),
                "description": t('link_zipextractor_desc'),
                "category": "archive",
                "icon": "📁",
                "url": "https://zipextractor.app/",
                "type": "external",
                "tags": ["zip", "google", "drive"]
            },
            {
                "id": "unziponline",
                "name": t('link_unziponline_name'),
                "description": t('link_unziponline_desc'),
                "category": "archive",
                "icon": "📂",
                "url": "https://unzip-online.com/",
                "type": "external",
                "tags": ["zip", "rar", "extract"]
            },
            {
                "id": "archiveconvert",
                "name": t('link_archiveconvert_name'),
                "description": t('link_archiveconvert_desc'),
                "category": "archive",
                "icon": "🔄",
                "url": "https://archive.online-convert.com/",
                "type": "external",
                "tags": ["archive", "convert", "formats"]
            },
            {
                "id": "aspose-zip",
                "name": t('link_aspose_zip_name'),
                "description": t('link_aspose_zip_desc'),
                "category": "archive",
                "icon": "⚡",
                "url": "https://products.aspose.app/zip/extract/zip",
                "type": "external",
                "tags": ["zip", "extract", "fast"]
            },
            // QR Code Generators
            {
                "id": "qrmonkey",
                "name": t('link_qrmonkey_name'),
                "description": t('link_qrmonkey_desc'),
                "category": "qrcode",
                "icon": "🐵",
                "url": "https://www.qrcode-monkey.com/",
                "type": "external",
                "tags": ["qr", "generator", "custom"]
            },
            {
                "id": "qrstuff",
                "name": t('link_qrstuff_name'),
                "description": t('link_qrstuff_desc'),
                "category": "qrcode",
                "icon": "📱",
                "url": "https://www.qrstuff.com/",
                "type": "external",
                "tags": ["qr", "generator", "datatypes"]
            },
            {
                "id": "goqr",
                "name": t('link_goqr_name'),
                "description": t('link_goqr_desc'),
                "category": "qrcode",
                "icon": "🔲",
                "url": "https://goqr.me/",
                "type": "external",
                "tags": ["qr", "commercial", "logo"]
            },
            {
                "id": "qrcreator",
                "name": t('link_qrcreator_name'),
                "description": t('link_qrcreator_desc'),
                "category": "qrcode",
                "icon": "✨",
                "url": "https://qr-creator.com/",
                "type": "external",
                "tags": ["qr", "vector", "lifetime"]
            },
            {
                "id": "qrgenerator",
                "name": t('link_qrgenerator_name'),
                "description": t('link_qrgenerator_desc'),
                "category": "qrcode",
                "icon": "🎨",
                "url": "https://qrgenerator.org/",
                "type": "external",
                "tags": ["qr", "unlimited", "customizable"]
            },
            // Screenshot & Screen Recording
            {
                "id": "screenpal",
                "name": t('link_screenpal_name'),
                "description": t('link_screenpal_desc'),
                "category": "recording",
                "icon": "🎬",
                "url": "https://screen-recorder.com/",
                "type": "external",
                "tags": ["screen", "recorder", "webcam"]
            },
            {
                "id": "recordcast",
                "name": t('link_recordcast_name'),
                "description": t('link_recordcast_desc'),
                "category": "recording",
                "icon": "🎥",
                "url": "https://www.recordcast.com/",
                "type": "external",
                "tags": ["screen", "recorder", "editor"]
            },
            {
                "id": "panopto",
                "name": t('link_panopto_name'),
                "description": t('link_panopto_desc'),
                "category": "recording",
                "icon": "📹",
                "url": "https://www.panopto.com/record/",
                "type": "external",
                "tags": ["screen", "recorder", "youtube"]
            },
            {
                "id": "screencapture",
                "name": t('link_screencapture_name'),
                "description": t('link_screencapture_desc'),
                "category": "recording",
                "icon": "🖥️",
                "url": "https://www.screencapture.com/",
                "type": "external",
                "tags": ["screen", "capture", "recording"]
            },
            {
                "id": "screenshotguru",
                "name": t('link_screenshotguru_name'),
                "description": t('link_screenshotguru_desc'),
                "category": "recording",
                "icon": "📸",
                "url": "https://screenshot.guru/",
                "type": "external",
                "tags": ["screenshot", "fullpage", "url"]
            },
            {
                "id": "gemoo",
                "name": t('link_gemoo_name'),
                "description": t('link_gemoo_desc'),
                "category": "recording",
                "icon": "📱",
                "url": "https://gemoo.com/tools/website-screenshot/",
                "type": "external",
                "tags": ["screenshot", "mobile", "desktop"]
            },
            // Temporary & Disposable Services
            {
                "id": "guerrillamail",
                "name": t('link_guerrillamail_name'),
                "description": t('link_guerrillamail_desc'),
                "category": "temporary",
                "icon": "📧",
                "url": "https://www.guerrillamail.com/",
                "type": "external",
                "tags": ["email", "disposable", "temporary"]
            },
            {
                "id": "tempmail",
                "name": t('link_tempmail_name'),
                "description": t('link_tempmail_desc'),
                "category": "temporary",
                "icon": "✉️",
                "url": "https://temp-mail.org/",
                "type": "external",
                "tags": ["email", "temporary", "auto"]
            },
            {
                "id": "maildrop",
                "name": t('link_maildrop_name'),
                "description": t('link_maildrop_desc'),
                "category": "temporary",
                "icon": "📬",
                "url": "https://maildrop.cc/",
                "type": "external",
                "tags": ["email", "instant", "disposable"]
            },
            {
                "id": "privatebin",
                "name": t('link_privatebin_name'),
                "description": t('link_privatebin_desc'),
                "category": "temporary",
                "icon": "🔐",
                "url": "https://privatebin.net/",
                "type": "external",
                "tags": ["pastebin", "encrypted", "privacy"]
            },
            {
                "id": "pastesio",
                "name": t('link_pastesio_name'),
                "description": t('link_pastesio_desc'),
                "category": "temporary",
                "icon": "📋",
                "url": "https://pastes.io/",
                "type": "external",
                "tags": ["pastebin", "encrypted", "password"]
            },
            {
                "id": "fileio",
                "name": t('link_fileio_name'),
                "description": t('link_fileio_desc'),
                "category": "temporary",
                "icon": "📤",
                "url": "https://www.file.io/",
                "type": "external",
                "tags": ["file", "sharing", "autodelete"]
            },
            {
                "id": "wetransfer",
                "name": t('link_wetransfer_name'),
                "description": t('link_wetransfer_desc'),
                "category": "temporary",
                "icon": "📦",
                "url": "https://wetransfer.com/",
                "type": "external",
                "tags": ["file", "transfer", "sharing"]
            },
            {
                "id": "privnote",
                "name": t('link_privnote_name'),
                "description": t('link_privnote_desc'),
                "category": "temporary",
                "icon": "🔥",
                "url": "https://privnote.com/",
                "type": "external",
                "tags": ["notes", "encrypted", "selfdestructing"]
            },
            {
                "id": "chattory",
                "name": t('link_chattory_name'),
                "description": t('link_chattory_desc'),
                "category": "temporary",
                "icon": "💬",
                "url": "https://chattory.com/",
                "type": "external",
                "tags": ["chat", "temporary", "instant"]
            },
            // AI & Automation
            {
                "id": "tinywow",
                "name": t('link_tinywow_name'),
                "description": t('link_tinywow_desc'),
                "category": "ai",
                "icon": "🤖",
                "url": "https://tinywow.com/",
                "type": "external",
                "tags": ["ai", "tools", "free"]
            },
            {
                "id": "perchance",
                "name": t('link_perchance_name'),
                "description": t('link_perchance_desc'),
                "category": "ai",
                "icon": "💬",
                "url": "https://perchance.org/ai-chat",
                "type": "external",
                "tags": ["ai", "chat", "unlimited"]
            },
            {
                "id": "deepai",
                "name": t('link_deepai_name'),
                "description": t('link_deepai_desc'),
                "category": "ai",
                "icon": "🧠",
                "url": "https://deepai.org/chat",
                "type": "external",
                "tags": ["ai", "chatbot", "code"]
            },
            {
                "id": "ocrspace",
                "name": t('link_ocrspace_name'),
                "description": t('link_ocrspace_desc'),
                "category": "ai",
                "icon": "👁️",
                "url": "https://ocr.space/",
                "type": "external",
                "tags": ["ocr", "api", "text"]
            },
            {
                "id": "newocr",
                "name": t('link_newocr_name'),
                "description": t('link_newocr_desc'),
                "category": "ai",
                "icon": "📄",
                "url": "https://www.newocr.com/",
                "type": "external",
                "tags": ["ocr", "languages", "unlimited"]
            },
            {
                "id": "i2ocr",
                "name": t('link_i2ocr_name'),
                "description": t('link_i2ocr_desc'),
                "category": "ai",
                "icon": "🔍",
                "url": "https://www.i2ocr.com/",
                "type": "external",
                "tags": ["ocr", "multilanguage", "formats"]
            },
            {
                "id": "quillbot-summarize",
                "name": t('link_quillbot_summarize_name'),
                "description": t('link_quillbot_summarize_desc'),
                "category": "ai",
                "icon": "📝",
                "url": "https://quillbot.com/summarize",
                "type": "external",
                "tags": ["ai", "summarizer", "text"]
            },
            {
                "id": "scribbr-summarize",
                "name": t('link_scribbr_summarize_name'),
                "description": t('link_scribbr_summarize_desc'),
                "category": "ai",
                "icon": "✂️",
                "url": "https://www.scribbr.com/text-summarizer/",
                "type": "external",
                "tags": ["ai", "summarizer", "flexible"]
            },
            // Learning & Reference
            {
                "id": "desmos-graphing",
                "name": t('link_desmos_graphing_name'),
                "description": t('link_desmos_graphing_desc'),
                "category": "learning",
                "icon": "📊",
                "url": "https://www.desmos.com/calculator",
                "type": "external",
                "tags": ["graphing", "calculator", "math"]
            },
            {
                "id": "onlineconversion",
                "name": t('link_onlineconversion_name'),
                "description": t('link_onlineconversion_desc'),
                "category": "learning",
                "icon": "🔄",
                "url": "https://www.onlineconversion.com/",
                "type": "external",
                "tags": ["conversion", "units", "reference"]
            },
            {
                "id": "typingclub",
                "name": t('link_typingclub_name'),
                "description": t('link_typingclub_desc'),
                "category": "learning",
                "icon": "⌨️",
                "url": "https://www.typingclub.com/",
                "type": "external",
                "tags": ["typing", "tutor", "games"]
            },
            {
                "id": "keybr",
                "name": t('link_keybr_name'),
                "description": t('link_keybr_desc'),
                "category": "learning",
                "icon": "🎯",
                "url": "https://www.keybr.com/",
                "type": "external",
                "tags": ["typing", "adaptive", "lessons"]
            },
            {
                "id": "wolframalpha",
                "name": t('link_wolframalpha_name'),
                "description": t('link_wolframalpha_desc'),
                "category": "learning",
                "icon": "🔬",
                "url": "https://www.wolframalpha.com/",
                "type": "external",
                "tags": ["knowledge", "computational", "engine"]
            },
            // Browser-based Productivity
            {
                "id": "drawio",
                "name": t('link_drawio_name'),
                "description": t('link_drawio_desc'),
                "category": "productivity",
                "icon": "📐",
                "url": "https://app.diagrams.net/",
                "type": "external",
                "tags": ["diagrams", "flowcharts", "uml"]
            },
            {
                "id": "excalidraw",
                "name": t('link_excalidraw_name'),
                "description": t('link_excalidraw_desc'),
                "category": "productivity",
                "icon": "✏️",
                "url": "https://excalidraw.com/",
                "type": "external",
                "tags": ["whiteboard", "collaboration", "handdrawn"]
            },
            {
                "id": "tldraw",
                "name": t('link_tldraw_name'),
                "description": t('link_tldraw_desc'),
                "category": "productivity",
                "icon": "🎨",
                "url": "https://www.tldraw.com/",
                "type": "external",
                "tags": ["whiteboard", "instant", "devices"]
            },
            {
                "id": "pomofocus",
                "name": t('link_pomofocus_name'),
                "description": t('link_pomofocus_desc'),
                "category": "productivity",
                "icon": "🍅",
                "url": "https://pomofocus.io/",
                "type": "external",
                "tags": ["pomodoro", "timer", "tasks"]
            },
            {
                "id": "tomatotimers",
                "name": t('link_tomatotimers_name'),
                "description": t('link_tomatotimers_desc'),
                "category": "productivity",
                "icon": "⏱️",
                "url": "https://www.tomatotimers.com/",
                "type": "external",
                "tags": ["pomodoro", "customizable", "breaks"]
            },
            {
                "id": "protectedtext",
                "name": t('link_protectedtext_name'),
                "description": t('link_protectedtext_desc'),
                "category": "productivity",
                "icon": "🔒",
                "url": "https://www.protectedtext.com/",
                "type": "external",
                "tags": ["notepad", "encrypted", "password"]
            },
            {
                "id": "onlinenotepad",
                "name": t('link_onlinenotepad_name'),
                "description": t('link_onlinenotepad_desc'),
                "category": "productivity",
                "icon": "📝",
                "url": "https://onlinenotepad.org/",
                "type": "external",
                "tags": ["notepad", "autosave", "browser"]
            },
            {
                "id": "simplemindmap",
                "name": t('link_simplemindmap_name'),
                "description": t('link_simplemindmap_desc'),
                "category": "productivity",
                "icon": "🧠",
                "url": "https://simplemindmap.com/",
                "type": "external",
                "tags": ["mindmap", "minimalist", "devices"]
            },
            {
                "id": "pdf24annotate",
                "name": t('link_pdf24annotate_name'),
                "description": t('link_pdf24annotate_desc'),
                "category": "productivity",
                "icon": "📝",
                "url": "https://tools.pdf24.org/en/annotate-pdf",
                "type": "external",
                "tags": ["pdf", "annotate", "drawing"]
            },
            {
                "id": "pdfgear",
                "name": t('link_pdfgear_name'),
                "description": t('link_pdfgear_desc'),
                "category": "productivity",
                "icon": "⚙️",
                "url": "https://www.pdfgear.com/edit-pdf/",
                "type": "external",
                "tags": ["pdf", "editor", "free"]
            }
        ]
    };
}

// Use default configuration
function useDefaultConfig() {
    const config = getLocalizedConfig();
    allTools = config.tools || [];
    allLinks = config.links || [];
    renderTools();
}

// Update status bar
function updateStatus(text, success = true) {
    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
        const statusText = statusBar.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = text;
            statusText.style.color = success ? 'var(--text-secondary)' : 'var(--danger-color)';
        }
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Search and filter
function filterItems() {
    const items = [...allTools, ...allLinks];
    
    let filtered = items;
    
    // Filter by type (tools/links)
    if (currentFilter === 'tools') {
        filtered = allTools;
    } else if (currentFilter === 'links') {
        filtered = allLinks;
    }
    
    // Filter by category
    if (currentCategory) {
        filtered = filtered.filter(item => item.category === currentCategory);
    }
    
    // Search
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(item => {
            const nameMatch = item.name.toLowerCase().includes(query);
            const descMatch = (item.description || '').toLowerCase().includes(query);
            const tagMatch = (item.tags || []).some(tag => tag.toLowerCase().includes(query));
            const categoryMatch = (item.category || '').toLowerCase().includes(query);
            
            return nameMatch || descMatch || tagMatch || categoryMatch;
        });
    }
    
    return filtered;
}

// Render tools with lazy loading for external links
function renderTools(resetLazyLoad = true) {
    const toolsGrid = document.getElementById('toolsGrid');
    const linksGrid = document.getElementById('linksGrid');
    const toolsSection = document.getElementById('toolsSection');
    const linksSection = document.getElementById('linksSection');
    const emptyState = document.getElementById('emptyState');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const itemsCounter = document.getElementById('itemsCounter');

    // Re-fetch localized config to get updated translations
    const config = getLocalizedConfig();
    allTools = config.tools || [];
    allLinks = config.links || [];

    // Reset lazy loading count when filters change
    if (resetLazyLoad) {
        displayedLinksCount = INITIAL_LINKS_COUNT;
    }

    const filtered = filterItems();

    if (!toolsGrid || !linksGrid || !emptyState) return;

    // Separate tools and links from filtered items
    let filteredTools = filtered.filter(item => allTools.includes(item));
    let filteredLinks = filtered.filter(item => allLinks.includes(item));

    // Seřazení podle počtu prokliků (nejvíce první)
    const sortByViewCount = (a, b) => getViewCount(b.id) - getViewCount(a.id);
    filteredTools = filteredTools.sort(sortByViewCount);
    filteredLinks = filteredLinks.sort(sortByViewCount);

    // Určení top 3 položek (kombinovaně ze všech nástrojů a odkazů)
    const allItemsSorted = [...filteredTools, ...filteredLinks].sort(sortByViewCount);
    const top3Ids = allItemsSorted.slice(0, 3).map(item => item.id);

    // Check if both are empty
    if (filteredTools.length === 0 && filteredLinks.length === 0) {
        if (toolsSection) toolsSection.classList.add('hidden');
        if (linksSection) linksSection.classList.add('hidden');
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        if (itemsCounter) itemsCounter.textContent = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // Render tools section (always show all tools - they are local, only 17)
    if (filteredTools.length > 0) {
        if (toolsSection) toolsSection.classList.remove('hidden');
        toolsGrid.innerHTML = filteredTools.map(item => createToolCard(item, top3Ids)).join('');
    } else {
        if (toolsSection) toolsSection.classList.add('hidden');
        toolsGrid.innerHTML = '';
    }

    // Render links section with lazy loading
    if (filteredLinks.length > 0) {
        if (linksSection) linksSection.classList.remove('hidden');

        // Only render displayed links (lazy loading)
        const linksToShow = filteredLinks.slice(0, displayedLinksCount);
        const remainingLinks = filteredLinks.length - linksToShow.length;

        linksGrid.innerHTML = linksToShow.map(item => createLinkCard(item, top3Ids)).join('');

        // Update load more button
        if (loadMoreContainer) {
            if (remainingLinks > 0) {
                loadMoreContainer.style.display = 'flex';
                const remainingCount = document.getElementById('remainingCount');
                if (remainingCount) {
                    remainingCount.textContent = `(${remainingLinks})`;
                }
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }

        // Update items counter
        if (itemsCounter) {
            if (linksToShow.length < filteredLinks.length) {
                itemsCounter.textContent = t('showing_items', {
                    current: linksToShow.length,
                    total: filteredLinks.length
                });
            } else {
                itemsCounter.textContent = t('all_items_loaded');
            }
        }
    } else {
        if (linksSection) linksSection.classList.add('hidden');
        linksGrid.innerHTML = '';
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        if (itemsCounter) itemsCounter.textContent = '';
    }
}

// Load more links (lazy loading)
function loadMoreLinks() {
    if (isLoadingMore) return;

    isLoadingMore = true;
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const btnText = loadMoreBtn?.querySelector('.btn-text');

    if (btnText) {
        btnText.textContent = t('loading_more');
    }
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
    }

    // Small delay for smooth UX
    setTimeout(() => {
        displayedLinksCount += LOAD_MORE_COUNT;
        renderTools(false); // Don't reset lazy load count

        isLoadingMore = false;
        if (btnText) {
            btnText.textContent = t('load_more');
        }
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
        }
    }, 150);
}

// Create tool card
function createToolCard(tool, top3Ids = []) {
    const isLocalFile = tool.type === 'local' || !tool.url.startsWith('http');
    const isYouTubeDownloader = tool.id === 'youtube-downloader';
    const viewCount = getViewCount(tool.id);
    const isTop3 = top3Ids.includes(tool.id);
    const topRank = top3Ids.indexOf(tool.id) + 1; // 1, 2, nebo 3

    return `
        <div class="tool-card${isTop3 ? ' top-clicked' : ''}" data-id="${tool.id}" data-type="tool">
            <div class="tool-header">
                <div class="tool-title">
                    <span class="tool-icon">${tool.icon || '🔧'}</span>
                    <span class="tool-name">${escapeHtml(tool.name)}</span>
                </div>
                <div class="tool-badges">
                    ${isTop3 ? `<span class="tool-badge top-badge" title="${t('top_clicked_title')}">⭐ TOP ${topRank}</span>` : ''}
                    <span class="tool-badge view-count-badge" title="${viewCount} ${t('view_count_title')}">
                        👁️ <span data-view-count="${tool.id}">${formatViewCount(viewCount)}</span>
                    </span>
                    ${isLocalFile ? `<span class="tool-badge local-badge">${t('local_badge')}</span>` : ''}
                    ${isYouTubeDownloader ? `<span class="tool-badge extension-status" id="ext-status-${tool.id}">⏳ Kontroluji...</span>` : ''}
                </div>
            </div>
            <p class="tool-description">${escapeHtml(tool.description || t('no_description'))}</p>
            <div class="tool-meta">
                <span class="tool-category">${escapeHtml(tool.category || 'other')}</span>
                ${tool.tags && tool.tags.length > 0 ? `
                    <div class="tool-tags">
                        ${tool.tags.slice(0, 5).map(tag => `<span class="tool-tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="tool-actions">
                ${tool.url ? `
                    <button class="btn-open" onclick="openTool('${tool.url}', '${tool.id}')" title="${t('open')}">
                        ↗
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Create link card
function createLinkCard(link, top3Ids = []) {
    const url = link.type === 'local' ? link.url : link.url;
    const viewCount = getViewCount(link.id);
    const isTop3 = top3Ids.includes(link.id);
    const topRank = top3Ids.indexOf(link.id) + 1; // 1, 2, nebo 3

    return `
        <div class="tool-card link${isTop3 ? ' top-clicked' : ''}" data-id="${link.id}" data-type="link">
            <div class="tool-header">
                <div class="tool-title">
                    <span class="tool-icon">${link.icon || '🔗'}</span>
                    <span class="tool-name">${escapeHtml(link.name)}</span>
                </div>
                <div class="tool-badges">
                    ${isTop3 ? `<span class="tool-badge top-badge" title="${t('top_clicked_title')}">⭐ TOP ${topRank}</span>` : ''}
                    <span class="tool-badge view-count-badge" title="${viewCount} ${t('view_count_title')}">
                        👁️ <span data-view-count="${link.id}">${formatViewCount(viewCount)}</span>
                    </span>
                </div>
            </div>
            <p class="tool-description">${escapeHtml(link.description || t('no_description'))}</p>
            <div class="tool-meta">
                <span class="tool-category">${escapeHtml(link.category || 'other')}</span>
                ${link.tags && link.tags.length > 0 ? `
                    <div class="tool-tags">
                        ${link.tags.slice(0, 5).map(tag => `<span class="tool-tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="tool-actions">
                <button class="btn-open" onclick="openLink('${url}', '${link.id}')" title="${t('open')}">
                    ↗
                </button>
            </div>
        </div>
    `;
}

// Open tool (with view count tracking)
function openTool(url, toolId) {
    // Inkrementace počtu návštěv
    if (toolId) {
        incrementViewCount(toolId);
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
    } else {
        // Local file - open in current window or new tab
        window.location.href = url;
    }
}

// Open link (with view count tracking)
function openLink(url, linkId) {
    // Inkrementace počtu návštěv
    if (linkId) {
        incrementViewCount(linkId);
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
    } else {
        window.location.href = url;
    }
}

// Update category filters
function updateCategoryFilters() {
    const categories = new Set();
    
    [...allTools, ...allLinks].forEach(item => {
        if (item.category) {
            categories.add(item.category);
        }
    });
    
    const container = document.getElementById('categoryFilters');
    if (!container) return;
    
    container.innerHTML = Array.from(categories).sort().map(cat => `
        <button class="category-chip" data-category="${cat}">
            ${escapeHtml(cat)}
        </button>
    `).join('');
    
    // Event listeners for categories
    container.querySelectorAll('.category-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            
            // Toggle active category
            if (currentCategory === category) {
                currentCategory = null;
                btn.classList.remove('active');
            } else {
                currentCategory = category;
                container.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
            
            renderTools();
        });
    });
}

// Update version display
function updateVersionDisplay() {
    const versionBadge = document.getElementById('versionBadge');
    const footerVersion = document.getElementById('footerVersion');
    
    if (versionBadge) {
        versionBadge.textContent = `v${APP_VERSION}`;
    }
    if (footerVersion) {
        footerVersion.textContent = currentLanguage === 'cs' 
            ? `Verze ${APP_VERSION}` 
            : `Version ${APP_VERSION}`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize language from IP geolocation (if not already set by user)
    currentLanguage = await initializeLanguageFromGeo();

    // Inicializace počítadla návštěv (Firebase nebo localStorage fallback)
    await initFirebase();

    // Set initial language display
    const langInfo = getLanguageInfo(currentLanguage);
    updateCurrentLanguageDisplay(langInfo);

    document.documentElement.lang = currentLanguage;
    
    // Update version display
    updateVersionDisplay();
    
    // Initialize language dropdown
    const currentLangBtn = document.getElementById('currentLangBtn');
    if (currentLangBtn) {
        currentLangBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLanguageDropdown();
        });
    }
    
    // Language search
    const langSearchInput = document.getElementById('langSearchInput');
    if (langSearchInput) {
        langSearchInput.addEventListener('input', (e) => {
            updateLanguageList(e.target.value);
        });
        langSearchInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('.language-dropdown');
        if (dropdown && !dropdown.contains(e.target)) {
            closeLanguageDropdown();
        }
    });
    
    // Close dropdown on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLanguageDropdown();
        }
    });
    
    // Populate language list
    updateLanguageList();

    // Apply initial translations (must await for proper rendering)
    await setLanguage(currentLanguage);

    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderTools();
        });
    }
    
    // Type filters
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderTools();
        });
    });
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            useDefaultConfig();
        });
    }
    
    // Hide server buttons and warnings (legacy)
    const startServerBtn = document.getElementById('startServerBtn');
    const fileWarning = document.getElementById('fileProtocolWarning');
    if (startServerBtn) startServerBtn.style.display = 'none';
    if (fileWarning) fileWarning.style.display = 'none';

    // Load More button event listener (lazy loading)
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreLinks);
    }

    // Load data on startup
    useDefaultConfig();

    // Check YouTube extension status after render
    setTimeout(checkYouTubeExtensionStatus, 500);
    setTimeout(checkYouTubeExtensionStatus, 1500);

    // Listen for extension ready events
    window.addEventListener('adhub-extension-ready', () => {
        console.log('[AdHUB] Extension ready event received');
        checkYouTubeExtensionStatus();
    });

    // Load YouTube Downloader plugin version info
    loadYouTubePluginVersionInfo();
});

// Check YouTube Downloader extension status
function checkYouTubeExtensionStatus() {
    const statusBadge = document.getElementById('ext-status-youtube-downloader');
    if (!statusBadge) return;

    try {
        // Kontrola timestamp - plugin ho aktualizuje kazdych 30 sekund
        const timestamp = localStorage.getItem('adhub_extension_timestamp');
        const now = Date.now();
        const maxAge = 60 * 1000; // 60 sekund

        let hasExtension = false;
        let extensionVersion = null;

        // Pokud je timestamp aktualni, plugin je aktivni
        if (timestamp && (now - parseInt(timestamp, 10)) < maxAge) {
            hasExtension = localStorage.getItem('adhub_extension_active') === 'true';
            extensionVersion = localStorage.getItem('adhub_extension_version');
        }

        // Alternativni detekce pres data attribute nebo globalni promennou
        if (!hasExtension) {
            hasExtension = document.documentElement.getAttribute('data-adhub-extension') === 'true' ||
                           window.adhubExtensionAvailable === true;
            if (hasExtension) {
                extensionVersion = document.documentElement.getAttribute('data-adhub-extension-version') ||
                                   window.adhubExtensionVersion;
            }
        }

        if (hasExtension) {
            const versionText = extensionVersion ? ` v${extensionVersion}` : '';
            statusBadge.innerHTML = '✅ Aktivní' + versionText;
            statusBadge.classList.add('status-active');
            statusBadge.classList.remove('status-inactive', 'status-checking');
        } else {
            statusBadge.innerHTML = '❌ Neaktivní';
            statusBadge.classList.add('status-inactive');
            statusBadge.classList.remove('status-active', 'status-checking');
        }
    } catch (error) {
        console.error('[AdHUB] Error checking extension status:', error);
        statusBadge.innerHTML = '❓ Neznámý';
    }
}

// Discord Idea Modal functionality
// Discord server ID for the widget (set to null to disable widget)
const DISCORD_SERVER_ID = '1122162195813523487'; // AdHUB Discord server

let discordWidgetLoaded = false;

function loadDiscordWidget() {
    if (discordWidgetLoaded || !DISCORD_SERVER_ID) return;

    const container = document.getElementById('discordEmbedContainer');
    if (!container) return;

    // Create and insert Discord widget iframe
    const iframe = document.createElement('iframe');
    iframe.src = `https://discord.com/widget?id=${DISCORD_SERVER_ID}&theme=dark`;
    iframe.width = '100%';
    iframe.height = '400';
    iframe.frameBorder = '0';
    iframe.sandbox = 'allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts';
    iframe.loading = 'lazy';
    iframe.title = 'Discord Widget';

    // Clear placeholder and insert iframe
    container.innerHTML = '';
    container.appendChild(iframe);
    discordWidgetLoaded = true;
}

function initIdeaModal() {
    const ideaButton = document.getElementById('ideaButton');
    const discordModal = document.getElementById('discordModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    if (!ideaButton || !discordModal || !closeModalBtn) return;

    // Open modal
    ideaButton.addEventListener('click', () => {
        discordModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
        // Lazy load Discord widget on first open
        loadDiscordWidget();
    });

    // Close modal
    const closeModal = () => {
        discordModal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    };

    closeModalBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside
    discordModal.addEventListener('click', (e) => {
        if (e.target === discordModal) {
            closeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && discordModal.classList.contains('active')) {
            closeModal();
        }
    });
}

// Initialize idea modal when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIdeaModal);
} else {
    initIdeaModal();
}

// ============================================
// YOUTUBE DOWNLOADER PLUGIN VERSION CHECKING
// ============================================

// Load latest commit info for YouTube Downloader plugin
async function loadYouTubePluginVersionInfo() {
    console.log('[AdHUB] Loading YouTube Downloader plugin version info...');

    try {
        // Fetch commit info and manifest.json in parallel
        const [commitResponse, manifestResponse] = await Promise.all([
            fetch(`${GITHUB_API_BASE}/repos/${GITHUB_REPO}/commits?path=${PLUGIN_PATH}&per_page=1`),
            fetch(`${GITHUB_RAW_BASE}/${GITHUB_REPO}/${GITHUB_BRANCH}/${PLUGIN_PATH}/manifest.json`)
        ]);

        // Process commit info
        if (commitResponse.ok) {
            const commits = await commitResponse.json();
            if (commits.length > 0) {
                pluginLatestCommit = commits[0];
                console.log('[AdHUB] Latest plugin commit:', pluginLatestCommit.sha.substring(0, 7));
            }
        }

        // Process manifest.json for version
        if (manifestResponse.ok) {
            const manifest = await manifestResponse.json();
            if (manifest.version) {
                pluginLatestVersion = manifest.version;
                console.log('[AdHUB] Latest plugin version:', pluginLatestVersion);
            }
        }

        // Check if user has downloaded an older version
        checkDownloadedPluginVersion();

    } catch (error) {
        console.error('[AdHUB] Error loading plugin version info:', error);
    }
}

// Check if downloaded plugin version differs from latest
function checkDownloadedPluginVersion() {
    const downloadedCommit = localStorage.getItem('adhub_downloaded_commit');

    if (!downloadedCommit || !pluginLatestCommit) {
        return;
    }

    const latestShort = pluginLatestCommit.sha.substring(0, 7);
    const downloadedShort = downloadedCommit.substring(0, 7);

    console.log('[AdHUB] Comparing downloaded vs latest:', { downloaded: downloadedShort, latest: latestShort });

    if (downloadedShort !== latestShort) {
        console.log('[AdHUB] Downloaded plugin version is outdated');
        showPluginUpdateBanner(downloadedShort, latestShort);
    }
}

// Show update banner for plugin
function showPluginUpdateBanner(oldCommit, newCommit) {
    // Check if banner already exists
    let updateBanner = document.getElementById('pluginUpdateBanner');

    if (!updateBanner) {
        updateBanner = document.createElement('div');
        updateBanner.id = 'pluginUpdateBanner';
        updateBanner.className = 'plugin-update-banner';
    }

    const versionText = pluginLatestVersion ? `v${pluginLatestVersion}` : newCommit;

    updateBanner.innerHTML = `
        <div class="plugin-update-content">
            <span class="plugin-update-icon">🔄</span>
            <div class="plugin-update-text">
                <strong>YouTube Downloader: K dispozici nová verze!</strong>
                <span>Staženo: <code>${oldCommit}</code> → Aktuální: <code>${versionText}</code></span>
            </div>
            <a href="projects/youtube-downloader/index.html" class="btn btn-update-plugin">
                Aktualizovat
            </a>
            <button class="plugin-update-close" onclick="hidePluginUpdateBanner()" title="Zavřít">×</button>
        </div>
    `;

    // Insert banner after header
    const container = document.querySelector('.container');
    const header = document.querySelector('.header');
    if (container && header && !document.getElementById('pluginUpdateBanner')) {
        header.after(updateBanner);
    }

    updateBanner.style.display = 'block';
}

// Hide plugin update banner
function hidePluginUpdateBanner() {
    const updateBanner = document.getElementById('pluginUpdateBanner');
    if (updateBanner) {
        updateBanner.style.display = 'none';
    }
}

// Export functions for global use
window.openTool = openTool;
window.openLink = openLink;
window.setLanguage = setLanguage;
window.APP_VERSION = APP_VERSION;
window.incrementViewCount = incrementViewCount;
window.getViewCount = getViewCount;
window.hidePluginUpdateBanner = hidePluginUpdateBanner;
