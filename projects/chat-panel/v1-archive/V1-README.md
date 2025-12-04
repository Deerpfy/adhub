# Chat Panel v1 - Archiv

Toto je archivovaná verze multistream chat panelu.

## Proč archivováno

v1 vyžadovala spuštění Node.js backend serveru pro funkčnost. Toto bylo nahrazeno novou v2 verzí, která funguje **kompletně v prohlížeči** bez nutnosti spouštět jakýkoliv server.

## Jak spustit (pokud potřebujete)

```bash
cd server
npm install
npm start
```

Pak otevřete `index.html` v prohlížeči.

## Omezení v1

- Vyžaduje Node.js 18+
- Vyžaduje běžící backend server
- Komplexní nastavení pro Kick OAuth
- Závislosti: tmi.js, ws, express, cors, node-fetch

## Migrace na v2

v2 je dostupná v nadřazeném adresáři (`../`) a nabízí:
- Žádné závislosti na serveru
- Přímé připojení k chat platformám
- Jednodušší nastavení
- Modernější design

---

*Archivováno: 2024-12-04*
