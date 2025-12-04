# Multistream Chat Server

Backend server pro multistream chat - zadarmo alternativa k Streamlabs Multistream.

## Funkce

- ✅ Připojení k Twitch chatu přes TMI.js
- ✅ Připojení k Kick chatu (částečně podporováno)
- ✅ WebSocket server pro real-time komunikaci s frontendem
- ✅ Normalizace zpráv z různých platforem do jednotného formátu
- ✅ Automatické reconnect při ztrátě spojení

## Instalace

1. Přejděte do složky serveru:
```bash
cd chat-panel/server
```

2. Nainstalujte závislosti:
```bash
npm install
```

## Spuštění

```bash
npm start
```

Server poběží na `http://localhost:3001`

Pro vývoj s auto-reload:
```bash
npm run dev
```

## Jak to funguje

1. **Backend server** se připojuje k chatům platforem (Twitch, Kick)
2. **Zprávy** se normalizují do jednotného formátu
3. **WebSocket** posílá zprávy do frontendu v real-time
4. **Frontend** zobrazuje zprávy ve Streamlabs stylu

## API

### WebSocket Endpoint

`ws://localhost:3001?id={connectionId}`

**Připojení k chatu:**
```json
{
  "type": "connect",
  "platform": "twitch",
  "channel": "gamezense",
  "connectionId": "panel-id-123"
}
```

**Odpojení:**
```json
{
  "type": "disconnect",
  "platform": "twitch",
  "channel": "gamezense",
  "connectionId": "panel-id-123"
}
```

**Přijaté zprávy:**
```json
{
  "type": "chat",
  "id": "message-id",
  "platform": "twitch",
  "username": "ViewerName",
  "message": "Hello chat!",
  "color": "#9146FF",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Status zprávy:**
```json
{
  "type": "status",
  "platform": "twitch",
  "channel": "gamezense",
  "status": "connected"
}
```

### REST Endpoints

**Health check:**
```
GET http://localhost:3001/health
```

**Server status:**
```
GET http://localhost:3001/status
```

## Podporované platformy

### Twitch
- ✅ Plně funkční přes TMI.js
- Zadejte jen název kanálu (např. `gamezense`)

### Kick
- ⚠️ Částečně podporováno
- Vyžaduje další implementaci Pusher klienta
- Pro plnou funkcionalnost použijte Iframe režim ve frontendu

## Řešení problémů

### Server se nespustí
- Zkontrolujte, že port 3001 není obsazený
- Zkontrolujte Node.js verzi (doporučeno v18+)

### Twitch chat se nepřipojí
- Ujistěte se, že kanál existuje
- Zkontrolujte konzoli serveru pro chybové zprávy

### Frontend se nepřipojí k serveru
- Ujistěte se, že server běží (`npm start`)
- Zkontrolujte URL v `script.js`: `const WS_SERVER_URL = 'ws://localhost:3001'`

## Další vylepšení

- [ ] Podpora pro YouTube Live Chat
- [ ] Plná implementace Kick Pusher klienta
- [ ] Filtrování zpráv
- [ ] Ukládání historie
- [ ] Autentizace pro soukromé kanály






