---
title: "C++ Local IP Detection - Kompletní řešení"
version: 1.0.0
last_updated: 2026-02-17
status: needs-review
---

# C++ Local IP Detection - Kompletní řešení

## Knihovny (battle-tested, open-source)

| Knihovna | Protokol | Licence | Použití |
|----------|----------|---------|---------|
| [miniupnpc](https://github.com/miniupnp/miniupnp) | UPnP | BSD | qBittorrent, Transmission, libTorrent |
| [libnatpmp](https://github.com/miniupnp/libnatpmp) | NAT-PMP | BSD | Apple ecosystem, VLC |

## Instalace

### Windows (vcpkg)
```bash
vcpkg install miniupnpc
vcpkg install libnatpmp
```

### Linux
```bash
sudo apt install libminiupnpc-dev libnatpmp-dev
```

### macOS
```bash
brew install miniupnpc libnatpmp
```

### Unreal Engine (source integration)
```
1. Stáhnout https://github.com/miniupnp/miniupnp/tree/master/miniupnpc
2. Přidat do Source/ThirdParty/miniupnpc/
3. Upravit Build.cs
```

---

## Kompletní C++ implementace

### Header: `PublicIPDetector.h`

```cpp
#pragma once

#include <string>
#include <functional>

// Výstupní formáty (jako ipify)
enum class IPFormat {
    Text,       // "203.0.113.45"
    JSON,       // {"ip":"203.0.113.45"}
    JSONFull,   // {"ip":"203.0.113.45","type":"ipv4","source":"upnp"}
    JSONP       // callback({"ip":"203.0.113.45"})
};

// Typ IP adresy
enum class IPType {
    IPv4,       // Pouze IPv4
    IPv6,       // Pouze IPv6
    IPv64       // Preferovat IPv6, fallback IPv4
};

// Zdroj detekce
enum class IPSource {
    UPnP,       // Router UPnP
    NATPMP,     // Router NAT-PMP
    IPv6Local,  // Lokální veřejná IPv6
    API,        // Externí API (fallback)
    Failed      // Nepodařilo se
};

struct IPResult {
    std::string ip;
    IPSource source;
    bool isIPv6;
    std::string error;

    bool IsValid() const { return !ip.empty() && source != IPSource::Failed; }

    // Formátování výstupu
    std::string Format(IPFormat format, const std::string& callback = "callback") const;
};

class PublicIPDetector {
public:
    // Synchronní detekce
    static IPResult Detect(IPType type = IPType::IPv4, bool allowAPIFallback = false);

    // Asynchronní detekce (pro Unreal)
    static void DetectAsync(
        std::function<void(const IPResult&)> callback,
        IPType type = IPType::IPv4,
        bool allowAPIFallback = false
    );

private:
    static IPResult TryUPnP();
    static IPResult TryNATPMP();
    static IPResult TryLocalIPv6();
    static IPResult TryAPI(IPType type);

    static bool IsPublicIPv6(const std::string& ip);
    static bool IsValidIPv4(const std::string& ip);
};
```

### Implementace: `PublicIPDetector.cpp`

```cpp
#include "PublicIPDetector.h"

// UPnP
#include <miniupnpc/miniupnpc.h>
#include <miniupnpc/upnpcommands.h>

// NAT-PMP
#include <natpmp.h>

// Systémové
#ifdef _WIN32
    #include <winsock2.h>
    #include <ws2tcpip.h>
    #include <iphlpapi.h>
    #pragma comment(lib, "iphlpapi.lib")
    #pragma comment(lib, "ws2_32.lib")
#else
    #include <ifaddrs.h>
    #include <netinet/in.h>
    #include <arpa/inet.h>
#endif

#include <thread>
#include <sstream>
#include <regex>

//=============================================================================
// Formátování výstupu
//=============================================================================

std::string IPResult::Format(IPFormat format, const std::string& callback) const {
    if (!IsValid()) {
        switch (format) {
            case IPFormat::JSON:
            case IPFormat::JSONFull:
                return "{\"error\":\"" + error + "\"}";
            case IPFormat::JSONP:
                return callback + "({\"error\":\"" + error + "\"})";
            default:
                return "";
        }
    }

    std::string sourceStr;
    switch (source) {
        case IPSource::UPnP: sourceStr = "upnp"; break;
        case IPSource::NATPMP: sourceStr = "natpmp"; break;
        case IPSource::IPv6Local: sourceStr = "local"; break;
        case IPSource::API: sourceStr = "api"; break;
        default: sourceStr = "unknown";
    }

    switch (format) {
        case IPFormat::Text:
            return ip;

        case IPFormat::JSON:
            return "{\"ip\":\"" + ip + "\"}";

        case IPFormat::JSONFull:
            return "{\"ip\":\"" + ip + "\","
                   "\"type\":\"" + (isIPv6 ? "ipv6" : "ipv4") + "\","
                   "\"source\":\"" + sourceStr + "\"}";

        case IPFormat::JSONP:
            return callback + "({\"ip\":\"" + ip + "\"})";
    }
    return ip;
}

//=============================================================================
// UPnP Detekce
//=============================================================================

IPResult PublicIPDetector::TryUPnP() {
    IPResult result;
    result.source = IPSource::Failed;

    // Discover UPnP devices (timeout 2000ms)
    int error = 0;
    UPNPDev* devlist = upnpDiscover(2000, nullptr, nullptr, 0, 0, 2, &error);

    if (!devlist) {
        result.error = "UPnP discovery failed";
        return result;
    }

    // Find valid Internet Gateway Device
    char lanAddr[64] = {0};
    UPNPUrls urls;
    IGDdatas data;

    int status = UPNP_GetValidIGD(devlist, &urls, &data, lanAddr, sizeof(lanAddr));

    if (status != 1) {
        freeUPNPDevlist(devlist);
        result.error = "No UPnP gateway found";
        return result;
    }

    // Get external IP address
    char externalIP[40] = {0};
    int r = UPNP_GetExternalIPAddress(
        urls.controlURL,
        data.first.servicetype,
        externalIP
    );

    FreeUPNPUrls(&urls);
    freeUPNPDevlist(devlist);

    if (r != 0 || strlen(externalIP) == 0) {
        result.error = "Failed to get external IP via UPnP";
        return result;
    }

    // Ověření, že není CGNAT (100.64.x.x - 100.127.x.x)
    if (strncmp(externalIP, "100.", 4) == 0) {
        int secondOctet = atoi(externalIP + 4);
        if (secondOctet >= 64 && secondOctet <= 127) {
            result.error = "CGNAT detected, IP is not public";
            return result;
        }
    }

    // Ověření, že není privátní
    if (strncmp(externalIP, "10.", 3) == 0 ||
        strncmp(externalIP, "192.168.", 8) == 0 ||
        strncmp(externalIP, "172.", 4) == 0) {
        result.error = "Private IP returned, double NAT?";
        return result;
    }

    result.ip = externalIP;
    result.source = IPSource::UPnP;
    result.isIPv6 = false;
    return result;
}

//=============================================================================
// NAT-PMP Detekce
//=============================================================================

IPResult PublicIPDetector::TryNATPMP() {
    IPResult result;
    result.source = IPSource::Failed;

    natpmp_t natpmp;

    // Inicializace
    if (initnatpmp(&natpmp, 0, 0) < 0) {
        result.error = "NAT-PMP init failed";
        return result;
    }

    // Poslat request
    if (sendpublicaddressrequest(&natpmp) < 0) {
        closenatpmp(&natpmp);
        result.error = "NAT-PMP request failed";
        return result;
    }

    // Čekat na odpověď (max 5 sekund)
    natpmpresp_t response;
    int r;

    for (int i = 0; i < 50; i++) {
        r = readnatpmpresponseorretry(&natpmp, &response);
        if (r == 0) break;
        if (r != NATPMP_TRYAGAIN) break;
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }

    closenatpmp(&natpmp);

    if (r != 0) {
        result.error = "NAT-PMP response timeout";
        return result;
    }

    // Konverze IP na string
    struct in_addr addr;
    addr.s_addr = response.pnu.publicaddress.addr.s_addr;
    char* ipStr = inet_ntoa(addr);

    if (!ipStr) {
        result.error = "NAT-PMP invalid response";
        return result;
    }

    result.ip = ipStr;
    result.source = IPSource::NATPMP;
    result.isIPv6 = false;
    return result;
}

//=============================================================================
// Lokální IPv6 Detekce
//=============================================================================

bool PublicIPDetector::IsPublicIPv6(const std::string& ip) {
    // Veřejné IPv6 začínají na 2xxx: nebo 3xxx:
    if (ip.length() < 4) return false;
    char first = ip[0];
    return (first == '2' || first == '3');
}

IPResult PublicIPDetector::TryLocalIPv6() {
    IPResult result;
    result.source = IPSource::Failed;

#ifdef _WIN32
    // Windows implementace
    ULONG bufLen = 15000;
    PIP_ADAPTER_ADDRESSES addresses = (PIP_ADAPTER_ADDRESSES)malloc(bufLen);

    if (GetAdaptersAddresses(AF_INET6, GAA_FLAG_INCLUDE_PREFIX, nullptr, addresses, &bufLen) == NO_ERROR) {
        for (auto adapter = addresses; adapter; adapter = adapter->Next) {
            if (adapter->OperStatus != IfOperStatusUp) continue;

            for (auto unicast = adapter->FirstUnicastAddress; unicast; unicast = unicast->Next) {
                auto sockaddr = (sockaddr_in6*)unicast->Address.lpSockaddr;
                char ipStr[INET6_ADDRSTRLEN];
                inet_ntop(AF_INET6, &sockaddr->sin6_addr, ipStr, sizeof(ipStr));

                if (IsPublicIPv6(ipStr)) {
                    result.ip = ipStr;
                    result.source = IPSource::IPv6Local;
                    result.isIPv6 = true;
                    free(addresses);
                    return result;
                }
            }
        }
    }
    free(addresses);

#else
    // Linux/macOS implementace
    struct ifaddrs* ifaddr;
    if (getifaddrs(&ifaddr) == 0) {
        for (auto ifa = ifaddr; ifa; ifa = ifa->ifa_next) {
            if (!ifa->ifa_addr) continue;
            if (ifa->ifa_addr->sa_family != AF_INET6) continue;

            char ipStr[INET6_ADDRSTRLEN];
            auto sin6 = (sockaddr_in6*)ifa->ifa_addr;
            inet_ntop(AF_INET6, &sin6->sin6_addr, ipStr, sizeof(ipStr));

            if (IsPublicIPv6(ipStr)) {
                result.ip = ipStr;
                result.source = IPSource::IPv6Local;
                result.isIPv6 = true;
                freeifaddrs(ifaddr);
                return result;
            }
        }
        freeifaddrs(ifaddr);
    }
#endif

    result.error = "No public IPv6 found";
    return result;
}

//=============================================================================
// API Fallback (volitelné)
//=============================================================================

IPResult PublicIPDetector::TryAPI(IPType type) {
    IPResult result;
    result.source = IPSource::Failed;

    // Toto vyžaduje HTTP knihovnu (curl, WinHTTP, nebo Unreal HTTP modul)
    // Pro Unreal Engine použijte FHttpModule

    result.error = "API fallback not implemented - use Unreal FHttpModule";
    return result;
}

//=============================================================================
// Hlavní detekce
//=============================================================================

IPResult PublicIPDetector::Detect(IPType type, bool allowAPIFallback) {
    IPResult result;

    // 1. Pokud chceme IPv6, zkusit lokální IPv6 první
    if (type == IPType::IPv6 || type == IPType::IPv64) {
        result = TryLocalIPv6();
        if (result.IsValid()) return result;

        if (type == IPType::IPv6) {
            // Pouze IPv6, nemáme fallback
            result.error = "No public IPv6 available";
            result.source = IPSource::Failed;
            return result;
        }
    }

    // 2. UPnP (nejčastěji podporováno)
    result = TryUPnP();
    if (result.IsValid()) return result;

    // 3. NAT-PMP (Apple/některé routery)
    result = TryNATPMP();
    if (result.IsValid()) return result;

    // 4. API fallback (pokud povoleno)
    if (allowAPIFallback) {
        result = TryAPI(type);
        if (result.IsValid()) return result;
    }

    result.error = "All local detection methods failed";
    result.source = IPSource::Failed;
    return result;
}

void PublicIPDetector::DetectAsync(
    std::function<void(const IPResult&)> callback,
    IPType type,
    bool allowAPIFallback
) {
    std::thread([callback, type, allowAPIFallback]() {
        IPResult result = Detect(type, allowAPIFallback);
        callback(result);
    }).detach();
}
```

---

## Unreal Engine integrace

### `PublicIPDetector.Build.cs`

```csharp
using UnrealBuildTool;
using System.IO;

public class PublicIPDetector : ModuleRules
{
    public PublicIPDetector(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[] {
            "Core",
            "CoreUObject",
            "Engine",
            "HTTP"  // Pro API fallback
        });

        // miniupnpc
        string ThirdPartyPath = Path.Combine(ModuleDirectory, "../ThirdParty");

        PublicIncludePaths.Add(Path.Combine(ThirdPartyPath, "miniupnpc/include"));

        if (Target.Platform == UnrealTargetPlatform.Win64)
        {
            PublicAdditionalLibraries.Add(Path.Combine(ThirdPartyPath, "miniupnpc/lib/Win64/miniupnpc.lib"));
            PublicAdditionalLibraries.Add("iphlpapi.lib");
            PublicAdditionalLibraries.Add("ws2_32.lib");
        }
        else if (Target.Platform == UnrealTargetPlatform.Linux)
        {
            PublicAdditionalLibraries.Add(Path.Combine(ThirdPartyPath, "miniupnpc/lib/Linux/libminiupnpc.a"));
        }
    }
}
```

### Blueprint-friendly wrapper

```cpp
UCLASS()
class UPublicIPBlueprintLibrary : public UBlueprintFunctionLibrary
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Network")
    static void GetPublicIP(
        EIPType Type,
        EIPFormat Format,
        bool AllowAPIFallback,
        FOnIPDetected OnComplete  // Delegate
    );
};
```

---

## Použití

### Základní
```cpp
// Jednoduchá detekce
IPResult result = PublicIPDetector::Detect();
if (result.IsValid()) {
    UE_LOG(LogTemp, Log, TEXT("Public IP: %s (source: %s)"),
        *FString(result.ip.c_str()),
        *FString(result.source == IPSource::UPnP ? "UPnP" : "NAT-PMP"));
}
```

### S formátováním
```cpp
IPResult result = PublicIPDetector::Detect(IPType::IPv4);

// Text: "203.0.113.45"
FString text = result.Format(IPFormat::Text);

// JSON: {"ip":"203.0.113.45"}
FString json = result.Format(IPFormat::JSON);

// Full JSON: {"ip":"203.0.113.45","type":"ipv4","source":"upnp"}
FString full = result.Format(IPFormat::JSONFull);

// JSONP: myCallback({"ip":"203.0.113.45"})
FString jsonp = result.Format(IPFormat::JSONP, "myCallback");
```

### Asynchronní (doporučeno pro UE)
```cpp
PublicIPDetector::DetectAsync([](const IPResult& result) {
    // Callback na background thread!
    AsyncTask(ENamedThreads::GameThread, [result]() {
        // Zpracování na game thread
        if (result.IsValid()) {
            GEngine->AddOnScreenDebugMessage(-1, 5.f, FColor::Green,
                FString::Printf(TEXT("IP: %s"), *FString(result.ip.c_str())));
        }
    });
}, IPType::IPv64, false);
```

---

## Testování

```cpp
void TestIPDetection() {
    std::cout << "=== IP Detection Test ===" << std::endl;

    // Test UPnP
    auto upnp = PublicIPDetector::TryUPnP();
    std::cout << "UPnP: " << (upnp.IsValid() ? upnp.ip : upnp.error) << std::endl;

    // Test NAT-PMP
    auto natpmp = PublicIPDetector::TryNATPMP();
    std::cout << "NAT-PMP: " << (natpmp.IsValid() ? natpmp.ip : natpmp.error) << std::endl;

    // Test IPv6
    auto ipv6 = PublicIPDetector::TryLocalIPv6();
    std::cout << "IPv6: " << (ipv6.IsValid() ? ipv6.ip : ipv6.error) << std::endl;

    // Automatická detekce
    auto result = PublicIPDetector::Detect(IPType::IPv64);
    std::cout << "\nResult: " << result.Format(IPFormat::JSONFull) << std::endl;
}
```

---

## Reference

- [miniupnpc GitHub](https://github.com/miniupnp/miniupnp/tree/master/miniupnpc)
- [libnatpmp GitHub](https://github.com/miniupnp/libnatpmp)
- [UPnP Device Architecture](http://upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf)
- [NAT-PMP RFC 6886](https://tools.ietf.org/html/rfc6886)
