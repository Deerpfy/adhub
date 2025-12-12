/**
 * BG Remover - Offline Background Removal Tool
 * 100% client-side processing using @imgly/background-removal
 *
 * Features:
 * - AI-powered background removal
 * - Magic Brush for manual refinement (erase/restore)
 * - Refine Edge tools (feather, contrast, shift edge, smooth)
 * - Custom backgrounds (color, gradient, image, blur)
 * - AI shadows
 * - Export to PNG/JPG/WebP
 */

// =============================================
// TRANSLATIONS
// =============================================
const translations = {
    cs: {
        offline: '100% Offline',
        upload_title: 'Nahrajte obrázek',
        upload_subtitle: 'Přetáhněte sem obrázek nebo klikněte pro výběr',
        supported_formats: 'Podporované formáty:',
        max_size: 'Max:',
        privacy_notice: 'Vaše obrázky zůstávají pouze ve vašem prohlížeči. Žádná data se neodesílají na server.',
        try_demo: 'Vyzkoušejte s ukázkovým obrázkem:',
        demo_person: 'Osoba',
        demo_product: 'Produkt',
        demo_animal: 'Zvíře',
        processing: 'Zpracovávám...',
        loading_model: 'Stahuji AI model (~40 MB)...',
        downloading_model: 'Stahování modelu',
        preparing: 'Připravuji zpracování...',
        removing_bg: 'Odstraňuji pozadí...',
        finalizing: 'Dokončuji...',
        new_image: 'Nový',
        tab_result: 'Výsledek',
        tab_compare: 'Porovnat',
        tab_brush: 'Magic Brush',
        tab_refine: 'Zjemnit hrany',
        tab_background: 'Pozadí',
        download: 'Stáhnout',
        original: 'Originál',
        result: 'Výsledek',
        erase: 'Smazat',
        restore: 'Obnovit',
        brush_size: 'Velikost:',
        brush_hardness: 'Tvrdost:',
        transparent: 'Průhledné',
        solid_color: 'Barva',
        image_bg: 'Obrázek',
        blur_bg: 'Rozmazat',
        custom_color: 'Vlastní barva',
        upload_bg: 'Nahrát vlastní pozadí',
        blur_amount: 'Míra rozmazání:',
        add_shadow: 'Přidat stín',
        shadow_opacity: 'Průhlednost:',
        shadow_blur: 'Rozmazání:',
        export_options: 'Možnosti exportu',
        png_desc: 'S průhledností',
        jpg_desc: 'Menší velikost',
        webp_desc: 'Moderní formát',
        quality: 'Kvalita:',
        cancel: 'Zrušit',
        error_file_type: 'Nepodporovaný formát souboru. Použijte JPG, PNG nebo WebP.',
        error_file_size: 'Soubor je příliš velký. Maximální velikost je 22 MB.',
        error_processing: 'Chyba při zpracování obrázku.',
        success_download: 'Obrázek byl stažen.',
        first_load_info: 'První zpracování stahuje AI model (~40 MB)',
        // Refine Edge translations
        feather: 'Prolnutí',
        contrast: 'Kontrast',
        shift_edge: 'Posun hrany',
        smooth: 'Vyhlazení',
        reset_refine: 'Resetovat',
        apply_refine: 'Použít',
        // Brush mouse controls
        brush_left_click: 'Levé',
        brush_right_click: 'Pravé'
    },
    en: {
        offline: '100% Offline',
        upload_title: 'Upload an image',
        upload_subtitle: 'Drag and drop an image here or click to select',
        supported_formats: 'Supported formats:',
        max_size: 'Max:',
        privacy_notice: 'Your images stay in your browser only. No data is sent to any server.',
        try_demo: 'Try with a demo image:',
        demo_person: 'Person',
        demo_product: 'Product',
        demo_animal: 'Animal',
        processing: 'Processing...',
        loading_model: 'Downloading AI model (~40 MB)...',
        downloading_model: 'Downloading model',
        preparing: 'Preparing...',
        removing_bg: 'Removing background...',
        finalizing: 'Finalizing...',
        new_image: 'New',
        tab_result: 'Result',
        tab_compare: 'Compare',
        tab_brush: 'Magic Brush',
        tab_refine: 'Refine Edge',
        tab_background: 'Background',
        download: 'Download',
        original: 'Original',
        result: 'Result',
        erase: 'Erase',
        restore: 'Restore',
        brush_size: 'Size:',
        brush_hardness: 'Hardness:',
        transparent: 'Transparent',
        solid_color: 'Color',
        image_bg: 'Image',
        blur_bg: 'Blur',
        custom_color: 'Custom color',
        upload_bg: 'Upload custom background',
        blur_amount: 'Blur amount:',
        add_shadow: 'Add shadow',
        shadow_opacity: 'Opacity:',
        shadow_blur: 'Blur:',
        export_options: 'Export options',
        png_desc: 'With transparency',
        jpg_desc: 'Smaller size',
        webp_desc: 'Modern format',
        quality: 'Quality:',
        cancel: 'Cancel',
        error_file_type: 'Unsupported file format. Use JPG, PNG or WebP.',
        error_file_size: 'File is too large. Maximum size is 22 MB.',
        error_processing: 'Error processing the image.',
        success_download: 'Image has been downloaded.',
        first_load_info: 'First processing downloads AI model (~40 MB)',
        // Refine Edge translations
        feather: 'Feather',
        contrast: 'Contrast',
        shift_edge: 'Shift Edge',
        smooth: 'Smooth',
        reset_refine: 'Reset',
        apply_refine: 'Apply',
        // Brush mouse controls
        brush_left_click: 'Left',
        brush_right_click: 'Right'
    }
};

// =============================================
// APP STATE
// =============================================
const state = {
    lang: 'cs',
    originalImage: null,
    originalImageData: null,
    resultBlob: null,
    resultImageData: null,
    maskCanvas: null,
    originalMaskData: null, // Store original mask for refine edge reset
    currentTab: 'result',
    brushMode: 'erase',
    brushSize: 30,
    brushHardness: 80,
    bgType: 'transparent',
    bgColor: '#ffffff',
    bgGradient: null,
    bgImage: null,
    blurAmount: 20,
    shadowEnabled: false,
    shadowOpacity: 40,
    shadowBlur: 20,
    isProcessing: false,
    removeBackground: null,
    // Refine Edge settings
    refineFeather: 0,
    refineContrast: 0,
    refineShiftEdge: 0,
    refineSmooth: 0
};

// =============================================
// DOM ELEMENTS
// =============================================
const elements = {};

function initElements() {
    elements.uploadSection = document.getElementById('uploadSection');
    elements.processingSection = document.getElementById('processingSection');
    elements.editorSection = document.getElementById('editorSection');
    elements.uploadZone = document.getElementById('uploadZone');
    elements.fileInput = document.getElementById('fileInput');
    elements.processingStatus = document.getElementById('processingStatus');
    elements.progressFill = document.getElementById('progressFill');
    elements.progressText = document.getElementById('progressText');
    elements.resultCanvas = document.getElementById('resultCanvas');
    elements.compareOriginalImg = document.getElementById('compareOriginalImg');
    elements.compareResultCanvas = document.getElementById('compareResultCanvas');
    elements.compareHandle = document.getElementById('compareHandle');
    elements.compareResult = document.getElementById('compareResult');
    elements.brushCanvas = document.getElementById('brushCanvas');
    elements.brushPreviewCanvas = document.getElementById('brushPreviewCanvas');
    elements.backgroundCanvas = document.getElementById('backgroundCanvas');
    elements.brushSize = document.getElementById('brushSize');
    elements.brushSizeValue = document.getElementById('brushSizeValue');
    elements.bgColorPicker = document.getElementById('bgColorPicker');
    elements.blurAmount = document.getElementById('blurAmount');
    elements.blurValue = document.getElementById('blurValue');
    elements.shadowToggle = document.getElementById('shadowToggle');
    elements.shadowOptions = document.getElementById('shadowOptions');
    elements.shadowOpacity = document.getElementById('shadowOpacity');
    elements.shadowOpacityValue = document.getElementById('shadowOpacityValue');
    elements.shadowBlur = document.getElementById('shadowBlur');
    elements.shadowBlurValue = document.getElementById('shadowBlurValue');
    elements.exportPanel = document.getElementById('exportPanel');
    elements.exportQuality = document.getElementById('exportQuality');
    elements.qualityValue = document.getElementById('qualityValue');
    elements.qualityControl = document.getElementById('qualityControl');
    elements.toastContainer = document.getElementById('toastContainer');
    elements.colorPanel = document.getElementById('colorPanel');
    elements.imagePanel = document.getElementById('imagePanel');
    elements.blurPanel = document.getElementById('blurPanel');
    elements.bgFileInput = document.getElementById('bgFileInput');
    // Refine edge elements
    elements.refineCanvas = document.getElementById('refineCanvas');
    elements.refineFeather = document.getElementById('refineFeather');
    elements.refineContrast = document.getElementById('refineContrast');
    elements.refineShiftEdge = document.getElementById('refineShiftEdge');
    elements.refineSmooth = document.getElementById('refineSmooth');
}

// =============================================
// INITIALIZATION
// =============================================
async function init() {
    initElements();
    initLanguage();
    initEventListeners();
    await loadBackgroundRemovalLibrary();
}

async function loadBackgroundRemovalLibrary() {
    try {
        // Use locally bundled library for 100% offline operation
        const module = await import('./vendor/background-removal.js');
        state.removeBackground = module.removeBackground;
        console.log('Background removal library loaded successfully (local bundle)');
    } catch (error) {
        console.error('Failed to load background removal library:', error);
        showToast(translations[state.lang].first_load_info, 'warning');
    }
}

function initLanguage() {
    const savedLang = localStorage.getItem('bgremover-lang') || 'cs';
    setLanguage(savedLang);
}

function setLanguage(lang) {
    state.lang = lang;
    localStorage.setItem('bgremover-lang', lang);

    // Update active button
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Update all translatable elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
}

// =============================================
// EVENT LISTENERS
// =============================================
function initEventListeners() {
    // Language selector
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });

    // Upload zone
    elements.uploadZone.addEventListener('click', () => elements.fileInput.click());
    elements.uploadZone.addEventListener('dragover', handleDragOver);
    elements.uploadZone.addEventListener('dragleave', handleDragLeave);
    elements.uploadZone.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);

    // Demo buttons
    document.querySelectorAll('.demo-btn').forEach(btn => {
        btn.addEventListener('click', () => loadDemoImage(btn.dataset.demo));
    });

    // New image button
    document.getElementById('newImageBtn').addEventListener('click', resetToUpload);

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', showExportPanel);

    // Compare slider
    initCompareSlider();

    // Brush controls
    initBrushControls();

    // Refine Edge controls
    initRefineEdgeControls();

    // Background controls
    initBackgroundControls();

    // Export panel
    initExportPanel();
}

// =============================================
// FILE HANDLING
// =============================================
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadZone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

async function processFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showToast(translations[state.lang].error_file_type, 'error');
        return;
    }

    // Validate file size (22 MB max)
    const maxSize = 22 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast(translations[state.lang].error_file_size, 'error');
        return;
    }

    // Show processing section
    showSection('processing');
    updateProgress(5, translations[state.lang].preparing);

    // Load image
    const img = new Image();
    img.onload = async () => {
        state.originalImage = img;
        state.originalImageData = await createImageData(img);
        await removeBackgroundFromImage(img);
    };
    img.onerror = () => {
        showToast(translations[state.lang].error_processing, 'error');
        showSection('upload');
    };
    img.src = URL.createObjectURL(file);
}

async function createImageData(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function loadDemoImage(type) {
    showSection('processing');
    updateProgress(5, translations[state.lang].preparing);

    // Create demo images using canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Create a simple demo image
    if (type === 'person') {
        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 800, 600);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 600);

        // Simple person silhouette
        ctx.fillStyle = '#ffd5b4';
        ctx.beginPath();
        ctx.arc(400, 200, 80, 0, Math.PI * 2); // Head
        ctx.fill();

        ctx.fillStyle = '#4a90d9';
        ctx.fillRect(320, 280, 160, 250); // Body

    } else if (type === 'product') {
        // Light background
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 800, 600);

        // Simple box
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(250, 150, 300, 300);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(250, 150, 300, 30);

    } else if (type === 'animal') {
        // Nature background
        const gradient = ctx.createLinearGradient(0, 0, 0, 600);
        gradient.addColorStop(0, '#87ceeb');
        gradient.addColorStop(1, '#228b22');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 600);

        // Simple dog shape
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.ellipse(400, 350, 120, 80, 0, 0, Math.PI * 2); // Body
        ctx.fill();
        ctx.beginPath();
        ctx.arc(500, 300, 50, 0, Math.PI * 2); // Head
        ctx.fill();
    }

    canvas.toBlob(async (blob) => {
        const img = new Image();
        img.onload = async () => {
            state.originalImage = img;
            state.originalImageData = await createImageData(img);
            await removeBackgroundFromImage(img);
        };
        img.src = URL.createObjectURL(blob);
    }, 'image/png');
}

// =============================================
// BACKGROUND REMOVAL
// =============================================
async function removeBackgroundFromImage(img) {
    if (!state.removeBackground) {
        showToast(translations[state.lang].error_processing, 'error');
        showSection('upload');
        return;
    }

    try {
        let modelDownloaded = false;
        let lastProgressUpdate = 0;

        updateProgress(10, translations[state.lang].loading_model);

        // Create blob from image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        // Process with background removal - using local model files
        // Must use absolute URL for publicPath (relative paths fail in URL constructor)
        const baseUrl = new URL('./models/', window.location.href).href;
        const resultBlob = await state.removeBackground(blob, {
            publicPath: baseUrl, // Absolute URL to locally hosted model files
            progress: (key, current, total) => {
                // Better progress reporting
                const now = Date.now();
                if (now - lastProgressUpdate < 100) return; // Throttle updates
                lastProgressUpdate = now;

                let percent, status;

                if (key.includes('model') || key.includes('fetch') || key.includes('download')) {
                    // Model downloading phase (10-50%)
                    percent = 10 + Math.round((current / total) * 40);
                    status = `${translations[state.lang].downloading_model} ${Math.round((current / total) * 100)}%`;
                    modelDownloaded = false;
                } else if (key.includes('compute') || key.includes('inference') || key.includes('process')) {
                    // Processing phase (50-90%)
                    if (!modelDownloaded) {
                        modelDownloaded = true;
                    }
                    percent = 50 + Math.round((current / total) * 40);
                    status = translations[state.lang].removing_bg;
                } else {
                    // Other phases
                    percent = Math.min(90, 20 + Math.round((current / total) * 60));
                    status = translations[state.lang].removing_bg;
                }

                updateProgress(Math.min(percent, 95), status);
            },
            output: {
                format: 'image/png',
                quality: 1
            }
        });

        updateProgress(95, translations[state.lang].finalizing);

        state.resultBlob = resultBlob;

        // Load result as image
        const resultImg = new Image();
        resultImg.onload = async () => {
            state.resultImageData = await createImageData(resultImg);
            initializeMask();
            updateProgress(100, '');
            setTimeout(() => {
                showSection('editor');
                renderResult();
                renderCompare();
                renderBrush();
                renderRefineEdge();
                renderBackground();
            }, 200);
        };
        resultImg.src = URL.createObjectURL(resultBlob);

    } catch (error) {
        console.error('Background removal error:', error);
        showToast(translations[state.lang].error_processing, 'error');
        showSection('upload');
    }
}

function updateProgress(percent, status) {
    elements.progressFill.style.width = `${percent}%`;
    elements.progressText.textContent = `${percent}%`;
    if (status) {
        elements.processingStatus.textContent = status;
    }
}

// =============================================
// MASK HANDLING (for Magic Brush & Refine Edge)
// =============================================
function initializeMask() {
    // Create mask canvas to track manual edits
    state.maskCanvas = document.createElement('canvas');
    state.maskCanvas.width = state.originalImage.width;
    state.maskCanvas.height = state.originalImage.height;
    const ctx = state.maskCanvas.getContext('2d', { willReadFrequently: true });

    // Initialize with the result alpha channel
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = state.resultImageData.width;
    resultCanvas.height = state.resultImageData.height;
    const resultCtx = resultCanvas.getContext('2d', { willReadFrequently: true });
    resultCtx.putImageData(state.resultImageData, 0, 0);

    // Copy alpha to mask (white = visible, black = hidden)
    const imageData = resultCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
    const maskData = ctx.createImageData(state.maskCanvas.width, state.maskCanvas.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
        const alpha = imageData.data[i + 3];
        maskData.data[i] = alpha;
        maskData.data[i + 1] = alpha;
        maskData.data[i + 2] = alpha;
        maskData.data[i + 3] = 255;
    }

    ctx.putImageData(maskData, 0, 0);

    // Store original mask for reset
    state.originalMaskData = ctx.getImageData(0, 0, state.maskCanvas.width, state.maskCanvas.height);
}

// =============================================
// RENDERING
// =============================================
function renderResult() {
    const canvas = elements.resultCanvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    canvas.width = state.resultImageData.width;
    canvas.height = state.resultImageData.height;

    // Apply mask to result
    const result = applyMaskToImage(state.originalImageData, state.maskCanvas);
    ctx.putImageData(result, 0, 0);
}

function renderCompare() {
    // Original image
    const img = elements.compareOriginalImg;
    img.src = state.originalImage.src;

    // Result canvas - must match image size exactly
    const canvas = elements.compareResultCanvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    canvas.width = state.resultImageData.width;
    canvas.height = state.resultImageData.height;

    // Set canvas CSS to match image aspect ratio
    const aspectRatio = state.resultImageData.height / state.resultImageData.width;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.aspectRatio = `${state.resultImageData.width} / ${state.resultImageData.height}`;

    const result = applyMaskToImage(state.originalImageData, state.maskCanvas);
    ctx.putImageData(result, 0, 0);
}

function renderBrush() {
    const canvas = elements.brushCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    canvas.width = state.resultImageData.width;
    canvas.height = state.resultImageData.height;

    const result = applyMaskToImage(state.originalImageData, state.maskCanvas);
    ctx.putImageData(result, 0, 0);
}

function renderRefineEdge() {
    const canvas = elements.refineCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    canvas.width = state.resultImageData.width;
    canvas.height = state.resultImageData.height;

    const result = applyMaskToImage(state.originalImageData, state.maskCanvas);
    ctx.putImageData(result, 0, 0);
}

function renderBackground() {
    const canvas = elements.backgroundCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    canvas.width = state.originalImage.width;
    canvas.height = state.originalImage.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background based on type
    if (state.bgType === 'color') {
        ctx.fillStyle = state.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (state.bgType === 'image' && state.bgImage) {
        ctx.drawImage(state.bgImage, 0, 0, canvas.width, canvas.height);
    } else if (state.bgType === 'blur') {
        ctx.filter = `blur(${state.blurAmount}px)`;
        ctx.drawImage(state.originalImage, 0, 0);
        ctx.filter = 'none';
    }
    // For 'transparent', leave it empty

    // Apply shadow if enabled
    if (state.shadowEnabled && state.bgType !== 'transparent') {
        drawShadow(ctx);
    }

    // Draw the result on top
    const result = applyMaskToImage(state.originalImageData, state.maskCanvas);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = result.width;
    tempCanvas.height = result.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.putImageData(result, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0);
}

function drawShadow(ctx) {
    // Create shadow from the mask
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = state.maskCanvas.width;
    shadowCanvas.height = state.maskCanvas.height;
    const shadowCtx = shadowCanvas.getContext('2d', { willReadFrequently: true });

    // Draw mask as shadow
    shadowCtx.filter = `blur(${state.shadowBlur}px)`;
    shadowCtx.globalAlpha = state.shadowOpacity / 100;
    shadowCtx.drawImage(state.maskCanvas, 5, 10); // Offset for shadow
    shadowCtx.filter = 'none';

    // Apply shadow color
    shadowCtx.globalCompositeOperation = 'source-in';
    shadowCtx.fillStyle = 'rgba(0, 0, 0, 1)';
    shadowCtx.fillRect(0, 0, shadowCanvas.width, shadowCanvas.height);

    ctx.drawImage(shadowCanvas, 0, 0);
}

function applyMaskToImage(imageData, maskCanvas) {
    const result = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
    );

    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    for (let i = 0; i < result.data.length; i += 4) {
        // Use mask red channel as alpha
        result.data[i + 3] = maskData.data[i];
    }

    return result;
}

// =============================================
// SECTION MANAGEMENT
// =============================================
function showSection(section) {
    elements.uploadSection.classList.toggle('hidden', section !== 'upload');
    elements.processingSection.classList.toggle('hidden', section !== 'processing');
    elements.editorSection.classList.toggle('hidden', section !== 'editor');
}

function resetToUpload() {
    state.originalImage = null;
    state.originalImageData = null;
    state.resultBlob = null;
    state.resultImageData = null;
    state.maskCanvas = null;
    state.originalMaskData = null;
    state.bgType = 'transparent';
    state.bgImage = null;
    state.shadowEnabled = false;
    state.refineFeather = 0;
    state.refineContrast = 0;
    state.refineShiftEdge = 0;
    state.refineSmooth = 0;

    elements.fileInput.value = '';
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = '0%';

    showSection('upload');
}

// =============================================
// TAB SWITCHING
// =============================================
function switchTab(tab) {
    state.currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tab}`);
    });

    // Render appropriate content
    if (tab === 'result') {
        renderResult();
    } else if (tab === 'compare') {
        renderCompare();
    } else if (tab === 'brush') {
        renderBrush();
    } else if (tab === 'refine') {
        renderRefineEdge();
    } else if (tab === 'background') {
        renderBackground();
    }
}

// =============================================
// COMPARE SLIDER
// =============================================
function initCompareSlider() {
    const handle = elements.compareHandle;
    if (!handle) return;
    const result = elements.compareResult;
    let isDragging = false;

    function updateSlider(x) {
        const rect = handle.parentElement.getBoundingClientRect();
        let percent = ((x - rect.left) / rect.width) * 100;
        percent = Math.max(0, Math.min(100, percent));

        handle.style.left = `${percent}%`;
        result.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
    }

    handle.addEventListener('mousedown', () => isDragging = true);
    handle.addEventListener('touchstart', () => isDragging = true);

    document.addEventListener('mousemove', (e) => {
        if (isDragging) updateSlider(e.clientX);
    });

    document.addEventListener('touchmove', (e) => {
        if (isDragging) updateSlider(e.touches[0].clientX);
    });

    document.addEventListener('mouseup', () => isDragging = false);
    document.addEventListener('touchend', () => isDragging = false);
}

// =============================================
// BRUSH CONTROLS
// =============================================
function initBrushControls() {
    // Brush size slider
    if (elements.brushSize) {
        elements.brushSize.addEventListener('input', (e) => {
            state.brushSize = parseInt(e.target.value);
            elements.brushSizeValue.textContent = `${state.brushSize}px`;
            updateBrushCursor();
        });
    }

    // Brush canvas drawing
    const canvas = elements.brushCanvas;
    const brushCursor = document.getElementById('brushCursor');
    const brushContainer = document.getElementById('brushCanvasContainer');
    if (!canvas) return;

    // Create overlay canvas for stroke preview (optimized drawing)
    let strokeCanvas = null;
    let strokeCtx = null;

    let isDrawing = false;
    let currentMode = 'erase'; // 'erase' or 'restore'
    let lastX = 0;
    let lastY = 0;

    function initStrokeCanvas() {
        if (!state.maskCanvas) return;
        strokeCanvas = document.createElement('canvas');
        strokeCanvas.width = state.maskCanvas.width;
        strokeCanvas.height = state.maskCanvas.height;
        strokeCtx = strokeCanvas.getContext('2d', { willReadFrequently: true });
    }

    function clearStrokeCanvas() {
        if (strokeCtx && strokeCanvas) {
            strokeCtx.clearRect(0, 0, strokeCanvas.width, strokeCanvas.height);
        }
    }

    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function updateBrushCursor(e) {
        if (!brushCursor) return;

        // Calculate display size based on canvas scale
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / canvas.width;
        const displaySize = state.brushSize * scaleX;

        brushCursor.style.width = `${displaySize}px`;
        brushCursor.style.height = `${displaySize}px`;

        if (e) {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            brushCursor.style.left = `${clientX}px`;
            brushCursor.style.top = `${clientY}px`;
        }
    }

    function isInsideCanvas(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return clientX >= rect.left && clientX <= rect.right &&
               clientY >= rect.top && clientY <= rect.bottom;
    }

    // Draw stroke on preview canvas (fast)
    function drawStroke(e) {
        if (!isDrawing || !strokeCtx) return;

        const coords = getCanvasCoords(e);

        strokeCtx.beginPath();
        strokeCtx.moveTo(lastX, lastY);
        strokeCtx.lineTo(coords.x, coords.y);
        strokeCtx.strokeStyle = currentMode === 'restore' ? 'white' : 'black';
        strokeCtx.lineWidth = state.brushSize;
        strokeCtx.lineCap = 'round';
        strokeCtx.stroke();

        lastX = coords.x;
        lastY = coords.y;

        // Fast preview render - just composite stroke on current view
        renderBrushPreview();
    }

    // Fast preview - composites stroke canvas over base
    function renderBrushPreview() {
        if (!canvas || !state.resultImageData) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Draw current result
        ctx.putImageData(state.lastBrushRender || state.resultImageData, 0, 0);

        // Overlay stroke preview with appropriate blend mode
        if (strokeCanvas) {
            ctx.save();
            ctx.globalCompositeOperation = currentMode === 'restore' ? 'destination-over' : 'destination-out';
            ctx.drawImage(strokeCanvas, 0, 0);
            ctx.restore();

            // For restore mode, also draw original image through stroke
            if (currentMode === 'restore') {
                ctx.save();
                ctx.globalCompositeOperation = 'destination-over';
                // Create temp canvas with original masked by stroke
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.putImageData(state.originalImageData, 0, 0);
                tempCtx.globalCompositeOperation = 'destination-in';
                tempCtx.drawImage(strokeCanvas, 0, 0);
                ctx.drawImage(tempCanvas, 0, 0);
                ctx.restore();
            }
        }
    }

    // Apply stroke to mask and render final result (called on mouse up)
    function applyStrokeToMask() {
        if (!strokeCanvas || !state.maskCanvas) return;

        const maskCtx = state.maskCanvas.getContext('2d', { willReadFrequently: true });
        maskCtx.drawImage(strokeCanvas, 0, 0);
        clearStrokeCanvas();

        // Full render
        renderBrush();
        renderResult();
        renderCompare();
        renderBackground();

        // Cache current render for next preview
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        state.lastBrushRender = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    // Prevent context menu on right-click in brush area
    if (brushContainer) {
        brushContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Show/hide cursor based on container (not just canvas)
        brushContainer.addEventListener('mouseenter', () => {
            if (brushCursor) {
                brushCursor.classList.add('active');
                updateBrushCursor();
            }
        });

        brushContainer.addEventListener('mouseleave', () => {
            if (brushCursor) {
                brushCursor.classList.remove('active');
            }
            // Don't stop drawing - user might come back
        });

        brushContainer.addEventListener('mousemove', (e) => {
            updateBrushCursor(e);

            // Show custom cursor only over the actual canvas
            if (brushCursor) {
                if (isInsideCanvas(e)) {
                    brushCursor.classList.add('active');
                    brushContainer.style.cursor = 'none';
                } else {
                    brushCursor.classList.remove('active');
                    brushContainer.style.cursor = 'default';
                }
            }
        });
    }

    // Mouse events on canvas
    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();

        // Initialize stroke canvas on first draw
        if (!strokeCanvas) initStrokeCanvas();
        clearStrokeCanvas();

        // Cache current brush render for fast preview
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        state.lastBrushRender = ctx.getImageData(0, 0, canvas.width, canvas.height);

        isDrawing = true;
        // Left button = erase (0), Right button = restore (2)
        currentMode = e.button === 2 ? 'restore' : 'erase';

        // Update cursor color
        if (brushCursor) {
            brushCursor.classList.remove('erase', 'restore');
            brushCursor.classList.add(currentMode);
        }

        const coords = getCanvasCoords(e);
        lastX = coords.x;
        lastY = coords.y;

        // Draw a dot at the start position on stroke canvas
        if (strokeCtx) {
            strokeCtx.beginPath();
            strokeCtx.arc(coords.x, coords.y, state.brushSize / 2, 0, Math.PI * 2);
            strokeCtx.fillStyle = currentMode === 'restore' ? 'white' : 'black';
            strokeCtx.fill();
            renderBrushPreview();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing) {
            drawStroke(e);
        }
    });

    // Global mouseup to catch release outside canvas
    document.addEventListener('mouseup', () => {
        if (isDrawing) {
            isDrawing = false;
            applyStrokeToMask();
        }
    });

    // Touch events (use single touch as erase)
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();

        if (!strokeCanvas) initStrokeCanvas();
        clearStrokeCanvas();

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        state.lastBrushRender = ctx.getImageData(0, 0, canvas.width, canvas.height);

        isDrawing = true;
        currentMode = 'erase';
        const coords = getCanvasCoords(e);
        lastX = coords.x;
        lastY = coords.y;

        if (strokeCtx) {
            strokeCtx.beginPath();
            strokeCtx.arc(coords.x, coords.y, state.brushSize / 2, 0, Math.PI * 2);
            strokeCtx.fillStyle = 'black';
            strokeCtx.fill();
            renderBrushPreview();
        }
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isDrawing) {
            drawStroke(e);
        }
    });

    canvas.addEventListener('touchend', () => {
        if (isDrawing) {
            isDrawing = false;
            applyStrokeToMask();
        }
    });
}

// =============================================
// REFINE EDGE CONTROLS
// =============================================
function initRefineEdgeControls() {
    // Feather slider
    if (elements.refineFeather) {
        elements.refineFeather.addEventListener('input', (e) => {
            state.refineFeather = parseInt(e.target.value);
            document.getElementById('refineFeatherValue').textContent = `${state.refineFeather}px`;
            applyRefineEdge();
        });
    }

    // Contrast slider
    if (elements.refineContrast) {
        elements.refineContrast.addEventListener('input', (e) => {
            state.refineContrast = parseInt(e.target.value);
            document.getElementById('refineContrastValue').textContent = `${state.refineContrast}%`;
            applyRefineEdge();
        });
    }

    // Shift Edge slider
    if (elements.refineShiftEdge) {
        elements.refineShiftEdge.addEventListener('input', (e) => {
            state.refineShiftEdge = parseInt(e.target.value);
            document.getElementById('refineShiftEdgeValue').textContent = `${state.refineShiftEdge}px`;
            applyRefineEdge();
        });
    }

    // Smooth slider
    if (elements.refineSmooth) {
        elements.refineSmooth.addEventListener('input', (e) => {
            state.refineSmooth = parseInt(e.target.value);
            document.getElementById('refineSmoothValue').textContent = `${state.refineSmooth}px`;
            applyRefineEdge();
        });
    }

    // Reset button
    const resetBtn = document.getElementById('resetRefineBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetRefineEdge);
    }
}

function applyRefineEdge() {
    if (!state.maskCanvas || !state.originalMaskData) return;

    // Start from original mask
    const ctx = state.maskCanvas.getContext('2d', { willReadFrequently: true });
    ctx.putImageData(state.originalMaskData, 0, 0);

    // Apply Smooth (blur)
    if (state.refineSmooth > 0) {
        ctx.filter = `blur(${state.refineSmooth}px)`;
        ctx.drawImage(state.maskCanvas, 0, 0);
        ctx.filter = 'none';
    }

    // Apply Feather (edge blur)
    if (state.refineFeather > 0) {
        // Create edge-only blur effect
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = state.maskCanvas.width;
        tempCanvas.height = state.maskCanvas.height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.filter = `blur(${state.refineFeather}px)`;
        tempCtx.drawImage(state.maskCanvas, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);
    }

    // Apply Contrast
    if (state.refineContrast !== 0) {
        const imageData = ctx.getImageData(0, 0, state.maskCanvas.width, state.maskCanvas.height);
        const factor = (259 * (state.refineContrast + 255)) / (255 * (259 - state.refineContrast));

        for (let i = 0; i < imageData.data.length; i += 4) {
            let val = imageData.data[i];
            val = factor * (val - 128) + 128;
            val = Math.max(0, Math.min(255, val));
            imageData.data[i] = val;
            imageData.data[i + 1] = val;
            imageData.data[i + 2] = val;
        }
        ctx.putImageData(imageData, 0, 0);
    }

    // Apply Shift Edge (erode/dilate)
    if (state.refineShiftEdge !== 0) {
        const imageData = ctx.getImageData(0, 0, state.maskCanvas.width, state.maskCanvas.height);
        const result = new Uint8ClampedArray(imageData.data);
        const width = state.maskCanvas.width;
        const height = state.maskCanvas.height;
        const radius = Math.abs(state.refineShiftEdge);
        const isExpand = state.refineShiftEdge > 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                let extremeVal = isExpand ? 0 : 255;

                // Check neighborhood
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nIdx = (ny * width + nx) * 4;
                            const val = imageData.data[nIdx];
                            if (isExpand) {
                                extremeVal = Math.max(extremeVal, val);
                            } else {
                                extremeVal = Math.min(extremeVal, val);
                            }
                        }
                    }
                }

                result[idx] = extremeVal;
                result[idx + 1] = extremeVal;
                result[idx + 2] = extremeVal;
            }
        }

        const newImageData = new ImageData(result, width, height);
        ctx.putImageData(newImageData, 0, 0);
    }

    renderRefineEdge();
    renderResult();
    renderCompare();
    renderBackground();
}

function resetRefineEdge() {
    state.refineFeather = 0;
    state.refineContrast = 0;
    state.refineShiftEdge = 0;
    state.refineSmooth = 0;

    if (elements.refineFeather) elements.refineFeather.value = 0;
    if (elements.refineContrast) elements.refineContrast.value = 0;
    if (elements.refineShiftEdge) elements.refineShiftEdge.value = 0;
    if (elements.refineSmooth) elements.refineSmooth.value = 0;

    document.getElementById('refineFeatherValue').textContent = '0px';
    document.getElementById('refineContrastValue').textContent = '0%';
    document.getElementById('refineShiftEdgeValue').textContent = '0px';
    document.getElementById('refineSmoothValue').textContent = '0px';

    // Restore original mask
    if (state.maskCanvas && state.originalMaskData) {
        const ctx = state.maskCanvas.getContext('2d', { willReadFrequently: true });
        ctx.putImageData(state.originalMaskData, 0, 0);
    }

    renderRefineEdge();
    renderResult();
    renderCompare();
    renderBackground();
}

// =============================================
// BACKGROUND CONTROLS
// =============================================
function initBackgroundControls() {
    // Background type buttons
    document.querySelectorAll('.bg-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.bgType = btn.dataset.type;

            document.querySelectorAll('.bg-type-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.type === state.bgType);
            });

            // Show/hide appropriate panel
            if (elements.colorPanel) elements.colorPanel.style.display = state.bgType === 'color' ? 'flex' : 'none';
            if (elements.imagePanel) elements.imagePanel.style.display = state.bgType === 'image' ? 'flex' : 'none';
            if (elements.blurPanel) elements.blurPanel.style.display = state.bgType === 'blur' ? 'flex' : 'none';

            renderBackground();
        });
    });

    // Color presets
    document.querySelectorAll('.color-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            state.bgColor = btn.dataset.color;
            if (elements.bgColorPicker) elements.bgColorPicker.value = state.bgColor;

            document.querySelectorAll('.color-preset').forEach(b => {
                b.classList.toggle('active', b.dataset.color === state.bgColor);
            });

            renderBackground();
        });
    });

    // Custom color picker
    if (elements.bgColorPicker) {
        elements.bgColorPicker.addEventListener('input', (e) => {
            state.bgColor = e.target.value;
            document.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
            renderBackground();
        });
    }

    // Gradient presets
    const gradients = {
        gradient1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        gradient2: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        gradient3: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        gradient4: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        gradient5: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        gradient6: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    };

    document.querySelectorAll('.bg-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const gradientKey = btn.dataset.bg;
            state.bgGradient = gradientKey;

            // Create gradient image
            createGradientImage(gradients[gradientKey]);

            document.querySelectorAll('.bg-preset').forEach(b => {
                b.classList.toggle('active', b.dataset.bg === gradientKey);
            });
        });
    });

    // Upload background image
    const uploadBgBtn = document.getElementById('uploadBgBtn');
    if (uploadBgBtn) {
        uploadBgBtn.addEventListener('click', () => {
            elements.bgFileInput.click();
        });
    }

    if (elements.bgFileInput) {
        elements.bgFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const img = new Image();
                img.onload = () => {
                    state.bgImage = img;
                    renderBackground();
                };
                img.src = URL.createObjectURL(file);
            }
        });
    }

    // Blur amount
    if (elements.blurAmount) {
        elements.blurAmount.addEventListener('input', (e) => {
            state.blurAmount = parseInt(e.target.value);
            elements.blurValue.textContent = `${state.blurAmount}px`;
            renderBackground();
        });
    }

    // Shadow toggle
    if (elements.shadowToggle) {
        elements.shadowToggle.addEventListener('change', (e) => {
            state.shadowEnabled = e.target.checked;
            if (elements.shadowOptions) {
                elements.shadowOptions.style.display = state.shadowEnabled ? 'flex' : 'none';
            }
            renderBackground();
        });
    }

    // Shadow opacity
    if (elements.shadowOpacity) {
        elements.shadowOpacity.addEventListener('input', (e) => {
            state.shadowOpacity = parseInt(e.target.value);
            elements.shadowOpacityValue.textContent = `${state.shadowOpacity}%`;
            renderBackground();
        });
    }

    // Shadow blur
    if (elements.shadowBlur) {
        elements.shadowBlur.addEventListener('input', (e) => {
            state.shadowBlur = parseInt(e.target.value);
            elements.shadowBlurValue.textContent = `${state.shadowBlur}px`;
            renderBackground();
        });
    }
}

function createGradientImage(gradient) {
    if (!state.originalImage) return;

    const canvas = document.createElement('canvas');
    canvas.width = state.originalImage.width;
    canvas.height = state.originalImage.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Parse gradient and create canvas gradient
    const colors = gradient.match(/#[a-fA-F0-9]{6}/g);
    if (colors && colors.length >= 2) {
        const canvasGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        canvasGradient.addColorStop(0, colors[0]);
        canvasGradient.addColorStop(1, colors[1]);
        ctx.fillStyle = canvasGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const img = new Image();
    img.onload = () => {
        state.bgImage = img;
        renderBackground();
    };
    img.src = canvas.toDataURL();
}

// =============================================
// EXPORT
// =============================================
function initExportPanel() {
    // Format selection
    document.querySelectorAll('input[name="format"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const format = e.target.value;
            if (elements.qualityControl) {
                elements.qualityControl.style.display = format === 'png' ? 'none' : 'block';
            }
        });
    });

    // Quality slider
    if (elements.exportQuality) {
        elements.exportQuality.addEventListener('input', (e) => {
            elements.qualityValue.textContent = `${e.target.value}%`;
        });
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelExportBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideExportPanel);
    }

    // Confirm button
    const confirmBtn = document.getElementById('confirmExportBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', exportImage);
    }

    // Close on overlay click
    if (elements.exportPanel) {
        elements.exportPanel.addEventListener('click', (e) => {
            if (e.target === elements.exportPanel) {
                hideExportPanel();
            }
        });
    }
}

function showExportPanel() {
    if (elements.exportPanel) {
        elements.exportPanel.classList.remove('hidden');
    }
}

function hideExportPanel() {
    if (elements.exportPanel) {
        elements.exportPanel.classList.add('hidden');
    }
}

async function exportImage() {
    const formatInput = document.querySelector('input[name="format"]:checked');
    const format = formatInput ? formatInput.value : 'png';
    const quality = elements.exportQuality ? parseInt(elements.exportQuality.value) / 100 : 0.92;

    // Get the appropriate canvas based on current tab
    let sourceCanvas;
    if (state.bgType !== 'transparent' || state.currentTab === 'background') {
        sourceCanvas = elements.backgroundCanvas;
    } else {
        sourceCanvas = elements.resultCanvas;
    }

    if (!sourceCanvas) return;

    // Create export canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = sourceCanvas.width;
    exportCanvas.height = sourceCanvas.height;
    const ctx = exportCanvas.getContext('2d', { willReadFrequently: true });

    // For JPG, fill with white background first
    if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    ctx.drawImage(sourceCanvas, 0, 0);

    // Generate blob and download
    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const blob = await new Promise(resolve => {
        exportCanvas.toBlob(resolve, mimeType, format === 'png' ? 1 : quality);
    });

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bg-removed.${format === 'jpeg' ? 'jpg' : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    hideExportPanel();
    showToast(translations[state.lang].success_download, 'success');
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================
function showToast(message, type = 'info') {
    if (!elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// =============================================
// SERVICE WORKER REGISTRATION
// =============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('ServiceWorker registered:', registration.scope);
        } catch (error) {
            console.log('ServiceWorker registration failed:', error);
        }
    });
}

// =============================================
// START APP
// =============================================
document.addEventListener('DOMContentLoaded', init);
