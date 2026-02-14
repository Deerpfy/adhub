# Twitch PubSub to EventSub — Migration Guide

> **Source:** [Twitch PubSub Migration Guide](https://dev.twitch.tv/docs/pubsub/#migration), [EventSub Documentation](https://dev.twitch.tv/docs/eventsub/)
> **Last verified:** 2025-05
> **Status:** PubSub fully decommissioned as of April 14, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Timeline](#timeline)
3. [PubSub Topic to EventSub Mapping](#pubsub-topic-to-eventsub-mapping)
4. [Scope Differences](#scope-differences)
5. [Connection Lifecycle Differences](#connection-lifecycle-differences)
6. [Key Behavioral Changes](#key-behavioral-changes)
7. [Code Migration Examples](#code-migration-examples)
8. [Best Practices](#best-practices)
9. [Known Issues](#known-issues)
10. [Quick Reference Table](#quick-reference-table)

---

## Overview

Twitch PubSub was a WebSocket-based system that allowed clients to subscribe to real-time event topics such as channel point redemptions, bits, subscriptions, and moderation actions. As of **April 14, 2025**, PubSub has been fully decommissioned and all real-time event delivery must go through **EventSub** (either WebSocket or Webhook transport).

Any application still relying on PubSub connections will receive no data. Migration to EventSub is mandatory.

**What is NOT affected:**

- **Extension PubSub** (the mechanism for broadcasting messages between an Extension's EBS, frontend, and configuration service) is a completely separate system and is NOT deprecated. Extension developers who use `Twitch.ext.listen()` and `Twitch.ext.send()` do not need to migrate.

**Key migration summary:**

| Aspect | PubSub (Deprecated) | EventSub (Current) |
|---|---|---|
| Status | Decommissioned April 14, 2025 | Active, fully supported |
| Subscribing | LISTEN message over WebSocket | REST API call (`POST /eventsub/subscriptions`) |
| Connection health | Client sends PING, server responds PONG | Server sends keepalive, client must NOT send messages |
| Reconnect | Reconnect to same URL | Reconnect to new URL provided in `session_reconnect` |
| Authentication | OAuth token in LISTEN message | OAuth token in API call; `session_id` in transport |
| Revocation | No notification | Explicit revocation message with reason |

---

## Timeline

| Date | Event |
|---|---|
| **April 2024** | Twitch announces PubSub deprecation; migration period begins |
| **April 14, 2025** | PubSub fully decommissioned; all connections rejected |
| **Ongoing** | EventSub is the sole supported real-time event system |

Twitch provided a one-year migration window. Applications that did not migrate by the decommission date lost all real-time event functionality until they switch to EventSub.

---

## PubSub Topic to EventSub Mapping

The following table maps every PubSub topic to its EventSub equivalent. Some PubSub topics map to multiple EventSub subscription types; some have scope changes.

| PubSub Topic | EventSub Subscription Type | Scope Changes |
|---|---|---|
| `channel-bits-events-v2` | `channel.cheer` (v1) | `bits:read` (unchanged) |
| `channel-bits-badge-unlocks` | `channel.cheer` (v1) [partial coverage] | `bits:read` (unchanged) |
| `channel-cheer-events-v1` | `channel.cheer` (v1) | `bits:read` (unchanged) |
| `channel-points-channel-v1` | `channel.channel_points_custom_reward_redemption.add` (v1) | `channel:read:redemptions` (unchanged) |
| `community-points-channel-v1` | `channel.channel_points_custom_reward_redemption.add` (v1), `channel.channel_points_custom_reward_redemption.update` (v1), `channel.channel_points_custom_reward.add` (v1), `channel.channel_points_custom_reward.update` (v1), `channel.channel_points_custom_reward.remove` (v1) | `channel:read:redemptions` or `channel:manage:redemptions` |
| `channel-subscribe-events-v1` | `channel.subscribe` (v1), `channel.subscription.gift` (v1), `channel.subscription.message` (v1) | `channel_subscriptions` **changed to** `channel:read:subscriptions` |
| `automod-queue.{moderator_id}.{channel_id}` | `automod.message.hold` (v1), `automod.message.update` (v1) | `channel:moderate` **changed to** `moderator:manage:automod` |
| `chat_moderator_actions.{user_id}.{channel_id}` | `channel.moderate` (v1/v2) | `channel:moderate` **changed to** various `moderator:` scopes |
| `whispers.{user_id}` | `user.whisper.message` (v1) | `whispers:read` **changed to** `user:read:whispers` |
| `video-playback-by-id.{channel_id}` | `stream.online` (v1), `stream.offline` (v1) | No scope required |
| `channel-unban-requests.{moderator_id}.{channel_id}` | `channel.unban_request.create` (v1), `channel.unban_request.resolve` (v1) | `moderator:read:unban_requests` |
| `user-moderation-notifications.{user_id}.{channel_id}` | `channel.chat.user_message_hold` (v1), `channel.chat.user_message_update` (v1) | `user:read:chat` |
| `channel-chat-highlights` | No direct equivalent | [VERIFY] |
| `low-trust-users.{moderator_id}.{channel_id}` | `channel.suspicious_user.message` (v1), `channel.suspicious_user.update` (v1) | `moderator:read:suspicious_users` |
| `predictions-channel-v1.{channel_id}` | `channel.prediction.begin` (v1), `channel.prediction.progress` (v1), `channel.prediction.lock` (v1), `channel.prediction.end` (v1) | `channel:read:predictions` |
| `polls.{channel_id}` | `channel.poll.begin` (v1), `channel.poll.progress` (v1), `channel.poll.end` (v1) | `channel:read:polls` |
| `hype-train-events-v1.{channel_id}` | `channel.hype_train.begin` (v1), `channel.hype_train.progress` (v1), `channel.hype_train.end` (v1) | `channel:read:hype_train` |
| `raid.{channel_id}` | `channel.raid` (v1) | No scope required |
| `following.{channel_id}` | `channel.follow` (v2) | `moderator:read:followers` |
| `channel-shield-mode.{moderator_id}.{channel_id}` | `channel.shield_mode.begin` (v1), `channel.shield_mode.end` (v1) | `moderator:read:shield_mode` or `moderator:manage:shield_mode` |
| `shoutout.{moderator_id}.{channel_id}` | `channel.shoutout.create` (v1), `channel.shoutout.receive` (v1) | `moderator:read:shoutouts` or `moderator:manage:shoutouts` |

**Notes on partial coverage:**

- `channel-bits-badge-unlocks` has no direct 1:1 equivalent. The `channel.cheer` event covers cheer events but does not specifically replicate the badge unlock payload. Check whether your application actually needs badge unlock data or if cheer events are sufficient.
- `channel-chat-highlights` has no direct EventSub equivalent as of the PubSub decommission date. Verify current EventSub subscription types for any updates.

---

## Scope Differences

Several PubSub topics used older scope names that have been replaced in EventSub. You must update your OAuth authorization flow to request the new scopes.

| PubSub Scope | EventSub Scope | Affected Topics |
|---|---|---|
| `channel_subscriptions` | `channel:read:subscriptions` | Subscription events |
| `channel:moderate` | `moderator:manage:automod` | AutoMod queue events |
| `channel:moderate` | `moderator:read:chat_messages`, `moderator:manage:chat_messages`, `moderator:read:banned_users`, `moderator:manage:banned_users` (varies by action) | Chat moderator actions |
| `whispers:read` | `user:read:whispers` | Whisper messages |
| (no scope) | `moderator:read:followers` | Follow events (v2 requires moderator scope) |

**Important:** If your application was previously authorized with old scopes, users may need to re-authorize with the updated scope set. Plan for a re-authorization flow during your migration.

---

## Connection Lifecycle Differences

### PubSub Connection Lifecycle (Deprecated)

```
1. Client connects to wss://pubsub-edge.twitch.tv

2. Client sends LISTEN message:
   {
     "type": "LISTEN",
     "data": {
       "topics": ["channel-bits-events-v2.12345"],
       "auth_token": "oauth_token_here"
     }
   }

3. Server responds with RESPONSE (success or error)

4. Client sends periodic PING messages (every ~4 minutes):
   { "type": "PING" }

5. Server responds with PONG:
   { "type": "PONG" }

6. If no PONG within 10 seconds → reconnect

7. Server may send RECONNECT:
   { "type": "RECONNECT" }
   → Client reconnects to the SAME URL (wss://pubsub-edge.twitch.tv)

8. Events arrive as MESSAGE type with topic and data fields
```

### EventSub WebSocket Lifecycle (Current)

```
1. Client connects to wss://eventsub.wss.twitch.tv/ws

2. Server sends session_welcome message containing session_id
   and keepalive_timeout_seconds

3. Client creates subscriptions via REST API:
   POST https://api.twitch.tv/helix/eventsub/subscriptions
   Headers:
     Authorization: Bearer <user_access_token>
     Client-Id: <client_id>
   Body:
     {
       "type": "channel.cheer",
       "version": "1",
       "condition": { "broadcaster_user_id": "12345" },
       "transport": {
         "method": "websocket",
         "session_id": "<session_id_from_welcome>"
       }
     }

4. Server sends periodic keepalive messages automatically
   → Client must NOT send any messages to the server

5. If no message (notification or keepalive) received within
   keepalive_timeout_seconds → assume connection dead, reconnect

6. Server may send session_reconnect with a reconnect_url:
   → Client MUST connect to the NEW URL (not the original URL)
   → Old connection continues delivering events until new one is ready
   → After welcome on new connection, close old connection

7. Events arrive as notification messages with subscription type and event data

8. Server may send revocation messages when subscriptions are
   invalidated (token revoked, user removed, version deprecated)
```

### Side-by-Side Comparison

| Phase | PubSub | EventSub WebSocket |
|---|---|---|
| **Connect** | `wss://pubsub-edge.twitch.tv` | `wss://eventsub.wss.twitch.tv/ws` |
| **Initial handshake** | None; client sends LISTEN immediately | Wait for `session_welcome` message |
| **Subscribe** | Send `LISTEN` message with topics + auth_token | Call REST API with `session_id` in transport |
| **Multiple topics** | Multiple topics in single LISTEN | One API call per subscription type |
| **Health check** | Client sends PING every ~4 min | Server sends keepalive automatically |
| **Dead connection** | No PONG within 10s | No message within `keepalive_timeout_seconds` |
| **Reconnect trigger** | `RECONNECT` message | `session_reconnect` message |
| **Reconnect target** | Same URL | New URL from `reconnect_url` field |
| **Reconnect overlap** | No overlap guarantee | Old connection stays active during transition |
| **Auth location** | `auth_token` field in LISTEN message | `Authorization` header in REST API call |
| **Revocation** | No notification | Explicit `revocation` message with reason |
| **Client messages** | PING and LISTEN allowed | MUST NOT send any messages (close code 4001) |

---

## Key Behavioral Changes

### 1. PING/PONG vs. Keepalive

**PubSub (old):**
```javascript
// Client was responsible for sending PING
setInterval(() => {
  ws.send(JSON.stringify({ type: 'PING' }));
  pongTimeout = setTimeout(() => {
    ws.close();
    reconnect();
  }, 10000);
}, 240000); // Every 4 minutes

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'PONG') {
    clearTimeout(pongTimeout);
  }
});
```

**EventSub (new):**
```javascript
// Server sends keepalive; client only listens
let keepaliveTimer;

function resetKeepaliveTimer(timeoutSeconds) {
  clearTimeout(keepaliveTimer);
  keepaliveTimer = setTimeout(() => {
    console.log('Keepalive timeout — reconnecting');
    ws.close();
    reconnect();
  }, (timeoutSeconds + 5) * 1000); // Add buffer
}

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  // ANY message from server resets the keepalive timer
  resetKeepaliveTimer(keepaliveTimeoutSeconds);
});
```

**Key difference:** In EventSub, the client must NEVER send messages to the server. Any client-to-server message causes an immediate disconnect with close code 4001. Remove all PING logic.

### 2. LISTEN Message vs. REST API

**PubSub (old):**
```javascript
// Subscribe to topics over the WebSocket itself
ws.send(JSON.stringify({
  type: 'LISTEN',
  nonce: 'unique-nonce-123',
  data: {
    topics: [
      'channel-bits-events-v2.12345',
      'channel-subscribe-events-v1.12345',
      'channel-points-channel-v1.12345'
    ],
    auth_token: 'oauth_token'
  }
}));
```

**EventSub (new):**
```javascript
// Subscribe via REST API after receiving session_welcome
async function subscribe(sessionId, type, version, condition, token, clientId) {
  const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Client-Id': clientId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: type,
      version: version,
      condition: condition,
      transport: {
        method: 'websocket',
        session_id: sessionId
      }
    })
  });
  return response.json();
}

// Each subscription is a separate API call
await subscribe(sessionId, 'channel.cheer', '1',
  { broadcaster_user_id: '12345' }, token, clientId);

await subscribe(sessionId, 'channel.subscribe', '1',
  { broadcaster_user_id: '12345' }, token, clientId);

await subscribe(sessionId, 'channel.channel_points_custom_reward_redemption.add', '1',
  { broadcaster_user_id: '12345' }, token, clientId);
```

**Key difference:** Subscriptions are decoupled from the WebSocket connection. You need the `session_id` from the welcome message and a valid User Access Token for the API call.

### 3. RECONNECT Handling

**PubSub (old):**
```javascript
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'RECONNECT') {
    // Reconnect to the SAME URL
    ws.close();
    ws = new WebSocket('wss://pubsub-edge.twitch.tv');
    // Re-send all LISTEN messages after connecting
  }
});
```

**EventSub (new):**
```javascript
ws.on('message', (data) => {
  const msg = JSON.parse(data);

  if (msg.metadata.message_type === 'session_reconnect') {
    const reconnectUrl = msg.payload.session.reconnect_url;

    // Connect to the NEW URL (not the original)
    const newWs = new WebSocket(reconnectUrl);

    newWs.on('message', (newData) => {
      const welcomeMsg = JSON.parse(newData);
      if (welcomeMsg.metadata.message_type === 'session_welcome') {
        // New connection is ready; close old one
        // Subscriptions are automatically transferred
        ws.close();
        ws = newWs;
      }
    });

    // DO NOT close old connection yet — it continues delivering events
    // until the new connection receives its welcome message
  }
});
```

**Key differences:**
- EventSub provides a specific `reconnect_url` that is different from the original URL.
- The old connection remains active during the transition, ensuring no events are lost.
- Subscriptions are automatically transferred to the new session; you do NOT need to re-subscribe.

---

## Code Migration Examples

### Full Migration: PubSub Client to EventSub WebSocket Client (JavaScript)

**Before (PubSub):**

```javascript
class PubSubClient {
  constructor(oauthToken) {
    this.token = oauthToken;
    this.ws = null;
    this.topics = [];
  }

  connect() {
    this.ws = new WebSocket('wss://pubsub-edge.twitch.tv');

    this.ws.onopen = () => {
      this.listen(this.topics);
      this.startPingInterval();
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'PONG':
          clearTimeout(this.pongTimeout);
          break;
        case 'RECONNECT':
          this.reconnect();
          break;
        case 'MESSAGE':
          this.handleMessage(msg.data.topic, JSON.parse(msg.data.message));
          break;
        case 'RESPONSE':
          if (msg.error) console.error('Listen error:', msg.error);
          break;
      }
    };

    this.ws.onclose = () => {
      clearInterval(this.pingInterval);
      setTimeout(() => this.connect(), 5000);
    };
  }

  listen(topics) {
    this.topics = topics;
    this.ws.send(JSON.stringify({
      type: 'LISTEN',
      data: {
        topics: topics,
        auth_token: this.token
      }
    }));
  }

  startPingInterval() {
    this.pingInterval = setInterval(() => {
      this.ws.send(JSON.stringify({ type: 'PING' }));
      this.pongTimeout = setTimeout(() => {
        this.ws.close();
      }, 10000);
    }, 240000);
  }

  reconnect() {
    this.ws.close();
    this.connect();
  }

  handleMessage(topic, data) {
    console.log(`[${topic}]`, data);
  }
}

// Usage
const client = new PubSubClient('my_oauth_token');
client.connect();
client.listen([
  'channel-bits-events-v2.12345',
  'channel-subscribe-events-v1.12345',
  'channel-points-channel-v1.12345'
]);
```

**After (EventSub WebSocket):**

```javascript
class EventSubWebSocketClient {
  constructor(token, clientId) {
    this.token = token;
    this.clientId = clientId;
    this.ws = null;
    this.sessionId = null;
    this.keepaliveTimeoutSeconds = 10;
    this.keepaliveTimer = null;
    this.subscriptions = [];
  }

  connect() {
    this.ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.resetKeepaliveTimer();

      switch (msg.metadata.message_type) {
        case 'session_welcome':
          this.handleWelcome(msg.payload.session);
          break;
        case 'notification':
          this.handleNotification(msg.metadata, msg.payload);
          break;
        case 'session_reconnect':
          this.handleReconnect(msg.payload.session.reconnect_url);
          break;
        case 'revocation':
          this.handleRevocation(msg.payload);
          break;
        case 'session_keepalive':
          // No action needed — timer already reset above
          break;
      }
    };

    this.ws.onclose = (event) => {
      clearTimeout(this.keepaliveTimer);
      if (event.code !== 1000) {
        console.log(`Connection closed (${event.code}), reconnecting...`);
        setTimeout(() => this.connect(), 5000);
      }
    };
  }

  handleWelcome(session) {
    this.sessionId = session.id;
    this.keepaliveTimeoutSeconds = session.keepalive_timeout_seconds;
    this.resetKeepaliveTimer();

    // Create all subscriptions via REST API
    for (const sub of this.subscriptions) {
      this.createSubscription(sub.type, sub.version, sub.condition);
    }
  }

  async createSubscription(type, version, condition) {
    const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Client-Id': this.clientId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        version,
        condition,
        transport: {
          method: 'websocket',
          session_id: this.sessionId
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(`Failed to subscribe to ${type}:`, data);
    }
    return data;
  }

  handleReconnect(reconnectUrl) {
    const oldWs = this.ws;
    const newWs = new WebSocket(reconnectUrl);

    newWs.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.metadata.message_type === 'session_welcome') {
        this.sessionId = msg.payload.session.id;
        this.keepaliveTimeoutSeconds = msg.payload.session.keepalive_timeout_seconds;
        this.ws = newWs;
        this.ws.onmessage = this.ws.onmessage; // Re-bind full handler
        oldWs.close();
        this.resetKeepaliveTimer();
      }
    };
  }

  handleNotification(metadata, payload) {
    console.log(`[${payload.subscription.type}]`, payload.event);
    // Deduplicate by metadata.message_id if needed
  }

  handleRevocation(payload) {
    console.warn('Subscription revoked:', payload.subscription.type,
      '— Reason:', payload.subscription.status);
    // status: authorization_revoked | user_removed | version_removed
  }

  resetKeepaliveTimer() {
    clearTimeout(this.keepaliveTimer);
    this.keepaliveTimer = setTimeout(() => {
      console.log('Keepalive timeout — reconnecting');
      this.ws.close();
      this.connect();
    }, (this.keepaliveTimeoutSeconds + 5) * 1000);
  }

  // Register subscriptions to be created after connecting
  addSubscription(type, version, condition) {
    this.subscriptions.push({ type, version, condition });
  }
}

// Usage — migrated from the PubSub example above
const client = new EventSubWebSocketClient('my_user_access_token', 'my_client_id');

// channel-bits-events-v2.12345 → channel.cheer
client.addSubscription('channel.cheer', '1',
  { broadcaster_user_id: '12345' });

// channel-subscribe-events-v1.12345 → channel.subscribe + gift + message
client.addSubscription('channel.subscribe', '1',
  { broadcaster_user_id: '12345' });
client.addSubscription('channel.subscription.gift', '1',
  { broadcaster_user_id: '12345' });
client.addSubscription('channel.subscription.message', '1',
  { broadcaster_user_id: '12345' });

// channel-points-channel-v1.12345 → channel.channel_points_custom_reward_redemption.add
client.addSubscription('channel.channel_points_custom_reward_redemption.add', '1',
  { broadcaster_user_id: '12345' });

client.connect();
```

### Python Migration Example

**Before (PubSub):**

```python
import json
import asyncio
import websockets

class PubSubClient:
    def __init__(self, token):
        self.token = token
        self.uri = "wss://pubsub-edge.twitch.tv"

    async def connect(self, topics):
        async with websockets.connect(self.uri) as ws:
            # Send LISTEN
            await ws.send(json.dumps({
                "type": "LISTEN",
                "data": {
                    "topics": topics,
                    "auth_token": self.token
                }
            }))

            # Start PING task
            asyncio.create_task(self._ping_loop(ws))

            async for message in ws:
                msg = json.loads(message)
                if msg["type"] == "MESSAGE":
                    topic = msg["data"]["topic"]
                    data = json.loads(msg["data"]["message"])
                    self.on_message(topic, data)
                elif msg["type"] == "RECONNECT":
                    break  # Reconnect

    async def _ping_loop(self, ws):
        while True:
            await asyncio.sleep(240)
            await ws.send(json.dumps({"type": "PING"}))
```

**After (EventSub WebSocket):**

```python
import json
import asyncio
import aiohttp
import websockets

class EventSubClient:
    def __init__(self, token, client_id):
        self.token = token
        self.client_id = client_id
        self.session_id = None
        self.keepalive_timeout = 10
        self.subscriptions = []

    def add_subscription(self, sub_type, version, condition):
        self.subscriptions.append({
            "type": sub_type,
            "version": version,
            "condition": condition
        })

    async def connect(self):
        url = "wss://eventsub.wss.twitch.tv/ws"
        async with websockets.connect(url) as ws:
            # Do NOT send any messages — wait for welcome
            async for raw in ws:
                msg = json.loads(raw)
                msg_type = msg["metadata"]["message_type"]

                if msg_type == "session_welcome":
                    session = msg["payload"]["session"]
                    self.session_id = session["id"]
                    self.keepalive_timeout = session["keepalive_timeout_seconds"]
                    await self._create_all_subscriptions()

                elif msg_type == "notification":
                    event_type = msg["payload"]["subscription"]["type"]
                    event_data = msg["payload"]["event"]
                    self.on_event(event_type, event_data)

                elif msg_type == "session_reconnect":
                    new_url = msg["payload"]["session"]["reconnect_url"]
                    # Reconnect to the NEW URL
                    await self._reconnect(new_url)
                    break

                elif msg_type == "revocation":
                    sub = msg["payload"]["subscription"]
                    print(f"Revoked: {sub['type']} — {sub['status']}")

    async def _create_all_subscriptions(self):
        async with aiohttp.ClientSession() as session:
            for sub in self.subscriptions:
                await self._create_subscription(session, sub)

    async def _create_subscription(self, session, sub):
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Client-Id": self.client_id,
            "Content-Type": "application/json"
        }
        body = {
            "type": sub["type"],
            "version": sub["version"],
            "condition": sub["condition"],
            "transport": {
                "method": "websocket",
                "session_id": self.session_id
            }
        }
        async with session.post(
            "https://api.twitch.tv/helix/eventsub/subscriptions",
            headers=headers,
            json=body
        ) as resp:
            data = await resp.json()
            if resp.status != 202:
                print(f"Subscription error for {sub['type']}: {data}")

    def on_event(self, event_type, data):
        print(f"[{event_type}]", data)

# Usage
client = EventSubClient("my_user_access_token", "my_client_id")
client.add_subscription("channel.cheer", "1", {"broadcaster_user_id": "12345"})
client.add_subscription("channel.subscribe", "1", {"broadcaster_user_id": "12345"})
asyncio.run(client.connect())
```

---

## Best Practices

### 1. Do Not Send Messages to the EventSub WebSocket

The most common migration mistake is porting PING logic from PubSub. In EventSub, any message sent from client to server results in an immediate disconnect (close code `4001`). Remove all `ws.send()` calls except `close()`.

### 2. Create Subscriptions Only After Welcome

Do not attempt to call the subscription API before receiving the `session_welcome` message. The `session_id` is required and is only available in the welcome payload.

### 3. Handle Reconnects with the Provided URL

EventSub reconnect messages include a `reconnect_url` that points to a different endpoint than the original connection URL. Always use the provided URL. Do not reconnect to the original `wss://eventsub.wss.twitch.tv/ws`.

### 4. Maintain Both Connections During Reconnect

During a `session_reconnect`, keep the old connection open until the new connection receives its `session_welcome`. This ensures zero event loss during the transition. Subscriptions transfer automatically.

### 5. Update OAuth Scopes

Several PubSub topics used legacy scope names. Before migrating:
- Audit all scopes your application requests.
- Update to the new EventSub scope names (see [Scope Differences](#scope-differences)).
- Plan a re-authorization flow for existing users.

### 6. Handle Revocations

PubSub had no revocation notification. EventSub explicitly tells you when a subscription is revoked and why. Implement handlers for the three revocation statuses:
- `authorization_revoked` — the user revoked your app's authorization
- `user_removed` — the user's account was deleted
- `version_removed` — the subscription type version was deprecated

### 7. Deduplicate by message_id

EventSub guarantees at-least-once delivery. You may receive the same event more than once. Use `msg.metadata.message_id` to deduplicate.

### 8. One PubSub Topic May Map to Multiple EventSub Types

A single PubSub topic like `channel-subscribe-events-v1` maps to three EventSub types: `channel.subscribe`, `channel.subscription.gift`, and `channel.subscription.message`. Make sure you subscribe to all relevant types.

### 9. Be Aware of Subscription Limits

EventSub WebSocket connections are limited to **300 subscriptions per connection** and **3 connections per User Access Token**. If you were using PubSub with many topics, you may need to split across multiple connections or use the Conduit transport for higher limits.

### 10. Add Keepalive Buffer Time

When implementing the keepalive timeout, add a small buffer (e.g., 5 seconds) beyond `keepalive_timeout_seconds` to account for network latency. Reconnecting too aggressively wastes connections.

---

## Known Issues

### 1. `channel-bits-badge-unlocks` Has No Exact Equivalent

The `channel.cheer` EventSub type covers cheer events but does not include the specific badge unlock metadata that `channel-bits-badge-unlocks` provided. If your application relied on badge unlock notifications specifically, you may need to use the Bits Leaderboard API to supplement.

### 2. `channel-chat-highlights` Has No EventSub Equivalent

As of the PubSub decommission date, there is no direct EventSub subscription type that replaces `channel-chat-highlights`. Check the [EventSub subscription types reference](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/) for updates.

### 3. `following.{channel_id}` Now Requires Moderator Scope

The PubSub follow topic had relatively permissive access. The EventSub equivalent `channel.follow` (v2) requires the `moderator:read:followers` scope and the moderator's user ID in the condition. This is a deliberate change by Twitch to prevent follow-botting abuse.

### 4. Subscription Scope Fragmentation for Moderator Actions

The PubSub `chat_moderator_actions` topic used the single `channel:moderate` scope. In EventSub, the `channel.moderate` subscription requires various granular `moderator:` scopes depending on which actions you want to receive. Review the [EventSub documentation](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelmoderate) for the full list.

### 5. Rate Limits on Subscription Creation

When migrating many PubSub topics at once, you may hit rate limits on the `POST /eventsub/subscriptions` endpoint. Implement sequential creation with small delays or batch your subscription creation across reconnect cycles.

### 6. WebSocket Close Code 4004 on Stale Reconnect

If you attempt to create subscriptions using a `session_id` from a session that has already been replaced by a reconnect, the API will reject the subscription. Always use the most recent `session_id`.

---

## Quick Reference Table

| Concept | PubSub (Decommissioned) | EventSub WebSocket (Current) |
|---|---|---|
| **URL** | `wss://pubsub-edge.twitch.tv` | `wss://eventsub.wss.twitch.tv/ws` |
| **Subscribe** | `LISTEN` message via WebSocket | `POST /eventsub/subscriptions` via REST API |
| **Multi-topic** | Multiple topics per LISTEN | One API call per subscription type |
| **Auth delivery** | `auth_token` in LISTEN payload | `Authorization` header in API call |
| **Token type** | User Access Token | User Access Token |
| **Connection init** | Client sends LISTEN immediately | Wait for `session_welcome` |
| **Health check** | Client sends PING every ~4 min | Server sends keepalive automatically |
| **Dead detection** | No PONG in 10 seconds | No message in `keepalive_timeout_seconds` |
| **Client→server msgs** | PING, LISTEN, UNLISTEN | MUST NOT send any (close code 4001) |
| **Reconnect trigger** | `RECONNECT` message | `session_reconnect` message |
| **Reconnect URL** | Same URL | New URL from `reconnect_url` |
| **Reconnect overlap** | No guarantee | Old connection active until new welcome |
| **Sub auto-transfer** | N/A (re-LISTEN required) | Automatic transfer to new session |
| **Revocation** | No notification | `revocation` message with status |
| **Max per connection** | ~50 topics | 300 subscriptions |
| **Max connections** | ~10 per token | 3 per token |
| **Delivery guarantee** | At-most-once | At-least-once (deduplicate by `message_id`) |
| **Extension PubSub** | Still active (separate system) | Not related to EventSub |
