import { PROVIDER_ID, PROVIDER_KEYS, NEWCLAW_BASE_URL } from "./constants.js";
import type { NewClawModel, FetchErrorKind } from "./types.js";
import { fetchModels, saveCache, toOpenClawModels } from "./models.js";

interface ProviderAuthContext {
  config: Record<string, unknown>;
  prompter: {
    text: (opts: {
      message: string;
      placeholder?: string;
      validate?: (v: string) => string | undefined;
    }) => Promise<string>;
    select?: <T>(opts: {
      message: string;
      options: Array<{ value: T; label: string; hint?: string }>;
    }) => Promise<T>;
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
    auth?: {
      order?: Record<string, string[]>;
    };
    models: {
      providers: Record<string, ModelProviderConfig>;
    };
    agents?: {
      defaults?: {
        model?: { primary: string };
        models?: Record<string, Record<string, unknown>>;
      };
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

export function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 6) + "****" + key.slice(-4);
}

export function findExistingApiKey(config: Record<string, unknown>): string | undefined {
  const models = config.models as Record<string, unknown> | undefined;
  const providers = models?.providers as Record<string, Record<string, unknown>> | undefined;
  if (!providers) return undefined;

  const key = providers[PROVIDER_ID]?.apiKey;
  if (typeof key === "string" && key.length >= 10) return key;

  for (const pk of PROVIDER_KEYS) {
    const subId = `newclaw-${pk.providerId}`;
    const subKey = providers[subId]?.apiKey;
    if (typeof subKey === "string" && subKey.length >= 10) return subKey;
  }
  return undefined;
}

export function buildAuth(_api: OpenClawPluginApi): ProviderAuthDefinition[] {
  return [
    {
      id: "setup",
      label: "NewClaw API Key Setup",
      hint: "Configure API keys for NewClaw AI models",
      kind: "custom",
      run: async (ctx: ProviderAuthContext): Promise<ProviderAuthResult> => {
        let universalKey: string;

        const existingKey = findExistingApiKey(ctx.config ?? {});

        if (existingKey && ctx.prompter.select) {
          const choice = await ctx.prompter.select<"existing" | "new">({
            message: `Found existing API key (${maskKey(existingKey)}). What would you like to do?`,
            options: [
              { value: "existing", label: "Use existing key", hint: "Update models only, keep current key" },
              { value: "new", label: "Enter a new key" },
            ],
          });

          if (choice === "existing") {
            universalKey = existingKey;
          } else {
            universalKey = await ctx.prompter.text({
              message: "Enter your NewClaw universal API key (from newclaw.ai)",
              validate: (v) => (v.trim() ? undefined : "API key is required"),
            });
            universalKey = universalKey.trim();
          }
        } else if (existingKey) {
          const answer = await ctx.prompter.text({
            message: `Found existing key (${maskKey(existingKey)}). Press Enter to keep it, or paste a new key`,
            placeholder: "Press Enter to keep existing key",
          });
          universalKey = answer.trim() || existingKey;
        } else {
          universalKey = await ctx.prompter.text({
            message: "Enter your NewClaw universal API key (from newclaw.ai)",
            validate: (v) => (v.trim() ? undefined : "API key is required"),
          });
          universalKey = universalKey.trim();
        }

        const spin = ctx.prompter.progress("Verifying API key...");
        const result = await fetchModels(universalKey);
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

        saveCache(models);
        return buildAuthResult(universalKey, providerKeys, models);
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

  const allProviderIds: string[] = [PROVIDER_ID];
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
    allProviderIds.push(subProviderId);
  }

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

  const authOrder: Record<string, string[]> = {};
  for (const id of allProviderIds) {
    authOrder[id] = ["newclaw:default"];
  }

  const modelsConfig: Record<string, Record<string, unknown>> = {};
  for (const id of allProviderIds) {
    for (const model of providers[id].models) {
      modelsConfig[`${id}/${model.id}`] = {};
    }
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
    configPatch: {
      auth: { order: authOrder },
      models: { providers },
      agents: {
        defaults: {
          ...(defaultModel ? { model: { primary: defaultModel } } : {}),
          models: modelsConfig,
        },
      },
    },
    defaultModel,
    notes,
  };
}
