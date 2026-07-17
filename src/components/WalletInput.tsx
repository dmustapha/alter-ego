"use client";
import { useState } from "react";

interface WalletInputProps {
  onSubmit: (addresses: Array<{ address: string; chains: string[] }>) => void;
  isLoading: boolean;
  onDemoLaunch?: () => void;
}

export function WalletInput({ onSubmit, isLoading, onDemoLaunch }: WalletInputProps) {
  const [addresses, setAddresses] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const lines = addresses.split("\n").filter(Boolean);
    const parsed: Array<{ address: string; chains: string[] }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const addrMatch = line.match(/^(\S+)\s*(.*)$/);
      if (!addrMatch) {
        setError(`Line ${i + 1}: Could not parse address. Format: 0x...abc (Ethereum, Solana)`);
        return;
      }
      const addr = addrMatch[1];
      let chainStr = addrMatch[2].trim();
      if (!chainStr) { parsed.push({ address: addr, chains: ["ethereum"] }); continue; }
      const chains = chainStr.replace(/[()]/g, "").split(/,\s*/).filter(Boolean);
      parsed.push({ address: addr, chains: chains.length > 0 ? chains : ["ethereum"] });
    }

    if (parsed.length === 0) { setError("Enter at least one wallet address."); return; }
    if (parsed.length > 5) { setError("Maximum 5 wallets for the demo."); return; }
    onSubmit(parsed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="font-pixel text-[8px] uppercase tracking-[2px] text-[#ff2d95]" style={{ textShadow: "0 0 8px rgba(255,45,149,.3)" }}>
        &gt; Wallet Addresses
      </div>
      <textarea
        value={addresses}
        onChange={(e) => setAddresses(e.target.value)}
        placeholder={"0x...a3f7    Ethereum / X Layer / Base\nSvmBase58...  Solana\n\n# One address per line. Chains auto-detected."}
        rows={4}
        className="w-full min-h-[120px] bg-[#08081a] border-2 border-[rgba(255,45,149,.2)] p-5 text-[#00ffff] font-mono text-sm leading-relaxed resize-none outline-none transition-all placeholder:text-[#00ffff]/10 focus:border-[#ff2d95]"
        style={{ boxShadow: "none" }}
        onFocus={(e) => (e.target.style.boxShadow = "0 0 20px rgba(255,45,149,.2), inset 0 0 20px rgba(255,45,149,.03)")}
        onBlur={(e) => (e.target.style.boxShadow = "none")}
        disabled={isLoading}
      />
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading || !addresses.trim()}
          className="font-pixel text-[11px] uppercase tracking-[2px] px-10 py-[18px] bg-[#ff2d95] border-none text-white cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ boxShadow: "0 0 35px rgba(255,45,149,.25)", letterSpacing: "2px" }}
          onMouseEnter={(e) => { if (!isLoading && addresses.trim()) { (e.target as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.target as HTMLButtonElement).style.boxShadow = "0 0 50px rgba(255,45,149,.4)"; } }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.transform = ""; (e.target as HTMLButtonElement).style.boxShadow = "0 0 35px rgba(255,45,149,.25)"; }}
        >
          ▶ ANALYZE
        </button>
        {onDemoLaunch && (
          <button
            type="button"
            onClick={onDemoLaunch}
            className="font-pixel text-[8px] uppercase tracking-[1px] px-5 py-[18px] bg-transparent border border-white/5 text-[rgba(160,160,210,.45)] cursor-pointer transition-all hover:border-[#00ffff] hover:text-[#00ffff]"
          >
            LOAD DEMO
          </button>
        )}
      </div>
      {error && <p className="text-[#ff2d95] font-pixel text-[7px] uppercase mt-2">{error}</p>}
    </form>
  );
}
