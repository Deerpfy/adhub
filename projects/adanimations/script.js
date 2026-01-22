/**
 * AdAnimations - OBS Animation Creator
 * Version 1.2 - Added Sequencer for timeline-based animation control
 *
 * Editor pro tvorbu animovanych banneru a overlays pro OBS
 */

// Application State
const AppState = {
    elements: [],
    selectedElement: null,
    editingElement: null,
    canvas: {
        width: 1920,
        height: 1080,
        zoom: 0.5
    },
    animation: {
        type: 'slideLeft',
        duration: 500,
        delay: 0,
        easing: 'ease',
        exitEnabled: false,
        exitType: 'same',
        displayDuration: 5000
    },
    timer: {
        enabled: false,
        interval: 300000,
        randomize: false
    },
    // Sequencer state
    sequencer: {
        enabled: false,
        groups: [],           // Array of groups: { id, name, elements: [], delay, stagger }
        timeline: [],         // Ordered sequence: { elementId, groupId, startTime, endTime }
        totalDuration: 10000, // Total sequence duration in ms
        currentTime: 0,
        isPlaying: false,
        loop: false
    },
    isDragging: false,
    isResizing: false,
    dragStart: { x: 0, y: 0 },
    elementIdCounter: 0,
    groupIdCounter: 0,
    previewWindow: null,
    contextMenu: null
};

// Extended Animation mappings with new effects
const ANIMATION_MAP = {
    // Slide animations
    slideLeft: { enter: 'slideInLeft', exit: 'slideOutLeft', category: 'slide' },
    slideRight: { enter: 'slideInRight', exit: 'slideOutRight', category: 'slide' },
    slideUp: { enter: 'slideInUp', exit: 'slideOutUp', category: 'slide' },
    slideDown: { enter: 'slideInDown', exit: 'slideOutDown', category: 'slide' },
    // Fade/Zoom
    fadeIn: { enter: 'fadeIn', exit: 'fadeOut', category: 'fade' },
    zoomIn: { enter: 'zoomIn', exit: 'zoomOut', category: 'fade' },
    // Bounce/Elastic
    bounce: { enter: 'bounce', exit: 'zoomOut', category: 'bounce' },
    elasticIn: { enter: 'elasticIn', exit: 'zoomOut', category: 'bounce' },
    // Rotate/Flip
    rotate: { enter: 'rotateIn', exit: 'zoomOut', category: 'rotate' },
    flipIn: { enter: 'flipIn', exit: 'flipOut', category: 'rotate' },
    swingIn: { enter: 'swingIn', exit: 'fadeOut', category: 'rotate' },
    // Special effects
    glitch: { enter: 'glitchIn', exit: 'fadeOut', category: 'special' },
    pulse: { enter: 'pulse', exit: 'fadeOut', category: 'special', continuous: true },
    glow: { enter: 'neonPulse', exit: 'fadeOut', category: 'special', continuous: true },
    shake: { enter: 'shake', exit: 'fadeOut', category: 'special' },
    wobble: { enter: 'wobble', exit: 'fadeOut', category: 'special' },
    float: { enter: 'float', exit: 'fadeOut', category: 'special', continuous: true }
};

// Preset Templates
const TEMPLATES = {
    neonBox: {
        name: 'Neon Box',
        category: 'neon',
        width: 300,
        height: 80,
        bgType: 'solid',
        bgColor: '#1a1a2e',
        bgOpacity: 90,
        borderWidth: 2,
        borderColor: '#8b5cf6',
        borderRadius: 12,
        shadowEnabled: true,
        shadowX: 0,
        shadowY: 0,
        shadowBlur: 20,
        shadowColor: '#8b5cf6',
        glowEnabled: true,
        text: 'LIVE',
        textColor: '#8b5cf6',
        fontSize: 28,
        fontWeight: 'bold',
        animationType: 'pulse'
    },
    gradientBanner: {
        name: 'Gradient Banner',
        category: 'gradient',
        width: 400,
        height: 100,
        bgType: 'gradient',
        gradient1: '#8b5cf6',
        gradient2: '#ec4899',
        borderWidth: 0,
        borderRadius: 16,
        shadowEnabled: true,
        shadowX: 0,
        shadowY: 8,
        shadowBlur: 24,
        shadowColor: '#8b5cf6',
        text: 'FOLLOW',
        textColor: '#ffffff',
        fontSize: 32,
        fontWeight: 'bold',
        animationType: 'bounce'
    },
    minimalAlert: {
        name: 'Minimal Alert',
        category: 'minimal',
        width: 350,
        height: 60,
        bgType: 'solid',
        bgColor: '#10b981',
        bgOpacity: 15,
        borderWidth: 1,
        borderColor: '#10b981',
        borderRadius: 8,
        shadowEnabled: false,
        text: '+ New Follower',
        textColor: '#10b981',
        fontSize: 18,
        fontWeight: '500',
        animationType: 'slideRight'
    },
    cyberPanel: {
        name: 'Cyber Panel',
        category: 'cyber',
        width: 320,
        height: 90,
        bgType: 'gradient',
        gradient1: '#0f0f23',
        gradient2: '#1a1a3e',
        borderWidth: 1,
        borderColor: '#06b6d4',
        borderRadius: 4,
        shadowEnabled: true,
        shadowX: 0,
        shadowY: 0,
        shadowBlur: 15,
        shadowColor: '#06b6d4',
        glowEnabled: true,
        text: 'STREAM',
        textColor: '#06b6d4',
        fontSize: 24,
        fontWeight: 'bold',
        animationType: 'glitch'
    },
    cozyFrame: {
        name: 'Cozy Frame',
        category: 'cozy',
        width: 280,
        height: 70,
        bgType: 'solid',
        bgColor: '#2d2416',
        bgOpacity: 100,
        borderWidth: 3,
        borderColor: '#5c4d3a',
        borderRadius: 0,
        shadowEnabled: true,
        shadowX: 4,
        shadowY: 4,
        shadowBlur: 0,
        shadowColor: '#1a1408',
        text: 'Welcome!',
        textColor: '#d4c4a8',
        fontSize: 22,
        fontFamily: 'Georgia',
        animationType: 'fadeIn'
    },
    glassCard: {
        name: 'Glass Card',
        category: 'glass',
        width: 300,
        height: 80,
        bgType: 'solid',
        bgColor: '#ffffff',
        bgOpacity: 10,
        borderWidth: 1,
        borderColor: '#ffffff',
        borderRadius: 16,
        shadowEnabled: true,
        shadowX: 0,
        shadowY: 8,
        shadowBlur: 32,
        shadowColor: '#000000',
        text: 'Subscribe',
        textColor: '#ffffff',
        fontSize: 24,
        fontWeight: '500',
        animationType: 'zoomIn'
    },
    alertBox: {
        name: 'Alert Box',
        category: 'alert',
        width: 400,
        height: 120,
        bgType: 'solid',
        bgColor: '#1e1e2e',
        bgOpacity: 95,
        borderWidth: 0,
        borderRadius: 20,
        shadowEnabled: true,
        shadowX: 0,
        shadowY: 12,
        shadowBlur: 40,
        shadowColor: '#000000',
        text: 'New Subscriber!',
        textColor: '#ffffff',
        fontSize: 28,
        fontWeight: 'bold',
        animationType: 'elasticIn'
    },
    streamLabel: {
        name: 'Stream Label',
        category: 'minimal',
        width: 200,
        height: 50,
        bgType: 'none',
        borderWidth: 0,
        borderRadius: 0,
        shadowEnabled: true,
        shadowX: 2,
        shadowY: 2,
        shadowBlur: 4,
        shadowColor: '#000000',
        text: 'Playing: Game',
        textColor: '#ffffff',
        fontSize: 20,
        fontWeight: 'normal',
        animationType: 'fadeIn'
    }
};

// Neon color presets
const COLOR_PRESETS = [
    { name: 'Neon Purple', color: '#8b5cf6', gradient: ['#8b5cf6', '#7c3aed'] },
    { name: 'Neon Pink', color: '#ec4899', gradient: ['#ec4899', '#db2777'] },
    { name: 'Neon Blue', color: '#3b82f6', gradient: ['#3b82f6', '#2563eb'] },
    { name: 'Neon Cyan', color: '#06b6d4', gradient: ['#06b6d4', '#0891b2'] },
    { name: 'Neon Green', color: '#10b981', gradient: ['#10b981', '#059669'] },
    { name: 'Neon Orange', color: '#f59e0b', gradient: ['#f59e0b', '#d97706'] },
    { name: 'Neon Red', color: '#ef4444', gradient: ['#ef4444', '#dc2626'] },
    { name: 'Mocha', color: '#a67c52', gradient: ['#a67c52', '#8b6f47'] }
];

// DOM Elements cache
const DOM = {};

// Initialize application
document.addEventListener('DOMContentLoaded', init);

function init() {
    cacheDOM();
    setupEventListeners();
    loadFromLocalStorage();

    // Apply canvas size and zoom after DOM is ready
    updateCanvasSize();

    // Auto-fit to container on first load
    setTimeout(() => {
        zoomToFit();
        console.log('AdAnimations initialized', {
            canvasWidth: AppState.canvas.width,
            canvasHeight: AppState.canvas.height,
            zoom: AppState.canvas.zoom,
            elements: AppState.elements.length
        });
    }, 100);
}

function cacheDOM() {
    // Header buttons
    DOM.btnNewProject = document.getElementById('btnNewProject');
    DOM.btnLoadProject = document.getElementById('btnLoadProject');
    DOM.btnSaveProject = document.getElementById('btnSaveProject');

    // Element buttons
    DOM.btnAddText = document.getElementById('btnAddText');
    DOM.btnAddImage = document.getElementById('btnAddImage');
    DOM.btnAddShape = document.getElementById('btnAddShape');
    DOM.elementList = document.getElementById('elementList');

    // Canvas
    DOM.canvas = document.getElementById('canvas');
    DOM.canvasContainer = document.getElementById('canvasContainer');
    DOM.canvasWrapper = document.getElementById('canvasWrapper');
    DOM.canvasPreset = document.getElementById('canvasPreset');
    DOM.canvasWidth = document.getElementById('canvasWidth');
    DOM.canvasHeight = document.getElementById('canvasHeight');
    DOM.btnZoomIn = document.getElementById('btnZoomIn');
    DOM.btnZoomOut = document.getElementById('btnZoomOut');
    DOM.btnZoomFit = document.getElementById('btnZoomFit');
    DOM.zoomLevel = document.getElementById('zoomLevel');

    // Tabs
    DOM.tabBtns = document.querySelectorAll('.tab-btn');
    DOM.tabContents = document.querySelectorAll('.tab-content');

    // Properties
    DOM.propertyGroups = document.getElementById('propertyGroups');
    DOM.propX = document.getElementById('propX');
    DOM.propY = document.getElementById('propY');
    DOM.propWidth = document.getElementById('propWidth');
    DOM.propHeight = document.getElementById('propHeight');
    DOM.propText = document.getElementById('propText');
    DOM.propFontFamily = document.getElementById('propFontFamily');
    DOM.propFontSize = document.getElementById('propFontSize');
    DOM.propTextColor = document.getElementById('propTextColor');
    DOM.textProperties = document.getElementById('textProperties');
    DOM.propBgType = document.getElementById('propBgType');
    DOM.propBgColor = document.getElementById('propBgColor');
    DOM.propBgOpacity = document.getElementById('propBgOpacity');
    DOM.propGradient1 = document.getElementById('propGradient1');
    DOM.propGradient2 = document.getElementById('propGradient2');
    DOM.bgColorRow = document.getElementById('bgColorRow');
    DOM.bgGradientRow = document.getElementById('bgGradientRow');
    DOM.propBorderWidth = document.getElementById('propBorderWidth');
    DOM.propBorderColor = document.getElementById('propBorderColor');
    DOM.propBorderRadius = document.getElementById('propBorderRadius');
    DOM.propShadowEnabled = document.getElementById('propShadowEnabled');
    DOM.propShadowX = document.getElementById('propShadowX');
    DOM.propShadowY = document.getElementById('propShadowY');
    DOM.propShadowBlur = document.getElementById('propShadowBlur');
    DOM.propShadowColor = document.getElementById('propShadowColor');
    DOM.shadowOptions = document.getElementById('shadowOptions');
    DOM.shadowOptions2 = document.getElementById('shadowOptions2');

    // Animation
    DOM.animationBtns = document.querySelectorAll('.animation-btn');
    DOM.animDuration = document.getElementById('animDuration');
    DOM.animDelay = document.getElementById('animDelay');
    DOM.animEasing = document.getElementById('animEasing');
    DOM.animExitEnabled = document.getElementById('animExitEnabled');
    DOM.animExitType = document.getElementById('animExitType');
    DOM.animDisplayDuration = document.getElementById('animDisplayDuration');
    DOM.exitAnimOptions = document.getElementById('exitAnimOptions');
    DOM.exitAnimDuration = document.getElementById('exitAnimDuration');

    // Timer
    DOM.timerEnabled = document.getElementById('timerEnabled');
    DOM.timerOptions = document.getElementById('timerOptions');
    DOM.timerPreset = document.getElementById('timerPreset');
    DOM.timerCustom = document.getElementById('timerCustom');
    DOM.customIntervalRow = document.getElementById('customIntervalRow');
    // timerRandomize was removed - timer is now in sequencer tab

    // Actions
    DOM.btnTest = document.getElementById('btnTest');
    DOM.btnPreview = document.getElementById('btnPreview');
    DOM.btnExportHTML = document.getElementById('btnExportHTML');
    DOM.btnCopyOBS = document.getElementById('btnCopyOBS');

    // Image Modal
    DOM.imageModal = document.getElementById('imageModal');
    DOM.closeImageModal = document.getElementById('closeImageModal');
    DOM.uploadZone = document.getElementById('uploadZone');
    DOM.imageInput = document.getElementById('imageInput');
    DOM.btnSelectImage = document.getElementById('btnSelectImage');
    DOM.imageUrl = document.getElementById('imageUrl');
    DOM.btnLoadUrl = document.getElementById('btnLoadUrl');

    // Export Modal
    DOM.exportModal = document.getElementById('exportModal');
    DOM.closeExportModal = document.getElementById('closeExportModal');
    DOM.exportCode = document.getElementById('exportCode');
    DOM.exportWithTimer = document.getElementById('exportWithTimer');
    DOM.exportMinified = document.getElementById('exportMinified');
    DOM.btnCopyCode = document.getElementById('btnCopyCode');
    DOM.btnDownloadHTML = document.getElementById('btnDownloadHTML');

    // Toast
    DOM.toastContainer = document.getElementById('toastContainer');
}

function setupEventListeners() {
    // Header buttons
    DOM.btnNewProject.addEventListener('click', newProject);
    DOM.btnLoadProject.addEventListener('click', loadProject);
    DOM.btnSaveProject.addEventListener('click', saveProject);

    // Element buttons
    DOM.btnAddText.addEventListener('click', () => addElement('text'));
    DOM.btnAddImage.addEventListener('click', () => showModal('imageModal'));
    DOM.btnAddShape.addEventListener('click', () => addElement('shape'));

    // Canvas preset
    DOM.canvasPreset.addEventListener('change', handleCanvasPresetChange);
    DOM.canvasWidth.addEventListener('change', updateCanvasSize);
    DOM.canvasHeight.addEventListener('change', updateCanvasSize);

    // Zoom
    DOM.btnZoomIn.addEventListener('click', () => setZoom(AppState.canvas.zoom + 0.1));
    DOM.btnZoomOut.addEventListener('click', () => setZoom(AppState.canvas.zoom - 0.1));
    DOM.btnZoomFit.addEventListener('click', zoomToFit);

    // Tabs
    DOM.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Properties - Position & Size
    DOM.propX.addEventListener('change', () => updateElementProperty('x', parseInt(DOM.propX.value)));
    DOM.propY.addEventListener('change', () => updateElementProperty('y', parseInt(DOM.propY.value)));
    DOM.propWidth.addEventListener('change', () => updateElementProperty('width', parseInt(DOM.propWidth.value)));
    DOM.propHeight.addEventListener('change', () => updateElementProperty('height', parseInt(DOM.propHeight.value)));

    // Properties - Text
    DOM.propText.addEventListener('input', () => updateElementProperty('text', DOM.propText.value));
    DOM.propFontFamily.addEventListener('change', () => updateElementProperty('fontFamily', DOM.propFontFamily.value));
    DOM.propFontSize.addEventListener('change', () => updateElementProperty('fontSize', parseInt(DOM.propFontSize.value)));
    DOM.propTextColor.addEventListener('input', () => updateElementProperty('textColor', DOM.propTextColor.value));

    // Text alignment buttons
    document.querySelectorAll('[data-align]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-align]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateElementProperty('textAlign', btn.dataset.align);
        });
    });

    // Text style buttons
    DOM.propBold = document.getElementById('propBold');
    DOM.propItalic = document.getElementById('propItalic');
    DOM.propUnderline = document.getElementById('propUnderline');

    DOM.propBold.addEventListener('click', () => {
        DOM.propBold.classList.toggle('active');
        updateElementProperty('fontWeight', DOM.propBold.classList.contains('active') ? 'bold' : 'normal');
    });
    DOM.propItalic.addEventListener('click', () => {
        DOM.propItalic.classList.toggle('active');
        updateElementProperty('fontStyle', DOM.propItalic.classList.contains('active') ? 'italic' : 'normal');
    });
    DOM.propUnderline.addEventListener('click', () => {
        DOM.propUnderline.classList.toggle('active');
        updateElementProperty('textDecoration', DOM.propUnderline.classList.contains('active') ? 'underline' : 'none');
    });

    // Properties - Background
    DOM.propBgType.addEventListener('change', handleBgTypeChange);
    DOM.propBgColor.addEventListener('input', () => updateElementProperty('bgColor', DOM.propBgColor.value));
    DOM.propBgOpacity.addEventListener('input', () => updateElementProperty('bgOpacity', parseInt(DOM.propBgOpacity.value)));
    DOM.propGradient1.addEventListener('input', updateGradient);
    DOM.propGradient2.addEventListener('input', updateGradient);

    // Properties - Border
    DOM.propBorderWidth.addEventListener('change', () => updateElementProperty('borderWidth', parseInt(DOM.propBorderWidth.value)));
    DOM.propBorderColor.addEventListener('input', () => updateElementProperty('borderColor', DOM.propBorderColor.value));
    DOM.propBorderRadius.addEventListener('change', () => updateElementProperty('borderRadius', parseInt(DOM.propBorderRadius.value)));

    // Properties - Shadow
    DOM.propShadowEnabled.addEventListener('change', handleShadowToggle);
    DOM.propShadowX.addEventListener('change', updateShadow);
    DOM.propShadowY.addEventListener('change', updateShadow);
    DOM.propShadowBlur.addEventListener('change', updateShadow);
    DOM.propShadowColor.addEventListener('input', updateShadow);

    // Animation buttons
    DOM.animationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.animationBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.animation.type = btn.dataset.animation;
            updateElementProperty('animationType', btn.dataset.animation);
        });
    });

    // Animation settings
    DOM.animDuration.addEventListener('change', () => {
        AppState.animation.duration = parseInt(DOM.animDuration.value);
        updateElementProperty('animationDuration', AppState.animation.duration);
    });
    DOM.animDelay.addEventListener('change', () => {
        AppState.animation.delay = parseInt(DOM.animDelay.value);
        updateElementProperty('animationDelay', AppState.animation.delay);
    });
    DOM.animEasing.addEventListener('change', () => {
        AppState.animation.easing = DOM.animEasing.value;
        updateElementProperty('animationEasing', AppState.animation.easing);
    });

    // Exit animation
    DOM.animExitEnabled.addEventListener('change', () => {
        AppState.animation.exitEnabled = DOM.animExitEnabled.checked;
        DOM.exitAnimOptions.classList.toggle('hidden', !DOM.animExitEnabled.checked);
        DOM.exitAnimDuration.classList.toggle('hidden', !DOM.animExitEnabled.checked);
        updateElementProperty('exitAnimationEnabled', DOM.animExitEnabled.checked);
    });
    DOM.animExitType.addEventListener('change', () => {
        AppState.animation.exitType = DOM.animExitType.value;
        updateElementProperty('exitAnimationType', DOM.animExitType.value);
    });
    DOM.animDisplayDuration.addEventListener('change', () => {
        AppState.animation.displayDuration = parseInt(DOM.animDisplayDuration.value);
        updateElementProperty('displayDuration', AppState.animation.displayDuration);
    });

    // Timer
    if (DOM.timerEnabled) DOM.timerEnabled.addEventListener('change', handleTimerToggle);
    if (DOM.timerPreset) DOM.timerPreset.addEventListener('change', handleTimerPresetChange);
    if (DOM.timerCustom) DOM.timerCustom.addEventListener('change', () => {
        AppState.timer.interval = parseInt(DOM.timerCustom.value) * 1000;
    });

    // Action buttons
    DOM.btnTest.addEventListener('click', runTest);
    DOM.btnPreview.addEventListener('click', openPreview);
    DOM.btnExportHTML.addEventListener('click', showExportModal);
    DOM.btnCopyOBS.addEventListener('click', copyOBSUrl);

    // Image Modal
    DOM.closeImageModal.addEventListener('click', () => hideModal('imageModal'));
    DOM.btnSelectImage.addEventListener('click', () => DOM.imageInput.click());
    DOM.imageInput.addEventListener('change', handleImageSelect);
    DOM.btnLoadUrl.addEventListener('click', handleImageUrl);

    // Drag and drop for images
    DOM.uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.uploadZone.classList.add('dragover');
    });
    DOM.uploadZone.addEventListener('dragleave', () => {
        DOM.uploadZone.classList.remove('dragover');
    });
    DOM.uploadZone.addEventListener('drop', handleImageDrop);

    // Export Modal
    DOM.closeExportModal.addEventListener('click', () => hideModal('exportModal'));
    DOM.btnCopyCode.addEventListener('click', copyExportCode);
    DOM.btnDownloadHTML.addEventListener('click', downloadHTML);
    DOM.exportWithTimer.addEventListener('change', generateExportCode);
    DOM.exportMinified.addEventListener('change', generateExportCode);

    // Canvas click to deselect
    DOM.canvas.addEventListener('click', (e) => {
        if (e.target === DOM.canvas || e.target.classList.contains('canvas-grid')) {
            selectElement(null);
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal.id);
            }
        });
    });
}

// Element Management
function addElement(type, options = {}) {
    const id = `element-${++AppState.elementIdCounter}`;

    const element = {
        id,
        type,
        name: options.name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${AppState.elementIdCounter}`,
        x: options.x || 100,
        y: options.y || 100,
        width: options.width || (type === 'text' ? 400 : 200),
        height: options.height || (type === 'text' ? 80 : 150),
        // Text properties
        text: options.text || 'Vas text zde',
        fontFamily: options.fontFamily || 'Arial',
        fontSize: options.fontSize || 32,
        textColor: options.textColor || '#ffffff',
        textAlign: options.textAlign || 'center',
        fontWeight: options.fontWeight || 'normal',
        fontStyle: options.fontStyle || 'normal',
        textDecoration: options.textDecoration || 'none',
        // Background
        bgType: options.bgType || (type === 'text' ? 'solid' : 'solid'),
        bgColor: options.bgColor || '#333333',
        bgOpacity: options.bgOpacity !== undefined ? options.bgOpacity : 100,
        gradient1: options.gradient1 || '#8b5cf6',
        gradient2: options.gradient2 || '#ec4899',
        // Image
        imageSrc: options.imageSrc || '',
        // Border
        borderWidth: options.borderWidth || 0,
        borderColor: options.borderColor || '#ffffff',
        borderRadius: options.borderRadius || 8,
        // Shadow
        shadowEnabled: options.shadowEnabled || false,
        shadowX: options.shadowX || 4,
        shadowY: options.shadowY || 4,
        shadowBlur: options.shadowBlur || 8,
        shadowColor: options.shadowColor || '#000000',
        // Animation
        animationType: options.animationType || 'slideLeft',
        animationDuration: options.animationDuration || 500,
        animationDelay: options.animationDelay || 0,
        animationEasing: options.animationEasing || 'ease',
        exitAnimationEnabled: options.exitAnimationEnabled || false,
        exitAnimationType: options.exitAnimationType || 'same',
        displayDuration: options.displayDuration || 5000,
        // Sequencer properties
        sequenceOrder: options.sequenceOrder || AppState.elements.length,
        sequenceDelay: options.sequenceDelay || 0,
        groupId: options.groupId || null
    };

    AppState.elements.push(element);
    renderElementList();
    renderCanvasElement(element);
    selectElement(id);
    saveToLocalStorage();

    return element;
}

function removeElement(id) {
    const index = AppState.elements.findIndex(e => e.id === id);
    if (index !== -1) {
        AppState.elements.splice(index, 1);
        const domElement = DOM.canvas.querySelector(`[data-id="${id}"]`);
        if (domElement) domElement.remove();
        if (AppState.selectedElement === id) {
            selectElement(null);
        }
        renderElementList();
        saveToLocalStorage();
    }
}

function duplicateElement(id) {
    const element = AppState.elements.find(e => e.id === id);
    if (element) {
        const newElement = { ...element };
        newElement.x += 20;
        newElement.y += 20;
        newElement.name = element.name + ' (kopie)';
        addElement(element.type, newElement);
    }
}

function selectElement(id) {
    AppState.selectedElement = id;

    // Update canvas selection
    DOM.canvas.querySelectorAll('.canvas-element').forEach(el => {
        el.classList.toggle('selected', el.dataset.id === id);
    });

    // Update list selection
    DOM.elementList.querySelectorAll('.element-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.id === id);
    });

    // Show/hide properties panel
    const noSelection = document.querySelector('.no-selection');
    if (id) {
        noSelection.classList.add('hidden');
        DOM.propertyGroups.classList.remove('hidden');
        updatePropertiesPanel();
    } else {
        noSelection.classList.remove('hidden');
        DOM.propertyGroups.classList.add('hidden');
    }
}

function updateElementProperty(property, value) {
    if (!AppState.selectedElement) return;

    const element = AppState.elements.find(e => e.id === AppState.selectedElement);
    if (!element) return;

    element[property] = value;
    renderCanvasElement(element);
    saveToLocalStorage();
}

function updatePropertiesPanel() {
    const element = AppState.elements.find(e => e.id === AppState.selectedElement);
    if (!element) return;

    // Position & Size
    DOM.propX.value = element.x;
    DOM.propY.value = element.y;
    DOM.propWidth.value = element.width;
    DOM.propHeight.value = element.height;

    // Text properties
    DOM.textProperties.classList.toggle('hidden', element.type !== 'text');
    if (element.type === 'text') {
        DOM.propText.value = element.text;
        DOM.propFontFamily.value = element.fontFamily;
        DOM.propFontSize.value = element.fontSize;
        DOM.propTextColor.value = element.textColor;

        // Text align
        document.querySelectorAll('[data-align]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.align === element.textAlign);
        });

        // Text style
        DOM.propBold.classList.toggle('active', element.fontWeight === 'bold');
        DOM.propItalic.classList.toggle('active', element.fontStyle === 'italic');
        DOM.propUnderline.classList.toggle('active', element.textDecoration === 'underline');
    }

    // Background
    DOM.propBgType.value = element.bgType;
    DOM.propBgColor.value = element.bgColor;
    DOM.propBgOpacity.value = element.bgOpacity;
    DOM.propGradient1.value = element.gradient1;
    DOM.propGradient2.value = element.gradient2;
    handleBgTypeChange();

    // Border
    DOM.propBorderWidth.value = element.borderWidth;
    DOM.propBorderColor.value = element.borderColor;
    DOM.propBorderRadius.value = element.borderRadius;

    // Shadow
    DOM.propShadowEnabled.checked = element.shadowEnabled;
    DOM.propShadowX.value = element.shadowX;
    DOM.propShadowY.value = element.shadowY;
    DOM.propShadowBlur.value = element.shadowBlur;
    DOM.propShadowColor.value = element.shadowColor;
    handleShadowToggle();

    // Animation
    DOM.animationBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.animation === element.animationType);
    });
    DOM.animDuration.value = element.animationDuration;
    DOM.animDelay.value = element.animationDelay;
    DOM.animEasing.value = element.animationEasing;
    DOM.animExitEnabled.checked = element.exitAnimationEnabled;
    DOM.animExitType.value = element.exitAnimationType;
    DOM.animDisplayDuration.value = element.displayDuration;
    DOM.exitAnimOptions.classList.toggle('hidden', !element.exitAnimationEnabled);
    DOM.exitAnimDuration.classList.toggle('hidden', !element.exitAnimationEnabled);
}

// Rendering
function renderElementList() {
    if (AppState.elements.length === 0) {
        DOM.elementList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📦</span>
                <p>Zadne elementy</p>
                <small>Klikni + pro pridani</small>
            </div>
        `;
        return;
    }

    DOM.elementList.innerHTML = AppState.elements.map(el => `
        <div class="element-item ${AppState.selectedElement === el.id ? 'selected' : ''}"
             data-id="${el.id}"
             draggable="true">
            <span class="element-icon">${el.type === 'text' ? 'T' : el.type === 'image' ? '🖼️' : '⬜'}</span>
            <span class="element-name">${escapeHtml(el.name)}</span>
            <div class="element-actions">
                <button class="btn btn-icon" onclick="event.stopPropagation(); duplicateElement('${el.id}')" title="Duplikovat">📋</button>
                <button class="btn btn-icon btn-danger" onclick="event.stopPropagation(); removeElement('${el.id}')" title="Smazat">🗑</button>
            </div>
        </div>
    `).join('');

    // Add click listeners
    DOM.elementList.querySelectorAll('.element-item').forEach(item => {
        item.addEventListener('click', () => selectElement(item.dataset.id));
    });
}

function renderCanvasElement(element) {
    if (!DOM.canvas) {
        console.error('Canvas not found!');
        return;
    }

    let domElement = DOM.canvas.querySelector(`[data-id="${element.id}"]`);

    if (!domElement) {
        domElement = document.createElement('div');
        domElement.className = 'canvas-element';
        domElement.dataset.id = element.id;
        domElement.dataset.type = element.type; // Add type for CSS styling
        domElement.innerHTML = `
            <div class="resize-handle nw"></div>
            <div class="resize-handle ne"></div>
            <div class="resize-handle sw"></div>
            <div class="resize-handle se"></div>
        `;
        DOM.canvas.appendChild(domElement);
        setupElementDrag(domElement);
        console.log('Created canvas element:', element.id, 'at', element.x, element.y);
    }

    // Position & Size
    domElement.style.left = `${element.x}px`;
    domElement.style.top = `${element.y}px`;
    domElement.style.width = `${element.width}px`;
    domElement.style.height = `${element.height}px`;

    // Background
    if (element.bgType === 'none') {
        domElement.style.background = 'transparent';
    } else if (element.bgType === 'solid') {
        const opacity = element.bgOpacity / 100;
        domElement.style.background = hexToRgba(element.bgColor, opacity);
    } else if (element.bgType === 'gradient') {
        domElement.style.background = `linear-gradient(135deg, ${element.gradient1}, ${element.gradient2})`;
    } else if (element.bgType === 'image' && element.imageSrc) {
        domElement.style.background = `url(${element.imageSrc}) center/cover no-repeat`;
    }

    // Border
    domElement.style.border = element.borderWidth > 0
        ? `${element.borderWidth}px solid ${element.borderColor}`
        : 'none';
    domElement.style.borderRadius = `${element.borderRadius}px`;

    // Shadow
    if (element.shadowEnabled) {
        domElement.style.boxShadow = `${element.shadowX}px ${element.shadowY}px ${element.shadowBlur}px ${element.shadowColor}`;
    } else {
        domElement.style.boxShadow = 'none';
    }

    // Text content
    let contentEl = domElement.querySelector('.element-content');
    if (!contentEl) {
        contentEl = document.createElement('div');
        contentEl.className = 'element-content';
        contentEl.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;';
        domElement.insertBefore(contentEl, domElement.firstChild);
    }

    if (element.type === 'text') {
        contentEl.innerHTML = `<span style="
            font-family: ${element.fontFamily};
            font-size: ${element.fontSize}px;
            color: ${element.textColor};
            text-align: ${element.textAlign};
            font-weight: ${element.fontWeight};
            font-style: ${element.fontStyle};
            text-decoration: ${element.textDecoration};
            word-wrap: break-word;
            padding: 10px;
            width: 100%;
        ">${escapeHtml(element.text)}</span>`;
    } else if (element.type === 'image' && element.imageSrc) {
        contentEl.innerHTML = `<img src="${element.imageSrc}" style="max-width:100%;max-height:100%;object-fit:contain;">`;
    } else {
        contentEl.innerHTML = '';
    }

    // Selection state
    domElement.classList.toggle('selected', AppState.selectedElement === element.id);
}

function setupElementDrag(domElement) {
    let startX, startY, startElX, startElY;
    let resizeHandle = null;
    let startWidth, startHeight;

    const onMouseDown = (e) => {
        if (e.target.classList.contains('resize-handle')) {
            resizeHandle = e.target;
            AppState.isResizing = true;
            const element = AppState.elements.find(el => el.id === domElement.dataset.id);
            startWidth = element.width;
            startHeight = element.height;
            startElX = element.x;
            startElY = element.y;
        } else {
            AppState.isDragging = true;
            const element = AppState.elements.find(el => el.id === domElement.dataset.id);
            startElX = element.x;
            startElY = element.y;
        }

        startX = e.clientX / AppState.canvas.zoom;
        startY = e.clientY / AppState.canvas.zoom;
        selectElement(domElement.dataset.id);

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    };

    const onMouseMove = (e) => {
        const element = AppState.elements.find(el => el.id === domElement.dataset.id);
        if (!element) return;

        const currentX = e.clientX / AppState.canvas.zoom;
        const currentY = e.clientY / AppState.canvas.zoom;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        if (AppState.isResizing && resizeHandle) {
            const handleClass = resizeHandle.className;

            if (handleClass.includes('se')) {
                element.width = Math.max(50, startWidth + deltaX);
                element.height = Math.max(50, startHeight + deltaY);
            } else if (handleClass.includes('sw')) {
                element.width = Math.max(50, startWidth - deltaX);
                element.height = Math.max(50, startHeight + deltaY);
                element.x = startElX + (startWidth - element.width);
            } else if (handleClass.includes('ne')) {
                element.width = Math.max(50, startWidth + deltaX);
                element.height = Math.max(50, startHeight - deltaY);
                element.y = startElY + (startHeight - element.height);
            } else if (handleClass.includes('nw')) {
                element.width = Math.max(50, startWidth - deltaX);
                element.height = Math.max(50, startHeight - deltaY);
                element.x = startElX + (startWidth - element.width);
                element.y = startElY + (startHeight - element.height);
            }
        } else if (AppState.isDragging) {
            element.x = Math.max(0, startElX + deltaX);
            element.y = Math.max(0, startElY + deltaY);
        }

        renderCanvasElement(element);
        updatePropertiesPanel();
    };

    const onMouseUp = () => {
        AppState.isDragging = false;
        AppState.isResizing = false;
        resizeHandle = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        saveToLocalStorage();
    };

    domElement.addEventListener('mousedown', onMouseDown);
}

// Canvas Management
function handleCanvasPresetChange() {
    const value = DOM.canvasPreset.value;

    if (value === 'custom') {
        DOM.canvasWidth.classList.remove('hidden');
        DOM.canvasHeight.classList.remove('hidden');
        document.querySelector('.size-separator').classList.remove('hidden');
    } else {
        DOM.canvasWidth.classList.add('hidden');
        DOM.canvasHeight.classList.add('hidden');
        document.querySelector('.size-separator').classList.add('hidden');

        const [width, height] = value.split('x').map(Number);
        DOM.canvasWidth.value = width;
        DOM.canvasHeight.value = height;
        updateCanvasSize();
        // Auto-fit when resolution changes
        zoomToFit();
    }
}

function updateCanvasSize() {
    AppState.canvas.width = parseInt(DOM.canvasWidth.value) || 1920;
    AppState.canvas.height = parseInt(DOM.canvasHeight.value) || 1080;

    DOM.canvas.style.width = `${AppState.canvas.width}px`;
    DOM.canvas.style.height = `${AppState.canvas.height}px`;

    applyZoom();
    saveToLocalStorage();
}

function setZoom(zoom) {
    AppState.canvas.zoom = Math.max(0.1, Math.min(2, zoom));
    applyZoom();
}

function applyZoom() {
    DOM.canvasWrapper.style.transform = `scale(${AppState.canvas.zoom})`;
    DOM.canvasWrapper.style.transformOrigin = 'center center';
    updateZoomDisplay();
}

function updateZoomDisplay() {
    DOM.zoomLevel.textContent = `${Math.round(AppState.canvas.zoom * 100)}%`;
}

function zoomToFit() {
    const containerWidth = DOM.canvasContainer.clientWidth - 40;
    const containerHeight = DOM.canvasContainer.clientHeight - 40;

    const scaleX = containerWidth / AppState.canvas.width;
    const scaleY = containerHeight / AppState.canvas.height;

    setZoom(Math.min(scaleX, scaleY, 1));
}

// Property Handlers
function handleBgTypeChange() {
    const type = DOM.propBgType.value;

    DOM.bgColorRow.classList.toggle('hidden', type === 'none' || type === 'gradient' || type === 'image');
    DOM.bgGradientRow.classList.toggle('hidden', type !== 'gradient');

    if (AppState.selectedElement) {
        updateElementProperty('bgType', type);
    }
}

function updateGradient() {
    updateElementProperty('gradient1', DOM.propGradient1.value);
    updateElementProperty('gradient2', DOM.propGradient2.value);
}

function handleShadowToggle() {
    const enabled = DOM.propShadowEnabled.checked;
    DOM.shadowOptions.style.opacity = enabled ? '1' : '0.5';
    DOM.shadowOptions2.style.opacity = enabled ? '1' : '0.5';

    if (AppState.selectedElement) {
        updateElementProperty('shadowEnabled', enabled);
    }
}

function updateShadow() {
    if (!AppState.selectedElement || !DOM.propShadowEnabled.checked) return;

    const element = AppState.elements.find(e => e.id === AppState.selectedElement);
    if (!element) return;

    element.shadowX = parseInt(DOM.propShadowX.value);
    element.shadowY = parseInt(DOM.propShadowY.value);
    element.shadowBlur = parseInt(DOM.propShadowBlur.value);
    element.shadowColor = DOM.propShadowColor.value;

    renderCanvasElement(element);
    saveToLocalStorage();
}

function handleTimerToggle() {
    if (!DOM.timerEnabled || !DOM.timerOptions) return;
    const enabled = DOM.timerEnabled.checked;
    AppState.timer.enabled = enabled;
    DOM.timerOptions.classList.toggle('enabled', enabled);
}

function handleTimerPresetChange() {
    const value = DOM.timerPreset.value;

    if (value === 'custom') {
        DOM.customIntervalRow.classList.remove('hidden');
    } else {
        DOM.customIntervalRow.classList.add('hidden');
        AppState.timer.interval = parseInt(value);
    }
}

// Image Handling
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processImageFile(file);
    }
}

function handleImageDrop(e) {
    e.preventDefault();
    DOM.uploadZone.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processImageFile(file);
    }
}

function processImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        addElement('image', {
            imageSrc: e.target.result,
            bgType: 'none',
            name: file.name.split('.')[0]
        });
        hideModal('imageModal');
    };
    reader.readAsDataURL(file);
}

function handleImageUrl() {
    const url = DOM.imageUrl.value.trim();
    if (url) {
        addElement('image', {
            imageSrc: url,
            bgType: 'none',
            name: 'Image'
        });
        hideModal('imageModal');
        DOM.imageUrl.value = '';
    }
}

// Tab Management
function switchTab(tabId) {
    DOM.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    DOM.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
}

// Modal Management
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Test & Preview
function runTest() {
    // Play animation on all elements in sequence
    const canvasElements = DOM.canvas.querySelectorAll('.canvas-element');

    canvasElements.forEach((domEl, index) => {
        const element = AppState.elements.find(e => e.id === domEl.dataset.id);
        if (!element) return;

        const animInfo = ANIMATION_MAP[element.animationType];
        if (!animInfo) return;

        // Reset and play animation
        domEl.style.animation = 'none';
        domEl.offsetHeight; // Trigger reflow

        const enterAnim = `${animInfo.enter} ${element.animationDuration}ms ${element.animationEasing} ${element.animationDelay + (index * 100)}ms forwards`;
        domEl.style.animation = enterAnim;

        // Exit animation if enabled
        if (element.exitAnimationEnabled) {
            const exitAnim = element.exitAnimationType === 'same'
                ? animInfo.exit
                : ANIMATION_MAP[element.exitAnimationType.replace('Out', 'In')]?.exit || 'fadeOut';

            setTimeout(() => {
                domEl.style.animation = `${exitAnim} ${element.animationDuration}ms ${element.animationEasing} forwards`;

                // Reset after exit
                setTimeout(() => {
                    domEl.style.animation = '';
                }, element.animationDuration);
            }, element.animationDelay + element.displayDuration);
        } else {
            // Just reset animation state
            setTimeout(() => {
                domEl.style.animation = '';
            }, element.animationDuration + element.animationDelay + 100);
        }
    });

    showToast('Test spusten', 'info');
}

function openPreview() {
    const html = generatePreviewHTML();

    // Close existing preview window if open
    if (AppState.previewWindow && !AppState.previewWindow.closed) {
        AppState.previewWindow.close();
    }

    // Open new window with exact canvas size
    AppState.previewWindow = window.open('', 'AdAnimations Preview',
        `width=${AppState.canvas.width},height=${AppState.canvas.height},menubar=no,toolbar=no,location=no,status=no`
    );

    if (AppState.previewWindow) {
        AppState.previewWindow.document.write(html);
        AppState.previewWindow.document.close();
        showToast('Preview otevreno v novem okne', 'success');
    } else {
        showToast('Nepodarilo se otevrit preview okno. Povolte pop-up okna.', 'error');
    }
}

function generatePreviewHTML() {
    const elements = AppState.elements;
    const width = AppState.canvas.width;
    const height = AppState.canvas.height;

    // Generate element styles and HTML
    let elementsHTML = '';
    let elementsCSS = '';

    elements.forEach((el, index) => {
        const animInfo = ANIMATION_MAP[el.animationType];
        const enterAnim = animInfo ? animInfo.enter : 'fadeIn';
        const isContinuous = animInfo && animInfo.continuous;
        const exitAnim = el.exitAnimationType === 'same'
            ? (animInfo ? animInfo.exit : 'fadeOut')
            : (ANIMATION_MAP[el.exitAnimationType.replace('slide', 'slide')]?.exit || 'fadeOut');

        // Background style
        let bgStyle = '';
        if (el.bgType === 'none') {
            bgStyle = 'transparent';
        } else if (el.bgType === 'solid') {
            bgStyle = hexToRgba(el.bgColor, el.bgOpacity / 100);
        } else if (el.bgType === 'gradient') {
            bgStyle = `linear-gradient(135deg, ${el.gradient1}, ${el.gradient2})`;
        } else if (el.bgType === 'image' && el.imageSrc) {
            bgStyle = `url(${el.imageSrc}) center/cover no-repeat`;
        }

        // Shadow style
        const shadowStyle = el.shadowEnabled
            ? `${el.shadowX}px ${el.shadowY}px ${el.shadowBlur}px ${el.shadowColor}`
            : 'none';

        // Border style
        const borderStyle = el.borderWidth > 0
            ? `${el.borderWidth}px solid ${el.borderColor}`
            : 'none';

        // Animation string - continuous animations loop infinitely
        const animationStr = isContinuous
            ? `${enterAnim} ${el.animationDuration}ms ${el.animationEasing} ${el.animationDelay}ms infinite`
            : `${enterAnim} ${el.animationDuration}ms ${el.animationEasing} ${el.animationDelay}ms forwards`;

        elementsCSS += `
            .element-${index} {
                position: absolute;
                left: ${el.x}px;
                top: ${el.y}px;
                width: ${el.width}px;
                height: ${el.height}px;
                background: ${bgStyle};
                border: ${borderStyle};
                border-radius: ${el.borderRadius}px;
                box-shadow: ${shadowStyle};
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: ${isContinuous ? '1' : '0'};
                animation: ${animationStr};
            }
            ${el.exitAnimationEnabled ? `
            .element-${index}.exit {
                animation: ${exitAnim} ${el.animationDuration}ms ${el.animationEasing} forwards;
            }` : ''}
        `;

        let contentHTML = '';
        if (el.type === 'text') {
            contentHTML = `<span style="
                font-family: ${el.fontFamily};
                font-size: ${el.fontSize}px;
                color: ${el.textColor};
                text-align: ${el.textAlign};
                font-weight: ${el.fontWeight};
                font-style: ${el.fontStyle};
                text-decoration: ${el.textDecoration};
                padding: 10px;
                width: 100%;
            ">${escapeHtml(el.text)}</span>`;
        } else if (el.type === 'image' && el.imageSrc) {
            contentHTML = `<img src="${el.imageSrc}" style="max-width:100%;max-height:100%;object-fit:contain;">`;
        }

        elementsHTML += `<div class="element-${index}" data-exit="${el.exitAnimationEnabled}" data-display="${el.displayDuration}">${contentHTML}</div>\n`;
    });

    // Animation keyframes - ALL animations including special effects
    const keyframes = `
        /* Basic animations */
        @keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes bounce { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.1); } 70% { transform: scale(0.95); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes rotateIn { from { transform: rotate(-180deg) scale(0); opacity: 0; } to { transform: rotate(0) scale(1); opacity: 1; } }

        /* Exit animations */
        @keyframes slideOutLeft { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-100%); opacity: 0; } }
        @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        @keyframes slideOutUp { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-100%); opacity: 0; } }
        @keyframes slideOutDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes zoomOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0); opacity: 0; } }

        /* Special effects - Pulse */
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.9; }
        }

        /* Neon glow pulse */
        @keyframes neonPulse {
            0%, 100% { box-shadow: 0 0 5px currentColor, 0 0 10px currentColor, 0 0 20px currentColor; opacity: 1; }
            50% { box-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor, 0 0 80px currentColor; opacity: 0.95; }
        }

        /* Shake */
        @keyframes shake {
            0%, 100% { transform: translateX(0); opacity: 1; }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        /* Wobble */
        @keyframes wobble {
            0%, 100% { transform: translateX(0) rotate(0); opacity: 1; }
            15% { transform: translateX(-10px) rotate(-5deg); }
            30% { transform: translateX(8px) rotate(3deg); }
            45% { transform: translateX(-6px) rotate(-3deg); }
            60% { transform: translateX(4px) rotate(2deg); }
            75% { transform: translateX(-2px) rotate(-1deg); }
        }

        /* Glitch */
        @keyframes glitchIn {
            0% { opacity: 0; transform: translate(-20px, 0); filter: blur(10px); }
            20% { transform: translate(15px, 0); filter: blur(5px) hue-rotate(90deg); }
            40% { transform: translate(-10px, 0); filter: blur(3px) hue-rotate(180deg); }
            60% { transform: translate(5px, 0); filter: blur(1px) hue-rotate(270deg); }
            80% { transform: translate(-2px, 0); filter: none; }
            100% { opacity: 1; transform: translate(0); filter: none; }
        }

        /* Flip */
        @keyframes flipIn {
            from { transform: perspective(400px) rotateY(90deg); opacity: 0; }
            to { transform: perspective(400px) rotateY(0); opacity: 1; }
        }
        @keyframes flipOut {
            from { transform: perspective(400px) rotateY(0); opacity: 1; }
            to { transform: perspective(400px) rotateY(90deg); opacity: 0; }
        }

        /* Elastic */
        @keyframes elasticIn {
            0% { transform: scale(0); opacity: 0; }
            55% { transform: scale(1.1); }
            70% { transform: scale(0.95); }
            85% { transform: scale(1.02); }
            100% { transform: scale(1); opacity: 1; }
        }

        /* Swing */
        @keyframes swingIn {
            0% { transform: rotateX(-90deg); transform-origin: top; opacity: 0; }
            100% { transform: rotateX(0); transform-origin: top; opacity: 1; }
        }

        /* Float (continuous) */
        @keyframes float {
            0%, 100% { transform: translateY(0); opacity: 1; }
            50% { transform: translateY(-10px); }
        }
    `;

    // Timer script
    const timerScript = AppState.timer.enabled ? `
        function runAnimation() {
            document.querySelectorAll('[data-exit]').forEach(el => {
                el.classList.remove('exit');
                el.style.animation = 'none';
                el.offsetHeight;
                el.style.animation = '';

                if (el.dataset.exit === 'true') {
                    const displayTime = parseInt(el.dataset.display) || 5000;
                    setTimeout(() => {
                        el.classList.add('exit');
                    }, displayTime);
                }
            });
        }

        runAnimation();
        const interval = ${AppState.timer.interval}${AppState.timer.randomize ? ' + (Math.random() - 0.5) * 60000' : ''};
        setInterval(runAnimation, interval);
    ` : `
        document.querySelectorAll('[data-exit="true"]').forEach(el => {
            const displayTime = parseInt(el.dataset.display) || 5000;
            setTimeout(() => {
                el.classList.add('exit');
            }, displayTime);
        });
    `;

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AdAnimations Preview</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
            width: ${width}px;
            height: ${height}px;
            overflow: hidden;
            background: transparent;
        }
        body {
            position: relative;
        }
        ${keyframes}
        ${elementsCSS}
    </style>
</head>
<body>
${elementsHTML}
<script>
// Debug: log canvas size
console.log('Preview size: ${width}x${height}');
console.log('Elements: ${elements.length}');

${timerScript}
</script>
</body>
</html>`;
}

// Export
function showExportModal() {
    showModal('exportModal');
    generateExportCode();
}

function generateExportCode() {
    const includeTimer = DOM.exportWithTimer.checked;
    const minify = DOM.exportMinified.checked;

    // Temporarily override timer setting for export
    const originalTimerEnabled = AppState.timer.enabled;
    AppState.timer.enabled = includeTimer && originalTimerEnabled;

    let html = generatePreviewHTML();

    AppState.timer.enabled = originalTimerEnabled;

    if (minify) {
        html = html
            .replace(/\n\s+/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .replace(/>\s+</g, '><')
            .trim();
    }

    DOM.exportCode.value = html;
}

function copyExportCode() {
    DOM.exportCode.select();
    document.execCommand('copy');
    showToast('Kod zkopirovan do schranky', 'success');
}

function downloadHTML() {
    const html = DOM.exportCode.value;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'adanimations-export.html';
    a.click();

    URL.revokeObjectURL(url);
    showToast('HTML soubor stazen', 'success');
}

function copyOBSUrl() {
    // For local file, we can't provide a URL
    // Show instructions instead
    showToast('Pouzijte Export HTML a vyberte "Local file" v OBS Browser Source', 'info');
}

// Project Management
function newProject() {
    if (AppState.elements.length > 0) {
        if (!confirm('Opravdu chcete vytvorit novy projekt? Neulozene zmeny budou ztraceny.')) {
            return;
        }
    }

    // Clear all state
    AppState.elements = [];
    AppState.selectedElement = null;
    AppState.elementIdCounter = 0;
    AppState.sequencer.groups = [];
    AppState.sequencer.enabled = false;
    AppState.groupIdCounter = 0;

    // Clear canvas elements
    if (DOM.canvas) {
        DOM.canvas.querySelectorAll('.canvas-element').forEach(el => el.remove());
    }

    renderElementList();
    selectElement(null);
    localStorage.removeItem('adanimations_project');

    // Reset canvas size
    AppState.canvas.width = 1920;
    AppState.canvas.height = 1080;
    AppState.canvas.zoom = 0.5;
    if (DOM.canvasWidth) DOM.canvasWidth.value = 1920;
    if (DOM.canvasHeight) DOM.canvasHeight.value = 1080;
    updateCanvasSize();

    showToast('Novy projekt vytvoren', 'success');
    console.log('Project reset', AppState);
}

function saveProject() {
    const project = {
        version: '1.0',
        canvas: AppState.canvas,
        elements: AppState.elements,
        animation: AppState.animation,
        timer: AppState.timer,
        elementIdCounter: AppState.elementIdCounter
    };

    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'adanimations-project.json';
    a.click();

    URL.revokeObjectURL(url);
    showToast('Projekt ulozen', 'success');
}

function loadProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target.result);

                if (project.version && project.elements) {
                    // Clear current project
                    DOM.canvas.querySelectorAll('.canvas-element').forEach(el => el.remove());

                    // Load project data
                    AppState.canvas = project.canvas || AppState.canvas;
                    AppState.elements = project.elements || [];
                    AppState.animation = project.animation || AppState.animation;
                    AppState.timer = project.timer || AppState.timer;
                    AppState.elementIdCounter = project.elementIdCounter || 0;

                    // Update UI
                    DOM.canvasWidth.value = AppState.canvas.width;
                    DOM.canvasHeight.value = AppState.canvas.height;
                    updateCanvasSize();
                    setZoom(AppState.canvas.zoom);

                    // Render elements
                    renderElementList();
                    AppState.elements.forEach(el => renderCanvasElement(el));

                    // Update timer UI
                    DOM.timerEnabled.checked = AppState.timer.enabled;
                    handleTimerToggle();

                    selectElement(null);
                    saveToLocalStorage();

                    showToast('Projekt nacten', 'success');
                } else {
                    throw new Error('Invalid project format');
                }
            } catch (err) {
                showToast('Chyba pri nacitani projektu: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

// Local Storage
function saveToLocalStorage() {
    const project = {
        canvas: AppState.canvas,
        elements: AppState.elements,
        animation: AppState.animation,
        timer: AppState.timer,
        elementIdCounter: AppState.elementIdCounter
    };
    localStorage.setItem('adanimations_project', JSON.stringify(project));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('adanimations_project');
    if (saved) {
        try {
            const project = JSON.parse(saved);

            AppState.canvas = project.canvas || AppState.canvas;
            AppState.elements = project.elements || [];
            AppState.animation = project.animation || AppState.animation;
            AppState.timer = project.timer || AppState.timer;
            AppState.elementIdCounter = project.elementIdCounter || 0;

            DOM.canvasWidth.value = AppState.canvas.width;
            DOM.canvasHeight.value = AppState.canvas.height;

            // Update preset dropdown to match
            const presetValue = `${AppState.canvas.width}x${AppState.canvas.height}`;
            const presetOption = Array.from(DOM.canvasPreset.options).find(o => o.value === presetValue);
            if (presetOption) {
                DOM.canvasPreset.value = presetValue;
            } else {
                DOM.canvasPreset.value = 'custom';
                DOM.canvasWidth.classList.remove('hidden');
                DOM.canvasHeight.classList.remove('hidden');
                const separator = document.querySelector('.size-separator');
                if (separator) separator.classList.remove('hidden');
            }

            updateCanvasSize();
            setZoom(AppState.canvas.zoom || 0.5);

            renderElementList();
            AppState.elements.forEach(el => renderCanvasElement(el));

            if (DOM.timerEnabled) {
                DOM.timerEnabled.checked = AppState.timer.enabled;
                handleTimerToggle();
            }
        } catch (err) {
            console.error('Failed to load from localStorage:', err);
        }
    }
}

// Keyboard Shortcuts
function handleKeyboard(e) {
    // Delete selected element
    if (e.key === 'Delete' && AppState.selectedElement) {
        removeElement(AppState.selectedElement);
    }

    // Escape to deselect
    if (e.key === 'Escape') {
        selectElement(null);
        hideModal('imageModal');
        hideModal('exportModal');
    }

    // Ctrl+S to save
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveProject();
    }

    // Ctrl+D to duplicate
    if (e.ctrlKey && e.key === 'd' && AppState.selectedElement) {
        e.preventDefault();
        duplicateElement(AppState.selectedElement);
    }

    // Arrow keys to move element
    if (AppState.selectedElement && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const element = AppState.elements.find(el => el.id === AppState.selectedElement);
        if (element) {
            const step = e.shiftKey ? 10 : 1;
            switch (e.key) {
                case 'ArrowUp': element.y -= step; break;
                case 'ArrowDown': element.y += step; break;
                case 'ArrowLeft': element.x -= step; break;
                case 'ArrowRight': element.x += step; break;
            }
            renderCanvasElement(element);
            updatePropertiesPanel();
            saveToLocalStorage();
        }
    }
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
        <span>${escapeHtml(message)}</span>
    `;

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// CONTEXT MENU
// ========================================
function createContextMenu(x, y, elementId) {
    removeContextMenu();

    const element = AppState.elements.find(e => e.id === elementId);
    if (!element) return;

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id = 'contextMenu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    menu.innerHTML = `
        <div class="context-menu-item" data-action="edit">
            <span class="menu-icon">✏️</span>
            <span>Upravit text</span>
            <span class="menu-shortcut">Dbl-Click</span>
        </div>
        <div class="context-menu-item" data-action="duplicate">
            <span class="menu-icon">📋</span>
            <span>Duplikovat</span>
            <span class="menu-shortcut">Ctrl+D</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item context-menu-submenu" data-action="animation">
            <span class="menu-icon">🎬</span>
            <span>Animace</span>
            <div class="context-submenu context-menu">
                <div class="context-menu-item" data-action="anim-slideLeft">Slide zleva</div>
                <div class="context-menu-item" data-action="anim-slideRight">Slide zprava</div>
                <div class="context-menu-item" data-action="anim-fadeIn">Fade In</div>
                <div class="context-menu-item" data-action="anim-bounce">Bounce</div>
                <div class="context-menu-item" data-action="anim-glitch">Glitch</div>
                <div class="context-menu-item" data-action="anim-pulse">Pulse</div>
            </div>
        </div>
        <div class="context-menu-item context-menu-submenu" data-action="style">
            <span class="menu-icon">🎨</span>
            <span>Rychly styl</span>
            <div class="context-submenu context-menu">
                <div class="context-menu-item" data-action="style-neon">Neon Glow</div>
                <div class="context-menu-item" data-action="style-glass">Glass Effect</div>
                <div class="context-menu-item" data-action="style-minimal">Minimal</div>
                <div class="context-menu-item" data-action="style-cyber">Cyber</div>
            </div>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" data-action="bringFront">
            <span class="menu-icon">⬆️</span>
            <span>Do popredi</span>
        </div>
        <div class="context-menu-item" data-action="sendBack">
            <span class="menu-icon">⬇️</span>
            <span>Do pozadi</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item danger" data-action="delete">
            <span class="menu-icon">🗑️</span>
            <span>Smazat</span>
            <span class="menu-shortcut">Del</span>
        </div>
    `;

    document.body.appendChild(menu);
    AppState.contextMenu = menu;

    // Adjust position if menu goes off screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        menu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = `${y - rect.height}px`;
    }

    // Handle menu item clicks
    menu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            handleContextMenuAction(action, elementId);
        });
    });

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', removeContextMenu, { once: true });
    }, 10);
}

function removeContextMenu() {
    if (AppState.contextMenu) {
        AppState.contextMenu.remove();
        AppState.contextMenu = null;
    }
}

function handleContextMenuAction(action, elementId) {
    removeContextMenu();

    const element = AppState.elements.find(e => e.id === elementId);
    if (!element) return;

    switch (action) {
        case 'edit':
            if (element.type === 'text') {
                startInlineEdit(elementId);
            }
            break;
        case 'duplicate':
            duplicateElement(elementId);
            break;
        case 'delete':
            removeElement(elementId);
            break;
        case 'bringFront':
            bringToFront(elementId);
            break;
        case 'sendBack':
            sendToBack(elementId);
            break;
        // Animation shortcuts
        case 'anim-slideLeft':
        case 'anim-slideRight':
        case 'anim-fadeIn':
        case 'anim-bounce':
        case 'anim-glitch':
        case 'anim-pulse':
            const animType = action.replace('anim-', '');
            element.animationType = animType;
            renderCanvasElement(element);
            updatePropertiesPanel();
            saveToLocalStorage();
            showToast(`Animace: ${animType}`, 'success');
            break;
        // Style shortcuts
        case 'style-neon':
            applyQuickStyle(element, 'neon');
            break;
        case 'style-glass':
            applyQuickStyle(element, 'glass');
            break;
        case 'style-minimal':
            applyQuickStyle(element, 'minimal');
            break;
        case 'style-cyber':
            applyQuickStyle(element, 'cyber');
            break;
    }
}

function applyQuickStyle(element, style) {
    switch (style) {
        case 'neon':
            element.borderWidth = 2;
            element.borderColor = '#8b5cf6';
            element.shadowEnabled = true;
            element.shadowX = 0;
            element.shadowY = 0;
            element.shadowBlur = 20;
            element.shadowColor = '#8b5cf6';
            element.bgType = 'solid';
            element.bgColor = '#1a1a2e';
            element.bgOpacity = 90;
            if (element.type === 'text') {
                element.textColor = '#8b5cf6';
            }
            break;
        case 'glass':
            element.bgType = 'solid';
            element.bgColor = '#ffffff';
            element.bgOpacity = 10;
            element.borderWidth = 1;
            element.borderColor = '#ffffff';
            element.borderRadius = 16;
            element.shadowEnabled = true;
            element.shadowX = 0;
            element.shadowY = 8;
            element.shadowBlur = 32;
            element.shadowColor = '#000000';
            break;
        case 'minimal':
            element.bgType = 'none';
            element.borderWidth = 0;
            element.shadowEnabled = true;
            element.shadowX = 2;
            element.shadowY = 2;
            element.shadowBlur = 4;
            element.shadowColor = '#000000';
            if (element.type === 'text') {
                element.textColor = '#ffffff';
            }
            break;
        case 'cyber':
            element.bgType = 'gradient';
            element.gradient1 = '#0f0f23';
            element.gradient2 = '#1a1a3e';
            element.borderWidth = 1;
            element.borderColor = '#06b6d4';
            element.borderRadius = 4;
            element.shadowEnabled = true;
            element.shadowX = 0;
            element.shadowY = 0;
            element.shadowBlur = 15;
            element.shadowColor = '#06b6d4';
            if (element.type === 'text') {
                element.textColor = '#06b6d4';
            }
            break;
    }

    renderCanvasElement(element);
    updatePropertiesPanel();
    saveToLocalStorage();
    showToast(`Styl: ${style}`, 'success');
}

function bringToFront(elementId) {
    const index = AppState.elements.findIndex(e => e.id === elementId);
    if (index !== -1 && index < AppState.elements.length - 1) {
        const element = AppState.elements.splice(index, 1)[0];
        AppState.elements.push(element);
        reorderCanvasElements();
        saveToLocalStorage();
    }
}

function sendToBack(elementId) {
    const index = AppState.elements.findIndex(e => e.id === elementId);
    if (index > 0) {
        const element = AppState.elements.splice(index, 1)[0];
        AppState.elements.unshift(element);
        reorderCanvasElements();
        saveToLocalStorage();
    }
}

function reorderCanvasElements() {
    AppState.elements.forEach((element, index) => {
        const domElement = DOM.canvas.querySelector(`[data-id="${element.id}"]`);
        if (domElement) {
            domElement.style.zIndex = index + 1;
        }
    });
    renderElementList();
}

// ========================================
// INLINE TEXT EDITING
// ========================================
function startInlineEdit(elementId) {
    const element = AppState.elements.find(e => e.id === elementId);
    if (!element || element.type !== 'text') return;

    const domElement = DOM.canvas.querySelector(`[data-id="${elementId}"]`);
    if (!domElement) return;

    // Mark as editing
    AppState.editingElement = elementId;
    domElement.classList.add('editing');

    // Create textarea for editing
    const contentEl = domElement.querySelector('.element-content');
    const originalText = element.text;

    const editor = document.createElement('div');
    editor.className = 'inline-editor';
    editor.innerHTML = `<textarea spellcheck="false">${escapeHtml(originalText)}</textarea>`;

    const textarea = editor.querySelector('textarea');
    textarea.style.fontFamily = element.fontFamily;
    textarea.style.fontSize = `${element.fontSize}px`;
    textarea.style.color = element.textColor;
    textarea.style.textAlign = element.textAlign;
    textarea.style.fontWeight = element.fontWeight;
    textarea.style.fontStyle = element.fontStyle;

    contentEl.innerHTML = '';
    contentEl.appendChild(editor);

    // Focus and select all
    textarea.focus();
    textarea.select();

    // Handle save on blur or Enter
    const saveEdit = () => {
        const newText = textarea.value;
        element.text = newText;
        AppState.editingElement = null;
        domElement.classList.remove('editing');
        renderCanvasElement(element);
        updatePropertiesPanel();
        saveToLocalStorage();
    };

    textarea.addEventListener('blur', saveEdit);
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            textarea.blur();
        }
        if (e.key === 'Escape') {
            element.text = originalText;
            AppState.editingElement = null;
            domElement.classList.remove('editing');
            renderCanvasElement(element);
        }
        e.stopPropagation();
    });
}

// ========================================
// TEMPLATES
// ========================================
function addFromTemplate(templateKey) {
    const template = TEMPLATES[templateKey];
    if (!template) return;

    const options = {
        name: template.name,
        width: template.width,
        height: template.height,
        bgType: template.bgType,
        bgColor: template.bgColor || '#333333',
        bgOpacity: template.bgOpacity !== undefined ? template.bgOpacity : 100,
        gradient1: template.gradient1 || '#8b5cf6',
        gradient2: template.gradient2 || '#ec4899',
        borderWidth: template.borderWidth,
        borderColor: template.borderColor,
        borderRadius: template.borderRadius,
        shadowEnabled: template.shadowEnabled,
        shadowX: template.shadowX || 0,
        shadowY: template.shadowY || 0,
        shadowBlur: template.shadowBlur || 0,
        shadowColor: template.shadowColor || '#000000',
        text: template.text,
        textColor: template.textColor,
        fontSize: template.fontSize,
        fontFamily: template.fontFamily || 'Arial',
        fontWeight: template.fontWeight || 'normal',
        animationType: template.animationType,
        glowEnabled: template.glowEnabled || false
    };

    addElement('text', options);
    showToast(`Sablona: ${template.name}`, 'success');
}

function showTemplatesModal() {
    // Create modal dynamically
    let modal = document.getElementById('templatesModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'templatesModal';
        modal.innerHTML = `
            <div class="modal-content modal-templates">
                <div class="modal-header">
                    <h3>Vybrat sablonu</h3>
                    <button class="modal-close" onclick="hideModal('templatesModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="templates-categories">
                        <button class="template-category-btn active" data-cat="all">Vse</button>
                        <button class="template-category-btn" data-cat="neon">Neon</button>
                        <button class="template-category-btn" data-cat="minimal">Minimal</button>
                        <button class="template-category-btn" data-cat="gradient">Gradient</button>
                        <button class="template-category-btn" data-cat="cyber">Cyber</button>
                    </div>
                    <div class="templates-grid" id="templatesGrid"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Category filter
        modal.querySelectorAll('.template-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.template-category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderTemplatesGrid(btn.dataset.cat);
            });
        });
    }

    renderTemplatesGrid('all');
    showModal('templatesModal');
}

function renderTemplatesGrid(category) {
    const grid = document.getElementById('templatesGrid');
    if (!grid) return;

    grid.innerHTML = '';

    Object.entries(TEMPLATES).forEach(([key, template]) => {
        if (category !== 'all' && template.category !== category) return;

        const card = document.createElement('div');
        card.className = 'template-card';
        card.innerHTML = `
            <div class="template-preview ${key.replace(/([A-Z])/g, '-$1').toLowerCase()}">
            </div>
            <div class="template-name">${template.name}</div>
        `;
        card.addEventListener('click', () => {
            addFromTemplate(key);
            hideModal('templatesModal');
        });
        grid.appendChild(card);
    });
}

// ========================================
// ENHANCED SETUP - Add new event listeners
// ========================================
function setupEnhancedEventListeners() {
    // Context menu on canvas elements
    DOM.canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const element = e.target.closest('.canvas-element');
        if (element) {
            selectElement(element.dataset.id);
            createContextMenu(e.clientX, e.clientY, element.dataset.id);
        }
    });

    // Double-click for inline edit
    DOM.canvas.addEventListener('dblclick', (e) => {
        const element = e.target.closest('.canvas-element');
        if (element) {
            const el = AppState.elements.find(el => el.id === element.dataset.id);
            if (el && el.type === 'text') {
                startInlineEdit(element.dataset.id);
            }
        }
    });

    // Add template button if exists
    const btnAddTemplate = document.getElementById('btnAddTemplate');
    if (btnAddTemplate) {
        btnAddTemplate.addEventListener('click', showTemplatesModal);
    }

    // Close context menu on scroll
    DOM.canvasContainer.addEventListener('scroll', removeContextMenu);
}

// Call enhanced setup after main init
const originalInit = init;
init = function() {
    originalInit();
    setupEnhancedEventListeners();
};

// Make functions available globally for onclick handlers
window.removeElement = removeElement;
window.duplicateElement = duplicateElement;
window.addFromTemplate = addFromTemplate;
window.showTemplatesModal = showTemplatesModal;
window.hideModal = hideModal;

// ========================================
// SEQUENCER
// ========================================
function setupSequencerListeners() {
    const seqEnabled = document.getElementById('sequencerEnabled');
    const seqOptions = document.getElementById('sequencerOptions');
    const timelineContainer = document.getElementById('timelineContainer');
    const btnCreateGroup = document.getElementById('btnCreateGroup');
    const seqTotalDuration = document.getElementById('seqTotalDuration');
    const seqStagger = document.getElementById('seqStagger');
    const seqLoop = document.getElementById('seqLoop');
    const btnSeqPlay = document.getElementById('btnSeqPlay');
    const btnSeqPause = document.getElementById('btnSeqPause');
    const btnSeqStop = document.getElementById('btnSeqStop');

    if (seqEnabled) {
        seqEnabled.addEventListener('change', () => {
            AppState.sequencer.enabled = seqEnabled.checked;
            seqOptions.classList.toggle('enabled', seqEnabled.checked);
            timelineContainer.classList.toggle('hidden', !seqEnabled.checked);
            if (seqEnabled.checked) {
                renderSequenceList();
                renderTimeline();
            }
            saveToLocalStorage();
        });
    }

    if (btnCreateGroup) {
        btnCreateGroup.addEventListener('click', createGroup);
    }

    if (seqTotalDuration) {
        seqTotalDuration.addEventListener('change', () => {
            AppState.sequencer.totalDuration = parseInt(seqTotalDuration.value);
            renderTimeline();
            saveToLocalStorage();
        });
    }

    if (seqStagger) {
        seqStagger.addEventListener('change', () => {
            applyStaggerDelay(parseInt(seqStagger.value));
        });
    }

    if (seqLoop) {
        seqLoop.addEventListener('change', () => {
            AppState.sequencer.loop = seqLoop.checked;
            saveToLocalStorage();
        });
    }

    // Playback controls
    if (btnSeqPlay) btnSeqPlay.addEventListener('click', playSequence);
    if (btnSeqPause) btnSeqPause.addEventListener('click', pauseSequence);
    if (btnSeqStop) btnSeqStop.addEventListener('click', stopSequence);

    // Timeline controls
    const btnTimelinePlay = document.getElementById('btnTimelinePlay');
    if (btnTimelinePlay) {
        btnTimelinePlay.addEventListener('click', playSequence);
    }
}

function renderSequenceList() {
    const listEl = document.getElementById('sequenceList');
    if (!listEl) return;

    if (AppState.elements.length === 0) {
        listEl.innerHTML = '<p class="property-hint">Zadne elementy k sekvencovani.</p>';
        return;
    }

    // Sort elements by sequence order
    const sortedElements = [...AppState.elements].sort((a, b) =>
        (a.sequenceOrder || 0) - (b.sequenceOrder || 0)
    );

    listEl.innerHTML = sortedElements.map((el, index) => `
        <div class="sequence-item" data-id="${el.id}" draggable="true">
            <span class="seq-order">${index + 1}</span>
            <span class="seq-name">${escapeHtml(el.name)}</span>
            <div class="seq-delay">
                <input type="number" value="${el.sequenceDelay || 0}" min="0" max="10000" step="100"
                       onchange="updateSequenceDelay('${el.id}', this.value)">
                <span>ms</span>
            </div>
        </div>
    `).join('');

    // Setup drag-drop reordering
    setupSequenceDragDrop();
}

function setupSequenceDragDrop() {
    const items = document.querySelectorAll('.sequence-item');
    let draggedItem = null;

    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            draggedItem.classList.remove('dragging');
            items.forEach(i => i.classList.remove('drop-target'));
            draggedItem = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (item !== draggedItem) {
                item.classList.add('drop-target');
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drop-target');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedItem && item !== draggedItem) {
                const draggedId = draggedItem.dataset.id;
                const targetId = item.dataset.id;
                reorderSequence(draggedId, targetId);
            }
            item.classList.remove('drop-target');
        });
    });
}

function reorderSequence(draggedId, targetId) {
    const draggedEl = AppState.elements.find(e => e.id === draggedId);
    const targetEl = AppState.elements.find(e => e.id === targetId);

    if (!draggedEl || !targetEl) return;

    // Get current orders
    const sortedElements = [...AppState.elements].sort((a, b) =>
        (a.sequenceOrder || 0) - (b.sequenceOrder || 0)
    );

    const draggedIndex = sortedElements.findIndex(e => e.id === draggedId);
    const targetIndex = sortedElements.findIndex(e => e.id === targetId);

    // Reorder
    sortedElements.splice(draggedIndex, 1);
    sortedElements.splice(targetIndex, 0, draggedEl);

    // Update sequence orders
    sortedElements.forEach((el, index) => {
        el.sequenceOrder = index;
    });

    renderSequenceList();
    renderTimeline();
    saveToLocalStorage();
}

function updateSequenceDelay(elementId, delay) {
    const element = AppState.elements.find(e => e.id === elementId);
    if (element) {
        element.sequenceDelay = parseInt(delay) || 0;
        renderTimeline();
        saveToLocalStorage();
    }
}

function applyStaggerDelay(stagger) {
    const sortedElements = [...AppState.elements].sort((a, b) =>
        (a.sequenceOrder || 0) - (b.sequenceOrder || 0)
    );

    sortedElements.forEach((el, index) => {
        el.sequenceDelay = index * stagger;
    });

    renderSequenceList();
    renderTimeline();
    saveToLocalStorage();
    showToast(`Stagger ${stagger}ms aplikovan`, 'success');
}

// Group Management
function createGroup() {
    const groupId = `group-${++AppState.groupIdCounter}`;
    const group = {
        id: groupId,
        name: `Skupina ${AppState.sequencer.groups.length + 1}`,
        elements: [],
        delay: 0
    };

    AppState.sequencer.groups.push(group);
    renderGroupsList();
    saveToLocalStorage();
    showToast('Skupina vytvorena', 'success');
}

function renderGroupsList() {
    const listEl = document.getElementById('groupsList');
    if (!listEl) return;

    if (AppState.sequencer.groups.length === 0) {
        listEl.innerHTML = '<p class="property-hint">Zadne skupiny.</p>';
        return;
    }

    listEl.innerHTML = AppState.sequencer.groups.map(group => {
        const groupElements = AppState.elements.filter(e => e.groupId === group.id);
        return `
            <div class="group-item" data-group-id="${group.id}">
                <div class="group-header">
                    <span class="group-name">${escapeHtml(group.name)}</span>
                    <div class="group-actions">
                        <button class="btn btn-icon btn-small" onclick="deleteGroup('${group.id}')" title="Smazat">🗑</button>
                    </div>
                </div>
                <div class="group-elements">
                    ${groupElements.map(el => `
                        <span class="group-element-tag" onclick="removeFromGroup('${el.id}')">${escapeHtml(el.name)} ×</span>
                    `).join('')}
                    <span class="group-element-tag add" onclick="showAddToGroupMenu('${group.id}', event)">+ Pridat</span>
                </div>
            </div>
        `;
    }).join('');
}

function deleteGroup(groupId) {
    const index = AppState.sequencer.groups.findIndex(g => g.id === groupId);
    if (index !== -1) {
        // Remove group ID from elements
        AppState.elements.forEach(el => {
            if (el.groupId === groupId) {
                el.groupId = null;
            }
        });
        AppState.sequencer.groups.splice(index, 1);
        renderGroupsList();
        renderTimeline();
        saveToLocalStorage();
    }
}

function addToGroup(elementId, groupId) {
    const element = AppState.elements.find(e => e.id === elementId);
    if (element) {
        element.groupId = groupId;
        renderGroupsList();
        renderSequenceList();
        renderTimeline();
        saveToLocalStorage();
    }
    removeContextMenu();
}

function removeFromGroup(elementId) {
    const element = AppState.elements.find(e => e.id === elementId);
    if (element) {
        element.groupId = null;
        renderGroupsList();
        renderSequenceList();
        renderTimeline();
        saveToLocalStorage();
    }
}

function showAddToGroupMenu(groupId, event) {
    event.stopPropagation();
    removeContextMenu();

    const ungroupedElements = AppState.elements.filter(e => !e.groupId);
    if (ungroupedElements.length === 0) {
        showToast('Zadne volne elementy', 'info');
        return;
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id = 'contextMenu';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    menu.innerHTML = ungroupedElements.map(el => `
        <div class="context-menu-item" onclick="addToGroup('${el.id}', '${groupId}')">
            ${escapeHtml(el.name)}
        </div>
    `).join('');

    document.body.appendChild(menu);
    AppState.contextMenu = menu;

    setTimeout(() => {
        document.addEventListener('click', removeContextMenu, { once: true });
    }, 10);
}

// Timeline Visualization - shows entry, display, and exit phases
function renderTimeline() {
    const rulerEl = document.getElementById('timelineRuler');
    const tracksEl = document.getElementById('timelineTracks');
    if (!rulerEl || !tracksEl) return;

    // Calculate total duration based on all elements
    let maxEndTime = AppState.sequencer.totalDuration;
    AppState.elements.forEach(el => {
        const elementEndTime = (el.sequenceDelay || 0) + el.animationDuration +
            (el.exitAnimationEnabled ? el.displayDuration + el.animationDuration : 0);
        if (elementEndTime > maxEndTime) {
            maxEndTime = elementEndTime;
        }
    });

    const totalDuration = Math.max(maxEndTime + 1000, 5000); // Min 5s
    const pixelsPerMs = 0.1; // 100px per second
    const totalWidth = totalDuration * pixelsPerMs + 100;

    // Render ruler
    rulerEl.style.width = `${totalWidth}px`;
    let rulerHTML = '';
    for (let ms = 0; ms <= totalDuration; ms += 1000) {
        const x = 100 + ms * pixelsPerMs;
        const isMajor = ms % 5000 === 0;
        rulerHTML += `<div class="timeline-marker ${isMajor ? 'major' : ''}" style="left: ${x}px">
            ${ms >= 1000 ? (ms / 1000) + 's' : ''}
        </div>`;
    }
    rulerEl.innerHTML = rulerHTML;

    // Render tracks - show entry, display, and exit phases
    tracksEl.style.width = `${totalWidth}px`;
    const sortedElements = [...AppState.elements].sort((a, b) =>
        (a.sequenceOrder || 0) - (b.sequenceOrder || 0)
    );

    tracksEl.innerHTML = sortedElements.map((el) => {
        const startDelay = el.sequenceDelay || 0;
        const entryDuration = el.animationDuration;
        const displayDuration = el.displayDuration || 5000;
        const hasExit = el.exitAnimationEnabled;
        const groupIdx = el.groupId ? (AppState.sequencer.groups.findIndex(g => g.id === el.groupId) % 5) + 1 : 0;

        // Calculate positions
        const entryStart = 100 + startDelay * pixelsPerMs;
        const entryWidth = Math.max(8, entryDuration * pixelsPerMs);
        const displayStart = entryStart + entryWidth;
        const displayWidth = hasExit ? Math.max(8, displayDuration * pixelsPerMs) : 0;
        const exitStart = displayStart + displayWidth;
        const exitWidth = hasExit ? Math.max(8, entryDuration * pixelsPerMs) : 0;

        let clipsHTML = '';
        if (hasExit) {
            // Entry (green), Display (purple), Exit (red)
            clipsHTML += `<div class="timeline-clip" style="left:${entryStart}px;width:${entryWidth}px;background:linear-gradient(135deg,#10b981,#059669);" title="Vstup: ${entryDuration}ms">▶</div>`;
            clipsHTML += `<div class="timeline-clip group-${groupIdx || 1}" style="left:${displayStart}px;width:${displayWidth}px;" title="Zobrazeno: ${displayDuration}ms"></div>`;
            clipsHTML += `<div class="timeline-clip" style="left:${exitStart}px;width:${exitWidth}px;background:linear-gradient(135deg,#ef4444,#dc2626);" title="Odchod: ${entryDuration}ms">◀</div>`;
        } else {
            const totalClipWidth = Math.max(30, (entryDuration + 500) * pixelsPerMs);
            clipsHTML += `<div class="timeline-clip group-${groupIdx || 1}" style="left:${entryStart}px;width:${totalClipWidth}px" title="${el.name} - ${startDelay}ms"></div>`;
        }

        return `<div class="timeline-track"><span class="timeline-track-label" title="${escapeHtml(el.name)}">${escapeHtml(el.name)}</span>${clipsHTML}</div>`;
    }).join('');

    // Update time display
    const timeDisplay = document.getElementById('timelineTime');
    if (timeDisplay) timeDisplay.textContent = `0s / ${(totalDuration / 1000).toFixed(1)}s`;
    AppState.sequencer.totalDuration = totalDuration;
}

// Playback
let playbackInterval = null;
let playbackStartTime = 0;

function playSequence() {
    if (AppState.sequencer.isPlaying) return;

    AppState.sequencer.isPlaying = true;
    playbackStartTime = Date.now() - AppState.sequencer.currentTime;

    const btnPlay = document.getElementById('btnSeqPlay');
    const btnTimelinePlay = document.getElementById('btnTimelinePlay');
    if (btnPlay) btnPlay.classList.add('playing');
    if (btnTimelinePlay) btnTimelinePlay.classList.add('playing');

    // Animate elements based on sequence
    const sortedElements = [...AppState.elements].sort((a, b) =>
        (a.sequenceOrder || 0) - (b.sequenceOrder || 0)
    );

    sortedElements.forEach(el => {
        const domEl = DOM.canvas.querySelector(`[data-id="${el.id}"]`);
        if (!domEl) return;

        const animInfo = ANIMATION_MAP[el.animationType];
        if (!animInfo) return;

        // Reset animation
        domEl.style.animation = 'none';
        domEl.offsetHeight;

        // Apply animation with sequence delay
        const totalDelay = (el.sequenceDelay || 0) + el.animationDelay;
        const isContinuous = animInfo.continuous;
        const animStr = isContinuous
            ? `${animInfo.enter} ${el.animationDuration}ms ${el.animationEasing} ${totalDelay}ms infinite`
            : `${animInfo.enter} ${el.animationDuration}ms ${el.animationEasing} ${totalDelay}ms forwards`;

        domEl.style.animation = animStr;
    });

    // Update playhead
    playbackInterval = setInterval(() => {
        AppState.sequencer.currentTime = Date.now() - playbackStartTime;
        updatePlayhead();

        if (AppState.sequencer.currentTime >= AppState.sequencer.totalDuration) {
            if (AppState.sequencer.loop) {
                // Restart
                playbackStartTime = Date.now();
                AppState.sequencer.currentTime = 0;
                sortedElements.forEach(el => {
                    const domEl = DOM.canvas.querySelector(`[data-id="${el.id}"]`);
                    if (domEl) {
                        domEl.style.animation = 'none';
                        domEl.offsetHeight;
                        const animInfo = ANIMATION_MAP[el.animationType];
                        if (animInfo) {
                            const totalDelay = (el.sequenceDelay || 0) + el.animationDelay;
                            const isContinuous = animInfo.continuous;
                            const animStr = isContinuous
                                ? `${animInfo.enter} ${el.animationDuration}ms ${el.animationEasing} ${totalDelay}ms infinite`
                                : `${animInfo.enter} ${el.animationDuration}ms ${el.animationEasing} ${totalDelay}ms forwards`;
                            domEl.style.animation = animStr;
                        }
                    }
                });
            } else {
                stopSequence();
            }
        }
    }, 50);

    showToast('Sekvence spustena', 'info');
}

function pauseSequence() {
    if (!AppState.sequencer.isPlaying) return;

    AppState.sequencer.isPlaying = false;
    clearInterval(playbackInterval);

    const btnPlay = document.getElementById('btnSeqPlay');
    const btnTimelinePlay = document.getElementById('btnTimelinePlay');
    if (btnPlay) btnPlay.classList.remove('playing');
    if (btnTimelinePlay) btnTimelinePlay.classList.remove('playing');

    showToast('Sekvence pozastavena', 'info');
}

function stopSequence() {
    AppState.sequencer.isPlaying = false;
    AppState.sequencer.currentTime = 0;
    clearInterval(playbackInterval);

    const btnPlay = document.getElementById('btnSeqPlay');
    const btnTimelinePlay = document.getElementById('btnTimelinePlay');
    if (btnPlay) btnPlay.classList.remove('playing');
    if (btnTimelinePlay) btnTimelinePlay.classList.remove('playing');

    // Reset all animations
    AppState.elements.forEach(el => {
        const domEl = DOM.canvas.querySelector(`[data-id="${el.id}"]`);
        if (domEl) {
            domEl.style.animation = '';
        }
    });

    updatePlayhead();
}

function updatePlayhead() {
    const playhead = document.getElementById('timelinePlayhead');
    const timeDisplay = document.getElementById('timelineTime');

    if (playhead) {
        const pixelsPerMs = 0.1;
        playhead.style.left = `${100 + AppState.sequencer.currentTime * pixelsPerMs}px`;
    }

    if (timeDisplay) {
        const current = (AppState.sequencer.currentTime / 1000).toFixed(1);
        const total = (AppState.sequencer.totalDuration / 1000).toFixed(1);
        timeDisplay.textContent = `${current}s / ${total}s`;
    }
}

// Make sequencer functions global
window.updateSequenceDelay = updateSequenceDelay;
window.deleteGroup = deleteGroup;
window.addToGroup = addToGroup;
window.removeFromGroup = removeFromGroup;
window.showAddToGroupMenu = showAddToGroupMenu;

// Add sequencer setup to enhanced listeners
const originalSetupEnhanced = setupEnhancedEventListeners;
setupEnhancedEventListeners = function() {
    originalSetupEnhanced();
    setupSequencerListeners();
};
