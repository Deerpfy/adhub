# 🚀 Rychlý start - Multistream Chat

## ✅ Co potřebujete

- **Node.js** (stáhněte z https://nodejs.org/)
- **Prohlížeč** (Chrome, Firefox, Edge, atd.)

Python **NENÍ potřeba**!

---

## 📋 Krok za krokem

### 1️⃣ Spusťte Backend Server

Otevřete terminál (cmd na Windows, Terminal na Mac/Linux) a spusťte:

```bash
cd chat-panel/server
npm install
npm start
```

Měli byste vidět:
```
🚀 Multistream Chat Server running on port 3001
📡 WebSocket server: ws://localhost:3001
🌐 HTTP server: http://localhost:3001
```

**Nechte tento terminál otevřený!**

### 2️⃣ Otevřete Frontend

Máte **3 možnosti**:

#### Možnost A: Přímo v prohlížeči (nejjednodušší)
1. Najděte soubor `chat-panel/index.html`
2. Dvojklikněte na něj nebo klikněte pravým tlačítkem → "Otevřít pomocí" → vyberte prohlížeč

#### Možnost B: Pomocí Node.js (pokud máte)
```bash
cd chat-panel
npx http-server -p 8000
```
Pak otevřete: `http://localhost:8000`

#### Možnost C: Ostatní způsoby
- Windows: Otevřete PowerShell, přejděte do `chat-panel` a spusťte: `start index.html`
- Nebo použijte jakýkoliv jiný lokální webový server

### 3️⃣ Přidejte Chaty

1. Klikněte na **"Přidat Chat"**
2. Zadejte URL nebo název kanálu:
   - **Twitch**: `gamezense` nebo `https://www.twitch.tv/gamezense`
   - **Kick**: `username` nebo `https://kick.com/username`
3. Vyberte platformu
4. Klikněte **"Přidat"**
5. Chat se automaticky připojí!

---

## ⚠️ Řešení problémů

### "Cannot connect to backend server"
- **Ujistěte se, že backend server běží** (krok 1)
- Zkontrolujte, že terminál se serverem je otevřený
- Zkontrolujte, že vidíte zprávu "🚀 Multistream Chat Server running on port 3001"

### "npm není rozpoznán jako příkaz"
- Instalujte Node.js z https://nodejs.org/
- Po instalaci restartujte terminál
- Zkontrolujte: `node --version` a `npm --version`

### Frontend se nenačte
- Zkuste použít lokální webový server (Možnost B výše)
- Nebo použijte Iframe režim místo Streamlabs režimu

---

## 💡 Tipy

- **Streamlabs režim** = vyžaduje backend server (krok 1)
- **Iframe režim** = funguje bez serveru, ale má omezení
- Backend server může běžet na pozadí - nemusíte ho sledovat

---

## 📝 Struktura souborů

```
chat-panel/
├── index.html          ← Frontend (otevřete v prohlížeči)
├── script.js           ← JavaScript frontendu
├── styles.css          ← Styly
└── server/             ← Backend server
    ├── server.js       ← Node.js server
    └── package.json    ← Závislosti
```






