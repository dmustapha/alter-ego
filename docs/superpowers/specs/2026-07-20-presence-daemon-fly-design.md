# Alter Ego Presence Daemon on Fly.io — Design (Scope B)

Date: 2026-07-20
Project: Alter Ego (OKX.AI agent #6013)
Working dir: `/Users/MAC/hackathon-toolkit/active/alter-ego`

## Goal

Keep agent #6013 showing "online" 24/7, independent of the Mac, by running the
`okx-a2a run` daemon on an always-on Fly.io machine. Scope B = **presence only**
(heartbeat + XMTP client), NOT the AI adapter — Alter Ego's service is delivered
by the Vercel A2MCP endpoint (`https://alter-ego-wine-mu.vercel.app/api/a2mcp`),
so the Claude AI subsession does no product work here.

## How presence actually works (verified from the live daemon)

The Mac daemon (`okx-a2a run`, launchd `com.okx.a2a`, currently PID 898) runs
**headless with no passphrase in its env** and every ~40s shells out to:

```
onchainos agent heartbeat --chain-index 196
```

plus an XMTP sync tick (`activeClients=1`). This proves:

- Presence is driven by the **TEE session cert** in `~/.onchainos/session.json`
  (`teeId` + `encryptedSessionSk`, `sessionKeyExpireAt: 1793131338` ≈ Oct 2026),
  NOT the keyring passphrase.
- `machine-identity` is a **persisted 64-char hex fingerprint** (a stored file,
  not a live hardware read), so carrying that file makes a remote host present
  the same fingerprint the TEE issued the session to.

**Conclusion:** the session is portable. Copy the identity files (incl.
`machine-identity`) → the host authenticates with no re-login and no runtime
passphrase for heartbeat.

## Architecture

- **One Fly.io app** (`alter-ego-daemon`), single always-on machine:
  `min_machines_running = 1`, no autostop, **no `[http_service]`** (the daemon
  takes no inbound traffic — presence is outbound heartbeat + XMTP).
- **One persistent volume** mounted at `/data`, with `HOME=/data` and
  `OKX_AGENT_TASK_HOME=/data/.okx-agent-task`, so both `~/.onchainos` (identity)
  and `~/.okx-agent-task` (XMTP db3, sqlite) survive machine restarts.
- **Docker image:** `node:24-slim` + the `onchainos` and `okx-a2a` CLIs + a small
  `entrypoint.sh`.

## State transfer (the crux)

The 4 tiny identity files (~8 KB total) are uploaded as **Fly secrets** (base64),
never baked into the image, never committed to git:

| File | Size | Purpose |
|------|------|---------|
| `session.json` | 336 B | TEE session cert (the thing heartbeat authenticates with) |
| `keyring.enc` | 1085 B | Encrypted wallet keyring (stays locked; inert for signing on host) |
| `machine-identity` | 64 B | Device fingerprint the TEE bound the session to |
| `wallets.json` | 6272 B | Wallet metadata / account context |

`entrypoint.sh` materializes them into `/data/.onchainos` (chmod 600) **only if
absent**, then `exec okx-a2a run`.

`~/.okx-agent-task` is **not** copied — `okx-a2a run` rebuilds it and registers a
fresh XMTP installation for the same inbox (`2ea2f37a…`). XMTP allows multiple
installations per inbox, so the Mac and cloud clients coexist until the Mac one
is retired.

The keyring passphrase (`REDACTED-PASSPHRASE`) is **not** required for heartbeat. It may
optionally be set as a Fly secret as a fallback only if a boot-time signing op
turns out to prompt; default is to leave it unset so the keyring stays locked.

## Risks to resolve during implementation (build phase, not design)

1. **CLI install method.** The daemon invokes `/Users/MAC/.local/bin/onchainos`
   (a curl-installer path, not homebrew) and `okx-a2a` (npm or brew — TBD).
   Confirm both real install methods before writing the Dockerfile so the image
   installs the same CLI versions (onchainos current, okx-a2a 0.1.9).
2. **AI-provider requirement.** Default provider is `claude`; scope B does not
   want the Claude CLI on the host. Confirm `okx-a2a run` **boots and heartbeats
   without a provider CLI logged in** — expected, since the provider only matters
   when a task/decision arrives and #6013 is under review (taking none). If it
   hard-refuses to boot, fallback is the minimal `onchainos agent heartbeat` loop
   (60s) instead of the full daemon.

## Verification / cutover

1. `fly deploy` → `fly logs` shows `heartbeat sent` firing on the ~40s cadence.
2. From the Mac: `onchainos agent get-agents --agent-ids 6013` shows online.
3. Stop the Mac daemon (`launchctl unload ~/Library/LaunchAgents/com.okx.a2a.plist`),
   wait one heartbeat cycle, re-check #6013 is **still** online from the cloud alone.
4. Commit `Dockerfile` + `fly.toml` + `entrypoint.sh` to the repo (zero secrets).

## Security

`keyring.enc` + `session.json` are owner-wallet-capable. Mitigations: Fly secrets
(encrypted at rest, not in the image), keyring left locked (heartbeat needs no
passphrase, so it is inert for signing on the host), private volume. Separately,
rotate the OKX API creds currently exposed in plaintext handoff docs.

## Out of scope

- The AI adapter / Claude subsession (scope C).
- Any change to the Vercel A2MCP endpoint.
- OKX review outcome for #6013 (async human review; poll separately).
