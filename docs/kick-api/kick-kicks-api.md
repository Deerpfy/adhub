# Kick KICKs API

> **Source:** https://docs.kick.com/apis/kicks
> **GitHub Raw:** https://github.com/KickEngineering/KickDevDocs/blob/main/apis/kicks.md
> **Last verified:** 2026-02-13
> **API Base URL:** `https://api.kick.com/public/v1`

## Overview

The KICKs API allows applications to interact with KICKs -- Kick's virtual gifting/tipping system. Currently, the API provides read-only access to KICKs leaderboard data. KICKs are virtual gifts that viewers can send to broadcasters during live streams, with different gift types, tiers, and pinned durations.

---

## Authentication

| Operation | Token Type | Required Scope |
|-----------|-----------|----------------|
| Get KICKs Leaderboard | App Access Token or User Access Token | `kicks:read` |

---

## Endpoints

### GET /public/v1/kicks/leaderboard

Retrieve the KICKs leaderboard for a specific channel, showing top gifters.

#### HTTP Request

```
GET https://api.kick.com/public/v1/kicks/leaderboard
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <access_token>` |

#### Query Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `broadcaster_user_id` | Yes | integer | The user ID of the broadcaster whose leaderboard to retrieve |
| `time_period` | No | string | Time period for leaderboard. [VERIFY] Possible values may include: `all_time`, `monthly`, `weekly`, `daily` |

#### Example Request

```bash
curl -X GET "https://api.kick.com/public/v1/kicks/leaderboard?broadcaster_user_id=123456789" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

#### Response (200 OK)

```json
{
  "data": [
    {
      "user_id": 987654321,
      "username": "top_gifter",
      "is_verified": false,
      "profile_picture": "https://example.com/avatar.jpg",
      "quantity": 50000,
      "rank": 1
    }
  ],
  "message": "OK"
}
```

#### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | Array of leaderboard entry objects, ordered by rank |
| `data[].user_id` | number | The gifter's user ID |
| `data[].username` | string | The gifter's username |
| `data[].is_verified` | boolean | Whether the gifter is verified |
| `data[].profile_picture` | string | URL to the gifter's profile picture |
| `data[].quantity` | number | Total KICKs amount gifted [VERIFY exact field name] |
| `data[].rank` | number | Leaderboard position [VERIFY exact field name] |

> **Note:** The exact response schema is defined in the OpenAPI spec at `https://api.kick.com/swagger/doc.yaml` which was inaccessible at the time of documentation (403). Fields marked [VERIFY] should be confirmed against the live API or Swagger spec.

#### Error Responses

| Status Code | Description |
|-------------|-------------|
| `401` | Unauthorized -- invalid or expired token |
| `403` | Forbidden -- token lacks `kicks:read` scope |
| `404` | Not Found -- broadcaster user ID does not exist [VERIFY] |

---

## KICKs Gift Properties (from Webhook Payloads)

When KICKs are gifted, the `kicks.gifted` webhook event provides the following gift details:

| Field | Type | Description |
|-------|------|-------------|
| `amount` | number | Gift amount value |
| `name` | string | Gift name (e.g., `"Rage Quit"`) |
| `type` | string | Gift type (e.g., `"LEVEL_UP"`) |
| `tier` | string | Gift tier (e.g., `"MID"`) |
| `message` | string | Optional message from the sender |
| `pinned_time_seconds` | number | Duration in seconds the gift is pinned in chat |

### Known Gift Types [VERIFY - community-reported]

| Type | Description |
|------|-------------|
| `LEVEL_UP` | Level up gift type |

### Known Gift Tiers [VERIFY - community-reported]

| Tier | Description |
|------|-------------|
| `LOW` | Low-value tier [VERIFY] |
| `MID` | Mid-value tier |
| `HIGH` | High-value tier [VERIFY] |

> **Note:** Complete gift type and tier enumerations are not documented. See [GitHub Issue #271](https://github.com/KickEngineering/KickDevDocs/discussions/271) for community discussion on gift tier ranges and icons/colors.

---

## TypeScript Example

```typescript
const BASE_URL = 'https://api.kick.com/public/v1';

interface LeaderboardEntry {
  user_id: number;
  username: string;
  is_verified: boolean;
  profile_picture: string;
  quantity: number;
  rank: number;
}

async function getKicksLeaderboard(
  accessToken: string,
  broadcasterUserId: number,
): Promise<LeaderboardEntry[]> {
  const url = new URL(`${BASE_URL}/kicks/leaderboard`);
  url.searchParams.set('broadcaster_user_id', broadcasterUserId.toString());

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get leaderboard: ${response.status}`);
  }

  const body = await response.json();
  return body.data;
}

// Usage
const token = process.env.KICK_ACCESS_TOKEN!;
const leaderboard = await getKicksLeaderboard(token, 123456789);
for (const entry of leaderboard) {
  console.log(`#${entry.rank} ${entry.username}: ${entry.quantity} KICKs`);
}
```

## Python Example

```python
import os
import requests

BASE_URL = "https://api.kick.com/public/v1"

def get_kicks_leaderboard(access_token: str, broadcaster_user_id: int) -> list:
    response = requests.get(
        f"{BASE_URL}/kicks/leaderboard",
        headers={"Authorization": f"Bearer {access_token}"},
        params={"broadcaster_user_id": broadcaster_user_id},
    )
    response.raise_for_status()
    return response.json()["data"]

# Usage
token = os.environ["KICK_ACCESS_TOKEN"]
leaderboard = get_kicks_leaderboard(token, 123456789)
for entry in leaderboard:
    print(f"#{entry['rank']} {entry['username']}: {entry['quantity']} KICKs")
```

---

## Best Practices & Production Hardening

### Caching Leaderboard Data

- Leaderboard data changes infrequently. Cache responses for 1-5 minutes to reduce API calls.
- Use the `kicks.gifted` webhook event to invalidate cache when new gifts arrive.

### Token Refresh Lifecycle

- App Access Tokens expire. Implement automatic refresh before expiry.
- For leaderboard data, App Access Tokens are sufficient (no user login required).

### Idempotent Webhook Processing

- When processing `kicks.gifted` webhook events, use `Kick-Event-Message-Id` for deduplication.
- See [kick-webhook-payloads-event-types.md](./kick-webhook-payloads-event-types.md#event-10-kicks-gifted-kicksgifted).

### Avoid Infinite Loops

- If your app displays leaderboards in chat, ensure the bot doesn't trigger `chat.message.sent` events that recursively update leaderboard display.

### Secure Secret Storage

- Store access tokens in environment variables, not in source code.

### Logging Recommendations

- Log leaderboard queries with broadcaster ID and timestamp for debugging.
- Never log access tokens.

---

## Known Issues & Community Notes

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#271](https://github.com/KickEngineering/KickDevDocs/discussions/271) | Gift tier ranges and icons/colors for chat | Discussion | Community requests documentation for all gift tiers, amounts, and associated icons/colors |
| [#323](https://github.com/KickEngineering/KickDevDocs/issues/323) | No emotes/emojis endpoint | Open | No way to resolve gift-related emotes to image URLs |

### Undocumented Aspects

- The complete list of gift `type` values is not documented
- The complete list of gift `tier` values is not documented
- Leaderboard time period filter options are not explicitly documented
- Maximum leaderboard entries returned per request is not documented

---

## Quick Reference Table

| Method | Path | Auth | Scope | Description |
|--------|------|------|-------|-------------|
| `GET` | `/public/v1/kicks/leaderboard` | App or User Token | `kicks:read` | Get KICKs leaderboard |
