---
title: "Chat Panel - Event Alerts"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Chat Panel - Event Alerts

> **Modul:** Event Alerts (Phase 1)
> **Typ:** Inline chat alerty bez autentizace
> **Soubory:** `adapters/twitch-adapter.js`, `adapters/kick-adapter.js`, `script.js`, `styles.css`, `index.html`

---

## Co to je

Event Alerts zobrazuji udalosti primo v proudu chatovych zprav - subscriptions, resubscriptions, gift subs, raids, follows (Kick) a ritualy. Funguji **bez jakekoliv autentizace** - parsují se primo z IRC (Twitch) a Pusher (Kick) eventu.

---

## Podporovane typy alertu

| Typ | Twitch (IRC) | Kick (Pusher) | Popis |
|-----|:---:|:---:|-------|
| `subscribe` | ano | ano | Novy subscriber |
| `resubscribe` | ano | - | Resub s poctem mesicu |
| `gift_sub` | ano | ano | Gift sub (kdo daroval) |
| `gift_sub_received` | - | - | Prijemce gift subu |
| `follow` | - | ano | Novy follower |
| `raid` | ano | ano | Prichozi raid |
| `ritual` | ano | - | Novy chatter ritual |

> **Poznamka:** Twitch IRC nepodporuje `follow` - pro to je potreba EventSub (viz Phase 4).

---

## Jak to funguje

### Twitch (IRC USERNOTICE)

Twitch IRC posilá `USERNOTICE` zpravy pro sub/resub/gift/raid eventy. Adapter je parsuje bez nutnosti OAuth:

```
@badge-info=...;msg-id=sub;display-name=User123 :tmi.twitch.tv USERNOTICE #channel :Great stream!
```

Kód v `twitch-adapter.js`:
1. `_connectIrc()` detekuje `USERNOTICE` ve zprávě
2. `_handleUsernotice()` parsuje IRC tagy
3. `_parseIrcTags()` extrahuje key-value z tagu
4. `_createAlertFromUsernotice()` vytvori normalizovany alert objekt

### Kick (Pusher Channel Events)

Kick adapter se prihlasi k Pusher kanalu `channel.{channelId}` a posloucha:
- `ChannelSubscriptionEvent`
- `GiftedSubscriptionsEvent`
- `LuckyUsersWhoGotGiftSubscriptionsEvent`
- `FollowersUpdated`
- `StreamHost`
- `Sub\SubscriptionEvent`

Kód v `kick-adapter.js`:
1. `_subscribeToChannelEvents()` prihlasi Pusher kanal
2. `_handlePusherEvent()` routuje eventy
3. `_handleAlertEvent()` a `_createAlert()` normalizuji data

---

## Normalizovany Alert Format

```javascript
{
  id: 'twitch-alert-1706...',     // Unikatni ID
  platform: 'twitch',             // Platforma
  channel: 'xqc',                 // Kanal
  type: 'alert',                  // Odliseni od 'message'
  alertType: 'subscribe',         // Typ alertu (viz tabulka)
  timestamp: new Date(),
  author: {
    id: 'user123',
    username: 'user123',
    displayName: 'User123',
    color: '#8a2be2',
    badges: [],
    roles: {},
  },
  content: 'User123 subscribed (Tier 1)!',  // Lidsky citelny text
  alertData: {                     // Strukturovana data
    tier: '1000',
    months: 3,
    streak: 2,
    message: 'Great stream!',
    isGift: false,
    gifterName: null,
    giftCount: 0,
    viewers: 0,
  },
}
```

---

## Nastaveni

V nastaveni (Settings -> Event Alerts):

- **Zobrazit event alerty v chatu** - hlavni prepinac (on/off)
- **Subscriptions** - sub/resub alerty
- **Follows** - follow alerty
- **Gift Subs** - gift sub alerty
- **Cheers/Bits** - cheer alerty (vyzaduje EventSub)
- **Raids** - raid alerty

Zmeny se automaticky ukladaji do `localStorage` (`adhub_chat_settings`).

---

## Pouziti jako template

### Pridani noveho typu alertu

1. Definuj novy `alertType` string (napr. `'host'`)
2. V adapteru vytvor normalizovany alert objekt a emituj `this._emit('alert', alert)`
3. Pridej ikonu do `getAlertIcon()` v `script.js`
4. Pridej CSS styl `.chat-alert.alert-host` v `styles.css`
5. Pridej checkbox do `index.html` v sekci `alertTypeToggles`:
   ```html
   <div class="setting-item setting-sub-item">
       <label><input type="checkbox" data-alert-type="host" checked> Hosts</label>
   </div>
   ```
6. Pridej do `AppState.settings.alertTypes`:
   ```javascript
   alertTypes: { ..., host: true }
   ```

### Vlastni renderovani alertu

Funkce `renderAlert()` v `script.js` generuje HTML:

```html
<div class="chat-alert alert-subscribe platform-twitch alert-visible">
  <div class="alert-streamer-label twitch">
    <span class="streamer-icon"><!-- SVG --></span>
    <span class="streamer-name">xqc</span>
  </div>
  <div class="alert-body">
    <span class="alert-icon"><!-- SVG --></span>
    <span class="alert-content">User123 subscribed (Tier 1)!</span>
    <span class="alert-detail">"Great stream!"</span>
  </div>
</div>
```

Muzete prepsat `renderAlert()` pro uplne jiny layout nebo pridat dalsi metadata.

### Napojeni na jiny adapter

Jakykoli adapter muze emitovat alerty:

```javascript
class MyAdapter extends BaseAdapter {
    _onSomeEvent(data) {
        this._emit('alert', {
            id: `my-${Date.now()}`,
            platform: 'my-platform',
            channel: this.channel,
            type: 'alert',
            alertType: 'subscribe',
            timestamp: new Date(),
            author: { ... },
            content: 'Someone subscribed!',
            alertData: { ... },
        });
    }
}
```

---

## CSS tridy

| Trida | Popis |
|-------|-------|
| `.chat-alert` | Zakladni alert kontejner |
| `.alert-subscribe` | Sub alert (fialova) |
| `.alert-resubscribe` | Resub alert (fialova) |
| `.alert-gift_sub` | Gift sub (ruzova) |
| `.alert-follow` | Follow (cervena) |
| `.alert-cheer` | Cheer/bits (zlata) |
| `.alert-donation` | Donace (zelena) |
| `.alert-raid` | Raid (modra) |
| `.alert-channel_points` | Channel points (zelena) |
| `.alert-visible` | Pridano po animaci vstupu |
| `.alert-streamer-label` | Hlavicka s nazvem kanalu |
| `.alert-body` | Telo alertu |
| `.alert-icon` | SVG ikona |
| `.alert-content` | Text alertu |
| `.alert-detail` | Doplnkova zprava (resub message) |

---

## FAQ

**Q: Proc nevidim follow alerty na Twitch?**
A: Twitch IRC nepodporuje follow eventy. Pripojte Twitch EventSub (Phase 4) pro follow alerty.

**Q: Proc nevidim sub alerty na Kick?**
A: Kick vyzaduje `channelId` (ne `chatroomId`). Adapter si ho automaticky nacte z API pri pripojeni. Pokud API neni dostupne, channel events nebudou fungovat.

**Q: Mohu zmenit barvy alertu?**
A: Ano, upravte CSS promenne v `.chat-alert.alert-TYPE` v `styles.css`.
