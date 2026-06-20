#!/bin/zsh
set -euo pipefail

REPO_DIR="${0:A:h:h}"
INSTALL_DIR="$HOME/.codex/codex-background-theme"
APP_ROOT="/Applications/Codex.app"
IMAGE=""
MODE="unpacked"
INSTALL_AGENT=1
LABEL="com.codex-background-theme.reapply"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image)
      IMAGE="$2"
      shift 2
      ;;
    --app-root)
      APP_ROOT="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --no-agent)
      INSTALL_AGENT=0
      shift
      ;;
    *)
      print -u2 -- "Unknown option: $1"
      exit 2
      ;;
  esac
done

if [[ -z "$IMAGE" ]]; then
  print -u2 -- "Use --image /path/to/wallpaper.png"
  exit 2
fi

if [[ ! -f "$IMAGE" ]]; then
  print -u2 -- "Image not found: $IMAGE"
  exit 1
fi

find_node() {
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
    if [[ -x "$candidate" ]]; then
      print -r -- "$candidate"
      return 0
    fi
  done
  command -v node
}

NODE="$(find_node)"
mkdir -p "$INSTALL_DIR"
/bin/cp "$REPO_DIR/src/patch-codex-background.js" "$INSTALL_DIR/"
/bin/cp "$REPO_DIR/src/asar-tools.js" "$INSTALL_DIR/"
/bin/cp "$REPO_DIR/scripts/codex-background-reapply.zsh" "$INSTALL_DIR/"
/bin/chmod +x "$INSTALL_DIR/codex-background-reapply.zsh"

"$NODE" "$INSTALL_DIR/patch-codex-background.js" --app-root "$APP_ROOT" --mode "$MODE" --image "$IMAGE"
/usr/bin/codesign --force --deep --sign - "$APP_ROOT"
"$NODE" "$INSTALL_DIR/patch-codex-background.js" --app-root "$APP_ROOT" --check

if (( INSTALL_AGENT )); then
  mkdir -p "$HOME/Library/LaunchAgents"
  PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${INSTALL_DIR}/codex-background-reapply.zsh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>CODEX_APP_ROOT</key>
    <string>${APP_ROOT}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>1800</integer>
  <key>StandardOutPath</key>
  <string>${INSTALL_DIR}/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>${INSTALL_DIR}/launchd.err.log</string>
</dict>
</plist>
EOF
  /bin/chmod 644 "$PLIST"
  /bin/launchctl bootout "gui/$UID" "$PLIST" 2>/dev/null || true
  /bin/launchctl bootstrap "gui/$UID" "$PLIST"
fi

print -r -- "Installed. Fully quit Codex and open it again."
