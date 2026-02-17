---
title: "Kick OAuth 2.1 Flow"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# Kick OAuth 2.1 Flow

> **Source:** https://docs.kick.com/getting-started/generating-tokens-oauth2-flow
> **GitHub Raw:** https://github.com/KickEngineering/KickDevDocs/blob/main/getting-started/generating-tokens-oauth2-flow.md
> **Last verified:** 2026-02-13
> **OAuth Server:** `https://id.kick.com`
> **API Base URL:** `https://api.kick.com/public/v1`

## Overview

Kick uses OAuth 2.1 for authentication and authorization. There are two token types, each with its own flow:

- **App Access Token** -- Generated via Client Credentials flow. Used for server-to-server requests to access public data. No user login required.
- **User Access Token** -- Generated via Authorization Code Grant with PKCE. Provides access to user-specific data and allows acting on behalf of a user.

**Important:** The OAuth server (`id.kick.com`) is on a different host than the API server (`api.kick.com`).

---

## Prerequisites

1. Create a Kick account
2. Enable Two-Factor Authentication (2FA)
3. Navigate to Account Settings > Developer tab
4. Create an App to get your `client_id`, `client_secret`, and `redirect_uri`

See [Kick Apps Setup](https://docs.kick.com/getting-started/kick-apps-setup) for detailed instructions.

---

## Token Types Comparison

| Property | App Access Token | User Access Token |
|----------|-----------------|-------------------|
| Flow | Client Credentials | Authorization Code + PKCE |
| User login required | No | Yes |
| Data access | Public data only | User-specific data based on scopes |
| Can act on behalf of user | No | Yes |
| Has refresh token | No | Yes |
| Typical use case | Fetching public channel info, livestream data | Chat bots, moderation, reward management |

---

## Authorization Code Grant with PKCE (User Access Token)

### Step 1: Generate PKCE Code Verifier and Challenge

PKCE (Proof Key for Code Exchange) is **mandatory** for the Authorization Code flow. Use the `S256` method.

#### TypeScript

```typescript
import crypto from 'node:crypto';

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);
// Store codeVerifier securely -- you'll need it in Step 3
```

#### Python

```python
import base64
import hashlib
import os

def generate_code_verifier() -> str:
    return base64.urlsafe_b64encode(os.urandom(32)).rstrip(b"=").decode("ascii")

def generate_code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")

code_verifier = generate_code_verifier()
code_challenge = generate_code_challenge(code_verifier)
# Store code_verifier securely -- you'll need it in Step 3
```

### Step 2: Redirect User to Authorization Endpoint

#### `GET https://id.kick.com/oauth/authorize`

Direct the user's browser to Kick's authorization page where they log in and approve your application's access request.

#### Query Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `client_id` | Yes | string | Your application's client ID |
| `response_type` | Yes | string | Must be `code` |
| `redirect_uri` | Yes | URI | The URI to redirect users to after authorization. Must exactly match the URI registered in your app settings |
| `state` | Yes (currently) | string | A random string to prevent CSRF attacks. Verify this value when receiving the callback |
| `scope` | Yes | string | Space-separated list of requested scopes (e.g., `user:read channel:read chat:write`) |
| `code_challenge` | Yes | string | SHA-256 hash of the `code_verifier`, base64url-encoded |
| `code_challenge_method` | Yes | string | Must be `S256` |

#### Example Request URL

```
GET https://id.kick.com/oauth/authorize?
    response_type=code&
    client_id=YOUR_CLIENT_ID&
    redirect_uri=https://yourapp.com/callback&
    scope=user:read channel:read chat:write&
    code_challenge=YOUR_CODE_CHALLENGE&
    code_challenge_method=S256&
    state=RANDOM_STATE_VALUE
```

#### Successful Response

User is redirected to your `redirect_uri` with:

```
https://yourapp.com/callback?code=AUTHORIZATION_CODE&state=RANDOM_STATE_VALUE
```

#### Error Response (400)

```json
{
  "error": "Invalid request"
}
```

### Step 3: Exchange Authorization Code for Tokens

#### `POST https://id.kick.com/oauth/token`

Exchange the authorization code for an access token and refresh token.

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Content-Type` | Yes | string | `application/x-www-form-urlencoded` |

#### Body Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `code` | Yes | string | The authorization code received in the callback |
| `client_id` | Yes | string | Your application's client ID |
| `client_secret` | Yes | string | Your application's client secret |
| `redirect_uri` | Yes | string | Must match the redirect URI used in Step 2 |
| `grant_type` | Yes | string | Must be `authorization_code` |
| `code_verifier` | Yes | string | The original code verifier from Step 1 (NOT the challenge) |

#### Example Request

```bash
curl -X POST https://id.kick.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "redirect_uri=${REDIRECT_URI}" \
  -d "code_verifier=${CODE_VERIFIER}" \
  -d "code=${AUTHORIZATION_CODE}"
```

#### Response (200 OK)

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "expires_in": 14400,
  "scope": "user:read channel:read chat:write"
}
```

#### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `access_token` | string | The access token for API requests |
| `token_type` | string | Token type (`"Bearer"`) |
| `refresh_token` | string | Token to refresh the access token when it expires |
| `expires_in` | number | Token lifetime in seconds [VERIFY exact default, likely 14400 = 4 hours] |
| `scope` | string | Space-separated list of granted scopes |

#### Error Response (400)

```json
{
  "error": "Invalid request"
}
```

---

## Client Credentials Flow (App Access Token)

### `POST https://id.kick.com/oauth/token`

Generate an App Access Token for server-to-server API access to public data.

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Content-Type` | Yes | string | `application/x-www-form-urlencoded` |

#### Body Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `client_id` | Yes | string | Your application's client ID |
| `client_secret` | Yes | string | Your application's client secret |
| `grant_type` | Yes | string | Must be `client_credentials` |

#### Example Request

```bash
curl -X POST https://id.kick.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}"
```

#### Response (200 OK)

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 14400
}
```

#### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `access_token` | string | The app access token |
| `token_type` | string | Token type (`"Bearer"`) |
| `expires_in` | number | Token lifetime in seconds |

> **Note:** App Access Tokens do NOT include a `refresh_token` or `scope` field. When expired, simply request a new one.

---

## Token Refresh Flow

### `POST https://id.kick.com/oauth/token`

Refresh an expired User Access Token. This returns new access and refresh tokens.

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Content-Type` | Yes | string | `application/x-www-form-urlencoded` |

#### Body Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `refresh_token` | Yes | string | The refresh token from the original or previous token response |
| `client_id` | Yes | string | Your application's client ID |
| `client_secret` | Yes | string | Your application's client secret |
| `grant_type` | Yes | string | Must be `refresh_token` |

#### Example Request

```bash
curl -X POST https://id.kick.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "refresh_token=${REFRESH_TOKEN}"
```

#### Response (200 OK)

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "refresh_token": "new_refresh_token...",
  "expires_in": 14400,
  "scope": "user:read channel:read chat:write"
}
```

> **Important:** The refresh token is **rotated** on each use -- the old refresh token becomes invalid and a new one is returned. Always store the latest refresh token.

---

## Token Revocation Flow

### `POST https://id.kick.com/oauth/revoke`

Revoke an access token or refresh token. Use this when a user disconnects your app.

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Content-Type` | Yes | string | `application/x-www-form-urlencoded` |

#### Query Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `token` | Yes | string | The token to be revoked |
| `token_hint_type` | No | string | Hint about the token type: `access_token` or `refresh_token` |

#### Example Request

```bash
curl -X POST "https://id.kick.com/oauth/revoke?token=${TOKEN}&token_hint_type=access_token" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

#### Response (200 OK)

```
OK
```

#### Error Response (400)

```json
{
  "error": "Invalid request"
}
```

---

## Token Introspection

### `POST https://id.kick.com/oauth/token/introspect`

Check if an access token is valid and retrieve metadata about it.

> **Note:** As of 15/01/2026, the token introspect endpoint was moved from `/public/v1/token/introspect` to `/oauth/token/introspect` on `id.kick.com`. The old path on the API server is deprecated.

#### Headers

| Header | Required | Type | Value |
|--------|----------|------|-------|
| `Authorization` | Yes | string | `Bearer <access_token>` |

#### Example Request

```bash
curl -X POST https://id.kick.com/oauth/token/introspect \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

#### Response (200 OK)

```json
{
  "data": {
    "active": true,
    "client_id": "your_client_id",
    "token_type": "user",
    "scope": "user:read channel:read",
    "exp": 1771046347
  },
  "message": "OK"
}
```

#### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `data.active` | boolean | Whether the token is currently valid |
| `data.client_id` | string | The client ID the token was issued for |
| `data.token_type` | string | `"user"` for User Access Tokens, `"app"` for App Access Tokens |
| `data.scope` | string | Space-separated list of scopes granted to the token |
| `data.exp` | number | Unix timestamp when the token expires |

---

## Known Bug: 127.0.0.1 Redirect URI (NextJS Workaround)

### The Problem

Kick's frontend uses NextJS, which has a bug ([vercel/next.js#79182](https://github.com/vercel/next.js/issues/79182)) that rewrites the first occurrence of `127.0.0.1` in a URL to `localhost`. Since the `redirect_uri` must match your app settings exactly, this rewrite causes authorization to fail if your callback uses `127.0.0.1`.

### Recommended Solution

Use `localhost` instead of `127.0.0.1` in your redirect URI:
```
http://localhost/auth/callback
```

### Workaround (If You Cannot Change to localhost)

Add a **sacrificial query parameter** containing `127.0.0.1` **before** the `redirect_uri` parameter. NextJS will rewrite the decoy parameter and leave `redirect_uri` untouched.

```
GET https://id.kick.com/oauth/authorize?
    response_type=code&
    client_id=YOUR_CLIENT_ID&
    redirect=127.0.0.1&
    redirect_uri=http://127.0.0.1/callback&
    scope=user:read&
    code_challenge=YOUR_CODE_CHALLENGE&
    code_challenge_method=S256&
    state=RANDOM_STATE
```

The `redirect=127.0.0.1` parameter is sacrificed (NextJS converts it to `localhost`) while `redirect_uri` is preserved.

---

## Complete OAuth Flow: TypeScript Example

```typescript
import crypto from 'node:crypto';
import http from 'node:http';

// Configuration -- load from environment variables
const CLIENT_ID = process.env.KICK_CLIENT_ID!;
const CLIENT_SECRET = process.env.KICK_CLIENT_SECRET!;
const REDIRECT_URI = process.env.KICK_REDIRECT_URI!;
const SCOPES = 'user:read channel:read chat:write events:subscribe';

// Step 1: Generate PKCE values
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

// Step 2: Build authorization URL
function buildAuthUrl(codeChallenge: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });
  return `https://id.kick.com/oauth/authorize?${params.toString()}`;
}

// Step 3: Exchange code for tokens
async function exchangeCode(code: string, codeVerifier: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
    code,
  });

  const response = await fetch('https://id.kick.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

// Step 4: Refresh tokens
async function refreshTokens(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const response = await fetch('https://id.kick.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

// Step 5: Revoke token
async function revokeToken(token: string, tokenType?: string) {
  const params = new URLSearchParams({ token });
  if (tokenType) params.set('token_hint_type', tokenType);

  const response = await fetch(
    `https://id.kick.com/oauth/revoke?${params.toString()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  );

  if (!response.ok) {
    throw new Error(`Token revocation failed: ${response.status}`);
  }
}

// App Access Token (Client Credentials)
async function getAppAccessToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const response = await fetch('https://id.kick.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`App token request failed: ${response.status}`);
  }

  return response.json();
}

// Example: Local OAuth server
async function startOAuthFlow() {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  console.log('Open this URL in your browser:');
  console.log(buildAuthUrl(challenge, state));

  // Start local server to handle callback
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, `http://localhost`);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');

    if (returnedState !== state) {
      res.writeHead(400);
      res.end('State mismatch -- possible CSRF attack');
      return;
    }

    if (code) {
      try {
        const tokens = await exchangeCode(code, verifier);
        console.log('Access Token:', tokens.access_token);
        console.log('Refresh Token:', tokens.refresh_token);
        console.log('Expires In:', tokens.expires_in, 'seconds');
        res.writeHead(200);
        res.end('Authorization successful! You can close this tab.');
      } catch (error) {
        console.error('Token exchange error:', error);
        res.writeHead(500);
        res.end('Token exchange failed');
      }
    }

    server.close();
  });

  server.listen(3000);
}
```

## Complete OAuth Flow: Python Example

```python
import base64
import hashlib
import os
import secrets
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlencode, urlparse, parse_qs

import requests

# Configuration -- load from environment variables
CLIENT_ID = os.environ["KICK_CLIENT_ID"]
CLIENT_SECRET = os.environ["KICK_CLIENT_SECRET"]
REDIRECT_URI = os.environ["KICK_REDIRECT_URI"]
SCOPES = "user:read channel:read chat:write events:subscribe"


def generate_pkce():
    """Generate PKCE code verifier and challenge (S256)."""
    verifier = base64.urlsafe_b64encode(os.urandom(32)).rstrip(b"=").decode("ascii")
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return verifier, challenge


def build_auth_url(code_challenge: str, state: str) -> str:
    """Build the authorization URL."""
    params = urlencode({
        "response_type": "code",
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "state": state,
    })
    return f"https://id.kick.com/oauth/authorize?{params}"


def exchange_code(code: str, code_verifier: str) -> dict:
    """Exchange authorization code for tokens."""
    response = requests.post(
        "https://id.kick.com/oauth/token",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "grant_type": "authorization_code",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
            "code_verifier": code_verifier,
            "code": code,
        },
    )
    response.raise_for_status()
    return response.json()


def refresh_tokens(refresh_token: str) -> dict:
    """Refresh access token using refresh token."""
    response = requests.post(
        "https://id.kick.com/oauth/token",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "grant_type": "refresh_token",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "refresh_token": refresh_token,
        },
    )
    response.raise_for_status()
    return response.json()


def get_app_access_token() -> dict:
    """Get an App Access Token via Client Credentials flow."""
    response = requests.post(
        "https://id.kick.com/oauth/token",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "grant_type": "client_credentials",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        },
    )
    response.raise_for_status()
    return response.json()


def revoke_token(token: str, token_type: str = None) -> None:
    """Revoke an access or refresh token."""
    params = {"token": token}
    if token_type:
        params["token_hint_type"] = token_type
    response = requests.post(
        "https://id.kick.com/oauth/revoke",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        params=params,
    )
    response.raise_for_status()


def introspect_token(access_token: str) -> dict:
    """Check token validity and metadata."""
    response = requests.post(
        "https://id.kick.com/oauth/token/introspect",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    response.raise_for_status()
    return response.json()
```

---

## Token Lifetimes

| Token Type | Lifetime | Refresh |
|------------|----------|---------|
| Access Token (User) | ~4 hours (14400 seconds) [VERIFY] | Use refresh token |
| Access Token (App) | ~4 hours (14400 seconds) [VERIFY] | Request new token |
| Refresh Token | Long-lived [VERIFY exact duration] | Rotated on each use |

---

## Best Practices & Production Hardening

### PKCE Is Mandatory

- Always use PKCE with the `S256` method for authorization code grants.
- The `code_verifier` must be stored securely between the authorization request and the token exchange.

### State Parameter for CSRF Protection

- Always generate a random `state` value and verify it in the callback.
- Use cryptographically random values (e.g., `crypto.randomBytes(16).toString('hex')`).

### Secure Secret Storage

- **Never hardcode** `client_secret` in source code, frontend code, or mobile apps.
- Use environment variables or a secrets manager.
- `client_secret` should only be used in server-side code.

### Token Refresh Lifecycle Management

- Refresh tokens **before** they expire (e.g., at 75% of `expires_in`).
- Handle token refresh failures gracefully -- the user may need to re-authorize.
- Refresh tokens are **rotated** -- always store the latest refresh token.
- If a refresh token is used twice (possible race condition), the second use will fail.

### Token Revocation

- Revoke tokens when users disconnect your app or when you no longer need access.
- Revoking a refresh token should also invalidate associated access tokens.

### Handling Revoked Tokens

- When API requests return `401`, attempt a token refresh.
- If refresh fails, redirect the user to re-authorize.

### Logging Recommendations

- Log token exchange success/failure, token type, and scope.
- **Never log** access tokens, refresh tokens, client secrets, or authorization codes.

### Mobile App Considerations

- See [GitHub Issue #334](https://github.com/KickEngineering/KickDevDocs/issues/334): Kick mobile app intercepts OAuth URLs via Universal Links, breaking browser-based OAuth.
- See [GitHub Discussion #36](https://github.com/KickEngineering/KickDevDocs/discussions/36): Storing client secrets in mobile apps is insecure; use a backend proxy.

---

## Known Issues & Community Notes

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#334](https://github.com/KickEngineering/KickDevDocs/issues/334) | OAuth broken on mobile -- Universal Links intercept | Open | Kick app hijacks OAuth URLs on mobile |
| [#319](https://github.com/KickEngineering/KickDevDocs/issues/319) | OAuth redirect freezes Kick mobile app | Closed | App freezes on logo screen during OAuth |
| [#211](https://github.com/KickEngineering/KickDevDocs/issues/211) | OAuth internally mutates 127.0.0.1 to localhost | Closed | Documented as NextJS bug with workaround |
| [#232](https://github.com/KickEngineering/KickDevDocs/issues/232) | OAuth flow down for 12+ hours | Closed | Server returned 500 errors; resolved |
| [#114](https://github.com/KickEngineering/KickDevDocs/issues/114) | id.kick.com returns 404 | Closed | Authorization endpoint was temporarily down |
| [#113](https://github.com/KickEngineering/KickDevDocs/issues/113) | OAuth internal server error 500 | Closed | PKCE flow returned 500; resolved |
| [#83](https://github.com/KickEngineering/KickDevDocs/discussions/83) | ULID bad data size during PKCE flow | Discussion | Token endpoint returns ULID unmarshal error |
| [#49](https://github.com/KickEngineering/KickDevDocs/discussions/49) | OAuth 404 error on authorization | Discussion | Authorization returns 404 |
| [#59](https://github.com/KickEngineering/KickDevDocs/discussions/59) | OAuth redirecting to homepage | Discussion | OAuth redirects to Kick homepage instead of callback |
| [#327](https://github.com/KickEngineering/KickDevDocs/issues/327) | Bot token not working | Closed | Unable to get bot token; homepage redirect |
| [#318](https://github.com/KickEngineering/KickDevDocs/discussions/318) | id.kick.com authorize freezes mobile | Discussion | Mobile app intercepts URL and freezes |
| [#120](https://github.com/KickEngineering/KickDevDocs/issues/120) | Python docs use data= instead of correct format | Closed | Use `data=` for form-encoded body, not `json=` |
| Changelog 15/01/2026 | Token introspect moved to /oauth path | Released | Old path deprecated |

### Common Troubleshooting

1. **404 on /oauth/authorize:** Ensure you're using `id.kick.com` not `api.kick.com`
2. **Redirect to homepage:** Verify `redirect_uri` exactly matches your app settings (including trailing slashes)
3. **127.0.0.1 fails:** Use the sacrificial parameter workaround or switch to `localhost`
4. **500 on token exchange:** Verify `code_verifier` matches the `code_challenge` sent in Step 2
5. **Mobile OAuth broken:** Kick mobile app intercepts URLs; no known workaround yet

---

## Quick Reference Table

| Method | URL | Flow | Description |
|--------|-----|------|-------------|
| `GET` | `https://id.kick.com/oauth/authorize` | Auth Code + PKCE | Redirect user for authorization |
| `POST` | `https://id.kick.com/oauth/token` | Auth Code + PKCE | Exchange code for tokens |
| `POST` | `https://id.kick.com/oauth/token` | Client Credentials | Get app access token |
| `POST` | `https://id.kick.com/oauth/token` | Refresh | Refresh user access token |
| `POST` | `https://id.kick.com/oauth/revoke` | Revocation | Revoke a token |
| `POST` | `https://id.kick.com/oauth/token/introspect` | Introspection | Check token validity |
