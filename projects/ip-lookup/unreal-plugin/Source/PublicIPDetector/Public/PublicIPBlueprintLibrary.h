#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "PublicIPTypes.h"
#include "PublicIPBlueprintLibrary.generated.h"

// Delegate pro asynchronní detekci
DECLARE_DYNAMIC_DELEGATE_OneParam(FOnIPDetected, const FIPResult&, Result);

/**
 * Blueprint Function Library pro detekci veřejné IP adresy
 * Používá lokální metody (UPnP/NAT-PMP) - žádné externí servery
 */
UCLASS()
class PUBLICIPDETECTOR_API UPublicIPBlueprintLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	/**
	 * Detekuje veřejnou IP adresu lokálně (přes router)
	 * BLOKUJÍCÍ - použij pro jednoduché případy nebo v loading screen
	 *
	 * @param Type - IPv4, IPv6, nebo IPv64 (preferuje IPv6)
	 * @return Výsledek detekce s IP adresou
	 */
	UFUNCTION(BlueprintCallable, Category = "Public IP|Local Detection",
		meta = (DisplayName = "Get Public IP (Blocking)"))
	static FIPResult GetPublicIP(EIPType Type = EIPType::IPv4);

	/**
	 * Detekuje veřejnou IP adresu asynchronně
	 * NEBLOKUJÍCÍ - doporučeno pro použití během hry
	 *
	 * @param Type - IPv4, IPv6, nebo IPv64
	 * @param OnComplete - Callback když je detekce dokončena
	 */
	UFUNCTION(BlueprintCallable, Category = "Public IP|Local Detection",
		meta = (DisplayName = "Get Public IP (Async)"))
	static void GetPublicIPAsync(EIPType Type, FOnIPDetected OnComplete);

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
	 * Zkontroluje, zda je UPnP/NAT-PMP dostupné na síti
	 * Rychlá kontrola bez plné detekce IP
	 */
	UFUNCTION(BlueprintCallable, Category = "Public IP|Utilities",
		meta = (DisplayName = "Is Local Detection Available"))
	static bool IsLocalDetectionAvailable();

private:
	// Interní detekční metody
	static FIPResult TryUPnP();
	static FIPResult TryNATPMP();
	static FIPResult TryLocalIPv6();
};
