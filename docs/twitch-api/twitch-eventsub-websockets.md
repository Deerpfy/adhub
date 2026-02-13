# Twitch EventSub — WebSocket Transport

> **Source:** [Twitch EventSub WebSocket Reference](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/)
> **Last verified:** 2025-05
> **Protocol:** RFC 6455 (WebSocket)

---

## Table of Contents

1. [Overview](#overview)
2. [Connection Setup](#connection-setup)
3. [Message Type Reference](#message-type-reference)
4. [Session Management](#session-management)
5. [Keepalive Timeout Handling](#keepalive-timeout-handling)
6. [Reconnect Flow](#reconnect-flow)
7. [Subscription Limits & Cost Calculation](#subscription-limits--cost-calculation)
8. [Close Codes Reference](#close-codes-reference)
9. [Why App Access Tokens Don't Work](#why-app-access-tokens-dont-work)
10. [TypeScript Example — Full Lifecycle](#typescript-example--full-lifecycle)
11. [Python Example — Full Lifecycle](#python-example--full-lifecycle)
12. [Twitch CLI WebSocket Testing](#twitch-cli-websocket-testing)
13. [Best Practices & Production Hardening](#best-practices--production-hardening)
14. [Known Issues & Community Notes](#known-issues--community-notes)
15. [Quick Reference Table](#quick-reference-table)

---

## Overview

EventSub WebSocket transport provides a persistent, real-time push channel from Twitch to your client application. Unlike the webhook transport (which requires a publicly reachable HTTPS endpoint), the WebSocket transport is designed for browser apps, desktop apps, bots, and any scenario where you cannot expose a public callback URL.

**Key characteristics:**

- **Direction:** Server-to-client only. The client MUST NOT send any application-level messages to the server. Doing so results in an immediate disconnect (close code 4001).
- **Authentication:** Requires a **User Access Token**. App Access Tokens are not supported and will fail at subscription creation time.
- **Delivery guarantee:** At-least-once. You may receive duplicate notifications and must deduplicate by `message_id`.
- **Lifecycle:** Connect → receive welcome → create subscriptions via REST API → receive notifications → handle reconnects → close gracefully.

**When to use WebSocket vs. Webhook:**

| Criteria | WebSocket | Webhook |
|---|---|---|
| Public server required | No | Yes |
| Token type | User Access Token | App Access Token or User Access Token |
| Max subscriptions | 300 per connection, 3 connections per token | 10,000 total |
| Use case | Client apps, bots, overlays | Backend services, high-volume |
| Latency | Sub-second | ~seconds (HTTP callback) |

---

## Connection Setup

### Endpoint URL

```
wss://eventsub.wss.twitch.tv/ws
```

### Optional Query Parameters

| Parameter | Type | Default | Range | Description |
|---|---|---|---|---|
| `keepalive_timeout_seconds` | integer | ~10-15 (server-chosen) | 10–600 | How often the server sends keepalive messages when no notifications are pending. |

**Example with custom keepalive:**

```
wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30
```

### Connection Rules

1. Open a standard WebSocket connection to the URL above.
2. **Do NOT send any messages** from the client to the server. The server will disconnect you with close code 4001 if you do.
3. Wait for the `session_welcome` message (arrives within a few seconds).
4. Extract `payload.session.id` from the welcome message.
5. Use that session ID to create subscriptions via the [Create EventSub Subscription](https://dev.twitch.tv/docs/api/reference/#create-eventsub-subscription) REST API endpoint within **10 seconds**. If you do not subscribe within 10 seconds, the server closes the connection with code 4003.
6. Once subscribed, you will begin receiving `notification` messages, interspersed with `session_keepalive` messages during quiet periods.

### Authentication Note

The WebSocket connection itself does not require an Authorization header. Authentication happens when you call the REST API to create subscriptions — that call requires a valid User Access Token in the `Authorization` header.

---

## Message Type Reference

Every message delivered over the WebSocket is a JSON text frame with a consistent top-level structure:

```json
{
  "metadata": {
    "message_id": "<unique-uuid>",
    "message_type": "<type>",
    "message_timestamp": "<RFC3339-timestamp>"
  },
  "payload": { }
}
```

Notification messages include two additional fields in `metadata`:

```json
{
  "metadata": {
    "message_id": "<unique-uuid>",
    "message_type": "notification",
    "message_timestamp": "<RFC3339-timestamp>",
    "subscription_type": "<e.g. channel.follow>",
    "subscription_version": "<e.g. 2>"
  },
  "payload": { }
}
```

### 1. Welcome — `session_welcome`

Sent exactly once immediately after the WebSocket connection is established.

```json
{
  "metadata": {
    "message_id": "96a3f3b5-5dec-4eed-908e-e11ee657416c",
    "message_type": "session_welcome",
    "message_timestamp": "2022-11-16T10:11:12.634234626Z"
  },
  "payload": {
    "session": {
      "id": "AQoQexAWVYKSTIu4ec_2VAxyuhAB",
      "status": "connected",
      "keepalive_timeout_seconds": 10,
      "reconnect_url": null,
      "connected_at": "2022-11-16T10:11:12.634234626Z"
    }
  }
}
```

**Fields in `payload.session`:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Session ID. Use this when creating subscriptions. |
| `status` | string | Always `"connected"` in a welcome message. |
| `keepalive_timeout_seconds` | integer | The actual keepalive interval the server will use. |
| `reconnect_url` | string \| null | Always `null` in a welcome message. |
| `connected_at` | string | RFC 3339 timestamp of when the connection was established. |

### 2. Keepalive — `session_keepalive`

Sent periodically when no notifications have been sent within the keepalive interval. Keeps the connection alive and lets the client confirm the connection is still healthy.

```json
{
  "metadata": {
    "message_id": "84c1e79a-2a4b-4c13-ba0b-4312293e9308",
    "message_type": "session_keepalive",
    "message_timestamp": "2022-11-16T10:11:22.634234626Z"
  },
  "payload": {}
}
```

**Important:** The payload is an empty object `{}`. Any message from the server (including notifications) resets the keepalive timer. You only receive explicit keepalive messages during quiet periods.

### 3. Notification — `notification`

Delivers an event to your client. The structure mirrors webhook notification payloads.

```json
{
  "metadata": {
    "message_id": "befa7b53-d79d-478f-86b9-120f112b044e",
    "message_type": "notification",
    "message_timestamp": "2022-11-16T10:11:12.464757833Z",
    "subscription_type": "channel.follow",
    "subscription_version": "2"
  },
  "payload": {
    "subscription": {
      "id": "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
      "status": "enabled",
      "type": "channel.follow",
      "version": "2",
      "cost": 0,
      "condition": {
        "broadcaster_user_id": "12826",
        "moderator_user_id": "12826"
      },
      "transport": {
        "method": "websocket",
        "session_id": "AQoQexAWVYKSTIu4ec_2VAxyuhAB"
      },
      "created_at": "2022-11-16T10:11:12.464757833Z"
    },
    "event": {
      "user_id": "1234",
      "user_login": "cool_user",
      "user_name": "Cool_User",
      "broadcaster_user_id": "12826",
      "broadcaster_user_login": "twitch",
      "broadcaster_user_name": "Twitch",
      "followed_at": "2022-11-16T10:11:12.464757833Z"
    }
  }
}
```

**Fields in `payload`:**

| Field | Type | Description |
|---|---|---|
| `subscription` | object | Full subscription details (same as creation response). |
| `event` | object | Event-specific data. Schema varies by subscription type. |

### 4. Reconnect — `session_reconnect`

Twitch periodically rotates WebSocket connections. When this happens, the server sends a reconnect message telling the client to move to a new URL.

```json
{
  "metadata": {
    "message_id": "84c1e79a-2a4b-4c13-ba0b-4312293e9308",
    "message_type": "session_reconnect",
    "message_timestamp": "2022-11-16T10:11:12.634234626Z"
  },
  "payload": {
    "session": {
      "id": "AQoQexAWVYKSTIu4ec_2VAxyuhAB",
      "status": "reconnecting",
      "keepalive_timeout_seconds": null,
      "reconnect_url": "wss://eventsub.wss.twitch.tv/ws?...",
      "connected_at": "2022-11-16T10:11:12.634234626Z"
    }
  }
}
```

**Key fields:**

| Field | Value | Description |
|---|---|---|
| `status` | `"reconnecting"` | Indicates the session is transitioning. |
| `keepalive_timeout_seconds` | `null` | Not applicable during reconnect. |
| `reconnect_url` | string | The new WebSocket URL to connect to. |

### 5. Revocation — `revocation`

Sent when a subscription is revoked by Twitch.

```json
{
  "metadata": {
    "message_id": "84c1e79a-2a4b-4c13-ba0b-4312293e9308",
    "message_type": "revocation",
    "message_timestamp": "2022-11-16T10:11:12.634234626Z",
    "subscription_type": "channel.follow",
    "subscription_version": "2"
  },
  "payload": {
    "subscription": {
      "id": "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
      "status": "authorization_revoked",
      "type": "channel.follow",
      "version": "2",
      "cost": 0,
      "condition": {
        "broadcaster_user_id": "12826",
        "moderator_user_id": "12826"
      },
      "transport": {
        "method": "websocket",
        "session_id": "AQoQexAWVYKSTIu4ec_2VAxyuhAB"
      },
      "created_at": "2022-11-16T10:11:12.464757833Z"
    }
  }
}
```

**Revocation reasons:**

| `status` value | Meaning |
|---|---|
| `authorization_revoked` | The user revoked the OAuth token's authorization. |
| `user_removed` | The user in the subscription condition was removed (e.g., account deleted). |
| `version_removed` | The subscription type version is no longer supported by Twitch. |

---

## Session Management

### Extracting the Session ID

When you receive the `session_welcome` message, extract `payload.session.id`. This is required for all subscription creation calls.

```javascript
// After receiving welcome message
const welcome = JSON.parse(event.data);
const sessionId = welcome.payload.session.id;
// e.g. "AQoQexAWVYKSTIu4ec_2VAxyuhAB"
```

### Creating a Subscription with the Session ID

Use the REST API to create subscriptions, specifying `websocket` as the transport method and including the session ID:

```
POST https://api.twitch.tv/helix/eventsub/subscriptions
Authorization: Bearer <user-access-token>
Client-Id: <your-client-id>
Content-Type: application/json

{
  "type": "channel.follow",
  "version": "2",
  "condition": {
    "broadcaster_user_id": "12826",
    "moderator_user_id": "12826"
  },
  "transport": {
    "method": "websocket",
    "session_id": "AQoQexAWVYKSTIu4ec_2VAxyuhAB"
  }
}
```

**Response (202 Accepted):**

```json
{
  "data": [
    {
      "id": "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
      "status": "enabled",
      "type": "channel.follow",
      "version": "2",
      "condition": {
        "broadcaster_user_id": "12826",
        "moderator_user_id": "12826"
      },
      "transport": {
        "method": "websocket",
        "session_id": "AQoQexAWVYKSTIu4ec_2VAxyuhAB",
        "connected_at": "2022-11-16T10:11:12.634234626Z"
      },
      "created_at": "2022-11-16T10:11:12.464757833Z",
      "cost": 0
    }
  ],
  "total": 1,
  "total_cost": 0,
  "max_total_cost": 10
}
```

### The 10-Second Window

After receiving `session_welcome`, you have **10 seconds** to create at least one subscription using that session ID. If you fail to subscribe within 10 seconds, the server disconnects you with close code **4003** ("Connection unused").

This is a common source of bugs — see [Known Issues](#known-issues--community-notes).

---

## Keepalive Timeout Handling

The keepalive mechanism lets you detect stale or lost connections.

### How It Works

1. The server sends a `session_keepalive` message approximately every `keepalive_timeout_seconds` when no other messages (like notifications) have been sent.
2. **Any** message from the server (keepalive, notification, reconnect, revocation) resets the keepalive timer on the client side.
3. If you do not receive **any** message from the server within `keepalive_timeout_seconds`, you should assume the connection is dead and reconnect.

### Recommended Implementation

```
keepalive_timeout = welcome.payload.session.keepalive_timeout_seconds
buffer = keepalive_timeout + small_grace_period  // e.g., +20% or +3 seconds

On every message received:
    Reset the keepalive watchdog timer to `buffer` seconds

If the watchdog fires:
    Close the current WebSocket
    Open a new connection to wss://eventsub.wss.twitch.tv/ws
    Re-subscribe to all events with the new session ID
```

### Important Distinction: Keepalive vs. Ping/Pong

| Mechanism | Level | Who sends | Resets keepalive timer? |
|---|---|---|---|
| Keepalive message | Application (JSON text frame) | Server | **Yes** |
| WebSocket Ping frame | Protocol (RFC 6455) | Server | **No** |
| WebSocket Pong frame | Protocol (RFC 6455) | Client (automatic) | **No** |

Ping/Pong frames are handled automatically by most WebSocket libraries. They do **not** reset the keepalive timer. Only application-level JSON messages reset it.

---

## Reconnect Flow

Twitch periodically rotates connections for load balancing and maintenance. The reconnect is designed to be seamless with no lost events.

### Step-by-Step

```
1. You are connected to WebSocket A, receiving events normally.

2. Server sends a `session_reconnect` message on WebSocket A.
   └── Contains `payload.session.reconnect_url`.

3. Open a NEW WebSocket connection (B) to the reconnect_url.
   └── You have 30 seconds from the reconnect message to do this.

4. WebSocket A continues delivering events during the transition.

5. WebSocket B sends a `session_welcome` message.
   └── The session ID may be the same or different.

6. Close WebSocket A.
   └── All existing subscriptions automatically transfer.
   └── You do NOT need to re-create subscriptions.

7. Continue receiving events on WebSocket B.
```

### Visual Timeline

```
Time ──────────────────────────────────────────────────────►

WS A:  ──[events]──[reconnect msg]──[events continue]──[close]
                         │
                         ▼
WS B:                   [connect]──[welcome]──[events continue]──►
                                       │
                                       └── Close WS A here
```

### Critical Rules

- **Do NOT re-subscribe.** Your subscriptions carry over automatically.
- **Do NOT close WS A before WS B sends its welcome.** You might miss events.
- **Close WS A promptly after WS B is confirmed.** If you leave both open too long, the server closes the old one with code 4004.
- **Use the reconnect_url exactly as provided.** It may contain query parameters or different hostnames.

---

## Subscription Limits & Cost Calculation

### Limits per WebSocket Connection

| Limit | Value |
|---|---|
| Maximum enabled subscriptions | 300 |
| Maximum `total_cost` | 10 |
| Maximum WebSocket connections per User Access Token | 3 |

### Cost Calculation

Most subscription types cost **0** when the token owner matches the broadcaster in the condition. Subscriptions that cost **1** are those where the token owner does not match the condition (e.g., subscribing to another channel's events with moderator permissions).

**Example:**

| Subscription | Condition | Token owner | Cost |
|---|---|---|---|
| `channel.follow` v2 | `broadcaster_user_id=123, moderator_user_id=123` | User 123 | 0 |
| `channel.subscribe` | `broadcaster_user_id=456` | User 123 (is mod of 456) | 1 |

**The cost system is designed to prevent abuse.** With `max_total_cost` of 10, you can have:
- Unlimited cost-0 subscriptions (up to the 300 hard cap)
- Up to 10 cost-1 subscriptions
- Or any combination where total_cost <= 10

**Disabled subscriptions** (e.g., revoked) do NOT count against limits.

### Checking Current Usage

The subscription creation response includes `total_cost` and `max_total_cost`:

```json
{
  "total": 3,
  "total_cost": 2,
  "max_total_cost": 10
}
```

You can also query existing subscriptions:

```
GET https://api.twitch.tv/helix/eventsub/subscriptions
Authorization: Bearer <user-access-token>
Client-Id: <your-client-id>
```

---

## Close Codes Reference

When Twitch closes the WebSocket connection, it sends a close frame with one of these codes:

| Code | Name | Meaning | Your Response |
|---|---|---|---|
| **4000** | Internal server error | Something went wrong on Twitch's side. | Reconnect with backoff. |
| **4001** | Client sent inbound traffic | You sent a message to the server. Don't do that. | Fix your code — never send messages to the EventSub WebSocket. |
| **4002** | Failed ping-pong | Client did not respond to a WebSocket Ping frame. | Check your WebSocket library handles Pong automatically. Most do. |
| **4003** | Connection unused | You did not subscribe to any events within 10 seconds of the welcome message. | Ensure your subscription logic runs immediately after receiving `session_welcome`. |
| **4004** | Reconnect grace time expired | You did not complete the reconnect flow within 30 seconds, or you failed to close the old connection. | Implement proper reconnect handling. |
| **4005** | Network timeout | The connection was idle for too long at the network level. | Reconnect. |
| **4006** | Network error | A network-level error occurred. | Reconnect with backoff. |
| **4007** | Invalid reconnect | You connected to a reconnect URL that is no longer valid. | Connect to the base URL `wss://eventsub.wss.twitch.tv/ws` and re-subscribe. |

### Standard WebSocket Close Codes You May Also See

| Code | Meaning |
|---|---|
| 1000 | Normal closure |
| 1001 | Going away (server shutting down) |
| 1006 | Abnormal closure (no close frame received — network drop) |

---

## Why App Access Tokens Don't Work

When creating a subscription with `"method": "websocket"`, the API requires a **User Access Token**. If you provide an App Access Token, the API returns an error:

```json
{
  "error": "Forbidden",
  "status": 403,
  "message": "client is not allowed to use the websocket transport"
}
```

**Reasons:**

1. **WebSocket connections are tied to a user context.** The server needs to know which user the connection belongs to for authorization decisions and cost calculations.
2. **App Access Tokens represent the application, not a user.** They are designed for server-to-server communication via the webhook transport.
3. **Security model.** WebSocket connections typically run in client-side applications where storing a Client Secret (required for App Access Tokens) would be insecure.

**If you need App Access Token + WebSocket-like functionality**, use **Conduits**. Conduits allow you to use App Access Tokens with WebSocket-connected shards. See the [Twitch Conduits documentation](https://dev.twitch.tv/docs/eventsub/handling-conduit-events/).

---

## TypeScript Example — Full Lifecycle

A complete, production-oriented implementation covering connection, welcome handling, keepalive monitoring, notification processing, reconnect handling, message deduplication, self-detection guard, and anti-loop protection.

```typescript
/**
 * Twitch EventSub WebSocket Client — Full Lifecycle
 *
 * Dependencies:
 *   npm install ws       (Node.js only; browsers use native WebSocket)
 *
 * Usage:
 *   const client = new TwitchEventSubClient({
 *     userAccessToken: 'your-token',
 *     clientId: 'your-client-id',
 *     userId: '12826',
 *     subscriptions: [
 *       {
 *         type: 'channel.follow',
 *         version: '2',
 *         condition: {
 *           broadcaster_user_id: '12826',
 *           moderator_user_id: '12826',
 *         },
 *       },
 *     ],
 *   });
 *   client.on('channel.follow', (event) => { ... });
 *   client.connect();
 */

import WebSocket from 'ws'; // Node.js — remove for browser

// ─── Types ───────────────────────────────────────────────

interface EventSubMetadata {
  message_id: string;
  message_type: string;
  message_timestamp: string;
  subscription_type?: string;
  subscription_version?: string;
}

interface EventSubMessage {
  metadata: EventSubMetadata;
  payload: Record<string, any>;
}

interface SubscriptionDefinition {
  type: string;
  version: string;
  condition: Record<string, string>;
}

interface ClientOptions {
  userAccessToken: string;
  clientId: string;
  userId: string;
  subscriptions: SubscriptionDefinition[];
  keepaliveTimeoutSeconds?: number; // Optional: 10-600
  maxReconnectAttempts?: number;
}

type EventHandler = (event: Record<string, any>, subscription: Record<string, any>) => void;

// ─── Client ──────────────────────────────────────────────

class TwitchEventSubClient {
  private readonly BASE_URL = 'wss://eventsub.wss.twitch.tv/ws';
  private readonly API_URL = 'https://api.twitch.tv/helix/eventsub/subscriptions';

  private options: ClientOptions;
  private ws: WebSocket | null = null;
  private reconnectWs: WebSocket | null = null;
  private sessionId: string | null = null;
  private keepaliveTimeoutSeconds: number = 10;
  private keepaliveTimer: ReturnType<typeof setTimeout> | null = null;

  // Deduplication: track recent message IDs
  private seenMessageIds: Set<string> = new Set();
  private messageIdCleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly MAX_SEEN_IDS = 10_000;

  // Anti-loop: prevent rapid reconnect storms
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number;
  private lastConnectTime: number = 0;
  private readonly MIN_CONNECT_INTERVAL_MS = 2_000;

  // Self-detection guard: prevent processing own actions
  private readonly ownUserId: string;

  // Event handlers
  private handlers: Map<string, EventHandler[]> = new Map();
  private globalHandlers: ((type: string, event: any, sub: any) => void)[] = [];

  // Track if we are in a reconnect flow
  private isReconnecting: boolean = false;

  constructor(options: ClientOptions) {
    this.options = options;
    this.ownUserId = options.userId;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
  }

  // ─── Public API ──────────────────────────────────────

  on(eventType: string, handler: EventHandler): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  onAny(handler: (type: string, event: any, sub: any) => void): void {
    this.globalHandlers.push(handler);
  }

  connect(): void {
    const now = Date.now();
    if (now - this.lastConnectTime < this.MIN_CONNECT_INTERVAL_MS) {
      console.warn('[EventSub] Connect called too rapidly, delaying...');
      setTimeout(() => this.connect(), this.MIN_CONNECT_INTERVAL_MS);
      return;
    }
    this.lastConnectTime = now;

    let url = this.BASE_URL;
    if (this.options.keepaliveTimeoutSeconds) {
      url += `?keepalive_timeout_seconds=${this.options.keepaliveTimeoutSeconds}`;
    }
    this.openWebSocket(url, false);
  }

  disconnect(): void {
    this.clearKeepaliveTimer();
    this.clearMessageIdCleanup();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    if (this.reconnectWs) {
      this.reconnectWs.close(1000, 'Client disconnect');
      this.reconnectWs = null;
    }
    this.sessionId = null;
    console.log('[EventSub] Disconnected.');
  }

  // ─── WebSocket Management ────────────────────────────

  private openWebSocket(url: string, isReconnect: boolean): void {
    const ws = new WebSocket(url);

    ws.on('open', () => {
      console.log(`[EventSub] WebSocket opened (reconnect=${isReconnect}).`);
    });

    ws.on('message', (raw: WebSocket.Data) => {
      const data: EventSubMessage = JSON.parse(raw.toString());
      this.handleMessage(data, ws, isReconnect);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      console.log(`[EventSub] WebSocket closed: ${code} — ${reason.toString()}`);
      this.handleClose(code, ws, isReconnect);
    });

    ws.on('error', (err: Error) => {
      console.error('[EventSub] WebSocket error:', err.message);
    });

    // ws library handles Pong automatically — no manual handling needed.

    if (isReconnect) {
      this.reconnectWs = ws;
    } else {
      this.ws = ws;
    }
  }

  // ─── Message Routing ─────────────────────────────────

  private handleMessage(msg: EventSubMessage, ws: WebSocket, isReconnect: boolean): void {
    // Reset keepalive timer on ANY message
    this.resetKeepaliveTimer();

    const type = msg.metadata.message_type;

    switch (type) {
      case 'session_welcome':
        this.handleWelcome(msg, ws, isReconnect);
        break;
      case 'session_keepalive':
        // Nothing to do — timer already reset above.
        break;
      case 'notification':
        this.handleNotification(msg);
        break;
      case 'session_reconnect':
        this.handleReconnect(msg);
        break;
      case 'revocation':
        this.handleRevocation(msg);
        break;
      default:
        console.warn(`[EventSub] Unknown message type: ${type}`);
    }
  }

  // ─── Welcome ─────────────────────────────────────────

  private async handleWelcome(
    msg: EventSubMessage,
    ws: WebSocket,
    isReconnect: boolean
  ): Promise<void> {
    const session = msg.payload.session;
    this.keepaliveTimeoutSeconds = session.keepalive_timeout_seconds;

    console.log(
      `[EventSub] Welcome received. Session: ${session.id}, ` +
      `Keepalive: ${this.keepaliveTimeoutSeconds}s`
    );

    if (isReconnect) {
      // Reconnect flow: swap connections, do NOT re-subscribe
      console.log('[EventSub] Reconnect successful. Closing old connection.');
      if (this.ws) {
        this.ws.close(1000, 'Reconnect complete');
      }
      this.ws = ws;
      this.reconnectWs = null;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      this.sessionId = session.id;
    } else {
      // Fresh connection: subscribe to events
      this.sessionId = session.id;
      this.reconnectAttempts = 0;
      this.startMessageIdCleanup();
      await this.createSubscriptions();
    }

    this.resetKeepaliveTimer();
  }

  // ─── Subscriptions ───────────────────────────────────

  private async createSubscriptions(): Promise<void> {
    for (const sub of this.options.subscriptions) {
      try {
        const response = await fetch(this.API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.options.userAccessToken}`,
            'Client-Id': this.options.clientId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: sub.type,
            version: sub.version,
            condition: sub.condition,
            transport: {
              method: 'websocket',
              session_id: this.sessionId,
            },
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          console.error(
            `[EventSub] Failed to subscribe to ${sub.type}: ` +
            `${response.status} — ${body}`
          );
          continue;
        }

        const result = await response.json();
        console.log(
          `[EventSub] Subscribed to ${sub.type}. ` +
          `Cost: ${result.total_cost}/${result.max_total_cost}`
        );
      } catch (err) {
        console.error(`[EventSub] Subscription error for ${sub.type}:`, err);
      }
    }
  }

  // ─── Notification ────────────────────────────────────

  private handleNotification(msg: EventSubMessage): void {
    const messageId = msg.metadata.message_id;

    // Deduplication
    if (this.seenMessageIds.has(messageId)) {
      console.log(`[EventSub] Duplicate notification ignored: ${messageId}`);
      return;
    }
    this.seenMessageIds.add(messageId);

    const subscriptionType = msg.metadata.subscription_type!;
    const event = msg.payload.event;
    const subscription = msg.payload.subscription;

    // Self-detection guard: skip events triggered by the bot/user itself
    if (event?.user_id === this.ownUserId) {
      console.log(
        `[EventSub] Ignoring self-triggered event: ${subscriptionType}`
      );
      return;
    }

    // Dispatch to specific handlers
    const handlers = this.handlers.get(subscriptionType) ?? [];
    for (const handler of handlers) {
      try {
        handler(event, subscription);
      } catch (err) {
        console.error(
          `[EventSub] Handler error for ${subscriptionType}:`, err
        );
      }
    }

    // Dispatch to global handlers
    for (const handler of this.globalHandlers) {
      try {
        handler(subscriptionType, event, subscription);
      } catch (err) {
        console.error('[EventSub] Global handler error:', err);
      }
    }
  }

  // ─── Reconnect ───────────────────────────────────────

  private handleReconnect(msg: EventSubMessage): void {
    const reconnectUrl = msg.payload.session.reconnect_url;
    console.log(`[EventSub] Reconnect requested. URL: ${reconnectUrl}`);

    if (this.isReconnecting) {
      console.warn('[EventSub] Already reconnecting, ignoring duplicate.');
      return;
    }

    this.isReconnecting = true;
    this.openWebSocket(reconnectUrl, true);
  }

  // ─── Revocation ──────────────────────────────────────

  private handleRevocation(msg: EventSubMessage): void {
    const sub = msg.payload.subscription;
    console.warn(
      `[EventSub] Subscription revoked: ${sub.type} — ` +
      `Reason: ${sub.status}`
    );
    // Optionally: attempt to re-subscribe, notify the user, etc.
  }

  // ─── Close Handling ──────────────────────────────────

  private handleClose(code: number, ws: WebSocket, isReconnect: boolean): void {
    // If the reconnect WebSocket closed, not the primary one, log and bail
    if (isReconnect && ws === this.reconnectWs) {
      console.error('[EventSub] Reconnect WebSocket closed unexpectedly.');
      this.reconnectWs = null;
      this.isReconnecting = false;
      // Fall through to reconnect logic below
    }

    // If this wasn't our primary WebSocket, ignore
    if (!isReconnect && ws !== this.ws) return;

    this.clearKeepaliveTimer();

    // Do not auto-reconnect for client errors
    const noReconnectCodes = [4001]; // Client sent inbound traffic — code bug
    if (noReconnectCodes.includes(code)) {
      console.error(
        `[EventSub] Close code ${code} indicates a client bug. Not reconnecting.`
      );
      return;
    }

    // Anti-loop: exponential backoff
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[EventSub] Max reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`
      );
      return;
    }

    this.reconnectAttempts++;
    const backoffMs = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      30_000
    );
    const jitter = Math.random() * 1000;

    console.log(
      `[EventSub] Reconnecting in ${backoffMs + jitter}ms ` +
      `(attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    setTimeout(() => this.connect(), backoffMs + jitter);
  }

  // ─── Keepalive Timer ─────────────────────────────────

  private resetKeepaliveTimer(): void {
    this.clearKeepaliveTimer();
    // Add a grace buffer (20%) on top of the advertised timeout
    const timeoutMs = (this.keepaliveTimeoutSeconds * 1.2 + 1) * 1000;
    this.keepaliveTimer = setTimeout(() => {
      console.warn('[EventSub] Keepalive timeout — connection assumed dead.');
      if (this.ws) {
        this.ws.close(4000, 'Keepalive timeout');
      }
    }, timeoutMs);
  }

  private clearKeepaliveTimer(): void {
    if (this.keepaliveTimer) {
      clearTimeout(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  // ─── Deduplication Cleanup ───────────────────────────

  private startMessageIdCleanup(): void {
    this.clearMessageIdCleanup();
    // Prune the dedup set every 5 minutes
    this.messageIdCleanupInterval = setInterval(() => {
      if (this.seenMessageIds.size > this.MAX_SEEN_IDS) {
        console.log('[EventSub] Pruning dedup set.');
        this.seenMessageIds.clear();
      }
    }, 5 * 60 * 1000);
  }

  private clearMessageIdCleanup(): void {
    if (this.messageIdCleanupInterval) {
      clearInterval(this.messageIdCleanupInterval);
      this.messageIdCleanupInterval = null;
    }
  }
}

// ─── Usage Example ───────────────────────────────────────

async function main() {
  const client = new TwitchEventSubClient({
    userAccessToken: process.env.TWITCH_ACCESS_TOKEN!,
    clientId: process.env.TWITCH_CLIENT_ID!,
    userId: '12826',
    subscriptions: [
      {
        type: 'channel.follow',
        version: '2',
        condition: {
          broadcaster_user_id: '12826',
          moderator_user_id: '12826',
        },
      },
      {
        type: 'channel.chat.message',
        version: '1',
        condition: {
          broadcaster_user_id: '12826',
          user_id: '12826',
        },
      },
      {
        type: 'channel.subscribe',
        version: '1',
        condition: {
          broadcaster_user_id: '12826',
        },
      },
    ],
    keepaliveTimeoutSeconds: 30,
  });

  // Register event handlers
  client.on('channel.follow', (event) => {
    console.log(`New follower: ${event.user_name}`);
  });

  client.on('channel.chat.message', (event) => {
    console.log(`[${event.chatter_user_name}]: ${event.message.text}`);
  });

  client.on('channel.subscribe', (event) => {
    console.log(`New subscriber: ${event.user_name} (Tier ${event.tier})`);
  });

  // Global handler for logging
  client.onAny((type, event) => {
    console.log(`[ALL] ${type}:`, JSON.stringify(event).slice(0, 200));
  });

  client.connect();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    client.disconnect();
    process.exit(0);
  });
}

main();
```

---

## Python Example — Full Lifecycle

A complete implementation using `websockets` (asyncio-based).

```python
"""
Twitch EventSub WebSocket Client — Full Lifecycle (Python)

Dependencies:
    pip install websockets aiohttp

Usage:
    export TWITCH_ACCESS_TOKEN="your-token"
    export TWITCH_CLIENT_ID="your-client-id"
    python eventsub_ws.py
"""

import asyncio
import json
import os
import time
import logging
from typing import Optional, Callable, Any

import websockets
import aiohttp

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("eventsub")


class TwitchEventSubClient:
    BASE_URL = "wss://eventsub.wss.twitch.tv/ws"
    API_URL = "https://api.twitch.tv/helix/eventsub/subscriptions"

    def __init__(
        self,
        user_access_token: str,
        client_id: str,
        user_id: str,
        subscriptions: list[dict],
        keepalive_timeout_seconds: Optional[int] = None,
        max_reconnect_attempts: int = 10,
    ):
        self.user_access_token = user_access_token
        self.client_id = client_id
        self.user_id = user_id
        self.subscriptions = subscriptions
        self.keepalive_timeout_seconds_config = keepalive_timeout_seconds
        self.max_reconnect_attempts = max_reconnect_attempts

        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.session_id: Optional[str] = None
        self.keepalive_timeout: int = 10
        self.keepalive_task: Optional[asyncio.Task] = None

        # Deduplication
        self.seen_message_ids: set[str] = set()
        self.MAX_SEEN_IDS = 10_000

        # Anti-loop
        self.reconnect_attempts = 0
        self.last_connect_time: float = 0
        self.MIN_CONNECT_INTERVAL = 2.0

        # Reconnect state
        self._is_reconnecting = False
        self._stop_event = asyncio.Event()

        # Event handlers: type -> list of callables
        self._handlers: dict[str, list[Callable]] = {}
        self._global_handlers: list[Callable] = []

    # ─── Public API ──────────────────────────────────

    def on(self, event_type: str, handler: Callable) -> None:
        """Register a handler for a specific event type."""
        self._handlers.setdefault(event_type, []).append(handler)

    def on_any(self, handler: Callable) -> None:
        """Register a handler that receives all events."""
        self._global_handlers.append(handler)

    async def connect(self) -> None:
        """Start the WebSocket client. Blocks until disconnect() is called."""
        self._stop_event.clear()
        await self._connect_loop()

    async def disconnect(self) -> None:
        """Gracefully disconnect."""
        self._stop_event.set()
        if self.keepalive_task and not self.keepalive_task.done():
            self.keepalive_task.cancel()
        if self.ws:
            await self.ws.close(1000, "Client disconnect")
            self.ws = None
        self.session_id = None
        log.info("Disconnected.")

    # ─── Connection Loop ─────────────────────────────

    async def _connect_loop(self) -> None:
        url = self.BASE_URL
        if self.keepalive_timeout_seconds_config:
            url += f"?keepalive_timeout_seconds={self.keepalive_timeout_seconds_config}"

        while not self._stop_event.is_set():
            # Anti-loop: rate limit connection attempts
            now = time.monotonic()
            elapsed = now - self.last_connect_time
            if elapsed < self.MIN_CONNECT_INTERVAL:
                await asyncio.sleep(self.MIN_CONNECT_INTERVAL - elapsed)
            self.last_connect_time = time.monotonic()

            try:
                log.info(f"Connecting to {url}")
                async with websockets.connect(url) as ws:
                    self.ws = ws
                    await self._message_loop(ws, is_reconnect=False)
            except websockets.ConnectionClosedError as e:
                log.warning(f"Connection closed: {e.code} — {e.reason}")
                if e.code == 4001:
                    log.error("Client sent inbound traffic. Fix your code.")
                    return
                await self._backoff_wait()
            except Exception as e:
                log.error(f"Connection error: {e}")
                await self._backoff_wait()

    async def _backoff_wait(self) -> None:
        if self.reconnect_attempts >= self.max_reconnect_attempts:
            log.error(
                f"Max reconnect attempts ({self.max_reconnect_attempts}) reached."
            )
            self._stop_event.set()
            return

        self.reconnect_attempts += 1
        backoff = min(2 ** (self.reconnect_attempts - 1), 30)
        jitter = asyncio.get_event_loop().time() % 1  # 0-1s jitter
        delay = backoff + jitter
        log.info(
            f"Reconnecting in {delay:.1f}s "
            f"(attempt {self.reconnect_attempts}/{self.max_reconnect_attempts})"
        )
        await asyncio.sleep(delay)

    # ─── Message Loop ────────────────────────────────

    async def _message_loop(
        self,
        ws: websockets.WebSocketClientProtocol,
        is_reconnect: bool,
    ) -> None:
        async for raw in ws:
            if self._stop_event.is_set():
                return

            msg = json.loads(raw)
            self._reset_keepalive_timer()

            msg_type = msg["metadata"]["message_type"]

            if msg_type == "session_welcome":
                await self._handle_welcome(msg, ws, is_reconnect)
            elif msg_type == "session_keepalive":
                pass  # Timer already reset
            elif msg_type == "notification":
                self._handle_notification(msg)
            elif msg_type == "session_reconnect":
                await self._handle_reconnect(msg)
                return  # Exit this message loop; new connection takes over
            elif msg_type == "revocation":
                self._handle_revocation(msg)
            else:
                log.warning(f"Unknown message type: {msg_type}")

    # ─── Welcome ─────────────────────────────────────

    async def _handle_welcome(
        self,
        msg: dict,
        ws: websockets.WebSocketClientProtocol,
        is_reconnect: bool,
    ) -> None:
        session = msg["payload"]["session"]
        self.session_id = session["id"]
        self.keepalive_timeout = session["keepalive_timeout_seconds"]

        log.info(
            f"Welcome received. Session: {self.session_id}, "
            f"Keepalive: {self.keepalive_timeout}s"
        )

        if is_reconnect:
            log.info("Reconnect successful — subscriptions carried over.")
            self.reconnect_attempts = 0
            self._is_reconnecting = False
        else:
            self.reconnect_attempts = 0
            await self._create_subscriptions()

    # ─── Subscriptions ───────────────────────────────

    async def _create_subscriptions(self) -> None:
        headers = {
            "Authorization": f"Bearer {self.user_access_token}",
            "Client-Id": self.client_id,
            "Content-Type": "application/json",
        }

        async with aiohttp.ClientSession() as session:
            for sub in self.subscriptions:
                body = {
                    "type": sub["type"],
                    "version": sub["version"],
                    "condition": sub["condition"],
                    "transport": {
                        "method": "websocket",
                        "session_id": self.session_id,
                    },
                }

                try:
                    async with session.post(
                        self.API_URL, headers=headers, json=body
                    ) as resp:
                        if resp.status in (200, 202):
                            result = await resp.json()
                            log.info(
                                f"Subscribed to {sub['type']}. "
                                f"Cost: {result['total_cost']}/{result['max_total_cost']}"
                            )
                        else:
                            text = await resp.text()
                            log.error(
                                f"Failed to subscribe to {sub['type']}: "
                                f"{resp.status} — {text}"
                            )
                except Exception as e:
                    log.error(f"Subscription error for {sub['type']}: {e}")

    # ─── Notification ────────────────────────────────

    def _handle_notification(self, msg: dict) -> None:
        message_id = msg["metadata"]["message_id"]

        # Deduplication
        if message_id in self.seen_message_ids:
            log.debug(f"Duplicate notification ignored: {message_id}")
            return
        self.seen_message_ids.add(message_id)

        # Prune if too large
        if len(self.seen_message_ids) > self.MAX_SEEN_IDS:
            self.seen_message_ids.clear()
            log.info("Pruned dedup set.")

        sub_type = msg["metadata"]["subscription_type"]
        event = msg["payload"]["event"]
        subscription = msg["payload"]["subscription"]

        # Self-detection guard
        if event and event.get("user_id") == self.user_id:
            log.debug(f"Ignoring self-triggered event: {sub_type}")
            return

        # Dispatch to specific handlers
        for handler in self._handlers.get(sub_type, []):
            try:
                handler(event, subscription)
            except Exception as e:
                log.error(f"Handler error for {sub_type}: {e}")

        # Dispatch to global handlers
        for handler in self._global_handlers:
            try:
                handler(sub_type, event, subscription)
            except Exception as e:
                log.error(f"Global handler error: {e}")

    # ─── Reconnect ───────────────────────────────────

    async def _handle_reconnect(self, msg: dict) -> None:
        reconnect_url = msg["payload"]["session"]["reconnect_url"]
        log.info(f"Reconnect requested. URL: {reconnect_url}")

        if self._is_reconnecting:
            log.warning("Already reconnecting, ignoring duplicate.")
            return

        self._is_reconnecting = True
        old_ws = self.ws

        try:
            new_ws = await websockets.connect(reconnect_url)
            # Read welcome from new connection
            raw = await asyncio.wait_for(new_ws.recv(), timeout=30)
            welcome = json.loads(raw)

            if welcome["metadata"]["message_type"] != "session_welcome":
                log.error("Expected welcome on reconnect, got something else.")
                await new_ws.close()
                self._is_reconnecting = False
                return

            await self._handle_welcome(welcome, new_ws, is_reconnect=True)

            # Close old connection
            if old_ws:
                await old_ws.close(1000, "Reconnect complete")

            # Switch to new connection's message loop
            self.ws = new_ws
            await self._message_loop(new_ws, is_reconnect=True)

        except Exception as e:
            log.error(f"Reconnect failed: {e}")
            self._is_reconnecting = False

    # ─── Revocation ──────────────────────────────────

    def _handle_revocation(self, msg: dict) -> None:
        sub = msg["payload"]["subscription"]
        log.warning(
            f"Subscription revoked: {sub['type']} — Reason: {sub['status']}"
        )

    # ─── Keepalive Timer ─────────────────────────────

    def _reset_keepalive_timer(self) -> None:
        if self.keepalive_task and not self.keepalive_task.done():
            self.keepalive_task.cancel()

        timeout = self.keepalive_timeout * 1.2 + 1
        self.keepalive_task = asyncio.get_event_loop().create_task(
            self._keepalive_watchdog(timeout)
        )

    async def _keepalive_watchdog(self, timeout: float) -> None:
        try:
            await asyncio.sleep(timeout)
            log.warning("Keepalive timeout — connection assumed dead.")
            if self.ws:
                await self.ws.close(4000, "Keepalive timeout")
        except asyncio.CancelledError:
            pass  # Timer was reset — this is normal


# ─── Usage ────────────────────────────────────────────────

async def main():
    client = TwitchEventSubClient(
        user_access_token=os.environ["TWITCH_ACCESS_TOKEN"],
        client_id=os.environ["TWITCH_CLIENT_ID"],
        user_id="12826",
        subscriptions=[
            {
                "type": "channel.follow",
                "version": "2",
                "condition": {
                    "broadcaster_user_id": "12826",
                    "moderator_user_id": "12826",
                },
            },
            {
                "type": "channel.chat.message",
                "version": "1",
                "condition": {
                    "broadcaster_user_id": "12826",
                    "user_id": "12826",
                },
            },
            {
                "type": "channel.subscribe",
                "version": "1",
                "condition": {
                    "broadcaster_user_id": "12826",
                },
            },
        ],
        keepalive_timeout_seconds=30,
    )

    # Register handlers
    def on_follow(event: dict, sub: dict) -> None:
        log.info(f"New follower: {event['user_name']}")

    def on_chat_message(event: dict, sub: dict) -> None:
        log.info(f"[{event['chatter_user_name']}]: {event['message']['text']}")

    def on_subscribe(event: dict, sub: dict) -> None:
        log.info(f"New subscriber: {event['user_name']} (Tier {event['tier']})")

    def on_any(event_type: str, event: dict, sub: dict) -> None:
        log.info(f"[ALL] {event_type}: {json.dumps(event)[:200]}")

    client.on("channel.follow", on_follow)
    client.on("channel.chat.message", on_chat_message)
    client.on("channel.subscribe", on_subscribe)
    client.on_any(on_any)

    try:
        await client.connect()
    except KeyboardInterrupt:
        pass
    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
```

---

## Twitch CLI WebSocket Testing

The Twitch CLI includes a built-in mock WebSocket server for local development. This lets you test your client without connecting to Twitch's production servers.

### Install the Twitch CLI

```bash
# macOS
brew install twitchdev/twitch/twitch-cli

# Windows (scoop)
scoop bucket add twitch https://github.com/twitchdev/scoop-bucket.git
scoop install twitch-cli

# Go install
go install github.com/twitchdev/twitch-cli/cmd/twitch@latest
```

### Start the Mock WebSocket Server

```bash
twitch event websocket start-server
```

**Default output:**

```
Started WebSocket server on ws://127.0.0.1:8080/ws
```

The mock server sends a `session_welcome` message on connection, just like the real server.

### Connect Your Client to the Mock Server

Change your connection URL from:

```
wss://eventsub.wss.twitch.tv/ws
```

To:

```
ws://127.0.0.1:8080/ws
```

### Trigger Mock Events

With the mock server running, open another terminal and trigger events:

```bash
# Trigger a channel.follow event
twitch event trigger channel.follow \
  --transport=websocket

# Trigger a channel.subscribe event
twitch event trigger channel.subscribe \
  --transport=websocket

# Trigger a channel.chat.message event
twitch event trigger channel.chat.message \
  --transport=websocket

# Trigger with custom data
twitch event trigger channel.follow \
  --transport=websocket \
  -F broadcaster_user_id=12826 \
  -F user_id=98765 \
  -F user_name="TestFollower"
```

### Test Reconnect Flow

```bash
# Force the mock server to send a reconnect message
twitch event websocket reconnect
```

This causes the mock server to send a `session_reconnect` message with a new URL, letting you test your reconnect logic end-to-end.

### Test Subscription Revocation

```bash
# Trigger a revocation
twitch event websocket subscription-revocation \
  --type channel.follow \
  --reason authorization_revoked
```

### Test Close Codes

```bash
# Force the server to close the connection with a specific code
twitch event websocket close --code 4003 --reason "Connection unused"
```

### Important Notes for CLI Testing

- The mock server does **not** require authentication. You can skip the subscription creation step for basic message-handling tests.
- Event payloads from the mock server use placeholder data (e.g., user IDs like `1234`).
- The mock server supports a subset of event types. Check `twitch event trigger --help` for the full list.
- Mock keepalive intervals default to 10 seconds.

---

## Best Practices & Production Hardening

### 1. Always Deduplicate by `message_id`

EventSub guarantees at-least-once delivery. Duplicate notifications can occur during reconnects or server-side retries.

```javascript
const seen = new Set();

function handleMessage(msg) {
  if (seen.has(msg.metadata.message_id)) return;
  seen.add(msg.metadata.message_id);
  // Process...
}
```

Periodically prune the set to avoid unbounded memory growth.

### 2. Use Exponential Backoff with Jitter

Never reconnect in a tight loop. Use exponential backoff with random jitter:

```
delay = min(2^attempt * 1000, 30000) + random(0, 1000)
```

### 3. Monitor the Keepalive Timer

Do not rely on WebSocket Ping/Pong for liveness detection. Implement a keepalive watchdog based on the `keepalive_timeout_seconds` from the welcome message:

```
watchdog_timeout = keepalive_timeout_seconds * 1.2 + 1 second
```

If the watchdog fires, close the connection and reconnect.

### 4. Handle Reconnect Messages Properly

- Open a **new** connection to `reconnect_url` before closing the old one.
- Wait for the welcome message on the new connection.
- Only then close the old connection.
- Do **not** re-subscribe — subscriptions carry over.

### 5. Never Send Messages to the Server

The EventSub WebSocket is strictly server-to-client. Any client-initiated message (even a text frame with an empty string) results in close code 4001 and disconnect.

### 6. Store Subscription IDs

When you create subscriptions, store their IDs. This lets you:
- Delete specific subscriptions when they are no longer needed.
- Track which subscriptions are active vs. revoked.

### 7. Handle Token Refresh

User Access Tokens expire. If your token expires while subscriptions are active:
- Existing WebSocket connections and deliveries continue working (the token was validated at subscription creation time).
- You cannot create new subscriptions until you refresh the token.
- Revocations will occur if the user revokes the app's authorization.

Plan your token refresh logic independently of the WebSocket lifecycle.

### 8. Implement a Self-Detection Guard

If your bot or app can trigger events on the channel it monitors (e.g., chat messages, follows), add a guard to ignore self-triggered events:

```javascript
if (event.user_id === MY_USER_ID) return; // Skip self-triggered
```

This prevents infinite loops where the bot reacts to its own actions.

### 9. Log Thoroughly

In production, log:
- Connection open/close events (with close codes).
- Welcome messages (session ID, keepalive).
- Subscription creation results (cost).
- Reconnect requests and outcomes.
- Revocations.
- Keepalive watchdog triggers.

### 10. Graceful Shutdown

On application exit:
1. Close the WebSocket with code 1000 (normal closure).
2. Cancel any pending timers.
3. Optionally delete subscriptions via the REST API (they will otherwise be cleaned up when the session expires).

### 11. Use Multiple Connections Wisely

You can open up to 3 WebSocket connections per User Access Token. Use this to:
- Separate high-volume subscription types.
- Implement redundancy (connect twice and deduplicate).
- Stay under the 300-subscription-per-connection limit.

### 12. Validate the `message_timestamp`

Optionally reject messages with timestamps older than a threshold (e.g., 10 minutes). This helps detect replay attacks or severely delayed messages:

```javascript
const age = Date.now() - new Date(msg.metadata.message_timestamp).getTime();
if (age > 10 * 60 * 1000) {
  console.warn('Stale message, ignoring.');
  return;
}
```

---

## Known Issues & Community Notes

### 4003 "Connection unused" Race Condition

**Symptom:** Your client connects, receives the welcome, and begins the subscription API call, but the server closes with code 4003 before the API responds.

**Cause:** The 10-second window starts when the server sends the welcome, not when your client processes it. If your subscription API call takes too long (network latency, rate limiting, etc.), the server may close the connection before the subscription is registered.

**Mitigations:**
- Subscribe to your most critical event first (e.g., a low-cost `channel.follow`).
- Minimize processing between receiving the welcome and sending the subscription request.
- If you hit 4003, simply reconnect and try again.
- Pre-validate your token and condition parameters to avoid 400/401 errors that waste time.

### Reconnect URL Expiration

**Symptom:** Connecting to a `reconnect_url` fails with an error or close code 4007.

**Cause:** The reconnect URL is time-limited (approximately 30 seconds from when the reconnect message was sent). If your client takes too long, the URL expires.

**Mitigation:** Initiate the new connection immediately upon receiving the reconnect message. Do not add artificial delays.

### Keepalive Timer Inaccuracy

**Symptom:** The keepalive watchdog fires even though the connection is healthy.

**Cause:** The server's keepalive interval is approximate, not exact. Network jitter can cause slight delays.

**Mitigation:** Add a buffer (20% + 1 second) to the advertised `keepalive_timeout_seconds`. The examples in this document use `timeout * 1.2 + 1`.

### Subscription Cost Confusion

**Symptom:** Subscription creation fails with a "total cost exceeded" error even though you have fewer than 10 subscriptions.

**Cause:** Some subscription types cost 1 when the token owner is not the broadcaster in the condition. The total cost across all enabled subscriptions on the connection cannot exceed 10.

**Mitigation:** Check the `total_cost` and `max_total_cost` in the subscription creation response. Use cost-0 subscriptions where possible (token owner = broadcaster in condition).

### Duplicate Notifications During Reconnect

**Symptom:** You receive the same event on both the old and new WebSocket connections during a reconnect.

**Cause:** This is by design. Twitch may deliver the same event on both connections during the overlap period to ensure at-least-once delivery.

**Mitigation:** Always deduplicate by `message_id`.

### Browser WebSocket Limitations

**Symptom:** The browser's native WebSocket API does not expose the close code from the server.

**Cause:** Some browsers restrict access to the WebSocket close code and reason for security reasons.

**Mitigation:** Use the `CloseEvent.code` and `CloseEvent.reason` properties of the `close` event in the browser. Most modern browsers expose these. For older browsers, you may need to rely on the keepalive watchdog for connection health detection.

### Multiple Tabs / Instances

**Symptom:** You open your app in multiple browser tabs and hit the 3-connection limit.

**Cause:** Each tab opens its own WebSocket connection, and the limit is 3 connections per User Access Token.

**Mitigation:**
- Use a `SharedWorker` or `BroadcastChannel` to share a single WebSocket connection across tabs.
- Use a `ServiceWorker` as a central connection manager.
- Track open connections and prevent new tabs from connecting when the limit is reached.

---

## Quick Reference Table

| Item | Value |
|---|---|
| **WebSocket URL** | `wss://eventsub.wss.twitch.tv/ws` |
| **Keepalive parameter** | `?keepalive_timeout_seconds=10` (range: 10–600) |
| **Token type** | User Access Token only |
| **Max subscriptions per connection** | 300 |
| **Max connections per token** | 3 |
| **Max total cost per connection** | 10 |
| **Subscribe window after welcome** | 10 seconds |
| **Reconnect window** | 30 seconds |
| **Message types** | `session_welcome`, `session_keepalive`, `notification`, `session_reconnect`, `revocation` |
| **Close code: server error** | 4000 |
| **Close code: client sent message** | 4001 |
| **Close code: failed ping-pong** | 4002 |
| **Close code: connection unused** | 4003 |
| **Close code: reconnect timeout** | 4004 |
| **Close code: network timeout** | 4005 |
| **Close code: network error** | 4006 |
| **Close code: invalid reconnect** | 4007 |
| **Delivery guarantee** | At-least-once (deduplicate by `message_id`) |
| **Client-to-server messages** | Forbidden (causes disconnect) |
| **Ping/Pong** | Handled automatically by WebSocket libraries |
| **Subscription creation API** | `POST https://api.twitch.tv/helix/eventsub/subscriptions` |
| **Twitch CLI mock server** | `twitch event websocket start-server` |
| **Twitch CLI trigger event** | `twitch event trigger <type> --transport=websocket` |
| **Twitch CLI test reconnect** | `twitch event websocket reconnect` |
