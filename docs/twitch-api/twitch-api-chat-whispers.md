---
title: "Twitch API — Chat & Whispers"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Twitch API — Chat & Whispers

> **Source:** https://dev.twitch.tv/docs/api/reference/#get-chatters
> **Last verified:** 2025-05-01 — [PAGE INACCESSIBLE - VERIFY AGAINST LIVE DOCS]
> **API Base URL:** `https://api.twitch.tv/helix`
> **EventSub WebSocket:** `wss://eventsub.wss.twitch.tv/ws`

## Overview

The Chat and Whispers API endpoints cover everything needed to build chatbots, moderate chat, display emotes and badges, manage chat settings, and send private messages between users. There are approximately 15 chat endpoints and 1 whisper endpoint.

Chat on Twitch is a real-time messaging system embedded in every channel. The API provides both read and write capabilities: reading chatters, emotes, badges, and settings; sending messages, announcements, and shoutouts; and managing chat configuration. For real-time chat event delivery, use EventSub (WebSocket or Webhook transport) rather than polling these REST endpoints.

---

## Chat Endpoints

### Get Chatters

Retrieves the list of users currently in a broadcaster's chat room.

```
GET /chat/chatters
```

**Authentication:** User Access Token
**Scope:** `moderator:read:chatters`
**Authorization:** The user specified in `moderator_id` must be the broadcaster or a moderator of the broadcaster's channel.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose chatters to list |
| `moderator_id` | String | Yes | The ID of the broadcaster or a moderator. Must match the user in the Access Token |
| `first` | Integer | No | Maximum number of items per page. Range: 1-1000. Default: 100 |
| `after` | String | No | Cursor for forward pagination |

**Response Body:**

```json
{
  "data": [
    {
      "user_id": "128393656",
      "user_login": "smittysmithers",
      "user_name": "smittysmithers"
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6NX19"
  },
  "total": 8
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data[].user_id` | String | The user's ID |
| `data[].user_login` | String | The user's login name (lowercase) |
| `data[].user_name` | String | The user's display name |
| `total` | Integer | Total number of users in chat |
| `pagination.cursor` | String | Cursor for the next page of results |

**Notes:**
- The list may not be perfectly accurate in very large chats due to eventual consistency.
- The `total` field reflects the approximate number of users in chat at the time of the request.

```bash
curl -X GET 'https://api.twitch.tv/helix/chat/chatters?broadcaster_id=123456&moderator_id=654321&first=100' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### Get Channel Emotes

Retrieves all custom emotes available in a specific channel (subscriber emotes, Bits tier emotes, follower emotes).

```
GET /chat/emotes
```

**Authentication:** App Access Token or User Access Token
**Scope:** None required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose emotes to get |

**Response Body:**

```json
{
  "data": [
    {
      "id": "304456832",
      "name": "tikiGlow",
      "images": {
        "url_1x": "https://static-cdn.jtvnw.net/emoticons/v2/304456832/static/light/1.0",
        "url_2x": "https://static-cdn.jtvnw.net/emoticons/v2/304456832/static/light/2.0",
        "url_4x": "https://static-cdn.jtvnw.net/emoticons/v2/304456832/static/light/3.0"
      },
      "tier": "1000",
      "emote_type": "subscriptions",
      "emote_set_id": "301590448",
      "format": ["static", "animated"],
      "scale": ["1.0", "2.0", "3.0"],
      "theme_mode": ["light", "dark"]
    }
  ],
  "template": "https://static-cdn.jtvnw.net/emoticons/v2/{{id}}/{{format}}/{{theme_mode}}/{{scale}}"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data[].id` | String | The emote's unique ID |
| `data[].name` | String | The emote's name (text code) |
| `data[].images` | Object | URLs for static light-theme images at 1x, 2x, and 4x scales |
| `data[].tier` | String | The subscriber tier required (e.g., "1000", "2000", "3000"). Empty for non-sub emotes |
| `data[].emote_type` | String | Type: `subscriptions`, `bitstier`, `follower` |
| `data[].emote_set_id` | String | The ID of the emote set this emote belongs to |
| `data[].format` | String[] | Available formats: `static`, `animated` |
| `data[].scale` | String[] | Available scales: `1.0`, `2.0`, `3.0` |
| `data[].theme_mode` | String[] | Available themes: `light`, `dark` |
| `template` | String | URL template for constructing emote image URLs |

**Constructing Emote URLs from the Template:**

Replace the placeholders in the `template` field:
- `{{id}}` — The emote's `id`
- `{{format}}` — `static` or `animated`
- `{{theme_mode}}` — `light` or `dark`
- `{{scale}}` — `1.0`, `2.0`, or `3.0`

```bash
curl -X GET 'https://api.twitch.tv/helix/chat/emotes?broadcaster_id=141981764' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### Get Global Emotes

Retrieves all global emotes available to all users on Twitch.

```
GET /chat/emotes/global
```

**Authentication:** App Access Token or User Access Token
**Scope:** None required

**Query Parameters:** None

**Response Body:** Same structure as Get Channel Emotes, but without `tier`, `emote_type`, or `emote_set_id` fields. Includes the `template` field.

```bash
curl -X GET 'https://api.twitch.tv/helix/chat/emotes/global' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### Get Emote Sets

Retrieves emotes for one or more specified emote sets. Useful for resolving emote set IDs received from other API calls or EventSub events.

```
GET /chat/emotes/set
```

**Authentication:** App Access Token or User Access Token
**Scope:** None required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `emote_set_id` | String | Yes | The emote set ID(s) to look up. Specify multiple times for multiple sets (up to 25) |

**Response Body:**

```json
{
  "data": [
    {
      "id": "304456832",
      "name": "tikiGlow",
      "images": {
        "url_1x": "https://static-cdn.jtvnw.net/emoticons/v2/304456832/static/light/1.0",
        "url_2x": "https://static-cdn.jtvnw.net/emoticons/v2/304456832/static/light/2.0",
        "url_4x": "https://static-cdn.jtvnw.net/emoticons/v2/304456832/static/light/3.0"
      },
      "emote_type": "subscriptions",
      "emote_set_id": "301590448",
      "owner_id": "141981764",
      "format": ["static", "animated"],
      "scale": ["1.0", "2.0", "3.0"],
      "theme_mode": ["light", "dark"]
    }
  ],
  "template": "https://static-cdn.jtvnw.net/emoticons/v2/{{id}}/{{format}}/{{theme_mode}}/{{scale}}"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data[].owner_id` | String | The user ID of the broadcaster who owns the emote set |

Other fields are the same as Get Channel Emotes.

```bash
curl -X GET 'https://api.twitch.tv/helix/chat/emotes/set?emote_set_id=301590448&emote_set_id=488737509' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### Get User Emotes

Retrieves emotes available to a specific user across all channels (subscriptions, follower emotes, Bits emotes).

```
GET /chat/emotes/user
```

**Authentication:** User Access Token
**Scope:** `user:read:emotes`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | String | Yes | The ID of the user whose emotes to get. Must match the authenticated user |
| `after` | String | No | Cursor for forward pagination |
| `broadcaster_id` | String | No | Filter emotes to only those from a specific broadcaster |

**Response Body:**

```json
{
  "data": [
    {
      "id": "304456832",
      "name": "tikiGlow",
      "emote_type": "subscriptions",
      "emote_set_id": "301590448",
      "owner_id": "141981764",
      "format": ["static", "animated"],
      "scale": ["1.0", "2.0", "3.0"],
      "theme_mode": ["light", "dark"]
    }
  ],
  "template": "https://static-cdn.jtvnw.net/emoticons/v2/{{id}}/{{format}}/{{theme_mode}}/{{scale}}",
  "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6NX19"
}
```

```bash
curl -X GET 'https://api.twitch.tv/helix/chat/emotes/user?user_id=141981764' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### Get Channel Chat Badges

Retrieves custom chat badges available in a specific channel (subscriber badges, Bits badges, etc.).

```
GET /chat/badges
```

**Authentication:** App Access Token or User Access Token
**Scope:** None required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose badges to get |

**Response Body:**

```json
{
  "data": [
    {
      "set_id": "subscriber",
      "versions": [
        {
          "id": "0",
          "image_url_1x": "https://static-cdn.jtvnw.net/badges/v1/...",
          "image_url_2x": "https://static-cdn.jtvnw.net/badges/v1/...",
          "image_url_4x": "https://static-cdn.jtvnw.net/badges/v1/...",
          "title": "Subscriber",
          "description": "Subscriber",
          "click_action": "subscribe_to_channel",
          "click_url": null
        }
      ]
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data[].set_id` | String | The badge set identifier (e.g., `subscriber`, `bits`) |
| `data[].versions[]` | Object[] | Array of badge versions (tiers/durations) |
| `data[].versions[].id` | String | Badge version ID (e.g., "0", "3", "6" for subscriber months) |
| `data[].versions[].image_url_1x` | String | Badge image URL at 18x18 pixels |
| `data[].versions[].image_url_2x` | String | Badge image URL at 36x36 pixels |
| `data[].versions[].image_url_4x` | String | Badge image URL at 72x72 pixels |
| `data[].versions[].title` | String | Display title of the badge |
| `data[].versions[].description` | String | Description of the badge |
| `data[].versions[].click_action` | String | Action when clicked (e.g., `subscribe_to_channel`, `visit_url`) |
| `data[].versions[].click_url` | String | URL to open on click (if applicable) |

```bash
curl -X GET 'https://api.twitch.tv/helix/chat/badges?broadcaster_id=141981764' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### Get Global Chat Badges

Retrieves all global chat badges (staff, admin, moderator, VIP, Turbo, Prime Gaming, etc.).

```
GET /chat/badges/global
```

**Authentication:** App Access Token or User Access Token
**Scope:** None required

**Query Parameters:** None

**Response Body:** Same structure as Get Channel Chat Badges.

```bash
curl -X GET 'https://api.twitch.tv/helix/chat/badges/global' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### Get Chat Settings

Retrieves the chat settings for a broadcaster's channel.

```
GET /chat/settings
```

**Authentication:** App Access Token or User Access Token
**Scope:** None required (but `moderator_id` requires a User Access Token)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose chat settings to get |
| `moderator_id` | String | No | The ID of the broadcaster or a moderator. Required to get `non_moderator_chat_delay` and `non_moderator_chat_delay_duration` |

**Response Body:**

```json
{
  "data": [
    {
      "broadcaster_id": "141981764",
      "emote_mode": false,
      "follower_mode": true,
      "follower_mode_duration": 10,
      "moderator_id": "141981764",
      "non_moderator_chat_delay": true,
      "non_moderator_chat_delay_duration": 4,
      "slow_mode": false,
      "slow_mode_wait_time": 0,
      "subscriber_mode": false,
      "unique_chat_mode": false
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `broadcaster_id` | String | The broadcaster's user ID |
| `emote_mode` | Boolean | If `true`, only emotes are allowed in chat |
| `follower_mode` | Boolean | If `true`, only followers can chat |
| `follower_mode_duration` | Integer | Minimum minutes a user must follow before chatting. `null` if follower mode is off. 0 = any follower can chat |
| `moderator_id` | String | The moderator ID (only present if `moderator_id` was provided in query) |
| `non_moderator_chat_delay` | Boolean | If `true`, messages from non-moderators are delayed. Only included when `moderator_id` is provided |
| `non_moderator_chat_delay_duration` | Integer | Delay in seconds (2, 4, or 6). Only included when `moderator_id` is provided |
| `slow_mode` | Boolean | If `true`, users must wait between messages |
| `slow_mode_wait_time` | Integer | Seconds between messages. 0 if slow mode is off. Range: 3-120 |
| `subscriber_mode` | Boolean | If `true`, only subscribers can chat |
| `unique_chat_mode` | Boolean | If `true`, users can only post unique messages (R9K mode) |

```bash
curl -X GET 'https://api.twitch.tv/helix/chat/settings?broadcaster_id=141981764&moderator_id=141981764' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### Update Chat Settings

Updates one or more chat settings for a broadcaster's channel.

```
PATCH /chat/settings
```

**Authentication:** User Access Token
**Scope:** `moderator:manage:chat_settings`
**Authorization:** The user specified in `moderator_id` must be the broadcaster or a moderator of the broadcaster's channel.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose chat settings to update |
| `moderator_id` | String | Yes | The ID of the broadcaster or a moderator. Must match the user in the Access Token |

**Request Body (all fields optional, include only those you want to change):**

| Field | Type | Description |
|-------|------|-------------|
| `emote_mode` | Boolean | Enable/disable emote-only mode |
| `follower_mode` | Boolean | Enable/disable follower-only mode |
| `follower_mode_duration` | Integer | Minutes required to follow before chatting. Required when `follower_mode` is `true`. Range: 0 (any follower) to 129600 (3 months) |
| `slow_mode` | Boolean | Enable/disable slow mode |
| `slow_mode_wait_time` | Integer | Seconds between messages. Required when `slow_mode` is `true`. Range: 3-120 |
| `subscriber_mode` | Boolean | Enable/disable subscriber-only mode |
| `unique_chat_mode` | Boolean | Enable/disable unique chat (R9K) mode |
| `non_moderator_chat_delay` | Boolean | Enable/disable non-moderator chat delay |
| `non_moderator_chat_delay_duration` | Integer | Delay in seconds. Required when `non_moderator_chat_delay` is `true`. Values: 2, 4, or 6 |

**Response Body:** Same as Get Chat Settings, reflecting the updated values.

```bash
curl -X PATCH 'https://api.twitch.tv/helix/chat/settings?broadcaster_id=123456&moderator_id=654321' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "slow_mode": true,
    "slow_mode_wait_time": 10,
    "follower_mode": true,
    "follower_mode_duration": 30
  }'
```

---

### Send Chat Message

Sends a chat message to a broadcaster's chat room.

```
POST /chat/messages
```

**Authentication:** App Access Token or User Access Token
**Scopes:**
- **User Access Token:** `user:write:chat`
- **App Access Token:** `user:bot` (on the sender) **and** `channel:bot` (on the broadcaster)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster's chat room to send the message to |
| `sender_id` | String | Yes | The ID of the user sending the message. Must match the authenticated user (User Token) or have appropriate bot scopes (App Token) |
| `message` | String | Yes | The message text to send. Maximum 500 characters |
| `reply_parent_message_id` | String | No | The ID of the message being replied to (for threaded replies) |

**Response Body:**

```json
{
  "data": [
    {
      "message_id": "abc-123-def",
      "is_sent": true,
      "drop_reason": null
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data[].message_id` | String | The unique ID of the sent message |
| `data[].is_sent` | Boolean | Whether the message was sent successfully |
| `data[].drop_reason` | Object | If `is_sent` is `false`, contains `code` and `message` explaining why the message was dropped |

**Drop Reason Codes:**

| Code | Description |
|------|-------------|
| `channel_banned` | Sender is banned from the channel |
| `channel_timeout` | Sender is timed out in the channel |
| `automod_blocked` | Message was blocked by AutoMod |
| `msg_duplicate` | Duplicate message detected |
| `msg_ratelimit` | Sender is sending messages too quickly |
| `msg_followersonly` | Chat is in follower-only mode and sender is not a follower |
| `msg_subsonly` | Chat is in subscriber-only mode and sender is not a subscriber |
| `msg_emoteonly` | Chat is in emote-only mode and message contains non-emote text |
| `msg_slowmode` | Message was sent during slow mode cooldown |
| `msg_r9k` | Duplicate message in unique-chat (R9K) mode |

**Shared Chat Behavior (effective May 19, 2025):**

When a broadcaster is participating in a Shared Chat session:
- **App Access Token:** Messages are sent only to the source broadcaster's channel by default. To send the message to all channels in the shared chat session, include the query parameter `for_source_only=false`.
- **User Access Token:** Messages are automatically sent to all channels in the shared chat session.

```bash
# Send a basic message
curl -X POST 'https://api.twitch.tv/helix/chat/messages' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "broadcaster_id": "141981764",
    "sender_id": "123456789",
    "message": "Hello chat!"
  }'

# Send a reply
curl -X POST 'https://api.twitch.tv/helix/chat/messages' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "broadcaster_id": "141981764",
    "sender_id": "123456789",
    "message": "Great point!",
    "reply_parent_message_id": "abc-123-def"
  }'
```

---

### Send Chat Announcement

Sends an announcement message to a broadcaster's chat room. Announcements are highlighted with a colored background.

```
POST /chat/announcements
```

**Authentication:** User Access Token
**Scope:** `moderator:manage:announcements`
**Authorization:** The user specified in `moderator_id` must be the broadcaster or a moderator of the broadcaster's channel.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose chat to send the announcement to |
| `moderator_id` | String | Yes | The ID of the broadcaster or a moderator. Must match the user in the Access Token |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | String | Yes | The announcement text. Maximum 500 characters |
| `color` | String | No | Highlight color. Values: `blue`, `green`, `orange`, `purple`, `primary` (default) |

**Response:** 204 No Content on success.

**Rate Limit:** 1 announcement per 2 seconds.

```bash
curl -X POST 'https://api.twitch.tv/helix/chat/announcements?broadcaster_id=123456&moderator_id=654321' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Stream starting in 5 minutes!",
    "color": "purple"
  }'
```

---

### Get User Chat Color

Retrieves the chat color for one or more users. The color is the hex code displayed for the user's name in chat.

```
GET /chat/color
```

**Authentication:** App Access Token or User Access Token
**Scope:** None required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | String | Yes | The user ID(s) to look up. Specify multiple times for multiple users (up to 100) |

**Response Body:**

```json
{
  "data": [
    {
      "user_id": "141981764",
      "user_login": "twitchdev",
      "user_name": "TwitchDev",
      "color": "#9146FF"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data[].user_id` | String | The user's ID |
| `data[].user_login` | String | The user's login name |
| `data[].user_name` | String | The user's display name |
| `data[].color` | String | The hex color code (e.g., `#9146FF`). Empty string if the user has not set a color |

```bash
curl -X GET 'https://api.twitch.tv/helix/chat/color?user_id=141981764&user_id=12345678' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### Update User Chat Color

Updates the chat color for the authenticated user.

```
PUT /chat/color
```

**Authentication:** User Access Token
**Scope:** `user:manage:chat_color`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | String | Yes | The user's ID. Must match the authenticated user |
| `color` | String | Yes | The color to set. Named colors or hex codes (Turbo/Prime only for hex) |

**Named Colors (available to all users):**

`blue`, `blue_violet`, `cadet_blue`, `chocolate`, `coral`, `dodger_blue`, `firebrick`, `golden_rod`, `green`, `hot_pink`, `orange_red`, `red`, `sea_green`, `spring_green`, `yellow_green`

**Hex Colors (Turbo/Prime only):** Any valid hex code, e.g., `#9146FF`. Must be URL-encoded as `%239146FF`.

**Response:** 204 No Content on success.

```bash
# Named color (all users)
curl -X PUT 'https://api.twitch.tv/helix/chat/color?user_id=141981764&color=blue_violet' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Hex color (Turbo/Prime only)
curl -X PUT 'https://api.twitch.tv/helix/chat/color?user_id=141981764&color=%239146FF' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### Send a Shoutout

Sends a shoutout to another broadcaster, alerting the chat to check out their channel.

```
POST /chat/shoutouts
```

**Authentication:** User Access Token
**Scope:** `moderator:manage:shoutouts`
**Authorization:** The `moderator_id` must be the broadcaster or a moderator.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from_broadcaster_id` | String | Yes | The ID of the broadcaster sending the shoutout |
| `to_broadcaster_id` | String | Yes | The ID of the broadcaster receiving the shoutout |
| `moderator_id` | String | Yes | The ID of the broadcaster or moderator initiating the shoutout. Must match the user in the Access Token |

**Response:** 204 No Content on success.

**Rate Limits:**
- Maximum 1 shoutout per 2 minutes per broadcaster
- Cannot shoutout the same broadcaster more than once per 60 minutes

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Cannot shoutout the same broadcaster within 60 minutes |
| 429 | Rate limited (more than 1 shoutout per 2 minutes) |

```bash
curl -X POST 'https://api.twitch.tv/helix/chat/shoutouts?from_broadcaster_id=123456&to_broadcaster_id=789012&moderator_id=123456' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### Get Shared Chat Session

Retrieves information about the active shared chat session for a broadcaster.

```
GET /chat/shared_chat/session
```

**Authentication:** App Access Token or User Access Token
**Scope:** None required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster to check for an active shared chat session |

**Response Body:**

```json
{
  "data": [
    {
      "session_id": "359c8be3-cba3-4a8a-b04c-bdf7ca11e714",
      "host_broadcaster_id": "198704263",
      "participants": [
        {
          "broadcaster_id": "198704263"
        },
        {
          "broadcaster_id": "487263401"
        }
      ],
      "created_at": "2024-07-15T18:30:22.123456789Z",
      "updated_at": "2024-07-15T18:45:10.987654321Z"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data[].session_id` | String | Unique identifier for the shared chat session |
| `data[].host_broadcaster_id` | String | The broadcaster who initiated the shared chat |
| `data[].participants[]` | Object[] | Array of participating broadcasters |
| `data[].participants[].broadcaster_id` | String | A participating broadcaster's user ID |
| `data[].created_at` | String | When the session was created (RFC 3339) |
| `data[].updated_at` | String | When the session was last updated (RFC 3339) |

**Notes:**
- Returns an empty `data` array if the broadcaster is not in a shared chat session.

```bash
curl -X GET 'https://api.twitch.tv/helix/chat/shared_chat/session?broadcaster_id=141981764' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

## Whispers Endpoint

### Send Whisper

Sends a private whisper message from one user to another.

```
POST /whispers
```

**Authentication:** User Access Token
**Scope:** `user:manage:whispers`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from_user_id` | String | Yes | The ID of the user sending the whisper. Must match the authenticated user |
| `to_user_id` | String | Yes | The ID of the user receiving the whisper |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | String | Yes | The whisper message text |

**Response:** 204 No Content on success.

**Message Length Limits:**
- **Known users** (users the sender has previously whispered with): Maximum 10,000 characters
- **New users** (first-time whisper recipients): Maximum 500 characters

**Rate Limits (per user):**
- 3 whispers per second
- 100 whispers per minute
- Accounts that are less than 24 hours old have stricter limits

**Important Notes:**
- The sender's Twitch account must have a verified phone number to send whispers.
- Whispers cannot be sent to users who have blocked the sender.
- Whispers cannot be sent to users who have whispers disabled.
- New accounts may have additional restrictions on sending whispers.

```bash
curl -X POST 'https://api.twitch.tv/helix/whispers?from_user_id=123456&to_user_id=789012' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{"message": "Hey, great stream today!"}'
```

---

## Chat Message Structure (EventSub)

When receiving chat messages via EventSub (e.g., `channel.chat.message` subscription), messages arrive with a rich structure containing fragments, sender identity, and metadata.

### Message Event Payload

```json
{
  "broadcaster_user_id": "141981764",
  "broadcaster_user_login": "twitchdev",
  "broadcaster_user_name": "TwitchDev",
  "chatter_user_id": "123456789",
  "chatter_user_login": "coolchatter",
  "chatter_user_name": "CoolChatter",
  "message_id": "cc106012-35de-4489-87d5-c83452840689",
  "message": {
    "text": "Hi everyone! tikiGlow Cheer100",
    "fragments": [
      {
        "type": "text",
        "text": "Hi everyone! ",
        "cheermote": null,
        "emote": null,
        "mention": null
      },
      {
        "type": "emote",
        "text": "tikiGlow",
        "cheermote": null,
        "emote": {
          "id": "304456832",
          "emote_set_id": "301590448",
          "owner_id": "141981764",
          "format": ["static", "animated"]
        },
        "mention": null
      },
      {
        "type": "cheermote",
        "text": "Cheer100",
        "cheermote": {
          "prefix": "Cheer",
          "bits": 100,
          "tier": 100
        },
        "emote": null,
        "mention": null
      }
    ]
  },
  "message_type": "text",
  "badges": [
    {
      "set_id": "subscriber",
      "id": "12",
      "info": "15"
    },
    {
      "set_id": "moderator",
      "id": "1",
      "info": ""
    }
  ],
  "cheer": {
    "bits": 100
  },
  "color": "#9146FF",
  "reply": null,
  "channel_points_custom_reward_id": null,
  "source_broadcaster_user_id": null,
  "source_broadcaster_user_login": null,
  "source_broadcaster_user_name": null,
  "source_message_id": null,
  "source_badges": null
}
```

### Message Fragments

Each message is broken into typed fragments for rich rendering:

| Fragment Type | Description | Fields |
|---------------|-------------|--------|
| `text` | Plain text content | `text` |
| `emote` | A Twitch emote | `emote.id`, `emote.emote_set_id`, `emote.owner_id`, `emote.format` |
| `cheermote` | A Bits cheermote | `cheermote.prefix`, `cheermote.bits`, `cheermote.tier` |
| `mention` | An @mention of another user | `mention.user_id`, `mention.user_login`, `mention.user_name` |

### Sender Identity

| Field | Description |
|-------|-------------|
| `chatter_user_id` | The sender's user ID |
| `chatter_user_login` | The sender's login name (lowercase) |
| `chatter_user_name` | The sender's display name |
| `color` | The sender's chosen chat color (hex) |
| `badges` | Array of badge objects the sender is displaying |
| `badges[].set_id` | Badge category (e.g., `subscriber`, `moderator`, `vip`) |
| `badges[].id` | Badge version within the set (e.g., `12` for 12-month sub) |
| `badges[].info` | Additional info (e.g., subscription tenure in months) |

### Message Types

| Type | Description |
|------|-------------|
| `text` | Normal chat message |
| `channel_points_highlighted` | Highlighted with channel points |
| `channel_points_sub_only` | Sent using "Send a Message in Sub-Only Mode" reward |
| `user_intro` | User's first message in the channel |
| `power_ups_message_effect` | Message with a Power-Up effect |
| `power_ups_gigantified_emote` | Gigantified emote Power-Up |

### Reply Threading

When a message is a reply to another message, the `reply` field is populated:

```json
{
  "reply": {
    "parent_message_id": "abc-123-def",
    "parent_message_body": "What game should I play next?",
    "parent_user_id": "987654321",
    "parent_user_login": "parentuser",
    "parent_user_name": "ParentUser",
    "thread_message_id": "abc-123-def",
    "thread_user_id": "987654321",
    "thread_user_login": "parentuser",
    "thread_user_name": "ParentUser"
  }
}
```

| Field | Description |
|-------|-------------|
| `reply.parent_message_id` | The ID of the direct parent message |
| `reply.parent_message_body` | The text content of the parent message |
| `reply.parent_user_id` | The user ID of the parent message's author |
| `reply.thread_message_id` | The ID of the root message that started the thread |
| `reply.thread_user_id` | The user ID of the thread starter |

### Shared Chat Fields

When the message originates from a shared chat session:

| Field | Description |
|-------|-------------|
| `source_broadcaster_user_id` | The broadcaster ID of the channel where the message originated |
| `source_broadcaster_user_login` | The login of the originating channel |
| `source_broadcaster_user_name` | The display name of the originating channel |
| `source_message_id` | The original message ID in the source channel |
| `source_badges` | The sender's badges in their source channel |

---

## Chatbot Implementation Patterns

### Architecture Overview

A Twitch chatbot needs two capabilities:
1. **Receiving messages** — Subscribe to `channel.chat.message` via EventSub
2. **Sending messages** — Call `POST /chat/messages` via the Helix API

### WebSocket-Based Bot (Desktop / Always-On Server)

Best for: Desktop applications, persistent server processes, development.

```
┌─────────────────────────────────────────────────┐
│ Bot Application                                 │
│                                                 │
│  ┌──────────────┐    ┌────────────────────┐    │
│  │ WebSocket    │    │ Helix API Client   │    │
│  │ Client       │    │                    │    │
│  │              │    │ POST /chat/messages │    │
│  │ EventSub     │───>│ (send responses)   │    │
│  │ messages     │    │                    │    │
│  └──────┬───────┘    └────────────────────┘    │
│         │                                       │
│  ┌──────┴───────┐                               │
│  │ Command      │                               │
│  │ Handler      │                               │
│  └──────────────┘                               │
└─────────────────────────────────────────────────┘
         │
    WebSocket
         │
┌────────┴──────────┐
│ Twitch EventSub   │
│ WebSocket Server   │
└───────────────────┘
```

**Steps:**
1. Connect to `wss://eventsub.wss.twitch.tv/ws`
2. Receive the `session_welcome` message containing `session_id`
3. Subscribe to `channel.chat.message` with the `session_id` as the WebSocket transport
4. Process incoming messages and respond via `POST /chat/messages`

### Webhook-Based Bot (Cloud / Serverless)

Best for: Cloud functions (AWS Lambda, Google Cloud Functions), serverless architectures.

```
┌──────────────┐     HTTPS POST      ┌──────────────────┐
│ Twitch       │ ──────────────────> │ Your Webhook     │
│ EventSub     │                     │ Endpoint         │
│ Service      │ <────────────────── │                  │
│              │     200 OK          │ Process message  │
└──────────────┘                     │ POST /chat/msgs  │
                                     └──────────────────┘
```

**Steps:**
1. Set up an HTTPS endpoint (must be publicly accessible, SSL required)
2. Subscribe to `channel.chat.message` with webhook transport
3. Handle the verification challenge callback
4. Process incoming notifications and respond via `POST /chat/messages`
5. Return `2xx` status within 10 seconds (Twitch retries on failure)

### Example: Simple Command Bot (Pseudocode)

```javascript
// WebSocket EventSub handler
function onChatMessage(event) {
  const { message, chatter_user_id, broadcaster_user_id } = event;
  const text = message.text.trim();

  // Anti-loop: never respond to own messages
  if (chatter_user_id === BOT_USER_ID) return;

  // Command parsing
  if (!text.startsWith('!')) return;

  const [command, ...args] = text.slice(1).split(' ');

  switch (command.toLowerCase()) {
    case 'hello':
      sendChatMessage(broadcaster_user_id, `Hello @${event.chatter_user_name}!`);
      break;
    case 'uptime':
      const uptime = getStreamUptime(broadcaster_user_id);
      sendChatMessage(broadcaster_user_id, `Stream uptime: ${uptime}`);
      break;
  }
}

async function sendChatMessage(broadcasterId, text) {
  await fetch('https://api.twitch.tv/helix/chat/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Client-Id': clientId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      broadcaster_id: broadcasterId,
      sender_id: BOT_USER_ID,
      message: text
    })
  });
}
```

### Authentication for Chatbots

**Option A: User Access Token (simpler)**
- The bot authenticates as itself using its own Twitch account
- Requires `user:write:chat` scope
- The bot's own identity is used for the `sender_id`

**Option B: App Access Token (more scalable)**
- The application authenticates with an App Access Token
- Requires the bot account to have `user:bot` scope authorization
- Requires each channel to have `channel:bot` scope authorization
- Allows sending messages to any authorized channel without per-channel tokens

---

## Anti-Loop Guards

When building chatbots, it is critical to prevent infinite loops where the bot responds to its own messages or triggers cascading responses with other bots.

### Essential Guards

```javascript
// 1. Always ignore own messages
if (event.chatter_user_id === BOT_USER_ID) return;

// 2. Ignore messages from known bots
const KNOWN_BOTS = new Set(['nightbot', 'streamelements', 'moobot']);
if (KNOWN_BOTS.has(event.chatter_user_login)) return;

// 3. Rate limit responses per channel
const lastResponse = channelCooldowns.get(broadcasterId);
if (lastResponse && Date.now() - lastResponse < 1000) return;
channelCooldowns.set(broadcasterId, Date.now());

// 4. Never respond to messages that look like bot commands/responses
if (event.message.text.startsWith('[Bot]')) return;

// 5. Cap responses per time window
const windowResponses = responseCounter.get(broadcasterId) || 0;
if (windowResponses >= MAX_RESPONSES_PER_MINUTE) return;
responseCounter.set(broadcasterId, windowResponses + 1);
```

### Additional Precautions

- Maintain a per-channel response counter and stop responding if the rate exceeds a threshold (e.g., 20 responses per minute).
- Add a global kill switch that can disable all responses immediately.
- Log all sent messages for debugging and audit purposes.
- Never respond to messages that contain your bot's own command prefix from another user that could be a forwarded/echoed message.

---

## Chat Rate Limits for Sending Messages

Twitch enforces rate limits on chat messages sent via the API and IRC. These limits depend on the sender's relationship to the channel.

### Message Rate Limits

| Context | Limit | Window |
|---------|-------|--------|
| Normal user | 20 messages | 30 seconds |
| Known bot (verified) | 20 messages | 30 seconds |
| Moderator / VIP in channel | 100 messages | 30 seconds |
| Broadcaster (own channel) | 100 messages | 30 seconds |

**Notes:**
- These limits are per-channel, not global.
- Exceeding the rate limit results in messages being silently dropped or a `msg_ratelimit` drop reason in the `POST /chat/messages` response.
- Join rate limits (for IRC): 20 joins per 10 seconds for normal users, 2000 joins per 10 seconds for verified bots.

### API Rate Limits (Helix)

The `POST /chat/messages` endpoint also counts against the general Helix API rate limit (800 points per minute for the access token). Each call costs 1 point, so the Helix rate limit is generally not the bottleneck compared to the per-channel chat rate limits above.

---

## Legacy IRC Interface

> **Note:** Twitch recommends migrating from IRC to EventSub for all new chat integrations. IRC remains functional but receives no new features. PubSub was fully decommissioned on April 14, 2025.

### IRC Connection Details (Reference Only)

| Setting | Value |
|---------|-------|
| Server | `irc.chat.twitch.tv` |
| Port (plaintext) | `6667` |
| Port (TLS) | `6697` |
| WebSocket | `wss://irc-ws.chat.twitch.tv:443` |
| Authentication | `PASS oauth:<access_token>` |
| Nick | `NICK <bot_username>` |

### IRC Capabilities

```
CAP REQ :twitch.tv/membership    # JOIN/PART events
CAP REQ :twitch.tv/tags          # Message metadata (badges, emotes, color)
CAP REQ :twitch.tv/commands      # CLEARCHAT, USERNOTICE, ROOMSTATE, etc.
```

### Migration Path: IRC to EventSub

| IRC Feature | EventSub Equivalent |
|-------------|---------------------|
| `PRIVMSG` | `channel.chat.message` |
| `USERNOTICE` (sub/resub) | `channel.subscribe`, `channel.subscription.message` |
| `CLEARCHAT` (ban/timeout) | `channel.ban` |
| `CLEARMSG` (message delete) | `channel.chat.message_delete` |
| `ROOMSTATE` | `channel.chat_settings.update` (partial) |
| `JOIN/PART` | No direct equivalent (use Get Chatters polling) |
| Sending messages | `POST /chat/messages` |

---

## Best Practices

### Building Chat Integrations

1. **Use EventSub WebSocket for real-time chat** — It provides structured message data with fragments, badges, and metadata that IRC does not offer natively.

2. **Cache emotes and badges** — Emote and badge data changes infrequently. Cache the results of Get Channel Emotes, Get Global Emotes, Get Channel Chat Badges, and Get Global Chat Badges. Refresh every few hours or when a relevant EventSub event fires.

3. **Handle Shared Chat** — As of May 2025, channels can participate in shared chat sessions. Check `source_broadcaster_user_id` in EventSub messages to determine the originating channel. Use Get Shared Chat Session to detect active sessions.

4. **Respect chat modes** — Before sending messages, consider checking chat settings. If follower-only mode is on and your bot is not a follower, messages will be dropped.

5. **Use App Access Tokens for scalable bots** — If your bot operates in many channels, use an App Access Token with `user:bot` and `channel:bot` scopes to avoid managing per-channel User Access Tokens.

6. **Implement graceful degradation** — If `POST /chat/messages` returns `is_sent: false`, log the `drop_reason` and do not retry immediately. Many drop reasons (banned, timeout, mode restrictions) will persist.

7. **Validate message length** — Trim or split messages that exceed 500 characters before sending. The API will reject oversized messages.

### Emote Rendering

1. **Use the template URL** — Construct emote image URLs using the `template` field from emote endpoints rather than hardcoding CDN paths.
2. **Prefer animated format** — If the emote supports `animated`, use it for a richer experience; fall back to `static`.
3. **Use dark theme** — Most Twitch chat UIs use dark backgrounds; prefer `dark` theme mode.
4. **Match scale to display** — Use `1.0` for inline chat, `2.0` or `3.0` for tooltips or emote pickers.

### Whisper Usage

1. **Verify phone number** — The sending account must have a verified phone number.
2. **Respect recipient settings** — Users can disable whispers entirely. Handle 403/400 errors gracefully.
3. **Use whispers sparingly** — Twitch closely monitors whisper usage for spam. High-volume whisper sending may trigger account restrictions.

---

## Known Issues

- **Get Chatters accuracy:** In channels with very large viewer counts (10,000+), the chatters list may lag behind actual join/part activity by several minutes. The `total` count may differ from the actual number of entries returned across all pages.

- **Emote cache inconsistency:** After a broadcaster adds or removes emotes, the API may take several minutes to reflect the changes. Using the `template` URL with a stale emote ID may return a 404 from the CDN.

- **Send Chat Message `is_sent` false positive:** In rare cases, `is_sent` may return `true` but the message does not appear in chat due to server-side filtering applied after the API response. This is uncommon but not impossible.

- **Shared Chat session detection:** The Get Shared Chat Session endpoint may return stale data briefly after a session ends. If `session_id` is present but the session has ended, messages sent with `for_source_only=false` will still only go to the target channel.

- **Announcement color rendering:** The `primary` color renders differently depending on the viewer's Twitch theme (light vs. dark mode). It is effectively the default purple/blue highlight rather than a specific color.

- **Whisper delivery:** Whispers are not guaranteed to be delivered. If the recipient has whispers blocked from strangers or has blocked the sender, the API returns 204 No Content but the message is silently discarded. There is no delivery confirmation mechanism.

- **Chat color hex for non-Turbo users:** Calling `PUT /chat/color` with a hex value for a user without Turbo or Prime results in a 403 error. The error message does not explicitly mention the Turbo/Prime requirement.

- **IRC deprecation timeline:** While Twitch recommends EventSub, there is no announced hard deprecation date for IRC as of May 2025. However, new features (Shared Chat, Power-Ups) are only supported in EventSub, not IRC.

---

## Quick Reference Table

| Endpoint | Method | Auth | Scope | Key Limits |
|----------|--------|------|-------|------------|
| `/chat/chatters` | GET | User | `moderator:read:chatters` | Max 1000 per page |
| `/chat/emotes` | GET | App/User | None | — |
| `/chat/emotes/global` | GET | App/User | None | — |
| `/chat/emotes/set` | GET | App/User | None | Up to 25 emote set IDs |
| `/chat/emotes/user` | GET | User | `user:read:emotes` | Paginated |
| `/chat/badges` | GET | App/User | None | — |
| `/chat/badges/global` | GET | App/User | None | — |
| `/chat/settings` | GET | App/User | None | `moderator_id` for full fields |
| `/chat/settings` | PATCH | User | `moderator:manage:chat_settings` | — |
| `/chat/messages` | POST | App/User | `user:write:chat` or `user:bot`+`channel:bot` | 20-100 msgs/30s per channel |
| `/chat/announcements` | POST | User | `moderator:manage:announcements` | 1 per 2 seconds |
| `/chat/color` | GET | App/User | None | Up to 100 user IDs |
| `/chat/color` | PUT | User | `user:manage:chat_color` | Hex requires Turbo/Prime |
| `/chat/shoutouts` | POST | User | `moderator:manage:shoutouts` | 1 per 2 min; same target 1 per 60 min |
| `/chat/shared_chat/session` | GET | App/User | None | — |
| `/whispers` | POST | User | `user:manage:whispers` | 3/s, 100/min; phone verification required |
