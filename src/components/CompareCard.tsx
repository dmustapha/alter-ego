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
      <div className="grid grid-cols-3 gap-4 text-center">
        <div><p className="font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">Win Rate</p><p className="text-[#ffff00] font-bold">{comparison.topTraderWinRate}%</p></div>
        <div><p className="font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">Your Win Rate</p><p className="text-[#d0d0f0]">{comparison.userWinRate}%</p></div>
        <div><p className="font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">Gap</p><p className="text-[#ff2d95] font-bold">-{comparison.topTraderWinRate - comparison.userWinRate}%</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-center">
        <div><p className="font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">Their Avg Exit</p><p className="text-[#00ffff] font-bold">+{comparison.topTraderAvgExit}%</p></div>
        <div><p className="font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">Your Avg Exit</p><p className={`font-bold ${comparison.userAvgExit >= 0 ? "text-[#d0d0f0]" : "text-[#ff2d95]"}`}>{comparison.userAvgExit >= 0 ? "+" : ""}{comparison.userAvgExit}%</p></div>
      </div>
      <div className="p-3 border border-[rgba(255,45,149,.15)] bg-[rgba(255,45,149,.03)]">
        <p className="font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">GAP COST</p>
        <p className="text-[#ff2d95] font-bold">That gap cost you ${comparison.gapCostUsd.toLocaleString()}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-2 border border-[rgba(255,45,149,.15)] bg-[rgba(255,45,149,.03)]"><p className="font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">YOUR WORST HABIT</p><p className="text-[#ff2d95]">{comparison.worstHabit}</p></div>
        <div className="p-2 border border-[rgba(0,255,255,.15)] bg-[rgba(0,255,255,.03)]"><p className="font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">THEIR STRATEGY</p><p className="text-[#00ffff]">{comparison.theirStrategy}</p></div>
      </div>
    </motion.div>
  );
}
