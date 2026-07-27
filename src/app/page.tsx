"use client";
import { useState, useRef, useEffect } from "react";
import { Terminal, TypingText, SlideIn } from "@/components/Terminal";
import { WalletInput } from "@/components/WalletInput";
import { PatternCard } from "@/components/PatternCard";
import { PersonaCard } from "@/components/PersonaCard";
import { RoastBattle } from "@/components/RoastBattle";
import { CompareCard } from "@/components/CompareCard";
import { PaymentButton } from "@/components/PaymentButton";
import { ScanProgress } from "@/components/ScanProgress";
import type { AnalyzeResponse, AnalyzeProgress } from "@/lib/types";

type Phase = "landing" | "scanning" | "results" | "battle" | "compare" | "cta" | "error";

const launchDemo = (
  handle: (a: Array<{ address: string; chains: string[] }>, deep?: boolean) => void
) =>
  handle([
    { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chains: ["ethereum"] },
    { address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", chains: ["solana"] },
  ]);

export default function Home() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [battleData, setBattleData] = useState<import("@/lib/types").RoastBattle | null>(null);
  const [compareData, setCompareData] = useState<import("@/lib/types").CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [addressCount, setAddressCount] = useState(0);
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const phaseTimers = useRef<NodeJS.Timeout[]>([]);
  const isAnalyzing = useRef(false);

  useEffect(() => { return () => phaseTimers.current.forEach(clearTimeout); }, []);

  // Post-analysis presentation reel, scheduled from the moment results land.
  const startReel = () => {
    const t1 = setTimeout(() => setPhase("results"), 600);
    const t2 = setTimeout(() => {
      fetch("/api/roast").then(r => r.json()).then(d => { if (d.battle) setBattleData(d.battle); setPhase("battle"); }).catch(() => { setError("Roast data unavailable, continuing demo"); setPhase("battle"); });
    }, 18000);
    const t3 = setTimeout(() => {
      fetch("/api/compare").then(r => r.json()).then(d => { if (d.comparison) setCompareData(d.comparison); setPhase("compare"); }).catch(() => { setError("Comparison data unavailable, continuing demo"); setPhase("compare"); });
    }, 56000);
    const t4 = setTimeout(() => { setPhase("cta"); isAnalyzing.current = false; }, 74000);
    phaseTimers.current = [t1, t2, t3, t4];
  };

  const handleAnalyze = async (addresses: Array<{ address: string; chains: string[] }>, deep = false) => {
    if (isAnalyzing.current) return;
    isAnalyzing.current = true;
    phaseTimers.current.forEach(clearTimeout);
    setError(null); setProgress(null);
    setLoading(true); setAddressCount(addresses.length); setPhase("scanning");
    try {
      const res = await fetch("/api/analyze?stream=1", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({ addresses, deep }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error (${res.status})`);
      }

      // Consume the NDJSON progress stream line-by-line.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let result: AnalyzeResponse | null = null;
      let lastProgress: AnalyzeProgress | null = null;
      let streaming = true;
      while (streaming) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const evt = JSON.parse(line);
          if (evt.type === "progress") {
            lastProgress = evt as AnalyzeProgress;
            setProgress(lastProgress);
          }
          else if (evt.type === "done") { result = evt.result as AnalyzeResponse; streaming = false; }
          else if (evt.type === "error") throw new Error(evt.error);
        }
      }
      if (!result) throw new Error("Analysis ended without a result. Please try again.");
      setProgress({
        stage: "done",
        detail: "Analysis complete",
        txns: result.totalTxns,
        calls: lastProgress?.calls ?? 0,
        pct: 100,
      });
      setData(result);
      startReel();
    } catch (e: any) {
      setError(e?.message || "Failed to analyze wallets. Please try again.");
      setPhase("error");
      isAnalyzing.current = false;
    } finally { setLoading(false); }
  };

  return (
    <Terminal>
      {error && phase !== "error" && (
        <div className="mb-4 px-4 py-2 border border-[rgba(255,45,149,.2)] bg-[rgba(255,45,149,.05)] text-accent text-xs font-mono">
          ⚠ {error}
        </div>
      )}
      {phase === "landing" && (
        <>
          {/* HERO (spacious) */}
          <div className="mb-12">
            <SlideIn>
              <h1 className="font-pixel text-[28px] leading-[1.5] uppercase tracking-[2px] text-text">
                Every wallet<br />has a{" "}
                <em className="not-italic text-secondary" style={{ textShadow: "0 0 30px rgba(0,255,255,.35)" }}>
                  story
                </em>
                .
              </h1>
            </SlideIn>
            <SlideIn delay={0.4}>
              <p className="text-base text-dim mt-6 leading-relaxed max-w-[620px]">
                Select wallets from any trader, team, or research cohort. Alter Ego reads their on-chain behavior, classifies evidence-backed patterns, and builds a profile for each wallet. Standard Scan retrieves up to 1,200 transactions per wallet-chain. Deep Scan retrieves up to 3,000, subject to available history.
              </p>
            </SlideIn>
          </div>

{/* DEMO MODE BADGE */}
           <SlideIn delay={0.6}>
             <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 border border-[rgba(255,45,149,.25)] bg-[rgba(255,45,149,.06)]" style={{ clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)" }}>
               <span className="w-1.5 h-1.5 rounded-full bg-[#ff2d95] animate-pulse" />
               <span className="font-mono text-[10px] uppercase tracking-[2px] text-accent">Live analysis · demo wallets available</span>
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
                <div className="font-mono text-[11px] uppercase tracking-[3px] text-dim pb-3 border-b-2 border-[rgba(255,45,149,.1)]">
                  ┃ Compare selected wallets
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[1px] text-[rgba(255,45,149,.55)]">Illustrative layout. Run a scan to generate evidence-backed wallet profiles.</p>
                {[
                  { chain: "Ethereum", name: "📊 The Professional", amps: ["Diamond Hands", "Patient Accumulator"], grds: ["Gas Guzzler"], stats: [{ v: "Patient", l: "Style" }, { v: "Low", l: "Risk Flags" }], leftColor: "#00ffff" },
                  { chain: "Solana", name: "⚡ The Operator", amps: ["Fast Execution"], grds: ["Concentration Risk", "High Turnover"], stats: [{ v: "Fast", l: "Style" }, { v: "High", l: "Risk Flags" }], leftColor: "#ff2d95" },
                ].map((p, i) => (
                  <div
                    key={i}
                    className="relative bg-surface border border-[rgba(255,45,149,.1)] p-8"
                    style={{ borderLeft: `5px solid ${p.leftColor}`, boxShadow: `4px 0 12px ${p.leftColor}14` }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[2px] text-dim">{p.chain}</div>
                        <div className="text-lg font-bold text-text mt-1">{p.name}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap mb-4">
                      {p.amps.map(t => <span key={t} className="font-mono text-[10px] uppercase tracking-[.5px] px-3 py-[6px] border border-[#00ffff] text-secondary bg-[rgba(0,255,255,.03)]">{t}</span>)}
                      {p.grds.map(t => <span key={t} className="font-mono text-[10px] uppercase tracking-[.5px] px-3 py-[6px] border border-[#ff2d95] text-accent bg-[rgba(255,45,149,.03)]">{t}</span>)}
                    </div>
                    <div className="flex gap-10 pt-4 border-t border-[rgba(255,45,149,.1)]">
                      {p.stats.map(s => (
                        <div key={s.l} className="flex flex-col gap-1">
                          <span className="text-lg font-bold text-text">{s.v}</span>
                          <span className="font-mono text-[10px] uppercase text-dim">{s.l}</span>
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
              {[{ n: "3", l: "CHAINS" }, { n: "AMPLIFY", l: "STRENGTHS" }, { n: "GUARD", l: "RISKS" }, { n: "LIVE", l: "ONCHAINOS" }].map(s => (
                <div key={s.l} className="bg-surface py-4 text-center">
                  <div className="font-pixel text-[18px] text-secondary mb-1" style={{ textShadow: "0 0 8px rgba(0,255,255,.3)" }}>{s.n}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[1px] text-dim">{s.l}</div>
                </div>
              ))}
            </div>
          </SlideIn>

          {/* FOOTER */}
          <SlideIn delay={2}>
            <div className="pt-5 border-t-2 border-[rgba(255,45,149,.1)] flex justify-between items-center">
              <span className="text-sm text-dim">Built for OKX Build X · Onchain intelligence</span>
              <span className="font-mono text-[10px] uppercase tracking-[1px] px-4 py-2 border border-[#00ffff] text-secondary bg-[rgba(0,255,255,.03)] flex items-center gap-2">● Live wallet analysis</span>
            </div>
          </SlideIn>
        </>
      )}

      {phase === "scanning" && (
        <SlideIn><ScanProgress count={addressCount} progress={progress} /></SlideIn>
      )}
      {phase === "results" && data && (
        <div className="space-y-8">
          <SlideIn><TypingText text={`${data.wallets} wallets. ${data.chains.length} chains. ${data.totalTxns.toLocaleString()} transactions. I see you. ALL of you.`} /></SlideIn>
          <div className="grid grid-cols-2 gap-6">
            {data.personas.map((p, i) => (<SlideIn key={i} delay={i * 0.5}><PersonaCard persona={p} delay={i * 0.3} /></SlideIn>))}
          </div>
          <SlideIn delay={1.5}><p className="text-center text-dim text-sm">Compare any selected wallets. The evidence stays attached to every profile.</p></SlideIn>
          {data.patterns.map((pr, i) => (
            <div key={i} className="space-y-2">
              <SlideIn delay={i * 0.3 + 2}>
                <h3 className="font-mono text-[10px] uppercase tracking-[2px] text-dim border-b border-[rgba(255,45,149,.1)] pb-1 mb-2">
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
            <span className="font-mono text-[10px] uppercase tracking-[1px] px-4 py-2 border border-[#00ffff] text-secondary bg-[rgba(0,255,255,.03)] inline-flex items-center gap-2">🔒 TEE Attestation: Simulated for Demo</span>
          </SlideIn>
          <SlideIn delay={0.5}><p className="text-text text-xl font-bold">Alter Ego. Know thyself. Then know everyone else.</p></SlideIn>
          <SlideIn delay={1}><PaymentButton tier="Snapshot" price="$0.99" /></SlideIn>
          <SlideIn delay={1.5}><p className="text-dim text-xs">Live on OKX.AI · Lifestyle Companion + Social Buzz · #OKXAI</p></SlideIn>
        </div>
      )}
      {phase === "error" && (
        <SlideIn>
          <div className="text-center space-y-6 py-12">
            <p className="text-accent text-lg font-bold">{error || "Something went wrong."}</p>
            <button onClick={() => { setPhase("landing"); setError(null); setData(null); setBattleData(null); setCompareData(null); }}
              className="font-pixel text-[11px] uppercase tracking-[2px] px-8 py-4 bg-[#ff2d95] text-white">
              ▶ TRY AGAIN
            </button>
          </div>
        </SlideIn>
      )}
    </Terminal>
  );
}
