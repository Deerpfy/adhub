# Kick Subscribe to Events API

> **Source:** https://docs.kick.com/events/subscribe-to-events
> **GitHub Raw:** https://github.com/KickEngineering/KickDevDocs/blob/main/events/subscribe-to-events.md
> **Last verified:** 2026-02-13
> **API Base URL:** `https://api.kick.com/public/v1`

## Overview

The Event Subscription API allows applications to subscribe to real-time webhook events from Kick. When subscribed, Kick sends HTTP POST requests to your registered webhook URL whenever the specified events occur. You can create, list, and delete event subscriptions using these endpoints.

Both **App Access Tokens** and **User Access Tokens** can be used to manage event subscriptions. App Access Tokens allow subscribing to events from any channel when the channel's user ID is provided.

**Required scope:** `events:subscribe`

**Prerequisite:** Before subscribing to events, you must:
1. Create a Kick App via Account Settings > Developer tab
2. Enable webhook event delivery (toggle ON)
3. Enter a publicly accessible HTTPS webhook URL
4. Generate an access token with the `events:subscribe` scope

---

## Endpoints

### GET /public/v1/events/subscriptions

Retrieve all active event subscriptions for the authenticated application.

#### HTTP Request

```
GET https://api.kick.com/public/v1/events/subscriptions
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <access_token>` |

#### Query Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `after` | No | string | Cursor for pagination (from previous response) |
| `first` | No | integer | Number of results per page. [VERIFY] Default and max values not explicitly documented |

#### Response (200 OK)

```json
{
  "data": [
    {
      "id": "01ABCDEF123456789",
      "event": "chat.message.sent",
      "version": 1,
      "broadcaster_user_id": 123456789,
      "created_at": "2025-01-14T16:08:06Z"
    }
  ],
  "pagination": {
    "cursor": "eyJpZCI6IjAxQUJDREVGMTIzNDU2Nzg5In0="
  }
}
```

#### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | Array of subscription objects |
| `data[].id` | string (ULID) | Unique subscription identifier |
| `data[].event` | string | The event name (e.g., `chat.message.sent`) |
| `data[].version` | number | Event version (currently `1` for all events) |
| `data[].broadcaster_user_id` | number | The broadcaster's user ID this subscription is for |
| `data[].created_at` | string (ISO 8601) | When the subscription was created |
| `pagination` | object | Pagination info |
| `pagination.cursor` | string | Cursor for the next page of results |

#### Error Responses

| Status Code | Description |
|-------------|-------------|
| `401` | Unauthorized -- invalid or expired token |
| `403` | Forbidden -- token lacks `events:subscribe` scope |

---

### POST /public/v1/events/subscriptions

Create a new event subscription. Kick will send POST requests to your webhook URL when the specified event occurs for the specified broadcaster.

#### HTTP Request

```
POST https://api.kick.com/public/v1/events/subscriptions
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <access_token>` |
| `Content-Type` | Yes | string | `application/json` |

#### Request Body

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `event` | Yes | string | Event name to subscribe to. Must be one of the names from the [Events table](./kick-webhook-payloads-event-types.md) |
| `version` | Yes | number | Event version (use `1`) |
| `broadcaster_user_id` | Yes | number | The user ID of the broadcaster whose events you want to receive |

#### Available Event Names

| Event Name | Description |
|------------|-------------|
| `chat.message.sent` | Chat messages in a stream |
| `channel.followed` | User follows a channel |
| `channel.subscription.renewal` | Subscription renewal |
| `channel.subscription.gifts` | Subscription gifts |
| `channel.subscription.new` | New subscription |
| `channel.reward.redemption.updated` | Channel reward redeemed |
| `livestream.status.updated` | Stream started/ended |
| `livestream.metadata.updated` | Stream metadata changed |
| `moderation.banned` | User banned from channel |
| `kicks.gifted` | Kicks gifted to a channel |

#### Example Request

```bash
curl -X POST https://api.kick.com/public/v1/events/subscriptions \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "chat.message.sent",
    "version": 1,
    "broadcaster_user_id": 123456789
  }'
```

#### Response (200 OK)

```json
{
  "data": {
    "id": "01ABCDEF123456789",
    "event": "chat.message.sent",
    "version": 1,
    "broadcaster_user_id": 123456789,
    "created_at": "2025-01-14T16:08:06Z"
  },
  "message": "OK"
}
```

#### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `data` | object | The created subscription |
| `data.id` | string (ULID) | Unique subscription identifier |
| `data.event` | string | The subscribed event name |
| `data.version` | number | Event version |
| `data.broadcaster_user_id` | number | Broadcaster user ID |
| `data.created_at` | string (ISO 8601) | Creation timestamp |
| `message` | string | Status message (`"OK"`) |

#### Error Responses

| Status Code | Description |
|-------------|-------------|
| `400` | Bad Request -- invalid event name, missing required fields |
| `401` | Unauthorized -- invalid or expired token |
| `403` | Forbidden -- token lacks `events:subscribe` scope |
| `409` | Conflict -- subscription already exists [VERIFY] |
| `429` | Too Many Requests -- event subscription limit reached |

---

### DELETE /public/v1/events/subscriptions

Delete an existing event subscription.

#### HTTP Request

```
DELETE https://api.kick.com/public/v1/events/subscriptions
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <access_token>` |
| `Content-Type` | Yes | string | `application/json` |

#### Request Body

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | Yes | string | The subscription ID to delete (obtained from GET or POST response) |

#### Example Request

```bash
curl -X DELETE https://api.kick.com/public/v1/events/subscriptions \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "01ABCDEF123456789"
  }'
```

#### Response (200 OK)

```json
{
  "message": "OK"
}
```

#### Error Responses

| Status Code | Description |
|-------------|-------------|
| `400` | Bad Request -- missing or invalid subscription ID |
| `401` | Unauthorized -- invalid or expired token |
| `403` | Forbidden -- token lacks `events:subscribe` scope |
| `404` | Not Found -- subscription ID does not exist |

---

## Subscription Limits

Event subscriptions have limits per application:

- **Default limit:** 250 subscriptions per app [VERIFY - reported in GitHub issues]
- **Verified apps:** 1,000 to 10,000 subscriptions (contact developers@kick.com for verification)

When the limit is reached, POST requests return a `429` error with a message indicating the limit has been reached.

---

## Automatic Unsubscription Rules

Kick automatically unsubscribes your app from events under these conditions:

1. **Continuous failure for 24+ hours:** If your webhook endpoint fails to return a `2xx` response for over 24 hours, Kick removes the subscription. You must manually resubscribe.

2. **Webhook disabled:** If you disable webhooks in your app settings, all event subscriptions are automatically removed (added December 2025).

---

## TypeScript Example: Full Subscription Management

```typescript
const BASE_URL = 'https://api.kick.com/public/v1';

interface Subscription {
  id: string;
  event: string;
  version: number;
  broadcaster_user_id: number;
  created_at: string;
}

async function listSubscriptions(accessToken: string): Promise<Subscription[]> {
  const response = await fetch(`${BASE_URL}/events/subscriptions`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to list subscriptions: ${response.status}`);
  }

  const body = await response.json();
  return body.data;
}

async function createSubscription(
  accessToken: string,
  event: string,
  broadcasterUserId: number,
): Promise<Subscription> {
  const response = await fetch(`${BASE_URL}/events/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event,
      version: 1,
      broadcaster_user_id: broadcasterUserId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create subscription: ${response.status}`);
  }

  const body = await response.json();
  return body.data;
}

async function deleteSubscription(
  accessToken: string,
  subscriptionId: string,
): Promise<void> {
  const response = await fetch(`${BASE_URL}/events/subscriptions`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: subscriptionId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete subscription: ${response.status}`);
  }
}

// Usage
const token = process.env.KICK_ACCESS_TOKEN!;
const sub = await createSubscription(token, 'chat.message.sent', 123456789);
console.log('Created subscription:', sub.id);

const subs = await listSubscriptions(token);
console.log('Active subscriptions:', subs.length);

await deleteSubscription(token, sub.id);
console.log('Deleted subscription');
```

## Python Example: Full Subscription Management

```python
import os
import requests

BASE_URL = "https://api.kick.com/public/v1"

def get_headers(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}

def list_subscriptions(access_token: str) -> list:
    response = requests.get(
        f"{BASE_URL}/events/subscriptions",
        headers=get_headers(access_token),
    )
    response.raise_for_status()
    return response.json()["data"]

def create_subscription(
    access_token: str,
    event: str,
    broadcaster_user_id: int,
) -> dict:
    response = requests.post(
        f"{BASE_URL}/events/subscriptions",
        headers={
            **get_headers(access_token),
            "Content-Type": "application/json",
        },
        json={
            "event": event,
            "version": 1,
            "broadcaster_user_id": broadcaster_user_id,
        },
    )
    response.raise_for_status()
    return response.json()["data"]

def delete_subscription(access_token: str, subscription_id: str) -> None:
    response = requests.delete(
        f"{BASE_URL}/events/subscriptions",
        headers={
            **get_headers(access_token),
            "Content-Type": "application/json",
        },
        json={"id": subscription_id},
    )
    response.raise_for_status()

# Usage
token = os.environ["KICK_ACCESS_TOKEN"]
sub = create_subscription(token, "chat.message.sent", 123456789)
print(f"Created subscription: {sub['id']}")

subs = list_subscriptions(token)
print(f"Active subscriptions: {len(subs)}")

delete_subscription(token, sub["id"])
print("Deleted subscription")
```

---

## Best Practices & Production Hardening

### Subscription Management

- **Track subscriptions in your database.** Don't rely solely on the GET endpoint to know your active subscriptions.
- **Handle 429 errors gracefully.** If you hit the subscription limit, implement a queue and process subscriptions as slots become available.
- **Resubscribe on startup.** After a deployment or restart, verify your subscriptions are still active (they may have been auto-unsubscribed due to downtime).

### Webhook Endpoint Reliability

- **Return `200 OK` immediately** and process events asynchronously in a background queue.
- **Set a response timeout < 3 seconds.** Kick may consider slow responses as failures.
- **Monitor your webhook endpoint's health.** Set up alerting for failures to prevent auto-unsubscription.

### Token Refresh Lifecycle

- Access tokens expire. Ensure your token refresh logic runs before expiry.
- If your app access token is revoked, all subscriptions continue to exist but you cannot manage them until you obtain a new token.

### Idempotent Processing

- Use the `Kick-Event-Message-Id` header as an idempotency key to prevent duplicate event processing.

### Avoiding Infinite Loops

- When your bot sends messages via the Chat API, it will trigger `chat.message.sent` events. **Always check `sender.user_id` against your bot's user ID** to prevent recursive message storms.

### Secure Secret Storage

- Store access tokens and client secrets in environment variables, never in source code.

---

## Known Issues & Community Notes

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#227](https://github.com/KickEngineering/KickDevDocs/issues/227) | Event Subscription Limit Reached (250) | Closed | Default limit is 250; verified apps get higher limits |
| [#100](https://github.com/KickEngineering/KickDevDocs/issues/100) | Subscription limit reached with no active subscriptions shown | Closed | Ghost subscriptions may persist; contact support |
| [#110](https://github.com/KickEngineering/KickDevDocs/discussions/110) | API Rate Limits discussion | Discussion | Community reports "event subscription limit reached" errors |
| [#60](https://github.com/KickEngineering/KickDevDocs/discussions/60) | Empty response on GET events subscriptions | Discussion | Some users get empty responses despite having subscriptions |
| [#228](https://github.com/KickEngineering/KickDevDocs/issues/228) | Not receiving webhook events | Closed | Webhooks enabled but no events received; often a URL accessibility issue |
| [#172](https://github.com/KickEngineering/KickDevDocs/discussions/172) | Webhook request not triggering endpoint | Discussion | Subscription succeeds but no events delivered |
| [#147](https://github.com/KickEngineering/KickDevDocs/discussions/147) | Webhook delivery stopped around April 9th | Discussion | Multiple users reported delivery outage |
| [#212](https://github.com/KickEngineering/KickDevDocs/issues/212) | Webhooks not working until bot created | Closed | Creating a bot entity in app settings was required |

### Common Troubleshooting

1. **No events received:** Ensure your webhook URL is publicly accessible, HTTPS, and returns `200 OK`
2. **Subscription limit reached:** Default limit is ~250; request app verification for higher limits
3. **Ghost subscriptions:** If GET returns empty but POST says limit reached, contact Kick support
4. **Events suddenly stopped:** Check if your app was auto-unsubscribed due to 24+ hours of webhook failures

---

## Quick Reference Table

| Method | Path | Auth | Scope | Description |
|--------|------|------|-------|-------------|
| `GET` | `/public/v1/events/subscriptions` | App or User Token | `events:subscribe` | List active subscriptions |
| `POST` | `/public/v1/events/subscriptions` | App or User Token | `events:subscribe` | Create a new subscription |
| `DELETE` | `/public/v1/events/subscriptions` | App or User Token | `events:subscribe` | Delete a subscription |
