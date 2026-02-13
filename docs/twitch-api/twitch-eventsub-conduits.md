# Twitch API — EventSub Conduits

> **Source:** https://dev.twitch.tv/docs/eventsub/handling-conduit-events/
> **API Reference:** https://dev.twitch.tv/docs/api/reference/#create-conduits
> **Last verified:** 2025-05
> **File 6 of 18 in the Twitch API documentation series**

---

## Table of Contents

1. [Overview](#overview)
2. [When to Use Conduits](#when-to-use-conduits)
3. [Core Concepts](#core-concepts)
4. [Conduit Lifecycle](#conduit-lifecycle)
5. [Conduit Endpoints](#conduit-endpoints)
   - [Create Conduit](#1-create-conduit)
   - [Get Conduits](#2-get-conduits)
   - [Update Conduit](#3-update-conduit)
   - [Delete Conduit](#4-delete-conduit)
   - [Get Conduit Shards](#5-get-conduit-shards)
   - [Update Conduit Shards](#6-update-conduit-shards)
6. [Shard Health Monitoring](#shard-health-monitoring)
7. [Load Balancing Patterns](#load-balancing-patterns)
8. [Scaling Up and Down](#scaling-up-and-down)
9. [Recovery from Outages](#recovery-from-outages)
10. [conduit.shard.disabled EventSub Type](#conduitsharddisabled-eventsub-type)
11. [Creating Subscriptions with Conduit Transport](#creating-subscriptions-with-conduit-transport)
12. [Best Practices & Production Hardening](#best-practices--production-hardening)
13. [Known Issues & Community Notes](#known-issues--community-notes)
14. [Quick Reference Table](#quick-reference-table)

---

## Overview

EventSub Conduits are a **wrapper transport type** that enables load balancing of EventSub notifications across multiple WebSocket connections or webhook endpoints. Each endpoint within a conduit is called a **shard**. Twitch uses a hashing mechanism (based on channel ID or other subscription-specific identifiers) to deterministically route notifications to a specific shard, ensuring that all events for a particular channel consistently arrive at the same endpoint.

Without conduits, scaling EventSub has hard limits:
- **3 WebSocket connections** per user token
- **300 subscriptions** per WebSocket connection
- No built-in failover or load distribution

Conduits remove these bottlenecks by presenting a single logical transport to Twitch while fanning out to up to **20,000 shards** behind the scenes.

### Architecture Overview

```
                         +---------------------------+
                         |     Twitch EventSub       |
                         |   (Subscription Router)   |
                         +------------+--------------+
                                      |
                              Conduit (logical)
                                      |
                    +-----------------+-----------------+
                    |                 |                 |
              Shard 0            Shard 1           Shard 2
           (WebSocket)        (WebSocket)        (Webhook)
                |                 |                 |
           App Server A      App Server B      App Server C
```

---

## When to Use Conduits

| Scenario | Use Conduit? | Reason |
|----------|:---:|--------|
| Small bot (< 100 channels) | Optional | Single WebSocket may suffice, but a 2-shard conduit adds resilience |
| Medium service (100-5,000 channels) | **Yes** | Distribute load, enable rolling restarts |
| Large platform (5,000+ channels) | **Required** | Raw WebSocket limits are insufficient |
| Webhook-only architecture | **Yes** | Load balance across webhook receivers |
| Mixed WebSocket + webhook | **Yes** | Conduit shards can mix transport types |
| Single-user personal bot | No | Direct WebSocket is simpler |

---

## Core Concepts

### Conduit
A logical container that groups multiple transport endpoints (shards) into a single addressable transport. When creating EventSub subscriptions, you reference the conduit ID rather than an individual WebSocket session or webhook URL.

### Shard
An individual transport endpoint within a conduit. Each shard has:
- **Shard ID** — Integer index (0-based), assigned by Twitch
- **Transport** — Either a WebSocket session or a webhook callback URL
- **Status** — `enabled`, `webhook_callback_verification_pending`, `webhook_callback_verification_failed`, or `disabled`

### Hashing / Routing
Twitch deterministically assigns subscriptions to shards. For channel-scoped subscriptions, the broadcaster's user ID is hashed to select a shard. This means:
- All events for a given channel go to the **same** shard
- Changing shard count redistributes assignments
- You cannot manually pin a subscription to a specific shard

### Limits

| Limit | Value |
|-------|-------|
| Max enabled conduits per client ID | **5** |
| Max shards per conduit | **20,000** (subject to change) |
| Conduit grace period (all shards disabled) | **72 hours** |
| WebSocket keepalive timeout | **10 seconds** (unchanged) |

---

## Conduit Lifecycle

The full lifecycle of a conduit from creation to active use follows these steps:

```
Step 1: Create Conduit
   POST /eventsub/conduits
   { "shard_count": 3 }
         |
         v
   Conduit created with ID, 3 unassigned shards
         |
Step 2: Assign Transports to Shards
   PATCH /eventsub/conduits/shards
   { "conduit_id": "...", "shards": [...] }
         |
         v
   Each shard gets a WebSocket session_id or webhook callback
         |
Step 3: Verify Shards
   - WebSocket: Shard becomes enabled once session connects
   - Webhook: Twitch sends verification challenge to callback URL
         |
         v
   All shards report status: "enabled"
         |
Step 4: Create Subscriptions
   POST /eventsub/subscriptions
   { "transport": { "method": "conduit", "conduit_id": "..." } }
         |
         v
   Twitch hashes subscription -> assigns to a shard
         |
Step 5: Receive Notifications
   Events arrive at the assigned shard's transport
         |
Step 6: (Optional) Scale / Update
   PATCH /eventsub/conduits (change shard_count)
   PATCH /eventsub/conduits/shards (reassign transports)
         |
Step 7: (Optional) Delete
   DELETE /eventsub/conduits?id=...
   All subscriptions using this conduit are also deleted
```

### Detailed Lifecycle Diagram

```
 [App Starts]
      |
      v
 Create Conduit (shard_count=N)
      |
      v
 For each shard 0..N-1:
      |
      +---> WebSocket path:
      |       1. Connect to wss://eventsub.wss.twitch.tv/ws
      |       2. Receive welcome message with session_id
      |       3. PATCH shard with session_id
      |       4. Shard status -> "enabled"
      |
      +---> Webhook path:
              1. PATCH shard with callback URL + secret
              2. Twitch sends POST to callback with challenge
              3. App responds with challenge value
              4. Shard status -> "enabled"
      |
      v
 Create EventSub subscriptions referencing conduit_id
      |
      v
 [Running — events flow to shards]
      |
      +---> Shard disconnect/failure:
      |       - Status -> "disabled"
      |       - conduit.shard.disabled event fires
      |       - Reconnect and reassign transport
      |
      +---> Scale up:
      |       - PATCH conduit with higher shard_count
      |       - Assign transports to new shards
      |
      +---> Scale down:
      |       - PATCH conduit with lower shard_count
      |       - Higher-numbered shards are removed
      |       - Subscriptions redistribute
      |
      v
 [Shutdown]
      |
      v
 DELETE conduit (cleans up all subscriptions)
```

---

## Conduit Endpoints

### 1. Create Conduit

Creates a new conduit. Shards are created in an unassigned state and must be configured with transports before they can receive events.

**Endpoint:** `POST https://api.twitch.tv/helix/eventsub/conduits`

**Authentication:** App Access Token (required)

**Required Scope:** None (app access token is sufficient)

#### Request Body

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `shard_count` | integer | Yes | Number of shards to create (1 to 20,000) |

#### Response Body (200 OK)

```json
{
  "data": [
    {
      "id": "bfcfc993-26b1-b876-44d9-afe75a379dac",
      "shard_count": 3
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique conduit identifier (UUID) |
| `shard_count` | integer | Number of shards in the conduit |

#### Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Invalid `shard_count` (must be >= 1) |
| 401 | Invalid or missing App Access Token |
| 403 | Conduit limit reached (max 5 enabled conduits) |

#### cURL Example

```bash
curl -X POST 'https://api.twitch.tv/helix/eventsub/conduits' \
  -H 'Authorization: Bearer YOUR_APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "shard_count": 3
  }'
```

#### JavaScript Example

```javascript
async function createConduit(shardCount) {
  const response = await fetch('https://api.twitch.tv/helix/eventsub/conduits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${APP_ACCESS_TOKEN}`,
      'Client-Id': CLIENT_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ shard_count: shardCount })
  });

  const data = await response.json();
  return data.data[0]; // { id, shard_count }
}
```

---

### 2. Get Conduits

Lists all conduits owned by the authenticated application.

**Endpoint:** `GET https://api.twitch.tv/helix/eventsub/conduits`

**Authentication:** App Access Token (required)

**Required Scope:** None

#### Request Parameters

None.

#### Response Body (200 OK)

```json
{
  "data": [
    {
      "id": "bfcfc993-26b1-b876-44d9-afe75a379dac",
      "shard_count": 3
    },
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "shard_count": 10
    }
  ]
}
```

#### Error Responses

| Status | Meaning |
|--------|---------|
| 401 | Invalid or missing App Access Token |

#### cURL Example

```bash
curl -X GET 'https://api.twitch.tv/helix/eventsub/conduits' \
  -H 'Authorization: Bearer YOUR_APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

#### JavaScript Example

```javascript
async function getConduits() {
  const response = await fetch('https://api.twitch.tv/helix/eventsub/conduits', {
    headers: {
      'Authorization': `Bearer ${APP_ACCESS_TOKEN}`,
      'Client-Id': CLIENT_ID
    }
  });

  const data = await response.json();
  return data.data; // Array of { id, shard_count }
}
```

---

### 3. Update Conduit

Updates the shard count for an existing conduit. Increasing the count adds new unassigned shards. Decreasing the count removes the highest-numbered shards and redistributes their subscriptions.

**Endpoint:** `PATCH https://api.twitch.tv/helix/eventsub/conduits`

**Authentication:** App Access Token (required)

**Required Scope:** None

#### Request Body

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | string | Yes | Conduit ID to update |
| `shard_count` | integer | Yes | New shard count (1 to 20,000) |

#### Response Body (200 OK)

```json
{
  "data": [
    {
      "id": "bfcfc993-26b1-b876-44d9-afe75a379dac",
      "shard_count": 5
    }
  ]
}
```

#### Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Invalid `shard_count` or missing `id` |
| 401 | Invalid or missing App Access Token |
| 404 | Conduit not found |

#### cURL Example

```bash
# Scale from 3 shards to 5
curl -X PATCH 'https://api.twitch.tv/helix/eventsub/conduits' \
  -H 'Authorization: Bearer YOUR_APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "bfcfc993-26b1-b876-44d9-afe75a379dac",
    "shard_count": 5
  }'
```

#### JavaScript Example

```javascript
async function updateConduitShardCount(conduitId, newShardCount) {
  const response = await fetch('https://api.twitch.tv/helix/eventsub/conduits', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${APP_ACCESS_TOKEN}`,
      'Client-Id': CLIENT_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: conduitId,
      shard_count: newShardCount
    })
  });

  const data = await response.json();
  return data.data[0];
}
```

---

### 4. Delete Conduit

Deletes a conduit and **all EventSub subscriptions** associated with it. This action is irreversible.

**Endpoint:** `DELETE https://api.twitch.tv/helix/eventsub/conduits`

**Authentication:** App Access Token (required)

**Required Scope:** None

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | string | Yes | Conduit ID to delete |

#### Response (204 No Content)

Empty body on success.

#### Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Missing `id` parameter |
| 401 | Invalid or missing App Access Token |
| 404 | Conduit not found |

#### cURL Example

```bash
curl -X DELETE 'https://api.twitch.tv/helix/eventsub/conduits?id=bfcfc993-26b1-b876-44d9-afe75a379dac' \
  -H 'Authorization: Bearer YOUR_APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

#### JavaScript Example

```javascript
async function deleteConduit(conduitId) {
  const response = await fetch(
    `https://api.twitch.tv/helix/eventsub/conduits?id=${conduitId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${APP_ACCESS_TOKEN}`,
        'Client-Id': CLIENT_ID
      }
    }
  );

  return response.status === 204; // true if deleted successfully
}
```

---

### 5. Get Conduit Shards

Lists shards for a specific conduit. Supports pagination and optional filtering by shard status.

**Endpoint:** `GET https://api.twitch.tv/helix/eventsub/conduits/shards`

**Authentication:** App Access Token (required)

**Required Scope:** None

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `conduit_id` | string | Yes | Conduit ID to query shards for |
| `status` | string | No | Filter by shard status: `enabled`, `webhook_callback_verification_pending`, `webhook_callback_verification_failed`, `disabled` |
| `after` | string | No | Pagination cursor for next page of results |

#### Response Body (200 OK)

```json
{
  "data": [
    {
      "id": "0",
      "status": "enabled",
      "transport": {
        "method": "websocket",
        "session_id": "ad1c9fc3-0d99-4eb7-8a04-8608e8f9e2d1",
        "connected_at": "2023-10-01T14:22:35.106Z"
      }
    },
    {
      "id": "1",
      "status": "enabled",
      "transport": {
        "method": "webhook",
        "callback": "https://example.com/eventsub/shard1"
      }
    },
    {
      "id": "2",
      "status": "disabled",
      "transport": {
        "method": "websocket",
        "session_id": null,
        "connected_at": null,
        "disconnected_at": "2023-10-01T15:00:00.000Z"
      }
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjoiMiJ9"
  }
}
```

#### Shard Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Shard index (numeric string: "0", "1", "2", ...) |
| `status` | string | Current shard status |
| `transport` | object | Transport configuration for this shard |

#### Transport Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `method` | string | `"websocket"` or `"webhook"` |
| `session_id` | string | WebSocket session ID (WebSocket only) |
| `connected_at` | string | ISO 8601 timestamp of connection (WebSocket only) |
| `disconnected_at` | string | ISO 8601 timestamp of disconnection (WebSocket only, if disconnected) |
| `callback` | string | Webhook callback URL (webhook only) |

#### Shard Status Values

| Status | Description |
|--------|-------------|
| `enabled` | Shard is active and receiving events |
| `webhook_callback_verification_pending` | Webhook challenge has been sent, awaiting response |
| `webhook_callback_verification_failed` | Webhook challenge was not answered correctly |
| `disabled` | Shard is inactive (WebSocket disconnected, or not yet assigned) |

#### Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Missing `conduit_id` or invalid `status` filter |
| 401 | Invalid or missing App Access Token |
| 404 | Conduit not found |

#### cURL Example

```bash
# Get all shards
curl -X GET 'https://api.twitch.tv/helix/eventsub/conduits/shards?conduit_id=bfcfc993-26b1-b876-44d9-afe75a379dac' \
  -H 'Authorization: Bearer YOUR_APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Get only disabled shards
curl -X GET 'https://api.twitch.tv/helix/eventsub/conduits/shards?conduit_id=bfcfc993-26b1-b876-44d9-afe75a379dac&status=disabled' \
  -H 'Authorization: Bearer YOUR_APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

#### JavaScript Example

```javascript
async function getConduitShards(conduitId, { status, after } = {}) {
  const params = new URLSearchParams({ conduit_id: conduitId });
  if (status) params.set('status', status);
  if (after) params.set('after', after);

  const response = await fetch(
    `https://api.twitch.tv/helix/eventsub/conduits/shards?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${APP_ACCESS_TOKEN}`,
        'Client-Id': CLIENT_ID
      }
    }
  );

  return await response.json();
}

// Get all shards with pagination
async function getAllShards(conduitId) {
  const allShards = [];
  let cursor = null;

  do {
    const result = await getConduitShards(conduitId, { after: cursor });
    allShards.push(...result.data);
    cursor = result.pagination?.cursor || null;
  } while (cursor);

  return allShards;
}
```

---

### 6. Update Conduit Shards

Assigns or reassigns transport endpoints to specific shards within a conduit. You can update multiple shards in a single request.

**Endpoint:** `PATCH https://api.twitch.tv/helix/eventsub/conduits/shards`

**Authentication:** App Access Token (required)

**Required Scope:** None

#### Request Body

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `conduit_id` | string | Yes | Conduit ID containing the shards |
| `shards` | array | Yes | Array of shard update objects |

#### Shard Update Object

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | string | Yes | Shard ID (numeric string) to update |
| `transport` | object | Yes | New transport configuration |

#### Transport Object (Request)

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `method` | string | Yes | `"websocket"` or `"webhook"` |
| `session_id` | string | Conditional | WebSocket session ID (required when `method` is `"websocket"`) |
| `callback` | string | Conditional | Webhook URL (required when `method` is `"webhook"`) |
| `secret` | string | Conditional | Webhook secret for HMAC verification (required when `method` is `"webhook"`, 10-100 characters) |

#### Response Body (202 Accepted)

```json
{
  "data": [
    {
      "id": "0",
      "status": "enabled",
      "transport": {
        "method": "websocket",
        "session_id": "ad1c9fc3-0d99-4eb7-8a04-8608e8f9e2d1",
        "connected_at": "2023-10-01T14:22:35.106Z"
      }
    }
  ],
  "errors": []
}
```

When some shards succeed and others fail, the response includes both:

```json
{
  "data": [
    {
      "id": "0",
      "status": "enabled",
      "transport": {
        "method": "websocket",
        "session_id": "ad1c9fc3-0d99-4eb7-8a04-8608e8f9e2d1",
        "connected_at": "2023-10-01T14:22:35.106Z"
      }
    }
  ],
  "errors": [
    {
      "id": "1",
      "message": "invalid transport session id",
      "status": "invalid"
    }
  ]
}
```

#### Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Invalid request body, missing required fields |
| 401 | Invalid or missing App Access Token |
| 404 | Conduit not found or shard ID out of range |

#### cURL Examples

**Assign a WebSocket transport to shard 0:**

```bash
curl -X PATCH 'https://api.twitch.tv/helix/eventsub/conduits/shards' \
  -H 'Authorization: Bearer YOUR_APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "conduit_id": "bfcfc993-26b1-b876-44d9-afe75a379dac",
    "shards": [
      {
        "id": "0",
        "transport": {
          "method": "websocket",
          "session_id": "ad1c9fc3-0d99-4eb7-8a04-8608e8f9e2d1"
        }
      }
    ]
  }'
```

**Assign a webhook transport to shard 1:**

```bash
curl -X PATCH 'https://api.twitch.tv/helix/eventsub/conduits/shards' \
  -H 'Authorization: Bearer YOUR_APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "conduit_id": "bfcfc993-26b1-b876-44d9-afe75a379dac",
    "shards": [
      {
        "id": "1",
        "transport": {
          "method": "webhook",
          "callback": "https://example.com/eventsub/shard1",
          "secret": "s3cR3t_k3y_f0r_hmac_v3rification"
        }
      }
    ]
  }'
```

**Update multiple shards at once:**

```bash
curl -X PATCH 'https://api.twitch.tv/helix/eventsub/conduits/shards' \
  -H 'Authorization: Bearer YOUR_APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "conduit_id": "bfcfc993-26b1-b876-44d9-afe75a379dac",
    "shards": [
      {
        "id": "0",
        "transport": {
          "method": "websocket",
          "session_id": "session-aaa-111"
        }
      },
      {
        "id": "1",
        "transport": {
          "method": "websocket",
          "session_id": "session-bbb-222"
        }
      },
      {
        "id": "2",
        "transport": {
          "method": "webhook",
          "callback": "https://example.com/eventsub/shard2",
          "secret": "another_s3cR3t_k3y"
        }
      }
    ]
  }'
```

#### JavaScript Example

```javascript
async function updateConduitShards(conduitId, shards) {
  const response = await fetch(
    'https://api.twitch.tv/helix/eventsub/conduits/shards',
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${APP_ACCESS_TOKEN}`,
        'Client-Id': CLIENT_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conduit_id: conduitId,
        shards: shards
      })
    }
  );

  const result = await response.json();

  if (result.errors && result.errors.length > 0) {
    console.error('Some shards failed to update:', result.errors);
  }

  return result;
}

// Example: assign WebSocket session to shard 0
await updateConduitShards('bfcfc993-26b1-b876-44d9-afe75a379dac', [
  {
    id: '0',
    transport: {
      method: 'websocket',
      session_id: 'ad1c9fc3-0d99-4eb7-8a04-8608e8f9e2d1'
    }
  }
]);
```

---

## Shard Health Monitoring

Monitoring shard health is critical for ensuring no events are dropped. There are two complementary approaches.

### Polling Shard Status

Periodically call the Get Conduit Shards endpoint and check for non-`enabled` statuses:

```javascript
async function monitorShardHealth(conduitId, intervalMs = 30000) {
  setInterval(async () => {
    const disabledShards = await getConduitShards(conduitId, {
      status: 'disabled'
    });

    if (disabledShards.data.length > 0) {
      console.warn(
        `${disabledShards.data.length} shard(s) disabled:`,
        disabledShards.data.map(s => s.id)
      );

      for (const shard of disabledShards.data) {
        await recoverShard(conduitId, shard.id);
      }
    }
  }, intervalMs);
}
```

### Subscribing to conduit.shard.disabled

Subscribe to the `conduit.shard.disabled` EventSub type to receive real-time notifications when a shard goes down. See the [dedicated section](#conduitsharddisabled-eventsub-type) below.

### Health Dashboard Pattern

```javascript
async function getConduitHealthReport(conduitId) {
  const allShards = await getAllShards(conduitId);

  const report = {
    total: allShards.length,
    enabled: 0,
    disabled: 0,
    pending: 0,
    failed: 0,
    shardDetails: []
  };

  for (const shard of allShards) {
    switch (shard.status) {
      case 'enabled':
        report.enabled++;
        break;
      case 'disabled':
        report.disabled++;
        break;
      case 'webhook_callback_verification_pending':
        report.pending++;
        break;
      case 'webhook_callback_verification_failed':
        report.failed++;
        break;
    }

    report.shardDetails.push({
      id: shard.id,
      status: shard.status,
      method: shard.transport.method,
      connectedAt: shard.transport.connected_at || null,
      disconnectedAt: shard.transport.disconnected_at || null
    });
  }

  report.healthPercent = Math.round((report.enabled / report.total) * 100);
  return report;
}
```

---

## Load Balancing Patterns

### Pattern 1: Active-Active (Recommended)

All shards actively receive events. This is the default behavior.

```
Conduit (shard_count = 3)
  Shard 0: WebSocket -> Server A (handles channels hashing to 0)
  Shard 1: WebSocket -> Server B (handles channels hashing to 1)
  Shard 2: WebSocket -> Server C (handles channels hashing to 2)
```

**Setup:**

```javascript
// Create conduit with 3 shards
const conduit = await createConduit(3);

// Connect 3 WebSocket sessions (one per server)
const sessions = await Promise.all([
  connectWebSocket(), // Server A
  connectWebSocket(), // Server B
  connectWebSocket(), // Server C
]);

// Assign each session to a shard
await updateConduitShards(conduit.id, [
  { id: '0', transport: { method: 'websocket', session_id: sessions[0].id } },
  { id: '1', transport: { method: 'websocket', session_id: sessions[1].id } },
  { id: '2', transport: { method: 'websocket', session_id: sessions[2].id } },
]);
```

### Pattern 2: Active-Standby

One primary shard handles all events; a second shard serves as a hot standby that is ready to take over.

```
Conduit (shard_count = 2)
  Shard 0: WebSocket -> Primary Server (active, receives all events)
  Shard 1: WebSocket -> Standby Server (connected but idle)
```

Note: With only 2 shards, Twitch will hash and distribute events across both. For true active-standby with a single shard handling everything, use `shard_count = 1` and have a recovery mechanism ready to reassign the shard on failure.

### Pattern 3: Mixed Transport

Combine WebSocket shards (for low-latency, real-time processing) with webhook shards (for reliable, server-side processing).

```
Conduit (shard_count = 3)
  Shard 0: WebSocket -> Real-time processing server
  Shard 1: WebSocket -> Real-time processing server
  Shard 2: Webhook   -> Batch processing / logging server
```

### Pattern 4: Geographic Distribution

Place shards in different regions for reduced latency:

```
Conduit (shard_count = 3)
  Shard 0: Webhook -> https://us-east.example.com/eventsub
  Shard 1: Webhook -> https://eu-west.example.com/eventsub
  Shard 2: Webhook -> https://ap-southeast.example.com/eventsub
```

---

## Scaling Up and Down

### Scaling Up

When you need more capacity, increase the shard count and assign transports to the new shards.

```javascript
async function scaleUp(conduitId, currentCount, additionalShards) {
  const newCount = currentCount + additionalShards;

  // Step 1: Update the conduit's shard count
  await updateConduitShardCount(conduitId, newCount);

  // Step 2: Connect new WebSocket sessions for the new shards
  const newShards = [];
  for (let i = currentCount; i < newCount; i++) {
    const session = await connectWebSocket();
    newShards.push({
      id: String(i),
      transport: {
        method: 'websocket',
        session_id: session.id
      }
    });
  }

  // Step 3: Assign transports to new shards
  await updateConduitShards(conduitId, newShards);

  console.log(`Scaled up from ${currentCount} to ${newCount} shards`);
}
```

**Important:** When shard count increases, Twitch redistributes existing subscriptions across all shards (including the new ones). Events for some channels will start arriving at different shards.

### Scaling Down

Reducing the shard count removes the highest-numbered shards. Their subscriptions are automatically redistributed to the remaining shards.

```javascript
async function scaleDown(conduitId, currentCount, removeCount) {
  const newCount = currentCount - removeCount;

  if (newCount < 1) {
    throw new Error('Cannot scale below 1 shard');
  }

  // Shards from newCount to currentCount-1 will be removed
  // Their subscriptions are redistributed automatically
  await updateConduitShardCount(conduitId, newCount);

  console.log(
    `Scaled down from ${currentCount} to ${newCount} shards. ` +
    `Shards ${newCount}-${currentCount - 1} removed.`
  );
}
```

**Example:** Updating from 100 to 50 shards disables shards 50 through 99. All subscriptions that were routed to those shards are redistributed across shards 0 through 49.

### Scaling Considerations

| Factor | Guidance |
|--------|----------|
| Redistribution | Changing shard count causes subscription redistribution across all shards |
| No event loss | Twitch queues events briefly during redistribution |
| New shard startup | New shards must have transports assigned and verified before they receive events |
| Frequency | Avoid rapid repeated scaling; allow time for redistribution to settle |

---

## Recovery from Outages

### WebSocket Shard Recovery

When a WebSocket connection drops, the associated shard becomes `disabled`. To recover:

```javascript
async function recoverWebSocketShard(conduitId, shardId) {
  // Step 1: Establish a new WebSocket connection
  const newSession = await connectWebSocket();

  // Step 2: Reassign the shard to the new session
  const result = await updateConduitShards(conduitId, [
    {
      id: shardId,
      transport: {
        method: 'websocket',
        session_id: newSession.id
      }
    }
  ]);

  if (result.errors.length === 0) {
    console.log(`Shard ${shardId} recovered with session ${newSession.id}`);
  } else {
    console.error(`Failed to recover shard ${shardId}:`, result.errors);
  }
}
```

### Webhook Shard Recovery

Webhook shards can fail if the callback URL becomes unreachable or if verification fails:

```javascript
async function recoverWebhookShard(conduitId, shardId, callbackUrl, secret) {
  const result = await updateConduitShards(conduitId, [
    {
      id: shardId,
      transport: {
        method: 'webhook',
        callback: callbackUrl,
        secret: secret
      }
    }
  ]);

  // After this, Twitch will send a new verification challenge
  // The shard status will be "webhook_callback_verification_pending"
  // until the challenge is answered
  return result;
}
```

### Full Conduit Recovery

If all shards become disabled:

- The conduit remains **enabled for 72 hours**
- After 72 hours with no active shard, Twitch **deletes the conduit** and all its subscriptions
- You have a 72-hour window to reconnect at least one shard

```javascript
async function emergencyRecovery(conduitId) {
  // Get all shards
  const shards = await getAllShards(conduitId);

  // Attempt to recover all disabled shards
  const recoveryPromises = shards
    .filter(s => s.status === 'disabled')
    .map(async (shard) => {
      try {
        const session = await connectWebSocket();
        await updateConduitShards(conduitId, [
          {
            id: shard.id,
            transport: {
              method: 'websocket',
              session_id: session.id
            }
          }
        ]);
        console.log(`Recovered shard ${shard.id}`);
      } catch (err) {
        console.error(`Failed to recover shard ${shard.id}:`, err);
      }
    });

  await Promise.allSettled(recoveryPromises);
}
```

### Recovery Timeline

```
t=0     Shard disconnects
        -> status: "disabled"
        -> conduit.shard.disabled event fires
        -> Events for this shard's subscriptions are NOT delivered

t=0+    App detects failure (via polling or conduit.shard.disabled)
        -> Reconnects WebSocket / re-verifies webhook
        -> Assigns new transport to the shard
        -> Events resume

t=72h   If ALL shards have been disabled for 72 hours continuously
        -> Twitch deletes the conduit
        -> All subscriptions associated with the conduit are deleted
        -> Must recreate conduit and all subscriptions from scratch
```

---

## conduit.shard.disabled EventSub Type

This event fires when a shard within one of your conduits becomes disabled. It is essential for automated recovery.

### Subscription

| Field | Value |
|-------|-------|
| **Type** | `conduit.shard.disabled` |
| **Version** | `1` |
| **Condition** | `client_id` (your app's client ID) |
| **Auth** | App Access Token |

**Important:** This subscription **must** use a different transport than the conduit it monitors. If the conduit's shard goes down and this subscription is on that same shard, you will not receive the notification.

### Creating the Subscription

```bash
curl -X POST 'https://api.twitch.tv/helix/eventsub/subscriptions' \
  -H 'Authorization: Bearer YOUR_APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "conduit.shard.disabled",
    "version": "1",
    "condition": {
      "client_id": "YOUR_CLIENT_ID"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://example.com/eventsub/monitoring",
      "secret": "monitoring_webhook_s3cret"
    }
  }'
```

### Event Payload

```json
{
  "subscription": {
    "id": "sub-id-here",
    "type": "conduit.shard.disabled",
    "version": "1",
    "status": "enabled",
    "condition": {
      "client_id": "YOUR_CLIENT_ID"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://example.com/eventsub/monitoring"
    },
    "created_at": "2023-10-01T14:00:00.000Z",
    "cost": 0
  },
  "event": {
    "conduit_id": "bfcfc993-26b1-b876-44d9-afe75a379dac",
    "shard_id": "2",
    "status": "websocket_disconnected",
    "transport": {
      "method": "websocket",
      "session_id": "ad1c9fc3-0d99-4eb7-8a04-8608e8f9e2d1",
      "disconnected_at": "2023-10-01T15:00:00.000Z"
    }
  }
}
```

### Event Fields

| Field | Type | Description |
|-------|------|-------------|
| `event.conduit_id` | string | ID of the conduit containing the disabled shard |
| `event.shard_id` | string | ID of the disabled shard |
| `event.status` | string | Reason for disabling (e.g., `websocket_disconnected`, `webhook_callback_verification_failed`) |
| `event.transport` | object | Transport details of the disabled shard |

### Handling the Event

```javascript
// Webhook handler for conduit.shard.disabled
app.post('/eventsub/monitoring', (req, res) => {
  const messageType = req.headers['twitch-eventsub-message-type'];

  if (messageType === 'webhook_callback_verification') {
    return res.status(200).send(req.body.challenge);
  }

  if (messageType === 'notification') {
    const { conduit_id, shard_id, status } = req.body.event;

    console.warn(
      `Shard ${shard_id} in conduit ${conduit_id} disabled: ${status}`
    );

    // Trigger automated recovery
    recoverWebSocketShard(conduit_id, shard_id)
      .catch(err => console.error('Recovery failed:', err));
  }

  res.status(204).end();
});
```

---

## Creating Subscriptions with Conduit Transport

Once a conduit is created and its shards are configured, create EventSub subscriptions that reference the conduit as the transport.

### Request Format

```bash
curl -X POST 'https://api.twitch.tv/helix/eventsub/subscriptions' \
  -H 'Authorization: Bearer YOUR_APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "stream.online",
    "version": "1",
    "condition": {
      "broadcaster_user_id": "12345"
    },
    "transport": {
      "method": "conduit",
      "conduit_id": "bfcfc993-26b1-b876-44d9-afe75a379dac"
    }
  }'
```

### Key Differences from Direct Transport

| Aspect | Direct WebSocket/Webhook | Conduit |
|--------|--------------------------|---------|
| Transport method | `"websocket"` or `"webhook"` | `"conduit"` |
| Transport fields | `session_id` or `callback` + `secret` | `conduit_id` |
| Auth for subscription | User Access Token or App Access Token | App Access Token or User Access Token |
| Subscription management | Per-connection | Centralized via conduit |
| Failover | Manual | Automatic redistribution |

### Batch Subscription Creation

```javascript
async function createSubscriptionsForChannels(conduitId, channelIds, eventType) {
  const results = [];

  for (const channelId of channelIds) {
    try {
      const response = await fetch(
        'https://api.twitch.tv/helix/eventsub/subscriptions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${APP_ACCESS_TOKEN}`,
            'Client-Id': CLIENT_ID,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: eventType,
            version: '1',
            condition: {
              broadcaster_user_id: channelId
            },
            transport: {
              method: 'conduit',
              conduit_id: conduitId
            }
          })
        }
      );

      const data = await response.json();
      results.push({ channelId, success: true, data });
    } catch (err) {
      results.push({ channelId, success: false, error: err.message });
    }
  }

  return results;
}
```

### Authentication Notes

- **Conduit management** (create, update, delete conduits and shards): Always requires an **App Access Token**
- **Subscription creation with conduit transport**: Can use either an **App Access Token** or a **User Access Token**, depending on the EventSub type's requirements
- Some EventSub types require user authorization (e.g., `channel.subscription.gift` requires the broadcaster's token); in these cases, a User Access Token is still needed for the subscription, even though the conduit itself is managed via App Access Token

---

## Best Practices & Production Hardening

### 1. Start Small, Scale Intentionally

Most applications need only 2-3 shards. A second shard acts as a natural failover target when the first goes down.

```javascript
// Recommended starting configuration
const INITIAL_SHARD_COUNT = 2;
const conduit = await createConduit(INITIAL_SHARD_COUNT);
```

### 2. Monitor with a Separate Transport

Always subscribe to `conduit.shard.disabled` on a transport that is independent of the conduit being monitored. A dedicated webhook endpoint is ideal:

```javascript
// DO: Use a separate webhook for monitoring
await createSubscription({
  type: 'conduit.shard.disabled',
  version: '1',
  condition: { client_id: CLIENT_ID },
  transport: {
    method: 'webhook',  // Independent of your conduit
    callback: 'https://monitoring.example.com/shard-alerts',
    secret: MONITORING_SECRET
  }
});

// DON'T: Monitor a conduit using itself as the transport
// If all shards go down, you won't receive the alert
```

### 3. Implement Automated Recovery

```javascript
class ConduitManager {
  constructor(conduitId, appToken, clientId) {
    this.conduitId = conduitId;
    this.appToken = appToken;
    this.clientId = clientId;
    this.maxRetries = 3;
    this.retryDelayMs = 5000;
  }

  async recoverShard(shardId, attempt = 1) {
    if (attempt > this.maxRetries) {
      console.error(
        `Shard ${shardId} recovery failed after ${this.maxRetries} attempts`
      );
      // Alert on-call team
      await this.sendAlert(shardId);
      return false;
    }

    try {
      const session = await this.connectWebSocket();
      await this.assignShardTransport(shardId, session.id);
      console.log(`Shard ${shardId} recovered on attempt ${attempt}`);
      return true;
    } catch (err) {
      console.warn(
        `Shard ${shardId} recovery attempt ${attempt} failed:`,
        err.message
      );
      await this.delay(this.retryDelayMs * attempt);
      return this.recoverShard(shardId, attempt + 1);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 4. Handle Token Refresh

App Access Tokens expire. Ensure your token refresh logic runs before conduit management calls:

```javascript
async function ensureValidAppToken() {
  if (isTokenExpired(currentToken)) {
    currentToken = await refreshAppAccessToken(CLIENT_ID, CLIENT_SECRET);
  }
  return currentToken;
}
```

### 5. Graceful Shutdown

On application shutdown, decide whether to keep the conduit alive (for quick restart) or clean up:

```javascript
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');

  // Option A: Keep conduit alive for quick restart (72-hour grace period)
  // Just close WebSocket connections; shards become disabled
  // On restart, reconnect and reassign shards

  // Option B: Full cleanup (if shutting down permanently)
  // await deleteConduit(CONDUIT_ID);

  process.exit(0);
});
```

### 6. Use Idempotent Shard Updates

When updating shards, the operation is idempotent. Reassigning the same session to a shard that already has it is a no-op. This simplifies recovery logic.

### 7. Log Shard Assignments

Maintain a local map of shard-to-transport assignments for debugging:

```javascript
const shardMap = new Map();

async function assignAndTrack(conduitId, shardId, sessionId) {
  await updateConduitShards(conduitId, [
    {
      id: shardId,
      transport: { method: 'websocket', session_id: sessionId }
    }
  ]);

  shardMap.set(shardId, {
    sessionId,
    assignedAt: new Date().toISOString(),
    status: 'enabled'
  });
}
```

### 8. Avoid Over-Sharding

More shards means more connections to maintain, more potential failure points, and more complexity. Scale based on actual load:

| Subscription Count | Recommended Shards |
|--------------------|-------------------|
| < 500 | 2 (1 primary + 1 failover) |
| 500 - 5,000 | 3-5 |
| 5,000 - 50,000 | 5-20 |
| 50,000+ | 20-100+ (based on throughput testing) |

### 9. Test Failover Regularly

Periodically disconnect a shard intentionally to verify that your recovery mechanism works:

```javascript
async function testFailover(conduitId, shardId) {
  console.log(`Testing failover for shard ${shardId}...`);

  // Close the WebSocket connection for this shard
  const session = activeWebSockets.get(shardId);
  if (session) {
    session.close();
  }

  // Recovery should trigger automatically via conduit.shard.disabled
  // Verify recovery within expected timeframe
  await delay(30000);

  const shards = await getConduitShards(conduitId);
  const shard = shards.data.find(s => s.id === shardId);

  if (shard.status === 'enabled') {
    console.log(`Failover test PASSED for shard ${shardId}`);
  } else {
    console.error(`Failover test FAILED for shard ${shardId}`);
  }
}
```

---

## Known Issues & Community Notes

### 1. Shard Redistribution Timing

When scaling up or down, there may be a brief period where events are queued while Twitch redistributes subscriptions across shards. During high-traffic events (e.g., a major streamer going live), plan scaling changes during quieter periods.

### 2. WebSocket Session Reuse

A single WebSocket session can only be assigned to one shard in one conduit. Attempting to assign the same session to multiple shards or multiple conduits will fail.

### 3. Conduit Deletion Cascade

Deleting a conduit immediately deletes **all** subscriptions routed through it. There is no confirmation prompt. If you accidentally delete a conduit with thousands of subscriptions, they must all be recreated manually.

### 4. The 72-Hour Grace Period

The 72-hour grace period for conduits with all shards disabled is a safety net, not a feature to rely on. If your application goes down for an extended period, prioritize recovering at least one shard within the first few hours to avoid event loss.

### 5. Webhook Secret Requirements

When assigning a webhook transport to a shard, the `secret` must be between 10 and 100 characters. Secrets shorter than 10 characters are rejected with a 400 error.

### 6. Rate Limits

Conduit API endpoints share the standard Twitch API rate limits (800 points per minute for app access tokens). Bulk shard updates using the batch capability of PATCH /eventsub/conduits/shards are preferable to individual updates.

### 7. No Shard-Level Subscription Control

You cannot control which shard receives events for a specific subscription. Twitch's internal hashing determines routing. If you need all events for a specific channel on a specific server, consider using a single-shard conduit or direct transport.

### 8. Verification Timeout for Webhook Shards

When assigning a webhook transport to a shard, Twitch sends a verification challenge. If the callback does not respond within approximately 10 seconds, the shard status becomes `webhook_callback_verification_failed`. Ensure your webhook endpoint is responsive before assigning it.

---

## Quick Reference Table

| Action | Method | Endpoint | Auth |
|--------|--------|----------|------|
| Create conduit | `POST` | `/helix/eventsub/conduits` | App Access Token |
| List conduits | `GET` | `/helix/eventsub/conduits` | App Access Token |
| Update conduit (shard count) | `PATCH` | `/helix/eventsub/conduits` | App Access Token |
| Delete conduit | `DELETE` | `/helix/eventsub/conduits?id={id}` | App Access Token |
| List conduit shards | `GET` | `/helix/eventsub/conduits/shards?conduit_id={id}` | App Access Token |
| Update conduit shards | `PATCH` | `/helix/eventsub/conduits/shards` | App Access Token |
| Create subscription (conduit) | `POST` | `/helix/eventsub/subscriptions` | App or User Access Token |
| Subscribe to shard.disabled | `POST` | `/helix/eventsub/subscriptions` | App Access Token |

### Key Limits

| Limit | Value |
|-------|-------|
| Max enabled conduits per client | 5 |
| Max shards per conduit | 20,000 |
| Grace period (all shards disabled) | 72 hours |
| Webhook secret length | 10-100 characters |
| WebSocket keepalive timeout | 10 seconds |

### Transport Object Formats

**WebSocket shard transport (in PATCH request):**
```json
{
  "method": "websocket",
  "session_id": "SESSION_ID_FROM_WELCOME_MESSAGE"
}
```

**Webhook shard transport (in PATCH request):**
```json
{
  "method": "webhook",
  "callback": "https://example.com/eventsub/shard",
  "secret": "your_secret_10_to_100_chars"
}
```

**Conduit transport (in subscription creation):**
```json
{
  "method": "conduit",
  "conduit_id": "CONDUIT_UUID"
}
```

### Shard Statuses

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| `enabled` | Active, receiving events | None |
| `disabled` | Inactive, not receiving events | Reassign transport |
| `webhook_callback_verification_pending` | Awaiting webhook challenge response | Ensure callback is responding |
| `webhook_callback_verification_failed` | Challenge was not answered | Fix callback URL and re-update shard |

---

> **Next in series:** File 7 of 18
> **Previous:** File 5 of 18
> **See also:** EventSub WebSocket transport, EventSub Webhook transport, Twitch API Authentication
