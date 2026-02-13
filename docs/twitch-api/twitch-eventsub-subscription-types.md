# Twitch EventSub Subscription Types

> **Source**: https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/
> **Last Updated**: 2025

Complete reference for all Twitch EventSub subscription types. Each entry includes the subscription type name, version, required OAuth scope, condition fields, transport compatibility, and a brief description.

---

## Table of Contents

- [Overview](#overview)
- [Creating Subscriptions](#creating-subscriptions)
- [Subscription Types by Category](#subscription-types-by-category)
  - [Automod](#automod)
  - [Channel](#channel)
  - [Channel Chat](#channel-chat)
  - [Channel Points](#channel-points)
  - [Polls and Predictions](#polls-and-predictions)
  - [Hype Train](#hype-train)
  - [Goals](#goals)
  - [Charity](#charity)
  - [Shield Mode](#shield-mode)
  - [Shoutouts](#shoutouts)
  - [Shared Chat](#shared-chat)
  - [Streams](#streams)
  - [Users](#users)
  - [Conduit](#conduit)
  - [Drops and Extensions](#drops-and-extensions)
- [Example Notification Payloads](#example-notification-payloads)
- [Transport Compatibility](#transport-compatibility)
- [Subscription Costs and Limits](#subscription-costs-and-limits)
- [Best Practices](#best-practices)
- [Known Issues and Notes](#known-issues-and-notes)
- [Quick Reference Table](#quick-reference-table)

---

## Overview

EventSub is Twitch's event notification system. When you subscribe to a type, Twitch sends you a notification whenever that event occurs. EventSub replaced the deprecated PubSub system (decommissioned April 14, 2025).

Key concepts:

- **Subscription Type**: Identifies the event (e.g., `channel.follow`).
- **Version**: Identifies the schema version (e.g., `1`, `2`). Always use the latest stable version.
- **Condition**: Parameters that scope the subscription (e.g., which broadcaster to watch).
- **Transport**: Delivery method -- webhook, WebSocket, or conduit.
- **Scope**: OAuth scope required from the user whose token is used.

All subscription types work with all three transports (webhook, WebSocket, conduit) unless explicitly noted otherwise.

---

## Creating Subscriptions

### Endpoint

```
POST https://api.twitch.tv/helix/eventsub/subscriptions
```

### Required Headers

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <access_token>` |
| `Client-Id` | `<your_client_id>` |
| `Content-Type` | `application/json` |

### Request Body Structure

```json
{
  "type": "<subscription_type>",
  "version": "<version>",
  "condition": {
    "<field>": "<value>"
  },
  "transport": {
    "method": "webhook | websocket | conduit",
    "callback": "https://example.com/callback",
    "secret": "your_secret_string"
  }
}
```

### Transport Variants

**Webhook transport:**

```json
{
  "transport": {
    "method": "webhook",
    "callback": "https://example.com/eventsub",
    "secret": "s3cre7_str1ng_b3tw33n_10_and_100_chars"
  }
}
```

- Requires an **app access token**.
- Secret must be between 10 and 100 characters.
- Twitch sends a verification challenge before activating.

**WebSocket transport:**

```json
{
  "transport": {
    "method": "websocket",
    "session_id": "<session_id_from_welcome_message>"
  }
}
```

- Requires a **user access token**.
- Session ID comes from the WebSocket welcome message.

**Conduit transport:**

```json
{
  "transport": {
    "method": "conduit",
    "conduit_id": "<your_conduit_id>"
  }
}
```

- Requires an **app access token**.

### Example: Subscribe to stream.online (Webhook)

```bash
curl -X POST 'https://api.twitch.tv/helix/eventsub/subscriptions' \
  -H 'Authorization: Bearer cfabdegwdoklmawdzdo98xt2fo512y' \
  -H 'Client-Id: uo6dggojyb8d6soh92zknwmi5ej1q2' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "stream.online",
    "version": "1",
    "condition": {
      "broadcaster_user_id": "12345"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://example.com/webhooks/twitch",
      "secret": "s3cre7_random_string"
    }
  }'
```

### Response (202 Accepted)

```json
{
  "data": [
    {
      "id": "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
      "status": "webhook_callback_verification_pending",
      "type": "stream.online",
      "version": "1",
      "condition": {
        "broadcaster_user_id": "12345"
      },
      "created_at": "2025-01-15T20:11:10.247Z",
      "transport": {
        "method": "webhook",
        "callback": "https://example.com/webhooks/twitch"
      },
      "cost": 1
    }
  ],
  "total": 1,
  "total_cost": 1,
  "max_total_cost": 10000
}
```

---

## Subscription Types by Category

### Automod

#### 1. automod.message.hold

A message was caught by AutoMod and is being held for review.

| Property | Value |
|----------|-------|
| **Type** | `automod.message.hold` |
| **Version** | `v1`, `v2` |
| **Scope** | `moderator:manage:automod` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**v2 changes**: Adds additional fields for the held message content and AutoMod classification details.

**Event payload fields (v1)**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The sender's user ID
- `user_login` -- The sender's login
- `user_name` -- The sender's display name
- `message_id` -- Unique ID for the held message
- `message` -- Object containing `text` and `fragments`
- `category` -- The AutoMod category that flagged the message
- `level` -- The level within the category
- `held_at` -- Timestamp when the message was held

---

#### 2. automod.message.update

A message held by AutoMod has had its status changed (approved or denied).

| Property | Value |
|----------|-------|
| **Type** | `automod.message.update` |
| **Version** | `v1`, `v2` |
| **Scope** | `moderator:manage:automod` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields (v1)**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The sender's user ID
- `user_login` -- The sender's login
- `user_name` -- The sender's display name
- `moderator_user_id` -- The moderator who acted
- `moderator_user_login` -- The moderator's login
- `moderator_user_name` -- The moderator's display name
- `message_id` -- The held message's ID
- `message` -- Object containing `text` and `fragments`
- `status` -- New status: `approved` or `denied`

---

#### 3. automod.settings.update

AutoMod settings have been updated for the channel.

| Property | Value |
|----------|-------|
| **Type** | `automod.settings.update` |
| **Version** | `v1` |
| **Scope** | `moderator:read:automod_settings` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `moderator_user_id` -- The moderator who updated settings
- `moderator_user_login` -- The moderator's login
- `moderator_user_name` -- The moderator's display name
- `overall_level` -- The overall AutoMod level (null if using individual settings)
- `disability` -- Level for disability category
- `aggression` -- Level for aggression category
- `sexuality_sex_or_gender` -- Level for sexuality category
- `misogyny` -- Level for misogyny category
- `bullying` -- Level for bullying category
- `swearing` -- Level for swearing category
- `race_ethnicity_or_religion` -- Level for race/ethnicity/religion category
- `sex_based_terms` -- Level for sex-based terms category

---

#### 4. automod.terms.update

AutoMod terms (blocked/permitted) have been updated. Changes to private terms are not sent.

| Property | Value |
|----------|-------|
| **Type** | `automod.terms.update` |
| **Version** | `v1` |
| **Scope** | `moderator:manage:automod` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `moderator_user_id` -- The moderator who updated terms
- `moderator_user_login` -- The moderator's login
- `moderator_user_name` -- The moderator's display name
- `action` -- The action taken: `add_permitted`, `remove_permitted`, `add_blocked`, `remove_blocked`
- `from_automod` -- Whether the term was from AutoMod's built-in list
- `terms` -- Array of terms that were updated

---

### Channel

#### 5. channel.update

Channel properties have been updated (title, category, language, etc.).

| Property | Value |
|----------|-------|
| **Type** | `channel.update` |
| **Version** | `v2` |
| **Scope** | No scope required |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `title` -- The channel's stream title
- `language` -- The channel's broadcast language (BCP 47 tag)
- `category_id` -- The category ID
- `category_name` -- The category name
- `content_classification_labels` -- Array of content classification labels

---

#### 6. channel.follow

A user has followed the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.follow` |
| **Version** | `v2` |
| **Scope** | `moderator:read:followers` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Note**: Version 1 has been removed. You must use version 2, which requires a moderator user ID in the condition.

**Event payload fields**:
- `user_id` -- The user ID of the follower
- `user_login` -- The login of the follower
- `user_name` -- The display name of the follower
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `followed_at` -- Timestamp of when the follow occurred (RFC3339)

---

#### 7. channel.ad_break.begin

An ad break has begun on the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.ad_break.begin` |
| **Version** | `v1` |
| **Scope** | `channel:read:ads` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `requester_user_id` -- The user who requested the ad break
- `requester_user_login` -- The requester's login
- `requester_user_name` -- The requester's display name
- `duration_seconds` -- Duration of the ad break in seconds
- `started_at` -- Timestamp of when the ad break started (RFC3339)
- `is_automatic` -- Whether the ad break was triggered automatically

---

#### 8. channel.bits.use (BETA)

Bits have been used on the channel (cheers, Power-ups, Combos).

| Property | Value |
|----------|-------|
| **Type** | `channel.bits.use` |
| **Version** | `v1` |
| **Scope** | `bits:read` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |
| **Status** | **BETA** -- subject to change |

**Note**: This is an all-purpose Bits event. Extension Bits transactions are NOT included; use `extension.bits_transaction.create` for those.

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The user who used Bits
- `user_login` -- The user's login
- `user_name` -- The user's display name
- `bits` -- Number of Bits used
- `type` -- What Bits were used for (e.g., `cheer`, `power_up`)
- `power_up` -- Power-up data object (null for cheers)
- `message` -- Object with `text` and `fragments` array

---

#### 9. channel.cheer

A user has cheered with Bits on the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.cheer` |
| **Version** | `v1` |
| **Scope** | `bits:read` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `is_anonymous` -- Whether the cheer is anonymous
- `user_id` -- The cheerer's user ID (null if anonymous)
- `user_login` -- The cheerer's login (null if anonymous)
- `user_name` -- The cheerer's display name (null if anonymous)
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `message` -- The cheer message
- `bits` -- Number of Bits cheered

---

#### 10. channel.subscribe

A user has subscribed to the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.subscribe` |
| **Version** | `v1` |
| **Scope** | `channel:read:subscriptions` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `user_id` -- The subscribing user's ID
- `user_login` -- The subscribing user's login
- `user_name` -- The subscribing user's display name
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `tier` -- The subscription tier: `1000` (Tier 1), `2000` (Tier 2), `3000` (Tier 3)
- `is_gift` -- Whether the subscription is a gift

---

#### 11. channel.subscription.end

A subscription to the channel has ended (expired or not renewed).

| Property | Value |
|----------|-------|
| **Type** | `channel.subscription.end` |
| **Version** | `v1` |
| **Scope** | `channel:read:subscriptions` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `user_id` -- The user whose subscription ended
- `user_login` -- The user's login
- `user_name` -- The user's display name
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `tier` -- The subscription tier
- `is_gift` -- Whether the subscription was a gift

---

#### 12. channel.subscription.gift

A user has gifted one or more subscriptions in the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.subscription.gift` |
| **Version** | `v1` |
| **Scope** | `channel:read:subscriptions` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `user_id` -- The gifter's user ID (null if anonymous)
- `user_login` -- The gifter's login (null if anonymous)
- `user_name` -- The gifter's display name (null if anonymous)
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `total` -- Number of subscriptions gifted
- `tier` -- The subscription tier
- `cumulative_total` -- Lifetime gift sub total for this user in this channel (null if anonymous)
- `is_anonymous` -- Whether the gift is anonymous

---

#### 13. channel.subscription.message

A user has sent a resubscription chat message.

| Property | Value |
|----------|-------|
| **Type** | `channel.subscription.message` |
| **Version** | `v1` |
| **Scope** | `channel:read:subscriptions` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `user_id` -- The resubscriber's user ID
- `user_login` -- The resubscriber's login
- `user_name` -- The resubscriber's display name
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `tier` -- The subscription tier
- `message` -- Object with `text` and `emotes` array
- `cumulative_months` -- Total months subscribed
- `streak_months` -- Consecutive months subscribed (null if not shared)
- `duration_months` -- Multi-month subscription duration

---

#### 14. channel.ban

A viewer has been banned from the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.ban` |
| **Version** | `v1` |
| **Scope** | `channel:moderate` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `user_id` -- The banned user's ID
- `user_login` -- The banned user's login
- `user_name` -- The banned user's display name
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `moderator_user_id` -- The moderator who issued the ban
- `moderator_user_login` -- The moderator's login
- `moderator_user_name` -- The moderator's display name
- `reason` -- The ban reason
- `banned_at` -- Timestamp of the ban (RFC3339)
- `ends_at` -- When the timeout expires (null for permanent bans)
- `is_permanent` -- Whether the ban is permanent

---

#### 15. channel.unban

A viewer has been unbanned from the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.unban` |
| **Version** | `v1` |
| **Scope** | `channel:moderate` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `user_id` -- The unbanned user's ID
- `user_login` -- The unbanned user's login
- `user_name` -- The unbanned user's display name
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `moderator_user_id` -- The moderator who issued the unban
- `moderator_user_login` -- The moderator's login
- `moderator_user_name` -- The moderator's display name

---

#### 16. channel.unban_request.create

A user has created an unban request.

| Property | Value |
|----------|-------|
| **Type** | `channel.unban_request.create` |
| **Version** | `v1` |
| **Scope** | `moderator:read:unban_requests` or `moderator:manage:unban_requests` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `id` -- The unban request ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The requesting user's ID
- `user_login` -- The requesting user's login
- `user_name` -- The requesting user's display name
- `text` -- The unban request message
- `created_at` -- Timestamp of the request (RFC3339)

---

#### 17. channel.unban_request.resolve

An unban request has been resolved (approved or denied).

| Property | Value |
|----------|-------|
| **Type** | `channel.unban_request.resolve` |
| **Version** | `v1` |
| **Scope** | `moderator:read:unban_requests` or `moderator:manage:unban_requests` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `id` -- The unban request ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `moderator_user_id` -- The moderator who resolved it
- `moderator_user_login` -- The moderator's login
- `moderator_user_name` -- The moderator's display name
- `user_id` -- The requesting user's ID
- `user_login` -- The requesting user's login
- `user_name` -- The requesting user's display name
- `resolution_text` -- The moderator's response text
- `status` -- Resolution status: `approved` or `denied`

---

#### 18. channel.moderate

Consolidated moderation action event covering bans, timeouts, mod/unmod, VIP, raid, and more.

| Property | Value |
|----------|-------|
| **Type** | `channel.moderate` |
| **Version** | `v1`, `v2` |
| **Scope** | `moderator:read:moderators` + `moderator:read:blocked_terms` (scope varies by action type) |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Note**: This is a consolidated event. The `action` field indicates the specific moderation action. Different actions may require different scopes. Version 2 adds additional action types.

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `moderator_user_id` -- The moderator's user ID
- `moderator_user_login` -- The moderator's login
- `moderator_user_name` -- The moderator's display name
- `action` -- The moderation action (e.g., `ban`, `timeout`, `unban`, `untimeout`, `clear`, `delete`, `mod`, `unmod`, `vip`, `unvip`, `raid`, `unraid`, `add_blocked_term`, `remove_blocked_term`, `add_permitted_term`, `remove_permitted_term`, `slow`, `slow_off`, `followers`, `followers_off`, `subscribers`, `subscribers_off`, `emoteonly`, `emoteonly_off`, `uniquechat`, `uniquechat_off`, `warn`, `shared_chat_ban`, `shared_chat_timeout`, `shared_chat_untimeout`, `shared_chat_delete`)
- Additional action-specific fields (e.g., `ban`, `timeout`, `delete`, `automod_terms`, `slow`, `followers`, `warn`, `unban_request`)

---

#### 19. channel.moderator.add

A moderator has been added to the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.moderator.add` |
| **Version** | `v1` |
| **Scope** | `moderation:read` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The new moderator's user ID
- `user_login` -- The new moderator's login
- `user_name` -- The new moderator's display name

---

#### 20. channel.moderator.remove

A moderator has been removed from the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.moderator.remove` |
| **Version** | `v1` |
| **Scope** | `moderation:read` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The removed moderator's user ID
- `user_login` -- The removed moderator's login
- `user_name` -- The removed moderator's display name

---

#### 21. channel.raid

A broadcaster has raided another channel (or been raided).

| Property | Value |
|----------|-------|
| **Type** | `channel.raid` |
| **Version** | `v1` |
| **Scope** | No scope required |
| **Condition** | `from_broadcaster_user_id` OR `to_broadcaster_user_id` (one required, not both) |
| **Transport** | Webhook, WebSocket, Conduit |

**Note**: You must specify either `from_broadcaster_user_id` to detect outgoing raids, or `to_broadcaster_user_id` to detect incoming raids.

**Event payload fields**:
- `from_broadcaster_user_id` -- The raiding broadcaster's user ID
- `from_broadcaster_user_login` -- The raiding broadcaster's login
- `from_broadcaster_user_name` -- The raiding broadcaster's display name
- `to_broadcaster_user_id` -- The target broadcaster's user ID
- `to_broadcaster_user_login` -- The target broadcaster's login
- `to_broadcaster_user_name` -- The target broadcaster's display name
- `viewers` -- Number of viewers in the raid

---

#### 22. channel.vip.add

A VIP has been added to the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.vip.add` |
| **Version** | `v1` |
| **Scope** | `channel:read:vips` or `channel:manage:vips` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The new VIP's user ID
- `user_login` -- The new VIP's login
- `user_name` -- The new VIP's display name

---

#### 23. channel.vip.remove

A VIP has been removed from the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.vip.remove` |
| **Version** | `v1` |
| **Scope** | `channel:read:vips` or `channel:manage:vips` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The removed VIP's user ID
- `user_login` -- The removed VIP's login
- `user_name` -- The removed VIP's display name

---

#### 24. channel.warning.send

A warning has been sent to a user in the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.warning.send` |
| **Version** | `v1` |
| **Scope** | `moderator:read:warnings` or `moderator:manage:warnings` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `moderator_user_id` -- The moderator who sent the warning
- `moderator_user_login` -- The moderator's login
- `moderator_user_name` -- The moderator's display name
- `user_id` -- The warned user's ID
- `user_login` -- The warned user's login
- `user_name` -- The warned user's display name
- `reason` -- The warning reason
- `chat_rules_cited` -- Array of chat rules cited in the warning

---

#### 25. channel.warning.acknowledge

A user has acknowledged a warning they received.

| Property | Value |
|----------|-------|
| **Type** | `channel.warning.acknowledge` |
| **Version** | `v1` |
| **Scope** | `moderator:read:warnings` or `moderator:manage:warnings` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The user who acknowledged the warning
- `user_login` -- The user's login
- `user_name` -- The user's display name

---

#### 26. channel.suspicious_user.message

A suspicious user has sent a message in the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.suspicious_user.message` |
| **Version** | `v1` |
| **Scope** | `moderator:read:suspicious_users` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The suspicious user's ID
- `user_login` -- The suspicious user's login
- `user_name` -- The suspicious user's display name
- `low_trust_status` -- The user's low trust status (e.g., `active_monitoring`, `restricted`)
- `shared_ban_channel_ids` -- Array of channel IDs where the user is banned
- `types` -- Array of reasons the user is flagged (e.g., `ban_evader`, `shared_channel_ban`)
- `ban_evasion_evaluation` -- Ban evasion likelihood
- `message` -- Object with the message `text` and `fragments`

---

#### 27. channel.suspicious_user.update

A suspicious user's status has been updated (e.g., changed from restricted to active monitoring).

| Property | Value |
|----------|-------|
| **Type** | `channel.suspicious_user.update` |
| **Version** | `v1` |
| **Scope** | `moderator:read:suspicious_users` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `moderator_user_id` -- The moderator who updated the status
- `moderator_user_login` -- The moderator's login
- `moderator_user_name` -- The moderator's display name
- `user_id` -- The suspicious user's ID
- `user_login` -- The suspicious user's login
- `user_name` -- The suspicious user's display name
- `low_trust_status` -- The updated status

---

### Channel Chat

#### 28. channel.chat.clear

The chat has been cleared by a moderator.

| Property | Value |
|----------|-------|
| **Type** | `channel.chat.clear` |
| **Version** | `v1` |
| **Scope** | `user:read:chat` |
| **Condition** | `broadcaster_user_id`, `user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name

---

#### 29. channel.chat.clear_user_messages

All messages from a specific user have been cleared from chat.

| Property | Value |
|----------|-------|
| **Type** | `channel.chat.clear_user_messages` |
| **Version** | `v1` |
| **Scope** | `user:read:chat` |
| **Condition** | `broadcaster_user_id`, `user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `target_user_id` -- The ID of the user whose messages were cleared
- `target_user_login` -- The user's login
- `target_user_name` -- The user's display name

---

#### 30. channel.chat.message

A chat message has been sent in the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.chat.message` |
| **Version** | `v1` |
| **Scope** | `user:read:chat` |
| **Condition** | `broadcaster_user_id`, `user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Note**: If using an app access token, the chatting user must have the `user:bot` scope, and the broadcaster (or a moderator) must have the `channel:bot` scope.

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `chatter_user_id` -- The message sender's user ID
- `chatter_user_login` -- The sender's login
- `chatter_user_name` -- The sender's display name
- `message_id` -- Unique message ID
- `message` -- Object containing:
  - `text` -- The full message text
  - `fragments` -- Array of message fragments, each with:
    - `type` -- Fragment type: `text`, `cheermote`, `emote`, `mention`
    - `text` -- The fragment text
    - `cheermote` -- Cheermote data (if applicable)
    - `emote` -- Emote data with `id`, `emote_set_id`, `owner_id`, `format` (if applicable)
    - `mention` -- Mention data (if applicable)
- `message_type` -- Message type: `text`, `channel_points_highlighted`, `channel_points_sub_only`, `user_intro`, `power_ups_message_effect`, `power_ups_gigantified_emote`
- `badges` -- Array of badge objects with `set_id` and `id`
- `cheer` -- Cheer data with `bits` (null if not a cheer)
- `color` -- The chatter's name color (hex, e.g., `#FF0000`)
- `reply` -- Reply thread data (null if not a reply), contains:
  - `parent_message_id`
  - `parent_message_body`
  - `parent_user_id`
  - `parent_user_login`
  - `parent_user_name`
  - `thread_message_id`
  - `thread_user_id`
  - `thread_user_login`
  - `thread_user_name`
- `channel_points_custom_reward_id` -- Custom reward ID (null if not a reward redemption)
- `channel_points_animation_id` -- Animation ID for "animate my message" (null if not applicable)
- `source_broadcaster_user_id` -- Source channel in shared chat (null if not shared chat)
- `source_broadcaster_user_login` -- Source channel login
- `source_broadcaster_user_name` -- Source channel display name
- `source_message_id` -- Source message ID in shared chat
- `source_badges` -- Source channel badges in shared chat

---

#### 31. channel.chat.message_delete

A specific chat message has been deleted.

| Property | Value |
|----------|-------|
| **Type** | `channel.chat.message_delete` |
| **Version** | `v1` |
| **Scope** | `user:read:chat` |
| **Condition** | `broadcaster_user_id`, `user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `target_user_id` -- The user whose message was deleted
- `target_user_login` -- The user's login
- `target_user_name` -- The user's display name
- `message_id` -- The deleted message's ID

---

#### 32. channel.chat.notification

A chat notification has occurred (sub, resub, gift sub, raid notice, etc.).

| Property | Value |
|----------|-------|
| **Type** | `channel.chat.notification` |
| **Version** | `v1` |
| **Scope** | `user:read:chat` |
| **Condition** | `broadcaster_user_id`, `user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `chatter_user_id` -- The chatter's user ID
- `chatter_user_login` -- The chatter's login
- `chatter_user_name` -- The chatter's display name
- `chatter_is_anonymous` -- Whether the chatter is anonymous
- `color` -- The chatter's name color
- `badges` -- Array of badge objects
- `system_message` -- The system-generated notification message
- `message_id` -- Unique message ID
- `message` -- Object with `text` and `fragments`
- `notice_type` -- The notification type: `sub`, `resub`, `sub_gift`, `community_sub_gift`, `gift_paid_upgrade`, `prime_paid_upgrade`, `raid`, `unraid`, `pay_it_forward`, `announcement`, `bits_badge_tier`, `charity_donation`, `shared_chat_sub`, `shared_chat_resub`, `shared_chat_sub_gift`, `shared_chat_community_sub_gift`, `shared_chat_gift_paid_upgrade`, `shared_chat_prime_paid_upgrade`, `shared_chat_raid`, `shared_chat_pay_it_forward`, `shared_chat_announcement`
- Type-specific objects (e.g., `sub`, `resub`, `sub_gift`, `community_sub_gift`, `gift_paid_upgrade`, `prime_paid_upgrade`, `raid`, `pay_it_forward`, `announcement`, `bits_badge_tier`, `charity_donation`)

---

#### 33. channel.chat_settings.update

Chat settings have been updated (e.g., slow mode, sub-only mode).

| Property | Value |
|----------|-------|
| **Type** | `channel.chat_settings.update` |
| **Version** | `v1` |
| **Scope** | `user:read:chat` |
| **Condition** | `broadcaster_user_id`, `user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `emote_mode` -- Whether emote-only mode is enabled
- `follower_mode` -- Whether follower-only mode is enabled
- `follower_mode_duration_minutes` -- Follower mode minimum follow duration (null if disabled)
- `slow_mode` -- Whether slow mode is enabled
- `slow_mode_wait_time_seconds` -- Slow mode wait time (null if disabled)
- `subscriber_mode` -- Whether subscriber-only mode is enabled
- `unique_chat_mode` -- Whether unique chat mode is enabled

---

#### 34. channel.chat.user_message_hold

A user has been notified that their message is being held by AutoMod.

| Property | Value |
|----------|-------|
| **Type** | `channel.chat.user_message_hold` |
| **Version** | `v1` |
| **Scope** | `user:read:chat` |
| **Condition** | `broadcaster_user_id`, `user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The user whose message was held
- `user_login` -- The user's login
- `user_name` -- The user's display name
- `message_id` -- The held message's ID
- `message` -- Object with `text` and `fragments`

---

#### 35. channel.chat.user_message_update

A user has been notified that their held message status has been updated (approved/denied).

| Property | Value |
|----------|-------|
| **Type** | `channel.chat.user_message_update` |
| **Version** | `v1` |
| **Scope** | `user:read:chat` |
| **Condition** | `broadcaster_user_id`, `user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The user whose message status changed
- `user_login` -- The user's login
- `user_name` -- The user's display name
- `message_id` -- The message's ID
- `message` -- Object with `text` and `fragments`
- `status` -- New status: `approved` or `denied`

---

### Channel Points

#### 36. channel.channel_points_custom_reward.add

A custom channel points reward has been created.

| Property | Value |
|----------|-------|
| **Type** | `channel.channel_points_custom_reward.add` |
| **Version** | `v1` |
| **Scope** | `channel:read:redemptions` or `channel:manage:redemptions` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `id` -- The reward ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `is_enabled` -- Whether the reward is enabled
- `is_paused` -- Whether the reward is paused
- `is_in_stock` -- Whether the reward is in stock
- `title` -- The reward title
- `cost` -- The reward cost in channel points
- `prompt` -- The reward prompt/description
- `is_user_input_required` -- Whether user input is required
- `should_redemptions_skip_request_queue` -- Whether redemptions skip the queue
- `max_per_stream` -- Object with `is_enabled` and `value`
- `max_per_user_per_stream` -- Object with `is_enabled` and `value`
- `background_color` -- The reward background color
- `image` -- Image URLs (null if using default)
- `default_image` -- Default image URLs
- `global_cooldown` -- Object with `is_enabled` and `seconds`
- `cooldown_expires_at` -- When the cooldown expires (null if not on cooldown)
- `redemptions_redeemed_current_stream` -- Number of redemptions this stream

---

#### 37. channel.channel_points_custom_reward.update

A custom channel points reward has been updated.

| Property | Value |
|----------|-------|
| **Type** | `channel.channel_points_custom_reward.update` |
| **Version** | `v1` |
| **Scope** | `channel:read:redemptions` or `channel:manage:redemptions` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**: Same as `channel.channel_points_custom_reward.add`.

---

#### 38. channel.channel_points_custom_reward.remove

A custom channel points reward has been removed.

| Property | Value |
|----------|-------|
| **Type** | `channel.channel_points_custom_reward.remove` |
| **Version** | `v1` |
| **Scope** | `channel:read:redemptions` or `channel:manage:redemptions` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**: Same as `channel.channel_points_custom_reward.add`.

---

#### 39. channel.channel_points_custom_reward_redemption.add

A custom channel points reward has been redeemed.

| Property | Value |
|----------|-------|
| **Type** | `channel.channel_points_custom_reward_redemption.add` |
| **Version** | `v1` |
| **Scope** | `channel:read:redemptions` or `channel:manage:redemptions` |
| **Condition** | `broadcaster_user_id`, `reward_id` (optional -- filter to specific reward) |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `id` -- The redemption ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The redeeming user's ID
- `user_login` -- The redeeming user's login
- `user_name` -- The redeeming user's display name
- `user_input` -- The user's input text (empty string if not required)
- `status` -- The redemption status: `unfulfilled`, `fulfilled`, `canceled`
- `reward` -- Object with `id`, `title`, `cost`, `prompt`
- `redeemed_at` -- Timestamp of redemption (RFC3339)

---

#### 40. channel.channel_points_custom_reward_redemption.update

A redemption status has been updated (fulfilled or canceled).

| Property | Value |
|----------|-------|
| **Type** | `channel.channel_points_custom_reward_redemption.update` |
| **Version** | `v1` |
| **Scope** | `channel:read:redemptions` or `channel:manage:redemptions` |
| **Condition** | `broadcaster_user_id`, `reward_id` (optional) |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**: Same as `channel.channel_points_custom_reward_redemption.add`.

---

#### 41. channel.channel_points_automatic_reward_redemption.add

An automatic (built-in) channel points reward has been redeemed (e.g., Highlight My Message, unlock a random emote).

| Property | Value |
|----------|-------|
| **Type** | `channel.channel_points_automatic_reward_redemption.add` |
| **Version** | `v1` |
| **Scope** | `channel:read:redemptions` or `channel:manage:redemptions` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The redeeming user's ID
- `user_login` -- The redeeming user's login
- `user_name` -- The redeeming user's display name
- `id` -- The redemption ID
- `reward` -- Object with reward details including `type` (e.g., `single_message_bypass_sub_mode`, `send_highlighted_message`, `random_sub_emote_unlock`, `chosen_sub_emote_unlock`, `chosen_modified_sub_emote_unlock`, `message_effect`, `gigantify_an_emote`, `celebration`)
- `message` -- Object with `text` and `emotes`
- `user_input` -- The user's input text
- `redeemed_at` -- Timestamp of redemption (RFC3339)

---

### Polls and Predictions

#### 42. channel.poll.begin

A poll has started on the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.poll.begin` |
| **Version** | `v1` |
| **Scope** | `channel:read:polls` or `channel:manage:polls` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `id` -- The poll ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `title` -- The poll question/title
- `choices` -- Array of choice objects with `id`, `title`, `bits_votes`, `channel_points_votes`, `votes`
- `bits_voting` -- Object with `is_enabled` and `amount_per_vote`
- `channel_points_voting` -- Object with `is_enabled` and `amount_per_vote`
- `started_at` -- Timestamp when the poll started (RFC3339)
- `ends_at` -- Timestamp when the poll will end (RFC3339)

---

#### 43. channel.poll.progress

A poll has received new votes.

| Property | Value |
|----------|-------|
| **Type** | `channel.poll.progress` |
| **Version** | `v1` |
| **Scope** | `channel:read:polls` or `channel:manage:polls` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**: Same as `channel.poll.begin` with updated vote counts in `choices`.

---

#### 44. channel.poll.end

A poll has ended on the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.poll.end` |
| **Version** | `v1` |
| **Scope** | `channel:read:polls` or `channel:manage:polls` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**: Same as `channel.poll.begin` plus:
- `status` -- How the poll ended: `completed`, `archived`, `terminated`
- `ended_at` -- Timestamp when the poll ended (RFC3339)

---

#### 45. channel.prediction.begin

A prediction has started on the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.prediction.begin` |
| **Version** | `v1` |
| **Scope** | `channel:read:predictions` or `channel:manage:predictions` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `id` -- The prediction ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `title` -- The prediction title
- `outcomes` -- Array of outcome objects with `id`, `title`, `color`, `users`, `channel_points`, `top_predictors`
- `started_at` -- Timestamp when the prediction started (RFC3339)
- `locks_at` -- Timestamp when the prediction will lock (RFC3339)

---

#### 46. channel.prediction.progress

A prediction has received new predictions from users.

| Property | Value |
|----------|-------|
| **Type** | `channel.prediction.progress` |
| **Version** | `v1` |
| **Scope** | `channel:read:predictions` or `channel:manage:predictions` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**: Same as `channel.prediction.begin` with updated outcome data.

---

#### 47. channel.prediction.lock

A prediction has been locked (no more predictions accepted).

| Property | Value |
|----------|-------|
| **Type** | `channel.prediction.lock` |
| **Version** | `v1` |
| **Scope** | `channel:read:predictions` or `channel:manage:predictions` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**: Same as `channel.prediction.begin` plus:
- `locked_at` -- Timestamp when the prediction was locked (RFC3339)

---

#### 48. channel.prediction.end

A prediction has ended (resolved or canceled).

| Property | Value |
|----------|-------|
| **Type** | `channel.prediction.end` |
| **Version** | `v1` |
| **Scope** | `channel:read:predictions` or `channel:manage:predictions` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**: Same as `channel.prediction.begin` plus:
- `winning_outcome_id` -- The ID of the winning outcome (null if canceled)
- `status` -- How the prediction ended: `resolved`, `canceled`
- `ended_at` -- Timestamp when the prediction ended (RFC3339)

---

### Hype Train

#### 49. channel.hype_train.begin

A Hype Train has started on the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.hype_train.begin` |
| **Version** | `v1` |
| **Scope** | `channel:read:hype_train` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Note**: Hype Train v1 events were deprecated in January 2026. Use the latest version available.

**Event payload fields**:
- `id` -- The Hype Train ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `total` -- Total points contributed
- `progress` -- Points contributed toward the current level
- `goal` -- Points required for the current level
- `top_contributions` -- Array of top contributor objects with `user_id`, `user_login`, `user_name`, `type` (`bits`, `subscription`, `other`), `total`
- `last_contribution` -- The most recent contribution object
- `level` -- Current Hype Train level
- `started_at` -- Timestamp when the Hype Train started (RFC3339)
- `expires_at` -- Timestamp when the Hype Train expires (RFC3339)

---

#### 50. channel.hype_train.progress

A Hype Train has progressed (new contribution received).

| Property | Value |
|----------|-------|
| **Type** | `channel.hype_train.progress` |
| **Version** | `v1` |
| **Scope** | `channel:read:hype_train` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**: Same as `channel.hype_train.begin` with updated progress data.

---

#### 51. channel.hype_train.end

A Hype Train has ended.

| Property | Value |
|----------|-------|
| **Type** | `channel.hype_train.end` |
| **Version** | `v1` |
| **Scope** | `channel:read:hype_train` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `id` -- The Hype Train ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `level` -- The final level reached
- `total` -- Total points contributed
- `top_contributions` -- Array of top contributor objects
- `started_at` -- Timestamp when the Hype Train started (RFC3339)
- `ended_at` -- Timestamp when the Hype Train ended (RFC3339)
- `cooldown_ends_at` -- Timestamp when the next Hype Train can start (RFC3339)

---

### Goals

#### 52. channel.goal.begin

A creator goal has been created.

| Property | Value |
|----------|-------|
| **Type** | `channel.goal.begin` |
| **Version** | `v1` |
| **Scope** | `channel:read:goals` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `id` -- The goal ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `type` -- The goal type: `follower`, `subscription`, `subscription_count`, `new_subscription`, `new_subscription_count`
- `description` -- The goal description
- `current_amount` -- Current progress toward the goal
- `target_amount` -- The target amount
- `started_at` -- Timestamp when the goal was created (RFC3339)

---

#### 53. channel.goal.progress

A creator goal has progressed (follower count changed, sub count changed, etc.).

| Property | Value |
|----------|-------|
| **Type** | `channel.goal.progress` |
| **Version** | `v1` |
| **Scope** | `channel:read:goals` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**: Same as `channel.goal.begin` with updated `current_amount`.

---

#### 54. channel.goal.end

A creator goal has ended (achieved or abandoned).

| Property | Value |
|----------|-------|
| **Type** | `channel.goal.end` |
| **Version** | `v1` |
| **Scope** | `channel:read:goals` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**: Same as `channel.goal.begin` plus:
- `is_achieved` -- Whether the goal was achieved
- `ended_at` -- Timestamp when the goal ended (RFC3339)

---

### Charity

#### 55. channel.charity_campaign.donate

A donation has been made to the channel's active charity campaign.

| Property | Value |
|----------|-------|
| **Type** | `channel.charity_campaign.donate` |
| **Version** | `v1` |
| **Scope** | `channel:read:charity` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `id` -- The donation ID
- `campaign_id` -- The charity campaign ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The donor's user ID
- `user_login` -- The donor's login
- `user_name` -- The donor's display name
- `charity_name` -- The charity name
- `charity_description` -- The charity description
- `charity_logo` -- The charity logo URL
- `charity_website` -- The charity website URL
- `amount` -- Object with `value` (integer, in minor currency unit) and `currency` (ISO 4217 code), `decimal_places`

---

#### 56. channel.charity_campaign.start

A charity campaign has started on the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.charity_campaign.start` |
| **Version** | `v1` |
| **Scope** | `channel:read:charity` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `id` -- The campaign ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `charity_name` -- The charity name
- `charity_description` -- The charity description
- `charity_logo` -- The charity logo URL
- `charity_website` -- The charity website URL
- `current_amount` -- Object with `value`, `currency`, `decimal_places`
- `target_amount` -- Object with `value`, `currency`, `decimal_places`
- `started_at` -- Timestamp (RFC3339)

---

#### 57. channel.charity_campaign.progress

A charity campaign has progressed (new donations received).

| Property | Value |
|----------|-------|
| **Type** | `channel.charity_campaign.progress` |
| **Version** | `v1` |
| **Scope** | `channel:read:charity` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**: Same as `channel.charity_campaign.start` with updated `current_amount`.

---

#### 58. channel.charity_campaign.stop

A charity campaign has stopped on the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.charity_campaign.stop` |
| **Version** | `v1` |
| **Scope** | `channel:read:charity` |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**: Same as `channel.charity_campaign.start` plus:
- `stopped_at` -- Timestamp when the campaign stopped (RFC3339)

---

### Shield Mode

#### 59. channel.shield_mode.begin

Shield mode has been activated on the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.shield_mode.begin` |
| **Version** | `v1` |
| **Scope** | `moderator:read:shield_mode` or `moderator:manage:shield_mode` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `moderator_user_id` -- The moderator who activated shield mode
- `moderator_user_login` -- The moderator's login
- `moderator_user_name` -- The moderator's display name
- `started_at` -- Timestamp when shield mode was activated (RFC3339)

---

#### 60. channel.shield_mode.end

Shield mode has been deactivated on the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.shield_mode.end` |
| **Version** | `v1` |
| **Scope** | `moderator:read:shield_mode` or `moderator:manage:shield_mode` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `moderator_user_id` -- The moderator who deactivated shield mode
- `moderator_user_login` -- The moderator's login
- `moderator_user_name` -- The moderator's display name
- `ended_at` -- Timestamp when shield mode was deactivated (RFC3339)

---

### Shoutouts

#### 61. channel.shoutout.create

A shoutout has been sent from the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.shoutout.create` |
| **Version** | `v1` |
| **Scope** | `moderator:read:shoutouts` or `moderator:manage:shoutouts` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `moderator_user_id` -- The moderator who created the shoutout
- `moderator_user_login` -- The moderator's login
- `moderator_user_name` -- The moderator's display name
- `to_broadcaster_user_id` -- The shoutout recipient's user ID
- `to_broadcaster_user_login` -- The recipient's login
- `to_broadcaster_user_name` -- The recipient's display name
- `viewer_count` -- Number of viewers at the time of shoutout
- `started_at` -- Timestamp of the shoutout (RFC3339)
- `cooldown_ends_at` -- When the shoutout cooldown ends (RFC3339)
- `target_cooldown_ends_at` -- When the target-specific cooldown ends (RFC3339)

---

#### 62. channel.shoutout.receive

The channel has received a shoutout from another channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.shoutout.receive` |
| **Version** | `v1` |
| **Scope** | `moderator:read:shoutouts` or `moderator:manage:shoutouts` |
| **Condition** | `broadcaster_user_id`, `moderator_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The receiving broadcaster's user ID
- `broadcaster_user_login` -- The receiving broadcaster's login
- `broadcaster_user_name` -- The receiving broadcaster's display name
- `from_broadcaster_user_id` -- The shoutout sender's user ID
- `from_broadcaster_user_login` -- The sender's login
- `from_broadcaster_user_name` -- The sender's display name
- `viewer_count` -- Number of viewers at the time
- `started_at` -- Timestamp of the shoutout (RFC3339)

---

### Shared Chat

#### 63. channel.shared_chat.begin

A channel has become active in a shared chat session.

| Property | Value |
|----------|-------|
| **Type** | `channel.shared_chat.begin` |
| **Version** | `v1` |
| **Scope** | No scope required |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `session_id` -- The shared chat session ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `host_broadcaster_user_id` -- The host broadcaster's user ID
- `host_broadcaster_user_login` -- The host's login
- `host_broadcaster_user_name` -- The host's display name
- `participants` -- Array of participant objects with `broadcaster_user_id`, `broadcaster_user_login`, `broadcaster_user_name`

---

#### 64. channel.shared_chat.update

A shared chat session has been updated (participants changed).

| Property | Value |
|----------|-------|
| **Type** | `channel.shared_chat.update` |
| **Version** | `v1` |
| **Scope** | No scope required |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**: Same as `channel.shared_chat.begin` with updated `participants`.

---

#### 65. channel.shared_chat.end

A shared chat session has ended for the channel.

| Property | Value |
|----------|-------|
| **Type** | `channel.shared_chat.end` |
| **Version** | `v1` |
| **Scope** | No scope required |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `session_id` -- The shared chat session ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `host_broadcaster_user_id` -- The host broadcaster's user ID
- `host_broadcaster_user_login` -- The host's login
- `host_broadcaster_user_name` -- The host's display name

---

### Streams

#### 66. stream.online

A stream has gone live.

| Property | Value |
|----------|-------|
| **Type** | `stream.online` |
| **Version** | `v1` |
| **Scope** | No scope required |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `id` -- The stream ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `type` -- The stream type: `live`, `playlist`, `watch_party`, `premiere`, `rerun`
- `started_at` -- Timestamp when the stream started (RFC3339)

---

#### 67. stream.offline

A stream has gone offline.

| Property | Value |
|----------|-------|
| **Type** | `stream.offline` |
| **Version** | `v1` |
| **Scope** | No scope required |
| **Condition** | `broadcaster_user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name

**Note**: The `stream.offline` event does not include a timestamp field for when the stream went offline.

---

### Users

#### 68. user.authorization.grant

A user has authorized your application.

| Property | Value |
|----------|-------|
| **Type** | `user.authorization.grant` |
| **Version** | `v1` |
| **Scope** | No scope required |
| **Condition** | `client_id` |
| **Transport** | **Webhook and Conduit only** (not available on WebSocket) |

**Event payload fields**:
- `client_id` -- Your application's client ID
- `user_id` -- The authorizing user's ID
- `user_login` -- The user's login
- `user_name` -- The user's display name

---

#### 69. user.authorization.revoke

A user has revoked authorization for your application.

| Property | Value |
|----------|-------|
| **Type** | `user.authorization.revoke` |
| **Version** | `v1` |
| **Scope** | No scope required |
| **Condition** | `client_id` |
| **Transport** | **Webhook and Conduit only** (not available on WebSocket) |

**Event payload fields**:
- `client_id` -- Your application's client ID
- `user_id` -- The user's ID
- `user_login` -- The user's login (may be null if account was deleted)
- `user_name` -- The user's display name (may be null if account was deleted)

---

#### 70. user.update

A user has updated their account information.

| Property | Value |
|----------|-------|
| **Type** | `user.update` |
| **Version** | `v1` |
| **Scope** | No scope required (add `user:read:email` to include email field) |
| **Condition** | `user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `user_id` -- The user's ID
- `user_login` -- The user's login
- `user_name` -- The user's display name
- `email` -- The user's email (only included if you have the `user:read:email` scope)
- `email_verified` -- Whether the email is verified (only with `user:read:email`)
- `description` -- The user's channel description

---

#### 71. user.whisper.message

A user has received a whisper (private message).

| Property | Value |
|----------|-------|
| **Type** | `user.whisper.message` |
| **Version** | `v1` |
| **Scope** | `user:read:whispers` or `user:manage:whispers` |
| **Condition** | `user_id` |
| **Transport** | Webhook, WebSocket, Conduit |

**Event payload fields**:
- `from_user_id` -- The sender's user ID
- `from_user_login` -- The sender's login
- `from_user_name` -- The sender's display name
- `to_user_id` -- The recipient's user ID
- `to_user_login` -- The recipient's login
- `to_user_name` -- The recipient's display name
- `whisper_id` -- The whisper message ID
- `whisper` -- Object with `text` (the message text)

---

### Conduit

#### 72. conduit.shard.disabled

A conduit shard has been disabled (connection lost or unhealthy).

| Property | Value |
|----------|-------|
| **Type** | `conduit.shard.disabled` |
| **Version** | `v1` |
| **Scope** | No scope required |
| **Condition** | `client_id` |
| **Transport** | **Webhook and Conduit only** |

**Event payload fields**:
- `conduit_id` -- The conduit ID
- `shard_id` -- The shard ID that was disabled
- `status` -- The shard status
- `transport` -- Object with transport details for the disabled shard

---

### Drops and Extensions

#### 73. drop.entitlement.grant

A Drop entitlement has been granted to a user.

| Property | Value |
|----------|-------|
| **Type** | `drop.entitlement.grant` |
| **Version** | `v1` |
| **Scope** | No scope required |
| **Condition** | `organization_id` (required), `category_id` (optional), `campaign_id` (optional) |
| **Transport** | **Webhook and Conduit only** (not available on WebSocket) |

**Note**: Events are batched -- a single notification may contain multiple entitlements. The `organization_id` is your organization ID from the Twitch developer console.

**Event payload fields** (per entitlement in the `events` array):
- `id` -- The entitlement ID
- `data` -- Array of entitlement objects, each containing:
  - `organization_id` -- Your organization ID
  - `category_id` -- The game/category ID
  - `category_name` -- The game/category name
  - `campaign_id` -- The campaign ID
  - `user_id` -- The entitled user's ID
  - `user_login` -- The user's login
  - `user_name` -- The user's display name
  - `entitlement_id` -- The entitlement ID
  - `benefit_id` -- The benefit ID
  - `created_at` -- Timestamp of the entitlement (RFC3339)

---

#### 74. extension.bits_transaction.create

A Bits transaction has occurred for a Twitch Extension.

| Property | Value |
|----------|-------|
| **Type** | `extension.bits_transaction.create` |
| **Version** | `v1` |
| **Scope** | No scope required |
| **Condition** | `extension_client_id` |
| **Transport** | **Webhook and Conduit only** (not available on WebSocket) |

**Note**: This covers Extension Bits transactions only. For regular channel cheers, use `channel.cheer` or `channel.bits.use`.

**Event payload fields**:
- `extension_client_id` -- The extension's client ID
- `id` -- The transaction ID
- `broadcaster_user_id` -- The broadcaster's user ID
- `broadcaster_user_login` -- The broadcaster's login
- `broadcaster_user_name` -- The broadcaster's display name
- `user_id` -- The user who used Bits
- `user_login` -- The user's login
- `user_name` -- The user's display name
- `product` -- Object with:
  - `name` -- The product name
  - `sku` -- The product SKU
  - `bits` -- Number of Bits
  - `in_development` -- Whether the product is in development

---

## Example Notification Payloads

### Notification Message Structure

Every EventSub notification follows this structure:

**WebSocket notification:**

```json
{
  "metadata": {
    "message_id": "befa7b53-d79d-478f-86b9-120f112b044e",
    "message_type": "notification",
    "message_timestamp": "2025-03-15T14:22:31.710327652Z",
    "subscription_type": "channel.chat.message",
    "subscription_version": "1"
  },
  "payload": {
    "subscription": {
      "id": "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
      "status": "enabled",
      "type": "channel.chat.message",
      "version": "1",
      "condition": {
        "broadcaster_user_id": "12345",
        "user_id": "67890"
      },
      "transport": {
        "method": "websocket",
        "session_id": "AgoQHR3s6QDCu..."
      },
      "created_at": "2025-03-15T14:00:00.000Z",
      "cost": 0
    },
    "event": {
      // Event-specific fields (see below)
    }
  }
}
```

**Webhook notification headers:**

```
Twitch-Eventsub-Message-Id: befa7b53-d79d-478f-86b9-120f112b044e
Twitch-Eventsub-Message-Type: notification
Twitch-Eventsub-Message-Timestamp: 2025-03-15T14:22:31.710327652Z
Twitch-Eventsub-Subscription-Type: channel.chat.message
Twitch-Eventsub-Subscription-Version: 1
Twitch-Eventsub-Message-Signature: sha256=abc123...
```

### Example: channel.chat.message

```json
{
  "subscription": {
    "id": "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
    "type": "channel.chat.message",
    "version": "1",
    "status": "enabled",
    "condition": {
      "broadcaster_user_id": "12345",
      "user_id": "67890"
    },
    "transport": {
      "method": "websocket",
      "session_id": "AgoQHR3s6QDCu..."
    },
    "created_at": "2025-03-15T14:00:00.000Z",
    "cost": 0
  },
  "event": {
    "broadcaster_user_id": "12345",
    "broadcaster_user_login": "cool_streamer",
    "broadcaster_user_name": "Cool_Streamer",
    "chatter_user_id": "67890",
    "chatter_user_login": "chatter_fan",
    "chatter_user_name": "Chatter_Fan",
    "message_id": "cc106895-d143-4a73-b152-7e9ee5e6b5a2",
    "message": {
      "text": "Hello everyone! PogChamp",
      "fragments": [
        {
          "type": "text",
          "text": "Hello everyone! ",
          "cheermote": null,
          "emote": null,
          "mention": null
        },
        {
          "type": "emote",
          "text": "PogChamp",
          "cheermote": null,
          "emote": {
            "id": "305954156",
            "emote_set_id": "0",
            "owner_id": "0",
            "format": ["static", "animated"]
          },
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
        "set_id": "premium",
        "id": "1",
        "info": ""
      }
    ],
    "cheer": null,
    "color": "#FF4500",
    "reply": null,
    "channel_points_custom_reward_id": null,
    "channel_points_animation_id": null,
    "source_broadcaster_user_id": null,
    "source_broadcaster_user_login": null,
    "source_broadcaster_user_name": null,
    "source_message_id": null,
    "source_badges": null
  }
}
```

### Example: stream.online

```json
{
  "subscription": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "type": "stream.online",
    "version": "1",
    "status": "enabled",
    "condition": {
      "broadcaster_user_id": "12345"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://example.com/webhooks/twitch"
    },
    "created_at": "2025-01-15T20:11:10.000Z",
    "cost": 1
  },
  "event": {
    "id": "9001",
    "broadcaster_user_id": "12345",
    "broadcaster_user_login": "cool_streamer",
    "broadcaster_user_name": "Cool_Streamer",
    "type": "live",
    "started_at": "2025-03-15T18:00:00.000000000Z"
  }
}
```

### Example: channel.subscribe

```json
{
  "subscription": {
    "id": "b1c2d3e4-f5g6-7890-hijk-lm1234567890",
    "type": "channel.subscribe",
    "version": "1",
    "status": "enabled",
    "condition": {
      "broadcaster_user_id": "12345"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://example.com/webhooks/twitch"
    },
    "created_at": "2025-01-15T20:11:10.000Z",
    "cost": 0
  },
  "event": {
    "user_id": "67890",
    "user_login": "new_sub_user",
    "user_name": "New_Sub_User",
    "broadcaster_user_id": "12345",
    "broadcaster_user_login": "cool_streamer",
    "broadcaster_user_name": "Cool_Streamer",
    "tier": "1000",
    "is_gift": false
  }
}
```

### Example: channel.follow (v2)

```json
{
  "subscription": {
    "id": "c1d2e3f4-g5h6-7890-ijkl-mn1234567890",
    "type": "channel.follow",
    "version": "2",
    "status": "enabled",
    "condition": {
      "broadcaster_user_id": "12345",
      "moderator_user_id": "12345"
    },
    "transport": {
      "method": "websocket",
      "session_id": "AgoQHR3s6QDCu..."
    },
    "created_at": "2025-01-15T20:11:10.000Z",
    "cost": 0
  },
  "event": {
    "user_id": "67890",
    "user_login": "new_follower",
    "user_name": "New_Follower",
    "broadcaster_user_id": "12345",
    "broadcaster_user_login": "cool_streamer",
    "broadcaster_user_name": "Cool_Streamer",
    "followed_at": "2025-03-15T18:30:00.000000000Z"
  }
}
```

### Example: channel.cheer

```json
{
  "subscription": {
    "id": "d1e2f3g4-h5i6-7890-jklm-no1234567890",
    "type": "channel.cheer",
    "version": "1",
    "status": "enabled",
    "condition": {
      "broadcaster_user_id": "12345"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://example.com/webhooks/twitch"
    },
    "created_at": "2025-01-15T20:11:10.000Z",
    "cost": 0
  },
  "event": {
    "is_anonymous": false,
    "user_id": "67890",
    "user_login": "generous_viewer",
    "user_name": "Generous_Viewer",
    "broadcaster_user_id": "12345",
    "broadcaster_user_login": "cool_streamer",
    "broadcaster_user_name": "Cool_Streamer",
    "message": "Cheer100 Great stream!",
    "bits": 100
  }
}
```

### Example: channel.channel_points_custom_reward_redemption.add

```json
{
  "subscription": {
    "id": "e1f2g3h4-i5j6-7890-klmn-op1234567890",
    "type": "channel.channel_points_custom_reward_redemption.add",
    "version": "1",
    "status": "enabled",
    "condition": {
      "broadcaster_user_id": "12345"
    },
    "transport": {
      "method": "websocket",
      "session_id": "AgoQHR3s6QDCu..."
    },
    "created_at": "2025-01-15T20:11:10.000Z",
    "cost": 0
  },
  "event": {
    "id": "17fa2df1-ad76-4804-bfa5-a40ef63efe63",
    "broadcaster_user_id": "12345",
    "broadcaster_user_login": "cool_streamer",
    "broadcaster_user_name": "Cool_Streamer",
    "user_id": "67890",
    "user_login": "redeeming_user",
    "user_name": "Redeeming_User",
    "user_input": "I want the streamer to do a backflip",
    "status": "unfulfilled",
    "reward": {
      "id": "92af127c-7326-4483-a52b-b0da0be61c01",
      "title": "Do Something Fun",
      "cost": 5000,
      "prompt": "Tell me what to do!"
    },
    "redeemed_at": "2025-03-15T19:00:00.000000000Z"
  }
}
```

### Example: channel.raid

```json
{
  "subscription": {
    "id": "f1g2h3i4-j5k6-7890-lmno-pq1234567890",
    "type": "channel.raid",
    "version": "1",
    "status": "enabled",
    "condition": {
      "to_broadcaster_user_id": "12345"
    },
    "transport": {
      "method": "websocket",
      "session_id": "AgoQHR3s6QDCu..."
    },
    "created_at": "2025-01-15T20:11:10.000Z",
    "cost": 0
  },
  "event": {
    "from_broadcaster_user_id": "99999",
    "from_broadcaster_user_login": "raiding_streamer",
    "from_broadcaster_user_name": "Raiding_Streamer",
    "to_broadcaster_user_id": "12345",
    "to_broadcaster_user_login": "cool_streamer",
    "to_broadcaster_user_name": "Cool_Streamer",
    "viewers": 487
  }
}
```

---

## Transport Compatibility

Most subscription types work with all three transports. The following are exceptions:

### Webhook and Conduit Only (Not Available on WebSocket)

| Subscription Type | Reason |
|-------------------|--------|
| `user.authorization.grant` | App-level event, requires app access token |
| `user.authorization.revoke` | App-level event, requires app access token |
| `drop.entitlement.grant` | Organization-level event |
| `extension.bits_transaction.create` | Extension-level event |
| `conduit.shard.disabled` | Infrastructure-level event |

### All Transports

All other subscription types (69 of 74) work with webhook, WebSocket, and conduit transports.

---

## Subscription Costs and Limits

### Cost System

Each subscription has a cost that counts against your application's limit:

| Scenario | Cost |
|----------|------|
| Subscription requires a user ID in condition, and that user has **authorized** your app | **0** |
| Subscription requires a user ID in condition, and that user has **not authorized** your app | **1** |
| Subscription does not require a user ID (e.g., uses `client_id`) | **0** |

### Limits by Transport

| Transport | Max Total Cost | Max Subscriptions per Connection | Max Connections |
|-----------|---------------|----------------------------------|-----------------|
| **Webhook** | 10,000 | N/A | N/A |
| **WebSocket** | 10 (per client_id + user_id pair) | 300 per connection | 3 connections with enabled subs |
| **Conduit** | 10,000 | N/A | N/A (uses shards) |

### Key Notes

- When `max_total_cost` is reached, no new subscriptions can be created even if they would have zero cost.
- Disabled subscriptions do not count against limits.
- WebSocket limits are per user token (client_id + user_id tuple), so different users have separate limits.
- For webhook/conduit, the limit scales with user authorizations.

---

## Best Practices

### General

1. **Use the latest version** of each subscription type. Deprecated versions are eventually removed.
2. **Deduplicate notifications** using the `message_id` field. Twitch may send the same event more than once.
3. **Validate timestamps** -- reject notifications with `message_timestamp` older than 10 minutes for replay attack protection.
4. **Handle revocations** gracefully. Subscriptions can be revoked for reasons like `authorization_revoked`, `user_removed`, or `version_removed`.

### WebSocket

5. **Respond to keepalive messages** -- if you do not receive a keepalive or notification within the keepalive timeout, reconnect.
6. **Handle reconnect messages** -- when Twitch sends a `session_reconnect` message, connect to the new URL before disconnecting from the old one.
7. **Subscribe within 10 seconds** of receiving the welcome message, or the connection will be closed.

### Webhook

8. **Verify signatures** on all incoming webhook notifications using HMAC-SHA256 with your secret.
9. **Respond quickly** -- return a 2xx status code within a few seconds. Process events asynchronously if needed.
10. **Handle the verification challenge** -- when `Twitch-Eventsub-Message-Type` is `webhook_callback_verification`, respond with the `challenge` value in the body.

### Scopes

11. **Request only needed scopes** -- minimize the OAuth scopes you request to what your application actually uses.
12. **Use `or` scopes wisely** -- when a subscription accepts either a read or manage scope (e.g., `channel:read:redemptions` or `channel:manage:redemptions`), use the read scope unless you also need to manage the resource.

### Performance

13. **Use conduit transport** for applications that need to handle events for many channels at scale.
14. **Filter with condition fields** -- for `channel.channel_points_custom_reward_redemption.add`, use the optional `reward_id` condition to filter to specific rewards instead of receiving all redemptions.
15. **Batch process drop entitlements** -- `drop.entitlement.grant` events are batched, so handle arrays of entitlements in a single notification.

---

## Known Issues and Notes

### Beta Subscription Types

| Type | Notes |
|------|-------|
| `channel.bits.use` (v1) | Currently in beta. May change without notice. Do not rely on it in production. Use `channel.cheer` as a stable alternative for Bits cheers. |

### Version Deprecations

| Type | Deprecated Version | Current Version | Notes |
|------|-------------------|-----------------|-------|
| `channel.follow` | v1 (removed) | **v2** | v2 requires `moderator_user_id` in condition |
| `channel.update` | v1 (removed) | **v2** | v2 adds `content_classification_labels` |
| `channel.hype_train.begin` | v1 (deprecated Jan 2026) | Check latest | Use the latest available version |
| `channel.hype_train.progress` | v1 (deprecated Jan 2026) | Check latest | Use the latest available version |
| `channel.hype_train.end` | v1 (deprecated Jan 2026) | Check latest | Use the latest available version |
| `automod.message.hold` | v1 | **v2** available | v2 adds enhanced classification data |
| `automod.message.update` | v1 | **v2** available | v2 adds enhanced data |
| `channel.moderate` | v1 | **v2** available | v2 adds additional action types |

### PubSub Migration

PubSub was fully decommissioned on April 14, 2025. All PubSub topics have EventSub equivalents:

| PubSub Topic | EventSub Equivalent |
|-------------|---------------------|
| `channel-bits-events-v2` | `channel.cheer` or `channel.bits.use` |
| `channel-subscribe-events-v1` | `channel.subscribe`, `channel.subscription.gift`, `channel.subscription.message` |
| `channel-points-channel-v1` | `channel.channel_points_custom_reward_redemption.add` |
| `chat_moderator_actions` | `channel.moderate` |
| `whispers` | `user.whisper.message` |
| `automod-queue` | `automod.message.hold`, `automod.message.update` |

### Other Notes

- **Shared chat fields**: Events like `channel.chat.message` include `source_*` fields (source_broadcaster_user_id, source_message_id, source_badges) that are only populated during shared chat sessions. They are null otherwise.
- **Anonymous events**: Some events (like `channel.cheer` and `channel.subscription.gift`) support anonymous users. When anonymous, user fields (`user_id`, `user_login`, `user_name`) are null.
- **Timestamps**: All timestamps use RFC3339 format with nanosecond precision (e.g., `2025-03-15T18:00:00.000000000Z`).
- **stream.offline limitation**: Unlike `stream.online`, the `stream.offline` event does not include a timestamp for when the stream ended.

---

## Quick Reference Table

| # | Subscription Type | Ver | Scope | Condition | Beta |
|---|-------------------|-----|-------|-----------|------|
| 1 | `automod.message.hold` | v1/v2 | `moderator:manage:automod` | broadcaster_user_id, moderator_user_id | |
| 2 | `automod.message.update` | v1/v2 | `moderator:manage:automod` | broadcaster_user_id, moderator_user_id | |
| 3 | `automod.settings.update` | v1 | `moderator:read:automod_settings` | broadcaster_user_id, moderator_user_id | |
| 4 | `automod.terms.update` | v1 | `moderator:manage:automod` | broadcaster_user_id, moderator_user_id | |
| 5 | `channel.update` | v2 | (none) | broadcaster_user_id | |
| 6 | `channel.follow` | v2 | `moderator:read:followers` | broadcaster_user_id, moderator_user_id | |
| 7 | `channel.ad_break.begin` | v1 | `channel:read:ads` | broadcaster_user_id | |
| 8 | `channel.bits.use` | v1 | `bits:read` | broadcaster_user_id | BETA |
| 9 | `channel.cheer` | v1 | `bits:read` | broadcaster_user_id | |
| 10 | `channel.subscribe` | v1 | `channel:read:subscriptions` | broadcaster_user_id | |
| 11 | `channel.subscription.end` | v1 | `channel:read:subscriptions` | broadcaster_user_id | |
| 12 | `channel.subscription.gift` | v1 | `channel:read:subscriptions` | broadcaster_user_id | |
| 13 | `channel.subscription.message` | v1 | `channel:read:subscriptions` | broadcaster_user_id | |
| 14 | `channel.ban` | v1 | `channel:moderate` | broadcaster_user_id | |
| 15 | `channel.unban` | v1 | `channel:moderate` | broadcaster_user_id | |
| 16 | `channel.unban_request.create` | v1 | `moderator:read:unban_requests` | broadcaster_user_id, moderator_user_id | |
| 17 | `channel.unban_request.resolve` | v1 | `moderator:read:unban_requests` | broadcaster_user_id, moderator_user_id | |
| 18 | `channel.moderate` | v1/v2 | `moderator:read:moderators` + varies | broadcaster_user_id, moderator_user_id | |
| 19 | `channel.moderator.add` | v1 | `moderation:read` | broadcaster_user_id | |
| 20 | `channel.moderator.remove` | v1 | `moderation:read` | broadcaster_user_id | |
| 21 | `channel.raid` | v1 | (none) | from_broadcaster_user_id OR to_broadcaster_user_id | |
| 22 | `channel.vip.add` | v1 | `channel:read:vips` | broadcaster_user_id | |
| 23 | `channel.vip.remove` | v1 | `channel:read:vips` | broadcaster_user_id | |
| 24 | `channel.warning.send` | v1 | `moderator:read:warnings` | broadcaster_user_id, moderator_user_id | |
| 25 | `channel.warning.acknowledge` | v1 | `moderator:read:warnings` | broadcaster_user_id, moderator_user_id | |
| 26 | `channel.suspicious_user.message` | v1 | `moderator:read:suspicious_users` | broadcaster_user_id, moderator_user_id | |
| 27 | `channel.suspicious_user.update` | v1 | `moderator:read:suspicious_users` | broadcaster_user_id, moderator_user_id | |
| 28 | `channel.chat.clear` | v1 | `user:read:chat` | broadcaster_user_id, user_id | |
| 29 | `channel.chat.clear_user_messages` | v1 | `user:read:chat` | broadcaster_user_id, user_id | |
| 30 | `channel.chat.message` | v1 | `user:read:chat` | broadcaster_user_id, user_id | |
| 31 | `channel.chat.message_delete` | v1 | `user:read:chat` | broadcaster_user_id, user_id | |
| 32 | `channel.chat.notification` | v1 | `user:read:chat` | broadcaster_user_id, user_id | |
| 33 | `channel.chat_settings.update` | v1 | `user:read:chat` | broadcaster_user_id, user_id | |
| 34 | `channel.chat.user_message_hold` | v1 | `user:read:chat` | broadcaster_user_id, user_id | |
| 35 | `channel.chat.user_message_update` | v1 | `user:read:chat` | broadcaster_user_id, user_id | |
| 36 | `channel.channel_points_custom_reward.add` | v1 | `channel:read:redemptions` | broadcaster_user_id | |
| 37 | `channel.channel_points_custom_reward.update` | v1 | `channel:read:redemptions` | broadcaster_user_id | |
| 38 | `channel.channel_points_custom_reward.remove` | v1 | `channel:read:redemptions` | broadcaster_user_id | |
| 39 | `channel.channel_points_custom_reward_redemption.add` | v1 | `channel:read:redemptions` | broadcaster_user_id, reward_id? | |
| 40 | `channel.channel_points_custom_reward_redemption.update` | v1 | `channel:read:redemptions` | broadcaster_user_id, reward_id? | |
| 41 | `channel.channel_points_automatic_reward_redemption.add` | v1 | `channel:read:redemptions` | broadcaster_user_id | |
| 42 | `channel.poll.begin` | v1 | `channel:read:polls` | broadcaster_user_id | |
| 43 | `channel.poll.progress` | v1 | `channel:read:polls` | broadcaster_user_id | |
| 44 | `channel.poll.end` | v1 | `channel:read:polls` | broadcaster_user_id | |
| 45 | `channel.prediction.begin` | v1 | `channel:read:predictions` | broadcaster_user_id | |
| 46 | `channel.prediction.progress` | v1 | `channel:read:predictions` | broadcaster_user_id | |
| 47 | `channel.prediction.lock` | v1 | `channel:read:predictions` | broadcaster_user_id | |
| 48 | `channel.prediction.end` | v1 | `channel:read:predictions` | broadcaster_user_id | |
| 49 | `channel.hype_train.begin` | v1 | `channel:read:hype_train` | broadcaster_user_id | |
| 50 | `channel.hype_train.progress` | v1 | `channel:read:hype_train` | broadcaster_user_id | |
| 51 | `channel.hype_train.end` | v1 | `channel:read:hype_train` | broadcaster_user_id | |
| 52 | `channel.goal.begin` | v1 | `channel:read:goals` | broadcaster_user_id | |
| 53 | `channel.goal.progress` | v1 | `channel:read:goals` | broadcaster_user_id | |
| 54 | `channel.goal.end` | v1 | `channel:read:goals` | broadcaster_user_id | |
| 55 | `channel.charity_campaign.donate` | v1 | `channel:read:charity` | broadcaster_user_id | |
| 56 | `channel.charity_campaign.start` | v1 | `channel:read:charity` | broadcaster_user_id | |
| 57 | `channel.charity_campaign.progress` | v1 | `channel:read:charity` | broadcaster_user_id | |
| 58 | `channel.charity_campaign.stop` | v1 | `channel:read:charity` | broadcaster_user_id | |
| 59 | `channel.shield_mode.begin` | v1 | `moderator:read:shield_mode` | broadcaster_user_id, moderator_user_id | |
| 60 | `channel.shield_mode.end` | v1 | `moderator:read:shield_mode` | broadcaster_user_id, moderator_user_id | |
| 61 | `channel.shoutout.create` | v1 | `moderator:read:shoutouts` | broadcaster_user_id, moderator_user_id | |
| 62 | `channel.shoutout.receive` | v1 | `moderator:read:shoutouts` | broadcaster_user_id, moderator_user_id | |
| 63 | `channel.shared_chat.begin` | v1 | (none) | broadcaster_user_id | |
| 64 | `channel.shared_chat.update` | v1 | (none) | broadcaster_user_id | |
| 65 | `channel.shared_chat.end` | v1 | (none) | broadcaster_user_id | |
| 66 | `stream.online` | v1 | (none) | broadcaster_user_id | |
| 67 | `stream.offline` | v1 | (none) | broadcaster_user_id | |
| 68 | `user.authorization.grant` | v1 | (none) | client_id | |
| 69 | `user.authorization.revoke` | v1 | (none) | client_id | |
| 70 | `user.update` | v1 | (none) | user_id | |
| 71 | `user.whisper.message` | v1 | `user:read:whispers` | user_id | |
| 72 | `conduit.shard.disabled` | v1 | (none) | client_id | |
| 73 | `drop.entitlement.grant` | v1 | (none) | organization_id, category_id?, campaign_id? | |
| 74 | `extension.bits_transaction.create` | v1 | (none) | extension_client_id | |

**Legend**: `?` = optional condition field, `(none)` = no scope required, `BETA` = beta/unstable

---

## Related Documentation

- [EventSub Overview](twitch-eventsub-webhooks.md)
- [EventSub WebSockets](twitch-eventsub-websockets.md)
- [EventSub Conduits](twitch-eventsub-conduits.md)
- [Twitch Scopes Reference](twitch-scopes-reference.md)
- [PubSub Migration Guide](twitch-pubsub-migration.md)
- [Twitch Authentication](twitch-authentication.md)
