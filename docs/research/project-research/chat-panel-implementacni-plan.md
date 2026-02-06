# Chat Panel - Implementační plán (Master dokument)

> **Projekt:** AdHub Multistream Chat v2
> **Datum:** 2026-02-06
> **Autor:** Analýza pro Deerpfy

---

## Přehled dokumentů

| Dokument | Obsah |
|----------|-------|
| `chat-panel-analyza.md` | Podrobná analýza stávajícího stavu |
| `chat-panel-event-alerts.md` | Návrh event alertů (sub, follow, donate, raid) |
| `chat-panel-obs-api.md` | OBS Browser Source endpoint |
| `chat-panel-streamlabs-import.md` | Streamlabs CSS/HTML import systém |
| **Tento soubor** | Implementační plán a prioritizace |

---

## Fáze implementace

### Fáze 1: Event Alerts bez autentizace (základ)

**Priorita:** Vysoká
**Složitost:** Střední
**Auth:** Ne

| Krok | Popis | Soubory |
|------|-------|---------|
| 1.1 | Rozšířit `NormalizedMessage` o typ `alert` + `alertData` | `adapters/base-adapter.js` |
| 1.2 | Přidat `USERNOTICE` parsing do TwitchAdapter | `adapters/twitch-adapter.js` |
| 1.3 | Přidat `channel.{channelId}` odběr do KickAdapter | `adapters/kick-adapter.js` |
| 1.4 | Přidat `renderAlert()` funkci | `script.js` |
| 1.5 | Přidat CSS pro alerty | `styles.css` |
| 1.6 | Přidat alert nastavení do UI | `index.html`, `script.js` |

**Výsledek Fáze 1:**
- ✅ Twitch: sub, resub, gift sub, raid (přes IRC USERNOTICE)
- ✅ Kick: sub, gift sub, follow, raid/host (přes Pusher `channel.{id}`)
- ❌ Twitch follow, cheer, channel points (vyžadují OAuth)
- ❌ Donace třetích stran

---

### Fáze 2: OBS Browser Source

**Priorita:** Vysoká
**Složitost:** Střední
**Auth:** Ne

| Krok | Popis | Soubory |
|------|-------|---------|
| 2.1 | Vytvořit `obs/` adresář | `obs/index.html` |
| 2.2 | Implementovat `OBSChatView` třídu | `obs/obs-script.js` |
| 2.3 | Vytvořit Streamlabs-kompatibilní CSS | `obs/obs-styles.css` |
| 2.4 | URL parametry pro konfiguraci | `obs/obs-script.js` |
| 2.5 | localStorage sdílení s hlavním panelem | `obs/obs-script.js` |
| 2.6 | "Generate OBS URL" tlačítko v hlavním panelu | `script.js`, `index.html` |

**Výsledek Fáze 2:**
- ✅ Funkční OBS Browser Source URL
- ✅ Transparentní pozadí
- ✅ Konfigurace přes URL parametry
- ✅ Auto-hide zpráv
- ✅ Kompatibilní HTML struktura se Streamlabs

---

### Fáze 3: Streamlabs CSS Import

**Priorita:** Střední
**Složitost:** Střední
**Auth:** Ne

| Krok | Popis | Soubory |
|------|-------|---------|
| 3.1 | Implementovat `StreamlabsStyleManager` | `script.js` (nebo nový soubor) |
| 3.2 | CSS editor v Settings | `index.html`, `styles.css` |
| 3.3 | Template proměnné nahrazení | `StreamlabsStyleManager` |
| 3.4 | Preset šablony (5 stylů) | `script.js` |
| 3.5 | Live preview (iframe) | `script.js` |
| 3.6 | Detekce a konverze Streamlabs CSS | `processStreamlabsCSS()` |

**Výsledek Fáze 3:**
- ✅ Copy-paste CSS ze Streamlabs funguje
- ✅ 5 vestavěných stylových presetů
- ✅ Template proměnné
- ✅ Live preview
- ✅ Nezávislost na Streamlabs

---

### Fáze 4: Twitch EventSub (OAuth)

**Priorita:** Nízká (až po Fázích 1-3)
**Složitost:** Vysoká
**Auth:** Ano (OAuth Implicit Grant)

| Krok | Popis | Soubory |
|------|-------|---------|
| 4.1 | Implementovat OAuth Implicit Grant flow | nový soubor |
| 4.2 | Implementovat `TwitchEventSubManager` | `adapters/twitch-eventsub-adapter.js` |
| 4.3 | Registrace EventSub odběrů | API calls |
| 4.4 | UI pro "Connect with Twitch" | `index.html`, `script.js` |
| 4.5 | Token management (localStorage) | `script.js` |

**Výsledek Fáze 4:**
- ✅ Twitch follow alerty
- ✅ Twitch cheer/bits alerty
- ✅ Channel points redemptions
- ✅ Přesnější sub/resub data

**Prerekvizita:** Twitch Developer aplikace (Client ID) - uživatel si ji musí vytvořit na dev.twitch.tv.

---

### Fáze 5: Donace třetích stran

**Priorita:** Nízká
**Složitost:** Střední
**Auth:** Ano (Socket API token)

| Krok | Popis |
|------|-------|
| 5.1 | Streamlabs Socket.IO donace listener |
| 5.2 | StreamElements WebSocket donace listener |
| 5.3 | UI pro zadání tokenů |

---

## Matice funkcí podle platformy

| Funkce | Twitch (IRC) | Twitch (EventSub) | Kick (Pusher) |
|--------|:----------:|:----------------:|:------------:|
| Chat zprávy | ✅ Fáze 0 | - | ✅ Fáze 0 |
| Subscribe | ✅ Fáze 1 | ✅ Fáze 4 | ✅ Fáze 1 |
| Resub | ✅ Fáze 1 | ✅ Fáze 4 | ✅ Fáze 1 |
| Gift sub | ✅ Fáze 1 | ✅ Fáze 4 | ✅ Fáze 1 |
| Follow | ❌ | ✅ Fáze 4 | ✅ Fáze 1 |
| Raid | ✅ Fáze 1 | ✅ Fáze 4 | ✅ Fáze 1 |
| Cheer/Bits | ❌ | ✅ Fáze 4 | ❌ |
| Channel points | ❌ | ✅ Fáze 4 | ❌ |
| Donace | ❌ | ❌ | ❌ |
| OBS view | ✅ Fáze 2 | ✅ Fáze 2 | ✅ Fáze 2 |
| Custom CSS | ✅ Fáze 3 | ✅ Fáze 3 | ✅ Fáze 3 |

---

## Technické poznámky

### Žádné nové závislosti

Celá implementace je ve vanilla JS/CSS/HTML. Žádný npm, webpack, nebo framework.

### Zpětná kompatibilita

- Stávající funkce chatu zůstává beze změn
- Event alerty jsou opt-in (výchozí: zapnuto, ale lze vypnout)
- OBS view je separátní stránka, neovlivňuje hlavní panel

### Bezpečnost

- Custom CSS nemůže spustit JavaScript
- Všechny user inputy jsou escapovány
- OAuth tokeny uloženy v localStorage (ne v URL)
- Žádné server-side komponenty = žádné bezpečnostní riziko na serveru

### Testování

```bash
# Lokální testování
cd /home/user/adhub
python -m http.server 8000

# Hlavní panel: http://localhost:8000/projects/chat-panel/
# OBS view:    http://localhost:8000/projects/chat-panel/obs/
# OBS s parametry: http://localhost:8000/projects/chat-panel/obs/?channels=twitch:xqc&theme=transparent
```

---

## Rizika a mitigace

| Riziko | Pravděpodobnost | Mitigace |
|--------|----------------|----------|
| Kick změní Pusher klíče | Střední | Automatická detekce + fallback |
| Kick změní event formát | Nízká | Defensive parsing s try/catch |
| Twitch změní IRC USERNOTICE | Velmi nízká | Stabilní protokol od 2016 |
| Streamlabs změní CSS strukturu | Nízká | Naše HTML je nezávislé |
| CORS blokuje Kick API | Vysoká (stávající) | Hardcoded databáze + manuální ID |
| Google Fonts nedostupné | Nízká | Fallback fonty v CSS |
