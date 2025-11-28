# Chat Panel - Unified Streaming Chat

![Status](https://img.shields.io/badge/status-complete-success) ![License](https://img.shields.io/badge/license-MIT-blue)

Lokálně hostovaná webová aplikace pro zobrazení a správu chatů z různých streamovacích platforem (Twitch, YouTube, Kick) v jednom panelovém rozhraní.

## Funkce

- ✅ Přidávání více chat zdrojů najednou
- ✅ Podpora pro Twitch, YouTube, Kick a další platformy
- ✅ **Dva zobrazení stylu**:
  - **Streamlabs Style**: Vlastní chat renderer s animacemi (podporuje Twitch, Kick)
  - **Iframe Style**: Klasické iframe zobrazení (podporuje všechny platformy)
- ✅ **Dva režimy zobrazení**:
  - **Rozdělené**: Každý chat v samostatném panelu
  - **Sjednocené**: Všechny chaty v jednom zobrazení
- ✅ Ukládání nastavení do localStorage (přetrvá i po zavření prohlížeče)
- ✅ Moderní a responzivní design
- ✅ Snadné přidávání a odebírání chatů
- ✅ Streamlabs-style animace a transparentní pozadí

## Použití

### 🚀 Rychlý start (Backend Server - Doporučeno)

1. **Spusťte backend server:**
   ```bash
   cd chat-panel/server
   npm install
   npm start
   ```
   Server poběží na `http://localhost:3001`
   
   **Nechte tento terminál otevřený!**

2. **Otevřete frontend:**
   
   **Možnost A - Nejjednodušší:**
   - Dvojklikněte na `chat-panel/index.html`
   - Nebo klikněte pravým tlačítkem → "Otevřít pomocí" → vyberte prohlížeč
   
   **Možnost B - Pomocí Node.js:**
   ```bash
   cd chat-panel
   npx http-server -p 8000
   ```
   Pak otevřete: `http://localhost:8000`
   
   **Možnost C - Windows PowerShell:**
   ```powershell
   cd chat-panel
   start index.html
   ```
   
   ⚠️ **Python NENÍ potřeba!** Byl zmíněn jen jako alternativa.

3. **Přidejte chaty:**
   - Klikněte na "Přidat Chat"
   - Pro **Twitch**: Zadejte URL kanálu, např. `https://www.twitch.tv/gamezense` nebo jen `gamezense`
   - Pro **Kick**: Zadejte URL kanálu, např. `https://kick.com/username` nebo jen `username`
   - Vyberte "Streamlabs" režim

### Spuštění bez backend serveru (Iframe režim)

1. Otevřete soubor `index.html` v prohlížeči (např. Chrome, Firefox, Edge)
   - Můžete jednoduše dvojkliknout na soubor `index.html`
   - Nebo použít lokální webový server (doporučeno pro lepší funkčnost)

### Lokální webový server (doporučeno)

Pro nejlepší funkčnost, zejména kvůli iframe a bezpečnostním pravidlům, použijte lokální server:

#### Python 3
```bash
cd chat-panel
python -m http.server 8000
```
Pak otevřete: `http://localhost:8000`

#### Node.js (s http-server)
```bash
npx http-server chat-panel -p 8000
```
Pak otevřete: `http://localhost:8000`

#### PHP
```bash
cd chat-panel
php -S localhost:8000
```
Pak otevřete: `http://localhost:8000`

### Přidávání chat zdrojů

#### Pro Streamlabs režim (s backend serverem):
1. **Ujistěte se, že backend server běží** (viz výše)
2. Klikněte na tlačítko **"Přidat Chat"**
3. Zadejte **URL kanálu nebo jen název kanálu**:
   - **Twitch**: `https://www.twitch.tv/gamezense` nebo jen `gamezense`
   - **Kick**: `https://kick.com/username` nebo jen `username`
4. Volitelně zadejte název chatu
5. Vyberte platformu
6. Klikněte na **"Přidat"**
7. Chat se automaticky připojí přes backend server

#### Pro Iframe režim (bez backend serveru):
1. Klikněte na tlačítko **"Přidat Chat"**
2. Zadejte URL chatu nebo kanálu:
   - **Twitch**: `https://www.twitch.tv/popout/USERNAME/chat`
     - ⚠️ **Důležité**: Twitch má bezpečnostní omezení, které může blokovat vložení chatu do iframe
   - **YouTube**: URL z live streamu (aplikace automaticky vytvoří chat URL)
   - **Kick**: `https://kick.com/USERNAME/chatroom`
     - ⚠️ **Poznámka**: Kick chat historie se může načítat až po připojení k aktivnímu live streamu
3. Volitelně zadejte název chatu
4. Vyberte platformu
5. Klikněte na **"Přidat"**

### ⚠️ Omezení Twitch chatu

Twitch má bezpečnostní omezení (X-Frame-Options), které může zabránit vložení chatu přímo do webové stránky. Pokud se Twitch chat nenačte:

1. **Použijte OBS Browser Source**:
   - Přidejte Browser Source v OBS
   - Zadejte URL: `https://www.twitch.tv/popout/USERNAME/chat`
   
2. **Otevřete v novém okně**:
   - Aplikace zobrazí odkaz pro otevření chatu v novém okně

3. **Alternativní řešení**:
   - Použijte oficiální Twitch aplikaci
   - Nebo použijte chat overlay aplikaci (např. StreamLabs Chat, StreamElements)

### ⚠️ Poznámky k Kick chatu

Kick chat může mít následující omezení:

- **Historie chatu**: Kick chat historie se načítá obvykle až když je stream aktivní (live)
- **"Page not found" chyba**: Aplikace automaticky zkusí alternativní URL formát pokud chatroom endpoint nefunguje
- **OBS Browser Source**: Pro nejlepší výsledky použijte OBS Browser Source s URL: `https://kick.com/USERNAME/chatroom`

### Příklady URL

**Twitch:**
```
https://www.twitch.tv/popout/ninja/chat
```

**YouTube:**
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```
(aplikace automaticky převede na chat URL)

**Kick:**
```
https://kick.com/xqc/chatroom
```

### Klávesové zkratky

- `Ctrl/Cmd + N` - Otevřít dialog pro přidání chatu
- `ESC` - Zavřít dialog

### Režimy zobrazení

#### Styl zobrazení (Streamlabs / Iframe)
- **Streamlabs Style**: Vlastní renderer chatu s animacemi, transparentním pozadím a barevnými uživatelskými jmény
  - Podporuje: **Twitch** (přes TMI.js), **Kick** (částečně)
  - Vlastní styl podobný Streamlabs Chat overlay
  - Plynulé animace při příchodu zpráv
- **Iframe Style**: Klasické iframe zobrazení
  - Podporuje všechny platformy
  - Zobrazuje oficiální chat z platformy

Přepínání pomocí tlačítka **"Streamlabs / Iframe"**.

#### Režim layoutu (Sjednocený / Rozdělený)
- **Rozdělený režim**: Každý chat je zobrazen v samostatném panelu vedle sebe
- **Sjednocený režim**: Všechny chaty jsou zobrazeny pod sebou v jednom sloupci

Přepínání pomocí tlačítka **"Sjednocený / Rozdělený"**.

## Odebrání chatů

- Klikněte na tlačítko **"×"** v pravém horním rohu každého chatu pro jeho odebrání
- Tlačítko **"Vymazat Vše"** odstraní všechny chaty najednou

## Poznámky

- Nastavení se automaticky ukládají do localStorage prohlížeče
- Některé chaty mohou mít omezení kvůli bezpečnostním pravidlům (CORS, X-Frame-Options)
- Pro nejlepší funkčnost používejte lokální webový server místo otevírání souboru přímo

## Podporované platformy

- ✅ Twitch
- ✅ YouTube
- ✅ Kick
- ✅ Vlastní chat URL (jakékoliv URL které lze zobrazit v iframe)

## Struktura souborů

```
chat-panel/
├── index.html      # Hlavní HTML soubor
├── styles.css      # Styly aplikace
├── script.js       # JavaScript funkcionalita
└── README.md       # Tato dokumentace
```

## Technické detaily

- Čistý HTML/CSS/JavaScript (žádné externí závislosti)
- Použití localStorage pro perzistenci dat
- Responzivní design podporující mobilní zařízení
- Moderní CSS Grid layout pro flexibilní zobrazení panelů

---

**Součást projektu [AdHUB](../../index.html)** | [Zpět na hub](../../index.html)

