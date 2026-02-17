---
title: "Twitch API — Channels, Streams, Raids, Schedule & Teams"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Twitch API — Channels, Streams, Raids, Schedule & Teams

> **Source:** [Twitch API Reference — Channels](https://dev.twitch.tv/docs/api/reference/#get-channel-information), [Streams](https://dev.twitch.tv/docs/api/reference/#get-streams), [Raids](https://dev.twitch.tv/docs/api/reference/#start-a-raid), [Schedule](https://dev.twitch.tv/docs/api/reference/#get-channel-stream-schedule), [Teams](https://dev.twitch.tv/docs/api/reference/#get-teams)
> **Last verified:** 2025-05-01 — [PAGE INACCESSIBLE - VERIFY AGAINST LIVE DOCS]
> **API Base URL:** `https://api.twitch.tv/helix`
> **Auth Base URL:** `https://id.twitch.tv`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Channels](#2-channels)
   - [Get Channel Information](#21-get-channel-information)
   - [Modify Channel Information](#22-modify-channel-information)
   - [Get Channel Editors](#23-get-channel-editors)
   - [Get Followed Channels](#24-get-followed-channels)
   - [Get Channel Followers](#25-get-channel-followers)
3. [Ads (Commercial)](#3-ads-commercial)
   - [Start Commercial](#31-start-commercial)
   - [Get Ad Schedule](#32-get-ad-schedule)
   - [Snooze Next Ad](#33-snooze-next-ad)
4. [Streams](#4-streams)
   - [Get Streams](#41-get-streams)
   - [Get Stream Key](#42-get-stream-key)
   - [Create Stream Marker](#43-create-stream-marker)
   - [Get Stream Markers](#44-get-stream-markers)
   - [Get Followed Streams](#45-get-followed-streams)
5. [Raids](#5-raids)
   - [Start a Raid](#51-start-a-raid)
   - [Cancel a Raid](#52-cancel-a-raid)
6. [Schedule](#6-schedule)
   - [Get Channel Stream Schedule](#61-get-channel-stream-schedule)
   - [Get Channel iCalendar](#62-get-channel-icalendar)
   - [Update Channel Stream Schedule](#63-update-channel-stream-schedule)
   - [Create Channel Stream Schedule Segment](#64-create-channel-stream-schedule-segment)
   - [Update Channel Stream Schedule Segment](#65-update-channel-stream-schedule-segment)
   - [Delete Channel Stream Schedule Segment](#66-delete-channel-stream-schedule-segment)
7. [Teams](#7-teams)
   - [Get Teams](#71-get-teams)
   - [Get Channel Teams](#72-get-channel-teams)
8. [Best Practices](#8-best-practices)
9. [Known Issues & Community Quirks](#9-known-issues--community-quirks)
10. [Quick Reference Table](#10-quick-reference-table)

---

## 1. Overview

This document covers the core broadcasting-related endpoints of the Twitch Helix API: Channels, Streams, Raids, Schedule, and Teams. These endpoints provide the foundation for building applications that interact with live streaming data, channel management, and organizational features on Twitch.

**Category summary (24 endpoints total):**

| Category | Endpoints | Primary Use |
|----------|-----------|-------------|
| Channels | 5 | Channel info, editors, followers |
| Ads | 3 | Commercials, ad scheduling |
| Streams | 5 | Live streams, markers, stream keys |
| Raids | 2 | Start and cancel raids |
| Schedule | 6 | Stream schedule management |
| Teams | 2 | Team info and membership |

---

## 2. Channels

### 2.1 Get Channel Information

Retrieves information about one or more channels.

**Endpoint:**

```
GET https://api.twitch.tv/helix/channels
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| App Access Token | None |
| User Access Token | None |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose channel you want to get. You may specify a maximum of **100** IDs. Repeat the parameter for each ID. |

**Response Body:**

```json
{
  "data": [
    {
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "broadcaster_language": "en",
      "game_name": "Science & Technology",
      "game_id": "509670",
      "title": "TwitchDev Stream",
      "delay": 0,
      "tags": ["DevsInTheKnow", "ProjectFriday"],
      "content_classification_labels": ["MatureGame"],
      "is_branded_content": false
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `broadcaster_id` | String | The broadcaster's user ID |
| `broadcaster_login` | String | The broadcaster's login name (lowercase) |
| `broadcaster_name` | String | The broadcaster's display name |
| `broadcaster_language` | String | The ISO 639-1 two-letter language code of the broadcaster's channel |
| `game_name` | String | The name of the game/category being played |
| `game_id` | String | The ID of the game/category being played |
| `title` | String | The title of the stream |
| `delay` | Integer | The stream delay in seconds. Only partners can set this; the value is always `0` for non-partners. |
| `tags` | String[] | Array of tags applied to the channel (max 10). Tags are free-form strings. |
| `content_classification_labels` | String[] | Content classification labels applied to the channel. Possible values: `DrugsIntoxication`, `SexualThemes`, `ViolentGraphic`, `Gambling`, `ProfanityVulgarity`, `MatureGame` |
| `is_branded_content` | Boolean | Whether the channel has branded content enabled |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/channels?broadcaster_id=141981764' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api get /channels -q broadcaster_id=141981764
```

**Multiple Channels:**

```bash
curl -X GET 'https://api.twitch.tv/helix/channels?broadcaster_id=141981764&broadcaster_id=12345678' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Related EventSub Types:**

| EventSub Type | Description |
|---------------|-------------|
| `channel.update` | A broadcaster updates their channel properties (title, category, language, etc.) |

---

### 2.2 Modify Channel Information

Updates a channel's properties.

**Endpoint:**

```
PATCH https://api.twitch.tv/helix/channels
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `channel:manage:broadcast` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |
| `Content-Type` | `application/json` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose channel you want to update. Must match the user ID in the access token. |

**Request Body (JSON):**

All body fields are optional. Include only the fields you want to update.

| Field | Type | Description |
|-------|------|-------------|
| `game_id` | String | The ID of the game/category. Use `"0"` or `""` to unset. |
| `broadcaster_language` | String | ISO 639-1 two-letter language code (e.g., `"en"`). Use `"other"` for unlisted languages. |
| `title` | String | The title of the stream. Max 140 characters. |
| `delay` | Integer | Stream delay in seconds. **Partners only.** |
| `tags` | String[] | Array of tags (max 10, each max 25 characters). Set to empty array `[]` to clear all tags. Automatic tags cannot be set or removed. |
| `content_classification_labels` | Object[] | Array of objects with `id` (String) and `is_enabled` (Boolean). IDs: `DrugsIntoxication`, `SexualThemes`, `ViolentGraphic`, `Gambling`, `ProfanityVulgarity`. Note: `MatureGame` cannot be set manually. |
| `is_branded_content` | Boolean | Whether the channel has branded content |

**Response:**

```
204 No Content
```

**cURL Example:**

```bash
curl -X PATCH 'https://api.twitch.tv/helix/channels?broadcaster_id=141981764' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2' \
  -H 'Content-Type: application/json' \
  -d '{
    "game_id": "509658",
    "title": "Just Chatting with viewers!",
    "broadcaster_language": "en",
    "tags": ["English", "Interactive"],
    "content_classification_labels": [
      {"id": "MatureGame", "is_enabled": false}
    ],
    "is_branded_content": false
  }'
```

**Twitch CLI Example:**

```bash
twitch api patch /channels \
  -q broadcaster_id=141981764 \
  -b '{"game_id":"509658","title":"Just Chatting with viewers!"}'
```

---

### 2.3 Get Channel Editors

Returns a list of users who are editors for the specified channel. The user who created the editor relationship is not included in the response.

**Endpoint:**

```
GET https://api.twitch.tv/helix/channels/editors
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `channel:read:editors` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose editors you want to get. Must match the user ID in the access token. |

**Response Body:**

```json
{
  "data": [
    {
      "user_id": "182891647",
      "user_name": "maubot",
      "created_at": "2020-02-14T12:36:57Z"
    },
    {
      "user_id": "135093069",
      "user_name": "BlueLava",
      "created_at": "2018-03-07T16:28:06Z"
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | String | The editor's user ID |
| `user_name` | String | The editor's display name |
| `created_at` | String | The date and time the user was made an editor (RFC 3339 format) |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/channels/editors?broadcaster_id=141981764' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api get /channels/editors -q broadcaster_id=141981764
```

---

### 2.4 Get Followed Channels

Returns a list of channels that the specified user follows.

**Endpoint:**

```
GET https://api.twitch.tv/helix/channels/followed
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `user:read:follows` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | String | Yes | The ID of the user whose followed channels you want to get. Must match the user ID in the access token. |
| `broadcaster_id` | String | No | Filter to check if the user follows a specific broadcaster. If the user follows this broadcaster, the response contains a single entry; otherwise, the response is empty. |
| `first` | Integer | No | Maximum number of items to return per page. Default: **20**. Maximum: **100**. |
| `after` | String | No | Cursor for forward pagination. Use the value from `pagination.cursor` in the previous response. |

**Response Body:**

```json
{
  "total": 42,
  "data": [
    {
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "followed_at": "2022-05-24T22:22:08Z"
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6NX19"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `total` | Integer | Total number of channels the user follows |
| `data[].broadcaster_id` | String | The broadcaster's user ID |
| `data[].broadcaster_login` | String | The broadcaster's login name |
| `data[].broadcaster_name` | String | The broadcaster's display name |
| `data[].followed_at` | String | When the user followed the broadcaster (RFC 3339 format) |
| `pagination.cursor` | String | Cursor value for the next page |

**Pagination:**

This endpoint supports forward pagination using the `after` cursor. Use the `pagination.cursor` value from the response as the `after` parameter in the next request.

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/channels/followed?user_id=141981764&first=20' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api get /channels/followed -q user_id=141981764 -q first=20
```

**Check if user follows a specific channel:**

```bash
curl -X GET 'https://api.twitch.tv/helix/channels/followed?user_id=141981764&broadcaster_id=12345678' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Related EventSub Types:**

| EventSub Type | Description |
|---------------|-------------|
| `channel.follow` | A user follows a channel (requires `moderator:read:followers` scope) |

---

### 2.5 Get Channel Followers

Returns a list of users that follow the specified broadcaster. Results are ordered by `followed_at` descending (most recent followers first).

**Endpoint:**

```
GET https://api.twitch.tv/helix/channels/followers
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `moderator:read:followers` |

The user ID in the access token must match the `broadcaster_id` or be a moderator for the broadcaster's channel.

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose followers you want to get. |
| `user_id` | String | No | Filter to check if a specific user follows the broadcaster. If they do, the response contains a single entry. |
| `first` | Integer | No | Maximum number of items to return per page. Default: **20**. Maximum: **100**. |
| `after` | String | No | Cursor for forward pagination. |

**Response Body:**

```json
{
  "total": 8471,
  "data": [
    {
      "user_id": "11111",
      "user_login": "userlogin",
      "user_name": "UserDisplayName",
      "followed_at": "2022-05-24T22:22:08Z"
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6NX19"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `total` | Integer | Total number of users that follow the broadcaster |
| `data[].user_id` | String | The follower's user ID |
| `data[].user_login` | String | The follower's login name |
| `data[].user_name` | String | The follower's display name |
| `data[].followed_at` | String | When the user followed the broadcaster (RFC 3339 format) |
| `pagination.cursor` | String | Cursor value for the next page |

**Pagination:**

Same as Get Followed Channels. Forward pagination with `after` cursor.

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/channels/followers?broadcaster_id=141981764&first=20' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api get /channels/followers -q broadcaster_id=141981764
```

**Check if specific user follows a channel:**

```bash
curl -X GET 'https://api.twitch.tv/helix/channels/followers?broadcaster_id=141981764&user_id=12345678' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Related EventSub Types:**

| EventSub Type | Description |
|---------------|-------------|
| `channel.follow` | A user follows a channel (version 2, requires `moderator:read:followers` scope) |

---

## 3. Ads (Commercial)

### 3.1 Start Commercial

Starts a commercial (ad break) on the specified broadcaster's channel.

**Endpoint:**

```
POST https://api.twitch.tv/helix/channels/commercial
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `channel:edit:commercial` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |
| `Content-Type` | `application/json` |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster running the commercial. Must match the user ID in the access token. |
| `length` | Integer | Yes | The length of the commercial in seconds. Valid values: **30**, **60**, **90**, **120**, **150**, **180**. |

**Response Body:**

```json
{
  "data": [
    {
      "length": 60,
      "message": "",
      "retry_after": 480
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `length` | Integer | Length of the commercial that actually ran (may be shorter than requested) |
| `message` | String | An informational message. Empty string if successful. |
| `retry_after` | Integer | Number of seconds you must wait before running another commercial |

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/channels/commercial' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2' \
  -H 'Content-Type: application/json' \
  -d '{"broadcaster_id":"141981764","length":60}'
```

**Twitch CLI Example:**

```bash
twitch api post /channels/commercial \
  -b '{"broadcaster_id":"141981764","length":60}'
```

**Important Notes:**

- Only **affiliate** and **partner** broadcasters can run commercials.
- The broadcaster must be **live** (streaming) to run a commercial.
- You must wait `retry_after` seconds before starting another commercial.
- Twitch may run a shorter commercial than requested.
- The commercial length returned may differ from the requested length.

**Related EventSub Types:**

| EventSub Type | Description |
|---------------|-------------|
| `channel.ad_break.begin` | A midroll commercial break has started on the specified channel |

---

### 3.2 Get Ad Schedule

Returns information about the broadcaster's ad schedule, including the next scheduled ad, snooze count, and pre-roll free time.

**Endpoint:**

```
GET https://api.twitch.tv/helix/channels/ads
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `channel:read:ads` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose ad schedule you want to get. |

**Response Body:**

```json
{
  "data": [
    {
      "snooze_count": 1,
      "snooze_refresh_at": "2023-08-01T23:08:18Z",
      "next_ad_at": "2023-08-01T23:08:18Z",
      "duration": 60,
      "last_ad_at": "2023-08-01T23:00:00Z",
      "preroll_free_time": 90
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `snooze_count` | Integer | Number of snoozes available for the broadcaster |
| `snooze_refresh_at` | String | When the next snooze will be available (RFC 3339 format) |
| `next_ad_at` | String | When the next automatic midroll ad is scheduled (RFC 3339 format) |
| `duration` | Integer | Duration in seconds of the next scheduled ad break |
| `last_ad_at` | String | When the last ad break ran (RFC 3339 format) |
| `preroll_free_time` | Integer | Seconds of pre-roll free time remaining for the broadcaster |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/channels/ads?broadcaster_id=141981764' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api get /channels/ads -q broadcaster_id=141981764
```

**Related EventSub Types:**

| EventSub Type | Description |
|---------------|-------------|
| `channel.ad_break.begin` | A midroll commercial break has started on the specified channel |

---

### 3.3 Snooze Next Ad

Pushes back the next scheduled midroll ad break by 5 minutes. Broadcasters have a limited number of snoozes available; use Get Ad Schedule to check `snooze_count`.

**Endpoint:**

```
POST https://api.twitch.tv/helix/channels/ads/schedule/snooze
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `channel:manage:ads` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose next ad you want to snooze. |

**Response Body:**

```json
{
  "data": [
    {
      "snooze_count": 0,
      "snooze_refresh_at": "2023-08-01T23:18:18Z",
      "next_ad_at": "2023-08-01T23:13:18Z"
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `snooze_count` | Integer | Number of snoozes remaining after this request |
| `snooze_refresh_at` | String | When the next snooze will become available (RFC 3339 format) |
| `next_ad_at` | String | Updated time for the next scheduled ad (RFC 3339 format) |

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/channels/ads/schedule/snooze?broadcaster_id=141981764' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api post /channels/ads/schedule/snooze -q broadcaster_id=141981764
```

---

## 4. Streams

### 4.1 Get Streams

Returns a list of active (live) streams. Streams are returned sorted by number of viewers (descending). Multiple filters can be combined, but using both `user_id` and `user_login` for the same user is not allowed.

**Endpoint:**

```
GET https://api.twitch.tv/helix/streams
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| App Access Token | None |
| User Access Token | None |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | String | No | A user ID to filter streams. You may specify up to **100** IDs. |
| `user_login` | String | No | A user login name to filter streams. You may specify up to **100** login names. |
| `game_id` | String | No | A game/category ID to filter streams. You may specify up to **100** IDs. |
| `type` | String | No | Filter by stream type. Values: `live`, `all`. Default: `all`. Note: Twitch currently only returns `live` streams; the `all` value is reserved for future use. |
| `language` | String | No | ISO 639-1 language code to filter streams. You may specify up to **100** languages. |
| `first` | Integer | No | Maximum number of items to return per page. Default: **20**. Maximum: **100**. |
| `before` | String | No | Cursor for backward pagination. |
| `after` | String | No | Cursor for forward pagination. |

**Response Body:**

```json
{
  "data": [
    {
      "id": "40952121085",
      "user_id": "141981764",
      "user_login": "twitchdev",
      "user_name": "TwitchDev",
      "game_id": "509670",
      "game_name": "Science & Technology",
      "type": "live",
      "title": "TwitchDev Stream",
      "viewer_count": 5723,
      "started_at": "2023-08-01T20:00:00Z",
      "language": "en",
      "thumbnail_url": "https://static-cdn.jtvnw.net/previews-ttv/live_user_twitchdev-{width}x{height}.jpg",
      "tag_ids": [],
      "tags": ["English", "Programming"],
      "is_mature": false
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6MjB9fQ"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique stream ID. A new ID is generated each time a stream starts. |
| `user_id` | String | The broadcaster's user ID |
| `user_login` | String | The broadcaster's login name |
| `user_name` | String | The broadcaster's display name |
| `game_id` | String | The ID of the game/category being played |
| `game_name` | String | The name of the game/category being played |
| `type` | String | Stream type. Currently always `"live"`. |
| `title` | String | The stream's title |
| `viewer_count` | Integer | Number of viewers currently watching |
| `started_at` | String | When the stream started (RFC 3339 format) |
| `language` | String | The language of the stream (ISO 639-1) |
| `thumbnail_url` | String | URL template for the stream thumbnail. Replace `{width}` and `{height}` with desired dimensions. |
| `tag_ids` | String[] | **Deprecated.** Always returns an empty array. Use `tags` instead. |
| `tags` | String[] | Array of tags applied to the stream |
| `is_mature` | Boolean | Whether the stream is marked as mature content |

**Pagination:**

Supports both forward (`after`) and backward (`before`) pagination.

**Thumbnail URL Usage:**

```
// Replace {width} and {height} placeholders
thumbnail_url.replace("{width}", "440").replace("{height}", "248")
// Result: https://static-cdn.jtvnw.net/previews-ttv/live_user_twitchdev-440x248.jpg
```

**cURL Example:**

```bash
# Get top 20 live streams
curl -X GET 'https://api.twitch.tv/helix/streams?first=20' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'

# Get streams for specific game
curl -X GET 'https://api.twitch.tv/helix/streams?game_id=509658&first=10' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'

# Check if specific user is live
curl -X GET 'https://api.twitch.tv/helix/streams?user_login=twitchdev' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api get /streams -q first=20
twitch api get /streams -q game_id=509658
twitch api get /streams -q user_login=twitchdev
```

**Related EventSub Types:**

| EventSub Type | Description |
|---------------|-------------|
| `stream.online` | The specified broadcaster starts a stream |
| `stream.offline` | The specified broadcaster stops a stream |

---

### 4.2 Get Stream Key

Returns the stream key for the specified broadcaster.

**Endpoint:**

```
GET https://api.twitch.tv/helix/streams/key
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `channel:read:stream_key` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose stream key you want to get. Must match the user ID in the access token. |

**Response Body:**

```json
{
  "data": [
    {
      "stream_key": "live_44322889_a34ub37c8ajv98a0"
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `stream_key` | String | The broadcaster's stream key |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/streams/key?broadcaster_id=141981764' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api get /streams/key -q broadcaster_id=141981764
```

**Security Warning:** The stream key is a sensitive credential. Never expose it publicly. Anyone with the stream key can broadcast to the channel.

---

### 4.3 Create Stream Marker

Creates a marker in the stream at the current playback position. Markers can be used to highlight moments during a stream and are visible in the Video Producer.

**Endpoint:**

```
POST https://api.twitch.tv/helix/streams/markers
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `channel:manage:broadcast` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |
| `Content-Type` | `application/json` |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | String | Yes | The ID of the broadcaster that is currently live. The authenticated user must be the broadcaster or an editor. |
| `description` | String | No | A description of the marker. Maximum **140** characters. |

**Response Body:**

```json
{
  "data": [
    {
      "id": "106b8d6243a4f883d25ad75e6cdffdc4",
      "created_at": "2023-08-01T20:31:40Z",
      "description": "Highlight play",
      "position_seconds": 1890
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique ID of the marker |
| `created_at` | String | When the marker was created (RFC 3339 format) |
| `description` | String | Description of the marker |
| `position_seconds` | Integer | Position in the stream in seconds from the start |

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/streams/markers' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2' \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"141981764","description":"Highlight play"}'
```

**Twitch CLI Example:**

```bash
twitch api post /streams/markers \
  -b '{"user_id":"141981764","description":"Highlight play"}'
```

**Important Notes:**

- The broadcaster must be **live** and have **VODs enabled** (past broadcasts must be saved).
- Only the broadcaster or their **editors** can create markers.
- There is a rate limit of approximately 1 marker per 2 seconds.

---

### 4.4 Get Stream Markers

Returns stream markers from a VOD or from the most recent VOD of a specified user. You must specify either `user_id` or `video_id`, but not both.

**Endpoint:**

```
GET https://api.twitch.tv/helix/streams/markers
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `user:read:broadcast` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | String | Yes* | The ID of the broadcaster whose stream markers you want to get. Returns markers from the most recent VOD. *Mutually exclusive with `video_id`. |
| `video_id` | String | Yes* | The ID of the VOD whose stream markers you want to get. *Mutually exclusive with `user_id`. |
| `first` | Integer | No | Maximum number of items to return per page. Default: **20**. |
| `before` | String | No | Cursor for backward pagination. |
| `after` | String | No | Cursor for forward pagination. |

**Response Body:**

```json
{
  "data": [
    {
      "user_id": "141981764",
      "user_login": "twitchdev",
      "user_name": "TwitchDev",
      "videos": [
        {
          "video_id": "1234567890",
          "markers": [
            {
              "id": "106b8d6243a4f883d25ad75e6cdffdc4",
              "created_at": "2023-08-01T20:31:40Z",
              "description": "Highlight play",
              "position_seconds": 1890,
              "URL": "https://www.twitch.tv/videos/1234567890?t=0h31m30s"
            }
          ]
        }
      ]
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6NX19"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `data[].user_id` | String | The broadcaster's user ID |
| `data[].user_login` | String | The broadcaster's login name |
| `data[].user_name` | String | The broadcaster's display name |
| `data[].videos[]` | Object[] | Array of video objects containing markers |
| `data[].videos[].video_id` | String | The ID of the video |
| `data[].videos[].markers[]` | Object[] | Array of marker objects for this video |
| `data[].videos[].markers[].id` | String | Unique marker ID |
| `data[].videos[].markers[].created_at` | String | When the marker was created (RFC 3339 format) |
| `data[].videos[].markers[].description` | String | Description of the marker |
| `data[].videos[].markers[].position_seconds` | Integer | Position in the video in seconds |
| `data[].videos[].markers[].URL` | String | Direct URL to the marked position in the video |
| `pagination.cursor` | String | Cursor for the next page |

**cURL Example:**

```bash
# Get markers by user (most recent VOD)
curl -X GET 'https://api.twitch.tv/helix/streams/markers?user_id=141981764&first=20' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'

# Get markers by video ID
curl -X GET 'https://api.twitch.tv/helix/streams/markers?video_id=1234567890' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api get /streams/markers -q user_id=141981764
twitch api get /streams/markers -q video_id=1234567890
```

---

### 4.5 Get Followed Streams

Returns a list of live streams from channels that the authenticated user follows.

**Endpoint:**

```
GET https://api.twitch.tv/helix/streams/followed
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `user:read:follows` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | String | Yes | The ID of the user whose followed streams you want to get. Must match the user ID in the access token. |
| `first` | Integer | No | Maximum number of items to return per page. Default: **100**. Maximum: **100**. |
| `after` | String | No | Cursor for forward pagination. |

**Response Body:**

The response structure is identical to [Get Streams](#41-get-streams):

```json
{
  "data": [
    {
      "id": "40952121085",
      "user_id": "141981764",
      "user_login": "twitchdev",
      "user_name": "TwitchDev",
      "game_id": "509670",
      "game_name": "Science & Technology",
      "type": "live",
      "title": "TwitchDev Stream",
      "viewer_count": 5723,
      "started_at": "2023-08-01T20:00:00Z",
      "language": "en",
      "thumbnail_url": "https://static-cdn.jtvnw.net/previews-ttv/live_user_twitchdev-{width}x{height}.jpg",
      "tag_ids": [],
      "tags": ["English"],
      "is_mature": false
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6MjB9fQ"
  }
}
```

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/streams/followed?user_id=141981764' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api get /streams/followed -q user_id=141981764
```

**Related EventSub Types:**

| EventSub Type | Description |
|---------------|-------------|
| `stream.online` | A followed broadcaster starts a stream |
| `stream.offline` | A followed broadcaster stops a stream |

---

## 5. Raids

### 5.1 Start a Raid

Initiates a raid from the broadcaster's channel to the target channel. The raid begins after a 90-second countdown (the standard Twitch raid delay) unless the broadcaster cancels it.

**Endpoint:**

```
POST https://api.twitch.tv/helix/raids
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `channel:manage:raids` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from_broadcaster_id` | String | Yes | The ID of the broadcaster initiating the raid. Must match the user ID in the access token. |
| `to_broadcaster_id` | String | Yes | The ID of the broadcaster being raided. |

**Response Body:**

```json
{
  "data": [
    {
      "created_at": "2023-08-01T22:00:00Z",
      "is_mature": false
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `created_at` | String | When the raid was initiated (RFC 3339 format) |
| `is_mature` | Boolean | Whether the target channel is marked as mature content |

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/raids?from_broadcaster_id=141981764&to_broadcaster_id=12345678' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api post /raids \
  -q from_broadcaster_id=141981764 \
  -q to_broadcaster_id=12345678
```

**Important Notes:**

- The broadcaster must be **live** to initiate a raid.
- A raid has a **90-second countdown** before it executes.
- The broadcaster (or their moderators) can cancel the raid during the countdown.
- A broadcaster cannot raid themselves.
- Rate limit: approximately 10 requests per 10 minutes.

**Related EventSub Types:**

| EventSub Type | Description |
|---------------|-------------|
| `channel.raid` | A broadcaster raids another channel (fires for both the raiding and raided channel) |

---

### 5.2 Cancel a Raid

Cancels a pending raid that the broadcaster initiated. The raid must still be in the 90-second countdown period.

**Endpoint:**

```
DELETE https://api.twitch.tv/helix/raids
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `channel:manage:raids` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose pending raid you want to cancel. Must match the user ID in the access token. |

**Response:**

```
204 No Content
```

**cURL Example:**

```bash
curl -X DELETE 'https://api.twitch.tv/helix/raids?broadcaster_id=141981764' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api delete /raids -q broadcaster_id=141981764
```

**Important Notes:**

- Only works if a raid is currently pending (in the countdown phase).
- Returns 204 even if no raid is pending.

---

## 6. Schedule

### 6.1 Get Channel Stream Schedule

Returns the broadcaster's stream schedule, including recurring and non-recurring segments. The schedule shows planned future streams.

**Endpoint:**

```
GET https://api.twitch.tv/helix/schedule
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| App Access Token | None |
| User Access Token | None |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose schedule you want to get. |
| `id` | String | No | The ID of a specific schedule segment to retrieve. You may specify up to **100** IDs. |
| `start_time` | String | No | The start date/time for the schedule segments to return (RFC 3339 format). Defaults to the current UTC time. Use this to look ahead or back in the schedule. |
| `utc_offset` | String | No | The UTC offset in minutes for the returned start and end times (e.g., `"-240"` for EDT). |
| `first` | Integer | No | Maximum number of schedule segments to return per page. Default: **20**. Maximum: **25**. |
| `after` | String | No | Cursor for forward pagination. |

**Response Body:**

```json
{
  "data": {
    "segments": [
      {
        "id": "eyJzZWdtZW50SUQiOiI4Y2EwN2E2NC0...",
        "start_time": "2023-09-01T19:00:00Z",
        "end_time": "2023-09-01T20:00:00Z",
        "title": "Friday Night Gaming",
        "canceled_until": null,
        "category": {
          "id": "509658",
          "name": "Just Chatting"
        },
        "is_recurring": true
      },
      {
        "id": "eyJzZWdtZW50SUQiOiIwMjVlMmRhNC0...",
        "start_time": "2023-09-05T22:00:00Z",
        "end_time": "2023-09-06T00:00:00Z",
        "title": "Special Event: Charity Stream",
        "canceled_until": null,
        "category": {
          "id": "33214",
          "name": "Fortnite"
        },
        "is_recurring": false
      }
    ],
    "broadcaster_id": "141981764",
    "broadcaster_name": "TwitchDev",
    "broadcaster_login": "twitchdev",
    "vacation": null
  },
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6NX19"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `data.segments[]` | Object[] | Array of schedule segment objects |
| `data.segments[].id` | String | Unique ID of the schedule segment |
| `data.segments[].start_time` | String | Start time of the segment (RFC 3339 format) |
| `data.segments[].end_time` | String | End time of the segment (RFC 3339 format) |
| `data.segments[].title` | String | Title of the scheduled stream |
| `data.segments[].canceled_until` | String | If the segment is canceled, the date until which it is canceled (RFC 3339). `null` if not canceled. |
| `data.segments[].category` | Object | The game/category for this segment. Contains `id` and `name`. `null` if no category is set. |
| `data.segments[].is_recurring` | Boolean | Whether this is a weekly recurring segment |
| `data.broadcaster_id` | String | The broadcaster's user ID |
| `data.broadcaster_name` | String | The broadcaster's display name |
| `data.broadcaster_login` | String | The broadcaster's login name |
| `data.vacation` | Object | The broadcaster's vacation settings. Contains `start_time` and `end_time`. `null` if no vacation is set. |
| `pagination.cursor` | String | Cursor for the next page of segments |

**Pagination:**

This endpoint supports forward pagination using the `after` cursor. The `first` parameter has a maximum of **25** (lower than most other endpoints).

**cURL Example:**

```bash
# Get current schedule
curl -X GET 'https://api.twitch.tv/helix/schedule?broadcaster_id=141981764' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'

# Get schedule starting from a specific date
curl -X GET 'https://api.twitch.tv/helix/schedule?broadcaster_id=141981764&start_time=2023-09-01T00:00:00Z' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'

# Get a specific segment by ID
curl -X GET 'https://api.twitch.tv/helix/schedule?broadcaster_id=141981764&id=eyJzZWdtZW50SUQi...' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api get /schedule -q broadcaster_id=141981764
twitch api get /schedule -q broadcaster_id=141981764 -q start_time=2023-09-01T00:00:00Z
```

**Important Notes:**

- The response's `data` is an **object** (not an array), with `segments` as a nested array. This differs from most other endpoints.
- Segments are sorted by `start_time` ascending.
- If the broadcaster has no schedule, the `segments` field will be `null` (not an empty array).
- By default, only future segments are returned. Use `start_time` to query past segments.

---

### 6.2 Get Channel iCalendar

Returns the broadcaster's stream schedule as an iCalendar (`.ics`) file. This endpoint does **not** require authentication.

**Endpoint:**

```
GET https://api.twitch.tv/helix/schedule/icalendar
```

**Authentication:**

No authentication required. No headers needed.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose schedule you want as iCalendar. |

**Response:**

The response body is plain text in iCalendar format (`text/calendar`), not JSON.

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Twitch//StreamSchedule//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:TwitchDev's Stream Schedule
BEGIN:VEVENT
DTSTART:20230901T190000Z
DTEND:20230901T200000Z
SUMMARY:Friday Night Gaming
DESCRIPTION:Just Chatting
RRULE:FREQ=WEEKLY;BYDAY=FR
END:VEVENT
END:VCALENDAR
```

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/schedule/icalendar?broadcaster_id=141981764'
```

**Twitch CLI Example:**

```bash
# Twitch CLI may not support non-JSON responses well; use curl directly
curl 'https://api.twitch.tv/helix/schedule/icalendar?broadcaster_id=141981764'
```

**Important Notes:**

- No authentication required -- this is a public endpoint.
- No `Client-Id` header needed.
- The response is `text/calendar` content type, not JSON.
- Useful for subscribing to a broadcaster's schedule in calendar applications (Google Calendar, Apple Calendar, Outlook, etc.).
- Recurring segments are represented using `RRULE` in the iCalendar format.

---

### 6.3 Update Channel Stream Schedule

Updates the broadcaster's stream schedule settings, specifically for managing vacation status. This endpoint does **not** manage individual segments (use the segment endpoints for that).

**Endpoint:**

```
PATCH https://api.twitch.tv/helix/schedule/settings
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `channel:manage:schedule` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |
| `Content-Type` | `application/json` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose schedule settings you want to update. Must match the user ID in the access token. |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `is_vacation_enabled` | Boolean | No | Set to `true` to enable vacation mode, `false` to disable it. |
| `vacation_start_time` | String | Conditional | Start time of the vacation (RFC 3339 format). Required when `is_vacation_enabled` is `true`. |
| `vacation_end_time` | String | Conditional | End time of the vacation (RFC 3339 format). Required when `is_vacation_enabled` is `true`. |
| `timezone` | String | Conditional | The timezone for the vacation times (IANA timezone, e.g., `"America/New_York"`). Required when `is_vacation_enabled` is `true`. |

**Response:**

```
204 No Content
```

**cURL Example:**

```bash
# Enable vacation
curl -X PATCH 'https://api.twitch.tv/helix/schedule/settings?broadcaster_id=141981764' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2' \
  -H 'Content-Type: application/json' \
  -d '{
    "is_vacation_enabled": true,
    "vacation_start_time": "2023-12-20T00:00:00Z",
    "vacation_end_time": "2024-01-05T00:00:00Z",
    "timezone": "America/New_York"
  }'

# Disable vacation
curl -X PATCH 'https://api.twitch.tv/helix/schedule/settings?broadcaster_id=141981764' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2' \
  -H 'Content-Type: application/json' \
  -d '{"is_vacation_enabled": false}'
```

**Twitch CLI Example:**

```bash
twitch api patch /schedule/settings \
  -q broadcaster_id=141981764 \
  -b '{"is_vacation_enabled":true,"vacation_start_time":"2023-12-20T00:00:00Z","vacation_end_time":"2024-01-05T00:00:00Z","timezone":"America/New_York"}'
```

**Important Notes:**

- Setting a vacation does **not** remove or cancel existing schedule segments within the vacation period.
- While a vacation is active, you **cannot** add new segments that fall within the vacation period.
- Remember to disable the vacation when it is over.

---

### 6.4 Create Channel Stream Schedule Segment

Creates a new segment (entry) in the broadcaster's stream schedule. Segments can be recurring (weekly) or non-recurring (one-time).

**Endpoint:**

```
POST https://api.twitch.tv/helix/schedule/segment
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `channel:manage:schedule` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |
| `Content-Type` | `application/json` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster who wants to add a schedule segment. Must match the user ID in the access token. |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `start_time` | String | Yes | The start date and time of the segment (RFC 3339 format). For recurring segments, the date determines the day of the week. |
| `timezone` | String | Yes | The timezone for the segment (IANA timezone, e.g., `"America/New_York"`). |
| `duration` | String | No | The duration of the segment in minutes. Default: **240** (4 hours). |
| `is_recurring` | Boolean | No | Whether the segment is recurring weekly. Default: `false`. |
| `category_id` | String | No | The ID of the game/category for this segment. |
| `title` | String | No | The title of the scheduled stream. Maximum **140** characters. |

**Response Body:**

The response is the same structure as [Get Channel Stream Schedule](#61-get-channel-stream-schedule), containing the updated schedule data.

```json
{
  "data": {
    "segments": [
      {
        "id": "eyJzZWdtZW50SUQiOiI4Y2EwN2E2NC0...",
        "start_time": "2023-09-01T19:00:00Z",
        "end_time": "2023-09-01T23:00:00Z",
        "title": "Friday Night Gaming",
        "canceled_until": null,
        "category": {
          "id": "509658",
          "name": "Just Chatting"
        },
        "is_recurring": true
      }
    ],
    "broadcaster_id": "141981764",
    "broadcaster_name": "TwitchDev",
    "broadcaster_login": "twitchdev",
    "vacation": null
  },
  "pagination": {}
}
```

**cURL Example:**

```bash
# Create a recurring weekly segment
curl -X POST 'https://api.twitch.tv/helix/schedule/segment?broadcaster_id=141981764' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2' \
  -H 'Content-Type: application/json' \
  -d '{
    "start_time": "2023-09-01T19:00:00Z",
    "timezone": "America/New_York",
    "duration": "240",
    "is_recurring": true,
    "category_id": "509658",
    "title": "Friday Night Gaming"
  }'

# Create a one-time segment
curl -X POST 'https://api.twitch.tv/helix/schedule/segment?broadcaster_id=141981764' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2' \
  -H 'Content-Type: application/json' \
  -d '{
    "start_time": "2023-09-05T22:00:00Z",
    "timezone": "America/New_York",
    "duration": "120",
    "is_recurring": false,
    "category_id": "33214",
    "title": "Special Event: Charity Stream"
  }'
```

**Twitch CLI Example:**

```bash
twitch api post /schedule/segment \
  -q broadcaster_id=141981764 \
  -b '{"start_time":"2023-09-01T19:00:00Z","timezone":"America/New_York","duration":"240","is_recurring":true,"title":"Friday Night Gaming"}'
```

**Important Notes:**

- Only **affiliates** and **partners** may add schedule segments.
- For recurring segments, the segment repeats every week on the same day and time.
- The `start_time` determines which day of the week the recurring segment falls on.
- You cannot create segments that fall within an active vacation period.

---

### 6.5 Update Channel Stream Schedule Segment

Updates an existing schedule segment. For recurring segments, changes apply to **all** occurrences of that segment, not just a single week.

**Endpoint:**

```
PATCH https://api.twitch.tv/helix/schedule/segment
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `channel:manage:schedule` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |
| `Content-Type` | `application/json` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose schedule you want to update. Must match the user ID in the access token. |
| `id` | String | Yes | The ID of the schedule segment to update. |

**Request Body (JSON):**

All body fields are optional. Include only the fields you want to update.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `start_time` | String | No | The new start date/time (RFC 3339 format). |
| `timezone` | String | No | The timezone for the start time (IANA timezone). |
| `duration` | String | No | The new duration in minutes. |
| `category_id` | String | No | The new game/category ID. |
| `title` | String | No | The new title. Maximum **140** characters. |
| `is_canceled` | Boolean | No | Set to `true` to cancel the segment (for the current occurrence of a recurring segment). Set to `false` to un-cancel. |

**Response Body:**

Same structure as [Get Channel Stream Schedule](#61-get-channel-stream-schedule), containing the updated schedule data.

**cURL Example:**

```bash
# Update title and category
curl -X PATCH 'https://api.twitch.tv/helix/schedule/segment?broadcaster_id=141981764&id=eyJzZWdtZW50SUQi...' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Updated: Special Gaming Night",
    "category_id": "509658"
  }'

# Cancel a specific occurrence of a recurring segment
curl -X PATCH 'https://api.twitch.tv/helix/schedule/segment?broadcaster_id=141981764&id=eyJzZWdtZW50SUQi...' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2' \
  -H 'Content-Type: application/json' \
  -d '{"is_canceled": true}'
```

**Twitch CLI Example:**

```bash
twitch api patch /schedule/segment \
  -q broadcaster_id=141981764 \
  -q id=eyJzZWdtZW50SUQi... \
  -b '{"title":"Updated: Special Gaming Night"}'
```

**Important Notes:**

- For recurring segments, changes to `title`, `duration`, and `category_id` apply to **all** occurrences.
- The `is_canceled` field can cancel a single occurrence of a recurring segment without deleting the entire recurring series.
- Because updates apply to all occurrences, it does not matter which segment occurrence ID you use for the update.

---

### 6.6 Delete Channel Stream Schedule Segment

Deletes a schedule segment. For recurring segments, this deletes the **entire** recurring series, not just a single occurrence.

**Endpoint:**

```
DELETE https://api.twitch.tv/helix/schedule/segment
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| User Access Token | `channel:manage:schedule` |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <user_access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose schedule segment you want to delete. Must match the user ID in the access token. |
| `id` | String | Yes | The ID of the schedule segment to delete. |

**Response:**

```
204 No Content
```

**cURL Example:**

```bash
curl -X DELETE 'https://api.twitch.tv/helix/schedule/segment?broadcaster_id=141981764&id=eyJzZWdtZW50SUQi...' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api delete /schedule/segment \
  -q broadcaster_id=141981764 \
  -q id=eyJzZWdtZW50SUQi...
```

**Important Notes:**

- For **non-recurring** segments: deletes the specific segment.
- For **recurring** segments: deletes the **entire recurring series**, not just the occurrence associated with the ID you pass. If you only want to cancel a single occurrence, use [Update Channel Stream Schedule Segment](#65-update-channel-stream-schedule-segment) with `is_canceled: true` instead.

---

## 7. Teams

### 7.1 Get Teams

Returns information about a specific Twitch Team, including its member list. You must specify either the team `name` or `id`, but not both.

**Endpoint:**

```
GET https://api.twitch.tv/helix/teams
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| App Access Token | None |
| User Access Token | None |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | String | Conditional | The team's URL-friendly name (e.g., `"twitchdev"`). Specify `name` or `id`, not both. |
| `id` | String | Conditional | The team's ID. Specify `name` or `id`, not both. |

**Response Body:**

```json
{
  "data": [
    {
      "users": [
        {
          "user_id": "141981764",
          "user_login": "twitchdev",
          "user_name": "TwitchDev"
        },
        {
          "user_id": "12345678",
          "user_login": "anotheruser",
          "user_name": "AnotherUser"
        }
      ],
      "background_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/team-bg.png",
      "banner": "https://static-cdn.jtvnw.net/jtv_user_pictures/team-banner.png",
      "created_at": "2019-02-11T12:09:22Z",
      "updated_at": "2023-05-01T08:11:14Z",
      "info": "This is the team description.",
      "thumbnail_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/team-thumbnail.png",
      "team_name": "twitchdev",
      "team_display_name": "TwitchDev Team",
      "id": "6358"
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `users[]` | Object[] | Array of team members |
| `users[].user_id` | String | The member's user ID |
| `users[].user_login` | String | The member's login name |
| `users[].user_name` | String | The member's display name |
| `background_image_url` | String | URL of the team's background image. May be `null`. |
| `banner` | String | URL of the team's banner image. May be `null`. |
| `created_at` | String | When the team was created (RFC 3339 format) |
| `updated_at` | String | When the team was last updated (RFC 3339 format) |
| `info` | String | The team's description/bio. May contain HTML. |
| `thumbnail_url` | String | URL of the team's thumbnail/logo |
| `team_name` | String | The team's URL-friendly name |
| `team_display_name` | String | The team's display name |
| `id` | String | The team's unique ID |

**cURL Example:**

```bash
# Get team by name
curl -X GET 'https://api.twitch.tv/helix/teams?name=twitchdev' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'

# Get team by ID
curl -X GET 'https://api.twitch.tv/helix/teams?id=6358' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api get /teams -q name=twitchdev
twitch api get /teams -q id=6358
```

---

### 7.2 Get Channel Teams

Returns a list of Twitch Teams that the specified broadcaster is a member of.

**Endpoint:**

```
GET https://api.twitch.tv/helix/teams/channel
```

**Authentication:**

| Token Type | Required Scope |
|------------|---------------|
| App Access Token | None |
| User Access Token | None |

**Required Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Client-Id` | Your application's Client ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose team memberships you want to get. |

**Response Body:**

```json
{
  "data": [
    {
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "background_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/team-bg.png",
      "banner": "https://static-cdn.jtvnw.net/jtv_user_pictures/team-banner.png",
      "created_at": "2019-02-11T12:09:22Z",
      "updated_at": "2023-05-01T08:11:14Z",
      "info": "This is the team description.",
      "thumbnail_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/team-thumbnail.png",
      "team_name": "twitchdev",
      "team_display_name": "TwitchDev Team",
      "id": "6358"
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `broadcaster_id` | String | The broadcaster's user ID |
| `broadcaster_login` | String | The broadcaster's login name |
| `broadcaster_name` | String | The broadcaster's display name |
| `background_image_url` | String | URL of the team's background image. May be `null`. |
| `banner` | String | URL of the team's banner image. May be `null`. |
| `created_at` | String | When the team was created (RFC 3339 format) |
| `updated_at` | String | When the team was last updated (RFC 3339 format) |
| `info` | String | The team's description/bio. May contain HTML. |
| `thumbnail_url` | String | URL of the team's thumbnail/logo |
| `team_name` | String | The team's URL-friendly name |
| `team_display_name` | String | The team's display name |
| `id` | String | The team's unique ID |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/teams/channel?broadcaster_id=141981764' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

**Twitch CLI Example:**

```bash
twitch api get /teams/channel -q broadcaster_id=141981764
```

**Important Notes:**

- If the broadcaster is not a member of any team, the `data` array will be empty.
- Unlike Get Teams, this endpoint does **not** include the `users` array (team member list). Use Get Teams with the team's `id` or `name` to retrieve the member list.

---

## 8. Best Practices

### Channel Information

- **Batch requests:** Get Channel Information supports up to 100 `broadcaster_id` parameters in a single request. Batch your queries to minimize API calls.
- **Cache channel data:** Channel information (language, game, title) changes infrequently. Cache responses and use EventSub `channel.update` to invalidate the cache.
- **Tags are free-form:** Tags are free-form strings, not predefined values. Automatic tags (e.g., language tags) are set by Twitch and cannot be modified through the API.

### Streams

- **Viewer counts are approximate:** The `viewer_count` field is not real-time. It may be delayed by up to 2 minutes.
- **Thumbnail caching:** Stream thumbnails are cached by CDN. Append a cache-busting parameter (e.g., `?t=timestamp`) to get a fresh thumbnail.
- **Stream IDs change:** A new `id` is generated each time a broadcaster starts a stream. Do not use the stream ID as a permanent identifier for the channel.
- **Polling vs. EventSub:** For detecting stream online/offline status, prefer EventSub (`stream.online`, `stream.offline`) over polling Get Streams.

### Followers

- **Follower count:** The `total` field in Get Channel Followers gives an accurate follower count without needing to paginate through all results.
- **Scope requirements:** After the API changes in 2023, getting a full list of followers requires `moderator:read:followers`. The authenticated user must be the broadcaster or a moderator.

### Ads

- **Respect `retry_after`:** After starting a commercial, respect the `retry_after` value to avoid errors on subsequent requests.
- **Snooze limits:** Broadcasters have a limited number of snoozes. Check `snooze_count` before attempting to snooze.
- **Pre-roll free time:** Running midroll ads earns pre-roll free time for new viewers. Monitor `preroll_free_time` to optimize ad strategy.

### Schedule

- **Recurring vs. non-recurring:** Only affiliates and partners can create schedule segments. Recurring segments repeat weekly on the same day and time.
- **Vacation behavior:** Setting a vacation does not cancel segments. It only prevents new segments from being created within the vacation period. Existing segments remain visible.
- **Segment deletion:** Deleting a recurring segment deletes the **entire series**. To cancel a single occurrence, use the update endpoint with `is_canceled: true`.
- **iCalendar integration:** Use the iCalendar endpoint for easy integration with calendar applications. It requires no authentication.

### Teams

- **No pagination:** The Teams endpoints do not support pagination. All data is returned in a single response.
- **Team info may contain HTML:** The `info` field in team responses may contain raw HTML. Sanitize it before rendering in your application.

### Rate Limits

All endpoints in this document are subject to standard Twitch API rate limits (800 points per minute for app tokens, 800 points per minute per user for user tokens). Most GET requests cost 1 point. POST/PATCH/DELETE requests generally cost 1 point as well.

---

## 9. Known Issues & Community Quirks

### Channels

1. **`delay` always 0 for non-partners:** The `delay` field in Get Channel Information always returns `0` for non-partner broadcasters, even if they attempt to set it via Modify Channel Information. Only partners can set stream delay.

2. **Empty tags array vs. no tags:** When a channel has no tags, the `tags` field returns an empty array `[]`, not `null`.

3. **Content classification labels:** The `MatureGame` label is set automatically by Twitch based on the selected category and cannot be manually set or removed via the API.

4. **`broadcaster_id` required even for own channel:** When modifying your own channel, you still must pass `broadcaster_id` as a query parameter, even though the user ID is already in the token.

### Streams

5. **`tag_ids` deprecated but present:** The `tag_ids` field is deprecated and always returns an empty array, but it is still included in responses. Use `tags` instead.

6. **Thumbnail URL placeholders:** The `thumbnail_url` contains `{width}` and `{height}` placeholders that must be replaced. Common sizes: `440x248`, `640x360`, `1920x1080`. Requesting non-standard sizes may return a 404.

7. **Stream markers require VODs enabled:** Creating stream markers fails silently if the broadcaster does not have "Store Past Broadcasts" enabled in their settings.

8. **Get Streams returns stale data briefly:** When a stream goes offline, it may still appear in Get Streams results for a short period (up to a few minutes).

### Raids

9. **Raid countdown not exposed:** The API does not expose the raid countdown timer. You only know when the raid was initiated via `created_at`, but the actual raid execution happens approximately 90 seconds later.

10. **Self-raid returns error:** Attempting to raid your own channel returns a `400 Bad Request` error.

### Schedule

11. **Schedule segment IDs are opaque Base64 strings:** Schedule segment IDs are Base64-encoded strings that can be very long. Ensure your application can handle arbitrary-length string IDs.

12. **`segments` is `null` when empty:** Unlike most Twitch API responses where `data` is an empty array, the schedule endpoint returns `"segments": null` when there are no segments, which can cause null reference errors if not handled.

13. **Vacation does not cancel segments:** A common misconception: enabling vacation mode does not automatically cancel or hide existing segments. Viewers will still see the scheduled segments even during a vacation.

14. **Max pagination `first` is 25:** Unlike most endpoints that support `first` up to 100, the schedule endpoint caps at 25 segments per page.

### Teams

15. **`info` field may contain HTML:** The team `info` field can contain raw HTML markup. Always sanitize before rendering to prevent XSS.

16. **No team management endpoints:** The API only provides read access for teams. There are no endpoints to create, update, or delete teams or manage team membership.

17. **`background_image_url` and `banner` may be null:** These fields are often `null` for teams that have not set custom images.

---

## 10. Quick Reference Table

| # | Endpoint | Method | Path | Auth | Scope | Paginated |
|---|----------|--------|------|------|-------|-----------|
| 1 | Get Channel Information | GET | `/channels` | App/User | None | No |
| 2 | Modify Channel Information | PATCH | `/channels` | User | `channel:manage:broadcast` | No |
| 3 | Get Channel Editors | GET | `/channels/editors` | User | `channel:read:editors` | No |
| 4 | Get Followed Channels | GET | `/channels/followed` | User | `user:read:follows` | Yes |
| 5 | Get Channel Followers | GET | `/channels/followers` | User | `moderator:read:followers` | Yes |
| 6 | Start Commercial | POST | `/channels/commercial` | User | `channel:edit:commercial` | No |
| 7 | Get Ad Schedule | GET | `/channels/ads` | User | `channel:read:ads` | No |
| 8 | Snooze Next Ad | POST | `/channels/ads/schedule/snooze` | User | `channel:manage:ads` | No |
| 9 | Get Streams | GET | `/streams` | App/User | None | Yes |
| 10 | Get Stream Key | GET | `/streams/key` | User | `channel:read:stream_key` | No |
| 11 | Create Stream Marker | POST | `/streams/markers` | User | `channel:manage:broadcast` | No |
| 12 | Get Stream Markers | GET | `/streams/markers` | User | `user:read:broadcast` | Yes |
| 13 | Get Followed Streams | GET | `/streams/followed` | User | `user:read:follows` | Yes |
| 14 | Start a Raid | POST | `/raids` | User | `channel:manage:raids` | No |
| 15 | Cancel a Raid | DELETE | `/raids` | User | `channel:manage:raids` | No |
| 16 | Get Channel Stream Schedule | GET | `/schedule` | App/User | None | Yes |
| 17 | Get Channel iCalendar | GET | `/schedule/icalendar` | None | None | No |
| 18 | Update Channel Stream Schedule | PATCH | `/schedule/settings` | User | `channel:manage:schedule` | No |
| 19 | Create Schedule Segment | POST | `/schedule/segment` | User | `channel:manage:schedule` | No |
| 20 | Update Schedule Segment | PATCH | `/schedule/segment` | User | `channel:manage:schedule` | No |
| 21 | Delete Schedule Segment | DELETE | `/schedule/segment` | User | `channel:manage:schedule` | No |
| 22 | Get Teams | GET | `/teams` | App/User | None | No |
| 23 | Get Channel Teams | GET | `/teams/channel` | App/User | None | No |

### Scopes Summary (Unique scopes used by endpoints in this document)

| Scope | Used By |
|-------|---------|
| `channel:manage:broadcast` | Modify Channel Information, Create Stream Marker |
| `channel:read:editors` | Get Channel Editors |
| `user:read:follows` | Get Followed Channels, Get Followed Streams |
| `moderator:read:followers` | Get Channel Followers |
| `channel:edit:commercial` | Start Commercial |
| `channel:read:ads` | Get Ad Schedule |
| `channel:manage:ads` | Snooze Next Ad |
| `channel:read:stream_key` | Get Stream Key |
| `user:read:broadcast` | Get Stream Markers |
| `channel:manage:raids` | Start a Raid, Cancel a Raid |
| `channel:manage:schedule` | Update Channel Stream Schedule, Create/Update/Delete Schedule Segment |

### Related EventSub Types Summary

| EventSub Type | Triggered By |
|---------------|-------------|
| `channel.update` | Channel info changes (title, category, language, etc.) |
| `channel.follow` | A user follows a channel |
| `channel.ad_break.begin` | A midroll commercial break starts |
| `stream.online` | A broadcaster starts streaming |
| `stream.offline` | A broadcaster stops streaming |
| `channel.raid` | A broadcaster raids another channel |
