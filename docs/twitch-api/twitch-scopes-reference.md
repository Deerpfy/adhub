# Twitch OAuth Scopes Reference

## Overview

Twitch uses OAuth 2.0 scopes to control what data and actions an application can access on behalf of a user. When a user authorizes your application, they see the list of permissions (scopes) you are requesting and must approve them. Scopes are the fundamental authorization mechanism for the Twitch API and EventSub system.

### How Scopes Work

1. Your application requests specific scopes during the OAuth authorization flow.
2. The user sees a consent screen listing the requested permissions.
3. Upon approval, the issued access token is bound to those scopes.
4. API calls that require a scope will fail with `401 Unauthorized` if the token lacks it.
5. Scopes cannot be added to an existing token; the user must re-authorize.

### Requesting Scopes

Scopes are passed as a space-delimited string in the `scope` parameter of the authorization URL. When used in a URL, spaces must be URL-encoded as `+` or `%20`.

```
https://id.twitch.tv/oauth2/authorize?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  response_type=code&
  scope=user%3Aread%3Achat+user%3Awrite%3Achat+moderator%3Aread%3Achatters
```

Colons in scope names must also be URL-encoded as `%3A` when included in query parameters.

**Important:** Only request the scopes your application actually needs. Requesting excessive scopes will cause users to distrust your application and may violate Twitch Developer Agreement policies. Twitch may also flag applications that request scopes they never use.

---

## Complete Scope Reference by Category

### Analytics Scopes

| Scope | Description | API Endpoints | EventSub Types |
|-------|-------------|---------------|----------------|
| `analytics:read:extensions` | View analytics data for the user's Extensions. | Get Extension Analytics | -- |
| `analytics:read:games` | View analytics data for the user's games. | Get Game Analytics | -- |

### Bits Scopes

| Scope | Description | API Endpoints | EventSub Types |
|-------|-------------|---------------|----------------|
| `bits:read` | View Bits information for a channel. | Get Bits Leaderboard, Get Cheermotes | `channel.cheer` |

### Channel Scopes

| Scope | Description | API Endpoints | EventSub Types |
|-------|-------------|---------------|----------------|
| `channel:bot` | Allows the client's bot user to act in the specified channel. Required for bot accounts joining channels. | -- | `channel.chat.message`, `channel.chat.notification`, `channel.chat.clear`, `channel.chat.clear_user_message`, `channel.chat.message_delete`, `channel.chat_settings.update` |
| `channel:edit:commercial` | Run commercials on a channel. | Start Commercial | -- |
| `channel:manage:ads` | Manage ads schedule on a channel. | Snooze Next Ad, Get Ad Schedule | `channel.ad_break.begin` |
| `channel:manage:broadcast` | Manage a channel's broadcast configuration, including stream markers, tags, and stream settings. | Modify Channel Information, Create Stream Marker, Replace Stream Tags | -- |
| `channel:manage:extensions` | Manage a channel's Extension configuration. | Get User Extensions, Update User Extensions | -- |
| `channel:manage:guest_star` | Manage Guest Star sessions, invites, and settings on a channel. | Update Channel Guest Star Settings, Create Guest Star Session, End Guest Star Session, Send Guest Star Invite, Delete Guest Star Invite, Assign Guest Star Slot, Update Guest Star Slot, Delete Guest Star Slot | `channel.guest_star_session.begin`, `channel.guest_star_session.end`, `channel.guest_star_guest.update`, `channel.guest_star_settings.update` |
| `channel:manage:moderators` | Add or remove the moderator role from users on a channel. | Add Channel Moderator, Remove Channel Moderator | -- |
| `channel:manage:polls` | Manage polls on a channel. | Create Poll, End Poll | `channel.poll.begin`, `channel.poll.progress`, `channel.poll.end` |
| `channel:manage:predictions` | Manage predictions on a channel. | Create Prediction, End Prediction | `channel.prediction.begin`, `channel.prediction.progress`, `channel.prediction.lock`, `channel.prediction.end` |
| `channel:manage:raids` | Manage raids on a channel (start and cancel). | Start a Raid, Cancel a Raid | -- |
| `channel:manage:redemptions` | Manage Channel Points custom rewards and their redemptions on a channel. | Create Custom Rewards, Delete Custom Rewards, Update Custom Rewards, Update Redemption Status | `channel.channel_points_custom_reward.add`, `channel.channel_points_custom_reward.update`, `channel.channel_points_custom_reward.remove`, `channel.channel_points_custom_reward_redemption.add`, `channel.channel_points_custom_reward_redemption.update` |
| `channel:manage:schedule` | Manage a channel's stream schedule. | Create Channel Stream Schedule Segment, Update Channel Stream Schedule Segment, Delete Channel Stream Schedule Segment | -- |
| `channel:manage:videos` | Manage a channel's videos, including deleting videos. | Delete Videos | -- |
| `channel:manage:vips` | Add or remove the VIP role from users on a channel. | Add Channel VIP, Remove Channel VIP | -- |
| `channel:moderate` | Perform moderation actions in a channel. **Deprecated:** Use specific `moderator:` scopes instead. | -- | *(legacy)* |
| `channel:read:ads` | Read the ads schedule and details on a channel. | Get Ad Schedule | `channel.ad_break.begin` |
| `channel:read:charity` | Read charity campaign details on a channel. | Get Charity Campaign, Get Charity Campaign Donations | `channel.charity_campaign.donate`, `channel.charity_campaign.start`, `channel.charity_campaign.progress`, `channel.charity_campaign.stop` |
| `channel:read:editors` | View a list of users that are editors for a channel. | Get Channel Editors | -- |
| `channel:read:goals` | View Creator Goals for a channel. | Get Creator Goals | `channel.goal.begin`, `channel.goal.progress`, `channel.goal.end` |
| `channel:read:guest_star` | Read Guest Star details on a channel. | Get Channel Guest Star Settings, Get Guest Star Session, Get Guest Star Invites | `channel.guest_star_session.begin`, `channel.guest_star_session.end`, `channel.guest_star_guest.update`, `channel.guest_star_settings.update` |
| `channel:read:hype_train` | Read Hype Train information for a channel. | Get Hype Train Events | `channel.hype_train.begin`, `channel.hype_train.progress`, `channel.hype_train.end` |
| `channel:read:polls` | Read polls on a channel. | Get Polls | `channel.poll.begin`, `channel.poll.progress`, `channel.poll.end` |
| `channel:read:predictions` | Read predictions on a channel. | Get Predictions | `channel.prediction.begin`, `channel.prediction.progress`, `channel.prediction.lock`, `channel.prediction.end` |
| `channel:read:redemptions` | Read Channel Points custom rewards and their redemptions on a channel. | Get Custom Reward, Get Custom Reward Redemption | `channel.channel_points_custom_reward.add`, `channel.channel_points_custom_reward.update`, `channel.channel_points_custom_reward.remove`, `channel.channel_points_custom_reward_redemption.add`, `channel.channel_points_custom_reward_redemption.update` |
| `channel:read:stream_key` | Read an authorized user's stream key. | Get Stream Key | -- |
| `channel:read:subscriptions` | Read subscriber list and check subscription status for a channel. | Get Broadcaster Subscriptions, Check User Subscription | `channel.subscribe`, `channel.subscription.end`, `channel.subscription.gift`, `channel.subscription.message` |
| `channel:read:vips` | Read the list of VIPs in a channel. | Get VIPs | -- |

### Chat Scopes

| Scope | Description | API Endpoints | EventSub Types |
|-------|-------------|---------------|----------------|
| `chat:edit` | Send live chat messages. **Legacy IRC scope.** For new integrations, use `user:write:chat` instead. | -- (IRC only) | -- |
| `chat:read` | View live chat messages. **Legacy IRC scope.** For new integrations, use `user:read:chat` instead. | -- (IRC only) | -- |

### Clips Scopes

| Scope | Description | API Endpoints | EventSub Types |
|-------|-------------|---------------|----------------|
| `clips:edit` | Create clips on a channel. | Create Clip | -- |

### Moderation Scopes

| Scope | Description | API Endpoints | EventSub Types |
|-------|-------------|---------------|----------------|
| `moderation:read` | View a channel's moderation data, including moderators, bans, timeouts, and AutoMod settings. | Check AutoMod Status, Get Banned Users, Get Moderators | -- |
| `moderator:manage:announcements` | Send announcements in channels where the user has moderator permissions. | Send Chat Announcement | -- |
| `moderator:manage:automod` | Manage AutoMod message holds (approve or deny). | Manage Held AutoMod Messages | `automod.message.hold`, `automod.message.update` |
| `moderator:manage:automod_settings` | Manage AutoMod settings for a channel. | Update AutoMod Settings | -- |
| `moderator:manage:banned_users` | Ban and unban users in a channel. | Ban User, Unban User | `channel.ban`, `channel.unban` |
| `moderator:manage:blocked_terms` | Manage blocked terms in a channel. | Add Blocked Term, Remove Blocked Term | -- |
| `moderator:manage:chat_messages` | Delete chat messages in a channel. | Delete Chat Messages | -- |
| `moderator:manage:chat_settings` | Manage chat settings for a channel (slow mode, followers-only, etc.). | Update Chat Settings | -- |
| `moderator:manage:guest_star` | Manage Guest Star sessions as a moderator. | Update Channel Guest Star Settings, Create Guest Star Session, End Guest Star Session, Send Guest Star Invite, Delete Guest Star Invite, Assign Guest Star Slot, Update Guest Star Slot, Delete Guest Star Slot | `channel.guest_star_session.begin`, `channel.guest_star_session.end`, `channel.guest_star_guest.update`, `channel.guest_star_settings.update` |
| `moderator:manage:shield_mode` | Manage Shield Mode status for a channel. | Update Shield Mode Status | `channel.shield_mode.begin`, `channel.shield_mode.end` |
| `moderator:manage:shoutouts` | Manage shoutouts in a channel. | Send a Shoutout | `channel.shoutout.create`, `channel.shoutout.receive` |
| `moderator:manage:unban_requests` | Manage unban requests in a channel (approve or deny). | Resolve Unban Request | `channel.unban_request.create`, `channel.unban_request.resolve` |
| `moderator:manage:warnings` | Warn users in a channel. | Send User Warning | `channel.warning.send` |
| `moderator:read:automod_settings` | Read AutoMod settings for a channel. | Get AutoMod Settings | `automod.settings.update` |
| `moderator:read:blocked_terms` | Read blocked terms for a channel. | Get Blocked Terms | -- |
| `moderator:read:chat_settings` | Read chat settings for a channel. | Get Chat Settings | `channel.chat_settings.update` |
| `moderator:read:chatters` | Read the list of chatters in a channel. | Get Chatters | -- |
| `moderator:read:followers` | Read the followers of a channel. Required for the `channel.follow` (v2) EventSub subscription type. | Get Channel Followers | `channel.follow` (v2) |
| `moderator:read:guest_star` | Read Guest Star details as a moderator. | Get Channel Guest Star Settings, Get Guest Star Session, Get Guest Star Invites | `channel.guest_star_session.begin`, `channel.guest_star_session.end`, `channel.guest_star_guest.update`, `channel.guest_star_settings.update` |
| `moderator:read:moderators` | Read the list of moderators for a channel. | Get Moderators | `channel.moderate` (v2) |
| `moderator:read:shield_mode` | Read Shield Mode status for a channel. | Get Shield Mode Status | `channel.shield_mode.begin`, `channel.shield_mode.end` |
| `moderator:read:shoutouts` | Read shoutouts in a channel. | -- | `channel.shoutout.create`, `channel.shoutout.receive` |
| `moderator:read:suspicious_users` | Read suspicious user information for a channel. | -- | `channel.suspicious_user.message`, `channel.suspicious_user.update` |
| `moderator:read:unban_requests` | Read unban requests in a channel. | Get Unban Requests | `channel.unban_request.create`, `channel.unban_request.resolve` |
| `moderator:read:vips` | Read the list of VIPs in a channel. | Get VIPs | -- |
| `moderator:read:warnings` | Read warnings for a channel. | -- | `channel.warning.acknowledge`, `channel.warning.send` |

### User Scopes

| Scope | Description | API Endpoints | EventSub Types |
|-------|-------------|---------------|----------------|
| `user:bot` | Allows the client's bot user to act across channels. Required for bot accounts in the EventSub system. | -- | `channel.chat.message`, `channel.chat.notification`, `channel.chat.clear`, `channel.chat.clear_user_message`, `channel.chat.message_delete`, `channel.chat_settings.update` |
| `user:edit` | Manage a user's profile (description, profile image, etc.). | Update User | -- |
| `user:edit:broadcast` | Edit a user's broadcast configuration. **Deprecated:** Use `channel:manage:broadcast` instead. | -- | -- |
| `user:edit:follows` | Follow and unfollow users. **Deprecated and removed.** No longer functional. | -- | -- |
| `user:manage:blocked_users` | Manage a user's block list. | Block User, Unblock User | -- |
| `user:manage:chat_color` | Update a user's chat color. | Update User Chat Color | -- |
| `user:manage:whispers` | Send and manage whispers. | Send Whisper | `user.whisper.message` |
| `user:read:blocked_users` | Read a user's block list. | Get User Block List | -- |
| `user:read:broadcast` | Read a user's broadcast configuration, including Extension configurations. | Get Stream Key, Get Channel Information | -- |
| `user:read:chat` | Receive chat messages and chat-related events via EventSub. Required for reading chat via WebSocket-based EventSub. | -- | `channel.chat.message`, `channel.chat.notification`, `channel.chat.clear`, `channel.chat.clear_user_message`, `channel.chat.message_delete`, `channel.chat_settings.update` |
| `user:read:email` | Read a user's email address. | Get Users (includes `email` field) | -- |
| `user:read:emotes` | Read emotes available to a user. | Get User Emotes | -- |
| `user:read:follows` | Read the list of channels a user follows. | Get Followed Channels, Get Followed Streams | -- |
| `user:read:moderated_channels` | Read the list of channels the user moderates. | Get Moderated Channels | -- |
| `user:read:subscriptions` | Read a user's subscriptions. | Check User Subscription | -- |
| `user:read:whispers` | Receive whisper messages via EventSub. | -- | `user.whisper.message` |
| `user:write:chat` | Send chat messages via the Helix API. This is the modern replacement for `chat:edit`. | Send Chat Message | -- |

### Whisper Scopes (Legacy)

| Scope | Description | API Endpoints | EventSub Types |
|-------|-------------|---------------|----------------|
| `whispers:edit` | Send whispers. **Legacy IRC scope.** Use `user:manage:whispers` instead. | -- (IRC only) | -- |
| `whispers:read` | Receive whispers. **Legacy IRC scope.** Use `user:read:whispers` instead. | -- (IRC only) | -- |

---

## Minimum Scope Sets for Common Use Cases

### Chat Bot

A bot that reads and sends messages in Twitch chat channels using the modern EventSub/Helix approach.

```
user:read:chat
user:write:chat
user:bot
channel:bot
moderator:read:chatters
```

**Notes:**
- `user:bot` is required on the bot account's token.
- `channel:bot` is required on the broadcaster's token (the channel the bot is joining).
- `moderator:read:chatters` allows the bot to see who is in chat.
- If the bot only needs to read chat (not send messages), omit `user:write:chat`.

### Stream Alerts Overlay

An overlay that displays alerts for subscriptions, cheers, raids, and follows.

```
bits:read
channel:read:subscriptions
channel:read:redemptions
channel:read:hype_train
moderator:read:followers
```

**EventSub subscription types used:**
- `channel.subscribe` -- New subscription alerts
- `channel.subscription.gift` -- Gift sub alerts
- `channel.subscription.message` -- Resub message alerts
- `channel.cheer` -- Bit cheer alerts
- `channel.raid` -- Incoming raid alerts (no scope required)
- `channel.follow` (v2) -- New follower alerts (requires `moderator:read:followers`)
- `channel.hype_train.begin` / `progress` / `end` -- Hype train events
- `channel.channel_points_custom_reward_redemption.add` -- Channel point redemption alerts

### Moderation Bot

A bot that performs moderation actions such as banning, timing out, and managing chat.

```
moderator:manage:banned_users
moderator:manage:chat_messages
moderator:manage:chat_settings
moderator:manage:automod
moderator:manage:blocked_terms
moderator:manage:announcements
moderator:manage:shield_mode
moderator:manage:warnings
moderator:read:chatters
moderator:read:automod_settings
moderator:read:blocked_terms
```

**Notes:**
- The bot's user account must be a moderator in the target channel.
- Add `moderator:manage:unban_requests` if the bot should handle unban requests.
- Add `moderator:manage:shoutouts` if the bot should send shoutouts.

### Analytics Dashboard

A dashboard that displays Extension and game analytics.

```
analytics:read:extensions
analytics:read:games
```

**Notes:**
- Analytics data is available only for Extensions and games owned by the authenticated user.
- Data may be delayed by up to 48 hours.

### Channel Point Rewards Manager

An application that creates and manages custom Channel Point rewards and handles redemptions.

```
channel:manage:redemptions
channel:read:redemptions
```

**EventSub subscription types used:**
- `channel.channel_points_custom_reward.add` -- Reward created
- `channel.channel_points_custom_reward.update` -- Reward updated
- `channel.channel_points_custom_reward.remove` -- Reward deleted
- `channel.channel_points_custom_reward_redemption.add` -- New redemption
- `channel.channel_points_custom_reward_redemption.update` -- Redemption status changed

**Notes:**
- `channel:manage:redemptions` is required to create custom rewards and update redemption statuses (fulfill/cancel).
- `channel:read:redemptions` alone allows viewing rewards and redemptions but not managing them.

### Poll and Prediction Manager

An application that creates, manages, and monitors polls and predictions.

```
channel:manage:polls
channel:manage:predictions
channel:read:polls
channel:read:predictions
```

**EventSub subscription types used:**
- `channel.poll.begin` / `progress` / `end`
- `channel.prediction.begin` / `progress` / `lock` / `end`

**Notes:**
- The `manage` scopes include the ability to read, so `read` scopes are only necessary if you want a separate read-only token.
- Predictions can be locked (preventing new entries) before resolving them.

---

## Legacy vs. Modern Scopes

Twitch has evolved its scope system over time. Several legacy scopes from the IRC and PubSub era have been replaced by more specific modern equivalents.

### IRC / PubSub (Legacy)

| Legacy Scope | Modern Replacement | Notes |
|---|---|---|
| `chat:read` | `user:read:chat` | IRC scope for reading chat. Modern EventSub uses `user:read:chat`. |
| `chat:edit` | `user:write:chat` | IRC scope for sending messages. Modern Helix API uses `user:write:chat`. |
| `whispers:read` | `user:read:whispers` | IRC scope for receiving whispers. Modern EventSub uses `user:read:whispers`. |
| `whispers:edit` | `user:manage:whispers` | IRC scope for sending whispers. Modern Helix API uses `user:manage:whispers`. |
| `channel:moderate` | `moderator:manage:*` | Broad legacy scope. Use specific `moderator:` scopes instead. |
| `user:edit:broadcast` | `channel:manage:broadcast` | Deprecated in favor of channel-level scope. |
| `user:edit:follows` | *(removed)* | Follow/unfollow via API was removed entirely. |

### Key Differences

- **IRC scopes** (`chat:read`, `chat:edit`, `whispers:read`, `whispers:edit`) are only needed if your application connects to Twitch chat via the IRC interface (WebSocket to `irc-ws.chat.twitch.tv`).
- **Modern scopes** (`user:read:chat`, `user:write:chat`, etc.) are used with the Helix API and EventSub WebSocket system.
- **PubSub** is deprecated. Migrate to EventSub for real-time events.
- If your application uses both IRC and Helix, you may need both legacy and modern scopes on the same token. They are not mutually exclusive.

---

## Best Practices

### Principle of Least Privilege

Only request the scopes your application actually needs. Avoid requesting broad scopes "just in case."

- **Bad:** Requesting every `channel:manage:*` scope when you only need to read polls.
- **Good:** Requesting only `channel:read:polls` for a polls display widget.

### Separate Tokens for Separate Concerns

If your application has distinct functional areas (e.g., a chat bot and an analytics dashboard), consider using separate tokens with different scope sets rather than one token with all scopes combined.

### Incremental Authorization

Twitch does not support incremental authorization (adding scopes to an existing token). If your application needs additional scopes later, the user must re-authorize, which generates a new token. Plan your scope requirements carefully to minimize re-authorization prompts.

### Token Validation

Always validate tokens before use. Tokens can be revoked by users at any time. Use the Twitch token validation endpoint:

```
GET https://id.twitch.tv/oauth2/validate
Authorization: OAuth <access_token>
```

The response includes the `scopes` array, which tells you exactly which scopes the token has.

### App Access Tokens vs. User Access Tokens

- **App access tokens** (client credentials) do not have user-specific scopes. They can only access public data and certain server-to-server endpoints.
- **User access tokens** carry scopes. All scopes listed in this document apply to user access tokens only.
- Some EventSub subscription types can use app access tokens (no scope required) while others require user access tokens with specific scopes.

### Scope Naming Conventions

Twitch scopes follow the pattern: `resource:action:target`

- **resource** -- The API area (`channel`, `user`, `moderator`, `bits`, etc.)
- **action** -- The operation (`read`, `manage`, `edit`, `bot`)
- **target** -- The specific data or feature (`chat`, `subscriptions`, `banned_users`, etc.)

Understanding this pattern helps you identify the correct scope without memorizing the entire list.

---

## Known Issues

### moderator:read:followers Required for channel.follow v2

The `channel.follow` EventSub subscription type (version 2) requires the `moderator:read:followers` scope. This is a deliberate design decision by Twitch to prevent abuse but is frequently a point of confusion because the scope name does not intuitively suggest "followers." The authenticated user must be a moderator of the channel (or the broadcaster themselves) to subscribe to follow events.

### channel:moderate Ambiguity

The legacy `channel:moderate` scope grants broad moderation permissions but its exact coverage is inconsistent. Twitch recommends migrating to specific `moderator:manage:*` and `moderator:read:*` scopes, which provide clear and granular control.

### Guest Star Scope Overlap

Both `channel:manage:guest_star` / `channel:read:guest_star` and `moderator:manage:guest_star` / `moderator:read:guest_star` exist. The `channel:` variants are for the broadcaster, while the `moderator:` variants are for channel moderators. Using the wrong variant will result in authorization errors.

### Deprecated Scopes Still Accepted

Twitch still accepts deprecated scopes (`user:edit:broadcast`, `chat:read`, `chat:edit`, etc.) during authorization. However, they may be removed in the future. New applications should always use the modern equivalents.

### user:edit:follows Completely Removed

The `user:edit:follows` scope is still listed in some older documentation but the underlying API endpoint was removed. Requesting this scope during authorization will succeed, but there is no functional endpoint to use it with.

---

## Quick Reference Table

All scopes in alphabetical order for quick lookup.

| Scope | Category | Read/Write |
|-------|----------|------------|
| `analytics:read:extensions` | Analytics | Read |
| `analytics:read:games` | Analytics | Read |
| `bits:read` | Bits | Read |
| `channel:bot` | Channel | Special |
| `channel:edit:commercial` | Channel | Write |
| `channel:manage:ads` | Channel | Write |
| `channel:manage:broadcast` | Channel | Write |
| `channel:manage:extensions` | Channel | Write |
| `channel:manage:guest_star` | Channel | Write |
| `channel:manage:moderators` | Channel | Write |
| `channel:manage:polls` | Channel | Write |
| `channel:manage:predictions` | Channel | Write |
| `channel:manage:raids` | Channel | Write |
| `channel:manage:redemptions` | Channel | Write |
| `channel:manage:schedule` | Channel | Write |
| `channel:manage:videos` | Channel | Write |
| `channel:manage:vips` | Channel | Write |
| `channel:moderate` | Channel | Write (deprecated) |
| `channel:read:ads` | Channel | Read |
| `channel:read:charity` | Channel | Read |
| `channel:read:editors` | Channel | Read |
| `channel:read:goals` | Channel | Read |
| `channel:read:guest_star` | Channel | Read |
| `channel:read:hype_train` | Channel | Read |
| `channel:read:polls` | Channel | Read |
| `channel:read:predictions` | Channel | Read |
| `channel:read:redemptions` | Channel | Read |
| `channel:read:stream_key` | Channel | Read |
| `channel:read:subscriptions` | Channel | Read |
| `channel:read:vips` | Channel | Read |
| `chat:edit` | Chat | Write (legacy) |
| `chat:read` | Chat | Read (legacy) |
| `clips:edit` | Clips | Write |
| `moderation:read` | Moderation | Read |
| `moderator:manage:announcements` | Moderation | Write |
| `moderator:manage:automod` | Moderation | Write |
| `moderator:manage:automod_settings` | Moderation | Write |
| `moderator:manage:banned_users` | Moderation | Write |
| `moderator:manage:blocked_terms` | Moderation | Write |
| `moderator:manage:chat_messages` | Moderation | Write |
| `moderator:manage:chat_settings` | Moderation | Write |
| `moderator:manage:guest_star` | Moderation | Write |
| `moderator:manage:shield_mode` | Moderation | Write |
| `moderator:manage:shoutouts` | Moderation | Write |
| `moderator:manage:unban_requests` | Moderation | Write |
| `moderator:manage:warnings` | Moderation | Write |
| `moderator:read:automod_settings` | Moderation | Read |
| `moderator:read:blocked_terms` | Moderation | Read |
| `moderator:read:chat_settings` | Moderation | Read |
| `moderator:read:chatters` | Moderation | Read |
| `moderator:read:followers` | Moderation | Read |
| `moderator:read:guest_star` | Moderation | Read |
| `moderator:read:moderators` | Moderation | Read |
| `moderator:read:shield_mode` | Moderation | Read |
| `moderator:read:shoutouts` | Moderation | Read |
| `moderator:read:suspicious_users` | Moderation | Read |
| `moderator:read:unban_requests` | Moderation | Read |
| `moderator:read:vips` | Moderation | Read |
| `moderator:read:warnings` | Moderation | Read |
| `user:bot` | User | Special |
| `user:edit` | User | Write |
| `user:edit:broadcast` | User | Write (deprecated) |
| `user:edit:follows` | User | Write (removed) |
| `user:manage:blocked_users` | User | Write |
| `user:manage:chat_color` | User | Write |
| `user:manage:whispers` | User | Write |
| `user:read:blocked_users` | User | Read |
| `user:read:broadcast` | User | Read |
| `user:read:chat` | User | Read |
| `user:read:email` | User | Read |
| `user:read:emotes` | User | Read |
| `user:read:follows` | User | Read |
| `user:read:moderated_channels` | User | Read |
| `user:read:subscriptions` | User | Read |
| `user:read:whispers` | User | Read |
| `user:write:chat` | User | Write |
| `whispers:edit` | Whispers | Write (legacy) |
| `whispers:read` | Whispers | Read (legacy) |

**Total: 80 scopes** (including 6 deprecated/legacy scopes)

---

## Scope Count by Category

| Category | Count |
|----------|-------|
| Analytics | 2 |
| Bits | 1 |
| Channel | 28 |
| Chat (legacy) | 2 |
| Clips | 1 |
| Moderation | 27 |
| User | 17 |
| Whispers (legacy) | 2 |
| **Total** | **80** |
