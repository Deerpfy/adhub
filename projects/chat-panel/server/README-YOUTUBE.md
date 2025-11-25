# 📺 YouTube Chat Podpora

## Přehled

YouTube chat podpora vyžaduje **YouTube Data API v3** klíč pro přístup k live chat zprávám během streamu.

## 🚀 Rychlý start

### 1. Získání YouTube API klíče

**⚠️ DŮLEŽITÉ:** Potřebujete **API klíč** (začíná `AIzaSy...`), ne OAuth Client ID!

1. **Otevřete [Google Cloud Console](https://console.cloud.google.com/)**
2. **Vytvořte nový projekt** (nebo použijte existující)
3. **Povolte YouTube Data API v3:**
   - Přejděte do "Knihovna" (Library)
   - Vyhledejte "YouTube Data API v3"
   - Klikněte "Povolit" (Enable)
4. **Vytvořte API klíč:**
   - Přejděte do "Pověření" (Credentials)
   - Klikněte "Vytvořit pověření" → "API klíč"
   - **Vygenerovaný klíč bude vypadat takto:** `AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567`
   - Zkopírujte a uložte tento klíč
   
   **Poznámka:** Pokud vidíte OAuth Client ID (`XXXX-YYYY.apps.googleusercontent.com`), to NENÍ to, co potřebujete! Musíte vytvořit API klíč.

### 2. Konfigurace API klíče

YouTube klíč se **nikam neukládá** – zadává se pouze lokálně z prohlížeče:

1. Spusťte Chat Panel a v hlavičce klikněte na tlačítko **„🔑 YouTube API“**
2. Do zobrazené bubliny vložte svůj API klíč (formát `AIza...`)
3. Potvrďte tlačítkem **„Aktivovat v této bublině“**

> 🫧 **Důležité:** Klíč zůstává jen ve vaší aktuální „bublině uživatele“. Po obnovení stránky nebo na jiném zařízení budete vyzváni k opětovnému zadání. Server ani jiná zařízení k němu nikdy nemají přístup.

### 3. Spuštění serveru

```bash
cd chat-panel/server
npm start
```

### 4. Použití

1. Otevřete webové rozhraní
2. Klikněte "Přidat Chat"
3. Zadejte YouTube live stream URL:
   - `https://www.youtube.com/watch?v=VIDEO_ID`
   - `https://youtu.be/VIDEO_ID`
4. Vyberte platformu: **YouTube**
5. Klikněte "Přidat"

## ⚠️ Omezení

### API kvóty
- **Zdarma:** 10,000 jednotek za den
- **Typická operace:** ~5 jednotek na dotaz
- **Live chat polling:** ~1 jednotka každé 1-5 sekund

### Live stream požadavky
- Video musí být **aktivně živě streamováno** (live)
- Chat musí být **povolený** na streamu
- Pokud stream skončí, chat přestane fungovat

### Autentizace
- **Public data** (live chat) vyžaduje pouze API klíč
- Pro **soukromé streamy** by bylo potřeba OAuth 2.0 (není implementováno)

## 🔧 Technické detaily

### Jak to funguje

1. **Získání Live Chat ID:**
   ```
   GET /videos?id={VIDEO_ID}&part=liveStreamingDetails
   ```

2. **Polling zpráv:**
   ```
   GET /liveChat/messages?liveChatId={CHAT_ID}&part=snippet,authorDetails
   ```

3. **Automatické pollování:**
   - Interval: 1-5 sekund (doporučeno YouTube)
   - Max výsledků: 200 zpráv na dotaz
   - Paginace: automatická pomocí `pageToken`

### Formát zpráv

YouTube API vrací:
- `textMessageEvent` - běžné zprávy
- `superChatEvent` - super chat zprávy
- `memberMilestoneChatEvent` - milestone zprávy
- A další typy...

Aktuálně podporujeme pouze `textMessageEvent` a `superChatEvent`.

## 🐛 Řešení problémů

### "YouTube API klíč není nakonfigurován"
- Klikněte na tlačítko **„🔑 YouTube API“** v horní části aplikace
- Vložte API klíč a potvrďte tlačítko **„Aktivovat v této bublině“**
- Připojení se automaticky zkusí znovu pro všechny čekající YouTube chaty

### "Video not found"
- Ujistěte se, že video ID je správné
- Video musí existovat a být veřejně dostupné

### "Video is not live"
- Stream musí být aktivně živě
- Chat musí být povolený na streamu

### "API quota exceeded"
- Dosáhli jste denního limitu
- Počkejte do dalšího dne nebo upgradujte na placený plán

## 📚 Další informace

- [YouTube Data API v3 Dokumentace](https://developers.google.com/youtube/v3)
- [Live Chat API Reference](https://developers.google.com/youtube/v3/live/docs/liveChatMessages)
- [API Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)

