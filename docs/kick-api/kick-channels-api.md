# Kick Channels API

> **Source:** https://docs.kick.com/apis/channels
> **GitHub Raw:** https://github.com/KickEngineering/KickDevDocs/blob/main/apis/channels.md
> **Last verified:** 2026-02-13
> **API Base URL:** `https://api.kick.com/public/v1`

## Overview

The Channels API allows applications to interact with channels on the Kick platform. Available data depends on the scopes attached to the authorization token. You can retrieve channel information (including stream metadata) and update channel settings.

---

## Authentication

| Endpoint | Token Type | Required Scope |
|----------|-----------|----------------|
| `GET /public/v1/channels` | App Access Token or User Access Token | `channel:read` (for User Token) |
| `PATCH /public/v1/channels` | User Access Token | `channel:write` |

> **Note:** App Access Tokens may be able to access basic public channel data without specific scopes. [VERIFY exact behavior]

---

## Endpoints

### GET /public/v1/channels

Retrieve channel information for one or more channels. Supports lookup by user ID or channel slug.

#### HTTP Request

```
GET https://api.kick.com/public/v1/channels
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <access_token>` |

#### Query Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `broadcaster_user_id` | No* | integer[] | One or more broadcaster user IDs. Repeat for multiple: `?broadcaster_user_id=123&broadcaster_user_id=456` |
| `slug` | No* | string[] | One or more channel slugs. Repeat for multiple: `?slug=channel1&slug=channel2` |

> *At least one of `broadcaster_user_id` or `slug` must be provided.

**Batch size warning:** See [GitHub Issue #321](https://github.com/KickEngineering/KickDevDocs/issues/321) -- batches of 50 slugs may return corrupted data for ~50% of results. **Recommended: use batch sizes of 25 or fewer.**

#### Example Request: By User ID

```bash
curl -X GET "https://api.kick.com/public/v1/channels?broadcaster_user_id=123456789" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

#### Example Request: By Slug (Multiple)

```bash
curl -X GET "https://api.kick.com/public/v1/channels?slug=channel1&slug=channel2" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

#### Response (200 OK)

```json
{
  "data": [
    {
      "broadcaster_user_id": 123456789,
      "slug": "example_channel",
      "channel_description": "Welcome to my channel!",
      "banner_picture": "https://example.com/banner.jpg",
      "stream": {
        "stream_title": "Playing Fortnite!",
        "language": "en",
        "has_mature_content": false,
        "viewer_count": 1500,
        "tags": ["gaming", "fps"],
        "custom_tags": ["fortnite", "competitive"],
        "thumbnail": "https://example.com/thumb.jpg",
        "category": {
          "id": 123,
          "name": "Fortnite",
          "thumbnail": "https://example.com/category.jpg"
        },
        "is_live": true,
        "started_at": "2025-01-14T16:08:06Z"
      },
      "profile_picture": "https://example.com/avatar.jpg",
      "active_subscribers_count": 150,
      "follower_count": 50000,
      "verified": true
    }
  ],
  "message": "OK"
}
```

#### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | Array of channel objects |
| `data[].broadcaster_user_id` | number | The broadcaster's user ID |
| `data[].slug` | string | Channel URL slug |
| `data[].channel_description` | string | Channel description/bio |
| `data[].banner_picture` | string | URL to channel banner image |
| `data[].profile_picture` | string | URL to broadcaster's profile picture |
| `data[].active_subscribers_count` | number | Current number of active subscribers |
| `data[].follower_count` | number | Total number of followers [VERIFY field name] |
| `data[].verified` | boolean | Whether the channel is verified [VERIFY field name] |
| `data[].stream` | object \| null | Current stream information (null if not live) [VERIFY null behavior] |
| `message` | string | Status message |

#### Stream Sub-Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `stream_title` | string | Current stream title |
| `language` | string | Stream language code (e.g., `"en"`) |
| `has_mature_content` | boolean | Whether the stream is marked as mature |
| `viewer_count` | number | Current viewer count |
| `tags` | string[] | Array of stream tags |
| `custom_tags` | string[] | Array of custom user-defined tags |
| `thumbnail` | string | URL to stream thumbnail |
| `category` | object | Stream category |
| `category.id` | number | Category ID |
| `category.name` | string | Category name |
| `category.thumbnail` | string | URL to category thumbnail |
| `is_live` | boolean | Whether the channel is currently live |
| `started_at` | string (ISO 8601) | When the stream started |

#### Error Responses

| Status Code | Description |
|-------------|-------------|
| `400` | Bad Request -- no broadcaster_user_id or slug provided |
| `401` | Unauthorized -- invalid or expired token |
| `403` | Forbidden -- token lacks required scope |

> **Note:** The endpoint returns `200 OK` with empty `data` array for non-existent channels instead of `404` (see [GitHub Issue #231](https://github.com/KickEngineering/KickDevDocs/issues/231)).

---

### PATCH /public/v1/channels

Update channel/stream metadata for the authenticated user's channel.

#### HTTP Request

```
PATCH https://api.kick.com/public/v1/channels
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <user_access_token>` |
| `Content-Type` | Yes | string | `application/json` |

#### Request Body

All fields are optional; only provide fields you want to update.

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `stream_title` | No | string | New stream title |
| `language` | No | string | Stream language code |
| `has_mature_content` | No | boolean | Mark stream as mature |
| `category_id` | No | integer | Category ID to set |
| `tags` | No | string[] | Array of stream tags |
| `custom_tags` | No | string[] | Array of custom tags |

#### Example Request

```bash
curl -X PATCH https://api.kick.com/public/v1/channels \
  -H "Authorization: Bearer ${USER_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "stream_title": "New Stream Title!",
    "category_id": 456,
    "custom_tags": ["competitive", "ranked"]
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
| `400` | Bad Request -- invalid field values |
| `401` | Unauthorized -- invalid or expired token |
| `403` | Forbidden -- token lacks `channel:write` scope |

---

## Related: Livestreams API

For dedicated livestream endpoints, see the Livestreams API which provides:

- `GET /public/v1/livestreams` -- Get livestream information
- `GET /public/v1/livestreams/stats` -- Get livestream statistics

These endpoints may provide additional stream data not available in the Channels response.

---

## TypeScript Example

```typescript
const BASE_URL = 'https://api.kick.com/public/v1';

interface Channel {
  broadcaster_user_id: number;
  slug: string;
  channel_description: string;
  banner_picture: string;
  profile_picture: string;
  active_subscribers_count: number;
  follower_count: number;
  verified: boolean;
  stream: {
    stream_title: string;
    language: string;
    has_mature_content: boolean;
    viewer_count: number;
    tags: string[];
    custom_tags: string[];
    thumbnail: string;
    category: {
      id: number;
      name: string;
      thumbnail: string;
    };
    is_live: boolean;
    started_at: string;
  } | null;
}

async function getChannelBySlug(
  accessToken: string,
  slug: string,
): Promise<Channel | null> {
  const response = await fetch(
    `${BASE_URL}/channels?slug=${encodeURIComponent(slug)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw new Error(`Failed to get channel: ${response.status}`);
  }

  const body = await response.json();
  return body.data[0] ?? null;
}

async function getChannelsByIds(
  accessToken: string,
  userIds: number[],
): Promise<Channel[]> {
  // Batch in groups of 25 to avoid corruption bug (#321)
  const results: Channel[] = [];
  for (let i = 0; i < userIds.length; i += 25) {
    const batch = userIds.slice(i, i + 25);
    const params = batch.map((id) => `broadcaster_user_id=${id}`).join('&');
    const response = await fetch(`${BASE_URL}/channels?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Failed to get channels: ${response.status}`);
    }
    const body = await response.json();
    results.push(...body.data);
  }
  return results;
}

async function updateStreamInfo(
  userToken: string,
  updates: {
    stream_title?: string;
    category_id?: number;
    custom_tags?: string[];
  },
): Promise<void> {
  const response = await fetch(`${BASE_URL}/channels`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update channel: ${response.status}`);
  }
}

// Usage
const token = process.env.KICK_ACCESS_TOKEN!;
const channel = await getChannelBySlug(token, 'example_channel');
if (channel?.stream?.is_live) {
  console.log(`${channel.slug} is live: ${channel.stream.stream_title}`);
  console.log(`Viewers: ${channel.stream.viewer_count}`);
}
```

## Python Example

```python
import os
import requests

BASE_URL = "https://api.kick.com/public/v1"

def get_channel_by_slug(access_token: str, slug: str) -> dict | None:
    response = requests.get(
        f"{BASE_URL}/channels",
        headers={"Authorization": f"Bearer {access_token}"},
        params={"slug": slug},
    )
    response.raise_for_status()
    data = response.json()["data"]
    return data[0] if data else None

def get_channels_by_ids(access_token: str, user_ids: list[int]) -> list[dict]:
    """Fetch channels in batches of 25 to avoid data corruption."""
    results = []
    for i in range(0, len(user_ids), 25):
        batch = user_ids[i:i + 25]
        response = requests.get(
            f"{BASE_URL}/channels",
            headers={"Authorization": f"Bearer {access_token}"},
            params=[("broadcaster_user_id", uid) for uid in batch],
        )
        response.raise_for_status()
        results.extend(response.json()["data"])
    return results

def update_stream_info(user_token: str, **kwargs) -> None:
    response = requests.patch(
        f"{BASE_URL}/channels",
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json",
        },
        json=kwargs,
    )
    response.raise_for_status()

# Usage
token = os.environ["KICK_ACCESS_TOKEN"]
channel = get_channel_by_slug(token, "example_channel")
if channel and channel.get("stream", {}).get("is_live"):
    print(f"{channel['slug']} is live: {channel['stream']['stream_title']}")
    print(f"Viewers: {channel['stream']['viewer_count']}")
```

---

## Best Practices & Production Hardening

### Batch Size Limit

- **Use batch sizes of 25 or fewer** when querying multiple channels by slug.
- Larger batches (e.g., 50) may return corrupted data (see Issue #321).

### Non-Existent Channel Handling

- The endpoint returns `200 OK` with an empty `data` array for non-existent channels.
- Do NOT rely on 404 status codes to detect missing channels.

### Cache Channel Data

- Channel metadata (description, banner, etc.) changes infrequently. Cache for 5-15 minutes.
- Stream data (viewer count, title) changes frequently. Cache for 30-60 seconds max.
- Use `livestream.status.updated` and `livestream.metadata.updated` webhook events to invalidate cache.

### Custom Tags

- Custom tags may fail to update via PATCH (see [Issue #224](https://github.com/KickEngineering/KickDevDocs/issues/224), now fixed as of 19/12/2025).

### Subscriber Count Accuracy

- `active_subscribers_count` may not include gifted subscriptions (see [Issue #337](https://github.com/KickEngineering/KickDevDocs/issues/337)).

### Token Refresh Lifecycle

- Access tokens expire. Implement automatic refresh.
- App Access Tokens are sufficient for reading public channel data.

### Secure Secret Storage

- Store access tokens in environment variables.

### Logging Recommendations

- Log channel slug/ID lookups and response status.
- Never log access tokens.

---

## Known Issues & Community Notes

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#321](https://github.com/KickEngineering/KickDevDocs/issues/321) | `/channels` returns bad data for large batch size | Open | Batch of 50 slugs corrupts ~50% of results; use 25 max |
| [#337](https://github.com/KickEngineering/KickDevDocs/issues/337) | `active_subscribers_count` excludes gifted subs | Open | Count may be inaccurate; requests for combined total |
| [#231](https://github.com/KickEngineering/KickDevDocs/issues/231) | Non-existent channel returns 200 instead of 404 | Closed | Returns empty data array; expected behavior |
| [#224](https://github.com/KickEngineering/KickDevDocs/issues/224) | Custom tags fail to update via PATCH | Closed | Fixed as of 19/12/2025 |
| [#122](https://github.com/KickEngineering/KickDevDocs/issues/122) | Channel info missing follower/subscriber count | Open | Feature request to add these fields |
| [#108](https://github.com/KickEngineering/KickDevDocs/issues/108) | Channel endpoint uses UserID not ChannelID | Closed | By design; use `broadcaster_user_id` parameter |
| [#105](https://github.com/KickEngineering/KickDevDocs/issues/105) | Tags not in channel response | Closed | Tags now included in stream sub-object |
| [#116](https://github.com/KickEngineering/KickDevDocs/issues/116) | Inconsistent category field names | Closed | Livestreams uses `image_url`, channels uses `thumbnail` |
| [#313](https://github.com/KickEngineering/KickDevDocs/discussions/313) | Return title/category/tags when not live | Discussion | Stream metadata unavailable when channel is offline |
| [#225](https://github.com/KickEngineering/KickDevDocs/issues/225) | 403 errors with valid tokens | Closed | Intermittent security policy blocks |
| Changelog 19/12/2025 | Custom tags fix, livestream profile pictures | Released | PATCH custom_tags and profile_picture in livestreams |

---

## Quick Reference Table

| Method | Path | Auth | Scope | Description |
|--------|------|------|-------|-------------|
| `GET` | `/public/v1/channels` | App or User Token | `channel:read` | Get channel information |
| `PATCH` | `/public/v1/channels` | User Token | `channel:write` | Update stream metadata |
