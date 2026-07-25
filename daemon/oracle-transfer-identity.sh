#!/usr/bin/env bash
# Securely copy agent #6013's 4 identity files from THIS Mac to the Oracle VM over scp,
# into /opt/alter-ego/.onchainos. Run on the Mac. Never commits or prints the file contents.
#
# Usage:
#   daemon/oracle-transfer-identity.sh <vm-public-ip> <ssh-key-path> [ssh-user]
# ssh-user defaults to "ubuntu" (Oracle Ubuntu images).
set -euo pipefail

VM_IP="${1:?usage: oracle-transfer-identity.sh <vm-ip> <ssh-key-path> [ssh-user]}"
KEY="${2:?ssh private key path required}"
USER="${3:-ubuntu}"
SRC="$HOME/.onchainos"
DEST="/opt/alter-ego/.onchainos"

for f in session.json keyring.enc machine-identity wallets.json; do
  [ -s "$SRC/$f" ] || { echo "FATAL: $SRC/$f missing on this Mac"; exit 1; }
done

echo "[transfer] preparing dest dir on VM (sudo)"
ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$USER@$VM_IP" \
  'sudo mkdir -p /opt/alter-ego/.onchainos && sudo chown -R $USER:$USER /opt/alter-ego'

echo "[transfer] scp 4 identity files"
scp -i "$KEY" \
  "$SRC/session.json" "$SRC/keyring.enc" "$SRC/machine-identity" "$SRC/wallets.json" \
  "$USER@$VM_IP:$DEST/"

echo "[transfer] locking down perms on VM"
ssh -i "$KEY" "$USER@$VM_IP" \
  "chmod 700 /opt/alter-ego /opt/alter-ego/.onchainos && chmod 600 /opt/alter-ego/.onchainos/*"

echo "[transfer] done. Identity is on the VM at $DEST"
