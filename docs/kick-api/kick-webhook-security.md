# Kick Webhook Security

> **Source:** https://docs.kick.com/events/webhook-security
> **GitHub Raw:** https://github.com/KickEngineering/KickDevDocs/blob/main/events/webhook-security.md
> **Last verified:** 2026-02-13
> **API Base URL:** `https://api.kick.com/public/v1`

## Overview

Every webhook delivery from Kick includes cryptographic signatures that allow you to verify the request originated from Kick's servers. This prevents attackers from sending fake events to your webhook endpoint. Verification uses **RSA PKCS1v15 with SHA-256** -- Kick signs payloads with their private key, and you verify with their public key.

Both **App Access Tokens** and **User Access Tokens** can access webhook functionality.

---

## Webhook Headers

Every webhook request from Kick includes the following six headers:

| Header | Type | Description |
|--------|------|-------------|
| `Kick-Event-Message-Id` | ULID | Unique message identifier. Use as an idempotency key to prevent duplicate processing |
| `Kick-Event-Subscription-Id` | ULID | The subscription ID associated with this event delivery |
| `Kick-Event-Signature` | Base64-encoded string | RSA-PKCS1v15-SHA256 signature for verifying the sender |
| `Kick-Event-Message-Timestamp` | RFC 3339 datetime | Timestamp of when the message was sent by Kick |
| `Kick-Event-Type` | string | Event type identifier (e.g., `chat.message.sent`) |
| `Kick-Event-Version` | string | Event schema version (e.g., `1`) |

---

## Signature Verification Process

### Step 1: Obtain the Public Key

Kick provides an RSA public key in PEM format. You can:

1. **Embed it statically** in your application (shown below)
2. **Fetch it dynamically** from `https://api.kick.com/public/v1/public-key`

#### Kick's Current Public Key (PEM format)

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq/+l1WnlRrGSolDMA+A8
6rAhMbQGmQ2SapVcGM3zq8ANXjnhDWocMqfWcTd95btDydITa10kDvHzw9WQOqp2
MZI7ZyrfzJuz5nhTPCiJwTwnEtWft7nV14BYRDHvlfqPUaZ+1KR4OCaO/wWIk/rQ
L/TjY0M70gse8rlBkbo2a8rKhu69RQTRsoaf4DVhDPEeSeI5jVrRDGAMGL3cGuyY
6CLKGdjVEM78g3JfYOvDU/RvfqD7L89TZ3iN94jrmWdGz34JNlEI5hqK8dd7C5EF
BEbZ5jgB8s8ReQV8H+MkuffjdAj3ajDDX3DOJMIut1lBrUVD1AaSrGCKHooWoL2e
twIDAQAB
-----END PUBLIC KEY-----
```

> **Warning:** The public key may rotate. For production systems, fetch it dynamically and cache with a reasonable TTL (e.g., 24 hours). See [kick-public-key-api.md](./kick-public-key-api.md).

### Step 2: Construct the Signed Message

The signature is created by concatenating three values separated by dots (`.`):

```
{Kick-Event-Message-Id}.{Kick-Event-Message-Timestamp}.{raw_request_body}
```

Where:
- `Kick-Event-Message-Id` -- from the request header
- `Kick-Event-Message-Timestamp` -- from the request header
- `raw_request_body` -- the raw HTTP request body as a string (do NOT parse or re-serialize the JSON)

### Step 3: Verify the Signature

1. **Base64-decode** the value of the `Kick-Event-Signature` header
2. **SHA-256 hash** the constructed message from Step 2
3. **Verify** using RSA PKCS1v15 with the public key

### Step 4: Replay Attack Prevention

Check the `Kick-Event-Message-Timestamp` header:
- Parse the RFC 3339 timestamp
- Compare with current server time
- **Reject requests older than 5-10 minutes** (recommended tolerance window)
- This prevents attackers from replaying captured valid webhook requests

### What to Return

| Scenario | Status Code | Behavior |
|----------|-------------|----------|
| Signature valid, event processed | `200` | Event is acknowledged; Kick won't retry |
| Signature valid, processing queued | `200` | Return immediately, process async |
| Signature invalid | `401` or `403` | Reject the request; do NOT process the payload |
| Timestamp too old (replay attack) | `401` or `403` | Reject the request |
| Server error during processing | `500` | Kick will retry delivery |

---

## Code Examples

### Go (from official docs)

#### Parse Public Key

```go
import (
    "crypto/rsa"
    "crypto/x509"
    "encoding/pem"
    "errors"
)

func ParsePublicKey(bs []byte) (rsa.PublicKey, error) {
    block, _ := pem.Decode(bs)
    if block == nil {
        return rsa.PublicKey{}, errors.New("not decodable key")
    }

    if block.Type != "PUBLIC KEY" {
        return rsa.PublicKey{}, errors.New("not public key")
    }

    parsed, err := x509.ParsePKIXPublicKey(block.Bytes)
    if err != nil {
        return rsa.PublicKey{}, err
    }

    publicKey, ok := parsed.(*rsa.PublicKey)
    if !ok {
        return rsa.PublicKey{}, errors.New("not expected public key interface")
    }

    return *publicKey, nil
}
```

#### Verify Signature

```go
import (
    "crypto"
    "crypto/rsa"
    "crypto/sha256"
    "encoding/base64"
)

func Verify(publicKey *rsa.PublicKey, body []byte, signature []byte) error {
    decoded := make([]byte, base64.StdEncoding.DecodedLen(len(signature)))

    n, err := base64.StdEncoding.Decode(decoded, signature)
    if err != nil {
        return err
    }

    signature = decoded[:n]
    hashed := sha256.Sum256(body)

    return rsa.VerifyPKCS1v15(publicKey, crypto.SHA256, hashed[:], signature)
}
```

#### Full Usage

```go
// Parse the Public Key
pubkey, err := ParsePublicKey([]byte(kickPublicKeyPEM))
if err != nil {
    log.Fatal("Failed to parse public key:", err)
}

// Construct the message to verify
messageID := r.Header.Get("Kick-Event-Message-Id")
timestamp := r.Header.Get("Kick-Event-Message-Timestamp")
body, _ := io.ReadAll(r.Body)
signedMessage := []byte(fmt.Sprintf("%s.%s.%s", messageID, timestamp, string(body)))

// Verify the signature
signatureHeader := []byte(r.Header.Get("Kick-Event-Signature"))
err = Verify(&pubkey, signedMessage, signatureHeader)
if err != nil {
    http.Error(w, "Invalid signature", http.StatusUnauthorized)
    return
}
```

### TypeScript / Node.js

```typescript
import crypto from 'node:crypto';
import type { IncomingMessage } from 'node:http';

// Kick's public key -- fetch dynamically in production
const KICK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq/+l1WnlRrGSolDMA+A8
6rAhMbQGmQ2SapVcGM3zq8ANXjnhDWocMqfWcTd95btDydITa10kDvHzw9WQOqp2
MZI7ZyrfzJuz5nhTPCiJwTwnEtWft7nV14BYRDHvlfqPUaZ+1KR4OCaO/wWIk/rQ
L/TjY0M70gse8rlBkbo2a8rKhu69RQTRsoaf4DVhDPEeSeI5jVrRDGAMGL3cGuyY
6CLKGdjVEM78g3JfYOvDU/RvfqD7L89TZ3iN94jrmWdGz34JNlEI5hqK8dd7C5EF
BEbZ5jgB8s8ReQV8H+MkuffjdAj3ajDDX3DOJMIut1lBrUVD1AaSrGCKHooWoL2e
twIDAQAB
-----END PUBLIC KEY-----`;

const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000; // 5 minutes

interface WebhookHeaders {
  messageId: string;
  subscriptionId: string;
  signature: string;
  timestamp: string;
  eventType: string;
  eventVersion: string;
}

function extractHeaders(req: IncomingMessage): WebhookHeaders {
  return {
    messageId: req.headers['kick-event-message-id'] as string,
    subscriptionId: req.headers['kick-event-subscription-id'] as string,
    signature: req.headers['kick-event-signature'] as string,
    timestamp: req.headers['kick-event-message-timestamp'] as string,
    eventType: req.headers['kick-event-type'] as string,
    eventVersion: req.headers['kick-event-version'] as string,
  };
}

function verifySignature(
  publicKey: string,
  messageId: string,
  timestamp: string,
  rawBody: string,
  signature: string,
): boolean {
  // Step 1: Construct the signed message
  const signedMessage = `${messageId}.${timestamp}.${rawBody}`;

  // Step 2: Base64-decode the signature
  const signatureBuffer = Buffer.from(signature, 'base64');

  // Step 3: Verify using RSA PKCS1v15 with SHA-256
  const verifier = crypto.createVerify('SHA256');
  verifier.update(signedMessage);
  verifier.end();

  return verifier.verify(publicKey, signatureBuffer);
}

function isTimestampValid(timestamp: string): boolean {
  const eventTime = new Date(timestamp).getTime();
  const now = Date.now();
  return Math.abs(now - eventTime) <= MAX_TIMESTAMP_AGE_MS;
}

// Idempotency tracking (use Redis/DB in production)
const processedMessageIds = new Set<string>();

async function handleWebhook(req: IncomingMessage, rawBody: string): Promise<number> {
  const headers = extractHeaders(req);

  // Step 1: Validate required headers
  if (!headers.messageId || !headers.signature || !headers.timestamp) {
    return 400; // Bad Request
  }

  // Step 2: Replay attack prevention
  if (!isTimestampValid(headers.timestamp)) {
    return 401; // Reject stale requests
  }

  // Step 3: Idempotency check
  if (processedMessageIds.has(headers.messageId)) {
    return 200; // Already processed, acknowledge
  }

  // Step 4: Verify signature
  const isValid = verifySignature(
    KICK_PUBLIC_KEY,
    headers.messageId,
    headers.timestamp,
    rawBody,
    headers.signature,
  );

  if (!isValid) {
    return 401; // Invalid signature
  }

  // Step 5: Mark as processed
  processedMessageIds.add(headers.messageId);

  // Step 6: Process the event
  const payload = JSON.parse(rawBody);
  console.log(`Processing ${headers.eventType} event: ${headers.messageId}`);

  // Route to appropriate handler based on event type
  switch (headers.eventType) {
    case 'chat.message.sent':
      // Handle chat message...
      break;
    case 'channel.followed':
      // Handle follow...
      break;
    // ... other event types
  }

  return 200;
}
```

### Python

```python
import base64
import hashlib
import os
import time
from datetime import datetime, timezone
from typing import Optional

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.asymmetric.utils import Prehashed

# Kick's public key -- fetch dynamically in production
KICK_PUBLIC_KEY_PEM = b"""-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq/+l1WnlRrGSolDMA+A8
6rAhMbQGmQ2SapVcGM3zq8ANXjnhDWocMqfWcTd95btDydITa10kDvHzw9WQOqp2
MZI7ZyrfzJuz5nhTPCiJwTwnEtWft7nV14BYRDHvlfqPUaZ+1KR4OCaO/wWIk/rQ
L/TjY0M70gse8rlBkbo2a8rKhu69RQTRsoaf4DVhDPEeSeI5jVrRDGAMGL3cGuyY
6CLKGdjVEM78g3JfYOvDU/RvfqD7L89TZ3iN94jrmWdGz34JNlEI5hqK8dd7C5EF
BEbZ5jgB8s8ReQV8H+MkuffjdAj3ajDDX3DOJMIut1lBrUVD1AaSrGCKHooWoL2e
twIDAQAB
-----END PUBLIC KEY-----"""

MAX_TIMESTAMP_AGE_SECONDS = 300  # 5 minutes

# Idempotency tracking (use Redis/DB in production)
processed_message_ids: set[str] = set()


def load_public_key():
    """Load and parse the PEM public key."""
    return serialization.load_pem_public_key(KICK_PUBLIC_KEY_PEM)


def verify_signature(
    public_key,
    message_id: str,
    timestamp: str,
    raw_body: str,
    signature_b64: str,
) -> bool:
    """Verify the webhook signature using RSA PKCS1v15 + SHA-256."""
    # Step 1: Construct the signed message
    signed_message = f"{message_id}.{timestamp}.{raw_body}".encode("utf-8")

    # Step 2: Base64-decode the signature
    signature_bytes = base64.b64decode(signature_b64)

    # Step 3: SHA-256 hash the message
    message_hash = hashlib.sha256(signed_message).digest()

    # Step 4: Verify with RSA PKCS1v15
    try:
        public_key.verify(
            signature_bytes,
            message_hash,
            padding.PKCS1v15(),
            Prehashed(hashes.SHA256()),
        )
        return True
    except Exception:
        return False


def is_timestamp_valid(timestamp: str) -> bool:
    """Check if the timestamp is within acceptable range."""
    try:
        event_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        age = abs((now - event_time).total_seconds())
        return age <= MAX_TIMESTAMP_AGE_SECONDS
    except (ValueError, TypeError):
        return False


def handle_webhook(headers: dict, raw_body: str) -> int:
    """
    Process an incoming Kick webhook.
    Returns HTTP status code to send back.
    """
    message_id = headers.get("Kick-Event-Message-Id")
    signature = headers.get("Kick-Event-Signature")
    timestamp = headers.get("Kick-Event-Message-Timestamp")
    event_type = headers.get("Kick-Event-Type")

    # Step 1: Validate required headers
    if not all([message_id, signature, timestamp, event_type]):
        return 400

    # Step 2: Replay attack prevention
    if not is_timestamp_valid(timestamp):
        return 401

    # Step 3: Idempotency check
    if message_id in processed_message_ids:
        return 200  # Already processed

    # Step 4: Verify signature
    public_key = load_public_key()
    if not verify_signature(public_key, message_id, timestamp, raw_body, signature):
        return 401

    # Step 5: Mark as processed
    processed_message_ids.add(message_id)

    # Step 6: Process the event
    import json
    payload = json.loads(raw_body)
    print(f"Processing {event_type} event: {message_id}")

    return 200
```

### Express.js Example (Full Webhook Server)

```typescript
import express from 'express';
import crypto from 'node:crypto';

const app = express();

// CRITICAL: Use raw body for signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));

const KICK_PUBLIC_KEY = process.env.KICK_PUBLIC_KEY!;
const BOT_USER_ID = parseInt(process.env.BOT_USER_ID || '0');
const processedIds = new Set<string>();

app.post('/webhook', (req, res) => {
  const rawBody = req.body.toString('utf-8');
  const messageId = req.headers['kick-event-message-id'] as string;
  const timestamp = req.headers['kick-event-message-timestamp'] as string;
  const signature = req.headers['kick-event-signature'] as string;
  const eventType = req.headers['kick-event-type'] as string;

  // Validate headers
  if (!messageId || !timestamp || !signature || !eventType) {
    res.status(400).send('Missing headers');
    return;
  }

  // Replay protection
  const age = Math.abs(Date.now() - new Date(timestamp).getTime());
  if (age > 5 * 60 * 1000) {
    res.status(401).send('Stale timestamp');
    return;
  }

  // Idempotency
  if (processedIds.has(messageId)) {
    res.status(200).send('OK');
    return;
  }

  // Verify signature
  const signedMessage = `${messageId}.${timestamp}.${rawBody}`;
  const signatureBuffer = Buffer.from(signature, 'base64');
  const verifier = crypto.createVerify('SHA256');
  verifier.update(signedMessage);

  if (!verifier.verify(KICK_PUBLIC_KEY, signatureBuffer)) {
    res.status(401).send('Invalid signature');
    return;
  }

  processedIds.add(messageId);

  // Respond immediately
  res.status(200).send('OK');

  // Process async
  const payload = JSON.parse(rawBody);
  setImmediate(() => {
    // ANTI-LOOP: Skip events from our own bot
    if (eventType === 'chat.message.sent' && payload.sender?.user_id === BOT_USER_ID) {
      return;
    }

    // Handle event...
    console.log(`[${eventType}] ${messageId}`);
  });
});

app.listen(3000, () => console.log('Webhook server on port 3000'));
```

---

## Automatic Unsubscription

Kick implements two automatic unsubscription mechanisms:

1. **Continuous failure (24+ hours):** If your webhook endpoint fails to return a `2xx` response for any event for over 24 continuous hours, Kick automatically unsubscribes your app from that specific event. You must manually resubscribe.

2. **Webhook toggle disabled:** Disabling webhooks in your app settings (Developer tab) automatically removes all event subscriptions.

After auto-unsubscription, no notification is sent. Monitor your subscriptions periodically via `GET /public/v1/events/subscriptions`.

---

## Best Practices & Production Hardening

### Always Verify Signatures

- **Never process a webhook payload without verifying the signature first.**
- Verification is the only way to ensure the request came from Kick and was not tampered with.

### Idempotent Processing (Deduplication by `message_id`)

- Store processed `Kick-Event-Message-Id` values in a persistent store (Redis, database).
- The in-memory Set examples above are for illustration only; they don't survive restarts.
- Set a TTL on stored message IDs (e.g., 1 hour) to prevent unbounded growth.

### Replay Attack Prevention

- Validate `Kick-Event-Message-Timestamp` is within 5-10 minutes of current server time.
- Ensure your server clock is synchronized via NTP.

### Raw Body Preservation

- **Critical:** Parse the raw request body BEFORE JSON parsing for signature verification.
- Re-serializing parsed JSON may change whitespace, field order, or encoding, breaking verification.
- In Express.js, use `express.raw()` middleware; in other frameworks, capture the raw body similarly.

### HTTPS-Only Webhook URLs

- Always use HTTPS for webhook endpoints.
- For local development, use tunneling services (ngrok, Cloudflare Tunnel).

### Respond Quickly

- Return `200 OK` within 3 seconds.
- Queue events for async background processing to avoid timeouts.

### Secure Secret / Key Storage

- Cache the public key securely; do not hardcode it in version control for production.
- Fetch dynamically from the `/public/v1/public-key` endpoint and cache with a 24-hour TTL.
- Store your access tokens in environment variables or secrets managers.

### Logging Recommendations

- **Log:** `Kick-Event-Message-Id`, `Kick-Event-Type`, `Kick-Event-Message-Timestamp`, verification result, processing outcome
- **Never log:** `Kick-Event-Signature` values, raw payloads containing PII in production, access tokens

### Graceful Degradation

- If signature verification fails consistently, check if the public key has been rotated.
- Re-fetch the public key dynamically and retry verification before rejecting.

### Bot Anti-Loop Prevention

- When processing `chat.message.sent` events in a bot, always check `sender.user_id` against your bot's ID.
- Prevents infinite message loops where the bot triggers its own events.

---

## Known Issues & Community Notes

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#233](https://github.com/KickEngineering/KickDevDocs/issues/233) | Severe webhook delay | Closed (dup) | Events sometimes take minutes to arrive |
| [#228](https://github.com/KickEngineering/KickDevDocs/issues/228) | Not receiving webhook events | Closed | Ensure URL is publicly accessible |
| [#212](https://github.com/KickEngineering/KickDevDocs/issues/212) | Webhooks not working until bot created | Closed | Creating bot entity in app settings resolved it |
| [#208](https://github.com/KickEngineering/KickDevDocs/issues/208) | Webhook notifications for stream ending | Closed | Inconsistent delivery; fixed |
| [#172](https://github.com/KickEngineering/KickDevDocs/discussions/172) | Webhook request not triggering endpoint | Discussion | Subscription succeeds but no events delivered |

### Note on Signature Algorithm

The official docs show **RSA PKCS1v15** verification with SHA-256 (not RSA-PSS). The Go example in the docs uses `rsa.VerifyPKCS1v15()`. Ensure your implementation matches this algorithm exactly.

---

## Quick Reference Table

| Component | Value |
|-----------|-------|
| Signature Algorithm | RSA PKCS1v15 with SHA-256 |
| Signature Header | `Kick-Event-Signature` (Base64-encoded) |
| Message ID Header | `Kick-Event-Message-Id` (ULID) |
| Timestamp Header | `Kick-Event-Message-Timestamp` (RFC 3339) |
| Signed Message Format | `{message_id}.{timestamp}.{raw_body}` |
| Public Key Format | PEM (RSA 2048-bit) |
| Public Key Endpoint | `GET https://api.kick.com/public/v1/public-key` |
| Recommended Timestamp Tolerance | 5-10 minutes |
| Auto-Unsubscribe Threshold | 24 hours of continuous failure |
