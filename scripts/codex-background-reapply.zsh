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

mkdir -p "$TOOL_DIR"

log() {
  print -r -- "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"
}

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
  for _ in {1..12}; do
    current="$(/usr/bin/stat -f '%m:%z' "$ASAR" "$PLIST" 2>/dev/null | /usr/bin/shasum -a 256 2>/dev/null || true)"
    if [[ -n "$current" && "$current" == "$last" ]]; then
      return 0
    fi
    last="$current"
    /bin/sleep 2
  done
  return 1
}

is_currently_patched() {
  local node="$1"
  "$node" "$PATCH_SCRIPT" --app-root "$APP_ROOT" --check >/dev/null 2>&1 || return 1
  /usr/bin/codesign --verify --deep --strict --verbose=1 "$APP_ROOT" >/dev/null 2>&1 || return 1
}

cleanup_backups() {
  [[ -d "$TOOL_DIR/backups" ]] || return 0
  local pattern old_files old
  for pattern in "app.asar.*.bak" "Info.plist.*.bak"; do
    old_files="$(/bin/ls -1t "$TOOL_DIR"/backups/${~pattern} 2>/dev/null | /usr/bin/tail -n +6 || true)"
    [[ -z "$old_files" ]] && continue
    while IFS= read -r old; do
      [[ -n "$old" ]] && /bin/rm -f "$old"
    done <<< "$old_files"
  done
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
trap '/bin/rm -rf "$LOCKDIR"' EXIT

NODE="$(find_node)"
if ! wait_until_app_is_stable; then
  log "Codex app bundle did not stabilize, skipping"
  exit 0
fi

if [[ ! -f "$ASAR" ]]; then
  log "Codex app.asar not found, skipping"
  exit 0
fi

if [[ "${1:-}" != "--force" ]] && is_currently_patched "$NODE"; then
  log "Background patch already current, skipping"
  exit 0
fi

log "Reapplying Codex background patch"
"$NODE" "$PATCH_SCRIPT" --app-root "$APP_ROOT" >> "$LOG" 2>&1
/usr/bin/codesign --force --deep --sign - "$APP_ROOT" >> "$LOG" 2>&1
/usr/bin/codesign --verify --deep --strict --verbose=1 "$APP_ROOT" >> "$LOG" 2>&1
"$NODE" "$PATCH_SCRIPT" --app-root "$APP_ROOT" --check >> "$LOG" 2>&1
cleanup_backups
log "Reapply complete"
