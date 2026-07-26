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
      <label htmlFor="wallets" className="font-mono text-[11px] uppercase tracking-[2px] text-accent block" style={{ textShadow: "0 0 8px rgba(255,45,149,.3)" }}>
        &gt; Wallet Addresses
      </label>
      <textarea
        id="wallets"
        value={addresses}
        onChange={(e) => setAddresses(e.target.value)}
        placeholder={"0x...a3f7    Ethereum / X Layer / Base\nSvmBase58...  Solana\n\n# One address per line. Chains auto-detected."}
        rows={4}
        aria-describedby={error ? "wallet-error" : undefined}
        aria-invalid={!!error}
        className="input-arcade w-full min-h-[120px] p-5 font-mono text-sm leading-relaxed"
        disabled={isLoading}
      />
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading || !addresses.trim()}
          className="btn-primary text-[11px] tracking-[2px] px-10 py-[18px]"
        >
          ▶ ANALYZE
        </button>
        {onDemoLaunch && (
          <button
            type="button"
            onClick={onDemoLaunch}
            className="btn-ghost text-[10px] tracking-[1px] px-5 py-[18px]"
          >
            LOAD DEMO
          </button>
        )}
      </div>
      {error && <p id="wallet-error" role="alert" className="text-accent font-mono text-[11px] mt-2">{error}</p>}
    </form>
  );
}
