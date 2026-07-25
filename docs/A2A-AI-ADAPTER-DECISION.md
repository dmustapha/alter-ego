# A2A Adapter Decision (Plan 7 Task 2 spike)

Reconciled 2026-07-25 from live probes of `okx-a2a 0.1.9` on the Mac. This supersedes
the plan's Candidate-A/Candidate-B framing with the ground truth found below. No
em-dashes (standing rule).

## Ground truth found

1. **No custom/script provider slot.** `okx-a2a config provider` accepts ONLY
   `codex | claude | hermes | openclaw`. You cannot register a deterministic script as
   "the provider." So the plan's Candidate B ("wire the adapter as a custom provider")
   is not directly supported.

2. **The default provider authenticates via CLI subscription oauth, not a portable API
   key** (it is an alias to a `--dangerously-skip-permissions` CLI using local
   `~/.<cli>` credentials; no `ANTHROPIC_API_KEY` in env). Running that headless in a
   Fly container is auth-fragile and heavy. `codex` is present but has the same
   subscription-auth problem. This is the plan's flagged "single biggest unknown," and
   the evidence says it is a real cost/reliability liability.

3. **The XMTP primitives are standalone.** `okx-a2a task requests --json` lists pending
   inbound tasks; `okx-a2a session send --job-id <id> --content <text>` delivers a
   reply; `session create/query/find/history` manage the conversation. None of these
   require the AI subsession. `okx-a2a run` is the bundled daemon that heartbeats +
   syncs + auto-invokes `ai exec` on inbound; its LLM step is the only part we want to
   avoid.

4. **The analysis source is `/api/analyze`, not `/api/a2mcp`.** After this session's
   deploy, `/api/a2mcp` is x402-gated (returns 402). The ungated `/api/analyze` returns
   the full real analysis (2 personas, 3 patterns, 113 txns, archetype "The Allocator")
   in well under a second. The responder reads `/api/analyze`.

## Decision: Direction C - deterministic poll-and-respond (no LLM)

Replace `okx-a2a run` with our own lightweight always-on supervisor that runs two loops:

- **Presence loop:** `onchainos agent heartbeat --chain-index 196` every ~40s to hold
  `onlineStatus: 1` (unchanged mechanic from the presence-only scope).
- **Responder loop:** poll `okx-a2a task requests --json`; for each pending task,
  (1) parse the requester wallet address from the envelope (or use a sensible demo
  default for a bare "use agent 6013" prompt), (2) `POST /api/analyze` with a hard
  timeout, (3) `formatPersona(json)` into a bounded chat reply, (4) deliver via
  `okx-a2a session send --job-id <id> --content <reply>`.

### Why this over the LLM path

| Dimension | LLM-in-container (claude/codex) | Deterministic poll-and-respond |
|-----------|--------------------------------|-------------------------------|
| Auth in Docker | oauth creds, fragile, may fail headless | none (uses #6013 identity files already needed for presence) |
| Latency | LLM round trip (seconds, variable) | sub-second `/api/analyze` + immediate send |
| Cost | per-task LLM spend | zero |
| Timeout risk | real (the exact failure we are fixing) | negligible |
| Determinism | LLM may free-associate | fixed formatter, real analysis verbatim |
| Faithful to service | Alter Ego analysis is already deterministic | delivers the exact `/api/analyze` output |

Alter Ego's service is a deterministic analysis. An LLM adds cost, latency, and an auth
failure mode for zero benefit. Direction C is simpler, cheaper, faster, and strictly
more reliable against the timeout, which is the whole point of fixing Reason 3.

### Open verification (the remaining real spike)

The one thing still to prove with a LIVE inbound message: that `task requests` surfaces
an inbound `a2a-agent-chat` (with its own XMTP sync, independent of `okx-a2a run`) and
that `session send` delivers a reply the OKX platform accepts within its A2A timeout.
This needs a real trigger (the OKX.ai prompt "I would like to use the services of agent
ID 6013", or a peer agent). Until proven, the responder loop's exact
`task requests -> session send` round trip is the gate.

## Impact on Plan 7 tasks

- **Task 1 (CLI-on-Linux spike):** still required (the container needs `okx-a2a` +
  `onchainos` on Linux for `task requests`/`session send`/`heartbeat`). Docker daemon is
  currently DOWN; start Docker Desktop before this task.
- **Task 2 (this doc):** DONE - Direction C chosen.
- **Task 3 (adapter):** becomes the supervisor + `format-persona.mjs` + the two loops.
  No LLM prompt file. Same TDD formatter test.
- **Task 4 (Dockerfile + Fly):** unchanged shape; entrypoint runs our supervisor, not
  `okx-a2a run`. No LLM provider secret needed (drop `ANTHROPIC_API_KEY`).
- **Task 5 (deploy + prove):** the live inbound test above is the proof.
- **Task 6 (retire Mac daemon):** unchanged.
