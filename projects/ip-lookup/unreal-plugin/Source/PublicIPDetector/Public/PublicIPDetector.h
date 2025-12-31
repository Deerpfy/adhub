#pragma once

#include "Modules/ModuleManager.h"

class FPublicIPDetectorModule : public IModuleInterface
{
public:
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;
};
