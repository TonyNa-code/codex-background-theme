#!/bin/zsh
set -euo pipefail

LABEL="com.codex-background-theme.reapply"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
INSTALL_DIR="$HOME/.codex/codex-background-theme"

/bin/launchctl bootout "gui/$UID" "$PLIST" 2>/dev/null || true
/bin/rm -f "$PLIST"

if [[ "${1:-}" == "--purge" ]]; then
  /bin/rm -rf "$INSTALL_DIR"
fi

print -r -- "Uninstalled. Reinstall or update Codex Desktop to fully restore app files."
