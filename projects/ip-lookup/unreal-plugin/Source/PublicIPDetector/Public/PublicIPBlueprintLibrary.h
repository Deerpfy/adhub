#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "PublicIPTypes.h"
#include "PublicIPBlueprintLibrary.generated.h"

// Delegate pro asynchronní detekci
DECLARE_DYNAMIC_DELEGATE_OneParam(FOnIPDetected, const FIPResult&, Result);

/**
 * Blueprint Function Library pro detekci veřejné IP adresy
 * Podporuje lokální metody (UPnP/NAT-PMP/PCP), STUN a API fallback
 */
UCLASS()
class PUBLICIPDETECTOR_API UPublicIPBlueprintLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	/**
	 * Detekuje veřejnou IP adresu
	 * BLOKUJÍCÍ - použij pro jednoduché případy nebo v loading screen
	 *
	 * @param Type - IPv4, IPv6, nebo IPv64 (preferuje IPv6)
	 * @param Strategy - LocalOnly (70%), LocalWithSTUN (95%), Full (99.9%)
	 * @return Výsledek detekce s IP adresou
	 */
	UFUNCTION(BlueprintCallable, Category = "Public IP|Detection",
		meta = (DisplayName = "Get Public IP (Blocking)"))
	static FIPResult GetPublicIP(
		EIPType Type = EIPType::IPv4,
		EDetectionStrategy Strategy = EDetectionStrategy::LocalWithSTUN);

	/**
	 * Detekuje veřejnou IP adresu asynchronně
	 * NEBLOKUJÍCÍ - doporučeno pro použití během hry
	 *
	 * @param Type - IPv4, IPv6, nebo IPv64
	 * @param Strategy - LocalOnly, LocalWithSTUN, nebo Full
	 * @param OnComplete - Callback když je detekce dokončena
	 */
	UFUNCTION(BlueprintCallable, Category = "Public IP|Detection",
		meta = (DisplayName = "Get Public IP (Async)"))
	static void GetPublicIPAsync(
		EIPType Type,
		EDetectionStrategy Strategy,
		FOnIPDetected OnComplete);

	/**
	 * Formátuje IP výsledek do zvoleného formátu
	 *
	 * @param Result - Výsledek z GetPublicIP
	 * @param Format - Text, JSON, JSONFull, nebo JSONP
	 * @param Callback - Název callback funkce pro JSONP
	 * @return Formátovaný string
	 */
	UFUNCTION(BlueprintCallable, BlueprintPure, Category = "Public IP|Formatting",
		meta = (DisplayName = "Format IP Result"))
	static FString FormatIPResult(const FIPResult& Result, EIPFormat Format,
		const FString& Callback = TEXT("callback"));

	/**
	 * Zkontroluje, zda je lokální detekce (UPnP/NAT-PMP) dostupná
	 */
	UFUNCTION(BlueprintCallable, Category = "Public IP|Utilities",
		meta = (DisplayName = "Is Local Detection Available"))
	static bool IsLocalDetectionAvailable();

	/**
	 * Vrátí název zdroje detekce jako string
	 */
	UFUNCTION(BlueprintCallable, BlueprintPure, Category = "Public IP|Utilities",
		meta = (DisplayName = "Get Source Name"))
	static FString GetSourceName(EIPSource Source);

private:
	// Tier 1: Lokální metody (žádný internet)
	static FIPResult TryLocalIPv6();
	static FIPResult TryNATPMP();
	static FIPResult TryPCP();
	static FIPResult TryUPnP();

	// Tier 2: STUN (1 UDP packet)
	static FIPResult TrySTUN();

	// Tier 3: HTTP API
	static FIPResult TryAPI(const FString& URL);

	// Pomocné funkce
	static FString GetDefaultGateway();
};
