// src/lib/agent-reason.ts
// Per-request grounded reasoning layer for a2mcp and A2A daemon (TS twin).
// Uses llmChat when available; falls back to a deterministic grounded summary.
// NEVER throws. Output bounded to 1200 chars. No em-dashes.

import { llmAvailable, llmChat } from "./llm";
import type { AnalyzeResponse } from "./types";

const MAX_CHARS = 1200;

const SYSTEM_PROMPT =
  "You are Alter Ego, an autonomous on-chain wallet-analysis agent replying to another agent. " +
  "Answer in 2 to 4 sentences, grounded ONLY in the FACTS provided (archetype, AMPLIFY/GUARD pattern tags + insights, grade, signals). " +
  "NEVER invent numbers, prices, or PnL not in FACTS. " +
  "Cite the specific pattern tag when making a claim. " +
  "No marketing fluff. No em-dash.";

export interface ReasonCtx {
  address?: string;
  ask?: string;
  agentId?: string;
}

// Build a compact representation of the analysis for the LLM (no raw trades).
function compactFacts(analysis: AnalyzeResponse): Record<string, unknown> {
  const personas = Array.isArray((analysis as { personas?: unknown[] })?.personas)
    ? (analysis as { personas: unknown[] }).personas.map((p) => {
        const persona = p as Record<string, unknown>;
        return {
          archetype: persona.archetype,
          grade: (persona.grade as { letter?: string } | undefined)?.letter,
          amplifyTags: Array.isArray(persona.amplifyTags)
            ? (persona.amplifyTags as Array<{ tag?: string; confidence?: string; insight?: string }>)
                .slice(0, 3)
                .map(({ tag, confidence, insight }) => ({ tag, confidence, insight }))
            : [],
          guardTags: Array.isArray(persona.guardTags)
            ? (persona.guardTags as Array<{ tag?: string; confidence?: string; insight?: string }>)
                .slice(0, 3)
                .map(({ tag, confidence, insight }) => ({ tag, confidence, insight }))
            : [],
        };
      })
    : [];

  const patterns = Array.isArray((analysis as { patterns?: unknown[] })?.patterns)
    ? (analysis as { patterns: unknown[] }).patterns.map((pr) => {
        const pat = pr as Record<string, unknown>;
        const topAmp = Array.isArray(pat.amplify) ? (pat.amplify as Array<{ tag?: string; confidence?: string }>)[0] : null;
        const topGuard = Array.isArray(pat.guard) ? (pat.guard as Array<{ tag?: string; confidence?: string }>)[0] : null;
        return { wallet: pat.walletAddress, topAmplify: topAmp, topGuard };
      })
    : [];

  return { personas, patterns };
}

// Build a deterministic grounded summary from the analysis, without LLM.
function groundedFallback(analysis: unknown): string {
  try {
    const a = analysis && typeof analysis === "object" ? (analysis as Record<string, unknown>) : {};
    const personas = Array.isArray(a.personas) ? a.personas : [];
    if (personas.length === 0) {
      return "Alter Ego analyzed this wallet but found no classifiable persona yet.";
    }
    const p = personas[0] as Record<string, unknown>;
    const archetype = typeof p.archetype === "string" && p.archetype ? p.archetype : "an on-chain trader";
    const grade = p.grade && typeof p.grade === "object" ? (p.grade as { letter?: string }).letter : null;

    const amps = Array.isArray(p.amplifyTags) ? (p.amplifyTags as Array<{ tag?: string; insight?: string }>) : [];
    const guards = Array.isArray(p.guardTags) ? (p.guardTags as Array<{ tag?: string; insight?: string }>) : [];

    const topAmp = amps[0];
    const topGuard = guards[0];

    const parts: string[] = [`Archetype: ${archetype}${grade ? ` (Grade ${grade})` : ""}.`];

    if (topAmp?.tag) {
      const insight = topAmp.insight ? ` ${topAmp.insight}` : "";
      parts.push(`Strength tag [${topAmp.tag}]:${insight}`);
    }

    if (topGuard?.tag) {
      const insight = topGuard.insight ? ` ${topGuard.insight}` : "";
      parts.push(`Risk tag [${topGuard.tag}]:${insight}`);
    }

    const out = parts.join(" ").replace(/—/g, "-");
    return out.length > MAX_CHARS ? out.slice(0, MAX_CHARS - 3).trimEnd() + "..." : out;
  } catch {
    return "Alter Ego analyzed this wallet. Visit https://alter-ego-wine-mu.vercel.app for the full persona breakdown.";
  }
}

export async function reasonReply(analysis: AnalyzeResponse, ctx: ReasonCtx): Promise<string> {
  const fallback = groundedFallback(analysis);

  if (!llmAvailable()) {
    return fallback;
  }

  const ask = ctx.ask ?? "Analyze this wallet";
  const agentLabel = ctx.agentId ? ` ${ctx.agentId}` : "";
  const factsJson = JSON.stringify(compactFacts(analysis));

  const userContent =
    `FACTS:\n${factsJson}\n\nCounterparty${agentLabel} asked: "${ask}". Reply.`;

  try {
    const raw = await llmChat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      { maxTokens: 400, timeoutMs: 6000 }
    );

    const trimmed = raw.replace(/—/g, "-").trim();
    return trimmed.length > MAX_CHARS ? trimmed.slice(0, MAX_CHARS - 3).trimEnd() + "..." : trimmed;
  } catch {
    return fallback;
  }
}
