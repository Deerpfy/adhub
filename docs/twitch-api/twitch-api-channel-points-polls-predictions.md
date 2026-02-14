# Twitch API — Channel Points, Polls, Predictions, Hype Train, Goals & Charity

> **Source:** https://dev.twitch.tv/docs/api/reference
> **Last verified:** 2025-05-01
> **API Base URL:** `https://api.twitch.tv/helix`
> **Endpoints covered:** 16

This document covers interactive channel features: Channel Points (custom rewards and redemptions), Polls, Predictions, Hype Train events, Creator Goals, and Charity campaigns.

---

## Table of Contents

1. [Channel Points](#channel-points)
   - [Create Custom Reward](#1-create-custom-reward)
   - [Get Custom Reward](#2-get-custom-reward)
   - [Update Custom Reward](#3-update-custom-reward)
   - [Delete Custom Reward](#4-delete-custom-reward)
   - [Get Custom Reward Redemption](#5-get-custom-reward-redemption)
   - [Update Redemption Status](#6-update-redemption-status)
2. [Polls](#polls)
   - [Get Polls](#7-get-polls)
   - [Create Poll](#8-create-poll)
   - [End Poll](#9-end-poll)
3. [Predictions](#predictions)
   - [Get Predictions](#10-get-predictions)
   - [Create Prediction](#11-create-prediction)
   - [End Prediction](#12-end-prediction)
4. [Hype Train](#hype-train)
   - [Get Hype Train Events](#13-get-hype-train-events)
5. [Goals](#goals)
   - [Get Creator Goals](#14-get-creator-goals)
6. [Charity](#charity)
   - [Get Charity Campaign](#15-get-charity-campaign)
   - [Get Charity Campaign Donations](#16-get-charity-campaign-donations)
7. [Related EventSub Types](#related-eventsub-types)
8. [Best Practices](#best-practices)
9. [Known Issues & Community Notes](#known-issues--community-notes)
10. [Quick Reference Table](#quick-reference-table)

---

## Channel Points

Channel Points allow broadcasters to create custom rewards that viewers can redeem using accumulated channel points. A channel can have a maximum of 50 custom rewards. Only partners and affiliates can use Channel Points.

**Important:** Your application can only manage rewards that it created. You cannot modify or delete rewards created by other applications or by the broadcaster manually.

---

### 1. Create Custom Reward

Creates a custom Channel Points reward on a channel.

**Endpoint:**

```
POST https://api.twitch.tv/helix/channel_points/custom_rewards
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:manage:redemptions` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster creating the reward. Must match the user in the access token. |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | String | Yes | The reward title. Maximum 45 characters. Must be unique among the channel's rewards. |
| `cost` | Integer | Yes | The cost of the reward in Channel Points. Minimum value is 1. |
| `prompt` | String | No | The prompt displayed to the viewer when redeeming. Maximum 200 characters. |
| `is_enabled` | Boolean | No | Whether the reward is enabled. Default: `true`. |
| `background_color` | String | No | Background color for the reward as a hex value (e.g., `#FF0000`). |
| `is_user_input_required` | Boolean | No | Whether the user must enter text when redeeming. Default: `false`. |
| `is_max_per_stream_enabled` | Boolean | No | Whether to limit the total number of redemptions per stream. Default: `false`. |
| `max_per_stream` | Integer | No | Maximum number of redemptions per stream. Required if `is_max_per_stream_enabled` is `true`. |
| `is_max_per_user_per_stream_enabled` | Boolean | No | Whether to limit per-user redemptions per stream. Default: `false`. |
| `max_per_user_per_stream` | Integer | No | Maximum number of redemptions per user per stream. Required if `is_max_per_user_per_stream_enabled` is `true`. |
| `is_global_cooldown_enabled` | Boolean | No | Whether to apply a global cooldown between redemptions. Default: `false`. |
| `global_cooldown_seconds` | Integer | No | Cooldown in seconds. Required if `is_global_cooldown_enabled` is `true`. |
| `should_redemptions_skip_request_queue` | Boolean | No | Whether redemptions are automatically fulfilled without going to the request queue. Default: `false`. |

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "id": "92af127c-7326-4483-a52b-b0da0be61c01",
      "title": "Hydrate!",
      "prompt": "Remind the streamer to drink water",
      "cost": 500,
      "image": null,
      "default_image": {
        "url_1x": "https://static-cdn.jtvnw.net/custom-reward-images/default-1.png",
        "url_2x": "https://static-cdn.jtvnw.net/custom-reward-images/default-2.png",
        "url_4x": "https://static-cdn.jtvnw.net/custom-reward-images/default-4.png"
      },
      "background_color": "#00E5CB",
      "is_enabled": true,
      "is_user_input_required": true,
      "max_per_stream_setting": {
        "is_enabled": false,
        "max_per_stream": 0
      },
      "max_per_user_per_stream_setting": {
        "is_enabled": false,
        "max_per_user_per_stream": 0
      },
      "global_cooldown_setting": {
        "is_enabled": true,
        "global_cooldown_seconds": 60
      },
      "is_paused": false,
      "is_in_stock": true,
      "should_redemptions_skip_request_queue": false,
      "redemptions_redeemed_current_stream": 0,
      "cooldown_expires_at": null
    }
  ]
}
```

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=141981764' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Hydrate!",
    "cost": 500,
    "prompt": "Remind the streamer to drink water",
    "is_user_input_required": true,
    "is_global_cooldown_enabled": true,
    "global_cooldown_seconds": 60,
    "background_color": "#00E5CB"
  }'
```

**Twitch CLI Example:**

```bash
twitch api post /channel_points/custom_rewards \
  -q broadcaster_id=141981764 \
  -b '{
    "title": "Hydrate!",
    "cost": 500,
    "prompt": "Remind the streamer to drink water",
    "is_user_input_required": true,
    "is_global_cooldown_enabled": true,
    "global_cooldown_seconds": 60
  }'
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required fields, invalid values, title exceeds 45 characters, or duplicate title. |
| 401 | Invalid or expired access token. |
| 403 | Token does not include `channel:manage:redemptions` scope, or the broadcaster is not a partner/affiliate. |
| 500 | Internal server error. |

---

### 2. Get Custom Reward

Gets a list of custom rewards created on a channel.

**Endpoint:**

```
GET https://api.twitch.tv/helix/channel_points/custom_rewards
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:read:redemptions` or `channel:manage:redemptions` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster whose rewards to get. Must match the user in the access token. |
| `id` | String | No | Reward ID(s) to filter by. Can be specified multiple times, up to 50. |
| `only_manageable_rewards` | Boolean | No | If `true`, returns only rewards that your application created. Default: `false`. |

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "id": "92af127c-7326-4483-a52b-b0da0be61c01",
      "title": "Hydrate!",
      "prompt": "Remind the streamer to drink water",
      "cost": 500,
      "image": null,
      "default_image": {
        "url_1x": "https://static-cdn.jtvnw.net/custom-reward-images/default-1.png",
        "url_2x": "https://static-cdn.jtvnw.net/custom-reward-images/default-2.png",
        "url_4x": "https://static-cdn.jtvnw.net/custom-reward-images/default-4.png"
      },
      "background_color": "#00E5CB",
      "is_enabled": true,
      "is_user_input_required": true,
      "max_per_stream_setting": {
        "is_enabled": false,
        "max_per_stream": 0
      },
      "max_per_user_per_stream_setting": {
        "is_enabled": false,
        "max_per_user_per_stream": 0
      },
      "global_cooldown_setting": {
        "is_enabled": true,
        "global_cooldown_seconds": 60
      },
      "is_paused": false,
      "is_in_stock": true,
      "should_redemptions_skip_request_queue": false,
      "redemptions_redeemed_current_stream": null,
      "cooldown_expires_at": null
    }
  ]
}
```

**cURL Example:**

```bash
# Get all custom rewards
curl -X GET 'https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=141981764' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Get specific rewards by ID
curl -X GET 'https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=141981764&id=92af127c-7326-4483-a52b-b0da0be61c01' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Get only rewards created by your application
curl -X GET 'https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=141981764&only_manageable_rewards=true' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Twitch CLI Example:**

```bash
twitch api get /channel_points/custom_rewards -q broadcaster_id=141981764

# With specific reward ID
twitch api get /channel_points/custom_rewards \
  -q broadcaster_id=141981764 \
  -q id=92af127c-7326-4483-a52b-b0da0be61c01

# Only manageable rewards
twitch api get /channel_points/custom_rewards \
  -q broadcaster_id=141981764 \
  -q only_manageable_rewards=true
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `broadcaster_id`, or more than 50 `id` values provided. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope. |
| 404 | Specified reward ID(s) not found. |

---

### 3. Update Custom Reward

Updates a custom Channel Points reward. You can only update rewards that your application created.

**Endpoint:**

```
PATCH https://api.twitch.tv/helix/channel_points/custom_rewards
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:manage:redemptions` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster who owns the reward. Must match the user in the access token. |
| `id` | String | Yes | The ID of the reward to update. |

**Request Body (JSON):**

All fields are optional. Only include the fields you want to update.

| Field | Type | Description |
|-------|------|-------------|
| `title` | String | The reward title. Maximum 45 characters. |
| `cost` | Integer | The cost in Channel Points. Minimum 1. |
| `prompt` | String | The viewer prompt. Maximum 200 characters. |
| `is_enabled` | Boolean | Whether the reward is enabled. |
| `background_color` | String | Hex color value (e.g., `#FF0000`). |
| `is_user_input_required` | Boolean | Whether the user must enter text. |
| `is_max_per_stream_enabled` | Boolean | Whether to limit total redemptions per stream. |
| `max_per_stream` | Integer | Maximum redemptions per stream. |
| `is_max_per_user_per_stream_enabled` | Boolean | Whether to limit per-user redemptions. |
| `max_per_user_per_stream` | Integer | Maximum per-user redemptions per stream. |
| `is_global_cooldown_enabled` | Boolean | Whether to apply a global cooldown. |
| `global_cooldown_seconds` | Integer | Cooldown in seconds. |
| `should_redemptions_skip_request_queue` | Boolean | Whether to auto-fulfill redemptions. |
| `is_paused` | Boolean | Whether the reward is paused. |

**cURL Example:**

```bash
curl -X PATCH 'https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=141981764&id=92af127c-7326-4483-a52b-b0da0be61c01' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "cost": 750,
    "is_global_cooldown_enabled": true,
    "global_cooldown_seconds": 120
  }'
```

**Twitch CLI Example:**

```bash
twitch api patch /channel_points/custom_rewards \
  -q broadcaster_id=141981764 \
  -q id=92af127c-7326-4483-a52b-b0da0be61c01 \
  -b '{"cost": 750, "is_global_cooldown_enabled": true, "global_cooldown_seconds": 120}'
```

**Response:** Returns the updated reward object (same structure as Create Custom Reward).

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Invalid field values or missing required query parameters. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope, or the reward was not created by your application. |
| 404 | Reward not found. |

---

### 4. Delete Custom Reward

Deletes a custom Channel Points reward. You can only delete rewards that your application created. Deleting a reward also deletes all of its unfulfilled redemptions.

**Endpoint:**

```
DELETE https://api.twitch.tv/helix/channel_points/custom_rewards
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:manage:redemptions` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster who owns the reward. Must match the user in the access token. |
| `id` | String | Yes | The ID of the reward to delete. |

**cURL Example:**

```bash
curl -X DELETE 'https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=141981764&id=92af127c-7326-4483-a52b-b0da0be61c01' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Twitch CLI Example:**

```bash
twitch api delete /channel_points/custom_rewards \
  -q broadcaster_id=141981764 \
  -q id=92af127c-7326-4483-a52b-b0da0be61c01
```

**Response:** 204 No Content on success.

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required query parameters. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope, or the reward was not created by your application. |
| 404 | Reward not found. |

---

### 5. Get Custom Reward Redemption

Gets redemptions for a specific custom reward on a channel.

**Endpoint:**

```
GET https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:read:redemptions` or `channel:manage:redemptions` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster. Must match the user in the access token. |
| `reward_id` | String | Yes | The ID of the reward whose redemptions to get. |
| `status` | String | No | Filter by status: `CANCELED`, `FULFILLED`, or `UNFULFILLED`. Required if `id` is not specified. |
| `id` | String | No | Redemption ID(s) to filter by. Can be specified multiple times, up to 50. |
| `sort` | String | No | Sort order: `OLDEST` or `NEWEST`. Default: `OLDEST`. |
| `after` | String | No | Cursor for forward pagination. |
| `first` | Integer | No | Number of results per page. Maximum: 50. Default: 20. |

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "id": "17fa2df1-ad76-4804-bfa5-a40ef63efe63",
      "user_id": "274637212",
      "user_login": "torpedo09",
      "user_name": "torpedo09",
      "user_input": "Don't forget to hydrate!",
      "status": "UNFULFILLED",
      "redeemed_at": "2023-02-18T20:31:05.123456789Z",
      "reward": {
        "id": "92af127c-7326-4483-a52b-b0da0be61c01",
        "title": "Hydrate!",
        "prompt": "Remind the streamer to drink water",
        "cost": 500
      }
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6NX19"
  }
}
```

**cURL Example:**

```bash
# Get unfulfilled redemptions
curl -X GET 'https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?broadcaster_id=141981764&reward_id=92af127c-7326-4483-a52b-b0da0be61c01&status=UNFULFILLED&first=50' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Get specific redemption by ID
curl -X GET 'https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?broadcaster_id=141981764&reward_id=92af127c-7326-4483-a52b-b0da0be61c01&id=17fa2df1-ad76-4804-bfa5-a40ef63efe63' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Twitch CLI Example:**

```bash
twitch api get /channel_points/custom_rewards/redemptions \
  -q broadcaster_id=141981764 \
  -q reward_id=92af127c-7326-4483-a52b-b0da0be61c01 \
  -q status=UNFULFILLED \
  -q first=50
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required parameters, or neither `status` nor `id` was provided. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope. |
| 404 | Reward or redemption not found. |

---

### 6. Update Redemption Status

Updates the status of one or more Channel Points redemptions. You can only update redemptions for rewards that your application created.

**Endpoint:**

```
PATCH https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:manage:redemptions` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Redemption ID(s) to update. Can be specified multiple times, up to 50. |
| `broadcaster_id` | String | Yes | The ID of the broadcaster. Must match the user in the access token. |
| `reward_id` | String | Yes | The ID of the reward the redemptions belong to. |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | String | Yes | The new status: `CANCELED` (refunds points to user) or `FULFILLED` (marks as completed). |

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "id": "17fa2df1-ad76-4804-bfa5-a40ef63efe63",
      "user_id": "274637212",
      "user_login": "torpedo09",
      "user_name": "torpedo09",
      "user_input": "Don't forget to hydrate!",
      "status": "FULFILLED",
      "redeemed_at": "2023-02-18T20:31:05.123456789Z",
      "reward": {
        "id": "92af127c-7326-4483-a52b-b0da0be61c01",
        "title": "Hydrate!",
        "prompt": "Remind the streamer to drink water",
        "cost": 500
      }
    }
  ]
}
```

**cURL Example:**

```bash
# Fulfill a single redemption
curl -X PATCH 'https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?id=17fa2df1-ad76-4804-bfa5-a40ef63efe63&broadcaster_id=141981764&reward_id=92af127c-7326-4483-a52b-b0da0be61c01' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{"status": "FULFILLED"}'

# Cancel a redemption (refund points)
curl -X PATCH 'https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?id=17fa2df1-ad76-4804-bfa5-a40ef63efe63&broadcaster_id=141981764&reward_id=92af127c-7326-4483-a52b-b0da0be61c01' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{"status": "CANCELED"}'

# Fulfill multiple redemptions at once
curl -X PATCH 'https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?id=17fa2df1-ad76-4804-bfa5-a40ef63efe63&id=abcd1234-ef56-7890-gh12-ijklmnop3456&broadcaster_id=141981764&reward_id=92af127c-7326-4483-a52b-b0da0be61c01' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{"status": "FULFILLED"}'
```

**Twitch CLI Example:**

```bash
twitch api patch /channel_points/custom_rewards/redemptions \
  -q id=17fa2df1-ad76-4804-bfa5-a40ef63efe63 \
  -q broadcaster_id=141981764 \
  -q reward_id=92af127c-7326-4483-a52b-b0da0be61c01 \
  -b '{"status": "FULFILLED"}'
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required parameters or invalid status value. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope, or the reward was not created by your application. |
| 404 | Redemption or reward not found. |

---

## Polls

Polls allow broadcasters to run live votes in their channel. Only Twitch partners and affiliates can create polls.

---

### 7. Get Polls

Gets information about polls for a specific channel.

**Endpoint:**

```
GET https://api.twitch.tv/helix/polls
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:read:polls` or `channel:manage:polls` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster. Must match the user in the access token. |
| `id` | String | No | Poll ID(s) to filter by. Can be specified multiple times, up to 20. |
| `first` | Integer | No | Number of results per page. Maximum: 20. Default: 20. |
| `after` | String | No | Cursor for forward pagination. |

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "id": "ed961efd-8a3f-4cf5-a9d0-e616c590cd2a",
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "title": "What game should I play next?",
      "choices": [
        {
          "id": "choice-1",
          "title": "Stardew Valley",
          "votes": 420,
          "channel_points_votes": 300,
          "bits_votes": 0
        },
        {
          "id": "choice-2",
          "title": "Hollow Knight",
          "votes": 580,
          "channel_points_votes": 250,
          "bits_votes": 0
        }
      ],
      "bits_voting_enabled": false,
      "bits_per_vote": 0,
      "channel_points_voting_enabled": true,
      "channel_points_per_vote": 100,
      "status": "COMPLETED",
      "duration": 300,
      "started_at": "2023-06-15T18:00:00Z",
      "ended_at": "2023-06-15T18:05:00Z"
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6MX19"
  }
}
```

**Poll Status Values:**

| Status | Description |
|--------|-------------|
| `ACTIVE` | Poll is currently running. |
| `COMPLETED` | Poll ended naturally after the duration expired. |
| `TERMINATED` | Poll was manually ended by the broadcaster (results shown). |
| `ARCHIVED` | Poll was manually ended and results were hidden. |
| `MODERATED` | Poll was removed by a Twitch moderator. |
| `INVALID` | Something went wrong while determining the poll state. |

**cURL Example:**

```bash
# Get all polls
curl -X GET 'https://api.twitch.tv/helix/polls?broadcaster_id=141981764' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Get specific poll by ID
curl -X GET 'https://api.twitch.tv/helix/polls?broadcaster_id=141981764&id=ed961efd-8a3f-4cf5-a9d0-e616c590cd2a' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Twitch CLI Example:**

```bash
twitch api get /polls -q broadcaster_id=141981764
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `broadcaster_id` or more than 20 `id` values. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope. |

---

### 8. Create Poll

Creates a poll in the broadcaster's channel. Only one poll can be active at a time.

**Endpoint:**

```
POST https://api.twitch.tv/helix/polls
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:manage:polls` |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster. Must match the user in the access token. |
| `title` | String | Yes | The poll question. Maximum 60 characters. |
| `choices` | Array | Yes | Array of choice objects. Minimum 2, maximum 5. |
| `choices[].title` | String | Yes | The choice text. Maximum 25 characters. |
| `duration` | Integer | Yes | How long the poll runs, in seconds. Minimum: 15. Maximum: 1800 (30 minutes). |
| `channel_points_voting_enabled` | Boolean | No | Whether viewers can use Channel Points to cast additional votes. Default: `false`. |
| `channel_points_per_vote` | Integer | No | Number of Channel Points per additional vote. Minimum: 1. Maximum: 1000000. |

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "id": "ed961efd-8a3f-4cf5-a9d0-e616c590cd2a",
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "title": "What game should I play next?",
      "choices": [
        {
          "id": "choice-1",
          "title": "Stardew Valley",
          "votes": 0,
          "channel_points_votes": 0,
          "bits_votes": 0
        },
        {
          "id": "choice-2",
          "title": "Hollow Knight",
          "votes": 0,
          "channel_points_votes": 0,
          "bits_votes": 0
        },
        {
          "id": "choice-3",
          "title": "Celeste",
          "votes": 0,
          "channel_points_votes": 0,
          "bits_votes": 0
        }
      ],
      "bits_voting_enabled": false,
      "bits_per_vote": 0,
      "channel_points_voting_enabled": true,
      "channel_points_per_vote": 100,
      "status": "ACTIVE",
      "duration": 300,
      "started_at": "2023-06-15T18:00:00Z",
      "ended_at": null
    }
  ]
}
```

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/polls' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "broadcaster_id": "141981764",
    "title": "What game should I play next?",
    "choices": [
      {"title": "Stardew Valley"},
      {"title": "Hollow Knight"},
      {"title": "Celeste"}
    ],
    "duration": 300,
    "channel_points_voting_enabled": true,
    "channel_points_per_vote": 100
  }'
```

**Twitch CLI Example:**

```bash
twitch api post /polls -b '{
  "broadcaster_id": "141981764",
  "title": "What game should I play next?",
  "choices": [
    {"title": "Stardew Valley"},
    {"title": "Hollow Knight"},
    {"title": "Celeste"}
  ],
  "duration": 300
}'
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Invalid parameters: title too long, fewer than 2 or more than 5 choices, choice title too long, duration out of range, or a poll is already active. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope, or the broadcaster is not a partner/affiliate. |

---

### 9. End Poll

Ends an active poll. You can either terminate (show results) or archive (hide results) the poll.

**Endpoint:**

```
POST https://api.twitch.tv/helix/polls
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:manage:polls` |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster. Must match the user in the access token. |
| `id` | String | Yes | The ID of the poll to end. |
| `status` | String | Yes | How to end the poll: `TERMINATED` (show results) or `ARCHIVED` (hide results). |

**cURL Example:**

```bash
# End poll and show results
curl -X POST 'https://api.twitch.tv/helix/polls' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "broadcaster_id": "141981764",
    "id": "ed961efd-8a3f-4cf5-a9d0-e616c590cd2a",
    "status": "TERMINATED"
  }'

# End poll and hide results
curl -X POST 'https://api.twitch.tv/helix/polls' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "broadcaster_id": "141981764",
    "id": "ed961efd-8a3f-4cf5-a9d0-e616c590cd2a",
    "status": "ARCHIVED"
  }'
```

**Twitch CLI Example:**

```bash
twitch api post /polls -b '{
  "broadcaster_id": "141981764",
  "id": "ed961efd-8a3f-4cf5-a9d0-e616c590cd2a",
  "status": "TERMINATED"
}'
```

**Response:** Returns the ended poll object with updated status and `ended_at` timestamp.

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Invalid status value, or the poll is not in ACTIVE status. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope. |
| 404 | Poll not found. |

---

## Predictions

Predictions allow broadcasters to create prediction events where viewers wager Channel Points on outcomes. Only Twitch partners and affiliates can create predictions.

---

### 10. Get Predictions

Gets information about predictions for a specific channel.

**Endpoint:**

```
GET https://api.twitch.tv/helix/predictions
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:read:predictions` or `channel:manage:predictions` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster. Must match the user in the access token. |
| `id` | String | No | Prediction ID(s) to filter by. Can be specified multiple times, up to 20. |
| `first` | Integer | No | Number of results per page. Maximum: 20. Default: 20. |
| `after` | String | No | Cursor for forward pagination. |

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "id": "bc637af0-7766-4525-9308-4112f4cbf178",
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "title": "Will I beat the boss on this attempt?",
      "winning_outcome_id": "73085f5e-aaa1-4aa3-8df7-054b3c4c9e7d",
      "outcomes": [
        {
          "id": "73085f5e-aaa1-4aa3-8df7-054b3c4c9e7d",
          "title": "Yes!",
          "users": 35,
          "channel_points": 75000,
          "top_predictors": [
            {
              "user_id": "274637212",
              "user_login": "torpedo09",
              "user_name": "torpedo09",
              "channel_points_won": 15000,
              "channel_points_used": 5000
            }
          ],
          "color": "BLUE"
        },
        {
          "id": "94d2345f-bc78-42a1-8d9a-65e3b1a2c5d4",
          "title": "No way",
          "users": 22,
          "channel_points": 45000,
          "top_predictors": [
            {
              "user_id": "123456789",
              "user_login": "viewer42",
              "user_name": "viewer42",
              "channel_points_won": 0,
              "channel_points_used": 10000
            }
          ],
          "color": "PINK"
        }
      ],
      "prediction_window": 120,
      "status": "RESOLVED",
      "created_at": "2023-06-15T18:00:00Z",
      "ended_at": "2023-06-15T18:10:00Z",
      "locked_at": "2023-06-15T18:02:00Z"
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6MX19"
  }
}
```

**Prediction Status Values:**

| Status | Description |
|--------|-------------|
| `ACTIVE` | Prediction is currently accepting wagers. |
| `LOCKED` | Prediction is locked (no more wagers), waiting for resolution. |
| `RESOLVED` | A winning outcome was selected. Points distributed. |
| `CANCELED` | Prediction was canceled. All points refunded. |

**cURL Example:**

```bash
# Get all predictions
curl -X GET 'https://api.twitch.tv/helix/predictions?broadcaster_id=141981764' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'

# Get specific prediction
curl -X GET 'https://api.twitch.tv/helix/predictions?broadcaster_id=141981764&id=bc637af0-7766-4525-9308-4112f4cbf178' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Twitch CLI Example:**

```bash
twitch api get /predictions -q broadcaster_id=141981764
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `broadcaster_id` or more than 20 `id` values. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope. |

---

### 11. Create Prediction

Creates a prediction event on the broadcaster's channel. Only one prediction can be active at a time.

**Endpoint:**

```
POST https://api.twitch.tv/helix/predictions
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:manage:predictions` |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster. Must match the user in the access token. |
| `title` | String | Yes | The prediction question. Maximum 45 characters. |
| `outcomes` | Array | Yes | Array of outcome objects. Minimum 2, maximum 10. |
| `outcomes[].title` | String | Yes | The outcome text. Maximum 25 characters. |
| `prediction_window` | Integer | Yes | How long the prediction accepts entries, in seconds. Minimum: 1. Maximum: 1800 (30 minutes). |

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "id": "bc637af0-7766-4525-9308-4112f4cbf178",
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "title": "Will I beat the boss on this attempt?",
      "winning_outcome_id": null,
      "outcomes": [
        {
          "id": "73085f5e-aaa1-4aa3-8df7-054b3c4c9e7d",
          "title": "Yes!",
          "users": 0,
          "channel_points": 0,
          "top_predictors": null,
          "color": "BLUE"
        },
        {
          "id": "94d2345f-bc78-42a1-8d9a-65e3b1a2c5d4",
          "title": "No way",
          "users": 0,
          "channel_points": 0,
          "top_predictors": null,
          "color": "PINK"
        }
      ],
      "prediction_window": 120,
      "status": "ACTIVE",
      "created_at": "2023-06-15T18:00:00Z",
      "ended_at": null,
      "locked_at": null
    }
  ]
}
```

**cURL Example:**

```bash
curl -X POST 'https://api.twitch.tv/helix/predictions' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "broadcaster_id": "141981764",
    "title": "Will I beat the boss on this attempt?",
    "outcomes": [
      {"title": "Yes!"},
      {"title": "No way"}
    ],
    "prediction_window": 120
  }'
```

**Twitch CLI Example:**

```bash
twitch api post /predictions -b '{
  "broadcaster_id": "141981764",
  "title": "Will I beat the boss on this attempt?",
  "outcomes": [
    {"title": "Yes!"},
    {"title": "No way"}
  ],
  "prediction_window": 120
}'
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Invalid parameters: title too long, fewer than 2 or more than 10 outcomes, outcome title too long, prediction_window out of range, or a prediction is already active. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope, or the broadcaster is not a partner/affiliate. |

---

### 12. End Prediction

Ends, locks, or cancels an active prediction.

**Endpoint:**

```
POST https://api.twitch.tv/helix/predictions
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:manage:predictions` |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster. Must match the user in the access token. |
| `id` | String | Yes | The ID of the prediction to end. |
| `status` | String | Yes | The status to set: `RESOLVED` (pick winner), `CANCELED` (refund all), or `LOCKED` (stop accepting wagers). |
| `winning_outcome_id` | String | Conditional | The ID of the winning outcome. Required if `status` is `RESOLVED`. |

**cURL Example:**

```bash
# Resolve prediction with a winner
curl -X POST 'https://api.twitch.tv/helix/predictions' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "broadcaster_id": "141981764",
    "id": "bc637af0-7766-4525-9308-4112f4cbf178",
    "status": "RESOLVED",
    "winning_outcome_id": "73085f5e-aaa1-4aa3-8df7-054b3c4c9e7d"
  }'

# Cancel prediction (refund all points)
curl -X POST 'https://api.twitch.tv/helix/predictions' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "broadcaster_id": "141981764",
    "id": "bc637af0-7766-4525-9308-4112f4cbf178",
    "status": "CANCELED"
  }'

# Lock prediction (stop accepting wagers)
curl -X POST 'https://api.twitch.tv/helix/predictions' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "broadcaster_id": "141981764",
    "id": "bc637af0-7766-4525-9308-4112f4cbf178",
    "status": "LOCKED"
  }'
```

**Twitch CLI Example:**

```bash
# Resolve with a winner
twitch api post /predictions -b '{
  "broadcaster_id": "141981764",
  "id": "bc637af0-7766-4525-9308-4112f4cbf178",
  "status": "RESOLVED",
  "winning_outcome_id": "73085f5e-aaa1-4aa3-8df7-054b3c4c9e7d"
}'

# Cancel prediction
twitch api post /predictions -b '{
  "broadcaster_id": "141981764",
  "id": "bc637af0-7766-4525-9308-4112f4cbf178",
  "status": "CANCELED"
}'
```

**Response:** Returns the updated prediction object with the new status, `ended_at`, `locked_at`, and `winning_outcome_id` fields populated as applicable.

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Invalid status, missing `winning_outcome_id` when status is RESOLVED, or prediction is not in a valid state for the requested transition. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope. |
| 404 | Prediction not found. |

---

## Hype Train

A Hype Train is a community-driven event that occurs when a channel receives a rapid influx of subscriptions, bits, and other support during a stream.

---

### 13. Get Hype Train Events

Gets information about Hype Train events for a broadcaster.

**Endpoint:**

```
GET https://api.twitch.tv/helix/hypetrain/events
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:read:hype_train` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster. Must match the user in the access token. |
| `first` | Integer | No | Number of results per page. Maximum: 100. Default: 1. |
| `after` | String | No | Cursor for forward pagination. |

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "id": "1b0AsbInCHZW2SQFQkCzqN07Ib2",
      "event_type": "hypetrain.progression",
      "event_timestamp": "2023-06-15T18:00:00Z",
      "version": "1.0",
      "event_data": {
        "broadcaster_id": "141981764",
        "cooldown_end_time": "2023-06-15T19:00:00Z",
        "expires_at": "2023-06-15T18:05:00Z",
        "goal": 1600,
        "id": "hype-train-id-123",
        "last_contribution": {
          "total": 500,
          "type": "BITS",
          "user": "274637212"
        },
        "level": 2,
        "started_at": "2023-06-15T17:55:00Z",
        "top_contributions": [
          {
            "total": 1000,
            "type": "BITS",
            "user": "274637212"
          },
          {
            "total": 500,
            "type": "SUBS",
            "user": "123456789"
          }
        ],
        "total": 2800
      }
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6MX19"
  }
}
```

**Contribution Types:**

| Type | Description |
|------|-------------|
| `BITS` | Bits cheered during the Hype Train. |
| `SUBS` | Subscriptions (including gift subs) during the Hype Train. |
| `OTHER` | Other contribution types. |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/hypetrain/events?broadcaster_id=141981764&first=5' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Twitch CLI Example:**

```bash
twitch api get /hypetrain/events -q broadcaster_id=141981764 -q first=5
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `broadcaster_id`. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope. |

---

## Goals

Creator Goals allow broadcasters to set follower and subscription goals that are displayed on their channel.

---

### 14. Get Creator Goals

Gets the broadcaster's current Creator Goals.

**Endpoint:**

```
GET https://api.twitch.tv/helix/goals
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:read:goals` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster. Must match the user in the access token. |

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "id": "goal-id-12345",
      "broadcaster_id": "141981764",
      "broadcaster_name": "TwitchDev",
      "broadcaster_login": "twitchdev",
      "type": "subscription_count",
      "description": "Road to 1000 subs!",
      "current_amount": 743,
      "target_amount": 1000,
      "created_at": "2023-01-01T00:00:00Z"
    }
  ]
}
```

**Goal Types:**

| Type | Description |
|------|-------------|
| `follower` | Follower count goal. |
| `subscription` | Total subscription points goal (accounts for tier weighting). |
| `subscription_count` | Total number of subscriptions goal. |
| `new_subscription` | New subscription points goal. |
| `new_subscription_count` | New subscription count goal. |

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/goals?broadcaster_id=141981764' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Twitch CLI Example:**

```bash
twitch api get /goals -q broadcaster_id=141981764
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `broadcaster_id`. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope. |

---

## Charity

Charity endpoints allow you to read information about charity campaigns on a broadcaster's channel. These are read-only endpoints; campaigns are created and managed through the Twitch dashboard.

---

### 15. Get Charity Campaign

Gets information about the charity campaign that a broadcaster is running.

**Endpoint:**

```
GET https://api.twitch.tv/helix/charity/campaigns
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:read:charity` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster. Must match the user in the access token. |

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "id": "charity-campaign-id-123",
      "broadcaster_id": "141981764",
      "broadcaster_login": "twitchdev",
      "broadcaster_name": "TwitchDev",
      "charity_name": "Direct Relief",
      "charity_description": "Direct Relief is a humanitarian aid organization.",
      "charity_logo": "https://abc.cloudfront.net/charity-logo.png",
      "charity_website": "https://www.directrelief.org",
      "current_amount": {
        "value": 150000,
        "decimal_places": 2,
        "currency": "USD"
      },
      "target_amount": {
        "value": 500000,
        "decimal_places": 2,
        "currency": "USD"
      }
    }
  ]
}
```

**Amount Format:**

The `value` field is an integer representation of the amount. To get the actual dollar amount, divide by 10 raised to the power of `decimal_places`. For example, `value: 150000` with `decimal_places: 2` equals $1,500.00.

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/charity/campaigns?broadcaster_id=141981764' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Twitch CLI Example:**

```bash
twitch api get /charity/campaigns -q broadcaster_id=141981764
```

**Response Notes:**

- Returns an empty `data` array if the broadcaster is not currently running a charity campaign.
- Only returns the active campaign, not historical campaigns.

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `broadcaster_id`. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope. |

---

### 16. Get Charity Campaign Donations

Gets the list of donations for the broadcaster's current charity campaign.

**Endpoint:**

```
GET https://api.twitch.tv/helix/charity/donations
```

**Authentication:**

| Type | Scope |
|------|-------|
| User Access Token | `channel:read:charity` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcaster_id` | String | Yes | The ID of the broadcaster. Must match the user in the access token. |
| `first` | Integer | No | Number of results per page. Maximum: 100. Default: 20. |
| `after` | String | No | Cursor for forward pagination. |

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "id": "donation-id-12345",
      "campaign_id": "charity-campaign-id-123",
      "user_id": "274637212",
      "user_login": "torpedo09",
      "user_name": "torpedo09",
      "amount": {
        "value": 2500,
        "decimal_places": 2,
        "currency": "USD"
      }
    },
    {
      "id": "donation-id-67890",
      "campaign_id": "charity-campaign-id-123",
      "user_id": "123456789",
      "user_login": "viewer42",
      "user_name": "viewer42",
      "amount": {
        "value": 1000,
        "decimal_places": 2,
        "currency": "USD"
      }
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6Mn19"
  }
}
```

**cURL Example:**

```bash
curl -X GET 'https://api.twitch.tv/helix/charity/donations?broadcaster_id=141981764&first=50' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

**Twitch CLI Example:**

```bash
twitch api get /charity/donations -q broadcaster_id=141981764 -q first=50
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing `broadcaster_id`. |
| 401 | Invalid or expired access token. |
| 403 | Missing required scope. |

---

## Related EventSub Types

These EventSub subscription types provide real-time notifications for the endpoints covered in this document.

### Channel Points Events

| EventSub Type | Description | Scope |
|---------------|-------------|-------|
| `channel.channel_points_custom_reward.add` | A custom reward was created. | `channel:read:redemptions` or `channel:manage:redemptions` |
| `channel.channel_points_custom_reward.update` | A custom reward was updated. | `channel:read:redemptions` or `channel:manage:redemptions` |
| `channel.channel_points_custom_reward.remove` | A custom reward was deleted. | `channel:read:redemptions` or `channel:manage:redemptions` |
| `channel.channel_points_custom_reward_redemption.add` | A viewer redeemed a custom reward. | `channel:read:redemptions` or `channel:manage:redemptions` |
| `channel.channel_points_custom_reward_redemption.update` | A redemption was fulfilled or canceled. | `channel:read:redemptions` or `channel:manage:redemptions` |
| `channel.channel_points_automatic_reward_redemption.add` | A viewer redeemed an automatic reward (e.g., highlight message). | `channel:read:redemptions` or `channel:manage:redemptions` |

### Poll Events

| EventSub Type | Description | Scope |
|---------------|-------------|-------|
| `channel.poll.begin` | A poll was started. | `channel:read:polls` or `channel:manage:polls` |
| `channel.poll.progress` | A poll received votes (fired periodically). | `channel:read:polls` or `channel:manage:polls` |
| `channel.poll.end` | A poll ended. | `channel:read:polls` or `channel:manage:polls` |

### Prediction Events

| EventSub Type | Description | Scope |
|---------------|-------------|-------|
| `channel.prediction.begin` | A prediction was started. | `channel:read:predictions` or `channel:manage:predictions` |
| `channel.prediction.progress` | Wagers were placed (fired periodically). | `channel:read:predictions` or `channel:manage:predictions` |
| `channel.prediction.lock` | A prediction was locked (no more wagers). | `channel:read:predictions` or `channel:manage:predictions` |
| `channel.prediction.end` | A prediction was resolved or canceled. | `channel:read:predictions` or `channel:manage:predictions` |

### Hype Train Events

| EventSub Type | Description | Scope |
|---------------|-------------|-------|
| `channel.hype_train.begin` | A Hype Train started. | `channel:read:hype_train` |
| `channel.hype_train.progress` | A Hype Train leveled up or received contributions. | `channel:read:hype_train` |
| `channel.hype_train.end` | A Hype Train ended. | `channel:read:hype_train` |

### Goal Events

| EventSub Type | Description | Scope |
|---------------|-------------|-------|
| `channel.goal.begin` | A Creator Goal was created. | `channel:read:goals` |
| `channel.goal.progress` | Progress was made toward a Creator Goal. | `channel:read:goals` |
| `channel.goal.end` | A Creator Goal was completed or removed. | `channel:read:goals` |

### Charity Events

| EventSub Type | Description | Scope |
|---------------|-------------|-------|
| `channel.charity_campaign.donate` | A donation was made to the charity campaign. | `channel:read:charity` |
| `channel.charity_campaign.start` | A charity campaign was started. | `channel:read:charity` |
| `channel.charity_campaign.progress` | Progress was made toward the charity campaign goal. | `channel:read:charity` |
| `channel.charity_campaign.stop` | A charity campaign was stopped. | `channel:read:charity` |

---

## Best Practices

### Channel Points

- **Reward ownership:** Your application can only manage rewards it created. Track the reward IDs your app creates and store them persistently.
- **Redemption queue processing:** Use `should_redemptions_skip_request_queue: false` for rewards that need manual approval. Poll the redemptions endpoint or subscribe to the `channel.channel_points_custom_reward_redemption.add` EventSub type.
- **Bulk updates:** When fulfilling or canceling multiple redemptions, batch them in a single request (up to 50 IDs) rather than making individual calls.
- **Cooldowns and limits:** Use `is_global_cooldown_enabled`, `is_max_per_stream_enabled`, and `is_max_per_user_per_stream_enabled` to prevent spam and abuse.
- **50 reward limit:** Channels are limited to 50 custom rewards total across all applications. Check existing rewards before creating new ones.
- **Cleanup:** Delete rewards your application created when they are no longer needed, to free up the reward limit for others.

### Polls and Predictions

- **One active at a time:** Only one poll can be active at a time, and only one prediction can be active at a time. Attempting to create a second will return an error.
- **Partner/affiliate only:** Both polls and predictions are only available to partners and affiliates. Check the broadcaster's status before attempting to create one.
- **Duration planning:** Set appropriate durations. Polls support 15-1800 seconds (30 minutes); predictions support 1-1800 seconds. Shorter durations create more urgency.
- **Graceful endings:** Always end polls and predictions programmatically (TERMINATED/RESOLVED) rather than letting them expire silently, to maintain engagement.
- **Prediction resolution:** When resolving predictions, ensure you use the correct `winning_outcome_id`. An incorrect ID will distribute points to the wrong group.
- **Lock before resolve:** Consider locking predictions (status: LOCKED) before resolving to give yourself time to determine the outcome without accepting more wagers.

### Hype Train

- **Cooldown awareness:** After a Hype Train ends, there is a cooldown period (returned in `cooldown_end_time`) before another can start.
- **EventSub preferred:** Use EventSub types (`channel.hype_train.begin`, `progress`, `end`) for real-time tracking instead of polling the REST endpoint.

### Goals

- **Read-only:** Goals can only be read via the API, not created or modified. They are managed through the Twitch dashboard.
- **Multiple goals:** A broadcaster can have multiple active goals simultaneously.

### Charity

- **Read-only:** Charity campaigns are managed through the Twitch dashboard. The API provides read-only access.
- **Amount parsing:** Remember that `value` is an integer. Divide by `10 ^ decimal_places` to get the actual amount. For example, `value: 150000` with `decimal_places: 2` equals 1500.00.
- **No historical data:** Only the active campaign is returned. There is no endpoint for past campaigns.

### General

- **Use EventSub over polling:** For all features covered in this document, prefer EventSub subscriptions for real-time updates rather than polling REST endpoints.
- **Scope selection:** Use the read scope (`channel:read:*`) when you only need to display data. Use the manage scope (`channel:manage:*`) when your application needs to create, update, or delete resources.
- **Error handling:** Always handle 403 errors gracefully — the broadcaster may have lost their affiliate/partner status, which removes access to these features.

---

## Known Issues & Community Notes

- **Polls and predictions share the endpoint path for creation and ending.** The `POST /polls` endpoint both creates and ends polls depending on whether the `id` field is present in the body. The same applies to `POST /predictions`. This can lead to confusion; always ensure you include the `id` field when ending and omit it when creating.
- **Reward image field often null.** The `image` field in custom rewards is `null` unless a custom image was uploaded via the Twitch dashboard. The `default_image` field always has values and should be used as a fallback.
- **Redemption status transitions.** Redemptions can only transition from `UNFULFILLED` to `FULFILLED` or `CANCELED`. Attempting to change an already fulfilled or canceled redemption will fail.
- **Channel Points availability.** Channel Points are only available to partners and affiliates. Attempting to call these endpoints for a non-partner/non-affiliate will return a 403 error.
- **Prediction outcome colors.** Twitch assigns colors to outcomes automatically (BLUE for the first, PINK for the second, etc.). These colors cannot be customized via the API.
- **Hype Train default page size.** The `first` parameter for Get Hype Train Events defaults to 1, not 20. Always explicitly set `first` to get multiple events.
- **Charity campaign regional availability.** Charity campaigns may not be available in all regions. The API will return an empty `data` array if the feature is not available for the broadcaster.
- **Poll bits voting deprecation.** While the response still includes `bits_voting_enabled` and `bits_per_vote` fields, Twitch has deprecated Bits-based voting for polls. These fields may always return `false` and `0`.
- **Max per stream counter reset.** The `redemptions_redeemed_current_stream` counter resets when the stream ends. Between streams, this value is `null`.
- **EventSub for predictions delivers intermediate states.** The `channel.prediction.progress` event fires periodically (not on every individual wager), so do not rely on it for exact real-time totals. Use it for approximate updates and fetch the final state via the REST endpoint after the prediction ends.

---

## Quick Reference Table

| # | Method | Endpoint | Description | Scope | Auth |
|---|--------|----------|-------------|-------|------|
| 1 | POST | `/channel_points/custom_rewards` | Create Custom Reward | `channel:manage:redemptions` | User |
| 2 | GET | `/channel_points/custom_rewards` | Get Custom Reward | `channel:read:redemptions` or `channel:manage:redemptions` | User |
| 3 | PATCH | `/channel_points/custom_rewards` | Update Custom Reward | `channel:manage:redemptions` | User |
| 4 | DELETE | `/channel_points/custom_rewards` | Delete Custom Reward | `channel:manage:redemptions` | User |
| 5 | GET | `/channel_points/custom_rewards/redemptions` | Get Custom Reward Redemption | `channel:read:redemptions` or `channel:manage:redemptions` | User |
| 6 | PATCH | `/channel_points/custom_rewards/redemptions` | Update Redemption Status | `channel:manage:redemptions` | User |
| 7 | GET | `/polls` | Get Polls | `channel:read:polls` or `channel:manage:polls` | User |
| 8 | POST | `/polls` | Create Poll | `channel:manage:polls` | User |
| 9 | POST | `/polls` | End Poll | `channel:manage:polls` | User |
| 10 | GET | `/predictions` | Get Predictions | `channel:read:predictions` or `channel:manage:predictions` | User |
| 11 | POST | `/predictions` | Create Prediction | `channel:manage:predictions` | User |
| 12 | POST | `/predictions` | End Prediction | `channel:manage:predictions` | User |
| 13 | GET | `/hypetrain/events` | Get Hype Train Events | `channel:read:hype_train` | User |
| 14 | GET | `/goals` | Get Creator Goals | `channel:read:goals` | User |
| 15 | GET | `/charity/campaigns` | Get Charity Campaign | `channel:read:charity` | User |
| 16 | GET | `/charity/donations` | Get Charity Campaign Donations | `channel:read:charity` | User |

**Scopes Summary:**

| Scope | Grants Access To |
|-------|------------------|
| `channel:read:redemptions` | Read custom rewards and redemptions. |
| `channel:manage:redemptions` | Create, update, delete custom rewards and manage redemptions. |
| `channel:read:polls` | Read polls. |
| `channel:manage:polls` | Create and end polls. |
| `channel:read:predictions` | Read predictions. |
| `channel:manage:predictions` | Create and end predictions. |
| `channel:read:hype_train` | Read Hype Train events. |
| `channel:read:goals` | Read Creator Goals. |
| `channel:read:charity` | Read charity campaigns and donations. |

**Limits:**

| Resource | Limit |
|----------|-------|
| Custom rewards per channel | 50 |
| Reward IDs per request (GET/DELETE) | 50 |
| Redemption IDs per update | 50 |
| Poll choices | 2-5 |
| Poll title length | 60 characters |
| Poll choice title length | 25 characters |
| Poll duration | 15-1800 seconds |
| Poll IDs per GET request | 20 |
| Prediction outcomes | 2-10 |
| Prediction title length | 45 characters |
| Prediction outcome title length | 25 characters |
| Prediction window | 1-1800 seconds |
| Prediction IDs per GET request | 20 |
| Hype Train events per page | 100 (default: 1) |
| Charity donations per page | 100 |
| Reward title length | 45 characters |
| Reward prompt length | 200 characters |
| Reward cost minimum | 1 |
