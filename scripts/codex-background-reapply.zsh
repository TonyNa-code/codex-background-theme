#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
if [[ -f "$SCRIPT_DIR/../src/patch-codex-background.js" ]]; then
  TOOL_DIR="${SCRIPT_DIR:h}"
elif [[ -f "$SCRIPT_DIR/patch-codex-background.js" ]]; then
  TOOL_DIR="$SCRIPT_DIR"
else
  TOOL_DIR="$HOME/.codex/codex-background-theme"
fi

PATCH_SCRIPT="$TOOL_DIR/patch-codex-background.js"
APP_ROOT="${CODEX_APP_ROOT:-/Applications/Codex.app}"
ASAR="$APP_ROOT/Contents/Resources/app.asar"
PLIST="$APP_ROOT/Contents/Info.plist"
LOG="$TOOL_DIR/reapply.log"
LOCKDIR="$TOOL_DIR/.reapply.lock"
RESTART_FLAG="$TOOL_DIR/restart-required.flag"
MAX_LOG_BYTES="${CODEX_BACKGROUND_MAX_LOG_BYTES:-1048576}"
MAX_BACKUPS="${CODEX_BACKGROUND_MAX_BACKUPS:-1}"
FORCE=0
AUTO_RESTART="${CODEX_BACKGROUND_AUTO_RESTART:-0}"

mkdir -p "$TOOL_DIR"

[[ "$MAX_LOG_BYTES" =~ '^[0-9]+$' ]] || MAX_LOG_BYTES=1048576
(( MAX_LOG_BYTES < 131072 )) && MAX_LOG_BYTES=131072
[[ "$MAX_BACKUPS" =~ '^[0-9]+$' ]] || MAX_BACKUPS=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent)
      shift
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --auto-restart)
      AUTO_RESTART=1
      shift
      ;;
    --no-auto-restart)
      AUTO_RESTART=0
      shift
      ;;
    *)
      print -r -- "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] Ignoring unknown option: $1" >> "$LOG"
      shift
      ;;
  esac
done

find_node() {
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
    if [[ -x "$candidate" ]]; then
      print -r -- "$candidate"
      return 0
    fi
  done
  command -v node
}

wait_until_app_is_stable() {
  local last="" current=""
  for _ in {1..20}; do
    current="$(/usr/bin/stat -f '%m:%z' "$ASAR" "$PLIST" 2>/dev/null | /usr/bin/shasum -a 256 2>/dev/null || true)"
    if [[ -n "$current" && "$current" == "$last" ]]; then
      return 0
    fi
    last="$current"
    /bin/sleep 1
  done
  return 1
}

is_currently_patched() {
  local node="$1" check_out
  check_out="$("$node" "$PATCH_SCRIPT" --app-root "$APP_ROOT" --check 2>&1)" || return 1
  print -r -- "$check_out" | /usr/bin/grep -q '"ok": true' || return 1
  /usr/bin/codesign --verify --deep --strict --verbose=1 "$APP_ROOT" >/dev/null 2>&1 || return 1
}

rotate_log() {
  [[ -f "$LOG" ]] || return 0
  local size keep tmp
  size="$(/usr/bin/stat -f '%z' "$LOG" 2>/dev/null || print 0)"
  [[ "$size" =~ '^[0-9]+$' ]] || return 0
  (( size <= MAX_LOG_BYTES )) && return 0
  keep=$(( MAX_LOG_BYTES / 2 ))
  (( keep < 65536 )) && keep=65536
  tmp="$LOG.tmp"
  /usr/bin/tail -c "$keep" "$LOG" > "$tmp" 2>/dev/null && /bin/mv "$tmp" "$LOG"
}

log() {
  rotate_log
  print -r -- "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"
}

cleanup_backups() {
  [[ -d "$TOOL_DIR/backups" ]] || return 0
  local pattern old_files old
  for pattern in "app.asar.*.bak" "Info.plist.*.bak"; do
    old_files="$(/bin/ls -1t "$TOOL_DIR"/backups/${~pattern} 2>/dev/null | /usr/bin/tail -n +$((MAX_BACKUPS + 1)) || true)"
    [[ -z "$old_files" ]] && continue
    while IFS= read -r old; do
      [[ -n "$old" ]] && /bin/rm -f "$old"
    done <<< "$old_files"
  done
}

cleanup_runtime_artifacts() {
  /bin/rm -rf "$TOOL_DIR/official" 2>/dev/null || true
  cleanup_backups
  rotate_log
  if [[ -d "$TOOL_DIR/theme-tests" ]]; then
    /usr/bin/find "$TOOL_DIR/theme-tests" -type f -mtime +7 -delete 2>/dev/null || true
    /usr/bin/find "$TOOL_DIR/theme-tests" -type d -empty -delete 2>/dev/null || true
  fi
}

on_exit() {
  cleanup_runtime_artifacts
  /bin/rm -rf "$LOCKDIR"
}

current_codex_pid() {
  local exe="$APP_ROOT/Contents/MacOS/Codex" pid command
  /usr/bin/pgrep -x Codex 2>/dev/null | while IFS= read -r pid; do
    command="$(/bin/ps -p "$pid" -o command= 2>/dev/null || true)"
    if [[ "$command" == "$exe"* ]]; then
      print -r -- "$pid"
      return 0
    fi
  done | /usr/bin/head -n 1
}

codex_start_epoch() {
  local pid="$1" start_text
  [[ -n "$pid" ]] || return 1
  start_text="$(/bin/ps -p "$pid" -o lstart= 2>/dev/null | /usr/bin/sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  [[ -n "$start_text" ]] || return 1
  /bin/date -j -f '%a %b %e %T %Y' "$start_text" '+%s' 2>/dev/null
}

notify_restart_needed() {
  /usr/bin/osascript -e 'display notification "The background patch is back on disk. Restart Codex to load it in the current window." with title "Codex background restored"' >/dev/null 2>&1 || true
}

restart_codex() {
  log "Auto-restarting Codex so the refreshed background is loaded"
  /usr/bin/osascript -e 'tell application "Codex" to quit' >/dev/null 2>&1 || true
  for _ in {1..30}; do
    if [[ -z "$(current_codex_pid)" ]]; then
      break
    fi
    /bin/sleep 1
  done
  /usr/bin/open "$APP_ROOT" >/dev/null 2>&1 || true
}

restart_completion_epoch() {
  [[ -f "$RESTART_FLAG" ]] || return 1
  /usr/bin/sed -n 's/.*completed_epoch=\([0-9][0-9]*\).*/\1/p' "$RESTART_FLAG" | /usr/bin/head -n 1
}

clear_restart_flag_if_resolved() {
  local pid start_epoch completed_epoch
  [[ -f "$RESTART_FLAG" ]] || return 0
  pid="$(current_codex_pid)"
  if [[ -z "$pid" ]]; then
    /bin/rm -f "$RESTART_FLAG"
    return 0
  fi
  completed_epoch="$(restart_completion_epoch || true)"
  start_epoch="$(codex_start_epoch "$pid" || true)"
  if [[ -n "$completed_epoch" && -n "$start_epoch" && "$start_epoch" -gt "$completed_epoch" ]]; then
    /bin/rm -f "$RESTART_FLAG"
  fi
}

notice_if_running_before_patch() {
  local completed_epoch="$1" pid start_epoch
  pid="$(current_codex_pid)"
  if [[ -z "$pid" ]]; then
    /bin/rm -f "$RESTART_FLAG"
    return 0
  fi
  start_epoch="$(codex_start_epoch "$pid" || true)"
  [[ -n "$start_epoch" ]] || return 0
  if (( start_epoch < completed_epoch )); then
    print -r -- "pid=$pid started_epoch=$start_epoch completed_epoch=$completed_epoch" > "$RESTART_FLAG"
    log "Codex process $pid started before reapply completed; restart required"
    if [[ "$AUTO_RESTART" == "1" || "$AUTO_RESTART" == "true" || "$AUTO_RESTART" == "yes" ]]; then
      restart_codex
    else
      notify_restart_needed
    fi
  else
    /bin/rm -f "$RESTART_FLAG"
  fi
}

if [[ -d "$LOCKDIR" ]]; then
  lock_mtime="$(/usr/bin/stat -f '%m' "$LOCKDIR" 2>/dev/null || print 0)"
  now="$(/bin/date '+%s')"
  if (( now - lock_mtime > 600 )); then
    log "Removing stale reapply lock"
    /bin/rm -rf "$LOCKDIR"
  fi
fi

if ! /bin/mkdir "$LOCKDIR" 2>/dev/null; then
  exit 0
fi
trap on_exit EXIT

NODE="$(find_node)"
if ! wait_until_app_is_stable; then
  log "Codex app bundle did not stabilize, skipping"
  exit 0
fi

if [[ ! -f "$ASAR" ]]; then
  log "Codex app.asar not found, skipping"
  exit 0
fi

if (( ! FORCE )) && is_currently_patched "$NODE"; then
  clear_restart_flag_if_resolved
  log "Background patch already current, skipping"
  exit 0
fi

log "Reapplying Codex background patch"
"$NODE" "$PATCH_SCRIPT" --app-root "$APP_ROOT" >> "$LOG" 2>&1
/usr/bin/codesign --force --deep --sign - "$APP_ROOT" >> "$LOG" 2>&1
/usr/bin/codesign --verify --deep --strict --verbose=1 "$APP_ROOT" >> "$LOG" 2>&1
"$NODE" "$PATCH_SCRIPT" --app-root "$APP_ROOT" --check >> "$LOG" 2>&1
cleanup_backups
completed_epoch="$(/bin/date '+%s')"
log "Reapply complete"
notice_if_running_before_patch "$completed_epoch"
