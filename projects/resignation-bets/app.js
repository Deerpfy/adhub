// Hlavní logika aplikace pro sázky na výpověď

// Globální proměnné
let currentWinnerPerson = null;

// Inicializace aplikace po načtení DOM
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializace databáze
        await betDB.init();
        console.log('Database initialized');

        // Inicializace jazyků
        await langManager.init();
        console.log('Language manager initialized');

        // Překlad stránky
        langManager.translatePage();

        // Nastavení event listenerů
        setupEventListeners();

        // Načtení a zobrazení dat
        await refreshAllData();

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        alert('Chyba při inicializaci aplikace. Zkuste obnovit stránku.');
    }
});

// Nastavení všech event listenerů
function setupEventListeners() {
    // Přepínání jazyků
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const lang = e.target.getAttribute('data-lang');
            await langManager.setLanguage(lang);

            // Aktualizace aktivního tlačítka
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // Obnovení zobrazení dat pro přeložené texty
            await refreshAllData();
        });
    });

    // Tlačítko pro přidání sázky
    document.getElementById('addBetBtn').addEventListener('click', openAddBetModal);

    // Zavření modalu pro přidání sázky
    document.getElementById('closeAddBetModal').addEventListener('click', closeAddBetModal);
    document.getElementById('cancelAddBet').addEventListener('click', closeAddBetModal);

    // Odeslání formuláře pro novou sázku
    document.getElementById('addBetForm').addEventListener('submit', handleAddBet);

    // Export dat
    document.getElementById('exportBtn').addEventListener('click', handleExport);

    // Import dat
    document.getElementById('importFile').addEventListener('change', handleImport);

    // Zavření modalu pro potvrzení výherce
    document.getElementById('closeWinnerModal').addEventListener('click', closeWinnerModal);
    document.getElementById('cancelWinnerBtn').addEventListener('click', closeWinnerModal);

    // Potvrzení výherce
    document.getElementById('confirmWinnerBtn').addEventListener('click', handleConfirmWinner);

    // Zavření modalu kliknutím mimo obsah
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Escape klávesa pro zavření modalů
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAddBetModal();
            closeWinnerModal();
        }
    });
}

// === Funkce pro správu modalů ===

function openAddBetModal() {
    document.getElementById('addBetModal').classList.add('active');
    document.getElementById('personName').focus();
}

function closeAddBetModal() {
    document.getElementById('addBetModal').classList.remove('active');
    document.getElementById('addBetForm').reset();
}

function openWinnerModal(personName) {
    currentWinnerPerson = personName;
    document.getElementById('winnerPersonName').textContent = personName;
    document.getElementById('winnerModal').classList.add('active');
}

function closeWinnerModal() {
    document.getElementById('winnerModal').classList.remove('active');
    currentWinnerPerson = null;
}

// === Funkce pro zpracování akcí ===

async function handleAddBet(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const bet = {
        personName: formData.get('personName').trim(),
        bettorName: formData.get('bettorName').trim(),
        amount: parseFloat(formData.get('amount')),
        note: formData.get('note').trim(),
        date: new Date().toISOString(),
        status: 'active'
    };

    // Validace
    if (!bet.personName) {
        alert(langManager.t('validation_person_required'));
        return;
    }

    if (!bet.bettorName) {
        alert(langManager.t('validation_bettor_required'));
        return;
    }

    if (!bet.amount || bet.amount <= 0) {
        alert(langManager.t('validation_amount_positive'));
        return;
    }

    try {
        await betDB.addBet(bet);
        closeAddBetModal();
        await refreshAllData();
        console.log('Bet added successfully');
    } catch (error) {
        console.error('Error adding bet:', error);
        alert('Chyba při přidávání sázky. Zkuste to znovu.');
    }
}

async function handleDeleteBet(betId) {
    if (!confirm(langManager.t('delete_confirm'))) {
        return;
    }

    try {
        await betDB.deleteBet(betId);
        await refreshAllData();
        console.log('Bet deleted successfully');
    } catch (error) {
        console.error('Error deleting bet:', error);
        alert('Chyba při mazání sázky.');
    }
}

async function handleMarkWinner(personName) {
    openWinnerModal(personName);
}

async function handleConfirmWinner() {
    if (!currentWinnerPerson) return;

    try {
        await betDB.markPersonAsWinner(currentWinnerPerson);
        closeWinnerModal();
        await refreshAllData();
        console.log('Winner marked successfully');
    } catch (error) {
        console.error('Error marking winner:', error);
        alert('Chyba při označování výherce.');
    }
}

async function handleExport() {
    try {
        await betDB.exportToJSON();
        // Krátké oznámení o úspěchu
        showNotification(langManager.t('export_success'));
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Chyba při exportu dat.');
    }
}

async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm(langManager.t('import_confirm'))) {
        e.target.value = ''; // Reset file input
        return;
    }

    try {
        const count = await betDB.importFromJSON(file);
        await refreshAllData();
        showNotification(langManager.t('import_success') + ` (${count} sázek)`);
        e.target.value = ''; // Reset file input
    } catch (error) {
        console.error('Error importing data:', error);
        alert(langManager.t('import_error'));
        e.target.value = ''; // Reset file input
    }
}

// === Funkce pro zobrazení dat ===

async function refreshAllData() {
    await Promise.all([
        displayActiveBets(),
        displayHistory(),
        displayStatistics(),
        displayLeaderboard()
    ]);
}

async function displayActiveBets() {
    const container = document.getElementById('activeBetsList');
    const bets = await betDB.getBetsByStatus('active');

    if (bets.length === 0) {
        container.innerHTML = `<p class="empty-message" data-i18n="no_active_bets">${langManager.t('no_active_bets')}</p>`;
        return;
    }

    container.innerHTML = bets.map(bet => createBetCard(bet, true)).join('');

    // Přidání event listenerů pro akce
    container.querySelectorAll('.mark-winner-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const personName = e.target.getAttribute('data-person');
            handleMarkWinner(personName);
        });
    });

    container.querySelectorAll('.delete-bet-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const betId = parseInt(e.target.getAttribute('data-id'));
            handleDeleteBet(betId);
        });
    });
}

async function displayHistory() {
    const container = document.getElementById('historyList');
    const allBets = await betDB.getAllBets();
    const historyBets = allBets.filter(bet => bet.status !== 'active');

    if (historyBets.length === 0) {
        container.innerHTML = `<p class="empty-message" data-i18n="no_bets">${langManager.t('no_bets')}</p>`;
        return;
    }

    // Seřazení podle data (nejnovější první)
    historyBets.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = historyBets.map(bet => createBetCard(bet, false)).join('');
}

async function displayStatistics() {
    const stats = await betDB.getStatistics();

    document.getElementById('statTotalBets').textContent = stats.totalBets;
    document.getElementById('statActiveBets').textContent = stats.activeBets;
    document.getElementById('statTotalPoints').textContent = Math.round(stats.activePoints);
}

async function displayLeaderboard() {
    const container = document.getElementById('leaderboardList');
    const leaderboard = await betDB.getLeaderboard();

    if (leaderboard.length === 0) {
        container.innerHTML = `<p class="empty-message" data-i18n="no_bets">${langManager.t('no_bets')}</p>`;
        return;
    }

    container.innerHTML = leaderboard.map((bettor, index) => `
        <div class="leaderboard-item">
            <div class="leaderboard-item-name">
                ${index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`} ${bettor.name}
            </div>
            <div class="leaderboard-item-stats">
                <span>${langManager.t('wins')}: ${bettor.wins}</span>
                <span>${langManager.t('losses')}: ${bettor.losses}</span>
                <span class="win-rate">${bettor.winRate}%</span>
            </div>
        </div>
    `).join('');
}

// === Pomocné funkce ===

function createBetCard(bet, showActions) {
    const date = new Date(bet.date);
    const formattedDate = date.toLocaleDateString(langManager.getLanguage());
    const statusClass = bet.status;
    const statusText = langManager.t(`status_${bet.status}`);

    return `
        <div class="bet-card ${statusClass}">
            <div class="bet-card-header">
                <div class="bet-person">${bet.personName}</div>
                <div class="bet-amount">${Math.round(bet.amount)} ${langManager.t('points')}</div>
            </div>
            <div class="bet-card-body">
                <div class="bet-info">
                    <span class="bet-info-label">${langManager.t('bettor')}:</span>
                    <span class="bet-info-value">${bet.bettorName}</span>
                </div>
                <div class="bet-info">
                    <span class="bet-info-label">${langManager.t('date')}:</span>
                    <span class="bet-info-value">${formattedDate}</span>
                </div>
                <div class="bet-info">
                    <span class="bet-info-label">${langManager.t('status')}:</span>
                    <span class="bet-status ${statusClass}">${statusText}</span>
                </div>
                ${bet.note ? `<div class="bet-note">${bet.note}</div>` : ''}
            </div>
            ${showActions ? `
                <div class="bet-card-actions">
                    <button class="bet-action-btn mark-winner-btn" data-person="${bet.personName}">
                        ${langManager.t('mark_winner')}
                    </button>
                    <button class="bet-action-btn danger delete-bet-btn" data-id="${bet.id}">
                        ${langManager.t('delete_bet')}
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function showNotification(message) {
    // Jednoduchá notifikace - můžete vylepšit vlastním toast systémem
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, var(--casino-gold) 0%, #b8952e 100%);
        color: var(--casino-black);
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-weight: bold;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Animace pro notifikaci
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);
