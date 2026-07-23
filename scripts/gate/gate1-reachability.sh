#!/usr/bin/env bash
# Gate 1 - Reachability + registration (OKX Test 1)
# Reads the registered endpoint straight from the chain (no hardcoded URL) and
# asserts serviceList is non-empty, its endpoint is the public wine-mu URL, and
# that URL returns HTTP 200 (not a 302-to-Vercel-SSO).
set -euo pipefail
cd "$(dirname "$0")/../.."

AGENT_JSON="$(onchainos agent get-agents --agent-ids 6013)"
mkdir -p docs/listing-gate
echo "$AGENT_JSON" > docs/listing-gate/gate1-agent.json

# 1a. serviceList must be NON-EMPTY
LEN="$(echo "$AGENT_JSON" | jq '[.. | .serviceList? // empty] | add | length // 0')"
if [ "$LEN" -eq 0 ]; then
  echo "FAIL Gate1: serviceList is EMPTY on-chain -> route to Plan 2 (register wine-mu URL)"; exit 1
fi

# 1b. extract the registered endpoint and assert it is the public wine-mu host
URL="$(echo "$AGENT_JSON" | jq -r '[.. | .serviceList? // empty] | add | .[].endpoint // empty' | head -n1)"
echo "registered endpoint: $URL"
case "$URL" in
  https://alter-ego-wine-mu.vercel.app*) : ;;
  *) echo "FAIL Gate1: registered endpoint '$URL' is NOT the public wine-mu URL -> route to Plan 2"; exit 1 ;;
esac
case "$URL" in
  *alter-ego-demo.vercel.app*) echo "FAIL Gate1: registered the auth-walled demo URL (302->SSO) -> route to Plan 2"; exit 1 ;;
esac

# 1c. the registered URL must resolve publicly with 200, NOT a 302-to-login
CODE="$(curl -s -o /dev/null -w '%{http_code}' -I "$URL")"
echo "curl -sI $URL -> $CODE"
if [ "$CODE" != "200" ]; then
  echo "FAIL Gate1: registered URL returned $CODE (expected 200; 302 = Vercel SSO wall) -> route to Plan 2 + turn off deployment protection"; exit 1
fi

# 1d. explicitly prove it is not a redirect to a vercel login
LOC="$(curl -s -o /dev/null -w '%{redirect_url}' -I "$URL")"
if echo "$LOC" | grep -qiE 'sso-api|vercel.com/sso|login'; then
  echo "FAIL Gate1: URL redirects to Vercel SSO ($LOC) -> route to Plan 2"; exit 1
fi

echo "PASS Gate1: serviceList non-empty, endpoint=$URL, HTTP 200, no SSO redirect"
