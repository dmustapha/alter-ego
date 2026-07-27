// src/lib/llm.ts
// Pluggable OpenAI-compatible LLM client (default provider: Groq).

const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_TIMEOUT_MS = 6000;

function resolveKey(): string | undefined {
  return process.env.LLM_API_KEY || process.env.GROQ_API_KEY || undefined;
}

function resolveBaseUrl(): string {
  const raw = process.env.LLM_BASE_URL || DEFAULT_BASE_URL;
  return raw.replace(/\/$/, "");
}

export function llmAvailable(): boolean {
  return Boolean(resolveKey());
}

export async function llmChat(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts?: { json?: boolean; model?: string; timeoutMs?: number; maxTokens?: number }
): Promise<string> {
  const key = resolveKey();
  if (!key) throw new Error("LLM not configured");

  const model = opts?.model || process.env.LLM_MODEL || DEFAULT_MODEL;
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = resolveBaseUrl();

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.7,
    ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
    ...(opts?.maxTokens ? { max_tokens: opts.maxTokens } : {}),
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed with status ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Unexpected LLM response shape: missing choices[0].message.content");
  }

  return content;
}
