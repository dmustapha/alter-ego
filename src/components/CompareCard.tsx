"use client";
import { motion } from "framer-motion";
import type { CompareResult } from "@/lib/types";

export function CompareCard({ comparison }: { comparison: CompareResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <span className="text-amber-400 text-xl">🏆</span>
        <h3 className="text-amber-300 font-bold font-mono">
          Top Trader #{comparison.topTrader?.rank || "?"}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-500">Win Rate</p>
          <p className="text-amber-300 font-mono font-bold">{comparison.topTraderWinRate}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Your Win Rate</p>
          <p className="text-gray-400 font-mono">{comparison.userWinRate}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Gap</p>
          <p className="text-red-400 font-mono font-bold">-{comparison.topTraderWinRate - comparison.userWinRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-500">Their Avg Exit</p>
          <p className="text-emerald-300 font-mono font-bold">+{comparison.topTraderAvgExit}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Your Avg Exit</p>
          <p className="text-gray-400 font-mono">+{comparison.userAvgExit}%</p>
        </div>
      </div>

      <div className="p-3 rounded border border-red-500/20 bg-red-500/5">
        <p className="text-xs text-gray-500">GAP COST</p>
        <p className="text-red-400 font-mono font-bold">
          That gap cost you ${comparison.gapCostUsd.toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-2 rounded border border-red-500/20 bg-red-500/5">
          <p className="text-xs text-gray-500">YOUR WORST HABIT</p>
          <p className="text-red-300 font-mono">{comparison.worstHabit}</p>
        </div>
        <div className="p-2 rounded border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-xs text-gray-500">THEIR STRATEGY</p>
          <p className="text-emerald-300 font-mono">{comparison.theirStrategy}</p>
        </div>
      </div>
    </motion.div>
  );
}
