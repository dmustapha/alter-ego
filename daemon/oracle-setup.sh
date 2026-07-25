#!/usr/bin/env bash
# One-shot setup for the always-on presence daemon on an Oracle Cloud (or any Ubuntu)
# always-free VM. Installs Node 24 + @okxweb3/a2a-node, then a systemd service that runs
# `okx-a2a run` with the agent identity, auto-restarting forever. Run as a sudo user.
#
# PREREQUISITE: the 4 identity files must already be at /opt/alter-ego/.onchainos/
#   session.json  keyring.enc  machine-identity  wallets.json
# (transfer them with the scp one-liner printed by daemon/oracle-transfer-identity.sh,
#  which runs from the Mac. Never commit these files.)
set -euo pipefail

RUN_HOME=/opt/alter-ego
OKX_HOME="$RUN_HOME/.onchainos"

echo "[setup] installing Node 24 + build deps"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "[setup] installing @okxweb3/a2a-node (okx-a2a)"
sudo npm install -g @okxweb3/a2a-node@0.1.10
okx-a2a --version

echo "[setup] verifying identity files are present"
for f in session.json keyring.enc machine-identity wallets.json; do
  [ -s "$OKX_HOME/$f" ] || { echo "[setup] FATAL: $OKX_HOME/$f missing. scp the identity first."; exit 1; }
done
chmod 700 "$RUN_HOME"; chmod 700 "$OKX_HOME"; chmod 600 "$OKX_HOME"/* || true

echo "[setup] writing systemd service"
sudo tee /etc/systemd/system/alter-ego-daemon.service >/dev/null <<EOF
[Unit]
Description=Alter Ego #6013 presence daemon (okx-a2a run)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment=HOME=$RUN_HOME
Environment=OKX_AGENT_TASK_HOME=$RUN_HOME/.okx-agent-task
Environment=NODE_ENV=production
ExecStart=$(command -v okx-a2a) run
Restart=always
RestartSec=10
# harden a little; the daemon needs no privileges beyond its home
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

echo "[setup] enabling + starting the daemon"
sudo systemctl daemon-reload
sudo systemctl enable alter-ego-daemon
sudo systemctl restart alter-ego-daemon
sleep 3
sudo systemctl status alter-ego-daemon --no-pager | head -12
echo "[setup] done. Tail logs: journalctl -u alter-ego-daemon -f"
