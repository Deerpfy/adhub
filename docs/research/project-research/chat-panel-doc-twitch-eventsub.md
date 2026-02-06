# Chat Panel - Twitch EventSub

> **Modul:** Twitch EventSub WebSocket (Phase 4)
> **Typ:** Volitelny OAuth adapter pro pokrocile Twitch alerty
> **Soubory:** `adapters/twitch-eventsub-adapter.js`, `oauth-callback.html`, `script.js`, `index.html`

---

## Co to je

Twitch EventSub je **volitelne** rozsireni pro pokrocile Twitch alerty, ktere nejsou dostupne pres anonymni IRC:

| Event | Bez EventSub (IRC) | S EventSub |
|-------|:---:|:---:|
| Subscribe | ano | ano (presnejsi) |
| Resubscribe | ano | ano (presnejsi) |
| Gift Sub | ano | ano (presnejsi) |
| Raid | ano | ano (presnejsi) |
| **Follow** | **ne** | **ano** |
| **Cheer/Bits** | **ne** | **ano** |
| **Channel Points** | **ne** | **ano** |

> **Dulezite:** Zakladni alerty (sub, resub, gift, raid) funguji **bez prihlaseni** diky IRC USERNOTICE parsovani. EventSub je extra volba pro follow, cheer a channel points.

---

## Pozadavky

1. **Twitch Developer aplikace** - vytvorte na [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
2. **Client ID** z teto aplikace
3. **Redirect URI** nastavena na: `{vase_domena}/projects/chat-panel/oauth-callback.html`

### Vytvoreni Twitch aplikace

1. Jdete na [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
2. Kliknete **Register Your Application**
3. Vyplnte:
   - **Name:** AdHub Chat Panel (nebo cokoliv)
   - **OAuth Redirect URLs:** `https://vase-domena.com/projects/chat-panel/oauth-callback.html`
   - **Category:** Chat Bot
4. Kliknete **Create**
5. Zkopirujte **Client ID**

> **Pro lokalni vyvoj:** Redirect URI nastavte na `http://localhost:8000/projects/chat-panel/oauth-callback.html`

---

## Jak pouzit

### Pripojeni

1. Otevrete **Nastaveni** -> **Twitch EventSub (volitelne)**
2. Vlozte **Client ID** do pole
3. Kliknete **Pripojit Twitch**
4. Otevre se popup okno s Twitch autorizaci
5. Autorizujte aplikaci (prihlaste se na Twitch pokud nejste)
6. Popup se zavre, stav se zmeni na **Pripojeno** (zelena tecka)

### Odpojeni

1. Kliknete **Odpojit** v sekci EventSub
2. Token se smaze z localStorage
3. WebSocket se odpoji

### Automaticke pripojeni

Po uspesnem prvnim pripojeni se token ulozi do `localStorage`. Pri dalsim nacteni stranky se EventSub automaticky pokusi znovu pripojit (pokud je token stale platny).

---

## OAuth Flow

EventSub pouziva **Implicit Grant Flow** (bez backendu):

```
1. Uzivatel klikne "Pripojit Twitch"
2. Otevre se popup: https://id.twitch.tv/oauth2/authorize?...
3. Uzivatel autorizuje na Twitch
4. Twitch presmeruje na oauth-callback.html#access_token=...
5. oauth-callback.html extrahuje token z URL hash
6. Posle window.opener.postMessage({type: 'twitch_oauth_callback', access_token: ...})
7. Hlavni okno prijme zpravu a ulozi token
8. Popup se zavre
```

### Pozadovane scopes

```
channel:read:subscriptions
moderator:read:followers
bits:read
channel:read:redemptions
```

### Bezpecnost

- Token je ulozen v `localStorage` (klic: `adhub_twitch_eventsub`)
- Token se automaticky invaliduje po 60 dnech
- Token je validovan pri kazdem nacteni stranky
- Popup nikdy nepresmerovava hlavni okno
- **Login neni nikdy vynucen** - sekce je oznacena jako "volitelne"

---

## Architektura

### TwitchEventSubManager

```
                         Twitch OAuth (popup)
                                |
                                v
                    TwitchEventSubManager
                    /         |         \
              setCredentials  |     validateToken()
                              |
                     connect(broadcasterId)
                              |
                              v
              wss://eventsub.wss.twitch.tv/ws
                              |
                    session_welcome
                              |
                    _registerSubscriptions()
                    (7 event typu pres Helix API)
                              |
                    notification events
                              |
                    _normalizeEvent()
                              |
                    emit('alert', normalizedAlert)
                              |
                    handleAlert() v script.js
```

### Registrovane EventSub subscriptions

| Event Type | Version | Condition |
|-----------|---------|-----------|
| `channel.follow` | 2 | broadcaster_user_id + moderator_user_id |
| `channel.cheer` | 1 | broadcaster_user_id |
| `channel.subscribe` | 1 | broadcaster_user_id |
| `channel.subscription.gift` | 1 | broadcaster_user_id |
| `channel.subscription.message` | 1 | broadcaster_user_id |
| `channel.raid` | 1 | to_broadcaster_user_id |
| `channel.channel_points_custom_reward_redemption.add` | 1 | broadcaster_user_id |

### WebSocket zpravy

| Typ | Popis |
|-----|-------|
| `session_welcome` | Pocatecni handshake, obsahuje session ID |
| `session_keepalive` | Keepalive ping (kazdych ~10s) |
| `notification` | Event data |
| `session_reconnect` | Server zada reconnect na novou URL |
| `revocation` | Odvolani subscripce |

---

## Ulozeni dat

### localStorage: `adhub_twitch_eventsub`

```json
{
  "clientId": "abc123...",
  "accessToken": "def456...",
  "timestamp": 1706000000000
}
```

Token je platny max 60 dni od ulozeni (kontrola pri `loadSavedCredentials()`).

---

## Pouziti jako template

### Pridani noveho eventu

1. Pridejte event do `_registerSubscriptions()`:
   ```javascript
   { type: 'channel.ban', version: '1', condition: { broadcaster_user_id: this.broadcasterId } }
   ```

2. Pridejte case do `_normalizeEvent()`:
   ```javascript
   case 'channel.ban':
       return {
           ...base,
           alertType: 'ban',
           author: { ... },
           content: `${event.user_name} was banned!`,
           alertData: { reason: event.reason },
       };
   ```

3. Pridejte scope do `startOAuth()` pokud je potreba:
   ```javascript
   const scopes = [
       // ... existujici ...
       'moderator:read:banned_users',
   ].join('+');
   ```

### Pouziti TwitchEventSubManager standalone

```javascript
const esub = new TwitchEventSubManager();

// Varianta 1: Rucni nastaveni kredencialu
esub.setCredentials('client_id', 'access_token');
await esub.connect('broadcaster_user_id');

// Varianta 2: OAuth flow
const redirectUri = window.location.origin + '/oauth-callback.html';
const token = await esub.startOAuth('client_id', redirectUri);
await esub.connect(); // broadcaster ID se ziska z validace tokenu

// Listener
esub.on('alert', (alert) => {
    console.log(alert.alertType, alert.content);
});

esub.on('connect', () => console.log('Connected'));
esub.on('disconnect', () => console.log('Disconnected'));
esub.on('error', (err) => console.error(err));

// Odpojeni
esub.disconnect();

// Odhlaseni (smaze token)
esub.logout();
```

### Vlastni OAuth callback

Pokud potrebujete jinou callback stranku, vytvorte HTML ktere extrahuje token z hash a posle zpravu:

```html
<script>
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);
window.opener.postMessage({
    type: 'twitch_oauth_callback',
    access_token: params.get('access_token'),
    state: params.get('state'),
}, '*');
window.close();
</script>
```

---

## Auto-reconnect

EventSub manager automaticky:
- Detekuje keepalive timeout (keepalive_timeout + 5s buffer)
- Po odpojeni se pokusi znovu pripojit po 5 sekundach
- Reaguje na `session_reconnect` zpravu (server presune na novou URL)
- Validuje token pri nacteni stranky

---

## Ladeni

### Debug v konzoli

```javascript
// Pristup k manageru
const esub = window.AdHubChat.eventSubManager();

// Stav
console.log(esub.connected);          // true/false
console.log(esub.broadcasterId);      // '12345678'
console.log(esub.sessionId);          // 'AgoQ...'

// Rucni odpojeni
esub.disconnect();
```

### Konzolove logy

```
[EventSub] Subscribed to 7/7 events
[EventSub] Keepalive timeout, reconnecting...
[EventSub] Reconnecting to new URL
[EventSub] Subscription revoked: channel.follow
```

---

## FAQ

**Q: Musim se prihlasit abych videl sub alerty?**
A: Ne. Sub/resub/gift/raid alerty funguji pres IRC bez prihlaseni. EventSub pridava follow, cheer a channel points.

**Q: Proc nevidim follow alerty?**
A: Follow vyzaduje EventSub. Pripojte se pres Nastaveni -> Twitch EventSub.

**Q: Token vyprsel, co delat?**
A: Kliknete znovu **Pripojit Twitch**. Stary token se automaticky prepise.

**Q: Muze nekdo zneuzit muj token?**
A: Token ma omezene scopes (cteni). Neuklada se na zadny server - pouze lokalne v prohlizeci.

**Q: Proc je EventSub volitelny?**
A: Vetsina uzivatelu nepotrebuje follow/cheer alerty. Nuceni prihlaseni by zhorisilo UX pro bezne pouziti.
