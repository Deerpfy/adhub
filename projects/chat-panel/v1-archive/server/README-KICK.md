# 🎮 Kick Chat Podpora - Developer API

## Přehled

Kick chat podpora může být implementována pomocí **Kick Developer API** přes vytvořenou aplikaci. Oficiální API bylo vydáno v únoru 2025, ale aktuálně **nepodporuje WebSockety** a nabízí omezený počet endpointů.

## 🚀 Rychlý start

### 1. Vytvoření Kick aplikace

1. **Přihlaste se na [Kick.com](https://kick.com)**
2. **Přejděte do Settings → Developer**
3. **Klikněte "Create new" pro vytvoření nové aplikace**
4. **Vyplňte formulář:**
   - **Application Name**: `Multistream Chat Panel` (nebo jakýkoliv název)
   - **App Description**: `Chat aggregation panel for streaming platforms`
   - **Redirect URL**: `http://localhost:3001/auth/kick/callback` (nebo vaše callback URL)
   - **Enable webhooks**: (volitelné) URL pro webhooky, např. `http://localhost:3001/webhooks/kick`
   
5. **Vyberte Scopes:**
   - ✅ **Read user information** (povinné pro základní autentizaci)
   - ✅ **Subscribe to events (read chat feed, follows, subscribes, gifts)** - **DŮLEŽITÉ pro chat!**
   - (Ostatní podle potřeby)

6. **Klikněte "Create App"**
7. **Zkopírujte Client ID a Client Secret** (budou zobrazeny po vytvoření)

### 2. Konfigurace API přihlašovacích údajů

#### Možnost A: Environment Variables (Doporučeno)
```bash
# Windows CMD
set KICK_CLIENT_ID=your_client_id_here
set KICK_CLIENT_SECRET=your_client_secret_here

# Windows PowerShell
$env:KICK_CLIENT_ID="your_client_id_here"
$env:KICK_CLIENT_SECRET="your_client_secret_here"

# Linux/Mac
export KICK_CLIENT_ID=your_client_id_here
export KICK_CLIENT_SECRET=your_client_secret_here
```

#### Možnost B: Přímá konfigurace v `server.js`

Můžete přímo upravit soubor `chat-panel/server/server.js`:

```javascript
const KICK_CLIENT_ID = process.env.KICK_CLIENT_ID || 'your_client_id_here';
const KICK_CLIENT_SECRET = process.env.KICK_CLIENT_SECRET || 'your_client_secret_here';
```

**⚠️ Pozor:** Tato metoda je méně bezpečná - přihlašovací údaje budou viditelné v kódu!

### 3. Spuštění serveru

```bash
cd chat-panel/server
npm start
```

**Poznámka:** Po nastavení proměnných prostředí musíte restartovat Node.js server.

## 📡 Aktuální implementace

### Metoda 1: HTTP Polling (Aktuálně implementováno)

Server používá **HTTP polling** metodu pro získávání chat zpráv:

1. **Získá chatroom ID** z Kick API (`/api/v2/channels/{channel}`)
2. **Polluje chat messages endpoint** každé 2.5 sekundy
3. **Zpracovává nové zprávy** a odesílá je do frontendu

**Výhody:**
- ✅ Funguje bez autentizace
- ✅ Jednoduchá implementace
- ✅ Spolehlivá (bez WebSocket problémů)

**Nevýhody:**
- ⚠️ Zpoždění (2.5 sekundy)
- ⚠️ Vyšší zatížení API (opakované dotazy)

### Metoda 2: Developer API s OAuth (Plánováno)

Pro použití oficiálního Kick Developer API s OAuth:

1. **OAuth 2.0 autentizace** - získání access tokenu
2. **Použití autentizovaných endpointů** - lepší přístup k datům
3. **Webhooks** (pokud jsou dostupné) - real-time notifikace

**⚠️ Poznámka:** Kick API aktuálně **nepodporuje WebSockety** pro chat. Webhooks mohou být alternativou pro real-time aktualizace.

## 🔧 Technické detaily

### HTTP Polling (Aktuální implementace)

```
GET https://kick.com/api/v2/channels/{channel}/chat-messages
```

**Odpověď:**
```json
{
  "data": [
    {
      "id": "message_id",
      "content": "Message text",
      "created_at": "2024-01-01T00:00:00.000Z",
      "user": {
        "username": "username",
        "id": "user_id"
      }
    }
  ]
}
```

### OAuth 2.0 Flow (Pro budoucí implementaci)

1. **Autorizační URL:**
   ```
   https://kick.com/api/v2/oauth/authorize?
     client_id={CLIENT_ID}&
     redirect_uri={REDIRECT_URI}&
     response_type=code&
     scope={SCOPES}
   ```

2. **Exchange code za token:**
   ```
   POST https://kick.com/api/v2/oauth/token
   ```

3. **Použití access tokenu:**
   ```
   Authorization: Bearer {ACCESS_TOKEN}
   ```

## ⚠️ Omezení

### Aktuální Kick API
- **Žádné WebSockety:** Aktuální verze API nepodporuje WebSocket připojení
- **Omezené endpointy:** Dostupné jsou pouze základní endpointy
- **Plánované funkce:** WebSocket podpora je plánována v budoucích aktualizacích

### HTTP Polling
- **Zpoždění:** ~2.5 sekundy mezi zprávami
- **API zatížení:** Pravidelné dotazy každé 2.5 sekundy
- **Rate limiting:** Kick API může mít limity na počet požadavků

## 🐛 Řešení problémů

### "Channel not found"
- Ujistěte se, že název kanálu je správný
- Kanál musí existovat na Kick.com

### "Chatroom ID not found"
- Kanál nemusí mít aktivní chatroom
- Některé kanály mohou mít chat vypnutý

### "DNS resolution failed" (při WebSocket metodě)
- Použijte HTTP polling metodu (aktuálně implementováno)
- Zkontrolujte internetové připojení

### OAuth problémy
- Zkontrolujte, že Client ID a Client Secret jsou správné
- Ověřte, že redirect URI se shoduje s nastavením v aplikaci
- Ujistěte se, že máte správné scopes vybrané

## 📚 Další informace

- [Kick Developer Portal](https://kick.com/settings/developer)
- [Kick API Dokumentace](https://kick.com/api) (pokud je dostupná)
- [OAuth 2.0 Specifikace](https://oauth.net/2/)

## 🔮 Budoucí vylepšení

- [ ] OAuth 2.0 implementace pro autentizované endpointy
- [ ] Webhook podpora pro real-time aktualizace
- [ ] WebSocket podpora (až bude dostupná v Kick API)
- [ ] Lepší error handling a retry logika
- [ ] Caching a optimalizace API volání






