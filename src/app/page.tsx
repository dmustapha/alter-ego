"use client";
import { useState, useRef, useEffect } from "react";
import { Terminal, TypingText, SlideIn } from "@/components/Terminal";
import { WalletInput } from "@/components/WalletInput";
import { PatternCard } from "@/components/PatternCard";
import { PersonaCard } from "@/components/PersonaCard";
import { RoastBattle } from "@/components/RoastBattle";
import { CompareCard } from "@/components/CompareCard";
import { PaymentButton } from "@/components/PaymentButton";
import type { AnalyzeResponse } from "@/lib/types";

type Phase = "landing" | "scanning" | "results" | "battle" | "compare" | "cta";

const launchDemo = (handle: (a: Array<{ address: string; chains: string[] }>) => void) =>
  handle([{ address: "0xDemo...", chains: ["ethereum"] }, { address: "SolDemo...", chains: ["solana"] }]);

export default function Home() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [battleData, setBattleData] = useState<import("@/lib/types").RoastBattle | null>(null);
  const [compareData, setCompareData] = useState<import("@/lib/types").CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [addressCount, setAddressCount] = useState(0);
  const phaseTimers = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => { return () => phaseTimers.current.forEach(clearTimeout); }, []);

  const handleAnalyze = async (addresses: Array<{ address: string; chains: string[] }>) => {
    setLoading(true); setAddressCount(addresses.length); setPhase("scanning");
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addresses }) });
      const json: AnalyzeResponse = await res.json(); setData(json);
      const t1 = setTimeout(() => setPhase("results"), 2000);
      const t2 = setTimeout(() => { fetch("/api/roast").then(r => r.json()).then(d => { if (d.battle) setBattleData(d.battle); setPhase("battle"); }).catch(() => setPhase("battle")); }, 20000);
      const t3 = setTimeout(() => { fetch("/api/compare").then(r => r.json()).then(d => { if (d.comparison) setCompareData(d.comparison); setPhase("compare"); }).catch(() => setPhase("compare")); }, 58000);
      const t4 = setTimeout(() => setPhase("cta"), 76000);
      phaseTimers.current = [t1, t2, t3, t4];
    } catch { setPhase("landing"); } finally { setLoading(false); }
  };

  return (
    <Terminal>
      {phase === "landing" && (
        <>
          {/* HERO — spacious */}
          <div className="mb-12">
            <SlideIn>
              <h1 className="font-pixel text-[28px] leading-[1.5] uppercase tracking-[2px] text-[#f0f0ff]">
                Every wallet<br />has a{" "}
                <em className="not-italic text-[#00ffff]" style={{ textShadow: "0 0 30px rgba(0,255,255,.35)" }}>
                  story
                </em>
                .
              </h1>
            </SlideIn>
            <SlideIn delay={0.4}>
              <p className="text-base text-[rgba(160,160,210,.45)] mt-6 leading-relaxed max-w-[620px]">
                A TEE-bound agent that ingests your complete on-chain history across every wallet and chain. Classifies patterns. Builds a persona. Then your Ethereum self and Solana self face off in a roast battle built on real data. Self-knowledge is the product.
              </p>
            </SlideIn>
          </div>

{/* DEMO MODE BADGE */}
           <SlideIn delay={0.6}>
             <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 border border-[rgba(255,45,149,.25)] bg-[rgba(255,45,149,.06)]" style={{ clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)" }}>
               <span className="w-1.5 h-1.5 rounded-full bg-[#ff2d95] animate-pulse" />
               <span className="font-mono text-[10px] uppercase tracking-[2px] text-[#ff2d95]">Demo Mode — Pre-computed Data</span>
             </div>
           </SlideIn>

           {/* CONTENT GRID */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-12">
            {/* INPUT */}
            <SlideIn delay={0.8}>
              <WalletInput
                onSubmit={handleAnalyze}
                isLoading={loading}
                onDemoLaunch={() => launchDemo(handleAnalyze)}
              />
            </SlideIn>

            {/* PERSONA SIDEBAR */}
            <SlideIn delay={1.2}>
              <div className="space-y-5">
                <div className="font-pixel text-[8px] uppercase tracking-[3px] text-[rgba(160,160,210,.45)] pb-3 border-b-2 border-[rgba(255,45,149,.1)]">
                  ┃ Same Trader · Two Selves
                </div>
                {[
                  { chain: "Ethereum", name: "📊 The Professional", pnl: "+$12,847", up: true, amps: ["Diamond Hands", "Patient Accumulator"], grds: ["Gas Guzzler"], stats: [{ v: "61%", l: "Win Rate" }, { v: "47d", l: "Avg Hold" }, { v: "1,243", l: "Trades" }], leftColor: "#00ffff" },
                  { chain: "Solana", name: "🔫 The Sniper", pnl: "-$8,320", up: false, amps: ["Meme Sniper"], grds: ["Rug Roulette", "Paper Trader"], stats: [{ v: "32%", l: "Win Rate" }, { v: "4h", l: "Avg Hold" }, { v: "4,891", l: "Trades" }], leftColor: "#ff2d95" },
                ].map((p, i) => (
                  <div
                    key={i}
                    className="relative bg-[#0a0a1a] border border-[rgba(255,45,149,.1)] p-8"
                    style={{ borderLeft: `5px solid ${p.leftColor}`, boxShadow: `4px 0 12px ${p.leftColor}14` }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-pixel text-[7px] uppercase tracking-[2px] text-[rgba(160,160,210,.45)]">{p.chain}</div>
                        <div className="text-lg font-bold text-[#f0f0ff] mt-1">{p.name}</div>
                      </div>
                      <div className={`font-pixel text-[17px] ${p.up ? "text-[#00ffff]" : "text-[#ff2d95]"}`} style={{ textShadow: p.up ? "0 0 12px rgba(0,255,255,.4)" : "0 0 12px rgba(255,45,149,.4)" }}>
                        {p.pnl}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap mb-4">
                      {p.amps.map(t => <span key={t} className="font-pixel text-[7px] uppercase tracking-[.5px] px-3 py-[6px] border border-[#00ffff] text-[#00ffff] bg-[rgba(0,255,255,.03)]">{t}</span>)}
                      {p.grds.map(t => <span key={t} className="font-pixel text-[7px] uppercase tracking-[.5px] px-3 py-[6px] border border-[#ff2d95] text-[#ff2d95] bg-[rgba(255,45,149,.03)]">{t}</span>)}
                    </div>
                    <div className="flex gap-10 pt-4 border-t border-[rgba(255,45,149,.1)]">
                      {p.stats.map(s => (
                        <div key={s.l} className="flex flex-col gap-1">
                          <span className="text-lg font-bold text-[#f0f0ff]">{s.v}</span>
                          <span className="font-pixel text-[6px] uppercase text-[rgba(160,160,210,.45)]">{s.l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SlideIn>
          </div>

          {/* STATS BAR */}
          <SlideIn delay={1.6}>
            <div className="grid grid-cols-2 md:grid-cols-4 mb-12" style={{ gap: "1px", background: "linear-gradient(90deg, rgba(255,45,149,.1), rgba(0,255,255,.1))" }}>
              {[{ n: "4", l: "CHAINS" }, { n: "6,134", l: "TRANSACTIONS" }, { n: "$4,527", l: "NET PNL" }, { n: "TEE", l: "SEALED" }].map(s => (
                <div key={s.l} className="bg-[#0a0a1a] py-4 text-center">
                  <div className="font-pixel text-[18px] text-[#00ffff] mb-1" style={{ textShadow: "0 0 8px rgba(0,255,255,.3)" }}>{s.n}</div>
                  <div className="font-pixel text-[6px] uppercase tracking-[1px] text-[rgba(160,160,210,.45)]">{s.l}</div>
                </div>
              ))}
            </div>
          </SlideIn>

          {/* FOOTER */}
          <SlideIn delay={2}>
            <div className="pt-5 border-t-2 border-[rgba(255,45,149,.1)] flex justify-between items-center">
              <span className="text-sm text-[rgba(160,160,210,.45)]">OKX.AI Genesis · Lifestyle Companion + Social Buzz · #OKXAI</span>
              <span className="font-pixel text-[7px] uppercase tracking-[1px] px-4 py-2 border border-[#00ffff] text-[#00ffff] bg-[rgba(0,255,255,.03)] flex items-center gap-2">
                🔒 ATTESTATION: 0x7f3a...b91e
              </span>
            </div>
          </SlideIn>
        </>
      )}

      {phase === "scanning" && (
        <SlideIn><TypingText text={`Analyzing ${addressCount} wallet${addressCount !== 1 ? "s" : ""}... Connecting to OnchainOS...`} /></SlideIn>
      )}
      {phase === "results" && data && (
        <div className="space-y-8">
          <SlideIn><TypingText text={`${data.wallets} wallets. ${data.chains.length} chains. ${data.totalTxns.toLocaleString()} transactions. I see you. ALL of you.`} /></SlideIn>
          <div className="grid grid-cols-2 gap-6">
            {data.personas.map((p, i) => (<SlideIn key={i} delay={i * 0.5}><PersonaCard persona={p} delay={i * 0.3} /></SlideIn>))}
          </div>
          <SlideIn delay={1.5}><p className="text-center text-[rgba(160,160,210,.45)] text-sm">Same person. Two completely different traders.</p></SlideIn>
          {data.patterns.map((pr, i) => (
            <div key={i} className="space-y-2">
              <SlideIn delay={i * 0.3 + 2}>
                <h3 className="font-pixel text-[7px] uppercase tracking-[2px] text-[rgba(160,160,210,.45)] border-b border-[rgba(255,45,149,.1)] pb-1 mb-2">
                  {pr.chain === "solana" ? "SOLANA SELF" : "ETHEREUM SELF"}
                </h3>
              </SlideIn>
              <div className="space-y-2">
                {pr.amplify.map((p, j) => (<SlideIn key={p.id} delay={i * 0.5 + j * 0.15 + 2}><PatternCard pattern={p} /></SlideIn>))}
                {pr.guard.map((p, j) => (<SlideIn key={p.id} delay={i * 0.5 + (pr.amplify.length + j) * 0.15 + 2}><PatternCard pattern={p} /></SlideIn>))}
              </div>
            </div>
          ))}
        </div>
      )}
      {phase === "battle" && battleData && (<SlideIn><RoastBattle battle={battleData} /></SlideIn>)}
      {phase === "compare" && compareData && (<SlideIn><CompareCard comparison={compareData} /></SlideIn>)}
      {phase === "cta" && (
        <div className="space-y-8 text-center">
          <SlideIn>
            <span className="font-pixel text-[7px] uppercase tracking-[1px] px-4 py-2 border border-[#00ffff] text-[#00ffff] bg-[rgba(0,255,255,.03)] inline-flex items-center gap-2">🔒 ATTESTATION VERIFIED</span>
          </SlideIn>
          <SlideIn delay={0.5}><p className="text-[#f0f0ff] text-xl font-bold">Alter Ego. Know thyself. Then know everyone else.</p></SlideIn>
          <SlideIn delay={1}><PaymentButton tier="Snapshot" price="$0.99" /></SlideIn>
          <SlideIn delay={1.5}><p className="text-[rgba(160,160,210,.45)] text-xs">Live on OKX.AI · Lifestyle Companion + Social Buzz · #OKXAI</p></SlideIn>
        </div>
      )}
    </Terminal>
  );
}
