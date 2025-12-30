#include "PublicIPBlueprintLibrary.h"
#include "Async/Async.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"

// Platform headers
#if PLATFORM_WINDOWS
	#include "Windows/AllowWindowsPlatformTypes.h"
	#include <winsock2.h>
	#include <ws2tcpip.h>
	#include <iphlpapi.h>
	#include "Windows/HideWindowsPlatformTypes.h"
	#pragma comment(lib, "iphlpapi.lib")
	#pragma comment(lib, "ws2_32.lib")
#else
	#include <sys/types.h>
	#include <sys/socket.h>
	#include <netinet/in.h>
	#include <arpa/inet.h>
	#include <ifaddrs.h>
	#include <netdb.h>
	#include <unistd.h>
	#define SOCKET int
	#define INVALID_SOCKET -1
	#define closesocket close
#endif

//=============================================================================
// STUN Protocol Constants
//=============================================================================

#define STUN_MAGIC_COOKIE 0x2112A442
#define STUN_BINDING_REQUEST 0x0001
#define STUN_BINDING_RESPONSE 0x0101
#define STUN_ATTR_MAPPED_ADDRESS 0x0001
#define STUN_ATTR_XOR_MAPPED_ADDRESS 0x0020

// STUN servery (veřejné, zdarma, bez limitu)
static const char* STUN_SERVERS[] = {
	"stun.l.google.com",
	"stun1.l.google.com",
	"stun.cloudflare.com",
	"stun.services.mozilla.com"
};
static const int STUN_PORT = 3478;

//=============================================================================
// FIPResult Implementation
//=============================================================================

FString FIPResult::Format(EIPFormat InFormat, const FString& Callback) const
{
	if (!bSuccess)
	{
		switch (InFormat)
		{
			case EIPFormat::JSON:
			case EIPFormat::JSONFull:
				return FString::Printf(TEXT("{\"error\":\"%s\"}"), *Error);
			case EIPFormat::JSONP:
				return FString::Printf(TEXT("%s({\"error\":\"%s\"})"), *Callback, *Error);
			default:
				return TEXT("");
		}
	}

	FString SourceStr = UPublicIPBlueprintLibrary::GetSourceName(Source);

	switch (InFormat)
	{
		case EIPFormat::Text:
			return IP;

		case EIPFormat::JSON:
			return FString::Printf(TEXT("{\"ip\":\"%s\"}"), *IP);

		case EIPFormat::JSONFull:
			return FString::Printf(
				TEXT("{\"ip\":\"%s\",\"type\":\"%s\",\"source\":\"%s\"}"),
				*IP,
				bIsIPv6 ? TEXT("ipv6") : TEXT("ipv4"),
				*SourceStr
			);

		case EIPFormat::JSONP:
			return FString::Printf(TEXT("%s({\"ip\":\"%s\"})"), *Callback, *IP);
	}

	return IP;
}

//=============================================================================
// Helper: Get Default Gateway
//=============================================================================

FString UPublicIPBlueprintLibrary::GetDefaultGateway()
{
#if PLATFORM_WINDOWS
	ULONG bufLen = 15000;
	PIP_ADAPTER_INFO adapterInfo = (PIP_ADAPTER_INFO)FMemory::Malloc(bufLen);
	FString Gateway;

	if (GetAdaptersInfo(adapterInfo, &bufLen) == NO_ERROR)
	{
		for (PIP_ADAPTER_INFO adapter = adapterInfo; adapter; adapter = adapter->Next)
		{
			if (adapter->GatewayList.IpAddress.String[0] != '0')
			{
				Gateway = UTF8_TO_TCHAR(adapter->GatewayList.IpAddress.String);
				break;
			}
		}
	}

	FMemory::Free(adapterInfo);
	return Gateway;
#else
	// Linux/Mac - parse /proc/net/route or use netstat
	return TEXT("192.168.1.1"); // Default fallback
#endif
}

//=============================================================================
// Helper: Get Source Name
//=============================================================================

FString UPublicIPBlueprintLibrary::GetSourceName(EIPSource Source)
{
	switch (Source)
	{
		case EIPSource::UPnP: return TEXT("upnp");
		case EIPSource::NATPMP: return TEXT("natpmp");
		case EIPSource::PCP: return TEXT("pcp");
		case EIPSource::IPv6Local: return TEXT("local");
		case EIPSource::STUN: return TEXT("stun");
		case EIPSource::API: return TEXT("api");
		default: return TEXT("unknown");
	}
}

//=============================================================================
// Tier 1: Local IPv6 Detection
//=============================================================================

FIPResult UPublicIPBlueprintLibrary::TryLocalIPv6()
{
	FIPResult Result;
	Result.Source = EIPSource::Failed;

#if PLATFORM_WINDOWS
	WSADATA wsaData;
	WSAStartup(MAKEWORD(2, 2), &wsaData);

	ULONG bufLen = 15000;
	PIP_ADAPTER_ADDRESSES addresses = (PIP_ADAPTER_ADDRESSES)FMemory::Malloc(bufLen);

	if (GetAdaptersAddresses(AF_INET6, GAA_FLAG_INCLUDE_PREFIX, nullptr, addresses, &bufLen) == NO_ERROR)
	{
		for (auto adapter = addresses; adapter; adapter = adapter->Next)
		{
			if (adapter->OperStatus != IfOperStatusUp) continue;

			for (auto unicast = adapter->FirstUnicastAddress; unicast; unicast = unicast->Next)
			{
				auto sockaddr = (sockaddr_in6*)unicast->Address.lpSockaddr;
				char ipStr[INET6_ADDRSTRLEN];
				inet_ntop(AF_INET6, &sockaddr->sin6_addr, ipStr, sizeof(ipStr));

				FString IP = UTF8_TO_TCHAR(ipStr);

				// Public IPv6 starts with 2 or 3
				if (IP.Len() > 0 && (IP[0] == '2' || IP[0] == '3'))
				{
					Result.IP = IP;
					Result.Source = EIPSource::IPv6Local;
					Result.bIsIPv6 = true;
					Result.bSuccess = true;
					FMemory::Free(addresses);
					WSACleanup();
					return Result;
				}
			}
		}
	}

	FMemory::Free(addresses);
	WSACleanup();
#else
	struct ifaddrs* ifaddr;
	if (getifaddrs(&ifaddr) == 0)
	{
		for (auto ifa = ifaddr; ifa; ifa = ifa->ifa_next)
		{
			if (!ifa->ifa_addr || ifa->ifa_addr->sa_family != AF_INET6) continue;

			char ipStr[INET6_ADDRSTRLEN];
			auto sin6 = (sockaddr_in6*)ifa->ifa_addr;
			inet_ntop(AF_INET6, &sin6->sin6_addr, ipStr, sizeof(ipStr));

			FString IP = UTF8_TO_TCHAR(ipStr);
			if (IP.Len() > 0 && (IP[0] == '2' || IP[0] == '3'))
			{
				Result.IP = IP;
				Result.Source = EIPSource::IPv6Local;
				Result.bIsIPv6 = true;
				Result.bSuccess = true;
				freeifaddrs(ifaddr);
				return Result;
			}
		}
		freeifaddrs(ifaddr);
	}
#endif

	Result.Error = TEXT("No public IPv6 found");
	return Result;
}

//=============================================================================
// Tier 1: NAT-PMP Detection (RFC 6886)
//=============================================================================

FIPResult UPublicIPBlueprintLibrary::TryNATPMP()
{
	FIPResult Result;
	Result.Source = EIPSource::Failed;

#if PLATFORM_WINDOWS
	WSADATA wsaData;
	if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0)
	{
		Result.Error = TEXT("WSAStartup failed");
		return Result;
	}

	FString Gateway = GetDefaultGateway();
	if (Gateway.IsEmpty())
	{
		WSACleanup();
		Result.Error = TEXT("No gateway found");
		return Result;
	}

	SOCKET sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
	if (sock == INVALID_SOCKET)
	{
		WSACleanup();
		Result.Error = TEXT("Socket failed");
		return Result;
	}

	// Timeout 1 second
	DWORD timeout = 1000;
	setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (const char*)&timeout, sizeof(timeout));

	sockaddr_in serverAddr;
	serverAddr.sin_family = AF_INET;
	serverAddr.sin_port = htons(5351);
	inet_pton(AF_INET, TCHAR_TO_UTF8(*Gateway), &serverAddr.sin_addr);

	// NAT-PMP request: version(0) + opcode(0)
	uint8 request[2] = { 0, 0 };
	sendto(sock, (const char*)request, 2, 0, (sockaddr*)&serverAddr, sizeof(serverAddr));

	// Response: 12 bytes with IP at offset 8-11
	uint8 response[12];
	int received = recv(sock, (char*)response, sizeof(response), 0);

	closesocket(sock);
	WSACleanup();

	if (received >= 12 && response[0] == 0 && response[1] == 128)
	{
		uint16 resultCode = (response[2] << 8) | response[3];
		if (resultCode == 0)
		{
			Result.IP = FString::Printf(TEXT("%d.%d.%d.%d"),
				response[8], response[9], response[10], response[11]);
			Result.Source = EIPSource::NATPMP;
			Result.bIsIPv6 = false;
			Result.bSuccess = true;
			return Result;
		}
	}

	Result.Error = TEXT("NAT-PMP not supported");
#else
	Result.Error = TEXT("NAT-PMP: platform not implemented");
#endif

	return Result;
}

//=============================================================================
// Tier 1: PCP Detection (RFC 6887)
//=============================================================================

FIPResult UPublicIPBlueprintLibrary::TryPCP()
{
	FIPResult Result;
	Result.Source = EIPSource::Failed;

#if PLATFORM_WINDOWS
	WSADATA wsaData;
	if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0)
	{
		Result.Error = TEXT("WSAStartup failed");
		return Result;
	}

	FString Gateway = GetDefaultGateway();
	if (Gateway.IsEmpty())
	{
		WSACleanup();
		Result.Error = TEXT("No gateway found");
		return Result;
	}

	SOCKET sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
	if (sock == INVALID_SOCKET)
	{
		WSACleanup();
		Result.Error = TEXT("Socket failed");
		return Result;
	}

	DWORD timeout = 1000;
	setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (const char*)&timeout, sizeof(timeout));

	sockaddr_in serverAddr;
	serverAddr.sin_family = AF_INET;
	serverAddr.sin_port = htons(5351);
	inet_pton(AF_INET, TCHAR_TO_UTF8(*Gateway), &serverAddr.sin_addr);

	// PCP ANNOUNCE request (24 bytes)
	uint8 request[24] = {0};
	request[0] = 2;  // Version 2
	request[1] = 0;  // Opcode: ANNOUNCE

	sendto(sock, (const char*)request, 24, 0, (sockaddr*)&serverAddr, sizeof(serverAddr));

	uint8 response[60];
	int received = recv(sock, (char*)response, sizeof(response), 0);

	closesocket(sock);
	WSACleanup();

	if (received >= 24 && response[0] == 2 && response[1] == 128)
	{
		// External IP is at bytes 8-11 for IPv4
		Result.IP = FString::Printf(TEXT("%d.%d.%d.%d"),
			response[8], response[9], response[10], response[11]);
		Result.Source = EIPSource::PCP;
		Result.bIsIPv6 = false;
		Result.bSuccess = true;
		return Result;
	}

	Result.Error = TEXT("PCP not supported");
#else
	Result.Error = TEXT("PCP: platform not implemented");
#endif

	return Result;
}

//=============================================================================
// Tier 1: UPnP Detection
//=============================================================================

FIPResult UPublicIPBlueprintLibrary::TryUPnP()
{
	FIPResult Result;
	Result.Source = EIPSource::Failed;

	// Note: Full UPnP requires miniupnpc library
	// This is a simplified SSDP discovery only

#if PLATFORM_WINDOWS
	WSADATA wsaData;
	if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0)
	{
		Result.Error = TEXT("WSAStartup failed");
		return Result;
	}

	SOCKET sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
	if (sock == INVALID_SOCKET)
	{
		WSACleanup();
		Result.Error = TEXT("Socket failed");
		return Result;
	}

	DWORD timeout = 2000;
	setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (const char*)&timeout, sizeof(timeout));

	BOOL broadcast = TRUE;
	setsockopt(sock, SOL_SOCKET, SO_BROADCAST, (const char*)&broadcast, sizeof(broadcast));

	sockaddr_in destAddr;
	destAddr.sin_family = AF_INET;
	destAddr.sin_port = htons(1900);
	inet_pton(AF_INET, "239.255.255.250", &destAddr.sin_addr);

	const char* ssdpRequest =
		"M-SEARCH * HTTP/1.1\r\n"
		"HOST: 239.255.255.250:1900\r\n"
		"MAN: \"ssdp:discover\"\r\n"
		"MX: 2\r\n"
		"ST: urn:schemas-upnp-org:device:InternetGatewayDevice:1\r\n"
		"\r\n";

	sendto(sock, ssdpRequest, (int)strlen(ssdpRequest), 0,
		(sockaddr*)&destAddr, sizeof(destAddr));

	char buffer[2048];
	sockaddr_in fromAddr;
	int fromLen = sizeof(fromAddr);
	int received = recvfrom(sock, buffer, sizeof(buffer) - 1, 0,
		(sockaddr*)&fromAddr, &fromLen);

	closesocket(sock);
	WSACleanup();

	if (received > 0)
	{
		// Gateway found - need miniupnpc for full SOAP query
		Result.Error = TEXT("UPnP gateway found. Use miniupnpc for full support.");
	}
	else
	{
		Result.Error = TEXT("No UPnP gateway found");
	}
#else
	Result.Error = TEXT("UPnP: use miniupnpc library");
#endif

	return Result;
}

//=============================================================================
// Tier 2: STUN Detection
//=============================================================================

FIPResult UPublicIPBlueprintLibrary::TrySTUN()
{
	FIPResult Result;
	Result.Source = EIPSource::Failed;

#if PLATFORM_WINDOWS
	WSADATA wsaData;
	if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0)
	{
		Result.Error = TEXT("WSAStartup failed");
		return Result;
	}

	for (int serverIdx = 0; serverIdx < 4; serverIdx++)
	{
		const char* stunServer = STUN_SERVERS[serverIdx];

		// Resolve STUN server
		struct addrinfo hints, *res;
		FMemory::Memzero(&hints, sizeof(hints));
		hints.ai_family = AF_INET;
		hints.ai_socktype = SOCK_DGRAM;

		if (getaddrinfo(stunServer, "3478", &hints, &res) != 0)
		{
			continue;
		}

		SOCKET sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
		if (sock == INVALID_SOCKET)
		{
			freeaddrinfo(res);
			continue;
		}

		DWORD timeout = 1000;
		setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (const char*)&timeout, sizeof(timeout));

		// Build STUN Binding Request (20 bytes)
		uint8 request[20];
		FMemory::Memzero(request, sizeof(request));

		// Message Type: Binding Request (0x0001)
		request[0] = 0x00;
		request[1] = 0x01;
		// Message Length: 0
		request[2] = 0x00;
		request[3] = 0x00;
		// Magic Cookie: 0x2112A442
		request[4] = 0x21;
		request[5] = 0x12;
		request[6] = 0xA4;
		request[7] = 0x42;
		// Transaction ID: random 12 bytes
		for (int i = 8; i < 20; i++)
		{
			request[i] = (uint8)(FMath::Rand() & 0xFF);
		}

		sendto(sock, (const char*)request, 20, 0, res->ai_addr, (int)res->ai_addrlen);
		freeaddrinfo(res);

		uint8 response[256];
		int received = recv(sock, (char*)response, sizeof(response), 0);
		closesocket(sock);

		if (received >= 20)
		{
			// Check for Binding Response (0x0101)
			if (response[0] == 0x01 && response[1] == 0x01)
			{
				uint16 msgLen = (response[2] << 8) | response[3];

				// Parse attributes
				int offset = 20;
				while (offset + 4 <= received)
				{
					uint16 attrType = (response[offset] << 8) | response[offset + 1];
					uint16 attrLen = (response[offset + 2] << 8) | response[offset + 3];
					offset += 4;

					if (offset + attrLen > received) break;

					// XOR-MAPPED-ADDRESS (0x0020)
					if (attrType == 0x0020 && attrLen >= 8)
					{
						uint8 family = response[offset + 1];
						if (family == 0x01) // IPv4
						{
							// XOR with magic cookie
							uint8 ip[4];
							ip[0] = response[offset + 4] ^ 0x21;
							ip[1] = response[offset + 5] ^ 0x12;
							ip[2] = response[offset + 6] ^ 0xA4;
							ip[3] = response[offset + 7] ^ 0x42;

							Result.IP = FString::Printf(TEXT("%d.%d.%d.%d"),
								ip[0], ip[1], ip[2], ip[3]);
							Result.Source = EIPSource::STUN;
							Result.bIsIPv6 = false;
							Result.bSuccess = true;
							WSACleanup();
							return Result;
						}
					}
					// MAPPED-ADDRESS (0x0001) - fallback
					else if (attrType == 0x0001 && attrLen >= 8)
					{
						uint8 family = response[offset + 1];
						if (family == 0x01)
						{
							Result.IP = FString::Printf(TEXT("%d.%d.%d.%d"),
								response[offset + 4], response[offset + 5],
								response[offset + 6], response[offset + 7]);
							Result.Source = EIPSource::STUN;
							Result.bIsIPv6 = false;
							Result.bSuccess = true;
							WSACleanup();
							return Result;
						}
					}

					offset += attrLen;
					// Align to 4 bytes
					if (attrLen % 4 != 0) offset += 4 - (attrLen % 4);
				}
			}
		}
	}

	WSACleanup();
	Result.Error = TEXT("STUN detection failed");
#else
	Result.Error = TEXT("STUN: platform not implemented");
#endif

	return Result;
}

//=============================================================================
// Tier 3: HTTP API
//=============================================================================

FIPResult UPublicIPBlueprintLibrary::TryAPI(const FString& URL)
{
	FIPResult Result;
	Result.Source = EIPSource::Failed;

	// Note: This is synchronous - for async use FHttpModule properly
	// This implementation requires HTTP module and is placeholder

	Result.Error = TEXT("Use Unreal HTTP module for API calls");
	return Result;
}

//=============================================================================
// Main Detection Function
//=============================================================================

FIPResult UPublicIPBlueprintLibrary::GetPublicIP(EIPType Type, EDetectionStrategy Strategy)
{
	FIPResult Result;

	// === Handle IPv6 preference ===
	if (Type == EIPType::IPv6 || Type == EIPType::IPv64)
	{
		Result = TryLocalIPv6();
		if (Result.bSuccess)
		{
			UE_LOG(LogTemp, Log, TEXT("[PublicIP] Detected via Local IPv6: %s"), *Result.IP);
			return Result;
		}

		if (Type == EIPType::IPv6)
		{
			Result.Error = TEXT("No public IPv6 available");
			Result.Source = EIPSource::Failed;
			return Result;
		}
	}

	// === TIER 1: Local Detection ===

	// NAT-PMP (fastest, ~100ms)
	Result = TryNATPMP();
	if (Result.bSuccess)
	{
		UE_LOG(LogTemp, Log, TEXT("[PublicIP] Detected via NAT-PMP: %s"), *Result.IP);
		return Result;
	}

	// PCP (similar speed)
	Result = TryPCP();
	if (Result.bSuccess)
	{
		UE_LOG(LogTemp, Log, TEXT("[PublicIP] Detected via PCP: %s"), *Result.IP);
		return Result;
	}

	// UPnP (slower, ~1-2s)
	Result = TryUPnP();
	if (Result.bSuccess)
	{
		UE_LOG(LogTemp, Log, TEXT("[PublicIP] Detected via UPnP: %s"), *Result.IP);
		return Result;
	}

	if (Strategy == EDetectionStrategy::LocalOnly)
	{
		Result.Error = TEXT("Local detection failed (UPnP/NAT-PMP not available)");
		Result.Source = EIPSource::Failed;
		return Result;
	}

	// === TIER 2: STUN ===

	Result = TrySTUN();
	if (Result.bSuccess)
	{
		UE_LOG(LogTemp, Log, TEXT("[PublicIP] Detected via STUN: %s"), *Result.IP);
		return Result;
	}

	if (Strategy == EDetectionStrategy::LocalWithSTUN)
	{
		Result.Error = TEXT("STUN detection failed");
		Result.Source = EIPSource::Failed;
		return Result;
	}

	// === TIER 3: API Fallback ===

	// For Full strategy, use HTTP API
	// This should be implemented with FHttpModule for proper async support

	Result.Error = TEXT("All detection methods failed");
	Result.Source = EIPSource::Failed;
	return Result;
}

//=============================================================================
// Async Wrapper
//=============================================================================

void UPublicIPBlueprintLibrary::GetPublicIPAsync(
	EIPType Type,
	EDetectionStrategy Strategy,
	FOnIPDetected OnComplete)
{
	AsyncTask(ENamedThreads::AnyBackgroundThreadNormalTask, [Type, Strategy, OnComplete]()
	{
		FIPResult Result = GetPublicIP(Type, Strategy);

		AsyncTask(ENamedThreads::GameThread, [Result, OnComplete]()
		{
			OnComplete.ExecuteIfBound(Result);
		});
	});
}

//=============================================================================
// Utilities
//=============================================================================

FString UPublicIPBlueprintLibrary::FormatIPResult(const FIPResult& Result, EIPFormat Format,
	const FString& Callback)
{
	return Result.Format(Format, Callback);
}

bool UPublicIPBlueprintLibrary::IsLocalDetectionAvailable()
{
	FIPResult Result = TryNATPMP();
	if (Result.bSuccess) return true;

	Result = TryPCP();
	if (Result.bSuccess) return true;

	return false;
}
