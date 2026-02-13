# Kick Scopes Reference

> **Source:** https://docs.kick.com/getting-started/scopes
> **GitHub Raw:** https://github.com/KickEngineering/KickDevDocs/blob/main/scopes/scopes.md
> **Last verified:** 2026-02-13
> **API Base URL:** `https://api.kick.com/public/v1`

## Overview

OAuth scopes define the level of access your application has to Kick's API resources. Scopes are requested during the OAuth authorization step and are presented to the user on the consent screen. Users must approve the requested scopes before your application can access the corresponding API endpoints.

Scopes follow the format `resource:action` (e.g., `user:read`, `chat:write`).

---

## Complete Scope Table

| Scope | Description | Category |
|-------|-------------|----------|
| `user:read` | View user information in Kick including username, streamer ID, etc. | User (Read) |
| `channel:read` | View channel information in Kick including channel description, category, etc. | Channel (Read) |
| `channel:write` | Permits updates to livestream metadata via channel ID | Channel (Write) |
| `channel:rewards:read` | Retrieve channel points reward data | Channel Rewards (Read) |
| `channel:rewards:write` | Read, add, edit and delete channel points rewards on a channel | Channel Rewards (Write) |
| `chat:write` | Send chat messages and allow chat bots to post in your chat | Chat (Write) |
| `streamkey:read` | Read a user's stream URL and stream key | Stream (Read) |
| `events:subscribe` | Subscribe to all channel events on Kick e.g. chat messages, follows, subscriptions | Events (Read/Write) |
| `moderation:ban` | Execute user ban/unban operations | Moderation (Write) |
| `moderation:chat_message:manage` | Perform moderation on chat messages (delete messages) | Moderation (Write) |
| `kicks:read` | View KICKs related information in Kick e.g. leaderboards, etc. | KICKs (Read) |

---

## Scope-to-Endpoint Mapping

### User Scopes

| Scope | Endpoints |
|-------|-----------|
| `user:read` | `GET /public/v1/users` |

### Channel Scopes

| Scope | Endpoints |
|-------|-----------|
| `channel:read` | `GET /public/v1/channels` |
| `channel:write` | `PATCH /public/v1/channels` |

### Channel Rewards Scopes

| Scope | Endpoints |
|-------|-----------|
| `channel:rewards:read` | `GET /public/v1/channels/rewards`, `GET /public/v1/channels/rewards/redemptions` |
| `channel:rewards:write` | `POST /public/v1/channels/rewards`, `PATCH /public/v1/channels/rewards/{id}`, `DELETE /public/v1/channels/rewards/{id}`, `POST /public/v1/channels/rewards/redemptions/accept`, `POST /public/v1/channels/rewards/redemptions/reject` |

### Chat Scopes

| Scope | Endpoints |
|-------|-----------|
| `chat:write` | `POST /public/v1/chat` |

### Stream Scopes

| Scope | Endpoints |
|-------|-----------|
| `streamkey:read` | [VERIFY] Stream key retrieval endpoint (not explicitly documented in public API) |

### Events Scopes

| Scope | Endpoints |
|-------|-----------|
| `events:subscribe` | `GET /public/v1/events/subscriptions`, `POST /public/v1/events/subscriptions`, `DELETE /public/v1/events/subscriptions` |

### Moderation Scopes

| Scope | Endpoints |
|-------|-----------|
| `moderation:ban` | `POST /public/v1/moderation/bans`, `DELETE /public/v1/moderation/bans` |
| `moderation:chat_message:manage` | `DELETE /public/v1/chat/{message_id}` |

### KICKs Scopes

| Scope | Endpoints |
|-------|-----------|
| `kicks:read` | `GET /public/v1/kicks/leaderboard` |

---

## Scopes by Category

### Read Scopes

| Scope | What It Accesses |
|-------|-----------------|
| `user:read` | User profile information |
| `channel:read` | Channel metadata, description, category |
| `channel:rewards:read` | Channel point rewards and redemption data |
| `streamkey:read` | Stream URL and stream key (sensitive) |
| `kicks:read` | KICKs leaderboard data |

### Write Scopes

| Scope | What It Modifies |
|-------|-----------------|
| `channel:write` | Livestream metadata (title, category, tags) |
| `channel:rewards:write` | Channel point rewards (CRUD) and redemptions (accept/reject) |
| `chat:write` | Send chat messages |
| `moderation:ban` | Ban/unban users |
| `moderation:chat_message:manage` | Delete chat messages |

### Subscribe Scopes

| Scope | What It Enables |
|-------|----------------|
| `events:subscribe` | Subscribe to webhook events for any channel |

---

## Minimum Scope Sets for Common Use Cases

### Chat Bot

A bot that reads and responds to chat messages:

```
chat:write events:subscribe
```

- `chat:write` -- to send messages
- `events:subscribe` -- to subscribe to `chat.message.sent` events

### Stream Alerts / Notifications

An app that shows alerts for follows, subscriptions, and gifts:

```
events:subscribe
```

- `events:subscribe` -- to subscribe to `channel.followed`, `channel.subscription.new`, `channel.subscription.renewal`, `channel.subscription.gifts`, `kicks.gifted` events

### Reward Management

An app that manages channel point rewards and processes redemptions:

```
channel:rewards:read channel:rewards:write events:subscribe
```

- `channel:rewards:read` -- to list rewards and redemptions
- `channel:rewards:write` -- to create/update/delete rewards and accept/reject redemptions
- `events:subscribe` -- to get `channel.reward.redemption.updated` webhook events

### Moderation Bot

A bot that moderates chat by banning users and deleting messages:

```
chat:write moderation:ban moderation:chat_message:manage events:subscribe
```

- `chat:write` -- to send moderation notices
- `moderation:ban` -- to ban/unban/timeout users
- `moderation:chat_message:manage` -- to delete messages
- `events:subscribe` -- to receive `chat.message.sent` and `moderation.banned` events

### Analytics Dashboard

An app that displays channel statistics:

```
user:read channel:read kicks:read events:subscribe
```

- `user:read` -- to fetch user profiles
- `channel:read` -- to fetch channel information
- `kicks:read` -- to fetch KICKs leaderboard
- `events:subscribe` -- to track live events (follows, subs, etc.)

### Stream Manager

An app that manages stream settings:

```
channel:read channel:write streamkey:read
```

- `channel:read` -- to read current stream settings
- `channel:write` -- to update stream title, category, tags
- `streamkey:read` -- to display stream key/URL to the user

---

## How Scopes Are Requested

Scopes are included as a space-separated string in the `scope` parameter of the authorization URL:

```
GET https://id.kick.com/oauth/authorize?
    response_type=code&
    client_id=YOUR_CLIENT_ID&
    redirect_uri=https://yourapp.com/callback&
    scope=user:read channel:read chat:write events:subscribe&
    code_challenge=YOUR_CODE_CHALLENGE&
    code_challenge_method=S256&
    state=RANDOM_STATE
```

**Key rules:**
- Separate multiple scopes with spaces
- Only request scopes you actually need (principle of least privilege)
- Users see and must approve all requested scopes on the consent screen
- Granted scopes are returned in the token response `scope` field
- App Access Tokens (Client Credentials) do not use scopes in the same way -- they access public data regardless

---

## Scope Naming Convention

Scopes follow a hierarchical `resource:action` or `resource:sub-resource:action` pattern:

```
user:read                    -> resource:action
channel:read                 -> resource:action
channel:write                -> resource:action
channel:rewards:read         -> resource:sub-resource:action
channel:rewards:write        -> resource:sub-resource:action
moderation:ban               -> resource:action
moderation:chat_message:manage -> resource:sub-resource:action
```

Actions:
- `read` -- read-only access
- `write` -- create, update, delete access (often includes read)
- `manage` -- full management access
- `subscribe` -- subscribe to events
- `ban` -- specific ban/unban action

---

## Best Practices & Production Hardening

### Principle of Least Privilege

- Only request the scopes your application actually needs.
- Users are more likely to approve apps that request fewer permissions.
- You can request additional scopes later by redirecting the user through the OAuth flow again.

### Scope Validation

- After token exchange, verify the `scope` field in the response matches what you requested.
- Users may decline specific scopes in the future [VERIFY -- currently all-or-nothing].

### Token Refresh and Scopes

- Refreshed tokens maintain the same scopes as the original token.
- To change scopes, the user must re-authorize through the OAuth flow.

### Secure Secret Storage

- Store tokens securely; the scopes they carry determine access level.
- A token with `moderation:ban` scope can permanently ban users -- handle with care.

### Logging Recommendations

- Log which scopes are requested and granted for audit purposes.
- Never log access tokens or refresh tokens.

---

## Known Issues & Community Notes

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#222](https://github.com/KickEngineering/KickDevDocs/issues/222) | Create app has no bot flow | Closed | Bot setup requires specific scopes (`chat:write`) |
| [#219](https://github.com/KickEngineering/KickDevDocs/issues/219) | Chat API message quota too low | Closed | Message limits exist regardless of scopes |

### Missing Scopes / Undocumented

- There is no `chat:read` scope -- chat messages can only be received via webhook events (`events:subscribe`)
- There is no `moderation:read` scope -- moderator list retrieval requirements are undocumented
- There is no `livestream:read` scope -- livestream data may be accessible via App Access Token without specific scope [VERIFY]
- The `streamkey:read` scope's associated endpoint is not explicitly listed in the public API documentation

---

## Quick Reference Table

| Scope | Read/Write | Token Type | Primary Endpoints |
|-------|-----------|------------|-------------------|
| `user:read` | Read | User | `GET /users` |
| `channel:read` | Read | User | `GET /channels` |
| `channel:write` | Write | User | `PATCH /channels` |
| `channel:rewards:read` | Read | User | `GET /channels/rewards`, `GET /channels/rewards/redemptions` |
| `channel:rewards:write` | Write | User | `POST/PATCH/DELETE /channels/rewards`, `POST /redemptions/accept\|reject` |
| `chat:write` | Write | User | `POST /chat` |
| `streamkey:read` | Read | User | [VERIFY] |
| `events:subscribe` | Subscribe | App or User | `GET/POST/DELETE /events/subscriptions` |
| `moderation:ban` | Write | User | `POST/DELETE /moderation/bans` |
| `moderation:chat_message:manage` | Write | User | `DELETE /chat/{message_id}` |
| `kicks:read` | Read | App or User | `GET /kicks/leaderboard` |
