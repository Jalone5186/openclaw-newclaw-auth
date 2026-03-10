import type { ProviderKeyConfig } from "./types.js";

export const NEWCLAW_BASE_URL = "https://newclaw.ai";
export const MODELS_ENDPOINT = "/v1/models";
export const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const CACHE_DIR = "newclaw"; // relative to ~/.openclaw/
export const CACHE_FILE = "models-cache.json";
export const PROVIDER_ID = "newclaw";
export const PROVIDER_LABEL = "NewClaw AI";

export const PROVIDER_KEYS: ProviderKeyConfig[] = [
  { providerId: "anthropic", label: "Claude / Claude Code", envVar: "NEWCLAW_ANTHROPIC_KEY", hint: "sk-ant-..." },
  { providerId: "google", label: "Gemini", envVar: "NEWCLAW_GOOGLE_KEY", hint: "AIza..." },
  { providerId: "openai", label: "GPT / Codex", envVar: "NEWCLAW_OPENAI_KEY", hint: "sk-..." },
  { providerId: "xai", label: "Grok", envVar: "NEWCLAW_XAI_KEY", hint: "xai-..." },
  { providerId: "deepseek", label: "DeepSeek", envVar: "NEWCLAW_DEEPSEEK_KEY", hint: "sk-..." },
];
