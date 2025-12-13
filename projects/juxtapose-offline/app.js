/**
 * Juxtapose Offline - Before/After Image Comparison PWA
 * 100% client-side, no server dependencies
 *
 * Features:
 * - Drag & drop image upload
 * - Horizontal/vertical slider modes
 * - Labels and credits
 * - IndexedDB project storage
 * - Client-side GIF export
 * - Keyboard accessibility
 * - Touch support
 */

// ============================================
// TRANSLATIONS
// ============================================

const TRANSLATIONS = {
    cs: {
        offline: '100% Offline',
        before_image: 'PŘED',
        after_image: 'PO',
        upload_hint: 'Přetáhněte nebo klikněte',
        before_label: 'Popisek Před:',
        after_label: 'Popisek Po:',
        orientation: 'Orientace:',
        horizontal: 'Horizontální',
        vertical: 'Vertikální',
        start_position: 'Výchozí pozice:',
        create_comparison: 'Vytvořit porovnání',
        privacy_notice: 'Vaše obrázky zůstávají pouze ve vašem prohlížeči. Žádná data se neodesílají na server.',
        new: 'Nový',
        edit: 'Upravit',
        save_project: 'Uložit',
        load_project: 'Načíst',
        download_image: 'Stáhnout',
        download_title: 'Stáhnout obrázek',
        select_format: 'Vyberte formát:',
        show_labels: 'Popisky',
        embed_code: 'Embed kód',
        embed_before_url: 'URL obrázku Před:',
        embed_after_url: 'URL obrázku Po:',
        embed_variant_inline: 'Varianta A: Vše inline',
        embed_variant_hosted: 'Varianta B: Hostované soubory',
        saved_projects: 'Uložené projekty',
        no_projects: 'Zatím žádné uložené projekty',
        gif_export: 'Export GIF',
        generating_gif: 'Generuji GIF...',
        gif_speed: 'Rychlost:',
        gif_quality: 'Kvalita:',
        quality_low: 'Nízká (menší soubor)',
        quality_medium: 'Střední',
        quality_high: 'Vysoká (větší soubor)',
        regenerate: 'Přegenerovat',
        download_gif: 'Stáhnout GIF',
        copied: 'Zkopírováno!',
        project_saved: 'Projekt uložen',
        project_deleted: 'Projekt smazán',
        project_name: 'Název projektu',
        project_name_placeholder: 'Zadejte název projektu...',
        save: 'Uložit',
        cancel: 'Zrušit',
        error_images_required: 'Nahrajte oba obrázky',
        error_gif_failed: 'Chyba při generování GIF'
    },
    en: {
        offline: '100% Offline',
        before_image: 'BEFORE',
        after_image: 'AFTER',
        upload_hint: 'Drag & drop or click',
        before_label: 'Before label:',
        after_label: 'After label:',
        orientation: 'Orientation:',
        horizontal: 'Horizontal',
        vertical: 'Vertical',
        start_position: 'Starting position:',
        create_comparison: 'Create comparison',
        privacy_notice: 'Your images stay only in your browser. No data is sent to any server.',
        new: 'New',
        edit: 'Edit',
        save_project: 'Save',
        load_project: 'Load',
        download_image: 'Download',
        download_title: 'Download image',
        select_format: 'Select format:',
        show_labels: 'Labels',
        embed_code: 'Embed code',
        embed_before_url: 'Before image URL:',
        embed_after_url: 'After image URL:',
        embed_variant_inline: 'Variant A: All inline',
        embed_variant_hosted: 'Variant B: Hosted files',
        saved_projects: 'Saved projects',
        no_projects: 'No saved projects yet',
        gif_export: 'GIF Export',
        generating_gif: 'Generating GIF...',
        gif_speed: 'Speed:',
        gif_quality: 'Quality:',
        quality_low: 'Low (smaller file)',
        quality_medium: 'Medium',
        quality_high: 'High (larger file)',
        regenerate: 'Regenerate',
        download_gif: 'Download GIF',
        copied: 'Copied!',
        project_saved: 'Project saved',
        project_deleted: 'Project deleted',
        project_name: 'Project name',
        project_name_placeholder: 'Enter project name...',
        save: 'Save',
        cancel: 'Cancel',
        error_images_required: 'Please upload both images',
        error_gif_failed: 'Error generating GIF'
    }
};

// ============================================
// STATE
// ============================================

let currentLang = 'cs';
let beforeImage = null;
let afterImage = null;
let currentSlider = null;
let currentProject = null;
let gifBlob = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initLanguage();
    initUploadZones();
    initOptions();
    initButtons();
    initModal();
    loadProjects();
    registerServiceWorker();
});

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    }
}

// ============================================
// LANGUAGE
// ============================================

function initLanguage() {
    const savedLang = localStorage.getItem('juxtapose_lang') || 'cs';
    setLanguage(savedLang);

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setLanguage(btn.dataset.lang);
        });
    });
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('juxtapose_lang', lang);

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (TRANSLATIONS[lang][key]) {
            el.textContent = TRANSLATIONS[lang][key];
        }
    });
}

function t(key) {
    return TRANSLATIONS[currentLang][key] || TRANSLATIONS['en'][key] || key;
}

// ============================================
// UPLOAD ZONES
// ============================================

function initUploadZones() {
    const zones = [
        { zone: 'uploadZoneBefore', input: 'fileInputBefore', preview: 'previewBefore', type: 'before' },
        { zone: 'uploadZoneAfter', input: 'fileInputAfter', preview: 'previewAfter', type: 'after' }
    ];

    zones.forEach(({ zone, input, preview, type }) => {
        const zoneEl = document.getElementById(zone);
        const inputEl = document.getElementById(input);
        const previewEl = document.getElementById(preview);

        // Click to upload
        zoneEl.addEventListener('click', () => inputEl.click());

        // File input change
        inputEl.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                handleFile(e.target.files[0], type, previewEl, zoneEl);
            }
        });

        // Drag & drop
        zoneEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            zoneEl.classList.add('dragover');
        });

        zoneEl.addEventListener('dragleave', () => {
            zoneEl.classList.remove('dragover');
        });

        zoneEl.addEventListener('drop', (e) => {
            e.preventDefault();
            zoneEl.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleFile(file, type, previewEl, zoneEl);
            }
        });
    });
}

function handleFile(file, type, previewEl, zoneEl) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;

        if (type === 'before') {
            beforeImage = dataUrl;
        } else {
            afterImage = dataUrl;
        }

        // Show preview
        previewEl.innerHTML = `<img src="${dataUrl}" alt="${type}">`;
        zoneEl.classList.add('has-image');

        updateCreateButton();
    };
    reader.readAsDataURL(file);
}

function updateCreateButton() {
    const btn = document.getElementById('createBtn');
    btn.disabled = !(beforeImage && afterImage);
}

// ============================================
// OPTIONS
// ============================================

function initOptions() {
    // Toggle buttons (orientation)
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Start position slider
    const positionSlider = document.getElementById('startPosition');
    const positionValue = document.getElementById('startPositionValue');
    positionSlider.addEventListener('input', () => {
        positionValue.textContent = `${positionSlider.value}%`;
    });
}

function getOptions() {
    return {
        labelBefore: document.getElementById('labelBefore').value || 'Before',
        labelAfter: document.getElementById('labelAfter').value || 'After',
        orientation: document.querySelector('.toggle-btn.active').dataset.value,
        startPosition: parseInt(document.getElementById('startPosition').value)
    };
}

// ============================================
// BUTTONS
// ============================================

function initButtons() {
    // Create comparison
    document.getElementById('createBtn').addEventListener('click', createComparison);

    // New
    document.getElementById('newBtn').addEventListener('click', resetToUpload);

    // Edit
    document.getElementById('editBtn').addEventListener('click', editComparison);

    // Save project - open modal for name
    document.getElementById('saveProjectBtn').addEventListener('click', openSaveProjectModal);

    // Load project (show saved projects)
    document.getElementById('loadProjectBtn').addEventListener('click', () => {
        document.getElementById('projectsSection').scrollIntoView({ behavior: 'smooth' });
    });

    // Download image - open format modal
    document.getElementById('downloadImageBtn').addEventListener('click', openDownloadModal);

    // Export GIF
    document.getElementById('exportGifBtn').addEventListener('click', openGifModal);

    // Copy embed code
    document.getElementById('copyEmbedBtn').addEventListener('click', copyEmbedCode);

    // Labels toggle
    const labelsToggle = document.getElementById('showLabelsToggle');
    if (labelsToggle) {
        labelsToggle.addEventListener('change', (e) => {
            updateLabelsVisibility(e.target.checked);
        });
    }

    // Embed URL inputs - use both input and change events for better compatibility
    const embedBeforeUrl = document.getElementById('embedBeforeUrl');
    const embedAfterUrl = document.getElementById('embedAfterUrl');
    const updateEmbed = () => {
        if (currentSlider) {
            generateEmbedCode(currentSlider.options);
        }
    };
    if (embedBeforeUrl) {
        embedBeforeUrl.addEventListener('input', updateEmbed);
        embedBeforeUrl.addEventListener('change', updateEmbed);
    }
    if (embedAfterUrl) {
        embedAfterUrl.addEventListener('input', updateEmbed);
        embedAfterUrl.addEventListener('change', updateEmbed);
    }

    // Embed variant toggle
    document.querySelectorAll('.embed-variant-toggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.embed-variant-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (currentSlider) {
                generateEmbedCode(currentSlider.options);
            }
        });
    });

    // Initialize modals
    initDownloadModal();
    initSaveProjectModal();
}

// ============================================
// SLIDER ENGINE
// ============================================

function createComparison() {
    if (!beforeImage || !afterImage) {
        showToast(t('error_images_required'), 'error');
        return;
    }

    const options = getOptions();

    // Hide upload, show slider
    document.getElementById('uploadSection').classList.add('hidden');
    document.getElementById('sliderSection').classList.remove('hidden');

    // Create slider
    renderSlider(beforeImage, afterImage, options);

    // Generate embed code
    generateEmbedCode(options);
}

function renderSlider(before, after, options) {
    const container = document.getElementById('juxtaposeContainer');
    container.innerHTML = '';

    // Create slider structure
    const slider = document.createElement('div');
    slider.className = `jx-slider ${options.orientation === 'vertical' ? 'vertical' : ''}`;
    slider.setAttribute('tabindex', '0');
    slider.setAttribute('role', 'slider');
    slider.setAttribute('aria-valuenow', options.startPosition);
    slider.setAttribute('aria-valuemin', '0');
    slider.setAttribute('aria-valuemax', '100');
    slider.style.setProperty('--position', `${options.startPosition}%`);

    // Before image
    const beforeDiv = document.createElement('div');
    beforeDiv.className = 'jx-image before';
    const beforeImg = document.createElement('img');
    beforeImg.src = before;
    beforeImg.alt = options.labelBefore;
    beforeDiv.appendChild(beforeImg);

    // After image
    const afterDiv = document.createElement('div');
    afterDiv.className = 'jx-image after';
    const afterImg = document.createElement('img');
    afterImg.src = after;
    afterImg.alt = options.labelAfter;
    afterDiv.appendChild(afterImg);

    // Handle
    const handle = document.createElement('div');
    handle.className = 'jx-handle';
    handle.innerHTML = `
        <div class="jx-handle-line"></div>
        <div class="jx-handle-circle">
            <div class="jx-handle-arrows">
                ${options.orientation === 'vertical' ?
                    '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M7 14l5-5 5 5" stroke="currentColor" stroke-width="2" fill="none"/></svg><svg viewBox="0 0 24 24" width="16" height="16"><path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" fill="none"/></svg>' :
                    '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M14 7l-5 5 5 5" stroke="currentColor" stroke-width="2" fill="none"/></svg><svg viewBox="0 0 24 24" width="16" height="16"><path d="M10 7l5 5-5 5" stroke="currentColor" stroke-width="2" fill="none"/></svg>'
                }
            </div>
        </div>
    `;

    // Labels
    const labelBefore = document.createElement('div');
    labelBefore.className = 'jx-label before';
    labelBefore.textContent = options.labelBefore;

    const labelAfter = document.createElement('div');
    labelAfter.className = 'jx-label after';
    labelAfter.textContent = options.labelAfter;

    // Assemble
    slider.appendChild(afterDiv);
    slider.appendChild(beforeDiv);
    slider.appendChild(handle);
    slider.appendChild(labelBefore);
    slider.appendChild(labelAfter);
    container.appendChild(slider);

    // Set aspect ratio based on image
    afterImg.onload = () => {
        const ratio = afterImg.naturalHeight / afterImg.naturalWidth;
        container.style.paddingBottom = `${ratio * 100}%`;
        container.style.position = 'relative';
        slider.style.position = 'absolute';
        slider.style.inset = '0';
    };

    // Initialize interaction
    initSliderInteraction(slider, options.orientation === 'vertical');

    currentSlider = { element: slider, before, after, options };
}

function initSliderInteraction(slider, isVertical) {
    let isDragging = false;

    function updatePosition(e) {
        const rect = slider.getBoundingClientRect();
        let position;

        if (isVertical) {
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
            position = Math.max(0, Math.min(100, (y / rect.height) * 100));
        } else {
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            position = Math.max(0, Math.min(100, (x / rect.width) * 100));
        }

        slider.style.setProperty('--position', `${position}%`);
        slider.setAttribute('aria-valuenow', Math.round(position));
    }

    // Mouse events
    slider.addEventListener('mousedown', (e) => {
        isDragging = true;
        slider.classList.add('active');
        updatePosition(e);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            updatePosition(e);
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        slider.classList.remove('active');
    });

    // Touch events
    slider.addEventListener('touchstart', (e) => {
        isDragging = true;
        slider.classList.add('active');
        updatePosition(e);
    }, { passive: true });

    slider.addEventListener('touchmove', (e) => {
        if (isDragging) {
            updatePosition(e);
        }
    }, { passive: true });

    slider.addEventListener('touchend', () => {
        isDragging = false;
        slider.classList.remove('active');
    });

    // Keyboard navigation
    slider.addEventListener('keydown', (e) => {
        const current = parseFloat(slider.style.getPropertyValue('--position')) || 50;
        let newPosition = current;
        const step = 5;

        if (isVertical) {
            if (e.key === 'ArrowUp') newPosition = current - step;
            if (e.key === 'ArrowDown') newPosition = current + step;
        } else {
            if (e.key === 'ArrowLeft') newPosition = current - step;
            if (e.key === 'ArrowRight') newPosition = current + step;
        }

        if (e.key === 'Home') newPosition = 0;
        if (e.key === 'End') newPosition = 100;

        newPosition = Math.max(0, Math.min(100, newPosition));
        slider.style.setProperty('--position', `${newPosition}%`);
        slider.setAttribute('aria-valuenow', Math.round(newPosition));
    });
}

// ============================================
// EMBED CODE
// ============================================

const EMBED_BASE_URL = 'https://deerpfy.github.io/adhub/projects/juxtapose-offline';

// Inline CSS for Variant A
const EMBED_CSS_INLINE = `.image-compare{position:relative;width:100%;max-width:100%;overflow:hidden;cursor:ew-resize;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;touch-action:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}.image-compare.vertical{cursor:ns-resize}.image-compare *{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.image-compare__before,.image-compare__after{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden}.image-compare__before img,.image-compare__after img{display:block;width:100%;height:100%;object-fit:cover;pointer-events:none}.image-compare__before{clip-path:inset(0 50% 0 0)}.image-compare.vertical .image-compare__before{clip-path:inset(0 0 50% 0)}.image-compare__handle{position:absolute;top:0;left:50%;width:4px;height:100%;background:#fff;transform:translateX(-50%);z-index:10;box-shadow:0 0 8px rgba(0,0,0,0.5)}.image-compare.vertical .image-compare__handle{top:50%;left:0;width:100%;height:4px;transform:translateY(-50%)}.image-compare__handle-circle{position:absolute;top:50%;left:50%;width:44px;height:44px;background:#fff;border-radius:50%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.3)}.image-compare__arrows{display:flex;gap:4px;color:#333}.image-compare.vertical .image-compare__arrows{flex-direction:column}.image-compare__arrows svg{width:12px;height:12px}.image-compare__label{position:absolute;padding:6px 14px;background:rgba(0,0,0,0.7);color:#fff;font-size:12px;font-weight:600;border-radius:4px;z-index:5;pointer-events:none;text-transform:uppercase;letter-spacing:.5px}.image-compare__label--before{top:12px;left:12px}.image-compare__label--after{top:12px;right:12px}.image-compare.vertical .image-compare__label--before{top:12px;left:12px}.image-compare.vertical .image-compare__label--after{bottom:12px;left:12px;top:auto}`;

// Inline JS for Variant A
const EMBED_JS_INLINE = `(function(){'use strict';function initImageCompare(e){const t=e.querySelectorAll('img');if(t.length<2)return;const n=t[0],o=t[1],i='vertical'===e.dataset.orientation,s=parseInt(e.dataset.position)||50,a=n.dataset.label||'Before',r=o.dataset.label||'After';e.innerHTML='';const c=document.createElement('div');c.className='image-compare__after',c.appendChild(o.cloneNode(!0));const l=document.createElement('div');l.className='image-compare__before',l.appendChild(n.cloneNode(!0));const d=document.createElement('div');d.className='image-compare__handle',d.innerHTML='<div class="image-compare__handle-circle"><div class="image-compare__arrows"><svg viewBox="0 0 24 24" fill="currentColor"><path d="'+(i?'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z':'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z')+'"/></svg><svg viewBox="0 0 24 24" fill="currentColor"><path d="'+(i?'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z':'M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z')+'"/></svg></div></div>';const m=document.createElement('div');m.className='image-compare__label image-compare__label--before',m.textContent=a;const p=document.createElement('div');p.className='image-compare__label image-compare__label--after',p.textContent=r;e.appendChild(c),e.appendChild(l),e.appendChild(d),e.appendChild(m),e.appendChild(p),i&&e.classList.add('vertical'),u(s);let f=!1;function u(t){t=Math.max(0,Math.min(100,t)),i?(l.style.clipPath='inset(0 0 '+(100-t)+'% 0)',d.style.top=t+'%',d.style.left='0',d.style.transform='translateY(-50%)'):(l.style.clipPath='inset(0 '+(100-t)+'% 0 0)',d.style.left=t+'%',d.style.top='0',d.style.transform='translateX(-50%)')}function g(t){const n=e.getBoundingClientRect();return i?((t.touches?t.touches[0].clientY:t.clientY)-n.top)/n.height*100:((t.touches?t.touches[0].clientX:t.clientX)-n.left)/n.width*100}e.addEventListener('mousedown',function(e){e.preventDefault(),f=!0,u(g(e))}),document.addEventListener('mousemove',function(e){f&&(e.preventDefault(),u(g(e)))}),document.addEventListener('mouseup',function(){f=!1}),e.addEventListener('touchstart',function(e){e.preventDefault(),f=!0,u(g(e))},{passive:!1}),e.addEventListener('touchmove',function(e){f&&(e.preventDefault(),u(g(e)))},{passive:!1}),e.addEventListener('touchend',function(){f=!1});const h=n.cloneNode(!0);h.onload=function(){const t=h.naturalHeight/h.naturalWidth;e.style.paddingBottom=100*t+'%'},h.complete&&(e.style.paddingBottom=100*(h.naturalHeight/h.naturalWidth)+'%')}function init(){document.querySelectorAll('.image-compare').forEach(initImageCompare)}'loading'===document.readyState?document.addEventListener('DOMContentLoaded',init):init(),window.ImageCompare={init:init,initSlider:initImageCompare}})();`;

function generateEmbedCode(options) {
    const variant = document.querySelector('.embed-variant-toggle .toggle-btn.active')?.dataset.variant || 'inline';

    // Get URLs from inputs or use placeholders
    const beforeUrl = document.getElementById('embedBeforeUrl')?.value || 'BEFORE_IMAGE_URL';
    const afterUrl = document.getElementById('embedAfterUrl')?.value || 'AFTER_IMAGE_URL';

    let embedCode;

    if (variant === 'inline') {
        // Variant A: All inline
        embedCode = `<!-- Image Compare - Before/After Slider (Inline) -->
<style>${EMBED_CSS_INLINE}</style>
<div class="image-compare" data-position="${options.startPosition}" data-orientation="${options.orientation}">
    <img src="${beforeUrl}" alt="${options.labelBefore}" data-label="${options.labelBefore}" />
    <img src="${afterUrl}" alt="${options.labelAfter}" data-label="${options.labelAfter}" />
</div>
<script>${EMBED_JS_INLINE}<\/script>`;
    } else {
        // Variant B: Hosted files
        embedCode = `<!-- Image Compare - Before/After Slider (Hosted) -->
<link rel="stylesheet" href="${EMBED_BASE_URL}/embed.css">
<div class="image-compare" data-position="${options.startPosition}" data-orientation="${options.orientation}">
    <img src="${beforeUrl}" alt="${options.labelBefore}" data-label="${options.labelBefore}" />
    <img src="${afterUrl}" alt="${options.labelAfter}" data-label="${options.labelAfter}" />
</div>
<script src="${EMBED_BASE_URL}/embed.js"><\/script>`;
    }

    document.getElementById('embedCode').value = embedCode;
}

function copyEmbedCode() {
    const textarea = document.getElementById('embedCode');
    textarea.select();
    document.execCommand('copy');
    showToast(t('copied'), 'success');
}

// ============================================
// DOWNLOAD PNG
// ============================================

function downloadPNG() {
    if (!currentSlider) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const slider = currentSlider.element;
    const rect = slider.getBoundingClientRect();
    const position = parseFloat(slider.style.getPropertyValue('--position')) || 50;
    const isVertical = slider.classList.contains('vertical');

    // Load images
    const img1 = new Image();
    const img2 = new Image();
    let loaded = 0;

    const draw = () => {
        loaded++;
        if (loaded < 2) return;

        canvas.width = img1.naturalWidth;
        canvas.height = img1.naturalHeight;

        // Draw after image (full)
        ctx.drawImage(img2, 0, 0, canvas.width, canvas.height);

        // Draw before image (clipped)
        ctx.save();
        if (isVertical) {
            ctx.beginPath();
            ctx.rect(0, 0, canvas.width, canvas.height * (position / 100));
            ctx.clip();
        } else {
            ctx.beginPath();
            ctx.rect(0, 0, canvas.width * (position / 100), canvas.height);
            ctx.clip();
        }
        ctx.drawImage(img1, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Draw handle line
        ctx.fillStyle = '#222';
        if (isVertical) {
            ctx.fillRect(0, canvas.height * (position / 100) - 2, canvas.width, 4);
        } else {
            ctx.fillRect(canvas.width * (position / 100) - 2, 0, 4, canvas.height);
        }

        // Draw labels
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        const labelBefore = currentSlider.options.labelBefore;
        const labelAfter = currentSlider.options.labelAfter;

        // Before label
        const beforeMetrics = ctx.measureText(labelBefore);
        ctx.fillRect(15, 15, beforeMetrics.width + 20, 28);
        ctx.fillStyle = '#fff';
        ctx.fillText(labelBefore, 25, 35);

        // After label
        const afterMetrics = ctx.measureText(labelAfter);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(canvas.width - afterMetrics.width - 35, 15, afterMetrics.width + 20, 28);
        ctx.fillStyle = '#fff';
        ctx.fillText(labelAfter, canvas.width - afterMetrics.width - 25, 35);

        // Download
        const link = document.createElement('a');
        link.download = 'juxtapose-comparison.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    img1.onload = draw;
    img2.onload = draw;
    img1.src = currentSlider.before;
    img2.src = currentSlider.after;
}

// ============================================
// GIF EXPORT
// ============================================

function openGifModal() {
    document.getElementById('gifModal').classList.remove('hidden');
    generateGif();
}

function initModal() {
    document.getElementById('closeGifModal').addEventListener('click', closeGifModal);
    document.getElementById('regenerateGifBtn').addEventListener('click', generateGif);
    document.getElementById('downloadGifBtn').addEventListener('click', downloadGif);

    // Speed slider
    const speedSlider = document.getElementById('gifSpeed');
    const speedValue = document.getElementById('gifSpeedValue');
    speedSlider.addEventListener('input', () => {
        speedValue.textContent = `${(speedSlider.value / 1000).toFixed(1)}s`;
    });

    // Close on background click
    document.getElementById('gifModal').addEventListener('click', (e) => {
        if (e.target.id === 'gifModal') {
            closeGifModal();
        }
    });
}

function closeGifModal() {
    document.getElementById('gifModal').classList.add('hidden');
    gifBlob = null;
}

function generateGif() {
    if (!currentSlider) return;

    const preview = document.getElementById('gifPreview');
    const downloadBtn = document.getElementById('downloadGifBtn');
    const progressEl = document.getElementById('gifProgress');

    preview.innerHTML = `
        <div class="gif-loading">
            <div class="spinner"></div>
            <p>${t('generating_gif')}</p>
            <p class="gif-progress" id="gifProgress">0%</p>
        </div>
    `;
    downloadBtn.disabled = true;
    gifBlob = null;

    const speed = parseInt(document.getElementById('gifSpeed').value);
    const quality = parseInt(document.getElementById('gifQuality').value);

    // Check if gif.js is loaded
    if (typeof GIF === 'undefined') {
        preview.innerHTML = `<p style="color: var(--danger-color);">GIF library not loaded</p>`;
        return;
    }

    const img1 = new Image();
    const img2 = new Image();
    let loaded = 0;

    const createGif = () => {
        loaded++;
        if (loaded < 2) return;

        const width = Math.min(img1.naturalWidth, 800);
        const height = Math.round(width * (img1.naturalHeight / img1.naturalWidth));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const gif = new GIF({
            workers: 2,
            quality: quality,
            width: width,
            height: height,
            workerScript: 'gif.worker.js'
        });

        // Frame 1: Before
        ctx.drawImage(img1, 0, 0, width, height);
        gif.addFrame(ctx, { copy: true, delay: speed });

        // Frame 2: After
        ctx.drawImage(img2, 0, 0, width, height);
        gif.addFrame(ctx, { copy: true, delay: speed });

        gif.on('progress', (p) => {
            const percent = Math.round(p * 100);
            document.getElementById('gifProgress').textContent = `${percent}%`;
        });

        gif.on('finished', (blob) => {
            gifBlob = blob;
            const url = URL.createObjectURL(blob);
            preview.innerHTML = `<img src="${url}" alt="GIF Preview">`;
            downloadBtn.disabled = false;
        });

        gif.render();
    };

    img1.onload = createGif;
    img2.onload = createGif;
    img1.src = currentSlider.before;
    img2.src = currentSlider.after;
}

function downloadGif() {
    if (!gifBlob) return;

    const link = document.createElement('a');
    link.download = 'juxtapose-animation.gif';
    link.href = URL.createObjectURL(gifBlob);
    link.click();
}

// ============================================
// SAVE PROJECT MODAL
// ============================================

function initSaveProjectModal() {
    document.getElementById('closeSaveProjectModal').addEventListener('click', closeSaveProjectModal);
    document.getElementById('cancelSaveProject').addEventListener('click', closeSaveProjectModal);
    document.getElementById('confirmSaveProject').addEventListener('click', confirmSaveProject);

    // Close on background click
    document.getElementById('saveProjectModal').addEventListener('click', (e) => {
        if (e.target.id === 'saveProjectModal') {
            closeSaveProjectModal();
        }
    });

    // Enter key to save
    document.getElementById('projectNameInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            confirmSaveProject();
        }
    });
}

function openSaveProjectModal() {
    if (!currentSlider) return;

    // Generate default name based on date
    const now = new Date();
    const defaultName = `Projekt ${now.toLocaleDateString('cs-CZ')} ${now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`;

    document.getElementById('projectNameInput').value = defaultName;
    document.getElementById('saveProjectModal').classList.remove('hidden');
    document.getElementById('projectNameInput').select();
}

function closeSaveProjectModal() {
    document.getElementById('saveProjectModal').classList.add('hidden');
}

async function confirmSaveProject() {
    const name = document.getElementById('projectNameInput').value.trim();
    if (!name) {
        document.getElementById('projectNameInput').focus();
        return;
    }

    await saveProject(name);
    closeSaveProjectModal();
}

// ============================================
// PROJECT STORAGE (IndexedDB)
// ============================================

const DB_NAME = 'ImageCompareOffline';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('created', 'created');
                store.createIndex('name', 'name');
            }
        };
    });
}

async function saveProject(name) {
    if (!currentSlider) return;

    const project = {
        name: name,
        before: currentSlider.before,
        after: currentSlider.after,
        options: currentSlider.options,
        created: new Date().toISOString(),
        thumbnail: await createThumbnail()
    };

    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        await store.add(project);

        showToast(t('project_saved'), 'success');
        loadProjects();
    } catch (err) {
        console.error('Error saving project:', err);
    }
}

async function createThumbnail() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 150;

    const img = new Image();
    return new Promise((resolve) => {
        img.onload = () => {
            ctx.drawImage(img, 0, 0, 200, 150);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = currentSlider.before;
    });
}

async function loadProjects() {
    const grid = document.getElementById('projectsGrid');
    const noProjects = document.getElementById('noProjects');

    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const projects = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        grid.innerHTML = '';

        if (projects.length === 0) {
            noProjects.classList.remove('hidden');
        } else {
            noProjects.classList.add('hidden');
            projects.reverse().forEach(project => {
                const card = createProjectCard(project);
                grid.appendChild(card);
            });
        }
    } catch (err) {
        console.error('Error loading projects:', err);
    }
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';

    const date = new Date(project.created);
    const dateStr = date.toLocaleDateString();
    const projectName = project.name || `${project.options.labelBefore} / ${project.options.labelAfter}`;

    card.innerHTML = `
        <div class="project-preview">
            <img src="${project.thumbnail || project.before}" alt="Project">
        </div>
        <div class="project-info">
            <div>
                <div class="project-name">${projectName}</div>
                <div class="project-date">${dateStr}</div>
            </div>
            <button class="project-delete" data-id="${project.id}" title="Smazat">
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                </svg>
            </button>
        </div>
    `;

    // Load project on click
    card.querySelector('.project-preview').addEventListener('click', () => {
        loadProject(project);
    });

    // Delete project
    card.querySelector('.project-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteProject(project.id);
    });

    return card;
}

function loadProject(project) {
    beforeImage = project.before;
    afterImage = project.after;
    currentProject = project;

    // Update options UI
    document.getElementById('labelBefore').value = project.options.labelBefore;
    document.getElementById('labelAfter').value = project.options.labelAfter;
    document.getElementById('startPosition').value = project.options.startPosition;
    document.getElementById('startPositionValue').textContent = `${project.options.startPosition}%`;

    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === project.options.orientation);
    });

    // Create comparison
    createComparison();
}

async function deleteProject(id) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        await store.delete(id);

        showToast(t('project_deleted'), 'success');
        loadProjects();
    } catch (err) {
        console.error('Error deleting project:', err);
    }
}

// ============================================
// NAVIGATION
// ============================================

function resetToUpload() {
    document.getElementById('uploadSection').classList.remove('hidden');
    document.getElementById('sliderSection').classList.add('hidden');

    // Reset state
    beforeImage = null;
    afterImage = null;
    currentSlider = null;
    currentProject = null;

    // Clear previews
    document.querySelectorAll('.upload-preview').forEach(el => el.innerHTML = '');
    document.querySelectorAll('.upload-zone').forEach(el => el.classList.remove('has-image'));

    // Reset form
    document.getElementById('labelBefore').value = '';
    document.getElementById('labelAfter').value = '';
    document.getElementById('startPosition').value = 50;
    document.getElementById('startPositionValue').textContent = '50%';

    updateCreateButton();
}

function editComparison() {
    if (!currentSlider) return;

    // Show upload section but keep images
    document.getElementById('uploadSection').classList.remove('hidden');
    document.getElementById('sliderSection').classList.add('hidden');

    // Show previews
    document.getElementById('previewBefore').innerHTML = `<img src="${beforeImage}" alt="before">`;
    document.getElementById('previewAfter').innerHTML = `<img src="${afterImage}" alt="after">`;
    document.querySelectorAll('.upload-zone').forEach(el => el.classList.add('has-image'));

    updateCreateButton();
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
