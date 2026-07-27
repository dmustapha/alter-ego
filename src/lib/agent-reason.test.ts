// src/lib/agent-reason.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

// Mock the llm module BEFORE importing agent-reason
vi.mock("./llm", () => ({
  llmAvailable: vi.fn(),
  llmChat: vi.fn(),
}));

import { reasonReply } from "./agent-reason";
import { llmAvailable, llmChat } from "./llm";

const mockLlmAvailable = vi.mocked(llmAvailable);
const mockLlmChat = vi.mocked(llmChat);

afterEach(() => {
  vi.clearAllMocks();
});

import type { AnalyzeResponse } from "./types";

const minimalAnalysis: AnalyzeResponse = {
  wallets: 1,
  chains: ["ethereum"],
  totalTxns: 50,
  patterns: [
    {
      walletAddress: "0xabc",
      chain: "ethereum",
      amplify: [{ id: "AMP-01", tag: "Early Adopter", type: "AMPLIFY" as const, confidence: "HIGH" as const, evidence: [], count: 3, insight: "Entered ETH early." }],
      guard: [{ id: "GRD-01", tag: "Overtrader", type: "GUARD" as const, confidence: "MEDIUM" as const, evidence: [], count: 5, insight: "Too many trades.", costUsd: 200 }],
    },
  ],
  personas: [
    {
      walletLabel: "ETHEREUM SELF",
      archetype: "The Degen",
      catchphrase: "YOLO to the moon",
      vice: "overtrading",
      superpower: "Speed",
      kryptonite: "FOMO",
      tradingStyle: "aggressive",
      emojiSignature: "🚀",
      pnlTotal: 1234,
      realizedPnl: 1234,
      winRate: 60,
      grade: { score: 72, letter: "B", components: {} },
      amplifyTags: [{ id: "AMP-01", tag: "Early Adopter", type: "AMPLIFY" as const, confidence: "HIGH" as const, evidence: [], count: 3, insight: "Entered ETH early." }],
      guardTags: [{ id: "GRD-01", tag: "Overtrader", type: "GUARD" as const, confidence: "MEDIUM" as const, evidence: [], count: 5, insight: "Too many trades.", costUsd: 200 }],
    },
  ],
  comparison: null,
};

describe("reasonReply() - LLM available", () => {
  it("returns the LLM text when llmChat succeeds", async () => {
    mockLlmAvailable.mockReturnValue(true);
    mockLlmChat.mockResolvedValue("This wallet is a degen. Early Adopter tag confirmed.");

    const result = await reasonReply(minimalAnalysis, { ask: "What is this wallet?" });

    expect(result).toBe("This wallet is a degen. Early Adopter tag confirmed.");
    expect(mockLlmChat).toHaveBeenCalledOnce();
  });

  it("includes the ask in the user prompt", async () => {
    mockLlmAvailable.mockReturnValue(true);
    mockLlmChat.mockResolvedValue("OK reply");

    await reasonReply(minimalAnalysis, { ask: "Is this a whale?", agentId: "agent-007" });

    const callArgs = mockLlmChat.mock.calls[0][0];
    const userMsg = callArgs.find((m: { role: string }) => m.role === "user");
    expect(userMsg?.content).toContain("Is this a whale?");
    expect(userMsg?.content).toContain("agent-007");
  });

  it("uses a default ask when ctx.ask is undefined", async () => {
    mockLlmAvailable.mockReturnValue(true);
    mockLlmChat.mockResolvedValue("Default reply");

    await reasonReply(minimalAnalysis, {});

    const callArgs = mockLlmChat.mock.calls[0][0];
    const userMsg = callArgs.find((m: { role: string }) => m.role === "user");
    expect(userMsg?.content).toContain("Analyze this wallet");
  });

  it("includes analysis facts in the user prompt", async () => {
    mockLlmAvailable.mockReturnValue(true);
    mockLlmChat.mockResolvedValue("Based on facts...");

    await reasonReply(minimalAnalysis, {});

    const callArgs = mockLlmChat.mock.calls[0][0];
    const userMsg = callArgs.find((m: { role: string }) => m.role === "user");
    expect(userMsg?.content).toContain("The Degen");
  });

  it("system prompt forbids em-dash and fabricated numbers", async () => {
    mockLlmAvailable.mockReturnValue(true);
    mockLlmChat.mockResolvedValue("reply");

    await reasonReply(minimalAnalysis, {});

    const callArgs = mockLlmChat.mock.calls[0][0];
    const sysMsg = callArgs.find((m: { role: string }) => m.role === "system");
    expect(sysMsg?.content).toContain("No em-dash");
    expect(sysMsg?.content).toContain("NEVER invent numbers");
  });
});

describe("reasonReply() - LLM unavailable", () => {
  it("returns a deterministic grounded summary containing the archetype when llmAvailable() is false", async () => {
    mockLlmAvailable.mockReturnValue(false);

    const result = await reasonReply(minimalAnalysis, {});

    expect(mockLlmChat).not.toHaveBeenCalled();
    expect(result).toContain("The Degen");
  });

  it("deterministic fallback includes at least one real tag", async () => {
    mockLlmAvailable.mockReturnValue(false);

    const result = await reasonReply(minimalAnalysis, {});

    const hasAmpTag = result.includes("Early Adopter");
    const hasGuardTag = result.includes("Overtrader");
    expect(hasAmpTag || hasGuardTag).toBe(true);
  });

  it("never throws even when analysis is an empty object", async () => {
    mockLlmAvailable.mockReturnValue(false);

    await expect(reasonReply({} as unknown as AnalyzeResponse, {})).resolves.not.toThrow();
  });
});

describe("reasonReply() - LLM error handling", () => {
  it("returns deterministic fallback when llmChat rejects, never throws", async () => {
    mockLlmAvailable.mockReturnValue(true);
    mockLlmChat.mockRejectedValue(new Error("Network error"));

    const result = await reasonReply(minimalAnalysis, { ask: "Analyze please" });

    // Should not throw, should return grounded summary
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("The Degen");
  });

  it("fallback is grounded (contains archetype or a tag) when LLM fails", async () => {
    mockLlmAvailable.mockReturnValue(true);
    mockLlmChat.mockRejectedValue(new Error("Timeout"));

    const result = await reasonReply(minimalAnalysis, {});

    const grounded = result.includes("The Degen") || result.includes("Early Adopter") || result.includes("Overtrader");
    expect(grounded).toBe(true);
  });

  it("never throws on LLM rejection even with empty analysis", async () => {
    mockLlmAvailable.mockReturnValue(true);
    mockLlmChat.mockRejectedValue(new Error("503"));

    await expect(reasonReply({} as unknown as AnalyzeResponse, {})).resolves.not.toThrow();
  });
});

describe("reasonReply() - output constraints", () => {
  it("output is bounded to 1200 chars", async () => {
    mockLlmAvailable.mockReturnValue(true);
    // Return a very long string from LLM
    mockLlmChat.mockResolvedValue("X".repeat(5000));

    const result = await reasonReply(minimalAnalysis, {});

    expect(result.length).toBeLessThanOrEqual(1200);
  });

  it("output does not contain em-dash in fallback path", async () => {
    mockLlmAvailable.mockReturnValue(false);

    const result = await reasonReply(minimalAnalysis, {});

    expect(result).not.toContain("—");
  });
});
