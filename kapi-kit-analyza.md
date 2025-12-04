# Technicka analyza kapi-kit

Komplexni rozbor knihovny pro integraci KICK API do AdHub multistream chat projektu.

**Repozitar:** Wydoyolo/kapi-kit  
**Verze:** 0.1.0  
**Licence:** MIT  
**Stav:** Aktivni vyvoj (aktualni k 2025-10-27)

---

## Obsah

1. [Prehled knihovny](#1-prehled-knihovny)
2. [Technicke specifikace](#2-technicke-specifikace)
3. [Architektura a struktura](#3-architektura-a-struktura)
4. [API moduly](#4-api-moduly)
5. [Autentizace OAuth 2.1](#5-autentizace-oauth-21)
6. [Chat funkcionalita](#6-chat-funkcionalita)
7. [Webhook system](#7-webhook-system)
8. [Error handling](#8-error-handling)
9. [Multistream architektura](#9-multistream-architektura)
10. [Endpoint coverage](#10-endpoint-coverage)
11. [Integracni doporuceni pro AdHub](#11-integracni-doporuceni-pro-adhub)
12. [Omezeni a workaroundy](#12-omezeni-a-workaroundy)

---

## 1. Prehled knihovny

kapi-kit je batteries-included SDK pro KICK Public API, navrzeny pro moderni Node.js runtime (22+). Knihovna poskytuje kompletni sadu nastroju pro vyvoj botu, dashboardu a broadcaster toolingu.

### Klicove vlastnosti

- OAuth 2.1 helpers s PKCE utilitami, refresh rotation a token revocation
- Chat client pro bot i broadcaster zpravy vcetne replies
- Livestream, channel, moderation, kicks a users endpointy
- Webhook receivers s signature verification
- Drop-in priklady pro kazdy endpoint
- Multi-tenant bot framework

### Pozadavky

- Node.js 22.0.0 nebo novejsi (vyuziva built-in fetch)
- npm nebo kompatibilni package manager
- Registrovana KICK developer aplikace na kick.com/apps

---

## 2. Technicke specifikace

### Package.json konfigurace

```json
{
  "name": "kapi-kit",
  "version": "0.1.0",
  "type": "module",
  "engines": {
    "node": ">=22.0.0"
  },
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js",
    "./examples/*": "./examples/*"
  }
}
```

### Runtime charakteristiky

| Parametr | Hodnota |
|----------|---------|
| Modularni system | ESM (import/export) |
| HTTP klient | Nativni globalThis.fetch |
| Zavislosti | **Zero** (zadne externi) |
| TypeScript | JSDoc anotace (planovana TS deklarace) |
| User-Agent | `kapi-kit-sdk/0.1.0 (+https://docs.kick.com/)` |

### API servery

| Sluzba | URL |
|--------|-----|
| OAuth server | `https://id.kick.com` |
| REST API | `https://api.kick.com/public/v1` |
| Dokumentace | `https://docs.kick.com` |

---

## 3. Architektura a struktura

### Adresarova struktura

```
kapi-kit/
  src/
    index.js      # Hlavni export modul
    client.js     # KickApiClient - high-level wrapper
    auth.js       # KickAuthClient - OAuth flows
    chat.js       # KickChatClient - chat helper
    http.js       # KickHttpClient - HTTP vrstva
    errors.js     # KickApiError definice
  examples/
    full-bot.js           # Single-channel bot
    multi-stream-bot.js   # Multi-tenant bot
    chat-send.js          # Zakladni chat priklad
    token-rotation.js     # Persistent refresh
    events.js             # Webhook subscriptions
    oauth-*.js            # OAuth flow priklady
    ...
  docs/
    coverage.md   # Endpoint coverage matice
```

### Exportovane moduly

```javascript
import {
  KickApiClient,      // High-level API wrapper
  KickChatClient,     // Focused chat helper
  KickAuthClient,     // OAuth flow manager
  createAuthorizationUrl,  // PKCE URL builder
  createPkcePair,     // PKCE verifier/challenge generator
  KickApiError,       // Error class
  KickHttpClient,     // Low-level HTTP client
  DEFAULT_API_BASE_URL,
  DEFAULT_OAUTH_BASE_URL,
  parseKickResponse,
} from 'kapi-kit';
```

---

## 4. API moduly

### KickApiClient

High-level wrapper pro vsechny KICK Public API endpointy.

#### Konstruktor

```javascript
const client = new KickApiClient({
  accessToken: 'YOUR_ACCESS_TOKEN',  // OAuth token
  baseUrl: 'https://api.kick.com/public/v1',  // volitelne
  fetchImpl: globalThis.fetch,  // volitelne
  userAgent: 'custom-agent/1.0',  // volitelne
});
```

#### Metody

| Oblast | Metoda | Popis |
|--------|--------|-------|
| Chat | `sendChatMessage(params)` | Odeslani zpravy |
| Categories | `searchCategories({query, page})` | Vyhledavani kategorii |
| Categories | `getCategoryById(id)` | Detail kategorie |
| Channels | `getChannels({broadcasterUserIds, slugs})` | Ziskani kanalu |
| Channels | `updateChannelMetadata({categoryId, streamTitle, customTags})` | Aktualizace kanalu |
| Events | `listEventSubscriptions({broadcasterUserId})` | Seznam subscriptions |
| Events | `createEventSubscriptions({broadcasterUserId, method, events})` | Vytvoreni subscription |
| Events | `deleteEventSubscriptions({ids})` | Smazani subscriptions |
| Livestreams | `getLivestreams({broadcasterUserIds, categoryId, language, limit, sort})` | Seznam streamu |
| Livestreams | `getLivestreamStats()` | Statistiky streamu |
| Moderation | `banUser({broadcasterUserId, userId, duration, reason})` | Ban uzivatele |
| Moderation | `unbanUser({broadcasterUserId, userId})` | Unban uzivatele |
| Kicks | `getKicksLeaderboard({top})` | Leaderboard |
| Users | `getUsers({ids})` | Ziskani uzivatelu |
| Public Key | `getPublicKey()` | Webhook verification key |
| Token | `introspectToken()` | Token introspection |

#### Runtime token update

```javascript
client.setAccessToken(newToken);
```

### KickChatClient

Specializovany helper pro chat operace.

```javascript
const chat = new KickChatClient({
  accessToken: 'YOUR_ACCESS_TOKEN',
});

await chat.sendMessage({
  content: 'Zprava do chatu',
  type: 'bot',  // nebo 'user'
  broadcasterUserId: 123456,  // nutne pro type: 'user'
  replyToMessageId: 'uuid',  // volitelne
});

// Raw message (pokrocile)
await chat.sendRawMessage({ content: '...', type: 'bot' });
```

### KickHttpClient

Nizko-urovnovy HTTP klient pouzivany internimi moduly.

```javascript
const http = new KickHttpClient({
  accessToken: 'token',
  baseUrl: 'https://api.kick.com/public/v1',
});

const response = await http.request({
  method: 'POST',
  path: '/chat',
  body: { content: 'Test', type: 'bot' },
  query: { param: 'value' },
  signal: abortController.signal,
  headers: { 'X-Custom': 'value' },
});
```

---

## 5. Autentizace OAuth 2.1

### Podporovane flows

| Flow | Pouziti | Helper |
|------|---------|--------|
| Client Credentials | App-to-app volani bez broadcaster auth | `getAppAccessToken()` |
| Authorization Code + PKCE | Interaktivni prihlaseni uzivatele | `createPkcePair()`, `createAuthorizationUrl()`, `exchangeCodeForToken()` |
| Refresh Token | Obnoveni pristupoveho tokenu | `refreshAccessToken()` |
| Token Revocation | Zruseni tokenu | `revokeToken()` |
| Token Introspection | Overeni platnosti tokenu | `introspectToken()` |

### KickAuthClient

```javascript
const authClient = new KickAuthClient({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  baseUrl: 'https://id.kick.com',  // volitelne
});
```

### PKCE flow implementace

```javascript
import crypto from 'node:crypto';
import { createPkcePair, createAuthorizationUrl, KickAuthClient } from 'kapi-kit';

// 1. Generovani PKCE paru
const { verifier, challenge } = createPkcePair();

// 2. Vytvoreni authorization URL
const state = crypto.randomUUID();
const authUrl = createAuthorizationUrl({
  clientId: process.env.KICK_CLIENT_ID,
  redirectUri: 'http://localhost:3000/callback',
  scopes: ['user:read', 'channel:read', 'chat:write', 'events:subscribe'],
  state,
  codeChallenge: challenge,
});

// 3. Po redirectu - vymena kodu za tokeny
const authClient = new KickAuthClient({
  clientId: process.env.KICK_CLIENT_ID,
  clientSecret: process.env.KICK_CLIENT_SECRET,
});

const tokens = await authClient.exchangeCodeForToken({
  code: authorizationCode,
  redirectUri: 'http://localhost:3000/callback',
  codeVerifier: verifier,
});

// tokens obsahuje: access_token, refresh_token, expires_in, scope
```

### Client Credentials flow

```javascript
const tokens = await authClient.getAppAccessToken({
  scopes: ['chat:write', 'channel:read'],
});
```

### Token refresh

```javascript
const newTokens = await authClient.refreshAccessToken({
  refreshToken: currentRefreshToken,
});

// DULEZITE: refresh_token je rolling - kazdy refresh vraci novy!
// Vzdy ulozit novy refresh_token pro dalsi pouziti
```

### Token revocation

```javascript
await authClient.revokeToken({
  token: accessToken,
  tokenTypeHint: 'access_token',  // nebo 'refresh_token'
});
```

### Dostupne scopes

| Scope | Popis |
|-------|-------|
| `user:read` | Cteni uzivatelskych dat |
| `channel:read` | Cteni kanalu |
| `channel:write` | Uprava metadat kanalu |
| `chat:write` | Odesilani zprav |
| `events:subscribe` | Webhook subscriptions |
| `streamkey:read` | Cteni stream key |
| `moderation:write` | Ban/unban operace |

---

## 6. Chat funkcionalita

### Typy zprav

| Typ | Popis | Pozadavky |
|-----|-------|-----------|
| `bot` | Bot zprava | Automaticky smerovana na kanal asociovany s tokenem |
| `user` | Broadcaster zprava | Vyzaduje `broadcasterUserId` |

### Odeslani zpravy

```javascript
// Bot zprava
await client.sendChatMessage({
  type: 'bot',
  content: 'Zprava od bota',
});

// Broadcaster zprava
await client.sendChatMessage({
  type: 'user',
  content: 'Zprava od broadcastera',
  broadcasterUserId: 123456,
});

// Reply na jinou zpravu
await client.sendChatMessage({
  type: 'bot',
  content: 'Odpoved na zpravu',
  replyToMessageId: 'message-uuid',
});
```

### Omezeni

- Maximalni delka zpravy: 500 znaku
- Rate limiting: HTTP 429 s retry_after hodnotou
- CORS: API nelze volat primo z browseru (nutny backend proxy)

---

## 7. Webhook system

### Kriticke omezeni

**KICK API neposkytuje nativni WebSocket endpoint.** Pro real-time prijem zprav je nutne pouzit webhook server.

### Vytvoreni subscription

```javascript
const created = await client.createEventSubscriptions({
  method: 'webhook',
  broadcasterUserId: 123456,
  events: [
    { name: 'chat.message.sent', version: 1 },
    { name: 'livestream.status.updated', version: 1 },
  ],
});
```

### Dostupne event typy

| Event | Popis |
|-------|-------|
| `chat.message.sent` | Nova chat zprava |
| `channel.followed` | Novy follower |
| `channel.subscription.new` | Nova subscription |
| `channel.subscription.renewal` | Obnoveni sub |
| `channel.subscription.gifts` | Gifted subs |
| `livestream.status.updated` | Stream live/ended |
| `livestream.metadata.updated` | Zmena title/category |
| `moderation.banned` | Ban/timeout |
| `kicks.gifted` | Darovane kicks |

### Webhook headers

```
Kick-Event-Message-Id: <unique-message-id>
Kick-Event-Message-Timestamp: <timestamp>
Kick-Event-Signature: <base64-signature>
Kick-Event-Type: chat.message.sent
Kick-Event-Version: 1
Kick-Event-Subscription-Id: <subscription-id>
```

### Signature verification

```javascript
import crypto from 'node:crypto';

function verifyWebhook(headers, rawBody, publicKeyPem) {
  const messageId = headers['kick-event-message-id'];
  const timestamp = headers['kick-event-message-timestamp'];
  const signature = headers['kick-event-signature'];

  if (!messageId || !timestamp || !signature) return false;

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${messageId}.${timestamp}.${rawBody}`);
  verifier.end();

  try {
    return verifier.verify(publicKeyPem, Buffer.from(signature, 'base64'));
  } catch (error) {
    return false;
  }
}
```

### Ziskani public key

```javascript
const response = await client.getPublicKey();
const publicKeyPem = response.public_key;
```

### Webhook retry policy

- KICK se pokusi dorucit webhook **max 3x**
- Pri selhani (ne-200 response) **automaticky unsubscribuje** event
- Endpoint **musi** vratit HTTP 200 OK

---

## 8. Error handling

### KickApiError

```javascript
import { KickApiError } from 'kapi-kit';

try {
  await client.sendChatMessage({ type: 'bot', content: 'Test' });
} catch (error) {
  if (error instanceof KickApiError) {
    console.error({
      message: error.message,
      status: error.status,        // HTTP status code
      statusText: error.statusText,
      body: error.body,            // Response body
      requestId: error.requestId,  // Kick-Request-Id header
    });
  }
}
```

### Retry wrapper s exponential backoff

```javascript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof KickApiError && error.status === 429) {
        const delay = error.body?.retry_after || Math.pow(2, i);
        await new Promise(r => setTimeout(r, delay * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### HTTP status kody

| Status | Vyznam | Akce |
|--------|--------|------|
| 401 | Neplatny/expirovan token | Refresh nebo re-auth |
| 403 | Chybejici scope | Zkontrolovat scopes |
| 429 | Rate limit | Pouzit retry_after delay |
| 500+ | Server error | Retry s backoff |

---

## 9. Multistream architektura

### Popis

`examples/multi-stream-bot.js` obsahuje kompletni implementaci multi-tenant bot systemu.

### Workflow

1. **Uzivatel klikne "Add Bot"** na webu -> KICK redirect s `code` + `code_verifier`
2. Frontend POST na `/kick/streamers/add` s `{ code, code_verifier }` a `Kick-App-Secret` header
3. Server vymeni kod za tokeny, ulozi refresh token, subscribuje `chat.message.sent`, scheduluje refresh a keep-alive
4. KICK dorucuje eventy na `/kick/webhook`, bot validuje signature a reaguje na commandy

### State management

```javascript
const state = {
  streamers: new Map(),      // broadcasterUserId -> streamer object
  subscriptions: new Map(),  // subscriptionId -> streamer object
};
```

### Streamer object

```javascript
{
  broadcasterUserId: 123456,
  slug: 'channel-slug',
  refreshToken: 'token',
  accessToken: 'token',
  subscriptionId: 'uuid',
  expiresIn: 3600,
  client: KickApiClient,
  refreshTimer: setTimeout,
  keepAliveTimer: setInterval,
}
```

### Persistentni uloziste

```javascript
// multi-streamers.json
{
  "streamers": [
    {
      "broadcasterUserId": 123456,
      "slug": "channel-slug",
      "refreshToken": "token",
      "subscriptionId": "uuid"
    }
  ]
}
```

### Token rotation

```javascript
function scheduleStreamerRefresh(streamer) {
  const refreshInMs = Math.max((streamer.expiresIn - 120) * 1000, 30_000);
  return setTimeout(async () => {
    const response = await authClient.refreshAccessToken({
      refreshToken: streamer.refreshToken,
    });
    streamer.accessToken = response.access_token;
    streamer.refreshToken = response.refresh_token ?? streamer.refreshToken;
    streamer.client = new KickApiClient({ accessToken: streamer.accessToken });
    streamer.refreshTimer = scheduleStreamerRefresh(streamer);
    await persistState();
  }, refreshInMs);
}
```

### Keep-alive messages

```javascript
function scheduleKeepAlive(streamer) {
  streamer.keepAliveTimer = setInterval(async () => {
    await streamer.client.sendChatMessage({
      type: 'user',
      content: 'Keep-alive user message',
      broadcasterUserId: streamer.broadcasterUserId,
    });
    await streamer.client.sendChatMessage({
      type: 'bot',
      content: 'Keep-alive bot message',
    });
  }, 5 * 60 * 1000);  // 5 minut
}
```

---

## 10. Endpoint coverage

Kompletni mapovani KICK API endpointu na SDK metody:

| KICK Endpoint | SDK Metoda | Priklad |
|---------------|------------|---------|
| `POST /oauth/token` | `getAppAccessToken`, `exchangeCodeForToken`, `refreshAccessToken` | oauth-*.js |
| `POST /oauth/revoke` | `revokeToken` | oauth-revoke.js |
| `POST /oauth/authorize` | `createAuthorizationUrl`, `createPkcePair` | token-rotation.js |
| `POST /chat` | `sendChatMessage`, `sendMessage` | chat-send.js |
| `GET /categories` | `searchCategories` | categories.js |
| `GET /categories/:id` | `getCategoryById` | categories.js |
| `GET /channels` | `getChannels` | channels-get.js |
| `PATCH /channels` | `updateChannelMetadata` | channels-update.js |
| `GET /events/subscriptions` | `listEventSubscriptions` | events.js |
| `POST /events/subscriptions` | `createEventSubscriptions` | events.js |
| `DELETE /events/subscriptions` | `deleteEventSubscriptions` | events.js |
| `GET /livestreams` | `getLivestreams` | livestreams-list.js |
| `GET /livestreams/stats` | `getLivestreamStats` | livestreams-stats.js |
| `GET /kicks/leaderboard` | `getKicksLeaderboard` | kicks-leaderboard.js |
| `POST /moderation/bans` | `banUser` | moderation.js |
| `DELETE /moderation/bans` | `unbanUser` | moderation.js |
| `GET /public-key` | `getPublicKey` | public-key.js |
| `POST /token/introspect` | `introspectToken` | token-introspect.js |
| `GET /users` | `getUsers` | users.js |

---

## 11. Integracni doporuceni pro AdHub

### Architektura

Pro AdHub multistream chat doporucuji nasledujici architekturu:

```
AdHub Frontend (Browser)
        |
        v
AdHub Backend (Node.js 22+)
    |       |       |       |
    v       v       v       v
  KICK   Twitch  YouTube  TikTok
Adapter  Adapter  Adapter  Adapter
```

### KICK Adapter pro AdHub

```javascript
import { KickApiClient, KickAuthClient, KickApiError } from 'kapi-kit';
import { EventEmitter } from 'events';

export class KickAdapter extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.client = null;
    this.authClient = new KickAuthClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });
  }

  async connect(tokens) {
    this.client = new KickApiClient({
      accessToken: tokens.access_token,
    });

    await this.client.createEventSubscriptions({
      method: 'webhook',
      broadcasterUserId: this.config.broadcasterId,
      events: [{ name: 'chat.message.sent', version: 1 }],
    });

    this.emit('connected');
  }

  handleWebhook(payload) {
    if (payload.event === 'chat.message.sent') {
      this.emit('message', this.normalize(payload.data));
    }
  }

  normalize(data) {
    return {
      platform: 'kick',
      id: data.message_id,
      content: data.content,
      author: {
        id: String(data.sender.user_id),
        username: data.sender.username,
        displayName: data.sender.username,
        badges: data.sender.identity?.badges || [],
        color: data.sender.identity?.username_color || '#FFFFFF',
      },
      emotes: data.emotes?.map(e => ({
        id: e.emote_id,
        positions: e.positions.map(p => ({
          start: p.s,
          end: p.e,
        })),
      })) || [],
      timestamp: new Date(data.created_at),
      raw: data,
    };
  }

  async send(content, options = {}) {
    return this.client.sendChatMessage({
      type: options.type || 'bot',
      content: content.slice(0, 500),
      broadcasterUserId: this.config.broadcasterId,
      replyToMessageId: options.replyTo,
    });
  }

  async disconnect() {
    // Cleanup subscriptions
    const subs = await this.client.listEventSubscriptions({
      broadcasterUserId: this.config.broadcasterId,
    });
    if (Array.isArray(subs) && subs.length > 0) {
      await this.client.deleteEventSubscriptions({
        ids: subs.map(s => s.id),
      });
    }
    this.emit('disconnected');
  }
}
```

### Normalized message format

```typescript
interface NormalizedMessage {
  platform: 'kick' | 'twitch' | 'youtube' | 'tiktok';
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    badges: Array<{ type: string; text: string }>;
    color: string;
  };
  emotes: Array<{
    id: string;
    positions: Array<{ start: number; end: number }>;
  }>;
  timestamp: Date;
  raw: unknown;
}
```

### Environment variables

```bash
# .env
KICK_CLIENT_ID=your-client-id
KICK_CLIENT_SECRET=your-client-secret
KICK_REDIRECT_URI=https://adhub.app/auth/kick/callback
KICK_WEBHOOK_URL=https://adhub.app/webhooks/kick
KICK_APP_SECRET=secure-webhook-secret
KICK_SCOPES=chat:write channel:read events:subscribe
```

---

## 12. Omezeni a workaroundy

### 1. Zadny nativni WebSocket

**Problem:** KICK neposkytuje oficialni WebSocket pro real-time chat.

**Reseni:**
- Webhook server s verejnou HTTPS URL
- Pro lokalni vyvoj: ngrok, Cloudflare Tunnel, nebo localtunnel
- Pro produkci: verejne dostupny server

### 2. Rolling refresh tokens

**Problem:** Kazdy refresh vraci novy refresh_token. Stary prestava platit.

**Reseni:**
- Vzdy ukladat novy refresh_token ihned po refreshi
- Implementovat atomicke ulozeni (transakce)
- Retry logika pri soubehu

### 3. Webhook retry a unsubscribe

**Problem:** KICK se pokusi dorucit webhook 3x, pak automaticky unsubscribuje.

**Reseni:**
- Endpoint musi vzdy vratit 200 OK (i pri internim erroru)
- Implementovat health check a monitoring
- Automaticky re-subscribe pri detekci ztracene subscription

### 4. Node.js 22+ pozadavek

**Problem:** Knihovna vyzaduje Node.js 22+ pro nativni fetch.

**Reseni:**
- Aktualizovat runtime na Node.js 22 LTS
- Alternativne: pouzit polyfill (node-fetch), ale neni testovano

### 5. CORS restrikce

**Problem:** API nelze volat primo z browseru.

**Reseni:**
- Vsechny API volani smerovat pres backend
- Frontend komunikuje pouze s vlastnim backendem

### 6. Cloudflare 403 bloky

**Problem:** Intermitentni 403 Forbidden chyby.

**Reseni:**
- Retry s exponential backoff
- Realisticke User-Agent headers
- Monitoring a alerting

---

## Zdroje

| Zdroj | URL |
|-------|-----|
| kapi-kit repozitar | https://github.com/Wydoyolo/kapi-kit |
| KICK Dev Docs | https://github.com/KickEngineering/KickDevDocs |
| KICK Developer Portal | https://kick.com/apps |
| KICK API Dokumentace | https://docs.kick.com |

---

*Dokument vytvoren pro AdHub multistream chat projekt*  
*Verze: 1.0*  
*Datum: 2025-12-04*
