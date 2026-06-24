#!/bin/zsh
set -euo pipefail

LABEL="com.codex-background-theme.reapply"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
INSTALL_DIR="$HOME/.codex/codex-background-theme"

/bin/launchctl bootout "gui/$UID" "$PLIST" 2>/dev/null || true
/bin/launchctl bootout "gui/$UID/com.na.codex-background-reapply" 2>/dev/null || true
/bin/rm -f "$PLIST"
/bin/rm -f "$HOME/Library/LaunchAgents/com.na.codex-background-reapply.plist"

if [[ "${1:-}" == "--purge" ]]; then
  /bin/rm -rf "$INSTALL_DIR"
fi

print -r -- "Uninstalled. Reinstall or update Codex Desktop to fully restore app files."
