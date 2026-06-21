# Patching Modes

Codex Background Theme supports two practical paths.

## Recommended: `unpacked`

Use this when you want the wallpaper to look as close as possible to the source
image, especially for large PNG or 4K artwork.

```bash
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --mode unpacked
```

How it works:

- The selected Codex image entry is marked as unpacked.
- The wallpaper is written outside the ASAR payload.
- Large images are less likely to be squeezed into a small built-in slot.

Trade-offs:

- It changes the ASAR header metadata.
- Codex updates can overwrite the patch, so reapply support matters.
- It is the main tested path on macOS, but Windows still needs more real-world
  testing.

## Conservative: `stable`

Use this when you prefer a smaller, more controlled patch and can accept lower
wallpaper fidelity.

```bash
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --mode stable
```

How it works:

- The wallpaper is prepared to fit an existing PNG asset slot.
- The patch avoids adding a new external asset path.
- The result is easier to inspect because it reuses an existing resource slot.

Trade-offs:

- The image must fit the existing asset size.
- Large or detailed wallpapers may be resized or compressed more strongly.
- The result can look softer than `unpacked`, especially with 4K artwork.

## Quick Choice

| Need | Mode |
| --- | --- |
| Best image quality | `unpacked` |
| Large PNG or 4K wallpaper | `unpacked` |
| More conservative patch shape | `stable` |
| Smaller/simple wallpaper | `stable` |
| Testing a new Codex version carefully | start with `stable`, then try `unpacked` |

Both modes still patch local Codex Desktop files. Keep a reinstall path either
way.
