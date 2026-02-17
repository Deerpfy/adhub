---
title: "Twitch EventSub — Webhook Transport"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Twitch EventSub — Webhook Transport

> **Source:** https://dev.twitch.tv/docs/eventsub/handling-webhook-events/, https://dev.twitch.tv/docs/eventsub/
> **Last verified:** 2025-05-01
> **Endpoint:** `POST https://api.twitch.tv/helix/eventsub/subscriptions`
> **Transport:** `webhook`

## Overview

Webhook transport is the server-to-server delivery mechanism for Twitch EventSub. When you create a subscription with `transport.method = "webhook"`, Twitch sends HTTP POST requests to your specified callback URL whenever the subscribed event occurs.

The webhook transport is designed for backend services that run continuously and can receive inbound HTTPS requests. Unlike the WebSocket transport (which is client-initiated and session-scoped), webhooks are persistent, survive server restarts (as long as Twitch can reach your callback), and do not require maintaining an open connection.

### Webhook vs WebSocket

| Aspect | Webhook | WebSocket |
|--------|---------|-----------|
| Direction | Twitch POSTs to your server | Your client connects to Twitch |
| Auth | App access token (client credentials) | User access token |
| Requires public URL | Yes (HTTPS, port 443) | No |
| Connection management | Stateless (per-request) | Persistent connection with keepalive |
| Max subscriptions | 10,000 per client ID | 300 per connection, 3 connections per user |
| Best for | Backend services, bots, always-on servers | Browser apps, desktop clients |
| Signature verification | HMAC-SHA256 on every request | Not needed (connection is authenticated) |
| Delivery guarantee | At-least-once (retries with dedup ID) | At-most-once (missed if disconnected) |

### Message Flow

```
1. You create a subscription (POST /helix/eventsub/subscriptions)
       |
       v
2. Twitch sends webhook_callback_verification to your callback URL
       |
       v
3. Your server verifies signature, responds with challenge string
       |
       v
4. Subscription becomes "enabled"
       |
       v
5. Events occur on Twitch
       |
       v
6. Twitch POSTs notification messages to your callback URL
       |
       v
7. Your server verifies signature, processes event, responds 2XX
```

---

## Webhook Request Headers

Twitch includes the following custom headers on every webhook POST request:

| Header | Description | Example |
|--------|-------------|---------|
| `Twitch-Eventsub-Message-Id` | Unique identifier for this message. Use for deduplication. | `befa7b53-d79d-478f-86b9-120f112b044e` |
| `Twitch-Eventsub-Message-Retry` | Number of times Twitch has retried this message. `0` on first attempt. | `0` |
| `Twitch-Eventsub-Message-Type` | The type of message: `webhook_callback_verification`, `notification`, or `revocation`. | `notification` |
| `Twitch-Eventsub-Message-Signature` | HMAC-SHA256 signature of the message. Format: `sha256=<hex_digest>`. | `sha256=ab12cd34...` |
| `Twitch-Eventsub-Message-Timestamp` | Timestamp of when Twitch sent the message. RFC 3339 with nanoseconds. | `2023-04-15T18:30:22.335256813Z` |
| `Twitch-Eventsub-Subscription-Type` | The subscription type for this message. | `channel.follow` |
| `Twitch-Eventsub-Subscription-Version` | The version of the subscription type. | `2` |

Standard HTTP headers are also included:

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json; charset=utf-8` |
| `User-Agent` | `TwitchBot/1.0` (may change; do not rely on this) |

---

## HMAC-SHA256 Signature Verification

Every webhook request from Twitch includes a signature in the `Twitch-Eventsub-Message-Signature` header. You **must** verify this signature to confirm the request genuinely came from Twitch and has not been tampered with.

### Step-by-Step

1. **Retrieve the secret** you provided when creating the subscription.

2. **Construct the HMAC message** by concatenating three values in this exact order (no separators):
   ```
   HMAC_message = message_id + message_timestamp + raw_request_body
   ```
   - `message_id` = value of `Twitch-Eventsub-Message-Id` header
   - `message_timestamp` = value of `Twitch-Eventsub-Message-Timestamp` header
   - `raw_request_body` = the complete raw HTTP request body as bytes (before any JSON parsing)

3. **Compute the HMAC-SHA256** digest using your secret as the key and the concatenated message as the data.

4. **Format the expected signature** as `sha256=<hex_digest>` (lowercase hex).

5. **Compare** the computed signature with the `Twitch-Eventsub-Message-Signature` header using a **constant-time comparison function** to prevent timing attacks.

6. **Reject** the request with a `403` status if the signatures do not match.

### Secret Requirements

- ASCII string
- Minimum 10 characters
- Maximum 100 characters
- You choose the secret when creating the subscription
- Use a cryptographically random string (e.g., 32+ hex characters)
- Each subscription can have a different secret, or you can reuse one across subscriptions

### Pseudocode

```
secret = "your_webhook_secret"
message_id = headers["Twitch-Eventsub-Message-Id"]
timestamp  = headers["Twitch-Eventsub-Message-Timestamp"]
body       = raw_request_body_bytes

hmac_message = message_id + timestamp + body
expected_sig = "sha256=" + HMAC_SHA256(secret, hmac_message).hex()
actual_sig   = headers["Twitch-Eventsub-Message-Signature"]

if NOT constant_time_equal(expected_sig, actual_sig):
    return 403 Forbidden
```

---

## Challenge/Response Verification Flow

When you create a new webhook subscription, Twitch immediately sends a verification request to your callback URL. You must respond correctly for the subscription to become active.

### How It Works

1. Twitch sends a POST request to your callback URL with:
   - `Twitch-Eventsub-Message-Type: webhook_callback_verification`
   - A JSON body containing a `challenge` field

2. Your server must:
   - **Verify the HMAC signature** (same process as for notifications)
   - **Respond with HTTP 2XX** (200 is standard)
   - **Return the challenge string** as the raw response body
   - Set `Content-Type: text/plain` (or return the raw string)

3. If you respond correctly within 10 seconds, the subscription status transitions to `enabled`.

4. If you fail to respond correctly, the subscription remains in `webhook_callback_verification_pending` and is eventually deleted.

### Verification Request Body

```json
{
  "challenge": "pogchamp-kappa-360noscope-vohiyo",
  "subscription": {
    "id": "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
    "type": "channel.follow",
    "version": "2",
    "status": "webhook_callback_verification_pending",
    "cost": 1,
    "condition": {
      "broadcaster_user_id": "12345",
      "moderator_user_id": "12345"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://example.com/webhooks/twitch"
    },
    "created_at": "2023-04-15T18:30:22.335256813Z"
  }
}
```

### Correct Response

```
HTTP/1.1 200 OK
Content-Type: text/plain

pogchamp-kappa-360noscope-vohiyo
```

The response body must contain **only** the challenge string, with no additional wrapping, no JSON encoding, no quotes.

---

## Notification Message Handling

Once a subscription is active, Twitch sends event notifications to your callback URL.

### Notification Headers

```
Twitch-Eventsub-Message-Type: notification
Twitch-Eventsub-Subscription-Type: channel.follow
Twitch-Eventsub-Subscription-Version: 2
```

### Notification Body Structure

```json
{
  "subscription": {
    "id": "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
    "type": "channel.follow",
    "version": "2",
    "status": "enabled",
    "cost": 1,
    "condition": {
      "broadcaster_user_id": "12345",
      "moderator_user_id": "12345"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://example.com/webhooks/twitch"
    },
    "created_at": "2023-04-15T18:30:22.335256813Z"
  },
  "event": {
    "user_id": "67890",
    "user_login": "cool_viewer",
    "user_name": "Cool_Viewer",
    "broadcaster_user_id": "12345",
    "broadcaster_user_login": "streamer_name",
    "broadcaster_user_name": "Streamer_Name",
    "followed_at": "2023-04-15T18:35:00.123456789Z"
  }
}
```

### Response Requirements

- **Respond with 2XX** (200, 202, 204 all work) within a few seconds.
- Twitch considers any non-2XX response (or a timeout) as a failure.
- After repeated failures, Twitch revokes the subscription with reason `notification_failures_exceeded`.
- Process the event asynchronously if your handler needs more than a few seconds. Acknowledge the webhook immediately, then queue the event for later processing.

### Retry Behavior

- Twitch retries failed deliveries with the same `Twitch-Eventsub-Message-Id`.
- The `Twitch-Eventsub-Message-Retry` header indicates how many retries have occurred.
- Retries use exponential backoff.
- EventSub provides **at-least-once delivery** -- the same notification may arrive multiple times.

---

## Revocation Message Handling

When Twitch revokes a subscription, it sends a final notification to your callback URL.

### Revocation Headers

```
Twitch-Eventsub-Message-Type: revocation
```

### Revocation Body Structure

```json
{
  "subscription": {
    "id": "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
    "type": "channel.follow",
    "version": "2",
    "status": "authorization_revoked",
    "cost": 0,
    "condition": {
      "broadcaster_user_id": "12345",
      "moderator_user_id": "12345"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://example.com/webhooks/twitch"
    },
    "created_at": "2023-04-15T18:30:22.335256813Z"
  }
}
```

### Revocation Reasons

| Status | Description |
|--------|-------------|
| `authorization_revoked` | The user revoked authorization for your app (disconnected in Twitch settings). |
| `user_removed` | The user in the subscription condition was deleted or banned. |
| `notification_failures_exceeded` | Too many consecutive delivery failures (non-2XX or timeouts). |
| `version_removed` | The subscription type version has been deprecated and removed by Twitch. |

### Handling Revocations

- Respond with 2XX (the revocation is informational; Twitch will revoke the subscription regardless).
- Log the revocation reason for debugging.
- For `authorization_revoked`: The user must re-authorize your app before you can resubscribe.
- For `notification_failures_exceeded`: Investigate your server health, then create a new subscription.
- For `version_removed`: Update your code to use the new version, then resubscribe.
- Remove the subscription from your local tracking/database.

---

## Replay Attack Prevention

To protect against replay attacks, validate the timestamp of each incoming message:

1. Parse the `Twitch-Eventsub-Message-Timestamp` header.
2. Compare it to the current server time.
3. **Reject** the message if the timestamp is older than **10 minutes**.

```
current_time = now()
message_time = parse_rfc3339(headers["Twitch-Eventsub-Message-Timestamp"])

if abs(current_time - message_time) > 10 minutes:
    return 403 Forbidden
```

### Why 10 Minutes

- Allows for reasonable network latency and Twitch retry delays.
- Prevents an attacker from capturing a valid webhook request and replaying it hours or days later.
- Twitch officially recommends the 10-minute window.

### Important

- Keep your server clock synchronized with NTP.
- Clock drift can cause legitimate messages to be rejected.

---

## Response Requirements Summary

| Message Type | Required Response | Body | Timeout |
|--------------|-------------------|------|---------|
| `webhook_callback_verification` | 2XX | The `challenge` string (plain text) | ~10 seconds |
| `notification` | 2XX | Empty or any (ignored by Twitch) | A few seconds |
| `revocation` | 2XX | Empty or any (ignored by Twitch) | A few seconds |

### Callback URL Requirements

- **Must use HTTPS** (TLS required)
- **Must be publicly accessible** from Twitch servers
- **Port 443** (standard HTTPS port)
- Must respond to POST requests
- Cannot be a localhost or private IP address
- URL path can be anything (e.g., `https://example.com/webhooks/twitch/eventsub`)

---

## Creating a Webhook Subscription

To subscribe to events via webhook, send a POST request to the EventSub subscriptions endpoint.

### Request

```bash
curl -X POST 'https://api.twitch.tv/helix/eventsub/subscriptions' \
  -H 'Authorization: Bearer APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "channel.follow",
    "version": "2",
    "condition": {
      "broadcaster_user_id": "12345",
      "moderator_user_id": "12345"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://example.com/webhooks/twitch",
      "secret": "s3cRe7_w3bH00k_sEcReT_x9k2m"
    }
  }'
```

### Transport Object Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `method` | string | Yes | Must be `"webhook"`. |
| `callback` | string | Yes | Your HTTPS callback URL. |
| `secret` | string | Yes | Your HMAC secret (10-100 ASCII characters). |

### Response (202 Accepted)

```json
{
  "data": [
    {
      "id": "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
      "status": "webhook_callback_verification_pending",
      "type": "channel.follow",
      "version": "2",
      "condition": {
        "broadcaster_user_id": "12345",
        "moderator_user_id": "12345"
      },
      "created_at": "2023-04-15T18:30:22.335256813Z",
      "transport": {
        "method": "webhook",
        "callback": "https://example.com/webhooks/twitch"
      },
      "cost": 1
    }
  ],
  "total": 1,
  "total_cost": 1,
  "max_total_cost": 10000
}
```

### Subscription Lifecycle

```
webhook_callback_verification_pending
        |
        +---> (verification succeeds) ---> enabled
        |
        +---> (verification fails) ---> subscription deleted

enabled
        |
        +---> (revocation event) ---> authorization_revoked
        |                             user_removed
        |                             notification_failures_exceeded
        |                             version_removed
```

### Authentication for Webhook Subscriptions

- Webhook subscriptions require an **app access token** (client credentials grant).
- Some subscription types additionally require a **user access token** with specific scopes. Check the documentation for each subscription type.
- The `Client-Id` header must match the token's client ID.

### Listing Active Subscriptions

```bash
curl -X GET 'https://api.twitch.tv/helix/eventsub/subscriptions' \
  -H 'Authorization: Bearer APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

Optional query parameters: `status`, `type`, `user_id`, `after` (pagination).

### Deleting a Subscription

```bash
curl -X DELETE 'https://api.twitch.tv/helix/eventsub/subscriptions?id=SUBSCRIPTION_ID' \
  -H 'Authorization: Bearer APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

Returns `204 No Content` on success.

---

## TypeScript Example (Express.js)

A complete webhook handler with signature verification, challenge response, notification dispatch, message deduplication, bot self-detection guard, and recursive trigger prevention.

```typescript
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = process.env.TWITCH_WEBHOOK_SECRET!; // 10-100 ASCII chars
const BOT_USER_ID = process.env.TWITCH_BOT_USER_ID!;       // Your bot's Twitch user ID
const PORT = process.env.PORT || 3000;

if (!WEBHOOK_SECRET || WEBHOOK_SECRET.length < 10) {
  throw new Error('TWITCH_WEBHOOK_SECRET must be at least 10 characters');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TwitchSubscription {
  id: string;
  type: string;
  version: string;
  status: string;
  cost: number;
  condition: Record<string, string>;
  transport: {
    method: string;
    callback: string;
  };
  created_at: string;
}

interface TwitchWebhookBody {
  challenge?: string;
  subscription: TwitchSubscription;
  event?: Record<string, any>;
}

type MessageType = 'webhook_callback_verification' | 'notification' | 'revocation';

// ---------------------------------------------------------------------------
// Deduplication Store
// ---------------------------------------------------------------------------

// In-memory store for processed message IDs.
// In production, use Redis or another shared store for multi-instance setups.
const processedMessageIds = new Map<string, number>(); // message_id -> timestamp

const DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isDuplicate(messageId: string): boolean {
  if (processedMessageIds.has(messageId)) {
    return true;
  }
  processedMessageIds.set(messageId, Date.now());
  return false;
}

// Periodically clean up old entries
setInterval(() => {
  const cutoff = Date.now() - DEDUP_WINDOW_MS;
  for (const [id, timestamp] of processedMessageIds) {
    if (timestamp < cutoff) {
      processedMessageIds.delete(id);
    }
  }
}, 60_000); // Clean every minute

// ---------------------------------------------------------------------------
// Recursive Trigger Prevention
// ---------------------------------------------------------------------------

// Track events currently being processed to prevent recursive loops.
// Example: handling a channel.update event that triggers another channel.update.
const activeEventProcessing = new Set<string>();

function getEventFingerprint(subscriptionType: string, event: Record<string, any>): string {
  // Create a fingerprint combining the event type and key identifiers
  const userId = event.user_id || event.broadcaster_user_id || '';
  return `${subscriptionType}:${userId}`;
}

// ---------------------------------------------------------------------------
// Signature Verification
// ---------------------------------------------------------------------------

function verifySignature(
  messageId: string,
  timestamp: string,
  rawBody: Buffer,
  expectedSignature: string
): boolean {
  const hmacMessage = Buffer.concat([
    Buffer.from(messageId, 'utf-8'),
    Buffer.from(timestamp, 'utf-8'),
    rawBody,
  ]);

  const computedHmac = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(hmacMessage)
    .digest('hex');

  const computedSignature = `sha256=${computedHmac}`;

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(computedSignature, 'utf-8'),
    Buffer.from(expectedSignature, 'utf-8')
  );
}

// ---------------------------------------------------------------------------
// Timestamp Validation (Replay Attack Prevention)
// ---------------------------------------------------------------------------

function isTimestampValid(timestamp: string): boolean {
  const messageTime = new Date(timestamp).getTime();
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  return Math.abs(now - messageTime) <= tenMinutes;
}

// ---------------------------------------------------------------------------
// Express App
// ---------------------------------------------------------------------------

const app = express();

// IMPORTANT: We need the raw body for HMAC verification.
// Use express.raw() for the webhook endpoint, not express.json().
app.post(
  '/webhooks/twitch',
  express.raw({ type: 'application/json' }),
  (req: Request, res: Response): void => {
    const messageId = req.headers['twitch-eventsub-message-id'] as string;
    const messageTimestamp = req.headers['twitch-eventsub-message-timestamp'] as string;
    const messageSignature = req.headers['twitch-eventsub-message-signature'] as string;
    const messageType = req.headers['twitch-eventsub-message-type'] as MessageType;

    // -----------------------------------------------------------------------
    // Step 1: Validate required headers
    // -----------------------------------------------------------------------
    if (!messageId || !messageTimestamp || !messageSignature || !messageType) {
      console.warn('[Webhook] Missing required Twitch headers');
      res.status(400).send('Missing required headers');
      return;
    }

    // -----------------------------------------------------------------------
    // Step 2: Replay attack prevention - check timestamp
    // -----------------------------------------------------------------------
    if (!isTimestampValid(messageTimestamp)) {
      console.warn(`[Webhook] Timestamp too old: ${messageTimestamp}`);
      res.status(403).send('Timestamp outside tolerance');
      return;
    }

    // -----------------------------------------------------------------------
    // Step 3: Verify HMAC-SHA256 signature
    // -----------------------------------------------------------------------
    const rawBody = req.body as Buffer;

    if (!verifySignature(messageId, messageTimestamp, rawBody, messageSignature)) {
      console.warn(`[Webhook] Invalid signature for message ${messageId}`);
      res.status(403).send('Invalid signature');
      return;
    }

    // -----------------------------------------------------------------------
    // Step 4: Parse body (signature verified, safe to parse)
    // -----------------------------------------------------------------------
    const body: TwitchWebhookBody = JSON.parse(rawBody.toString('utf-8'));

    // -----------------------------------------------------------------------
    // Step 5: Handle by message type
    // -----------------------------------------------------------------------

    switch (messageType) {
      // -------------------------------------------------------------------
      // Challenge/Response Verification
      // -------------------------------------------------------------------
      case 'webhook_callback_verification': {
        console.log(`[Webhook] Verification challenge for ${body.subscription.type}`);
        res.status(200).type('text/plain').send(body.challenge);
        return;
      }

      // -------------------------------------------------------------------
      // Event Notification
      // -------------------------------------------------------------------
      case 'notification': {
        // Deduplication: skip if we already processed this message
        if (isDuplicate(messageId)) {
          console.log(`[Webhook] Duplicate message ${messageId}, skipping`);
          res.status(200).send('OK');
          return;
        }

        const event = body.event!;
        const subscriptionType = body.subscription.type;

        // Bot self-detection: ignore events triggered by our own bot
        if (event.user_id === BOT_USER_ID) {
          console.log(`[Webhook] Ignoring self-triggered event (bot user_id: ${BOT_USER_ID})`);
          res.status(200).send('OK');
          return;
        }

        // Recursive trigger prevention
        const fingerprint = getEventFingerprint(subscriptionType, event);
        if (activeEventProcessing.has(fingerprint)) {
          console.warn(`[Webhook] Recursive trigger detected for ${fingerprint}, skipping`);
          res.status(200).send('OK');
          return;
        }

        // Mark as processing, respond immediately, then process async
        activeEventProcessing.add(fingerprint);
        res.status(200).send('OK');

        // Async processing
        handleNotification(subscriptionType, body.subscription, event)
          .catch((err) => console.error(`[Webhook] Error handling ${subscriptionType}:`, err))
          .finally(() => activeEventProcessing.delete(fingerprint));

        return;
      }

      // -------------------------------------------------------------------
      // Revocation
      // -------------------------------------------------------------------
      case 'revocation': {
        console.warn(
          `[Webhook] Subscription revoked: ${body.subscription.type} ` +
          `(reason: ${body.subscription.status}, id: ${body.subscription.id})`
        );
        handleRevocation(body.subscription);
        res.status(200).send('OK');
        return;
      }

      default: {
        console.warn(`[Webhook] Unknown message type: ${messageType}`);
        res.status(400).send('Unknown message type');
        return;
      }
    }
  }
);

// ---------------------------------------------------------------------------
// Event Handlers
// ---------------------------------------------------------------------------

async function handleNotification(
  type: string,
  subscription: TwitchSubscription,
  event: Record<string, any>
): Promise<void> {
  console.log(`[Webhook] Event: ${type}`, JSON.stringify(event, null, 2));

  switch (type) {
    case 'channel.follow':
      console.log(`New follower: ${event.user_name} followed ${event.broadcaster_user_name}`);
      break;

    case 'channel.subscribe':
      console.log(`New sub: ${event.user_name} (tier ${event.tier})`);
      break;

    case 'channel.subscription.gift':
      console.log(`Gift subs: ${event.user_name} gifted ${event.total} subs`);
      break;

    case 'channel.cheer':
      console.log(`Cheer: ${event.user_name} cheered ${event.bits} bits`);
      break;

    case 'channel.raid':
      console.log(`Raid: ${event.from_broadcaster_user_name} raided with ${event.viewers} viewers`);
      break;

    case 'stream.online':
      console.log(`Stream online: ${event.broadcaster_user_name}`);
      break;

    case 'stream.offline':
      console.log(`Stream offline: ${event.broadcaster_user_name}`);
      break;

    default:
      console.log(`Unhandled event type: ${type}`);
  }
}

function handleRevocation(subscription: TwitchSubscription): void {
  // Remove from your local tracking, re-subscribe if appropriate
  switch (subscription.status) {
    case 'authorization_revoked':
      console.log(`User revoked auth for ${subscription.type}. Need re-authorization.`);
      break;
    case 'notification_failures_exceeded':
      console.log(`Too many failures for ${subscription.type}. Check server health.`);
      // Consider auto-resubscribing after fixing the issue
      break;
    case 'user_removed':
      console.log(`User removed for ${subscription.type}. Clean up local data.`);
      break;
    case 'version_removed':
      console.log(`Version removed for ${subscription.type}. Update to new version.`);
      break;
  }
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[Server] Twitch EventSub webhook handler listening on port ${PORT}`);
});
```

### Key Implementation Notes (TypeScript)

1. **`express.raw()`** -- The webhook route uses `express.raw({ type: 'application/json' })` instead of `express.json()`. This is critical because HMAC verification requires the raw, unparsed body bytes. If you use `express.json()`, the body gets parsed and re-serialized, which can change whitespace and break the signature.

2. **`crypto.timingSafeEqual()`** -- Both buffers must be the same length. If the attacker sends a signature of a different length, `timingSafeEqual` will throw. Catch this or check lengths first.

3. **Respond before processing** -- The notification handler sends `200 OK` immediately, then processes the event asynchronously. This prevents Twitch from timing out while you do slow operations (database writes, API calls, etc.).

4. **Deduplication** -- The in-memory `Map` works for single-instance deployments. For multi-instance (load-balanced) setups, use Redis or a database to track processed message IDs.

---

## Python Example (Flask)

A complete webhook handler with the same features as the TypeScript example.

```python
import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timezone
from functools import wraps
from threading import Lock
from typing import Any

from flask import Flask, Response, abort, request

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

WEBHOOK_SECRET: str = os.environ["TWITCH_WEBHOOK_SECRET"]  # 10-100 ASCII chars
BOT_USER_ID: str = os.environ.get("TWITCH_BOT_USER_ID", "")
PORT: int = int(os.environ.get("PORT", "3000"))

if len(WEBHOOK_SECRET) < 10:
    raise ValueError("TWITCH_WEBHOOK_SECRET must be at least 10 characters")

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Deduplication Store
# ---------------------------------------------------------------------------

_processed_lock = Lock()
_processed_messages: dict[str, float] = {}  # message_id -> timestamp
DEDUP_WINDOW_SECONDS = 600  # 10 minutes


def _is_duplicate(message_id: str) -> bool:
    with _processed_lock:
        now = time.time()
        # Clean up old entries
        expired = [
            mid for mid, ts in _processed_messages.items()
            if now - ts > DEDUP_WINDOW_SECONDS
        ]
        for mid in expired:
            del _processed_messages[mid]

        if message_id in _processed_messages:
            return True
        _processed_messages[message_id] = now
        return False


# ---------------------------------------------------------------------------
# Recursive Trigger Prevention
# ---------------------------------------------------------------------------

_active_lock = Lock()
_active_events: set[str] = set()


def _get_event_fingerprint(subscription_type: str, event: dict[str, Any]) -> str:
    user_id = event.get("user_id") or event.get("broadcaster_user_id", "")
    return f"{subscription_type}:{user_id}"


# ---------------------------------------------------------------------------
# Signature Verification
# ---------------------------------------------------------------------------

def _verify_signature(
    message_id: str,
    timestamp: str,
    raw_body: bytes,
    expected_signature: str,
) -> bool:
    hmac_message = message_id.encode("utf-8") + timestamp.encode("utf-8") + raw_body
    computed_hash = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        hmac_message,
        hashlib.sha256,
    ).hexdigest()
    computed_signature = f"sha256={computed_hash}"

    # Constant-time comparison
    return hmac.compare_digest(computed_signature, expected_signature)


# ---------------------------------------------------------------------------
# Timestamp Validation (Replay Attack Prevention)
# ---------------------------------------------------------------------------

def _is_timestamp_valid(timestamp_str: str) -> bool:
    try:
        # Handle nanosecond precision by truncating to microseconds
        # RFC 3339 example: 2023-04-15T18:30:22.335256813Z
        ts = timestamp_str
        if "." in ts:
            # Split at dot, truncate fractional part to 6 digits (microseconds)
            base, frac = ts.split(".")
            frac_clean = frac.rstrip("Z")[:6].ljust(6, "0")
            ts = f"{base}.{frac_clean}+00:00"
        elif ts.endswith("Z"):
            ts = ts[:-1] + "+00:00"

        message_time = datetime.fromisoformat(ts)
        now = datetime.now(timezone.utc)
        diff = abs((now - message_time).total_seconds())
        return diff <= 600  # 10 minutes
    except (ValueError, TypeError):
        return False


# ---------------------------------------------------------------------------
# Webhook Endpoint
# ---------------------------------------------------------------------------

@app.route("/webhooks/twitch", methods=["POST"])
def handle_webhook() -> Response:
    # Step 1: Read headers
    message_id = request.headers.get("Twitch-Eventsub-Message-Id", "")
    message_timestamp = request.headers.get("Twitch-Eventsub-Message-Timestamp", "")
    message_signature = request.headers.get("Twitch-Eventsub-Message-Signature", "")
    message_type = request.headers.get("Twitch-Eventsub-Message-Type", "")

    if not all([message_id, message_timestamp, message_signature, message_type]):
        app.logger.warning("Missing required Twitch headers")
        abort(400, "Missing required headers")

    # Step 2: Replay attack prevention
    if not _is_timestamp_valid(message_timestamp):
        app.logger.warning("Timestamp too old: %s", message_timestamp)
        abort(403, "Timestamp outside tolerance")

    # Step 3: Verify HMAC-SHA256 signature
    raw_body: bytes = request.get_data()

    if not _verify_signature(message_id, message_timestamp, raw_body, message_signature):
        app.logger.warning("Invalid signature for message %s", message_id)
        abort(403, "Invalid signature")

    # Step 4: Parse body
    body: dict[str, Any] = json.loads(raw_body)

    # Step 5: Handle by message type
    # ---- Challenge/Response Verification ----
    if message_type == "webhook_callback_verification":
        challenge = body.get("challenge", "")
        sub_type = body.get("subscription", {}).get("type", "unknown")
        app.logger.info("Verification challenge for %s", sub_type)
        return Response(challenge, status=200, content_type="text/plain")

    # ---- Notification ----
    if message_type == "notification":
        # Deduplication
        if _is_duplicate(message_id):
            app.logger.info("Duplicate message %s, skipping", message_id)
            return Response("OK", status=200)

        event: dict[str, Any] = body.get("event", {})
        subscription: dict[str, Any] = body.get("subscription", {})
        subscription_type: str = subscription.get("type", "")

        # Bot self-detection
        if BOT_USER_ID and event.get("user_id") == BOT_USER_ID:
            app.logger.info("Ignoring self-triggered event (bot: %s)", BOT_USER_ID)
            return Response("OK", status=200)

        # Recursive trigger prevention
        fingerprint = _get_event_fingerprint(subscription_type, event)
        with _active_lock:
            if fingerprint in _active_events:
                app.logger.warning("Recursive trigger for %s, skipping", fingerprint)
                return Response("OK", status=200)
            _active_events.add(fingerprint)

        try:
            _handle_notification(subscription_type, subscription, event)
        except Exception:
            app.logger.exception("Error handling %s", subscription_type)
        finally:
            with _active_lock:
                _active_events.discard(fingerprint)

        return Response("OK", status=200)

    # ---- Revocation ----
    if message_type == "revocation":
        subscription = body.get("subscription", {})
        reason = subscription.get("status", "unknown")
        sub_type = subscription.get("type", "unknown")
        sub_id = subscription.get("id", "unknown")
        app.logger.warning(
            "Subscription revoked: %s (reason: %s, id: %s)", sub_type, reason, sub_id
        )
        _handle_revocation(subscription)
        return Response("OK", status=200)

    app.logger.warning("Unknown message type: %s", message_type)
    abort(400, "Unknown message type")


# ---------------------------------------------------------------------------
# Event Handlers
# ---------------------------------------------------------------------------

def _handle_notification(
    event_type: str,
    subscription: dict[str, Any],
    event: dict[str, Any],
) -> None:
    app.logger.info("Event: %s | %s", event_type, json.dumps(event))

    handlers: dict[str, Any] = {
        "channel.follow": lambda e: app.logger.info(
            "New follower: %s followed %s",
            e.get("user_name"),
            e.get("broadcaster_user_name"),
        ),
        "channel.subscribe": lambda e: app.logger.info(
            "New sub: %s (tier %s)", e.get("user_name"), e.get("tier")
        ),
        "channel.subscription.gift": lambda e: app.logger.info(
            "Gift subs: %s gifted %s subs", e.get("user_name"), e.get("total")
        ),
        "channel.cheer": lambda e: app.logger.info(
            "Cheer: %s cheered %s bits", e.get("user_name"), e.get("bits")
        ),
        "channel.raid": lambda e: app.logger.info(
            "Raid: %s with %s viewers",
            e.get("from_broadcaster_user_name"),
            e.get("viewers"),
        ),
        "stream.online": lambda e: app.logger.info(
            "Stream online: %s", e.get("broadcaster_user_name")
        ),
        "stream.offline": lambda e: app.logger.info(
            "Stream offline: %s", e.get("broadcaster_user_name")
        ),
    }

    handler = handlers.get(event_type)
    if handler:
        handler(event)
    else:
        app.logger.info("Unhandled event type: %s", event_type)


def _handle_revocation(subscription: dict[str, Any]) -> None:
    status = subscription.get("status", "")
    sub_type = subscription.get("type", "")

    messages = {
        "authorization_revoked": f"User revoked auth for {sub_type}. Need re-authorization.",
        "notification_failures_exceeded": f"Too many failures for {sub_type}. Check server health.",
        "user_removed": f"User removed for {sub_type}. Clean up local data.",
        "version_removed": f"Version removed for {sub_type}. Update to new version.",
    }
    app.logger.warning(messages.get(status, f"Unknown revocation: {status}"))


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health_check() -> Response:
    return Response(
        json.dumps({"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}),
        status=200,
        content_type="application/json",
    )


# ---------------------------------------------------------------------------
# Start Server
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=False)
```

### Key Implementation Notes (Python)

1. **`request.get_data()`** -- Flask's `request.get_data()` returns the raw bytes before any parsing. This is essential for HMAC verification. Do **not** use `request.json` until after verification.

2. **`hmac.compare_digest()`** -- Python's built-in constant-time comparison. Always use this instead of `==` for signature comparison.

3. **Nanosecond timestamps** -- Python's `datetime.fromisoformat()` does not handle nanosecond precision. The code truncates to microseconds (6 decimal digits).

4. **Threading** -- Flask's default development server is single-threaded. In production, use Gunicorn or uWSGI with multiple workers. The `_processed_messages` dict uses a lock but is per-process; for multi-process deployments, use Redis.

---

## Twitch CLI Testing

The Twitch CLI provides tools for testing your webhook handler locally without receiving real events from Twitch.

### Trigger a Mock Event

Send a simulated event notification to your local webhook handler:

```bash
# Basic follow event
twitch event trigger channel.follow \
  -F https://localhost:3000/webhooks/twitch \
  -s your_webhook_secret

# With specific user/broadcaster
twitch event trigger channel.subscribe \
  -F https://localhost:3000/webhooks/twitch \
  -s your_webhook_secret \
  -u 12345 \
  -t 67890

# Gift sub event
twitch event trigger channel.subscription.gift \
  -F https://localhost:3000/webhooks/twitch \
  -s your_webhook_secret

# Cheer event
twitch event trigger channel.cheer \
  -F https://localhost:3000/webhooks/twitch \
  -s your_webhook_secret

# Stream online
twitch event trigger stream.online \
  -F https://localhost:3000/webhooks/twitch \
  -s your_webhook_secret

# Raid event
twitch event trigger channel.raid \
  -F https://localhost:3000/webhooks/twitch \
  -s your_webhook_secret
```

### Common `twitch event trigger` Flags

| Flag | Description |
|------|-------------|
| `-F` / `--forward-address` | URL to send the mock event to. |
| `-s` / `--secret` | The webhook secret (for HMAC signature generation). |
| `-u` / `--from-user` | The triggering user's ID. |
| `-t` / `--to-user` | The broadcaster's user ID. |
| `--transport` | Transport method (`webhook` is the default for trigger). |
| `-v` / `--version` | Subscription type version. |

### Verify Subscription Challenge

Test that your handler correctly responds to the verification challenge:

```bash
twitch event verify-subscription channel.follow \
  -F https://localhost:3000/webhooks/twitch \
  -s your_webhook_secret
```

If your handler responds correctly, the CLI will report success. If not, it shows the error.

### Retrigger (Simulate Retry)

To test deduplication, trigger the same event twice with the same message ID:

```bash
# First delivery
twitch event trigger channel.follow \
  -F https://localhost:3000/webhooks/twitch \
  -s your_webhook_secret \
  --event-id "test-dedup-12345"

# Second delivery (same ID = duplicate)
twitch event trigger channel.follow \
  -F https://localhost:3000/webhooks/twitch \
  -s your_webhook_secret \
  --event-id "test-dedup-12345"
```

### Start a Local Mock EventSub Server

For more advanced testing, the CLI can run a local server that mimics Twitch EventSub:

```bash
twitch event websocket start-server
# Starts on ws://127.0.0.1:8080/ws
```

> **Note:** The mock WebSocket server is mainly for WebSocket transport testing, not webhooks. For webhook testing, use `twitch event trigger` and `twitch event verify-subscription`.

### Using ngrok for Live Testing

To test webhooks with actual Twitch subscriptions during development:

```bash
# Start ngrok tunnel
ngrok http 3000

# Use the HTTPS URL from ngrok as your callback
# e.g., https://abc123.ngrok-free.app/webhooks/twitch

# Create a real subscription pointing to the ngrok URL
curl -X POST 'https://api.twitch.tv/helix/eventsub/subscriptions' \
  -H 'Authorization: Bearer APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "stream.online",
    "version": "1",
    "condition": {
      "broadcaster_user_id": "12345"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://abc123.ngrok-free.app/webhooks/twitch",
      "secret": "your_webhook_secret"
    }
  }'
```

---

## Best Practices & Production Hardening

### Security

- **Generate strong secrets** -- Use at least 32 cryptographically random characters (e.g., `openssl rand -hex 32`).
- **Never log secrets** -- Exclude webhook secrets and tokens from logs.
- **Always verify signatures** -- Never skip HMAC verification, even in development (use the Twitch CLI to generate valid signatures).
- **Constant-time comparison** -- Always use `crypto.timingSafeEqual()` (Node.js) or `hmac.compare_digest()` (Python). A regular `===` or `==` comparison leaks timing information.
- **Validate timestamps** -- Reject messages older than 10 minutes to prevent replay attacks.
- **Use environment variables** -- Store `WEBHOOK_SECRET`, `CLIENT_ID`, and `CLIENT_SECRET` in environment variables or a secret manager. Never hardcode them.

### Reliability

- **Respond fast** -- Acknowledge webhooks with 2XX as quickly as possible. Process events asynchronously (queue-based architecture: webhook handler writes to a queue, separate workers process events).
- **Implement deduplication** -- EventSub uses at-least-once delivery. Use `Twitch-Eventsub-Message-Id` as a dedup key. Store processed IDs in Redis or a database with a TTL of at least 10 minutes.
- **Handle retries gracefully** -- The same event may arrive multiple times with the same `Twitch-Eventsub-Message-Id`. Your handler must be idempotent.
- **Monitor subscription health** -- Periodically list your subscriptions (`GET /helix/eventsub/subscriptions`) and check for revoked or failed ones. Re-create as needed.
- **Handle revocations** -- Log and alert on revocations. Automatically resubscribe for `notification_failures_exceeded` after fixing the root cause.

### Performance

- **Async event processing** -- Do not block the webhook handler with slow operations. Respond 200 immediately, then process the event in a background worker or queue.
- **Connection pooling** -- If your event handler makes outbound API calls (e.g., to Twitch Helix), use persistent HTTP connections.
- **Rate limit awareness** -- Creating subscriptions has a cost-based limit (max_total_cost of 10,000). Monitor your usage.

### Architecture

- **Queue-based processing** -- For high-volume channels, use a message queue (Redis, RabbitMQ, SQS) between the webhook receiver and event processors.
- **Health endpoint** -- Expose a `/health` endpoint for load balancers and monitoring.
- **Graceful shutdown** -- Handle SIGTERM to finish processing in-flight events before shutting down.
- **Multi-instance dedup** -- If running behind a load balancer with multiple instances, use a shared store (Redis) for message deduplication.

### Self-Detection and Loop Prevention

- **Bot user ID check** -- If your application triggers Twitch API calls in response to events (e.g., sending a chat message when someone follows), always check if the `user_id` in the event matches your bot's user ID. Skip processing if it does.
- **Recursive trigger guard** -- If handling an event can trigger another event of the same type (e.g., updating channel info in response to a channel.update event), implement a guard to prevent infinite loops.

---

## Known Issues & Community Notes

- **Duplicate deliveries are common** -- Even without retries, developers report occasional duplicate messages. Always implement deduplication by `Twitch-Eventsub-Message-Id`.
- **Verification timeout** -- Twitch gives approximately 10 seconds for the challenge response. If your server has high cold-start latency (e.g., serverless functions), the first verification may fail. Warm up your endpoint before creating subscriptions.
- **Body encoding** -- The raw body must be used byte-for-byte for HMAC computation. Middleware that parses or re-encodes JSON (adding/removing whitespace) will break verification. This is the most common implementation bug.
- **Subscription cost limits** -- Webhook subscriptions have a cost (typically 1 per subscription). The total cost across all your subscriptions cannot exceed 10,000. Check `max_total_cost` in the creation response.
- **Secret not returned** -- Once you create a subscription with a secret, Twitch never returns the secret in any API response. Store it securely at creation time.
- **Subscription cleanup** -- Twitch does not automatically delete subscriptions when your callback URL goes offline. Old subscriptions accumulate and count toward your cost limit. Periodically audit and delete unused subscriptions.
- **IPv6 considerations** -- Twitch may send webhooks from IPv6 addresses. Ensure your server and firewall accept IPv6 traffic.
- **TLS requirements** -- The callback URL must use TLS 1.2 or higher. Self-signed certificates are not accepted.
- **ngrok free tier** -- The ngrok free tier generates a new URL on each restart. This means you must delete and re-create subscriptions. Use a stable ngrok URL (paid) or a custom domain for development.
- **PubSub deprecated** -- PubSub was fully decommissioned on April 14, 2025. All functionality has been migrated to EventSub. Use EventSub for all new development.

---

## Quick Reference Table

| Item | Value |
|------|-------|
| Create subscription | `POST https://api.twitch.tv/helix/eventsub/subscriptions` |
| List subscriptions | `GET https://api.twitch.tv/helix/eventsub/subscriptions` |
| Delete subscription | `DELETE https://api.twitch.tv/helix/eventsub/subscriptions?id=ID` |
| Transport method | `"webhook"` |
| Callback URL scheme | HTTPS only, port 443 |
| Secret length | 10-100 ASCII characters |
| Signature algorithm | HMAC-SHA256 |
| Signature header | `Twitch-Eventsub-Message-Signature` |
| Signature format | `sha256=<lowercase_hex_digest>` |
| HMAC message | `message_id + timestamp + raw_body` |
| Timestamp tolerance | 10 minutes |
| Verification response | 2XX with challenge string as plain text body |
| Notification response | 2XX (any body, ignored) |
| Max total cost | 10,000 per client ID |
| Delivery guarantee | At-least-once |
| Retry behavior | Exponential backoff with same message ID |
| CLI test event | `twitch event trigger <type> -F <url> -s <secret>` |
| CLI verify challenge | `twitch event verify-subscription <type> -F <url> -s <secret>` |
| Revocation reasons | `authorization_revoked`, `user_removed`, `notification_failures_exceeded`, `version_removed` |
