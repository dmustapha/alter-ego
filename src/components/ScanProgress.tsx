"use client";
import type { AnalyzeProgress } from "@/lib/types";

// Ordered checkpoints the scan moves through. Keys match AnalyzeProgress.stage.
const STAGES: Array<{ key: string; label: string }> = [
  { key: "fetch", label: "Transaction history" },
  { key: "balances", label: "Token holdings" },
  { key: "gas", label: "Gas + tx detail" },
  { key: "pricing", label: "Pricing + realized PnL" },
  { key: "patterns", label: "Behavioral patterns" },
  { key: "personas", label: "Persona synthesis" },
];

interface ScanProgressProps {
  count: number;
  progress: AnalyzeProgress | null;
}

export function ScanProgress({ count, progress }: ScanProgressProps) {
  const pct = progress?.pct ?? 3;
  const detail = progress?.detail ?? "Connecting to OnchainOS...";
  const activeStage = progress?.stage ?? "fetch";
  const activeIdx = Math.max(
    0,
    STAGES.findIndex((s) => s.key === activeStage)
  );
  const isDone = activeStage === "done";

  return (
    <div className="max-w-[620px] space-y-8 py-6">
      {/* HEADER */}
      <div>
        <div
          className="font-mono text-[11px] uppercase tracking-[3px] text-accent"
          style={{ textShadow: "0 0 8px rgba(255,45,149,.3)" }}
        >
          &gt; Analyzing {count} wallet{count !== 1 ? "s" : ""}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[1px] text-dim mt-2">
          Reading real on-chain history · live
        </div>
      </div>

      {/* PROGRESS BAR + PCT */}
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <span className="font-mono text-sm text-secondary min-h-[20px]">{detail}</span>
          <span
            className="font-pixel text-[22px] text-secondary tabular-nums"
            style={{ textShadow: "0 0 12px rgba(0,255,255,.35)" }}
          >
            {pct}%
          </span>
        </div>
        <div className="h-[6px] w-full bg-[rgba(0,255,255,.08)] overflow-hidden">
          <div
            className="h-full transition-[width] duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #ff2d95, #00ffff)",
              boxShadow: "0 0 12px rgba(0,255,255,.5)",
            }}
          />
        </div>
      </div>

      {/* LIVE COUNTERS */}
      <div className="grid grid-cols-2 gap-[1px] bg-[rgba(255,45,149,.12)]">
        {[
          { v: (progress?.txns ?? 0).toLocaleString(), l: "Transactions retrieved" },
          { v: (progress?.calls ?? 0).toLocaleString(), l: "OnchainOS requests" },
        ].map((s) => (
          <div key={s.l} className="bg-surface py-4 px-5">
            <div
              className="font-pixel text-[18px] text-text tabular-nums"
              style={{ textShadow: "0 0 8px rgba(255,45,149,.25)" }}
            >
              {s.v}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[1px] text-dim mt-1">{s.l}</div>
          </div>
        ))}
      </div>

      {/* STAGE CHECKLIST */}
      <div className="space-y-2 pt-2 border-t border-[rgba(255,45,149,.1)]">
        {STAGES.map((stage, i) => {
          const complete = isDone || i < activeIdx;
          const current = !isDone && i === activeIdx;
          return (
            <div key={stage.key} className="flex items-center gap-3 font-mono text-[11px]">
              <span
                className={
                  complete
                    ? "text-secondary"
                    : current
                    ? "text-accent animate-pulse"
                    : "text-dim opacity-40"
                }
              >
                {complete ? "✓" : current ? "▸" : "·"}
              </span>
              <span
                className={
                  complete
                    ? "text-dim line-through decoration-[rgba(0,255,255,.4)]"
                    : current
                    ? "text-text"
                    : "text-dim opacity-40"
                }
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
