---
title: "Twitch API — Clips, Videos, Games & Search"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Twitch API — Clips, Videos, Games & Search

> **Source:** https://dev.twitch.tv/docs/api/reference
> **API Base URL:** `https://api.twitch.tv/helix`
> **Last Updated:** 2026-02-13
> **Endpoints Covered:** 11 (Clips: 2, Videos: 2, Games: 2, Search: 2, Ads: 3)

---

## Table of Contents

- [Quick Reference Table](#quick-reference-table)
- [Clips Endpoints](#clips-endpoints)
  - [Create Clip](#create-clip)
  - [Get Clips](#get-clips)
- [Videos Endpoints](#videos-endpoints)
  - [Get Videos](#get-videos)
  - [Delete Videos](#delete-videos)
- [Games / Categories Endpoints](#games--categories-endpoints)
  - [Get Games](#get-games)
  - [Get Top Games](#get-top-games)
- [Search Endpoints](#search-endpoints)
  - [Search Categories](#search-categories)
  - [Search Channels](#search-channels)
- [Ads Endpoints](#ads-endpoints)
  - [Start Commercial](#start-commercial)
  - [Get Ad Schedule](#get-ad-schedule)
  - [Snooze Next Ad](#snooze-next-ad)
- [Related EventSub Types](#related-eventsub-types)
- [Best Practices](#best-practices)
- [Known Issues](#known-issues)

---

## Quick Reference Table

| Method | Endpoint | Auth | Scope | Description |
|--------|----------|------|-------|-------------|
| `POST` | `/clips` | User Token | `clips:edit` | Create a clip from a live stream |
| `GET` | `/clips` | App or User Token | None | Get clips by broadcaster, game, or ID |
| `GET` | `/videos` | App or User Token | None | Get videos by ID, user, or game |
| `DELETE` | `/videos` | User Token | `channel:manage:videos` | Delete up to 5 videos at once |
| `GET` | `/games` | App or User Token | None | Get game/category info by ID, name, or IGDB ID |
| `GET` | `/games/top` | App or User Token | None | Get most popular games/categories |
| `GET` | `/search/categories` | App or User Token | None | Search for games/categories by name |
| `GET` | `/search/channels` | App or User Token | None | Search for channels by query |
| `POST` | `/channels/commercial` | User Token | `channel:edit:commercial` | Start a commercial break |
| `GET` | `/channels/ads` | User Token | `channel:read:ads` | Get ad schedule for a channel |
| `POST` | `/channels/ads/schedule/snooze` | User Token | `channel:manage:ads` | Snooze the next scheduled ad |

---

## Clips Endpoints

### Create Clip

Creates a clip from a broadcaster's live stream. This is an **asynchronous operation** — the clip may not be ready immediately after creation. The clip captures up to 90 seconds of the broadcast and can be trimmed to between 5 and 60 seconds using the returned edit URL.

**The broadcaster must be live for clip creation to succeed.**

```
POST https://api.twitch.tv/helix/clips
```

#### Authentication

| Requirement | Value |
|-------------|-------|
| Auth Type | User Access Token |
| Required Scope | `clips:edit` |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose stream to clip. |
| `has_delay` | Boolean | No | If `true`, adds a short delay before capturing the clip. This gives the broadcaster time to trigger a clip point (e.g., after something notable happens). Default: `false`. |

#### Response Body

```json
{
  "data": [
    {
      "id": "AbCdEfGhIjKlMn",
      "edit_url": "https://clips.twitch.tv/AbCdEfGhIjKlMn/edit"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | The ID of the newly created clip. |
| `edit_url` | String | URL to the clip editing page where you can set start/end points and title. |

#### Response Codes

| Code | Description |
|------|-------------|
| 202 | Clip creation accepted (async). |
| 401 | Missing or invalid token / insufficient scope. |
| 404 | Broadcaster not found or not live. |

#### cURL Example

```bash
# Create a clip from a live stream
curl -X POST 'https://api.twitch.tv/helix/clips?broadcaster_id=141981764' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

```bash
# Create a clip with delay
curl -X POST 'https://api.twitch.tv/helix/clips?broadcaster_id=141981764&has_delay=true' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

#### Twitch CLI Example

```bash
# Create a clip
twitch api post /clips -q broadcaster_id=141981764

# Create a clip with delay
twitch api post /clips -q broadcaster_id=141981764 -q has_delay=true
```

#### Important Notes

- The clip is created asynchronously. After receiving the `202` response, poll `GET /clips` with the returned `id` to check when the clip is ready.
- The `edit_url` lets the user trim the clip (5-60 seconds) and set a title.
- If the broadcaster is not live, the request will fail with a `404`.
- The clip is attributed to the user whose token is used (the "clipper").

---

### Get Clips

Gets one or more clips. You must specify at least one of: `broadcaster_id`, `game_id`, or `id`.

```
GET https://api.twitch.tv/helix/clips
```

#### Authentication

| Requirement | Value |
|-------------|-------|
| Auth Type | App Access Token or User Access Token |
| Required Scope | None |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | One of these | Get clips from this broadcaster. |
| `game_id` | String | is required | Get clips for this game/category. |
| `id` | String | | One or more clip IDs. Maximum: 100. |
| `started_at` | String (RFC 3339) | No | Filter clips created on or after this date. |
| `ended_at` | String (RFC 3339) | No | Filter clips created before this date. |
| `first` | Integer | No | Number of results per page. Maximum: 100. Default: 20. |
| `before` | String | No | Cursor for backward pagination. |
| `after` | String | No | Cursor for forward pagination. |
| `is_featured` | Boolean | No | If `true`, return only featured clips. If `false`, return only non-featured clips. Omit for all clips. |

#### Response Body

```json
{
  "data": [
    {
      "id": "AwkwardHelplessSalamanderSwiftRage",
      "url": "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
      "embed_url": "https://clips.twitch.tv/embed?clip=AwkwardHelplessSalamanderSwiftRage",
      "broadcaster_id": "141981764",
      "broadcaster_name": "TwitchDev",
      "creator_id": "123456789",
      "creator_name": "ClipCreator",
      "video_id": "1234567890",
      "game_id": "33214",
      "language": "en",
      "title": "Amazing play!",
      "view_count": 10542,
      "created_at": "2025-10-15T12:30:00Z",
      "thumbnail_url": "https://clips-media-assets2.twitch.tv/abcdef-preview-480x272.jpg",
      "duration": 30.0,
      "vod_offset": 3600,
      "is_featured": false
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7IkN1cnNvciI6Ik..."
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique clip identifier (slug). |
| `url` | String | URL to view the clip on Twitch. |
| `embed_url` | String | URL for embedding the clip in an iframe. |
| `broadcaster_id` | String | ID of the broadcaster who was clipped. |
| `broadcaster_name` | String | Display name of the broadcaster. |
| `creator_id` | String | ID of the user who created the clip. |
| `creator_name` | String | Display name of the clip creator. |
| `video_id` | String | ID of the VOD the clip was taken from. Empty string if VOD is unavailable. |
| `game_id` | String | ID of the game/category being played when the clip was created. |
| `language` | String | Language of the stream when clipped (ISO 639-1). |
| `title` | String | Title of the clip. |
| `view_count` | Integer | Number of times the clip has been viewed. |
| `created_at` | String (RFC 3339) | When the clip was created. |
| `thumbnail_url` | String | URL of the clip's thumbnail image. |
| `duration` | Float | Duration of the clip in seconds. |
| `vod_offset` | Integer | Offset in the VOD (seconds) where the clip starts. `null` if VOD is unavailable. |
| `is_featured` | Boolean | Whether the clip is featured on the broadcaster's channel. |

#### cURL Examples

```bash
# Get clips by broadcaster
curl -X GET 'https://api.twitch.tv/helix/clips?broadcaster_id=141981764&first=5' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

```bash
# Get specific clips by ID
curl -X GET 'https://api.twitch.tv/helix/clips?id=AwkwardHelplessSalamanderSwiftRage&id=AnotherClipSlug' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

```bash
# Get clips for a game within a date range
curl -X GET 'https://api.twitch.tv/helix/clips?game_id=33214&started_at=2025-10-01T00:00:00Z&ended_at=2025-10-31T23:59:59Z&first=50' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

```bash
# Get only featured clips for a broadcaster
curl -X GET 'https://api.twitch.tv/helix/clips?broadcaster_id=141981764&is_featured=true' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

#### Twitch CLI Examples

```bash
# Get clips for a broadcaster
twitch api get /clips -q broadcaster_id=141981764 -q first=5

# Get a specific clip
twitch api get /clips -q id=AwkwardHelplessSalamanderSwiftRage

# Get featured clips for a game
twitch api get /clips -q game_id=33214 -q is_featured=true
```

---

## Videos Endpoints

### Get Videos

Gets video information by video ID, user, or game. Videos include VODs (past broadcasts), highlights, and uploads.

```
GET https://api.twitch.tv/helix/videos
```

#### Authentication

| Requirement | Value |
|-------------|-------|
| Auth Type | App Access Token or User Access Token |
| Required Scope | None |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | One of these | Video IDs to look up. Maximum: 100. |
| `user_id` | String | is required | Get videos from this user. |
| `game_id` | String | | Get videos for this game/category. |
| `language` | String | No | Filter by language (ISO 639-1 code). |
| `period` | String | No | Time period filter. Values: `all`, `day`, `week`, `month`. Default: `all`. |
| `sort` | String | No | Sort order. Values: `time`, `trending`, `views`. Default: `time`. |
| `type` | String | No | Video type filter. Values: `all`, `upload`, `archive`, `highlight`. Default: `all`. |
| `first` | Integer | No | Number of results per page. Maximum: 100. Default: 20. |
| `before` | String | No | Cursor for backward pagination. |
| `after` | String | No | Cursor for forward pagination. |

**Note:** `language`, `period`, `sort`, and `type` filters only apply when querying by `user_id` or `game_id`, not when querying by `id`.

#### Response Body

```json
{
  "data": [
    {
      "id": "1234567890",
      "stream_id": "9876543210",
      "user_id": "141981764",
      "user_login": "twitchdev",
      "user_name": "TwitchDev",
      "title": "Building cool integrations",
      "description": "Working on Twitch API examples today!",
      "created_at": "2025-10-15T08:00:00Z",
      "published_at": "2025-10-15T08:00:00Z",
      "url": "https://www.twitch.tv/videos/1234567890",
      "thumbnail_url": "https://static-cdn.jtvnw.net/cf_vods/abcdef/%{width}x%{height}.jpg",
      "viewable": "public",
      "view_count": 5432,
      "language": "en",
      "type": "archive",
      "duration": "3h24m18s",
      "muted_segments": [
        {
          "duration": 30,
          "offset": 1200
        }
      ]
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7IkN1cnNvciI6..."
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Video ID. |
| `stream_id` | String | ID of the stream the video originated from. `null` for uploads. |
| `user_id` | String | ID of the user who owns the video. |
| `user_login` | String | Login name of the video owner. |
| `user_name` | String | Display name of the video owner. |
| `title` | String | Title of the video. |
| `description` | String | Description of the video. |
| `created_at` | String (RFC 3339) | When the video was created. |
| `published_at` | String (RFC 3339) | When the video was published. |
| `url` | String | URL to view the video on Twitch. |
| `thumbnail_url` | String | Template URL for the video thumbnail. Replace `%{width}` and `%{height}` with desired dimensions. |
| `viewable` | String | Whether the video is publicly viewable. Values: `public`, `private`. |
| `view_count` | Integer | Number of times the video has been viewed. |
| `language` | String | Language of the video (ISO 639-1). |
| `type` | String | Type of video. Values: `upload`, `archive`, `highlight`. |
| `duration` | String | Duration of the video in ISO 8601 format (e.g., `3h24m18s`). |
| `muted_segments` | Array | Segments of the video that are muted due to copyrighted audio. `null` if no muted segments. |
| `muted_segments[].duration` | Integer | Duration of the muted segment in seconds. |
| `muted_segments[].offset` | Integer | Offset from the start of the video where the muted segment begins (seconds). |

#### cURL Examples

```bash
# Get specific videos by ID
curl -X GET 'https://api.twitch.tv/helix/videos?id=1234567890&id=9876543210' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

```bash
# Get a user's VODs (past broadcasts), sorted by views
curl -X GET 'https://api.twitch.tv/helix/videos?user_id=141981764&type=archive&sort=views&first=10' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

```bash
# Get top highlights for a game from the past week
curl -X GET 'https://api.twitch.tv/helix/videos?game_id=33214&type=highlight&period=week&sort=views&first=20' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

```bash
# Get a user's uploads in English
curl -X GET 'https://api.twitch.tv/helix/videos?user_id=141981764&type=upload&language=en' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

#### Twitch CLI Examples

```bash
# Get a specific video
twitch api get /videos -q id=1234567890

# Get a user's recent VODs
twitch api get /videos -q user_id=141981764 -q type=archive -q first=10

# Get trending videos for a game
twitch api get /videos -q game_id=33214 -q sort=trending -q period=week
```

#### Working with Thumbnail URLs

The `thumbnail_url` field contains placeholders for width and height:

```
https://static-cdn.jtvnw.net/cf_vods/abcdef/%{width}x%{height}.jpg
```

Replace the placeholders with pixel values:

```javascript
const thumbnailUrl = video.thumbnail_url
  .replace('%{width}', '320')
  .replace('%{height}', '180');
// Result: https://static-cdn.jtvnw.net/cf_vods/abcdef/320x180.jpg
```

---

### Delete Videos

Deletes one or more videos. The authenticated user must be the owner of the videos.

```
DELETE https://api.twitch.tv/helix/videos
```

#### Authentication

| Requirement | Value |
|-------------|-------|
| Auth Type | User Access Token |
| Required Scope | `channel:manage:videos` |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | IDs of videos to delete. Maximum: 5 per request. |

#### Response Body

```json
[
  "1234567890",
  "9876543210"
]
```

The response is an array of video IDs that were successfully deleted.

#### Response Codes

| Code | Description |
|------|-------------|
| 200 | Videos deleted successfully. |
| 401 | Missing or invalid token / insufficient scope. |
| 404 | One or more video IDs not found or not owned by the authenticated user. |

#### cURL Example

```bash
# Delete specific videos
curl -X DELETE 'https://api.twitch.tv/helix/videos?id=1234567890&id=9876543210' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

#### Twitch CLI Example

```bash
# Delete videos
twitch api delete /videos -q id=1234567890 -q id=9876543210
```

---

## Games / Categories Endpoints

Games and categories are used interchangeably on Twitch. A "game" can be an actual video game or a non-game category like "Just Chatting", "Music", or "Art".

### Get Games

Gets information about one or more games/categories. You must provide at least one of `id`, `name`, or `igdb_id`.

```
GET https://api.twitch.tv/helix/games
```

#### Authentication

| Requirement | Value |
|-------------|-------|
| Auth Type | App Access Token or User Access Token |
| Required Scope | None |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | At least one | Game/category IDs. Maximum: 100. |
| `name` | String | of these | Game/category names (exact match). Maximum: 100. |
| `igdb_id` | String | is required | IGDB IDs. Maximum: 100. |

You can mix and match these parameters. For example, you can pass some IDs and some names in the same request.

#### Response Body

```json
{
  "data": [
    {
      "id": "33214",
      "name": "Fortnite",
      "box_art_url": "https://static-cdn.jtvnw.net/ttv-boxart/33214-{width}x{height}.jpg",
      "igdb_id": "1905"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Twitch game/category ID. |
| `name` | String | Name of the game/category. |
| `box_art_url` | String | Template URL for the box art image. Replace `{width}` and `{height}` with desired dimensions. |
| `igdb_id` | String | The IGDB (Internet Game Database) ID for the game. Empty string if not available. |

#### cURL Examples

```bash
# Get games by ID
curl -X GET 'https://api.twitch.tv/helix/games?id=33214&id=509658' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

```bash
# Get games by name
curl -X GET 'https://api.twitch.tv/helix/games?name=Fortnite&name=Just%20Chatting' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

```bash
# Get games by IGDB ID
curl -X GET 'https://api.twitch.tv/helix/games?igdb_id=1905' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

#### Twitch CLI Examples

```bash
# Get a game by ID
twitch api get /games -q id=33214

# Get a game by name
twitch api get /games -q name=Fortnite

# Get multiple games
twitch api get /games -q id=33214 -q id=509658
```

#### Working with Box Art URLs

The `box_art_url` field uses a different placeholder syntax than video thumbnails:

```
https://static-cdn.jtvnw.net/ttv-boxart/33214-{width}x{height}.jpg
```

Replace placeholders with pixel values:

```javascript
const boxArtUrl = game.box_art_url
  .replace('{width}', '285')
  .replace('{height}', '380');
// Result: https://static-cdn.jtvnw.net/ttv-boxart/33214-285x380.jpg
```

Common box art sizes: `285x380`, `144x192`, `52x72`.

---

### Get Top Games

Gets the most popular games/categories on Twitch, ranked by current viewership.

```
GET https://api.twitch.tv/helix/games/top
```

#### Authentication

| Requirement | Value |
|-------------|-------|
| Auth Type | App Access Token or User Access Token |
| Required Scope | None |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `first` | Integer | No | Number of results per page. Maximum: 100. Default: 20. |
| `before` | String | No | Cursor for backward pagination. |
| `after` | String | No | Cursor for forward pagination. |

#### Response Body

```json
{
  "data": [
    {
      "id": "509658",
      "name": "Just Chatting",
      "box_art_url": "https://static-cdn.jtvnw.net/ttv-boxart/509658-{width}x{height}.jpg",
      "igdb_id": ""
    },
    {
      "id": "33214",
      "name": "Fortnite",
      "box_art_url": "https://static-cdn.jtvnw.net/ttv-boxart/33214-{width}x{height}.jpg",
      "igdb_id": "1905"
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7IkN1cnNvciI6..."
  }
}
```

The response format is identical to [Get Games](#get-games), with the addition of pagination.

#### cURL Example

```bash
# Get the top 50 games
curl -X GET 'https://api.twitch.tv/helix/games/top?first=50' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

```bash
# Paginate to the next page
curl -X GET 'https://api.twitch.tv/helix/games/top?first=20&after=eyJiIjpudWxsLCJh...' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

#### Twitch CLI Examples

```bash
# Get top games
twitch api get /games/top -q first=20

# Get next page
twitch api get /games/top -q first=20 -q after=CURSOR_VALUE
```

---

## Search Endpoints

### Search Categories

Searches for games/categories by name. This is a fuzzy search and will return partial matches.

```
GET https://api.twitch.tv/helix/search/categories
```

#### Authentication

| Requirement | Value |
|-------------|-------|
| Auth Type | App Access Token or User Access Token |
| Required Scope | None |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | String | Yes | The search query. URI-encode this value. |
| `first` | Integer | No | Number of results per page. Maximum: 100. Default: 20. |
| `after` | String | No | Cursor for forward pagination. |

#### Response Body

```json
{
  "data": [
    {
      "id": "33214",
      "name": "Fortnite",
      "box_art_url": "https://static-cdn.jtvnw.net/ttv-boxart/33214-{width}x{height}.jpg"
    },
    {
      "id": "516898",
      "name": "Fortnite Creative",
      "box_art_url": "https://static-cdn.jtvnw.net/ttv-boxart/516898-{width}x{height}.jpg"
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7IkN..."
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Game/category ID. |
| `name` | String | Name of the game/category. |
| `box_art_url` | String | Template URL for the box art image. |

#### cURL Examples

```bash
# Search for categories matching "fort"
curl -X GET 'https://api.twitch.tv/helix/search/categories?query=fort&first=10' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

```bash
# Search with special characters (URL-encoded)
curl -X GET 'https://api.twitch.tv/helix/search/categories?query=just%20chatting' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

#### Twitch CLI Examples

```bash
# Search categories
twitch api get /search/categories -q query=fortnite

# Search with pagination
twitch api get /search/categories -q query=fort -q first=5
```

---

### Search Channels

Searches for channels by query string. Returns channels that have streamed within the past 6 months. Results can optionally be filtered to only currently live channels.

```
GET https://api.twitch.tv/helix/search/channels
```

#### Authentication

| Requirement | Value |
|-------------|-------|
| Auth Type | App Access Token or User Access Token |
| Required Scope | None |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | String | Yes | The search query. URI-encode this value. |
| `live_only` | Boolean | No | If `true`, return only channels that are currently live. Default: `false`. |
| `first` | Integer | No | Number of results per page. Maximum: 100. Default: 20. |
| `after` | String | No | Cursor for forward pagination. |

#### Response Body

```json
{
  "data": [
    {
      "broadcaster_language": "en",
      "broadcaster_login": "twitchdev",
      "display_name": "TwitchDev",
      "game_id": "509670",
      "game_name": "Science & Technology",
      "id": "141981764",
      "is_live": true,
      "tag_ids": [],
      "tags": ["Developer", "API", "English"],
      "thumbnail_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/abcdef-profile_image-300x300.png",
      "title": "Building cool Twitch integrations",
      "started_at": "2025-10-15T14:00:00Z"
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7..."
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `broadcaster_language` | String | Language the broadcaster streams in (ISO 639-1). |
| `broadcaster_login` | String | Login name of the broadcaster. |
| `display_name` | String | Display name of the broadcaster. |
| `game_id` | String | ID of the game/category being played. Empty string if not set. |
| `game_name` | String | Name of the game/category being played. Empty string if not set. |
| `id` | String | Broadcaster's user ID. |
| `is_live` | Boolean | Whether the broadcaster is currently live. |
| `tag_ids` | Array | **Deprecated.** Always an empty array. Use `tags` instead. |
| `tags` | Array of Strings | Tags applied to the channel/stream. |
| `thumbnail_url` | String | URL of the broadcaster's profile image. |
| `title` | String | Current or most recent stream title. |
| `started_at` | String (RFC 3339) | When the current stream started. Empty string if not live. |

#### cURL Examples

```bash
# Search for channels
curl -X GET 'https://api.twitch.tv/helix/search/channels?query=twitchdev&first=10' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

```bash
# Search for only live channels
curl -X GET 'https://api.twitch.tv/helix/search/channels?query=fortnite&live_only=true&first=20' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

#### Twitch CLI Examples

```bash
# Search channels
twitch api get /search/channels -q query=twitchdev

# Search only live channels
twitch api get /search/channels -q query=fortnite -q live_only=true -q first=20
```

#### Important Notes

- Only channels that have streamed within the past 6 months are returned.
- The `tag_ids` field is deprecated and will always be an empty array. Use `tags` instead.
- When `is_live` is `false`, `game_id`, `game_name`, and `started_at` reflect the most recent stream.

---

## Ads Endpoints

These endpoints manage commercial breaks (ads) on Twitch. Only Partners and Affiliates who are currently live can run commercials.

> **Note:** These endpoints are also referenced in the Channels & Streams documentation. They are included here for completeness.

### Start Commercial

Starts a commercial break on the specified broadcaster's channel. The broadcaster must be live and must be a Partner or Affiliate.

```
POST https://api.twitch.tv/helix/channels/commercial
```

#### Authentication

| Requirement | Value |
|-------------|-------|
| Auth Type | User Access Token |
| Required Scope | `channel:edit:commercial` |

#### Request Body (JSON)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster_id` | String | Yes | ID of the broadcaster to run the commercial on. |
| `length` | Integer | Yes | Desired length of the commercial in seconds. Valid values: `30`, `60`, `90`, `120`, `150`, `180`. |

#### Response Body

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

| Field | Type | Description |
|-------|------|-------------|
| `length` | Integer | The actual length of the commercial that was started (may differ from requested). |
| `message` | String | Error message if the commercial could not start. Empty on success. |
| `retry_after` | Integer | Number of seconds until the next commercial can be run. |

#### cURL Example

```bash
# Start a 60-second commercial
curl -X POST 'https://api.twitch.tv/helix/channels/commercial' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{"broadcaster_id": "141981764", "length": 60}'
```

#### Twitch CLI Example

```bash
# Start a commercial
twitch api post /channels/commercial -b '{"broadcaster_id": "141981764", "length": 60}'
```

#### Important Notes

- Only Partners and Affiliates can run commercials.
- The broadcaster must be live.
- The `retry_after` field indicates the cooldown before another commercial can be started.
- The actual commercial length may differ from the requested length.

---

### Get Ad Schedule

Gets the ad schedule for the specified broadcaster, including information about the next scheduled ad break and pre-roll free time remaining.

```
GET https://api.twitch.tv/helix/channels/ads
```

#### Authentication

| Requirement | Value |
|-------------|-------|
| Auth Type | User Access Token |
| Required Scope | `channel:read:ads` |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster to get the ad schedule for. |

#### Response Body

```json
{
  "data": [
    {
      "next_ad_at": "2025-10-15T15:30:00Z",
      "last_ad_at": "2025-10-15T15:00:00Z",
      "duration": 60,
      "preroll_free_time": 3600,
      "snooze_count": 1,
      "snooze_refresh_at": "2025-10-15T16:00:00Z"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `next_ad_at` | String (RFC 3339) | When the next automatic ad is scheduled. Empty if none scheduled. |
| `last_ad_at` | String (RFC 3339) | When the last ad ran. Empty if no ads have run this stream. |
| `duration` | Integer | Length of the next scheduled ad break in seconds. |
| `preroll_free_time` | Integer | Seconds of pre-roll-free time remaining. |
| `snooze_count` | Integer | Number of snoozes remaining. |
| `snooze_refresh_at` | String (RFC 3339) | When the next snooze will become available. |

#### cURL Example

```bash
# Get ad schedule
curl -X GET 'https://api.twitch.tv/helix/channels/ads?broadcaster_id=141981764' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

#### Twitch CLI Example

```bash
twitch api get /channels/ads -q broadcaster_id=141981764
```

---

### Snooze Next Ad

Snoozes (delays) the next scheduled automatic mid-roll ad. Each broadcaster has a limited number of snoozes that refresh over time.

```
POST https://api.twitch.tv/helix/channels/ads/schedule/snooze
```

#### Authentication

| Requirement | Value |
|-------------|-------|
| Auth Type | User Access Token |
| Required Scope | `channel:manage:ads` |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose next ad to snooze. |

#### Response Body

```json
{
  "data": [
    {
      "snooze_count": 0,
      "snooze_refresh_at": "2025-10-15T16:00:00Z",
      "next_ad_at": "2025-10-15T15:35:00Z"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `snooze_count` | Integer | Number of snoozes remaining after this snooze. |
| `snooze_refresh_at` | String (RFC 3339) | When the next snooze will become available. |
| `next_ad_at` | String (RFC 3339) | Updated time for the next scheduled ad. |

#### Response Codes

| Code | Description |
|------|-------------|
| 200 | Ad snoozed successfully. |
| 400 | No snoozes available or no ad scheduled. |
| 401 | Missing or invalid token / insufficient scope. |

#### cURL Example

```bash
# Snooze the next ad
curl -X POST 'https://api.twitch.tv/helix/channels/ads/schedule/snooze?broadcaster_id=141981764' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

#### Twitch CLI Example

```bash
twitch api post /channels/ads/schedule/snooze -q broadcaster_id=141981764
```

---

## Related EventSub Types

These EventSub subscription types are related to the endpoints documented above.

### Clip Events

There are no dedicated EventSub types for clip creation. To monitor clips, poll the `GET /clips` endpoint periodically.

### Video Events

There are no dedicated EventSub types for video creation or deletion. Poll the `GET /videos` endpoint as needed.

### Ad / Commercial Events

| EventSub Type | Description | Scope |
|---------------|-------------|-------|
| `channel.ad_break.begin` | A midroll commercial break has started. Includes `duration_seconds`, `started_at`, `is_automatic`, `broadcaster_user_id`. | `channel:read:ads` |

**Example Subscription:**

```json
{
  "type": "channel.ad_break.begin",
  "version": "1",
  "condition": {
    "broadcaster_user_id": "141981764"
  },
  "transport": {
    "method": "websocket",
    "session_id": "AgoQHR3s6QIW..."
  }
}
```

**Event Payload:**

```json
{
  "duration_seconds": 60,
  "started_at": "2025-10-15T15:30:00Z",
  "is_automatic": true,
  "broadcaster_user_id": "141981764",
  "broadcaster_user_login": "twitchdev",
  "broadcaster_user_name": "TwitchDev",
  "requester_user_id": "141981764",
  "requester_user_login": "twitchdev",
  "requester_user_name": "TwitchDev"
  }
```

### Stream Events (Related)

| EventSub Type | Description | Scope |
|---------------|-------------|-------|
| `stream.online` | Stream goes online (relevant for clip creation). | None |
| `stream.offline` | Stream goes offline. | None |
| `channel.update` | Channel info updates, including game/category changes. | None |

---

## Best Practices

### Clips

1. **Poll after creation.** `POST /clips` returns a clip ID immediately but the clip may take several seconds to process. Poll `GET /clips` with the returned ID until the clip appears.
2. **Respect the async nature.** Do not attempt to embed or share a clip URL immediately after creation — it may not resolve until processing completes.
3. **Date range filtering.** When fetching clips by broadcaster or game, always use `started_at` and `ended_at` to narrow results. Without date filters, the API returns clips from all time, which may be slow.
4. **Featured clips.** Use `is_featured=true` to surface clips the broadcaster has highlighted on their channel page.

### Videos

1. **Thumbnail URL templates.** Remember that `thumbnail_url` contains placeholders (`%{width}` and `%{height}`). Always replace them before using the URL.
2. **Muted segments.** If you are building a video player or clip tool, account for `muted_segments`. These sections of the video have no audio due to DMCA protections.
3. **VOD retention.** Twitch has VOD retention limits (14 days for regular broadcasters, 60 days for Partners/Turbo). Plan your archiving accordingly.
4. **Bulk deletion.** The `DELETE /videos` endpoint accepts up to 5 video IDs at once. Batch your deletions if you need to remove many videos.

### Games / Categories

1. **Exact match for `name` parameter.** The `GET /games` endpoint requires exact name matches. Use `GET /search/categories` for fuzzy/partial matching.
2. **Box art template URL.** Like video thumbnails, `box_art_url` contains placeholders (`{width}` and `{height}`). Note the different syntax from video thumbnails.
3. **IGDB integration.** The `igdb_id` field enables cross-referencing with the IGDB database for richer game metadata.
4. **Non-game categories.** Remember that "games" include non-game categories like "Just Chatting", "Music", and "Art".

### Search

1. **URL-encode queries.** Always URI-encode the `query` parameter, especially for queries with spaces or special characters.
2. **6-month window.** Channel search only returns channels that have streamed within the past 6 months. Completely inactive channels will not appear.
3. **`live_only` for discovery.** Use `live_only=true` in channel search to build a live stream discovery feature.
4. **Deprecated `tag_ids`.** The `tag_ids` field in channel search results is deprecated and always empty. Use the `tags` array instead.

### Ads / Commercials

1. **Partner/Affiliate only.** Commercial endpoints only work for Twitch Partners and Affiliates.
2. **Must be live.** The broadcaster must have an active stream to start a commercial.
3. **Respect cooldowns.** The `retry_after` field in the Start Commercial response tells you the minimum wait before the next commercial. Do not attempt to run ads more frequently.
4. **Snooze management.** Snoozes are limited and refresh over time. Check `snooze_count` in the ad schedule before offering the snooze option to users.
5. **Pre-roll trade-off.** Running mid-roll commercials earns pre-roll-free time for new viewers. Monitor `preroll_free_time` to help broadcasters optimize ad timing.

### General

1. **Rate limits.** All Helix endpoints share the same rate limit pool. Monitor `Ratelimit-Remaining` and `Ratelimit-Reset` headers.
2. **Pagination.** Use cursor-based pagination for all list endpoints. Do not assume the total number of results.
3. **Error handling.** Always handle `401` (expired token), `429` (rate limit), and `503` (service unavailable) responses with appropriate retry logic.
4. **Caching.** Games/categories data changes infrequently — cache `GET /games` and `GET /games/top` responses for at least a few minutes.

---

## Known Issues

1. **Clip creation timing.** Newly created clips may take up to 15 seconds to become available via `GET /clips`. In rare cases during high-traffic events, this delay can be longer.

2. **Clip `vod_offset` null values.** If the original VOD has been deleted or the broadcaster does not save VODs, `vod_offset` will be `null` even though `video_id` may still contain a value.

3. **Video view counts.** View counts (`view_count`) are not updated in real-time. They may lag behind actual views by several minutes or more.

4. **Thumbnail URL for new videos.** For very recently created videos, the thumbnail URL may temporarily return a 404 until thumbnail generation completes.

5. **Search results ordering.** Search results are ordered by relevance, but the exact ranking algorithm is not documented and may change without notice.

6. **`tag_ids` deprecation.** The `tag_ids` field in search channel results is deprecated but still present in the response schema. It always returns an empty array. Use `tags` instead.

7. **Commercial length mismatch.** The actual commercial length may differ from the requested length. Always check the `length` field in the response rather than assuming the requested value was used.

8. **Ad schedule while offline.** The `GET /channels/ads` endpoint may return stale data or empty fields when the broadcaster is not currently live.

9. **Games `name` parameter case sensitivity.** The `name` parameter in `GET /games` is case-insensitive for matching but returns the canonical casing in the response. However, some edge cases with special characters may behave unexpectedly.

10. **Search pagination limits.** While `first` accepts up to 100, search endpoints may return fewer results than requested even when more matching results exist. Continue paginating until the `cursor` is absent from the response.
