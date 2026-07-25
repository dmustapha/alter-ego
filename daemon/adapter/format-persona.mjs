// Pure formatter: turns an /api/analyze JSON response into a bounded, branded chat
// reply for delivery over XMTP. Deterministic, no network, no LLM. Never throws,
// never leaks "undefined"/"null", never emits an em-dash (standing rule), bounded to
// 1200 chars so it fits a chat message. This is the single boundary between the
// analysis endpoint JSON and the A2A reply string.

const MAX = 1200;

const clean = (v) => (v === undefined || v === null ? "" : String(v).replace(/—/g, "-").trim());

function shortAddr(address) {
  const a = clean(address);
  if (a.length <= 12) return a;
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

const PLACEHOLDER = /^(none|none detected|n\/?a|unknown|-)?$/i;

function topTag(tags) {
  if (!Array.isArray(tags)) return null;
  // real tags only: drop placeholders the classifier emits for a healthy/empty side
  const real = tags.filter((t) => t && typeof t === "object" && !PLACEHOLDER.test(clean(t.tag)));
  if (real.length === 0) return null;
  const high = real.find((t) => clean(t.confidence).toUpperCase() === "HIGH");
  return high || real[0];
}

function tagLine(prefix, tag) {
  if (!tag || typeof tag !== "object") return "";
  const name = clean(tag.tag);
  if (!name) return "";
  const insight = clean(tag.insight);
  const body = insight ? `: ${insight}` : "";
  return `${prefix} ${name}${body}`;
}

export function formatPersona(analyze, address) {
  try {
    const a = analyze && typeof analyze === "object" ? analyze : {};
    const personas = Array.isArray(a.personas) ? a.personas : [];
    const addr = shortAddr(address);

    // Safe fallback when there is no persona to report.
    if (personas.length === 0) {
      const base = `Alter Ego analyzed ${addr || "the wallet"} but found no classifiable trading history yet. Paste a wallet with on-chain activity to get a persona.`;
      return base.slice(0, MAX);
    }

    const p = personas[0] || {};
    const archetype = clean(p.archetype) || "an on-chain trader";
    const catchphrase = clean(p.catchphrase);
    const superpower = clean(p.superpower);
    const kryptonite = clean(p.kryptonite);

    const amp = tagLine("Strength -", topTag(p.amplifyTags));
    const grd = tagLine("Risk -", topTag(p.guardTags));

    const cmp = a.comparison && typeof a.comparison === "object" ? a.comparison : null;
    let cmpLine = "";
    if (cmp) {
      const worstRaw = clean(cmp.worstHabit);
      const worst = PLACEHOLDER.test(worstRaw) ? "" : worstRaw;
      const gap = Number(cmp.gapCostUsd);
      const gapStr = Number.isFinite(gap) && gap > 0 ? ` Gap cost vs smart money: $${gap.toLocaleString("en-US")}.` : "";
      if (worst) cmpLine = `${worst}${gapStr}`;
      else if (gapStr) cmpLine = gapStr.trim();
    }

    const lines = [
      `Alter Ego persona for ${addr}:`,
      `Archetype: ${archetype}${catchphrase ? ` ("${catchphrase}")` : ""}`,
      superpower ? `Superpower: ${superpower}` : "",
      kryptonite ? `Kryptonite: ${kryptonite}` : "",
      amp,
      grd,
      cmpLine,
      `Full breakdown: https://alter-ego-wine-mu.vercel.app`,
    ].filter(Boolean);

    let out = lines.join("\n");
    if (out.length > MAX) out = out.slice(0, MAX - 3).trimEnd() + "...";
    return out;
  } catch {
    // Absolute last-resort guard: never throw out of the formatter.
    return "Alter Ego is analyzing this wallet. Visit https://alter-ego-wine-mu.vercel.app for the full persona breakdown.";
  }
}
