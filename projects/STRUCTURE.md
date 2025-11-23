# Struktura projektů v AdHUB

## Doporučená struktura projektu

### Projekt se serverem (např. chat-panel, youtube-downloader)

```
my-project/
├── index.html              # Hlavní webové rozhraní
├── script.js               # Frontend JavaScript
├── styles.css              # Styly
├── README.md               # Dokumentace projektu
├── server/
│   ├── server.js           # Hlavní server
│   ├── server-helper.js    # Helper server (pro ovládání přes AdHUB)
│   ├── package.json        # Node.js závislosti
│   ├── start.bat           # Spuštění serveru (Windows)
│   └── start-helper.bat    # Spuštění helperu (Windows)
└── [další soubory projektu]
```

### Jednoduchý projekt bez serveru (např. komopizza)

```
my-project/
├── index.html              # Hlavní webové rozhraní
├── script.js               # JavaScript
├── styles.css              # Styly
├── README.md               # Dokumentace projektu
└── [další soubory projektu]
```

## Porty

Každý projekt se serverem potřebuje:
- **Server port**: Port na kterém běží hlavní server (např. 3001, 3003)
- **Helper port**: Port na kterém běží helper server (např. 3002, 3004)

### Doporučené porty:
- AdHUB: Server 3020, Helper 3005
- Chat Panel: Server 3001, Helper 3002
- YouTube Downloader: Server 3003, Helper 3004
- Nové projekty: Použijte volné porty (např. 3011/3012, 3013/3014, atd.)

## Cesty v konfiguraci

Při přidávání projektu do AdHUB použijte relativní cesty z kořene `adhub/`:

```json
{
  "helperPath": "projects/my-project/server/server-helper.js",
  "url": "projects/my-project/index.html"  // pro lokální odkazy
}
```

Projekty se serverem obvykle běží na `http://localhost:PORT`, takže URL je absolutní.










