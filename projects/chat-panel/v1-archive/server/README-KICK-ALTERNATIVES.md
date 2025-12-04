# 🔄 Alternativní metody pro Kick Chat

## Aktuální problém

Kick.com veřejné API endpointy pro chat často:
- Vrací HTML místo JSON (vyžadují autentizaci)
- Jsou chráněné a nepřístupné bez OAuth
- Nejsou veřejně dokumentované

## Dostupné alternativy

### 1. **HTTP Polling s OAuth** ✅ (Aktuálně implementováno)
- **Výhody:** Funguje s OAuth tokenem
- **Nevýhody:** Vyžaduje OAuth setup, 2.5s zpoždění
- **Status:** ✅ Funguje, ale vyžaduje OAuth

### 2. **Pusher WebSocket** ⚠️ (Částečně funkční)
- **Výhody:** Real-time, nízké zpoždění
- **Nevýhody:** Může mít problémy s připojením, cluster detection
- **Status:** ⚠️ Funguje, ale nestabilní

### 3. **BotRix API** ❌ (Nedostupné)
- **Problém:** BotRix API není určeno pro čtení chatu
- **BotRix je:** Chatbot service, ne chat API provider
- **Závěr:** ❌ Není vhodné pro naši aplikaci

### 4. **Kick Developer API s OAuth** ✅ (Doporučeno)
- **Endpointy:** Vyžadují OAuth 2.0 autentizaci
- **Setup:** Client ID + Client Secret z Kick Developer Portal
- **Status:** ✅ Funguje po správném OAuth nastavení

## Doporučení

**Nejlepší řešení:** Použít **Kick Developer API s OAuth 2.0**

1. **Získejte Client ID a Secret:**
   - Jděte na https://kick.com/settings/developer
   - Vytvořte novou aplikaci
   - Zkopírujte Client ID a Client Secret

2. **Nastavte v aplikaci:**
   - Otevřete ⚙️ Nastavení
   - Zadejte Kick Client ID a Client Secret
   - Uložte a restartujte server

3. **Přihlaste se přes OAuth:**
   - Klikněte na "🔐 Kick OAuth" v hlavičce
   - Přihlaste se do Kick účtu
   - Autorizujte aplikaci

4. **Přidejte Kick chat:**
   - Po úspěšném OAuth přidávejte Kick chaty normálně

## Technické detaily

### OAuth Flow
```
1. Uživatel klikne "🔐 Kick OAuth"
   → Přesměrování na Kick autorizaci
   
2. Uživatel autorizuje
   → Kick přesměruje na callback s authorization code
   
3. Server vymění code za access token
   → Uloží token pro použití v API requestech
   
4. Chat připojení používá token
   → OAuth token v Authorization headeru
```

### API Endpointy (s OAuth)
```javascript
// Získání chatroom ID
GET https://kick.com/api/v2/channels/{channel}
Authorization: Bearer {access_token}

// Získání chat zpráv (s OAuth tokenem)
GET https://kick.com/api/v2/chatrooms/{chatroomId}/messages
Authorization: Bearer {access_token}
```

## Řešení problémů

### "API returned HTML instead of JSON"
- **Příčina:** Endpoint vyžaduje autentizaci
- **Řešení:** Zajistěte správné OAuth nastavení a přihlášení

### "OAuth not configured"
- **Řešení:** Zadejte Client ID a Secret v nastavení

### "Token expired"
- **Řešení:** Znovu se přihlaste přes "🔐 Kick OAuth"

## Budoucí možnosti

Pokud Kick v budoucnu:
- ✅ Otevře veřejné chat API → můžeme odstranit OAuth požadavek
- ✅ Přidá WebSocket podporu → real-time bez polling
- ✅ Dokumentuje API → lepší integrace

Momentálně **OAuth je jediná spolehlivá cesta** pro Kick chat.





