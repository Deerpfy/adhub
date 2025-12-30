# IP API - Self-hosted

Minimální server, který vrací **pouze raw IP adresu** - žádné HTML, žádné JSON, jen číslo.

## Odpověď

```
203.0.113.45
```

To je vše. Žádné HTML, žádné obalení, jen IP.

## Spuštění

### Node.js (doporučeno)

```bash
cd server
node server.js

# Test
curl http://localhost:3080
```

### Python (bez závislostí)

```bash
cd server
python3 server.py

# Test
curl http://localhost:3080
```

## Použití

```bash
# Bash
IP=$(curl -s http://localhost:3080)
echo "Moje IP: $IP"

# PowerShell
$ip = Invoke-WebRequest -Uri http://localhost:3080 -UseBasicParsing | Select-Object -ExpandProperty Content

# Python
import requests
ip = requests.get('http://localhost:3080').text

# JavaScript
const ip = await fetch('http://localhost:3080').then(r => r.text());
```

## Proč potřebuji server?

Prohlížeč nemá přístup k vlastní veřejné IP adrese. Tu vidí pouze server, ke kterému se připojíš. Proto je server nutný.

## Port

Výchozí port: `3080`

Změna: `PORT=8080 node server.js`
