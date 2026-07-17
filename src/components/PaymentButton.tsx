// [DEMO MODE] x402 payment simulation — no real USDC settlement. Post-hackathon: integrate @okx/x402-sdk.
"use client";
import { useState } from "react";

export function PaymentButton({ tier, price }: { tier: string; price: string }) {
  const [state, setState] = useState<"idle" | "simulating" | "done">("idle");
  const handleClick = () => { setState("simulating"); setTimeout(() => setState("done"), 1500); };
  return (
    <button onClick={handleClick} disabled={state !== "idle"}
      className={`font-pixel text-[10px] uppercase tracking-[2px] px-8 py-4 transition-all ${
        state === "idle" ? "bg-[#ff2d95] text-white cursor-pointer" :
        state === "simulating" ? "bg-[rgba(255,45,149,.2)] text-[#ff2d95] border border-[#ff2d95]" :
        "bg-[rgba(0,255,255,.1)] text-[#00ffff] border border-[#00ffff]"
      }`}
      style={state === "idle" ? { boxShadow: "0 0 30px rgba(255,45,149,.25)" } : undefined}
    >
      {state === "idle" && `${tier} — ${price}`}
      {state === "simulating" && "Processing x402..."}
      {state === "done" && "✓ Payment Simulated"}
    </button>
  );
}
