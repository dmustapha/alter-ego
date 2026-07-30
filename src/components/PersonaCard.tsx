"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { Persona } from "@/lib/types";

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs >= 1000
    ? `$${(abs / 1000).toFixed(1)}k`
    : `$${abs.toFixed(2)}`;
  return value < 0 ? `-${formatted}` : `+${formatted}`;
}

const GRADE_COLORS: Record<string, string> = {
  S: "#ffd700",
  A: "#00ffcc",
  B: "#00ffff",
  C: "#aaaaff",
  D: "#ff9955",
  F: "#ff2d95",
};

export function PersonaCard({ persona, delay = 0 }: { persona: Persona; delay?: number }) {
  const reduce = useReducedMotion();
  const gradeColor = GRADE_COLORS[persona.grade.letter] ?? "#888888";
  const pnlPositive = persona.realizedPnl !== null && persona.realizedPnl > 0;
  const pnlNegative = persona.realizedPnl !== null && persona.realizedPnl < 0;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={reduce ? { duration: 0 } : { delay, duration: 0.5 }}
      className="p-6 border border-[rgba(255,45,149,.1)] bg-surface space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-text font-bold text-lg">{persona.emojiSignature} {persona.walletLabel}</h3>
        <span
          className="font-mono text-[11px] uppercase tracking-[1px] px-3 py-1 border"
          style={{ color: gradeColor, borderColor: gradeColor, background: `${gradeColor}14` }}
        >
          Grade {persona.grade.letter} ({persona.grade.score})
        </span>
      </div>
      <div className="space-y-1 text-sm">
        <p><span className="text-dim">Archetype:</span> <span className="text-[#00ffff]">{persona.archetype}</span></p>
        <p className="text-dim italic">&quot;{persona.catchphrase}&quot;</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 border border-[rgba(0,255,255,.15)] bg-[rgba(0,255,255,.03)]">
          <p className="font-mono text-[10px] tracking-[1px] uppercase text-dim">SUPERPOWER</p>
          <p className="text-[#00ffff] text-sm">{persona.superpower}</p>
        </div>
        <div className="p-2 border border-[rgba(255,45,149,.15)] bg-[rgba(255,45,149,.03)]">
          <p className="font-mono text-[10px] tracking-[1px] uppercase text-dim">KRYPTONITE</p>
          <p className="text-[#ff2d95] text-sm">{persona.kryptonite}</p>
        </div>
      </div>
      <div className="pt-3 border-t border-[rgba(255,45,149,.1)] flex gap-6 text-sm">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[1px] text-dim mb-1">REALIZED PnL</p>
          {persona.realizedPnl !== null ? (
            <p className="font-mono font-bold" style={{ color: pnlPositive ? "#00ffcc" : pnlNegative ? "#ff2d95" : "#888888" }}>
              {formatUsd(persona.realizedPnl)}
            </p>
          ) : (
            <p className="font-mono text-dim text-xs">not available</p>
          )}
        </div>
        {persona.winRate !== null && (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[1px] text-dim mb-1">WIN RATE</p>
            <p className="font-mono font-bold text-text">{persona.winRate}%</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
