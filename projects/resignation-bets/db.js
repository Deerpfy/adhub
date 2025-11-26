// Správa IndexedDB pro ukládání sázek

class BetDatabase {
    constructor() {
        this.dbName = 'ResignationBetsDB';
        this.version = 1;
        this.db = null;
    }

    // Inicializace databáze
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            // Vytvoření object store při prvním otevření nebo upgradu
            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Vytvoření object store pro sázky
                if (!db.objectStoreNames.contains('bets')) {
                    const objectStore = db.createObjectStore('bets', {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // Vytvoření indexů pro rychlejší vyhledávání
                    objectStore.createIndex('personName', 'personName', { unique: false });
                    objectStore.createIndex('bettorName', 'bettorName', { unique: false });
                    objectStore.createIndex('status', 'status', { unique: false });
                    objectStore.createIndex('date', 'date', { unique: false });

                    console.log('Object store created successfully');
                }
            };
        });
    }

    // Přidání nové sázky
    async addBet(bet) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['bets'], 'readwrite');
            const objectStore = transaction.objectStore('bets');

            // Přidání timestamp, pokud není zadán
            if (!bet.date) {
                bet.date = new Date().toISOString();
            }

            // Výchozí status
            if (!bet.status) {
                bet.status = 'active';
            }

            const request = objectStore.add(bet);

            request.onsuccess = () => {
                console.log('Bet added successfully', request.result);
                resolve(request.result); // Vrátí ID nové sázky
            };

            request.onerror = () => {
                console.error('Error adding bet');
                reject(request.error);
            };
        });
    }

    // Získání všech sázek
    async getAllBets() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['bets'], 'readonly');
            const objectStore = transaction.objectStore('bets');
            const request = objectStore.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error getting bets');
                reject(request.error);
            };
        });
    }

    // Získání sázky podle ID
    async getBet(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['bets'], 'readonly');
            const objectStore = transaction.objectStore('bets');
            const request = objectStore.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error getting bet');
                reject(request.error);
            };
        });
    }

    // Aktualizace sázky
    async updateBet(bet) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['bets'], 'readwrite');
            const objectStore = transaction.objectStore('bets');
            const request = objectStore.put(bet);

            request.onsuccess = () => {
                console.log('Bet updated successfully');
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error updating bet');
                reject(request.error);
            };
        });
    }

    // Smazání sázky
    async deleteBet(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['bets'], 'readwrite');
            const objectStore = transaction.objectStore('bets');
            const request = objectStore.delete(id);

            request.onsuccess = () => {
                console.log('Bet deleted successfully');
                resolve();
            };

            request.onerror = () => {
                console.error('Error deleting bet');
                reject(request.error);
            };
        });
    }

    // Získání sázek podle statusu
    async getBetsByStatus(status) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['bets'], 'readonly');
            const objectStore = transaction.objectStore('bets');
            const index = objectStore.index('status');
            const request = index.getAll(status);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Označení osoby jako výherce - aktualizace všech sázek na tuto osobu
    async markPersonAsWinner(personName) {
        const allBets = await this.getAllBets();
        const promises = [];

        for (const bet of allBets) {
            if (bet.status === 'active') {
                bet.status = bet.personName === personName ? 'won' : 'lost';
                promises.push(this.updateBet(bet));
            }
        }

        return Promise.all(promises);
    }

    // Export všech dat do JSON
    async exportToJSON() {
        const bets = await this.getAllBets();
        const data = {
            version: this.version,
            exportDate: new Date().toISOString(),
            bets: bets
        };

        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `resignation-bets-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return data;
    }

    // Import dat z JSON souboru
    async importFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);

                    // Validace formátu
                    if (!data.bets || !Array.isArray(data.bets)) {
                        throw new Error('Invalid data format');
                    }

                    // Smazání všech stávajících dat
                    await this.clearAllBets();

                    // Import nových dat
                    for (const bet of data.bets) {
                        // Odstranění ID, aby se vytvořilo nové
                        const betWithoutId = { ...bet };
                        delete betWithoutId.id;
                        await this.addBet(betWithoutId);
                    }

                    resolve(data.bets.length);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(reader.error);
            };

            reader.readAsText(file);
        });
    }

    // Smazání všech sázek
    async clearAllBets() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['bets'], 'readwrite');
            const objectStore = transaction.objectStore('bets');
            const request = objectStore.clear();

            request.onsuccess = () => {
                console.log('All bets cleared');
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Získání statistik
    async getStatistics() {
        const bets = await this.getAllBets();

        const stats = {
            totalBets: bets.length,
            activeBets: bets.filter(b => b.status === 'active').length,
            wonBets: bets.filter(b => b.status === 'won').length,
            lostBets: bets.filter(b => b.status === 'lost').length,
            totalPoints: bets.reduce((sum, bet) => sum + (parseFloat(bet.amount) || 0), 0),
            activePoints: bets
                .filter(b => b.status === 'active')
                .reduce((sum, bet) => sum + (parseFloat(bet.amount) || 0), 0)
        };

        return stats;
    }

    // Získání žebříčku sázejících
    async getLeaderboard() {
        const bets = await this.getAllBets();
        const bettors = {};

        // Agregace dat pro každého sázejícího
        for (const bet of bets) {
            if (!bettors[bet.bettorName]) {
                bettors[bet.bettorName] = {
                    name: bet.bettorName,
                    wins: 0,
                    losses: 0,
                    active: 0,
                    totalWon: 0,
                    totalLost: 0
                };
            }

            const bettor = bettors[bet.bettorName];
            const amount = parseFloat(bet.amount) || 0;

            switch (bet.status) {
                case 'won':
                    bettor.wins++;
                    bettor.totalWon += amount;
                    break;
                case 'lost':
                    bettor.losses++;
                    bettor.totalLost += amount;
                    break;
                case 'active':
                    bettor.active++;
                    break;
            }
        }

        // Převedení na pole a výpočet win rate
        const leaderboard = Object.values(bettors).map(bettor => {
            const total = bettor.wins + bettor.losses;
            bettor.winRate = total > 0 ? (bettor.wins / total * 100).toFixed(1) : 0;
            bettor.netPoints = bettor.totalWon - bettor.totalLost;
            return bettor;
        });

        // Seřazení podle win rate, pak podle počtu výher
        leaderboard.sort((a, b) => {
            if (b.winRate !== a.winRate) {
                return b.winRate - a.winRate;
            }
            return b.wins - a.wins;
        });

        return leaderboard;
    }
}

// Export singleton instance
const betDB = new BetDatabase();
