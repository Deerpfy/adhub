# BetterStats

Real-time stream statistics overlay for OBS. Displays combined viewer count from Twitch and Kick, session graph, uptime, followers, and current game/category.

## Features

- **Multi-platform**: Twitch (Helix API) + Kick (Pusher WebSocket)
- **OBS overlay**: Transparent background, configurable layout and position
- **Session graph**: SVG mini-chart showing viewer count over time per platform
- **Configurable**: Show/hide stats, compact/expanded/graph layouts, custom scale and theme
- **Secure**: Tokens obfuscated in localStorage, CSP headers, DOM sanitization
- **Graceful degradation**: If one platform fails, the other continues working

## Setup

### Twitch

1. Go to [dev.twitch.tv/console](https://dev.twitch.tv/console) and create an application
2. Set **OAuth Redirect URL** to `https://deerpfy.github.io/adhub/projects/betterstats/index.html` (or your local URL)
3. Copy the **Client ID**
4. In BetterStats, paste the Client ID and click **Connect**
5. Authorize the app on Twitch — you'll be redirected back with your token

### Kick

1. Enter your Kick channel slug (e.g., `xqc`)
2. Enter your numeric channel ID (find it in the page source or network requests)
3. Click **Connect** — real-time data arrives via Pusher WebSocket (no OAuth needed)

### OBS Browser Source

1. Configure your settings in the config panel
2. Click **Generate URL** to get the OBS browser source URL
3. In OBS: Sources → Add → Browser → paste the URL
4. Set dimensions as recommended (typically 280x340 for expanded layout)
5. For Twitch auth in OBS: right-click the source → Interact → click Connect

## Limitations

- Twitch follower count requires `moderator:read:followers` scope (you must be the broadcaster or a moderator)
- Kick official API requires OAuth with client_secret (server-side only) — this tool uses Pusher WebSocket for real-time data instead
- Viewer count from Twitch may lag by up to 2 minutes (API limitation)
- OBS browser source has separate localStorage — Twitch auth must be done within OBS via the Interact window

## Tech Stack

Single HTML file, vanilla JavaScript (ES6+), no build tools, no npm packages. External: Google Fonts (Inter).
