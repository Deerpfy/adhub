# Twitch API — Getting Started

> **Source:** https://dev.twitch.tv/docs/api/get-started, https://dev.twitch.tv/docs/cli/
> **Last verified:** 2025-05-01 — [PAGE INACCESSIBLE - VERIFY AGAINST LIVE DOCS]
> **API Base URL:** `https://api.twitch.tv/helix`
> **Auth Base URL:** `https://id.twitch.tv`
> **EventSub WebSocket:** `wss://eventsub.wss.twitch.tv/ws`

## Overview

This guide walks you through registering a Twitch application, obtaining your first access token, and making your first API call. It also covers the Twitch CLI for local development and testing.

### Prerequisites

- A Twitch account (create one at https://www.twitch.tv)
- Two-factor authentication enabled on your Twitch account (required for developer access)

## Step 1: Register Your Application

1. Go to the [Twitch Developer Console](https://dev.twitch.tv/console)
2. Click **Register Your Application**
3. Fill in the required fields:
   - **Name** — A unique name for your application
   - **OAuth Redirect URLs** — The URL(s) where Twitch will redirect users after authorization (e.g., `http://localhost:3000/auth/callback` for development)
   - **Category** — Select the category that best describes your app
   - **Client Type** — Confidential (server-side apps with a client secret) or Public (client-side apps, mobile apps)
4. Click **Create**
5. Note your **Client ID** — this is public and included in every API request
6. Generate a **Client Secret** — keep this confidential and never expose it in client-side code

### Important Notes on App Registration

- You can register up to 5 applications per Twitch account
- OAuth redirect URLs must use HTTPS in production (localhost is exempt during development)
- The Client Secret can be regenerated, but doing so invalidates all existing tokens
- Your app name must be unique across all Twitch applications

## Step 2: Get an Access Token

Twitch uses OAuth 2.0 for authentication. There are two primary token types:

### App Access Token (Client Credentials)

Use for server-to-server requests that don't require user authorization.

```bash
curl -X POST 'https://id.twitch.tv/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=YOUR_CLIENT_ID' \
  -d 'client_secret=YOUR_CLIENT_SECRET' \
  -d 'grant_type=client_credentials'
```

**Response:**
```json
{
  "access_token": "jostpf5q0puzmxmkba9iyug38kjtg",
  "expires_in": 5011271,
  "token_type": "bearer"
}
```

### User Access Token (Authorization Code Grant)

Use when you need to act on behalf of a user.

1. Redirect the user to:
```
https://id.twitch.tv/oauth2/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=YOUR_REDIRECT_URI
  &scope=user:read:email
```

2. After the user authorizes, Twitch redirects to your callback URL with a `code` parameter
3. Exchange the code for a token:

```bash
curl -X POST 'https://id.twitch.tv/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=YOUR_CLIENT_ID' \
  -d 'client_secret=YOUR_CLIENT_SECRET' \
  -d 'code=AUTHORIZATION_CODE' \
  -d 'grant_type=authorization_code' \
  -d 'redirect_uri=YOUR_REDIRECT_URI'
```

**Response:**
```json
{
  "access_token": "rfx2uswqe8l4g1mkagrvg5tv0ks3",
  "expires_in": 14346,
  "refresh_token": "5b93chm6hdve3mycz05zfzatkfdenfsyin1hmjdcxjh18kxg6",
  "scope": ["user:read:email"],
  "token_type": "bearer"
}
```

## Step 3: Make Your First API Call

Every Twitch API request requires two headers:

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer YOUR_ACCESS_TOKEN` |
| `Client-Id` | `YOUR_CLIENT_ID` |

### Example: Get Users

```bash
curl -X GET 'https://api.twitch.tv/helix/users?login=twitchdev' \
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
      "description": "Supporting third-party developers building Twitch integrations from chatbots to game integrations.",
      "profile_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/8a6381c7-d0c0-4576-b179-38bd5ce1d6af-profile_image-300x300.png",
      "offline_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/3f13ab61-ec78-4fe6-8481-8682cb3b0ac2-channel_offline_image-1920x1080.png",
      "view_count": 0,
      "created_at": "2016-12-14T20:32:28Z"
    }
  ]
}
```

### Twitch CLI Example

```bash
twitch api get /users -q login=twitchdev
```

## Step 4: Validate Your Token

Twitch requires periodic token validation (at least once per hour).

```bash
curl -X GET 'https://id.twitch.tv/oauth2/validate' \
  -H 'Authorization: OAuth YOUR_ACCESS_TOKEN'
```

**Response (valid token):**
```json
{
  "client_id": "wbmytr93xzw8zbg0p1izqyzzc5mbiz",
  "login": "twitchdev",
  "scopes": ["user:read:email"],
  "user_id": "141981764",
  "expires_in": 5520838
}
```

**Response (invalid token):**
```json
{
  "status": 401,
  "message": "invalid access token"
}
```

## Twitch CLI Setup

The Twitch CLI is an official command-line tool for testing and development.

### Installation

```bash
# macOS (Homebrew)
brew install twitchdev/twitch/twitch-cli

# Windows (Scoop)
scoop bucket add twitch https://github.com/twitchdev/scoop-bucket.git
scoop install twitch-cli

# Go install
go install github.com/twitchdev/twitch-cli/cmd/twitch@latest

# Or download binaries from GitHub Releases
# https://github.com/twitchdev/twitch-cli/releases
```

### Configuration

```bash
twitch configure
# Enter your Client ID and Client Secret when prompted
```

### Getting a Token via CLI

```bash
# App access token
twitch token

# User access token (opens browser)
twitch token -u -s 'user:read:email channel:read:subscriptions'
```

### Available CLI Commands

| Command | Description |
|---------|-------------|
| `twitch api get` | Make GET requests to the Twitch API |
| `twitch api post` | Make POST requests to the Twitch API |
| `twitch api patch` | Make PATCH requests |
| `twitch api delete` | Make DELETE requests |
| `twitch token` | Get an access token |
| `twitch event trigger` | Trigger mock EventSub events |
| `twitch event verify-subscription` | Test webhook subscription verification |
| `twitch event websocket start-server` | Start a local mock WebSocket server |
| `twitch mock-api generate` | Generate mock data |
| `twitch mock-api start` | Start the mock API server |

### CLI API Examples

```bash
# Get channel information
twitch api get /channels -q broadcaster_id=141981764

# Search for categories
twitch api get /search/categories -q query=fortnite

# Start a commercial
twitch api post /channels/commercial -b '{"broadcaster_id":"141981764","length":30}'

# Modify channel info
twitch api patch /channels -q broadcaster_id=141981764 -b '{"game_id":"33214"}'
```

## Developer Console Overview

The [Twitch Developer Console](https://dev.twitch.tv/console) provides:

- **Applications** — Manage registered apps, view/regenerate Client IDs and secrets
- **Extensions** — Create and manage Twitch Extensions
- **Event Subscriptions** — View and manage EventSub webhook subscriptions
- **Analytics** — View extension and game analytics
- **Organizations** — Manage developer organizations

### Console URL Structure

| Page | URL |
|------|-----|
| Dashboard | `https://dev.twitch.tv/console` |
| Applications | `https://dev.twitch.tv/console/apps` |
| Create App | `https://dev.twitch.tv/console/apps/create` |
| Extensions | `https://dev.twitch.tv/console/extensions` |

## Required Headers for All API Requests

Every request to the Twitch Helix API must include:

```
Authorization: Bearer <access_token>
Client-Id: <client_id>
```

For POST/PATCH/PUT requests with a JSON body, also include:
```
Content-Type: application/json
```

## API Base URLs

| Service | URL |
|---------|-----|
| Helix API | `https://api.twitch.tv/helix` |
| Auth Server | `https://id.twitch.tv` |
| OAuth Authorize | `https://id.twitch.tv/oauth2/authorize` |
| OAuth Token | `https://id.twitch.tv/oauth2/token` |
| Token Validate | `https://id.twitch.tv/oauth2/validate` |
| Token Revoke | `https://id.twitch.tv/oauth2/revoke` |
| EventSub WebSocket | `wss://eventsub.wss.twitch.tv/ws` |

## Error Response Format

All Twitch API errors follow a consistent format:

```json
{
  "error": "Unauthorized",
  "status": 401,
  "message": "Invalid OAuth token"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 202 | Accepted (async operations like clip creation) |
| 204 | No Content (successful deletion) |
| 400 | Bad Request (invalid parameters) |
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden (insufficient scopes or permissions) |
| 404 | Not Found |
| 409 | Conflict (resource already exists) |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests (rate limit exceeded) |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## Data Format Conventions

- **IDs** — All IDs are opaque strings (do not parse or assume format)
- **Timestamps** — RFC 3339 format with nanosecond precision (e.g., `2023-04-15T18:30:22.123456789Z`)
- **Pagination** — Cursor-based using `after`/`before` query parameters
- **Enums** — String values (case-sensitive)
- **Booleans** — JSON `true`/`false`
- **Arrays** — Empty array `[]` when no results (never `null`)

## Best Practices & Production Hardening

### Security
- Never expose your Client Secret in client-side code, public repositories, or logs
- Store Client Secret and webhook secrets in environment variables or a secret manager
- Always use HTTPS for OAuth redirect URLs in production
- Validate tokens on startup and hourly thereafter
- Rotate Client Secret if it is ever compromised (this invalidates all existing tokens)

### Token Lifecycle
- Monitor `expires_in` and refresh tokens before they expire
- Handle 401 responses by refreshing or re-authenticating
- Validate tokens at least once per hour (Twitch requirement)
- App access tokens typically last ~60 days but can be invalidated at any time

### Rate Limiting
- Parse `Ratelimit-Limit`, `Ratelimit-Remaining`, and `Ratelimit-Reset` headers
- Implement exponential backoff on 429 responses
- Use the `Ratelimit-Reset` Unix timestamp to calculate wait time

### Error Handling
- Always check HTTP status codes before parsing response bodies
- Implement retry logic with exponential backoff for 429 and 503 errors
- Log error responses for debugging (never log tokens or secrets)

### Idempotency
- Use `Twitch-Eventsub-Message-Id` for deduplication of EventSub notifications
- EventSub uses at-least-once delivery — your handler may receive the same event multiple times

## Known Issues & Community Notes

- **Token validation enforcement**: Twitch conducts periodic audits. Apps that fail to validate tokens hourly may face throttling or key revocation.
- **Client Secret regeneration**: Regenerating your Client Secret immediately invalidates ALL tokens issued with the old secret. Plan accordingly.
- **Rate limit header quirks**: Some developers report `Ratelimit-Remaining` not always decrementing as expected. Always implement both reactive (429 handling) and proactive (header parsing) rate limiting.
- **Redirect URL matching**: Twitch requires exact match of redirect URIs (including trailing slashes). Mismatches result in silent failures.
- **Two-factor authentication**: 2FA must be enabled on the Twitch account used to register the application. Without it, you cannot access the Developer Console.
- **PubSub deprecated**: PubSub was fully decommissioned on April 14, 2025. Use EventSub instead.
- **IRC migration**: Twitch recommends migrating from IRC to EventSub for chat functionality.

### Useful Resources

- [Twitch Developer Documentation](https://dev.twitch.tv/docs/)
- [Twitch Developer Forums](https://discuss.dev.twitch.com/)
- [Twitch Developer Discord](https://discord.gg/twitchdev)
- [Twitch CLI GitHub](https://github.com/twitchdev/twitch-cli)
- [Twitch Developer Changelog](https://dev.twitch.tv/docs/change-log)

## Quick Reference Table

| Item | Value |
|------|-------|
| API Base URL | `https://api.twitch.tv/helix` |
| Auth Base URL | `https://id.twitch.tv` |
| EventSub WebSocket URL | `wss://eventsub.wss.twitch.tv/ws` |
| Developer Console | `https://dev.twitch.tv/console` |
| Required Headers | `Authorization: Bearer <token>`, `Client-Id: <id>` |
| Token Validation | `GET https://id.twitch.tv/oauth2/validate` (hourly) |
| Rate Limit | 800 points/minute (default) |
| Max Apps per Account | 5 |
| ID Format | Opaque strings |
| Timestamp Format | RFC 3339 with nanoseconds |
| CLI Install | `brew install twitchdev/twitch/twitch-cli` |
