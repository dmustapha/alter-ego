"use client";
import { useState, useEffect, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function Terminal({ children }: TerminalProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[1100px] relative z-[1]">
        {/* Glitch card with offset layers + corner brackets */}
        <div
          className="relative px-6 py-8 md:px-12 md:py-14"
          style={{
            background: "#0d0d1a",
            border: "2px solid rgba(255,45,149,0.2)",
            boxShadow:
              "0 0 30px rgba(255,45,149,.1), 0 0 80px rgba(255,45,149,.03), inset 0 0 40px rgba(0,255,255,.02)",
            clipPath:
              "polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))",
          }}
        >
          {/* Offset glitch layer: cyan */}
          <div
            data-anim="glitch"
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              border: "2px solid #00ffff",
              transform: "translate(3px, -3px)",
              opacity: 0.15,
              animation: "glitchShift 8s infinite",
              clipPath:
                "polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))",
            }}
          />
          {/* Offset glitch layer: pink */}
          <div
            data-anim="glitch"
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              border: "2px solid #ff2d95",
              transform: "translate(-3px, 3px)",
              opacity: 0.1,
              animation: "glitchShift 6s infinite 0.5s",
              clipPath:
                "polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))",
            }}
          />

          {/* HEADER */}
          <header className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-10 border-b-2 border-[rgba(255,45,149,0.15)]">
            <div className="flex items-center gap-2.5">
              <span
                className="inline-block w-2 h-[14px] bg-[#ff2d95]"
                style={{ boxShadow: "0 0 10px rgba(255,45,149,.8), 4px 0 0 rgba(255,45,149,.3)" }}
              />
              <span
                className="inline-block w-2 h-[14px] bg-[#00ffff]"
                style={{ boxShadow: "0 0 10px rgba(0,255,255,.8), 4px 0 0 rgba(0,255,255,.3)" }}
              />
              <span
                className="inline-block w-2 h-[14px] bg-[#ffff00]"
                style={{ boxShadow: "0 0 10px rgba(255,255,0,.8), 4px 0 0 rgba(255,255,0,.3)" }}
              />
              <span
                data-anim="flicker"
                className="ml-2 text-[9px] uppercase tracking-[2px] text-[#00ffff] font-pixel"
                style={{
                  textShadow: "0 0 12px rgba(0,255,255,.6), 2px 0 0 rgba(255,45,149,.3)",
                  animation: "flicker 4s infinite",
                }}
              >
                ▶ ALTER_EGO.EXE
              </span>
            </div>
            <div className="flex gap-1.5">
              {[
                { label: "ERC-8004", color: "#00ffff" },
                { label: "ASP·LIFESTYLE", color: "#ffff00" },
                { label: "X LAYER", color: "#ff2d95", bg: "rgba(255,45,149,.06)" },
              ].map((b) => (
                <span
                  key={b.label}
                  className="relative text-[6px] uppercase tracking-[1px] px-2 py-[3px] font-pixel"
                  style={{ border: `1px solid ${b.color}`, color: b.color, background: b.bg }}
                >
                  {b.label}
                  <span
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{ border: `1px solid ${b.color}`, transform: "translate(2px, -2px)" }}
                  />
                </span>
              ))}
            </div>
          </header>

          {/* INTEGRATION STRIP */}
          <div className="flex gap-3 mb-10 flex-wrap">
            {["WALLET", "DEX-MARKET", "OKX-AI", "X402"].map((name) => (
              <span key={name} className="text-[10px] uppercase tracking-[1px] text-dim font-mono flex items-center gap-1">
                <span className="w-1 h-1 bg-[#00ffff]" style={{ boxShadow: "0 0 6px rgba(0,255,255,.6)" }} />
                {name}
              </span>
            ))}
          </div>

          {children}
        </div>

        {/* Corner brackets - rendered OUTSIDE the clipped card to avoid clipping */}
        {/* Cyan top-left */}
        <div className="absolute pointer-events-none" style={{ top: 6, left: 6, width: 20, height: 20, border: "2px solid #00ffff", borderRight: 0, borderBottom: 0, boxShadow: "0 0 8px rgba(0,255,255,0.5)" }} />
        {/* Cyan top-right */}
        <div className="absolute pointer-events-none" style={{ top: 6, right: 6, width: 20, height: 20, border: "2px solid #00ffff", borderLeft: 0, borderBottom: 0, boxShadow: "0 0 8px rgba(0,255,255,0.5)" }} />
        {/* Pink bottom-left */}
        <div className="absolute pointer-events-none" style={{ bottom: 6, left: 6, width: 20, height: 20, border: "2px solid #ff2d95", borderRight: 0, borderTop: 0, boxShadow: "0 0 8px rgba(255,45,149,0.5)" }} />
        {/* Pink bottom-right */}
        <div className="absolute pointer-events-none" style={{ bottom: 6, right: 6, width: 20, height: 20, border: "2px solid #ff2d95", borderLeft: 0, borderTop: 0, boxShadow: "0 0 8px rgba(255,45,149,0.5)" }} />
      </div>
    </div>
  );
}

interface TerminalProps {
  children: ReactNode;
}

export function TypingText({ text, delay = 30 }: { text: string; delay?: number }) {
  const shouldReduce = useReducedMotion() === true;
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const frame = requestAnimationFrame(() => {
      if (shouldReduce) {
        setDisplayed(text);
        setDone(true);
        return;
      }
      let index = 0;
      setDisplayed("");
      setDone(false);
      interval = setInterval(() => {
        setDisplayed(text.slice(0, index + 1));
        index += 1;
        if (index >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, delay);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (interval) clearInterval(interval);
    };
  }, [text, delay, shouldReduce]);
  return (<span>{displayed}{!done && <span className="animate-pulse">▌</span>}</span>);
}

export function SlideIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const shouldReduce = useReducedMotion() === true;
  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduce ? { duration: 0 } : { delay, duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
