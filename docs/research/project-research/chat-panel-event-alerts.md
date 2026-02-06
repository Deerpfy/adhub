# Chat Panel - Event Alerts (Subscribe, Follow, Donate, Raid)

> **Projekt:** AdHub Multistream Chat v2
> **Účel:** Návrh systému pro zobrazení event alertů v chatu
> **Datum:** 2026-02-06
> **Souvisí s:** `chat-panel-analyza.md`, `chat-panel-obs-api.md`

---

## 1. Přehled cíle

Rozšířit Chat Panel o zobrazení event alertů přímo v proudu zpráv:
- **Subscribe** (nový sub, resub, gift sub)
- **Follow** (nový follower)
- **Donate / Cheer** (peněžní dary, bits)
- **Raid** (příchozí raid)
- **Channel Points** (redemptions)

Podpora pro: **Twitch** (plná) a **Kick** (částečná - bez donací).

---

## 2. Architektura: Event Alert System

### 2.1 Rozšířený formát normalizované zprávy

Stávající `NormalizedMessage` se rozšíří o nový typ `alert`:

```javascript
// Nový typ: NormalizedAlert (rozšíření NormalizedMessage)
{
  id: string,
  platform: 'twitch' | 'kick',
  channel: string,
  type: 'alert',                          // NOVÝ - odlišení od 'message'
  alertType: string,                       // Typ alertu (viz tabulka níže)
  author: {
    id: string,
    username: string,
    displayName: string,
    color: string,
    badges: [],
    roles: {}
  },
  content: string,                         // Popis alertu (lidsky čitelný)
  alertData: {                             // NOVÝ - strukturovaná data alertu
    // Pro subscribe:
    tier: '1000' | '2000' | '3000',       // Twitch tier
    months: number,                        // Celkový počet měsíců
    streak: number,                        // Streak měsíců
    isGift: boolean,
    gifterName: string,                    // Kdo daroval sub
    giftCount: number,                     // Počet gift subů najednou
    message: string,                       // Resub zpráva

    // Pro follow:
    followedAt: Date,

    // Pro donate/cheer:
    amount: number,                        // Částka/bits
    currency: string,                      // 'bits' | 'USD' | 'CZK' atd.
    donateMessage: string,

    // Pro raid:
    viewers: number,                       // Počet diváků v raidu
    fromChannel: string,                   // Kdo raiduje

    // Pro channel points:
    rewardTitle: string,
    rewardCost: number,
    userInput: string
  },
  timestamp: Date,
  raw: object
}
```

### 2.2 Alert typy

| alertType | Popis | Twitch | Kick |
|-----------|-------|--------|------|
| `subscribe` | Nový sub | ✅ | ✅ |
| `resubscribe` | Resub se zprávou | ✅ | ✅ (renewal) |
| `gift_sub` | Dárce gift subů | ✅ | ✅ |
| `gift_sub_received` | Příjemce gift subu | ✅ | ✅ |
| `follow` | Nový follower | ✅ | ✅ |
| `cheer` | Bits/cheers | ✅ | ❌ |
| `donation` | Peněžní dar | ❌* | ❌* |
| `raid` | Příchozí raid | ✅ | ✅ (host) |
| `channel_points` | Redemption | ✅ | ❌ |

*\*Donation přes třetí strany (Streamlabs, StreamElements) - řešeno separátně*

---

## 3. Twitch EventSub implementace

### 3.1 Proč nestačí anonymní IRC

Stávající Twitch adapter používá anonymní IRC (`justinfan`), které:
- ✅ Čte chat zprávy
- ❌ **Nepřijímá** USERNOTICE (sub, resub, gift sub, raid) - tyto IRC zprávy sice existují, ale mají omezené tagy pro anonymního uživatele
- ❌ **Nepřijímá** EventSub eventy (follow, cheer, channel points)

### 3.2 Dvě cesty k řešení

#### Cesta A: IRC USERNOTICE (bez autentizace)

Anonymní IRC **přijímá** některé USERNOTICE zprávy, ale s omezenými daty:

```
@badge-info=;badges=;color=#9ACD32;display-name=Gifter;emotes=;
msg-id=subgift;msg-param-months=1;msg-param-recipient-display-name=Recipient;
msg-param-sub-plan=1000;system-msg=Gifter\sgifted\sa\sTier\s1\ssub\sto\sRecipient!
:tmi.twitch.tv USERNOTICE #channel
```

**Podporované USERNOTICE typy v anonymním IRC:**

| msg-id | Popis | Data dostupná |
|--------|-------|---------------|
| `sub` | Nový sub | tier, plan-name |
| `resub` | Resub | months, streak, message |
| `subgift` | Gift sub | recipient, tier, months |
| `submysterygift` | Mystery gift | mass-gift-count, tier |
| `raid` | Raid | viewer-count, raider name |
| `ritual` | Ritual (new chatter) | ritual-name |

**Výhody:** Žádná OAuth autentizace, funguje hned.
**Nevýhody:** Chybí follow, cheer/bits, channel points. Data jsou méně strukturovaná.

**Implementace:**

V `TwitchAdapter._connectIrc()` onmessage handler rozšířit o:

```javascript
// V existujícím onmessage handleru:
if (message.includes('USERNOTICE')) {
    this._handleUsernotice(message);
}
```

```javascript
/**
 * Zpracování USERNOTICE (sub, resub, gift, raid)
 */
_handleUsernotice(raw) {
    try {
        const tags = this._parseIrcTags(raw);
        const msgId = tags['msg-id'];

        if (!msgId) return;

        const alert = this._createAlertFromUsernotice(tags, msgId);
        if (alert) {
            this.emit('alert', alert);
        }
    } catch (error) {
        console.error('[Twitch] Error parsing USERNOTICE:', error);
    }
}

_parseIrcTags(raw) {
    const tagMatch = raw.match(/^@([^ ]+) /);
    const tags = {};
    if (tagMatch) {
        tagMatch[1].split(';').forEach(tag => {
            const idx = tag.indexOf('=');
            if (idx !== -1) {
                tags[tag.substring(0, idx)] = tag.substring(idx + 1)
                    .replace(/\\s/g, ' ')
                    .replace(/\\n/g, '\n')
                    .replace(/\\\\/g, '\\');
            }
        });
    }
    return tags;
}

_createAlertFromUsernotice(tags, msgId) {
    const base = {
        id: tags.id || `twitch-alert-${Date.now()}`,
        platform: 'twitch',
        channel: this.channel,
        type: 'alert',
        timestamp: new Date(parseInt(tags['tmi-sent-ts']) || Date.now()),
        raw: tags,
        author: {
            id: tags['user-id'] || '',
            username: (tags['display-name'] || tags.login || 'Unknown').toLowerCase(),
            displayName: tags['display-name'] || tags.login || 'Unknown',
            color: tags.color || '#FFFFFF',
            badges: this._parseBadges(tags.badges || ''),
            roles: {}
        }
    };

    switch (msgId) {
        case 'sub':
            return {
                ...base,
                alertType: 'subscribe',
                content: tags['system-msg'] || `${base.author.displayName} subscribed!`,
                alertData: {
                    tier: tags['msg-param-sub-plan'] || '1000',
                    months: 1,
                    isGift: false,
                }
            };

        case 'resub':
            return {
                ...base,
                alertType: 'resubscribe',
                content: tags['system-msg'] || `${base.author.displayName} resubscribed!`,
                alertData: {
                    tier: tags['msg-param-sub-plan'] || '1000',
                    months: parseInt(tags['msg-param-cumulative-months']) || 1,
                    streak: parseInt(tags['msg-param-streak-months']) || 0,
                    message: tags['msg-param-sub-plan-name'] || '',
                    isGift: false,
                }
            };

        case 'subgift':
            return {
                ...base,
                alertType: 'gift_sub',
                content: tags['system-msg'] || `${base.author.displayName} gifted a sub!`,
                alertData: {
                    tier: tags['msg-param-sub-plan'] || '1000',
                    months: parseInt(tags['msg-param-months']) || 1,
                    isGift: true,
                    gifterName: base.author.displayName,
                    giftRecipient: tags['msg-param-recipient-display-name'] || 'Unknown',
                }
            };

        case 'submysterygift':
            return {
                ...base,
                alertType: 'gift_sub',
                content: tags['system-msg'] || `${base.author.displayName} gifted ${tags['msg-param-mass-gift-count']} subs!`,
                alertData: {
                    tier: tags['msg-param-sub-plan'] || '1000',
                    isGift: true,
                    gifterName: base.author.displayName,
                    giftCount: parseInt(tags['msg-param-mass-gift-count']) || 1,
                }
            };

        case 'raid':
            return {
                ...base,
                alertType: 'raid',
                content: tags['system-msg'] || `${base.author.displayName} raided with ${tags['msg-param-viewerCount']} viewers!`,
                alertData: {
                    viewers: parseInt(tags['msg-param-viewerCount']) || 0,
                    fromChannel: base.author.displayName,
                }
            };

        default:
            return null;
    }
}
```

#### Cesta B: Twitch EventSub WebSocket (vyžaduje OAuth)

Pro plnou podporu (follow, cheer, channel points) je potřeba Twitch EventSub.

**Nový soubor:** `adapters/twitch-eventsub-adapter.js`

**Požadované OAuth scopes:**

| Event | Scope |
|-------|-------|
| `channel.subscribe` | `channel:read:subscriptions` |
| `channel.subscription.gift` | `channel:read:subscriptions` |
| `channel.subscription.message` | `channel:read:subscriptions` |
| `channel.follow` (v2) | `moderator:read:followers` |
| `channel.cheer` | `bits:read` |
| `channel.raid` | *žádný* |
| `channel.channel_points_custom_reward_redemption.add` | `channel:read:redemptions` |

**OAuth flow (Implicit Grant - browser-friendly):**

```javascript
class TwitchEventSubManager {
    constructor() {
        this.clientId = null;      // Uživatel musí poskytnout
        this.accessToken = null;   // Z OAuth flow
        this.ws = null;
        this.sessionId = null;
        this.subscriptions = [];
    }

    /**
     * Zahájení OAuth flow
     */
    startAuth(clientId, redirectUri) {
        this.clientId = clientId;
        const scopes = [
            'channel:read:subscriptions',
            'moderator:read:followers',
            'bits:read',
            'channel:read:redemptions'
        ].join('+');

        const authUrl = `https://id.twitch.tv/oauth2/authorize`
            + `?response_type=token`
            + `&client_id=${clientId}`
            + `&redirect_uri=${encodeURIComponent(redirectUri)}`
            + `&scope=${scopes}`;

        // Otevřít popup pro autorizaci
        window.open(authUrl, 'twitch-auth', 'width=500,height=700');
    }

    /**
     * Připojení k EventSub WebSocket
     */
    async connect(broadcasterId) {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

            this.ws.onmessage = async (event) => {
                const data = JSON.parse(event.data);

                switch (data.metadata.message_type) {
                    case 'session_welcome':
                        this.sessionId = data.payload.session.id;
                        // Registrovat odběry (do 10 sekund!)
                        await this._registerSubscriptions(broadcasterId);
                        resolve();
                        break;

                    case 'notification':
                        this._handleEvent(data);
                        break;

                    case 'session_keepalive':
                        // Spojení je v pořádku
                        break;

                    case 'session_reconnect':
                        this._handleReconnect(data.payload.session.reconnect_url);
                        break;
                }
            };

            this.ws.onerror = () => reject(new Error('EventSub connection failed'));

            setTimeout(() => {
                if (!this.sessionId) {
                    reject(new Error('EventSub welcome timeout'));
                    this.ws.close();
                }
            }, 15000);
        });
    }

    /**
     * Registrace odběrů přes Helix API
     */
    async _registerSubscriptions(broadcasterId) {
        const eventTypes = [
            { type: 'channel.subscribe', version: '1', condition: { broadcaster_user_id: broadcasterId } },
            { type: 'channel.subscription.gift', version: '1', condition: { broadcaster_user_id: broadcasterId } },
            { type: 'channel.subscription.message', version: '1', condition: { broadcaster_user_id: broadcasterId } },
            { type: 'channel.follow', version: '2', condition: { broadcaster_user_id: broadcasterId, moderator_user_id: broadcasterId } },
            { type: 'channel.cheer', version: '1', condition: { broadcaster_user_id: broadcasterId } },
            { type: 'channel.raid', version: '1', condition: { to_broadcaster_user_id: broadcasterId } },
        ];

        for (const sub of eventTypes) {
            try {
                const resp = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Client-Id': this.clientId,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...sub,
                        transport: {
                            method: 'websocket',
                            session_id: this.sessionId
                        }
                    })
                });

                if (!resp.ok) {
                    console.warn(`[EventSub] Failed to subscribe to ${sub.type}:`, await resp.text());
                }
            } catch (error) {
                console.error(`[EventSub] Error subscribing to ${sub.type}:`, error);
            }
        }
    }

    /**
     * Zpracování EventSub notifikace
     */
    _handleEvent(data) {
        const eventType = data.metadata.subscription_type;
        const event = data.payload.event;

        // Převod na NormalizedAlert a emitování
        // (viz normalizační funkce níže)
    }
}
```

### 3.3 Doporučená strategie: Hybridní přístup

```
┌──────────────────────────────────────────────────────────┐
│  TwitchAdapter (anonymní IRC) - STÁVAJÍCÍ                 │
│  ✅ Chat zprávy                                           │
│  ✅ USERNOTICE: sub, resub, gift sub, raid (Cesta A)      │
│  ❌ follow, cheer, channel points                         │
└──────────────────────────┬───────────────────────────────┘
                           │ + volitelné
┌──────────────────────────▼───────────────────────────────┐
│  TwitchEventSubManager (OAuth) - NOVÝ, volitelný          │
│  ✅ follow, cheer, channel points                         │
│  ✅ Přesnější sub/resub data                              │
│  ⚠ Vyžaduje Twitch Developer App + OAuth                  │
└──────────────────────────────────────────────────────────┘
```

**Priorita implementace:**
1. **Fáze 1** (bez auth): USERNOTICE parsing v TwitchAdapter → sub, resub, gift, raid
2. **Fáze 2** (s auth): TwitchEventSubManager → follow, cheer, channel points

---

## 4. Kick Event Alerts implementace

### 4.1 Rozšíření Pusher odběrů

Kick Pusher kanál `channel.{channelId}` vysílá tyto eventy **bez autentizace**:

| Pusher Event | Alert typ | Data |
|-------------|-----------|------|
| `App\Events\ChannelSubscriptionEvent` | `subscribe` | subscriber info, plan |
| `App\Events\GiftedSubscriptionsEvent` | `gift_sub` | gifter, count |
| `App\Events\LuckyUsersWhoGotGiftSubscriptionsEvent` | `gift_sub_received` | recipients |
| `App\Events\FollowersUpdated` | `follow` | follower count change |
| `App\Events\StreamHost` | `raid` | hosting channel, viewers |

### 4.2 Potřebné změny v KickAdapter

**1. Rozlišení `channelId` vs `chatroomId`:**

```javascript
// V _resolveChatroomId() přidat:
async _resolveChatroomId() {
    // ... stávající logika ...

    // Pokud se podařilo API call, máme i channelId:
    if (this.channelInfo?.id) {
        this.channelId = this.channelInfo.id;
    }
}
```

**2. Odběr `channel.{channelId}` kanálu:**

```javascript
// V _setupWebSocketHandlers() po úspěšném připojení:
_subscribeToChannelEvents() {
    if (!this.channelId || !this.ws) return;

    this.ws.send(JSON.stringify({
        event: 'pusher:subscribe',
        data: {
            auth: '',
            channel: `channel.${this.channelId}`
        }
    }));

    console.log(`[Kick] Subscribed to channel events: channel.${this.channelId}`);
}
```

**3. Rozšíření `_handlePusherEvent()`:**

```javascript
_handlePusherEvent(data) {
    this.lastActivity = Date.now();

    switch (data.event) {
        // ... stávající eventy ...

        case 'App\\Events\\ChannelSubscriptionEvent':
            this._handleSubscriptionEvent(data.data);
            break;

        case 'App\\Events\\GiftedSubscriptionsEvent':
            this._handleGiftEvent(data.data);
            break;

        case 'App\\Events\\LuckyUsersWhoGotGiftSubscriptionsEvent':
            this._handleGiftReceivedEvent(data.data);
            break;

        case 'App\\Events\\FollowersUpdated':
            this._handleFollowEvent(data.data);
            break;

        case 'App\\Events\\StreamHost':
            this._handleHostEvent(data.data);
            break;
    }
}

_handleSubscriptionEvent(rawData) {
    try {
        const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        this.emit('alert', {
            id: `kick-sub-${Date.now()}`,
            platform: 'kick',
            channel: this.channel,
            type: 'alert',
            alertType: 'subscribe',
            author: {
                id: String(data.user_id || ''),
                username: data.username || 'Unknown',
                displayName: data.username || 'Unknown',
                color: '#53fc18',
                badges: [],
                roles: {}
            },
            content: `${data.username || 'Someone'} just subscribed!`,
            alertData: {
                tier: '1000', // Kick nemá tiery jako Twitch
                months: data.months || 1,
                isGift: false,
            },
            timestamp: new Date(),
            raw: data
        });
    } catch (error) {
        console.error('[Kick] Error processing subscription event:', error);
    }
}

_handleGiftEvent(rawData) {
    try {
        const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        this.emit('alert', {
            id: `kick-gift-${Date.now()}`,
            platform: 'kick',
            channel: this.channel,
            type: 'alert',
            alertType: 'gift_sub',
            author: {
                id: String(data.gifter_id || ''),
                username: data.gifter_username || 'Anonymous',
                displayName: data.gifter_username || 'Anonymous',
                color: '#53fc18',
                badges: [],
                roles: {}
            },
            content: `${data.gifter_username || 'Someone'} gifted ${data.gifted_count || 1} subs!`,
            alertData: {
                isGift: true,
                gifterName: data.gifter_username || 'Anonymous',
                giftCount: data.gifted_count || 1,
            },
            timestamp: new Date(),
            raw: data
        });
    } catch (error) {
        console.error('[Kick] Error processing gift event:', error);
    }
}

_handleFollowEvent(rawData) {
    try {
        const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        // FollowersUpdated může obsahovat jen counter, ne konkrétního followera
        // Proto emitujeme obecný follow alert
        this.emit('alert', {
            id: `kick-follow-${Date.now()}`,
            platform: 'kick',
            channel: this.channel,
            type: 'alert',
            alertType: 'follow',
            author: {
                id: '',
                username: data.username || 'Someone',
                displayName: data.username || 'Someone',
                color: '#53fc18',
                badges: [],
                roles: {}
            },
            content: data.username
                ? `${data.username} is now following!`
                : `New follower! (${data.followersCount || '?'} total)`,
            alertData: {
                followedAt: new Date(),
            },
            timestamp: new Date(),
            raw: data
        });
    } catch (error) {
        console.error('[Kick] Error processing follow event:', error);
    }
}

_handleHostEvent(rawData) {
    try {
        const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        this.emit('alert', {
            id: `kick-host-${Date.now()}`,
            platform: 'kick',
            channel: this.channel,
            type: 'alert',
            alertType: 'raid',
            author: {
                id: String(data.host_id || ''),
                username: data.host_username || 'Unknown',
                displayName: data.host_username || 'Unknown',
                color: '#53fc18',
                badges: [],
                roles: {}
            },
            content: `${data.host_username || 'Someone'} is hosting with ${data.number_viewers || '?'} viewers!`,
            alertData: {
                viewers: data.number_viewers || 0,
                fromChannel: data.host_username || 'Unknown',
            },
            timestamp: new Date(),
            raw: data
        });
    } catch (error) {
        console.error('[Kick] Error processing host event:', error);
    }
}
```

### 4.3 Problém channelId

**Hlavní problém:** Kick `channelId` ≠ `chatroomId`. Pro odběr `channel.{channelId}` potřebujeme oboje.

**Řešení:**

1. Rozšířit `KNOWN_CHATROOMS` o `channelId`:

```javascript
static KNOWN_CHANNELS = {
    // channel: { chatroomId, channelId }
    'xqc': { chatroom: 668, channel: 668 },
    'trainwreckstv': { chatroom: 4807295, channel: 4807295 },
    // ... atd.
};
```

2. Při API call ukládat obě ID:

```javascript
// V _tryFetchFromApi():
if (data?.chatroom?.id) {
    this.chatroomId = data.chatroom.id;
    this.channelId = data.id;  // PŘIDAT
}
```

3. Manuální formát rozšířit: `channel:chatroomId:channelId`

---

## 5. Renderování alertů v chatu

### 5.1 Nová funkce `renderAlert()`

Alerty se zobrazí jako speciální zprávy v proudu chatu:

```javascript
/**
 * Vykreslení event alertu v chatu
 */
function renderAlert(alert) {
    let messagesContainer = DOM.chatContainer.querySelector('.chat-messages');
    if (!messagesContainer) {
        messagesContainer = document.createElement('div');
        messagesContainer.className = 'chat-messages';
        DOM.chatContainer.innerHTML = '';
        DOM.chatContainer.appendChild(messagesContainer);
    }

    const alertEl = document.createElement('div');
    alertEl.className = `chat-alert alert-${alert.alertType} platform-${alert.platform}`;
    alertEl.dataset.alertId = alert.id;

    const icon = getAlertIcon(alert.alertType);
    const platformIcon = getPlatformIcon(alert.platform);

    let html = '';

    // Alert container
    html += `<div class="alert-header">`;
    html += `<span class="alert-icon">${icon}</span>`;
    html += `<span class="alert-platform">${platformIcon}</span>`;
    html += `</div>`;

    html += `<div class="alert-body">`;
    html += `<span class="alert-content">${escapeHtml(alert.content)}</span>`;

    // Doplňkový detail (resub zpráva, donate message, atd.)
    if (alert.alertData?.message) {
        html += `<span class="alert-detail">"${escapeHtml(alert.alertData.message)}"</span>`;
    }
    if (alert.alertData?.donateMessage) {
        html += `<span class="alert-detail">"${escapeHtml(alert.alertData.donateMessage)}"</span>`;
    }

    html += `</div>`;

    alertEl.innerHTML = html;
    messagesContainer.appendChild(alertEl);

    // Animace vstupu
    requestAnimationFrame(() => {
        alertEl.classList.add('alert-enter');
    });

    // Scroll
    scrollToBottom();
}

function getAlertIcon(alertType) {
    const icons = {
        'subscribe': '⭐',
        'resubscribe': '🔄',
        'gift_sub': '🎁',
        'gift_sub_received': '🎁',
        'follow': '❤️',
        'cheer': '💎',
        'donation': '💰',
        'raid': '🚀',
        'channel_points': '✨'
    };
    return icons[alertType] || '🔔';
}
```

### 5.2 CSS pro alerty

```css
/* Event Alert - základní styl */
.chat-alert {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin: 4px 0;
    border-radius: 6px;
    font-size: 13px;
    border-left: 3px solid;
    opacity: 0;
    transform: translateX(-10px);
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.chat-alert.alert-enter {
    opacity: 1;
    transform: translateX(0);
}

/* Barvy podle typu */
.chat-alert.alert-subscribe,
.chat-alert.alert-resubscribe {
    background: rgba(138, 43, 226, 0.15);
    border-left-color: #8a2be2;
    color: #d4a5ff;
}

.chat-alert.alert-gift_sub,
.chat-alert.alert-gift_sub_received {
    background: rgba(255, 105, 180, 0.15);
    border-left-color: #ff69b4;
    color: #ffb6d9;
}

.chat-alert.alert-follow {
    background: rgba(255, 0, 0, 0.12);
    border-left-color: #ff4444;
    color: #ff8888;
}

.chat-alert.alert-cheer,
.chat-alert.alert-donation {
    background: rgba(255, 215, 0, 0.15);
    border-left-color: #ffd700;
    color: #ffe066;
}

.chat-alert.alert-raid {
    background: rgba(0, 191, 255, 0.15);
    border-left-color: #00bfff;
    color: #66d9ff;
}

.chat-alert.alert-channel_points {
    background: rgba(0, 255, 127, 0.12);
    border-left-color: #00ff7f;
    color: #66ffaa;
}

/* Alert ikona */
.alert-icon {
    font-size: 18px;
    flex-shrink: 0;
}

/* Alert obsah */
.alert-body {
    flex: 1;
    min-width: 0;
}

.alert-content {
    font-weight: 600;
}

.alert-detail {
    display: block;
    margin-top: 2px;
    font-style: italic;
    opacity: 0.8;
    font-weight: 400;
}

/* Light theme */
[data-theme="light"] .chat-alert.alert-subscribe {
    background: rgba(138, 43, 226, 0.08);
    color: #6a1b9a;
}
/* ... analogicky pro ostatní typy */
```

### 5.3 Integrace do handleMessage()

```javascript
// V script.js - rozšíření handleMessage:
function handleMessage(message) {
    if (message.type === 'alert') {
        handleAlert(message);
        return;
    }

    // Stávající logika pro chat zprávy
    AppState.messages.push(message);
    trimMessages();
    renderMessage(message);
    scrollToBottom();
}

function handleAlert(alert) {
    // Kontrola nastavení - uživatel může chtít alerty vypnout
    if (!AppState.settings.showAlerts) return;

    // Kontrola specifických typů
    const alertSettings = AppState.settings.alertTypes || {};
    if (alertSettings[alert.alertType] === false) return;

    AppState.messages.push(alert);
    trimMessages();
    renderAlert(alert);
}
```

---

## 6. Nastavení alertů v UI

### 6.1 Nová sekce v Settings

```html
<!-- V settings modalu přidat: -->
<div class="settings-section">
    <h3>Event Alerts</h3>
    <label class="settings-toggle">
        <input type="checkbox" id="settingsShowAlerts" checked>
        <span>Show event alerts in chat</span>
    </label>
    <div class="alert-type-toggles" id="alertTypeToggles">
        <label><input type="checkbox" data-alert="subscribe" checked> Subscriptions</label>
        <label><input type="checkbox" data-alert="follow" checked> Follows</label>
        <label><input type="checkbox" data-alert="gift_sub" checked> Gift Subs</label>
        <label><input type="checkbox" data-alert="cheer" checked> Cheers/Bits</label>
        <label><input type="checkbox" data-alert="raid" checked> Raids</label>
        <label><input type="checkbox" data-alert="channel_points" checked> Channel Points</label>
    </div>
</div>
```

### 6.2 Rozšíření AppState.settings

```javascript
AppState.settings = {
    // ... stávající nastavení ...
    showAlerts: true,
    alertTypes: {
        subscribe: true,
        resubscribe: true,
        follow: true,
        gift_sub: true,
        cheer: true,
        donation: true,
        raid: true,
        channel_points: true
    }
};
```

---

## 7. Registrace alert event listenerů

V hlavním `script.js` kde se vytvářejí adaptery:

```javascript
// Po vytvoření adapteru:
function setupAdapter(adapter) {
    // Stávající message listener
    adapter.on('message', handleMessage);

    // NOVÝ alert listener
    adapter.on('alert', handleMessage);  // handleMessage rozlišuje type === 'alert'

    adapter.on('connect', () => { /* ... */ });
    adapter.on('disconnect', () => { /* ... */ });
    adapter.on('error', () => { /* ... */ });
}
```

---

## 8. Donace přes třetí strany

### Streamlabs Donations (Socket.IO)

Streamlabs poskytuje Socket API pro příjem donací v reálném čase:

```javascript
class StreamlabsDonationListener {
    constructor(socketToken) {
        this.token = socketToken;
        this.socket = null;
    }

    connect() {
        // Streamlabs Socket.IO endpoint
        this.socket = io('https://sockets.streamlabs.com', {
            query: { token: this.token }
        });

        this.socket.on('event', (event) => {
            if (event.type === 'donation') {
                for (const msg of event.message) {
                    this.onDonation({
                        id: msg.id || `sl-don-${Date.now()}`,
                        from: msg.from,
                        amount: parseFloat(msg.amount),
                        currency: msg.currency,
                        message: msg.message,
                        formattedAmount: msg.formatted_amount,
                    });
                }
            }
        });
    }

    onDonation(data) {
        // Override v integraci
    }
}
```

**Omezení:** Vyžaduje Streamlabs Socket API token (z Dashboard → Settings → API Tokens).

---

## 9. Shrnutí implementačního plánu

| Fáze | Co | Platforma | Auth | Složitost |
|------|----|-----------|------|-----------|
| **1** | IRC USERNOTICE parsing | Twitch | ❌ Ne | Nízká |
| **1** | `channel.{id}` Pusher sub | Kick | ❌ Ne | Nízká |
| **1** | Alert rendering v chatu | Oba | - | Střední |
| **1** | Alert nastavení v UI | - | - | Nízká |
| **2** | EventSub WebSocket | Twitch | ✅ OAuth | Vysoká |
| **2** | Streamlabs donace | Oba | ✅ Token | Střední |
| **3** | StreamElements donace | Oba | ✅ Token | Střední |

**Fáze 1** přinese funkční alerty pro sub, resub, gift sub, raid (Twitch + Kick) a follow (Kick) bez jakékoliv autentizace. Toto je doporučený startovní bod.
