# Chat Panel - Podrobná analýza stávajícího stavu

> **Projekt:** AdHub Multistream Chat v2
> **Umístění:** `projects/chat-panel/`
> **Datum analýzy:** 2026-02-06

---

## 1. Přehled architektury

### Klíčové rozhodnutí: 100% client-side (v2)

Chat Panel v2 je kompletně browser-based aplikace bez serveru. Původní Node.js WebSocket server (archivován v `v1-archive/`) byl nahrazen přímými WebSocket připojeními z prohlížeče.

```
┌─────────────────────────────────────────────────────────────┐
│                        PROHLÍŽEČ                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    index.html + script.js              │   │
│  │                                                        │   │
│  │  AppState (channels, messages, settings, highlights)   │   │
│  │  handleMessage() → renderMessage() → DOM               │   │
│  └──────────┬──────────┬──────────┬──────────────────────┘   │
│             │          │          │                           │
│  ┌──────────▼───┐ ┌────▼─────┐ ┌─▼──────────────────────┐  │
│  │ TwitchAdapter │ │KickAdapter│ │ YouTubeAdapter(s)      │  │
│  │  IRC WS       │ │ Pusher WS │ │ API / iframe / ext    │  │
│  └──────┬───────┘ └────┬──────┘ └──────┬─────────────────┘  │
│         │              │               │                     │
└─────────┼──────────────┼───────────────┼─────────────────────┘
          │              │               │
          ▼              ▼               ▼
   wss://irc-ws     wss://ws-us2    googleapis.com
   .chat.twitch.tv  .pusher.com     /youtube/v3
```

### Adapter Pattern

Všechny platformy dědí z `BaseAdapter` (`adapters/base-adapter.js`):

| Metoda | Popis |
|--------|-------|
| `connect()` | Připojení k platformě |
| `disconnect()` | Odpojení |
| `normalizeMessage(raw)` | Převod do společného formátu |
| `on(event, cb)` | Registrace event listeneru |
| `emit(event, data)` | Emitování eventu |
| `_attemptReconnect()` | Exponential backoff reconnect |

Eventy: `message`, `connect`, `disconnect`, `error`, `stateChange`

---

## 2. Platformové adaptery - detailní rozbor

### 2.1 Twitch (`adapters/twitch-adapter.js`)

**Protokol:** IRC přes WebSocket
**Endpoint:** `wss://irc-ws.chat.twitch.tv:443`
**Autentizace:** Anonymní (`justinfan` + random číslo)
**Možnosti:** Pouze čtení (anonymous = read-only)

**Tok připojení:**
1. `CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership`
2. `PASS SCHMOOPIIE`
3. `NICK justinfan{random}`
4. Po `001` → `JOIN #channel`
5. Po `366` → připojeno, spustit ping timer

**Parsované tagy z IRC zpráv:**
- `display-name`, `user-id`, `color` → info o autorovi
- `badges` → broadcaster, moderator, vip, subscriber, premium, partner
- `emotes` → pozice emotes v textu (formát: `id:start-end/id:start-end`)
- `tmi-sent-ts` → timestamp
- `id` → unikátní ID zprávy

**Co chybí (omezení anonymního režimu):**
- Žádné EventSub eventy (sub, follow, donate, raid)
- Žádná možnost moderace (anonymní uživatel nemůže banovat)
- Žádné channel point redemptions

### 2.2 Kick (`adapters/kick-adapter.js`)

**Protokol:** Pusher WebSocket
**Endpoint:** `wss://ws-{cluster}.pusher.com/app/{key}?protocol=7`
**Autentizace:** Žádná (veřejné kanály)
**Aktuální klíč:** `32cbd69e4b950bf97679` (prosinec 2024)

**Strategie nalezení chatroom ID:**
1. Provided v konstruktoru
2. Manuální formát `channel:id`
3. Hardcoded databáze (~24 streamerů)
4. localStorage cache
5. API call (obvykle blokován CORS)

**Odebírané Pusher kanály:**
- `chatrooms.{chatroomId}.v2` → chat zprávy

**Zpracovávané eventy:**
- `App\Events\ChatMessageEvent` → zpráva
- `App\Events\ChatMessageDeletedEvent` → smazání
- `App\Events\UserBannedEvent` → ban (pouze log)

**Co chybí:**
- **Neodebírá** `channel.{channelId}` → žádné sub/follow/gift/raid eventy
- `channelId` ≠ `chatroomId` → je potřeba další ID
- Žádná podpora donací (Kick nemá veřejný Pusher event pro tipy)

### 2.3 YouTube - 3 varianty

| Varianta | Soubor | Metoda | Auth |
|----------|--------|--------|------|
| API | `youtube-adapter.js` | HTTP polling googleapis | API Key |
| Extension | `youtube-extension-adapter.js` | Chrome Extension bridge | Ne |
| Iframe | `youtube-iframe-adapter.js` | Embedded iframe | Ne |

---

## 3. Formát normalizované zprávy

Všechny adaptery převádějí platformní zprávy do tohoto formátu:

```javascript
{
  id: string,                    // Unikátní ID
  platform: 'twitch'|'kick'|'youtube',
  channel: string,               // Název kanálu
  author: {
    id: string,
    username: string,
    displayName: string,
    color: string,               // #RRGGBB
    badges: [{
      type: string,              // broadcaster, moderator, vip, subscriber
      id: string,
      url: string,               // URL obrázku badge
      title: string
    }],
    roles: {
      broadcaster: boolean,
      moderator: boolean,
      vip: boolean,
      subscriber: boolean
    }
  },
  content: string,               // Text zprávy
  emotes: [{
    id: string,
    name: string,
    url: string,
    start: number,
    end: number
  }],
  timestamp: Date,
  raw: object                    // Původní data
}
```

**Důležité:** Tento formát nepodporuje event alerty (sub, follow, donate). Je potřeba rozšíření.

---

## 4. Renderování zpráv

### Flow dat

```
Adapter.emit('message', normalized)
    ↓
handleMessage(message)        [script.js:881]
    ↓
AppState.messages.push()      [buffer, max 500 zpráv]
    ↓
renderMessage(message)        [script.js:898]
    ↓
DOM.chatContainer → .chat-messages
```

### HTML struktura zprávy

```html
<div class="chat-message platform-twitch" data-message-id="...">
  <div class="message-streamer-label twitch">
    <span class="streamer-icon"><!-- SVG ikona --></span>
    <span class="streamer-name">channelName</span>
  </div>
  <div class="message-body">
    <span class="message-timestamp">14:30</span>
    <span class="message-content">
      <span class="user-badges">
        <img class="user-badge" src="..." alt="Moderator" title="Moderator">
      </span>
      <span class="message-author moderator" style="color: #FF0000">Username</span>
      <span class="message-text">Zpráva s <img class="message-emote"> emotes</span>
    </span>
  </div>
</div>
```

### CSS třídy pro role

```
.broadcaster  → zlatá barva (#FFD700)
.moderator    → zelená (#00FF00)
.vip          → purpurová (#FF00FF)
.subscriber   → modrá
```

---

## 5. Nastavení a úložiště

### AppState.settings

| Klíč | Typ | Default | Popis |
|------|-----|---------|-------|
| `showTimestamps` | bool | true | Zobrazit časy zpráv |
| `showPlatformBadges` | bool | true | Platformní ikony |
| `showEmotes` | bool | true | Zobrazit emotes |
| `compactMode` | bool | false | Kompaktní režim |
| `maxMessages` | number | 500 | Max zpráv v bufferu |
| `fontSize` | number | 14 | Velikost písma (12-18px) |
| `theme` | string | 'dark' | Téma (dark/light) |

### localStorage klíče

| Klíč | Obsah |
|------|-------|
| `adhub_channels` | JSON pole kanálů |
| `adhub_settings` | Nastavení uživatele |
| `adhub_highlighted_channels` | Filtrované kanály |
| `kick_pusher_config` | Cached Pusher key+cluster |
| `kick_chatroom_{name}` | Cached chatroom IDs |
| `adhub_chat_reader_*` | Extension detekce |

---

## 6. Chrome Extension (v2.1.0)

### Komponenty

| Soubor | Funkce |
|--------|--------|
| `background.js` | Service worker, tab management |
| `youtube-content.js` | Extraktor YouTube chat zpráv |
| `twitch-injector.js` | Injektor moderačních příkazů do Twitch |
| `adhub-bridge.js` | Komunikační most web ↔ extension |
| `popup.html/js` | UI rozšíření |

### Komunikační architektura

```
AdHub Web App (index.html)
    ↕ window.postMessage()
adhub-bridge.js (content script)
    ↕ chrome.runtime.sendMessage()
background.js (service worker)
    ↕ chrome.tabs.sendMessage()
youtube-content.js / twitch-injector.js
```

---

## 7. Identifikované mezery pro rozšíření

### 7.1 Event Alerts

**Stav:** Neimplementováno
**Potřeba:** Zobrazit subscribe, follow, donate, raid, gift sub alerty přímo v chatu
**Detailní návrh:** viz `chat-panel-event-alerts.md`

### 7.2 OBS Browser Source endpoint

**Stav:** Neexistuje
**Potřeba:** URL pro OBS browser source s přenositelnou konfigurací
**Detailní návrh:** viz `chat-panel-obs-api.md`

### 7.3 Streamlabs CSS import

**Stav:** Neexistuje
**Potřeba:** Import Streamlabs custom CSS/HTML pro stylizaci chatu
**Detailní návrh:** viz `chat-panel-streamlabs-import.md`

---

## 8. Statistiky kódu

| Soubor | Řádky | Účel |
|--------|-------|------|
| `script.js` | 2 547 | Hlavní logika |
| `styles.css` | ~800 | Styly |
| `index.html` | 415 | UI |
| `adapters/twitch-adapter.js` | 419 | Twitch IRC |
| `adapters/kick-adapter.js` | 684 | Kick Pusher |
| `adapters/youtube-adapter.js` | ~400 | YouTube API |
| `adapters/base-adapter.js` | 221 | Základ |
| **Celkem** | **~6 500** | JS/HTML/CSS |

---

## 9. Silné stránky architektury

1. **Čistý adapter pattern** → snadné přidání nových platforem
2. **Normalizovaný formát zpráv** → jednotné renderování
3. **Event-driven** → loose coupling mezi komponentami
4. **Žádný server** → nulové náklady na hosting
5. **localStorage persistence** → nastavení přežijí refresh

## 10. Slabé stránky a rizika

1. **Anonymní režim** → nelze přijímat EventSub eventy (vyžadují OAuth)
2. **Kick CORS** → nelze spolehlivě zjistit chatroom/channel ID z API
3. **YouTube quota** → 10 000 units/den omezuje API polling
4. **Žádný event system pro alerty** → není připraven na sub/follow/donate
5. **Pusher klíče** → Kick může kdykoliv změnit, vyžaduje manuální aktualizaci
