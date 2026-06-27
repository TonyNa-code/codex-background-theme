# Reapply Behavior

Codex updates replace app files. The background theme has to be written back
after that happens.

On macOS, `scripts/install-macos.zsh` installs a LaunchAgent that:

- runs at login,
- watches the Codex app bundle, `app.asar`, and `Info.plist`,
- runs a 10-minute fallback check,
- waits until the app bundle stops changing before patching,
- verifies the patch and app signature after writing files.
- rotates the helper log and keeps only a small number of large app backups.

## Why A Second Restart Can Be Needed

If Codex starts before the reapply step finishes, the files on disk can be fixed
while the current renderer is still using the old assets. In that case the next
Codex restart loads the repaired theme.

By default, the helper sends a macOS notification when this happens.

To make the helper restart Codex automatically:

```bash
zsh scripts/install-macos.zsh --image "/path/to/wallpaper.png" --auto-restart
```

or run once:

```bash
zsh scripts/codex-background-reapply.zsh --force --auto-restart
```

Use auto restart only on machines where an automatic Codex quit/reopen is
acceptable.
