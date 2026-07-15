"use client";
import { useState } from "react";

interface WalletInputProps {
  onSubmit: (addresses: Array<{ address: string; chains: string[] }>) => void;
  isLoading: boolean;
}

export function WalletInput({ onSubmit, isLoading }: WalletInputProps) {
  const [addresses, setAddresses] = useState("");

  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const lines = addresses.split("\n").filter(Boolean);
    const parsed: Array<{ address: string; chains: string[] }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Address is first token; chains are in parentheses or space-separated after address
      const addrMatch = line.match(/^(\S+)\s*(.*)$/);
      if (!addrMatch) {
        setError(`Line ${i + 1}: Could not parse address. Format: 0x...abc (Ethereum, Solana)`);
        return;
      }
      const addr = addrMatch[1];
      let chainStr = addrMatch[2].trim();

      // Default: if no chains specified, assume ethereum
      if (!chainStr) {
        parsed.push({ address: addr, chains: ["ethereum"] });
        continue;
      }

      // Remove parentheses and split by comma
      const chains = chainStr.replace(/[()]/g, "").split(/,\s*/).filter(Boolean);
      if (chains.length === 0) {
        parsed.push({ address: addr, chains: ["ethereum"] });
      } else {
        parsed.push({ address: addr, chains });
      }
    }

    if (parsed.length === 0) {
      setError("Enter at least one wallet address.");
      return;
    }
    if (parsed.length > 5) {
      setError("Maximum 5 wallets for the demo.");
      return;
    }
    onSubmit(parsed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        value={addresses}
        onChange={(e) => setAddresses(e.target.value)}
        placeholder={`0x...a3f7 (Ethereum, X Layer, Base)\nSolanaBase58...b2e1 (Solana)`}
        rows={4}
        className="w-full bg-black border border-emerald-500/30 rounded p-3 text-emerald-400 
                   font-mono text-sm focus:border-emerald-400 focus:outline-none resize-none
                   placeholder:text-emerald-500/30"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !addresses.trim()}
        className="px-6 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded 
                   text-emerald-400 font-mono text-sm hover:bg-emerald-500/20 
                   disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "Scanning..." : "Begin Analysis →"}
      </button>
      {error && (
        <p className="text-red-400 text-xs font-mono mt-2">{error}</p>
      )}
    </form>
  );
}
