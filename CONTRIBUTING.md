# Contributing

Thanks for helping improve Codex Background Theme.

## Before Opening An Issue

- Search existing issues first.
- Run `node src/patch-codex-background.js --check` if Codex is already patched.
- Redact local paths, usernames, tokens, private filenames, and work details.
- Do not attach wallpapers or screenshots you do not have the right to share.

## Local Checks

```bash
npm install
npm run check
```

On macOS, an installed-app check can be run with:

```bash
npm run check:installed
```

## Pull Requests

Keep changes focused. Good pull requests usually include:

- A short explanation of the user-visible change.
- The platform tested.
- The commands used to validate the change.
- Notes about any remaining macOS or Windows gaps.

Please avoid committing generated output, backups, local theme files, screenshots,
or wallpaper assets.
