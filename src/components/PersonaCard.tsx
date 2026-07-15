"use client";
import { motion } from "framer-motion";
import type { Persona } from "@/lib/types";

export function PersonaCard({ persona, delay = 0 }: { persona: Persona; delay?: number }) {
  const isPositive = persona.pnlTotal > 0;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="p-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-emerald-300 font-bold text-lg font-mono">
          {persona.emojiSignature} {persona.walletLabel}
        </h3>
        <span className={`font-mono text-lg font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {isPositive ? "+" : ""}${Math.abs(persona.pnlTotal).toLocaleString()}
        </span>
      </div>

      <div className="space-y-1 text-sm font-mono">
        <p><span className="text-gray-500">Archetype:</span> <span className="text-emerald-300">{persona.archetype}</span></p>
        <p className="text-gray-400 italic">"{persona.catchphrase}"</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-xs text-gray-500">SUPERPOWER</p>
          <p className="text-emerald-300 text-sm">{persona.superpower}</p>
        </div>
        <div className="p-2 rounded border border-red-500/20 bg-red-500/5">
          <p className="text-xs text-gray-500">KRYPTONITE</p>
          <p className="text-red-300 text-sm">{persona.kryptonite}</p>
        </div>
      </div>
    </motion.div>
  );
}
