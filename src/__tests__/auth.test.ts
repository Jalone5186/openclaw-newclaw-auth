import { describe, it, expect } from "vitest";
import { buildAuthResult } from "../auth.js";

const ANTHROPIC_MODEL = {
  id: "claude-3-opus",
  object: "model",
  created: 1700000000,
  owned_by: "anthropic",
};
const OPENAI_MODEL = {
  id: "gpt-4o",
  object: "model",
  created: 1700000001,
  owned_by: "openai",
};
const GOOGLE_MODEL = {
  id: "gemini-pro",
  object: "model",
  created: 1700000002,
  owned_by: "google",
};

describe("buildAuthResult", () => {
  it("returns correct top-level shape with all required keys", () => {
    const result = buildAuthResult("sk-universal", {}, [ANTHROPIC_MODEL]);
    const keys = Object.keys(result).sort();
    expect(keys).toContain("profiles");
    expect(keys).toContain("configPatch");
    expect(keys).toContain("defaultModel");
    expect(keys).toContain("notes");
  });

  it("profiles has one entry with OpenClaw-compatible credential shape", () => {
    const result = buildAuthResult("sk-universal", {}, [ANTHROPIC_MODEL]);
    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0].profileId).toBe("newclaw:default");
    expect(result.profiles[0].credential.type).toBe("api_key");
    expect(result.profiles[0].credential.provider).toBe("newclaw");
    expect(result.profiles[0].credential.key).toBe("sk-universal");
  });

  it("configPatch has models.providers.newclaw with correct shape", () => {
    const result = buildAuthResult("sk-universal", {}, [ANTHROPIC_MODEL]);
    const newclaw = result.configPatch!.models.providers["newclaw"];
    expect(newclaw).toBeDefined();
    expect(newclaw.apiKey).toBe("sk-universal");
    expect(newclaw.api).toBe("openai-completions");
    expect(newclaw.baseUrl).toContain("newclaw.ai");
    expect(Array.isArray(newclaw.models)).toBe(true);
  });

  it("no vendor sub-providers when no provider-specific keys given", () => {
    const result = buildAuthResult("sk-universal", {}, [ANTHROPIC_MODEL, OPENAI_MODEL]);
    const providerIds = Object.keys(result.configPatch!.models.providers);
    expect(providerIds).toEqual(["newclaw"]);
  });

  it("creates newclaw-anthropic sub-provider when anthropic key given and models exist", () => {
    const result = buildAuthResult(
      "sk-universal",
      { anthropic: "sk-ant-specific" },
      [ANTHROPIC_MODEL, OPENAI_MODEL]
    );
    const providers = result.configPatch!.models.providers;
    expect(providers["newclaw-anthropic"]).toBeDefined();
    expect(providers["newclaw-anthropic"].apiKey).toBe("sk-ant-specific");
    expect(providers["newclaw-anthropic"].models).toHaveLength(1);
    expect(providers["newclaw-anthropic"].models[0].id).toBe("claude-3-opus");
  });

  it("does not create sub-provider for vendor with key but no matching models", () => {
    const result = buildAuthResult(
      "sk-universal",
      { anthropic: "sk-ant-specific" },
      [OPENAI_MODEL]
    );
    const providerIds = Object.keys(result.configPatch!.models.providers);
    expect(providerIds).not.toContain("newclaw-anthropic");
  });

  it("creates multiple vendor sub-providers when multiple keys given", () => {
    const result = buildAuthResult(
      "sk-universal",
      { anthropic: "sk-ant", google: "AIza-test" },
      [ANTHROPIC_MODEL, GOOGLE_MODEL, OPENAI_MODEL]
    );
    const providers = result.configPatch!.models.providers;
    expect(providers["newclaw-anthropic"]).toBeDefined();
    expect(providers["newclaw-google"]).toBeDefined();
    expect(providers["newclaw"]).toBeDefined();
    expect(providers["newclaw-openai"]).toBeUndefined();
  });

  it("defaultModel uses vendor sub-provider model when vendor key present", () => {
    const result = buildAuthResult(
      "sk-universal",
      { anthropic: "sk-ant" },
      [ANTHROPIC_MODEL, OPENAI_MODEL]
    );
    expect(result.defaultModel).toContain("newclaw-anthropic/");
    expect(result.defaultModel).toContain("claude-3-opus");
  });

  it("defaultModel uses universal provider when no vendor keys given", () => {
    const result = buildAuthResult("sk-universal", {}, [ANTHROPIC_MODEL]);
    expect(result.defaultModel).toContain("newclaw/");
    expect(result.defaultModel).toContain("claude-3-opus");
  });

  it("defaultModel is undefined when models array is empty", () => {
    const result = buildAuthResult("sk-universal", {}, []);
    expect(result.defaultModel).toBeUndefined();
  });

  it("notes is a non-empty array of strings", () => {
    const result = buildAuthResult("sk-universal", {}, [ANTHROPIC_MODEL]);
    expect(Array.isArray(result.notes)).toBe(true);
    expect(result.notes!.length).toBeGreaterThan(0);
    for (const note of result.notes!) {
      expect(typeof note).toBe("string");
    }
  });
});
