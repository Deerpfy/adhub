# Public IP Detector - Unreal Engine Plugin

Detekce veřejné IP adresy **lokálně bez externích serverů** pomocí UPnP a NAT-PMP.

## Funkce

- ✅ **100% lokální** - žádné ipify, cloudflare, ani jiné API
- ✅ **UPnP** - dotaz na router (podporuje ~60% routerů)
- ✅ **NAT-PMP** - Apple protokol (rychlejší, méně rozšířený)
- ✅ **IPv6** - detekce veřejné IPv6 z lokálních rozhraní
- ✅ **Blueprint ready** - nody pro snadné použití
- ✅ **Async** - neblokuje game thread

## Instalace

1. Zkopíruj složku `PublicIPDetector` do `YourProject/Plugins/`
2. Regeneruj projekt files (pravý klik na .uproject → Generate)
3. Zapni plugin v Edit → Plugins → PublicIPDetector

### Pro plnou UPnP podporu (doporučeno)

Základní verze obsahuje NAT-PMP a IPv6 detekci. Pro plnou UPnP podporu:

1. Stáhni [miniupnpc](https://github.com/miniupnp/miniupnp/releases)
2. Zkompiluj pro tvou platformu
3. Přidej do `Source/ThirdParty/miniupnpc/`
4. Uprav `PublicIPDetector.Build.cs`

## Použití v Blueprints

### Synchronní (blokující)

```
Get Public IP (Blocking)
├── Type: IPv4 / IPv6 / IPv64
└── Return: IP Result
        ├── IP: "203.0.113.45"
        ├── Source: UPnP / NATPMP / IPv6Local
        ├── Is IPv6: false
        └── Success: true
```

### Asynchronní (doporučeno)

```
Get Public IP (Async)
├── Type: IPv4
└── On Complete (Event)
        └── Result: IP Result
```

### Formátování

```
Format IP Result
├── Result: (from detection)
├── Format: Text / JSON / JSONFull / JSONP
├── Callback: "myCallback"
└── Return: String

Výstupy:
- Text:     "203.0.113.45"
- JSON:     {"ip":"203.0.113.45"}
- JSONFull: {"ip":"203.0.113.45","type":"ipv4","source":"upnp"}
- JSONP:    myCallback({"ip":"203.0.113.45"})
```

## Použití v C++

```cpp
#include "PublicIPBlueprintLibrary.h"

// Synchronní
FIPResult Result = UPublicIPBlueprintLibrary::GetPublicIP(EIPType::IPv4);
if (Result.bSuccess)
{
    UE_LOG(LogTemp, Log, TEXT("IP: %s"), *Result.IP);
    UE_LOG(LogTemp, Log, TEXT("JSON: %s"), *Result.Format(EIPFormat::JSONFull));
}

// Asynchronní
UPublicIPBlueprintLibrary::GetPublicIPAsync(
    EIPType::IPv64,
    FOnIPDetected::CreateLambda([](const FIPResult& Result)
    {
        if (Result.bSuccess)
        {
            GEngine->AddOnScreenDebugMessage(-1, 5.f, FColor::Green, Result.IP);
        }
    })
);
```

## Jak to funguje

```
┌─────────────────────────────────────────────┐
│              Tvůj PC (Hra)                  │
│                                             │
│  GetPublicIP()                              │
│       │                                     │
│       ├─► TryLocalIPv6()  ──► Lokální NIC   │  < 1ms
│       │                                     │
│       ├─► TryNATPMP()     ──► Router:5351   │  ~100ms
│       │                       (UDP)         │
│       │                                     │
│       └─► TryUPnP()       ──► Router:1900   │  ~1-2s
│                               (SSDP/SOAP)   │
└──────────────────┬──────────────────────────┘
                   │
                   │ Lokální síť (LAN)
                   │
┌──────────────────▼──────────────────────────┐
│              Router                         │
│                                             │
│  • Zná svou veřejnou IP (od ISP)           │
│  • Odpovídá na UPnP/NAT-PMP dotazy         │
│                                             │
└─────────────────────────────────────────────┘

❌ Žádný traffic na internet
❌ Žádné externí API
✅ Vše v lokální síti
```

## Omezení

| Scénář | Funguje? |
|--------|----------|
| Domácí síť s UPnP | ✅ Ano |
| Domácí síť bez UPnP | ⚠️ Jen IPv6 |
| Firemní síť | ❌ Většinou ne |
| Veřejná WiFi | ❌ Ne |
| Mobilní data | ❌ Ne (CGNAT) |
| VPN | ⚠️ Záleží na konfiguraci |

**Doporučení:** Přidej volitelný API fallback pro uživatele bez UPnP.

## Licence

MIT - volně použitelné i komerčně.

## Kontakt

- GitHub: https://github.com/Deerpfy/adhub
- Projekt: AdHUB IP Lookup
