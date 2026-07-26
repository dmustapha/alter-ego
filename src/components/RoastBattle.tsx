"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { RoastBattle as RoastBattleType } from "@/lib/types";

export function RoastBattle({ battle }: { battle: RoastBattleType }) {
  const reduce = useReducedMotion();
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
            animate={reduce ? { scale: 1 } : (phase === "roasting" && ((i === 0 && isLeft) || (i === 1 && !isLeft && !isBoth)) ? { scale: 1.05 } : { scale: 1 })}
            className="p-4 border border-[rgba(255,45,149,.1)] bg-surface">
            <h3 className="text-text font-bold">{w.emojiSignature} {w.walletLabel}</h3>
            <p className="text-dim text-sm mt-1">{w.archetype}</p>
          </motion.div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {phase !== "done" && currentLine && (
          <motion.div key={currentRound} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={reduce ? { duration: 0 } : { duration: 0.3 }}
            className={`p-6 border text-lg ${isBoth ? "border-[rgba(255,255,0,.2)] bg-surface text-[#ffff00] text-center" : isLeft ? "border-[rgba(0,255,255,.2)] bg-surface text-[#00ffff]" : "border-[rgba(255,45,149,.2)] bg-surface text-[#ff2d95]"}`}>
            <p className="font-mono text-[10px] tracking-[1px] uppercase text-dim mb-1">{currentLine.speaker}</p>
            <p>"{currentLine.text}"</p>
            {currentLine.onScreenTag && <p className="font-mono text-[10px] mt-2 text-dim">[{currentLine.onScreenTag}]: {currentLine.onScreenData}</p>}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="text-center text-dim text-xs">
        {phase === "intro" && "Preparing battle..."}
        {phase === "roasting" && `Round ${currentRound + 1}/${battle.lines.length}`}
        {phase === "wisdom" && "Crowd wisdom incoming..."}
        {phase === "done" && "Battle complete"}
      </div>
    </div>
  );
}
