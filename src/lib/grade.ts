import type { WalletSignals } from "./types";

const clamp = (x: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, x));

export function computeBehavioralGrade(s: WalletSignals) {
  const risk = 25 * (1 - Math.min(s.riskTokenPct / 100, 1));
  const diversif = 20 * Math.min(s.uniqueTokens / 15, 1);
  const conc = 15 * (1 - clamp((s.topHoldingPct - 20) / 60, 0, 1));
  const med = Math.max(s.networkMedianGasGwei, 1);
  const gas =
    s.avgGasGwei === 0
      ? 15
      : 15 * clamp(1 - (s.avgGasGwei / med - 1), 0, 1);
  const act =
    15 *
    (0.6 * Math.min(s.swapCount / 50, 1) +
      0.4 * Math.max(0, 1 - s.daysSinceLastTx / 90));
  const chains = 10 * Math.min((s.uniqueChains - 1) / 2, 1);
  const components = { risk, diversif, conc, gas, act, chains };
  const score = Math.round(risk + diversif + conc + gas + act + chains);
  const letter =
    score >= 90
      ? "S"
      : score >= 80
        ? "A"
        : score >= 70
          ? "B"
          : score >= 60
            ? "C"
            : score >= 50
              ? "D"
              : "F";
  return { score, letter, components };
}
