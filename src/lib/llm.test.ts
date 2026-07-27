// src/lib/llm.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { llmAvailable, llmChat } from "./llm";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("llmAvailable()", () => {
  it("returns false when neither LLM_API_KEY nor GROQ_API_KEY is set", () => {
    vi.stubEnv("LLM_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    expect(llmAvailable()).toBe(false);
  });

  it("returns true when GROQ_API_KEY is set", () => {
    vi.stubEnv("LLM_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "gsk_test_key");
    expect(llmAvailable()).toBe(true);
  });

  it("returns true when LLM_API_KEY is set", () => {
    vi.stubEnv("LLM_API_KEY", "llm_test_key");
    vi.stubEnv("GROQ_API_KEY", "");
    expect(llmAvailable()).toBe(true);
  });
});

describe("llmChat()", () => {
  const fakeMessages = [{ role: "user" as const, content: "hello" }];

  function makeFetchMock(content: string, status = 200) {
    return vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({
        choices: [{ message: { content } }],
      }),
    });
  }

  it("throws when no API key is configured", async () => {
    vi.stubEnv("LLM_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    await expect(llmChat(fakeMessages)).rejects.toThrow("LLM not configured");
  });

  it("POSTs to the Groq base URL with Bearer auth and returns content", async () => {
    vi.stubEnv("LLM_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    vi.stubEnv("LLM_BASE_URL", "");
    vi.stubEnv("LLM_MODEL", "");

    const fetchMock = makeFetchMock("hi");
    vi.stubGlobal("fetch", fetchMock);

    const result = await llmChat(fakeMessages);

    expect(result).toBe("hi");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer gsk_test"
    );
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("llama-3.3-70b-versatile");
    expect(body.messages).toEqual(fakeMessages);
    expect(body.temperature).toBe(0.7);
    expect(body.response_format).toBeUndefined();
  });

  it("includes response_format when opts.json is true", async () => {
    vi.stubEnv("LLM_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    vi.stubEnv("LLM_BASE_URL", "");
    vi.stubEnv("LLM_MODEL", "");

    const fetchMock = makeFetchMock('{"key":"value"}');
    vi.stubGlobal("fetch", fetchMock);

    await llmChat(fakeMessages, { json: true });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("uses custom model from opts when provided", async () => {
    vi.stubEnv("LLM_API_KEY", "key123");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("LLM_BASE_URL", "");
    vi.stubEnv("LLM_MODEL", "");

    const fetchMock = makeFetchMock("answer");
    vi.stubGlobal("fetch", fetchMock);

    await llmChat(fakeMessages, { model: "custom-model-7b" });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe("custom-model-7b");
  });

  it("uses LLM_BASE_URL env when set (strips trailing slash)", async () => {
    vi.stubEnv("LLM_API_KEY", "key123");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("LLM_BASE_URL", "https://custom.api.com/openai/v1/");
    vi.stubEnv("LLM_MODEL", "");

    const fetchMock = makeFetchMock("ok");
    vi.stubGlobal("fetch", fetchMock);

    await llmChat(fakeMessages);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://custom.api.com/openai/v1/chat/completions");
  });

  it("throws on non-2xx response", async () => {
    vi.stubEnv("LLM_API_KEY", "key123");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("LLM_BASE_URL", "");
    vi.stubEnv("LLM_MODEL", "");

    vi.stubGlobal("fetch", makeFetchMock("", 500));

    await expect(llmChat(fakeMessages)).rejects.toThrow("500");
  });

  it("throws if choices shape is missing from response", async () => {
    vi.stubEnv("LLM_API_KEY", "key123");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("LLM_BASE_URL", "");
    vi.stubEnv("LLM_MODEL", "");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [] }),
      })
    );

    await expect(llmChat(fakeMessages)).rejects.toThrow();
  });
});
