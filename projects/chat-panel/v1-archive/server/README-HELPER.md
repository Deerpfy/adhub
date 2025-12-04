# 🔧 Server Helper - Ovládání serveru z webového rozhraní

## Co to je?

Server Helper je malý pomocný proces, který běží na pozadí a umožňuje **ovládat hlavní server z webového rozhraní**, čímž obejde bezpečnostní omezení prohlížeče.

## Jak to funguje?

1. **Helper proces** běží na portu `3002` a poslouchá HTTP požadavky
2. **Webové rozhraní** posílá příkazy na helper server
3. **Helper** spouští/zastavuje hlavní server (port `3001`)

## Spuštění

### Jednoduchý způsob:
Dvakrát klikněte na: **`start-helper.bat`**

### Nebo ručně:
```bash
cd chat-panel/server
node server-helper.js
```

## Co se stane?

Po spuštění uvidíte:
```
═══════════════════════════════════════════════
🔧 Server Helper běží na portu 3002
📡 HTTP endpoint: http://localhost:3002
═══════════════════════════════════════════════
```

**⚠️ DŮLEŽITÉ:** Nechte tento proces běžet na pozadí! 

## Použití z webu

Jakmile helper běží, můžete v webovém rozhraní:

- ✅ **Zapnout Server** - automaticky spustí hlavní server
- ✅ **Vypnout Server** - zastaví hlavní server  
- ✅ **Restartovat** - restartuje hlavní server

Vše funguje přímo z webu bez ručního spouštění!

## Ukončení

Stiskněte `Ctrl+C` v terminálu, kde helper běží.

Helper automaticky zastaví hlavní server při ukončení.

## Řešení problémů

### "Helper server not available"
- Ujistěte se, že helper běží (spusťte `start-helper.bat`)
- Zkontrolujte, že port 3002 není používán jiným programem

### Server se nespustí
- Zkontrolujte, zda máte nainstalované závislosti: `npm install`
- Podívejte se do konzole helperu pro chybové zprávy






