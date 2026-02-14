# Kick Public Key API

> **Source:** https://docs.kick.com/apis/public-key
> **GitHub Raw:** https://github.com/KickEngineering/KickDevDocs/blob/main/apis/public-key.md
> **Last verified:** 2026-02-13
> **API Base URL:** `https://api.kick.com/public/v1`

## Overview

The Public Key API provides access to Kick's RSA public key used for webhook signature verification. When Kick sends webhook events to your endpoint, each request includes a `Kick-Event-Signature` header containing an RSA-PKCS1v15-SHA256 signature. You use this public key to verify that signatures are authentic, ensuring webhooks genuinely came from Kick's servers.

---

## Authentication

| Endpoint | Token Type | Required Scope |
|----------|-----------|----------------|
| `GET /public/v1/public-key` | None required [VERIFY] | None |

> **Note:** This endpoint may be publicly accessible without authentication, since the public key is meant to be distributed. The official docs and webhook security page reference it without specifying auth requirements. [VERIFY exact auth requirements against live API]

---

## Endpoint

### GET /public/v1/public-key

Retrieve Kick's RSA public key in PEM format.

#### HTTP Request

```
GET https://api.kick.com/public/v1/public-key
```

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Possibly [VERIFY] | string | `Bearer <access_token>` |

#### Example Request

```bash
curl -X GET https://api.kick.com/public/v1/public-key
```

#### Response (200 OK)

```json
{
  "data": {
    "key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq/+l1WnlRrGSolDMA+A8\n6rAhMbQGmQ2SapVcGM3zq8ANXjnhDWocMqfWcTd95btDydITa10kDvHzw9WQOqp2\nMZI7ZyrfzJuz5nhTPCiJwTwnEtWft7nV14BYRDHvlfqPUaZ+1KR4OCaO/wWIk/rQ\nL/TjY0M70gse8rlBkbo2a8rKhu69RQTRsoaf4DVhDPEeSeI5jVrRDGAMGL3cGuyY\n6CLKGdjVEM78g3JfYOvDU/RvfqD7L89TZ3iN94jrmWdGz34JNlEI5hqK8dd7C5EF\nBEbZ5jgB8s8ReQV8H+MkuffjdAj3ajDDX3DOJMIut1lBrUVD1AaSrGCKHooWoL2e\ntwIDAQAB\n-----END PUBLIC KEY-----"
  },
  "message": "OK"
}
```

#### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `data` | object | Response data wrapper |
| `data.key` | string | RSA public key in PEM format (with `\n` newlines) |
| `message` | string | Status message (`"OK"`) |

> **Note:** The exact response wrapper structure may vary. The webhook security documentation embeds the PEM key directly and also references this endpoint. [VERIFY exact response format against live API]

---

## Key Details

| Property | Value |
|----------|-------|
| Algorithm | RSA |
| Key Size | 2048-bit |
| Format | PEM (PKIX/X.509 SubjectPublicKeyInfo) |
| Block Type | `PUBLIC KEY` |
| Signature Algorithm | PKCS1v15 with SHA-256 |
| Usage | Webhook signature verification, Drops webhook verification |

### Current Public Key

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

---

## Integration with Webhook Security

This public key is used to verify the `Kick-Event-Signature` header on every webhook delivery:

1. **Construct signed message:** `{Kick-Event-Message-Id}.{Kick-Event-Message-Timestamp}.{raw_body}`
2. **Base64-decode** the `Kick-Event-Signature` header
3. **SHA-256 hash** the signed message
4. **Verify** using RSA PKCS1v15 with this public key

For full verification details and code examples, see [kick-webhook-security.md](./kick-webhook-security.md).

### Integration with Drops

The Drops system also uses this public key for verifying webhook payloads sent to organizations when rewards are claimed. See the [Drops Guide](https://docs.kick.com/drops/drops-guide).

---

## Key Rotation Strategy

Kick may rotate the public key periodically for security. To handle rotation:

### Caching Recommendations

| Strategy | Pros | Cons |
|----------|------|------|
| Embed statically | Fast, no network dependency | Requires code update on rotation |
| Fetch on startup + cache | Picks up rotations on restart | Stale during long-running processes |
| **Fetch + TTL cache (recommended)** | Balances freshness and performance | Slight complexity |
| Fetch on every request | Always fresh | Slow, adds latency to every webhook |

**Recommended approach:** Fetch the key on startup and cache it with a 24-hour TTL. On verification failure, re-fetch the key once and retry verification before rejecting the webhook.

---

## Code Examples

### TypeScript: Fetching and Caching the Public Key

```typescript
import crypto from 'node:crypto';

const PUBLIC_KEY_URL = 'https://api.kick.com/public/v1/public-key';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let cachedKey: string | null = null;
let cacheExpiresAt = 0;

async function getKickPublicKey(): Promise<string> {
  const now = Date.now();

  if (cachedKey && now < cacheExpiresAt) {
    return cachedKey;
  }

  const response = await fetch(PUBLIC_KEY_URL);
  if (!response.ok) {
    // If fetch fails and we have a cached key, use it (stale is better than none)
    if (cachedKey) {
      console.warn('Failed to refresh public key, using cached version');
      return cachedKey;
    }
    throw new Error(`Failed to fetch public key: ${response.status}`);
  }

  const body = await response.json();
  cachedKey = body.data.key;
  cacheExpiresAt = now + CACHE_TTL_MS;

  return cachedKey!;
}

async function verifyWebhookSignature(
  messageId: string,
  timestamp: string,
  rawBody: string,
  signatureB64: string,
): Promise<boolean> {
  const publicKeyPem = await getKickPublicKey();
  const signedMessage = `${messageId}.${timestamp}.${rawBody}`;
  const signatureBuffer = Buffer.from(signatureB64, 'base64');

  const verifier = crypto.createVerify('SHA256');
  verifier.update(signedMessage);

  const isValid = verifier.verify(publicKeyPem, signatureBuffer);

  // If verification fails, try refreshing the key (it might have rotated)
  if (!isValid) {
    cachedKey = null; // Force refresh
    const freshKey = await getKickPublicKey();
    const retryVerifier = crypto.createVerify('SHA256');
    retryVerifier.update(signedMessage);
    return retryVerifier.verify(freshKey, signatureBuffer);
  }

  return isValid;
}
```

### Python: Fetching and Caching the Public Key

```python
import base64
import hashlib
import time
from typing import Optional

import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.asymmetric.utils import Prehashed

PUBLIC_KEY_URL = "https://api.kick.com/public/v1/public-key"
CACHE_TTL_SECONDS = 86400  # 24 hours

_cached_key: Optional[str] = None
_cache_expires_at: float = 0


def get_kick_public_key() -> str:
    """Fetch and cache Kick's public key with TTL."""
    global _cached_key, _cache_expires_at

    now = time.time()
    if _cached_key and now < _cache_expires_at:
        return _cached_key

    try:
        response = requests.get(PUBLIC_KEY_URL, timeout=10)
        response.raise_for_status()
        _cached_key = response.json()["data"]["key"]
        _cache_expires_at = now + CACHE_TTL_SECONDS
        return _cached_key
    except Exception:
        if _cached_key:
            # Stale cache is better than no key
            return _cached_key
        raise


def verify_webhook_signature(
    message_id: str,
    timestamp: str,
    raw_body: str,
    signature_b64: str,
) -> bool:
    """Verify a Kick webhook signature with automatic key refresh on failure."""
    global _cached_key

    def _verify(pem_key: str) -> bool:
        public_key = serialization.load_pem_public_key(pem_key.encode("utf-8"))
        signed_message = f"{message_id}.{timestamp}.{raw_body}".encode("utf-8")
        signature_bytes = base64.b64decode(signature_b64)
        message_hash = hashlib.sha256(signed_message).digest()

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

    # Try with cached key
    pem_key = get_kick_public_key()
    if _verify(pem_key):
        return True

    # Key might have rotated -- force refresh and retry
    _cached_key = None
    fresh_key = get_kick_public_key()
    return _verify(fresh_key)
```

---

## Best Practices & Production Hardening

### Cache the Public Key

- Do NOT fetch the public key on every webhook request -- it adds latency and unnecessary load.
- Cache with a 24-hour TTL and re-fetch on verification failure.

### Handle Key Rotation Gracefully

- If signature verification fails, re-fetch the public key once and retry.
- If verification still fails after key refresh, reject the webhook (it's likely tampered).
- Log key refresh events for monitoring.

### Fallback Key

- Consider embedding the current public key as a fallback in case the API endpoint is temporarily unavailable.
- This ensures webhook processing continues even during API outages.

### HTTPS Only

- Always fetch the public key over HTTPS to prevent man-in-the-middle attacks.

### Secure Key Storage

- Cache the key in memory (not on disk) for short-lived processes.
- For long-running processes, use in-memory cache with TTL.
- Do not store the key in environment variables (it's public, but fetching ensures you get the latest version).

### Idempotent Webhook Processing

- The public key is used for signature verification, which is part of webhook processing.
- Always combine signature verification with `Kick-Event-Message-Id` deduplication.

### Logging Recommendations

- Log key fetch events (success/failure, timestamp).
- Log signature verification results (valid/invalid, event type, message ID).
- Never log the signature value itself.

---

## Known Issues & Community Notes

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| No issues | - | - | The public key endpoint appears to be stable with no community-reported issues |

### Relationship to Other Docs

- **Webhook Security:** [kick-webhook-security.md](./kick-webhook-security.md) -- full signature verification process
- **Drops Guide:** Drops webhook payloads also use this public key for verification
- **Events Introduction:** References the public key for payload verification

### Key Format Notes

- The key is in PEM format with `-----BEGIN PUBLIC KEY-----` / `-----END PUBLIC KEY-----` delimiters.
- The key type is PKIX (X.509 SubjectPublicKeyInfo).
- When fetched from the API, newlines may be represented as `\n` characters in the JSON string.
- When parsing, ensure your PEM parser handles both literal newlines and `\n` escape sequences.

---

## Quick Reference Table

| Method | Path | Auth | Scope | Description |
|--------|------|------|-------|-------------|
| `GET` | `/public/v1/public-key` | None [VERIFY] | None | Retrieve RSA public key for signature verification |
