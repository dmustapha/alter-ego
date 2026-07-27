import { Terminal } from "@/components/Terminal";

export default function ProofPage() {
  return (
    <Terminal>
      <h1 className="font-pixel text-[14px] uppercase tracking-[2px] text-text mb-8">Alter Ego: Integration Proof</h1>
      <section className="mb-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[2px] text-[#00ffff] mb-4">OnchainOS Integrations</h2>
        <table className="w-full">
          <thead><tr className="border-b border-[rgba(255,45,149,.1)]"><th className="text-left py-2 font-mono text-[10px] uppercase text-dim">Skill</th><th className="text-left py-2 font-mono text-[10px] uppercase text-dim">Command</th><th className="text-left py-2 font-mono text-[10px] uppercase text-dim">Status</th></tr></thead>
          <tbody className="text-sm">
            {[["okx-agentic-wallet","wallet history and portfolio analysis","✓ Verified"],["okx-dex-market","market and portfolio enrichment","✓ Verified"],["okx-ai","ERC-8004 agent identity","✓ Verified"],["okx-agent-payments-protocol","x402-gated A2MCP analysis","✓ Settlement proven"]].map(([s,c,st],i)=>(
              <tr key={i} className="border-b border-[rgba(255,45,149,.06)]"><td className="py-2 text-[#d0d0f0]">{s}</td><td className="py-2 text-dim">{c}</td><td className={`py-2 ${st.includes("✓")?"text-[#00ffff]":"text-[#ffff00]"}`}>{st}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      {[["ERC-8004 Identity","Agent identity registered through the OKX AI integration on X Layer (chain 196)."],["x402 Settlement","A real external-buyer payment settled 0.01 USDT0 on X Layer. The transaction proof is documented in the public repository."],["A2MCP Analysis","Agents can request the analysis endpoint through a payment-gated protocol flow."]].map(([t,d],i)=>(
        <section key={i} className="mb-6"><h2 className="font-mono text-[11px] uppercase tracking-[2px] text-[#00ffff] mb-2">{t}</h2><p className="text-sm text-dim leading-relaxed">{d}</p></section>
      ))}
    </Terminal>
  );
}
