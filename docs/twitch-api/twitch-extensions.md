# Twitch API — Extensions

> **Source:** https://dev.twitch.tv/docs/extensions, https://dev.twitch.tv/docs/extensions/reference
> **Last verified:** 2025-05-01 — [PAGE INACCESSIBLE - VERIFY AGAINST LIVE DOCS]
> **API Base URL:** `https://api.twitch.tv/helix`
> **JS Helper:** `https://extension-files.twitch.tv/helper/v1/twitch-ext.min.js`

## Overview

Twitch Extensions are interactive overlays and panels that run on channel pages, allowing developers to create rich, interactive experiences directly within Twitch. Extensions are web applications (HTML/CSS/JS) hosted by Twitch and rendered inside iframes on the broadcaster's channel page. They can interact with the Twitch API, communicate with an Extension Backend Service (EBS), use Twitch PubSub for real-time messaging, and integrate with Bits for monetization.

Extensions go through a lifecycle of development, hosted testing, review, and release before becoming available to broadcasters. Once released, broadcasters install and activate extensions on their channels.

### Key Concepts

- **Extension Frontend** — HTML/JS/CSS loaded in an iframe on the channel page. Hosted by Twitch.
- **Extension Backend Service (EBS)** — An optional server you operate that communicates with the extension frontend and the Twitch API. Authenticated via signed JWTs.
- **JS Helper** — Twitch-provided JavaScript library that handles authentication, PubSub, configuration, and Bits.
- **JWT (JSON Web Token)** — Signed tokens used to authenticate communication between the extension frontend, EBS, and Twitch API.
- **Configuration Service** — Twitch-hosted key-value store for extension settings (up to 5KB per segment).
- **Extension PubSub** — Real-time messaging between the EBS and extension frontends.

---

## Extension Types

Twitch supports four extension types. A single extension can support multiple types simultaneously.

### Panel

- Displayed **below the video player** in the panels section of the channel page.
- Always visible when the channel page is loaded (does not require the stream to be live).
- Dimensions: 318px wide, height between 100px and 500px (set by the extension).
- Broadcasters can install up to 3 panel extensions.
- Best for: leaderboards, schedules, social links, stats, mini-games.

### Video Overlay

- Rendered as a **full transparent overlay on top of the video player**.
- Only visible when the stream is live.
- Dimensions: full video player size (responsive).
- Broadcasters can install 1 overlay extension at a time.
- The overlay receives mouse events; transparent areas pass clicks through to the video player.
- Best for: interactive overlays, polls displayed on video, alerts, HUD elements.

### Video Component

- A **positioned, resizable box on the video player**.
- Only visible when the stream is live.
- Broadcasters can install up to 2 component extensions.
- Position and size are configured by the broadcaster (x, y, zoom).
- The `onPositionChanged` callback reports position changes.
- Best for: mini-panels on video, interactive widgets, game companion info.

### Mobile

- Optimized for the **Twitch mobile app**.
- Displayed as a panel below the video player on mobile devices.
- Must be explicitly enabled in the extension capabilities.
- Requires responsive design and touch-friendly interactions.
- Best for: any extension that should work on mobile (polls, loyalty points, schedules).

### Type Comparison

| Feature | Panel | Video Overlay | Video Component | Mobile |
|---|---|---|---|---|
| Location | Below player | Over video | On video (positioned) | Below player (mobile) |
| Visible when offline | Yes | No | No | Yes |
| Max per channel | 3 | 1 | 2 | 1 |
| Clicks through transparent areas | N/A | Yes | No | N/A |
| Broadcaster positions it | No | No | Yes | No |
| Dimensions | 318px x 100-500px | Full player | Variable | Full width |

---

## JS Helper API

The Twitch JS Helper is required in all extension frontends. It handles authentication, provides PubSub, manages configuration, and supports Bits transactions.

### Including the Helper

```html
<script src="https://extension-files.twitch.tv/helper/v1/twitch-ext.min.js"></script>
```

After loading, the helper is available as `window.Twitch.ext`.

> **Important:** You must include this script in every extension HTML page. Do not bundle or self-host it — always load from the Twitch CDN.

---

### Authentication & Context

#### `Twitch.ext.onAuthorized(callback)`

Fired when the extension is first authorized and each time the JWT is refreshed.

```javascript
Twitch.ext.onAuthorized(function(auth) {
  console.log('Channel ID:', auth.channelId);
  console.log('Client ID:', auth.clientId);
  console.log('Token:', auth.token);       // JWT for EBS calls
  console.log('User ID:', auth.userId);    // Empty string if user not logged in or not shared
  console.log('Helper Version:', auth.helperVersion);
});
```

**Auth object fields:**

| Field | Type | Description |
|---|---|---|
| `token` | string | JWT signed by extension secret. Pass to EBS in Authorization header. |
| `channelId` | string | Numeric channel ID where the extension is active. |
| `clientId` | string | The extension's client ID. |
| `userId` | string | Twitch user ID of the viewer (empty if not shared). |
| `helperVersion` | string | Version of the JS Helper. |

> **Note:** The JWT auto-refreshes. Always use the latest token from the most recent `onAuthorized` callback rather than storing a token at startup.

#### `Twitch.ext.onContext(callback)`

Fired when stream context changes (game, language, theme, resolution, etc.).

```javascript
Twitch.ext.onContext(function(context, changedKeys) {
  console.log('Theme:', context.theme);           // "light" or "dark"
  console.log('Game:', context.game);             // Current game/category
  console.log('Language:', context.language);      // Broadcast language
  console.log('Mode:', context.mode);             // "viewer", "dashboard", "config"
  console.log('Is playing:', context.isFullScreen);
  console.log('Changed:', changedKeys);           // Array of changed property names
});
```

**Context object fields (partial list):**

| Field | Type | Description |
|---|---|---|
| `theme` | string | `"light"` or `"dark"` — Twitch site theme. |
| `game` | string | Current game/category of the stream. |
| `language` | string | Broadcast language (e.g., `"en"`). |
| `mode` | string | `"viewer"`, `"dashboard"`, `"config"` — rendering context. |
| `isFullScreen` | boolean | Whether the player is in fullscreen. |
| `isMuted` | boolean | Whether the player is muted. |
| `isTheatreMode` | boolean | Whether theatre mode is active. |
| `isPaused` | boolean | Whether the player is paused. |
| `bitrate` | number | Current video bitrate. |
| `bufferSize` | number | Buffer size in seconds. |
| `displayResolution` | string | Display resolution (e.g., `"1920x1080"`). |
| `hlsLatencyBroadcaster` | number | Latency to broadcaster in seconds. |
| `videoResolution` | string | Video resolution (e.g., `"1920x1080"`). |
| `volume` | number | Player volume (0-1). |
| `arePlayerControlsVisible` | boolean | Whether player controls are showing. |

---

### Visibility & Position

#### `Twitch.ext.onVisibilityChanged(callback)`

Fired when the extension visibility changes (e.g., user minimizes the extension or navigates away).

```javascript
Twitch.ext.onVisibilityChanged(function(isVisible, context) {
  if (isVisible) {
    console.log('Extension is visible');
    // Resume animations, polling, etc.
  } else {
    console.log('Extension is hidden');
    // Pause expensive operations
  }
});
```

#### `Twitch.ext.onHighlightChanged(callback)`

Fired when the extension's highlight state changes (e.g., when a viewer hovers over the extension's activation icon).

```javascript
Twitch.ext.onHighlightChanged(function(isHighlighted) {
  if (isHighlighted) {
    // Show a visual hint or animation
  }
});
```

#### `Twitch.ext.onPositionChanged(callback)`

**Video Component only.** Fired when the broadcaster changes the component's position or size.

```javascript
Twitch.ext.onPositionChanged(function(position) {
  console.log('X:', position.x);           // 0-100 (percentage)
  console.log('Y:', position.y);           // 0-100 (percentage)
  console.log('Width:', position.width);   // Pixel width
  console.log('Height:', position.height); // Pixel height
});
```

---

### Error Handling

#### `Twitch.ext.onError(callback)`

Global error handler for extension errors.

```javascript
Twitch.ext.onError(function(error) {
  console.error('Extension error:', error);
});
```

---

### Actions

#### `Twitch.ext.actions.requestIdShare()`

Requests the viewer to share their Twitch identity with the extension. Shows a consent dialog.

```javascript
Twitch.ext.actions.requestIdShare();
// If accepted, the next onAuthorized callback will include the userId
```

#### `Twitch.ext.actions.minimize()`

Minimizes the extension (overlay/component types).

```javascript
Twitch.ext.actions.minimize();
```

#### `Twitch.ext.actions.onFollow(callback)`

Fired when the viewer clicks a follow button within the extension.

```javascript
Twitch.ext.actions.onFollow(function(didFollow, channelName) {
  console.log('Followed:', didFollow, 'Channel:', channelName);
});
```

---

### Viewer

#### `Twitch.ext.viewer.onChanged(callback)`

Fired when viewer state changes (e.g., identity shared, subscription status, etc.).

```javascript
Twitch.ext.viewer.onChanged(function() {
  console.log('Viewer ID:', Twitch.ext.viewer.id);
  console.log('Opaque ID:', Twitch.ext.viewer.opaqueId);
  console.log('Role:', Twitch.ext.viewer.role);
  console.log('Is linked:', Twitch.ext.viewer.isLinked);
  console.log('Session token:', Twitch.ext.viewer.sessionToken);
  console.log('Subscription status:', Twitch.ext.viewer.subscriptionStatus);
});
```

**Viewer object properties:**

| Property | Type | Description |
|---|---|---|
| `id` | string | Twitch user ID (null if not shared). |
| `opaqueId` | string | Opaque identifier (always available, prefixed with `U` for logged-in users, `A` for anonymous). |
| `role` | string | `"broadcaster"`, `"moderator"`, `"viewer"`, `"external"`. |
| `isLinked` | boolean | Whether the viewer has linked their Twitch account to the extension. |
| `sessionToken` | string | Short-lived token for session tracking. |
| `subscriptionStatus` | object | Viewer's subscription status to the channel (null if not available). |

---

### Features

#### `Twitch.ext.features.onChanged(callback)`

Fired when feature flags change. Feature flags control what capabilities are available.

```javascript
Twitch.ext.features.onChanged(function(changed) {
  console.log('Changed features:', changed);
  console.log('Is Bits enabled:', Twitch.ext.features.isBitsEnabled);
  console.log('Is chat enabled:', Twitch.ext.features.isChatEnabled);
  console.log('Is subscription status available:', Twitch.ext.features.isSubscriptionStatusAvailable);
});
```

**Feature flags:**

| Flag | Type | Description |
|---|---|---|
| `isBitsEnabled` | boolean | Whether Bits are available on this channel. |
| `isChatEnabled` | boolean | Whether chat integration is available. |
| `isSubscriptionStatusAvailable` | boolean | Whether the viewer's sub status is available. |

---

## Extension PubSub

Extensions have a built-in PubSub system for real-time communication between the EBS and extension frontends.

### Targets

| Target | Description |
|---|---|
| `"broadcast"` | All viewers of the channel. |
| `"global"` | All viewers across all channels where the extension is installed. |
| `"whisper-<userId>"` | A specific viewer (by opaque user ID). |

### Sending Messages (from Frontend)

```javascript
Twitch.ext.send('broadcast', 'application/json', JSON.stringify({
  type: 'update',
  data: { score: 42 }
}));
```

> **Note:** Frontend-to-frontend PubSub is limited. For most use cases, messages are sent from the EBS and received by frontends.

### Listening for Messages

```javascript
Twitch.ext.listen('broadcast', function(target, contentType, message) {
  console.log('Target:', target);
  console.log('Content-Type:', contentType);
  const data = JSON.parse(message);
  console.log('Data:', data);
});
```

### Unlistening

```javascript
function myHandler(target, contentType, message) {
  // Handle message
}

Twitch.ext.listen('broadcast', myHandler);

// Later, stop listening:
Twitch.ext.unlisten('broadcast', myHandler);
```

### Sending from EBS

Send PubSub messages from your EBS via the Helix API:

```
POST https://api.twitch.tv/helix/extensions/pubsub
```

**Headers:**

```
Authorization: Bearer <extension-JWT>
Client-Id: <extension-client-id>
Content-Type: application/json
```

**Body:**

```json
{
  "target": ["broadcast"],
  "broadcaster_id": "12345",
  "is_global_broadcast": false,
  "message": "{\"type\":\"update\",\"data\":{\"score\":42}}"
}
```

**Targets for EBS sends:**

| Target | Description |
|---|---|
| `["broadcast"]` | All viewers on a specific channel (requires `broadcaster_id`). |
| `["global"]` | All viewers on all channels (set `is_global_broadcast: true`). |
| `["whisper-<userId>"]` | Specific viewer. |

**Limits:**

- Message max size: 5KB.
- Rate limit: 100 messages per minute per channel (broadcast), 60 per minute per user (whisper).

---

## JWT Schema and Validation

Extensions use JWTs for authentication between the frontend, EBS, and Twitch. JWTs are signed with the extension's shared secret using HMAC SHA-256.

### JWT Structure

#### Header

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

#### Payload (Frontend-Generated Token)

```json
{
  "exp": 1699900000,
  "user_id": "12345678",
  "opaque_user_id": "U12345678",
  "role": "viewer",
  "channel_id": "87654321",
  "pubsub_perms": {
    "listen": ["broadcast", "whisper-U12345678"],
    "send": ["broadcast"]
  },
  "is_unlinked": false
}
```

#### Payload Fields

| Field | Type | Description |
|---|---|---|
| `exp` | number | Expiration time (Unix timestamp). Twitch-issued tokens expire quickly and auto-refresh. |
| `user_id` | string | Twitch user ID of the viewer. Empty if identity not shared. |
| `opaque_user_id` | string | Opaque ID. `U`-prefixed for logged-in, `A`-prefixed for anonymous. |
| `role` | string | `"broadcaster"`, `"moderator"`, `"viewer"`, `"external"` (EBS). |
| `channel_id` | string | The channel where the extension is running. |
| `pubsub_perms` | object | PubSub permissions: `listen` and `send` arrays of targets. |
| `is_unlinked` | boolean | Whether the viewer has unlinked their identity. |

### EBS-Created JWTs

When your EBS communicates with the Twitch API on behalf of the extension, it creates its own JWTs:

```json
{
  "exp": 1699900000,
  "user_id": "12345678",
  "role": "external",
  "channel_id": "87654321",
  "pubsub_perms": {
    "send": ["broadcast", "whisper-U12345678"]
  }
}
```

**Requirements for EBS JWTs:**

- `role` must be `"external"`.
- `exp` should be set to a short duration (e.g., current time + 60 seconds).
- Sign with the extension's shared secret (base64-decoded first).
- `user_id` should be set to the extension owner's Twitch user ID.

### JWT Creation Example (Node.js)

```javascript
const jwt = require('jsonwebtoken');

const secret = Buffer.from(EXTENSION_SECRET, 'base64');

const payload = {
  exp: Math.floor(Date.now() / 1000) + 60,  // 60 seconds
  user_id: EXTENSION_OWNER_ID,
  role: 'external',
  channel_id: CHANNEL_ID,
  pubsub_perms: {
    send: ['broadcast']
  }
};

const token = jwt.sign(payload, secret, { algorithm: 'HS256' });
```

### JWT Verification Example (Node.js)

```javascript
const jwt = require('jsonwebtoken');

const secret = Buffer.from(EXTENSION_SECRET, 'base64');

try {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  console.log('Valid JWT:', decoded);
  console.log('User ID:', decoded.user_id);
  console.log('Channel ID:', decoded.channel_id);
  console.log('Role:', decoded.role);
} catch (err) {
  console.error('Invalid JWT:', err.message);
}
```

### JWT Verification Example (Python)

```python
import jwt
import base64

secret = base64.b64decode(EXTENSION_SECRET)

try:
    decoded = jwt.decode(token, secret, algorithms=['HS256'])
    print('Valid JWT:', decoded)
except jwt.ExpiredSignatureError:
    print('Token expired')
except jwt.InvalidTokenError as e:
    print('Invalid token:', e)
```

---

## Extension Secrets Management

The extension shared secret is used to sign and verify JWTs. It is base64-encoded and managed through the Twitch Developer Console or API.

### Key Points

- The secret is **base64-encoded** — you must decode it before using it for signing/verification.
- Secrets can be **rotated** (a new secret is generated, invalidating the old one).
- Keep the secret **server-side only** — never expose it in frontend code.
- After rotation, existing JWTs signed with the old secret will fail verification.

### Rotate Secret via API

```
POST https://api.twitch.tv/helix/extensions/jwt/secrets
```

**Headers:**

```
Authorization: Bearer <extension-JWT>
Client-Id: <extension-client-id>
```

**Response:**

```json
{
  "data": [
    {
      "format_version": 1,
      "secrets": [
        {
          "content": "<base64-encoded-new-secret>",
          "active_at": "2025-01-01T00:00:00Z",
          "expires_at": "2025-07-01T00:00:00Z"
        }
      ]
    }
  ]
}
```

### Get Current Secrets

```
GET https://api.twitch.tv/helix/extensions/jwt/secrets
```

Returns the currently active secrets. During rotation, there may be two active secrets (old and new) to allow a graceful transition.

### Secret Rotation Best Practices

1. Rotate secrets periodically (e.g., every 6 months).
2. After requesting a new secret, update your EBS immediately.
3. During the transition period, verify JWTs against both old and new secrets.
4. The old secret remains valid until its `expires_at` date.

---

## Bits in Extensions

Extensions can sell digital goods using Bits, Twitch's virtual currency. Viewers spend Bits to unlock in-extension features, and the developer receives a revenue share.

### Setup

1. Enable Bits support in the extension's capabilities on the Developer Console.
2. Create Bits products (SKUs) in the Developer Console or via the API.
3. Implement the Bits flow in the extension frontend using the JS Helper.

### Bits Products

Products define what viewers can purchase.

**Product fields:**

| Field | Type | Description |
|---|---|---|
| `sku` | string | Unique product identifier. |
| `cost.amount` | number | Cost in Bits. |
| `cost.type` | string | `"bits"`. |
| `displayName` | string | Name shown to the viewer. |
| `inDevelopment` | boolean | `true` if the product is in development/testing. |
| `expiration` | string | ISO 8601 expiration date (empty if no expiration). |
| `isBroadcast` | boolean | Whether the transaction is broadcast to all viewers. |

### Bits Flow

#### 1. Check if Bits Are Enabled

```javascript
Twitch.ext.features.onChanged(function() {
  if (Twitch.ext.features.isBitsEnabled) {
    // Show Bits UI
  } else {
    // Hide Bits UI or show a message
  }
});
```

#### 2. Get Available Products

```javascript
Twitch.ext.bits.getProducts().then(function(products) {
  products.forEach(function(product) {
    console.log('SKU:', product.sku);
    console.log('Cost:', product.cost.amount, product.cost.type);
    console.log('Name:', product.displayName);
    console.log('In dev:', product.inDevelopment);
  });
});
```

#### 3. Initiate a Transaction

```javascript
Twitch.ext.bits.useBits('my-product-sku');
// This opens the Twitch Bits transaction dialog
```

#### 4. Handle Transaction Completion

```javascript
Twitch.ext.bits.onTransactionComplete(function(transaction) {
  console.log('Product:', transaction.product);
  console.log('User ID:', transaction.userId);
  console.log('Display Name:', transaction.displayName);
  console.log('Initiator:', transaction.initiator);           // "current_user" or "other"
  console.log('Receipt:', transaction.transactionReceipt);     // Verify on EBS
});
```

**Transaction object:**

| Field | Type | Description |
|---|---|---|
| `product` | object | The product that was purchased (sku, displayName, cost). |
| `userId` | string | Opaque user ID of the buyer. |
| `displayName` | string | Display name of the buyer. |
| `initiator` | string | `"current_user"` or `"other"` (broadcast transactions). |
| `transactionReceipt` | string | JWT receipt — verify this on your EBS for fraud prevention. |

#### 5. Handle Transaction Cancellation

```javascript
Twitch.ext.bits.onTransactionCancelled(function() {
  console.log('Transaction was cancelled by the user');
});
```

### Testing with Loopback

During development, use loopback mode to test Bits without spending real Bits:

```javascript
Twitch.ext.bits.setUseLoopback(true);
// Transactions will complete immediately without actual Bits
```

> **Warning:** Remember to remove `setUseLoopback(true)` before submitting for review. Twitch will reject extensions with loopback enabled.

### Transaction Receipt Verification

Always verify the `transactionReceipt` JWT on your EBS:

```javascript
const jwt = require('jsonwebtoken');
const secret = Buffer.from(EXTENSION_SECRET, 'base64');

try {
  const decoded = jwt.verify(transactionReceipt, secret, { algorithms: ['HS256'] });
  console.log('Valid receipt');
  console.log('Topic:', decoded.topic);        // "bits_transaction_receipt"
  console.log('Data:', decoded.data);
  // decoded.data contains: transactionId, product (sku, cost), userId, time
} catch (err) {
  console.error('Invalid receipt - possible fraud:', err.message);
}
```

---

## Configuration Service

The Configuration Service is a Twitch-hosted key-value store that extensions can use to persist settings without needing a separate backend.

### Segments

| Segment | Who Can Set | Who Can Read | Use Case |
|---|---|---|---|
| `broadcaster` | Broadcaster (via config page) | All viewers on that channel | Per-channel settings. |
| `developer` | Developer (via API/EBS) | All viewers on all channels | Extension-wide defaults. |
| `global` | Developer (via API/EBS) | All viewers on all channels | Identical to developer segment (legacy naming). |

### Limits

- Maximum **5KB** per segment per channel (broadcaster) or per extension (developer/global).
- Content is a string — serialize objects as JSON.

### Setting Configuration (Frontend)

```javascript
// Set broadcaster configuration (from config view or broadcaster dashboard)
Twitch.ext.configuration.set('broadcaster', '1.0', JSON.stringify({
  theme: 'dark',
  layout: 'compact',
  showStats: true
}));
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `segment` | string | `"broadcaster"`, `"developer"`, or `"global"`. |
| `version` | string | Version string for the configuration (free-form, for your tracking). |
| `content` | string | The configuration content (max 5KB). |

### Reading Configuration

Configuration is provided during bootstrap and via the `onChanged` callback:

```javascript
Twitch.ext.configuration.onChanged(function() {
  const broadcasterConfig = Twitch.ext.configuration.broadcaster;
  const developerConfig = Twitch.ext.configuration.developer;
  const globalConfig = Twitch.ext.configuration.global;

  if (broadcasterConfig) {
    console.log('Version:', broadcasterConfig.version);
    const settings = JSON.parse(broadcasterConfig.content);
    console.log('Settings:', settings);
  }
});
```

**Configuration object (per segment):**

| Field | Type | Description |
|---|---|---|
| `version` | string | The version string set when the config was saved. |
| `content` | string | The configuration content string. |

### Setting Configuration via API (EBS)

```
PUT https://api.twitch.tv/helix/extensions/configurations
```

**Headers:**

```
Authorization: Bearer <extension-JWT>
Client-Id: <extension-client-id>
Content-Type: application/json
```

**Body:**

```json
{
  "extension_id": "your-extension-id",
  "segment": "developer",
  "version": "1.0",
  "content": "{\"default_theme\":\"dark\"}"
}
```

For broadcaster segment, include `broadcaster_id`:

```json
{
  "extension_id": "your-extension-id",
  "segment": "broadcaster",
  "broadcaster_id": "12345",
  "version": "1.0",
  "content": "{\"theme\":\"light\"}"
}
```

### Getting Configuration via API

```
GET https://api.twitch.tv/helix/extensions/configurations?extension_id={id}&segment={segment}
```

For broadcaster segment, add `&broadcaster_id={id}`.

---

## Extension API Endpoints (Helix)

All endpoints use the base URL `https://api.twitch.tv/helix` and require an extension JWT in the Authorization header (unless noted otherwise).

### Extension Management

| Endpoint | Method | Description |
|---|---|---|
| `/extensions` | GET | Get information about an extension (by ID and/or version). |
| `/extensions/released` | GET | Get released extension info. |
| `/extensions/live` | GET | Get live channels using the extension. |

#### Get Extensions

```
GET https://api.twitch.tv/helix/extensions?extension_id={id}&extension_version={version}
```

**Response:**

```json
{
  "data": [
    {
      "author_name": "Developer Name",
      "bits_enabled": true,
      "can_install": true,
      "configuration_location": "hosted",
      "description": "Extension description",
      "has_chat_support": false,
      "icon_url": "https://...",
      "id": "extension-id",
      "name": "Extension Name",
      "panel_height": 300,
      "request_identity_link": false,
      "screenshot_urls": ["https://..."],
      "state": "Released",
      "subscriptions_support_level": "none",
      "summary": "Short summary",
      "support_email": "support@example.com",
      "version": "1.0.0",
      "viewer_summary": "Viewer-facing summary",
      "views": {
        "mobile": { "viewer_url": "https://..." },
        "panel": { "viewer_url": "https://...", "height": 300 },
        "video_overlay": { "viewer_url": "https://..." },
        "component": {
          "viewer_url": "https://...",
          "aspect_ratio_x": 1,
          "aspect_ratio_y": 1,
          "autoscale": true,
          "scale_pixels": 100,
          "target_height": 300,
          "zoom": true,
          "zoom_pixels": 100
        }
      },
      "allowlisted_config_urls": [],
      "allowlisted_panel_urls": []
    }
  ]
}
```

### Chat Extensions

| Endpoint | Method | Description |
|---|---|---|
| `/extensions/chat` | POST | Send a message to chat from the extension. |

```
POST https://api.twitch.tv/helix/extensions/chat
```

**Body:**

```json
{
  "broadcaster_id": "12345",
  "text": "Extension message",
  "extension_id": "your-extension-id",
  "extension_version": "1.0.0"
}
```

### PubSub

| Endpoint | Method | Description |
|---|---|---|
| `/extensions/pubsub` | POST | Send PubSub message from EBS. |

*(See Extension PubSub section above for details.)*

### Configuration

| Endpoint | Method | Description |
|---|---|---|
| `/extensions/configurations` | GET | Get extension configuration. |
| `/extensions/configurations` | PUT | Set extension configuration. |
| `/extensions/required_configuration` | PUT | Set required broadcaster configuration status. |

#### Set Required Configuration

Indicates that a broadcaster must configure the extension before it becomes active:

```
PUT https://api.twitch.tv/helix/extensions/required_configuration
```

**Body:**

```json
{
  "broadcaster_id": "12345",
  "extension_id": "your-extension-id",
  "extension_version": "1.0.0",
  "required_configuration": "config_key"
}
```

### Secrets

| Endpoint | Method | Description |
|---|---|---|
| `/extensions/jwt/secrets` | GET | Get current JWT secrets. |
| `/extensions/jwt/secrets` | POST | Create (rotate) a new JWT secret. |

### Bits Products

| Endpoint | Method | Description |
|---|---|---|
| `/bits/extensions` | GET | Get Bits products for the extension. |
| `/bits/extensions` | PUT | Update a Bits product. |

#### Get Extension Bits Products

```
GET https://api.twitch.tv/helix/bits/extensions?extension_id={id}
```

**Query parameters:**

| Parameter | Required | Description |
|---|---|---|
| `extension_id` | Yes | Extension client ID. |
| `should_include_all` | No | Include in-development products (default false). |

#### Update Extension Bits Product

```
PUT https://api.twitch.tv/helix/bits/extensions
```

**Body:**

```json
{
  "extension_id": "your-extension-id",
  "sku": "my-product-sku",
  "cost": {
    "amount": 100,
    "type": "bits"
  },
  "display_name": "Power Up",
  "in_development": false,
  "expiration": "",
  "is_broadcast": true
}
```

### User Extensions

These endpoints use a **user access token** (not an extension JWT).

| Endpoint | Method | Description | Scope |
|---|---|---|---|
| `/users/extensions/list` | GET | Get extensions the user has installed. | `user:read:broadcast` |
| `/users/extensions` | GET | Get active extensions for a user. | `user:read:broadcast` or `user:edit:broadcast` |
| `/users/extensions` | PUT | Update active extensions for a user. | `user:edit:broadcast` |

---

## Rate Limits

Extension API calls have their own rate limits, separate from standard Helix rate limits.

| Context | Rate Limit | Window |
|---|---|---|
| Extension viewer (Helix JWT) | 30 requests per minute | Per extension per viewer |
| EBS (external JWT) | Follows standard Helix limits | Per client ID |
| PubSub broadcast | 100 messages per minute | Per channel |
| PubSub whisper | 60 messages per minute | Per user |
| PubSub message size | 5KB max | Per message |
| Configuration set | Standard Helix limits | Per client ID |
| Configuration size | 5KB max | Per segment |

When rate limits are exceeded, the API returns **HTTP 429 Too Many Requests**.

**Rate limit headers:**

| Header | Description |
|---|---|
| `Ratelimit-Limit` | Maximum number of requests per window. |
| `Ratelimit-Remaining` | Requests remaining in the current window. |
| `Ratelimit-Reset` | Unix timestamp when the window resets. |

---

## Extension Lifecycle

Extensions go through a defined lifecycle from development to release.

### 1. Development (Local Test)

- Create extension in the [Developer Console](https://dev.twitch.tv/console/extensions).
- Set extension type(s), name, description, and capabilities.
- Develop and test locally using the Developer Rig or by loading assets from localhost.
- Testing URL format: `https://localhost.rig.twitch.tv:8080/`
- Only the extension developer can see the extension during this phase.

### 2. Hosted Test

- Upload extension assets (HTML/CSS/JS/images) to Twitch's hosting via the Developer Console.
- Maximum asset zip size: 5MB.
- The extension runs on Twitch infrastructure but is only visible to the developer and invited testers.
- Test on your own channel to verify all functionality.
- Testing checklist:
  - All extension types work correctly (panel, overlay, component, mobile).
  - Configuration pages function properly.
  - Bits transactions complete (use loopback mode or test products).
  - PubSub messages are received.
  - JWT authentication works end-to-end with your EBS.
  - Dark and light theme support.
  - Responsive design for various player sizes.

### 3. Review

- Submit the extension for review via the Developer Console.
- Twitch reviews the extension for:
  - Policy compliance (content, branding, user experience).
  - Security (no data exfiltration, proper JWT handling).
  - Performance (no excessive resource usage).
  - Functionality (works as described).
- Review typically takes **1-2 weeks** (can vary).
- If rejected, you receive feedback and can resubmit after making changes.

### 4. Release

- After approval, the extension is released and available in the Extension Manager.
- Broadcasters can discover, install, and activate the extension.
- You can continue releasing updates (each update goes through review).
- Version management: you can have one released version and one in-review version simultaneously.

### Updating a Released Extension

1. Create a new version in the Developer Console.
2. Upload updated assets.
3. Test in Hosted Test mode.
4. Submit for review.
5. Once approved, the new version replaces the old one for all channels.

> **Note:** The previous version remains active on channels until the new version is approved and released. There is no downtime during updates.

---

## Mobile Extensions

Mobile extensions run within the Twitch mobile app and require specific considerations.

### Design Guidelines

- Use responsive design — mobile screen widths vary significantly.
- Target minimum width of 320px.
- Use touch-friendly targets (minimum 44x44px tap areas).
- Avoid hover-dependent interactions (no hover state on mobile).
- Test on both iOS and Android.
- Consider network conditions (mobile may have slower/unreliable connections).

### Mobile-Specific Behavior

- Mobile extensions render as panels below the video player.
- The `onContext` callback includes mobile-specific fields.
- Some features may not be available on mobile (check `Twitch.ext.features`).
- Video overlay and component types are **not available** on mobile — only panel.

### Enabling Mobile Support

1. In the Developer Console, enable the Mobile view for your extension.
2. Provide a mobile-optimized HTML page (can be the same as the panel page if responsive).
3. Test using the Twitch mobile app with your extension in Hosted Test mode.

```javascript
Twitch.ext.onContext(function(context) {
  if (context.platform === 'mobile') {
    // Apply mobile-specific layout or behavior
  }
});
```

---

## Best Practices & Production Hardening

### Security

1. **Never expose your extension secret in frontend code.** The secret must only exist on your EBS.
2. **Always verify JWTs on your EBS.** Check the signature, expiration, role, and channel_id.
3. **Verify Bits transaction receipts server-side.** Never trust the frontend alone for purchase validation.
4. **Use HTTPS for all EBS endpoints.** Twitch requires it.
5. **Validate and sanitize all user input.** Extensions run in iframes but XSS is still possible.
6. **Set short JWT expirations (30-120 seconds) for EBS-created tokens.**

### Performance

1. **Minimize asset size.** The 5MB upload limit is a hard cap — aim well below it.
2. **Lazy-load non-critical resources.** The extension iframe blocks the channel page load.
3. **Use `onVisibilityChanged` to pause expensive operations** when the extension is not visible.
4. **Batch API requests.** Respect rate limits by combining requests where possible.
5. **Cache configuration and API responses.** Avoid redundant requests on every render.
6. **Minimize DOM updates.** Use requestAnimationFrame for animations.

### User Experience

1. **Support both light and dark themes.** Use `onContext` to detect the theme and adapt.
2. **Handle the "not authorized" state gracefully.** The viewer may not have shared their identity.
3. **Show loading states.** Extensions can take a moment to load — don't show a blank iframe.
4. **Provide a configuration page.** Make it easy for broadcasters to customize the extension.
5. **Handle errors gracefully.** Use `onError` and display user-friendly messages.
6. **Test at various player sizes.** Overlays and components scale with the player.

### Architecture

1. **Design for offline EBS.** If your EBS goes down, the extension should degrade gracefully.
2. **Use the Configuration Service for simple settings** instead of running your own database.
3. **Use PubSub for real-time updates** instead of polling your EBS.
4. **Keep frontend code minimal.** Complex logic should live on your EBS.
5. **Version your EBS API endpoints** to support multiple extension versions during transitions.

### Review Preparation

1. **Write clear, accurate descriptions.** Twitch reviewers check that the extension works as described.
2. **Provide testing instructions** if your extension requires specific setup.
3. **Remove all debug/test code** (console.logs, loopback mode, test products in production).
4. **Include a privacy policy** if your extension collects user data.
5. **Ensure Content Security Policy (CSP) compliance.** Twitch enforces strict CSP on extension iframes.

---

## Known Issues & Community Notes

1. **JWT expiration timing** — The `onAuthorized` callback may fire slightly before the old token expires. Always use the latest token from the most recent callback.

2. **onContext firing order** — `onContext` may fire before `onAuthorized` on initial load. Do not rely on having a valid token in your first `onContext` handler.

3. **PubSub message ordering** — Messages are not guaranteed to arrive in order. Include a sequence number or timestamp in your messages if ordering matters.

4. **PubSub delivery** — PubSub is "at most once" delivery. Messages can be lost if the viewer's connection drops. Design for eventual consistency.

5. **Configuration Service latency** — Configuration updates may take several seconds to propagate to all viewers. Do not use it for real-time state.

6. **Mobile feature parity** — Not all JS Helper features work identically on mobile. Test thoroughly on actual devices.

7. **Iframe sandbox restrictions** — Extensions run in sandboxed iframes. You cannot access `window.top`, `window.parent`, or use `document.cookie`. Local storage and session storage are available but partitioned.

8. **Content Security Policy** — Extensions have a strict CSP. You cannot use inline scripts (`<script>...</script>` with inline code), `eval()`, or load resources from non-allowlisted domains. All external requests must go to your EBS or allowlisted URLs.

9. **Extension uninstall** — There is no callback when a broadcaster uninstalls your extension. If you need to clean up server-side state, use periodic polling or the Get User Extensions endpoint.

10. **Bits testing limitations** — `setUseLoopback(true)` does not perfectly simulate real Bits behavior. Some edge cases (insufficient Bits, network errors during transaction) can only be tested with real Bits.

11. **Rate limit inconsistencies** — The 30 requests/minute per viewer limit applies to Helix calls made with an extension JWT. EBS calls using a standard app access token follow standard Helix rate limits instead.

12. **Review times vary significantly** — While 1-2 weeks is typical, complex extensions or extensions with Bits may take longer. Plan accordingly for release schedules.

---

## Quick Reference Table

### JS Helper Methods

| Method | Description |
|---|---|
| `Twitch.ext.onAuthorized(cb)` | Auth callback — returns token, channelId, clientId, userId. |
| `Twitch.ext.onContext(cb)` | Context changes — theme, game, language, mode, player state. |
| `Twitch.ext.onVisibilityChanged(cb)` | Extension visibility toggled. |
| `Twitch.ext.onHighlightChanged(cb)` | Extension highlight toggled. |
| `Twitch.ext.onPositionChanged(cb)` | Component position changed (component type only). |
| `Twitch.ext.onError(cb)` | Error handler. |
| `Twitch.ext.send(target, type, msg)` | Send PubSub message. |
| `Twitch.ext.listen(target, cb)` | Listen for PubSub messages. |
| `Twitch.ext.unlisten(target, cb)` | Stop listening for PubSub messages. |
| `Twitch.ext.actions.requestIdShare()` | Request viewer identity sharing. |
| `Twitch.ext.actions.minimize()` | Minimize the extension. |
| `Twitch.ext.actions.onFollow(cb)` | Follow button events. |
| `Twitch.ext.viewer.onChanged(cb)` | Viewer state changes. |
| `Twitch.ext.configuration.set(seg, ver, content)` | Set configuration (max 5KB). |
| `Twitch.ext.configuration.onChanged(cb)` | Configuration changed. |
| `Twitch.ext.bits.useBits(sku)` | Start Bits transaction. |
| `Twitch.ext.bits.onTransactionComplete(cb)` | Transaction completed. |
| `Twitch.ext.bits.onTransactionCancelled(cb)` | Transaction cancelled. |
| `Twitch.ext.bits.getProducts()` | Get available Bits products (returns Promise). |
| `Twitch.ext.bits.setUseLoopback(bool)` | Enable/disable test loopback mode. |
| `Twitch.ext.features.onChanged(cb)` | Feature flags changed. |

### Extension API Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/extensions` | GET | Extension JWT | Get extension info. |
| `/extensions/released` | GET | App Access or Extension JWT | Get released extension. |
| `/extensions/live` | GET | App Access or Extension JWT | Get live channels using extension. |
| `/extensions/chat` | POST | Extension JWT | Send chat message. |
| `/extensions/pubsub` | POST | Extension JWT (external) | Send PubSub message. |
| `/extensions/configurations` | GET | Extension JWT (external) | Get configuration. |
| `/extensions/configurations` | PUT | Extension JWT (external) | Set configuration. |
| `/extensions/required_configuration` | PUT | Extension JWT (external) | Set required config status. |
| `/extensions/jwt/secrets` | GET | Extension JWT (external) | Get JWT secrets. |
| `/extensions/jwt/secrets` | POST | Extension JWT (external) | Rotate JWT secret. |
| `/bits/extensions` | GET | App Access Token | Get Bits products. |
| `/bits/extensions` | PUT | App Access Token | Update Bits product. |
| `/users/extensions/list` | GET | User Token (`user:read:broadcast`) | List user's installed extensions. |
| `/users/extensions` | GET | User Token (`user:read:broadcast`) | Get user's active extensions. |
| `/users/extensions` | PUT | User Token (`user:edit:broadcast`) | Update user's active extensions. |

### Extension Limits

| Limit | Value |
|---|---|
| Max panel extensions per channel | 3 |
| Max overlay extensions per channel | 1 |
| Max component extensions per channel | 2 |
| Max asset zip size | 5MB |
| Max configuration segment size | 5KB |
| Max PubSub message size | 5KB |
| PubSub broadcast rate | 100 messages/minute/channel |
| PubSub whisper rate | 60 messages/minute/user |
| API rate limit (extension JWT) | 30 requests/minute/viewer |
| JWT recommended expiration (EBS) | 30-120 seconds |
| Panel width | 318px |
| Panel height | 100-500px |
