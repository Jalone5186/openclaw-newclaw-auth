import { PROVIDER_KEYS, NEWCLAW_BASE_URL } from "./constants.js";
import type { NewClawModel, FetchErrorKind } from "./types.js";
import { fetchModels, saveCache, toOpenClawModels } from "./models.js";

interface ProviderAuthContext {
  prompter: {
    text: (opts: {
      message: string;
      placeholder?: string;
      validate?: (v: string) => string | undefined;
    }) => Promise<string>;
    progress: (msg: string) => { stop: (msg: string) => void };
  };
}

interface ModelProviderConfig {
  baseUrl: string;
  api: string;
  apiKey: string;
  models: ReturnType<typeof toOpenClawModels>;
}

interface AuthProfileCredential {
  type: "api_key" | "token" | "oauth";
  provider: string;
  key?: string;
  token?: string;
}

interface ProviderAuthResult {
  profiles: Array<{ profileId: string; credential: AuthProfileCredential }>;
  configPatch?: {
    models: {
      providers: Record<string, ModelProviderConfig>;
    };
  };
  defaultModel?: string;
  notes?: string[];
}

interface ProviderAuthDefinition {
  id: string;
  label: string;
  hint: string;
  kind: "custom";
  run: (ctx: ProviderAuthContext) => Promise<ProviderAuthResult>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface OpenClawPluginApi {}

export function buildAuth(_api: OpenClawPluginApi): ProviderAuthDefinition[] {
  return [
    {
      id: "setup",
      label: "NewClaw API Key Setup",
      hint: "Configure API keys for NewClaw AI models",
      kind: "custom",
      run: async (ctx: ProviderAuthContext): Promise<ProviderAuthResult> => {
        // Step 1: Universal key (REQUIRED)
        const universalKey = await ctx.prompter.text({
          message: "Enter your NewClaw universal API key (from newclaw.ai)",
          validate: (v) => (v.trim() ? undefined : "API key is required"),
        });

        // Step 1.5: Verify universal key
        const spin = ctx.prompter.progress("Verifying API key...");
        const result = await fetchModels(universalKey.trim());
        if (result.models === null) {
          const errorMessages: Record<FetchErrorKind, string> = {
            invalid_key: "API key is invalid or expired. Please check your key at newclaw.ai",
            network: "Cannot reach NewClaw API. Please check your network connection and try again",
            timeout: "Request timed out. NewClaw API may be temporarily unavailable, please try again later",
            server: `NewClaw API server error: ${result.message ?? "unknown"}. Please try again later`,
            unknown: `Unexpected error: ${result.message ?? "unknown"}`,
          };
          spin.stop("Verification failed");
          throw new Error(errorMessages[result.error ?? "unknown"]);
        }
        const models = result.models;
        spin.stop(`Verified! Found ${models.length} models`);

        // Step 2: Provider-specific keys (ALL OPTIONAL)
        const providerKeys: Record<string, string> = {};
        for (const provider of PROVIDER_KEYS) {
          const key = await ctx.prompter.text({
            message: `${provider.label} specific key (Enter to skip, uses universal key)`,
            placeholder: provider.hint,
          });
          if (key && key.trim()) {
            providerKeys[provider.providerId] = key.trim();
          }
        }

        // Step 3: Save cache (no keys stored) and return result
        saveCache(models);
        return buildAuthResult(universalKey.trim(), providerKeys, models);
      },
    },
  ];
}

export function buildAuthResult(
  universalKey: string,
  providerKeys: Record<string, string>,
  models: NewClawModel[]
): ProviderAuthResult {
  const allConverted = toOpenClawModels(models);

  const providers: Record<string, ModelProviderConfig> = {
    newclaw: {
      baseUrl: `${NEWCLAW_BASE_URL}/v1`,
      api: "openai-completions",
      apiKey: universalKey,
      models: allConverted,
    },
  };

  const vendorProviders: string[] = [];
  for (const providerKey of PROVIDER_KEYS) {
    const specificKey = providerKeys[providerKey.providerId];
    if (!specificKey) continue;
    const vendorModels = models.filter((m) => m.owned_by === providerKey.providerId);
    if (vendorModels.length === 0) continue;
    const subProviderId = `newclaw-${providerKey.providerId}`;
    providers[subProviderId] = {
      baseUrl: `${NEWCLAW_BASE_URL}/v1`,
      api: "openai-completions",
      apiKey: specificKey,
      models: toOpenClawModels(vendorModels),
    };
    vendorProviders.push(subProviderId);
  }

  // Default model: vendor-specific preferred, else universal
  let defaultModel: string | undefined;
  if (vendorProviders.length > 0) {
    const firstVendorId = vendorProviders[0];
    const firstVendorModels = providers[firstVendorId].models;
    if (firstVendorModels.length > 0) {
      defaultModel = `${firstVendorId}/${firstVendorModels[0].id}`;
    }
  }
  if (!defaultModel && allConverted.length > 0) {
    defaultModel = `newclaw/${allConverted[0].id}`;
  }

  const notes: string[] = [
    `Universal provider registered: newclaw (${allConverted.length} models)`,
    ...vendorProviders.map(
      (id) =>
        `Vendor provider registered: ${id} (${providers[id].models.length} models, specific key)`
    ),
  ];

  return {
    profiles: [
      {
        profileId: "newclaw:default",
        credential: { type: "api_key" as const, provider: "newclaw", key: universalKey },
      },
    ],
    configPatch: { models: { providers } },
    defaultModel,
    notes,
  };
}
