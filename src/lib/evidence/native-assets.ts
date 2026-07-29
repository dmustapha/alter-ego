import type { EvidenceAsset, EvidenceChain } from "./types";

export interface CanonicalNativeAsset {
  readonly chain: EvidenceChain;
  readonly asset: EvidenceAsset;
  readonly decimals: number;
  readonly sourceAssetId: string;
}

export const CANONICAL_NATIVE_ASSETS: readonly CanonicalNativeAsset[] = Object.freeze([
  Object.freeze({ chain: Object.freeze({ id: "1", name: "ethereum" }), asset: Object.freeze({ address: null, symbol: "ETH" }), decimals: 18, sourceAssetId: "coingecko:ethereum" }),
  Object.freeze({ chain: Object.freeze({ id: "196", name: "xlayer" }), asset: Object.freeze({ address: null, symbol: "OKB" }), decimals: 18, sourceAssetId: "coingecko:okb" }),
  Object.freeze({ chain: Object.freeze({ id: "501", name: "solana" }), asset: Object.freeze({ address: null, symbol: "SOL" }), decimals: 9, sourceAssetId: "coingecko:solana" }),
]);

export function canonicalNativeAsset(chain: EvidenceChain): CanonicalNativeAsset | null {
  return CANONICAL_NATIVE_ASSETS.find((candidate) => candidate.chain.id === chain.id && candidate.chain.name === chain.name) ?? null;
}
