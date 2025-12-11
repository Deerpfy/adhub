# Steam Farm - AdHUB

Nástroj pro farming Steam hodin a trading cards. Simuluje hraní až 32 her současně bez nutnosti spouštět samotné hry.

## Funkce

- Farming hodin pro libovolné hry z vaší knihovny
- Zobrazení zbývajících trading cards
- Podpora až 32 her současně (Steam limit)
- Automatické 2FA s shared_secret
- Lokální uložení session (platnost ~200 dní)
- 100% lokální zpracování - žádná data neodesílána na externí servery

## Architektura (v2.0)

```
Web UI (prohlížeč)
      │
      ▼
Chrome Extension (bridge)
      │
      ▼ (WebSocket localhost:17532)
Steam Farm Service (Node.js)
      │
      ▼
Steam CM servery
```

**Hlavní změna v v2.0:** Přechod z Native Messaging na WebSocket. **Není potřeba zadávat Extension ID!**

## Požadavky

- Chrome/Edge/Brave prohlížeč
- Node.js 18+
- Steam účet

## Instalace

### Automatická instalace (doporučeno)

1. Nainstalujte Chrome rozšíření z `plugin/` složky
2. Stáhněte a spusťte instalátor pro váš systém:
   - Windows: `install-service.ps1`
   - Linux/macOS: `install-service.sh`
3. Obnovte stránku Steam Farm

**Žádné Extension ID není potřeba!** Service automaticky poslouchá na `localhost:17532`.

### Manuální instalace

#### 1. Nainstalujte Chrome rozšíření

1. Otevřete `chrome://extensions`
2. Zapněte "Režim pro vývojáře"
3. Klikněte "Načíst rozbalené rozšíření"
4. Vyberte složku `plugin/`

#### 2. Spusťte Steam Farm Service

```bash
cd native-host
npm install
node steam-farm-service.js
```

Service běží na `ws://127.0.0.1:17532` a poskytuje HTTP status endpoint na `http://127.0.0.1:17532/status`.

#### 3. Obnovte stránku

Po spuštění service obnovte stránku Steam Farm. Rozšíření se automaticky připojí ke službě.

## Použití

1. Otevřete Steam Farm stránku v AdHUB
2. Přihlaste se svým Steam účtem
3. Vyberte hry které chcete farmit
4. Klikněte "Spustit vše"

## Bezpečnost

- Vaše přihlašovací údaje nikdy neopouštějí váš počítač
- Komunikace probíhá přímo mezi vaším počítačem a Steam servery
- Session token je šifrován AES-256-GCM s klíčem odvozeným z hesla přes Argon2id
- Service přijímá pouze localhost spojení
- Žádné externí servery nejsou použity

## Shared Secret (volitelné)

Pro automatické 2FA zadejte `shared_secret` z vašeho Steam Mobile Authenticator.

Získání shared_secret:
- Na Androidu: `data/data/com.valvesoftware.android.steam.community/files/Steamguard-XXXXX`
- Na iOS: Není přímo dostupné
- Steam Desktop Authenticator: maFiles

## Omezení

- Maximum 32 her současně (Steam limit)
- Trading cards padají pouze u her s kartičkami
- Některé hry vyžadují 2+ hodiny hraní před prvním dropem karty

## Technické detaily

Nástroj využívá knihovnu [steam-user](https://github.com/DoctorMcKay/node-steam-user) pro komunikaci se Steam CM servery pomocí zprávy `CMsgClientGamesPlayed`.

### Service Endpoints

- `ws://127.0.0.1:17532` - WebSocket pro real-time komunikaci
- `http://127.0.0.1:17532/status` - JSON status endpoint
- `http://127.0.0.1:17532/health` - Health check

### Změny ve v2.0

- Přechod z Native Messaging na WebSocket
- Není potřeba registrace Native Host manifestu
- Žádné Extension ID při instalaci
- Automatické spuštění service při startu systému (s instalátorem)
- Jednodušší instalace

## Právní upozornění

Použití automatických nástrojů může být v rozporu se Steam Subscriber Agreement. Používejte na vlastní riziko.

## Autor

Součást projektu [AdHUB](https://deerpfy.github.io/adhub/) od Deerpfy.
