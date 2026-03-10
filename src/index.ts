import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PROVIDER_ID, PROVIDER_LABEL, PROVIDER_KEYS } from "./constants.js";
import {
  resolveModels,
  toOpenClawModels,
  injectModelsConfig,
  startRefreshTimer,
} from "./models.js";
import { buildAuth } from "./auth.js";

interface OpenClawPluginServiceContext {
  config: Record<string, unknown>;
  workspaceDir?: string;
  stateDir: string;
  logger: { info: (msg: string) => void; warn: (msg: string) => void };
}

interface OpenClawPluginApi {
  registerProvider: (provider: unknown) => void;
  registerService: (service: {
    id: string;
    start: (ctx: OpenClawPluginServiceContext) => void | Promise<void>;
    stop?: (ctx: OpenClawPluginServiceContext) => void | Promise<void>;
  }) => void;
  config: { models?: { providers?: Record<string, unknown> } };
  logger: { info: (msg: string) => void; warn: (msg: string) => void };
  pluginConfig?: Record<string, unknown>;
}

function readApiKeyFromConfig(): string | undefined {
  try {
    const configPath = path.join(os.homedir(), ".openclaw", "openclaw.json");
    if (!fs.existsSync(configPath)) return undefined;
    const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Record<
      string,
      unknown
    >;
    const models = cfg?.models as Record<string, unknown> | undefined;
    const providers = models?.providers as Record<string, unknown> | undefined;
    const newclaw = providers?.newclaw as Record<string, unknown> | undefined;
    const key = newclaw?.apiKey;
    return typeof key === "string" ? key : undefined;
  } catch {
    return undefined;
  }
}

const plugin = {
  id: "openclaw-newclaw-auth",
  name: "NewClaw Auth",
  description: "NewClaw AI API integration — all models through newclaw.ai",
  configSchema: {
    type: "object" as const,
    additionalProperties: false as const,
    properties: {},
  },

  register(api: OpenClawPluginApi) {
    api.registerProvider({
      id: PROVIDER_ID,
      label: PROVIDER_LABEL,
      docsPath: "https://newclaw.ai",
      aliases: ["newclaw", "nc"],
      envVars: ["NEWCLAW_API_KEY", ...PROVIDER_KEYS.map((k) => k.envVar)],
      auth: buildAuth(api),
    });

    const apiKey =
      process.env.NEWCLAW_API_KEY ||
      (api.config.models?.providers?.newclaw as Record<string, unknown> | undefined)
        ?.apiKey as string | undefined ||
      readApiKeyFromConfig();

    if (apiKey) {
      resolveModels(apiKey)
        .then((models) => {
          if (models.length > 0) {
            injectModelsConfig(models, api.logger);
            api.logger.info(`NewClaw: loaded ${models.length} models`);

            if (!api.config.models) api.config.models = { providers: {} };
            if (!api.config.models.providers)
              api.config.models.providers = {};
            api.config.models.providers.newclaw = {
              baseUrl: "https://newclaw.ai/v1",
              api: "openai-completions",
              apiKey,
              models: toOpenClawModels(models),
            };
          }
        })
        .catch((err: Error) => {
          api.logger.warn(`NewClaw: model load failed: ${err.message}`);
        });

      const timer = startRefreshTimer(apiKey, (models) => {
        injectModelsConfig(models, api.logger);
        api.logger.info(`NewClaw: refreshed ${models.length} models`);
      });

      api.registerService({
        id: "newclaw-model-refresh",
        start: (_ctx) => {},
        stop: async (_ctx) => {
          clearInterval(timer);
          api.logger.info("NewClaw: model refresh timer stopped");
        },
      });
    } else {
      api.logger.info(
        "NewClaw: no API key found. Run auth setup to configure."
      );
    }
  },
};

export default plugin;
