# Chat Panel - Donace (Streamlabs & StreamElements)

> **Modul:** Third-party Donation Adapters (Phase 5)
> **Typ:** Volitelne pripojeni ke Streamlabs a StreamElements pro donace
> **Soubory:** `adapters/donation-adapter.js`, `script.js`, `index.html`, `styles.css`

---

## Co to je

Donation Manager umoznuje pripojit Streamlabs a/nebo StreamElements ucet pro zobrazeni **donaci, tipu a dalsich eventu** primo v chatu. Obe sluzby jsou volitelne a nezavisle na sobe.

### Podporovane eventy

| Event | Streamlabs | StreamElements | alertType |
|-------|:---:|:---:|-----------|
| Donace/Tip | ano | ano | `donation` |
| Subscribe | ano | ano | `subscribe` / `resubscribe` |
| Follow | ano | ano | `follow` |
| Cheer/Bits | ano | ano | `cheer` |
| Raid | ano | ano | `raid` |
| Gift Sub | ano | - | `gift_sub` |

> **Poznamka:** Tyto eventy se zobrazuji **navic** k IRC/Pusher alertum. Pokud mate pripojeny Twitch kanal a zaroven Streamlabs, muze se stat ze se sub alert zobrazi dvakrat (jednou z IRC, jednou ze Streamlabs).

---

## Pozadavky

### Streamlabs

1. Ucet na [streamlabs.com](https://streamlabs.com)
2. **Socket API Token** z: Nastaveni -> API Settings -> Socket API Token
3. Token je dlouhy retezec (napr. `eyJhbGciOiJIUzI1...`)

### StreamElements

1. Ucet na [streamelements.com](https://streamelements.com)
2. **JWT Token** z: Profil -> Channels -> Show Secrets -> JWT Token
3. Token je JWT format (`eyJ...`)

---

## Jak pouzit

### Pripojeni Streamlabs

1. Otevrete **Nastaveni** -> **Donace (volitelne)**
2. V sekci **Streamlabs** vlozte Socket API Token
3. Kliknete **Pripojit**
4. Tecka se zmeni na zelenou = pripojeno

### Pripojeni StreamElements

1. V sekci **StreamElements** vlozte JWT Token
2. Kliknete **Pripojit**
3. Tecka se zmeni na zelenou = pripojeno

### Odpojeni

Kliknete **Odpojit** u prislusne sluzby. Token se smaze z localStorage.

### Automaticke pripojeni

Po uspesnem prvnim pripojeni se token ulozi do `localStorage`. Pri dalsim nacteni stranky se sluzba automaticky pokusi znovu pripojit.

---

## Architektura

### DonationManager

```
Streamlabs Socket.IO         StreamElements WebSocket
         |                            |
    Socket API Token              JWT Token
         |                            |
    HTTP handshake                WebSocket connect
         |                            |
    WebSocket upgrade             authenticate event
         |                            |
    Socket.IO v2 protocol         Socket.IO v3 protocol
    (ping/pong, 42[event])        (ping/pong, 42[event])
         |                            |
         +------------+---------------+
                      |
              DonationManager
                      |
              _normalizeEvent()
                      |
              emit('alert', alert)
                      |
              handleAlert() v script.js
```

### Streamlabs Socket.IO v2

Streamlabs pouziva Socket.IO v2 (engine.io v3). Pripojeni probiha:

1. **Polling handshake:** `GET /socket.io/?EIO=3&transport=polling&token=...`
   - Odpoved: `97:0{"sid":"...","upgrades":["websocket"],...}`
2. **WebSocket upgrade:** `wss://sockets.streamlabs.com/socket.io/?EIO=3&transport=websocket&sid=...&token=...`
3. **Probe:** klient posle `2probe`, server odpovi `3probe`
4. **Upgrade confirmed:** klient posle `5`
5. **Ping/pong:** server posle `2`, klient odpovi `3`
6. **Eventy:** `42["event", { type: "donation", message: [...] }]`

### StreamElements WebSocket

StreamElements pouziva primo WebSocket s Socket.IO v3 (engine.io v4):

1. **WebSocket connect:** `wss://realtime.streamelements.com/socket.io/?EIO=3&transport=websocket`
2. **Handshake:** server posle `0{...}` s session info
3. **Authenticate:** klient posle `42["authenticate",{"method":"jwt","token":"..."}]`
4. **Authenticated:** server posle `42["authenticated",{...}]`
5. **Eventy:** `42["event", { type: "tip", data: {...} }]`

---

## Normalizovany Alert Format

Vsechny eventy z obou sluzeb se normalizuji do stejneho formatu:

```javascript
{
  id: 'streamlabs-1706...-abc123',
  platform: 'streamlabs',           // nebo 'streamelements'
  channel: 'streamlabs',            // stejne jako platform
  type: 'alert',
  alertType: 'donation',
  timestamp: new Date(),
  author: {
    id: 'john',
    username: 'john',
    displayName: 'John',
    color: '#ffd700',
    badges: [],
    roles: {},
  },
  content: 'John donated 5 USD!',
  alertData: {
    amount: 5,
    currency: 'USD',
    formattedAmount: '$5.00',
    donateMessage: 'Great stream!',
  },
  raw: { /* puvodni data z API */ },
}
```

### alertData podle typu

**donation:**
```javascript
{ amount: 5, currency: 'USD', formattedAmount: '$5.00', donateMessage: 'text' }
```

**subscribe / resubscribe:**
```javascript
{ tier: '1000', months: 3, isGift: false, gifterName: null, message: '' }
```

**gift_sub:**
```javascript
{ tier: '1000', months: 1, isGift: true, gifterName: 'Gifter123', message: '' }
```

**follow:**
```javascript
{ }
```

**cheer:**
```javascript
{ amount: 100, currency: 'bits', donateMessage: 'PogChamp' }
```

**raid:**
```javascript
{ viewers: 500, fromChannel: 'Raider123' }
```

---

## Ulozeni dat

### localStorage: `adhub_donation_tokens`

```json
{
  "streamlabs": "eyJhbG...",
  "streamelements": "eyJ0eXA..."
}
```

Tokeny se ukladaji **pouze pokud** je sluzba aktualne pripojena. Po odpojeni se token smaze.

---

## Pouziti jako template

### Pridani nove donation sluzby

1. Pridejte connect/disconnect metody do `DonationManager`:
   ```javascript
   connectMyService(token) {
       this._myServiceToken = token;
       // WebSocket pripojeni...
       // Po prijeti eventu:
       const alert = this._createDonationAlert(msg, 'myservice');
       this._emit('alert', alert);
   }

   disconnectMyService() {
       this._myServiceToken = null;
       // Cleanup...
   }
   ```

2. Pridejte status property:
   ```javascript
   get myServiceConnected() { return this._myServiceConnected; }
   ```

3. Pridejte UI do `index.html` (zkopirujte existujici `donation-service` blok):
   ```html
   <div class="donation-service">
       <div class="donation-service-header">
           <span class="donation-service-name">My Service</span>
           <span class="donation-dot disconnected" id="myDot"></span>
       </div>
       <div class="form-group">
           <input type="password" id="myServiceToken" placeholder="API Token">
           <span class="input-hint">Kde ziskat token...</span>
       </div>
       <div class="donation-actions">
           <button class="btn btn-sm btn-primary" id="myConnectBtn">Pripojit</button>
           <button class="btn btn-sm btn-danger" id="myDisconnectBtn" style="display:none">Odpojit</button>
       </div>
   </div>
   ```

4. Pridejte event listenery do `initEventListeners()` v `script.js`:
   ```javascript
   document.getElementById('myConnectBtn')?.addEventListener('click', donationConnectMyService);
   document.getElementById('myDisconnectBtn')?.addEventListener('click', donationDisconnectMyService);
   ```

5. Pridejte connect/disconnect funkce do `script.js` (vzor: `donationConnectStreamlabs`).

### Pouziti DonationManager standalone

```javascript
const dm = new DonationManager();

dm.on('alert', (alert) => {
    console.log(`${alert.alertType}: ${alert.content}`);
    if (alert.alertData.donateMessage) {
        console.log(`  Message: ${alert.alertData.donateMessage}`);
    }
});

dm.on('connect', (data) => console.log(`Connected to ${data.service}`));
dm.on('disconnect', (data) => console.log(`Disconnected from ${data.service}`));
dm.on('error', (data) => console.error(`Error on ${data.service}: ${data.message}`));

// Streamlabs
await dm.connectStreamlabs('your_socket_api_token');

// StreamElements
dm.connectStreamElements('your_jwt_token');

// Status
console.log(dm.streamlabsConnected);     // true/false
console.log(dm.streamelementsConnected);  // true/false

// Odpojeni
dm.disconnectStreamlabs();
dm.disconnectStreamElements();
dm.disconnectAll();
```

---

## Stavy pripojeni

| Stav | Tecka | Popis |
|------|-------|-------|
| `disconnected` | seda | Nepripojeno |
| `connecting` | zluta (blikajici) | Probiha pripojeni |
| `connected` | zelena | Pripojeno, prijima eventy |
| `error` | cervena | Chyba pripojeni |

---

## Auto-reconnect

Obe sluzby automaticky:
- Po odpojeni cekaji 10 sekund a pokusi se znovu pripojit
- Reconnect se opakuje dokud neni zavolano `disconnect*()`
- Pri nacteni stranky se automaticky pripoji pokud jsou ulozene tokeny

---

## Ladeni

### Debug v konzoli

```javascript
// Pristup k manageru
const dm = window.AdHubChat.donationManager();

// Stav
console.log(dm.streamlabsConnected);
console.log(dm.streamelementsConnected);

// Rucni odpojeni
dm.disconnectAll();
```

### Testovani bez realnych donaci

Streamlabs a StreamElements maji testovaci tlacitka v dashboardu:
- **Streamlabs:** Dashboard -> Alert Box -> kliknete na test donaci
- **StreamElements:** Dashboard -> Activity Feed -> Test Tip/Sub

---

## FAQ

**Q: Muzu pripojit obe sluzby zaroven?**
A: Ano, Streamlabs a StreamElements fungují nezavisle.

**Q: Vidim duplicitni alerty (z IRC i ze Streamlabs)?**
A: Ano, pokud mate Twitch kanal pripojeny pres IRC a zaroven Streamlabs, sub alerty se mohou zobrazit dvakrat. Vypnete prislusny typ v nastaveni alertu, nebo odpojte jednu ze sluzeb.

**Q: Token je bezpecny?**
A: Token se uklada pouze v localStorage v prohlizeci. Nikam se neodesila. Ale kdokoliv s pristupem k vasemu prohlizeci ho muze precist.

**Q: Streamlabs se nepripoji?**
A: Zkontrolujte, ze pouzivate **Socket API Token** (ne API access token). Najdete ho v Nastaveni -> API Settings.

**Q: StreamElements se nepripoji?**
A: Zkontrolujte, ze pouzivate **JWT Token** (ne overlay token). Najdete ho v Profil -> Channels -> Show Secrets.

**Q: Donations se nezobrazuji v OBS view?**
A: OBS view nacita adaptory z hlavniho panelu, ale DonationManager tam neni zahrnut. Donace se zobrazuji pouze v hlavnim panelu. Pro OBS pouzijte nativni Streamlabs/StreamElements overlaye.
