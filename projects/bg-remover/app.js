/**
 * BG Remover - Offline Background Removal Tool
 * 100% client-side processing using @imgly/background-removal
 *
 * Features:
 * - AI-powered background removal
 * - Magic Brush for manual refinement (erase/restore)
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
        loading_model: 'Načítám AI model...',
        removing_bg: 'Odstraňuji pozadí...',
        new_image: 'Nový',
        tab_result: 'Výsledek',
        tab_compare: 'Porovnat',
        tab_brush: 'Magic Brush',
        tab_background: 'Pozadí',
        download: 'Stáhnout',
        original: 'Originál',
        result: 'Výsledek',
        erase: 'Smazat',
        restore: 'Obnovit',
        brush_size: 'Velikost štětce:',
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
        first_load_info: 'První zpracování může trvat déle kvůli stahování AI modelu (~40 MB).'
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
        loading_model: 'Loading AI model...',
        removing_bg: 'Removing background...',
        new_image: 'New',
        tab_result: 'Result',
        tab_compare: 'Compare',
        tab_brush: 'Magic Brush',
        tab_background: 'Background',
        download: 'Download',
        original: 'Original',
        result: 'Result',
        erase: 'Erase',
        restore: 'Restore',
        brush_size: 'Brush size:',
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
        first_load_info: 'First processing may take longer due to AI model download (~40 MB).'
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
    currentTab: 'result',
    brushMode: 'erase',
    brushSize: 30,
    bgType: 'transparent',
    bgColor: '#ffffff',
    bgGradient: null,
    bgImage: null,
    blurAmount: 20,
    shadowEnabled: false,
    shadowOpacity: 40,
    shadowBlur: 20,
    isProcessing: false,
    removeBackground: null
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
        // Use esm.sh CDN which properly bundles all dependencies
        const module = await import('https://esm.sh/@imgly/background-removal@1.4.5');
        state.removeBackground = module.default || module.removeBackground;
        console.log('Background removal library loaded successfully');
    } catch (error) {
        console.error('Failed to load background removal library:', error);
        // Show info toast about first load
        showToast(translations[state.lang].first_load_info || 'First load may take longer to download AI model (~40 MB)', 'warning');
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
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function loadDemoImage(type) {
    showSection('processing');
    updateProgress(0, translations[state.lang].loading_model);

    // Create demo images using canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

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
        updateProgress(10, translations[state.lang].loading_model);

        // Create blob from image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        updateProgress(20, translations[state.lang].removing_bg);

        // Process with background removal
        const resultBlob = await state.removeBackground(blob, {
            progress: (key, current, total) => {
                const percent = Math.round((current / total) * 70) + 20;
                updateProgress(percent, translations[state.lang].removing_bg);
            },
            output: {
                format: 'image/png',
                quality: 1
            }
        });

        updateProgress(95, translations[state.lang].removing_bg);

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
                renderBackground();
            }, 300);
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
// MASK HANDLING (for Magic Brush)
// =============================================
function initializeMask() {
    // Create mask canvas to track manual edits
    state.maskCanvas = document.createElement('canvas');
    state.maskCanvas.width = state.originalImage.width;
    state.maskCanvas.height = state.originalImage.height;
    const ctx = state.maskCanvas.getContext('2d');

    // Initialize with the result alpha channel
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = state.resultImageData.width;
    resultCanvas.height = state.resultImageData.height;
    const resultCtx = resultCanvas.getContext('2d');
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
}

// =============================================
// RENDERING
// =============================================
function renderResult() {
    const canvas = elements.resultCanvas;
    const ctx = canvas.getContext('2d');

    canvas.width = state.resultImageData.width;
    canvas.height = state.resultImageData.height;

    // Apply mask to result
    const result = applyMaskToImage(state.originalImageData, state.maskCanvas);
    ctx.putImageData(result, 0, 0);
}

function renderCompare() {
    // Original image
    elements.compareOriginalImg.src = state.originalImage.src;

    // Result canvas
    const canvas = elements.compareResultCanvas;
    const ctx = canvas.getContext('2d');

    canvas.width = state.resultImageData.width;
    canvas.height = state.resultImageData.height;

    const result = applyMaskToImage(state.originalImageData, state.maskCanvas);
    ctx.putImageData(result, 0, 0);
}

function renderBrush() {
    const canvas = elements.brushCanvas;
    const ctx = canvas.getContext('2d');

    canvas.width = state.resultImageData.width;
    canvas.height = state.resultImageData.height;

    const result = applyMaskToImage(state.originalImageData, state.maskCanvas);
    ctx.putImageData(result, 0, 0);
}

function renderBackground() {
    const canvas = elements.backgroundCanvas;
    const ctx = canvas.getContext('2d');

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
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(result, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0);
}

function drawShadow(ctx) {
    // Create shadow from the mask
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = state.maskCanvas.width;
    shadowCanvas.height = state.maskCanvas.height;
    const shadowCtx = shadowCanvas.getContext('2d');

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

    const maskCtx = maskCanvas.getContext('2d');
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
    state.bgType = 'transparent';
    state.bgImage = null;
    state.shadowEnabled = false;

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
    } else if (tab === 'background') {
        renderBackground();
    }
}

// =============================================
// COMPARE SLIDER
// =============================================
function initCompareSlider() {
    const handle = elements.compareHandle;
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
    // Brush mode buttons
    document.querySelectorAll('.brush-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.brushMode = btn.dataset.mode;
            document.querySelectorAll('.brush-mode-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.mode === state.brushMode);
            });
        });
    });

    // Brush size slider
    elements.brushSize.addEventListener('input', (e) => {
        state.brushSize = parseInt(e.target.value);
        elements.brushSizeValue.textContent = `${state.brushSize}px`;
    });

    // Brush canvas drawing
    const canvas = elements.brushCanvas;
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

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

    function draw(e) {
        if (!isDrawing) return;

        const coords = getCanvasCoords(e);
        const maskCtx = state.maskCanvas.getContext('2d');

        maskCtx.beginPath();
        maskCtx.moveTo(lastX, lastY);
        maskCtx.lineTo(coords.x, coords.y);
        maskCtx.strokeStyle = state.brushMode === 'restore' ? 'white' : 'black';
        maskCtx.lineWidth = state.brushSize;
        maskCtx.lineCap = 'round';
        maskCtx.stroke();

        lastX = coords.x;
        lastY = coords.y;

        renderBrush();
    }

    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const coords = getCanvasCoords(e);
        lastX = coords.x;
        lastY = coords.y;
    });

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDrawing = true;
        const coords = getCanvasCoords(e);
        lastX = coords.x;
        lastY = coords.y;
    });

    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        draw(e);
    });

    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
        renderResult();
        renderCompare();
        renderBackground();
    });

    canvas.addEventListener('touchend', () => {
        isDrawing = false;
        renderResult();
        renderCompare();
        renderBackground();
    });

    canvas.addEventListener('mouseleave', () => isDrawing = false);
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
            elements.colorPanel.style.display = state.bgType === 'color' ? 'flex' : 'none';
            elements.imagePanel.style.display = state.bgType === 'image' ? 'flex' : 'none';
            elements.blurPanel.style.display = state.bgType === 'blur' ? 'flex' : 'none';

            renderBackground();
        });
    });

    // Color presets
    document.querySelectorAll('.color-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            state.bgColor = btn.dataset.color;
            elements.bgColorPicker.value = state.bgColor;

            document.querySelectorAll('.color-preset').forEach(b => {
                b.classList.toggle('active', b.dataset.color === state.bgColor);
            });

            renderBackground();
        });
    });

    // Custom color picker
    elements.bgColorPicker.addEventListener('input', (e) => {
        state.bgColor = e.target.value;
        document.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
        renderBackground();
    });

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
    document.getElementById('uploadBgBtn').addEventListener('click', () => {
        elements.bgFileInput.click();
    });

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

    // Blur amount
    elements.blurAmount.addEventListener('input', (e) => {
        state.blurAmount = parseInt(e.target.value);
        elements.blurValue.textContent = `${state.blurAmount}px`;
        renderBackground();
    });

    // Shadow toggle
    elements.shadowToggle.addEventListener('change', (e) => {
        state.shadowEnabled = e.target.checked;
        elements.shadowOptions.style.display = state.shadowEnabled ? 'flex' : 'none';
        renderBackground();
    });

    // Shadow opacity
    elements.shadowOpacity.addEventListener('input', (e) => {
        state.shadowOpacity = parseInt(e.target.value);
        elements.shadowOpacityValue.textContent = `${state.shadowOpacity}%`;
        renderBackground();
    });

    // Shadow blur
    elements.shadowBlur.addEventListener('input', (e) => {
        state.shadowBlur = parseInt(e.target.value);
        elements.shadowBlurValue.textContent = `${state.shadowBlur}px`;
        renderBackground();
    });
}

function createGradientImage(gradient) {
    const canvas = document.createElement('canvas');
    canvas.width = state.originalImage.width;
    canvas.height = state.originalImage.height;
    const ctx = canvas.getContext('2d');

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
            elements.qualityControl.style.display = format === 'png' ? 'none' : 'block';
        });
    });

    // Quality slider
    elements.exportQuality.addEventListener('input', (e) => {
        elements.qualityValue.textContent = `${e.target.value}%`;
    });

    // Cancel button
    document.getElementById('cancelExportBtn').addEventListener('click', hideExportPanel);

    // Confirm button
    document.getElementById('confirmExportBtn').addEventListener('click', exportImage);

    // Close on overlay click
    elements.exportPanel.addEventListener('click', (e) => {
        if (e.target === elements.exportPanel) {
            hideExportPanel();
        }
    });
}

function showExportPanel() {
    elements.exportPanel.classList.remove('hidden');
}

function hideExportPanel() {
    elements.exportPanel.classList.add('hidden');
}

async function exportImage() {
    const format = document.querySelector('input[name="format"]:checked').value;
    const quality = parseInt(elements.exportQuality.value) / 100;

    // Get the appropriate canvas based on current tab
    let sourceCanvas;
    if (state.bgType !== 'transparent' || state.currentTab === 'background') {
        sourceCanvas = elements.backgroundCanvas;
    } else {
        sourceCanvas = elements.resultCanvas;
    }

    // Create export canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = sourceCanvas.width;
    exportCanvas.height = sourceCanvas.height;
    const ctx = exportCanvas.getContext('2d');

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
    }, 3000);
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
