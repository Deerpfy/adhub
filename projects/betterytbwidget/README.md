---
title: BetterYTBwidget — YouTube Music Now Playing Widget
version: 1.0.0
last_updated: 2026-02-27
status: active
---

# BetterYTBwidget

OBS browser source overlay that displays the currently playing YouTube Music track. Supports ytmdesktop, OBS Tuna plugin, and manual/demo mode.

## Quick Start

1. Add a **Browser Source** in OBS
2. Set the URL to: `https://deerpfy.github.io/adhub/projects/betterytbwidget/?source=ytmdesktop`
3. Set dimensions based on your chosen size (see table below)
4. Enable **"Shutdown source when not visible"** for performance
5. Done — the widget connects to your locally running YouTube Music Desktop App

## Data Sources

### ytmdesktop (default)

[YouTube Music Desktop App](https://github.com/ytmdesktop/ytmdesktop) exposes a local WebSocket API on port 9863.

**Setup:**
1. Install ytmdesktop v2+
2. Open Settings → Integrations → Enable "Companion Server"
3. Note the port (default: 9863)
4. If authentication is required, generate a token in ytmdesktop settings and pass it via the `token` URL parameter

**URL example:**
```
?source=ytmdesktop&wsport=9863&token=YOUR_TOKEN
```

### OBS Tuna Plugin (fallback)

[Tuna](https://github.com/univrsal/tuna) is an OBS plugin that reads now-playing data from various music players.

**Setup:**
1. Install the Tuna plugin for OBS
2. Enable "Host information on local webserver" in Tuna settings (default port: 1608)
3. Configure Tuna to read from your preferred music source

**URL example:**
```
?source=tuna&tunaport=1608
```

### Manual / Demo Mode

Display a static now-playing card. Useful for testing your layout without running any music player.

**URL example (demo):**
```
?source=manual
```

**URL example (custom):**
```
?source=manual&title=Song%20Name&artist=Artist%20Name&artwork=https://example.com/art.jpg&duration=240
```

## URL Parameters Reference

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `source` | `ytmdesktop`, `tuna`, `manual` | `ytmdesktop` | Data source |
| `wsport` | number | `9863` | ytmdesktop WebSocket port |
| `tunaport` | number | `1608` | Tuna HTTP server port |
| `token` | string | *(empty)* | ytmdesktop auth token |
| `appid` | string | `betterytbwidget` | ytmdesktop app identifier |
| `theme` | `dark`, `light`, `transparent`, `glass` | `glass` | Visual theme |
| `position` | `bottom-left`, `bottom-right`, `top-left`, `top-right`, `center` | `bottom-left` | Widget position in the OBS source |
| `size` | `small`, `medium`, `large` | `medium` | Widget size variant |
| `showTimeline` | `true`, `false` | `true` | Show playback progress bar |
| `showLikes` | `true`, `false` | `true` | Show heart icon when track is liked |
| `showBrand` | `true`, `false` | `true` | Show YouTube Music icon |
| `hideOnPause` | `true`, `false` | `false` | Hide widget when music is paused |
| `showOnSwitch` | number (seconds) | `0` | Show widget only for N seconds on song change (0 = always visible) |
| `animation` | `slide`, `fade`, `pop`, `none` | `slide` | Show/hide animation style |
| `direction` | `up`, `down`, `left`, `right` | `up` | Animation slide direction |
| `title` | string | — | Manual mode: track title |
| `artist` | string | — | Manual mode: artist name |
| `artwork` | URL | — | Manual mode: album art URL |
| `duration` | number (seconds) | `0` | Manual mode: track duration |

## Recommended OBS Browser Source Dimensions

| Size | Width | Height |
|------|-------|--------|
| `small` | 300 | 80 |
| `medium` | 380 | 120 |
| `large` | 460 | 140 |

## Themes

- **glass** — Frosted glass with backdrop blur, semi-transparent background
- **dark** — Solid dark background (#1a1a2e), white text
- **light** — Solid white background, dark text, subtle shadow
- **transparent** — No background, text has drop shadows for readability on any scene

## Features

- Real-time now-playing display (track title, artist, album art)
- Scrolling marquee for long track titles
- Playback timeline with elapsed/total time
- Like/heart indicator
- YouTube Music brand icon
- Four animation styles (slide, fade, pop, none)
- Hide on pause with configurable delay
- Show-on-switch mode (display briefly on song change)
- Automatic reconnection with exponential backoff
- Connection status indicator (green/yellow/red dot)
- Graceful handling of missing album art
- OBS source visibility event support
- Fully client-side — no server, no accounts, no external dependencies

## Architecture

Single `index.html` file with inline CSS and JS. Organized into modules:

| Module | Purpose |
|--------|---------|
| **Config** | URL parameter parsing |
| **UI** | DOM manipulation, track rendering, marquee |
| **Anim** | Show/hide animation controller |
| **YTMDesktop** | WebSocket connection to ytmdesktop |
| **Tuna** | HTTP polling for OBS Tuna plugin |
| **Manual** | Static/demo display mode |

## Troubleshooting

**Widget shows "Connecting to YTM Desktop…"**
- Ensure ytmdesktop is running with Companion Server enabled
- Check that the port matches (default 9863)
- On Windows, allow port 9863 through firewall (TCP inbound + outbound)
- Try using `127.0.0.1` instead of `localhost` (IPv6 issues)

**No album art showing**
- ytmdesktop must be playing a track with artwork available
- Check that thumbnail URLs are accessible from your network

**Widget not appearing in OBS**
- Verify the browser source URL is correct
- Set width/height to recommended values
- Enable "Shutdown source when not visible" and re-show the source

## License

Part of the [AdHub](https://deerpfy.github.io/adhub/) project by Deerpfy.
