# Twitch API — Concepts, Rate Limits & Pagination

> **Source:** [Twitch API Rate Limits](https://dev.twitch.tv/docs/api/guide/#rate-limits), [Twitch API Pagination](https://dev.twitch.tv/docs/api/guide/#pagination), [Twitch API Guide](https://dev.twitch.tv/docs/api/guide/)
> **Last verified:** 2025-05-01 — [PAGE INACCESSIBLE - VERIFY AGAINST LIVE DOCS]
> **API Base URL:** `https://api.twitch.tv/helix`
> **Auth Base URL:** `https://id.twitch.tv`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Rate Limits](#2-rate-limits)
3. [Pagination](#3-pagination)
4. [Required Headers](#4-required-headers)
5. [Data Format Conventions](#5-data-format-conventions)
6. [Error Response Format](#6-error-response-format)
7. [Breaking Changes Policy](#7-breaking-changes-policy)
8. [cURL Tips](#8-curl-tips)
9. [Request/Response Patterns](#9-requestresponse-patterns)
10. [Retry Strategy](#10-retry-strategy)
11. [Best Practices & Production Hardening](#11-best-practices--production-hardening)
12. [Known Issues & Community Notes](#12-known-issues--community-notes)
13. [Quick Reference Table](#13-quick-reference-table)

---

## 1. Overview

This document covers the cross-cutting concepts that apply to every Twitch Helix API endpoint: rate limiting, pagination, required headers, data formats, error handling, and retry strategies. Understanding these fundamentals is essential before working with any specific endpoint.

All Twitch Helix API requests are made against the base URL `https://api.twitch.tv/helix`. Every request must include an OAuth access token and your application's Client ID. Responses are always JSON.

### Key Principles

- **Token-bucket rate limiting** — Requests consume points from a bucket that refills over time
- **Cursor-based pagination** — Large result sets are paged using opaque cursor strings, not numeric offsets
- **Opaque string IDs** — All identifiers (user IDs, stream IDs, etc.) are strings, never integers
- **RFC 3339 timestamps** — All date/time values follow the RFC 3339 format
- **Consistent error format** — All errors return the same JSON structure with `error`, `status`, and `message` fields

---

## 2. Rate Limits

Twitch uses a **token-bucket algorithm** to enforce rate limits on API requests. Each application has a bucket of points. Requests consume points from the bucket, and points are added back at a steady rate.

### How the Token Bucket Works

1. Your application starts with a full bucket of points
2. Each API request costs a certain number of points (most cost 1 point)
3. Points are added back to the bucket at a fixed rate (the "refill rate")
4. If your bucket is empty, you receive an HTTP 429 response
5. The bucket has a maximum capacity — points stop accumulating once the bucket is full

### Default Limits

| Bucket Type | Points Per Minute | Max Bucket Size | Scope |
|---|---|---|---|
| **App Access Token** | 800 | 800 | Per `client_id` per minute |
| **User Access Token** | 800 | 800 | Per `client_id` per `user_id` per minute |

- App access and user access requests are tracked in **separate buckets**
- User access requests are further separated: each unique combination of `client_id` + `user_id` has its own bucket
- Most endpoints cost **1 point per request**, but some endpoints have higher costs (check individual endpoint documentation)

### Extensions Rate Limit

Extensions have a separate, more restrictive rate limit:

| Context | Limit |
|---|---|
| Extension viewer | 30 requests per minute per viewer |

This is independent of the main Helix API rate limit.

### Rate Limit Response Headers

Every API response includes three rate limit headers:

| Header | Type | Description |
|---|---|---|
| `Ratelimit-Limit` | integer | The rate at which points are added to your bucket (points per minute) |
| `Ratelimit-Remaining` | integer | The number of points remaining in your bucket |
| `Ratelimit-Reset` | integer | Unix epoch timestamp (seconds) indicating when the bucket will be completely full again |

**Example response headers:**

```
HTTP/1.1 200 OK
Ratelimit-Limit: 800
Ratelimit-Remaining: 794
Ratelimit-Reset: 1696118400
Content-Type: application/json
```

### HTTP 429 — Too Many Requests

When your bucket is empty, the API returns HTTP 429:

```json
{
  "error": "Too Many Requests",
  "status": 429,
  "message": "Request limit exceeded"
}
```

When you receive a 429:

1. Read the `Ratelimit-Reset` header to determine when points will be available
2. Wait until the reset time before making new requests
3. Alternatively, implement exponential backoff (see [Retry Strategy](#10-retry-strategy))

### Per-Endpoint Point Costs

Most endpoints cost 1 point per request, but some cost more. Notable examples:

- Endpoints that perform write operations may cost more than read operations
- Batch endpoints that accept multiple items may cost proportionally more
- Check the specific endpoint documentation for its point cost

> **Important:** Twitch does not publish a comprehensive list of per-endpoint costs. Always monitor your `Ratelimit-Remaining` header to understand actual consumption.

### Separate Buckets — Practical Impact

Because app access and user access tokens use separate buckets:

- A server making requests with an app access token for public data does not affect the rate limit for requests made with a user's token
- If your application serves multiple users, each user effectively has their own rate limit for user-token requests
- You can strategically choose which token type to use: use app access tokens for public data to preserve per-user limits

---

## 3. Pagination

Twitch uses **cursor-based pagination** for endpoints that return lists of results. This is more efficient and consistent than offset-based pagination, especially for dynamic data like live streams.

### How Cursor Pagination Works

1. Make an initial request (optionally with a `first` parameter to set page size)
2. The response includes a `pagination` object with a `cursor` field
3. Pass the cursor value in the `after` query parameter of your next request
4. Repeat until the `pagination` object is empty or missing the `cursor` field

### Pagination Parameters

| Parameter | Type | Description |
|---|---|---|
| `first` | integer | Number of results per page. Default varies by endpoint. Maximum is usually 100 |
| `after` | string | Cursor for forward pagination. Use the `cursor` value from the previous response's `pagination` object |
| `before` | string | Cursor for backward pagination. Not supported by all endpoints — check endpoint documentation |

### Response Format

```json
{
  "data": [
    { "id": "123", "user_name": "StreamerOne", "..." : "..." },
    { "id": "456", "user_name": "StreamerTwo", "..." : "..." }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6MjB9fQ=="
  }
}
```

When there are no more results, the pagination object is empty:

```json
{
  "data": [],
  "pagination": {}
}
```

### Default Page Sizes by Endpoint

Page sizes vary by endpoint. Common examples:

| Endpoint | Default `first` | Maximum `first` |
|---|---|---|
| Get Streams | 20 | 100 |
| Get Users Follows | 20 | 100 |
| Get Clips | 20 | 100 |
| Search Channels | 20 | 100 |
| Get Channel Chat Chatters | 100 | 1000 |

> **Note:** Always check the specific endpoint documentation for its default and maximum page size.

### Full Pagination Example

**First request:**

```bash
curl -X GET 'https://api.twitch.tv/helix/streams?first=5' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response:**

```json
{
  "data": [
    { "id": "40944301405", "user_name": "StreamerA", "viewer_count": 45231 },
    { "id": "40944301406", "user_name": "StreamerB", "viewer_count": 38102 },
    { "id": "40944301407", "user_name": "StreamerC", "viewer_count": 29444 },
    { "id": "40944301408", "user_name": "StreamerD", "viewer_count": 21005 },
    { "id": "40944301409", "user_name": "StreamerE", "viewer_count": 18332 }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6NX19"
  }
}
```

**Second request (next page):**

```bash
curl -X GET 'https://api.twitch.tv/helix/streams?first=5&after=eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6NX19' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

### Edge Cases and Gotchas

- **Empty pages near the end:** When paginating dynamic data (like live streams), you may encounter pages with fewer results than expected or empty `data` arrays before reaching the true end. Always check for an empty `pagination` object to determine the end, not the length of `data`
- **Duplicate data across pages:** Because live data changes between requests, items may shift positions. You might see the same item on two consecutive pages. Deduplicate results on your side using unique IDs
- **Cursor expiration:** Cursors are opaque strings with no guaranteed lifetime. Do not store them long-term. Use them promptly for sequential page requests
- **No backward pagination on some endpoints:** Not all endpoints support the `before` parameter. If an endpoint does not document `before`, only forward pagination (`after`) is available
- **Total count not provided:** Most paginated endpoints do not return a total count. You must paginate through all results to count them

---

## 4. Required Headers

Every Twitch Helix API request must include the following headers:

### Mandatory Headers

| Header | Value | Required | Notes |
|---|---|---|---|
| `Authorization` | `Bearer <access_token>` | Always | App access or user access token |
| `Client-Id` | `<client_id>` | Always | Your application's registered Client ID |
| `Content-Type` | `application/json` | POST, PATCH, PUT with body | Required when sending a JSON request body |

### Example — GET Request

```bash
curl -X GET 'https://api.twitch.tv/helix/users?login=twitchdev' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2'
```

### Example — POST Request with Body

```bash
curl -X POST 'https://api.twitch.tv/helix/channels/commercial' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2' \
  -H 'Content-Type: application/json' \
  -d '{"broadcaster_id":"41245072","length":60}'
```

### Common Header Mistakes

| Mistake | Result | Fix |
|---|---|---|
| Missing `Client-Id` header | 401 Unauthorized | Always include `Client-Id` alongside the `Authorization` header |
| Using `OAuth` instead of `Bearer` | 401 Unauthorized | Helix uses `Bearer`. Only the token validation endpoint uses `OAuth` |
| Missing `Content-Type` on POST | 400 Bad Request or ignored body | Include `Content-Type: application/json` for any request with a JSON body |
| Using an expired token | 401 Unauthorized | Validate or refresh tokens before use |

---

## 5. Data Format Conventions

### IDs Are Opaque Strings

All identifiers in the Twitch API are **strings**, even when they look numeric:

```json
{
  "id": "141981764",
  "login": "twitchdev",
  "display_name": "TwitchDev"
}
```

> **Important:** Never parse IDs as integers. They are opaque strings. Twitch may change the format at any time without considering it a breaking change. Always store and compare IDs as strings.

### Timestamps Are RFC 3339

All timestamps use RFC 3339 format with varying precision:

```
2023-04-15T18:30:22Z
2023-04-15T18:30:22.123456789Z
2023-11-02T00:00:00.000Z
```

- Always use a proper date/time parser, not string manipulation
- Timestamps are always in UTC (indicated by `Z` suffix)
- Precision varies — some include nanoseconds, others only seconds

### Empty Results

When a query returns no results, the `data` field is an empty array, never `null`:

```json
{
  "data": []
}
```

For paginated endpoints with no results:

```json
{
  "data": [],
  "pagination": {}
}
```

### Enum Values

Enumerated fields use **case-sensitive string values**:

```json
{
  "type": "live",
  "broadcaster_type": "affiliate",
  "subscription_type": "channel.follow"
}
```

- Always compare enum values with exact case matching
- Check endpoint documentation for valid enum values
- New enum values may be added without a breaking change announcement

### Boolean Fields

Boolean values are JSON `true` / `false`, not strings:

```json
{
  "is_mature": false,
  "is_gift": true
}
```

### Null vs. Missing Fields

- Fields may be `null` when a value is not set or not applicable
- Fields may be omitted entirely in some cases
- Always handle both `null` and missing fields defensively

```json
{
  "game_id": "",
  "game_name": "",
  "title": "",
  "tags": []
}
```

> **Note:** Some fields return empty strings `""` instead of `null` when no value is set. Handle both cases.

---

## 6. Error Response Format

All Twitch API errors follow a consistent JSON structure:

```json
{
  "error": "Short Error Name",
  "status": 400,
  "message": "Descriptive message about what went wrong"
}
```

### HTTP Status Codes

| Status Code | Error | Common Causes |
|---|---|---|
| **400** | Bad Request | Missing required parameter, invalid parameter value, malformed JSON body |
| **401** | Unauthorized | Missing or invalid access token, expired token, missing `Client-Id` header |
| **403** | Forbidden | Token lacks required scope, user lacks permission for the action, token type mismatch (app token used where user token required) |
| **404** | Not Found | Resource does not exist, invalid endpoint path |
| **409** | Conflict | Resource already exists, concurrent modification conflict |
| **422** | Unprocessable Entity | Semantically invalid request (correct format but invalid content) |
| **425** | Too Early | Request sent before a required condition is met (rare) |
| **429** | Too Many Requests | Rate limit exceeded — bucket empty |
| **500** | Internal Server Error | Twitch server error — safe to retry with backoff |
| **503** | Service Unavailable | Twitch temporarily unavailable — safe to retry with backoff |

### Error Response Examples

**400 — Missing required parameter:**

```json
{
  "error": "Bad Request",
  "status": 400,
  "message": "Missing required parameter \"broadcaster_id\""
}
```

**401 — Invalid token:**

```json
{
  "error": "Unauthorized",
  "status": 401,
  "message": "Invalid OAuth token"
}
```

**403 — Missing scope:**

```json
{
  "error": "Forbidden",
  "status": 403,
  "message": "Missing scope: channel:manage:broadcast"
}
```

**429 — Rate limited:**

```json
{
  "error": "Too Many Requests",
  "status": 429,
  "message": "Request limit exceeded"
}
```

**500 — Server error:**

```json
{
  "error": "Internal Server Error",
  "status": 500,
  "message": ""
}
```

### Handling Errors by Category

| Category | Status Codes | Action |
|---|---|---|
| **Client errors (fix request)** | 400, 404, 409, 422 | Fix the request parameters or body. Do not retry without changes |
| **Auth errors (fix credentials)** | 401, 403 | Refresh or re-obtain token. Check scopes. Do not retry with the same token |
| **Rate limit errors (wait)** | 429 | Wait until `Ratelimit-Reset` or use exponential backoff |
| **Server errors (retry)** | 500, 503 | Retry with exponential backoff. These are transient |

---

## 7. Breaking Changes Policy

Twitch follows a documented breaking changes policy that distinguishes between breaking and non-breaking changes.

### Non-Breaking Changes (No Advance Notice)

These changes can happen at any time without announcement:

- Adding new fields to response objects
- Adding new endpoints
- Adding new optional query parameters or body fields
- Adding new enum values to existing fields
- Adding new webhook/EventSub subscription types
- Changing the order of fields in JSON responses
- Changing the length or format of opaque IDs

> **Important:** Your code must handle unknown fields gracefully. Never fail on unexpected fields in a response.

### Breaking Changes (Advance Notice)

These changes are announced in advance on the [Twitch Developer Forums](https://discuss.dev.twitch.tv/) and the [Changelog](https://dev.twitch.tv/docs/change-log/):

- Removing fields from response objects
- Changing the data type of existing fields
- Removing endpoints
- Changing required parameters (adding new required parameters)
- Renaming existing fields or parameters
- Changing the behavior of existing endpoints

### How to Stay Informed

1. **Twitch Developer Forums** — Subscribe to the announcements category at https://discuss.dev.twitch.tv/
2. **Changelog** — Check https://dev.twitch.tv/docs/change-log/ regularly
3. **@TwitchDev on Twitter/X** — Follow for major announcements
4. **Twitch Developer Discord** — Community discussions and early warnings

### Deprecation Process

When Twitch deprecates an endpoint or feature:

1. Announcement posted to Developer Forums and Changelog
2. Deprecation period (typically 3-12 months depending on impact)
3. Documentation updated with deprecation notices
4. Endpoint returns warning headers during deprecation period
5. Endpoint removed after deprecation period ends

---

## 8. cURL Tips

The Twitch documentation uses `curl` in examples. Platform differences affect command syntax.

### Unix / macOS / Linux

Use **backslash** `\` for line continuation and **single quotes** around strings:

```bash
curl -X GET 'https://api.twitch.tv/helix/users?login=twitchdev' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

### Windows Command Prompt (cmd.exe)

Use **caret** `^` for line continuation and **double quotes** around strings:

```cmd
curl -X GET "https://api.twitch.tv/helix/users?login=twitchdev" ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
  -H "Client-Id: YOUR_CLIENT_ID"
```

### Windows PowerShell

Use **backtick** `` ` `` for line continuation and **double quotes** around strings:

```powershell
curl -X GET "https://api.twitch.tv/helix/users?login=twitchdev" `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" `
  -H "Client-Id: YOUR_CLIENT_ID"
```

> **Note:** In PowerShell, `curl` is an alias for `Invoke-WebRequest`. Use `curl.exe` to invoke the actual curl binary.

### URL Encoding

Special characters in query parameters must be URL-encoded:

| Character | Encoded |
|---|---|
| Space | `%20` or `+` |
| `&` | `%26` |
| `=` | `%3D` |
| `#` | `%23` |
| `+` | `%2B` |

**Example — searching for a channel name with spaces:**

```bash
curl -X GET 'https://api.twitch.tv/helix/search/channels?query=speed%20run' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

### Sending JSON Bodies

```bash
# Inline JSON
curl -X POST 'https://api.twitch.tv/helix/channels/commercial' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{"broadcaster_id":"41245072","length":60}'

# From a file
curl -X POST 'https://api.twitch.tv/helix/channels/commercial' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d @request.json
```

### Useful cURL Flags

| Flag | Description |
|---|---|
| `-v` | Verbose output (shows request/response headers) |
| `-s` | Silent mode (no progress bar) |
| `-o /dev/null` | Discard response body (useful with `-v` for headers only) |
| `-w '%{http_code}'` | Print only the HTTP status code |
| `-D -` | Dump response headers to stdout |

---

## 9. Request/Response Patterns

### Common GET Pattern — Single Resource

**Request:**

```bash
curl -X GET 'https://api.twitch.tv/helix/users?id=141981764' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response:**

```json
{
  "data": [
    {
      "id": "141981764",
      "login": "twitchdev",
      "display_name": "TwitchDev",
      "type": "",
      "broadcaster_type": "partner",
      "description": "Supporting third-party developers...",
      "profile_image_url": "https://static-cdn.jtvnw.net/...",
      "offline_image_url": "https://static-cdn.jtvnw.net/...",
      "created_at": "2016-12-14T20:32:28Z"
    }
  ]
}
```

> **Note:** Even single-resource GET requests return `data` as an array. If the resource is not found, the array is empty — not a 404.

### Common GET Pattern — Multiple IDs

Many endpoints allow fetching multiple resources by repeating the query parameter:

```bash
curl -X GET 'https://api.twitch.tv/helix/users?id=141981764&id=12345678' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

### Common GET Pattern — Paginated List

```bash
curl -X GET 'https://api.twitch.tv/helix/streams?first=20' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response:**

```json
{
  "data": [ "..." ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6MjB9fQ=="
  }
}
```

### Common POST Pattern — Create Resource

```bash
curl -X POST 'https://api.twitch.tv/helix/clips?broadcaster_id=44322889' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response:**

```json
{
  "data": [
    {
      "id": "FiveLetterClipID",
      "edit_url": "https://clips.twitch.tv/FiveLetterClipID/edit"
    }
  ]
}
```

### Common PATCH Pattern — Update Resource

```bash
curl -X PATCH 'https://api.twitch.tv/helix/channels?broadcaster_id=41245072' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{"game_id":"33214","title":"New Stream Title"}'
```

**Response:** `204 No Content` (empty body on success)

### Common DELETE Pattern — Remove Resource

```bash
curl -X DELETE 'https://api.twitch.tv/helix/moderation/bans?broadcaster_id=41245072&moderator_id=141981764&user_id=12345678' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Response:** `204 No Content` (empty body on success)

### Response Conventions Summary

| HTTP Method | Success Code | Response Body |
|---|---|---|
| GET | 200 | `{ "data": [...] }` with optional `pagination` |
| POST (create) | 200 or 202 | `{ "data": [...] }` with created resource(s) |
| PATCH (update) | 204 | Empty body |
| DELETE | 204 | Empty body |

> **Note:** Not all endpoints follow these exact patterns. Some POST endpoints return 202 (Accepted) for asynchronous operations. Always check the specific endpoint documentation.

---

## 10. Retry Strategy

Implement a retry strategy for transient errors (429, 500, 503). Use exponential backoff with jitter to avoid thundering herd problems.

### Which Errors to Retry

| Status Code | Retry? | Strategy |
|---|---|---|
| **400** | No | Fix the request |
| **401** | Conditional | Refresh token, then retry once |
| **403** | No | Fix permissions/scopes |
| **404** | No | Fix the resource identifier |
| **429** | Yes | Wait until `Ratelimit-Reset`, then retry |
| **500** | Yes | Exponential backoff with jitter |
| **503** | Yes | Exponential backoff with jitter |

### Exponential Backoff Algorithm

```
wait_time = min(base_delay * 2^attempt + random_jitter, max_delay)
```

Recommended parameters:

| Parameter | Value |
|---|---|
| Base delay | 1 second |
| Max delay | 60 seconds |
| Max retries | 5 |
| Jitter range | 0 to 1 second |

### Pseudocode Implementation

```javascript
async function twitchApiRequest(url, options, maxRetries = 5) {
  const baseDelay = 1000; // 1 second
  const maxDelay = 60000; // 60 seconds

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.ok) {
      return response;
    }

    // 429: Rate limited — use Ratelimit-Reset header
    if (response.status === 429) {
      const resetTimestamp = parseInt(response.headers.get('Ratelimit-Reset'), 10);
      const now = Math.floor(Date.now() / 1000);
      const waitSeconds = Math.max(resetTimestamp - now, 1);
      await sleep(waitSeconds * 1000);
      continue;
    }

    // 500, 503: Server error — exponential backoff
    if (response.status === 500 || response.status === 503) {
      if (attempt === maxRetries) {
        throw new Error(`Twitch API error ${response.status} after ${maxRetries} retries`);
      }
      const jitter = Math.random() * 1000;
      const delay = Math.min(baseDelay * Math.pow(2, attempt) + jitter, maxDelay);
      await sleep(delay);
      continue;
    }

    // 401: Try refreshing token once
    if (response.status === 401 && attempt === 0) {
      await refreshAccessToken();
      options.headers['Authorization'] = `Bearer ${newToken}`;
      continue;
    }

    // All other errors: do not retry
    throw new TwitchApiError(await response.json());
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Rate Limit-Aware Request Scheduling

For applications making many requests, proactively monitor rate limit headers:

```javascript
class TwitchRateLimiter {
  constructor() {
    this.remaining = 800;
    this.resetTimestamp = 0;
  }

  updateFromHeaders(headers) {
    this.remaining = parseInt(headers.get('Ratelimit-Remaining'), 10);
    this.resetTimestamp = parseInt(headers.get('Ratelimit-Reset'), 10);
  }

  async waitIfNeeded() {
    if (this.remaining <= 10) { // Buffer of 10 points
      const now = Math.floor(Date.now() / 1000);
      if (this.resetTimestamp > now) {
        await sleep((this.resetTimestamp - now) * 1000);
      }
    }
  }
}
```

---

## 11. Best Practices & Production Hardening

### Token Management

- **Validate tokens on startup** and periodically (at least once per hour) using the `/oauth2/validate` endpoint
- **Refresh user access tokens proactively** before they expire, not when you get a 401
- **Cache app access tokens** — they are valid for ~60 days; do not request a new one for every API call
- **Store tokens securely** — never in client-side code, local storage, or version control

### Rate Limit Management

- **Monitor `Ratelimit-Remaining`** and throttle requests proactively when approaching zero
- **Use app access tokens for public data** to preserve per-user rate limit budgets
- **Batch requests where possible** — use multi-ID parameters (e.g., `?id=123&id=456`) instead of individual requests
- **Cache responses** — many data types (user profiles, game info) change infrequently

### Pagination Best Practices

- **Always paginate to completion** if you need the full dataset — do not assume a fixed number of pages
- **Deduplicate results** using unique IDs when paginating dynamic data
- **Set appropriate page sizes** — use `first=100` (max) to minimize the number of requests
- **Process pages as they arrive** rather than collecting all pages before processing

### Error Handling

- **Parse error responses** — extract the `message` field for logging and debugging
- **Distinguish retryable from non-retryable errors** (see [Retry Strategy](#10-retry-strategy))
- **Log rate limit headers** with every request for debugging rate limit issues
- **Handle unexpected fields** — never fail on unknown keys in JSON responses

### Network Resilience

- **Set request timeouts** — do not wait indefinitely for a response (recommend 10-30 seconds)
- **Use connection pooling** for high-throughput applications
- **Implement circuit breakers** — if Twitch returns repeated 500/503 errors, back off completely before retrying

### Data Integrity

- **Store IDs as strings**, not integers
- **Parse timestamps with a proper library**, not string slicing
- **Handle empty arrays** (`[]`) and `null` values defensively
- **Do not hardcode enum values** — new values may be added at any time

### Security

- **Never expose your Client Secret** in client-side code or public repositories
- **Use HTTPS exclusively** — Twitch APIs require it
- **Validate the `state` parameter** in OAuth flows to prevent CSRF attacks
- **Limit requested scopes** to only what your application needs

---

## 12. Known Issues & Community Notes

These are commonly reported issues and behaviors observed by the developer community. They may not be documented by Twitch.

### Ratelimit-Remaining Not Always Accurate

The `Ratelimit-Remaining` header does not always decrement by exactly 1 per request. Community reports indicate:

- The value may stay the same across consecutive requests
- It may jump down by more than the expected cost
- This is likely due to the distributed nature of Twitch's infrastructure where rate limit state is eventually consistent

**Workaround:** Do not rely solely on `Ratelimit-Remaining` for precise request budgeting. Use it as an approximation and always handle 429 responses gracefully.

### Token Validation Latency After Revocation

After revoking a token, it may still be accepted for a brief period (seconds to minutes) due to caching in Twitch's infrastructure.

**Workaround:** After revoking a token, do not assume it is immediately invalid. Implement your own tracking of revoked tokens if immediate invalidation is required.

### Pagination Cursors Are Not Resumable

If you save a pagination cursor and try to use it minutes or hours later, the results may be inconsistent or the cursor may be invalid. Cursors are designed for immediate sequential use, not for bookmarking positions in a dataset.

### GET Requests Returning 200 for Missing Resources

Many GET endpoints return `200 OK` with an empty `data` array when the requested resource does not exist, rather than returning `404 Not Found`. Always check the length of the `data` array, not just the HTTP status code.

### Rate Limit Bucket Behavior at Startup

When you first start making requests with a new token, the initial `Ratelimit-Remaining` value may not be exactly 800. This is normal — the bucket may already have been partially consumed by previous requests in the same time window.

### Inconsistent Date Format Precision

Some endpoints return timestamps with nanosecond precision (`2023-04-15T18:30:22.123456789Z`), while others return only second precision (`2023-04-15T18:30:22Z`). Your timestamp parser must handle variable precision.

### Empty String vs. Null vs. Missing

Different endpoints handle "no value" differently:

- Some return `null`
- Some return an empty string `""`
- Some omit the field entirely

Treat all three as "no value" in your application logic.

### Extension Rate Limits Are Truly Separate

Extension API rate limits are completely independent from Helix API rate limits. Hitting the Extension rate limit does not affect your Helix API quota, and vice versa.

---

## 13. Quick Reference Table

### Rate Limits at a Glance

| Aspect | Value |
|---|---|
| Algorithm | Token bucket |
| Default bucket size | 800 points |
| Refill rate | 800 points per minute |
| Default cost per request | 1 point |
| App access bucket scope | Per `client_id` |
| User access bucket scope | Per `client_id` + `user_id` |
| Extension limit | 30 requests/min per viewer |
| Rate exceeded response | HTTP 429 |
| Rate limit headers | `Ratelimit-Limit`, `Ratelimit-Remaining`, `Ratelimit-Reset` |

### Pagination at a Glance

| Aspect | Value |
|---|---|
| Type | Cursor-based |
| Forward parameter | `after` |
| Backward parameter | `before` (not always supported) |
| Page size parameter | `first` |
| Default page size | Varies by endpoint (commonly 20) |
| Max page size | Varies by endpoint (commonly 100) |
| End-of-results indicator | Empty `pagination` object |
| Cursor format | Opaque base64-encoded string |

### Required Headers

| Header | Value | When |
|---|---|---|
| `Authorization` | `Bearer <token>` | Every request |
| `Client-Id` | `<client_id>` | Every request |
| `Content-Type` | `application/json` | POST/PATCH/PUT with JSON body |

### Data Formats

| Data Type | Format | Example |
|---|---|---|
| IDs | Opaque string | `"141981764"` |
| Timestamps | RFC 3339 (UTC) | `"2023-04-15T18:30:22Z"` |
| Booleans | JSON boolean | `true` / `false` |
| Enums | Case-sensitive string | `"live"`, `"affiliate"` |
| Empty results | Empty array | `"data": []` |
| No value | `null`, `""`, or omitted | Varies by endpoint |

### Error Codes Summary

| Code | Name | Retryable | Action |
|---|---|---|---|
| 400 | Bad Request | No | Fix request parameters |
| 401 | Unauthorized | Once | Refresh token, retry |
| 403 | Forbidden | No | Check scopes/permissions |
| 404 | Not Found | No | Fix resource ID or path |
| 409 | Conflict | No | Resolve conflict |
| 422 | Unprocessable Entity | No | Fix request content |
| 429 | Too Many Requests | Yes | Wait for `Ratelimit-Reset` |
| 500 | Internal Server Error | Yes | Exponential backoff |
| 503 | Service Unavailable | Yes | Exponential backoff |

### Retry Backoff Schedule

| Attempt | Wait Time (approx.) |
|---|---|
| 1 | 1 second + jitter |
| 2 | 2 seconds + jitter |
| 3 | 4 seconds + jitter |
| 4 | 8 seconds + jitter |
| 5 | 16 seconds + jitter |
| Max | 60 seconds |
