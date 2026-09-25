#!/bin/bash

set -euo pipefail

restore_workspace_ownership() {
  chown -R --no-dereference "$HOST_UID:$HOST_GID" /workspace
}

trap restore_workspace_ownership EXIT

unit_path="/etc/systemd/system/$PROJECT_NAME.service"
mkdir -p /workspace/bin "$BUN_INSTALL/bin" /etc/systemd/system
for command_name in curl sleep ss systemctl; do
  ln -s /repo/tests/deploy/fake-command.sh "/workspace/bin/$command_name"
done
ln -s /repo/tests/deploy/fake-command.sh "$BUN_INSTALL/bin/bun"
if [ "$SCENARIO" != 'first-deployment' ]; then
  cp /workspace/previous-unit.service "$unit_path"
fi

set +e
PATH="/workspace/bin:/usr/bin:/bin" bash /repo/.github/workflows/scripts/run-archive.sh > /workspace/deployment-output.log 2>&1
deployment_status=$?
set -e

printf '%s\n' "$deployment_status" > /workspace/deployment-status
if [ -f "$unit_path" ]; then
  cp "$unit_path" /workspace/final-unit.service
fi
