# Codex Background Theme

Custom wallpapers, glass UI themes, and update reapply hooks for Codex Desktop.

[Simplified Chinese](docs/README.zh-CN.md) | [Japanese](docs/README.ja.md)

Codex Desktop is useful. Its blank white or black window does not have to stay
that way.

This project patches your local Codex Desktop installation so you can use your
own PNG wallpaper, keep the composer and sidebar readable, and reapply the
theme after Codex updates. It is made for people searching for a Codex Desktop
wallpaper, custom background, transparent UI, glass theme, or Electron ASAR
theme patcher.

It does not include wallpapers. Use images you have the right to use.

## What It Does

- Adds a local PNG wallpaper to Codex Desktop.
- Applies readable glass-style UI tokens to the sidebar, composer, settings,
  popovers, and common home screens.
- Offers two patching paths: high-quality `unpacked` mode and conservative
  `stable` mode.
- Can choose light or dark glass styling from basic image analysis.
- Installs a macOS LaunchAgent that reapplies the patch after app updates.
- Includes experimental Windows path detection and ASAR integrity handling.

## Status

- macOS: tested locally with `unpacked` mode and large PNG wallpapers.
- Windows: experimental. The shared patcher has Windows path detection and a
  PE-resource integrity adapter, but it still needs real Windows install/update
  testing.

This is an unofficial project and is not affiliated with OpenAI.

## Requirements

- Node.js 18 or newer.
- Codex Desktop installed.
- A local PNG wallpaper.
- macOS: `codesign` and `PlistBuddy`, both provided by macOS.
- Windows: `resedit` is used for Electron ASAR integrity resources. Run
  `npm install` before patching on Windows.

## Quick Start: macOS

```bash
git clone https://github.com/TonyNa-code/codex-background-theme.git
cd codex-background-theme
npm install
zsh scripts/install-macos.zsh --image "/path/to/wallpaper.png"
```

Then fully quit Codex with `Cmd+Q` and open it again.

The installer copies the patcher into:

```text
~/.codex/codex-background-theme
```

It also installs a LaunchAgent that checks whether the theme needs to be
reapplied after Codex updates. The LaunchAgent watches the Codex app bundle and
also runs a low-frequency fallback check, so updates are repaired without a
busy background loop.

If Codex is opened before the reapply step finishes, the current window may
still show the old background until Codex restarts. If you want the helper to do
that restart for you, install with:

```bash
zsh scripts/install-macos.zsh --image "/path/to/wallpaper.png" --auto-restart
```

Without `--auto-restart`, the helper only sends a macOS notification when a
restart is needed.

See [docs/REAPPLY.md](docs/REAPPLY.md) for the update and restart behavior.

## Choose A Patching Path

Most users should start with `unpacked` mode. It keeps large wallpapers outside
the ASAR payload and preserves image quality better.

`stable` mode is the conservative path. It writes into an existing Codex image
slot, which makes the patch easier to reason about and more controlled, but the
wallpaper has to fit that slot. Large or detailed images may be resized or
compressed more aggressively, so the result can look softer.

```bash
# Higher quality, better for large PNG or 4K images
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --mode unpacked

# More conservative, but more limited by the built-in asset slot
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --mode stable
```

See [docs/MODES.md](docs/MODES.md) for the trade-offs.

## Quick Start: Windows

Windows support is still experimental. Start with a manual run and keep a way to
reinstall Codex if the local patch does not apply cleanly:

```powershell
git clone https://github.com/TonyNa-code/codex-background-theme.git
cd codex-background-theme
npm install
node .\src\patch-codex-background.js --mode unpacked --image "C:\Path\To\wallpaper.png"
node .\src\patch-codex-background.js --check
```

If Codex is installed in a non-standard location, pass the app directory, exe,
resources directory, or `app.asar` path:

```powershell
node .\src\patch-codex-background.js --app-root "C:\Path\To\Codex" --mode unpacked --image "C:\Path\To\wallpaper.png"
```

More notes are in [docs/WINDOWS.md](docs/WINDOWS.md).

## Useful Commands

```bash
node src/patch-codex-background.js --help
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --mode unpacked
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --surface light --text dark
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --surface glass --text light
node src/patch-codex-background.js --analyze-image "/path/to/wallpaper.png"
node src/patch-codex-background.js --check
```

## Modes

- `unpacked`: recommended. Keeps large images outside the ASAR payload while
  marking the chosen asset as unpacked.
- `stable`: writes into an existing PNG slot. More conservative and controlled,
  but image size is limited and quality can be lower.
- `external`: references a local file URL.
- `expanded`: experimental. Rebuilds the ASAR and is disabled unless explicitly
  allowed.

## Surface Styles

- `auto`: chooses a bright or dark glass treatment from image analysis.
- `light`: light glass with dark text, useful for bright wallpapers.
- `glass`: dark translucent glass with light text.
- `clear`, `dark`, `solid`, `minimal`: manual variants.

See [docs/THEMING.md](docs/THEMING.md) for image and readability tips.

## Reapply

macOS:

```bash
zsh scripts/codex-background-reapply.zsh --force
```

To let the helper restart Codex when the app started before the refreshed files
were written:

```bash
zsh scripts/codex-background-reapply.zsh --force --auto-restart
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

## Safety Notes

- The patcher edits local app files and writes backups before changing them.
- Codex updates can replace the patched app files. Reapply after an update when
  the theme disappears.
- Do not run it on work machines unless you are allowed to modify installed
  apps.
- Do not publish screenshots or wallpapers you do not have rights to share.
- When opening issues, redact local paths, account names, tokens, and private
  filenames.

## Project Layout

```text
src/                         patcher and small ASAR helper
scripts/                     install, uninstall, and reapply scripts
docs/                        translated guides and platform notes
.github/                     issue templates and CI
```

If this saves you time, starring the repo helps other Codex Desktop users find
it.
