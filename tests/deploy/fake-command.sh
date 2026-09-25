#!/bin/bash

set -euo pipefail

command_name="$(basename "$0")"
printf '%s %s\n' "$command_name" "$*" >> "$COMMAND_LOG"

release_marker() {
  if [ -f "$APP_PATH/release.txt" ]; then
    tr -d '\n' < "$APP_PATH/release.txt"
  else
    printf 'missing'
  fi
}

case "$command_name" in
  bun)
    if [ "$SCENARIO" = 'preparation-failure' ] && [ "${1:-}" = 'install' ]; then
      exit 1
    fi
    ;;
  curl)
    if [ "$SCENARIO" = 'health-failure' ] && [ "$(release_marker)" = 'new' ]; then
      printf '{"status":"unhealthy"}\n'
      exit 0
    fi
    printf '{"status":"healthy"}\n'
    ;;
  sleep)
    ;;
  ss)
    if [ "$SCENARIO" = 'pre-switch-failure' ]; then
      printf 'LISTEN\n'
    elif [ "$SCENARIO" = 'port-check-failure' ]; then
      exit 1
    fi
    ;;
  systemctl)
    case "${1:-}" in
      cat)
        [ -f "/etc/systemd/system/$PROJECT_NAME.service" ]
        ;;
      stop)
        signal_marker="$(dirname "$COMMAND_LOG")/signal-sent"
        if { [ "$SCENARIO" = 'signal-hup' ] || [ "$SCENARIO" = 'signal-int' ] || [ "$SCENARIO" = 'signal-term' ]; } && [ ! -f "$signal_marker" ]; then
          touch "$signal_marker"
          case "$SCENARIO" in
            signal-hup) kill -HUP "$PPID" ;;
            signal-int) kill -INT "$PPID" ;;
            signal-term) kill -TERM "$PPID" ;;
          esac
        fi
        ;;
      restart)
        signal_marker="$(dirname "$COMMAND_LOG")/signal-sent"
        if [ "$SCENARIO" = 'signal-after-switch' ] && [ "$(release_marker)" = 'new' ] && [ ! -f "$signal_marker" ]; then
          touch "$signal_marker"
          kill -TERM "$PPID"
        fi
        if { [ "$SCENARIO" = 'restart-failure' ] || [ "$SCENARIO" = 'rollback-failure' ]; } && [ "$(release_marker)" = 'new' ]; then
          exit 1
        fi
        if [ "$SCENARIO" = 'rollback-failure' ] && [ "$(release_marker)" = 'old' ]; then
          exit 1
        fi
        ;;
    esac
    ;;
  *)
    printf 'Unexpected fake command: %s\n' "$command_name" >&2
    exit 1
    ;;
esac
