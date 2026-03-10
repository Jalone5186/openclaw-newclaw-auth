import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const FAKE_MODELS = [
  { id: "claude-3-opus", object: "model", created: 1700000000, owned_by: "anthropic" },
  { id: "gpt-4o", object: "model", created: 1700000001, owned_by: "openai" },
  { id: "gemini-pro", object: "model", created: 1700000002, owned_by: "google" },
];

describe("fetchModels", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns parsed model array on 200 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ object: "list", data: FAKE_MODELS }),
    }) as unknown as typeof fetch;

    const { fetchModels } = await import("../models.js");
    const result = await fetchModels("sk-test-key");
    expect(result.models).toHaveLength(3);
    expect(result.error).toBeUndefined();
    expect(result.models![0].id).toBe("claude-3-opus");
    expect(result.models![1].owned_by).toBe("openai");
  });

  it("returns invalid_key error on 401 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as unknown as typeof fetch;

    const { fetchModels } = await import("../models.js");
    const result = await fetchModels("sk-bad-key");
    expect(result.models).toBeNull();
    expect(result.error).toBe("invalid_key");
    expect(result.message).toContain("401");
  });

  it("returns network error on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(
      new Error("Network error")
    ) as unknown as typeof fetch;

    const { fetchModels } = await import("../models.js");
    const result = await fetchModels("sk-test-key");
    expect(result.models).toBeNull();
    expect(result.error).toBe("network");
    expect(result.message).toBe("Network error");
  });

  it("returns server error on non-200, non-401 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as unknown as typeof fetch;

    const { fetchModels } = await import("../models.js");
    const result = await fetchModels("sk-test-key");
    expect(result.models).toBeNull();
    expect(result.error).toBe("server");
    expect(result.message).toContain("500");
  });

  it("returns invalid_key error on 403 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    }) as unknown as typeof fetch;

    const { fetchModels } = await import("../models.js");
    const result = await fetchModels("sk-test-key");
    expect(result.models).toBeNull();
    expect(result.error).toBe("invalid_key");
    expect(result.message).toContain("403");
  });

  it("returns timeout error when request is aborted", async () => {
    global.fetch = vi.fn().mockRejectedValue(
      new Error("The operation was aborted")
    ) as unknown as typeof fetch;

    const { fetchModels } = await import("../models.js");
    const result = await fetchModels("sk-test-key");
    expect(result.models).toBeNull();
    expect(result.error).toBe("timeout");
  });
});

describe("toOpenClawModels", () => {
  it("converts NewClawModel array to ModelDefinitionConfig array with vendor-specific defaults", async () => {
    const { toOpenClawModels } = await import("../models.js");
    const result = toOpenClawModels(FAKE_MODELS);
    expect(result).toHaveLength(3);
    for (const m of result) {
      expect(m.api).toBe("openai-completions");
      expect(m.reasoning).toBe(false);
      expect(m.input).toEqual(["text"]);
      expect(typeof m.cost.input).toBe("number");
    }
    // Anthropic → 200k context
    expect(result[0].id).toBe("claude-3-opus");
    expect(result[0].contextWindow).toBe(200_000);
    expect(result[0].maxTokens).toBe(8_192);
    // OpenAI → 128k context
    expect(result[1].contextWindow).toBe(128_000);
    expect(result[1].maxTokens).toBe(16_384);
    // Google → 1M context
    expect(result[2].contextWindow).toBe(1_000_000);
    expect(result[2].maxTokens).toBe(8_192);
  });

  it("maps id and name from model.id", async () => {
    const { toOpenClawModels } = await import("../models.js");
    const result = toOpenClawModels([FAKE_MODELS[0]]);
    expect(result[0].id).toBe("claude-3-opus");
    expect(result[0].name).toBe("claude-3-opus");
  });

  it("uses model-level context_window/max_tokens when present in API response", async () => {
    const { toOpenClawModels } = await import("../models.js");
    const modelWithExtendedFields = {
      ...FAKE_MODELS[0],
      context_window: 500_000,
      max_tokens: 32_000,
    };
    const result = toOpenClawModels([modelWithExtendedFields]);
    expect(result[0].contextWindow).toBe(500_000);
    expect(result[0].maxTokens).toBe(32_000);
  });

  it("falls back to 128k/8k for unknown vendor", async () => {
    const { toOpenClawModels } = await import("../models.js");
    const unknownVendor = { id: "custom-model", object: "model", created: 1700000000, owned_by: "some-unknown-vendor" };
    const result = toOpenClawModels([unknownVendor]);
    expect(result[0].contextWindow).toBe(128_000);
    expect(result[0].maxTokens).toBe(8_192);
  });
});

describe("saveCache / loadCache", () => {
  const tmpHome = path.join(os.tmpdir(), `newclaw-test-${process.pid}`);
  const cacheDir = path.join(tmpHome, ".openclaw", "newclaw");
  const cacheFile = path.join(cacheDir, "models-cache.json");
  const originalHome = os.homedir;

  beforeEach(() => {
    fs.mkdirSync(cacheDir, { recursive: true });
    vi.spyOn(os, "homedir").mockReturnValue(tmpHome);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it("saves and loads cache roundtrip correctly", async () => {
    const { saveCache, loadCache } = await import("../models.js");
    saveCache(FAKE_MODELS);
    const cached = loadCache();
    expect(cached).not.toBeNull();
    expect(cached!.models).toHaveLength(3);
    expect(cached!.models[0].id).toBe("claude-3-opus");
    expect(typeof cached!.fetchedAt).toBe("number");
  });

  it("cache file does not contain API key secrets", async () => {
    const { saveCache } = await import("../models.js");
    saveCache(FAKE_MODELS);
    const raw = fs.readFileSync(cacheFile, "utf-8");
    expect(raw).not.toMatch(/sk-|xai-|AIza/);
    const keys = Object.keys(JSON.parse(raw)).sort();
    expect(keys).toEqual(["fetchedAt", "models"]);
  });

  it("loadCache returns null when file is missing", async () => {
    const { loadCache } = await import("../models.js");
    const result = loadCache();
    expect(result).toBeNull();
  });

  it("loadCache returns null and deletes corrupt file", async () => {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cacheFile, "{ invalid json }", "utf-8");
    const { loadCache } = await import("../models.js");
    const result = loadCache();
    expect(result).toBeNull();
    expect(fs.existsSync(cacheFile)).toBe(false);
  });
});

describe("resolveModels", () => {
  const tmpHome = path.join(os.tmpdir(), `newclaw-resolve-test-${process.pid}`);
  const originalFetch = global.fetch;

  beforeEach(() => {
    fs.mkdirSync(path.join(tmpHome, ".openclaw", "newclaw"), { recursive: true });
    vi.spyOn(os, "homedir").mockReturnValue(tmpHome);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it("fetches and saves to cache on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ object: "list", data: FAKE_MODELS }),
    }) as unknown as typeof fetch;

    const { resolveModels } = await import("../models.js");
    const result = await resolveModels("sk-test");
    expect(result).toHaveLength(3);
  });

  it("falls back to cache when fetch returns null (401)", async () => {
    const cacheFile = path.join(tmpHome, ".openclaw", "newclaw", "models-cache.json");
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({ models: [FAKE_MODELS[0]], fetchedAt: Date.now() }),
      "utf-8"
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as unknown as typeof fetch;

    const { resolveModels } = await import("../models.js");
    const result = await resolveModels("sk-bad-key");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("claude-3-opus");
  });

  it("returns empty array when fetch fails and no cache exists", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as unknown as typeof fetch;

    const { resolveModels } = await import("../models.js");
    const result = await resolveModels("sk-test");
    expect(result).toEqual([]);
  });
});

describe("REFRESH_INTERVAL_MS", () => {
  it("equals 6 hours in milliseconds", async () => {
    const { REFRESH_INTERVAL_MS } = await import("../constants.js");
    expect(REFRESH_INTERVAL_MS).toBe(6 * 60 * 60 * 1000);
  });
});
