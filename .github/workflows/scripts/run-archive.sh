#!/bin/bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="${PROJECT_NAME:-alt-shift}"
SYSTEMD_SERVICE_NAME="${PROJECT_NAME}.service"
ARTIFACT_PATH="${ARTIFACT_PATH:-/opt/data/deploy/alt-shift/alt-shift.tar.gz}"
APP_PATH="${APP_PATH:-/opt/data/alt-shift}"
RELEASE_PATH="${APP_PATH}.release"
PREVIOUS_PATH="${APP_PATH}.previous"
ENV_FILE_PATH="${ENV_FILE_PATH:-/opt/data/config/alt-shift.env}"
APP_PORT="${APP_PORT:-3000}"
SYSTEMD_UNIT_PATH="/etc/systemd/system/$SYSTEMD_SERVICE_NAME"
SYSTEMD_UNIT_CANDIDATE_PATH="/etc/systemd/system/${PROJECT_NAME}.candidate.service"
SYSTEMD_UNIT_BACKUP_PATH="${SYSTEMD_UNIT_PATH}.previous"

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

rollback_armed=false
previous_unit_saved=false
service_was_installed=false
health_response=''

fail() {
  echo "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command is not available: $1"
}

wait_for_health() {
  local base_path="${BASE_PATH:-}"
  base_path="${base_path%/}"
  if [ -n "$base_path" ] && [ "${base_path#/}" = "$base_path" ]; then
    base_path="/$base_path"
  fi
  if [ "$base_path" = "/" ]; then
    base_path=""
  fi
  local health_url="http://127.0.0.1:$APP_PORT${base_path}/api/health"
  local attempt

  health_response=''
  for attempt in {1..30}; do
    health_response="$(curl --fail --silent --max-time 5 "$health_url" || true)"
    if echo "$health_response" | grep -q '"status":"healthy"'; then
      return 0
    fi
    echo "Health check attempt $attempt/30 failed"
    sleep 2
  done

  return 1
}

rollback() {
  local status="$1"
  local reason="$2"
  local previous_release_ready=false
  local rollback_succeeded=true

  trap - ERR HUP INT TERM
  set +e

  echo "$reason" >&2
  rm -f "$SYSTEMD_UNIT_CANDIDATE_PATH"

  if [ "$rollback_armed" = true ]; then
    echo "Restoring previous release" >&2
    if ! systemctl stop "$SYSTEMD_SERVICE_NAME"; then
      rollback_succeeded=false
    fi

    if [ -e "$PREVIOUS_PATH" ] || [ -L "$PREVIOUS_PATH" ]; then
      if { [ -e "$APP_PATH" ] || [ -L "$APP_PATH" ]; } && ! rm -rf "$APP_PATH"; then
        rollback_succeeded=false
      fi
      if { [ ! -e "$APP_PATH" ] && [ ! -L "$APP_PATH" ]; } && mv "$PREVIOUS_PATH" "$APP_PATH"; then
        previous_release_ready=true
      else
        rollback_succeeded=false
      fi
    elif { [ ! -e "$RELEASE_PATH" ] && [ ! -L "$RELEASE_PATH" ]; } && { [ -e "$APP_PATH" ] || [ -L "$APP_PATH" ]; }; then
      if ! rm -rf "$APP_PATH"; then
        rollback_succeeded=false
      fi
    elif [ -e "$APP_PATH" ] || [ -L "$APP_PATH" ]; then
      previous_release_ready=true
    fi

    rm -rf "$RELEASE_PATH"

    if [ "$previous_unit_saved" = true ]; then
      if ! mv "$SYSTEMD_UNIT_BACKUP_PATH" "$SYSTEMD_UNIT_PATH"; then
        rollback_succeeded=false
      fi
    elif ! rm -f "$SYSTEMD_UNIT_PATH"; then
      rollback_succeeded=false
    fi

    if ! systemctl daemon-reload; then
      rollback_succeeded=false
    fi
    if [ "$service_was_installed" = true ] && [ "$previous_release_ready" = true ]; then
      if ! systemctl restart "$SYSTEMD_SERVICE_NAME"; then
        rollback_succeeded=false
      fi
      if ! wait_for_health; then
        rollback_succeeded=false
        systemctl --no-pager --full status "$SYSTEMD_SERVICE_NAME"
        journalctl -u "$SYSTEMD_SERVICE_NAME" -n 50 --no-pager
      fi
    fi

    if [ "$rollback_succeeded" = true ] && [ "$previous_release_ready" = true ]; then
      echo "Previous release restored" >&2
    elif [ "$rollback_succeeded" = false ]; then
      echo "Rollback failed; manual recovery is required" >&2
    fi
  else
    rm -rf "$RELEASE_PATH"
    rm -f "$SYSTEMD_UNIT_BACKUP_PATH"
  fi

  exit "$status"
}

on_error() {
  local status="$?"
  rollback "$status" "Deployment command failed"
}

on_signal() {
  local signal="$1"
  local status="$2"
  rollback "$status" "Deployment interrupted by $signal"
}

trap on_error ERR
trap 'on_signal HUP 129' HUP
trap 'on_signal INT 130' INT
trap 'on_signal TERM 143' TERM

main() {
  local bun_path
  local bun_bin_path
  local listening_sockets

  require_command bun
  require_command curl
  require_command ss
  require_command systemctl

  [ "$(id -u)" -eq 0 ] || fail "Deployment must run as root"
  [ -f "$ARTIFACT_PATH" ] || fail "Deployment artifact not found: $ARTIFACT_PATH"
  [ -f "$ENV_FILE_PATH" ] || fail "Production environment file not found: $ENV_FILE_PATH"
  if [ -e "$PREVIOUS_PATH" ] || [ -L "$PREVIOUS_PATH" ]; then
    fail "Previous release path already exists: $PREVIOUS_PATH"
  fi
  [ ! -e "$SYSTEMD_UNIT_BACKUP_PATH" ] || fail "Systemd unit backup already exists: $SYSTEMD_UNIT_BACKUP_PATH"

  if systemctl cat "$SYSTEMD_SERVICE_NAME" >/dev/null 2>&1; then
    service_was_installed=true
    [ -f "$SYSTEMD_UNIT_PATH" ] || fail "Systemd unit not found: $SYSTEMD_UNIT_PATH"
  fi

  rm -rf "$RELEASE_PATH"
  rm -f "$SYSTEMD_UNIT_CANDIDATE_PATH"
  mkdir -p "$RELEASE_PATH"
  tar -xzf "$ARTIFACT_PATH" -C "$RELEASE_PATH"

  cd "$RELEASE_PATH"
  bun install --production --frozen-lockfile

  bun_path="$(command -v bun)"
  bun_bin_path="$(dirname "$bun_path")"
  sed \
    -e "s|__APP_PATH__|$APP_PATH|g" \
    -e "s|__BUN_PATH__|$bun_path|g" \
    -e "s|__BUN_BIN_PATH__|$bun_bin_path|g" \
    -e "s|__ENV_FILE_PATH__|$ENV_FILE_PATH|g" \
    -e "s|__APP_PORT__|$APP_PORT|g" \
    -e "s|__BASE_PATH__|${BASE_PATH:-}|g" \
    "$SCRIPT_DIR/alt-shift.service" > "$SYSTEMD_UNIT_CANDIDATE_PATH"
  chmod 0644 "$SYSTEMD_UNIT_CANDIDATE_PATH"

  if [ "$service_was_installed" = true ]; then
    cp -p "$SYSTEMD_UNIT_PATH" "$SYSTEMD_UNIT_BACKUP_PATH"
    previous_unit_saved=true
  fi
  rollback_armed=true

  if [ "$service_was_installed" = true ]; then
    systemctl stop "$SYSTEMD_SERVICE_NAME"
  fi
  if ! listening_sockets="$(ss -ltn "sport = :$APP_PORT")"; then
    rollback 1 "Failed to inspect port $APP_PORT"
  fi
  if echo "$listening_sockets" | grep -q LISTEN; then
    rollback 1 "Port $APP_PORT is already in use"
  fi

  if [ -e "$APP_PATH" ] || [ -L "$APP_PATH" ]; then
    mv "$APP_PATH" "$PREVIOUS_PATH"
  fi
  mv "$RELEASE_PATH" "$APP_PATH"
  mv "$SYSTEMD_UNIT_CANDIDATE_PATH" "$SYSTEMD_UNIT_PATH"

  systemctl daemon-reload
  systemctl enable "$SYSTEMD_SERVICE_NAME"
  systemctl restart "$SYSTEMD_SERVICE_NAME"

  if ! wait_for_health; then
    systemctl --no-pager --full status "$SYSTEMD_SERVICE_NAME" || true
    journalctl -u "$SYSTEMD_SERVICE_NAME" -n 50 --no-pager || true
    rollback 1 "Application health check failed: $health_response"
  fi

  systemctl --no-pager --full status "$SYSTEMD_SERVICE_NAME"

  rollback_armed=false
  trap - ERR HUP INT TERM
  rm -rf "$PREVIOUS_PATH"
  rm -f "$SYSTEMD_UNIT_BACKUP_PATH" "$ARTIFACT_PATH"
  echo "Deployment completed successfully"
}

main "$@"
