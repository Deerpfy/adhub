# Kick Channel Rewards API

> **Source:** https://docs.kick.com/apis/channel-rewards
> **GitHub Raw:** https://github.com/KickEngineering/KickDevDocs/blob/main/apis/channel-rewards.md
> **Last verified:** 2026-02-13
> **API Base URL:** `https://api.kick.com/public/v1`

## Overview

The Channel Rewards API enables applications to create and manage channel point rewards and process redemptions for a specified channel. This includes full CRUD operations on rewards themselves, and endpoints for accepting/rejecting redemptions by viewers.

Channel Rewards were added on **03/12/2025**. Redemption management endpoints (accept/reject and redemption retrieval) were added on **15/01/2026**.

---

## Authentication

All endpoints require a **User Access Token** with the appropriate scope.

| Operation | Required Scope |
|-----------|---------------|
| Read rewards | `channel:rewards:read` |
| Create/Update/Delete rewards | `channel:rewards:write` |
| Read redemptions | `channel:rewards:read` |
| Accept/Reject redemptions | `channel:rewards:write` |

---

## Endpoints

### GET /public/v1/channels/rewards

Retrieve all channel point rewards for the authenticated user's channel.

#### HTTP Request

```
GET https://api.kick.com/public/v1/channels/rewards
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <user_access_token>` |

#### Query Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `broadcaster_user_id` | Yes [VERIFY] | integer | The user ID of the broadcaster whose rewards to retrieve |

#### Response (200 OK)

```json
{
  "data": [
    {
      "id": "01KBHE7RZNHB0SKDV1H86CD4F3",
      "title": "Unban Request",
      "cost": 1000,
      "description": "Only good reasons pls",
      "is_enabled": true,
      "is_paused": false,
      "is_user_input_required": true,
      "max_per_stream": 0,
      "max_per_user_per_stream": 0,
      "global_cooldown_seconds": 0,
      "created_at": "2025-12-01T10:00:00Z",
      "updated_at": "2025-12-01T10:00:00Z"
    }
  ],
  "message": "OK"
}
```

#### Reward Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (ULID) | Unique reward identifier |
| `title` | string | Display title of the reward |
| `cost` | integer | Cost in channel points |
| `description` | string | Description of the reward |
| `is_enabled` | boolean | Whether the reward is currently enabled |
| `is_paused` | boolean | Whether the reward is temporarily paused |
| `is_user_input_required` | boolean | Whether users must provide text input when redeeming |
| `max_per_stream` | integer | Maximum redemptions per stream (0 = unlimited) [VERIFY] |
| `max_per_user_per_stream` | integer | Maximum redemptions per user per stream (0 = unlimited) [VERIFY] |
| `global_cooldown_seconds` | integer | Cooldown between redemptions in seconds (0 = none) [VERIFY] |
| `created_at` | string (ISO 8601) | When the reward was created |
| `updated_at` | string (ISO 8601) | When the reward was last updated |

---

### POST /public/v1/channels/rewards

Create a new channel point reward.

#### HTTP Request

```
POST https://api.kick.com/public/v1/channels/rewards
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <user_access_token>` |
| `Content-Type` | Yes | string | `application/json` |

#### Request Body

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `title` | Yes | string | Display title of the reward |
| `cost` | Yes | integer | Cost in channel points. Must be > 0 |
| `description` | No | string | Description of the reward |
| `is_enabled` | No | boolean | Whether the reward is enabled. Default: `true` [VERIFY] |
| `is_paused` | No | boolean | Whether the reward is paused. Default: `false` [VERIFY] |
| `is_user_input_required` | No | boolean | Whether user input is required. Default: `false` [VERIFY] |
| `max_per_stream` | No | integer | Max redemptions per stream. 0 = unlimited [VERIFY] |
| `max_per_user_per_stream` | No | integer | Max per user per stream. 0 = unlimited [VERIFY] |
| `global_cooldown_seconds` | No | integer | Cooldown in seconds. 0 = none [VERIFY] |

#### Example Request

```bash
curl -X POST https://api.kick.com/public/v1/channels/rewards \
  -H "Authorization: Bearer ${USER_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Unban Request",
    "cost": 1000,
    "description": "Only good reasons pls",
    "is_user_input_required": true
  }'
```

#### Response (200 OK)

```json
{
  "data": {
    "id": "01KBHE7RZNHB0SKDV1H86CD4F3",
    "title": "Unban Request",
    "cost": 1000,
    "description": "Only good reasons pls",
    "is_enabled": true,
    "is_paused": false,
    "is_user_input_required": true,
    "max_per_stream": 0,
    "max_per_user_per_stream": 0,
    "global_cooldown_seconds": 0,
    "created_at": "2025-12-01T10:00:00Z",
    "updated_at": "2025-12-01T10:00:00Z"
  },
  "message": "OK"
}
```

#### Error Responses

| Status Code | Description |
|-------------|-------------|
| `400` | Bad Request -- missing required fields, invalid values |
| `401` | Unauthorized -- invalid or expired token |
| `403` | Forbidden -- token lacks `channel:rewards:write` scope |

---

### PATCH /public/v1/channels/rewards/{id}

Update an existing channel point reward.

#### HTTP Request

```
PATCH https://api.kick.com/public/v1/channels/rewards/{id}
```

#### Path Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `id` | Yes | string | The reward ID (ULID) to update |

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <user_access_token>` |
| `Content-Type` | Yes | string | `application/json` |

#### Request Body

All fields are optional; only provide fields you want to update.

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `title` | No | string | Updated display title |
| `cost` | No | integer | Updated cost in channel points |
| `description` | No | string | Updated description |
| `is_enabled` | No | boolean | Enable/disable the reward |
| `is_paused` | No | boolean | Pause/unpause the reward |
| `is_user_input_required` | No | boolean | Toggle user input requirement |
| `max_per_stream` | No | integer | Update max per stream |
| `max_per_user_per_stream` | No | integer | Update max per user per stream |
| `global_cooldown_seconds` | No | integer | Update cooldown |

#### Example Request

```bash
curl -X PATCH https://api.kick.com/public/v1/channels/rewards/01KBHE7RZNHB0SKDV1H86CD4F3 \
  -H "Authorization: Bearer ${USER_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "cost": 2000,
    "is_paused": true
  }'
```

#### Response (200 OK)

Returns the updated reward object.

#### Error Responses

| Status Code | Description |
|-------------|-------------|
| `400` | Bad Request -- invalid field values |
| `401` | Unauthorized -- invalid or expired token |
| `403` | Forbidden -- token lacks `channel:rewards:write` scope |
| `404` | Not Found -- reward ID does not exist |

---

### DELETE /public/v1/channels/rewards/{id}

Delete a channel point reward.

#### HTTP Request

```
DELETE https://api.kick.com/public/v1/channels/rewards/{id}
```

#### Path Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `id` | Yes | string | The reward ID (ULID) to delete |

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <user_access_token>` |

#### Example Request

```bash
curl -X DELETE https://api.kick.com/public/v1/channels/rewards/01KBHE7RZNHB0SKDV1H86CD4F3 \
  -H "Authorization: Bearer ${USER_ACCESS_TOKEN}"
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
| `401` | Unauthorized -- invalid or expired token |
| `403` | Forbidden -- token lacks `channel:rewards:write` scope |
| `404` | Not Found -- reward ID does not exist |

---

### GET /public/v1/channels/rewards/redemptions

Retrieve redemption records for channel rewards.

#### HTTP Request

```
GET https://api.kick.com/public/v1/channels/rewards/redemptions
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <user_access_token>` |

#### Query Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `broadcaster_user_id` | Yes [VERIFY] | integer | The broadcaster's user ID |
| `reward_id` | No | string | Filter by specific reward ID |
| `status` | No | string | Filter by status: `pending`, `accepted`, `rejected` |
| `after` | No | string | Pagination cursor |
| `first` | No | integer | Number of results per page |

#### Response (200 OK)

```json
{
  "data": [
    {
      "id": "01KBHE78QE4HZY1617DK5FC7YD",
      "user_input": "unban me",
      "status": "pending",
      "redeemed_at": "2025-12-02T22:54:19.323Z",
      "reward": {
        "id": "01KBHE7RZNHB0SKDV1H86CD4F3",
        "title": "Unban Request",
        "cost": 1000,
        "description": "Only good reasons pls"
      },
      "redeemer": {
        "user_id": 123,
        "username": "naughty-user",
        "is_verified": false,
        "profile_picture": "",
        "channel_slug": "naughty_user"
      },
      "broadcaster": {
        "user_id": 333,
        "username": "gigachad",
        "is_verified": true,
        "profile_picture": "",
        "channel_slug": "gigachad"
      }
    }
  ],
  "pagination": {
    "cursor": "..."
  },
  "message": "OK"
}
```

---

### POST /public/v1/channels/rewards/redemptions/accept

Accept a pending reward redemption.

#### HTTP Request

```
POST https://api.kick.com/public/v1/channels/rewards/redemptions/accept
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <user_access_token>` |
| `Content-Type` | Yes | string | `application/json` |

#### Request Body

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | Yes | string | The redemption ID to accept |

#### Example Request

```bash
curl -X POST https://api.kick.com/public/v1/channels/rewards/redemptions/accept \
  -H "Authorization: Bearer ${USER_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "01KBHE78QE4HZY1617DK5FC7YD"
  }'
```

#### Response (200 OK)

```json
{
  "message": "OK"
}
```

> **Note:** Accepting a redemption triggers a `channel.reward.redemption.updated` webhook event with `status: "accepted"`.

---

### POST /public/v1/channels/rewards/redemptions/reject

Reject a pending reward redemption. This refunds the channel points to the redeemer.

#### HTTP Request

```
POST https://api.kick.com/public/v1/channels/rewards/redemptions/reject
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <user_access_token>` |
| `Content-Type` | Yes | string | `application/json` |

#### Request Body

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | Yes | string | The redemption ID to reject |

#### Example Request

```bash
curl -X POST https://api.kick.com/public/v1/channels/rewards/redemptions/reject \
  -H "Authorization: Bearer ${USER_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "01KBHE78QE4HZY1617DK5FC7YD"
  }'
```

#### Response (200 OK)

```json
{
  "message": "OK"
}
```

> **Note:** Rejecting a redemption triggers a `channel.reward.redemption.updated` webhook event with `status: "rejected"`.

---

## Webhook Integration

When a reward is redeemed or a redemption status changes, a `channel.reward.redemption.updated` webhook event is fired. See [kick-webhook-payloads-event-types.md](./kick-webhook-payloads-event-types.md#event-6-channel-reward-redemption-updated-channelrewardredemptionupdated).

Subscribe to this event:
```json
{
  "event": "channel.reward.redemption.updated",
  "version": 1,
  "broadcaster_user_id": 333
}
```

---

## TypeScript Example: Reward Management

```typescript
const BASE_URL = 'https://api.kick.com/public/v1';

async function createReward(
  token: string,
  title: string,
  cost: number,
  description?: string,
) {
  const res = await fetch(`${BASE_URL}/channels/rewards`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, cost, description, is_user_input_required: true }),
  });
  if (!res.ok) throw new Error(`Create reward failed: ${res.status}`);
  return (await res.json()).data;
}

async function processRedemptions(token: string, broadcasterUserId: number) {
  const res = await fetch(
    `${BASE_URL}/channels/rewards/redemptions?broadcaster_user_id=${broadcasterUserId}&status=pending`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Fetch redemptions failed: ${res.status}`);
  const { data } = await res.json();

  for (const redemption of data) {
    const action = redemption.user_input.toLowerCase().includes('please')
      ? 'accept'
      : 'reject';

    await fetch(`${BASE_URL}/channels/rewards/redemptions/${action}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: redemption.id }),
    });
    console.log(`${action}ed redemption ${redemption.id}`);
  }
}
```

## Python Example: Reward Management

```python
import os
import requests

BASE_URL = "https://api.kick.com/public/v1"

def create_reward(token: str, title: str, cost: int, description: str = "") -> dict:
    response = requests.post(
        f"{BASE_URL}/channels/rewards",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "title": title,
            "cost": cost,
            "description": description,
            "is_user_input_required": True,
        },
    )
    response.raise_for_status()
    return response.json()["data"]

def process_pending_redemptions(token: str, broadcaster_user_id: int) -> None:
    response = requests.get(
        f"{BASE_URL}/channels/rewards/redemptions",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "broadcaster_user_id": broadcaster_user_id,
            "status": "pending",
        },
    )
    response.raise_for_status()

    for redemption in response.json()["data"]:
        action = "accept" if "please" in redemption["user_input"].lower() else "reject"
        requests.post(
            f"{BASE_URL}/channels/rewards/redemptions/{action}",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={"id": redemption["id"]},
        ).raise_for_status()
        print(f"{action}ed redemption {redemption['id']}")

# Usage
token = os.environ["KICK_USER_TOKEN"]
reward = create_reward(token, "Unban Request", 1000, "Be polite!")
print(f"Created reward: {reward['id']}")
process_pending_redemptions(token, 333)
```

---

## Best Practices & Production Hardening

### Idempotent Webhook Processing

- Redemption status changes fire `channel.reward.redemption.updated` events. Use `Kick-Event-Message-Id` for deduplication.
- The `id` field on the redemption object is stable and can be used for idempotent accept/reject operations.

### Token Refresh Lifecycle

- User Access Tokens expire. Implement automatic token refresh before expiry.
- If the token is revoked, reward management operations will fail with `401`.

### Avoid Infinite Loops

- If your bot auto-accepts redemptions and that triggers webhook events, do not re-process already-accepted/rejected redemptions.
- Filter by `status: "pending"` when polling redemptions.

### Secure Secret Storage

- Store User Access Tokens in environment variables or secrets managers.
- Never hardcode tokens in source code.

### Logging Recommendations

- Log redemption IDs, reward IDs, and actions taken (accept/reject) for audit trails.
- Never log user access tokens.

### Graceful Degradation

- If the rewards API is temporarily unavailable, queue redemption processing and retry later.
- Implement exponential backoff for transient failures.

---

## Known Issues & Community Notes

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| Changelog 03/12/2025 | Channel Rewards APIs added | Released | Initial release of rewards CRUD endpoints |
| Changelog 15/01/2026 | Channel Reward Redemptions APIs | Released | Added redemption retrieval and accept/reject endpoints |
| [#315](https://github.com/KickEngineering/KickDevDocs/issues/315) | Webhook fires for gift subs even when payment fails | Open | May affect perception of reward economy if related to sub-based rewards |

### Redemption Status Flow

```
User redeems reward
       |
       v
  status: "pending"
       |
       +---> Accept endpoint --> status: "accepted"
       |
       +---> Reject endpoint --> status: "rejected" (points refunded)
```

---

## Quick Reference Table

| Method | Path | Auth | Scope | Description |
|--------|------|------|-------|-------------|
| `GET` | `/public/v1/channels/rewards` | User Token | `channel:rewards:read` | List rewards |
| `POST` | `/public/v1/channels/rewards` | User Token | `channel:rewards:write` | Create reward |
| `PATCH` | `/public/v1/channels/rewards/{id}` | User Token | `channel:rewards:write` | Update reward |
| `DELETE` | `/public/v1/channels/rewards/{id}` | User Token | `channel:rewards:write` | Delete reward |
| `GET` | `/public/v1/channels/rewards/redemptions` | User Token | `channel:rewards:read` | List redemptions |
| `POST` | `/public/v1/channels/rewards/redemptions/accept` | User Token | `channel:rewards:write` | Accept redemption |
| `POST` | `/public/v1/channels/rewards/redemptions/reject` | User Token | `channel:rewards:write` | Reject redemption |
