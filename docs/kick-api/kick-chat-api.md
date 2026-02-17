---
title: "Kick Chat API"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Kick Chat API

> **Source:** https://docs.kick.com/apis/chat
> **GitHub Raw:** https://github.com/KickEngineering/KickDevDocs/blob/main/apis/chat.md
> **Last verified:** 2026-02-13
> **API Base URL:** `https://api.kick.com/public/v1`

## Overview

The Chat API enables applications to send and delete messages in Kick channel chats. You can send messages using either a Bot account or a User account. Chat messages can include replies to existing messages.

**Important:** There is no API endpoint to *read* chat messages. To receive chat messages, subscribe to the `chat.message.sent` webhook event via the Events API. See [kick-subscribe-to-events.md](./kick-subscribe-to-events.md).

---

## Authentication

| Endpoint | Token Type | Required Scope |
|----------|-----------|----------------|
| `POST /public/v1/chat` | User Access Token | `chat:write` |
| `DELETE /public/v1/chat/{message_id}` | User Access Token | `moderation:chat_message:manage` |

---

## Endpoints

### POST /public/v1/chat

Send a chat message to a channel. Can be used with a bot account or a regular user account.

#### HTTP Request

```
POST https://api.kick.com/public/v1/chat
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <user_access_token>` |
| `Content-Type` | Yes | string | `application/json` |

#### Request Body

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `broadcaster_user_id` | Yes | integer | The user ID of the channel to send the message in |
| `content` | Yes | string | The message text content |
| `reply_to_message_id` | No | string | Message ID to reply to (creates a threaded reply) |

#### Example Request: Send Message

```bash
curl -X POST https://api.kick.com/public/v1/chat \
  -H "Authorization: Bearer ${USER_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "broadcaster_user_id": 123456789,
    "content": "Hello from the API!"
  }'
```

#### Example Request: Reply to Message

```bash
curl -X POST https://api.kick.com/public/v1/chat \
  -H "Authorization: Bearer ${USER_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "broadcaster_user_id": 123456789,
    "content": "This is a reply!",
    "reply_to_message_id": "original_message_id_123"
  }'
```

#### Response (200 OK)

```json
{
  "data": {
    "message_id": "unique_message_id_789",
    "is_sent": true
  },
  "message": "OK"
}
```

#### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `data.message_id` | string | The ID of the sent message |
| `data.is_sent` | boolean | Whether the message was successfully sent |

#### Error Responses

| Status Code | Description |
|-------------|-------------|
| `400` | Bad Request -- missing required fields, empty content |
| `401` | Unauthorized -- invalid or expired token |
| `403` | Forbidden -- token lacks `chat:write` scope, or user is banned from the channel |
| `404` | Not Found -- broadcaster user ID does not exist ("Channel not found") |
| `429` | Too Many Requests -- rate limit exceeded |

---

### DELETE /public/v1/chat/{message_id}

Delete a chat message. Requires moderation permissions on the channel.

#### HTTP Request

```
DELETE https://api.kick.com/public/v1/chat/{message_id}
```

#### Path Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `message_id` | Yes | string | The ID of the message to delete |

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <user_access_token>` |

#### Query Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `broadcaster_user_id` | Yes | integer | The user ID of the channel where the message exists |

#### Example Request

```bash
curl -X DELETE "https://api.kick.com/public/v1/chat/message_id_123?broadcaster_user_id=123456789" \
  -H "Authorization: Bearer ${USER_ACCESS_TOKEN}"
```

#### Response (200 OK)

```json
{
  "message": "OK"
}
```

#### Error Responses

| Status Code | Description |
|-------------|-------------|
| `401` | Unauthorized -- invalid or expired token |
| `403` | Forbidden -- token lacks `moderation:chat_message:manage` scope, or user lacks moderation rights |
| `404` | Not Found -- message ID does not exist |

---

## Chat Message Object (from Webhooks)

When receiving chat messages via the `chat.message.sent` webhook, the payload includes detailed sender information. See [kick-webhook-payloads-event-types.md](./kick-webhook-payloads-event-types.md#event-1-chat-message-chatmessagesent) for the full schema.

### Sender Identity Object

The `sender.identity` object provides visual identity information:

```json
{
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
```

| Field | Type | Description |
|-------|------|-------------|
| `username_color` | string | Hex color for the username |
| `badges` | array | Array of badge objects |
| `badges[].text` | string | Display text (e.g., "Moderator") |
| `badges[].type` | string | Badge type: `"moderator"`, `"sub_gifter"`, `"subscriber"` |
| `badges[].count` | number | Optional count (months subbed, gifts given) |

---

## Rate Limits

Chat message sending has rate limits to prevent spam:

- **Default:** Limited messages per second/minute (exact values not documented) [VERIFY]
- **Verified apps:** Higher limits (1,000 to 10,000 subscription events)
- Messages that exceed the rate limit receive a `429` response

> **Note:** See [GitHub Issue #219](https://github.com/KickEngineering/KickDevDocs/issues/219) -- community reports indicate the daily message quota can be very low for unverified apps.

---

## Chat Bot Implementation Patterns

### Basic Bot Architecture

```
Webhook Endpoint (receives chat.message.sent events)
       |
       v
Event Handler (verifies signature, parses payload)
       |
       v
Command Parser (extracts command from message content)
       |
       v
Response Generator (creates response message)
       |
       v
Chat API (POST /public/v1/chat to send response)
```

### Anti-Loop Guard (CRITICAL)

When your bot sends a message via the Chat API, it triggers a `chat.message.sent` webhook event for that message. **You MUST filter out your bot's own messages** to prevent infinite recursive message storms.

```typescript
// TypeScript -- Bot with anti-loop protection
const BOT_USER_ID = parseInt(process.env.BOT_USER_ID!);

interface ChatMessagePayload {
  message_id: string;
  broadcaster: { user_id: number; username: string };
  sender: { user_id: number; username: string };
  content: string;
  created_at: string;
}

async function handleChatEvent(payload: ChatMessagePayload): Promise<void> {
  // CRITICAL: Prevent infinite loops by ignoring our own messages
  if (payload.sender.user_id === BOT_USER_ID) {
    return;
  }

  // Parse command
  const content = payload.content.trim();
  if (!content.startsWith('!')) {
    return; // Not a command
  }

  const [command, ...args] = content.slice(1).split(' ');

  let response: string | null = null;
  switch (command.toLowerCase()) {
    case 'hello':
      response = `Hello, ${payload.sender.username}!`;
      break;
    case 'uptime':
      response = 'Stream has been live for 2 hours!';
      break;
    default:
      return; // Unknown command, ignore
  }

  if (response) {
    await sendChatMessage(
      process.env.BOT_ACCESS_TOKEN!,
      payload.broadcaster.user_id,
      response,
    );
  }
}

async function sendChatMessage(
  token: string,
  broadcasterUserId: number,
  content: string,
  replyToMessageId?: string,
): Promise<void> {
  const body: Record<string, unknown> = {
    broadcaster_user_id: broadcasterUserId,
    content,
  };
  if (replyToMessageId) {
    body.reply_to_message_id = replyToMessageId;
  }

  const response = await fetch('https://api.kick.com/public/v1/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Failed to send message: ${response.status} ${text}`);
  }
}
```

### Python Bot Example

```python
import os
import requests

BASE_URL = "https://api.kick.com/public/v1"
BOT_USER_ID = int(os.environ["BOT_USER_ID"])
BOT_ACCESS_TOKEN = os.environ["BOT_ACCESS_TOKEN"]


def send_chat_message(
    broadcaster_user_id: int,
    content: str,
    reply_to_message_id: str | None = None,
) -> None:
    """Send a chat message to a channel."""
    body = {
        "broadcaster_user_id": broadcaster_user_id,
        "content": content,
    }
    if reply_to_message_id:
        body["reply_to_message_id"] = reply_to_message_id

    response = requests.post(
        f"{BASE_URL}/chat",
        headers={
            "Authorization": f"Bearer {BOT_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        },
        json=body,
    )
    if not response.ok:
        print(f"Failed to send message: {response.status_code} {response.text}")


def handle_chat_event(payload: dict) -> None:
    """Process incoming chat message webhook event."""
    # CRITICAL: Prevent infinite loops
    if payload["sender"]["user_id"] == BOT_USER_ID:
        return

    content = payload["content"].strip()
    if not content.startswith("!"):
        return

    parts = content[1:].split(" ", 1)
    command = parts[0].lower()

    response = None
    if command == "hello":
        response = f"Hello, {payload['sender']['username']}!"
    elif command == "uptime":
        response = "Stream has been live for 2 hours!"

    if response:
        send_chat_message(
            payload["broadcaster"]["user_id"],
            response,
        )


def delete_chat_message(
    message_id: str,
    broadcaster_user_id: int,
) -> None:
    """Delete a chat message (requires moderation scope)."""
    response = requests.delete(
        f"{BASE_URL}/chat/{message_id}",
        headers={"Authorization": f"Bearer {BOT_ACCESS_TOKEN}"},
        params={"broadcaster_user_id": broadcaster_user_id},
    )
    if not response.ok:
        print(f"Failed to delete message: {response.status_code}")
```

---

## Best Practices & Production Hardening

### Anti-Loop Prevention (Most Critical)

- **ALWAYS** check `sender.user_id` against your bot's user ID before processing messages.
- Consider maintaining a set of known bot user IDs if you run multiple bots.
- Never send a message in response to a message from any bot without human-initiated trigger.

### Rate Limit Handling

- Implement exponential backoff when receiving `429` responses.
- Queue messages and space them out to avoid hitting rate limits.
- For verified apps, contact developers@kick.com to increase limits.

### Idempotent Webhook Processing

- Use `Kick-Event-Message-Id` as an idempotency key to prevent processing the same message twice.
- This is especially important for bots -- processing a duplicate could mean sending the response twice.

### Message Content Safety

- Sanitize message content before processing to prevent command injection in your application.
- Limit response message length to prevent issues.

### "Channel Not Found" Error

- The `404` error with "Channel not found" message can occur even with valid tokens (see [Issue #123](https://github.com/KickEngineering/KickDevDocs/issues/123) and [Discussion #146](https://github.com/KickEngineering/KickDevDocs/discussions/146)).
- Ensure you're using `broadcaster_user_id` (not channel ID or slug).
- New apps may need a bot entity created in app settings first (see [Issue #212](https://github.com/KickEngineering/KickDevDocs/issues/212)).

### Token Refresh Lifecycle

- Bot tokens expire. Implement automatic refresh to keep the bot running.
- If refresh fails, log the error and alert; the bot will be unable to respond.

### Secure Secret Storage

- Store bot tokens in environment variables, never in source code.
- Store the bot's user ID for anti-loop checks.

### Logging Recommendations

- Log commands processed, messages sent (content and broadcaster), and errors.
- Never log access tokens or full message content in production (PII concerns).

---

## Known Issues & Community Notes

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#123](https://github.com/KickEngineering/KickDevDocs/issues/123) | "Channel not found" on sending chat message as bot | Closed | Use `broadcaster_user_id`, ensure bot entity exists in app |
| [#219](https://github.com/KickEngineering/KickDevDocs/issues/219) | Chat API message quota too low | Closed | Daily quotas exist; request verification for higher limits |
| [#212](https://github.com/KickEngineering/KickDevDocs/issues/212) | Webhooks not working until bot created | Closed | Creating bot entity in app settings resolved webhook delivery |
| [#146](https://github.com/KickEngineering/KickDevDocs/discussions/146) | New apps get "Channel not found" | Discussion | Fresh apps fail despite valid tokens |
| [#214](https://github.com/KickEngineering/KickDevDocs/discussions/214) | Is there a way to read chat via API? | Discussion | No read endpoint; use `chat.message.sent` webhook |
| [#215](https://github.com/KickEngineering/KickDevDocs/discussions/215) | How to use `chat.message.sent` in Python? | Discussion | Community guidance for Python webhook implementation |
| [#312](https://github.com/KickEngineering/KickDevDocs/discussions/312) | Client-initiated way to read live chat? | Discussion | No client-pull method; webhooks are the only option |
| [#85](https://github.com/KickEngineering/KickDevDocs/discussions/85) | WebSocket for chat bot development | Discussion | No public WebSocket API; use webhooks |
| [#336](https://github.com/KickEngineering/KickDevDocs/issues/336) | Badge image URLs not provided | Open | Cannot render badges from webhook data |
| [#323](https://github.com/KickEngineering/KickDevDocs/issues/323) | No emotes endpoint | Open | Cannot resolve emote IDs to images |
| Changelog 12/02/2025 | DELETE chat endpoint added | Released | Chat message deletion via API |

### No WebSocket / Client-Initiated Chat Reading

Kick does NOT provide a public WebSocket API or polling endpoint for reading chat messages. The only supported method is subscribing to `chat.message.sent` webhook events. This means your bot requires a publicly accessible webhook endpoint.

---

## Quick Reference Table

| Method | Path | Auth | Scope | Description |
|--------|------|------|-------|-------------|
| `POST` | `/public/v1/chat` | User Token | `chat:write` | Send a chat message |
| `DELETE` | `/public/v1/chat/{message_id}` | User Token | `moderation:chat_message:manage` | Delete a chat message |
