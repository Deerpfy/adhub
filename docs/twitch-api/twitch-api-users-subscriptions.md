---
title: "Twitch API — Users & Subscriptions"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Twitch API — Users & Subscriptions

> **Source:** https://dev.twitch.tv/docs/api/reference/#get-users, https://dev.twitch.tv/docs/api/reference/#get-broadcaster-subscriptions
> **Last verified:** 2025-05-01
> **API Base URL:** `https://api.twitch.tv/helix`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Get Users](#2-get-users)
3. [Update User](#3-update-user)
4. [Get User Block List](#4-get-user-block-list)
5. [Block User](#5-block-user)
6. [Unblock User](#6-unblock-user)
7. [Get User Extensions](#7-get-user-extensions)
8. [Get User Active Extensions](#8-get-user-active-extensions)
9. [Update User Extensions](#9-update-user-extensions)
10. [Get Broadcaster Subscriptions](#10-get-broadcaster-subscriptions)
11. [Check User Subscription](#11-check-user-subscription)
12. [Related EventSub Types](#12-related-eventsub-types)
13. [Best Practices](#13-best-practices)
14. [Known Issues & Community Quirks](#14-known-issues--community-quirks)
15. [Quick Reference Table](#15-quick-reference-table)

---

## 1. Overview

The Users endpoints allow you to retrieve and update Twitch user information, manage block lists, and configure extensions. The Subscriptions endpoints provide access to channel subscription data, including listing all subscribers and checking individual subscription status.

### Authentication Summary

| Endpoint | Token Type | Required Scope |
|---|---|---|
| Get Users | App Access Token or User Access Token | None (user:read:email for email field) |
| Update User | User Access Token | `user:edit` |
| Get User Block List | User Access Token | `user:read:blocked_users` |
| Block User | User Access Token | `user:manage:blocked_users` |
| Unblock User | User Access Token | `user:manage:blocked_users` |
| Get User Extensions | User Access Token | `user:read:broadcast` or `user:edit:broadcast` |
| Get User Active Extensions | User Access Token or App Access Token | `user:read:broadcast` or `user:edit:broadcast` (for user token) |
| Update User Extensions | User Access Token | `user:edit:broadcast` |
| Get Broadcaster Subscriptions | User Access Token | `channel:read:subscriptions` |
| Check User Subscription | User Access Token | `user:read:subscriptions` |

---

## 2. Get Users

Retrieves information about one or more Twitch users. If no `id` or `login` query parameters are provided, returns information about the authenticated user (requires a User Access Token).

### Endpoint

```
GET https://api.twitch.tv/helix/users
```

### Authentication

- **App Access Token** or **User Access Token**
- To include the `email` field in the response, a User Access Token with the `user:read:email` scope is required

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | No | User ID. Specify up to 100 IDs. Repeat the parameter for multiple values. |
| `login` | string | No | User login name. Specify up to 100 logins. Repeat the parameter for multiple values. Case-insensitive. |

> **Note:** If both `id` and `login` are omitted, the endpoint returns the user associated with the access token. This requires a User Access Token.

### Response Body

| Field | Type | Description |
|---|---|---|
| `data` | array | Array of user objects |
| `data[].id` | string | User's unique ID |
| `data[].login` | string | User's login name (lowercase) |
| `data[].display_name` | string | User's display name (may include capitalization) |
| `data[].type` | string | User type: `"admin"`, `"global_mod"`, `"staff"`, or `""` (normal user) |
| `data[].broadcaster_type` | string | Broadcaster type: `"affiliate"`, `"partner"`, or `""` (normal) |
| `data[].description` | string | User's channel description (bio) |
| `data[].profile_image_url` | string | URL of the user's profile image |
| `data[].offline_image_url` | string | URL of the user's offline image |
| `data[].view_count` | integer | **Deprecated.** Total number of views. Not updated since April 2022. |
| `data[].email` | string | User's verified email. Only included if the token has `user:read:email` scope and the request is for the authenticated user. |
| `data[].created_at` | string | RFC 3339 timestamp of when the account was created |

### Example Response

```json
{
  "data": [
    {
      "id": "141981764",
      "login": "twitchdev",
      "display_name": "TwitchDev",
      "type": "",
      "broadcaster_type": "partner",
      "description": "Supporting third-party developers building Twitch integrations.",
      "profile_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/8a6381c7-d0c0-4576-b179-38bd5ce1d6af-profile_image-300x300.png",
      "offline_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/3f13ab61-ec78-4fe6-8481-8682cb3b0ac2-channel_offline_image-1920x1080.png",
      "view_count": 0,
      "email": "not-real@email.com",
      "created_at": "2016-12-14T20:32:28Z"
    }
  ]
}
```

### cURL Examples

```bash
# Get a single user by login
curl -X GET 'https://api.twitch.tv/helix/users?login=twitchdev' \
  -H 'Authorization: Bearer <access_token>' \
  -H 'Client-Id: <client_id>'

# Get multiple users by ID
curl -X GET 'https://api.twitch.tv/helix/users?id=141981764&id=12345678' \
  -H 'Authorization: Bearer <access_token>' \
  -H 'Client-Id: <client_id>'

# Get the authenticated user (with email)
curl -X GET 'https://api.twitch.tv/helix/users' \
  -H 'Authorization: Bearer <user_access_token_with_email_scope>' \
  -H 'Client-Id: <client_id>'

# Mix IDs and logins
curl -X GET 'https://api.twitch.tv/helix/users?id=141981764&login=twitchdev2' \
  -H 'Authorization: Bearer <access_token>' \
  -H 'Client-Id: <client_id>'
```

### Twitch CLI Examples

```bash
# Get user by login
twitch api get /users -q login=twitchdev

# Get user by ID
twitch api get /users -q id=141981764

# Get multiple users
twitch api get /users -q login=twitchdev -q login=twitchgaming

# Get authenticated user (uses token from `twitch token`)
twitch api get /users
```

---

## 3. Update User

Updates the description of the authenticated user.

### Endpoint

```
PUT https://api.twitch.tv/helix/users
```

### Authentication

- **User Access Token**
- Required scope: `user:edit`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `description` | string | No | New description for the user's channel. Maximum 300 characters. To clear the description, set to an empty string `""`. |

> **Note:** Although `description` is marked as optional, calling the endpoint without it still returns the user object with no changes applied. The only updatable field via this endpoint is the description.

### Response Body

Returns the updated user object with the same fields as [Get Users](#2-get-users).

### cURL Examples

```bash
# Update user description
curl -X PUT 'https://api.twitch.tv/helix/users?description=Hello%20from%20my%20bot!' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>'

# Clear user description
curl -X PUT 'https://api.twitch.tv/helix/users?description=' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>'
```

### Twitch CLI Examples

```bash
# Update user description
twitch api put /users -q description="Hello from my bot!"
```

---

## 4. Get User Block List

Retrieves the list of users that the specified broadcaster has blocked.

### Endpoint

```
GET https://api.twitch.tv/helix/users/blocks
```

### Authentication

- **User Access Token**
- Required scope: `user:read:blocked_users`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `broadcaster_id` | string | Yes | The ID of the user whose block list to retrieve. Must match the user ID in the access token. |
| `first` | integer | No | Maximum number of results per page. Range: 1-100. Default: 20. |
| `after` | string | No | Cursor for forward pagination. |

### Response Body

| Field | Type | Description |
|---|---|---|
| `data` | array | Array of blocked user objects |
| `data[].user_id` | string | Blocked user's ID |
| `data[].user_login` | string | Blocked user's login name |
| `data[].display_name` | string | Blocked user's display name |
| `pagination` | object | Pagination information |
| `pagination.cursor` | string | Cursor for the next page of results |

### cURL Examples

```bash
# Get block list
curl -X GET 'https://api.twitch.tv/helix/users/blocks?broadcaster_id=141981764' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>'

# Get block list with pagination
curl -X GET 'https://api.twitch.tv/helix/users/blocks?broadcaster_id=141981764&first=50&after=<cursor>' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>'
```

### Twitch CLI Examples

```bash
# Get block list
twitch api get /users/blocks -q broadcaster_id=141981764

# Get block list with limit
twitch api get /users/blocks -q broadcaster_id=141981764 -q first=50
```

---

## 5. Block User

Blocks a user on behalf of the authenticated user.

### Endpoint

```
PUT https://api.twitch.tv/helix/users/blocks
```

### Authentication

- **User Access Token**
- Required scope: `user:manage:blocked_users`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `target_user_id` | string | Yes | The ID of the user to block |
| `source_context` | string | No | Source context for the block. Values: `"chat"`, `"whisper"` |
| `reason` | string | No | Reason for the block. Values: `"spam"`, `"harassment"`, `"other"` |

### Response Codes

| Status | Description |
|---|---|
| `204 No Content` | Successfully blocked the user |
| `400 Bad Request` | Invalid or missing parameters |
| `401 Unauthorized` | Invalid or missing access token, or token lacks required scope |

### cURL Examples

```bash
# Block a user
curl -X PUT 'https://api.twitch.tv/helix/users/blocks?target_user_id=198704263' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>'

# Block a user with context and reason
curl -X PUT 'https://api.twitch.tv/helix/users/blocks?target_user_id=198704263&source_context=chat&reason=spam' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>'
```

### Twitch CLI Examples

```bash
# Block a user
twitch api put /users/blocks -q target_user_id=198704263

# Block with reason
twitch api put /users/blocks -q target_user_id=198704263 -q source_context=chat -q reason=harassment
```

---

## 6. Unblock User

Unblocks a user on behalf of the authenticated user.

### Endpoint

```
DELETE https://api.twitch.tv/helix/users/blocks
```

### Authentication

- **User Access Token**
- Required scope: `user:manage:blocked_users`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `target_user_id` | string | Yes | The ID of the user to unblock |

### Response Codes

| Status | Description |
|---|---|
| `204 No Content` | Successfully unblocked the user |
| `400 Bad Request` | Invalid or missing parameters |
| `401 Unauthorized` | Invalid or missing access token, or token lacks required scope |

### cURL Examples

```bash
# Unblock a user
curl -X DELETE 'https://api.twitch.tv/helix/users/blocks?target_user_id=198704263' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>'
```

### Twitch CLI Examples

```bash
# Unblock a user
twitch api delete /users/blocks -q target_user_id=198704263
```

---

## 7. Get User Extensions

Retrieves a list of all extensions (active and inactive) that the authenticated user has installed. The list includes extensions that the user has installed but not activated, as well as currently active extensions.

### Endpoint

```
GET https://api.twitch.tv/helix/users/extensions
```

### Authentication

- **User Access Token**
- Required scope: `user:read:broadcast` or `user:edit:broadcast`

### Query Parameters

None.

### Response Body

| Field | Type | Description |
|---|---|---|
| `data` | array | Array of extension objects |
| `data[].id` | string | Extension ID |
| `data[].version` | string | Extension version |
| `data[].name` | string | Extension name |
| `data[].can_activate` | boolean | Whether the extension can be activated |
| `data[].type` | array of strings | Extension types: `"component"`, `"mobile"`, `"overlay"`, `"panel"` |

### Example Response

```json
{
  "data": [
    {
      "id": "wi08ebtatdc7oj83wtl9uxwz807l8b",
      "version": "1.1.8",
      "name": "Streamlabs Leaderboard",
      "can_activate": true,
      "type": [
        "panel"
      ]
    },
    {
      "id": "d4uvtfdr04uq6raoenvj7m86gdk16v",
      "version": "2.0.2",
      "name": "Stream Avatar",
      "can_activate": true,
      "type": [
        "component",
        "overlay"
      ]
    }
  ]
}
```

### cURL Examples

```bash
# Get all installed extensions for authenticated user
curl -X GET 'https://api.twitch.tv/helix/users/extensions' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>'
```

### Twitch CLI Examples

```bash
# Get installed extensions
twitch api get /users/extensions
```

---

## 8. Get User Active Extensions

Retrieves the active extensions for the specified user or the authenticated user. Returns which extensions are currently active in the user's panels, overlays, and component slots.

### Endpoint

```
GET https://api.twitch.tv/helix/users/extensions/list
```

### Authentication

- **User Access Token** with scope `user:read:broadcast` or `user:edit:broadcast`
- **App Access Token** (when specifying `user_id`)

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | No | The ID of the user whose active extensions to retrieve. If omitted, returns the authenticated user's active extensions. |

### Response Body

| Field | Type | Description |
|---|---|---|
| `data` | object | Object containing extension slot categories |
| `data.panel` | object | Panel extension slots (keys: `"1"`, `"2"`, `"3"`) |
| `data.overlay` | object | Overlay extension slots (key: `"1"`) |
| `data.component` | object | Component extension slots (keys: `"1"`, `"2"`) |

Each slot object contains:

| Field | Type | Description |
|---|---|---|
| `active` | boolean | Whether an extension is active in this slot |
| `id` | string | Extension ID (only if active) |
| `version` | string | Extension version (only if active) |
| `name` | string | Extension name (only if active) |
| `x` | integer | X position for component extensions |
| `y` | integer | Y position for component extensions |

### Example Response

```json
{
  "data": {
    "panel": {
      "1": {
        "active": true,
        "id": "wi08ebtatdc7oj83wtl9uxwz807l8b",
        "version": "1.1.8",
        "name": "Streamlabs Leaderboard"
      },
      "2": {
        "active": false
      },
      "3": {
        "active": false
      }
    },
    "overlay": {
      "1": {
        "active": false
      }
    },
    "component": {
      "1": {
        "active": true,
        "id": "d4uvtfdr04uq6raoenvj7m86gdk16v",
        "version": "2.0.2",
        "name": "Stream Avatar",
        "x": 100,
        "y": 200
      },
      "2": {
        "active": false
      }
    }
  }
}
```

### cURL Examples

```bash
# Get active extensions for authenticated user
curl -X GET 'https://api.twitch.tv/helix/users/extensions/list' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>'

# Get active extensions for a specific user (App Access Token)
curl -X GET 'https://api.twitch.tv/helix/users/extensions/list?user_id=141981764' \
  -H 'Authorization: Bearer <app_access_token>' \
  -H 'Client-Id: <client_id>'
```

### Twitch CLI Examples

```bash
# Get active extensions for authenticated user
twitch api get /users/extensions/list

# Get active extensions for a specific user
twitch api get /users/extensions/list -q user_id=141981764
```

---

## 9. Update User Extensions

Updates the active extensions for the authenticated user. You can activate, deactivate, or rearrange extensions in the panel, overlay, and component slots.

### Endpoint

```
PUT https://api.twitch.tv/helix/users/extensions
```

### Authentication

- **User Access Token**
- Required scope: `user:edit:broadcast`

### Request Body

The request body must be a JSON object containing a `data` object with `panel`, `overlay`, and/or `component` sections. You only need to include the sections you want to update.

```json
{
  "data": {
    "panel": {
      "1": {
        "active": true,
        "id": "wi08ebtatdc7oj83wtl9uxwz807l8b",
        "version": "1.1.8"
      },
      "2": {
        "active": false
      },
      "3": {
        "active": false
      }
    },
    "overlay": {
      "1": {
        "active": false
      }
    },
    "component": {
      "1": {
        "active": true,
        "id": "d4uvtfdr04uq6raoenvj7m86gdk16v",
        "version": "2.0.2",
        "x": 100,
        "y": 200
      },
      "2": {
        "active": false
      }
    }
  }
}
```

### Slot Limits

| Type | Available Slots | Description |
|---|---|---|
| `panel` | `"1"` through `"3"` | Below the video player |
| `overlay` | `"1"` | Over the video player |
| `component` | `"1"` through `"2"` | Positioned over the video player (x, y coordinates) |

### Response Body

Returns the updated active extensions object with the same structure as [Get User Active Extensions](#8-get-user-active-extensions).

### cURL Examples

```bash
# Activate a panel extension in slot 1
curl -X PUT 'https://api.twitch.tv/helix/users/extensions' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>' \
  -H 'Content-Type: application/json' \
  -d '{
    "data": {
      "panel": {
        "1": {
          "active": true,
          "id": "wi08ebtatdc7oj83wtl9uxwz807l8b",
          "version": "1.1.8"
        }
      }
    }
  }'

# Deactivate all extensions
curl -X PUT 'https://api.twitch.tv/helix/users/extensions' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>' \
  -H 'Content-Type: application/json' \
  -d '{
    "data": {
      "panel": {
        "1": {"active": false},
        "2": {"active": false},
        "3": {"active": false}
      },
      "overlay": {
        "1": {"active": false}
      },
      "component": {
        "1": {"active": false},
        "2": {"active": false}
      }
    }
  }'
```

### Twitch CLI Examples

```bash
# Update extensions (pass JSON body via -b flag)
twitch api put /users/extensions -b '{
  "data": {
    "panel": {
      "1": {
        "active": true,
        "id": "wi08ebtatdc7oj83wtl9uxwz807l8b",
        "version": "1.1.8"
      }
    }
  }
}'
```

---

## 10. Get Broadcaster Subscriptions

Retrieves a list of users that subscribe to the specified broadcaster. This endpoint can be used to get all subscribers or filter for specific users.

### Endpoint

```
GET https://api.twitch.tv/helix/subscriptions
```

### Authentication

- **User Access Token**
- Required scope: `channel:read:subscriptions`
- The user ID in the token must match the `broadcaster_id`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `broadcaster_id` | string | Yes | The ID of the broadcaster whose subscribers to retrieve. Must match the authenticated user. |
| `user_id` | string | No | Filter by specific user IDs. Specify up to 100 IDs. Repeat the parameter for multiple values. |
| `first` | integer | No | Maximum number of results per page. Range: 1-100. Default: 20. |
| `after` | string | No | Cursor for forward pagination. |

### Response Body

| Field | Type | Description |
|---|---|---|
| `data` | array | Array of subscription objects |
| `data[].broadcaster_id` | string | Broadcaster's user ID |
| `data[].broadcaster_login` | string | Broadcaster's login name |
| `data[].broadcaster_name` | string | Broadcaster's display name |
| `data[].gifter_id` | string | ID of the user who gifted the subscription. Empty string if not a gift. |
| `data[].gifter_login` | string | Login of the gifter. Empty string if not a gift. |
| `data[].gifter_name` | string | Display name of the gifter. Empty string if not a gift. |
| `data[].is_gift` | boolean | Whether the subscription is a gift |
| `data[].plan_name` | string | Name of the subscription plan (custom name set by broadcaster) |
| `data[].tier` | string | Subscription tier: `"1000"` (Tier 1), `"2000"` (Tier 2), `"3000"` (Tier 3) |
| `data[].user_id` | string | Subscriber's user ID |
| `data[].user_login` | string | Subscriber's login name |
| `data[].user_name` | string | Subscriber's display name |
| `pagination` | object | Pagination information |
| `pagination.cursor` | string | Cursor for the next page of results |
| `total` | integer | Total number of subscriptions for the broadcaster |
| `points` | integer | Total subscription points. Tier 1 = 1 point, Tier 2 = 2 points, Tier 3 = 6 points. |

### Example Response

```json
{
  "data": [
    {
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "gifter_id": "",
      "gifter_login": "",
      "gifter_name": "",
      "is_gift": false,
      "plan_name": "Channel Subscription (twitchdev)",
      "tier": "1000",
      "user_id": "527115020",
      "user_login": "twitchgaming",
      "user_name": "TwitchGaming"
    },
    {
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "gifter_id": "12345678",
      "gifter_login": "generous_user",
      "gifter_name": "Generous_User",
      "is_gift": true,
      "plan_name": "Channel Subscription (twitchdev)",
      "tier": "2000",
      "user_id": "98765432",
      "user_login": "lucky_recipient",
      "user_name": "Lucky_Recipient"
    }
  ],
  "pagination": {
    "cursor": "xxxx"
  },
  "total": 35,
  "points": 45
}
```

### cURL Examples

```bash
# Get all subscribers
curl -X GET 'https://api.twitch.tv/helix/subscriptions?broadcaster_id=141981764' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>'

# Check if specific users are subscribed
curl -X GET 'https://api.twitch.tv/helix/subscriptions?broadcaster_id=141981764&user_id=527115020&user_id=98765432' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>'

# Paginate through subscribers
curl -X GET 'https://api.twitch.tv/helix/subscriptions?broadcaster_id=141981764&first=100&after=<cursor>' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>'
```

### Twitch CLI Examples

```bash
# Get all subscribers
twitch api get /subscriptions -q broadcaster_id=141981764

# Check specific subscriber
twitch api get /subscriptions -q broadcaster_id=141981764 -q user_id=527115020

# Get subscribers with pagination limit
twitch api get /subscriptions -q broadcaster_id=141981764 -q first=100
```

---

## 11. Check User Subscription

Checks whether a specific user is subscribed to a specific broadcaster. This is used to verify a user's subscription status from the subscriber's perspective, as opposed to the broadcaster's.

### Endpoint

```
GET https://api.twitch.tv/helix/subscriptions/user
```

### Authentication

- **User Access Token**
- Required scope: `user:read:subscriptions`
- The `user_id` parameter must match the user ID in the access token

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `broadcaster_id` | string | Yes | The ID of the broadcaster to check subscription for |
| `user_id` | string | Yes | The ID of the user to check. Must match the authenticated user. |

### Response Body

| Field | Type | Description |
|---|---|---|
| `data` | array | Array containing a single subscription object (if subscribed) |
| `data[].broadcaster_id` | string | Broadcaster's user ID |
| `data[].broadcaster_login` | string | Broadcaster's login name |
| `data[].broadcaster_name` | string | Broadcaster's display name |
| `data[].gifter_id` | string | ID of the user who gifted the subscription. Empty string if not a gift. |
| `data[].gifter_login` | string | Login of the gifter. Empty string if not a gift. |
| `data[].gifter_name` | string | Display name of the gifter. Empty string if not a gift. |
| `data[].is_gift` | boolean | Whether the subscription is a gift |
| `data[].tier` | string | Subscription tier: `"1000"`, `"2000"`, or `"3000"` |

### Error Responses

| Status | Description |
|---|---|
| `404 Not Found` | The user is not subscribed to the specified broadcaster |

### Example Response (Subscribed)

```json
{
  "data": [
    {
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "gifter_id": "",
      "gifter_login": "",
      "gifter_name": "",
      "is_gift": false,
      "tier": "1000"
    }
  ]
}
```

### Example Response (Not Subscribed)

```json
{
  "error": "Not Found",
  "status": 404,
  "message": "twitchdev does not subscribe to twitchgaming"
}
```

### cURL Examples

```bash
# Check if user is subscribed to a broadcaster
curl -X GET 'https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=141981764&user_id=527115020' \
  -H 'Authorization: Bearer <user_access_token>' \
  -H 'Client-Id: <client_id>'
```

### Twitch CLI Examples

```bash
# Check subscription status
twitch api get /subscriptions/user -q broadcaster_id=141981764 -q user_id=527115020
```

---

## 12. Related EventSub Types

### User Events

| EventSub Type | Version | Description | Required Scope | Condition |
|---|---|---|---|---|
| `user.update` | 1 | A user updates their account. Triggered when display name, description, email, or profile/offline images change. | No authorization required | `user_id` |
| `user.authorization.grant` | 1 | A user grants authorization to your application. Fires when a user authorizes your client ID. | No authorization required | `client_id` |
| `user.authorization.revoke` | 1 | A user revokes authorization from your application. Fires when a user disconnects your app from their Twitch settings. | No authorization required | `client_id` |
| `user.whisper.message` | 1 | A user receives a whisper. | `user:read:whispers` or `user:manage:whispers` | `user_id` |

### Subscription Events

| EventSub Type | Version | Description | Required Scope | Condition |
|---|---|---|---|---|
| `channel.subscribe` | 1 | A user subscribes to a channel. Does not fire for gift subs (the recipient does not trigger this event; use `channel.subscription.gift` instead). | `channel:read:subscriptions` | `broadcaster_user_id` |
| `channel.subscription.end` | 1 | A subscription to a channel expires or is canceled. | `channel:read:subscriptions` | `broadcaster_user_id` |
| `channel.subscription.gift` | 1 | A user gifts one or more subscriptions in a channel. | `channel:read:subscriptions` | `broadcaster_user_id` |
| `channel.subscription.message` | 1 | A user sends a resubscription message in a channel. Triggered when a subscriber sends a chat message as part of their resub notification. | `channel:read:subscriptions` | `broadcaster_user_id` |

### EventSub Payload Examples

#### user.update

```json
{
  "subscription": {
    "id": "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
    "type": "user.update",
    "version": "1",
    "status": "enabled",
    "condition": {
      "user_id": "141981764"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://example.com/webhooks/twitch"
    },
    "created_at": "2023-04-15T18:30:22.335256813Z"
  },
  "event": {
    "user_id": "141981764",
    "user_login": "twitchdev",
    "user_name": "TwitchDev",
    "email": "not-real@email.com",
    "email_verified": true,
    "description": "Updated bio text here."
  }
}
```

#### channel.subscribe

```json
{
  "subscription": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "type": "channel.subscribe",
    "version": "1",
    "status": "enabled",
    "condition": {
      "broadcaster_user_id": "141981764"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://example.com/webhooks/twitch"
    },
    "created_at": "2023-04-15T18:30:22.335256813Z"
  },
  "event": {
    "user_id": "527115020",
    "user_login": "twitchgaming",
    "user_name": "TwitchGaming",
    "broadcaster_user_id": "141981764",
    "broadcaster_user_login": "twitchdev",
    "broadcaster_user_name": "TwitchDev",
    "tier": "1000",
    "is_gift": false
  }
}
```

#### channel.subscription.gift

```json
{
  "subscription": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "type": "channel.subscription.gift",
    "version": "1",
    "status": "enabled",
    "condition": {
      "broadcaster_user_id": "141981764"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://example.com/webhooks/twitch"
    },
    "created_at": "2023-04-15T18:30:22.335256813Z"
  },
  "event": {
    "user_id": "12345678",
    "user_login": "generous_gifter",
    "user_name": "Generous_Gifter",
    "broadcaster_user_id": "141981764",
    "broadcaster_user_login": "twitchdev",
    "broadcaster_user_name": "TwitchDev",
    "total": 5,
    "tier": "1000",
    "cumulative_total": 25,
    "is_anonymous": false
  }
}
```

#### channel.subscription.message

```json
{
  "subscription": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "type": "channel.subscription.message",
    "version": "1",
    "status": "enabled",
    "condition": {
      "broadcaster_user_id": "141981764"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://example.com/webhooks/twitch"
    },
    "created_at": "2023-04-15T18:30:22.335256813Z"
  },
  "event": {
    "user_id": "527115020",
    "user_login": "twitchgaming",
    "user_name": "TwitchGaming",
    "broadcaster_user_id": "141981764",
    "broadcaster_user_login": "twitchdev",
    "broadcaster_user_name": "TwitchDev",
    "tier": "1000",
    "message": {
      "text": "Love this channel! Subscribed for 12 months!",
      "emotes": [
        {
          "begin": 0,
          "end": 3,
          "id": "emotesv2_abc123"
        }
      ]
    },
    "cumulative_months": 12,
    "streak_months": 8,
    "duration_months": 1
  }
}
```

---

## 13. Best Practices

### User Data

- **Cache user data aggressively.** User profile information changes infrequently. Cache responses for at least 5-10 minutes to reduce API calls.
- **Use IDs, not logins.** Login names can change; user IDs are permanent. Always store and reference users by their numeric ID.
- **Batch requests where possible.** The Get Users endpoint accepts up to 100 IDs or logins per request. Batch lookups instead of making individual calls.
- **Handle the deprecated `view_count` field.** This field is no longer updated. Do not rely on it for any logic. It may be removed in a future API version.
- **Request `user:read:email` only when necessary.** The email field is only available for the authenticated user and requires a specific scope. Only request this scope if your application genuinely needs the user's email address.

### Block List

- **The `broadcaster_id` must match the token owner.** You cannot retrieve another user's block list. The authenticated user can only view and manage their own blocks.
- **Handle large block lists with pagination.** Some users may have thousands of blocked users. Always implement pagination when retrieving block lists.
- **The `source_context` and `reason` parameters are optional metadata.** They are informational and do not affect the block behavior. Include them if you have the data available, as Twitch may use them for safety reporting.

### Extensions

- **Always specify the correct version.** Extension activation will fail if the version does not match an installed version. Use Get User Extensions first to discover available versions.
- **Include all slots when updating.** When updating extensions, include the full state of all slots in the section you are modifying. Omitting a slot may not preserve its current state.
- **Component extensions require x/y coordinates.** When activating a component extension, you must provide valid `x` and `y` positioning values.

### Subscriptions

- **Pagination is essential.** Large channels may have tens of thousands of subscribers. Always paginate through results using the `after` cursor.
- **Use the `user_id` filter for targeted lookups.** If you need to check specific users, use the `user_id` query parameter on the Get Broadcaster Subscriptions endpoint rather than paginating through the entire list.
- **Understand tier values.** Tiers are represented as strings: `"1000"` (Tier 1 / $4.99), `"2000"` (Tier 2 / $9.99), `"3000"` (Tier 3 / $24.99). The numeric values originated from Twitch's internal billing system.
- **Use Check User Subscription for viewer-side checks.** When a viewer needs to verify their own subscription status, use the `/subscriptions/user` endpoint with `user:read:subscriptions` scope. This does not require the broadcaster's token.
- **Handle 404 for non-subscribers.** The Check User Subscription endpoint returns 404 when the user is not subscribed. This is expected behavior, not an error.
- **Subscribe to EventSub for real-time updates.** Instead of polling, use `channel.subscribe`, `channel.subscription.end`, `channel.subscription.gift`, and `channel.subscription.message` EventSub events for immediate notification of subscription changes.
- **Subscription points calculation.** The `points` field in the Get Broadcaster Subscriptions response counts Tier 1 as 1 point, Tier 2 as 2 points, and Tier 3 as 6 points. This can be useful for tracking community sub goals.

### Rate Limiting

- **Respect rate limits.** Twitch enforces rate limits across all Helix endpoints. Monitor the `Ratelimit-Remaining` and `Ratelimit-Reset` response headers.
- **Implement exponential backoff.** When you receive a `429 Too Many Requests` response, back off exponentially before retrying.
- **The default rate limit is 800 requests per minute** per client ID for App Access Tokens, and 800 per minute per user per client ID for User Access Tokens.

---

## 14. Known Issues & Community Quirks

### view_count Is Frozen

The `view_count` field in the user object has not been updated since approximately April 2022. Twitch deprecated this field but has not removed it from the API response. It will always return a stale value. Do not use it for any meaningful calculation.

### Profile Image URL Caching

Profile image URLs returned by Get Users may use CDN caching. After a user changes their profile picture, the old URL may still resolve to the cached (old) image for some time. If you display profile pictures, consider appending a cache-busting query parameter or checking the URL for changes periodically.

### Display Name vs Login

The `login` field is always lowercase. The `display_name` field preserves the user's preferred capitalization and may include non-ASCII characters for localized display names (e.g., Korean, Japanese). Always use `login` for URL construction and machine comparisons; use `display_name` for UI presentation.

### Block/Unblock Idempotency

Blocking an already-blocked user or unblocking an already-unblocked user both return `204 No Content` without error. These operations are idempotent, which simplifies error handling.

### Extension Slot Numbering

Extension slot numbers are **string keys**, not integers. The API expects `"1"`, `"2"`, `"3"` as object keys, not `1`, `2`, `3`. Sending integer keys in JSON will cause unexpected behavior.

### Get Broadcaster Subscriptions Includes the Broadcaster

The Get Broadcaster Subscriptions response includes the broadcaster themselves if they are considered a subscriber to their own channel (which is always the case). This means the `total` count includes the broadcaster. Subtract 1 if you want the actual external subscriber count.

### Check User Subscription 404 Behavior

The Check User Subscription endpoint returns a `404` HTTP status when the user is not subscribed. This is by design, but it differs from most Twitch endpoints that return an empty `data` array for "not found" results. Ensure your error handling treats a 404 from this endpoint as "not subscribed" rather than as an API error.

### Gifter Fields Empty When Not a Gift

When `is_gift` is `false`, the `gifter_id`, `gifter_login`, and `gifter_name` fields are present in the response but contain empty strings. They are not omitted from the response.

### Subscription Tier as String

Subscription tiers are always strings (`"1000"`, `"2000"`, `"3000"`), not integers. This is a common source of bugs when developers compare tiers numerically. Always treat tiers as strings or convert consistently.

### user.update EventSub Fires Frequently

The `user.update` EventSub type can fire more frequently than expected. It triggers not just for profile changes but also when Twitch's internal systems update user records. Do not assume every `user.update` event represents a user-initiated change. Compare the event payload against your cached data to determine what actually changed.

### user.authorization.revoke Delay

The `user.authorization.revoke` event may not fire immediately when a user disconnects your app. There can be a delay of several minutes. Do not rely on this event for immediate access revocation; always validate tokens regularly.

---

## 15. Quick Reference Table

### Users Endpoints

| Endpoint | Method | URL | Auth | Scope | Pagination |
|---|---|---|---|---|---|
| Get Users | GET | `/helix/users` | App or User | None (user:read:email for email) | No |
| Update User | PUT | `/helix/users` | User | `user:edit` | No |
| Get User Block List | GET | `/helix/users/blocks` | User | `user:read:blocked_users` | Yes |
| Block User | PUT | `/helix/users/blocks` | User | `user:manage:blocked_users` | No |
| Unblock User | DELETE | `/helix/users/blocks` | User | `user:manage:blocked_users` | No |
| Get User Extensions | GET | `/helix/users/extensions` | User | `user:read:broadcast` or `user:edit:broadcast` | No |
| Get User Active Extensions | GET | `/helix/users/extensions/list` | App or User | `user:read:broadcast` or `user:edit:broadcast` | No |
| Update User Extensions | PUT | `/helix/users/extensions` | User | `user:edit:broadcast` | No |

### Subscriptions Endpoints

| Endpoint | Method | URL | Auth | Scope | Pagination |
|---|---|---|---|---|---|
| Get Broadcaster Subscriptions | GET | `/helix/subscriptions` | User | `channel:read:subscriptions` | Yes |
| Check User Subscription | GET | `/helix/subscriptions/user` | User | `user:read:subscriptions` | No |

### Required Scopes Summary

| Scope | Used By |
|---|---|
| `user:read:email` | Get Users (email field) |
| `user:edit` | Update User |
| `user:read:blocked_users` | Get User Block List |
| `user:manage:blocked_users` | Block User, Unblock User |
| `user:read:broadcast` | Get User Extensions, Get User Active Extensions |
| `user:edit:broadcast` | Get User Extensions, Get User Active Extensions, Update User Extensions |
| `channel:read:subscriptions` | Get Broadcaster Subscriptions |
| `user:read:subscriptions` | Check User Subscription |

### HTTP Status Codes

| Status | Meaning |
|---|---|
| `200 OK` | Success with response body |
| `204 No Content` | Success with no response body (block/unblock) |
| `400 Bad Request` | Invalid or missing parameters |
| `401 Unauthorized` | Invalid, expired, or missing token; or insufficient scope |
| `404 Not Found` | User not subscribed (Check User Subscription) |
| `429 Too Many Requests` | Rate limit exceeded |

### Subscription Tier Values

| Tier String | Tier Name | Monthly Price (USD) | Subscription Points |
|---|---|---|---|
| `"1000"` | Tier 1 | $4.99 | 1 |
| `"2000"` | Tier 2 | $9.99 | 2 |
| `"3000"` | Tier 3 | $24.99 | 6 |
