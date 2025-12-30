#include "PublicIPBlueprintLibrary.h"
#include "Async/Async.h"

// Platform headers
#if PLATFORM_WINDOWS
	#include "Windows/AllowWindowsPlatformTypes.h"
	#include <winsock2.h>
	#include <ws2tcpip.h>
	#include <iphlpapi.h>
	#include "Windows/HideWindowsPlatformTypes.h"
#else
	#include <sys/types.h>
	#include <sys/socket.h>
	#include <netinet/in.h>
	#include <arpa/inet.h>
	#include <ifaddrs.h>
	#include <netdb.h>
	#include <unistd.h>
#endif

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

	FString SourceStr;
	switch (Source)
	{
		case EIPSource::UPnP: SourceStr = TEXT("upnp"); break;
		case EIPSource::NATPMP: SourceStr = TEXT("natpmp"); break;
		case EIPSource::IPv6Local: SourceStr = TEXT("local"); break;
		default: SourceStr = TEXT("unknown");
	}

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
// UPnP Detection (Simplified - uses SSDP discovery)
//=============================================================================

FIPResult UPublicIPBlueprintLibrary::TryUPnP()
{
	FIPResult Result;
	Result.Source = EIPSource::Failed;

#if PLATFORM_WINDOWS
	// SSDP Discovery
	WSADATA wsaData;
	if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0)
	{
		Result.Error = TEXT("WSAStartup failed");
		return Result;
	}

	SOCKET sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
	if (sock == INVALID_SOCKET)
	{
		Result.Error = TEXT("Socket creation failed");
		WSACleanup();
		return Result;
	}

	// Set timeout
	DWORD timeout = 2000; // 2 seconds
	setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (const char*)&timeout, sizeof(timeout));

	// Enable broadcast
	BOOL broadcast = TRUE;
	setsockopt(sock, SOL_SOCKET, SO_BROADCAST, (const char*)&broadcast, sizeof(broadcast));

	// SSDP Multicast address
	sockaddr_in destAddr;
	destAddr.sin_family = AF_INET;
	destAddr.sin_port = htons(1900);
	inet_pton(AF_INET, "239.255.255.250", &destAddr.sin_addr);

	// SSDP M-SEARCH request for Internet Gateway Device
	const char* ssdpRequest =
		"M-SEARCH * HTTP/1.1\r\n"
		"HOST: 239.255.255.250:1900\r\n"
		"MAN: \"ssdp:discover\"\r\n"
		"MX: 2\r\n"
		"ST: urn:schemas-upnp-org:device:InternetGatewayDevice:1\r\n"
		"\r\n";

	sendto(sock, ssdpRequest, (int)strlen(ssdpRequest), 0,
		(sockaddr*)&destAddr, sizeof(destAddr));

	// Receive response
	char buffer[2048];
	sockaddr_in fromAddr;
	int fromLen = sizeof(fromAddr);

	int received = recvfrom(sock, buffer, sizeof(buffer) - 1, 0,
		(sockaddr*)&fromAddr, &fromLen);

	closesocket(sock);
	WSACleanup();

	if (received > 0)
	{
		buffer[received] = '\0';
		FString Response = UTF8_TO_TCHAR(buffer);

		// Found a gateway - now we need to query it for external IP
		// This is a simplified version - full implementation would parse
		// the LOCATION header and make SOAP request

		// For now, get the gateway's IP (router IP)
		char gatewayIP[INET_ADDRSTRLEN];
		inet_ntop(AF_INET, &fromAddr.sin_addr, gatewayIP, INET_ADDRSTRLEN);

		// TODO: Implement full UPnP SOAP request to get external IP
		// For production, use miniupnpc library

		Result.Error = TEXT("UPnP gateway found, but SOAP query not implemented. Use miniupnpc.");
		return Result;
	}

	Result.Error = TEXT("No UPnP gateway found");

#else
	// Linux/Mac implementation
	int sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
	if (sock < 0)
	{
		Result.Error = TEXT("Socket creation failed");
		return Result;
	}

	// Set timeout
	struct timeval tv;
	tv.tv_sec = 2;
	tv.tv_usec = 0;
	setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

	// SSDP Multicast
	struct sockaddr_in destAddr;
	memset(&destAddr, 0, sizeof(destAddr));
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

	sendto(sock, ssdpRequest, strlen(ssdpRequest), 0,
		(struct sockaddr*)&destAddr, sizeof(destAddr));

	char buffer[2048];
	struct sockaddr_in fromAddr;
	socklen_t fromLen = sizeof(fromAddr);

	ssize_t received = recvfrom(sock, buffer, sizeof(buffer) - 1, 0,
		(struct sockaddr*)&fromAddr, &fromLen);

	close(sock);

	if (received > 0)
	{
		Result.Error = TEXT("UPnP gateway found, but SOAP query not implemented. Use miniupnpc.");
		return Result;
	}

	Result.Error = TEXT("No UPnP gateway found");
#endif

	return Result;
}

//=============================================================================
// NAT-PMP Detection
//=============================================================================

FIPResult UPublicIPBlueprintLibrary::TryNATPMP()
{
	FIPResult Result;
	Result.Source = EIPSource::Failed;

	// NAT-PMP runs on port 5351 of the default gateway
	// Request format: 2 bytes (version=0, opcode=0 for public address request)

#if PLATFORM_WINDOWS
	WSADATA wsaData;
	if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0)
	{
		Result.Error = TEXT("WSAStartup failed");
		return Result;
	}

	// Get default gateway
	ULONG bufLen = 15000;
	PIP_ADAPTER_INFO adapterInfo = (PIP_ADAPTER_INFO)malloc(bufLen);
	if (GetAdaptersInfo(adapterInfo, &bufLen) != NO_ERROR)
	{
		free(adapterInfo);
		WSACleanup();
		Result.Error = TEXT("Failed to get adapter info");
		return Result;
	}

	FString GatewayIP;
	for (PIP_ADAPTER_INFO adapter = adapterInfo; adapter; adapter = adapter->Next)
	{
		if (adapter->GatewayList.IpAddress.String[0] != '0')
		{
			GatewayIP = UTF8_TO_TCHAR(adapter->GatewayList.IpAddress.String);
			break;
		}
	}
	free(adapterInfo);

	if (GatewayIP.IsEmpty())
	{
		WSACleanup();
		Result.Error = TEXT("No default gateway found");
		return Result;
	}

	// Create UDP socket
	SOCKET sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
	if (sock == INVALID_SOCKET)
	{
		WSACleanup();
		Result.Error = TEXT("Socket creation failed");
		return Result;
	}

	// Set timeout
	DWORD timeout = 1000;
	setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (const char*)&timeout, sizeof(timeout));

	// NAT-PMP server address (gateway:5351)
	sockaddr_in serverAddr;
	serverAddr.sin_family = AF_INET;
	serverAddr.sin_port = htons(5351);
	inet_pton(AF_INET, TCHAR_TO_UTF8(*GatewayIP), &serverAddr.sin_addr);

	// NAT-PMP public address request: version(0) + opcode(0)
	uint8 request[2] = { 0, 0 };
	sendto(sock, (const char*)request, 2, 0, (sockaddr*)&serverAddr, sizeof(serverAddr));

	// Response: version(1) + opcode(1) + result(2) + epoch(4) + public_ip(4)
	uint8 response[12];
	int received = recv(sock, (char*)response, sizeof(response), 0);

	closesocket(sock);
	WSACleanup();

	if (received >= 12)
	{
		// Check result code (bytes 2-3)
		uint16 resultCode = (response[2] << 8) | response[3];
		if (resultCode == 0)
		{
			// Extract public IP (bytes 8-11)
			char ipStr[INET_ADDRSTRLEN];
			snprintf(ipStr, sizeof(ipStr), "%d.%d.%d.%d",
				response[8], response[9], response[10], response[11]);

			Result.IP = UTF8_TO_TCHAR(ipStr);
			Result.Source = EIPSource::NATPMP;
			Result.bIsIPv6 = false;
			Result.bSuccess = true;
			return Result;
		}
	}

	Result.Error = TEXT("NAT-PMP not supported by router");

#else
	// Linux/Mac - similar implementation
	Result.Error = TEXT("NAT-PMP not implemented on this platform yet");
#endif

	return Result;
}

//=============================================================================
// Local IPv6 Detection
//=============================================================================

FIPResult UPublicIPBlueprintLibrary::TryLocalIPv6()
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

	ULONG bufLen = 15000;
	PIP_ADAPTER_ADDRESSES addresses = (PIP_ADAPTER_ADDRESSES)malloc(bufLen);

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

				// Check if public IPv6 (starts with 2 or 3)
				if (IP.Len() > 0 && (IP[0] == '2' || IP[0] == '3'))
				{
					Result.IP = IP;
					Result.Source = EIPSource::IPv6Local;
					Result.bIsIPv6 = true;
					Result.bSuccess = true;
					free(addresses);
					WSACleanup();
					return Result;
				}
			}
		}
	}

	free(addresses);
	WSACleanup();
	Result.Error = TEXT("No public IPv6 found");

#else
	struct ifaddrs* ifaddr;
	if (getifaddrs(&ifaddr) == 0)
	{
		for (auto ifa = ifaddr; ifa; ifa = ifa->ifa_next)
		{
			if (!ifa->ifa_addr) continue;
			if (ifa->ifa_addr->sa_family != AF_INET6) continue;

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
	Result.Error = TEXT("No public IPv6 found");
#endif

	return Result;
}

//=============================================================================
// Public API
//=============================================================================

FIPResult UPublicIPBlueprintLibrary::GetPublicIP(EIPType Type)
{
	FIPResult Result;

	// 1. If IPv6 requested, try local IPv6 first
	if (Type == EIPType::IPv6 || Type == EIPType::IPv64)
	{
		Result = TryLocalIPv6();
		if (Result.bSuccess) return Result;

		if (Type == EIPType::IPv6)
		{
			Result.Error = TEXT("No public IPv6 available");
			Result.Source = EIPSource::Failed;
			return Result;
		}
	}

	// 2. Try NAT-PMP (faster)
	Result = TryNATPMP();
	if (Result.bSuccess) return Result;

	// 3. Try UPnP
	Result = TryUPnP();
	if (Result.bSuccess) return Result;

	// 4. All methods failed
	Result.Error = TEXT("All local detection methods failed. Consider using miniupnpc library for full UPnP support.");
	Result.Source = EIPSource::Failed;
	return Result;
}

void UPublicIPBlueprintLibrary::GetPublicIPAsync(EIPType Type, FOnIPDetected OnComplete)
{
	// Run detection on background thread
	AsyncTask(ENamedThreads::AnyBackgroundThreadNormalTask, [Type, OnComplete]()
	{
		FIPResult Result = GetPublicIP(Type);

		// Return result on game thread
		AsyncTask(ENamedThreads::GameThread, [Result, OnComplete]()
		{
			OnComplete.ExecuteIfBound(Result);
		});
	});
}

FString UPublicIPBlueprintLibrary::FormatIPResult(const FIPResult& Result, EIPFormat Format,
	const FString& Callback)
{
	return Result.Format(Format, Callback);
}

bool UPublicIPBlueprintLibrary::IsLocalDetectionAvailable()
{
	// Quick check - try to find a gateway
	FIPResult Result = TryNATPMP();
	if (Result.bSuccess) return true;

	// Could add UPnP discovery check here
	return false;
}
