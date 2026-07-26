"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { Persona } from "@/lib/types";

export function PersonaCard({ persona, delay = 0 }: { persona: Persona; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={reduce ? { duration: 0 } : { delay, duration: 0.5 }}
      className="p-6 border border-[rgba(255,45,149,.1)] bg-surface space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-text font-bold text-lg">{persona.emojiSignature} {persona.walletLabel}</h3>
      </div>
      <div className="space-y-1 text-sm">
        <p><span className="text-dim">Archetype:</span> <span className="text-[#00ffff]">{persona.archetype}</span></p>
        <p className="text-dim italic">"{persona.catchphrase}"</p>
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
    </motion.div>
  );
}
