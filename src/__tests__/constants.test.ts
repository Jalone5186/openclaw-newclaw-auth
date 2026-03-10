import { describe, it, expect } from "vitest";
import {
  PROVIDER_KEYS,
  NEWCLAW_BASE_URL,
  REFRESH_INTERVAL_MS,
  PROVIDER_ID,
  PROVIDER_LABEL,
} from "../constants.js";

describe("PROVIDER_KEYS", () => {
  it("has exactly 5 entries", () => {
    expect(PROVIDER_KEYS).toHaveLength(5);
  });

  it("has correct provider IDs", () => {
    const ids = PROVIDER_KEYS.map((k) => k.providerId);
    expect(ids).toEqual(["anthropic", "google", "openai", "xai", "deepseek"]);
  });

  it("each entry has required shape", () => {
    for (const k of PROVIDER_KEYS) {
      expect(typeof k.providerId).toBe("string");
      expect(typeof k.label).toBe("string");
      expect(typeof k.envVar).toBe("string");
      expect(typeof k.hint).toBe("string");
      expect(k.providerId.length).toBeGreaterThan(0);
      expect(k.label.length).toBeGreaterThan(0);
      expect(k.envVar.length).toBeGreaterThan(0);
    }
  });

  it("envVars are prefixed with NEWCLAW_", () => {
    for (const k of PROVIDER_KEYS) {
      expect(k.envVar).toMatch(/^NEWCLAW_/);
    }
  });
});

describe("NEWCLAW_BASE_URL", () => {
  it("equals https://newclaw.ai", () => {
    expect(NEWCLAW_BASE_URL).toBe("https://newclaw.ai");
  });
});

describe("REFRESH_INTERVAL_MS", () => {
  it("equals 6 hours in milliseconds", () => {
    expect(REFRESH_INTERVAL_MS).toBe(6 * 60 * 60 * 1000);
    expect(REFRESH_INTERVAL_MS).toBe(21_600_000);
  });
});

describe("PROVIDER_ID and PROVIDER_LABEL", () => {
  it("PROVIDER_ID equals newclaw", () => {
    expect(PROVIDER_ID).toBe("newclaw");
  });

  it("PROVIDER_LABEL equals NewClaw AI", () => {
    expect(PROVIDER_LABEL).toBe("NewClaw AI");
  });
});
