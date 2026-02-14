# Twitch API — Authentication & OAuth 2.0

> **Source:** [Twitch Authentication Guide](https://dev.twitch.tv/docs/authentication/), [Getting Tokens: OIDC](https://dev.twitch.tv/docs/authentication/getting-tokens-oidc/), [Registering Your App](https://dev.twitch.tv/docs/authentication/register-app/), [Validating Requests](https://dev.twitch.tv/docs/authentication/validate-tokens/), [Refreshing Tokens](https://dev.twitch.tv/docs/authentication/refresh-tokens/), [Revoking Tokens](https://dev.twitch.tv/docs/authentication/revoke-tokens/)
> **Last verified:** 2025-05-01 — [PAGE INACCESSIBLE - VERIFY AGAINST LIVE DOCS]
> **API Base URL:** `https://api.twitch.tv/helix`
> **Auth Base URL:** `https://id.twitch.tv`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authorization Code Grant Flow](#2-authorization-code-grant-flow)
3. [Client Credentials Grant Flow](#3-client-credentials-grant-flow)
4. [OIDC Implicit Grant Flow](#4-oidc-implicit-grant-flow)
5. [Device Code Grant Flow](#5-device-code-grant-flow)
6. [Token Refresh Flow](#6-token-refresh-flow)
7. [Token Validation](#7-token-validation)
8. [Token Revocation](#8-token-revocation)
9. [Token Types Comparison](#9-token-types-comparison)
10. [Token Lifetimes](#10-token-lifetimes)
11. [App Registration Process](#11-app-registration-process)
12. [Best Practices](#12-best-practices)
13. [Known Issues & Community Quirks](#13-known-issues--community-quirks)
14. [Quick Reference Table](#14-quick-reference-table)

---

## 1. Overview

Twitch uses OAuth 2.0 for authentication and authorization. Every request to the Helix API requires either an **App Access Token** or a **User Access Token**, depending on the endpoint. Tokens are obtained from the Twitch identity server at `https://id.twitch.tv`.

### Two Token Types

| Token Type | Represents | Obtained Via | Has Scopes | Can Refresh |
|---|---|---|---|---|
| **App Access Token** | Your application | Client Credentials Grant | No (server-to-server) | No (request a new one) |
| **User Access Token** | A specific Twitch user | Authorization Code Grant, OIDC Implicit, Device Code Grant | Yes | Yes (Auth Code Grant only) |

### Four OAuth Flows

| Flow | Use Case | Token Type | Refresh? |
|---|---|---|---|
| **Authorization Code Grant** | Server-side apps with a backend | User Access Token | Yes |
| **Client Credentials Grant** | Server-to-server (no user context) | App Access Token | No |
| **OIDC Implicit Grant** | Client-side/SPA apps (legacy) | User Access Token + ID Token | No |
| **Device Code Grant** | Public clients, CLI tools, TV apps | User Access Token | Yes |

### Authentication Headers

All Helix API requests require two headers:

```
Authorization: Bearer <access_token>
Client-Id: <your_client_id>
```

> **Important:** Token validation uses `Authorization: OAuth <token>`, NOT `Authorization: Bearer <token>`.

---

## 2. Authorization Code Grant Flow

The Authorization Code Grant Flow is the most common flow for server-side applications. It provides both an access token and a refresh token, allowing long-lived sessions.

### Step 1: Redirect User to Twitch Authorization

Direct the user's browser to the Twitch authorization endpoint.

#### Endpoint: GET `https://id.twitch.tv/oauth2/authorize`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `client_id` | string | Yes | Your app's registered Client ID |
| `force_verify` | boolean | No | Set to `true` to force the user to re-authorize even if they previously approved your app. Default: `false` |
| `redirect_uri` | string | Yes | Your registered redirect URI. Must exactly match one of the URIs registered in the Twitch Developer Console |
| `response_type` | string | Yes | Must be `code` for Authorization Code Grant |
| `scope` | string | Yes | Space-separated list of scopes. See [Scopes documentation](https://dev.twitch.tv/docs/authentication/scopes/) |
| `state` | string | Recommended | An opaque value used to prevent CSRF attacks. Twitch returns this value unchanged in the redirect |

#### Example Authorization URL

```
https://id.twitch.tv/oauth2/authorize
  ?client_id=hof5gwx0su6owfn0nyan9c87zr6t
  &redirect_uri=http://localhost:3000/auth/callback
  &response_type=code
  &scope=user:read:email channel:read:subscriptions
  &state=c3ab8aa609ea11e793ae92361f002671
  &force_verify=true
```

#### Authorization Response

On user approval, Twitch redirects the user to your `redirect_uri` with query parameters:

```
https://localhost:3000/auth/callback
  ?code=gulfodq396mtznse861986ghg5ss1p
  &scope=user%3Aread%3Aemail+channel%3Aread%3Asubscriptions
  &state=c3ab8aa609ea11e793ae92361f002671
```

On user denial or error:

```
https://localhost:3000/auth/callback
  ?error=access_denied
  &error_description=The+user+denied+you+access
  &state=c3ab8aa609ea11e793ae92361f002671
```

### Step 2: Exchange Authorization Code for Tokens

#### Endpoint: POST `https://id.twitch.tv/oauth2/token`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `client_id` | string | Yes | Your app's Client ID |
| `client_secret` | string | Yes | Your app's Client Secret |
| `code` | string | Yes | The authorization code received from Step 1 |
| `grant_type` | string | Yes | Must be `authorization_code` |
| `redirect_uri` | string | Yes | Must match the `redirect_uri` used in Step 1 |

#### cURL Example

```bash
curl -X POST 'https://id.twitch.tv/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=hof5gwx0su6owfn0nyan9c87zr6t' \
  -d 'client_secret=41vpdji4e9gif29md0ouet6fktd2' \
  -d 'code=gulfodq396mtznse861986ghg5ss1p' \
  -d 'grant_type=authorization_code' \
  -d 'redirect_uri=http://localhost:3000/auth/callback'
```

#### Success Response (200 OK)

```json
{
  "access_token": "rfx2uswqe8l4g1mkagrvg5tv0cs3",
  "expires_in": 14346,
  "refresh_token": "5b93chm6hdve3mycz05zfzatkfdenfswo1mhs3z066ch23offr",
  "scope": ["user:read:email", "channel:read:subscriptions"],
  "token_type": "bearer"
}
```

#### Response Schema

| Field | Type | Description |
|---|---|---|
| `access_token` | string | The user access token |
| `expires_in` | integer | Number of seconds until the token expires |
| `refresh_token` | string | Token used to refresh the access token |
| `scope` | string[] | Array of scopes granted |
| `token_type` | string | Always `"bearer"` |

---

## 3. Client Credentials Grant Flow

Use this flow when your application needs to call API endpoints that don't require user authorization (e.g., getting game information, searching channels). This produces an **App Access Token**.

### Step 1: Request an App Access Token

#### Endpoint: POST `https://id.twitch.tv/oauth2/token`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `client_id` | string | Yes | Your app's Client ID |
| `client_secret` | string | Yes | Your app's Client Secret |
| `grant_type` | string | Yes | Must be `client_credentials` |

#### cURL Example

```bash
curl -X POST 'https://id.twitch.tv/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=hof5gwx0su6owfn0nyan9c87zr6t' \
  -d 'client_secret=41vpdji4e9gif29md0ouet6fktd2' \
  -d 'grant_type=client_credentials'
```

#### Success Response (200 OK)

```json
{
  "access_token": "jostpf5q0uzmxmkba9iyug38kjtgh",
  "expires_in": 5089418,
  "token_type": "bearer"
}
```

#### Response Schema

| Field | Type | Description |
|---|---|---|
| `access_token` | string | The app access token |
| `expires_in` | integer | Number of seconds until the token expires (typically ~60 days) |
| `token_type` | string | Always `"bearer"` |

> **Note:** App Access Tokens do NOT include a `refresh_token`. When the token expires, simply request a new one using the same Client Credentials flow.

> **Note:** App Access Tokens do NOT have scopes. They can only be used for endpoints that do not require user authorization.

---

## 4. OIDC Implicit Grant Flow

The OIDC (OpenID Connect) Implicit Grant Flow is designed for client-side applications (SPAs, browser extensions) where the client secret cannot be kept secure. It returns tokens directly in the URL fragment.

> **Note:** Twitch does NOT support PKCE (Proof Key for Code Exchange). For public clients that need refresh tokens, use the [Device Code Grant Flow](#5-device-code-grant-flow) instead.

### Step 1: Redirect User to Twitch Authorization

#### Endpoint: GET `https://id.twitch.tv/oauth2/authorize`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `client_id` | string | Yes | Your app's Client ID |
| `force_verify` | boolean | No | Set to `true` to force re-authorization. Default: `false` |
| `redirect_uri` | string | Yes | Your registered redirect URI |
| `response_type` | string | Yes | Must be `token` for access token only, `token id_token` for access token + ID token, or `id_token` for ID token only |
| `scope` | string | Yes | Space-separated list of scopes. Must include `openid` to receive an ID token. Additional OIDC claims available via extra scopes |
| `state` | string | Recommended | Opaque CSRF prevention value |
| `nonce` | string | Conditional | Required when requesting an `id_token`. Used to mitigate replay attacks. The value is passed through unmodified in the ID token's `nonce` claim |
| `claims` | string (JSON) | No | JSON object specifying requested OIDC claims. Example: `{"id_token":{"email":null,"email_verified":null}}` |

#### OIDC Scopes for Claims

| Scope | Claims Included |
|---|---|
| `openid` | Required for OIDC. Returns `sub` (Twitch user ID) in ID token |
| `user:read:email` | Adds `email` and `email_verified` claims |

#### Example Authorization URL (Token + ID Token)

```
https://id.twitch.tv/oauth2/authorize
  ?client_id=hof5gwx0su6owfn0nyan9c87zr6t
  &redirect_uri=http://localhost:3000
  &response_type=token%20id_token
  &scope=openid%20user:read:email
  &state=c3ab8aa609ea11e793ae92361f002671
  &nonce=a1b2c3d4e5f6
  &claims={"id_token":{"email":null,"email_verified":null}}
```

### Step 2: Extract Tokens from URL Fragment

On approval, Twitch redirects with tokens in the URL fragment (after `#`):

```
https://localhost:3000/
  #access_token=rfx2uswqe8l4g1mkagrvg5tv0cs3
  &id_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
  &scope=openid+user%3Aread%3Aemail
  &state=c3ab8aa609ea11e793ae92361f002671
  &token_type=bearer
```

> **Important:** Fragment data (after `#`) is NOT sent to the server. It must be parsed client-side with JavaScript.

### ID Token (JWT) Structure

The ID token is a signed JWT with three parts: header, payload, and signature.

#### JWT Header

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "1"
}
```

#### JWT Payload (Claims)

```json
{
  "aud": "hof5gwx0su6owfn0nyan9c87zr6t",
  "azp": "hof5gwx0su6owfn0nyan9c87zr6t",
  "exp": 1684876800,
  "iat": 1684790400,
  "iss": "https://id.twitch.tv/oauth2",
  "sub": "12345678",
  "nonce": "a1b2c3d4e5f6",
  "email": "user@example.com",
  "email_verified": true,
  "preferred_username": "twitchuser"
}
```

#### JWT Claims Reference

| Claim | Type | Description |
|---|---|---|
| `aud` | string | Client ID of your application (audience) |
| `azp` | string | Client ID of the authorized party |
| `exp` | integer | Token expiration time (Unix timestamp) |
| `iat` | integer | Token issued-at time (Unix timestamp) |
| `iss` | string | Issuer. Always `https://id.twitch.tv/oauth2` |
| `sub` | string | Twitch user ID of the authenticated user |
| `nonce` | string | The nonce value provided in the authorization request |
| `email` | string | User's email address (requires `user:read:email` scope) |
| `email_verified` | boolean | Whether the email is verified (requires `user:read:email` scope) |
| `preferred_username` | string | User's Twitch display name |
| `picture` | string | URL of the user's profile image |
| `updated_at` | string | ISO 8601 timestamp of last profile update |

### OIDC UserInfo Endpoint

You can also retrieve user claims via the UserInfo endpoint.

#### Endpoint: GET `https://id.twitch.tv/oauth2/userinfo`

| Header | Value | Description |
|---|---|---|
| `Authorization` | `Bearer <access_token>` | A valid user access token obtained with the `openid` scope |

#### cURL Example

```bash
curl -X GET 'https://id.twitch.tv/oauth2/userinfo' \
  -H 'Authorization: Bearer rfx2uswqe8l4g1mkagrvg5tv0cs3'
```

#### Response (200 OK)

```json
{
  "aud": "hof5gwx0su6owfn0nyan9c87zr6t",
  "azp": "hof5gwx0su6owfn0nyan9c87zr6t",
  "exp": 1684876800,
  "iat": 1684790400,
  "iss": "https://id.twitch.tv/oauth2",
  "sub": "12345678",
  "email": "user@example.com",
  "email_verified": true,
  "preferred_username": "twitchuser",
  "picture": "https://static-cdn.jtvnw.net/jtv_user_pictures/profile_image-300x300.png",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### OIDC Discovery & JWKS

- **Discovery URL:** `https://id.twitch.tv/oauth2/.well-known/openid-configuration`
- **JWKS URL:** `https://id.twitch.tv/oauth2/keys`

Use the JWKS endpoint to fetch Twitch's public keys for verifying ID token signatures.

---

## 5. Device Code Grant Flow

The Device Code Grant Flow is designed for **public clients** that cannot securely store a client secret, such as CLI tools, smart TVs, and game consoles. This is Twitch's alternative to PKCE.

> **Important:** Twitch does NOT support PKCE. Use this flow for public clients that need refresh tokens.

### Step 1: Request a Device Code

#### Endpoint: POST `https://id.twitch.tv/oauth2/device`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `client_id` | string | Yes | Your app's Client ID |
| `scopes` | string | Yes | Space-separated list of requested scopes |

#### cURL Example

```bash
curl -X POST 'https://id.twitch.tv/oauth2/device' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=hof5gwx0su6owfn0nyan9c87zr6t' \
  -d 'scopes=user:read:email channel:read:subscriptions'
```

#### Response (200 OK)

```json
{
  "device_code": "a1b2c3d4e5f6g7h8i9j0",
  "expires_in": 1800,
  "interval": 5,
  "user_code": "ABCD-1234",
  "verification_uri": "https://www.twitch.tv/activate"
}
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `device_code` | string | The device verification code used in polling (Step 3) |
| `expires_in` | integer | Seconds until `device_code` and `user_code` expire (typically 1800 = 30 minutes) |
| `interval` | integer | Minimum number of seconds to wait between polling requests |
| `user_code` | string | The code the user must enter at the verification URI |
| `verification_uri` | string | The URL where the user enters the `user_code` |

### Step 2: Instruct the User

Display the `user_code` and `verification_uri` to the user. They must:

1. Navigate to `https://www.twitch.tv/activate` in a browser
2. Enter the `user_code` (e.g., `ABCD-1234`)
3. Log in and authorize the application

### Step 3: Poll for Authorization

While the user completes authorization, poll the token endpoint at the specified `interval`.

#### Endpoint: POST `https://id.twitch.tv/oauth2/token`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `client_id` | string | Yes | Your app's Client ID |
| `device_code` | string | Yes | The `device_code` from Step 1 |
| `grant_type` | string | Yes | Must be `urn:ietf:params:oauth:grant-type:device_code` |

#### cURL Example

```bash
curl -X POST 'https://id.twitch.tv/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=hof5gwx0su6owfn0nyan9c87zr6t' \
  -d 'device_code=a1b2c3d4e5f6g7h8i9j0' \
  -d 'grant_type=urn:ietf:params:oauth:grant-type:device_code'
```

#### Polling Responses

**User has not yet authorized (400 Bad Request):**

```json
{
  "status": 400,
  "message": "authorization_pending"
}
```

**User denied authorization (400 Bad Request):**

```json
{
  "status": 400,
  "message": "authorization_declined"
}
```

**Polling too fast (400 Bad Request):**

```json
{
  "status": 400,
  "message": "slow_down"
}
```

When you receive `slow_down`, increase the polling interval by 5 seconds.

**Device code expired (400 Bad Request):**

```json
{
  "status": 400,
  "message": "expired_token"
}
```

**User authorized successfully (200 OK):**

```json
{
  "access_token": "rfx2uswqe8l4g1mkagrvg5tv0cs3",
  "expires_in": 14346,
  "refresh_token": "5b93chm6hdve3mycz05zfzatkfdenfswo1mhs3z066ch23offr",
  "scope": ["user:read:email", "channel:read:subscriptions"],
  "token_type": "bearer"
}
```

> **Note:** The Device Code Grant Flow returns a refresh token, unlike the OIDC Implicit Flow.

---

## 6. Token Refresh Flow

Only tokens obtained via the **Authorization Code Grant Flow** and the **Device Code Grant Flow** include a refresh token. App Access Tokens and OIDC Implicit tokens cannot be refreshed.

### When to Refresh

- When the `expires_in` countdown approaches zero
- When an API call returns `401 Unauthorized`
- Proactively before expiration (e.g., at 50% of `expires_in`)
- After token validation returns a low `expires_in` value

### Endpoint: POST `https://id.twitch.tv/oauth2/token`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `client_id` | string | Yes | Your app's Client ID |
| `client_secret` | string | Yes | Your app's Client Secret |
| `grant_type` | string | Yes | Must be `refresh_token` |
| `refresh_token` | string | Yes | The refresh token to use |

### cURL Example

```bash
curl -X POST 'https://id.twitch.tv/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=hof5gwx0su6owfn0nyan9c87zr6t' \
  -d 'client_secret=41vpdji4e9gif29md0ouet6fktd2' \
  -d 'grant_type=refresh_token' \
  -d 'refresh_token=5b93chm6hdve3mycz05zfzatkfdenfswo1mhs3z066ch23offr'
```

### Success Response (200 OK)

```json
{
  "access_token": "1ssjqsqfy6bads1ws7m03gras79zfr",
  "expires_in": 14346,
  "refresh_token": "eyJfMzUtNI0cmjFKc4V0Y0Vpd29NYXZ0S1VoVUhkek5GbVJ3YVR",
  "scope": ["user:read:email", "channel:read:subscriptions"],
  "token_type": "bearer"
}
```

> **Important:** The response may include a **new refresh token**. Always store and use the most recent refresh token. The old refresh token may be invalidated.

### Error Response (401 Unauthorized)

```json
{
  "status": 401,
  "message": "Invalid refresh token"
}
```

A 401 means the refresh token is no longer valid. The user must re-authorize through the full OAuth flow.

### Max 50 Tokens Per Refresh Token

Twitch enforces a limit of **50 valid access tokens per refresh token** at any given time. If you exceed this limit:

- The oldest access token is automatically invalidated
- The refresh itself still succeeds
- This is relevant for applications that refresh aggressively or maintain many concurrent sessions per user

### Reasons a Refresh Token Can Become Invalid

- User changed their Twitch password
- User disconnected your app in their Twitch settings (Settings > Connections)
- Your app revoked the token
- Twitch invalidated the token (policy enforcement)
- The refresh token was replaced by a newer one and the old one was invalidated

---

## 7. Token Validation

Twitch **requires** that applications validate tokens at least once per hour. Twitch performs periodic audits and will revoke tokens from applications that fail to validate regularly.

### Endpoint: GET `https://id.twitch.tv/oauth2/validate`

| Header | Value | Description |
|---|---|---|
| `Authorization` | `OAuth <access_token>` | The access token to validate. **MUST use `OAuth` prefix, NOT `Bearer`** |

> **Critical:** The validation endpoint uses `Authorization: OAuth <token>`, not `Authorization: Bearer <token>`. This is different from all other Twitch API endpoints.

### cURL Example

```bash
curl -X GET 'https://id.twitch.tv/oauth2/validate' \
  -H 'Authorization: OAuth rfx2uswqe8l4g1mkagrvg5tv0cs3'
```

### Success Response (200 OK) — User Access Token

```json
{
  "client_id": "hof5gwx0su6owfn0nyan9c87zr6t",
  "login": "twitchuser",
  "scopes": ["user:read:email", "channel:read:subscriptions"],
  "user_id": "12345678",
  "expires_in": 5089418
}
```

### Success Response (200 OK) — App Access Token

```json
{
  "client_id": "hof5gwx0su6owfn0nyan9c87zr6t",
  "scopes": [],
  "expires_in": 5089418
}
```

> **Note:** App Access Tokens do not have `login`, `user_id`, or `scopes` in the validation response.

### Response Fields

| Field | Type | Description |
|---|---|---|
| `client_id` | string | The Client ID associated with the token |
| `login` | string | The user's login name (user tokens only) |
| `scopes` | string[] | Array of scopes the token has been granted |
| `user_id` | string | The user's Twitch ID (user tokens only) |
| `expires_in` | integer | Number of seconds until the token expires |

### Error Response (401 Unauthorized)

```json
{
  "status": 401,
  "message": "invalid access token"
}
```

A 401 indicates the token is no longer valid and must be refreshed or re-obtained.

### Enforcement & Audits

- Twitch periodically checks that applications are validating tokens
- Applications that fail to validate may have their tokens **revoked without notice**
- Validate on app startup, then at least every 60 minutes while the app is running
- Also validate after receiving a `401` response from any API endpoint

---

## 8. Token Revocation

Revoke tokens when users log out or disconnect your application. Both access tokens and refresh tokens can be revoked.

### Endpoint: POST `https://id.twitch.tv/oauth2/revoke`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `client_id` | string | Yes | Your app's Client ID |
| `token` | string | Yes | The access token or refresh token to revoke |

### cURL Example

```bash
# Revoke an access token
curl -X POST 'https://id.twitch.tv/oauth2/revoke' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=hof5gwx0su6owfn0nyan9c87zr6t' \
  -d 'token=rfx2uswqe8l4g1mkagrvg5tv0cs3'
```

### Success Response (200 OK)

An empty response body with a `200` status code indicates the token was successfully revoked.

### Error Response (400 Bad Request)

```json
{
  "status": 400,
  "message": "Invalid token"
}
```

> **Note:** Revoking an access token only revokes that specific access token. Revoking a refresh token invalidates the refresh token and **all access tokens** associated with it.

> **Note:** Submitting an already-invalid token returns `200 OK` (not an error). This is consistent with RFC 7009.

---

## 9. Token Types Comparison

### Access Token

| Property | Value |
|---|---|
| **Format** | Opaque string |
| **Purpose** | Authenticate API requests |
| **Sent as** | `Authorization: Bearer <token>` header |
| **Lifetime** | Varies (~4 hours for user tokens, ~60 days for app tokens) |
| **Refreshable** | Only if obtained with Authorization Code Grant or Device Code Grant |
| **Revocable** | Yes |

### Refresh Token

| Property | Value |
|---|---|
| **Format** | Opaque string |
| **Purpose** | Obtain new access tokens without re-authorization |
| **Sent as** | POST body parameter to token endpoint |
| **Lifetime** | Long-lived (until invalidated) |
| **Refreshable** | N/A (it IS the refresh mechanism) |
| **Revocable** | Yes (revokes all associated access tokens) |
| **Obtained from** | Authorization Code Grant, Device Code Grant |
| **NOT available from** | Client Credentials Grant, OIDC Implicit Grant |

### ID Token (JWT)

| Property | Value |
|---|---|
| **Format** | JSON Web Token (RS256 signed) |
| **Purpose** | Verify user identity (authentication, not authorization) |
| **Sent as** | Returned in OIDC flows only |
| **Lifetime** | Short-lived (check `exp` claim) |
| **Refreshable** | No |
| **Revocable** | No (self-contained; just stop trusting it) |
| **Obtained from** | OIDC Implicit Grant (with `openid` scope) |
| **Contains** | User ID, email, display name, issuer, audience, timestamps |

---

## 10. Token Lifetimes

### App Access Tokens

- **Typical lifetime:** ~60 days (~5,184,000 seconds)
- **Refresh strategy:** Cannot be refreshed. Request a new one via Client Credentials when expired
- **Invalidation:** Expiry, or if your app's client secret is regenerated

### User Access Tokens

- **Typical lifetime:** ~4 hours (~14,400 seconds) but varies
- **Refresh strategy:** Use the refresh token to obtain a new access token
- **Invalidation:** See below

### Reasons Tokens Become Invalid

| Reason | Access Token | Refresh Token |
|---|---|---|
| Natural expiry | Yes | No (long-lived) |
| User changes password | Yes | Yes |
| User disconnects app in Twitch settings | Yes | Yes |
| App revokes the token | Yes | Yes (+ all access tokens) |
| Twitch enforcement/audit | Yes | Yes |
| Client secret regenerated | Yes (app tokens) | No |
| Exceeded 50 access tokens per refresh token | Oldest invalidated | No |
| Token replaced by a newer refresh token | N/A | Possibly |

---

## 11. App Registration Process

Before using Twitch authentication, you must register your application in the Twitch Developer Console.

### Step 1: Access the Developer Console

1. Navigate to [https://dev.twitch.tv/console](https://dev.twitch.tv/console)
2. Log in with your Twitch account
3. Enable Two-Factor Authentication (2FA) if not already enabled — this is **required**

### Step 2: Register Your Application

Click "Register Your Application" and fill in:

| Field | Description | Notes |
|---|---|---|
| **Name** | Your application's name | Must be unique across all Twitch applications. Displayed to users during authorization |
| **OAuth Redirect URLs** | Where Twitch sends users after authorization | Must use HTTPS in production. `http://localhost` is allowed for development. Multiple URIs allowed |
| **Category** | Type of application | Options vary (e.g., Website Integration, Game Integration, Chat Bot) |
| **Client Type** | Confidential or Public | **Confidential:** Has a backend that can securely store the client secret. **Public:** Cannot securely store secrets (SPAs, CLI tools, mobile apps) |

### Step 3: Obtain Credentials

After registration, you receive:

- **Client ID** — Public identifier. Safe to expose in client-side code
- **Client Secret** — Private. **NEVER** expose in client-side code, commit to repositories, or share publicly. Only available for Confidential clients

### Client Types

| Type | Client Secret | Recommended Flows |
|---|---|---|
| **Confidential** | Yes (keep secret) | Authorization Code Grant, Client Credentials |
| **Public** | No | Device Code Grant, OIDC Implicit Grant |

### Managing Your Application

- You can regenerate your Client Secret at any time (this invalidates all existing App Access Tokens)
- You can update redirect URIs, name, and category
- Deleting an application invalidates all associated tokens

---

## 12. Best Practices

### Secure Token Storage

- **Server-side:** Store tokens in encrypted database fields or a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault)
- **Client-side:** Use `httpOnly` secure cookies or encrypted local storage. Never store tokens in plain `localStorage` for production applications
- **Never** log tokens, commit them to source control, or transmit them over unencrypted connections
- Store the Client Secret server-side only. Never embed it in client-side code or mobile apps

### Token Validation Strategy

```
App Start
  └─> Validate token
       ├─> Valid → Start hourly validation timer
       └─> Invalid → Refresh or re-authenticate

Hourly Timer
  └─> Validate token
       ├─> Valid (expires_in > threshold) → Continue
       ├─> Valid (expires_in < threshold) → Proactively refresh
       └─> Invalid → Refresh or re-authenticate

API Call Returns 401
  └─> Validate token
       ├─> Valid → Retry the API call (may be a transient error)
       └─> Invalid → Refresh or re-authenticate
```

### Refresh Strategy

- Refresh proactively when `expires_in` drops below a threshold (e.g., 1 hour)
- Always store the **newest** refresh token from any refresh response
- Handle `401` from refresh by prompting the user to re-authorize
- Implement exponential backoff for refresh retries on network errors
- Track the 50-token-per-refresh-token limit if your app creates many concurrent sessions

### Error Handling

- Always check HTTP status codes before parsing response bodies
- Handle rate limits (HTTP 429) with exponential backoff
- Distinguish between "token expired" (refreshable) and "token revoked" (re-auth needed)
- Log authentication failures for debugging (but never log the tokens themselves)

### State Parameter (CSRF Prevention)

- Always generate a unique, unpredictable `state` value per authorization request
- Store the `state` in a server-side session or signed cookie
- Verify the `state` matches when handling the callback
- Reject the callback if `state` is missing or does not match

### OIDC Nonce (Replay Prevention)

- Generate a unique `nonce` per authorization request when using OIDC
- Verify the `nonce` claim in the ID token matches the one you sent
- Store nonces server-side and mark them as used to prevent replay

---

## 13. Known Issues & Community Quirks

### Validation Header Confusion

The `validate` endpoint requires `Authorization: OAuth <token>`, while all other endpoints use `Authorization: Bearer <token>`. This is a common source of confusion and bugs. Many HTTP client libraries default to `Bearer` format.

### No PKCE Support

Unlike most modern OAuth 2.0 providers, Twitch does **not** support PKCE (Proof Key for Code Exchange). This is a deliberate design choice. Twitch recommends using the Device Code Grant Flow for public clients instead. This can be surprising for developers accustomed to platforms like Auth0, Okta, or Google that rely heavily on PKCE.

### Refresh Token Rotation

Twitch may or may not rotate the refresh token on each refresh. The behavior is not guaranteed to be consistent. Always check the response for a new `refresh_token` value and update your stored token accordingly.

### Scope Changes After Refresh

Scopes are fixed at authorization time. Refreshing a token does not allow you to request additional scopes. If you need additional scopes, the user must re-authorize through the full OAuth flow.

### App Access Token Validation

Validating an App Access Token returns an empty `scopes` array and no `login` or `user_id` fields. Some developers mistakenly interpret this as an error.

### Force Verify Behavior

Setting `force_verify=true` forces the authorization page to appear even if the user previously authorized your app. Without it, returning users are silently redirected with a new code. Use `force_verify` when you need the user to explicitly re-confirm permissions (e.g., after adding new scopes).

### Token Expiry Precision

The `expires_in` value is approximate. Do not rely on exact-second precision for token expiry calculations. Build in a buffer (e.g., refresh when 80% of the lifetime has elapsed).

### Device Code Flow Client Secret

Unlike the standard Authorization Code Grant, the Device Code Grant polling request does **not** require a `client_secret` parameter. This is by design, since the Device Code Grant is intended for public clients.

### Rate Limits on Token Endpoints

Token endpoints are rate-limited. If you poll the device code endpoint too aggressively, you will receive `slow_down` responses. Similarly, calling the token endpoint excessively for refreshes may trigger rate limiting.

---

## Code Examples

### TypeScript: Token Manager

```typescript
interface TwitchTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
  scopes: string[];
}

interface TwitchValidationResponse {
  client_id: string;
  login: string;
  scopes: string[];
  user_id: string;
  expires_in: number;
}

interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string[];
  token_type: string;
}

class TwitchTokenManager {
  private clientId: string;
  private clientSecret: string;
  private tokens: TwitchTokens | null = null;
  private validationInterval: ReturnType<typeof setInterval> | null = null;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Build the authorization URL for the Authorization Code Grant Flow.
   */
  getAuthorizationUrl(redirectUri: string, scopes: string[], state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
    });
    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange an authorization code for tokens.
   */
  async exchangeCode(code: string, redirectUri: string): Promise<TwitchTokens> {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.message}`);
    }

    const data: TwitchTokenResponse = await response.json();
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      scopes: data.scope,
    };

    this.startValidationLoop();
    return this.tokens;
  }

  /**
   * Validate the current access token.
   * Note: Uses "OAuth" prefix, NOT "Bearer".
   */
  async validate(): Promise<TwitchValidationResponse | null> {
    if (!this.tokens) return null;

    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        'Authorization': `OAuth ${this.tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      // Token is invalid — try to refresh
      console.warn('Token validation failed, attempting refresh...');
      await this.refresh();
      return this.validate();
    }

    const data: TwitchValidationResponse = await response.json();

    // Update expiry based on validation response
    this.tokens.expiresAt = Date.now() + data.expires_in * 1000;

    return data;
  }

  /**
   * Refresh the access token using the stored refresh token.
   */
  async refresh(): Promise<TwitchTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available. User must re-authorize.');
    }

    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.tokens.refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) {
        this.tokens = null;
        this.stopValidationLoop();
        throw new Error('Refresh token invalid. User must re-authorize.');
      }
      throw new Error(`Token refresh failed: ${error.message}`);
    }

    const data: TwitchTokenResponse = await response.json();
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token, // Always use the newest refresh token
      expiresAt: Date.now() + data.expires_in * 1000,
      scopes: data.scope,
    };

    return this.tokens;
  }

  /**
   * Revoke the current access token.
   */
  async revoke(): Promise<void> {
    if (!this.tokens) return;

    await fetch('https://id.twitch.tv/oauth2/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        token: this.tokens.accessToken,
      }),
    });

    this.tokens = null;
    this.stopValidationLoop();
  }

  /**
   * Get a valid access token, refreshing if necessary.
   */
  async getAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('Not authenticated. User must authorize first.');
    }

    // Proactively refresh if token expires within 10 minutes
    const bufferMs = 10 * 60 * 1000;
    if (Date.now() > this.tokens.expiresAt - bufferMs) {
      await this.refresh();
    }

    return this.tokens.accessToken;
  }

  /**
   * Make an authenticated API request to Twitch Helix.
   */
  async apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`https://api.twitch.tv/helix${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': this.clientId,
        ...options.headers,
      },
    });

    // If we get a 401, try refreshing once and retrying
    if (response.status === 401) {
      await this.refresh();
      const newToken = this.tokens!.accessToken;
      return fetch(`https://api.twitch.tv/helix${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Client-Id': this.clientId,
          ...options.headers,
        },
      });
    }

    return response;
  }

  /**
   * Start the hourly validation loop (required by Twitch).
   */
  private startValidationLoop(): void {
    this.stopValidationLoop();
    // Validate every 55 minutes (just under the 1-hour requirement)
    this.validationInterval = setInterval(() => {
      this.validate().catch(console.error);
    }, 55 * 60 * 1000);
  }

  /**
   * Stop the validation loop.
   */
  private stopValidationLoop(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }
  }
}

// Usage example
const twitch = new TwitchTokenManager('your_client_id', 'your_client_secret');

// Generate authorization URL
const authUrl = twitch.getAuthorizationUrl(
  'http://localhost:3000/auth/callback',
  ['user:read:email', 'channel:read:subscriptions'],
  crypto.randomUUID()
);

// After user authorizes and you receive the code:
// await twitch.exchangeCode(code, 'http://localhost:3000/auth/callback');

// Make API calls:
// const response = await twitch.apiRequest('/users?login=twitchuser');
// const data = await response.json();
```

### TypeScript: App Access Token Manager

```typescript
class TwitchAppTokenManager {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private expiresAt: number = 0;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Get an App Access Token via Client Credentials Grant.
   * Automatically fetches a new token if the current one is expired or missing.
   */
  async getToken(): Promise<string> {
    const bufferMs = 60 * 60 * 1000; // 1 hour buffer
    if (this.accessToken && Date.now() < this.expiresAt - bufferMs) {
      return this.accessToken;
    }

    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get app access token: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.expiresAt = Date.now() + data.expires_in * 1000;

    return this.accessToken!;
  }
}
```

### Python: Token Manager

```python
import time
import threading
import secrets
from urllib.parse import urlencode
from typing import Optional
import requests


class TwitchTokens:
    def __init__(
        self,
        access_token: str,
        refresh_token: str,
        expires_at: float,
        scopes: list[str],
    ):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.expires_at = expires_at
        self.scopes = scopes


class TwitchTokenManager:
    AUTH_BASE = "https://id.twitch.tv/oauth2"
    API_BASE = "https://api.twitch.tv/helix"

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.tokens: Optional[TwitchTokens] = None
        self._validation_timer: Optional[threading.Timer] = None

    def get_authorization_url(
        self,
        redirect_uri: str,
        scopes: list[str],
        state: Optional[str] = None,
        force_verify: bool = False,
    ) -> str:
        """Build the authorization URL for Authorization Code Grant Flow."""
        if state is None:
            state = secrets.token_urlsafe(32)

        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(scopes),
            "state": state,
        }
        if force_verify:
            params["force_verify"] = "true"

        return f"{self.AUTH_BASE}/authorize?{urlencode(params)}"

    def exchange_code(self, code: str, redirect_uri: str) -> TwitchTokens:
        """Exchange an authorization code for tokens."""
        response = requests.post(
            f"{self.AUTH_BASE}/token",
            data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
        )
        response.raise_for_status()
        data = response.json()

        self.tokens = TwitchTokens(
            access_token=data["access_token"],
            refresh_token=data["refresh_token"],
            expires_at=time.time() + data["expires_in"],
            scopes=data.get("scope", []),
        )

        self._start_validation_loop()
        return self.tokens

    def validate(self) -> Optional[dict]:
        """
        Validate the current access token.
        Note: Uses "OAuth" header prefix, NOT "Bearer".
        """
        if not self.tokens:
            return None

        response = requests.get(
            f"{self.AUTH_BASE}/validate",
            headers={"Authorization": f"OAuth {self.tokens.access_token}"},
        )

        if response.status_code == 401:
            # Token invalid — attempt refresh
            self.refresh()
            return self.validate()

        response.raise_for_status()
        data = response.json()

        # Update expiry from validation response
        self.tokens.expires_at = time.time() + data["expires_in"]
        return data

    def refresh(self) -> TwitchTokens:
        """Refresh the access token using the stored refresh token."""
        if not self.tokens or not self.tokens.refresh_token:
            raise RuntimeError("No refresh token available. User must re-authorize.")

        response = requests.post(
            f"{self.AUTH_BASE}/token",
            data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "refresh_token",
                "refresh_token": self.tokens.refresh_token,
            },
        )

        if response.status_code == 401:
            self.tokens = None
            self._stop_validation_loop()
            raise RuntimeError("Refresh token invalid. User must re-authorize.")

        response.raise_for_status()
        data = response.json()

        # Always use the newest refresh token from the response
        self.tokens = TwitchTokens(
            access_token=data["access_token"],
            refresh_token=data["refresh_token"],
            expires_at=time.time() + data["expires_in"],
            scopes=data.get("scope", []),
        )

        return self.tokens

    def revoke(self) -> None:
        """Revoke the current access token."""
        if not self.tokens:
            return

        requests.post(
            f"{self.AUTH_BASE}/revoke",
            data={
                "client_id": self.client_id,
                "token": self.tokens.access_token,
            },
        )

        self.tokens = None
        self._stop_validation_loop()

    def get_access_token(self) -> str:
        """Get a valid access token, refreshing if necessary."""
        if not self.tokens:
            raise RuntimeError("Not authenticated. User must authorize first.")

        # Proactively refresh if token expires within 10 minutes
        buffer_seconds = 600
        if time.time() > self.tokens.expires_at - buffer_seconds:
            self.refresh()

        return self.tokens.access_token

    def api_request(
        self, endpoint: str, method: str = "GET", **kwargs
    ) -> requests.Response:
        """Make an authenticated request to the Twitch Helix API."""
        access_token = self.get_access_token()

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Client-Id": self.client_id,
        }
        headers.update(kwargs.pop("headers", {}))

        response = requests.request(
            method, f"{self.API_BASE}{endpoint}", headers=headers, **kwargs
        )

        # Retry once on 401
        if response.status_code == 401:
            self.refresh()
            headers["Authorization"] = f"Bearer {self.tokens.access_token}"
            response = requests.request(
                method, f"{self.API_BASE}{endpoint}", headers=headers, **kwargs
            )

        return response

    def _start_validation_loop(self) -> None:
        """Start the hourly validation loop (required by Twitch)."""
        self._stop_validation_loop()

        def _validate_and_reschedule():
            try:
                self.validate()
            except Exception as e:
                print(f"Validation failed: {e}")
            finally:
                # Reschedule for 55 minutes (under the 1-hour requirement)
                self._validation_timer = threading.Timer(
                    55 * 60, _validate_and_reschedule
                )
                self._validation_timer.daemon = True
                self._validation_timer.start()

        self._validation_timer = threading.Timer(55 * 60, _validate_and_reschedule)
        self._validation_timer.daemon = True
        self._validation_timer.start()

    def _stop_validation_loop(self) -> None:
        """Stop the validation loop."""
        if self._validation_timer:
            self._validation_timer.cancel()
            self._validation_timer = None


class TwitchAppTokenManager:
    """Manager for App Access Tokens (Client Credentials Grant)."""

    AUTH_BASE = "https://id.twitch.tv/oauth2"

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self._access_token: Optional[str] = None
        self._expires_at: float = 0

    def get_token(self) -> str:
        """Get an App Access Token, fetching a new one if expired."""
        buffer_seconds = 3600  # 1 hour buffer
        if self._access_token and time.time() < self._expires_at - buffer_seconds:
            return self._access_token

        response = requests.post(
            f"{self.AUTH_BASE}/token",
            data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "client_credentials",
            },
        )
        response.raise_for_status()
        data = response.json()

        self._access_token = data["access_token"]
        self._expires_at = time.time() + data["expires_in"]

        return self._access_token


# Usage example
if __name__ == "__main__":
    manager = TwitchTokenManager("your_client_id", "your_client_secret")

    # Step 1: Generate authorization URL
    auth_url = manager.get_authorization_url(
        redirect_uri="http://localhost:3000/auth/callback",
        scopes=["user:read:email", "channel:read:subscriptions"],
    )
    print(f"Authorize at: {auth_url}")

    # Step 2: After receiving the code from the callback
    # tokens = manager.exchange_code(code, "http://localhost:3000/auth/callback")

    # Step 3: Make API calls
    # response = manager.api_request("/users?login=twitchuser")
    # print(response.json())
```

### Python: Device Code Grant Flow

```python
import time
import requests


def device_code_flow(client_id: str, scopes: list[str]) -> dict:
    """
    Complete Device Code Grant Flow.
    Returns the token response dict on success.
    """
    # Step 1: Request device code
    response = requests.post(
        "https://id.twitch.tv/oauth2/device",
        data={
            "client_id": client_id,
            "scopes": " ".join(scopes),
        },
    )
    response.raise_for_status()
    device_data = response.json()

    device_code = device_data["device_code"]
    user_code = device_data["user_code"]
    verification_uri = device_data["verification_uri"]
    expires_in = device_data["expires_in"]
    interval = device_data["interval"]

    # Step 2: Display instructions to the user
    print(f"\n{'=' * 50}")
    print(f"Go to: {verification_uri}")
    print(f"Enter code: {user_code}")
    print(f"Code expires in {expires_in // 60} minutes.")
    print(f"{'=' * 50}\n")

    # Step 3: Poll for authorization
    poll_interval = interval
    deadline = time.time() + expires_in

    while time.time() < deadline:
        time.sleep(poll_interval)

        token_response = requests.post(
            "https://id.twitch.tv/oauth2/token",
            data={
                "client_id": client_id,
                "device_code": device_code,
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            },
        )

        if token_response.status_code == 200:
            print("Authorization successful!")
            return token_response.json()

        error_data = token_response.json()
        message = error_data.get("message", "")

        if message == "authorization_pending":
            # User hasn't authorized yet, keep polling
            continue
        elif message == "slow_down":
            # Increase interval by 5 seconds
            poll_interval += 5
            print(f"Slowing down, polling every {poll_interval}s...")
        elif message == "authorization_declined":
            raise RuntimeError("User declined authorization.")
        elif message == "expired_token":
            raise RuntimeError("Device code expired. Please start over.")
        else:
            raise RuntimeError(f"Unexpected error: {message}")

    raise RuntimeError("Device code expired (timeout).")


# Usage
# tokens = device_code_flow("your_client_id", ["user:read:email"])
# print(tokens["access_token"])
```

---

## 14. Quick Reference Table

### Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `https://id.twitch.tv/oauth2/authorize` | GET | User authorization (browser redirect) |
| `https://id.twitch.tv/oauth2/token` | POST | Exchange code, refresh, client credentials, device code polling |
| `https://id.twitch.tv/oauth2/validate` | GET | Validate an access token (uses `OAuth` header) |
| `https://id.twitch.tv/oauth2/revoke` | POST | Revoke an access or refresh token |
| `https://id.twitch.tv/oauth2/device` | POST | Request a device code (Device Code Grant) |
| `https://id.twitch.tv/oauth2/userinfo` | GET | OIDC UserInfo (uses `Bearer` header) |
| `https://id.twitch.tv/oauth2/keys` | GET | OIDC JWKS (public keys for JWT verification) |
| `https://id.twitch.tv/oauth2/.well-known/openid-configuration` | GET | OIDC Discovery document |

### Grant Types for Token Endpoint

| `grant_type` Value | Flow |
|---|---|
| `authorization_code` | Authorization Code Grant |
| `client_credentials` | Client Credentials Grant |
| `refresh_token` | Token Refresh |
| `urn:ietf:params:oauth:grant-type:device_code` | Device Code Grant |

### Authentication Headers

| Context | Header Format |
|---|---|
| Helix API calls | `Authorization: Bearer <access_token>` + `Client-Id: <client_id>` |
| Token validation | `Authorization: OAuth <access_token>` |
| OIDC UserInfo | `Authorization: Bearer <access_token>` |

### Token Characteristics

| Property | App Access Token | User Access Token | ID Token (JWT) |
|---|---|---|---|
| **Represents** | Application | Specific user | User identity |
| **Lifetime** | ~60 days | ~4 hours (varies) | Short-lived (check `exp`) |
| **Refreshable** | No | Yes (Auth Code / Device Code only) | No |
| **Has scopes** | No | Yes | N/A (contains claims) |
| **Obtained via** | Client Credentials | Auth Code, OIDC Implicit, Device Code | OIDC Implicit |

### Key Limits & Requirements

| Constraint | Value |
|---|---|
| Token validation frequency | At least once per hour |
| Max access tokens per refresh token | 50 |
| Device code expiry | ~30 minutes (1800 seconds) |
| Device code polling interval | Minimum 5 seconds (server-specified) |
| OAuth redirect URI | Must exactly match registered URI |
| 2FA requirement | Required for Developer Console access |

### HTTP Status Codes

| Status | Meaning (Auth Context) |
|---|---|
| `200` | Success |
| `400` | Bad request (invalid parameters, pending device auth, expired code) |
| `401` | Token is invalid or expired |
| `403` | Insufficient scopes or permissions |
| `429` | Rate limited (back off and retry) |
