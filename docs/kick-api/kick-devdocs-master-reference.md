---
title: "Kick Developer Docs -- Master Reference"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Kick Developer Docs -- Master Reference

> **Source:** https://github.com/KickEngineering/KickDevDocs
> **Live Docs:** https://docs.kick.com
> **Last verified:** 2026-02-13
> **API Base URL:** `https://api.kick.com/public/v1`
> **OAuth Server:** `https://id.kick.com`

## Overview

This is the comprehensive master reference for the Kick Developer API, synthesized from the official KickDevDocs GitHub repository and the docs.kick.com documentation site. It covers all API endpoints, OAuth authentication, webhook events, and cross-cutting concerns for building applications on the Kick streaming platform.

---

## Repository Structure Map

```
KickEngineering/KickDevDocs/
├── .gitbook/
│   ├── assets/                          # Images (logos, hero banners)
│   └── includes/untitled.md             # Shared content includes
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md                # Bug report template
│   │   └── feature_request.md           # Feature request template
├── apis/
│   ├── categories.md                    # Categories API (v1 + v2)
│   ├── channel-rewards.md               # Channel Rewards CRUD + Redemptions
│   ├── channels.md                      # Channels API (GET + PATCH)
│   ├── chat.md                          # Chat API (Send + Delete)
│   ├── faqs.md                          # API FAQs (verification, testing)
│   ├── kicks.md                         # KICKs Leaderboard API
│   ├── livestreams.md                   # Livestreams API (info + stats)
│   ├── moderation.md                    # Moderation API (ban/unban)
│   ├── public-key.md                    # Public Key API
│   └── users.md                         # Users API
├── community/
│   └── community-projects.md            # Community libraries & SDKs
├── drops/
│   ├── drops-guide.md                   # Drops implementation guide
│   └── drops-faqs.md                    # Drops FAQs
├── events/
│   ├── introduction.md                  # Events system overview
│   ├── webhook-security.md              # Signature verification
│   ├── subscribe-to-events.md           # Subscription management
│   └── event-types.md                   # All webhook payload schemas
├── getting-started/
│   ├── kick-apps-setup.md               # App creation guide
│   └── generating-tokens-oauth2-flow.md # OAuth 2.1 implementation
├── organizations/
│   └── organization-management.md       # Organization setup & management
├── scopes/
│   └── scopes.md                        # OAuth scope reference
├── readme/
│   └── contributing.md                  # Contributing guidelines
├── .gitignore
├── CONTRIBUTING.md
├── README.md                            # Project overview + roadmap
├── SUMMARY.md                           # Table of contents
└── changelog.md                         # API changelog
```

---

## API Categories Summary

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Users** | 1 | User profile information |
| **Channels** | 2 | Channel metadata + stream updates |
| **Channel Rewards** | 7 | Reward CRUD + redemption management |
| **Chat** | 2 | Send messages + delete messages |
| **Moderation** | 2 | Ban/unban users |
| **Livestreams** | 2 | Livestream info + statistics |
| **KICKs** | 1 | KICKs leaderboard |
| **Categories** | 3 | Category listing (v1 + v2) |
| **Public Key** | 1 | RSA public key for verification |
| **Events** | 3 | Webhook subscription management |
| **OAuth** | 5 | Auth, token, refresh, revoke, introspect |
| **Total** | **29** | |

---

## Cross-Cutting Concerns

### Base URLs

| Service | URL | Purpose |
|---------|-----|---------|
| API Server | `https://api.kick.com/public/v1` | All REST API endpoints |
| OAuth Server | `https://id.kick.com` | Authentication and token management |
| OpenAPI Spec | `https://api.kick.com/swagger/doc.yaml` | Machine-readable API spec |
| Live Docs | `https://docs.kick.com` | Human-readable documentation |

### API Versioning

- Current API version: `v1` (path prefix: `/public/v1`)
- Categories API has a `v2` version (`/public/v2/categories`) with improved filters and pagination
- Categories `v1` endpoints are **deprecated** as of 15/01/2026
- Event versions are indicated by the `Kick-Event-Version` header (currently `1` for all events)

### Authentication Model

| Token Type | How to Get | What It Accesses | Refresh |
|------------|-----------|-----------------|---------|
| App Access Token | `POST /oauth/token` (client_credentials) | Public data only | Request new token |
| User Access Token | `POST /oauth/token` (authorization_code + PKCE) | User-specific data based on scopes | Use refresh_token |

**Authorization header format:** `Authorization: Bearer <access_token>`

### Rate Limits

Rate limits are not comprehensively documented. Known limits:

| Resource | Limit | Notes |
|----------|-------|-------|
| Event subscriptions | ~250 per app (default) | Verified apps: 1,000-10,000 |
| Chat messages | Undocumented quota | Low for unverified apps; contact support |
| API requests | Undocumented | Some users report 403 during high volume |

### Standard Error Format

Most API errors follow this structure:

```json
{
  "error": "Error message",
  "message": "Detailed description"
}
```

Common HTTP status codes:

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad Request -- invalid parameters |
| `401` | Unauthorized -- invalid/expired token |
| `403` | Forbidden -- insufficient scope or permissions |
| `404` | Not Found -- resource does not exist |
| `429` | Too Many Requests -- rate limit exceeded |
| `500` | Internal Server Error -- Kick-side issue |

### Standard Response Format

Successful responses typically follow:

```json
{
  "data": { ... },
  "message": "OK"
}
```

Or for lists:

```json
{
  "data": [ ... ],
  "pagination": {
    "cursor": "..."
  },
  "message": "OK"
}
```

---

## Complete Scope Reference Table

| Scope | Description | Category |
|-------|-------------|----------|
| `user:read` | View user information (username, streamer ID, etc.) | User |
| `channel:read` | View channel information (description, category, etc.) | Channel |
| `channel:write` | Update livestream metadata via channel ID | Channel |
| `channel:rewards:read` | Retrieve channel points reward data | Channel Rewards |
| `channel:rewards:write` | CRUD channel points rewards | Channel Rewards |
| `chat:write` | Send chat messages / bot posting | Chat |
| `streamkey:read` | Read stream URL and stream key | Stream |
| `events:subscribe` | Subscribe to webhook events | Events |
| `moderation:ban` | Execute ban/unban operations | Moderation |
| `moderation:chat_message:manage` | Delete chat messages | Moderation |
| `kicks:read` | View KICKs leaderboards | KICKs |

---

## Complete Endpoint Index

### OAuth Endpoints (id.kick.com)

| Method | Path | Token | Scope | Description | Ref |
|--------|------|-------|-------|-------------|-----|
| `GET` | `/oauth/authorize` | None | -- | Redirect user for authorization | [OAuth](./kick-oauth2-flow.md) |
| `POST` | `/oauth/token` | None | -- | Exchange code / client credentials / refresh | [OAuth](./kick-oauth2-flow.md) |
| `POST` | `/oauth/revoke` | None | -- | Revoke a token | [OAuth](./kick-oauth2-flow.md) |
| `POST` | `/oauth/token/introspect` | App/User | None | Check token validity | [OAuth](./kick-oauth2-flow.md) |

### API Endpoints (api.kick.com/public/v1)

| Method | Path | Token | Scope | Description | Ref |
|--------|------|-------|-------|-------------|-----|
| `GET` | `/users` | User | `user:read` | Get user information | [Users](./kick-users-api.md) |
| `GET` | `/channels` | App/User | `channel:read` | Get channel information | [Channels](./kick-channels-api.md) |
| `PATCH` | `/channels` | User | `channel:write` | Update stream metadata | [Channels](./kick-channels-api.md) |
| `GET` | `/channels/rewards` | User | `channel:rewards:read` | List channel rewards | [Rewards](./kick-channel-rewards-api.md) |
| `POST` | `/channels/rewards` | User | `channel:rewards:write` | Create channel reward | [Rewards](./kick-channel-rewards-api.md) |
| `PATCH` | `/channels/rewards/{id}` | User | `channel:rewards:write` | Update channel reward | [Rewards](./kick-channel-rewards-api.md) |
| `DELETE` | `/channels/rewards/{id}` | User | `channel:rewards:write` | Delete channel reward | [Rewards](./kick-channel-rewards-api.md) |
| `GET` | `/channels/rewards/redemptions` | User | `channel:rewards:read` | List redemptions | [Rewards](./kick-channel-rewards-api.md) |
| `POST` | `/channels/rewards/redemptions/accept` | User | `channel:rewards:write` | Accept a redemption | [Rewards](./kick-channel-rewards-api.md) |
| `POST` | `/channels/rewards/redemptions/reject` | User | `channel:rewards:write` | Reject a redemption | [Rewards](./kick-channel-rewards-api.md) |
| `POST` | `/chat` | User | `chat:write` | Send chat message | [Chat](./kick-chat-api.md) |
| `DELETE` | `/chat/{message_id}` | User | `moderation:chat_message:manage` | Delete chat message | [Chat](./kick-chat-api.md) |
| `POST` | `/moderation/bans` | User | `moderation:ban` | Ban/timeout user | [Moderation](./kick-moderation-api.md) |
| `DELETE` | `/moderation/bans` | User | `moderation:ban` | Unban user | [Moderation](./kick-moderation-api.md) |
| `GET` | `/livestreams` | App/User | [VERIFY] | Get livestream info | -- |
| `GET` | `/livestreams/stats` | App/User | [VERIFY] | Get livestream stats | -- |
| `GET` | `/kicks/leaderboard` | App/User | `kicks:read` | Get KICKs leaderboard | [KICKs](./kick-kicks-api.md) |
| `GET` | `/categories` | App/User | None [VERIFY] | List categories (v1, deprecated) | -- |
| `GET` | `/v2/categories` | App/User | None [VERIFY] | List categories (v2) | -- |
| `GET` | `/categories/{id}` | App/User | None [VERIFY] | Get category by ID | -- |
| `GET` | `/public-key` | None [VERIFY] | None | Get RSA public key | [Public Key](./kick-public-key-api.md) |
| `GET` | `/events/subscriptions` | App/User | `events:subscribe` | List event subscriptions | [Subscribe](./kick-subscribe-to-events.md) |
| `POST` | `/events/subscriptions` | App/User | `events:subscribe` | Create event subscription | [Subscribe](./kick-subscribe-to-events.md) |
| `DELETE` | `/events/subscriptions` | App/User | `events:subscribe` | Delete event subscription | [Subscribe](./kick-subscribe-to-events.md) |

### Webhook Events

| Event Name | Version | Description | Ref |
|------------|---------|-------------|-----|
| `chat.message.sent` | 1 | Chat message sent | [Events](./kick-webhook-payloads-event-types.md) |
| `channel.followed` | 1 | User followed channel | [Events](./kick-webhook-payloads-event-types.md) |
| `channel.subscription.renewal` | 1 | Subscription renewed | [Events](./kick-webhook-payloads-event-types.md) |
| `channel.subscription.gifts` | 1 | Subscriptions gifted | [Events](./kick-webhook-payloads-event-types.md) |
| `channel.subscription.new` | 1 | New subscription | [Events](./kick-webhook-payloads-event-types.md) |
| `channel.reward.redemption.updated` | 1 | Reward redeemed/accepted/rejected | [Events](./kick-webhook-payloads-event-types.md) |
| `livestream.status.updated` | 1 | Stream started/ended | [Events](./kick-webhook-payloads-event-types.md) |
| `livestream.metadata.updated` | 1 | Stream metadata changed | [Events](./kick-webhook-payloads-event-types.md) |
| `moderation.banned` | 1 | User banned from channel | [Events](./kick-webhook-payloads-event-types.md) |
| `kicks.gifted` | 1 | KICKs gifted to channel | [Events](./kick-webhook-payloads-event-types.md) |

---

## Changelog

### 15/01/2026
- New Categories V2 endpoint with improved filters and pagination; V1 deprecated
- Token introspect endpoint moved from `/public/v1/token/introspect` to `/oauth/token/introspect` on `id.kick.com`
- API testing available directly via Kick Dev Docs UI
- Channel Reward Redemptions APIs: retrieval by ID/status/reward, accept and reject endpoints

### 19/12/2025
- Disabling webhooks now automatically unsubscribes from all webhook events
- Custom tags updates via PATCH endpoint fixed
- Livestreams endpoint now returns broadcaster's profile picture

### 12/12/2025
- Apps failing webhook processing for over 24 hours are auto-unsubscribed
- Profile picture endpoints corrected
- Category details endpoints corrected

### 03/12/2025
- Channel Rewards APIs added (CRUD for rewards)
- New `channel.reward.redemption.updated` webhook event

---

## Getting Started Guide Synthesis

### Step 1: Create a Kick Account & Enable 2FA

1. Create a Kick account at [kick.com](https://kick.com)
2. Navigate to Account Settings
3. Enable Two-Factor Authentication (2FA)

### Step 2: Create a Kick App

1. Go to Account Settings > Developer tab
2. Click "Create App"
3. Configure your app:
   - **App Name:** Your application's name
   - **Redirect URI:** Your OAuth callback URL (e.g., `https://yourapp.com/callback`)
   - **Webhook URL:** Your publicly accessible webhook endpoint (HTTPS required)
4. Save your **Client ID** and **Client Secret** securely

### Step 3: Obtain an Access Token

**For server-to-server (public data):**
```bash
curl -X POST https://id.kick.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_ID&client_secret=YOUR_SECRET"
```

**For user-specific data:** Implement the [OAuth 2.1 Authorization Code + PKCE flow](./kick-oauth2-flow.md).

### Step 4: Make Your First API Call

```bash
curl -X GET "https://api.kick.com/public/v1/channels?slug=xqc" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Step 5: Subscribe to Events

```bash
curl -X POST https://api.kick.com/public/v1/events/subscriptions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event": "chat.message.sent", "version": 1, "broadcaster_user_id": 123456}'
```

### Step 6: Verify Webhook Signatures

Implement [signature verification](./kick-webhook-security.md) using Kick's RSA public key before processing any webhook payload.

---

## Organization & App Setup Flow

```
Create Kick Account
       |
       v
Enable 2FA
       |
       v
Create App (Developer tab)
       |
       +--> Get Client ID + Client Secret
       |
       +--> Set Redirect URI
       |
       +--> Set Webhook URL (HTTPS)
       |
       +--> Enable Webhook Toggle
       |
       v
Optional: Create Organization
       |
       +--> Email developers@kick.com
       +--> Provide org details, member usernames
       +--> Get access to Drops management
       |
       v
Optional: App Verification
       |
       +--> Email developers@kick.com
       +--> Provide Client ID, justification
       +--> Get verified badge + higher limits
```

---

## Community Libraries & SDKs

| Language | Library | Notes |
|----------|---------|-------|
| Python | Kick.com Python Package (PyPI) | Community maintained |
| Python | pyKickAPI (GitHub) | Community maintained |
| Python | kickcom.py | Async client |
| JavaScript/TypeScript | Kient | TypeScript client |
| JavaScript/TypeScript | NodeJS OAuth examples | Various community implementations |
| PHP | PHP Kick client | Community maintained |
| C# / .NET | .NET client | Community maintained |
| Java | Kick4j | Java library |
| Go | Golang Kick SDK | Community maintained |

> **Disclaimer:** These are community projects. Verify security and suitability before use.

---

## Best Practices & Production Hardening

### Authentication
- Use PKCE (S256) for all Authorization Code flows
- Store `client_secret` server-side only; never in frontend or mobile apps
- Implement proactive token refresh before expiry
- Handle the `127.0.0.1` redirect URI bug with the sacrificial parameter workaround

### Webhook Processing
- **Always verify signatures** before processing any webhook payload
- Use `Kick-Event-Message-Id` for idempotent processing (deduplication)
- Validate `Kick-Event-Message-Timestamp` to prevent replay attacks (5-10 min window)
- Respond with `200 OK` within 3 seconds; process events asynchronously
- Monitor webhook health to prevent auto-unsubscription (24-hour failure threshold)

### Bot Development
- **CRITICAL: Prevent infinite loops** by checking `sender.user_id` against your bot's ID
- Create a dedicated bot account for chat operations
- Request app verification for higher message quotas and subscription limits

### Security
- HTTPS-only for webhook endpoints and redirect URIs
- Store all secrets in environment variables or secrets managers
- Never log access tokens, client secrets, or signature values
- Cache the RSA public key with a 24-hour TTL; re-fetch on verification failure

### Error Handling
- Implement exponential backoff for rate limit (429) responses
- Handle 403 security policy blocks gracefully (may be transient)
- Non-existent channels return `200` with empty data (not `404`)
- Batch channel lookups in groups of 25 to avoid data corruption

### Logging
- Log: event types, message IDs, timestamps, HTTP status codes, processing outcomes
- Never log: access tokens, refresh tokens, client secrets, PII, signature values

---

## Known Issues & Community Notes

### Critical / High Impact

| # | Title | Status | Impact |
|---|-------|--------|--------|
| [#321](https://github.com/KickEngineering/KickDevDocs/issues/321) | Channels batch >25 returns corrupted data | Open | Use batch size ≤25 |
| [#334](https://github.com/KickEngineering/KickDevDocs/issues/334) | OAuth broken on mobile (Universal Links) | Open | Mobile OAuth impossible |
| [#315](https://github.com/KickEngineering/KickDevDocs/issues/315) | Webhook fires for failed gift sub payments | Open | False positive events |
| [#337](https://github.com/KickEngineering/KickDevDocs/issues/337) | Subscriber count excludes gifted subs | Open | Inaccurate counts |
| [#338](https://github.com/KickEngineering/KickDevDocs/issues/338) | DELETE with body (moderation) violates HTTP spec | Open | Client compatibility |
| [#218](https://github.com/KickEngineering/KickDevDocs/issues/218) | OpenAPI spec invalid syntax | Open | Cannot import to Postman |

### Feature Requests (Popular)

| # | Title | Votes | Status |
|---|-------|-------|--------|
| [#107](https://github.com/KickEngineering/KickDevDocs/issues/107) | Livestream listing endpoint | 88 reactions | Closed (implemented) |
| [#104](https://github.com/KickEngineering/KickDevDocs/issues/104) | Get channel followers endpoint | 7 reactions | Open |
| [#102](https://github.com/KickEngineering/KickDevDocs/issues/102) | Raid endpoint + events | -- | Open |
| [#111](https://github.com/KickEngineering/KickDevDocs/issues/111) | Device Code / QR auth flow | -- | Open |
| [#323](https://github.com/KickEngineering/KickDevDocs/issues/323) | Emotes/emoji endpoint | -- | Open |
| [#336](https://github.com/KickEngineering/KickDevDocs/issues/336) | Badge image URLs in webhooks | -- | Open |
| [#332](https://github.com/KickEngineering/KickDevDocs/issues/332) | Viewer watchtime data API | -- | Open |
| [#339](https://github.com/KickEngineering/KickDevDocs/issues/339) | Bot profiles + invite action | -- | Open |

### Documentation Issues

| # | Title | Status |
|---|-------|--------|
| [#220](https://github.com/KickEngineering/KickDevDocs/issues/220) | `is_anonymous` field purpose undocumented | Open |
| [#229](https://github.com/KickEngineering/KickDevDocs/issues/229) | JSON payloads have syntax errors | Open (PR) |
| [#217](https://github.com/KickEngineering/KickDevDocs/issues/217) | Inconsistent ban behavior API vs web | Open |

---

## File Reference Index

| File | Covers |
|------|--------|
| [kick-webhook-payloads-event-types.md](./kick-webhook-payloads-event-types.md) | All 10 event types with full payload schemas |
| [kick-subscribe-to-events.md](./kick-subscribe-to-events.md) | GET/POST/DELETE subscription endpoints |
| [kick-webhook-security.md](./kick-webhook-security.md) | RSA signature verification, headers, code examples |
| [kick-channel-rewards-api.md](./kick-channel-rewards-api.md) | 7 reward CRUD + redemption endpoints |
| [kick-kicks-api.md](./kick-kicks-api.md) | KICKs leaderboard endpoint |
| [kick-oauth2-flow.md](./kick-oauth2-flow.md) | Complete OAuth 2.1 with PKCE, all flows |
| [kick-scopes-reference.md](./kick-scopes-reference.md) | All 11 scopes with endpoint mappings |
| [kick-users-api.md](./kick-users-api.md) | User information endpoint |
| [kick-channels-api.md](./kick-channels-api.md) | Channel GET + PATCH endpoints |
| [kick-chat-api.md](./kick-chat-api.md) | Send/delete messages, bot patterns |
| [kick-moderation-api.md](./kick-moderation-api.md) | Ban/unban/timeout endpoints |
| [kick-public-key-api.md](./kick-public-key-api.md) | RSA public key retrieval and caching |
| [kick-devdocs-master-reference.md](./kick-devdocs-master-reference.md) | This file -- master reference |

---

## Quick Reference Table: All Endpoints

| # | Method | Full Path | Token | Scope | Description |
|---|--------|-----------|-------|-------|-------------|
| 1 | `GET` | `id.kick.com/oauth/authorize` | -- | -- | OAuth authorization |
| 2 | `POST` | `id.kick.com/oauth/token` | -- | -- | Token exchange/refresh/client-creds |
| 3 | `POST` | `id.kick.com/oauth/revoke` | -- | -- | Revoke token |
| 4 | `POST` | `id.kick.com/oauth/token/introspect` | App/User | -- | Introspect token |
| 5 | `GET` | `/public/v1/users` | User | `user:read` | Get user info |
| 6 | `GET` | `/public/v1/channels` | App/User | `channel:read` | Get channel info |
| 7 | `PATCH` | `/public/v1/channels` | User | `channel:write` | Update channel |
| 8 | `GET` | `/public/v1/channels/rewards` | User | `channel:rewards:read` | List rewards |
| 9 | `POST` | `/public/v1/channels/rewards` | User | `channel:rewards:write` | Create reward |
| 10 | `PATCH` | `/public/v1/channels/rewards/{id}` | User | `channel:rewards:write` | Update reward |
| 11 | `DELETE` | `/public/v1/channels/rewards/{id}` | User | `channel:rewards:write` | Delete reward |
| 12 | `GET` | `/public/v1/channels/rewards/redemptions` | User | `channel:rewards:read` | List redemptions |
| 13 | `POST` | `/public/v1/channels/rewards/redemptions/accept` | User | `channel:rewards:write` | Accept redemption |
| 14 | `POST` | `/public/v1/channels/rewards/redemptions/reject` | User | `channel:rewards:write` | Reject redemption |
| 15 | `POST` | `/public/v1/chat` | User | `chat:write` | Send message |
| 16 | `DELETE` | `/public/v1/chat/{message_id}` | User | `moderation:chat_message:manage` | Delete message |
| 17 | `POST` | `/public/v1/moderation/bans` | User | `moderation:ban` | Ban/timeout user |
| 18 | `DELETE` | `/public/v1/moderation/bans` | User | `moderation:ban` | Unban user |
| 19 | `GET` | `/public/v1/livestreams` | App/User | [VERIFY] | Get livestream info |
| 20 | `GET` | `/public/v1/livestreams/stats` | App/User | [VERIFY] | Get livestream stats |
| 21 | `GET` | `/public/v1/kicks/leaderboard` | App/User | `kicks:read` | Get KICKs leaderboard |
| 22 | `GET` | `/public/v1/categories` | App/User | [VERIFY] | List categories (v1, deprecated) |
| 23 | `GET` | `/public/v2/categories` | App/User | [VERIFY] | List categories (v2) |
| 24 | `GET` | `/public/v1/categories/{id}` | App/User | [VERIFY] | Get category by ID |
| 25 | `GET` | `/public/v1/public-key` | None [VERIFY] | -- | Get RSA public key |
| 26 | `GET` | `/public/v1/events/subscriptions` | App/User | `events:subscribe` | List subscriptions |
| 27 | `POST` | `/public/v1/events/subscriptions` | App/User | `events:subscribe` | Create subscription |
| 28 | `DELETE` | `/public/v1/events/subscriptions` | App/User | `events:subscribe` | Delete subscription |
