/**
 * Server Hub - Main Application
 *
 * Offline-first PWA pro spravu serveru, webu a zaloh.
 * Inspirovano xCloud control panel.
 *
 * @license MIT
 * @version 1.0.0
 */

(function() {
    'use strict';

    // ===========================================
    // Application State
    // ===========================================
    const App = {
        currentView: 'dashboard',
        currentFilter: 'all',
        searchQuery: '',
        editingId: null,
        deleteCallback: null
    };

    // ===========================================
    // Utility Functions
    // ===========================================

    // Format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Format relative time
    function formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Prave ted';
        if (minutes < 60) return `Pred ${minutes} min`;
        if (hours < 24) return `Pred ${hours} hod`;
        if (days < 7) return `Pred ${days} dny`;

        return formatDate(dateString);
    }

    // Format file size
    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Get provider icon
    function getProviderIcon(provider) {
        const icons = {
            'digitalocean': '🔵',
            'vultr': '🟣',
            'hetzner': '🔴',
            'aws': '🟠',
            'gcp': '🔵',
            'linode': '🟢',
            'custom': '⚙️'
        };
        return icons[provider] || '🖥️';
    }

    // Get status color class
    function getStatusClass(status) {
        const classes = {
            'active': 'active',
            'pending': 'pending',
            'stopped': 'stopped',
            'error': 'error',
            'maintenance': 'maintenance'
        };
        return classes[status] || 'pending';
    }

    // Get activity icon
    function getActivityIcon(type) {
        const icons = {
            'create': '➕',
            'update': '✏️',
            'delete': '🗑️'
        };
        return icons[type] || '📋';
    }

    // Get entity name for activity
    function getEntityName(entityType) {
        const names = {
            'servers': 'Server',
            'sites': 'Web',
            'backups': 'Zaloha',
            'sshKeys': 'SSH klic'
        };
        return names[entityType] || entityType;
    }

    // ===========================================
    // Toast Notifications
    // ===========================================
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toast);

        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    // ===========================================
    // Modal Functions
    // ===========================================
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function closeAllModals() {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    // ===========================================
    // View Navigation
    // ===========================================
    function switchView(viewName) {
        // Update state
        App.currentView = viewName;

        // Update tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `${viewName}View`);
        });

        // Load view data
        loadViewData(viewName);
    }

    function loadViewData(viewName) {
        switch (viewName) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'servers':
                loadServers();
                break;
            case 'sites':
                loadSites();
                break;
            case 'backups':
                loadBackups();
                break;
            case 'activity':
                loadActivity();
                break;
        }
    }

    // ===========================================
    // Dashboard
    // ===========================================
    async function loadDashboard() {
        try {
            const stats = await ServerHubDB.Dashboard.getStats();

            // Update stats
            document.getElementById('statServers').textContent = stats.servers.total;
            document.getElementById('statServersActive').textContent = `${stats.servers.active} aktivnich`;

            document.getElementById('statSites').textContent = stats.sites.total;
            document.getElementById('statSitesSSL').textContent = `${stats.sites.withSSL} s SSL`;

            document.getElementById('statBackups').textContent = stats.backups.total;
            document.getElementById('statBackupsSize').textContent = formatSize(stats.backups.totalSize);

            document.getElementById('statWordPress').textContent = stats.sites.wordpress;
            document.getElementById('statStaging').textContent = `${stats.sites.staging} staging`;

            // Load recent activity
            loadDashboardActivity();
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            showToast('Chyba pri nacitani dashboardu', 'error');
        }
    }

    async function loadDashboardActivity() {
        const container = document.getElementById('dashboardActivityList');
        const activities = await ServerHubDB.ActivityLog.getRecent(5);

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📋</span>
                    <p>Zadna nedavna aktivita</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">${getActivityIcon(activity.type)}</div>
                <div class="activity-content">
                    <div class="activity-title">${getEntityName(activity.entityType)}: ${activity.data?.name || activity.entityId}</div>
                    <div class="activity-desc">${activity.type === 'create' ? 'Vytvoreno' : activity.type === 'update' ? 'Upraveno' : 'Smazano'}</div>
                    <div class="activity-time">${formatRelativeTime(activity.createdAt)}</div>
                </div>
            </div>
        `).join('');
    }

    // ===========================================
    // Servers
    // ===========================================
    async function loadServers() {
        try {
            let servers = await ServerHubDB.Servers.readAll();
            const searchQuery = document.getElementById('serverSearch')?.value?.toLowerCase() || '';

            // Apply filter
            if (App.currentFilter !== 'all') {
                servers = servers.filter(s => s.status === App.currentFilter);
            }

            // Apply search
            if (searchQuery) {
                servers = servers.filter(s =>
                    s.name.toLowerCase().includes(searchQuery) ||
                    s.ipAddress?.toLowerCase().includes(searchQuery) ||
                    s.provider?.toLowerCase().includes(searchQuery)
                );
            }

            // Sort by date
            servers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            const container = document.getElementById('serversList');
            const emptyState = document.getElementById('serversEmptyState');

            if (servers.length === 0) {
                container.innerHTML = '';
                emptyState.style.display = 'block';
                return;
            }

            emptyState.style.display = 'none';
            container.innerHTML = servers.map(server => `
                <div class="server-card" data-id="${server.id}">
                    <div class="card-header">
                        <div class="card-title">
                            <span class="card-icon">${getProviderIcon(server.provider)}</span>
                            <span class="card-name">${server.name}</span>
                        </div>
                        <span class="card-status ${getStatusClass(server.status)}">${server.status}</span>
                    </div>
                    <div class="card-info">
                        ${server.ipAddress ? `
                            <div class="card-info-row">
                                <span class="card-info-icon">🌐</span>
                                <span>${server.ipAddress}</span>
                            </div>
                        ` : ''}
                        <div class="card-info-row">
                            <span class="card-info-icon">🏷️</span>
                            <span>${server.provider}</span>
                        </div>
                        ${server.region ? `
                            <div class="card-info-row">
                                <span class="card-info-icon">📍</span>
                                <span>${server.region}</span>
                            </div>
                        ` : ''}
                        <div class="card-info-row">
                            <span class="card-info-icon">⚙️</span>
                            <span>${server.webServer} / PHP ${server.phpVersion}</span>
                        </div>
                    </div>
                    <div class="card-badges">
                        ${server.os ? `<span class="card-badge">${server.os}</span>` : ''}
                        ${server.size ? `<span class="card-badge">${server.size}</span>` : ''}
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-secondary btn-sm" onclick="editServer('${server.id}')">
                            <span>✏️</span> Upravit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteServer('${server.id}')">
                            <span>🗑️</span> Smazat
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load servers:', error);
            showToast('Chyba pri nacitani serveru', 'error');
        }
    }

    window.editServer = async function(id) {
        const server = await ServerHubDB.Servers.read(id);
        if (!server) {
            showToast('Server nenalezen', 'error');
            return;
        }

        App.editingId = id;
        document.getElementById('serverModalTitle').textContent = 'Upravit server';
        document.getElementById('serverId').value = server.id;
        document.getElementById('serverName').value = server.name;
        document.getElementById('serverProvider').value = server.provider;
        document.getElementById('serverIP').value = server.ipAddress || '';
        document.getElementById('serverStatus').value = server.status;
        document.getElementById('serverRegion').value = server.region || '';
        document.getElementById('serverSize').value = server.size || '';
        document.getElementById('serverWebServer').value = server.webServer;
        document.getElementById('serverPHP').value = server.phpVersion;
        document.getElementById('serverOS').value = server.os || '';

        openModal('serverModal');
    };

    window.deleteServer = function(id) {
        App.deleteCallback = async () => {
            try {
                // Also delete associated sites
                const sites = await ServerHubDB.Sites.getByServer(id);
                for (const site of sites) {
                    await ServerHubDB.Sites.delete(site.id);
                }

                await ServerHubDB.Servers.delete(id);
                showToast('Server byl smazan', 'success');
                loadServers();
                closeModal('confirmModal');
            } catch (error) {
                showToast('Chyba pri mazani serveru', 'error');
            }
        };
        document.getElementById('confirmMessage').textContent = 'Opravdu chcete smazat tento server? Budou smazany i vsechny prirazene weby.';
        openModal('confirmModal');
    };

    async function saveServer(formData) {
        try {
            if (App.editingId) {
                await ServerHubDB.Servers.update(App.editingId, formData);
                showToast('Server byl upraven', 'success');
            } else {
                await ServerHubDB.Servers.create(formData);
                showToast('Server byl vytvoren', 'success');
            }
            closeModal('serverModal');
            loadServers();
            loadDashboard();
        } catch (error) {
            showToast('Chyba pri ukladani serveru', 'error');
        }
    }

    // ===========================================
    // Sites
    // ===========================================
    async function loadSites() {
        try {
            let sites = await ServerHubDB.Sites.readAll();
            const servers = await ServerHubDB.Servers.readAll();
            const searchQuery = document.getElementById('siteSearch')?.value?.toLowerCase() || '';

            // Create server lookup
            const serverLookup = {};
            servers.forEach(s => serverLookup[s.id] = s);

            // Apply filter
            switch (App.currentFilter) {
                case 'wordpress':
                    sites = sites.filter(s => s.type === 'wordpress');
                    break;
                case 'staging':
                    sites = sites.filter(s => s.isStaging);
                    break;
                case 'ssl':
                    sites = sites.filter(s => s.sslEnabled);
                    break;
            }

            // Apply search
            if (searchQuery) {
                sites = sites.filter(s =>
                    s.name.toLowerCase().includes(searchQuery) ||
                    s.domain?.toLowerCase().includes(searchQuery)
                );
            }

            // Sort by date
            sites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            const container = document.getElementById('sitesList');
            const emptyState = document.getElementById('sitesEmptyState');

            if (sites.length === 0) {
                container.innerHTML = '';
                emptyState.style.display = 'block';
                return;
            }

            emptyState.style.display = 'none';
            container.innerHTML = sites.map(site => {
                const server = serverLookup[site.serverId];
                return `
                    <div class="site-card" data-id="${site.id}">
                        <div class="card-header">
                            <div class="card-title">
                                <span class="card-icon">${site.type === 'wordpress' ? '📝' : '🌐'}</span>
                                <span class="card-name">${site.name}</span>
                            </div>
                            <span class="card-status ${getStatusClass(site.status)}">${site.status}</span>
                        </div>
                        <div class="card-info">
                            ${site.domain ? `
                                <div class="card-info-row">
                                    <span class="card-info-icon">🔗</span>
                                    <span>${site.domain}</span>
                                </div>
                            ` : ''}
                            ${server ? `
                                <div class="card-info-row">
                                    <span class="card-info-icon">🖥️</span>
                                    <span>${server.name}</span>
                                </div>
                            ` : ''}
                            <div class="card-info-row">
                                <span class="card-info-icon">📂</span>
                                <span>${site.type}</span>
                            </div>
                            ${site.phpVersion ? `
                                <div class="card-info-row">
                                    <span class="card-info-icon">⚙️</span>
                                    <span>PHP ${site.phpVersion}</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-badges">
                            ${site.sslEnabled ? '<span class="card-badge ssl">SSL</span>' : ''}
                            ${site.isStaging ? '<span class="card-badge staging">Staging</span>' : ''}
                            ${site.wpVersion ? `<span class="card-badge">WP ${site.wpVersion}</span>` : ''}
                        </div>
                        <div class="card-actions">
                            <button class="btn btn-secondary btn-sm" onclick="editSite('${site.id}')">
                                <span>✏️</span> Upravit
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="deleteSite('${site.id}')">
                                <span>🗑️</span> Smazat
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Failed to load sites:', error);
            showToast('Chyba pri nacitani webu', 'error');
        }
    }

    async function loadServerOptions() {
        const servers = await ServerHubDB.Servers.readAll();
        const select = document.getElementById('siteServer');

        // Keep first option
        select.innerHTML = '<option value="">-- Vyberte server --</option>';

        servers.forEach(server => {
            const option = document.createElement('option');
            option.value = server.id;
            option.textContent = `${server.name} (${server.ipAddress || server.provider})`;
            select.appendChild(option);
        });
    }

    window.editSite = async function(id) {
        const site = await ServerHubDB.Sites.read(id);
        if (!site) {
            showToast('Web nenalezen', 'error');
            return;
        }

        await loadServerOptions();

        App.editingId = id;
        document.getElementById('siteModalTitle').textContent = 'Upravit web';
        document.getElementById('siteId').value = site.id;
        document.getElementById('siteName').value = site.name;
        document.getElementById('siteDomain').value = site.domain || '';
        document.getElementById('siteServer').value = site.serverId || '';
        document.getElementById('siteType').value = site.type;
        document.getElementById('siteStatus').value = site.status;
        document.getElementById('sitePHP').value = site.phpVersion || '';
        document.getElementById('siteSSL').checked = site.sslEnabled;
        document.getElementById('siteStaging').checked = site.isStaging;
        document.getElementById('siteWPVersion').value = site.wpVersion || '';
        document.getElementById('siteWPAdmin').value = site.wpAdmin || '';

        // Show WordPress settings if type is WordPress
        toggleWPSettings(site.type === 'wordpress');

        openModal('siteModal');
    };

    window.deleteSite = function(id) {
        App.deleteCallback = async () => {
            try {
                await ServerHubDB.Sites.delete(id);
                showToast('Web byl smazan', 'success');
                loadSites();
                closeModal('confirmModal');
            } catch (error) {
                showToast('Chyba pri mazani webu', 'error');
            }
        };
        document.getElementById('confirmMessage').textContent = 'Opravdu chcete smazat tento web?';
        openModal('confirmModal');
    };

    function toggleWPSettings(show) {
        document.getElementById('wpSettingsGroup').style.display = show ? 'block' : 'none';
    }

    async function saveSite(formData) {
        try {
            if (App.editingId) {
                await ServerHubDB.Sites.update(App.editingId, formData);
                showToast('Web byl upraven', 'success');
            } else {
                await ServerHubDB.Sites.create(formData);
                showToast('Web byl vytvoren', 'success');
            }
            closeModal('siteModal');
            loadSites();
            loadDashboard();
        } catch (error) {
            showToast('Chyba pri ukladani webu', 'error');
        }
    }

    // ===========================================
    // Backups
    // ===========================================
    async function loadBackups() {
        try {
            let backups = await ServerHubDB.Backups.readAll();
            const sites = await ServerHubDB.Sites.readAll();
            const searchQuery = document.getElementById('backupSearch')?.value?.toLowerCase() || '';

            // Create site lookup
            const siteLookup = {};
            sites.forEach(s => siteLookup[s.id] = s);

            // Apply filter
            if (App.currentFilter !== 'all') {
                backups = backups.filter(b => b.type === App.currentFilter);
            }

            // Apply search
            if (searchQuery) {
                backups = backups.filter(b =>
                    b.name.toLowerCase().includes(searchQuery) ||
                    siteLookup[b.siteId]?.name?.toLowerCase().includes(searchQuery)
                );
            }

            // Sort by date
            backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            const container = document.getElementById('backupsList');
            const emptyState = document.getElementById('backupsEmptyState');
            const table = document.getElementById('backupsTable');

            if (backups.length === 0) {
                table.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }

            table.style.display = 'table';
            emptyState.style.display = 'none';

            container.innerHTML = backups.map(backup => {
                const site = siteLookup[backup.siteId];
                return `
                    <tr>
                        <td>
                            <div style="display: flex; flex-direction: column;">
                                <strong>${backup.name}</strong>
                                ${site ? `<small style="color: var(--text-muted);">${site.name}</small>` : ''}
                            </div>
                        </td>
                        <td>
                            <span class="card-badge">${backup.type}</span>
                        </td>
                        <td>${formatSize(backup.size)}</td>
                        <td>${formatDate(backup.createdAt)}</td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="deleteBackup('${backup.id}')">
                                <span>🗑️</span>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Failed to load backups:', error);
            showToast('Chyba pri nacitani zaloh', 'error');
        }
    }

    async function loadSiteOptions() {
        const sites = await ServerHubDB.Sites.readAll();
        const select = document.getElementById('backupSite');

        // Keep first option
        select.innerHTML = '<option value="">-- Vyberte web --</option>';

        sites.forEach(site => {
            const option = document.createElement('option');
            option.value = site.id;
            option.textContent = `${site.name} (${site.domain || 'bez domeny'})`;
            select.appendChild(option);
        });
    }

    window.deleteBackup = function(id) {
        App.deleteCallback = async () => {
            try {
                await ServerHubDB.Backups.delete(id);
                showToast('Zaloha byla smazana', 'success');
                loadBackups();
                closeModal('confirmModal');
            } catch (error) {
                showToast('Chyba pri mazani zalohy', 'error');
            }
        };
        document.getElementById('confirmMessage').textContent = 'Opravdu chcete smazat tuto zalohu?';
        openModal('confirmModal');
    };

    async function saveBackup(formData) {
        try {
            // Generate random size for demo
            formData.size = Math.floor(Math.random() * 500000000) + 10000000;

            await ServerHubDB.Backups.create(formData);
            showToast('Zaloha byla vytvorena', 'success');
            closeModal('backupModal');
            loadBackups();
            loadDashboard();
        } catch (error) {
            showToast('Chyba pri vytvareni zalohy', 'error');
        }
    }

    // ===========================================
    // Activity
    // ===========================================
    async function loadActivity() {
        try {
            const activities = await ServerHubDB.ActivityLog.getRecent(100);
            const container = document.getElementById('activityTimeline');
            const emptyState = document.getElementById('activityEmptyState');

            if (activities.length === 0) {
                container.innerHTML = '';
                emptyState.style.display = 'block';
                return;
            }

            emptyState.style.display = 'none';
            container.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">${getActivityIcon(activity.type)}</div>
                    <div class="activity-content">
                        <div class="activity-title">${getEntityName(activity.entityType)}: ${activity.data?.name || activity.entityId}</div>
                        <div class="activity-desc">${activity.type === 'create' ? 'Vytvoreno' : activity.type === 'update' ? 'Upraveno' : 'Smazano'}</div>
                        <div class="activity-time">${formatRelativeTime(activity.createdAt)}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load activity:', error);
            showToast('Chyba pri nacitani historie', 'error');
        }
    }

    // ===========================================
    // Export/Import
    // ===========================================
    async function exportData() {
        try {
            const data = await ServerHubDB.DataManager.exportAll();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `server-hub-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast('Data byla exportovana', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            showToast('Chyba pri exportu dat', 'error');
        }
    }

    async function importData(file) {
        try {
            const text = await file.text();
            const result = await ServerHubDB.DataManager.importAll(text);

            if (result.success) {
                showToast('Data byla importovana', 'success');
                loadViewData(App.currentView);
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Import failed:', error);
            showToast('Chyba pri importu dat', 'error');
        }
    }

    // ===========================================
    // Event Listeners
    // ===========================================
    function initEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                App.currentFilter = 'all';
                switchView(tab.dataset.view);
            });
        });

        // Filter buttons
        document.querySelectorAll('.filters-bar').forEach(bar => {
            bar.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    App.currentFilter = btn.dataset.filter;
                    loadViewData(App.currentView);
                });
            });
        });

        // Search inputs
        ['serverSearch', 'siteSearch', 'backupSearch'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    loadViewData(App.currentView);
                });
            }
        });

        // Quick action buttons
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                handleAction(btn.dataset.action);
            });
        });

        // Add server button
        document.getElementById('addServerBtn')?.addEventListener('click', () => {
            handleAction('add-server');
        });

        // Add site button
        document.getElementById('addSiteBtn')?.addEventListener('click', () => {
            handleAction('add-site');
        });

        // Create backup button
        document.getElementById('createBackupBtn')?.addEventListener('click', () => {
            handleAction('create-backup');
        });

        // Server form
        document.getElementById('serverForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                name: document.getElementById('serverName').value,
                provider: document.getElementById('serverProvider').value,
                ipAddress: document.getElementById('serverIP').value,
                status: document.getElementById('serverStatus').value,
                region: document.getElementById('serverRegion').value,
                size: document.getElementById('serverSize').value,
                webServer: document.getElementById('serverWebServer').value,
                phpVersion: document.getElementById('serverPHP').value,
                os: document.getElementById('serverOS').value
            };
            saveServer(formData);
        });

        // Site form
        document.getElementById('siteForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                name: document.getElementById('siteName').value,
                domain: document.getElementById('siteDomain').value,
                serverId: document.getElementById('siteServer').value || null,
                type: document.getElementById('siteType').value,
                status: document.getElementById('siteStatus').value,
                phpVersion: document.getElementById('sitePHP').value || null,
                sslEnabled: document.getElementById('siteSSL').checked,
                isStaging: document.getElementById('siteStaging').checked,
                wpVersion: document.getElementById('siteWPVersion').value || null,
                wpAdmin: document.getElementById('siteWPAdmin').value || null
            };
            saveSite(formData);
        });

        // Site type change - toggle WP settings
        document.getElementById('siteType')?.addEventListener('change', (e) => {
            toggleWPSettings(e.target.value === 'wordpress');
        });

        // Backup form
        document.getElementById('backupForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                name: document.getElementById('backupName').value || `Zaloha ${new Date().toLocaleDateString('cs-CZ')}`,
                siteId: document.getElementById('backupSite').value || null,
                type: document.getElementById('backupType').value,
                storage: document.getElementById('backupStorage').value,
                notes: document.getElementById('backupNotes').value
            };
            saveBackup(formData);
        });

        // Confirm delete button
        document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
            if (App.deleteCallback) {
                App.deleteCallback();
            }
        });

        // Clear activity button
        document.getElementById('clearActivityBtn')?.addEventListener('click', async () => {
            if (confirm('Opravdu chcete vymazat celou historii aktivit?')) {
                await ServerHubDB.ActivityLog.clear();
                showToast('Historie byla vymazana', 'success');
                loadActivity();
            }
        });

        // Export button
        document.getElementById('exportBtn')?.addEventListener('click', exportData);

        // Import button
        document.getElementById('importBtn')?.addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        // Import file input
        document.getElementById('importFile')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                importData(file);
                e.target.value = '';
            }
        });

        // Modal close buttons
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', closeAllModals);
        });

        // Close modal on overlay click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeAllModals();
                }
            });
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });

        // Online/Offline status
        window.addEventListener('online', () => {
            document.getElementById('offlineBadge').style.display = 'none';
            showToast('Pripojeni obnoveno', 'success');
        });

        window.addEventListener('offline', () => {
            document.getElementById('offlineBadge').style.display = 'inline-block';
            showToast('Pracujete offline', 'warning');
        });
    }

    function handleAction(action) {
        switch (action) {
            case 'add-server':
                App.editingId = null;
                document.getElementById('serverModalTitle').textContent = 'Pridat server';
                document.getElementById('serverForm').reset();
                openModal('serverModal');
                break;

            case 'add-site':
                App.editingId = null;
                document.getElementById('siteModalTitle').textContent = 'Pridat web';
                document.getElementById('siteForm').reset();
                toggleWPSettings(true);
                loadServerOptions();
                openModal('siteModal');
                break;

            case 'create-backup':
                document.getElementById('backupForm').reset();
                loadSiteOptions();
                openModal('backupModal');
                break;

            case 'export-data':
                exportData();
                break;
        }
    }

    // ===========================================
    // Service Worker Registration
    // ===========================================
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then((registration) => {
                    console.log('[App] Service Worker registered:', registration.scope);

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                showToast('Nova verze dostupna! Obnovte stranku.', 'info');
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.error('[App] Service Worker registration failed:', error);
                });
        }
    }

    // ===========================================
    // Initialize Application
    // ===========================================
    async function init() {
        try {
            // Initialize database
            await ServerHubDB.init();
            console.log('[App] Database initialized');

            // Register service worker
            registerServiceWorker();

            // Initialize event listeners
            initEventListeners();

            // Check online status
            if (!navigator.onLine) {
                document.getElementById('offlineBadge').style.display = 'inline-block';
            }

            // Load dashboard
            loadDashboard();

            console.log('[App] Application initialized');
        } catch (error) {
            console.error('[App] Initialization failed:', error);
            showToast('Chyba pri inicializaci aplikace', 'error');
        }
    }

    // Start application when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
