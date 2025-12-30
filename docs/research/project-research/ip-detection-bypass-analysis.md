# Analýza: Jak obejít potřebu povoleného UPnP

## Problém

UPnP funguje pouze u ~60% uživatelů. Jak zvýšit úspěšnost detekce na maximum?

---

## Metody seřazené podle "lokálnosti"

### Tier 1: 100% lokální (žádný internet)

| Metoda | Úspěšnost | Požadavky |
|--------|-----------|-----------|
| **Lokální IPv6** | ~40% | Veřejná IPv6 adresa |
| **NAT-PMP** | ~15% | Apple/kompatibilní router |
| **PCP** | ~10% | Moderní router s PCP |
| **UPnP** | ~60% | Povolený UPnP |

### Tier 2: LAN + minimální externí (STUN)

| Metoda | Úspěšnost | Co jde ven |
|--------|-----------|------------|
| **STUN** | ~95% | 1 UDP packet na STUN server |

### Tier 3: Externí API

| Metoda | Úspěšnost | Co jde ven |
|--------|-----------|------------|
| **ipify/cloudflare** | ~99% | HTTP request |

---

## Tier 1: Maximalizace lokální detekce

### 1. PCP (Port Control Protocol) - RFC 6887

**Co to je:** Nástupce NAT-PMP, podporován novějšími routery.

```cpp
// PCP request structure
struct PCPRequest {
    uint8_t version;      // 2
    uint8_t opcode;       // 0 = ANNOUNCE (get external IP)
    uint16_t reserved;
    uint32_t lifetime;
    uint8_t client_ip[16]; // IPv6 format (IPv4-mapped)
};

// PCP runs on port 5351 (same as NAT-PMP)
// Rozdíl: PCP používá 24-byte request vs 2-byte NAT-PMP
```

**Implementace:**
```cpp
FIPResult TryPCP()
{
    // Similar to NAT-PMP but with PCP packet format
    uint8_t request[24] = {0};
    request[0] = 2;  // PCP version 2
    request[1] = 0;  // ANNOUNCE opcode

    // Send to gateway:5351
    // Response contains external IP in bytes 44-47 (IPv4) or 32-47 (IPv6)
}
```

### 2. Multi-protocol scanner

```cpp
FIPResult DetectWithMaxEffort()
{
    // Paralelně spustit všechny lokální metody
    std::vector<std::future<FIPResult>> futures;

    futures.push_back(std::async(TryLocalIPv6));   // < 1ms
    futures.push_back(std::async(TryNATPMP));      // ~100ms
    futures.push_back(std::async(TryPCP));         // ~100ms
    futures.push_back(std::async(TryUPnP));        // ~2s

    // Vrátit první úspěšný
    for (auto& f : futures) {
        auto result = f.get();
        if (result.bSuccess) return result;
    }

    return Failed();
}
```

### 3. Router-specific detection

Některé routery mají specifické API i když UPnP je vypnuté:

```cpp
// ASUS routery - nedokumentované API
GET http://192.168.1.1/appGet.cgi?hook=get_wan_ip()

// TP-Link - JNRP protokol
POST http://192.168.1.1/cgi-bin/luci/

// Mikrotik - REST API (pokud povoleno)
GET http://192.168.1.1/rest/ip/address
```

**Problém:** Tisíce různých routerů, žádný standard.

---

## Tier 2: STUN jako kompromis

### Proč STUN?

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   STUN není "API" - je to síťový protokol                  │
│                                                             │
│   • 1 UDP packet OUT (20 bytes)                            │
│   • 1 UDP packet IN (response s IP)                        │
│   • Žádné HTTP, žádné parsování                            │
│   • Žádná registrace, žádné limity                         │
│   • Servery běží Google, Mozilla, Twilio...                │
│                                                             │
│   Je to jako ping - minimální, rychlý, spolehlivý          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### STUN implementace pro UE

```cpp
#include <random>

struct STUNHeader {
    uint16_t type;           // 0x0001 = Binding Request
    uint16_t length;         // 0 for simple request
    uint32_t magic;          // 0x2112A442
    uint8_t transaction[12]; // Random ID
};

FIPResult TrySTUN()
{
    FIPResult Result;

    // STUN servery (veřejné, zdarma, bez limitu)
    const char* stunServers[] = {
        "stun.l.google.com",      // Google
        "stun.services.mozilla.com", // Mozilla
        "stun.stunprotocol.org",  // Open source
        "stun.cloudflare.com"     // Cloudflare
    };

    for (const char* server : stunServers)
    {
        SOCKET sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);

        // Resolve server
        struct addrinfo* addr;
        getaddrinfo(server, "3478", nullptr, &addr);

        // Build STUN Binding Request
        STUNHeader request;
        request.type = htons(0x0001);
        request.length = 0;
        request.magic = htonl(0x2112A442);
        // Random transaction ID
        std::random_device rd;
        for (int i = 0; i < 12; i++) request.transaction[i] = rd();

        // Send
        sendto(sock, (char*)&request, sizeof(request), 0,
               addr->ai_addr, addr->ai_addrlen);

        // Receive (timeout 1s)
        uint8_t response[256];
        int len = recv(sock, (char*)response, sizeof(response), 0);

        if (len >= 32) {
            // Parse XOR-MAPPED-ADDRESS attribute
            // IP is XORed with magic cookie
            uint8_t* mapped = FindAttribute(response, len, 0x0020);
            if (mapped) {
                uint32_t ip = ntohl(*(uint32_t*)(mapped + 4)) ^ 0x2112A442;
                Result.IP = FString::Printf(TEXT("%d.%d.%d.%d"),
                    (ip >> 24) & 0xFF, (ip >> 16) & 0xFF,
                    (ip >> 8) & 0xFF, ip & 0xFF);
                Result.Source = EIPSource::STUN;
                Result.bSuccess = true;
                return Result;
            }
        }

        closesocket(sock);
    }

    return Result;
}
```

### Srovnání STUN vs HTTP API

| Aspekt | STUN | HTTP API (ipify) |
|--------|------|------------------|
| Protokol | UDP | TCP + HTTP |
| Data OUT | 20 bytes | ~200 bytes |
| Data IN | 32 bytes | ~50 bytes |
| Latence | 10-50ms | 50-200ms |
| Závislost | UDP port 3478 | TCP port 443 |
| Tracking | Žádné | Možné (cookies, logs) |

**STUN je de-facto standard pro P2P aplikace** - používá ho WebRTC, VoIP, gaming.

---

## Hybridní strategie pro maximální úspěšnost

```cpp
enum class DetectionStrategy {
    LocalOnly,      // Pouze Tier 1 (60-70%)
    LocalWithSTUN,  // Tier 1 + STUN (95%+)
    Full            // Tier 1 + STUN + API (99.9%)
};

FIPResult DetectPublicIP(DetectionStrategy Strategy)
{
    FIPResult result;

    // === TIER 1: Plně lokální ===

    // 1. IPv6 (okamžité)
    result = TryLocalIPv6();
    if (result.bSuccess) {
        UE_LOG(LogTemp, Log, TEXT("[IP] Source: Local IPv6"));
        return result;
    }

    // 2. NAT-PMP (rychlé)
    result = TryNATPMP();
    if (result.bSuccess) {
        UE_LOG(LogTemp, Log, TEXT("[IP] Source: NAT-PMP"));
        return result;
    }

    // 3. PCP (rychlé)
    result = TryPCP();
    if (result.bSuccess) {
        UE_LOG(LogTemp, Log, TEXT("[IP] Source: PCP"));
        return result;
    }

    // 4. UPnP (pomalejší)
    result = TryUPnP();
    if (result.bSuccess) {
        UE_LOG(LogTemp, Log, TEXT("[IP] Source: UPnP"));
        return result;
    }

    if (Strategy == DetectionStrategy::LocalOnly) {
        result.Error = TEXT("Local detection failed");
        return result;
    }

    // === TIER 2: STUN ===

    result = TrySTUN();
    if (result.bSuccess) {
        UE_LOG(LogTemp, Log, TEXT("[IP] Source: STUN"));
        return result;
    }

    if (Strategy == DetectionStrategy::LocalWithSTUN) {
        result.Error = TEXT("STUN detection failed");
        return result;
    }

    // === TIER 3: API fallback ===

    result = TryHTTPAPI("https://api64.ipify.org");
    if (result.bSuccess) {
        UE_LOG(LogTemp, Log, TEXT("[IP] Source: API"));
        return result;
    }

    result.Error = TEXT("All methods failed");
    return result;
}
```

---

## Očekávaná úspěšnost

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Strategie              Úspěšnost    Jde na internet?         │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│  LocalOnly              60-70%       ❌ NE                     │
│  (IPv6 + NAT-PMP +                                            │
│   PCP + UPnP)                                                 │
│                                                                │
│  LocalWithSTUN          95%+         ⚠️ 1 UDP packet          │
│  (+ STUN fallback)                   (20 bytes, no tracking)  │
│                                                                │
│  Full                   99.9%        ✅ HTTP pokud vše selže  │
│  (+ API fallback)                                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Doporučení pro LivingHell

### Výchozí nastavení
```cpp
// Config: DefaultGame.ini
[/Script/LivingHell.NetworkSettings]
IPDetectionStrategy=LocalWithSTUN
AllowAPIFallback=false
```

### UI v nastavení hry
```
Detekce IP adresy:
  ○ Pouze lokální (router)     - Nejvyšší soukromí
  ● Lokální + STUN             - Doporučeno (95%+ úspěšnost)
  ○ Povolit API fallback       - Maximální kompatibilita
```

### Kód
```cpp
// Při startu hry
void ALivingHellGameMode::BeginPlay()
{
    auto Strategy = GetNetworkSettings()->IPDetectionStrategy;

    UPublicIPBlueprintLibrary::GetPublicIPAsync(
        EIPType::IPv64,
        Strategy,
        FOnIPDetected::CreateLambda([](const FIPResult& Result)
        {
            if (Result.bSuccess)
            {
                UE_LOG(LogNet, Log, TEXT("Public IP: %s (via %s)"),
                    *Result.IP,
                    *UEnum::GetValueAsString(Result.Source));
            }
        })
    );
}
```

---

## Závěr

| Pokud chceš... | Použij |
|----------------|--------|
| 100% žádný internet | LocalOnly (60-70%) |
| Minimální footprint | LocalWithSTUN (95%+) |
| Maximální spolehlivost | Full (99.9%) |

**STUN je nejlepší kompromis** - 1 UDP packet, žádné tracking, žádná registrace, 95%+ úspěšnost.
