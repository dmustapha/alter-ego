# x402 Settlement Proof (Alter Ego #6013)

Real end-to-end x402 micropayment settled on-chain on X Layer (chainId 196, eip155:196).

- **Settlement tx:** `0x59eebfc91fac2ffa203de3b3d04a6820eda223404d0f6512db0fe6e72353d103`
- **Explorer:** https://www.oklink.com/xlayer/tx/0x59eebfc91fac2ffa203de3b3d04a6820eda223404d0f6512db0fe6e72353d103
- **Payer (external buyer):** `0xcf88688b4A31787E8E5609dE724073C9aEDE7334`
- **payTo (seller):** `0xd97c85d61337f8e4366bff2d8b482cfc59d76340`
- **Token:** USDT0 `0x779ded0c9e1022225f8e0630b35a9b54be713736` (6 decimals)
- **Amount:** 10000 (0.01 USDT0)
- **Facilitator status:** success (syncSettle, on-chain confirmed)

Reproduce: fund an external X Layer wallet with USDT0, set `X402_PAYER_KEY`, run `node scripts/buy-a2mcp.mjs` against the live `/api/a2mcp`. The decoded `PAYMENT-RESPONSE` header carries the settlement tx hash.
