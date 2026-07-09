import { afterEach, describe, expect, it } from "vitest";
import { resolveAiProvider } from "@/lib/ai";

const KEYS = ["AI_PROVIDER", "ANTHROPIC_API_KEY", "OLLAMA_BASE_URL"] as const;
const original: Record<(typeof KEYS)[number], string | undefined> = {
  AI_PROVIDER: undefined,
  ANTHROPIC_API_KEY: undefined,
  OLLAMA_BASE_URL: undefined,
};
for (const key of KEYS) original[key] = process.env[key];

function reset() {
  for (const key of KEYS) delete process.env[key];
}

describe("resolveAiProvider", () => {
  afterEach(() => {
    reset();
    for (const key of KEYS) {
      if (original[key] !== undefined) process.env[key] = original[key];
    }
  });

  it("returns null when nothing is configured", () => {
    reset();
    expect(resolveAiProvider()).toBeNull();
  });

  it("prefers anthropic when only ANTHROPIC_API_KEY is set", () => {
    reset();
    process.env.ANTHROPIC_API_KEY = "sk-test";
    expect(resolveAiProvider()).toBe("anthropic");
  });

  it("falls back to ollama when only OLLAMA_BASE_URL is set", () => {
    reset();
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    expect(resolveAiProvider()).toBe("ollama");
  });

  it("prefers anthropic over ollama when both are configured", () => {
    reset();
    process.env.ANTHROPIC_API_KEY = "sk-test";
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    expect(resolveAiProvider()).toBe("anthropic");
  });

  it("honors an explicit AI_PROVIDER override", () => {
    reset();
    process.env.ANTHROPIC_API_KEY = "sk-test";
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    process.env.AI_PROVIDER = "ollama";
    expect(resolveAiProvider()).toBe("ollama");
  });
});
