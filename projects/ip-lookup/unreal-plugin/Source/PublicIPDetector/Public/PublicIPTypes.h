#pragma once

#include "CoreMinimal.h"
#include "PublicIPTypes.generated.h"

// Výstupní formát IP adresy
UENUM(BlueprintType)
enum class EIPFormat : uint8
{
	Text        UMETA(DisplayName = "Text (203.0.113.45)"),
	JSON        UMETA(DisplayName = "JSON ({\"ip\":\"...\"})"),
	JSONFull    UMETA(DisplayName = "JSON Full (with source & type)"),
	JSONP       UMETA(DisplayName = "JSONP (callback({...}))")
};

// Typ požadované IP adresy
UENUM(BlueprintType)
enum class EIPType : uint8
{
	IPv4        UMETA(DisplayName = "IPv4 Only"),
	IPv6        UMETA(DisplayName = "IPv6 Only"),
	IPv64       UMETA(DisplayName = "IPv6 preferred, IPv4 fallback")
};

// Zdroj detekce IP
UENUM(BlueprintType)
enum class EIPSource : uint8
{
	UPnP        UMETA(DisplayName = "UPnP (Router)"),
	NATPMP      UMETA(DisplayName = "NAT-PMP (Router)"),
	IPv6Local   UMETA(DisplayName = "Local IPv6"),
	Failed      UMETA(DisplayName = "Detection Failed")
};

// Výsledek detekce IP
USTRUCT(BlueprintType)
struct PUBLICIPDETECTOR_API FIPResult
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Public IP")
	FString IP;

	UPROPERTY(BlueprintReadOnly, Category = "Public IP")
	EIPSource Source = EIPSource::Failed;

	UPROPERTY(BlueprintReadOnly, Category = "Public IP")
	bool bIsIPv6 = false;

	UPROPERTY(BlueprintReadOnly, Category = "Public IP")
	bool bSuccess = false;

	UPROPERTY(BlueprintReadOnly, Category = "Public IP")
	FString Error;

	// Formátování výstupu
	FString Format(EIPFormat InFormat, const FString& Callback = TEXT("callback")) const;
};
