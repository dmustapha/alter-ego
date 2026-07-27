// daemon/adapter/agent-reason.mjs
// Per-request grounded reasoning layer for the A2A daemon (ESM twin of src/lib/agent-reason.ts).
// Calls the same OpenAI-compatible endpoint via global fetch.
// NEVER throws. Output bounded to 1200 chars. No em-dashes.

const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_TIMEOUT_MS = 6000;
const MAX_CHARS = 1200;

const SYSTEM_PROMPT =
  "You are Alter Ego, an autonomous on-chain wallet-analysis agent replying to another agent. " +
  "Answer in 2 to 4 sentences, grounded ONLY in the FACTS provided (archetype, AMPLIFY/GUARD pattern tags + insights, grade, signals). " +
  "NEVER invent numbers, prices, or PnL not in FACTS. " +
  "Cite the specific pattern tag when making a claim. " +
  "No marketing fluff. No em-dash.";

function resolveKey() {
  return process.env.LLM_API_KEY || process.env.GROQ_API_KEY || undefined;
}

function resolveBaseUrl() {
  const raw = process.env.LLM_BASE_URL || DEFAULT_BASE_URL;
  return raw.replace(/\/$/, "");
}

function resolveModel() {
  return process.env.LLM_MODEL || DEFAULT_MODEL;
}

function llmAvailable() {
  return Boolean(resolveKey());
}

// Build compact facts for the LLM prompt (no raw trades array).
function compactFacts(analysis) {
  const a = analysis && typeof analysis === "object" ? analysis : {};

  const personas = Array.isArray(a.personas)
    ? a.personas.map((p) => ({
        archetype: p.archetype,
        grade: p.grade && typeof p.grade === "object" ? p.grade.letter : null,
        amplifyTags: Array.isArray(p.amplifyTags)
          ? p.amplifyTags.slice(0, 3).map(({ tag, confidence, insight }) => ({ tag, confidence, insight }))
          : [],
        guardTags: Array.isArray(p.guardTags)
          ? p.guardTags.slice(0, 3).map(({ tag, confidence, insight }) => ({ tag, confidence, insight }))
          : [],
      }))
    : [];

  const patterns = Array.isArray(a.patterns)
    ? a.patterns.map((pr) => {
        const topAmp = Array.isArray(pr.amplify) ? pr.amplify[0] : null;
        const topGuard = Array.isArray(pr.guard) ? pr.guard[0] : null;
        return { wallet: pr.walletAddress, topAmplify: topAmp, topGuard };
      })
    : [];

  return { personas, patterns };
}

// Deterministic grounded summary from the analysis, no LLM.
function groundedFallback(analysis) {
  try {
    const a = analysis && typeof analysis === "object" ? analysis : {};
    const personas = Array.isArray(a.personas) ? a.personas : [];
    if (personas.length === 0) {
      return "Alter Ego analyzed this wallet but found no classifiable persona yet.";
    }
    const p = personas[0] || {};
    const archetype = typeof p.archetype === "string" && p.archetype ? p.archetype : "an on-chain trader";
    const grade = p.grade && typeof p.grade === "object" ? p.grade.letter : null;

    const amps = Array.isArray(p.amplifyTags) ? p.amplifyTags : [];
    const guards = Array.isArray(p.guardTags) ? p.guardTags : [];

    const topAmp = amps[0];
    const topGuard = guards[0];

    const parts = [`Archetype: ${archetype}${grade ? ` (Grade ${grade})` : ""}.`];

    if (topAmp && topAmp.tag) {
      const insight = topAmp.insight ? ` ${topAmp.insight}` : "";
      parts.push(`Strength tag [${topAmp.tag}]:${insight}`);
    }

    if (topGuard && topGuard.tag) {
      const insight = topGuard.insight ? ` ${topGuard.insight}` : "";
      parts.push(`Risk tag [${topGuard.tag}]:${insight}`);
    }

    const out = parts.join(" ").replace(/—/g, "-");
    return out.length > MAX_CHARS ? out.slice(0, MAX_CHARS - 3).trimEnd() + "..." : out;
  } catch {
    return "Alter Ego analyzed this wallet. Visit https://alter-ego-wine-mu.vercel.app for the full persona breakdown.";
  }
}

// reasonReply(analysis, ctx) -> Promise<string>
// analysis: AnalyzeResponse-shaped object
// ctx: { address?, ask?, agentId? }
export async function reasonReply(analysis, ctx = {}) {
  const fallback = groundedFallback(analysis);

  if (!llmAvailable()) {
    return fallback;
  }

  const ask = (ctx && ctx.ask) ? ctx.ask : "Analyze this wallet";
  const agentLabel = (ctx && ctx.agentId) ? ` ${ctx.agentId}` : "";
  const factsJson = JSON.stringify(compactFacts(analysis));

  const userContent =
    `FACTS:\n${factsJson}\n\nCounterparty${agentLabel} asked: "${ask}". Reply.`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  const body = {
    model: resolveModel(),
    messages,
    temperature: 0.7,
    max_tokens: 400,
  };

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);

    let raw;
    try {
      const response = await fetch(`${resolveBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resolveKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (!response.ok) {
        throw new Error(`LLM request failed with status ${response.status}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new Error("Unexpected LLM response shape");
      }
      raw = content;
    } finally {
      clearTimeout(timer);
    }

    const trimmed = raw.replace(/—/g, "-").trim();
    return trimmed.length > MAX_CHARS ? trimmed.slice(0, MAX_CHARS - 3).trimEnd() + "..." : trimmed;
  } catch {
    return fallback;
  }
}
