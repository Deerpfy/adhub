#include "PublicIPDetector.h"

#define LOCTEXT_NAMESPACE "FPublicIPDetectorModule"

void FPublicIPDetectorModule::StartupModule()
{
	// Plugin startup
}

void FPublicIPDetectorModule::ShutdownModule()
{
	// Plugin shutdown
}

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FPublicIPDetectorModule, PublicIPDetector)
