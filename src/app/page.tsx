"use client";
import { useState } from "react";
import { Terminal, TypingText, SlideIn } from "@/components/Terminal";
import { WalletInput } from "@/components/WalletInput";
import { PatternCard } from "@/components/PatternCard";
import { PersonaCard } from "@/components/PersonaCard";
import { RoastBattle } from "@/components/RoastBattle";
import { CompareCard } from "@/components/CompareCard";
import { PaymentButton } from "@/components/PaymentButton";
import type { AnalyzeResponse } from "@/lib/types";

type Phase = "landing" | "scanning" | "results" | "battle" | "compare" | "cta";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [battleData, setBattleData] = useState<import("@/lib/types").RoastBattle | null>(null);
  const [compareData, setCompareData] = useState<import("@/lib/types").CompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (addresses: Array<{ address: string; chains: string[] }>) => {
    setLoading(true);
    setPhase("scanning");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses }),
      });
      const json: AnalyzeResponse = await res.json();
      setData(json);

      // Auto-advance through demo phases — timed to 90s total
      // Phase timing: scanning(2s) → results(18s) → battle(38s) → compare(18s) → cta(14s) = 90s
      setTimeout(() => setPhase("results"), 2000);                              // 2s: show wallet discovery
      setTimeout(() => {
        fetch("/api/roast").then(r => r.json()).then(d => {
          setBattleData(d.battle);
          setPhase("battle");
        });
      }, 20000);                                                                // 20s: begin roast battle
      setTimeout(() => {
        fetch("/api/compare").then(r => r.json()).then(d => {
          setCompareData(d.comparison);
          setPhase("compare");
        });
      }, 58000);                                                                // 58s: show crowd comparison
      setTimeout(() => setPhase("cta"), 76000);                                 // 76s: CTA + badge
    } catch (e) {
      console.error(e);
      setPhase("landing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Terminal>
      {phase === "landing" && (
        <div className="space-y-8">
          <SlideIn>
            <TypingText text="Every wallet has a story. Meet your Alter Ego." />
          </SlideIn>
          <SlideIn delay={1}>
            <p className="text-gray-500 text-sm font-mono">
              Paste your wallet addresses below. One per line. Format: address (chain, chain)
            </p>
          </SlideIn>
          <SlideIn delay={1.5}>
            <WalletInput onSubmit={handleAnalyze} isLoading={loading} />
          </SlideIn>
        </div>
      )}

      {phase === "scanning" && (
        <SlideIn>
          <TypingText text="Alter Ego initiating... Connecting to OnchainOS..." />
        </SlideIn>
      )}

      {phase === "results" && data && (
        <div className="space-y-8">
          <SlideIn>
            <TypingText
              text={`${data.wallets} wallets. ${data.chains.length} chains. ${data.totalTxns.toLocaleString()} transactions. I see you. ALL of you.`}
            />
          </SlideIn>

          {/* Persona reveal side by side */}
          <div className="grid grid-cols-2 gap-6">
            {data.personas.map((p, i) => (
              <SlideIn key={i} delay={i * 0.5}>
                <PersonaCard persona={p} delay={i * 0.3} />
              </SlideIn>
            ))}
          </div>

          <SlideIn delay={1.5}>
            <p className="text-center text-gray-500 text-sm font-mono">
              Same person. Two completely different traders.
            </p>
          </SlideIn>

          {/* Pattern cards */}
          {data.patterns.map((pr, i) => (
            <div key={i} className="space-y-2">
              <SlideIn delay={i * 0.3 + 2}>
                <h3 className="text-emerald-400 font-mono text-sm border-b border-emerald-500/20 pb-1 mb-2">
                  {pr.chain === "solana" ? "SOLANA SELF" : "ETHEREUM SELF"}
                </h3>
              </SlideIn>
              <div className="space-y-2">
                {pr.amplify.map((p, j) => (
                  <SlideIn key={p.id} delay={i * 0.5 + j * 0.15 + 2}>
                    <PatternCard pattern={p} />
                  </SlideIn>
                ))}
                {pr.guard.map((p, j) => (
                  <SlideIn key={p.id} delay={i * 0.5 + (pr.amplify.length + j) * 0.15 + 2}>
                    <PatternCard pattern={p} />
                  </SlideIn>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {phase === "battle" && battleData && (
        <SlideIn>
          <RoastBattle battle={battleData} />
        </SlideIn>
      )}

      {phase === "compare" && compareData && (
        <SlideIn>
          <CompareCard comparison={compareData} />
        </SlideIn>
      )}

      {phase === "cta" && (
        <div className="space-y-8 text-center">
          <SlideIn>
            <div className="flex items-center justify-center gap-2">
              <img src="/tee-badge.svg" alt="TEE-SECURED" className="h-10" />
            </div>
          </SlideIn>
          <SlideIn delay={0.5}>
            <p className="text-emerald-300 font-mono text-xl">
              Alter Ego. Know thyself. Then know everyone else.
            </p>
          </SlideIn>
          <SlideIn delay={1}>
            <div className="space-y-3">
              <PaymentButton tier="Snapshot" price="$0.99" />
            </div>
          </SlideIn>
          <SlideIn delay={1.5}>
            <p className="text-gray-500 text-xs font-mono">
              Live on OKX.AI • #OKXAI
            </p>
          </SlideIn>
        </div>
      )}
    </Terminal>
  );
}
