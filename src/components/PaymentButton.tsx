"use client";
import { useState } from "react";

export function PaymentButton({ tier, price }: { tier: string; price: string }) {
  const [state, setState] = useState<"idle" | "simulating" | "done">("idle");

  const handleClick = () => {
    setState("simulating");
    // Simulate 1.5s payment flow
    setTimeout(() => setState("done"), 1500);
  };

  return (
    <button
      onClick={handleClick}
      disabled={state !== "idle"}
      className={`
        px-4 py-2 rounded font-mono text-sm border border-emerald-500/30
        transition-all duration-300
        ${state === "idle" ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer" : ""}
        ${state === "simulating" ? "bg-amber-500/10 text-amber-400" : ""}
        ${state === "done" ? "bg-emerald-500/20 text-emerald-300" : ""}
      `}
    >
      {state === "idle" && `${tier} — ${price}`}
      {state === "simulating" && "Processing x402..."}
      {state === "done" && "✓ Payment Simulated"}
    </button>
  );
}
