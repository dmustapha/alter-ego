"use client";
import { motion } from "framer-motion";
import type { Pattern } from "@/lib/types";

export function PatternCard({ pattern, delay = 0 }: { pattern: Pattern; delay?: number }) {
  const isAmplify = pattern.type === "AMPLIFY";
  return (
    <motion.div
      initial={{ opacity: 0, x: isAmplify ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`p-3 border text-sm ${
        isAmplify ? "border-[rgba(0,255,255,.15)] bg-[rgba(0,255,255,.03)]" : "border-[rgba(255,45,149,.15)] bg-[rgba(255,45,149,.03)]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={isAmplify ? "text-[#00ffff]" : "text-[#ff2d95]"}>{isAmplify ? "✅" : "❌"}</span>
        <span className={`font-bold ${isAmplify ? "text-[#00ffff]" : "text-[#ff2d95]"}`}>{pattern.tag}</span>
        <span className={`font-pixel text-[7px] uppercase px-1.5 py-0.5 border ${
          pattern.confidence === "HIGH" ? "border-[#00ffff] text-[#00ffff] bg-[rgba(0,255,255,.05)]" :
          pattern.confidence === "MEDIUM" ? "border-[#ffff00] text-[#ffff00] bg-[rgba(255,255,0,.05)]" :
          "border-[#ff2d95] text-[#ff2d95] bg-[rgba(255,45,149,.05)]"
        }`}>{pattern.confidence}</span>
      </div>
      <p className="mt-1 text-[rgba(160,160,210,.45)]">{pattern.insight}</p>
      {pattern.costUsd !== undefined && <p className="mt-1 text-[#ff2d95] font-bold">Cost: ${pattern.costUsd.toLocaleString()}</p>}
    </motion.div>
  );
}
