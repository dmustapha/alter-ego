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
      className={`
        p-3 rounded border font-mono text-sm
        ${isAmplify ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}
      `}
    >
      <div className="flex items-center gap-2">
        <span className={isAmplify ? "text-emerald-400" : "text-red-400"}>
          {isAmplify ? "✅" : "❌"}
        </span>
        <span className={isAmplify ? "text-emerald-300 font-bold" : "text-red-300 font-bold"}>
          {pattern.tag}
        </span>
        <span className={`
          text-xs px-1.5 py-0.5 rounded
          ${pattern.confidence === "HIGH" ? "bg-emerald-500/20 text-emerald-300" : ""}
          ${pattern.confidence === "MEDIUM" ? "bg-amber-500/20 text-amber-300" : ""}
          ${pattern.confidence === "LOW" ? "bg-red-500/20 text-red-300" : ""}
        `}>
          {pattern.confidence}
        </span>
      </div>
      <p className="mt-1 text-gray-400">{pattern.insight}</p>
      {pattern.costUsd !== undefined && (
        <p className="mt-1 text-red-400 font-bold">
          Cost: ${pattern.costUsd.toLocaleString()}
        </p>
      )}
    </motion.div>
  );
}
