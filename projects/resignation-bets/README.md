# 🎰 Sázky na výpověď / Resignation Bets

Casino-style webová aplikace pro sázení na to, kdo dá dřív výpověď z práce.

A casino-style web application for betting on who will resign from work first.

---

## 🇨🇿 Česká verze

### Popis

Zábavná webová aplikace inspirovaná designem casina a rulety. Umožňuje vytvářet sázky na to, který zaměstnanec podá výpověď jako první. Aplikace funguje plně offline s lokálním úložištěm dat pomocí IndexedDB.

### Hlavní funkce

- ✅ **Přidávání sázek** - Vytvářejte nové sázky s informacemi o osobě, sázejícím a částce
- 📊 **Statistiky v reálném čase** - Sledujte celkový počet sázek a bodů v hře
- 🏆 **Žebříček** - Ranking sázejících podle jejich úspěšnosti
- 📜 **Historie** - Kompletní přehled všech uzavřených sázek
- 🎯 **Označení výherce** - Jednoduchá aktualizace všech sázek po podání výpovědi
- 💾 **Export/Import** - Zálohování a přenos dat ve formátu JSON
- 🌍 **Vícejazyčnost** - Podpora češtiny a angličtiny s uložením preference

### Technologie

- **Čistý HTML5, CSS3 a JavaScript** - Žádné externí závislosti
- **IndexedDB** - Lokální databáze pro ukládání sázek
- **CSS Animations** - Animovaná ruleta a neonové efekty
- **Responsive Design** - Optimalizováno pro desktop i mobil

### Struktura projektu

```
resignation-bets/
├── index.html          # Hlavní HTML struktura
├── styles.css          # Casino design a animace
├── app.js             # Hlavní logika aplikace
├── db.js              # IndexedDB wrapper
├── lang.js            # Správa vícejazyčnosti
├── locales/
│   ├── cs.json        # České překlady
│   └── en.json        # Anglické překlady
└── README.md          # Tato dokumentace
```

### Jak použít

1. **Otevřete `index.html`** v moderním webovém prohlížeči
2. **Přidejte novou sázku** kliknutím na tlačítko "Přidat sázku"
3. **Vyplňte formulář**:
   - Jméno osoby (na koho se sází)
   - Vaše jméno (sázející)
   - Částka/Body
   - Volitelná poznámka
4. **Označte výherce** když někdo dá výpověď
5. **Exportujte data** pro zálohování nebo sdílení

### Design

Aplikace využívá **casino/ruleta** barevné schéma:
- 🟢 **Tmavě zelená** (#0d5c2e) - Pozadí jako povrch rulety
- 🟡 **Zlatá** (#d4af37) - Akcenty a hlavní prvky
- 🔴 **Červená** (#c41e3a) - Sekundární akcenty
- ⚫ **Černá** (#1a1a1a) - Kontrasty a rámce

**Vizuální prvky:**
- Neonový titulek s blikajícím efektem
- Animovaná ruleta na pozadí
- Tlačítka stylizovaná jako casino žetony
- Karty sázek vypadající jako hrací karty
- Golden glow efekty při najetí myší

### Příklad použití

1. **Vytvoření sázky**: Jan vsadí 100 bodů, že Marie dá výpověď
2. **Sledování statistik**: Vidíte celkový počet aktivních sázek a bodů
3. **Označení výherce**: Když Marie skutečně dá výpověď, označíte ji jako výherce
4. **Aktualizace výsledků**: Všechny sázky na Marii se automaticky označí jako vyhrané
5. **Žebříček**: Jan získá body do žebříčku podle úspěšnosti

### Bezpečnost dat

- Všechna data jsou uložena **lokálně v prohlížeči**
- Žádná komunikace se serverem
- Export umožňuje ruční zálohování
- Import lze použít k obnovení dat

### Požadavky

- Moderní webový prohlížeč s podporou:
  - IndexedDB
  - ES6+ JavaScript
  - CSS3 Animations

### Licence

Vytvořeno pro zábavu a vzdělávací účely. Používejte odpovědně!

---

## 🇬🇧 English Version

### Description

A fun web application inspired by casino and roulette design. Allows creating bets on which employee will resign first. The application works fully offline with local data storage using IndexedDB.

### Main Features

- ✅ **Add Bets** - Create new bets with information about person, bettor and amount
- 📊 **Real-time Statistics** - Track total number of bets and points at stake
- 🏆 **Leaderboard** - Ranking of bettors by their success rate
- 📜 **History** - Complete overview of all closed bets
- 🎯 **Mark Winner** - Easy update of all bets after resignation
- 💾 **Export/Import** - Backup and transfer data in JSON format
- 🌍 **Multi-language** - Support for Czech and English with saved preference

### Technologies

- **Pure HTML5, CSS3 and JavaScript** - No external dependencies
- **IndexedDB** - Local database for storing bets
- **CSS Animations** - Animated roulette and neon effects
- **Responsive Design** - Optimized for desktop and mobile

### Project Structure

```
resignation-bets/
├── index.html          # Main HTML structure
├── styles.css          # Casino design and animations
├── app.js             # Main application logic
├── db.js              # IndexedDB wrapper
├── lang.js            # Multi-language management
├── locales/
│   ├── cs.json        # Czech translations
│   └── en.json        # English translations
└── README.md          # This documentation
```

### How to Use

1. **Open `index.html`** in a modern web browser
2. **Add new bet** by clicking "Add Bet" button
3. **Fill the form**:
   - Person's name (who will resign)
   - Your name (bettor)
   - Amount/Points
   - Optional note
4. **Mark winner** when someone resigns
5. **Export data** for backup or sharing

### Design

The application uses **casino/roulette** color scheme:
- 🟢 **Dark green** (#0d5c2e) - Background like roulette surface
- 🟡 **Gold** (#d4af37) - Accents and main elements
- 🔴 **Red** (#c41e3a) - Secondary accents
- ⚫ **Black** (#1a1a1a) - Contrasts and borders

**Visual Elements:**
- Neon title with flickering effect
- Animated roulette in background
- Buttons styled as casino chips
- Bet cards looking like playing cards
- Golden glow effects on hover

### Example Usage

1. **Create bet**: John bets 100 points that Mary will resign
2. **Track statistics**: See total number of active bets and points
3. **Mark winner**: When Mary actually resigns, mark her as winner
4. **Update results**: All bets on Mary are automatically marked as won
5. **Leaderboard**: John earns points in leaderboard based on success

### Data Security

- All data is stored **locally in browser**
- No server communication
- Export allows manual backup
- Import can be used to restore data

### Requirements

- Modern web browser with support for:
  - IndexedDB
  - ES6+ JavaScript
  - CSS3 Animations

### License

Created for fun and educational purposes. Use responsibly!

---

## 🎲 Odpovědné sázení / Responsible Betting

Tato aplikace je určena pouze pro zábavu mezi kolegy. Nejedná se o skutečné hazardní hry.

This application is intended for fun among colleagues only. It is not real gambling.
