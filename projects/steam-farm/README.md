# Steam Farm - AdHUB

Nástroj pro farming Steam hodin a trading cards. Simuluje hraní až 32 her současně bez nutnosti spouštět samotné hry.

## Funkce

- Farming hodin pro libovolné hry z vaší knihovny
- Zobrazení zbývajících trading cards
- Podpora až 32 her současně (Steam limit)
- Automatické 2FA s shared_secret
- Lokální uložení session (platnost ~200 dní)
- 100% lokální zpracování - žádná data neodesílána na externí servery

## Architektura

```
Web UI (prohlížeč)
      │
      ▼
Chrome Extension (bridge)
      │
      ▼
Native Messaging Host (Node.js)
      │
      ▼
Steam CM servery
```

## Požadavky

- Chrome/Edge/Brave prohlížeč
- Node.js 18+
- Steam účet

## Instalace

### 1. Nainstalujte Chrome rozšíření

1. Otevřete `chrome://extensions`
2. Zapněte "Režim pro vývojáře"
3. Klikněte "Načíst rozbalené rozšíření"
4. Vyberte složku `plugin/`
5. Zkopírujte ID rozšíření

### 2. Nainstalujte Native Host

**Windows:**
```cmd
cd native-host
npm install
install.bat
```

**Linux/macOS:**
```bash
cd native-host
npm install
chmod +x install.sh
./install.sh
```

Při instalaci budete dotázáni na ID rozšíření z kroku 1.

### 3. Restartujte prohlížeč

Po instalaci Native Host je potřeba restartovat prohlížeč.

## Použití

1. Otevřete Steam Farm stránku v AdHUB
2. Přihlaste se svým Steam účtem
3. Vyberte hry které chcete farmit
4. Klikněte "Spustit vše"

## Bezpečnost

- Vaše přihlašovací údaje nikdy neopouštějí váš počítač
- Komunikace probíhá přímo mezi vaším počítačem a Steam servery
- Session token je uložen lokálně a šifrován
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

## Právní upozornění

Použití automatických nástrojů může být v rozporu se Steam Subscriber Agreement. Používejte na vlastní riziko.

## Autor

Součást projektu [AdHUB](https://deerpfy.github.io/adhub/) od Deerpfy.
