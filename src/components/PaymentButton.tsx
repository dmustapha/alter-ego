// [DEMO MODE] x402 payment simulation — no real USDC settlement. Post-hackathon: integrate @okx/x402-sdk.
"use client";
import { useState } from "react";

export function PaymentButton({ tier, price }: { tier: string; price: string }) {
  const [state, setState] = useState<"idle" | "simulating" | "done">("idle");
  const handleClick = () => { setState("simulating"); setTimeout(() => setState("done"), 1500); };
  return (
    <button onClick={handleClick} disabled={state !== "idle"} aria-live="polite"
      className={`text-[10px] uppercase tracking-[2px] px-8 py-4 ${
        state === "idle" ? "btn-primary" :
        state === "simulating" ? "font-pixel bg-[rgba(255,45,149,.2)] text-[#ff2d95] border border-[#ff2d95]" :
        "font-pixel bg-[rgba(0,255,255,.1)] text-[#00ffff] border border-[#00ffff]"
      }`}
    >
      {state === "idle" && `${tier}: ${price}`}
      {state === "simulating" && "Processing x402..."}
      {state === "done" && "✓ Payment Simulated"}
    </button>
  );
}
