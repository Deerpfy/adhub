---
title: "Kick Users API"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Kick Users API

> **Source:** https://docs.kick.com/apis/users
> **GitHub Raw:** https://github.com/KickEngineering/KickDevDocs/blob/main/apis/users.md
> **Last verified:** 2026-02-13
> **API Base URL:** `https://api.kick.com/public/v1`

## Overview

The Users API allows applications to interact with user information on Kick. Available data depends on the scopes attached to the authorization token. Sensitive data is only available to User Access Tokens with the required scopes.

---

## Authentication

| Endpoint | Token Type | Required Scope |
|----------|-----------|----------------|
| `GET /public/v1/users` | User Access Token | `user:read` |
| `POST /oauth/token/introspect` | App or User Access Token | None (uses the token itself) |

> **Note:** The Token Introspect endpoint was moved from `/public/v1/token/introspect` to `id.kick.com/oauth/token/introspect` as of 15/01/2026. See [kick-oauth2-flow.md](./kick-oauth2-flow.md).

---

## Endpoints

### GET /public/v1/users

Retrieve user information for the authenticated user or for specific users by ID.

#### HTTP Request

```
GET https://api.kick.com/public/v1/users
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <user_access_token>` |

#### Query Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `id` | No | integer[] | One or more user IDs to look up. Repeat parameter for multiple: `?id=123&id=456` |

> **Note:** If no `id` parameter is provided, the endpoint returns information about the authenticated user (the user who authorized the token).

#### Example Request: Get Authenticated User

```bash
curl -X GET https://api.kick.com/public/v1/users \
  -H "Authorization: Bearer ${USER_ACCESS_TOKEN}"
```

#### Example Request: Get Specific Users

```bash
curl -X GET "https://api.kick.com/public/v1/users?id=123456&id=789012" \
  -H "Authorization: Bearer ${USER_ACCESS_TOKEN}"
```

#### Response (200 OK)

```json
{
  "data": [
    {
      "user_id": 123456789,
      "username": "example_user",
      "email": "user@example.com",
      "profile_picture": "https://example.com/avatar.jpg",
      "bio": "Hello, I am an example user!",
      "socials": [],
      "streamer_channel": {
        "channel_id": 987654,
        "slug": "example_user",
        "is_banned": false
      },
      "account_created_at": "2023-01-15T10:30:00Z"
    }
  ],
  "message": "OK"
}
```

#### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | Array of user objects |
| `data[].user_id` | number | Unique user identifier |
| `data[].username` | string | The user's username |
| `data[].email` | string | The user's email address (requires `user:read` scope) [VERIFY if always present] |
| `data[].profile_picture` | string | URL to the user's profile picture |
| `data[].bio` | string | User's biography/about text |
| `data[].socials` | array | Array of social media links [VERIFY exact structure] |
| `data[].streamer_channel` | object | The user's channel information |
| `data[].streamer_channel.channel_id` | number | The channel's unique ID |
| `data[].streamer_channel.slug` | string | The channel's URL slug |
| `data[].streamer_channel.is_banned` | boolean | Whether the channel is banned |
| `data[].account_created_at` | string (ISO 8601) | When the account was created [VERIFY field name] |
| `message` | string | Status message |

> **Note:** The exact response schema is defined in the OpenAPI spec at `https://api.kick.com/swagger/doc.yaml` which returned 403 at the time of documentation. Fields marked [VERIFY] should be confirmed against the live API. Some fields may only be present for the authenticated user (e.g., `email`).

#### Error Responses

| Status Code | Description |
|-------------|-------------|
| `401` | Unauthorized -- invalid or expired token |
| `403` | Forbidden -- token lacks `user:read` scope |

---

### POST /oauth/token/introspect (formerly /public/v1/token/introspect)

Check if an access token is valid and retrieve metadata. See [kick-oauth2-flow.md](./kick-oauth2-flow.md#token-introspection) for full documentation.

> **Deprecation Notice:** The endpoint at `/public/v1/token/introspect` is deprecated as of 15/01/2026. Use `https://id.kick.com/oauth/token/introspect` instead.

---

## TypeScript Example

```typescript
const BASE_URL = 'https://api.kick.com/public/v1';

interface User {
  user_id: number;
  username: string;
  email?: string;
  profile_picture: string;
  bio: string;
  socials: unknown[];
  streamer_channel: {
    channel_id: number;
    slug: string;
    is_banned: boolean;
  };
  account_created_at: string;
}

async function getAuthenticatedUser(accessToken: string): Promise<User> {
  const response = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user: ${response.status}`);
  }

  const body = await response.json();
  return body.data[0];
}

async function getUsersByIds(
  accessToken: string,
  userIds: number[],
): Promise<User[]> {
  const params = userIds.map((id) => `id=${id}`).join('&');
  const response = await fetch(`${BASE_URL}/users?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get users: ${response.status}`);
  }

  const body = await response.json();
  return body.data;
}

// Usage
const token = process.env.KICK_USER_TOKEN!;
const me = await getAuthenticatedUser(token);
console.log(`Logged in as: ${me.username} (ID: ${me.user_id})`);

const users = await getUsersByIds(token, [123, 456, 789]);
for (const user of users) {
  console.log(`${user.username}: ${user.bio}`);
}
```

## Python Example

```python
import os
import requests

BASE_URL = "https://api.kick.com/public/v1"

def get_authenticated_user(access_token: str) -> dict:
    """Get the authenticated user's information."""
    response = requests.get(
        f"{BASE_URL}/users",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    response.raise_for_status()
    return response.json()["data"][0]

def get_users_by_ids(access_token: str, user_ids: list[int]) -> list[dict]:
    """Get user information for specific user IDs."""
    params = [("id", uid) for uid in user_ids]
    response = requests.get(
        f"{BASE_URL}/users",
        headers={"Authorization": f"Bearer {access_token}"},
        params=params,
    )
    response.raise_for_status()
    return response.json()["data"]

# Usage
token = os.environ["KICK_USER_TOKEN"]
me = get_authenticated_user(token)
print(f"Logged in as: {me['username']} (ID: {me['user_id']})")

users = get_users_by_ids(token, [123, 456, 789])
for user in users:
    print(f"{user['username']}: {user.get('bio', 'No bio')}")
```

---

## Best Practices & Production Hardening

### Cache User Data

- User profiles change infrequently. Cache responses for 5-15 minutes.
- Use webhook events to invalidate cache when relevant changes occur.

### Handle Empty Fields

- Some users may have empty `username` or `email` fields (see [GitHub Issue #325](https://github.com/KickEngineering/KickDevDocs/issues/325)).
- Always handle `null` or empty strings gracefully.

### Profile Picture Handling

- Profile pictures may return empty strings. Use a default avatar as fallback.
- See [GitHub Issue #97](https://github.com/KickEngineering/KickDevDocs/issues/97): `profile_picture` data was returning empty for some users (fixed).

### Token Refresh Lifecycle

- User Access Tokens expire. Implement automatic refresh before expiry.
- If the token is revoked, API requests return `401`.

### Secure Secret Storage

- Store access tokens in environment variables, not in source code.
- Never expose user email addresses publicly.

### Idempotent Processing

- GET requests are naturally idempotent.

### Logging Recommendations

- Log user ID lookups and response status codes.
- Never log email addresses, access tokens, or PII in production.

---

## Known Issues & Community Notes

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#325](https://github.com/KickEngineering/KickDevDocs/issues/325) | Empty username and email for user | Closed | Some users from OAuth signup have empty fields |
| [#97](https://github.com/KickEngineering/KickDevDocs/issues/97) | profile_picture data coming back empty | Closed | Fixed; profile pictures now return correctly |
| [#118](https://github.com/KickEngineering/KickDevDocs/issues/118) | How to retrieve UserID using username? | Closed (Planned) | No username-to-UserID lookup endpoint exists; must use channel slug via Channels API |
| [#101](https://github.com/KickEngineering/KickDevDocs/issues/101) | Token introspect lacks user identification | Closed | Token introspect now includes user info [VERIFY] |
| [#98](https://github.com/KickEngineering/KickDevDocs/discussions/98) | Apps disappeared after name change | Discussion | Username change may affect app ownership |
| Changelog 15/01/2026 | Token introspect moved to /oauth | Released | Old path `/public/v1/token/introspect` deprecated |

### Username-to-UserID Lookup

There is no direct endpoint to look up a user by username. Workarounds:
1. Use `GET /public/v1/channels?slug=username` to get channel info which includes the user ID
2. Use the Token Introspect endpoint if you have the user's token

---

## Quick Reference Table

| Method | Path | Auth | Scope | Description |
|--------|------|------|-------|-------------|
| `GET` | `/public/v1/users` | User Token | `user:read` | Get user information |
| `POST` | `id.kick.com/oauth/token/introspect` | App or User Token | None | Check token validity |
