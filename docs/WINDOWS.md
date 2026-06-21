# Windows Notes

Windows support is experimental.

The patcher includes:

- Codex app path detection for common install locations.
- `--app-root` support for app directories, exe paths, resources directories,
  and direct `app.asar` paths.
- Optional Electron ASAR integrity resource handling through `resedit`.
- A PowerShell reapply script.

What still needs more testing:

- Real Codex Desktop Windows installs across update channels.
- Update and reapply behavior after Codex replaces app files.
- Permission differences between per-user and machine-wide installs.
- Code signing or integrity behavior if Codex changes its packaging.

## Manual Test Flow

```powershell
git clone https://github.com/TonyNa-code/codex-background-theme.git
cd codex-background-theme
npm install
node .\src\patch-codex-background.js --mode unpacked --image "C:\Path\To\wallpaper.png"
node .\src\patch-codex-background.js --check
```

Restart Codex after patching.

If detection fails, pass an explicit location:

```powershell
node .\src\patch-codex-background.js --app-root "C:\Path\To\Codex.exe" --mode unpacked --image "C:\Path\To\wallpaper.png"
```

## Reapply

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\codex-background-reapply.ps1 -Force
```

If you test this on Windows, please open an issue with:

- Windows version.
- Codex Desktop version.
- Install location shape, redacted if needed.
- The command you ran.
- Redacted `--check` output.
