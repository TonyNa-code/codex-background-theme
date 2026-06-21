# Theme And Image Tips

The patcher tries to keep the wallpaper visible without making Codex hard to
read. The best settings depend on the image.

## Start With Auto

```bash
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --surface auto --mode unpacked
```

`auto` analyzes the prepared PNG and picks a light or dark glass treatment. It is
only a starting point; busy images can still need manual tuning.

## Bright Wallpapers

For light images, pastel images, or mostly white backgrounds:

```bash
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --surface light --text dark --mode unpacked
```

This keeps the UI closer to a bright glass style and uses dark text.

## Dark Wallpapers

For night scenes, dark illustrations, or purple/blue images:

```bash
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --surface glass --text light --mode unpacked
```

This adds a darker translucent layer and uses light text.

## Large PNG Files

Use `unpacked` mode for large or 4K PNG files:

```bash
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --mode unpacked
```

`stable` mode writes into an existing asset slot and is more size-sensitive. It
is useful when you want a conservative patch shape, but the wallpaper may look
softer because the image has to fit the built-in slot.

For a fuller comparison, see [MODES.md](MODES.md).

## Position

If the main subject is hidden behind the composer or sidebar, adjust the
background position:

```bash
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --position "45% 48%" --mode unpacked
```

## Preview Multiple Images

```bash
node src/patch-codex-background.js --test-images image-a.png image-b.png image-c.png
```

This creates local preview output under `theme-tests/`. Do not commit those
files if the images are private or copyrighted.
