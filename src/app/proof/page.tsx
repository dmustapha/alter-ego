import { Terminal } from "@/components/Terminal";

export default function ProofPage() {
  return (
    <Terminal>
      <h1 className="font-pixel text-[14px] uppercase tracking-[2px] text-[#f0f0ff] mb-8">Alter Ego — Integration Proof</h1>
      <section className="mb-8">
        <h2 className="font-pixel text-[8px] uppercase tracking-[2px] text-[#00ffff] mb-4">OnchainOS Integrations</h2>
        <table className="w-full">
          <thead><tr className="border-b border-[rgba(255,45,149,.1)]"><th className="text-left py-2 font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">Skill</th><th className="text-left py-2 font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">Command</th><th className="text-left py-2 font-pixel text-[7px] uppercase text-[rgba(160,160,210,.45)]">Status</th></tr></thead>
          <tbody className="text-sm">
            {[["okx-agentic-wallet","portfolio all-balances, security approvals","✓ Verified"],["okx-dex-market","leaderboard list, portfolio-overview","✓ Verified"],["okx-ai","agent create asp, ERC-8004 identity","✓ Verified"],["okx-agent-payments-protocol","x402 gate (demo mode)","◐ Mocked"]].map(([s,c,st],i)=>(
              <tr key={i} className="border-b border-[rgba(255,45,149,.06)]"><td className="py-2 text-[#d0d0f0]">{s}</td><td className="py-2 text-[rgba(160,160,210,.45)]">{c}</td><td className={`py-2 ${st.includes("✓")?"text-[#00ffff]":"text-[#ffff00]"}`}>{st}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      {[["ERC-8004 Identity","Agent identity registered via okx-ai skill. Token minted on X Layer (chain 196)."],["TEE Attestation","Behavioral fingerprint sealed in OKX Agentic Wallet TEE."],["ASP Listing","Alter Ego listed on OKX.AI marketplace. Category: Lifestyle. Service Type: A2A."]].map(([t,d],i)=>(
        <section key={i} className="mb-6"><h2 className="font-pixel text-[8px] uppercase tracking-[2px] text-[#00ffff] mb-2">{t}</h2><p className="text-sm text-[rgba(160,160,210,.45)] leading-relaxed">{d}</p></section>
      ))}
    </Terminal>
  );
}
