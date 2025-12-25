# Komplexní technická dokumentace pro Rust game tools

Vytvoření vlastních nástrojů pro Rust je technicky proveditelné díky kombinaci **BattleMetrics API**, **Steam Web API**, **A2S Query protokolu** a **Rust+ WebSocket API**. Žádný z existujících kalkulátorů (RustLabs, RustTips, RustCalculator) nenabízí veřejné API — veškerá data musíte sestavit z herních souborů nebo reverse-engineeringu. Pro server tracking je BattleMetrics nejkomplexnější zdroj s limitem **300 requestů/minutu** pro autentizované uživatele, zatímco přímé A2S dotazy na servery poskytují real-time data bez autentizace.

---

## Raid a crafting kalkulačky využívají statická data

Všechny existující kalkulačky (RustLabs.com, RustTips.com, RustCalculator.com, RustHelp.com) fungují bez veřejných API — data jsou hardcodovaná ve frontendu jako JavaScript objekty nebo JSON soubory. RustLabs je de facto standard pro herní data, přičemž jeho obrázky itemů jsou dostupné na `rustlabs.com/img/items180/{shortname}.png`, ale žádné REST API neexistuje.

Klíčová raid data pro implementaci zahrnují HP hodnoty struktur a sulfur costy výbušnin. **Stone wall má 500 HP**, metal wall 1000 HP a armored wall 2000 HP. Pro výbušniny platí: **C4 stojí 2,200 sulfuru**, rocket 1,400 sulfuru, satchel 480 sulfuru a explosive 5.56 ammo 25 sulfuru za náboj. Raid na stone wall vyžaduje 2× C4 (4,400 sulfur), 4× rockets (5,600 sulfur), 10× satchels (4,800 sulfur) nebo 185× explo ammo (4,625 sulfur).

Pro crafting kalkulátor je nutné implementovat dependency tree. Gunpowder se vyrábí z **20 sulfuru + 30 charcoalu = 10 gunpowder** (na workbenchi), nebo efektivněji na mixing table (20+20=10). C4 vyžaduje 20 explosives + 5 cloth + 2 tech trash, kde každý explosive stojí 50 gunpowder + 3 low grade fuel + 10 sulfur + 10 metal fragments. Kompletní raw materials pro jeden C4: 2,200 sulfur, 3,000 charcoal, 60 LGF, 200 metal fragments, 5 cloth, 2 tech trash.

### Doporučená datová struktura pro kalkulátor

```json
{
  "buildings": {
    "stone_wall": { "hp": 500, "tier": "stone", "build_cost": { "stones": 300 } },
    "metal_wall": { "hp": 1000, "tier": "sheet_metal", "build_cost": { "metal_fragments": 200 } },
    "armored_wall": { "hp": 2000, "tier": "armored", "build_cost": { "hqm": 25 } }
  },
  "explosives": {
    "c4": { "sulfur_cost": 2200, "workbench": 3, "damage": { "stone": 275, "metal": 385 } },
    "rocket": { "sulfur_cost": 1400, "workbench": 3 },
    "satchel": { "sulfur_cost": 480, "workbench": 1 }
  }
}
```

Data pro aktualizace lze získávat z **uMod/Oxide server config souborů** (ItemConfig.json), které obsahují kompletní blueprinty s ingrediencemi. Alternativně existují GitHub repozitáře jako `github.com/SzyMig/Rust-item-list-JSON` nebo `github.com/Dalton-West/Rust-Labs-Item-Scraper` pro scraping RustLabs dat.

---

## BattleMetrics API poskytuje nejkomplexnější server data

BattleMetrics je primární zdroj pro server tracking s **oficiálním REST API** na `https://api.battlemetrics.com`. API vyžaduje OAuth 2.0 Bearer token získaný na `battlemetrics.com/developers`. Rate limity činí **60 req/min bez autentizace** a **300 req/min s tokenem**, s burst limitem 15/45 requestů za sekundu.

Základní endpointy pro Rust servery:

```bash
# Vyhledání Rust serverů
GET /servers?filter[game]=rust&filter[search]=vanilla

# Detail serveru
GET /servers/{server_id}

# Historie hráčů
GET /servers/{server_id}/player-count-history?start=2024-01-01T00:00:00Z

# Leaderboard serveru  
GET /servers/{server_id}/relationships/leaderboards/time
```

Ukázková response pro server detail obsahuje name, IP, port, players, maxPlayers, rank, location (lat/long), status a game-specific details (map, pve, official). Player tracking endpointy umožňují vyhledat hráče podle Steam ID přes `POST /players/match` a získat jejich session historii, time played a first/last seen timestamps.

### JavaScript implementace BattleMetrics klienta

```javascript
const BM_TOKEN = 'your_battlemetrics_token';

async function searchRustServers(query, limit = 25) {
  const params = new URLSearchParams({
    'filter[game]': 'rust',
    'filter[search]': query,
    'page[size]': limit
  });
  
  const response = await fetch(`https://api.battlemetrics.com/servers?${params}`, {
    headers: { 'Authorization': `Bearer ${BM_TOKEN}` }
  });
  return response.json();
}
```

Alternativní tracking weby jako **Just-Wiped.net** (7,832+ serverů, specializace na wipe detection) a **Rust-Servers.net** (vlastní API pro vote tracking) nemají veřejná API pro server data. Just-Wiped používá vlastní A2S scraping a proprietary wipe detection algoritmy.

---

## Steam Web API a A2S protokol pro přímé dotazy

Steam Web API vyžaduje **API klíč** z `steamcommunity.com/dev/apikey` (podmínkou je non-limited Steam účet s nákupem za min. $5). Denní limit je **100,000 requestů**, klíč nesmí být sdílen veřejně.

Hlavní endpoint pro server listy je `IGameServersService/GetServerList`:

```bash
GET https://api.steampowered.com/IGameServersService/GetServerList/v1/
  ?key=YOUR_API_KEY
  &filter=\appid\252490\empty\1
  &limit=5000
  &format=json
```

Response obsahuje pole serverů s addr, gameport, steamid, name, players, max_players, map a gametype (tagy jako `mp,modded,oxide,vanilla`). Filter syntaxe používá backslash separátory: `\appid\252490\secure\1\dedicated\1`.

### A2S Query Protocol pro real-time data

Pro získání aktuálních dat přímo ze serverů bez API klíče použijte **A2S protokol** přes UDP (port obvykle 28015 pro Rust). Tři typy dotazů:

- **A2S_INFO** — server name, map, players, maxplayers, VAC status
- **A2S_PLAYER** — seznam připojených hráčů s jmény, skóre, dobou připojení  
- **A2S_RULES** — server configuration variables

Python implementace s knihovnou python-a2s:

```python
import a2s

address = ("rust-server.com", 28015)
info = a2s.info(address)       # Server info
players = a2s.players(address) # Seznam hráčů
rules = a2s.rules(address)     # Server pravidla

print(f"Server: {info.server_name}")
print(f"Players: {info.player_count}/{info.max_players}")
for player in players:
    print(f"  {player.name}: {player.duration}s online")
```

Pro Node.js použijte balíček `steam-server-query` nebo komplexnější `gamedig` (podporuje 320+ her):

```javascript
import { GameDig } from 'gamedig';

const state = await GameDig.query({
  type: 'rust',
  host: 'server.ip',
  port: 28015
});
```

---

## Rust+ API umožňuje kontrolu smart zařízení a team chat

Rust+ Companion App **nemá oficiální dokumentaci**, ale komunita reverse-engineerovala WebSocket protokol. Spojení probíhá na `ws://{server-ip}:{app.port}` (typicky game port + 67, tedy 28082). Autentizace vyžaduje **playerToken** získaný přes FCM pairing v hře.

Dostupné operace přes Rust+ API:

| Request | Token Cost | Popis |
|---------|------------|-------|
| getInfo | 1 | Server informace |
| getMap | 5 | Mapa jako JPEG |
| getMapMarkers | 1 | Vending machines, cargo, heli |
| getTeamInfo | 1 | Team members a pozice |
| setEntityValue | 1 | Ovládání smart switchů |
| sendTeamMessage | 2 | Team chat |

Rate limity jsou **25 tokenů per player** s regenerací 3 tokeny/sekundu. Knihovna `@liamcottle/rustplus.js` (282 GitHub stars) poskytuje kompletní wrapper:

```javascript
const RustPlus = require('@liamcottle/rustplus.js');
const rustplus = new RustPlus('ip', 'port', 'playerId', 'playerToken');

rustplus.on('connected', () => {
  rustplus.getInfo((msg) => console.log(msg.response.info));
  rustplus.turnSmartSwitchOn(entityId);
  rustplus.sendTeamMessage('Hello from API!');
});
rustplus.connect();
```

Pro Python existuje knihovna `rustplus` (`pip install rustplus`) s async podporou a kompletní dokumentací na rplus.ollieee.xyz.

---

## Technická implementace vyžaduje backend proxy

### Potřebné API klíče a jejich získání

| API | Jak získat | Rate Limit | Komerční použití |
|-----|------------|------------|------------------|
| Steam Web API | steamcommunity.com/dev/apikey | 100k/den | Omezené (personal license) |
| BattleMetrics | battlemetrics.com/developers | 300/min auth | **Zakázáno** |
| Rust+ | FCM pairing in-game | 25 tokens/3sec | Nejasné |

**BattleMetrics výslovně zakazuje komerční použití** ve svých Terms of Service — data nelze používat pro „commercial or public purposes" bez písemného souhlasu. Steam API vyžaduje privacy policy pro aplikace zpracovávající user data.

### CORS řešení pro browser-based nástroje

Steam API a většina game APIs **nepodporuje CORS**, proto browser-based aplikace vyžadují backend proxy:

```javascript
// Serverless function (Vercel/AWS Lambda)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const apiResponse = await fetch(
    `https://api.battlemetrics.com/servers?filter[game]=rust`,
    { headers: { 'Authorization': `Bearer ${process.env.BM_TOKEN}` }}
  );
  
  return res.json(await apiResponse.json());
}
```

**Nikdy nevkládejte API klíče do frontend kódu** — jsou viditelné v DevTools. Použijte environment variables na serveru a volání přes vlastní API endpoint.

### Doporučená architektura pro AdHub

```
/api (backend - Node.js/Python)
  ├── /servers - BattleMetrics proxy s cachingem (TTL 60s)
  ├── /query - A2S direct queries pro real-time data
  └── /calculator - Static JSON data pro raid/craft

/frontend (browser)
  ├── Server browser - volá /api/servers
  ├── Raid calculator - local calculations z JSON
  └── Crafting tree - dependency resolver
```

Cache strategie: server listy 60 sekund, player counts 30 sekund, static game data 24 hodin. Pro real-time updates zvažte WebSocket na vlastním backendu agregující A2S dotazy.

---

## Open source knihovny pro rychlou implementaci

### JavaScript/TypeScript

```bash
npm install gamedig              # Server queries (320+ games)
npm install steam-server-query   # A2S protocol
npm install @liamcottle/rustplus.js  # Rust+ API
npm install @leventhan/battlemetrics # BattleMetrics wrapper
```

### Python

```bash
pip install python-a2s   # A2S queries (async support)
pip install rustplus     # Rust+ API wrapper
pip install requests     # HTTP for Steam/BattleMetrics
```

Kompletní seznam relevantních GitHub repozitářů: `github.com/gamedig/node-gamedig` (692 stars), `github.com/liamcottle/rustplus.js` (282 stars), `github.com/Yepoleb/python-a2s`, `github.com/jacobs0925/RustItemAPI` (serverless Rust item API s endpointy /items, /craft, /durability, /loot).

---

## Závěr a implementační doporučení

Pro váš AdHub projekt doporučuji **hybridní přístup**: použijte BattleMetrics API pro historická data a server discovery (s agresivním cachingem kvůli rate limitům a TOS omezením), A2S protokol pro real-time player counts bez API závislosti, a statické JSON soubory pro raid/crafting kalkulátor. 

Kritické body: BattleMetrics zakazuje komerční použití — pokud bude AdHub monetizován, kontaktujte je pro licenci nebo spoléhejte pouze na Steam API + A2S. Rust+ API je technicky šedá zóna bez oficiální dokumentace, ale Facepunch dosud neprovedl žádné takedowny komunitních nástrojů. Všechny API klíče držte výhradně na backendu a implementujte rate limiting na vlastní straně pro ochranu proti zneužití.