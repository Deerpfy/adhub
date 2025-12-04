# AdHub Multistream Chat v2

Jednotné webové rozhraní pro zobrazení chatů z více streamovacích platforem.

**Verze 2.0** - Kompletně přepracovaná verze, která funguje **100% v prohlížeči bez serveru**.

## Podporované platformy

| Platforma | Stav | Poznámka |
|-----------|------|----------|
| **Twitch** | ✅ Plná podpora | IRC WebSocket, badges, emotes |
| **Kick** | ✅ Plná podpora | Pusher WebSocket, badges, emotes |
| **YouTube** | ✅ Plná podpora | Data API v3, vyžaduje API klíč |

## Rychlý start

1. Otevřete `index.html` v prohlížeči
2. Klikněte na **"Přidat"**
3. Vyberte platformu a zadejte název kanálu
4. Hotovo! Chat se zobrazí automaticky.

```
Žádná instalace není potřeba.
Žádný server není potřeba.
Stačí otevřít index.html.
```

## Funkce

### Základní
- 🔗 Připojení k více kanálům současně
- 🎨 Moderní dark/light téma
- 📱 Responzivní design
- 💾 Automatické ukládání nastavení
- 🔄 Automatické reconnect při odpojení

### Chat
- 🏷️ Badge uživatelů (broadcaster, mod, vip, sub)
- 😀 Zobrazení emotes
- 🎨 Barevná jména uživatelů
- ⏱️ Časové značky
- 📏 Kompaktní režim

### Nastavení
- Export/import konfigurace
- Maximální počet zpráv
- Velikost písma
- Zobrazení/skrytí elementů

## Architektura

```
┌─────────────────────────────────────────────┐
│           Browser (index.html)              │
│  ┌─────────────────────────────────────┐   │
│  │            script.js                 │   │
│  │         (Main Controller)            │   │
│  └────────────┬────────────────────────┘   │
│               │                             │
│  ┌────────────┼────────────────────────┐   │
│  │            │                         │   │
│  ▼            ▼            ▼            │   │
│ Twitch     Kick       YouTube           │   │
│ Adapter    Adapter    Adapter           │   │
│  │            │            │            │   │
│  │ IRC WS     │ Pusher WS  │ HTTP API   │   │
│  └────────────┼────────────┼────────────┘   │
└──────────────┬┼────────────┼────────────────┘
               ││            │
               ▼▼            ▼
         Twitch IRC    Pusher.com    YouTube API
           Server       (Kick)         Server
```

## Platformy - detaily

### Twitch

- **Připojení**: IRC WebSocket (anonymní)
- **Formát**: `wss://irc-ws.chat.twitch.tv:443`
- **Autentizace**: Není potřeba (justinfan)
- **Omezení**: Pouze čtení (bez odesílání zpráv)

**Zadejte**: Název kanálu (např. `gamezense`)

### Kick

- **Připojení**: Pusher WebSocket
- **Formát**: `wss://ws-us2.pusher.com/app/...`
- **Autentizace**: Není potřeba
- **Omezení**: Pouze čtení

**Zadejte**: Název kanálu (např. `xqc`)

### YouTube

- **Připojení**: YouTube Data API v3
- **Metoda**: HTTP polling
- **Autentizace**: Vyžaduje API klíč

**Zadejte**:
- Video/Stream ID (z URL: `youtube.com/watch?v=ID`)
- YouTube API klíč ([získat zde](https://console.cloud.google.com/apis/credentials))

## Soubory

```
chat-panel/
├── index.html          # Hlavní HTML
├── styles.css          # CSS styly
├── script.js           # Hlavní logika
├── adapters/
│   ├── base-adapter.js     # Základní třída
│   ├── twitch-adapter.js   # Twitch IRC
│   ├── kick-adapter.js     # Kick Pusher
│   └── youtube-adapter.js  # YouTube API
├── README.md           # Tato dokumentace
└── v1-archive/         # Archiv původní verze
```

## Rozdíly oproti v1

| Vlastnost | v1 | v2 |
|-----------|----|----|
| Server | Vyžadován (Node.js) | Není potřeba |
| Instalace | `npm install` | Žádná |
| Spuštění | `npm start` | Otevřít HTML |
| Závislosti | tmi.js, ws, express... | Žádné |
| Kick připojení | HTTP polling přes server | Přímý Pusher WS |
| Twitch připojení | tmi.js přes server | Přímý IRC WS |

## Omezení

### Obecná
- **Pouze čtení** - Nelze odesílat zprávy (vyžadovalo by autentizaci)
- **CORS** - Některá API nelze volat přímo z browseru

### YouTube
- Vyžaduje API klíč (bezplatný, ale s limity)
- API quota: ~10,000 jednotek/den
- Funguje pouze pro **živé** streamy

### Kick
- Používá neoficiální Pusher endpoint
- Může se změnit bez varování

## Vývoj

### Přidání nové platformy

1. Vytvořte nový adapter v `adapters/`
2. Dědí z `BaseAdapter`
3. Implementujte `connect()`, `disconnect()`, `normalizeMessage()`
4. Přidejte formulář do `index.html`
5. Přidejte handler do `script.js`

### Normalizovaný formát zprávy

```javascript
{
  id: 'unique-message-id',
  platform: 'twitch|kick|youtube',
  channel: 'channel-name',
  author: {
    id: 'user-id',
    username: 'user_name',
    displayName: 'Display Name',
    color: '#FF0000',
    badges: [{ type, id, url, title }],
    roles: { broadcaster, moderator, vip, subscriber }
  },
  content: 'Message text',
  emotes: [{ id, name, url, start, end }],
  timestamp: Date,
  raw: { /* original data */ }
}
```

## Changelog

### v2.0.0 (2024-12-04)
- Kompletní přepracování
- Odstranění závislosti na serveru
- Přímé WebSocket připojení
- Nový design
- Podpora dark/light tématu

### v1.x (archivováno)
- Původní verze s Node.js serverem
- Viz `v1-archive/`

## Licence

MIT

## Autor

Deerpfy - [github.com/Deerpfy/adhub](https://github.com/Deerpfy/adhub)
