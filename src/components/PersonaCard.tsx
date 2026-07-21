"use client";
import { motion } from "framer-motion";
import type { Persona } from "@/lib/types";

export function PersonaCard({ persona, delay = 0 }: { persona: Persona; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, duration: 0.5 }}
      className="p-6 border border-[rgba(255,45,149,.1)] bg-[#0a0a1a] space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[#f0f0ff] font-bold text-lg">{persona.emojiSignature} {persona.walletLabel}</h3>
      </div>
      <div className="space-y-1 text-sm">
        <p><span className="text-[rgba(160,160,210,.45)]">Archetype:</span> <span className="text-[#00ffff]">{persona.archetype}</span></p>
        <p className="text-[rgba(160,160,210,.45)] italic">"{persona.catchphrase}"</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 border border-[rgba(0,255,255,.15)] bg-[rgba(0,255,255,.03)]">
          <p className="font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">SUPERPOWER</p>
          <p className="text-[#00ffff] text-sm">{persona.superpower}</p>
        </div>
        <div className="p-2 border border-[rgba(255,45,149,.15)] bg-[rgba(255,45,149,.03)]">
          <p className="font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">KRYPTONITE</p>
          <p className="text-[#ff2d95] text-sm">{persona.kryptonite}</p>
        </div>
      </div>
    </motion.div>
  );
}
