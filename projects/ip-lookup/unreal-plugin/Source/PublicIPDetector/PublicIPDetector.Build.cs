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
			"Engine"
		});

		PrivateDependencyModuleNames.AddRange(new string[] { });

		// Platform-specific settings
		if (Target.Platform == UnrealTargetPlatform.Win64)
		{
			PublicSystemLibraries.AddRange(new string[] {
				"iphlpapi.lib",
				"ws2_32.lib"
			});
		}

		// Include miniupnpc source directly (header-only style for simplicity)
		// For production: use precompiled libs from ThirdParty folder
		bEnableUndefinedIdentifierWarnings = false;
		bEnableExceptions = true;
	}
}
