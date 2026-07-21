"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RoastBattle as RoastBattleType } from "@/lib/types";

export function RoastBattle({ battle }: { battle: RoastBattleType }) {
  const [currentRound, setCurrentRound] = useState(0);
  const [phase, setPhase] = useState<"intro" | "roasting" | "wisdom" | "done">("intro");
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []; const last = battle.lines.length - 1;
    if (phase === "intro") timers.push(setTimeout(() => setPhase("roasting"), 1500));
    else if (phase === "roasting" && currentRound < last) timers.push(setTimeout(() => setCurrentRound(r => r + 1), 4000));
    else if (phase === "roasting" && currentRound >= last) timers.push(setTimeout(() => setPhase("wisdom"), 4000));
    else if (phase === "wisdom") timers.push(setTimeout(() => setPhase("done"), 3000));
    return () => timers.forEach(clearTimeout);
  }, [currentRound, phase, battle.lines.length]);
  const currentLine = battle.lines[currentRound];
  const isLeft = currentLine?.speaker === battle.walletA.walletLabel;
  const isBoth = currentLine?.speaker === "BOTH";
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-8">
        {[battle.walletA, battle.walletB].map((w, i) => (
          <motion.div key={i}
            animate={phase === "roasting" && ((i === 0 && isLeft) || (i === 1 && !isLeft && !isBoth)) ? { scale: 1.05 } : { scale: 1 }}
            className="p-4 border border-[rgba(255,45,149,.1)] bg-[#0a0a1a]">
            <h3 className="text-[#f0f0ff] font-bold">{w.emojiSignature} {w.walletLabel}</h3>
            <p className="text-[rgba(160,160,210,.45)] text-sm mt-1">{w.archetype}</p>
          </motion.div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {phase !== "done" && currentLine && (
          <motion.div key={currentRound} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className={`p-6 border text-lg ${isBoth ? "border-[rgba(255,255,0,.2)] bg-[#0a0a1a] text-[#ffff00] text-center" : isLeft ? "border-[rgba(0,255,255,.2)] bg-[#0a0a1a] text-[#00ffff]" : "border-[rgba(255,45,149,.2)] bg-[#0a0a1a] text-[#ff2d95]"}`}>
            <p className="font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)] mb-1">{currentLine.speaker}</p>
            <p>"{currentLine.text}"</p>
            {currentLine.onScreenTag && <p className="font-pixel text-[7px] mt-2 text-[rgba(160,160,210,.45)]">[{currentLine.onScreenTag}]: {currentLine.onScreenData}</p>}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="text-center text-[rgba(160,160,210,.45)] text-xs">
        {phase === "intro" && "Preparing battle..."}
        {phase === "roasting" && `Round ${currentRound + 1}/${battle.lines.length}`}
        {phase === "wisdom" && "Crowd wisdom incoming..."}
        {phase === "done" && "Battle complete"}
      </div>
    </div>
  );
}
