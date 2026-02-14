# Twitch API — Master Reference

> **Source:** All Twitch Developer Documentation — https://dev.twitch.tv/docs/
> **Last verified:** 2025-05-01 — [PAGE INACCESSIBLE - VERIFY AGAINST LIVE DOCS]
> **API Base URL:** `https://api.twitch.tv/helix`
> **Auth Base URL:** `https://id.twitch.tv`
> **EventSub WebSocket:** `wss://eventsub.wss.twitch.tv/ws`

---

## Overview

Master index for the 18-file Twitch API documentation set. This file cross-references every endpoint, EventSub subscription type, OAuth scope, and architectural concern documented across the other 17 files. Use this as your single entry point for navigating the full reference.

---

## Documentation Sitemap

| # | File | Description |
|---|------|-------------|
| 1 | `twitch-getting-started.md` | App registration, first API call, CLI setup |
| 2 | `twitch-authentication.md` | OAuth 2.0 flows, tokens, validation, refresh, revocation |
| 3 | `twitch-eventsub-subscription-types.md` | All 74+ EventSub subscription types |
| 4 | `twitch-eventsub-webhooks.md` | Webhook transport, HMAC verification, challenge/response |
| 5 | `twitch-eventsub-websockets.md` | WebSocket transport, connection lifecycle, session management |
| 6 | `twitch-eventsub-conduits.md` | Conduit transport, shard management, scaling |
| 7 | `twitch-scopes-reference.md` | Complete OAuth scope table and mappings |
| 8 | `twitch-api-channels-streams.md` | Channels, Streams, Raids, Schedule, Teams |
| 9 | `twitch-api-chat-whispers.md` | Chat, Whispers, Emotes, Badges, Shoutouts |
| 10 | `twitch-api-channel-points-polls-predictions.md` | Channel Points, Polls, Predictions, Hype Train, Goals, Charity |
| 11 | `twitch-api-moderation.md` | AutoMod, Bans, Blocked Terms, Shield Mode, Warnings, VIPs |
| 12 | `twitch-api-users-subscriptions.md` | Users, Subscriptions |
| 13 | `twitch-api-bits-extensions-analytics.md` | Bits, Extensions API, Analytics, Entitlements, CCLs |
| 14 | `twitch-api-clips-videos-games.md` | Clips, Videos, Games, Search, Ads |
| 15 | `twitch-api-concepts-ratelimits-pagination.md` | Rate limits, pagination, error format, required headers |
| 16 | `twitch-extensions.md` | Extensions JS Helper, JWT, Bits, Configuration |
| 17 | `twitch-pubsub-migration.md` | PubSub to EventSub migration |
| 18 | `twitch-master-reference.md` | **This file** |

---

## API Category Summary

| Category | Endpoints | Primary File(s) |
|----------|-----------|------------------|
| Ads | 3 | `twitch-api-channels-streams.md`, `twitch-api-clips-videos-games.md` |
| Analytics | 2 | `twitch-api-bits-extensions-analytics.md` |
| Bits | 2-3 | `twitch-api-bits-extensions-analytics.md` |
| Channels | 5 | `twitch-api-channels-streams.md` |
| Channel Points | 6 | `twitch-api-channel-points-polls-predictions.md` |
| Charity | 2 | `twitch-api-channel-points-polls-predictions.md` |
| Chat | ~15 | `twitch-api-chat-whispers.md` |
| Clips | 2 | `twitch-api-clips-videos-games.md` |
| Conduits | 6 | `twitch-eventsub-conduits.md` |
| Content Classification Labels | 1 | `twitch-api-bits-extensions-analytics.md` |
| Entitlements | 2 | `twitch-api-bits-extensions-analytics.md` |
| EventSub | 3 | `twitch-eventsub-webhooks.md` / `twitch-eventsub-websockets.md` |
| Extensions | ~12 | `twitch-api-bits-extensions-analytics.md`, `twitch-extensions.md` |
| Games | 2 | `twitch-api-clips-videos-games.md` |
| Goals | 1 | `twitch-api-channel-points-polls-predictions.md` |
| Guest Star | ~12 | [VERIFY -- may be deprecated] |
| Hype Train | 1 | `twitch-api-channel-points-polls-predictions.md` |
| Moderation | ~23 | `twitch-api-moderation.md` |
| Polls | 3 | `twitch-api-channel-points-polls-predictions.md` |
| Predictions | 3 | `twitch-api-channel-points-polls-predictions.md` |
| Raids | 2 | `twitch-api-channels-streams.md` |
| Schedule | 6 | `twitch-api-channels-streams.md` |
| Search | 2 | `twitch-api-clips-videos-games.md` |
| Streams | 5 | `twitch-api-channels-streams.md` |
| Subscriptions | 2 | `twitch-api-users-subscriptions.md` |
| Teams | 2 | `twitch-api-channels-streams.md` |
| Users | ~8 | `twitch-api-users-subscriptions.md` |
| Videos | 2 | `twitch-api-clips-videos-games.md` |
| Whispers | 1 | `twitch-api-chat-whispers.md` |

---

## Cross-Cutting Concerns

### Authentication Model

- **Two token types:** App Access Token (server-to-server) and User Access Token (user-delegated).
- **OAuth 2.0 grants:** Authorization Code Grant, Client Credentials, OIDC (OpenID Connect), Device Code Grant.
- **Every request** must include two headers:
  - `Authorization: Bearer <token>`
  - `Client-Id: <your_client_id>`
- **Token validation** is required hourly: `GET https://id.twitch.tv/oauth2/validate`
- **Token refresh:** `POST https://id.twitch.tv/oauth2/token` with `grant_type=refresh_token`
- **Token revocation:** `POST https://id.twitch.tv/oauth2/revoke`
- **Detailed reference:** `twitch-authentication.md`

### Base URLs

| Service | URL |
|---------|-----|
| Helix API | `https://api.twitch.tv/helix` |
| Auth Server | `https://id.twitch.tv` |
| OAuth Authorize | `https://id.twitch.tv/oauth2/authorize` |
| OAuth Token | `https://id.twitch.tv/oauth2/token` |
| Token Validate | `https://id.twitch.tv/oauth2/validate` |
| Token Revoke | `https://id.twitch.tv/oauth2/revoke` |
| EventSub WebSocket | `wss://eventsub.wss.twitch.tv/ws` |
| Extension Helper JS | `https://extension-files.twitch.tv/helper/v1/twitch-ext.min.js` |

### Rate Limits

- **Token-bucket model:** 800 points per minute (default).
- **Separate buckets** for App Access Tokens vs. User Access Tokens.
- **Response headers:** `Ratelimit-Limit`, `Ratelimit-Remaining`, `Ratelimit-Reset`.
- **HTTP 429** returned when the bucket is exhausted.
- **Extensions:** separate limit of 30 requests per minute per viewer.
- **Detailed reference:** `twitch-api-concepts-ratelimits-pagination.md`

### Pagination

- **Cursor-based** using `after` and `before` query parameters.
- `first` controls page size (varies by endpoint; maximum is usually 100).
- An empty `pagination` object in the response means there are no more results.
- **Detailed reference:** `twitch-api-concepts-ratelimits-pagination.md`

### Error Format

All Helix API errors follow a consistent JSON structure:

```json
{
  "error": "Unauthorized",
  "status": 401,
  "message": "Invalid OAuth token"
}
```

### Data Conventions

| Convention | Detail |
|------------|--------|
| IDs | Opaque strings (never assume numeric) |
| Timestamps | RFC 3339 with nanosecond precision |
| Empty results | `"data": []` |
| Boolean fields | JSON booleans (`true`/`false`) |
| Enum fields | Lowercase strings |

### Breaking Change Policy

- **Non-breaking** (may happen without notice): new fields, new endpoints, new optional parameters.
- **Breaking** (announced in advance): removing fields, changing types, removing endpoints.
- Changes are announced on the [Twitch Developer Forums](https://discuss.dev.twitch.tv/) and the [Changelog](https://dev.twitch.tv/docs/change-log).

---

## Complete Scope Reference (Condensed)

### Analytics

| Scope | Description |
|-------|-------------|
| `analytics:read:extensions` | View Extension analytics |
| `analytics:read:games` | View game analytics |

### Bits

| Scope | Description |
|-------|-------------|
| `bits:read` | View Bits info |

### Channel

| Scope | Description |
|-------|-------------|
| `channel:bot` | Bot access to channel |
| `channel:edit:commercial` | Run commercials |
| `channel:manage:ads` | Manage ad schedule |
| `channel:manage:broadcast` | Manage broadcast config |
| `channel:manage:extensions` | Manage Extensions |
| `channel:manage:guest_star` | Manage Guest Star |
| `channel:manage:moderators` | Manage moderators |
| `channel:manage:polls` | Manage polls |
| `channel:manage:predictions` | Manage predictions |
| `channel:manage:raids` | Manage raids |
| `channel:manage:redemptions` | Manage Channel Point rewards |
| `channel:manage:schedule` | Manage schedule |
| `channel:manage:videos` | Manage videos |
| `channel:manage:vips` | Manage VIPs |
| `channel:moderate` | Moderate channel (legacy) |
| `channel:read:ads` | Read ad schedule |
| `channel:read:charity` | Read charity campaign |
| `channel:read:editors` | Read channel editors |
| `channel:read:goals` | Read channel goals |
| `channel:read:guest_star` | Read Guest Star |
| `channel:read:hype_train` | Read Hype Train |
| `channel:read:polls` | Read polls |
| `channel:read:predictions` | Read predictions |
| `channel:read:redemptions` | Read Channel Point redemptions |
| `channel:read:stream_key` | Read stream key |
| `channel:read:subscriptions` | Read subscriptions |
| `channel:read:vips` | Read VIPs |

### Chat (Legacy IRC)

| Scope | Description |
|-------|-------------|
| `chat:edit` | Send IRC chat messages |
| `chat:read` | Read IRC chat messages |

### Clips

| Scope | Description |
|-------|-------------|
| `clips:edit` | Create clips |

### Moderation

| Scope | Description |
|-------|-------------|
| `moderation:read` | Read moderation data |
| `moderator:manage:announcements` | Manage announcements |
| `moderator:manage:automod` | Manage AutoMod held messages |
| `moderator:manage:automod_settings` | Manage AutoMod settings |
| `moderator:manage:banned_users` | Manage bans and timeouts |
| `moderator:manage:blocked_terms` | Manage blocked terms |
| `moderator:manage:chat_messages` | Delete chat messages |
| `moderator:manage:chat_settings` | Manage chat settings |
| `moderator:manage:guest_star` | Manage Guest Star (as moderator) |
| `moderator:manage:shield_mode` | Manage Shield Mode |
| `moderator:manage:shoutouts` | Manage shoutouts |
| `moderator:manage:unban_requests` | Manage unban requests |
| `moderator:manage:warnings` | Manage warnings |
| `moderator:read:automod_settings` | Read AutoMod settings |
| `moderator:read:blocked_terms` | Read blocked terms |
| `moderator:read:chat_settings` | Read chat settings |
| `moderator:read:chatters` | Read chatter list |
| `moderator:read:followers` | Read followers list |
| `moderator:read:guest_star` | Read Guest Star (as moderator) |
| `moderator:read:moderators` | Read moderator list |
| `moderator:read:shield_mode` | Read Shield Mode status |
| `moderator:read:shoutouts` | Read shoutouts |
| `moderator:read:suspicious_users` | Read suspicious users |
| `moderator:read:unban_requests` | Read unban requests |
| `moderator:read:vips` | Read VIP list |
| `moderator:read:warnings` | Read warnings |

### User

| Scope | Description |
|-------|-------------|
| `user:bot` | Bot user access |
| `user:edit` | Edit user profile |
| `user:edit:broadcast` | Edit broadcast settings (legacy) |
| `user:edit:follows` | Edit follows (deprecated) |
| `user:manage:blocked_users` | Manage blocked users |
| `user:manage:chat_color` | Manage chat color |
| `user:manage:whispers` | Manage whispers |
| `user:read:blocked_users` | Read blocked users |
| `user:read:broadcast` | Read broadcast settings |
| `user:read:chat` | Read chat via EventSub |
| `user:read:email` | Read user email |
| `user:read:emotes` | Read user emotes |
| `user:read:follows` | Read user follows |
| `user:read:moderated_channels` | Read moderated channels |
| `user:read:subscriptions` | Read user subscriptions |
| `user:read:whispers` | Read whispers |
| `user:write:chat` | Send chat via API |

### Whispers (Legacy)

| Scope | Description |
|-------|-------------|
| `whispers:edit` | Send whispers (legacy) |
| `whispers:read` | Read whispers (legacy) |

---

## Complete EventSub Subscription Type Index

All 74+ subscription types across all categories:

| Type | Version | Required Scope | Category |
|------|---------|----------------|----------|
| `automod.message.hold` | v1, v2 | `moderator:manage:automod` | AutoMod |
| `automod.message.update` | v1, v2 | `moderator:manage:automod` | AutoMod |
| `automod.settings.update` | v1 | `moderator:read:automod_settings` | AutoMod |
| `automod.terms.update` | v1 | `moderator:manage:automod` | AutoMod |
| `channel.update` | v2 | None | Channel |
| `channel.follow` | v2 | `moderator:read:followers` | Channel |
| `channel.ad_break.begin` | v1 | `channel:read:ads` | Channel |
| `channel.bits.use` | v1 [BETA] | `bits:read` | Channel |
| `channel.cheer` | v1 | `bits:read` | Channel |
| `channel.subscribe` | v1 | `channel:read:subscriptions` | Channel |
| `channel.subscription.end` | v1 | `channel:read:subscriptions` | Channel |
| `channel.subscription.gift` | v1 | `channel:read:subscriptions` | Channel |
| `channel.subscription.message` | v1 | `channel:read:subscriptions` | Channel |
| `channel.ban` | v1 | `channel:moderate` | Channel |
| `channel.unban` | v1 | `channel:moderate` | Channel |
| `channel.unban_request.create` | v1 | `moderator:read:unban_requests` | Channel |
| `channel.unban_request.resolve` | v1 | `moderator:read:unban_requests` | Channel |
| `channel.moderate` | v1, v2 | Multiple `moderator:` scopes | Channel |
| `channel.moderator.add` | v1 | `moderation:read` | Channel |
| `channel.moderator.remove` | v1 | `moderation:read` | Channel |
| `channel.raid` | v1 | None | Channel |
| `channel.vip.add` | v1 | `channel:read:vips` | Channel |
| `channel.vip.remove` | v1 | `channel:read:vips` | Channel |
| `channel.warning.send` | v1 | `moderator:read:warnings` | Channel |
| `channel.warning.acknowledge` | v1 | `moderator:read:warnings` | Channel |
| `channel.suspicious_user.message` | v1 | `moderator:read:suspicious_users` | Channel |
| `channel.suspicious_user.update` | v1 | `moderator:read:suspicious_users` | Channel |
| `channel.chat.clear` | v1 | `user:read:chat` | Chat |
| `channel.chat.clear_user_messages` | v1 | `user:read:chat` | Chat |
| `channel.chat.message` | v1 | `user:read:chat` | Chat |
| `channel.chat.message_delete` | v1 | `user:read:chat` | Chat |
| `channel.chat.notification` | v1 | `user:read:chat` | Chat |
| `channel.chat_settings.update` | v1 | `user:read:chat` | Chat |
| `channel.chat.user_message_hold` | v1 | `user:read:chat` | Chat |
| `channel.chat.user_message_update` | v1 | `user:read:chat` | Chat |
| `channel.channel_points_custom_reward.add` | v1 | `channel:read:redemptions` | Points |
| `channel.channel_points_custom_reward.update` | v1 | `channel:read:redemptions` | Points |
| `channel.channel_points_custom_reward.remove` | v1 | `channel:read:redemptions` | Points |
| `channel.channel_points_custom_reward_redemption.add` | v1 | `channel:read:redemptions` | Points |
| `channel.channel_points_custom_reward_redemption.update` | v1 | `channel:read:redemptions` | Points |
| `channel.channel_points_automatic_reward_redemption.add` | v1 | `channel:read:redemptions` | Points |
| `channel.poll.begin` | v1 | `channel:read:polls` | Polls |
| `channel.poll.progress` | v1 | `channel:read:polls` | Polls |
| `channel.poll.end` | v1 | `channel:read:polls` | Polls |
| `channel.prediction.begin` | v1 | `channel:read:predictions` | Predictions |
| `channel.prediction.progress` | v1 | `channel:read:predictions` | Predictions |
| `channel.prediction.lock` | v1 | `channel:read:predictions` | Predictions |
| `channel.prediction.end` | v1 | `channel:read:predictions` | Predictions |
| `channel.hype_train.begin` | v1 | `channel:read:hype_train` | Hype Train |
| `channel.hype_train.progress` | v1 | `channel:read:hype_train` | Hype Train |
| `channel.hype_train.end` | v1 | `channel:read:hype_train` | Hype Train |
| `channel.goal.begin` | v1 | `channel:read:goals` | Goals |
| `channel.goal.progress` | v1 | `channel:read:goals` | Goals |
| `channel.goal.end` | v1 | `channel:read:goals` | Goals |
| `channel.charity_campaign.donate` | v1 | `channel:read:charity` | Charity |
| `channel.charity_campaign.start` | v1 | `channel:read:charity` | Charity |
| `channel.charity_campaign.progress` | v1 | `channel:read:charity` | Charity |
| `channel.charity_campaign.stop` | v1 | `channel:read:charity` | Charity |
| `channel.shield_mode.begin` | v1 | `moderator:read:shield_mode` | Shield Mode |
| `channel.shield_mode.end` | v1 | `moderator:read:shield_mode` | Shield Mode |
| `channel.shoutout.create` | v1 | `moderator:read:shoutouts` | Shoutouts |
| `channel.shoutout.receive` | v1 | `moderator:read:shoutouts` | Shoutouts |
| `channel.shared_chat.begin` | v1 | None | Shared Chat |
| `channel.shared_chat.update` | v1 | None | Shared Chat |
| `channel.shared_chat.end` | v1 | None | Shared Chat |
| `stream.online` | v1 | None | Streams |
| `stream.offline` | v1 | None | Streams |
| `user.authorization.grant` | v1 | None | Users |
| `user.authorization.revoke` | v1 | None | Users |
| `user.update` | v1 | None | Users |
| `user.whisper.message` | v1 | `user:read:whispers` | Users |
| `conduit.shard.disabled` | v1 | None | Conduit |
| `drop.entitlement.grant` | v1 | None | Drops |
| `extension.bits_transaction.create` | v1 | None | Extensions |

---

## Twitch CLI Quick Reference

| Command | Description |
|---------|-------------|
| `twitch configure` | Set up Client ID and Secret interactively |
| `twitch token` | Get an App Access Token |
| `twitch token -u -s "scopes"` | Get a User Access Token with specified scopes |
| `twitch api get /endpoint` | Make a GET request to a Helix endpoint |
| `twitch api post /endpoint -b '{}'` | Make a POST request with a JSON body |
| `twitch api patch /endpoint -b '{}'` | Make a PATCH request with a JSON body |
| `twitch api delete /endpoint` | Make a DELETE request |
| `twitch event trigger <type>` | Trigger a mock EventSub event |
| `twitch event verify-subscription <type>` | Test webhook verification handshake |
| `twitch event websocket start-server` | Start a local mock WebSocket server |
| `twitch event trigger <type> --transport=websocket` | Trigger an event on the mock WebSocket |
| `twitch mock-api generate` | Generate mock API data |
| `twitch mock-api start` | Start a local mock API server |

---

## Complete Endpoint Index

Every Helix endpoint listed with method, path, token type, required scopes, rate cost, and documentation file.

| Method | Path | Token Type | Required Scopes | Rate Cost | File |
|--------|------|-----------|-----------------|-----------|------|
| POST | `/channels/commercial` | User | `channel:edit:commercial` | 1 | channels-streams |
| GET | `/channels/ads` | User | `channel:read:ads` | 1 | channels-streams |
| POST | `/channels/ads/schedule/snooze` | User | `channel:manage:ads` | 1 | channels-streams |
| GET | `/analytics/extensions` | User | `analytics:read:extensions` | 1 | bits-extensions-analytics |
| GET | `/analytics/games` | User | `analytics:read:games` | 1 | bits-extensions-analytics |
| GET | `/bits/leaderboard` | User | `bits:read` | 1 | bits-extensions-analytics |
| GET | `/bits/cheermotes` | App/User | None | 1 | bits-extensions-analytics |
| GET | `/channels` | App/User | None | 1 | channels-streams |
| PATCH | `/channels` | User | `channel:manage:broadcast` | 1 | channels-streams |
| GET | `/channels/editors` | User | `channel:read:editors` | 1 | channels-streams |
| GET | `/channels/followed` | User | `user:read:follows` | 1 | channels-streams |
| GET | `/channels/followers` | User | `moderator:read:followers` | 1 | channels-streams |
| POST | `/channel_points/custom_rewards` | User | `channel:manage:redemptions` | 1 | channel-points |
| GET | `/channel_points/custom_rewards` | User | `channel:read:redemptions` | 1 | channel-points |
| PATCH | `/channel_points/custom_rewards` | User | `channel:manage:redemptions` | 1 | channel-points |
| DELETE | `/channel_points/custom_rewards` | User | `channel:manage:redemptions` | 1 | channel-points |
| GET | `/channel_points/custom_rewards/redemptions` | User | `channel:read:redemptions` | 1 | channel-points |
| PATCH | `/channel_points/custom_rewards/redemptions` | User | `channel:manage:redemptions` | 1 | channel-points |
| GET | `/charity/campaigns` | User | `channel:read:charity` | 1 | channel-points |
| GET | `/charity/donations` | User | `channel:read:charity` | 1 | channel-points |
| GET | `/chat/chatters` | User | `moderator:read:chatters` | 1 | chat-whispers |
| GET | `/chat/emotes` | App/User | None | 1 | chat-whispers |
| GET | `/chat/emotes/global` | App/User | None | 1 | chat-whispers |
| GET | `/chat/emotes/set` | App/User | None | 1 | chat-whispers |
| GET | `/chat/emotes/user` | User | `user:read:emotes` | 1 | chat-whispers |
| GET | `/chat/badges` | App/User | None | 1 | chat-whispers |
| GET | `/chat/badges/global` | App/User | None | 1 | chat-whispers |
| GET | `/chat/settings` | App/User | None | 1 | chat-whispers |
| PATCH | `/chat/settings` | User | `moderator:manage:chat_settings` | 1 | chat-whispers |
| POST | `/chat/messages` | App/User | `user:write:chat` | 1 | chat-whispers |
| POST | `/chat/announcements` | User | `moderator:manage:announcements` | 1 | chat-whispers |
| GET | `/chat/color` | App/User | None | 1 | chat-whispers |
| PUT | `/chat/color` | User | `user:manage:chat_color` | 1 | chat-whispers |
| POST | `/chat/shoutouts` | User | `moderator:manage:shoutouts` | 1 | chat-whispers |
| GET | `/chat/shared_chat/session` | App/User | None | 1 | chat-whispers |
| POST | `/clips` | User | `clips:edit` | 1 | clips-videos-games |
| GET | `/clips` | App/User | None | 1 | clips-videos-games |
| GET | `/content_classification_labels` | App/User | None | 1 | bits-extensions-analytics |
| POST | `/eventsub/conduits` | App | None | 1 | conduits |
| GET | `/eventsub/conduits` | App | None | 1 | conduits |
| PATCH | `/eventsub/conduits` | App | None | 1 | conduits |
| DELETE | `/eventsub/conduits` | App | None | 1 | conduits |
| GET | `/eventsub/conduits/shards` | App | None | 1 | conduits |
| PATCH | `/eventsub/conduits/shards` | App | None | 1 | conduits |
| POST | `/eventsub/subscriptions` | App/User | Varies by type | 1 | webhooks/websockets |
| GET | `/eventsub/subscriptions` | App/User | None | 1 | webhooks/websockets |
| DELETE | `/eventsub/subscriptions` | App/User | None | 1 | webhooks/websockets |
| GET | `/entitlements/drops` | App/User | None | 1 | bits-extensions-analytics |
| PATCH | `/entitlements/drops` | App/User | None | 1 | bits-extensions-analytics |
| GET | `/extensions/transactions` | App | None | 1 | bits-extensions-analytics |
| GET | `/games` | App/User | None | 1 | clips-videos-games |
| GET | `/games/top` | App/User | None | 1 | clips-videos-games |
| GET | `/goals` | User | `channel:read:goals` | 1 | channel-points |
| GET | `/hypetrain/events` | User | `channel:read:hype_train` | 1 | channel-points |
| POST | `/moderation/enforcements/status` | User | `moderation:read` | 1 | moderation |
| POST | `/moderation/automod/message` | User | `moderator:manage:automod` | 1 | moderation |
| GET | `/moderation/automod/settings` | User | `moderator:read:automod_settings` | 1 | moderation |
| PUT | `/moderation/automod/settings` | User | `moderator:manage:automod_settings` | 1 | moderation |
| GET | `/moderation/banned` | User | `moderation:read` | 1 | moderation |
| POST | `/moderation/bans` | User | `moderator:manage:banned_users` | 1 | moderation |
| DELETE | `/moderation/bans` | User | `moderator:manage:banned_users` | 1 | moderation |
| GET | `/moderation/blocked_terms` | User | `moderator:read:blocked_terms` | 1 | moderation |
| POST | `/moderation/blocked_terms` | User | `moderator:manage:blocked_terms` | 1 | moderation |
| DELETE | `/moderation/blocked_terms` | User | `moderator:manage:blocked_terms` | 1 | moderation |
| DELETE | `/moderation/chat` | User | `moderator:manage:chat_messages` | 1 | moderation |
| GET | `/moderation/moderators` | User | `moderation:read` | 1 | moderation |
| POST | `/moderation/moderators` | User | `channel:manage:moderators` | 1 | moderation |
| DELETE | `/moderation/moderators` | User | `channel:manage:moderators` | 1 | moderation |
| GET | `/channels/vips` | User | `channel:read:vips` | 1 | moderation |
| POST | `/channels/vips` | User | `channel:manage:vips` | 1 | moderation |
| DELETE | `/channels/vips` | User | `channel:manage:vips` | 1 | moderation |
| GET | `/moderation/shield_mode` | User | `moderator:read:shield_mode` | 1 | moderation |
| PUT | `/moderation/shield_mode` | User | `moderator:manage:shield_mode` | 1 | moderation |
| POST | `/moderation/warnings` | User | `moderator:manage:warnings` | 1 | moderation |
| GET | `/moderation/unban_requests` | User | `moderator:read:unban_requests` | 1 | moderation |
| PATCH | `/moderation/unban_requests` | User | `moderator:manage:unban_requests` | 1 | moderation |
| GET | `/polls` | User | `channel:read:polls` | 1 | channel-points |
| POST | `/polls` | User | `channel:manage:polls` | 1 | channel-points |
| GET | `/predictions` | User | `channel:read:predictions` | 1 | channel-points |
| POST | `/predictions` | User | `channel:manage:predictions` | 1 | channel-points |
| POST | `/raids` | User | `channel:manage:raids` | 1 | channels-streams |
| DELETE | `/raids` | User | `channel:manage:raids` | 1 | channels-streams |
| GET | `/schedule` | App/User | None | 1 | channels-streams |
| GET | `/schedule/icalendar` | N/A | None | 1 | channels-streams |
| PATCH | `/schedule` | User | `channel:manage:schedule` | 1 | channels-streams |
| POST | `/schedule/segment` | User | `channel:manage:schedule` | 1 | channels-streams |
| PATCH | `/schedule/segment` | User | `channel:manage:schedule` | 1 | channels-streams |
| DELETE | `/schedule/segment` | User | `channel:manage:schedule` | 1 | channels-streams |
| GET | `/search/categories` | App/User | None | 1 | clips-videos-games |
| GET | `/search/channels` | App/User | None | 1 | clips-videos-games |
| GET | `/streams` | App/User | None | 1 | channels-streams |
| GET | `/streams/key` | User | `channel:read:stream_key` | 1 | channels-streams |
| POST | `/streams/markers` | User | `channel:manage:broadcast` | 1 | channels-streams |
| GET | `/streams/markers` | User | `user:read:broadcast` | 1 | channels-streams |
| GET | `/streams/followed` | User | `user:read:follows` | 1 | channels-streams |
| GET | `/subscriptions` | User | `channel:read:subscriptions` | 1 | users-subscriptions |
| GET | `/subscriptions/user` | User | `user:read:subscriptions` | 1 | users-subscriptions |
| GET | `/teams` | App/User | None | 1 | channels-streams |
| GET | `/teams/channel` | App/User | None | 1 | channels-streams |
| GET | `/users` | App/User | `user:read:email` (optional) | 1 | users-subscriptions |
| PUT | `/users` | User | `user:edit` | 1 | users-subscriptions |
| GET | `/users/blocks` | User | `user:read:blocked_users` | 1 | users-subscriptions |
| PUT | `/users/blocks` | User | `user:manage:blocked_users` | 1 | users-subscriptions |
| DELETE | `/users/blocks` | User | `user:manage:blocked_users` | 1 | users-subscriptions |
| GET | `/users/extensions` | User | `user:read:broadcast` | 1 | users-subscriptions |
| GET | `/users/extensions/list` | App/User | `user:read:broadcast` | 1 | users-subscriptions |
| PUT | `/users/extensions` | User | `user:edit:broadcast` | 1 | users-subscriptions |
| GET | `/videos` | App/User | None | 1 | clips-videos-games |
| DELETE | `/videos` | User | `channel:manage:videos` | 1 | clips-videos-games |
| POST | `/whispers` | User | `user:manage:whispers` | 1 | chat-whispers |

---

## Developer Changelog Highlights

| Date | Change |
|------|--------|
| April 2025 | PubSub fully decommissioned; all topics must use EventSub |
| May 2025 | Shared Chat Send Message behavior change -- App Access Token defaults to source-only |
| 2024-2025 | EventSub chat subscription types moved to general availability |
| 2024-2025 | Send Chat Message API (`POST /chat/messages`) moved to general availability |
| 2024-2025 | Conduit transport moved to general availability |
| Current | `channel.bits.use` subscription type remains in BETA |
| Current | Guest Star endpoints may be deprecated [VERIFY against live docs] |
| Ongoing | `user:edit:follows` scope deprecated -- follows can no longer be created programmatically |

---

## Best Practices & Production Hardening

### Security

- **Never expose Client Secret** in client-side code or public repositories.
- **Use HTTPS** for all webhook callback URLs; Twitch rejects plain HTTP.
- **Validate webhook signatures** using HMAC-SHA256 with your subscription secret. Always use a timing-safe comparison.
- **Store tokens securely** -- encrypt at rest, never log full token values.
- **Use the `state` parameter** in OAuth flows to prevent CSRF attacks.
- **Rotate secrets** periodically and revoke tokens when no longer needed.

### Token Management

- **Validate tokens hourly** via `GET https://id.twitch.tv/oauth2/validate` -- Twitch requires this.
- **Implement automatic refresh** before token expiration using the refresh token grant.
- **Handle 401 responses** by attempting a token refresh before retrying the request.
- **Use App Access Tokens** for server-to-server calls that do not require user context (fewer scopes, simpler lifecycle).
- **Scope minimally** -- request only the scopes your application actually needs.

### Rate Limiting

- **Track rate limit headers** (`Ratelimit-Limit`, `Ratelimit-Remaining`, `Ratelimit-Reset`) on every response.
- **Implement exponential backoff** when receiving HTTP 429 responses.
- **Avoid tight polling loops** -- prefer EventSub for real-time data instead of polling endpoints.
- **Separate rate budgets** for App Access Tokens vs. User Access Tokens; use the appropriate token type to spread load.

### Idempotency & Reliability

- **Use idempotency keys** where supported to prevent duplicate operations.
- **Implement retry logic** with exponential backoff for transient errors (5xx, timeouts).
- **Store EventSub message IDs** and deduplicate -- Twitch may redeliver events.
- **Handle the reconnect message** in WebSocket transport promptly; connect to the new URL before the old connection closes.

### Pagination

- **Always paginate to completion** when you need all results; do not assume a single page contains everything.
- **Respect `first` parameter limits** -- exceeding them returns an error.
- **Check for empty `pagination`** object to determine when to stop.

### EventSub

- **Respond to webhook challenges** within 10 seconds with the `challenge` value as plain text.
- **Return 2xx quickly** for notification deliveries -- do heavy processing asynchronously.
- **Monitor `conduit.shard.disabled`** events if using Conduit transport.
- **Handle WebSocket keepalive timeout** -- if no message arrives within the keepalive window, assume the connection is dead and reconnect.
- **Limit WebSocket connections** -- maximum 3 per Client ID (100 subscriptions each, 300 total).
- **Use Conduits** for server-side applications that need more than 300 subscriptions or high availability.

### Error Handling

- **Parse the standard error JSON** (`error`, `status`, `message`) on every non-2xx response.
- **Log request IDs** from response headers for debugging with Twitch support.
- **Distinguish between retryable errors** (429, 500, 503) and permanent errors (400, 401, 403, 404).

### Anti-Loop Protection

- **Guard against feedback loops** when your application both listens to and triggers events (e.g., reading `channel.chat.message` and calling `POST /chat/messages`).
- **Maintain a set of recently-sent message IDs** or use sender identification to skip self-generated events.

### Logging & Monitoring

- **Log all token validation failures** and refresh attempts.
- **Monitor EventSub subscription status** -- revoked or disabled subscriptions indicate permission or connectivity issues.
- **Track rate limit utilization** to detect approaching limits before they cause 429 errors.
- **Alert on elevated error rates** from any Twitch endpoint.

---

## Known Issues & Community Notes

| Issue | Detail | Workaround |
|-------|--------|------------|
| PubSub decommissioned | PubSub was fully shut down in April 2025 | Migrate all topics to EventSub (see `twitch-pubsub-migration.md`) |
| Guest Star status | Guest Star endpoints may be deprecated or removed | Verify current status against live documentation |
| `channel.bits.use` BETA | This EventSub type is in beta and may change | Use `channel.cheer` for stable Bits events |
| Token validation latency | Validation endpoint can be slow under load | Cache validation results and validate asynchronously |
| WebSocket reconnect race | Reconnect URL has a 30-second window; slow clients may lose events | Begin connecting to new URL immediately upon receiving reconnect message |
| Shared Chat token behavior | App Access Tokens now default to source-only in Shared Chat | Use User Access Tokens for cross-channel Shared Chat messages |
| EventSub subscription limits | WebSocket: 300 total (3 connections x 100 each) | Use Conduit transport for higher subscription counts |
| Webhook delivery retries | Twitch retries failed webhook deliveries but may eventually disable the subscription | Monitor subscription status and re-create disabled subscriptions |
| Rate limit inconsistencies | Some endpoints have lower effective limits than the documented 800 points/minute | Monitor per-endpoint rate limit headers individually |
| `user:edit:follows` deprecated | Scope exists but follow creation is no longer supported | No workaround; programmatic follow creation is permanently removed |
| Extension CSP restrictions | Extensions run in sandboxed iframes with strict Content Security Policy | Use the Extension Helper JS and approved Twitch CDN URLs only |

---

## Quick Reference Table

| Item | Value |
|------|-------|
| **API Base URL** | `https://api.twitch.tv/helix` |
| **Auth Base URL** | `https://id.twitch.tv` |
| **OAuth Authorize** | `https://id.twitch.tv/oauth2/authorize` |
| **OAuth Token** | `https://id.twitch.tv/oauth2/token` |
| **Token Validate** | `https://id.twitch.tv/oauth2/validate` |
| **Token Revoke** | `https://id.twitch.tv/oauth2/revoke` |
| **EventSub WebSocket** | `wss://eventsub.wss.twitch.tv/ws` |
| **Extension Helper JS** | `https://extension-files.twitch.tv/helper/v1/twitch-ext.min.js` |
| **Rate Limit (default)** | 800 points/minute per token |
| **Rate Limit (extensions)** | 30 requests/minute per viewer |
| **Max Page Size** | Usually 100 (varies by endpoint) |
| **Pagination Style** | Cursor-based (`after`/`before`) |
| **ID Format** | Opaque strings |
| **Timestamp Format** | RFC 3339 with nanosecond precision |
| **Error Format** | `{"error": "...", "status": N, "message": "..."}` |
| **Required Headers** | `Authorization: Bearer <token>` + `Client-Id: <id>` |
| **WebSocket Max Connections** | 3 per Client ID |
| **WebSocket Max Subscriptions** | 100 per connection (300 total) |
| **Webhook Signature Algorithm** | HMAC-SHA256 |
| **Webhook Challenge Timeout** | 10 seconds |
| **Token Validation Interval** | Every 1 hour (required) |
| **OAuth Grant Types** | Authorization Code, Client Credentials, OIDC, Device Code |
| **Total Helix Endpoints** | ~100+ |
| **Total EventSub Types** | 74+ |
| **Total OAuth Scopes** | ~65+ |
| **Twitch CLI Install** | `brew install twitchdev/twitch/twitch-cli` or GitHub Releases |

---

*This master reference is file 18 of 18 in the Twitch API documentation set. For detailed information on any topic, refer to the specific file listed in the Documentation Sitemap above.*
