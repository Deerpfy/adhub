# Kick Webhook Payloads & Event Types

> **Source:** https://docs.kick.com/events/event-types
> **GitHub Raw:** https://github.com/KickEngineering/KickDevDocs/blob/main/events/event-types.md
> **Last verified:** 2026-02-13
> **API Base URL:** `https://api.kick.com/public/v1`

## Overview

Webhook payloads are HTTP POST request bodies sent by Kick to your registered webhook endpoint when specific events occur on the platform. Each event type has a unique payload structure delivered with identifying headers. Your endpoint must be publicly accessible over HTTPS and must respond with a `2xx` status code to acknowledge receipt.

Events are delivered with two custom HTTP headers that identify the event:

- `Kick-Event-Type` -- the event name string (e.g., `chat.message.sent`)
- `Kick-Event-Version` -- the schema version (currently `1` for all events)

Additionally, every webhook delivery includes security and idempotency headers documented in [kick-webhook-security.md](./kick-webhook-security.md).

---

## Events Table

| Event | Name | Version | Description |
|-------|------|---------|-------------|
| Chat Message | `chat.message.sent` | 1 | Fired when a message has been sent in a stream's chat. |
| Channel Follow | `channel.followed` | 1 | Fired when a user follows a channel. |
| Channel Subscription Renewal | `channel.subscription.renewal` | 1 | Fired when a user's subscription to a channel is renewed. |
| Channel Subscription Gifts | `channel.subscription.gifts` | 1 | Fired when a user gifts subscriptions to a channel. |
| Channel Subscription Created | `channel.subscription.new` | 1 | Fired when a user first subscribes to a channel. |
| Channel Reward Redemption Updated | `channel.reward.redemption.updated` | 1 | Fired when a channel reward is redeemed by a user. |
| Livestream Status Updated | `livestream.status.updated` | 1 | Fired when a stream's status has been updated (started or ended). |
| Livestream Metadata Updated | `livestream.metadata.updated` | 1 | Fired when a stream's metadata has been updated (e.g., title change). |
| Moderation Banned | `moderation.banned` | 1 | Fired when a user has been banned from a channel. |
| Kicks Gifted | `kicks.gifted` | 1 | Fired when a user gifts kicks to a channel. |

---

## Common User Object Schema

Most events include user objects (broadcaster, sender, follower, etc.) that share a common structure:

| Field | Type | Description |
|-------|------|-------------|
| `is_anonymous` | boolean | Whether the user is anonymous |
| `user_id` | number | Unique user identifier |
| `username` | string | The user's username |
| `is_verified` | boolean | Whether the user has a verified badge |
| `profile_picture` | string | URL to the user's profile picture |
| `channel_slug` | string | The user's channel slug |
| `identity` | object \| null | Visual identity info (color, badges). Currently `null` for broadcasters and reply senders |

### Identity Object Schema

When present (currently only on `sender` in `chat.message.sent`):

| Field | Type | Description |
|-------|------|-------------|
| `username_color` | string | Hex color code for the username (e.g., `"#FF5733"`) |
| `badges` | array | Array of badge objects |

### Badge Object Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Display text for the badge (e.g., `"Moderator"`) |
| `type` | string | Yes | Badge type identifier. Known values: `"moderator"`, `"sub_gifter"`, `"subscriber"` |
| `count` | number | No | Count associated with badge (e.g., months subscribed, number of gifts). Not present on all badge types |

> **Note:** Badge image URLs are NOT provided in webhook payloads. See [GitHub Issue #336](https://github.com/KickEngineering/KickDevDocs/issues/336) for the community request to add badge image URLs.

---

## Event 1: Chat Message (`chat.message.sent`)

### Headers

```
Kick-Event-Type: chat.message.sent
Kick-Event-Version: 1
```

### Payload Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message_id` | string | Yes | Unique identifier for the message |
| `replies_to` | object \| null | No | Parent message being replied to. `null` if not a reply |
| `broadcaster` | object | Yes | The channel owner (see Common User Object) |
| `sender` | object | Yes | The message sender (see Common User Object). Includes `identity` |
| `content` | string | Yes | Message text content with inline emote references in `[emote:ID:NAME]` format |
| `emotes` | array | Yes | Array of emote objects used in the message |
| `created_at` | string (ISO 8601) | Yes | Timestamp when the message was sent |

#### `replies_to` Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `message_id` | string | ID of the parent message |
| `content` | string | Text content of the parent message |
| `sender` | object | Sender of the parent message (Common User Object, `identity` is `null`) |

#### Emote Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `emote_id` | string | Unique emote identifier |
| `positions` | array | Array of position objects indicating where the emote appears in `content` |

#### Position Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `s` | number | Start index (inclusive) in the content string |
| `e` | number | End index (exclusive) in the content string |

### Example Payload

```json
{
  "message_id": "unique_message_id_123",
  "replies_to": {
    "message_id": "unique_message_id_456",
    "content": "This is the parent message!",
    "sender": {
      "is_anonymous": false,
      "user_id": 12345,
      "username": "parent_sender_name",
      "is_verified": false,
      "profile_picture": "https://example.com/parent_sender_avatar.jpg",
      "channel_slug": "parent_sender_channel",
      "identity": null
    }
  },
  "broadcaster": {
    "is_anonymous": false,
    "user_id": 123456789,
    "username": "broadcaster_name",
    "is_verified": true,
    "profile_picture": "https://example.com/broadcaster_avatar.jpg",
    "channel_slug": "broadcaster_channel",
    "identity": null
  },
  "sender": {
    "is_anonymous": false,
    "user_id": 987654321,
    "username": "sender_name",
    "is_verified": false,
    "profile_picture": "https://example.com/sender_avatar.jpg",
    "channel_slug": "sender_channel",
    "identity": {
      "username_color": "#FF5733",
      "badges": [
        {
          "text": "Moderator",
          "type": "moderator"
        },
        {
          "text": "Sub Gifter",
          "type": "sub_gifter",
          "count": 5
        },
        {
          "text": "Subscriber",
          "type": "subscriber",
          "count": 3
        }
      ]
    }
  },
  "content": "Hello [emote:4148074:HYPERCLAP] [emote:4148074:HYPERCLAP] [emote:37226:KEKW]",
  "emotes": [
    {
      "emote_id": "4148074",
      "positions": [
        { "s": 6, "e": 30 },
        { "s": 32, "e": 56 }
      ]
    },
    {
      "emote_id": "37226",
      "positions": [
        { "s": 58, "e": 75 }
      ]
    }
  ],
  "created_at": "2025-01-14T16:08:06Z"
}
```

---

## Event 2: Channel Follow (`channel.followed`)

### Headers

```
Kick-Event-Type: channel.followed
Kick-Event-Version: 1
```

### Payload Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster` | object | Yes | The channel that was followed (Common User Object) |
| `follower` | object | Yes | The user who followed (Common User Object) |

### Example Payload

```json
{
  "broadcaster": {
    "is_anonymous": false,
    "user_id": 123456789,
    "username": "broadcaster_name",
    "is_verified": true,
    "profile_picture": "https://example.com/broadcaster_avatar.jpg",
    "channel_slug": "broadcaster_channel",
    "identity": null
  },
  "follower": {
    "is_anonymous": false,
    "user_id": 987654321,
    "username": "follower_name",
    "is_verified": false,
    "profile_picture": "https://example.com/sender_avatar.jpg",
    "channel_slug": "follower_channel",
    "identity": null
  }
}
```

---

## Event 3: Channel Subscription Renewal (`channel.subscription.renewal`)

### Headers

```
Kick-Event-Type: channel.subscription.renewal
Kick-Event-Version: 1
```

### Payload Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster` | object | Yes | The channel being subscribed to (Common User Object) |
| `subscriber` | object | Yes | The renewing subscriber (Common User Object) |
| `duration` | number | Yes | Subscription duration in months |
| `created_at` | string (ISO 8601) | Yes | When the renewal was created |
| `expires_at` | string (ISO 8601) | Yes | When the subscription expires |

### Example Payload

```json
{
  "broadcaster": {
    "is_anonymous": false,
    "user_id": 123456789,
    "username": "broadcaster_name",
    "is_verified": true,
    "profile_picture": "https://example.com/broadcaster_avatar.jpg",
    "channel_slug": "broadcaster_channel",
    "identity": null
  },
  "subscriber": {
    "is_anonymous": false,
    "user_id": 987654321,
    "username": "subscriber_name",
    "is_verified": false,
    "profile_picture": "https://example.com/sender_avatar.jpg",
    "channel_slug": "subscriber_channel",
    "identity": null
  },
  "duration": 3,
  "created_at": "2025-01-14T16:08:06Z",
  "expires_at": "2025-02-14T16:08:06Z"
}
```

---

## Event 4: Channel Subscription Gifts (`channel.subscription.gifts`)

### Headers

```
Kick-Event-Type: channel.subscription.gifts
Kick-Event-Version: 1
```

### Payload Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster` | object | Yes | The channel receiving gift subs (Common User Object) |
| `gifter` | object | Yes | The user gifting subs. **When `is_anonymous` is `true`, all other fields are `null`** |
| `giftees` | array | Yes | Array of recipient user objects (Common User Object) |
| `created_at` | string (ISO 8601) | Yes | When the gifts were created |
| `expires_at` | string (ISO 8601) | Yes | When the gifted subscriptions expire |

#### Anonymous Gifter Behavior

When `gifter.is_anonymous` is `true`, the following fields on the `gifter` object are all `null`:
- `user_id`
- `username`
- `is_verified`
- `profile_picture`
- `channel_slug`
- `identity`

### Example Payload

```json
{
  "broadcaster": {
    "is_anonymous": false,
    "user_id": 123456789,
    "username": "broadcaster_name",
    "is_verified": true,
    "profile_picture": "https://example.com/broadcaster_avatar.jpg",
    "channel_slug": "broadcaster_channel",
    "identity": null
  },
  "gifter": {
    "is_anonymous": false,
    "user_id": 987654321,
    "username": "gifter_name",
    "is_verified": false,
    "profile_picture": "https://example.com/sender_avatar.jpg",
    "channel_slug": "gifter_channel",
    "identity": null
  },
  "giftees": [
    {
      "is_anonymous": false,
      "user_id": 561654654,
      "username": "giftee_name",
      "is_verified": true,
      "profile_picture": "https://example.com/broadcaster_avatar.jpg",
      "channel_slug": "giftee_channel",
      "identity": null
    }
  ],
  "created_at": "2025-01-14T16:08:06Z",
  "expires_at": "2025-02-14T16:08:06Z"
}
```

---

## Event 5: Channel Subscription Created (`channel.subscription.new`)

### Headers

```
Kick-Event-Type: channel.subscription.new
Kick-Event-Version: 1
```

### Payload Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster` | object | Yes | The channel being subscribed to (Common User Object) |
| `subscriber` | object | Yes | The new subscriber (Common User Object) |
| `duration` | number | Yes | Subscription duration in months |
| `created_at` | string (ISO 8601) | Yes | When the subscription was created |
| `expires_at` | string (ISO 8601) | Yes | When the subscription expires |

### Example Payload

```json
{
  "broadcaster": {
    "is_anonymous": false,
    "user_id": 123456789,
    "username": "broadcaster_name",
    "is_verified": true,
    "profile_picture": "https://example.com/broadcaster_avatar.jpg",
    "channel_slug": "broadcaster_channel",
    "identity": null
  },
  "subscriber": {
    "is_anonymous": false,
    "user_id": 987654321,
    "username": "subscriber_name",
    "is_verified": false,
    "profile_picture": "https://example.com/sender_avatar.jpg",
    "channel_slug": "subscriber_channel",
    "identity": null
  },
  "duration": 1,
  "created_at": "2025-01-14T16:08:06Z",
  "expires_at": "2025-02-14T16:08:06Z"
}
```

---

## Event 6: Channel Reward Redemption Updated (`channel.reward.redemption.updated`)

### Headers

```
Kick-Event-Type: channel.reward.redemption.updated
Kick-Event-Version: 1
```

### Payload Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique redemption ID (ULID format) |
| `user_input` | string | Yes | Text input provided by the redeemer |
| `status` | string | Yes | Redemption status. One of: `"pending"`, `"accepted"`, `"rejected"` |
| `redeemed_at` | string (ISO 8601) | Yes | When the reward was redeemed |
| `reward` | object | Yes | The reward that was redeemed |
| `redeemer` | object | Yes | The user who redeemed the reward (simplified user object) |
| `broadcaster` | object | Yes | The channel owner (simplified user object) |

> **Note:** This event uses a **simplified user object** without `is_anonymous` or `identity` fields.

#### Reward Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique reward ID (ULID format) |
| `title` | string | Display title of the reward |
| `cost` | number | Cost in channel points |
| `description` | string | Description of the reward |

#### Simplified User Object Schema (Redeemer / Broadcaster)

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | number | Unique user identifier |
| `username` | string | The user's username |
| `is_verified` | boolean | Whether the user has a verified badge |
| `profile_picture` | string | URL to the user's profile picture |
| `channel_slug` | string | The user's channel slug |

### Example Payload

```json
{
  "id": "01KBHE78QE4HZY1617DK5FC7YD",
  "user_input": "unban me",
  "status": "rejected",
  "redeemed_at": "2025-12-02T22:54:19.323Z",
  "reward": {
    "id": "01KBHE7RZNHB0SKDV1H86CD4F3",
    "title": "Uban Request",
    "cost": 1000,
    "description": "Only good reasons pls"
  },
  "redeemer": {
    "user_id": 123,
    "username": "naughty-user",
    "is_verified": false,
    "profile_picture": "",
    "channel_slug": "naughty_user"
  },
  "broadcaster": {
    "user_id": 333,
    "username": "gigachad",
    "is_verified": true,
    "profile_picture": "",
    "channel_slug": "gigachad"
  }
}
```

---

## Event 7: Livestream Status Updated (`livestream.status.updated`)

### Headers

```
Kick-Event-Type: livestream.status.updated
Kick-Event-Version: 1
```

### Payload Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster` | object | Yes | The streamer (Common User Object) |
| `is_live` | boolean | Yes | `true` when stream started, `false` when ended |
| `title` | string | Yes | Stream title |
| `started_at` | string (ISO 8601) | Yes | When the stream started |
| `ended_at` | string \| null | Yes | When the stream ended. `null` while live |

### Example Payload: Stream Started

```json
{
  "broadcaster": {
    "is_anonymous": false,
    "user_id": 123456789,
    "username": "broadcaster_name",
    "is_verified": true,
    "profile_picture": "https://example.com/broadcaster_avatar.jpg",
    "channel_slug": "broadcaster_channel",
    "identity": null
  },
  "is_live": true,
  "title": "Stream Title",
  "started_at": "2025-01-01T11:00:00+11:00",
  "ended_at": null
}
```

### Example Payload: Stream Ended

```json
{
  "broadcaster": {
    "is_anonymous": false,
    "user_id": 123456789,
    "username": "broadcaster_name",
    "is_verified": true,
    "profile_picture": "https://example.com/broadcaster_avatar.jpg",
    "channel_slug": "broadcaster_channel",
    "identity": null
  },
  "is_live": false,
  "title": "Stream Title",
  "started_at": "2025-01-01T11:00:00+11:00",
  "ended_at": "2025-01-01T15:00:00+11:00"
}
```

---

## Event 8: Livestream Metadata Updated (`livestream.metadata.updated`)

### Headers

```
Kick-Event-Type: livestream.metadata.updated
Kick-Event-Version: 1
```

### Payload Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster` | object | Yes | The streamer (Common User Object) |
| `metadata` | object | Yes | Updated stream metadata |

#### Metadata Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Stream title |
| `language` | string | Stream language code (e.g., `"en"`) |
| `has_mature_content` | boolean | Whether stream is marked as mature |
| `category` | object | Stream category |

#### Category Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Category ID |
| `name` | string | Category name |
| `thumbnail` | string | URL to category thumbnail image |

### Example Payload

```json
{
  "broadcaster": {
    "is_anonymous": false,
    "user_id": 123456789,
    "username": "broadcaster_name",
    "is_verified": true,
    "profile_picture": "https://example.com/broadcaster_avatar.jpg",
    "channel_slug": "broadcaster_channel",
    "identity": null
  },
  "metadata": {
    "title": "Stream Title",
    "language": "en",
    "has_mature_content": true,
    "category": {
      "id": 123,
      "name": "Category name",
      "thumbnail": "http://example.com/image123"
    }
  }
}
```

---

## Event 9: Moderation Banned (`moderation.banned`)

### Headers

```
Kick-Event-Type: moderation.banned
Kick-Event-Version: 1
```

### Payload Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster` | object | Yes | The channel where the ban occurred (Common User Object) |
| `moderator` | object | Yes | The moderator who issued the ban (Common User Object) |
| `banned_user` | object | Yes | The user who was banned (Common User Object) |
| `metadata` | object | Yes | Ban details |

#### Ban Metadata Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `reason` | string | Reason for the ban |
| `created_at` | string (ISO 8601) | When the ban was created |
| `expires_at` | string \| null | When the ban expires. `null` for permanent bans |

### Example Payload

```json
{
  "broadcaster": {
    "is_anonymous": false,
    "user_id": 123456789,
    "username": "broadcaster_name",
    "is_verified": true,
    "profile_picture": "https://example.com/broadcaster_avatar.jpg",
    "channel_slug": "broadcaster_channel",
    "identity": null
  },
  "moderator": {
    "is_anonymous": false,
    "user_id": 987654321,
    "username": "moderator_name",
    "is_verified": false,
    "profile_picture": "https://example.com/moderator_avatar.jpg",
    "channel_slug": "moderator_channel",
    "identity": null
  },
  "banned_user": {
    "is_anonymous": false,
    "user_id": 135790135,
    "username": "banned_user_name",
    "is_verified": false,
    "profile_picture": "https://example.com/banned_user_avatar.jpg",
    "channel_slug": "banned_user_channel",
    "identity": null
  },
  "metadata": {
    "reason": "banned reason",
    "created_at": "2025-01-14T16:08:05Z",
    "expires_at": "2025-01-14T16:10:06Z"
  }
}
```

> **Note:** `expires_at` is `null` for permanent bans. When set, indicates a timed ban/timeout.

---

## Event 10: Kicks Gifted (`kicks.gifted`)

### Headers

```
Kick-Event-Type: kicks.gifted
Kick-Event-Version: 1
```

> **Note:** This event uses a **different user object structure** -- it does NOT include `is_anonymous` or `identity` fields on user objects.

### Payload Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster` | object | Yes | The channel receiving the kicks gift |
| `sender` | object | Yes | The user sending the kicks gift |
| `gift` | object | Yes | Details about the gift |
| `created_at` | string (ISO 8601) | Yes | When the gift was sent |

#### Kicks Gift User Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | number | Unique user identifier |
| `username` | string | The user's username |
| `is_verified` | boolean | Whether the user has a verified badge |
| `profile_picture` | string | URL to the user's profile picture |
| `channel_slug` | string | The user's channel slug |

#### Gift Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `amount` | number | Gift amount value |
| `name` | string | Gift name (e.g., `"Rage Quit"`) |
| `type` | string | Gift type (e.g., `"LEVEL_UP"`) |
| `tier` | string | Gift tier (e.g., `"MID"`) |
| `message` | string | Optional message from the sender |
| `pinned_time_seconds` | number | Duration in seconds the gift is pinned in chat |

### Example Payload

```json
{
  "broadcaster": {
    "user_id": 123456789,
    "username": "broadcaster_name",
    "is_verified": true,
    "profile_picture": "https://example.com/broadcaster_avatar.jpg",
    "channel_slug": "broadcaster_channel"
  },
  "sender": {
    "user_id": 987654321,
    "username": "gift_sender",
    "is_verified": false,
    "profile_picture": "https://example.com/sender_avatar.jpg",
    "channel_slug": "gift_sender_channel"
  },
  "gift": {
    "amount": 500,
    "name": "Rage Quit",
    "type": "LEVEL_UP",
    "tier": "MID",
    "message": "w",
    "pinned_time_seconds": 600
  },
  "created_at": "2025-10-20T04:00:08.634Z"
}
```

---

## Best Practices & Production Hardening

### Idempotent Webhook Processing

Every webhook delivery includes a `Kick-Event-Message-Id` header (ULID format). Use this as an idempotency key:

```typescript
// TypeScript
const processedEvents = new Set<string>(); // Use Redis/DB in production

async function handleWebhook(req: Request): Promise<Response> {
  const messageId = req.headers.get('Kick-Event-Message-Id');

  if (!messageId || processedEvents.has(messageId)) {
    return new Response('OK', { status: 200 }); // Acknowledge duplicate
  }

  processedEvents.add(messageId);
  // Process the event...
  return new Response('OK', { status: 200 });
}
```

```python
# Python
processed_events: set[str] = set()  # Use Redis/DB in production

def handle_webhook(request):
    message_id = request.headers.get('Kick-Event-Message-Id')

    if not message_id or message_id in processed_events:
        return Response('OK', status=200)  # Acknowledge duplicate

    processed_events.add(message_id)
    # Process the event...
    return Response('OK', status=200)
```

### Bot Anti-Loop Prevention

When building a chat bot that processes `chat.message.sent` events:

```typescript
const BOT_USER_ID = 12345; // Your bot's user_id

function handleChatMessage(payload: ChatMessagePayload): void {
  // CRITICAL: Ignore messages from your own bot
  if (payload.sender.user_id === BOT_USER_ID) {
    return;
  }
  // Process message...
}
```

### Retry / Backoff Strategy

Kick automatically unsubscribes your webhook if it fails continuously for over 24 hours. To avoid this:

- Always respond with `2xx` quickly (within 3 seconds)
- Process events asynchronously (queue them for background processing)
- If your endpoint is temporarily down, Kick will retry; no manual retry needed on your side

### Secure Secret Storage

- Never hardcode webhook verification keys or OAuth secrets in source code
- Use environment variables or a secrets manager
- Rotate secrets periodically

### Logging Recommendations

- **Log:** `Kick-Event-Message-Id`, `Kick-Event-Type`, `Kick-Event-Message-Timestamp`, processing result
- **Never log:** Raw request bodies containing user data in production, signature values, secrets

### HTTPS-Only Callback URLs

Webhook endpoints must be accessible over the public internet via HTTPS. Local development requires a tunneling service (Cloudflare Tunnel, ngrok, etc.).

---

## Known Issues & Community Notes

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#336](https://github.com/KickEngineering/KickDevDocs/issues/336) | Badge images not provided in webhook payloads | Open | No URLs for badge images; community requests Twitch-like badge endpoint |
| [#315](https://github.com/KickEngineering/KickDevDocs/issues/315) | Webhook fires for gift subs even when payment fails | Open | `channel.subscription.gifts` may fire even if the gifter's payment was declined |
| [#324](https://github.com/KickEngineering/KickDevDocs/issues/324) | Webhook sub gifts fired but payment not accepted | Closed | Related to #315 |
| [#322](https://github.com/KickEngineering/KickDevDocs/issues/322) | Stream thumbnail doesn't render on stream online event | Closed | Thumbnail reliability degraded; fixed |
| [#210](https://github.com/KickEngineering/KickDevDocs/issues/210) | Emotes field inconsistency in chat.message.sent | Closed | Emotes are embedded in content text as `[emote:ID:NAME]` AND listed separately in `emotes` array |
| [#220](https://github.com/KickEngineering/KickDevDocs/issues/220) | Purpose of `is_anonymous` field undocumented | Open | Field exists on many user objects but purpose is unclear |
| [#229](https://github.com/KickEngineering/KickDevDocs/issues/229) | JSON payloads in docs have syntax errors | Open (PR) | Some JSON examples have trailing commas; PR pending to fix |
| [#323](https://github.com/KickEngineering/KickDevDocs/issues/323) | No emojis/emotes endpoint | Open | No API to resolve emote IDs to image URLs |
| [#208](https://github.com/KickEngineering/KickDevDocs/issues/208) | Inconsistent stream ending webhook delivery | Closed | Stream end events were unreliable; fixed |

### Inconsistencies Between User Object Schemas

Different events use different user object structures:
- **Most events** use the full user object with `is_anonymous` and `identity` fields
- **`channel.reward.redemption.updated`** uses a simplified user object WITHOUT `is_anonymous` or `identity`
- **`kicks.gifted`** uses user objects WITHOUT `is_anonymous` or `identity` but WITH `channel_slug`

---

## Quick Reference Table

| Event | Kick-Event-Type | Kick-Event-Version | Key Fields |
|-------|----------------|-------------------|------------|
| Chat Message | `chat.message.sent` | `1` | message_id, sender, content, emotes, replies_to |
| Channel Follow | `channel.followed` | `1` | broadcaster, follower |
| Sub Renewal | `channel.subscription.renewal` | `1` | subscriber, duration, expires_at |
| Sub Gifts | `channel.subscription.gifts` | `1` | gifter (nullable), giftees[], expires_at |
| Sub Created | `channel.subscription.new` | `1` | subscriber, duration, expires_at |
| Reward Redemption | `channel.reward.redemption.updated` | `1` | id, status, reward, redeemer, user_input |
| Stream Status | `livestream.status.updated` | `1` | is_live, title, started_at, ended_at |
| Stream Metadata | `livestream.metadata.updated` | `1` | metadata (title, language, category) |
| Mod Banned | `moderation.banned` | `1` | moderator, banned_user, metadata (reason, expires_at) |
| Kicks Gifted | `kicks.gifted` | `1` | sender, gift (amount, name, type, tier) |
