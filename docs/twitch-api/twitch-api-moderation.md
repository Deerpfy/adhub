# Twitch API — Moderation

> **Source:** https://dev.twitch.tv/docs/api/reference/#check-automod-status
> **Last verified:** 2025-05-01 — [PAGE INACCESSIBLE - VERIFY AGAINST LIVE DOCS]
> **API Base URL:** `https://api.twitch.tv/helix`
> **Auth Base URL:** `https://id.twitch.tv`
> **EventSub WebSocket:** `wss://eventsub.wss.twitch.tv/ws`

## Overview

The Moderation endpoints provide tools for managing chat moderation, user bans, blocked terms, moderator roles, VIP status, AutoMod configuration, Shield Mode, warnings, and unban requests. These endpoints collectively form the backbone of channel moderation on Twitch, enabling both automated and manual moderation workflows.

All moderation endpoints require a User Access Token. Many endpoints follow a pattern where both `broadcaster_id` and `moderator_id` are required, allowing moderators to act on behalf of the broadcaster.

### Key Concepts

- **AutoMod** — Twitch's automated content moderation system that holds potentially inappropriate messages for moderator review before they appear in chat.
- **Blocked Terms** — Custom words or phrases that are automatically blocked from chat. Supports 2-500 character terms.
- **Shield Mode** — A protective mode that activates stricter moderation settings during raids or harassment. When enabled, non-subscriber messages are held for review.
- **Unban Requests** — A system allowing banned users to request an unban, which moderators can approve or deny.
- **Warnings** — A formal warning system that notifies users of rule violations without banning them.

---

## Table of Contents

1. [Check AutoMod Status](#1-check-automod-status)
2. [Manage Held AutoMod Messages](#2-manage-held-automod-messages)
3. [Get AutoMod Settings](#3-get-automod-settings)
4. [Update AutoMod Settings](#4-update-automod-settings)
5. [Get Banned Users](#5-get-banned-users)
6. [Ban User](#6-ban-user)
7. [Unban User](#7-unban-user)
8. [Get Blocked Terms](#8-get-blocked-terms)
9. [Add Blocked Term](#9-add-blocked-term)
10. [Remove Blocked Term](#10-remove-blocked-term)
11. [Delete Chat Messages](#11-delete-chat-messages)
12. [Get Moderators](#12-get-moderators)
13. [Add Channel Moderator](#13-add-channel-moderator)
14. [Remove Channel Moderator](#14-remove-channel-moderator)
15. [Get VIPs](#15-get-vips)
16. [Add Channel VIP](#16-add-channel-vip)
17. [Remove Channel VIP](#17-remove-channel-vip)
18. [Get Shield Mode Status](#18-get-shield-mode-status)
19. [Update Shield Mode Status](#19-update-shield-mode-status)
20. [Warn Chat User](#20-warn-chat-user)
21. [Get Unban Requests](#21-get-unban-requests)
22. [Resolve Unban Requests](#22-resolve-unban-requests)
23. [Quick Reference Table](#quick-reference-table)

---

## AutoMod Endpoints

### 1. Check AutoMod Status

Checks whether one or more messages would be held by AutoMod for the given broadcaster. Useful for pre-screening user-generated content before it enters chat.

**Endpoint:** `POST /moderation/enforcements/status`

**Authentication:** User Access Token
**Required Scope:** `moderation:read`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose AutoMod settings to check against |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | Array | Yes | Array of message objects to check (max 100) |
| `data[].msg_id` | String | Yes | A caller-defined ID used to correlate the request with the response |
| `data[].msg_text` | String | Yes | The message text to check |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array | Array of results, one per message submitted |
| `data[].msg_id` | String | The caller-defined ID from the request |
| `data[].is_permitted` | Boolean | `true` if the message would be allowed; `false` if AutoMod would hold it |

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/moderation/enforcements/status?broadcaster_id=123456' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "data": [
      {
        "msg_id": "check-1",
        "msg_text": "Hello, great stream!"
      },
      {
        "msg_id": "check-2",
        "msg_text": "This is a test message with potentially bad words"
      }
    ]
  }'
```

**Response Example:**

```json
{
  "data": [
    {
      "msg_id": "check-1",
      "is_permitted": true
    },
    {
      "msg_id": "check-2",
      "is_permitted": false
    }
  ]
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing or invalid `broadcaster_id`, empty `data` array, missing `msg_id` or `msg_text` |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks the `moderation:read` scope |

---

### 2. Manage Held AutoMod Messages

Allows or denies a message that AutoMod is holding for review. The moderator must have the `moderator:manage:automod` scope to approve or deny held messages.

**Endpoint:** `POST /moderation/automod/message`

**Authentication:** User Access Token
**Required Scope:** `moderator:manage:automod`

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | String | Yes | The ID of the moderator who is approving or denying the message |
| `msg_id` | String | Yes | The ID of the message to allow or deny. These IDs are surfaced via EventSub `automod.message.hold` events or the PubSub `chat_moderator_actions` topic |
| `action` | String | Yes | The action to take. Must be `ALLOW` or `DENY` |

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/moderation/automod/message' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "987654",
    "msg_id": "abc-123-def-456",
    "action": "ALLOW"
  }'
```

**Response:** `204 No Content` on success.

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Invalid `action` value (must be `ALLOW` or `DENY`), missing required fields |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks the `moderator:manage:automod` scope, or user is not a moderator for the channel |
| 404 | The message identified by `msg_id` was not found (may have already been handled or expired) |

---

### 3. Get AutoMod Settings

Gets the broadcaster's AutoMod settings. AutoMod uses these settings to determine which messages to hold for review.

**Endpoint:** `GET /moderation/automod/settings`

**Authentication:** User Access Token
**Required Scope:** `moderator:read:automod_settings`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose AutoMod settings to get |
| `moderator_id` | String | Yes | The ID of the user reading the settings. Must be the broadcaster or one of their moderators |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array | Array containing one object with the settings |
| `data[].broadcaster_id` | String | The broadcaster's ID |
| `data[].moderator_id` | String | The moderator's ID |
| `data[].overall_level` | Integer | The overall AutoMod level (0-4). `null` if individual levels are set |
| `data[].disability` | Integer | Level for disability-related terms (0-4) |
| `data[].aggression` | Integer | Level for aggressive language (0-4) |
| `data[].sexuality_sex_or_gender` | Integer | Level for sexuality, sex, or gender-related terms (0-4) |
| `data[].misogyny` | Integer | Level for misogynistic language (0-4) |
| `data[].bullying` | Integer | Level for bullying (0-4) |
| `data[].swearing` | Integer | Level for swear words (0-4) |
| `data[].race_ethnicity_or_religion` | Integer | Level for race, ethnicity, or religion-related terms (0-4) |
| `data[].sex_based_terms` | Integer | Level for sex-based terms (0-4) |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/moderation/automod/settings?broadcaster_id=123456&moderator_id=987654' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "broadcaster_id": "123456",
      "moderator_id": "987654",
      "overall_level": null,
      "disability": 2,
      "aggression": 3,
      "sexuality_sex_or_gender": 1,
      "misogyny": 2,
      "bullying": 3,
      "swearing": 1,
      "race_ethnicity_or_religion": 3,
      "sex_based_terms": 2
    }
  ]
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `broadcaster_id` or `moderator_id` |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks the `moderator:read:automod_settings` scope, or the user is not a moderator for the channel |

---

### 4. Update AutoMod Settings

Updates the broadcaster's AutoMod settings. You can set the `overall_level` to apply a blanket setting, or set individual category levels for granular control.

**Endpoint:** `PUT /moderation/automod/settings`

**Authentication:** User Access Token
**Required Scope:** `moderator:manage:automod_settings`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose AutoMod settings to update |
| `moderator_id` | String | Yes | The ID of the moderator making the update |

**Request Body (JSON):**

You must provide either `overall_level` OR individual category levels, not both.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `overall_level` | Integer | Conditional | Overall AutoMod level (0-4). Setting this overrides all individual levels. 0 = off |
| `aggression` | Integer | Conditional | Level for aggressive language (0-4) |
| `bullying` | Integer | Conditional | Level for bullying (0-4) |
| `disability` | Integer | Conditional | Level for disability-related terms (0-4) |
| `misogyny` | Integer | Conditional | Level for misogynistic language (0-4) |
| `race_ethnicity_or_religion` | Integer | Conditional | Level for race, ethnicity, or religion-related terms (0-4) |
| `sex_based_terms` | Integer | Conditional | Level for sex-based terms (0-4) |
| `sexuality_sex_or_gender` | Integer | Conditional | Level for sexuality, sex, or gender-related terms (0-4) |
| `swearing` | Integer | Conditional | Level for swear words (0-4) |

**cURL Example (overall level):**

```bash
curl -X PUT 'https://api.twitch.tv/helix/moderation/automod/settings?broadcaster_id=123456&moderator_id=987654' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "overall_level": 3
  }'
```

**cURL Example (individual levels):**

```bash
curl -X PUT 'https://api.twitch.tv/helix/moderation/automod/settings?broadcaster_id=123456&moderator_id=987654' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "aggression": 3,
    "bullying": 2,
    "disability": 1,
    "misogyny": 2,
    "race_ethnicity_or_religion": 3,
    "sex_based_terms": 1,
    "sexuality_sex_or_gender": 1,
    "swearing": 0
  }'
```

**Response Example:**

```json
{
  "data": [
    {
      "broadcaster_id": "123456",
      "moderator_id": "987654",
      "overall_level": null,
      "disability": 1,
      "aggression": 3,
      "sexuality_sex_or_gender": 1,
      "misogyny": 2,
      "bullying": 2,
      "swearing": 0,
      "race_ethnicity_or_religion": 3,
      "sex_based_terms": 1
    }
  ]
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Invalid level values (must be 0-4), provided both `overall_level` and individual levels, missing required parameters |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks the `moderator:manage:automod_settings` scope, or user is not a moderator for the channel |

---

## Banned Users Endpoints

### 5. Get Banned Users

Returns a list of users who are banned or timed out from the specified channel. Results are ordered by the ban creation date, with the most recent ban first.

**Endpoint:** `GET /moderation/banned`

**Authentication:** User Access Token
**Required Scope:** `moderation:read` or `moderator:manage:banned_users`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose ban list to get |
| `user_id` | String | No | Filter by specific user IDs. Can specify up to 100 IDs by repeating the parameter |
| `first` | Integer | No | Maximum number of results per page (1-100, default 20) |
| `after` | String | No | Cursor for forward pagination |
| `before` | String | No | Cursor for backward pagination |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array | Array of banned user objects |
| `data[].user_id` | String | The banned user's ID |
| `data[].user_login` | String | The banned user's login name |
| `data[].user_name` | String | The banned user's display name |
| `data[].expires_at` | String | RFC 3339 timestamp of when the ban expires. Empty string for permanent bans |
| `data[].created_at` | String | RFC 3339 timestamp of when the ban was created |
| `data[].reason` | String | The reason for the ban. Empty string if no reason was provided |
| `data[].moderator_id` | String | The ID of the moderator who issued the ban |
| `data[].moderator_login` | String | The login name of the moderator |
| `data[].moderator_name` | String | The display name of the moderator |
| `pagination` | Object | Pagination information |
| `pagination.cursor` | String | The cursor for the next page of results |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/moderation/banned?broadcaster_id=123456&first=10' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "user_id": "111222",
      "user_login": "banneduser",
      "user_name": "BannedUser",
      "expires_at": "",
      "created_at": "2025-03-15T10:30:00Z",
      "reason": "Repeated spam in chat",
      "moderator_id": "987654",
      "moderator_login": "moduser",
      "moderator_name": "ModUser"
    },
    {
      "user_id": "333444",
      "user_login": "timedoutuser",
      "user_name": "TimedOutUser",
      "expires_at": "2025-03-16T10:30:00Z",
      "created_at": "2025-03-15T10:30:00Z",
      "reason": "Cool down",
      "moderator_id": "987654",
      "moderator_login": "moduser",
      "moderator_name": "ModUser"
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6MX19"
  }
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `broadcaster_id`, too many `user_id` values (max 100) |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks required scope, or user is not the broadcaster or a moderator for the channel |

---

### 6. Ban User

Bans a user from the specified channel or puts them in a timeout. To issue a permanent ban, omit the `duration` field. To issue a timeout, include `duration` with a value in seconds (1 to 1,209,600 which is 14 days).

**Endpoint:** `POST /moderation/bans`

**Authentication:** User Access Token
**Required Scope:** `moderator:manage:banned_users`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose channel the user is being banned from |
| `moderator_id` | String | Yes | The ID of the moderator issuing the ban. Must be the broadcaster or one of their moderators |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | Object | Yes | The ban data |
| `data.user_id` | String | Yes | The ID of the user to ban |
| `data.duration` | Integer | No | Duration in seconds (1-1209600). Omit for permanent ban, include for timeout |
| `data.reason` | String | No | Reason for the ban (max 500 characters) |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array | Array containing one ban result object |
| `data[].broadcaster_id` | String | The broadcaster's ID |
| `data[].moderator_id` | String | The moderator's ID |
| `data[].user_id` | String | The banned user's ID |
| `data[].created_at` | String | RFC 3339 timestamp of when the ban was created |
| `data[].end_time` | String | RFC 3339 timestamp of when the ban expires. `null` for permanent bans |

**cURL Example (permanent ban):**

```bash
curl -X POST 'https://api.twitch.tv/helix/moderation/bans?broadcaster_id=123456&moderator_id=987654' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "data": {
      "user_id": "111222",
      "reason": "Hate speech in chat"
    }
  }'
```

**cURL Example (timeout for 10 minutes):**

```bash
curl -X POST 'https://api.twitch.tv/helix/moderation/bans?broadcaster_id=123456&moderator_id=987654' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "data": {
      "user_id": "111222",
      "duration": 600,
      "reason": "Please calm down"
    }
  }'
```

**Response Example (permanent ban):**

```json
{
  "data": [
    {
      "broadcaster_id": "123456",
      "moderator_id": "987654",
      "user_id": "111222",
      "created_at": "2025-03-15T10:30:00Z",
      "end_time": null
    }
  ]
}
```

**Response Example (timeout):**

```json
{
  "data": [
    {
      "broadcaster_id": "123456",
      "moderator_id": "987654",
      "user_id": "111222",
      "created_at": "2025-03-15T10:30:00Z",
      "end_time": "2025-03-15T10:40:00Z"
    }
  ]
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required fields, `duration` out of range (1-1209600), `reason` too long (max 500), trying to ban the broadcaster |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks `moderator:manage:banned_users` scope, or user is not a moderator for the channel |
| 409 | The user is already banned |
| 429 | Rate limit exceeded |

---

### 7. Unban User

Removes a ban or timeout from a user in the specified channel.

**Endpoint:** `DELETE /moderation/bans`

**Authentication:** User Access Token
**Required Scope:** `moderator:manage:banned_users`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose channel the user is being unbanned from |
| `moderator_id` | String | Yes | The ID of the moderator removing the ban |
| `user_id` | String | Yes | The ID of the user to unban |

**cURL Example:**

```bash
curl -X DELETE 'https://api.twitch.tv/helix/moderation/bans?broadcaster_id=123456&moderator_id=987654&user_id=111222' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response:** `204 No Content` on success.

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required query parameters |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks `moderator:manage:banned_users` scope, or user is not a moderator for the channel |
| 404 | The specified user is not banned in the channel |
| 429 | Rate limit exceeded |

---

## Blocked Terms Endpoints

### 8. Get Blocked Terms

Gets the list of blocked terms that the broadcaster has created for their channel. These terms are automatically blocked from chat messages.

**Endpoint:** `GET /moderation/blocked_terms`

**Authentication:** User Access Token
**Required Scope:** `moderator:read:blocked_terms`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose blocked terms to get |
| `moderator_id` | String | Yes | The ID of the moderator requesting the list |
| `first` | Integer | No | Maximum number of results per page (1-100, default 20) |
| `after` | String | No | Cursor for forward pagination |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array | Array of blocked term objects |
| `data[].broadcaster_id` | String | The broadcaster's ID |
| `data[].moderator_id` | String | The ID of the moderator who added the term |
| `data[].id` | String | The unique ID of the blocked term |
| `data[].text` | String | The blocked term text |
| `data[].created_at` | String | RFC 3339 timestamp of when the term was added |
| `data[].updated_at` | String | RFC 3339 timestamp of when the term was last updated |
| `data[].expires_at` | String | RFC 3339 timestamp of when the term expires. `null` if it does not expire |
| `pagination` | Object | Pagination information |
| `pagination.cursor` | String | The cursor for the next page |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/moderation/blocked_terms?broadcaster_id=123456&moderator_id=987654&first=25' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "broadcaster_id": "123456",
      "moderator_id": "987654",
      "id": "term-abc-123",
      "text": "badword",
      "created_at": "2025-01-10T08:00:00Z",
      "updated_at": "2025-01-10T08:00:00Z",
      "expires_at": null
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6MX19"
  }
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `broadcaster_id` or `moderator_id` |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks `moderator:read:blocked_terms` scope, or user is not a moderator for the channel |

---

### 9. Add Blocked Term

Adds a blocked term to the broadcaster's channel. The term must be between 2 and 500 characters. Twitch performs partial matching on blocked terms, so a blocked term of "cat" would block messages containing "cat", "cats", "scattered", etc.

**Endpoint:** `POST /moderation/blocked_terms`

**Authentication:** User Access Token
**Required Scope:** `moderator:manage:blocked_terms`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose channel to add the term to |
| `moderator_id` | String | Yes | The ID of the moderator adding the term |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | String | Yes | The term to block (2-500 characters) |

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/moderation/blocked_terms?broadcaster_id=123456&moderator_id=987654' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "offensive phrase"
  }'
```

**Response Example:**

```json
{
  "data": [
    {
      "broadcaster_id": "123456",
      "moderator_id": "987654",
      "id": "term-def-456",
      "text": "offensive phrase",
      "created_at": "2025-03-15T12:00:00Z",
      "updated_at": "2025-03-15T12:00:00Z",
      "expires_at": null
    }
  ]
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `text`, text too short (min 2 chars) or too long (max 500 chars), missing query parameters |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks `moderator:manage:blocked_terms` scope, or user is not a moderator for the channel |
| 409 | The term already exists for this channel |

---

### 10. Remove Blocked Term

Removes a blocked term from the broadcaster's channel.

**Endpoint:** `DELETE /moderation/blocked_terms`

**Authentication:** User Access Token
**Required Scope:** `moderator:manage:blocked_terms`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose channel to remove the term from |
| `moderator_id` | String | Yes | The ID of the moderator removing the term |
| `id` | String | Yes | The ID of the blocked term to remove |

**cURL Example:**

```bash
curl -X DELETE 'https://api.twitch.tv/helix/moderation/blocked_terms?broadcaster_id=123456&moderator_id=987654&id=term-abc-123' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response:** `204 No Content` on success.

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required query parameters |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks `moderator:manage:blocked_terms` scope, or user is not a moderator for the channel |
| 404 | The specified term ID was not found |

---

## Chat Messages Endpoints

### 11. Delete Chat Messages

Removes a single chat message or clears all messages from the broadcaster's chat room. To delete a specific message, include the `message_id` parameter. To clear all messages, omit `message_id`.

**Endpoint:** `DELETE /moderation/chat`

**Authentication:** User Access Token
**Required Scope:** `moderator:manage:chat_messages`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose chat room to delete messages from |
| `moderator_id` | String | Yes | The ID of the moderator performing the action |
| `message_id` | String | No | The ID of the message to delete. Omit to clear all messages in chat |

**cURL Example (delete specific message):**

```bash
curl -X DELETE 'https://api.twitch.tv/helix/moderation/chat?broadcaster_id=123456&moderator_id=987654&message_id=msg-abc-123' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**cURL Example (clear all chat):**

```bash
curl -X DELETE 'https://api.twitch.tv/helix/moderation/chat?broadcaster_id=123456&moderator_id=987654' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response:** `204 No Content` on success.

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `broadcaster_id` or `moderator_id`, invalid `message_id` |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks `moderator:manage:chat_messages` scope, or user is not a moderator for the channel |
| 404 | The specified message was not found or has already been deleted |

**Notes:**
- You cannot delete messages from the broadcaster (the broadcaster's messages are protected).
- You cannot delete messages older than 6 hours.
- Clearing all chat messages is the equivalent of the `/clear` chat command.

---

## Moderator Endpoints

### 12. Get Moderators

Gets a list of moderators for the specified channel.

**Endpoint:** `GET /moderation/moderators`

**Authentication:** User Access Token
**Required Scope:** `moderation:read` or `moderator:read:moderators`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose moderators to get |
| `user_id` | String | No | Filter by specific user IDs. Can specify up to 100 IDs by repeating the parameter |
| `first` | Integer | No | Maximum number of results per page (1-100, default 20) |
| `after` | String | No | Cursor for forward pagination |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array | Array of moderator objects |
| `data[].user_id` | String | The moderator's user ID |
| `data[].user_login` | String | The moderator's login name |
| `data[].user_name` | String | The moderator's display name |
| `pagination` | Object | Pagination information |
| `pagination.cursor` | String | The cursor for the next page |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=123456&first=50' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "user_id": "987654",
      "user_login": "moduser",
      "user_name": "ModUser"
    },
    {
      "user_id": "555666",
      "user_login": "anothermod",
      "user_name": "AnotherMod"
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6Mn19"
  }
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `broadcaster_id`, too many `user_id` values (max 100) |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks required scope |

---

### 13. Add Channel Moderator

Adds a moderator to the broadcaster's channel.

**Endpoint:** `POST /moderation/moderators`

**Authentication:** User Access Token
**Required Scope:** `channel:manage:moderators`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose channel to add a moderator to. Must match the user in the access token |
| `user_id` | String | Yes | The ID of the user to add as a moderator |

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=123456&user_id=555666' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response:** `204 No Content` on success.

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required query parameters, user is already a moderator |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks `channel:manage:moderators` scope, or the authenticated user is not the broadcaster |
| 422 | The user is already a VIP. Remove VIP status before adding as moderator |
| 429 | Rate limit exceeded |

---

### 14. Remove Channel Moderator

Removes a moderator from the broadcaster's channel.

**Endpoint:** `DELETE /moderation/moderators`

**Authentication:** User Access Token
**Required Scope:** `channel:manage:moderators`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose channel to remove the moderator from. Must match the user in the access token |
| `user_id` | String | Yes | The ID of the moderator to remove |

**cURL Example:**

```bash
curl -X DELETE 'https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=123456&user_id=555666' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response:** `204 No Content` on success.

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required query parameters, user is not a moderator |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks `channel:manage:moderators` scope, or the authenticated user is not the broadcaster |
| 429 | Rate limit exceeded |

---

## VIP Endpoints

### 15. Get VIPs

Gets a list of VIPs for the specified channel. VIPs have certain chat privileges such as not being affected by slow mode or sub-only mode.

**Endpoint:** `GET /channels/vips`

**Authentication:** User Access Token
**Required Scope:** `channel:read:vips` or `channel:manage:vips`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose VIPs to get |
| `user_id` | String | No | Filter by specific user IDs. Can specify up to 100 IDs by repeating the parameter |
| `first` | Integer | No | Maximum number of results per page (1-100, default 20) |
| `after` | String | No | Cursor for forward pagination |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array | Array of VIP objects |
| `data[].user_id` | String | The VIP's user ID |
| `data[].user_login` | String | The VIP's login name |
| `data[].user_name` | String | The VIP's display name |
| `pagination` | Object | Pagination information |
| `pagination.cursor` | String | The cursor for the next page |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/channels/vips?broadcaster_id=123456&first=50' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "user_id": "444555",
      "user_login": "vipuser",
      "user_name": "VIPUser"
    },
    {
      "user_id": "666777",
      "user_login": "anothervip",
      "user_name": "AnotherVIP"
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6Mn19"
  }
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `broadcaster_id`, too many `user_id` values (max 100) |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks required scope |

---

### 16. Add Channel VIP

Adds a VIP to the broadcaster's channel.

**Endpoint:** `POST /channels/vips`

**Authentication:** User Access Token
**Required Scope:** `channel:manage:vips`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose channel to add a VIP to. Must match the user in the access token |
| `user_id` | String | Yes | The ID of the user to add as a VIP |

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/channels/vips?broadcaster_id=123456&user_id=444555' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response:** `204 No Content` on success.

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required query parameters |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks `channel:manage:vips` scope, or the authenticated user is not the broadcaster |
| 409 | The user is already a VIP |
| 422 | The channel does not have available VIP slots. VIP slots are based on the number of channel subscriptions |
| 429 | Rate limit exceeded |

**Notes:**
- The number of available VIP slots is based on the channel's subscription count.
- A user cannot be both a VIP and a moderator. Remove moderator status first if needed.

---

### 17. Remove Channel VIP

Removes a VIP from the broadcaster's channel.

**Endpoint:** `DELETE /channels/vips`

**Authentication:** User Access Token
**Required Scope:** `channel:manage:vips`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose channel to remove the VIP from. Must match the user in the access token |
| `user_id` | String | Yes | The ID of the VIP to remove |

**cURL Example:**

```bash
curl -X DELETE 'https://api.twitch.tv/helix/channels/vips?broadcaster_id=123456&user_id=444555' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response:** `204 No Content` on success.

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required query parameters, user is not a VIP |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks `channel:manage:vips` scope, or the authenticated user is not the broadcaster |
| 429 | Rate limit exceeded |

---

## Shield Mode Endpoints

### 18. Get Shield Mode Status

Gets the broadcaster's Shield Mode activation status. Shield Mode is a feature that helps protect streamers during targeted attacks by activating stricter chat moderation settings.

**Endpoint:** `GET /moderation/shield_mode`

**Authentication:** User Access Token
**Required Scope:** `moderator:read:shield_mode` or `moderator:manage:shield_mode`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose Shield Mode status to get |
| `moderator_id` | String | Yes | The ID of the moderator requesting the status |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array | Array containing one Shield Mode status object |
| `data[].is_active` | Boolean | `true` if Shield Mode is active |
| `data[].moderator_id` | String | The ID of the moderator who last activated or deactivated Shield Mode |
| `data[].moderator_login` | String | The login name of that moderator |
| `data[].moderator_name` | String | The display name of that moderator |
| `data[].last_activated_at` | String | RFC 3339 timestamp of when Shield Mode was last activated |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/moderation/shield_mode?broadcaster_id=123456&moderator_id=987654' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "is_active": true,
      "moderator_id": "987654",
      "moderator_login": "moduser",
      "moderator_name": "ModUser",
      "last_activated_at": "2025-03-15T14:00:00Z"
    }
  ]
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `broadcaster_id` or `moderator_id` |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks required scope, or user is not a moderator for the channel |

---

### 19. Update Shield Mode Status

Activates or deactivates Shield Mode for the specified broadcaster's channel.

**Endpoint:** `PUT /moderation/shield_mode`

**Authentication:** User Access Token
**Required Scope:** `moderator:manage:shield_mode`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose Shield Mode to update |
| `moderator_id` | String | Yes | The ID of the moderator making the update |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `is_active` | Boolean | Yes | `true` to activate Shield Mode, `false` to deactivate |

**cURL Example:**

```bash
curl -X PUT 'https://api.twitch.tv/helix/moderation/shield_mode?broadcaster_id=123456&moderator_id=987654' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "is_active": true
  }'
```

**Response Example:**

```json
{
  "data": [
    {
      "is_active": true,
      "moderator_id": "987654",
      "moderator_login": "moduser",
      "moderator_name": "ModUser",
      "last_activated_at": "2025-03-15T14:30:00Z"
    }
  ]
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `is_active`, missing required query parameters |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks `moderator:manage:shield_mode` scope, or user is not a moderator for the channel |

---

## Warning Endpoints

### 20. Warn Chat User

Sends a warning to a user in the specified broadcaster's chat. The warning is displayed to the user in chat and recorded. Users who receive a warning must acknowledge it before they can continue chatting.

**Endpoint:** `POST /moderation/warnings`

**Authentication:** User Access Token
**Required Scope:** `moderator:manage:warnings`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose channel the warning is being issued in |
| `moderator_id` | String | Yes | The ID of the moderator issuing the warning |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | Object | Yes | The warning data |
| `data.user_id` | String | Yes | The ID of the user to warn |
| `data.reason` | String | Yes | The reason for the warning (max 500 characters) |

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/moderation/warnings?broadcaster_id=123456&moderator_id=987654' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "data": {
      "user_id": "111222",
      "reason": "Please follow the chat rules. This is your first warning."
    }
  }'
```

**Response Example:**

```json
{
  "data": [
    {
      "broadcaster_id": "123456",
      "user_id": "111222",
      "moderator_id": "987654",
      "reason": "Please follow the chat rules. This is your first warning."
    }
  ]
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required fields, `reason` too long (max 500 chars), trying to warn the broadcaster |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks `moderator:manage:warnings` scope, or user is not a moderator for the channel |
| 429 | Rate limit exceeded |

---

## Unban Request Endpoints

### 21. Get Unban Requests

Gets a list of unban requests for the specified broadcaster's channel. Unban requests allow banned users to request to be unbanned, providing moderators with a structured way to review and manage these requests.

**Endpoint:** `GET /moderation/unban_requests`

**Authentication:** User Access Token
**Required Scope:** `moderator:read:unban_requests` or `moderator:manage:unban_requests`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose unban requests to get |
| `moderator_id` | String | Yes | The ID of the moderator viewing the requests |
| `status` | String | Yes | Filter by status. Must be one of: `pending`, `approved`, `denied`, `acknowledged`, `canceled` |
| `user_id` | String | No | Filter by the requesting user's ID |
| `after` | String | No | Cursor for forward pagination |
| `first` | Integer | No | Maximum number of results per page (1-100, default 20) |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array | Array of unban request objects |
| `data[].id` | String | The unique ID of the unban request |
| `data[].broadcaster_id` | String | The broadcaster's ID |
| `data[].broadcaster_login` | String | The broadcaster's login name |
| `data[].broadcaster_name` | String | The broadcaster's display name |
| `data[].moderator_id` | String | The ID of the moderator who resolved the request (empty if pending) |
| `data[].moderator_login` | String | The login of the moderator who resolved the request |
| `data[].moderator_name` | String | The display name of the moderator who resolved the request |
| `data[].user_id` | String | The ID of the user requesting the unban |
| `data[].user_login` | String | The login of the requesting user |
| `data[].user_name` | String | The display name of the requesting user |
| `data[].text` | String | The user's unban request message |
| `data[].status` | String | The status of the request: `pending`, `approved`, `denied`, `acknowledged`, `canceled` |
| `data[].created_at` | String | RFC 3339 timestamp of when the request was created |
| `data[].resolved_at` | String | RFC 3339 timestamp of when the request was resolved (empty if pending) |
| `data[].resolution_text` | String | The moderator's resolution message (empty if not yet resolved or no message provided) |
| `pagination` | Object | Pagination information |
| `pagination.cursor` | String | The cursor for the next page |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/moderation/unban_requests?broadcaster_id=123456&moderator_id=987654&status=pending&first=10' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "id": "unban-req-001",
      "broadcaster_id": "123456",
      "broadcaster_login": "streamername",
      "broadcaster_name": "StreamerName",
      "moderator_id": "",
      "moderator_login": "",
      "moderator_name": "",
      "user_id": "111222",
      "user_login": "banneduser",
      "user_name": "BannedUser",
      "text": "I apologize for my behavior. I have read the chat rules and will follow them.",
      "status": "pending",
      "created_at": "2025-03-14T18:00:00Z",
      "resolved_at": "",
      "resolution_text": ""
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6MX19"
  }
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required query parameters, invalid `status` value |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks required scope, or user is not a moderator for the channel |

---

### 22. Resolve Unban Requests

Approves or denies an unban request for the specified broadcaster's channel. If approved, the user is automatically unbanned.

**Endpoint:** `PATCH /moderation/unban_requests`

**Authentication:** User Access Token
**Required Scope:** `moderator:manage:unban_requests`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose channel the unban request is for |
| `moderator_id` | String | Yes | The ID of the moderator resolving the request |
| `unban_request_id` | String | Yes | The ID of the unban request to resolve |
| `status` | String | Yes | The resolution. Must be `approved` or `denied` |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resolution_text` | String | No | A message from the moderator explaining the resolution (max 500 characters) |

**cURL Example (approve):**

```bash
curl -X PATCH 'https://api.twitch.tv/helix/moderation/unban_requests?broadcaster_id=123456&moderator_id=987654&unban_request_id=unban-req-001&status=approved' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "resolution_text": "Unbanned. Please follow the chat rules going forward."
  }'
```

**cURL Example (deny):**

```bash
curl -X PATCH 'https://api.twitch.tv/helix/moderation/unban_requests?broadcaster_id=123456&moderator_id=987654&unban_request_id=unban-req-001&status=denied' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "resolution_text": "Your ban will remain in place due to severity of the violation."
  }'
```

**Response Example:**

```json
{
  "data": [
    {
      "id": "unban-req-001",
      "broadcaster_id": "123456",
      "broadcaster_login": "streamername",
      "broadcaster_name": "StreamerName",
      "moderator_id": "987654",
      "moderator_login": "moduser",
      "moderator_name": "ModUser",
      "user_id": "111222",
      "user_login": "banneduser",
      "user_name": "BannedUser",
      "text": "I apologize for my behavior. I have read the chat rules and will follow them.",
      "status": "approved",
      "created_at": "2025-03-14T18:00:00Z",
      "resolved_at": "2025-03-15T10:00:00Z",
      "resolution_text": "Unbanned. Please follow the chat rules going forward."
    }
  ]
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required query parameters, invalid `status` value (must be `approved` or `denied`), `resolution_text` too long (max 500) |
| 401 | Invalid, missing, or expired access token |
| 403 | Token lacks `moderator:manage:unban_requests` scope, or user is not a moderator for the channel |
| 404 | The specified unban request was not found |
| 409 | The unban request has already been resolved |

---

## Related EventSub Subscription Types

The following EventSub subscription types are relevant to moderation events. Use these to receive real-time notifications about moderation actions.

### Ban and Unban Events

| Subscription Type | Description | Required Scope | Trigger |
|-------------------|-------------|----------------|---------|
| `channel.ban` | A user is banned from the channel | `channel:moderate` | User is banned or timed out |
| `channel.unban` | A user is unbanned from the channel | `channel:moderate` | User ban or timeout is removed |

**`channel.ban` Event Payload:**

```json
{
  "user_id": "111222",
  "user_login": "banneduser",
  "user_name": "BannedUser",
  "broadcaster_user_id": "123456",
  "broadcaster_user_login": "streamername",
  "broadcaster_user_name": "StreamerName",
  "moderator_user_id": "987654",
  "moderator_user_login": "moduser",
  "moderator_user_name": "ModUser",
  "reason": "Spam in chat",
  "banned_at": "2025-03-15T10:30:00Z",
  "ends_at": "2025-03-15T10:40:00Z",
  "is_permanent": false
}
```

**`channel.unban` Event Payload:**

```json
{
  "user_id": "111222",
  "user_login": "banneduser",
  "user_name": "BannedUser",
  "broadcaster_user_id": "123456",
  "broadcaster_user_login": "streamername",
  "broadcaster_user_name": "StreamerName",
  "moderator_user_id": "987654",
  "moderator_user_login": "moduser",
  "moderator_user_name": "ModUser"
}
```

### General Moderation Events

| Subscription Type | Description | Required Scope | Trigger |
|-------------------|-------------|----------------|---------|
| `channel.moderate` | A moderator performs a moderation action | `moderator:read:moderators` + additional scopes depending on action | Any moderation action (ban, unban, timeout, clear, delete, mod, unmod, vip, unvip, raid, unraid, slow, followers, subscribers, emoteonly, uniquechat, etc.) |

### AutoMod Events

| Subscription Type | Description | Required Scope | Trigger |
|-------------------|-------------|----------------|---------|
| `automod.message.hold` | AutoMod holds a message for review | `moderator:manage:automod` | A chat message is flagged by AutoMod |
| `automod.message.update` | A held AutoMod message is approved or denied | `moderator:manage:automod` | A moderator allows or denies a held message |
| `automod.settings.update` | AutoMod settings are updated | `moderator:read:automod_settings` | AutoMod settings are changed |
| `automod.terms.update` | Blocked/permitted AutoMod terms are updated | `moderator:manage:automod` | A blocked or permitted term is added or removed |

**`automod.message.hold` Event Payload:**

```json
{
  "broadcaster_user_id": "123456",
  "broadcaster_user_login": "streamername",
  "broadcaster_user_name": "StreamerName",
  "user_id": "111222",
  "user_login": "chatuser",
  "user_name": "ChatUser",
  "message_id": "msg-hold-abc-123",
  "message": {
    "text": "the held message text",
    "fragments": [
      {
        "type": "text",
        "text": "the held message text",
        "cheermote": null,
        "emote": null
      }
    ]
  },
  "category": "swearing",
  "level": 3,
  "held_at": "2025-03-15T10:30:00Z"
}
```

### Shield Mode Events

| Subscription Type | Description | Required Scope | Trigger |
|-------------------|-------------|----------------|---------|
| `channel.shield_mode.begin` | Shield Mode is activated | `moderator:read:shield_mode` or `moderator:manage:shield_mode` | A moderator activates Shield Mode |
| `channel.shield_mode.end` | Shield Mode is deactivated | `moderator:read:shield_mode` or `moderator:manage:shield_mode` | A moderator deactivates Shield Mode |

**`channel.shield_mode.begin` Event Payload:**

```json
{
  "broadcaster_user_id": "123456",
  "broadcaster_user_login": "streamername",
  "broadcaster_user_name": "StreamerName",
  "moderator_user_id": "987654",
  "moderator_user_login": "moduser",
  "moderator_user_name": "ModUser",
  "started_at": "2025-03-15T14:00:00Z"
}
```

### Warning Events

| Subscription Type | Description | Required Scope | Trigger |
|-------------------|-------------|----------------|---------|
| `channel.warning.acknowledge` | A warned user acknowledges a warning | `moderator:read:warnings` or `moderator:manage:warnings` | A user acknowledges a warning in chat |
| `channel.warning.send` | A warning is sent to a user | `moderator:read:warnings` or `moderator:manage:warnings` | A moderator sends a warning |

**`channel.warning.send` Event Payload:**

```json
{
  "broadcaster_user_id": "123456",
  "broadcaster_user_login": "streamername",
  "broadcaster_user_name": "StreamerName",
  "moderator_user_id": "987654",
  "moderator_user_login": "moduser",
  "moderator_user_name": "ModUser",
  "user_id": "111222",
  "user_login": "warneduser",
  "user_name": "WarnedUser",
  "reason": "Please follow the chat rules.",
  "chat_rules_cited": []
}
```

**`channel.warning.acknowledge` Event Payload:**

```json
{
  "broadcaster_user_id": "123456",
  "broadcaster_user_login": "streamername",
  "broadcaster_user_name": "StreamerName",
  "user_id": "111222",
  "user_login": "warneduser",
  "user_name": "WarnedUser"
}
```

### Unban Request Events

| Subscription Type | Description | Required Scope | Trigger |
|-------------------|-------------|----------------|---------|
| `channel.unban_request.create` | A banned user creates an unban request | `moderator:read:unban_requests` or `moderator:manage:unban_requests` | A banned user submits an unban request |
| `channel.unban_request.resolve` | An unban request is resolved | `moderator:read:unban_requests` or `moderator:manage:unban_requests` | A moderator approves or denies an unban request |

### Moderator Events

| Subscription Type | Description | Required Scope | Trigger |
|-------------------|-------------|----------------|---------|
| `channel.moderator.add` | A moderator is added to the channel | `moderation:read` | A user is given moderator status |
| `channel.moderator.remove` | A moderator is removed from the channel | `moderation:read` | A user's moderator status is removed |

### VIP Events

| Subscription Type | Description | Required Scope | Trigger |
|-------------------|-------------|----------------|---------|
| `channel.vip.add` | A VIP is added to the channel | `channel:read:vips` or `channel:manage:vips` | A user is given VIP status |
| `channel.vip.remove` | A VIP is removed from the channel | `channel:read:vips` or `channel:manage:vips` | A user's VIP status is removed |

---

## Best Practices

### Rate Limiting

- Ban and unban operations are rate-limited. Avoid rapid-fire bans when processing a list; add delays between operations.
- When mass-banning users (e.g., during a bot raid), consider using Shield Mode first to immediately protect the channel, then process bans in batches.
- Use exponential backoff when encountering 429 responses.

### AutoMod Configuration

- **Start with `overall_level`** for simplicity, then switch to individual levels for fine-tuning.
- Level 0 disables filtering for that category; level 4 is the most restrictive.
- Use `Check AutoMod Status` to test messages against your settings before deploying changes.
- AutoMod only applies to non-exempt users (moderators, VIPs, and subscribers may be exempt depending on settings).

### Blocked Terms

- Blocked terms use partial matching. Adding "cat" will also block "scattered" and "catalog". Use longer, more specific terms to avoid over-blocking.
- Consider common misspellings and leet-speak variations of terms you want to block.
- There is a limit on the total number of blocked terms per channel. Use AutoMod for general category filtering and blocked terms for channel-specific language.

### Ban Management

- Always include a `reason` when banning users for audit purposes and transparency.
- Use timeouts (`duration` parameter) for first-time or minor offenses; reserve permanent bans for severe violations.
- The maximum timeout duration is 1,209,600 seconds (14 days).
- An empty `expires_at` string in the banned users list indicates a permanent ban.

### Shield Mode

- Activate Shield Mode proactively when expecting high-traffic events (raids, collaborations).
- Shield Mode can be toggled by any moderator, not just the broadcaster.
- Combine Shield Mode with EventSub subscriptions to automate activation based on suspicious activity patterns.

### Moderator and VIP Management

- A user cannot simultaneously be a moderator and a VIP. You must remove one role before assigning the other.
- Only the broadcaster can add or remove moderators and VIPs via the API (the token must belong to the broadcaster).
- When removing a moderator, any actions they performed remain in effect (bans are not reversed).

### Unban Requests

- Process unban requests regularly to maintain community trust.
- Always provide a `resolution_text` when resolving requests to give users clarity on the decision.
- Approving an unban request automatically unbans the user; you do not need to call the Unban User endpoint separately.

### Warning System

- Warnings require the user to acknowledge before they can continue chatting, making them effective for escalating moderation.
- Use warnings as a step between verbal warnings in chat and timeouts/bans.
- A `reason` is required when issuing warnings. Make it specific and reference the behavior that prompted the warning.

---

## Known Issues and Limitations

1. **AutoMod Check is not 100% accurate** — The `Check AutoMod Status` endpoint provides an approximation. Actual AutoMod behavior may differ slightly in live chat due to additional context signals.

2. **Blocked term partial matching** — There is no way to do exact-match-only blocking. Short blocked terms can inadvertently block legitimate words.

3. **Ban on already banned user returns 409** — If you try to ban a user who is already banned, the API returns a 409 Conflict rather than silently succeeding. Your code should handle this case.

4. **Unban request status transitions** — Unban requests follow a strict status flow. You can only resolve `pending` requests. Attempting to resolve an already-resolved request returns a 409.

5. **Moderator add returns 422 for VIPs** — Adding a VIP as a moderator returns a 422 Unprocessable Entity. You must first remove the VIP role, then add the moderator role.

6. **Shield Mode does not auto-disable** — Once activated, Shield Mode stays active until explicitly deactivated by a moderator. There is no auto-timeout feature.

7. **VIP slot limits** — VIP slots are determined by subscription count. If a channel loses subscriptions, existing VIPs are not removed, but new VIPs cannot be added until slots become available.

8. **Delete chat messages 6-hour limit** — Individual chat messages older than 6 hours cannot be deleted. The clear-all-chat operation has no time limit.

9. **Warning acknowledgment timing** — There is no API to check whether a specific user has acknowledged their warning. Use the `channel.warning.acknowledge` EventSub event for real-time tracking.

10. **Timeout overwrite behavior** — Issuing a new timeout to a user who is already timed out will overwrite the existing timeout with the new duration. This applies even if the new timeout is shorter.

---

## Quick Reference Table

| # | Endpoint | Method | Path | Required Scope |
|---|----------|--------|------|----------------|
| 1 | Check AutoMod Status | `POST` | `/moderation/enforcements/status` | `moderation:read` |
| 2 | Manage Held AutoMod Messages | `POST` | `/moderation/automod/message` | `moderator:manage:automod` |
| 3 | Get AutoMod Settings | `GET` | `/moderation/automod/settings` | `moderator:read:automod_settings` |
| 4 | Update AutoMod Settings | `PUT` | `/moderation/automod/settings` | `moderator:manage:automod_settings` |
| 5 | Get Banned Users | `GET` | `/moderation/banned` | `moderation:read` |
| 6 | Ban User | `POST` | `/moderation/bans` | `moderator:manage:banned_users` |
| 7 | Unban User | `DELETE` | `/moderation/bans` | `moderator:manage:banned_users` |
| 8 | Get Blocked Terms | `GET` | `/moderation/blocked_terms` | `moderator:read:blocked_terms` |
| 9 | Add Blocked Term | `POST` | `/moderation/blocked_terms` | `moderator:manage:blocked_terms` |
| 10 | Remove Blocked Term | `DELETE` | `/moderation/blocked_terms` | `moderator:manage:blocked_terms` |
| 11 | Delete Chat Messages | `DELETE` | `/moderation/chat` | `moderator:manage:chat_messages` |
| 12 | Get Moderators | `GET` | `/moderation/moderators` | `moderation:read` |
| 13 | Add Channel Moderator | `POST` | `/moderation/moderators` | `channel:manage:moderators` |
| 14 | Remove Channel Moderator | `DELETE` | `/moderation/moderators` | `channel:manage:moderators` |
| 15 | Get VIPs | `GET` | `/channels/vips` | `channel:read:vips` |
| 16 | Add Channel VIP | `POST` | `/channels/vips` | `channel:manage:vips` |
| 17 | Remove Channel VIP | `DELETE` | `/channels/vips` | `channel:manage:vips` |
| 18 | Get Shield Mode Status | `GET` | `/moderation/shield_mode` | `moderator:read:shield_mode` |
| 19 | Update Shield Mode Status | `PUT` | `/moderation/shield_mode` | `moderator:manage:shield_mode` |
| 20 | Warn Chat User | `POST` | `/moderation/warnings` | `moderator:manage:warnings` |
| 21 | Get Unban Requests | `GET` | `/moderation/unban_requests` | `moderator:read:unban_requests` |
| 22 | Resolve Unban Requests | `PATCH` | `/moderation/unban_requests` | `moderator:manage:unban_requests` |

### All Required Scopes (Deduplicated)

```
moderation:read
moderator:manage:automod
moderator:read:automod_settings
moderator:manage:automod_settings
moderator:manage:banned_users
moderator:read:blocked_terms
moderator:manage:blocked_terms
moderator:manage:chat_messages
moderator:read:moderators
channel:manage:moderators
channel:read:vips
channel:manage:vips
moderator:read:shield_mode
moderator:manage:shield_mode
moderator:manage:warnings
moderator:read:unban_requests
moderator:manage:unban_requests
```

---

## Changelog

| Date | Change |
|------|--------|
| 2025-05-01 | Initial documentation covering all 22 moderation endpoints |
