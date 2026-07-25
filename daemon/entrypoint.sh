#!/usr/bin/env bash
# Materialize agent #6013's identity from Fly secrets into the volume (only if absent),
# then run the presence daemon. The 4 identity files are base64 Fly secrets; they are
# never baked into the image or committed. Heartbeat authenticates with the TEE session
# cert in session.json (no keyring passphrase needed for presence).
set -euo pipefail

OKX_HOME="/data/.onchainos"
mkdir -p "$OKX_HOME" && chmod 700 "$OKX_HOME"

materialize() {
  local var="$1" file="$2"
  if [ ! -f "$file" ] && [ -n "${!var:-}" ]; then
    printf '%s' "${!var}" | base64 -d > "$file"
    chmod 600 "$file"
    echo "[entrypoint] materialized $(basename "$file")"
  fi
}

materialize SESSION_JSON_B64      "$OKX_HOME/session.json"
materialize KEYRING_ENC_B64       "$OKX_HOME/keyring.enc"
materialize MACHINE_IDENTITY_B64  "$OKX_HOME/machine-identity"
materialize WALLETS_JSON_B64      "$OKX_HOME/wallets.json"

# Fail loud if identity is missing (otherwise the daemon would run as nobody).
for f in session.json keyring.enc machine-identity wallets.json; do
  [ -s "$OKX_HOME/$f" ] || { echo "[entrypoint] FATAL: $OKX_HOME/$f missing/empty (set the Fly secret)"; exit 1; }
done

echo "[entrypoint] identity ready; starting okx-a2a run"
exec okx-a2a run
