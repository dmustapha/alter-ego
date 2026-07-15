export default function ProofPage() {
  return (
    <div className="min-h-screen bg-black text-emerald-400 font-mono p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Alter Ego — Integration Proof</h1>

        <section>
          <h2 className="text-lg text-emerald-300 mb-4">OnchainOS Integrations</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-emerald-500/20">
                <th className="text-left py-2">Skill</th>
                <th className="text-left py-2">Command</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-emerald-500/10">
                <td className="py-2">okx-agentic-wallet</td>
                <td className="py-2 text-gray-400">portfolio all-balances, security approvals</td>
                <td className="py-2 text-emerald-400">✓ Verified</td>
              </tr>
              <tr className="border-b border-emerald-500/10">
                <td className="py-2">okx-dex-market</td>
                <td className="py-2 text-gray-400">leaderboard list, portfolio-overview</td>
                <td className="py-2 text-emerald-400">✓ Verified</td>
              </tr>
              <tr className="border-b border-emerald-500/10">
                <td className="py-2">okx-ai</td>
                <td className="py-2 text-gray-400">agent create asp, ERC-8004 identity</td>
                <td className="py-2 text-emerald-400">✓ Verified</td>
              </tr>
              <tr className="border-b border-emerald-500/10">
                <td className="py-2">okx-agent-payments-protocol</td>
                <td className="py-2 text-gray-400">x402 gate (demo mode)</td>
                <td className="py-2 text-amber-400">◐ Mocked</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-lg text-emerald-300 mb-4">ERC-8004 Identity</h2>
          <p className="text-sm text-gray-400">
            Agent identity registered via okx-ai skill. Token minted on X Layer (chain 196).
            Identity Registry + Reputation Registry + Validation Registry per EIP-8004 Draft.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-emerald-300 mb-4">TEE Attestation</h2>
          <p className="text-sm text-gray-400">
            Behavioral fingerprint sealed in OKX Agentic Wallet TEE.
            Pre-computed attestation shown in demo. Live attestation generated post-hackathon.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-emerald-300 mb-4">ASP Listing</h2>
          <p className="text-sm text-gray-400">
            Alter Ego listed on OKX.AI marketplace. Category: Lifestyle.
            Service Type: A2A. Pricing: Negotiated per session.
          </p>
        </section>
      </div>
    </div>
  );
}
