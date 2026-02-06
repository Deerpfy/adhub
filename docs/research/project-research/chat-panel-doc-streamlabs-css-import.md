# Chat Panel - Streamlabs CSS Import / Style Manager

> **Modul:** Streamlabs CSS Import System (Phase 3)
> **Typ:** CSS style manager s presety a custom editorom
> **Soubory:** `script.js` (STYLE_PRESETS, initStyleManager), `index.html` (settings UI), `styles.css`

---

## Co to je

Style Manager umoznuje menit vizualni styl chatu v OBS view tremi zpusoby:

1. **Default** - pouzije vychozi styly z `obs-styles.css`
2. **Preset** - vyberte z 5 pripravenych stylu
3. **Custom CSS** - vlozte vlastni CSS (kompatibilni se Streamlabs)

Vybrany styl se aplikuje na OBS Browser Source view. Hlavni panel pouziva vzdy sve vlastni styly.

---

## Jak pouzit

### Vyber stylu

1. Otevrete **Nastaveni** -> **Chat Style (OBS / Streamlabs)**
2. Zvolte jednu z moznosti:
   - **Default** - zadne custom CSS
   - **Preset** - vyberte z nabidky
   - **Custom CSS** - vlozte vlastni
3. Kliknete **Aplikovat styl**

### Import Streamlabs CSS

1. Otevrete Streamlabs -> Widgety -> Chat Box -> Open Editor
2. Zkopirujte Custom CSS z Streamlabs editoru
3. V Chat Panel nastaveni zvolte **Custom CSS**
4. Vlozte CSS do textoveho editoru
5. Volitelne: pouzijte template promenne (`{font_size}`, `{text_color}`, `{background_color}`)
6. Kliknete **Aplikovat styl**

---

## Presety

### 1. Clean Dark
```css
font-family: 'Inter', sans-serif;
/* Gradient pozadi, zaoblene rohy, leva cara */
#log > div {
    background: linear-gradient(135deg, rgba(30,30,30,0.8), rgba(20,20,20,0.6));
    border-radius: 6px;
    border-left: 2px solid rgba(255,255,255,0.1);
}
.colon { display: none; }
```
Cisty tmaty styl s modernim vzhledem.

### 2. Neon Glow
```css
font-family: 'Orbitron', monospace;
/* Neonovy efekt s cyan obrysem a text-shadow */
#log > div {
    border: 1px solid rgba(0,255,255,0.3);
    text-shadow: 0 0 5px currentColor;
}
.name { text-transform: uppercase; letter-spacing: 1px; }
```
Futuristicky neonovy styl s glow efektem.

### 3. Chat Bubbles
```css
font-family: 'Nunito', sans-serif;
/* Zaoblene bubliny, backdrop-filter blur */
#log > div {
    background: rgba(255,255,255,0.12);
    border-radius: 18px;
    max-width: 85%;
    backdrop-filter: blur(5px);
}
.meta { display: block; }
.message { display: block; }
```
Zpravy vypadaji jako chat bubliny.

### 4. Minimal
```css
font-family: 'Source Sans 3', sans-serif;
/* Minimalisticky - bez badge, tencí oddelovac */
.badges { display: none; }
#log > div { border-bottom: 1px solid rgba(255,255,255,0.05); }
```
Cisty minimalisticky styl bez rozptylovani.

### 5. Twitch Native
```css
font-family: 'Inter', 'Roobert', sans-serif;
/* Vernà replika nativniho Twitch chatu */
.badge { width: 18px; height: 18px; border-radius: 3px; }
.name { font-weight: 700; font-size: 13px; }
.emote { height: 28px; margin: -5px 0; }
```
Vypada jako nativni Twitch chat.

---

## Template Promenne

V Custom CSS muzete pouzit template promenne, ktere se nahradi hodnotami z nastaveni:

| Promenna | Popis | Default |
|----------|-------|---------|
| `{font_size}` | Velikost pisma (px) | `14` |
| `{text_color}` | Barva textu (hex) | `#ffffff` |
| `{background_color}` | Barva pozadi (hex) | `#000000` |

### Priklad pouziti

```css
body {
    font-size: {font_size}px;
    color: {text_color};
    background: {background_color};
}

#log > div {
    background: {background_color}cc;
    padding: 4px 8px;
}

.message {
    color: {text_color};
}
```

Hodnoty promennych nastavite v sekci pod CSS editorem pomoci input poli a color pickeru.

---

## HTML Reference

OBS view pouziva tuto HTML strukturu (kompatibilni se Streamlabs):

```html
<div id="log">
  <div class="wrap" data-from="user">
    <div class="meta" style="color:#ff0">
      <span class="badges"><img class="badge"></span>
      <span class="name">User</span>
      <span class="colon">: </span>
    </div>
    <span class="message">text <img class="emote"></span>
  </div>
</div>
```

### Dostupne selectory

```css
/* Kontejner vsech zprav */
#log { }

/* Jednotliva zprava */
#log > div { }
#log > .wrap { }

/* Zprava z konkretni platformy */
.platform-twitch { }
.platform-kick { }
.platform-youtube { }

/* Meta informace (badges + jmeno) */
.meta { }

/* Badge (subscriber, mod, vip) */
.badges { }
.badge { }

/* Jmeno uzivatele */
.name { }
.name[data-role="broadcaster"] { }
.name[data-role="moderator"] { }
.name[data-role="vip"] { }
.name[data-role="subscriber"] { }

/* Dvojtecka */
.colon { }

/* Text zpravy */
.message { }

/* Emote obrazek */
.emote { }

/* Casova znacka (pokud zapnuta) */
.timestamp { }

/* Alert */
.alert { }
.alert-subscribe { }
.alert-follow { }
.alert-gift_sub { }
.alert-cheer { }
.alert-donation { }
.alert-raid { }
```

---

## Ulozeni

Styl se uklada do `localStorage`:

- **Klic:** `adhub_obs_style`
- **Format:**
  ```json
  {
    "style": "custom",
    "preset": "",
    "css": "/* raw CSS z editoru */",
    "vars": {
      "font_size": "14",
      "text_color": "#ffffff",
      "background_color": "#000000"
    }
  }
  ```

- **Klic:** `adhub_obs_config`
- **Format:**
  ```json
  {
    "customCSS": "/* zpracovane CSS s nahrady promennych */"
  }
  ```

OBS view cteto `adhub_obs_config.customCSS` a injektuje do `<style id="custom-styles">`.

---

## Pouziti jako template

### Pridani noveho presetu

Pridejte do `STYLE_PRESETS` v `script.js`:

```javascript
const STYLE_PRESETS = {
    // ... existujici presety ...

    'my-preset': `@import url('https://fonts.googleapis.com/css2?family=Roboto&display=swap');
body { font-family: 'Roboto', sans-serif; }
#log > div {
    background: rgba(0,0,0,0.5);
    border-radius: 4px;
    padding: 4px 8px;
    margin-bottom: 2px;
}
.name { font-weight: 700; }`,
};
```

Pridejte `<option>` do `index.html`:
```html
<select id="stylePresetSelect">
    <!-- ... existujici options ... -->
    <option value="my-preset">My Preset</option>
</select>
```

### Pridani nove template promenne

1. Pridejte input do `index.html` v `#styleVarsPanel`:
   ```html
   <label><span>{border_color}</span><input type="color" id="varBorderColor" value="#333333"></label>
   ```

2. Pridejte do `processTemplateVars()` v `script.js`:
   ```javascript
   function processTemplateVars(css) {
       const vars = {
           // ... existujici ...
           border_color: document.getElementById('varBorderColor')?.value || '#333333',
       };
       // ...
   }
   ```

3. Pouzijte v CSS: `border: 1px solid {border_color};`

---

## FAQ

**Q: Styl se neaplikuje v OBS?**
A: OBS view musi byt na stejne domene jako hlavni panel (pro sdileni localStorage). Jinak pouzijte `customCSS` URL parametr.

**Q: Mohu pouzit @import v CSS?**
A: Ano, `@import` funguji. Presety je pouzivaji pro Google Fonts.

**Q: Streamlabs CSS nefunguje spravne?**
A: Zkontrolujte, ze pouzivate spravne selectory (viz HTML Reference). Nektere pokrocile Streamlabs CSS pouzivaji JS animace, ktere nejsou podporovane.

**Q: Jak resetovat styl?**
A: Zvolte **Default** a kliknete **Aplikovat styl**.
