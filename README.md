# Codex Background Theme

Local wallpaper and glass theme patcher for Codex Desktop.

This is an unofficial tool. It edits the installed Codex Desktop app bundle on
your own machine, adds a local background image, and adjusts the main UI tokens
used by the sidebar, composer, settings, popovers, and common home screens.

It does not include wallpapers. Use images you have the right to use.

## Status

- macOS: tested locally with `unpacked` mode and large PNG wallpapers.
- Windows: experimental. The shared patcher has Windows path detection and a
  PE-resource integrity adapter, but it still needs real Windows install/update
  testing.

## Requirements

- Node.js 18 or newer.
- Codex Desktop installed.
- A local PNG wallpaper.
- macOS: `codesign` and `PlistBuddy`, both provided by macOS.
- Windows: `resedit` is used for Electron ASAR integrity resources. Run
  `npm install` in this repo before patching on Windows.

## macOS Quick Start

```bash
git clone https://github.com/<owner>/codex-background-theme.git
cd codex-background-theme
npm install
zsh scripts/install-macos.zsh --image "/path/to/wallpaper.png"
```

Then fully quit Codex with `Cmd+Q` and open it again.

The installer copies the patcher into:

```text
~/.codex/codex-background-theme
```

It also installs a LaunchAgent that reapplies the patch after Codex updates.

## Windows Quick Start

Windows support is still experimental. Start with a manual run and keep a way to
reinstall Codex if the local patch does not apply cleanly:

```powershell
git clone https://github.com/<owner>/codex-background-theme.git
cd codex-background-theme
npm install
node .\src\patch-codex-background.js --mode unpacked --image "C:\Path\To\wallpaper.png"
node .\src\patch-codex-background.js --check
```

If Codex is installed in a non-standard location, pass the app directory, exe,
resources directory, or app.asar path:

```powershell
node .\src\patch-codex-background.js --app-root "C:\Path\To\Codex" --mode unpacked --image "C:\Path\To\wallpaper.png"
```

## Useful Options

```bash
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --mode unpacked
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --surface light --text dark
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --surface glass --text light
node src/patch-codex-background.js --check
```

Modes:

- `unpacked`: recommended. Keeps large images outside the ASAR payload while
  marking the chosen asset as unpacked.
- `stable`: writes into an existing PNG slot. Safer, but image size is limited.
- `external`: references a local file URL.
- `expanded`: experimental. Rebuilds the ASAR and is disabled unless explicitly
  allowed.

Surface styles:

- `auto`: chooses a bright or dark glass treatment from the image analysis.
- `light`: light glass with dark text.
- `glass`: dark translucent glass with light text.
- `clear`, `dark`, `solid`, `minimal`: manual variants.

## Reapply

macOS:

```bash
zsh scripts/codex-background-reapply.zsh --force
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\codex-background-reapply.ps1 -Force
```

## Uninstall

macOS:

```bash
zsh scripts/uninstall-macos.zsh
```

Use `--purge` to remove the local installed copy as well.

To fully restore Codex, reinstall or update Codex Desktop after uninstalling the
reapply hook.

## Notes

- This project is not affiliated with OpenAI.
- Codex updates can replace the patched app files. Reapply after an update when
  the theme disappears.
- The patcher writes backups before changing app files.
- Do not run it on work machines unless you are allowed to modify installed apps.
- Do not publish screenshots or wallpapers you do not have rights to share.
