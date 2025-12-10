/**
 * Rust Calculator - Main Script
 * Offline-first PWA for raid and crafting calculations
 * Using official RustLabs icons
 */

// Translations
const TRANSLATIONS = {
    en: {
        tab_raid: "Raid Calculator",
        tab_craft: "Crafting",
        tab_compare: "Compare",
        raid_target: "Raid Target",
        raid_results: "Raid Cost",
        cat_walls: "Walls",
        cat_doors: "Doors",
        cat_foundations: "Foundations",
        cat_floors: "Floors",
        cat_windows: "Windows",
        cat_deployables: "Deployables",
        quantity: "Quantity:",
        select_target: "Select a target to raid",
        best_option: "Most efficient:",
        craft_recipe: "Recipe",
        search_recipes: "Search recipes...",
        craft_amount: "Amount to craft:",
        raw_materials: "Raw Materials",
        select_recipe: "Select a recipe to craft",
        total_sulfur: "Total Sulfur:",
        compare_title: "Compare Raid Methods",
        compare_select: "Select building to compare:",
        col_method: "Method",
        col_quantity: "Quantity",
        col_sulfur: "Sulfur",
        col_efficiency: "Efficiency",
        quick_ref: "Quick Reference",
        export: "Export Data",
        import: "Import Data",
        export_success: "Data exported successfully!",
        import_success: "Data imported successfully!",
        import_error: "Error importing data"
    },
    cs: {
        tab_raid: "Raid kalkulator",
        tab_craft: "Crafting",
        tab_compare: "Porovnani",
        raid_target: "Cil raidu",
        raid_results: "Naklady raidu",
        cat_walls: "Zdi",
        cat_doors: "Dvere",
        cat_foundations: "Zaklady",
        cat_floors: "Podlahy",
        cat_windows: "Okna",
        cat_deployables: "Deployables",
        quantity: "Pocet:",
        select_target: "Vyber cil k raidovani",
        best_option: "Nejefektivnejsi:",
        craft_recipe: "Recept",
        search_recipes: "Hledat recepty...",
        craft_amount: "Pocet k vyrobe:",
        raw_materials: "Suroviny",
        select_recipe: "Vyber recept k vyrobe",
        total_sulfur: "Celkem sira:",
        compare_title: "Porovnani metod raidu",
        compare_select: "Vyber budovu k porovnani:",
        col_method: "Metoda",
        col_quantity: "Pocet",
        col_sulfur: "Sira",
        col_efficiency: "Efektivita",
        quick_ref: "Rychly prehled",
        export: "Exportovat data",
        import: "Importovat data",
        export_success: "Data uspesne exportovana!",
        import_success: "Data uspesne importovana!",
        import_error: "Chyba pri importu dat"
    }
};

// App State
const state = {
    language: 'en',
    selectedBuilding: null,
    selectedRecipe: null,
    targetQty: 1,
    craftQty: 1,
    currentCategory: 'wall',
    favorites: [],
    history: []
};

// Helper function to render icon (supports both URLs and emoji)
function renderIcon(iconSrc, className = 'icon', alt = '') {
    if (iconSrc && iconSrc.startsWith('http')) {
        return `<img class="${className}" src="${iconSrc}" alt="${alt}" loading="lazy" onerror="this.style.display='none'">`;
    }
    return `<span class="${className}">${iconSrc || '?'}</span>`;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initTabs();
    initLanguage();
    initRaidCalculator();
    initCraftingCalculator();
    initCompareTab();
    initDataActions();
    initOfflineIndicator();
    initPWAInstall();
});

// State management
function loadState() {
    try {
        const saved = localStorage.getItem('rustCalculatorState');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(state, parsed);
        }
    } catch (e) {
        console.warn('Could not load state:', e);
    }
}

function saveState() {
    try {
        localStorage.setItem('rustCalculatorState', JSON.stringify(state));
    } catch (e) {
        console.warn('Could not save state:', e);
    }
}

// Tab Navigation
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
}

// Language
function initLanguage() {
    const langBtns = document.querySelectorAll('.lang-btn');

    langBtns.forEach(btn => {
        if (btn.dataset.lang === state.language) {
            btn.classList.add('active');
        }

        btn.addEventListener('click', () => {
            state.language = btn.dataset.lang;
            langBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateTranslations();
            saveState();

            // Re-render components with new language
            renderBuildings(state.currentCategory);
            renderRecipes();
            if (state.selectedBuilding) updateRaidResults();
            if (state.selectedRecipe) updateCraftResults();
            renderQuickReference();
        });
    });

    updateTranslations();
}

function updateTranslations() {
    const tr = TRANSLATIONS[state.language];

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (tr[key]) {
            el.textContent = tr[key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (tr[key]) {
            el.placeholder = tr[key];
        }
    });
}

function t(key) {
    return TRANSLATIONS[state.language][key] || key;
}

function getName(item) {
    return state.language === 'cs' && item.nameCs ? item.nameCs : item.name;
}

// Raid Calculator
function initRaidCalculator() {
    // Category tabs
    const catTabs = document.querySelectorAll('#buildingCategories .cat-tab');
    catTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            catTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentCategory = tab.dataset.category;
            renderBuildings(state.currentCategory);
        });
    });

    // Quantity controls
    const qtyInput = document.getElementById('targetQty');
    const qtyBtns = document.querySelectorAll('.target-card .qty-btn');

    qtyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const delta = parseInt(btn.dataset.delta);
            state.targetQty = Math.max(1, Math.min(100, state.targetQty + delta));
            qtyInput.value = state.targetQty;
            updateRaidResults();
        });
    });

    qtyInput.addEventListener('change', () => {
        state.targetQty = Math.max(1, Math.min(100, parseInt(qtyInput.value) || 1));
        qtyInput.value = state.targetQty;
        updateRaidResults();
    });

    // Initial render
    renderBuildings(state.currentCategory);
}

function renderBuildings(category) {
    const grid = document.getElementById('buildingGrid');
    grid.innerHTML = '';

    Object.entries(GAME_DATA.buildings)
        .filter(([id, b]) => b.category === category)
        .forEach(([id, building]) => {
            const item = document.createElement('div');
            item.className = `building-item${state.selectedBuilding === id ? ' selected' : ''}`;
            item.dataset.tier = building.tier;
            item.dataset.id = id;
            item.innerHTML = `
                ${renderIcon(building.icon, 'building-icon', getName(building))}
                <span class="building-name">${getName(building)}</span>
                <span class="building-hp">${building.hp} HP</span>
            `;
            item.addEventListener('click', () => selectBuilding(id));
            grid.appendChild(item);
        });
}

function selectBuilding(id) {
    state.selectedBuilding = id;
    saveState();

    // Update selection UI
    document.querySelectorAll('.building-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.id === id);
    });

    updateRaidResults();
}

function updateRaidResults() {
    const targetEl = document.getElementById('selectedTarget');
    const resultsEl = document.getElementById('raidResults');
    const bestEl = document.getElementById('bestOption');

    if (!state.selectedBuilding) {
        targetEl.innerHTML = `<span class="placeholder">${t('select_target')}</span>`;
        resultsEl.innerHTML = '';
        bestEl.style.display = 'none';
        return;
    }

    const building = GAME_DATA.buildings[state.selectedBuilding];
    const totalHp = building.hp * state.targetQty;

    // Show selected target
    targetEl.innerHTML = `
        <div class="target-info">
            ${renderIcon(building.icon, 'target-icon', getName(building))}
            <div class="target-details">
                <h3>${getName(building)} x${state.targetQty}</h3>
                <span>Tier: ${building.tier.replace('_', ' ')}</span>
            </div>
        </div>
        <span class="target-hp">${totalHp} HP</span>
    `;

    // Calculate results for each explosive
    const results = [];
    Object.entries(GAME_DATA.explosives).forEach(([id, explosive]) => {
        const damage = explosive.damage[building.tier] || 0;
        if (damage > 0) {
            const count = Math.ceil(totalHp / damage);
            const sulfur = count * explosive.sulfurCost;
            results.push({
                id,
                explosive,
                count,
                sulfur,
                efficiency: sulfur / totalHp
            });
        }
    });

    // Sort by sulfur cost
    results.sort((a, b) => a.sulfur - b.sulfur);

    // Render results
    resultsEl.innerHTML = results.map((r, i) => `
        <div class="result-row${i === 0 ? ' best' : ''}">
            ${renderIcon(r.explosive.icon, 'result-icon', getName(r.explosive))}
            <span class="result-name">${getName(r.explosive)}</span>
            <div class="result-count">
                <span class="count">${r.count}</span>
                <span class="label">needed</span>
            </div>
            <div class="result-sulfur">
                <span class="sulfur">${r.sulfur.toLocaleString()}</span>
                <span class="label">sulfur</span>
            </div>
        </div>
    `).join('');

    // Show best option
    if (results.length > 0) {
        bestEl.style.display = 'flex';
        document.getElementById('bestValue').textContent =
            `${results[0].count}x ${getName(results[0].explosive)} (${results[0].sulfur.toLocaleString()} sulfur)`;
    }
}

// Crafting Calculator
function initCraftingCalculator() {
    // Search
    const searchInput = document.getElementById('recipeSearch');
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        filterRecipes(query);
    });

    // Quantity controls
    const qtyInput = document.getElementById('craftQty');
    const qtyBtns = document.querySelectorAll('.recipe-card .qty-btn');

    qtyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const delta = parseInt(btn.dataset.delta);
            state.craftQty = Math.max(1, Math.min(1000, state.craftQty + delta));
            qtyInput.value = state.craftQty;
            updateCraftResults();
        });
    });

    qtyInput.addEventListener('change', () => {
        state.craftQty = Math.max(1, Math.min(1000, parseInt(qtyInput.value) || 1));
        qtyInput.value = state.craftQty;
        updateCraftResults();
    });

    // Initial render
    renderRecipes();
}

function renderRecipes() {
    const grid = document.getElementById('recipeGrid');
    grid.innerHTML = '';

    Object.entries(GAME_DATA.recipes).forEach(([id, recipe]) => {
        const item = document.createElement('div');
        item.className = `recipe-item${state.selectedRecipe === id ? ' selected' : ''}`;
        item.dataset.id = id;
        item.innerHTML = `
            ${renderIcon(recipe.icon, 'recipe-icon', getName(recipe))}
            <span class="recipe-name">${getName(recipe)}</span>
        `;
        item.addEventListener('click', () => selectRecipe(id));
        grid.appendChild(item);
    });
}

function filterRecipes(query) {
    document.querySelectorAll('.recipe-item').forEach(item => {
        const recipe = GAME_DATA.recipes[item.dataset.id];
        const name = getName(recipe).toLowerCase();
        const matches = name.includes(query);
        item.style.display = matches ? '' : 'none';
    });
}

function selectRecipe(id) {
    state.selectedRecipe = id;
    saveState();

    document.querySelectorAll('.recipe-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.id === id);
    });

    updateCraftResults();
}

function updateCraftResults() {
    const recipeEl = document.getElementById('selectedRecipe');
    const treeEl = document.getElementById('craftTree');
    const rawEl = document.getElementById('rawMaterials');
    const sulfurEl = document.getElementById('sulfurSummary');

    if (!state.selectedRecipe) {
        recipeEl.innerHTML = `<span class="placeholder">${t('select_recipe')}</span>`;
        treeEl.innerHTML = '';
        rawEl.innerHTML = '';
        sulfurEl.style.display = 'none';
        return;
    }

    const recipe = GAME_DATA.recipes[state.selectedRecipe];
    const quantity = state.craftQty;

    // Show selected recipe
    recipeEl.innerHTML = `
        <div class="target-info">
            ${renderIcon(recipe.icon, 'target-icon', getName(recipe))}
            <div class="target-details">
                <h3>${getName(recipe)} x${quantity}</h3>
                <span>Workbench T${recipe.workbench}</span>
            </div>
        </div>
    `;

    // Build crafting tree
    const tree = buildCraftTree(state.selectedRecipe, quantity);
    treeEl.innerHTML = tree.map(item => `
        <div class="tree-item level-${item.level}">
            ${renderIcon(item.icon, 'tree-icon', item.name)}
            <span class="tree-name">${item.name}</span>
            <span class="tree-amount">x${Math.ceil(item.amount)}</span>
        </div>
    `).join('');

    // Calculate raw materials
    const raw = GAME_DATA.calculateRawMaterials(state.selectedRecipe, quantity);

    rawEl.innerHTML = Object.entries(raw).map(([id, amount]) => {
        const mat = GAME_DATA.rawMaterials[id] || { name: id, icon: '' };
        return `
            <div class="raw-item">
                ${renderIcon(mat.icon, 'raw-icon', getName(mat))}
                <div class="raw-info">
                    <span class="raw-name">${getName(mat)}</span>
                    <span class="raw-amount">${Math.ceil(amount).toLocaleString()}</span>
                </div>
            </div>
        `;
    }).join('');

    // Show sulfur summary
    if (raw.sulfur) {
        sulfurEl.style.display = 'flex';
        document.getElementById('totalSulfur').textContent = Math.ceil(raw.sulfur).toLocaleString();
    } else {
        sulfurEl.style.display = 'none';
    }
}

function buildCraftTree(recipeId, quantity, level = 0) {
    const recipe = GAME_DATA.recipes[recipeId];
    if (!recipe) return [];

    const tree = [{
        level,
        name: getName(recipe),
        icon: recipe.icon,
        amount: quantity
    }];

    const multiplier = quantity / recipe.output;

    Object.entries(recipe.ingredients).forEach(([ingredientId, amount]) => {
        const neededAmount = amount * multiplier;
        const subRecipe = GAME_DATA.recipes[ingredientId];

        if (subRecipe && level < 3) {
            tree.push(...buildCraftTree(ingredientId, neededAmount, level + 1));
        } else {
            const mat = GAME_DATA.rawMaterials[ingredientId] || { name: ingredientId, icon: '' };
            tree.push({
                level: level + 1,
                name: getName(mat),
                icon: mat.icon,
                amount: neededAmount
            });
        }
    });

    return tree;
}

// Compare Tab
function initCompareTab() {
    const select = document.getElementById('compareBuilding');

    // Populate building options (text only for select)
    Object.entries(GAME_DATA.buildings).forEach(([id, building]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${getName(building)} (${building.hp} HP)`;
        select.appendChild(option);
    });

    select.addEventListener('change', () => {
        renderCompareTable(select.value);
    });

    // Initial render
    renderCompareTable('stone_wall');
    renderQuickReference();
}

function renderCompareTable(buildingId) {
    const building = GAME_DATA.buildings[buildingId];
    const tbody = document.getElementById('compareBody');

    if (!building) {
        tbody.innerHTML = '';
        return;
    }

    const results = [];
    Object.entries(GAME_DATA.explosives).forEach(([id, explosive]) => {
        const damage = explosive.damage[building.tier] || 0;
        if (damage > 0) {
            const count = Math.ceil(building.hp / damage);
            const sulfur = count * explosive.sulfurCost;
            results.push({
                id,
                explosive,
                count,
                sulfur,
                efficiency: sulfur / building.hp
            });
        }
    });

    results.sort((a, b) => a.sulfur - b.sulfur);

    const maxSulfur = Math.max(...results.map(r => r.sulfur));
    const minSulfur = Math.min(...results.map(r => r.sulfur));

    tbody.innerHTML = results.map(r => {
        const ratio = 1 - (r.sulfur - minSulfur) / (maxSulfur - minSulfur || 1);
        const percent = Math.round(ratio * 100);
        const barClass = percent > 66 ? '' : percent > 33 ? 'medium' : 'low';

        return `
            <tr>
                <td>
                    <div class="method-cell">
                        ${renderIcon(r.explosive.icon, 'method-icon', getName(r.explosive))}
                        <span>${getName(r.explosive)}</span>
                    </div>
                </td>
                <td>${r.count}</td>
                <td>${r.sulfur.toLocaleString()}</td>
                <td>
                    <div class="efficiency-bar">
                        <div class="bar">
                            <div class="bar-fill ${barClass}" style="width: ${percent}%"></div>
                        </div>
                        <span>${percent}%</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderQuickReference() {
    const grid = document.getElementById('referenceGrid');

    grid.innerHTML = Object.entries(GAME_DATA.explosives).map(([id, exp]) => `
        <div class="reference-item">
            ${renderIcon(exp.icon, 'reference-icon', getName(exp))}
            <div class="reference-info">
                <span class="reference-name">${getName(exp)}</span>
                <span class="reference-sulfur">${exp.sulfurCost.toLocaleString()} sulfur</span>
            </div>
        </div>
    `).join('');
}

// Data Actions (Export/Import)
function initDataActions() {
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importData);
}

function exportData() {
    const data = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        state: state,
        gameDataVersion: GAME_DATA.version
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rust-calculator-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    alert(t('export_success'));
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.state) {
                Object.assign(state, data.state);
                saveState();
                updateTranslations();
                renderBuildings(state.currentCategory);
                renderRecipes();
                alert(t('import_success'));
            }
        } catch (err) {
            alert(t('import_error'));
            console.error('Import error:', err);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Offline Indicator
function initOfflineIndicator() {
    const banner = document.getElementById('offlineBanner');

    function updateStatus() {
        banner.classList.toggle('visible', !navigator.onLine);
    }

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
}

// PWA Install
let deferredPrompt;

function initPWAInstall() {
    const installBtn = document.getElementById('installBtn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'flex';
    });

    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Install outcome: ${outcome}`);
        deferredPrompt = null;
        installBtn.style.display = 'none';
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA installed');
        installBtn.style.display = 'none';
    });
}
