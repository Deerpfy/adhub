# Twitch API — Bits, Extensions, Analytics, Entitlements & Content Classification Labels

> **Source:** https://dev.twitch.tv/docs/api/reference/
> **Last verified:** 2025-05-01
> **API Base URL:** `https://api.twitch.tv/helix`
> **Endpoints covered:** 20 (Bits: 2, Analytics: 2, Extensions: 13, Entitlements: 2, Content Classification Labels: 1)

## Overview

This document covers five related Twitch API resource groups:

- **Bits** -- Cheering and leaderboards. Bits are Twitch's virtual currency that viewers use to "cheer" in chat. The API exposes leaderboards and cheermote metadata.
- **Analytics** -- Downloadable CSV reports for extensions and games. Available only to the extension owner or the game's developer organization.
- **Extensions** -- The full lifecycle of Twitch Extensions: configuration, transactions, secrets, PubSub messaging, chat messaging, and Bits-in-Extensions products.
- **Entitlements** -- Drops entitlements management for claiming and fulfilling rewards granted through the Twitch Drops system.
- **Content Classification Labels** -- Retrieving the set of content classification labels (CCLs) that broadcasters can apply to their streams.

---

## Bits Endpoints

### GET /bits/leaderboard — Get Bits Leaderboard

Returns a ranked list of Bits leaderboard data for the authenticated broadcaster. The leaderboard shows which users have cheered the most Bits in the broadcaster's channel.

**URL:** `GET https://api.twitch.tv/helix/bits/leaderboard`

**Authentication:** User Access Token
**Required Scope:** `bits:read`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `count` | integer | No | Maximum number of results to return. Max 100, default 10. |
| `period` | string | No | Time period for the leaderboard. Values: `day`, `week`, `month`, `year`, `all`. Default: `all`. |
| `started_at` | string (RFC 3339) | No | Start date for the leaderboard period. If `period` is `all`, this is ignored. The start date is adjusted based on the period (e.g., for `week`, it snaps to the Monday of that week). |
| `user_id` | string | No | Filter to a specific user. Returns only that user's rank and score. |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | List of leaderboard entries. |
| `data[].user_id` | string | The user's ID. |
| `data[].user_login` | string | The user's login name. |
| `data[].user_name` | string | The user's display name. |
| `data[].rank` | integer | The user's position on the leaderboard. |
| `data[].score` | integer | Total number of Bits cheered in the period. |
| `date_range` | object | The date range for the leaderboard. |
| `date_range.started_at` | string (RFC 3339) | Start of the date range. |
| `date_range.ended_at` | string (RFC 3339) | End of the date range. |
| `total` | integer | Total number of entries in the full leaderboard. |

**cURL Example:**

```bash
# Get top 5 Bits cheerers this month
curl -X GET 'https://api.twitch.tv/helix/bits/leaderboard?count=5&period=month' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "user_id": "158010205",
      "user_login": "tundracowboy",
      "user_name": "TundraCowboy",
      "rank": 1,
      "score": 12543
    },
    {
      "user_id": "7168163",
      "user_login": "topchatter",
      "user_name": "TopChatter",
      "rank": 2,
      "score": 6900
    }
  ],
  "date_range": {
    "started_at": "2025-04-01T00:00:00Z",
    "ended_at": "2025-04-30T23:59:59Z"
  },
  "total": 87
}
```

```bash
# Get a specific user's rank for the year
curl -X GET 'https://api.twitch.tv/helix/bits/leaderboard?user_id=158010205&period=year' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### GET /bits/cheermotes — Get Cheermotes

Retrieves the list of available cheermotes (animated emote images used in Bits cheering). You can retrieve global cheermotes or channel-specific custom cheermotes.

**URL:** `GET https://api.twitch.tv/helix/bits/cheermotes`

**Authentication:** App Access Token or User Access Token
**Required Scope:** None

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | string | No | The broadcaster whose custom cheermotes to include. If omitted, only global cheermotes are returned. |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | List of cheermotes. |
| `data[].prefix` | string | The cheermote prefix (e.g., `Cheer`, `BibleThump`). |
| `data[].tiers` | array | Available Bits tiers for this cheermote. |
| `data[].tiers[].min_bits` | integer | Minimum Bits to use this tier. |
| `data[].tiers[].id` | string | Tier ID (e.g., `"1"`, `"100"`, `"1000"`). |
| `data[].tiers[].color` | string | Hex color associated with this tier. |
| `data[].tiers[].images` | object | Image URLs organized by `dark`/`light` theme, then `animated`/`static`, then size (`"1"`, `"1.5"`, `"2"`, `"3"`, `"4"`). |
| `data[].tiers[].can_cheer` | boolean | Whether the user can use this cheermote tier. |
| `data[].tiers[].show_in_bits_card` | boolean | Whether this tier appears in the Bits card UI. |
| `data[].type` | string | Type of cheermote: `global_first_party`, `global_third_party`, `channel_custom`, `display_only`, or `sponsored`. |
| `data[].order` | integer | Display order relative to other cheermotes. |
| `data[].last_updated` | string (RFC 3339) | When this cheermote was last updated. |
| `data[].is_charitable` | boolean | Whether cheering with this cheermote contributes to a charity campaign. |

**cURL Example:**

```bash
# Get global cheermotes
curl -X GET 'https://api.twitch.tv/helix/bits/cheermotes' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Get global + channel-specific cheermotes
curl -X GET 'https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=41245072' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example (truncated):**

```json
{
  "data": [
    {
      "prefix": "Cheer",
      "tiers": [
        {
          "min_bits": 1,
          "id": "1",
          "color": "#979797",
          "images": {
            "dark": {
              "animated": {
                "1": "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/1/1.gif",
                "1.5": "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/1/1.5.gif",
                "2": "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/1/2.gif",
                "3": "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/1/3.gif",
                "4": "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/1/4.gif"
              },
              "static": {
                "1": "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/static/1/1.png",
                "1.5": "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/static/1/1.5.png",
                "2": "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/static/1/2.png",
                "3": "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/static/1/3.png",
                "4": "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/static/1/4.png"
              }
            },
            "light": {
              "animated": { "1": "...", "1.5": "...", "2": "...", "3": "...", "4": "..." },
              "static": { "1": "...", "1.5": "...", "2": "...", "3": "...", "4": "..." }
            }
          },
          "can_cheer": true,
          "show_in_bits_card": true
        },
        {
          "min_bits": 100,
          "id": "100",
          "color": "#9c3ee8",
          "images": { "...": "..." },
          "can_cheer": true,
          "show_in_bits_card": true
        }
      ],
      "type": "global_first_party",
      "order": 1,
      "last_updated": "2018-05-22T00:00:00Z",
      "is_charitable": false
    }
  ]
}
```

---

## Analytics Endpoints

### GET /analytics/extensions — Get Extension Analytics

Returns a URL to a downloadable CSV file containing analytics data for the specified extension. The URL is valid for 5 minutes. If no `extension_id` is specified, the response includes analytics for all extensions owned by the authenticated user.

**URL:** `GET https://api.twitch.tv/helix/analytics/extensions`

**Authentication:** User Access Token
**Required Scope:** `analytics:read:extensions`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `extension_id` | string | No | The extension's client ID. If omitted, returns analytics for all owned extensions. |
| `type` | string | No | The type of analytics report. Currently only `overview_v2`. |
| `started_at` | string (RFC 3339) | No | Start of the date range. If specified, `ended_at` is also required. |
| `ended_at` | string (RFC 3339) | No | End of the date range. If specified, `started_at` is also required. |
| `first` | integer | No | Maximum number of results per page. Max 100, default 20. |
| `after` | string | No | Cursor for forward pagination. |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | List of analytics reports. |
| `data[].extension_id` | string | The extension's client ID. |
| `data[].URL` | string | URL to download the CSV report (valid for 5 minutes). |
| `data[].type` | string | The report type (e.g., `overview_v2`). |
| `data[].date_range` | object | The date range covered by the report. |
| `data[].date_range.started_at` | string (RFC 3339) | Start of the date range. |
| `data[].date_range.ended_at` | string (RFC 3339) | End of the date range. |
| `pagination` | object | Pagination cursor. |
| `pagination.cursor` | string | Cursor for the next page. |

**cURL Example:**

```bash
# Get analytics for a specific extension
curl -X GET 'https://api.twitch.tv/helix/analytics/extensions?extension_id=abcd1234efgh5678&started_at=2025-01-01T00:00:00Z&ended_at=2025-01-31T23:59:59Z' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "extension_id": "abcd1234efgh5678",
      "URL": "https://twitch-piper-reports.s3-us-west-2.amazonaws.com/extension_analytics/...",
      "type": "overview_v2",
      "date_range": {
        "started_at": "2025-01-01T00:00:00Z",
        "ended_at": "2025-01-31T00:00:00Z"
      }
    }
  ],
  "pagination": {}
}
```

---

### GET /analytics/games — Get Game Analytics

Returns a URL to a downloadable CSV file containing analytics data for the specified game. The URL is valid for 5 minutes. If no `game_id` is specified, the response includes analytics for all games owned by the authenticated user's developer organization.

**URL:** `GET https://api.twitch.tv/helix/analytics/games`

**Authentication:** User Access Token
**Required Scope:** `analytics:read:games`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `game_id` | string | No | The game's ID. If omitted, returns analytics for all owned games. |
| `type` | string | No | The type of analytics report. Currently only `overview_v2`. |
| `started_at` | string (RFC 3339) | No | Start of the date range. If specified, `ended_at` is also required. |
| `ended_at` | string (RFC 3339) | No | End of the date range. If specified, `started_at` is also required. |
| `first` | integer | No | Maximum number of results per page. Max 100, default 20. |
| `after` | string | No | Cursor for forward pagination. |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | List of analytics reports. |
| `data[].game_id` | string | The game's ID. |
| `data[].URL` | string | URL to download the CSV report (valid for 5 minutes). |
| `data[].type` | string | The report type (e.g., `overview_v2`). |
| `data[].date_range` | object | The date range covered by the report. |
| `data[].date_range.started_at` | string (RFC 3339) | Start of the date range. |
| `data[].date_range.ended_at` | string (RFC 3339) | End of the date range. |
| `pagination` | object | Pagination cursor. |
| `pagination.cursor` | string | Cursor for the next page. |

**cURL Example:**

```bash
# Get analytics for a specific game
curl -X GET 'https://api.twitch.tv/helix/analytics/games?game_id=493057&started_at=2025-01-01T00:00:00Z&ended_at=2025-01-31T23:59:59Z' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Get analytics for all owned games (paginated)
curl -X GET 'https://api.twitch.tv/helix/analytics/games?first=50' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "game_id": "493057",
      "URL": "https://twitch-piper-reports.s3-us-west-2.amazonaws.com/games/...",
      "type": "overview_v2",
      "date_range": {
        "started_at": "2025-01-01T00:00:00Z",
        "ended_at": "2025-01-31T00:00:00Z"
      }
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7IkN1cnNvciI6..."
  }
}
```

---

## Extensions API Endpoints

### Authentication Note: JWT Tokens for Extensions

Several Extensions endpoints require a **JSON Web Token (JWT)** signed with the extension's secret rather than a standard OAuth token. The JWT must include:

- `exp` -- Expiration time (Unix timestamp). Must not be more than ~30 minutes in the future.
- `user_id` -- The Twitch user ID of the extension owner.
- `role` -- Must be `"external"`.

```javascript
// Example JWT payload
{
  "exp": 1699999999,
  "user_id": "12345678",
  "role": "external"
}
```

The JWT is signed using the extension secret (base64-decoded) with the HS256 algorithm. Include it in the `Authorization` header as `Bearer <JWT>`.

---

### GET /extensions/transactions — Get Extension Transactions

Returns a list of Bits transactions for the specified extension. Only the extension owner (matched by `client_id` in the app access token) can query transactions.

**URL:** `GET https://api.twitch.tv/helix/extensions/transactions`

**Authentication:** App Access Token
**Required Scope:** None (but the extension must be owned by the `client_id` associated with the token)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `extension_id` | string | Yes | The extension's client ID. |
| `id` | string | No | One or more transaction IDs to filter by (up to 100). Repeat the parameter for multiple IDs. |
| `first` | integer | No | Maximum number of results per page. Max 100, default 20. |
| `after` | string | No | Cursor for forward pagination. |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | List of transactions. |
| `data[].id` | string | Unique transaction ID. |
| `data[].timestamp` | string (RFC 3339) | When the transaction occurred. |
| `data[].broadcaster_id` | string | The broadcaster's user ID. |
| `data[].broadcaster_login` | string | The broadcaster's login name. |
| `data[].broadcaster_name` | string | The broadcaster's display name. |
| `data[].user_id` | string | The user who made the purchase. |
| `data[].user_login` | string | The purchaser's login name. |
| `data[].user_name` | string | The purchaser's display name. |
| `data[].product_type` | string | The product type. Currently only `BITS_IN_EXTENSIONS`. |
| `data[].product_data` | object | Details about the purchased product. |
| `data[].product_data.domain` | string | The domain of the product (always `"twitch.ext.<extension_id>"`). |
| `data[].product_data.sku` | string | The product SKU. |
| `data[].product_data.cost` | object | Cost information. |
| `data[].product_data.cost.amount` | integer | The Bits cost. |
| `data[].product_data.cost.type` | string | The currency type (always `"bits"`). |
| `data[].product_data.inDevelopment` | boolean | Whether the product is in development mode. |
| `data[].product_data.displayName` | string | The display name of the product. |
| `data[].product_data.expiration` | string | Expiration date of the product (empty if no expiration). |
| `data[].product_data.broadcast` | boolean | Whether the transaction was broadcast to all instances of the extension. |
| `pagination` | object | Pagination cursor. |

**cURL Example:**

```bash
# Get all transactions for an extension
curl -X GET 'https://api.twitch.tv/helix/extensions/transactions?extension_id=abcd1234efgh5678&first=50' \
  -H 'Authorization: Bearer APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Get specific transactions by ID
curl -X GET 'https://api.twitch.tv/helix/extensions/transactions?extension_id=abcd1234efgh5678&id=74c52265-e214-48a6-8a5c-example1&id=8205dd2e-fa37-4a42-b5c3-example2' \
  -H 'Authorization: Bearer APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "id": "74c52265-e214-48a6-8a5c-example1",
      "timestamp": "2025-03-15T14:23:05Z",
      "broadcaster_id": "41245072",
      "broadcaster_login": "examplebroadcaster",
      "broadcaster_name": "ExampleBroadcaster",
      "user_id": "158010205",
      "user_login": "coolviewer",
      "user_name": "CoolViewer",
      "product_type": "BITS_IN_EXTENSIONS",
      "product_data": {
        "domain": "twitch.ext.abcd1234efgh5678",
        "sku": "power_up_500",
        "cost": {
          "amount": 500,
          "type": "bits"
        },
        "inDevelopment": false,
        "displayName": "Super Power Up",
        "expiration": "",
        "broadcast": true
      }
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7IkN1cnNvciI6..."
  }
}
```

---

### GET /extensions — Get Extensions

Returns information about the specified extension. Can retrieve a specific version or the latest version if `extension_version` is omitted.

**URL:** `GET https://api.twitch.tv/helix/extensions`

**Authentication:** JWT (signed by extension secret)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `extension_id` | string | Yes | The extension's client ID. |
| `extension_version` | string | No | A specific version to retrieve. If omitted, all versions are returned. |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/extensions?extension_id=abcd1234efgh5678&extension_version=1.0.0' \
  -H 'Authorization: Bearer EXTENSION_JWT' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### GET /extensions/released — Get Released Extensions

Returns information about a released extension. Unlike `GET /extensions`, this does not require JWT authentication and only returns the released (public) version.

**URL:** `GET https://api.twitch.tv/helix/extensions/released`

**Authentication:** App Access Token or User Access Token
**Required Scope:** None

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `extension_id` | string | Yes | The extension's client ID. |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/extensions/released?extension_id=abcd1234efgh5678' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### GET /extensions/configurations — Get Extension Configuration Segment

Returns configuration information for a specified extension segment. Configuration segments are scoped storage areas for extension settings.

**URL:** `GET https://api.twitch.tv/helix/extensions/configurations`

**Authentication:** JWT (signed by extension secret)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `extension_id` | string | Yes | The extension's client ID. |
| `segment` | string | Yes | The configuration segment. Values: `broadcaster`, `developer`, `global`. |
| `broadcaster_id` | string | Conditional | Required if `segment` is `broadcaster`. The broadcaster's user ID. |

**Segment Types:**

| Segment | Scope | Max Size | Description |
|---------|-------|----------|-------------|
| `broadcaster` | Per channel | 5 KB | Settings specific to a single channel. |
| `developer` | Per extension | 5 KB | Internal settings for the extension developer (not visible to broadcasters). |
| `global` | Per extension | 5 KB | Settings that apply across all channels. |

**cURL Example:**

```bash
# Get broadcaster-specific configuration
curl -X GET 'https://api.twitch.tv/helix/extensions/configurations?extension_id=abcd1234efgh5678&segment=broadcaster&broadcaster_id=41245072' \
  -H 'Authorization: Bearer EXTENSION_JWT' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Get global configuration
curl -X GET 'https://api.twitch.tv/helix/extensions/configurations?extension_id=abcd1234efgh5678&segment=global' \
  -H 'Authorization: Bearer EXTENSION_JWT' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### PUT /extensions/configurations — Set Extension Configuration Segment

Sets the configuration for a specified extension segment.

**URL:** `PUT https://api.twitch.tv/helix/extensions/configurations`

**Authentication:** JWT (signed by extension secret)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `extension_id` | string | Yes | The extension's client ID. |
| `segment` | string | Yes | The configuration segment. Values: `broadcaster`, `developer`, `global`. |
| `broadcaster_id` | string | Conditional | Required if `segment` is `broadcaster`. |
| `content` | string | No | The configuration content. Max 5 KB. |
| `version` | string | No | An arbitrary version string for configuration versioning. |

**cURL Example:**

```bash
curl -X PUT 'https://api.twitch.tv/helix/extensions/configurations' \
  -H 'Authorization: Bearer EXTENSION_JWT' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "extension_id": "abcd1234efgh5678",
    "segment": "broadcaster",
    "broadcaster_id": "41245072",
    "content": "{\"theme\":\"dark\",\"volume\":80}",
    "version": "1.2"
  }'
```

Returns `204 No Content` on success.

---

### PUT /extensions/required_configuration — Set Extension Required Configuration

Sets the required configuration version string for a released extension. This forces broadcasters to configure the extension before it can be activated.

**URL:** `PUT https://api.twitch.tv/helix/extensions/required_configuration`

**Authentication:** JWT (signed by extension secret)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | string | Yes | The broadcaster's user ID. |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `extension_id` | string | Yes | The extension's client ID. |
| `extension_version` | string | Yes | The version of the extension. |
| `required_configuration` | string | Yes | The required configuration version string. |

**cURL Example:**

```bash
curl -X PUT 'https://api.twitch.tv/helix/extensions/required_configuration?broadcaster_id=41245072' \
  -H 'Authorization: Bearer EXTENSION_JWT' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "extension_id": "abcd1234efgh5678",
    "extension_version": "1.0.0",
    "required_configuration": "1.2"
  }'
```

Returns `204 No Content` on success.

---

### POST /extensions/chat — Send Extension Chat Message

Sends a chat message to the specified broadcaster's chat room on behalf of the extension.

**URL:** `POST https://api.twitch.tv/helix/extensions/chat`

**Authentication:** JWT (signed by extension secret)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | The chat message text. Max 280 characters. |
| `extension_id` | string | Yes | The extension's client ID. |
| `extension_version` | string | Yes | The version of the extension. |

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/extensions/chat' \
  -H 'Authorization: Bearer EXTENSION_JWT' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "The poll has ended! Winner: Option A with 52% of votes.",
    "extension_id": "abcd1234efgh5678",
    "extension_version": "1.0.0"
  }'
```

Returns `204 No Content` on success.

---

### GET /extensions/live — Get Extensions Live

Returns a list of channels that have a specified extension installed and active (currently live).

**URL:** `GET https://api.twitch.tv/helix/extensions/live`

**Authentication:** App Access Token or User Access Token
**Required Scope:** None

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `extension_id` | string | Yes | The extension's client ID. |
| `first` | integer | No | Maximum number of results per page. Max 100, default 20. |
| `after` | string | No | Cursor for forward pagination. |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/extensions/live?extension_id=abcd1234efgh5678&first=50' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### POST /extensions/jwt/secrets — Create Extension Secret

Creates a new secret for signing JWTs for the extension. The new secret becomes active after a delay (typically 5 minutes) to allow rolling updates.

**URL:** `POST https://api.twitch.tv/helix/extensions/jwt/secrets`

**Authentication:** JWT (signed by current extension secret)

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | Secret information. |
| `data[].format_version` | integer | The format version of the secret structure. |
| `data[].secrets` | array | List of secrets (current and upcoming). |
| `data[].secrets[].content` | string | The base64-encoded secret. |
| `data[].secrets[].active_at` | string (RFC 3339) | When this secret becomes active. |
| `data[].secrets[].expires_at` | string (RFC 3339) | When this secret expires. |

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/extensions/jwt/secrets' \
  -H 'Authorization: Bearer EXTENSION_JWT' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "format_version": 1,
      "secrets": [
        {
          "content": "dGhpcyBpcyBhIHNlY3JldCBrZXk=",
          "active_at": "2025-03-15T00:00:00Z",
          "expires_at": "2025-06-15T00:00:00Z"
        },
        {
          "content": "bmV3IHNlY3JldCBrZXkgaGVyZQ==",
          "active_at": "2025-03-15T00:05:00Z",
          "expires_at": "2025-06-15T00:05:00Z"
        }
      ]
    }
  ]
}
```

---

### GET /extensions/jwt/secrets — Get Extension Secrets

Returns the current secrets for the extension.

**URL:** `GET https://api.twitch.tv/helix/extensions/jwt/secrets`

**Authentication:** JWT (signed by extension secret)

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/extensions/jwt/secrets' \
  -H 'Authorization: Bearer EXTENSION_JWT' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

---

### POST /extensions/pubsub — Send Extension PubSub Message

Sends a message to one or more extension PubSub targets. This is the primary mechanism for the Extension Backend Service (EBS) to communicate with extension frontends in real time.

**URL:** `POST https://api.twitch.tv/helix/extensions/pubsub`

**Authentication:** JWT (signed by extension secret)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | array of strings | Yes | The PubSub targets. Values: `"broadcast"` (all instances on a channel), `"whisper-<user_id>"` (specific user), `"global"` (all instances across all channels). |
| `broadcaster_id` | string | Yes | The broadcaster's user ID (for `broadcast` and `whisper` targets). |
| `is_global_broadcast` | boolean | No | Set to `true` when using the `global` target. |
| `message` | string | Yes | The message content. Max 5 KB. Typically a JSON string. |

**cURL Example:**

```bash
# Broadcast to all extension instances on a channel
curl -X POST 'https://api.twitch.tv/helix/extensions/pubsub' \
  -H 'Authorization: Bearer EXTENSION_JWT' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "target": ["broadcast"],
    "broadcaster_id": "41245072",
    "message": "{\"type\":\"score_update\",\"score\":42}"
  }'

# Whisper to a specific user
curl -X POST 'https://api.twitch.tv/helix/extensions/pubsub' \
  -H 'Authorization: Bearer EXTENSION_JWT' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "target": ["whisper-158010205"],
    "broadcaster_id": "41245072",
    "message": "{\"type\":\"reward\",\"item\":\"golden_badge\"}"
  }'

# Global broadcast to all instances across all channels
curl -X POST 'https://api.twitch.tv/helix/extensions/pubsub' \
  -H 'Authorization: Bearer EXTENSION_JWT' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "target": ["global"],
    "broadcaster_id": "41245072",
    "is_global_broadcast": true,
    "message": "{\"type\":\"maintenance\",\"message\":\"Extension update in 5 minutes\"}"
  }'
```

Returns `204 No Content` on success.

---

### GET /extensions/bits/products — Get Extension Bits Products

Returns a list of Bits products (in-extension purchasable items) for the extension.

**URL:** `GET https://api.twitch.tv/helix/extensions/bits/products`

**Authentication:** App Access Token
**Required Scope:** None

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `should_include_all` | boolean | No | If `true`, includes products in development. Default: `false`. |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | List of Bits products. |
| `data[].sku` | string | The product's SKU identifier. |
| `data[].cost` | object | Cost information. |
| `data[].cost.amount` | integer | The Bits cost. |
| `data[].cost.type` | string | The currency type (always `"bits"`). |
| `data[].in_development` | boolean | Whether the product is in development mode. |
| `data[].display_name` | string | The product's display name. |
| `data[].expiration` | string | Product expiration date (empty if no expiration). |
| `data[].is_broadcast` | boolean | Whether the purchase is broadcast to all extension instances. |

**cURL Example:**

```bash
# Get only released products
curl -X GET 'https://api.twitch.tv/helix/extensions/bits/products' \
  -H 'Authorization: Bearer APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Include development products
curl -X GET 'https://api.twitch.tv/helix/extensions/bits/products?should_include_all=true' \
  -H 'Authorization: Bearer APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "sku": "power_up_500",
      "cost": {
        "amount": 500,
        "type": "bits"
      },
      "in_development": false,
      "display_name": "Super Power Up",
      "expiration": "",
      "is_broadcast": true
    },
    {
      "sku": "custom_badge_100",
      "cost": {
        "amount": 100,
        "type": "bits"
      },
      "in_development": false,
      "display_name": "Custom Badge",
      "expiration": "2025-12-31T23:59:59Z",
      "is_broadcast": false
    }
  ]
}
```

---

### PUT /extensions/bits/products — Update Extension Bits Products

Creates or updates a Bits product for the extension.

**URL:** `PUT https://api.twitch.tv/helix/extensions/bits/products`

**Authentication:** App Access Token
**Required Scope:** None

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sku` | string | Yes | The product's SKU identifier. |
| `cost` | object | Yes | Cost information. |
| `cost.amount` | integer | Yes | The Bits cost. |
| `cost.type` | string | Yes | The currency type (must be `"bits"`). |
| `display_name` | string | Yes | The product's display name. |
| `in_development` | boolean | No | Whether the product is in development mode. Default: `false`. |
| `expiration` | string (RFC 3339) | No | When the product expires. Omit for no expiration. |
| `is_broadcast` | boolean | No | Whether the purchase is broadcast to all extension instances. Default: `false`. |

**cURL Example:**

```bash
curl -X PUT 'https://api.twitch.tv/helix/extensions/bits/products' \
  -H 'Authorization: Bearer APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "sku": "mega_boost_1000",
    "cost": {
      "amount": 1000,
      "type": "bits"
    },
    "display_name": "Mega Boost",
    "in_development": false,
    "is_broadcast": true
  }'
```

**Response Example:**

```json
{
  "data": [
    {
      "sku": "mega_boost_1000",
      "cost": {
        "amount": 1000,
        "type": "bits"
      },
      "in_development": false,
      "display_name": "Mega Boost",
      "expiration": "",
      "is_broadcast": true
    }
  ]
}
```

---

## Entitlements Endpoints

### GET /entitlements/drops — Get Drops Entitlements

Returns a list of entitlements granted to users through the Drops system. This endpoint supports filtering by entitlement ID, user ID, game ID, and fulfillment status.

**URL:** `GET https://api.twitch.tv/helix/entitlements/drops`

**Authentication:**
- **App Access Token** -- Returns entitlements for any user associated with your organization's games.
- **User Access Token** -- Returns only the authenticated user's entitlements.

**Required Scope:** None

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | No | One or more entitlement IDs (up to 100). Repeat the parameter for multiple IDs. |
| `user_id` | string | No | Filter to a specific user's entitlements. Only valid with App Access Token. |
| `game_id` | string | No | Filter to a specific game's entitlements. |
| `fulfillment_status` | string | No | Filter by status. Values: `CLAIMED`, `FULFILLED`. |
| `after` | string | No | Cursor for forward pagination. |
| `first` | integer | No | Maximum number of results per page. Max 1000, default 20. |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | List of entitlements. |
| `data[].id` | string | Unique entitlement ID. |
| `data[].benefit_id` | string | The benefit ID associated with this entitlement. |
| `data[].timestamp` | string (RFC 3339) | When the entitlement was granted. |
| `data[].user_id` | string | The user who received the entitlement. |
| `data[].game_id` | string | The game associated with the entitlement. |
| `data[].fulfillment_status` | string | Current status: `CLAIMED` or `FULFILLED`. |
| `data[].last_updated` | string (RFC 3339) | When the entitlement was last updated. |
| `pagination` | object | Pagination cursor. |

**cURL Example:**

```bash
# Get all claimed (unfulfilled) entitlements for a game
curl -X GET 'https://api.twitch.tv/helix/entitlements/drops?game_id=493057&fulfillment_status=CLAIMED&first=100' \
  -H 'Authorization: Bearer APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Get a specific user's entitlements
curl -X GET 'https://api.twitch.tv/helix/entitlements/drops?user_id=158010205&first=50' \
  -H 'Authorization: Bearer APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Get specific entitlements by ID
curl -X GET 'https://api.twitch.tv/helix/entitlements/drops?id=fb78c3e6-e54c-4d17-8e9a-example1&id=a1b2c3d4-e5f6-7890-abcd-example2' \
  -H 'Authorization: Bearer APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# User access token -- returns only the authenticated user's entitlements
curl -X GET 'https://api.twitch.tv/helix/entitlements/drops?game_id=493057' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "id": "fb78c3e6-e54c-4d17-8e9a-example1",
      "benefit_id": "74c52265-e214-48a6-8a5c-bbenefit1",
      "timestamp": "2025-03-10T14:23:05Z",
      "user_id": "158010205",
      "game_id": "493057",
      "fulfillment_status": "CLAIMED",
      "last_updated": "2025-03-10T14:23:05Z"
    },
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-example2",
      "benefit_id": "74c52265-e214-48a6-8a5c-bbenefit2",
      "timestamp": "2025-03-12T09:15:30Z",
      "user_id": "158010205",
      "game_id": "493057",
      "fulfillment_status": "FULFILLED",
      "last_updated": "2025-03-12T10:00:00Z"
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7IkN1cnNvciI6..."
  }
}
```

---

### PATCH /entitlements/drops — Update Drops Entitlements

Updates the fulfillment status of one or more entitlements. Use this to mark entitlements as fulfilled after granting the associated reward in your game.

**URL:** `PATCH https://api.twitch.tv/helix/entitlements/drops`

**Authentication:** App Access Token or User Access Token
**Required Scope:** None

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entitlement_ids` | array of strings | Yes | One or more entitlement IDs to update (up to 100). |
| `fulfillment_status` | string | Yes | The new fulfillment status. Values: `CLAIMED`, `FULFILLED`. |

**cURL Example:**

```bash
# Mark entitlements as fulfilled
curl -X PATCH 'https://api.twitch.tv/helix/entitlements/drops' \
  -H 'Authorization: Bearer APP_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "entitlement_ids": [
      "fb78c3e6-e54c-4d17-8e9a-example1",
      "a1b2c3d4-e5f6-7890-abcd-example2"
    ],
    "fulfillment_status": "FULFILLED"
  }'
```

**Response Example:**

```json
{
  "data": [
    {
      "status": "SUCCESS",
      "ids": [
        "fb78c3e6-e54c-4d17-8e9a-example1",
        "a1b2c3d4-e5f6-7890-abcd-example2"
      ]
    }
  ]
}
```

**Note:** If some entitlements fail to update, the response includes both `SUCCESS` and `INVALID_ID` or `NOT_FOUND` groups:

```json
{
  "data": [
    {
      "status": "SUCCESS",
      "ids": ["fb78c3e6-e54c-4d17-8e9a-example1"]
    },
    {
      "status": "NOT_FOUND",
      "ids": ["a1b2c3d4-e5f6-7890-abcd-invalid"]
    }
  ]
}
```

---

## Content Classification Labels Endpoint

### GET /content_classification_labels — Get Content Classification Labels

Returns the list of content classification labels (CCLs) that broadcasters can apply to their streams. These labels inform viewers about mature or sensitive content.

**URL:** `GET https://api.twitch.tv/helix/content_classification_labels`

**Authentication:** App Access Token or User Access Token
**Required Scope:** None

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `locale` | string | No | Locale for the label name and description (e.g., `en-US`, `de-DE`, `fr-FR`). Defaults to English if not specified or if the locale is not supported. |

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | List of content classification labels. |
| `data[].id` | string | The label's identifier (e.g., `DrugsIntoxication`, `MatureGame`, `Gambling`, `ProfanityVulgarity`, `SexualThemes`, `ViolentGraphic`). |
| `data[].description` | string | Localized description of the label. |
| `data[].name` | string | Localized display name of the label. |

**cURL Example:**

```bash
# Get labels in English (default)
curl -X GET 'https://api.twitch.tv/helix/content_classification_labels' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Get labels in German
curl -X GET 'https://api.twitch.tv/helix/content_classification_labels?locale=de-DE' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response Example:**

```json
{
  "data": [
    {
      "id": "DrugsIntoxication",
      "description": "Excessive tobacco glorification or promotion, any marijuana use, legal drug and alcohol abuse, discussions of illegal drugs.",
      "name": "Drugs, Intoxication, or Excessive Tobacco Use"
    },
    {
      "id": "Gambling",
      "description": "Gambling content that is not rated or is rated for adults only.",
      "name": "Gambling"
    },
    {
      "id": "MatureGame",
      "description": "Games that are rated Mature or less suitable for a younger audience.",
      "name": "Mature-Rated Game"
    },
    {
      "id": "ProfanityVulgarity",
      "description": "Prolonged, and repeated use of obscenities, profanities, and vulgarities, especially as a regular part of speech.",
      "name": "Significant Profanity or Vulgarity"
    },
    {
      "id": "SexualThemes",
      "description": "Content that focuses on sexualized physical attributes and activities, sexual topics, or experiences.",
      "name": "Sexual Themes"
    },
    {
      "id": "ViolentGraphic",
      "description": "Simulations and/or depictions of realistic violence, gore, or extreme injury.",
      "name": "Violent and Graphic Depictions"
    }
  ]
}
```

---

## Related EventSub Subscription Types

### Bits-Related Events

| Subscription Type | Description | Scope Required |
|-------------------|-------------|----------------|
| `channel.cheer` | A user cheers Bits in the channel. | `bits:read` |

**EventSub `channel.cheer` event payload:**

```json
{
  "user_id": "158010205",
  "user_login": "coolviewer",
  "user_name": "CoolViewer",
  "broadcaster_user_id": "41245072",
  "broadcaster_user_login": "examplebroadcaster",
  "broadcaster_user_name": "ExampleBroadcaster",
  "is_anonymous": false,
  "message": "Cheer100 Great stream!",
  "bits": 100
}
```

### Extension-Related Events

| Subscription Type | Description | Scope Required |
|-------------------|-------------|----------------|
| `extension.bits_transaction.create` | A Bits transaction occurs in the extension. | None (app access token, extension must be owned by client_id) |

**EventSub `extension.bits_transaction.create` event payload:**

```json
{
  "id": "74c52265-e214-48a6-8a5c-example1",
  "extension_client_id": "abcd1234efgh5678",
  "broadcaster_user_id": "41245072",
  "broadcaster_user_login": "examplebroadcaster",
  "broadcaster_user_name": "ExampleBroadcaster",
  "user_id": "158010205",
  "user_login": "coolviewer",
  "user_name": "CoolViewer",
  "product": {
    "name": "Super Power Up",
    "bits": 500,
    "sku": "power_up_500",
    "in_development": false
  }
}
```

### Drops-Related Events

| Subscription Type | Description | Scope Required |
|-------------------|-------------|----------------|
| `drop.entitlement.grant` | A Drop entitlement is granted to a user. | None (app access token) |

**Note:** The `drop.entitlement.grant` event uses **batched delivery** -- Twitch may combine multiple entitlement grants into a single notification. The `events` field in the payload is an array.

### Content Classification Labels -- Related Events

| Subscription Type | Description | Scope Required |
|-------------------|-------------|----------------|
| `channel.update` | Fires when channel information changes, including content classification labels. | None |

The `channel.update` event payload includes a `content_classification_labels` array containing the IDs of the labels applied to the stream.

---

## Best Practices

### Bits

- **Leaderboard caching** -- The Bits leaderboard does not change in real time. Cache results for a few minutes to reduce API calls.
- **Period alignment** -- When using `started_at` with a period, Twitch aligns the date to the period boundary (e.g., `week` snaps to the most recent Monday at midnight UTC). Account for this when displaying date ranges to users.
- **Cheermote images** -- Cache cheermote data aggressively. The image URLs and tier structure change infrequently. Refresh once per session or on app startup.
- **Anonymous cheers** -- The `channel.cheer` EventSub event includes `is_anonymous`. When true, `user_id`, `user_login`, and `user_name` are empty strings. Handle this gracefully in your UI.

### Analytics

- **CSV download URLs expire** -- The URLs returned by analytics endpoints are valid for only 5 minutes. Download the CSV immediately after retrieving the URL. Do not store the URL for later use.
- **Date range requirements** -- If you specify `started_at`, you must also specify `ended_at`, and vice versa. The maximum date range is 365 days.
- **Rate limiting** -- Analytics endpoints are subject to standard Helix rate limits. If you need analytics for many extensions or games, paginate carefully and respect rate limits.
- **Data availability** -- Analytics data may have a delay of up to 48 hours. Do not expect real-time data from these endpoints.

### Extensions

- **JWT expiration** -- Keep JWT expiration times short (5-15 minutes). Generate a new JWT for each request or batch of requests.
- **Secret rotation** -- When creating a new extension secret, the old secret remains valid until its `expires_at` date. This allows a rolling update without downtime. Always maintain a window where both old and new secrets are valid.
- **PubSub message size** -- The `message` field in PubSub has a 5 KB limit. If you need to send larger data, use the message to notify clients, then have clients fetch the data from your backend.
- **Configuration segment limits** -- Each configuration segment (broadcaster, developer, global) has a 5 KB limit. Structure your configuration data efficiently. Consider using compression for large configurations.
- **Chat message rate limits** -- Extension chat messages are subject to Twitch's standard chat rate limits. Do not send more than 1 message per second per channel.
- **Bits product pricing** -- The minimum Bits cost for a product is 1 Bit. Products can be set to development mode for testing without real Bits transactions.
- **Transaction reconciliation** -- Use the `GET /extensions/transactions` endpoint to reconcile Bits transactions. Cross-reference with your internal records to ensure all purchases are accounted for.

### Entitlements

- **Batch fulfillment** -- Process entitlements in batches (up to 100 per PATCH request) for efficiency. Poll for `CLAIMED` entitlements periodically and fulfill them in bulk.
- **Idempotent fulfillment** -- The PATCH endpoint is idempotent. Calling it multiple times with the same entitlement IDs and status has no adverse effect. Design your fulfillment pipeline to be safely retriable.
- **Pagination with large result sets** -- The `first` parameter supports up to 1000 results per page (much higher than most Helix endpoints). Use this to reduce the number of API calls when processing large batches.
- **User vs. App tokens** -- Use an App Access Token for server-side fulfillment pipelines. User Access Tokens only return the authenticated user's entitlements and cannot see other users' entitlements.

### Content Classification Labels

- **Localization** -- Use the `locale` parameter to retrieve labels in the viewer's language for display purposes. Fall back to English if the requested locale is unsupported.
- **Static data** -- Content classification labels change very rarely. Cache the response for at least 24 hours.
- **Channel update integration** -- When updating a channel's information via `PATCH /channels`, you can set content classification labels by including the label IDs. Use `GET /content_classification_labels` to retrieve the valid label IDs.

---

## Known Issues & Community Notes

- **Bits leaderboard -- empty results for new channels** -- Channels that have never received Bits return an empty `data` array. This is expected behavior, not an error.
- **Cheermotes -- missing channel-specific data** -- Some channels have custom cheermotes that do not appear immediately when queried. There may be a propagation delay of a few minutes after a channel adds or updates custom cheermotes.
- **Analytics -- overview_v2 is the only type** -- The `type` parameter currently only supports `overview_v2`. The `overview_v1` type was deprecated. If you omit the `type` parameter, `overview_v2` is used by default.
- **Analytics -- empty CSV files** -- If there is no data for the requested date range, the endpoint may return a URL that downloads an empty (headers-only) CSV file rather than returning an error.
- **Extension transactions -- eventually consistent** -- Newly created transactions may not appear immediately in `GET /extensions/transactions` queries. There can be a delay of up to a few seconds.
- **Extension PubSub -- global broadcast rate limit** -- Global broadcasts (target `"global"`) are heavily rate-limited (approximately 1 per minute per extension). Use them only for critical, infrequent announcements.
- **Extension configuration -- race conditions** -- If multiple sources update the same configuration segment simultaneously, the last write wins. Use the `version` field to implement optimistic concurrency control.
- **Drops entitlements -- CLAIMED vs. FULFILLED** -- Entitlements start in `CLAIMED` status when a user claims their Drop. Your game's backend is responsible for moving them to `FULFILLED` after granting the reward. Unclaimed entitlements are not visible through this endpoint.
- **Drops -- organization ownership** -- To use the Drops entitlements endpoints with an App Access Token, your application must be owned by the same organization that owns the game. This is configured in the Twitch Developer Console.
- **Content classification labels -- list may expand** -- Twitch may add new content classification labels at any time. Do not hardcode the list of label IDs. Always fetch the current list from the API.
- **JWT authentication complexity** -- Extension endpoints that require JWT authentication are more complex to set up than standard OAuth endpoints. Ensure you are base64-decoding the extension secret before using it as the HMAC key for HS256 signing.

---

## Quick Reference Table

| Endpoint | Method | Auth | Scope | Paginated |
|----------|--------|------|-------|-----------|
| `/bits/leaderboard` | GET | User Token | `bits:read` | No |
| `/bits/cheermotes` | GET | App/User Token | None | No |
| `/analytics/extensions` | GET | User Token | `analytics:read:extensions` | Yes |
| `/analytics/games` | GET | User Token | `analytics:read:games` | Yes |
| `/extensions/transactions` | GET | App Token | None (owner only) | Yes |
| `/extensions` | GET | JWT | N/A | No |
| `/extensions/released` | GET | App/User Token | None | No |
| `/extensions/configurations` | GET | JWT | N/A | No |
| `/extensions/configurations` | PUT | JWT | N/A | No |
| `/extensions/required_configuration` | PUT | JWT | N/A | No |
| `/extensions/chat` | POST | JWT | N/A | No |
| `/extensions/live` | GET | App/User Token | None | Yes |
| `/extensions/jwt/secrets` | POST | JWT | N/A | No |
| `/extensions/jwt/secrets` | GET | JWT | N/A | No |
| `/extensions/pubsub` | POST | JWT | N/A | No |
| `/extensions/bits/products` | GET | App Token | None | No |
| `/extensions/bits/products` | PUT | App Token | None | No |
| `/entitlements/drops` | GET | App/User Token | None | Yes |
| `/entitlements/drops` | PATCH | App/User Token | None | No |
| `/content_classification_labels` | GET | App/User Token | None | No |
