import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  NEWCLAW_BASE_URL,
  MODELS_ENDPOINT,
  REFRESH_INTERVAL_MS,
  CACHE_DIR,
  CACHE_FILE,
} from "./constants.js";
import type { NewClawModel, ModelCache, FetchModelsResult, FetchErrorKind } from "./types.js";

interface ModelDefinitionConfig {
  id: string;
  name: string;
  api: string;
  reasoning: boolean;
  input: string[];
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
  contextWindow: number;
  maxTokens: number;
}

interface Logger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
}

const CONTEXT_WINDOW_DEFAULTS: Record<string, number> = {
  anthropic: 200_000,
  openai: 128_000,
  google: 1_000_000,
  xai: 131_072,
  deepseek: 64_000,
};

const MAX_TOKENS_DEFAULTS: Record<string, number> = {
  anthropic: 8_192,
  openai: 16_384,
  google: 8_192,
  xai: 8_192,
  deepseek: 8_192,
};

function getCacheFilePath(): string {
  return path.join(os.homedir(), ".openclaw", CACHE_DIR, CACHE_FILE);
}

export async function fetchModels(apiKey: string): Promise<FetchModelsResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const resp = await fetch(`${NEWCLAW_BASE_URL}${MODELS_ENDPOINT}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    if (resp.status === 401) {
      return { models: null, error: "invalid_key", message: "API key is invalid or expired (401)" };
    }
    if (resp.status === 403) {
      return { models: null, error: "invalid_key", message: "API key has no access (403)" };
    }
    if (!resp.ok) {
      return { models: null, error: "server", message: `Server returned HTTP ${resp.status}` };
    }
    const data = (await resp.json()) as { object: string; data: NewClawModel[] };
    return { models: data.data ?? [] };
  } catch (err) {
    const msg = (err as Error).message ?? "Unknown error";
    let error: FetchErrorKind = "network";
    if (msg.includes("abort") || msg.includes("timeout")) error = "timeout";
    return { models: null, error, message: msg };
  } finally {
    clearTimeout(timer);
  }
}

export function toOpenClawModels(models: NewClawModel[]): ModelDefinitionConfig[] {
  return models.map((model) => ({
    id: model.id,
    name: model.id,
    api: "openai-completions",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: model.context_window ?? CONTEXT_WINDOW_DEFAULTS[model.owned_by] ?? 128_000,
    maxTokens: model.max_tokens ?? MAX_TOKENS_DEFAULTS[model.owned_by] ?? 8_192,
  }));
}

export function loadCache(): ModelCache | null {
  const filePath = getCacheFilePath();
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as ModelCache;
    if (!Array.isArray(parsed.models) || typeof parsed.fetchedAt !== "number") {
      fs.unlinkSync(filePath);
      return null;
    }
    return parsed;
  } catch {
    try {
      fs.unlinkSync(filePath);
    } catch {}
    return null;
  }
}

export function saveCache(models: NewClawModel[]): void {
  const filePath = getCacheFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const cache: ModelCache = { models, fetchedAt: Date.now() };
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
}

export async function resolveModels(apiKey: string): Promise<NewClawModel[]> {
  const result = await fetchModels(apiKey);
  if (result.models !== null) {
    saveCache(result.models);
    return result.models;
  }
  const cached = loadCache();
  if (cached) {
    console.warn("NewClaw: using cached models");
    return cached.models;
  }
  console.warn(`NewClaw: no models available — ${result.message ?? result.error ?? "unknown"}`);
  return [];
}

export function startRefreshTimer(
  apiKey: string,
  onUpdate: (models: NewClawModel[]) => void
): ReturnType<typeof setInterval> {
  return setInterval(async () => {
    const models = await resolveModels(apiKey);
    if (models.length > 0) onUpdate(models);
  }, REFRESH_INTERVAL_MS);
}

export function injectModelsConfig(models: NewClawModel[], logger: Logger): void {
  const configPath = path.join(os.homedir(), ".openclaw", "openclaw.json");
  let config: Record<string, unknown> = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Record<string, unknown>;
    }
  } catch {
    logger.warn("NewClaw: openclaw.json parse error — recreating");
    config = {};
  }
  if (!config.models || typeof config.models !== "object") config.models = {};
  const modelsSection = config.models as Record<string, unknown>;
  if (!modelsSection.providers || typeof modelsSection.providers !== "object") modelsSection.providers = {};
  const providers = modelsSection.providers as Record<string, unknown>;
  const existing = (providers.newclaw ?? {}) as Record<string, unknown>;
  providers.newclaw = {
    ...existing,
    baseUrl: `${NEWCLAW_BASE_URL}/v1`,
    api: "openai-completions",
    models: toOpenClawModels(models),
  };
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${configPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), "utf-8");
  fs.renameSync(tmp, configPath);
  logger.info(`NewClaw: injected ${models.length} models into openclaw.json`);
}
