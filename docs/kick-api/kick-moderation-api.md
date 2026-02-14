# Kick Moderation API

> **Source:** https://docs.kick.com/apis/moderation
> **GitHub Raw:** https://github.com/KickEngineering/KickDevDocs/blob/main/apis/moderation.md
> **Last verified:** 2026-02-13
> **API Base URL:** `https://api.kick.com/public/v1`

## Overview

The Moderation API enables applications to restrict user participation in chat rooms through temporary timeouts or permanent bans, as well as reverse these actions by unbanning or removing timeouts for specific users. These endpoints are essential for building moderation bots and chat management tools.

---

## Authentication

| Endpoint | Token Type | Required Scope |
|----------|-----------|----------------|
| `POST /public/v1/moderation/bans` | User Access Token | `moderation:ban` |
| `DELETE /public/v1/moderation/bans` | User Access Token | `moderation:ban` |

The authenticated user must have moderation privileges on the target channel (be the broadcaster or a moderator).

---

## Endpoints

### POST /public/v1/moderation/bans

Ban or timeout a user from a channel's chat.

#### HTTP Request

```
POST https://api.kick.com/public/v1/moderation/bans
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <user_access_token>` |
| `Content-Type` | Yes | string | `application/json` |

#### Request Body

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `broadcaster_user_id` | Yes | integer | The user ID of the channel to moderate |
| `banned_user_id` | Yes | integer | The user ID of the user to ban |
| `reason` | No | string | Reason for the ban |
| `duration` | No | integer | Ban duration in minutes. If omitted, the ban is permanent |

#### Ban vs Timeout Semantics

| Scenario | `duration` Value | Result |
|----------|-----------------|--------|
| Permanent ban | Omitted or `0` [VERIFY] | User is permanently banned from chat |
| Timed ban (timeout) | Positive integer | User is banned for the specified number of minutes |

#### Example Request: Permanent Ban

```bash
curl -X POST https://api.kick.com/public/v1/moderation/bans \
  -H "Authorization: Bearer ${USER_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "broadcaster_user_id": 123456789,
    "banned_user_id": 987654321,
    "reason": "Repeatedly violating chat rules"
  }'
```

#### Example Request: Timeout (5 minutes)

```bash
curl -X POST https://api.kick.com/public/v1/moderation/bans \
  -H "Authorization: Bearer ${USER_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "broadcaster_user_id": 123456789,
    "banned_user_id": 987654321,
    "reason": "Spam",
    "duration": 5
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
| `400` | Bad Request -- missing required fields, invalid user IDs |
| `401` | Unauthorized -- invalid or expired token |
| `403` | Forbidden -- token lacks `moderation:ban` scope, or user lacks moderation privileges |
| `404` | Not Found -- broadcaster or banned user does not exist [VERIFY] |

---

### DELETE /public/v1/moderation/bans

Unban or remove a timeout from a user. Restores their ability to participate in chat.

#### HTTP Request

```
DELETE https://api.kick.com/public/v1/moderation/bans
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <user_access_token>` |
| `Content-Type` | Yes | string | `application/json` |

#### Request Body

> **Note:** This endpoint uses a JSON body with a DELETE method, which is unconventional. See [GitHub Issue #338](https://github.com/KickEngineering/KickDevDocs/issues/338) for community discussion about this design choice.

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `broadcaster_user_id` | Yes | integer | The user ID of the channel |
| `banned_user_id` | Yes | integer | The user ID of the user to unban |

#### Example Request

```bash
curl -X DELETE https://api.kick.com/public/v1/moderation/bans \
  -H "Authorization: Bearer ${USER_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "broadcaster_user_id": 123456789,
    "banned_user_id": 987654321
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
| `400` | Bad Request -- missing required fields |
| `401` | Unauthorized -- invalid or expired token |
| `403` | Forbidden -- token lacks `moderation:ban` scope, or user lacks moderation privileges |
| `404` | Not Found -- user is not currently banned [VERIFY] |

---

## Webhook Integration: moderation.banned

When a user is banned (via the API or the Kick web interface), a `moderation.banned` webhook event is fired. Subscribe to this event to track moderation actions in real time.

### Event Details

- **Event name:** `moderation.banned`
- **Kick-Event-Type:** `moderation.banned`
- **Kick-Event-Version:** `1`

### Webhook Payload Example

```json
{
  "broadcaster": {
    "is_anonymous": false,
    "user_id": 123456789,
    "username": "broadcaster_name",
    "is_verified": true,
    "profile_picture": "https://example.com/broadcaster_avatar.jpg",
    "channel_slug": "broadcaster_channel",
    "identity": null
  },
  "moderator": {
    "is_anonymous": false,
    "user_id": 987654321,
    "username": "moderator_name",
    "is_verified": false,
    "profile_picture": "https://example.com/moderator_avatar.jpg",
    "channel_slug": "moderator_channel",
    "identity": null
  },
  "banned_user": {
    "is_anonymous": false,
    "user_id": 135790135,
    "username": "banned_user_name",
    "is_verified": false,
    "profile_picture": "https://example.com/banned_user_avatar.jpg",
    "channel_slug": "banned_user_channel",
    "identity": null
  },
  "metadata": {
    "reason": "Spam",
    "created_at": "2025-01-14T16:08:05Z",
    "expires_at": "2025-01-14T16:10:06Z"
  }
}
```

#### Permanent Ban vs Timeout in Webhook

- **Permanent ban:** `metadata.expires_at` is `null`
- **Timeout:** `metadata.expires_at` contains the expiry datetime

See [kick-webhook-payloads-event-types.md](./kick-webhook-payloads-event-types.md#event-9-moderation-banned-moderationbanned) for the complete schema.

---

## Moderator Permission Model

### Who Can Moderate

- **Broadcaster:** The channel owner has full moderation rights
- **Moderators:** Users granted moderator status by the broadcaster

### API Token Requirements

The User Access Token must belong to a user who has moderation rights on the target channel. A user token for a non-moderator will receive a `403` error.

### Bot Moderation

For a bot to moderate:
1. Create a bot user account on Kick
2. The broadcaster must grant moderator status to the bot account
3. Obtain a User Access Token for the bot with `moderation:ban` scope
4. Use that token for moderation API calls

---

## Chat Message Moderation

To delete individual chat messages, use the Chat API:

```
DELETE /public/v1/chat/{message_id}?broadcaster_user_id=123456789
```

This requires the `moderation:chat_message:manage` scope instead of `moderation:ban`. See [kick-chat-api.md](./kick-chat-api.md).

---

## TypeScript Example

```typescript
const BASE_URL = 'https://api.kick.com/public/v1';

async function banUser(
  token: string,
  broadcasterUserId: number,
  bannedUserId: number,
  reason?: string,
  durationMinutes?: number,
): Promise<void> {
  const body: Record<string, unknown> = {
    broadcaster_user_id: broadcasterUserId,
    banned_user_id: bannedUserId,
  };
  if (reason) body.reason = reason;
  if (durationMinutes) body.duration = durationMinutes;

  const response = await fetch(`${BASE_URL}/moderation/bans`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Ban failed: ${response.status} ${await response.text()}`);
  }
}

async function unbanUser(
  token: string,
  broadcasterUserId: number,
  bannedUserId: number,
): Promise<void> {
  const response = await fetch(`${BASE_URL}/moderation/bans`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      broadcaster_user_id: broadcasterUserId,
      banned_user_id: bannedUserId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Unban failed: ${response.status} ${await response.text()}`);
  }
}

async function timeoutUser(
  token: string,
  broadcasterUserId: number,
  userId: number,
  minutes: number,
  reason?: string,
): Promise<void> {
  return banUser(token, broadcasterUserId, userId, reason, minutes);
}

// Usage
const modToken = process.env.MOD_ACCESS_TOKEN!;
const channelId = 123456789;

// Permanent ban
await banUser(modToken, channelId, 999, 'Hate speech');

// 5-minute timeout
await timeoutUser(modToken, channelId, 888, 5, 'Slow down');

// Unban
await unbanUser(modToken, channelId, 999);
```

## Python Example

```python
import os
import requests

BASE_URL = "https://api.kick.com/public/v1"

def ban_user(
    token: str,
    broadcaster_user_id: int,
    banned_user_id: int,
    reason: str | None = None,
    duration_minutes: int | None = None,
) -> None:
    """Ban or timeout a user from a channel."""
    body = {
        "broadcaster_user_id": broadcaster_user_id,
        "banned_user_id": banned_user_id,
    }
    if reason:
        body["reason"] = reason
    if duration_minutes:
        body["duration"] = duration_minutes

    response = requests.post(
        f"{BASE_URL}/moderation/bans",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=body,
    )
    response.raise_for_status()

def unban_user(
    token: str,
    broadcaster_user_id: int,
    banned_user_id: int,
) -> None:
    """Unban a user from a channel."""
    response = requests.delete(
        f"{BASE_URL}/moderation/bans",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "broadcaster_user_id": broadcaster_user_id,
            "banned_user_id": banned_user_id,
        },
    )
    response.raise_for_status()

def timeout_user(
    token: str,
    broadcaster_user_id: int,
    user_id: int,
    minutes: int,
    reason: str | None = None,
) -> None:
    """Timeout a user for a specified number of minutes."""
    ban_user(token, broadcaster_user_id, user_id, reason, minutes)

# Usage
mod_token = os.environ["MOD_ACCESS_TOKEN"]
channel_id = 123456789

# Permanent ban
ban_user(mod_token, channel_id, 999, reason="Hate speech")

# 5-minute timeout
timeout_user(mod_token, channel_id, 888, minutes=5, reason="Slow down")

# Unban
unban_user(mod_token, channel_id, 999)
```

---

## Best Practices & Production Hardening

### Avoid Infinite Loops in Moderation Bots

- If your bot auto-bans based on `chat.message.sent` events and also processes `moderation.banned` events, ensure the ban action doesn't trigger another ban check.
- Always check `sender.user_id` against your bot's ID when processing chat events.

### Idempotent Ban Processing

- Banning an already-banned user should be handled gracefully (check response codes).
- Use `Kick-Event-Message-Id` for deduplication when processing `moderation.banned` webhook events.

### DELETE with Body Limitation

- The `DELETE /moderation/bans` endpoint requires a JSON body, which is unconventional and may not work with all HTTP clients/frameworks.
- Some HTTP libraries (e.g., older versions of `fetch`, certain proxy servers) strip the body from DELETE requests.
- Workaround: Use a library that explicitly supports sending a body with DELETE requests.

### Permission Verification

- Before attempting moderation actions, verify the authenticated user has moderator status on the channel.
- Handle `403` errors gracefully -- the bot may have been removed as moderator.

### Token Refresh Lifecycle

- Moderation bots run continuously. Implement proactive token refresh to avoid downtime.

### Secure Secret Storage

- Store moderation bot tokens in environment variables.
- Moderation tokens are high-privilege -- protect them accordingly.

### Logging Recommendations

- Log all moderation actions: who was banned, by whom, reason, duration, channel.
- This creates an audit trail for review.
- Never log access tokens.

### Graceful Degradation

- If the moderation API is temporarily unavailable, queue ban/unban actions for retry.
- Implement exponential backoff for transient failures.

---

## Known Issues & Community Notes

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#338](https://github.com/KickEngineering/KickDevDocs/issues/338) | DELETE with body violates HTTP semantics | Open | DELETE `/moderation/bans` requires JSON body; suggests moving to query params |
| [#217](https://github.com/KickEngineering/KickDevDocs/issues/217) | Inconsistent ban behavior: API vs web interface | Open | Banning via API works but not via web UI (and vice versa for bots) |

### Bulk Operations

There is no documented bulk ban/unban endpoint. To ban multiple users, make individual API calls for each user.

### Missing Endpoints

The following moderation features are NOT available in the public API:
- **Get banned users list** -- no endpoint to retrieve currently banned users [VERIFY]
- **Get moderator list** -- no endpoint to retrieve current moderators [VERIFY]
- **Add/remove moderator** -- no endpoint to grant/revoke moderator status

---

## Quick Reference Table

| Method | Path | Auth | Scope | Description |
|--------|------|------|-------|-------------|
| `POST` | `/public/v1/moderation/bans` | User Token | `moderation:ban` | Ban or timeout a user |
| `DELETE` | `/public/v1/moderation/bans` | User Token | `moderation:ban` | Unban / remove timeout |
| `DELETE` | `/public/v1/chat/{message_id}` | User Token | `moderation:chat_message:manage` | Delete a chat message (see Chat API) |
