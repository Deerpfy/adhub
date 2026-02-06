# Chat Panel - OBS Browser Source

> **Modul:** OBS Browser Source endpoint (Phase 2)
> **Typ:** Staticka HTML stranka pro OBS overlay
> **Soubory:** `obs/index.html`, `obs/obs-script.js`, `obs/obs-styles.css`
> **Endpoint:** `/projects/chat-panel/obs/`

---

## Co to je

OBS Browser Source je samostatna stranka optimalizovana pro zobrazeni multistream chatu jako overlay v OBS Studio. Pouziva **Streamlabs-kompatibilni HTML strukturu** (`#log`, `.wrap`, `.meta`, `.name`, `.message`), takze na ni lze aplikovat existujici Streamlabs Custom CSS.

---

## Jak pouzit

### 1. Generovani URL z hlavniho panelu

1. Otevrete hlavni Chat Panel
2. Pridejte kanaly (Twitch, Kick, YouTube)
3. Otevrete **Nastaveni** -> **OBS Browser Source**
4. Kliknete na **Generovat OBS URL**
5. Zkopirujte URL

### 2. Pridani do OBS

1. V OBS pridejte novy **Browser Source**
2. Vlozte URL z kroku 5
3. Nastavte rozliseni: **400 x 600 px** (doporuceno)
4. Zatrhnete **Shutdown source when not visible** (usetrí zdroje)
5. Zatrhnete **Refresh browser when scene becomes active**

### 3. Rucni URL

Pokud nechcete generovat URL z panelu, muzete ji sestavit rucne:

```
/obs/?channels=twitch:xqc,kick:trainwreckstv&theme=transparent&fontSize=14
```

---

## URL Parametry

| Parametr | Typ | Default | Popis |
|----------|-----|---------|-------|
| `channels` | string | `[]` | Kanaly ve formatu `platform:name` oddelene carkou |
| `theme` | string | `transparent` | Tema: `transparent`, `dark`, `light` |
| `fontSize` | number | `14` | Velikost pisma v px |
| `showTimestamps` | bool | `false` | Zobrazit casove znacky |
| `showBadges` | bool | `true` | Zobrazit badge (sub, mod, vip) |
| `showEmotes` | bool | `true` | Zobrazit emotes jako obrazky |
| `showAlerts` | bool | `true` | Zobrazit event alerty |
| `maxMessages` | number | `100` | Max pocet zprav v DOM |
| `hideAfter` | number | `0` | Auto-skryt zpravy po X sekundach (0 = nikdy) |
| `compact` | bool | `false` | Kompaktni rezim |
| `direction` | string | `bottom-up` | Smer: `bottom-up` nebo `top-down` |
| `animation` | string | `fade` | Animace: `fade` |
| `customCSS` | string | `""` | Base64-encoded Custom CSS |

### Format parametru `channels`

```
twitch:nazev_kanalu
kick:nazev_kanalu:chatroom_id
youtube-iframe:video_id
```

Priklady:
```
channels=twitch:xqc
channels=twitch:xqc,kick:trainwreckstv
channels=twitch:shroud,kick:roshtein:4807295
channels=twitch:xqc,kick:adinross,youtube-iframe:dQw4w9WgXcQ
```

> **Pozn:** Pro Kick kanaly s nestandardnim chatroom ID pouzijte format `kick:nazev:id`.

---

## Priorita konfigurace

OBS view nacita konfiguraci v tomto poradi (prvni nalezeny vyhrava):

1. **URL parametry** (nejvyssi priorita)
2. **localStorage** (`adhub_obs_config`, `adhub_chat_settings`, `adhub_chat_channels`)
3. **Default hodnoty**

To znamena, ze pokud je OBS view na **stejne domene** jako hlavni panel, automaticky zdedi kanaly a nastaveni z localStorage. URL parametry vsechno prepisuji.

---

## Streamlabs-kompatibilni HTML

OBS view generuje HTML identicky se Streamlabs chatem:

```html
<div id="log" class="sl__chat__layout">

  <!-- Zprava -->
  <div id="msg-123" class="wrap animate visible platform-twitch" data-from="user123" data-id="msg-123">
    <div class="meta" style="color: #ff4500">
      <span class="badges">
        <img class="badge" src="..." alt="Subscriber">
      </span>
      <span class="name" data-role="subscriber">User123</span>
      <span class="colon">: </span>
    </div>
    <span class="message">Hello world! <img class="emote" src="..." alt="Kappa"></span>
  </div>

  <!-- Alert -->
  <div id="alert-456" class="wrap animate visible alert alert-subscribe platform-twitch">
    <div class="alert-wrapper">
      <span class="alert-icon"><!-- SVG --></span>
      <span class="alert-text">User123 subscribed (Tier 1)!</span>
    </div>
    <span class="alert-submessage">"Great stream!"</span>
  </div>

</div>
```

### Dulezite CSS tridy (Streamlabs kompatibilni)

| Trida | Element | Popis |
|-------|---------|-------|
| `#log` | kontejner | Hlavni kontejner vsech zprav |
| `.wrap` | div | Obalka jedne zpravy |
| `.meta` | div | Badge + jmeno (style=color pro barvu) |
| `.badges` | span | Kontejner pro badge obrazky |
| `.badge` | img | Jednotlivy badge |
| `.name` | span | Jmeno uzivatele |
| `.colon` | span | Dvojtecka za jmenem |
| `.message` | span | Text zpravy |
| `.emote` | img | Emote obrazek |
| `.alert` | div | Alert kontejner |

---

## Temata

### Transparent (default)
```
?theme=transparent
```
Pruhledne pozadi - idealni pro OBS overlay. Text ma shadow pro citelnost.

### Dark
```
?theme=dark
```
Tmave pozadi (`rgba(14,14,16,0.95)`) - pro samostatne pouziti.

### Light
```
?theme=light
```
Svetle pozadi - mene bezne, ale dostupne.

---

## Custom CSS

### Pres URL parametr

Custom CSS musi byt **Base64 encoded**:

```javascript
const css = '#log > div { background: red; }';
const encoded = btoa(css);
// URL: /obs/?channels=twitch:xqc&customCSS=encoded_string
```

### Pres Style Manager (hlavni panel)

1. Nastaveni -> Chat Style -> Custom CSS
2. Vlozte CSS do editoru
3. Kliknete **Aplikovat styl**
4. CSS se automaticky ulozi do `localStorage` a pouzije v OBS view

### Pres Streamlabs CSS

Protoze HTML je kompatibilni, muzete pouzit jakykoli Streamlabs Custom CSS:

```css
/* Streamlabs compatible */
#log > div {
    background: linear-gradient(135deg, rgba(30,30,30,0.8), rgba(20,20,20,0.6));
    border-radius: 6px;
    padding: 6px 10px;
    margin-bottom: 4px;
}

.name {
    font-weight: 700;
    text-transform: uppercase;
}

.colon { display: none; }
.name::after { content: ' '; }

.message {
    font-weight: 400;
    opacity: 0.95;
}
```

---

## Pouziti jako template

### Pridani noveho parametru

1. Pridejte default do `OBSChatView._loadConfig()`:
   ```javascript
   const defaults = { ..., myParam: 'value' };
   ```
2. Parsujte z URL:
   ```javascript
   if (params.has('myParam')) config.myParam = params.get('myParam');
   ```
3. Pouzijte v renderovani nebo theme

### Pridani nove platformy

1. Pridejte adapter `<script>` do `obs/index.html`
2. Pridejte `case` do `_connectChannel()`:
   ```javascript
   case 'my-platform':
       adapter = new MyPlatformAdapter({ channel });
       break;
   ```
3. V URL pouzijte: `channels=my-platform:channel_name`

### Vlastni renderovani zprav

Upravte `_renderMessage()` v `obs-script.js`. Zachovejte Streamlabs tridy pro kompatibilitu, nebo vytvorte uplne novy layout.

---

## Ladeni

### Otevreni v prohlizeci

OBS view funguje v beznem prohlizeci - staci otevrit URL:
```
http://localhost:8000/projects/chat-panel/obs/?channels=twitch:xqc
```

### Konzolove logy

```
[OBS] Initialized with config: {...}
[OBS] Connected to twitch:xqc
```

### Testovaci URL

```
/obs/?channels=twitch:xqc&theme=dark&showTimestamps=true&hideAfter=10&fontSize=18
```

---

## FAQ

**Q: OBS view neukazuje zpravy, ale hlavni panel ano?**
A: Zkontrolujte, ze OBS view je na stejne domene. Pokud ne, pouzijte explicitni `channels` parametr v URL.

**Q: Jak zmenim pozadi?**
A: Pouzijte `?theme=transparent` pro pruhledne pozadi (OBS), nebo pridejte Custom CSS: `body { background: #000; }`.

**Q: Jak velke rozliseni nastavit v OBS?**
A: Doporuceno 400x600 px pro sidebar chat, 800x200 pro spodni listu.

**Q: Zpravy se neukladaji / mizejici?**
A: Pokud je nastaven `hideAfter > 0`, zpravy zmizi po danem case. Alerty mizi vzdy (default 10s).
