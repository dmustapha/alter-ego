#!/usr/bin/env bash
# Gate 2 - x402 standard validation (OKX Test 2)
# POSTs to the registered paid path, asserts 402, extracts the base64
# PAYMENT-REQUIRED header, and pipes it to the v2 decoder/assertion.
set -euo pipefail
cd "$(dirname "$0")/../.."

# read the registered endpoint from chain (same source as Gate 1)
BASE="$(onchainos agent get-agents --agent-ids 6013 | jq -r '[.. | .serviceList? // empty] | add | .[].endpoint // empty' | head -n1)"
[ -n "$BASE" ] || { echo "FAIL Gate2: no registered endpoint -> route to Plan 2"; exit 1; }
echo "paid endpoint under test: $BASE"

mkdir -p docs/listing-gate
# capture full response (headers + body) of a POST to the paid path
RESP="$(curl -i -s -X POST "$BASE" -H 'content-type: application/json' -d '{"address":"0x0000000000000000000000000000000000000001","chains":["ethereum"]}')"
echo "$RESP" > docs/listing-gate/gate2-raw-response.txt

# 2a. must be HTTP 402
STATUS="$(printf '%s' "$RESP" | head -n1 | tr -d '\r')"
echo "status line: $STATUS"
echo "$STATUS" | grep -q ' 402' || { echo "FAIL Gate2: paid path did not return 402 (got: $STATUS) -> route to Plan 3"; exit 1; }

# 2b. extract the base64 PAYMENT-REQUIRED header (byte-exact name)
HDR="$(printf '%s' "$RESP" | tr -d '\r' | grep -i '^PAYMENT-REQUIRED:' | head -n1 | sed 's/^[Pp][Aa][Yy][Mm][Ee][Nn][Tt]-[Rr][Ee][Qq][Uu][Ii][Rr][Ee][Dd]:[[:space:]]*//')"
[ -n "$HDR" ] || { echo "FAIL Gate2: no PAYMENT-REQUIRED header on the 402 -> route to Plan 3"; exit 1; }

# 2c. decode + assert the v2 challenge
printf '%s' "$HDR" | node scripts/gate/decode-payment-required.mjs

echo "PASS Gate2: 402 + valid base64 PAYMENT-REQUIRED v2 challenge (eip155:196, USDT0/6dp)"
