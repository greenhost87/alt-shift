#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ARTIFACT_NAME="${ARTIFACT_NAME:-alt-shift.tar.gz}"
ARTIFACT_PATH="$ROOT_DIR/$ARTIFACT_NAME"
ARTIFACT_DIR="$ROOT_DIR/dist-deploy"

fail() {
  echo "$1" >&2
  exit 1
}

require_file() {
  local path="$1"
  [ -f "$path" ] || fail "Required file not found: $path"
}

require_dir() {
  local path="$1"
  [ -d "$path" ] || fail "Required directory not found: $path"
}

main() {
  cd "$ROOT_DIR"

  require_file package.json
  require_file bun.lock
  require_file bunfig.toml
  require_file tsconfig.json
  require_file vite.config.ts
  require_file src/server.ts
  require_file src/routes/api.health.ts
  require_dir migrations

  rm -rf "$ARTIFACT_DIR" "$ARTIFACT_PATH"

  bun run i18n:compile
  bunx oxfmt --check .
  bunx tsc --noEmit
  bun run test
  bun run build

  require_dir dist/client
  require_file dist/server/server.js
  require_dir dist/server/migrations

  mkdir -p "$ARTIFACT_DIR"
  cp -R dist "$ARTIFACT_DIR/"
  cp package.json bun.lock bunfig.toml "$ARTIFACT_DIR/"

  tar -czf "$ARTIFACT_PATH" -C "$ARTIFACT_DIR" .
  rm -rf "$ARTIFACT_DIR"

  require_file "$ARTIFACT_PATH"
  echo "Deployment artifact created: $ARTIFACT_PATH"
}

main "$@"
