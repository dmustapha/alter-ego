"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RoastBattle as RoastBattleType } from "@/lib/types";

export function RoastBattle({ battle }: { battle: RoastBattleType }) {
  const [currentRound, setCurrentRound] = useState(0);
  const [phase, setPhase] = useState<"intro" | "roasting" | "wisdom" | "done">("intro");

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    if (phase === "intro") {
      timers.push(setTimeout(() => setPhase("roasting"), 1500));
    } else if (phase === "roasting" && currentRound < battle.lines.length - 2) {
      timers.push(setTimeout(() => setCurrentRound((r) => r + 1), 4000));
    } else if (phase === "roasting" && currentRound >= battle.lines.length - 2) {
      timers.push(setTimeout(() => setPhase("wisdom"), 4000));
    } else if (phase === "wisdom") {
      timers.push(setTimeout(() => setPhase("done"), 3000));
    }

    return () => timers.forEach(clearTimeout);
  }, [currentRound, phase, battle.lines.length]);

  const currentLine = battle.lines[currentRound];
  const isLeft = currentLine?.speaker === battle.walletA.walletLabel;
  const isBoth = currentLine?.speaker === "BOTH";

  return (
    <div className="space-y-8">
      {/* Persona cards side by side */}
      <div className="grid grid-cols-2 gap-8">
        <motion.div
          animate={phase === "roasting" && isLeft ? { scale: 1.05 } : { scale: 1 }}
          className="p-4 rounded border border-emerald-500/20 bg-emerald-500/5"
        >
          <h3 className="text-emerald-300 font-bold font-mono">
            {battle.walletA.emojiSignature} {battle.walletA.walletLabel}
          </h3>
          <p className="text-gray-400 text-sm mt-1">{battle.walletA.archetype}</p>
          <p className="text-emerald-400 text-sm mt-2">
            PnL: {battle.walletA.pnlTotal > 0 ? "+" : ""}${battle.walletA.pnlTotal.toLocaleString()}
          </p>
        </motion.div>

        <motion.div
          animate={phase === "roasting" && !isLeft && !isBoth ? { scale: 1.05 } : { scale: 1 }}
          className="p-4 rounded border border-emerald-500/20 bg-emerald-500/5"
        >
          <h3 className="text-emerald-300 font-bold font-mono">
            {battle.walletB.emojiSignature} {battle.walletB.walletLabel}
          </h3>
          <p className="text-gray-400 text-sm mt-1">{battle.walletB.archetype}</p>
          <p className={battle.walletB.pnlTotal > 0 ? "text-emerald-400" : "text-red-400"}>
            PnL: {battle.walletB.pnlTotal > 0 ? "+" : ""}${battle.walletB.pnlTotal.toLocaleString()}
          </p>
        </motion.div>
      </div>

      {/* Roast lines */}
      <AnimatePresence mode="wait">
        {phase !== "done" && currentLine && (
          <motion.div
            key={currentRound}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-6 rounded-lg border font-mono text-lg ${
              isBoth
                ? "border-amber-500/30 bg-amber-500/5 text-amber-300 text-center"
                : isLeft
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                  : "border-red-500/30 bg-red-500/5 text-red-300"
            }`}
          >
            <p className="text-xs text-gray-500 mb-1">
              {currentLine.speaker}
            </p>
            <p>"{currentLine.text}"</p>
            {currentLine.onScreenTag && (
              <p className="text-xs mt-2 text-gray-500">
                [{currentLine.onScreenTag}]: {currentLine.onScreenData}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase indicator */}
      <div className="text-center text-gray-500 text-xs font-mono">
        {phase === "intro" && "Preparing battle..."}
        {phase === "roasting" && `Round ${currentRound + 1}/${battle.lines.length - 2}`}
        {phase === "wisdom" && "Crowd wisdom incoming..."}
        {phase === "done" && "Battle complete"}
      </div>
    </div>
  );
}
