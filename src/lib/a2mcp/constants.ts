// Re-export the canonical x402 literals from the OKX Payment SDK module (single source of truth).
// Do NOT hardcode the USDT0 address or any other literal here; okx-x402.ts pins them.
export {
  XLAYER_NETWORK, // "eip155:196"
  XLAYER_CHAIN_INDEX, // 196
  USDT0_ADDRESS, // USDT0 X Layer address
  USDT0_DECIMALS, // 6
  X402_TIMEOUT_SECONDS, // 300
  X402_AMOUNT_ATOMIC, // "1000000" (1 USDT0 at 6dp)
  X402_FEE_USDT, // "1" (marketplace fee, digits only)
} from "@/lib/x402/okx-x402";
