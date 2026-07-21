"use client";
import { motion } from "framer-motion";
import type { CompareResult } from "@/lib/types";

export function CompareCard({ comparison }: { comparison: CompareResult }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="p-6 border border-[rgba(255,45,149,.1)] bg-[#0a0a1a] space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[#ffff00] text-xl">🏆</span>
        <h3 className="text-[#f0f0ff] font-bold">Top Trader #{comparison.topTrader?.rank || "?"}</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-2 border border-[rgba(255,45,149,.15)] bg-[rgba(255,45,149,.03)]"><p className="font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">YOUR WORST HABIT</p><p className="text-[#ff2d95]">{comparison.worstHabit}</p></div>
        <div className="p-2 border border-[rgba(0,255,255,.15)] bg-[rgba(0,255,255,.03)]"><p className="font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">THEIR STRATEGY</p><p className="text-[#00ffff]">{comparison.theirStrategy}</p></div>
      </div>
    </motion.div>
  );
}
