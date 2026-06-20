#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { fileURLToPath, pathToFileURL } = require("url");
const zlib = require("zlib");

const toolDir = __dirname;
const defaultPngPath = path.join(toolDir, "generated/default-background.png");
const activePngPath = path.join(toolDir, "generated/background-current.png");
const expandedPngPath = path.join(toolDir, "generated/background-expanded.png");
const themeConfigPath = path.join(toolDir, "theme.json");
const backupDir = path.join(toolDir, "backups");
const startupArgs = parseArgs();
const appPaths = resolveAppPaths(startupArgs);
const appRoot = appPaths.appRoot;
const asarPath = appPaths.asarPath;
const plistPath = appPaths.plistPath;
const asarUnpackedRoot = appPaths.asarUnpackedRoot;

const preferredBgAssetPath = "webview/assets/dialog-artwork-connected-NZKCls7p.png";
const customBgAssetPath = "webview/assets/codex-custom-background.png";
const htmlPath = "webview/index.html";
const cssMarker = "      /* Codex custom chat background */";
const legacyCssMarkers = [];

const themeDefaults = {
  surface: "glass",
  text: "light",
  fit: "cover",
  position: "42% 46%",
  targetWidth: 1024,
  targetHeight: 576,
  mode: "stable",
  externalImagePath: null,
  autoTheme: true,
  overlay: null,
  sidebarOverlay: null,
  composerOverlay: null,
  contentOverlay: null,
};

const surfacePresets = {
  glass: {
    text: "light",
    gradient: "linear-gradient(120deg,rgb(8 6 18/.52),rgb(18 10 30/.36) 45%,rgb(8 8 22/.58))",
    bgPrimary: "rgb(22 14 38/.34)",
    main: "rgb(18 12 31/.30)",
    sidebar: "rgb(28 22 52/.58)",
    popover: "rgb(30 20 48/.94)",
    input: "rgb(24 15 42/.52)",
    composer: "rgb(24 15 42/.58)",
    elevated: "rgb(25 16 42/.86)",
    fog: "rgb(28 20 48/.58)",
    hover: "rgb(255 255 255/.10)",
    edge: "rgb(255 255 255/.14)",
    border: "rgb(255 255 255/.16)",
    borderStrong: "rgb(255 255 255/.18)",
    divider: "rgb(255 255 255/.08)",
    footerFrom: "rgb(18 12 31/.10)",
    footerVia: "rgb(18 12 31/.05)",
  },
  clear: {
    text: "light",
    gradient: "linear-gradient(120deg,rgb(8 6 18/.38),rgb(20 12 32/.20) 45%,rgb(8 8 22/.42))",
    bgPrimary: "rgb(22 14 38/.24)",
    main: "rgb(18 12 31/.18)",
    sidebar: "rgb(28 22 52/.46)",
    popover: "rgb(30 20 48/.88)",
    input: "rgb(24 15 42/.38)",
    composer: "rgb(24 15 42/.44)",
    elevated: "rgb(25 16 42/.78)",
    fog: "rgb(28 20 48/.48)",
    hover: "rgb(255 255 255/.10)",
    edge: "rgb(255 255 255/.12)",
    border: "rgb(255 255 255/.14)",
    borderStrong: "rgb(255 255 255/.16)",
    divider: "rgb(255 255 255/.08)",
    footerFrom: "rgb(18 12 31/.06)",
    footerVia: "rgb(18 12 31/.03)",
  },
  dark: {
    text: "light",
    gradient: "linear-gradient(120deg,rgb(5 5 12/.70),rgb(15 10 24/.58) 45%,rgb(5 6 14/.72))",
    bgPrimary: "rgb(12 9 22/.54)",
    main: "rgb(12 9 22/.48)",
    sidebar: "rgb(18 14 32/.70)",
    popover: "rgb(20 15 32/.96)",
    input: "rgb(16 12 28/.66)",
    composer: "rgb(16 12 28/.72)",
    elevated: "rgb(18 14 32/.92)",
    fog: "rgb(22 18 36/.70)",
    hover: "rgb(255 255 255/.11)",
    edge: "rgb(255 255 255/.13)",
    border: "rgb(255 255 255/.15)",
    borderStrong: "rgb(255 255 255/.18)",
    divider: "rgb(255 255 255/.08)",
    footerFrom: "rgb(12 9 22/.14)",
    footerVia: "rgb(12 9 22/.07)",
  },
  light: {
    text: "dark",
    gradient: "linear-gradient(120deg,rgb(255 250 255/.48),rgb(250 246 255/.34) 45%,rgb(255 250 255/.50))",
    bgPrimary: "rgb(255 250 255/.42)",
    main: "rgb(255 250 255/.32)",
    sidebar: "rgb(245 238 255/.62)",
    popover: "rgb(252 248 255/.94)",
    input: "rgb(255 255 255/.58)",
    composer: "rgb(255 255 255/.64)",
    elevated: "rgb(252 248 255/.88)",
    fog: "rgb(255 255 255/.62)",
    hover: "rgb(60 45 80/.09)",
    edge: "rgb(60 45 80/.14)",
    border: "rgb(60 45 80/.16)",
    borderStrong: "rgb(60 45 80/.18)",
    divider: "rgb(60 45 80/.10)",
    footerFrom: "rgb(255 255 255/.10)",
    footerVia: "rgb(255 255 255/.05)",
  },
  solid: {
    text: "light",
    gradient: "linear-gradient(120deg,rgb(8 6 18/.66),rgb(18 10 30/.62) 45%,rgb(8 8 22/.70))",
    bgPrimary: "rgb(18 12 31/.68)",
    main: "rgb(18 12 31/.62)",
    sidebar: "rgb(28 22 52/.78)",
    popover: "rgb(30 20 48/.98)",
    input: "rgb(24 15 42/.82)",
    composer: "rgb(24 15 42/.86)",
    elevated: "rgb(25 16 42/.94)",
    fog: "rgb(28 20 48/.78)",
    hover: "rgb(255 255 255/.10)",
    edge: "rgb(255 255 255/.14)",
    border: "rgb(255 255 255/.16)",
    borderStrong: "rgb(255 255 255/.18)",
    divider: "rgb(255 255 255/.08)",
    footerFrom: "rgb(18 12 31/.18)",
    footerVia: "rgb(18 12 31/.10)",
  },
  minimal: {
    text: "light",
    gradient: "linear-gradient(120deg,rgb(8 6 18/.44),rgb(18 10 30/.26) 45%,rgb(8 8 22/.48))",
    bgPrimary: "rgb(22 14 38/.26)",
    main: "rgb(18 12 31/.18)",
    sidebar: "rgb(28 22 52/.52)",
    popover: "rgb(30 20 48/.90)",
    input: "rgb(24 15 42/.44)",
    composer: "rgb(24 15 42/.50)",
    elevated: "rgb(25 16 42/.82)",
    fog: "rgb(28 20 48/.52)",
    hover: "rgb(255 255 255/.10)",
    edge: "rgb(255 255 255/.12)",
    border: "rgb(255 255 255/.14)",
    borderStrong: "rgb(255 255 255/.16)",
    divider: "rgb(255 255 255/.08)",
    footerFrom: "rgb(18 12 31/.08)",
    footerVia: "rgb(18 12 31/.04)",
  },
};

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

function cssAlpha(color, alpha) {
  const match = String(color).match(/^rgb\((\d+) (\d+) (\d+)\/\.[0-9]+\)$/);
  if (!match) return color;
  const safe = clampNumber(alpha, 0, 1);
  if (safe === null) return color;
  const alphaText = safe === 0 ? "0" : safe === 1 ? "1" : `.${String(Math.round(safe * 100)).padStart(2, "0")}`;
  return `rgb(${match[1]} ${match[2]} ${match[3]}/${alphaText})`;
}

function hexToRgbCss(input, alpha = 0.98) {
  const hex = String(input || "").trim();
  const match = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!match) return null;
  const n = Number.parseInt(match[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgb(${r} ${g} ${b}/${alpha})`;
}

function readThemeConfig() {
  if (!fs.existsSync(themeConfigPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(themeConfigPath, "utf8"));
  } catch {
    return {};
  }
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
    } else if (key === "check" || key === "analyze" || key === "testImages" || key === "saveConfig" || key === "noSaveConfig" || key === "dryRun" || key === "force") {
      args[key] = true;
    } else {
      args[key] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function pathExists(filePath) {
  try {
    return Boolean(filePath) && fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function firstExisting(paths) {
  return paths.find((candidate) => pathExists(candidate)) || paths[0];
}

function findWindowsExe(appDir) {
  if (!pathExists(appDir)) return path.join(appDir, "Codex.exe");
  const entries = fs.readdirSync(appDir, { withFileTypes: true });
  const exes = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".exe"))
    .map((entry) => path.join(appDir, entry.name));
  return exes.find((exe) => /codex/i.test(path.basename(exe))) || exes[0] || path.join(appDir, "Codex.exe");
}

function normalizeAppRoot(inputPath, platform = process.platform) {
  const input = path.resolve(inputPath);
  if (path.basename(input).toLowerCase() === "app.asar") {
    const resourcesDir = path.dirname(input);
    const root = path.basename(path.dirname(resourcesDir)) === "Contents"
      ? path.dirname(path.dirname(resourcesDir))
      : path.dirname(resourcesDir);
    return {
      platform,
      appRoot: root,
      resourcesDir,
      asarPath: input,
      plistPath: platform === "darwin" ? path.join(root, "Contents/Info.plist") : null,
      exePath: platform === "win32" ? findWindowsExe(root) : null,
      asarUnpackedRoot: path.join(resourcesDir, "app.asar.unpacked"),
    };
  }
  if (path.basename(input).toLowerCase() === "resources" || pathExists(path.join(input, "app.asar"))) {
    const resourcesDir = input;
    const root = path.basename(path.dirname(resourcesDir)) === "Contents"
      ? path.dirname(path.dirname(resourcesDir))
      : path.dirname(resourcesDir);
    return {
      platform,
      appRoot: root,
      resourcesDir,
      asarPath: path.join(resourcesDir, "app.asar"),
      plistPath: platform === "darwin" ? path.join(root, "Contents/Info.plist") : null,
      exePath: platform === "win32" ? findWindowsExe(root) : null,
      asarUnpackedRoot: path.join(resourcesDir, "app.asar.unpacked"),
    };
  }
  if (platform === "darwin" || input.endsWith(".app")) {
    const resourcesDir = path.join(input, "Contents/Resources");
    return {
      platform: "darwin",
      appRoot: input,
      resourcesDir,
      asarPath: path.join(resourcesDir, "app.asar"),
      plistPath: path.join(input, "Contents/Info.plist"),
      exePath: null,
      asarUnpackedRoot: path.join(resourcesDir, "app.asar.unpacked"),
    };
  }
  if (platform === "win32" || input.toLowerCase().endsWith(".exe")) {
    const root = input.toLowerCase().endsWith(".exe") ? path.dirname(input) : input;
    const resourcesDir = path.join(root, "resources");
    return {
      platform: "win32",
      appRoot: root,
      resourcesDir,
      asarPath: path.join(resourcesDir, "app.asar"),
      plistPath: null,
      exePath: input.toLowerCase().endsWith(".exe") ? input : findWindowsExe(root),
      asarUnpackedRoot: path.join(resourcesDir, "app.asar.unpacked"),
    };
  }
  const resourcesDir = path.join(input, "resources");
  return {
    platform,
    appRoot: input,
    resourcesDir,
    asarPath: path.join(resourcesDir, "app.asar"),
    plistPath: null,
    exePath: null,
    asarUnpackedRoot: path.join(resourcesDir, "app.asar.unpacked"),
  };
}

function windowsAppRootCandidates() {
  const env = process.env;
  const bases = [
    env.CODEX_APP_ROOT,
    env.CODEX_APP_PATH,
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Programs", "Codex"),
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Programs", "codex"),
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Codex"),
    env.ProgramFiles && path.join(env.ProgramFiles, "Codex"),
    env["ProgramFiles(x86)"] && path.join(env["ProgramFiles(x86)"], "Codex"),
    path.join(os.homedir(), "AppData", "Local", "Programs", "Codex"),
  ].filter(Boolean);
  const programsDir = env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Programs");
  if (pathExists(programsDir)) {
    for (const entry of fs.readdirSync(programsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && /codex/i.test(entry.name)) {
        bases.push(path.join(programsDir, entry.name));
      }
    }
  }
  return [...new Set(bases)];
}

function resolveAppPaths(args = {}) {
  const platform = args.platform || process.env.CODEX_BACKGROUND_PLATFORM || process.platform;
  const explicit = args.appRoot || args.appPath || process.env.CODEX_APP_ROOT || process.env.CODEX_APP_PATH;
  if (explicit) return normalizeAppRoot(explicit, platform);

  const candidates = platform === "darwin"
    ? ["/Applications/Codex.app", path.join(os.homedir(), "Applications", "Codex.app")]
    : platform === "win32"
      ? windowsAppRootCandidates()
      : [path.join(os.homedir(), "Codex")];
  const selected = firstExisting(candidates.map((candidate) => normalizeAppRoot(candidate, platform).asarPath));
  if (selected && path.basename(selected).toLowerCase() === "app.asar") {
    return normalizeAppRoot(selected, platform);
  }
  return normalizeAppRoot(candidates[0], platform);
}

function resolveThemeOptions(args = {}, base = readThemeConfig()) {
  const config = {
    ...themeDefaults,
    ...base,
  };
  for (const key of [
    "surface",
    "text",
    "fit",
    "position",
    "overlay",
    "sidebarOverlay",
    "composerOverlay",
    "contentOverlay",
    "targetWidth",
    "targetHeight",
    "mode",
    "externalImagePath",
    "autoTheme",
    "preparedImagePath",
    "sourceImagePath",
  ]) {
    if (args[key] !== undefined) config[key] = args[key];
  }
  if (args.image) config.sourceImagePath = path.resolve(args.image);
  config.surface = config.surface === "auto" || surfacePresets[config.surface] ? config.surface : "glass";
  config.mode = ["stable", "expanded", "external", "unpacked"].includes(config.mode) ? config.mode : "stable";
  config.text = config.text || surfacePresets[config.surface]?.text || "auto";
  if (config.autoTheme === "false") config.autoTheme = false;
  if (config.autoTheme === "true") config.autoTheme = true;
  config.targetWidth = Math.max(480, Number(config.targetWidth || themeDefaults.targetWidth));
  config.targetHeight = Math.max(270, Number(config.targetHeight || themeDefaults.targetHeight));
  if (config.externalImagePath) config.externalImagePath = path.resolve(config.externalImagePath);
  if (config.mode === "external") {
    if (args.image) config.externalImagePath = path.resolve(args.image);
    if (!config.externalImagePath && config.sourceImagePath) config.externalImagePath = path.resolve(config.sourceImagePath);
    if (!config.externalImagePath && config.preparedImagePath) config.externalImagePath = path.resolve(config.preparedImagePath);
  }
  if (config.mode === "unpacked") {
    config.externalImagePath = null;
  }
  if (!config.sourceImagePath && !config.preparedImagePath) {
    config.preparedImagePath = defaultPngPath;
    config.sourceImagePath = defaultPngPath;
  }
  if (!config.preparedImagePath) config.preparedImagePath = activePngPath;
  return config;
}

function assertExpandedModeAllowed(theme) {
  if (theme.mode !== "expanded") return;
  if (process.env.CODEX_BACKGROUND_ALLOW_EXPANDED === "1") return;
  throw new Error(
    "Expanded mode is disabled by default because rebuilding app.asar can break Codex runtime package metadata. " +
      "Use --mode stable, or set CODEX_BACKGROUND_ALLOW_EXPANDED=1 only for one-off manual experiments."
  );
}

function buildPreset(theme) {
  const surfaceName = surfacePresets[theme.surface] ? theme.surface : "glass";
  const preset = { ...surfacePresets[surfaceName] };
  const textMode = theme.text === "auto" ? preset.text : theme.text;
  const customText = hexToRgbCss(textMode);
  const darkText = textMode === "dark";
  preset.fg = customText || (darkText ? "rgb(22 16 30/.96)" : "rgb(252 248 255/.98)");
  preset.muted = darkText ? "rgb(52 42 68/.78)" : "rgb(232 225 248/.82)";
  preset.placeholder = darkText ? "rgb(62 50 78/.58)" : "rgb(235 229 249/.76)";
  preset.placeholderAfter = darkText ? "rgb(62 50 78/.64)" : "rgb(235 229 249/.78)";
  preset.position = theme.position || themeDefaults.position;

  if (theme.overlay !== null && theme.overlay !== undefined) {
    preset.main = cssAlpha(preset.main, Number(theme.overlay));
    preset.bgPrimary = cssAlpha(preset.bgPrimary, Math.min(1, Number(theme.overlay) + 0.04));
  }
  if (theme.sidebarOverlay !== null && theme.sidebarOverlay !== undefined) {
    preset.sidebar = cssAlpha(preset.sidebar, Number(theme.sidebarOverlay));
  }
  if (theme.composerOverlay !== null && theme.composerOverlay !== undefined) {
    preset.composer = cssAlpha(preset.composer, Number(theme.composerOverlay));
  }
  if (theme.contentOverlay !== null && theme.contentOverlay !== undefined) {
    preset.input = cssAlpha(preset.input, Number(theme.contentOverlay));
  }
  return preset;
}

function buildBackgroundUrl(bgAssetPath, theme = resolveThemeOptions({ persist: false })) {
  if (theme.mode === "external") {
    const externalPath = theme.externalImagePath || theme.sourceImagePath || theme.preparedImagePath || defaultPngPath;
    return pathToFileURL(path.resolve(externalPath)).href.replaceAll('"', "%22");
  }
  return `./assets/${path.basename(bgAssetPath)}`;
}

function buildCustomCss(bgAssetPath, theme = resolveThemeOptions({ persist: false })) {
  const bgUrl = buildBackgroundUrl(bgAssetPath, theme);
  const p = buildPreset(theme);
  return String.raw`${cssMarker}
      html[data-codex-window-type=electron]{--u:url("${bgUrl}");--v:${p.gradient};--f:${p.fg};--m:${p.muted};--s:${p.bgPrimary};--p:${p.popover};--c:${p.input};--g:${p.composer};--e:${p.edge};--color-token-foreground:var(--f);--color-token-text-primary:var(--f);--color-token-text-secondary:var(--m);--color-token-description-foreground:var(--m);--color-token-input-foreground:var(--f);--color-token-button-tertiary-foreground:var(--f);--color-token-main-surface-primary:${p.main};--color-token-bg-primary:var(--s);--color-token-bg-fog:${p.fog};--color-token-list-hover-background:${p.hover};--color-token-border:${p.border};--color-token-border-default:${p.borderStrong};--color-token-dropdown-background:var(--p);--color-background-elevated-primary:var(--p);--color-background-elevated-secondary:${p.elevated};--color-background-surface:${p.main};--vscode-foreground:var(--f);--vscode-descriptionForeground:var(--m);--vscode-editor-background:${p.sidebar};--vscode-input-background:var(--c);--vscode-input-foreground:var(--f);--vscode-input-placeholderForeground:${p.placeholder};--vscode-dropdown-background:var(--p);background:var(--v),var(--u) ${p.position}/cover no-repeat!important;color:var(--f)!important}
      html[data-codex-window-type=electron] body{background:var(--v),var(--u) ${p.position}/cover no-repeat!important;color:var(--f)!important}
      #root{background:#0000!important}
      .main-surface{--color-background-panel:var(--c);--color-token-bg-secondary:${p.elevated};background:${p.main}!important;color:var(--f)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
      .app-shell-left-panel{background:${p.sidebar}!important;color:var(--f)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
      html[data-codex-window-type=electron]:not([data-codex-window-chrome=application-menu]) .app-shell-left-panel:after{inset:0 0 0 auto!important;width:1px!important;background:${p.divider}!important}
      :is(.app-header-divider,.app-shell-main-content-top-fade){display:none!important}
      .app-shell-main-content-frame{border-top-color:#0000!important}
      .main-surface .sticky.top-0.electron\:bg-token-main-surface-primary{background:#0000!important}
      :is(.main-surface,.app-shell-left-panel) :is(.text-token-foreground,.text-token-text-primary,.text-black){color:var(--f)!important}
      :is(.main-surface,.app-shell-left-panel) :is(.text-token-description-foreground,.text-token-text-secondary,.text-token-text-tertiary){color:var(--m)!important}
      html[data-codex-window-type=electron] .main-surface button.bg-token-bg-fog{background:${p.fog}!important;border-color:var(--e)!important;color:var(--f)!important}
      html[data-codex-window-type=electron] .main-surface button[data-state=open]{background:${p.hover}!important;border-color:var(--e)!important;color:var(--f)!important}
      html[data-codex-window-type=electron] .main-surface button.bg-token-bg-fog :is(span,svg),html[data-codex-window-type=electron] .main-surface button[data-state=open] :is(span,svg){color:inherit!important}
      .main-surface :is(.bg-token-input-background\/70,.bg-token-input-background\/75,.bg-token-input-background\/80,.bg-token-input-background\/90):has(.ProseMirror){background:var(--c)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
      .main-surface .bg-token-input-background\/90:has([data-codex-composer]){background:var(--g)!important;border:1px solid var(--e)!important;border-radius:24px!important;box-shadow:0 16px 32px rgb(0 0 0/.20)!important;overflow:hidden!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
      .main-surface:has(.relative.z-0.-mt-2>.bg-token-side-bar-background.rounded-b-2xl) .bg-token-input-background\/90:has([data-codex-composer]){padding-bottom:56px!important;border-bottom-color:var(--e)!important;border-radius:24px!important}
      .main-surface .relative.z-0.-mt-2:has(>.bg-token-side-bar-background.rounded-b-2xl){z-index:11!important;height:56px!important;margin-top:-56px!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
      .main-surface .relative.z-0.-mt-2>.bg-token-side-bar-background.rounded-b-2xl{--color-token-side-bar-background:transparent!important;--color-token-bg-fog:transparent!important;margin:0!important;padding:10px 12px 12px!important;min-height:56px!important;border:0!important;border-top:1px solid var(--e)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:var(--f)!important;opacity:1!important}
      .main-surface .relative.z-0.-mt-2>.bg-token-side-bar-background.rounded-b-2xl :is(button,[role=button],span,svg,.text-token-foreground,.text-token-text-primary,.text-token-description-foreground,.text-token-text-secondary,.text-token-text-tertiary,.text-token-input-placeholder-foreground,.text-token-muted-foreground){color:var(--f)!important;opacity:1!important}
      .main-surface [data-thread-scroll-footer=true] :is(.from-token-main-surface-primary,.via-token-main-surface-primary){--tw-gradient-from:${p.footerFrom}!important;--tw-gradient-via:${p.footerVia}!important;background-color:transparent!important}
      .main-surface :is(.ProseMirror,[data-codex-composer],[role=textbox]){background:transparent!important;color:var(--f)!important}
      .ProseMirror .placeholder:after{color:${p.placeholderAfter}!important;opacity:1!important}`;
}

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function readAsar(buffer) {
  const headerJsonSize = buffer.readUInt32LE(12);
  const headerStart = 16;
  const headerEnd = headerStart + headerJsonSize;
  const dataOffset = headerEnd + ((4 - (headerEnd % 4)) % 4);
  const headerText = buffer.slice(headerStart, headerEnd).toString("utf8");
  return {
    dataOffset,
    headerEnd,
    headerJsonSize,
    headerStart,
    headerText,
    header: JSON.parse(headerText),
  };
}

function findEntry(node, entryPath) {
  const parts = entryPath.split("/");
  let current = node;
  for (const part of parts) {
    current = current.files?.[part];
    if (!current) return null;
  }
  return current;
}

function walkFiles(node, prefix = "", out = []) {
  if (!node.files) {
    out.push(prefix);
    return out;
  }
  for (const [name, child] of Object.entries(node.files)) {
    walkFiles(child, prefix ? `${prefix}/${name}` : name, out);
  }
  return out;
}

function extractFile(buffer, meta, entryPath) {
  const entry = findEntry(meta.header, entryPath);
  if (!entry || entry.files) {
    throw new Error(`Missing ASAR file entry: ${entryPath}`);
  }
  const start = meta.dataOffset + Number(entry.offset);
  return {
    entry,
    start,
    bytes: buffer.slice(start, start + entry.size),
  };
}

function ensureFileEntry(root, entryPath) {
  const parts = entryPath.split("/");
  let current = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    current.files ||= {};
    current.files[part] ||= { files: {} };
    current = current.files[part];
  }
  current.files ||= {};
  current.files[parts[parts.length - 1]] ||= {};
  return current.files[parts[parts.length - 1]];
}

function removeEntry(root, entryPath) {
  const parts = entryPath.split("/");
  let current = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    current = current.files?.[parts[i]];
    if (!current) return;
  }
  delete current.files?.[parts[parts.length - 1]];
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function canFitPng(inputSize, targetSize) {
  return inputSize + 12 + Buffer.byteLength("codex-background") + 1 <= targetSize;
}

function pickBackgroundAsset(buffer, meta, inputSize) {
  const preferred = findEntry(meta.header, preferredBgAssetPath);
  if (preferred && !preferred.files && !preferred.unpacked && canFitPng(inputSize, preferred.size)) {
    return {
      path: preferredBgAssetPath,
      file: extractFile(buffer, meta, preferredBgAssetPath),
    };
  }

  const candidates = walkFiles(meta.header)
    .filter((entryPath) => entryPath.startsWith("webview/assets/") && entryPath.endsWith(".png"))
    .filter((entryPath) => !findEntry(meta.header, entryPath)?.unpacked)
    .map((entryPath) => ({
      path: entryPath,
      file: extractFile(buffer, meta, entryPath),
    }))
    .filter(({ file }) => canFitPng(inputSize, file.entry.size))
    .sort((a, b) => a.file.entry.size - b.file.entry.size);

  if (candidates.length === 0) {
    throw new Error("Could not find a PNG asset slot large enough for the Codex background");
  }
  return candidates[0];
}

function makePngExactSize(input, targetSize) {
  const sig = Buffer.from("89504e470d0a1a0a", "hex");
  if (!input.subarray(0, sig.length).equals(sig)) {
    throw new Error("Input background is not a PNG");
  }
  if (input.length > targetSize) {
    throw new Error(`PNG is ${input.length} bytes, target slot is ${targetSize}`);
  }
  if (input.length === targetSize) {
    return input;
  }

  const iendTypeOffset = input.length - 8;
  if (input.subarray(iendTypeOffset, iendTypeOffset + 4).toString("ascii") !== "IEND") {
    throw new Error("PNG does not end with an IEND chunk");
  }

  const beforeIend = input.subarray(0, input.length - 12);
  const iend = input.subarray(input.length - 12);
  const chunkOverhead = 12;
  const dataLength = targetSize - input.length - chunkOverhead;
  if (dataLength < 0) {
    throw new Error("Not enough PNG padding room for a valid chunk");
  }

  const type = Buffer.from("tEXt", "ascii");
  const data = Buffer.alloc(dataLength, 0x20);
  const keyword = Buffer.from("codex-background");
  keyword.copy(data, 0);
  if (keyword.length < data.length) {
    data[keyword.length] = 0;
  }

  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])), 0);
  return Buffer.concat([beforeIend, len, type, data, crc, iend]);
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c ^= byte;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function buildPatchedHtml(originalBytes, bgAssetPath, theme = resolveThemeOptions()) {
  let html = originalBytes.toString("utf8");
  const customCss = buildCustomCss(bgAssetPath, theme);
  const markers = [cssMarker, ...legacyCssMarkers];
  const markerHit = markers
    .map((marker) => ({ marker, index: html.indexOf(marker) }))
    .filter((hit) => hit.index >= 0)
    .sort((a, b) => a.index - b.index)[0];
  const markerIndex = markerHit?.index ?? -1;
  if (markerIndex >= 0) {
    const styleEnd = html.indexOf("</style>", markerIndex);
    if (styleEnd < 0) {
      throw new Error("Existing background CSS marker was found without a closing style tag");
    }
    html = `${html.slice(0, markerIndex)}${customCss}\n    ${html.slice(styleEnd)}`;
  } else {
    const styleEnd = html.indexOf("</style>");
    if (styleEnd < 0) {
      throw new Error("Could not find a style tag to inject the Codex background CSS");
    }
    html = `${html.slice(0, styleEnd)}${customCss}\n    ${html.slice(styleEnd)}`;
  }

  if (Buffer.byteLength(html) > originalBytes.length) {
    html = html.replace(
      /-webkit-mask-image: url\("data:image\/svg\+xml;utf8,[^"]+"\);\s*mask-image: url\("data:image\/svg\+xml;utf8,[^"]+"\);/,
      "-webkit-mask-image: none;\n        mask-image: none;"
    );
  }

  if (Buffer.byteLength(html) > originalBytes.length) {
    html = html.replace(
      /      :root \{[\s\S]*?      @keyframes startup-codex-logo-shimmer \{[\s\S]*?      \}\n\s*(?=      \/\* Codex custom chat background \*\/)/,
      "      html,body,#root{margin:0;width:100%;height:100%;background:transparent}.startup-loader{display:none}\n"
    );
  }

  const byteLength = Buffer.byteLength(html);
  if (byteLength > originalBytes.length) {
    throw new Error(`Patched HTML is ${byteLength - originalBytes.length} bytes too large`);
  }

  const pad = " ".repeat(originalBytes.length - byteLength);
  html = html.replace("</style>", `${pad}</style>`);
  const patched = Buffer.from(html, "utf8");
  if (patched.length !== originalBytes.length) {
    throw new Error("Patched HTML did not preserve the original ASAR entry size");
  }
  return patched;
}

function updateEntryIntegrity(header, entryPath, newHash) {
  const entry = findEntry(header, entryPath);
  if (!entry?.integrity?.hash || !Array.isArray(entry.integrity.blocks)) {
    throw new Error(`Missing integrity metadata for ${entryPath}`);
  }
  if (entry.integrity.blocks.length !== 1) {
    throw new Error(`Unexpected multi-block integrity metadata for ${entryPath}`);
  }
  entry.integrity.hash = newHash;
  entry.integrity.blocks[0] = newHash;
}

function unpackedPathForEntry(entryPath) {
  return path.join(asarUnpackedRoot, ...entryPath.split("/"));
}

function readEntryBytes(buffer, meta, entryPath) {
  const entry = findEntry(meta.header, entryPath);
  if (!entry || entry.files) {
    throw new Error(`Missing ASAR file entry: ${entryPath}`);
  }
  if (entry.unpacked) {
    return fs.readFileSync(unpackedPathForEntry(entryPath));
  }
  return extractFile(buffer, meta, entryPath).bytes;
}

function setUnpackedEntry(header, entryPath, bytes) {
  const entry = ensureFileEntry(header, entryPath);
  entry.size = bytes.length;
  entry.unpacked = true;
  delete entry.offset;
  delete entry.integrity;
  return entry;
}

function writePaddedHeader(buffer, meta) {
  const headerText = JSON.stringify(meta.header);
  const headerBytes = Buffer.from(headerText, "utf8");
  if (headerBytes.length > meta.headerJsonSize) {
    throw new Error(`Header grew by ${headerBytes.length - meta.headerJsonSize} bytes`);
  }
  headerBytes.copy(buffer, meta.headerStart);
  if (headerBytes.length < meta.headerJsonSize) {
    buffer.fill(0x20, meta.headerStart + headerBytes.length, meta.headerStart + meta.headerJsonSize);
  }
  return buffer.subarray(meta.headerStart, meta.headerStart + meta.headerJsonSize);
}

function buildIntegrity(bytes) {
  const blockSize = 4194304;
  const blocks = [];
  if (bytes.length === 0) {
    blocks.push(sha256(bytes));
  }
  for (let offset = 0; offset < bytes.length; offset += blockSize) {
    blocks.push(sha256(bytes.subarray(offset, Math.min(offset + blockSize, bytes.length))));
  }
  return {
    algorithm: "SHA256",
    hash: sha256(bytes),
    blockSize,
    blocks,
  };
}

function writeAsarPrefix(jsonSize) {
  const innerPayloadSize = 4 + jsonSize + ((4 - ((4 + jsonSize) % 4)) % 4);
  const prefix = Buffer.alloc(16);
  prefix.writeUInt32LE(4, 0);
  prefix.writeUInt32LE(innerPayloadSize + 4, 4);
  prefix.writeUInt32LE(innerPayloadSize, 8);
  prefix.writeUInt32LE(jsonSize, 12);
  return {
    prefix,
    padding: Buffer.alloc(innerPayloadSize - 4 - jsonSize),
  };
}

function rebuildAsarWithReplacements(originalAsar, meta, replacements, additions = []) {
  const header = cloneJson(meta.header);
  for (const addition of additions) {
    removeEntry(header, addition.path);
  }

  const originalByPath = new Map();
  for (const entryPath of walkFiles(meta.header)) {
    const entry = findEntry(meta.header, entryPath);
    if (!entry || entry.files || entry.unpacked || entry.offset == null || entry.size == null) continue;
    if (additions.some((addition) => addition.path === entryPath)) continue;
    const bytes = replacements.get(entryPath) || extractFile(originalAsar, meta, entryPath).bytes;
    originalByPath.set(entryPath, bytes);
  }

  const dataParts = [];
  let offset = 0;
  for (const entryPath of walkFiles(header)) {
    const entry = findEntry(header, entryPath);
    if (!entry || entry.files || entry.unpacked || entry.offset == null || entry.size == null) continue;
    const bytes = originalByPath.get(entryPath);
    if (!bytes) continue;
    entry.offset = String(offset);
    entry.size = bytes.length;
    if (replacements.has(entryPath)) {
      entry.integrity = buildIntegrity(bytes);
    }
    dataParts.push(bytes);
    offset += bytes.length;
  }

  for (const addition of additions) {
    const entry = ensureFileEntry(header, addition.path);
    entry.size = addition.bytes.length;
    entry.offset = String(offset);
    entry.integrity = buildIntegrity(addition.bytes);
    dataParts.push(addition.bytes);
    offset += addition.bytes.length;
  }

  const headerBytes = Buffer.from(JSON.stringify(header), "utf8");
  const { prefix, padding } = writeAsarPrefix(headerBytes.length);
  return {
    asar: Buffer.concat([prefix, headerBytes, padding, ...dataParts]),
    header,
    headerBytes,
  };
}

function readMacAsarHash() {
  return execFileSync("/usr/libexec/PlistBuddy", [
    "-c",
    "Print :ElectronAsarIntegrity:Resources/app.asar:hash",
    plistPath,
  ], { encoding: "utf8" }).trim();
}

function writeMacAsarHash(hash) {
  execFileSync("/usr/libexec/PlistBuddy", [
    "-c",
    `Set :ElectronAsarIntegrity:Resources/app.asar:hash ${hash}`,
    plistPath,
  ]);
  return plistPath;
}

function loadResedit() {
  try {
    return require("resedit");
  } catch (error) {
    throw new Error(
      "Windows ASAR integrity support needs the optional `resedit` package. " +
        "Install it next to this script with `npm install resedit`, or use --app-root on a build without ASAR integrity."
    );
  }
}

function resourceBinToUtf8(bin) {
  const bytes = Buffer.from(bin instanceof ArrayBuffer ? new Uint8Array(bin) : bin);
  return bytes.toString("utf8").replace(/\0+$/g, "");
}

function parseWindowsIntegrityPayload(entry) {
  const payload = JSON.parse(resourceBinToUtf8(entry.bin));
  return Array.isArray(payload) ? payload : [payload];
}

function isWindowsAsarIntegrityEntry(entry) {
  return String(entry.type).toUpperCase() === "INTEGRITY" && String(entry.id).toUpperCase() === "ELECTRONASAR";
}

function windowsIntegrityFileMatches(file) {
  return String(file || "").replaceAll("/", "\\").toLowerCase() === "resources\\app.asar";
}

function readWindowsAsarHash() {
  const { NtExecutable, NtExecutableResource } = loadResedit();
  const exePath = appPaths.exePath;
  if (!exePath || !fs.existsSync(exePath)) {
    throw new Error("Could not find Codex.exe for Windows ASAR integrity validation. Pass --app-root <Codex install dir>.");
  }
  const executable = NtExecutable.from(fs.readFileSync(exePath));
  const resources = NtExecutableResource.from(executable);
  const entry = resources.entries.find(isWindowsAsarIntegrityEntry);
  if (!entry) return null;
  const record = parseWindowsIntegrityPayload(entry).find((item) => windowsIntegrityFileMatches(item.file));
  return record?.value || record?.hash || null;
}

function windowsIntegrityLanguage(resources, existingEntry) {
  if (existingEntry) {
    return { lang: existingEntry.lang ?? 1033, codepage: existingEntry.codepage ?? 1200 };
  }
  const first = resources.entries.find((entry) => entry.lang !== undefined || entry.codepage !== undefined);
  return { lang: first?.lang ?? 1033, codepage: first?.codepage ?? 1200 };
}

function writeWindowsAsarHash(hash) {
  const { NtExecutable, NtExecutableResource } = loadResedit();
  const exePath = appPaths.exePath;
  if (!exePath || !fs.existsSync(exePath)) {
    throw new Error("Could not find Codex.exe for Windows ASAR integrity update. Pass --app-root <Codex install dir>.");
  }
  const executable = NtExecutable.from(fs.readFileSync(exePath));
  const resources = NtExecutableResource.from(executable);
  const existing = resources.entries.find(isWindowsAsarIntegrityEntry);
  const language = windowsIntegrityLanguage(resources, existing);
  const payload = Buffer.from(JSON.stringify([{ file: "resources\\app.asar", alg: "sha256", value: hash }]), "utf8");
  resources.entries = resources.entries.filter((entry) => !isWindowsAsarIntegrityEntry(entry));
  resources.entries.push({
    type: "INTEGRITY",
    id: "ELECTRONASAR",
    lang: language.lang,
    codepage: language.codepage,
    bin: payload,
  });
  resources.outputResource(executable);
  fs.writeFileSync(exePath, Buffer.from(executable.generate()));
  return exePath;
}

function readInstalledAsarHash() {
  if (appPaths.platform === "darwin") return readMacAsarHash();
  if (appPaths.platform === "win32") return readWindowsAsarHash();
  return null;
}

function writeInstalledAsarHash(hash) {
  if (appPaths.platform === "darwin") return writeMacAsarHash(hash);
  if (appPaths.platform === "win32") return writeWindowsAsarHash(hash);
  return null;
}

function pngDimensions(bytes) {
  const sig = Buffer.from("89504e470d0a1a0a", "hex");
  if (!bytes.subarray(0, sig.length).equals(sig) || bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
    return null;
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function getImageDimensions(imagePath) {
  const png = pngDimensions(fs.readFileSync(imagePath));
  if (png) return png;
  if (process.platform !== "darwin" || !fs.existsSync("/usr/bin/sips")) {
    throw new Error(`Could not read image dimensions without macOS sips. Use a PNG image or pre-convert it: ${imagePath}`);
  }
  const out = execFileSync("/usr/bin/sips", [
    "-g",
    "pixelWidth",
    "-g",
    "pixelHeight",
    imagePath,
  ], { encoding: "utf8" });
  const width = Number(out.match(/pixelWidth:\s*(\d+)/)?.[1]);
  const height = Number(out.match(/pixelHeight:\s*(\d+)/)?.[1]);
  if (!width || !height) {
    throw new Error(`Could not read image dimensions: ${imagePath}`);
  }
  return { width, height };
}

function cropToAspect(width, height, targetAspect) {
  const sourceAspect = width / height;
  if (sourceAspect > targetAspect) {
    const cropWidth = Math.round(height * targetAspect);
    return {
      cropWidth,
      cropHeight: height,
      offsetX: Math.floor((width - cropWidth) / 2),
      offsetY: 0,
    };
  }
  const cropHeight = Math.round(width / targetAspect);
  return {
    cropWidth: width,
    cropHeight,
    offsetX: 0,
    offsetY: Math.floor((height - cropHeight) / 2),
  };
}

function prepareImage(imagePath, outputPath, options = {}) {
  const targetWidth = Number(options.targetWidth || themeDefaults.targetWidth);
  const targetHeight = Number(options.targetHeight || themeDefaults.targetHeight);
  const dimensions = getImageDimensions(imagePath);
  const sourcePng = pngDimensions(fs.readFileSync(imagePath));
  if (sourcePng?.width === targetWidth && sourcePng?.height === targetHeight) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.copyFileSync(imagePath, outputPath);
    return {
      source: imagePath,
      output: outputPath,
      sourceDimensions: dimensions,
      crop: null,
      outputDimensions: sourcePng,
      size: fs.statSync(outputPath).size,
    };
  }
  if (process.platform !== "darwin" || !fs.existsSync("/usr/bin/sips")) {
    throw new Error("Image resizing currently requires macOS sips. On Windows, use --mode unpacked with a PNG or pre-resize the image.");
  }
  const crop = cropToAspect(dimensions.width, dimensions.height, targetWidth / targetHeight);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  execFileSync("/usr/bin/sips", [
    "-s",
    "format",
    "png",
    "-c",
    String(crop.cropHeight),
    String(crop.cropWidth),
    "--cropOffset",
    String(crop.offsetY),
    String(crop.offsetX),
    "-z",
    String(targetHeight),
    String(targetWidth),
    imagePath,
    "-o",
    outputPath,
  ], { stdio: "pipe" });
  return {
    source: imagePath,
    output: outputPath,
    sourceDimensions: dimensions,
    crop,
    outputDimensions: pngDimensions(fs.readFileSync(outputPath)),
    size: fs.statSync(outputPath).size,
  };
}

function parsePng(bytes) {
  const sig = Buffer.from("89504e470d0a1a0a", "hex");
  if (!bytes.subarray(0, sig.length).equals(sig)) {
    throw new Error("Not a PNG file");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  let palette = null;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") {
      palette = data;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (bitDepth !== 8 || interlace !== 0) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, interlace=${interlace}`);
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : colorType === 4 ? 2 : colorType === 3 ? 1 : 0;
  if (!channels) throw new Error(`Unsupported PNG colorType=${colorType}`);
  if (colorType === 3 && !palette) throw new Error("Indexed PNG is missing PLTE");
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows = [];
  let src = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[src];
    src += 1;
    const row = Buffer.from(inflated.subarray(src, src + stride));
    src += stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? row[x - channels] : 0;
      const up = prev[x] || 0;
      const upLeft = x >= channels ? prev[x - channels] || 0 : 0;
      if (filter === 1) row[x] = (row[x] + left) & 255;
      else if (filter === 2) row[x] = (row[x] + up) & 255;
      else if (filter === 3) row[x] = (row[x] + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) row[x] = (row[x] + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`Unsupported PNG filter=${filter}`);
    }
    rows.push(row);
    prev = row;
  }
  return { width, height, colorType, channels, palette, rows };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function analyzePng(bytes) {
  const png = parsePng(bytes);
  let count = 0;
  let sum = 0;
  let sumSq = 0;
  let min = 1;
  let max = 0;
  let centerCount = 0;
  let centerSum = 0;
  const stepX = Math.max(1, Math.floor(png.width / 160));
  const stepY = Math.max(1, Math.floor(png.height / 90));
  for (let y = 0; y < png.height; y += stepY) {
    const row = png.rows[y];
    for (let x = 0; x < png.width; x += stepX) {
      let r;
      let g;
      let b;
      const i = x * png.channels;
      if (png.colorType === 3) {
        const p = row[i] * 3;
        r = png.palette[p];
        g = png.palette[p + 1];
        b = png.palette[p + 2];
      } else if (png.colorType === 0 || png.colorType === 4) {
        r = g = b = row[i];
      } else {
        r = row[i];
        g = row[i + 1];
        b = row[i + 2];
      }
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      count += 1;
      sum += luma;
      sumSq += luma * luma;
      min = Math.min(min, luma);
      max = Math.max(max, luma);
      if (x > png.width * 0.20 && x < png.width * 0.80 && y > png.height * 0.18 && y < png.height * 0.82) {
        centerCount += 1;
        centerSum += luma;
      }
    }
  }
  const average = sum / count;
  const contrast = Math.sqrt(Math.max(0, sumSq / count - average * average));
  const centerAverage = centerCount ? centerSum / centerCount : average;
  return {
    width: png.width,
    height: png.height,
    averageLuma: Number(average.toFixed(3)),
    centerLuma: Number(centerAverage.toFixed(3)),
    contrast: Number(contrast.toFixed(3)),
    minLuma: Number(min.toFixed(3)),
    maxLuma: Number(max.toFixed(3)),
  };
}

function recommendTheme(analysis, requested = {}) {
  const bright = Math.max(analysis.averageLuma, analysis.centerLuma);
  const busy = analysis.contrast > 0.23 || analysis.maxLuma - analysis.minLuma > 0.82;
  let surface = requested.surface === "auto" || !requested.surface ? "glass" : requested.surface;
  if (!surfacePresets[surface]) surface = "glass";
  if (requested.surface === "auto") {
    surface = bright > 0.66 ? "light" : busy ? "glass" : "clear";
  }
  const text = requested.text && requested.text !== "auto"
    ? requested.text
    : surface === "light"
      ? "dark"
      : "light";
  const defaultOverlay = surface === "light"
    ? (busy ? 0.18 : 0.14)
    : bright > 0.68
      ? 0.42
      : busy
        ? 0.36
        : 0.28;
  const overlay = requested.overlay ?? defaultOverlay;
  const sidebarOverlay = requested.sidebarOverlay ?? (surface === "light"
    ? Math.min(0.54, Number(overlay) + 0.20)
    : Math.min(0.78, Number(overlay) + 0.22));
  const composerOverlay = requested.composerOverlay ?? (surface === "light"
    ? Math.min(0.58, Number(overlay) + 0.24)
    : Math.min(0.78, Number(overlay) + 0.24));
  return {
    surface,
    text,
    overlay: Number(Number(overlay).toFixed(2)),
    sidebarOverlay: Number(Number(sidebarOverlay).toFixed(2)),
    composerOverlay: Number(Number(composerOverlay).toFixed(2)),
    rationale: {
      bright,
      busy,
    },
  };
}

function recommendationInputFor(theme, rawArgs = {}) {
  const input = { ...theme };
  if (theme.autoTheme !== false) {
    if (rawArgs.surface === undefined) input.surface = "auto";
    if (rawArgs.text === undefined) input.text = "auto";
  }
  for (const key of ["overlay", "sidebarOverlay", "composerOverlay"]) {
    if (rawArgs[key] === undefined) {
      input[key] = null;
    }
  }
  return input;
}

function choosePreparedImageSize(sourcePath, outputPath, targetSlotSize, options = {}) {
  const widths = [1024, 960, 900, 840, 768, 720, 640];
  const attempts = [];
  for (const width of widths) {
    const height = Math.round(width * 9 / 16);
    const candidate = outputPath.replace(/\.png$/i, `-${width}.png`);
    const prepared = prepareImage(sourcePath, candidate, { ...options, targetWidth: width, targetHeight: height });
    attempts.push(prepared);
    if (prepared.size <= targetSlotSize) {
      fs.copyFileSync(candidate, outputPath);
      return {
        ...prepared,
        output: outputPath,
        targetWidth: prepared.outputDimensions?.width || width,
        targetHeight: prepared.outputDimensions?.height || height,
        attempts: attempts.map((item) => ({
          output: item.output,
          width: item.outputDimensions?.width,
          height: item.outputDimensions?.height,
          size: item.size,
          fits: item.size <= targetSlotSize,
        })),
      };
    }
  }
  return {
    ...attempts[attempts.length - 1],
    targetWidth: attempts[attempts.length - 1]?.outputDimensions?.width,
    targetHeight: attempts[attempts.length - 1]?.outputDimensions?.height,
    attempts: attempts.map((item) => ({
      output: item.output,
      width: item.outputDimensions?.width,
      height: item.outputDimensions?.height,
      size: item.size,
      fits: item.size <= targetSlotSize,
    })),
    error: `Prepared PNG is too large for target ASAR slot ${targetSlotSize}`,
  };
}

function prepareExpandedImage(sourcePath, outputPath, options = {}) {
  const bytes = fs.readFileSync(sourcePath);
  const dims = pngDimensions(bytes);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  if (dims) {
    fs.copyFileSync(sourcePath, outputPath);
    return {
      source: sourcePath,
      output: outputPath,
      sourceDimensions: dims,
      crop: null,
      outputDimensions: dims,
      size: fs.statSync(outputPath).size,
      targetWidth: dims.width,
      targetHeight: dims.height,
      mode: "expanded-original",
    };
  }
  const sourceDimensions = getImageDimensions(sourcePath);
  const targetWidth = Number(options.targetWidth || sourceDimensions.width);
  const targetHeight = Number(options.targetHeight || Math.round(targetWidth * 9 / 16));
  const prepared = prepareImage(sourcePath, outputPath, {
    ...options,
    targetWidth,
    targetHeight,
  });
  return {
    ...prepared,
    targetWidth: prepared.outputDimensions?.width || targetWidth,
    targetHeight: prepared.outputDimensions?.height || targetHeight,
    mode: "expanded-converted",
  };
}

function countOccurrences(text, needle) {
  return text.split(needle).length - 1;
}

function findInstalledCss(html) {
  const markers = [cssMarker, ...legacyCssMarkers];
  const markerHit = markers
    .map((marker) => ({ marker, index: html.indexOf(marker) }))
    .filter((hit) => hit.index >= 0)
    .sort((a, b) => a.index - b.index)[0];
  if (!markerHit) return { marker: null, customCss: "" };
  const styleEnd = html.indexOf("</style>", markerHit.index);
  if (styleEnd < 0) return { marker: markerHit.marker, customCss: "" };
  return {
    marker: markerHit.marker,
    customCss: html.slice(markerHit.index, styleEnd),
  };
}

function normalizeCssMarker(customCss, marker) {
  return marker && marker !== cssMarker ? customCss.replace(marker, cssMarker) : customCss;
}

function validateInstalled() {
  const theme = resolveThemeOptions();
  assertExpandedModeAllowed(theme);
  const asar = fs.readFileSync(asarPath);
  const meta = readAsar(asar);
  const html = extractFile(asar, meta, htmlPath).bytes.toString("utf8");
  const { marker, customCss } = findInstalledCss(html);
  const comparableCustomCss = normalizeCssMarker(customCss, marker);
  const bgUrlNeedle = '--u:url("';
  const bgUrlStart = customCss.indexOf(bgUrlNeedle);
  const bgNameStart = bgUrlStart >= 0 ? bgUrlStart + bgUrlNeedle.length : -1;
  const bgNameEnd = bgNameStart >= 0 ? customCss.indexOf('")', bgNameStart) : -1;
  const bgUrl = bgNameStart >= 0 && bgNameEnd > bgNameStart
    ? customCss.slice(bgNameStart, bgNameEnd)
    : `./assets/${path.basename(preferredBgAssetPath)}`;
  const externalBackground = bgUrl.startsWith("file://");
  const bgAssetPath = externalBackground
    ? (theme.externalImagePath || theme.sourceImagePath || theme.preparedImagePath || defaultPngPath)
    : bgUrl.startsWith("./assets/")
      ? `webview/assets/${bgUrl.slice("./assets/".length)}`
      : preferredBgAssetPath;
  const bg = externalBackground
    ? fs.readFileSync(fileURLToPath(bgUrl))
    : readEntryBytes(asar, meta, bgAssetPath);
  const dimensions = pngDimensions(bg);
  let pngMatchesSource = false;
  const expectedPngPath = externalBackground
    ? (theme.externalImagePath || theme.sourceImagePath || theme.preparedImagePath || defaultPngPath)
    : (theme.preparedImagePath || defaultPngPath);
  if (fs.existsSync(expectedPngPath)) {
    const expectedBg = fs.readFileSync(expectedPngPath);
    const bgEntry = externalBackground ? null : findEntry(meta.header, bgAssetPath);
    const comparableExpectedBg = externalBackground || bgEntry?.unpacked ? expectedBg : makePngExactSize(expectedBg, bg.length);
    pngMatchesSource = sha256(comparableExpectedBg) === sha256(bg);
  }
  const headerHash = sha256(asar.subarray(meta.headerStart, meta.headerStart + meta.headerJsonSize));
  let installedHeaderHash = null;
  let installedHeaderHashError = null;
  try {
    installedHeaderHash = readInstalledAsarHash();
  } catch (error) {
    installedHeaderHashError = error.message;
  }
  let hasHomeFooterShell = false;
  let hasHomeSidebarSurface = false;
  let hasHomeComposerVariant = false;
  let hasHomeFooterSlot = false;
  let hasHomeFooterSurface = false;
  for (const entryPath of walkFiles(meta.header)) {
    if (!entryPath.startsWith("webview/assets/") || !entryPath.endsWith(".js")) continue;
    const text = extractFile(asar, meta, entryPath).bytes.toString("utf8");
    hasHomeFooterShell ||= text.includes("relative z-0 -mt-2");
    hasHomeSidebarSurface ||= text.includes("bg-token-side-bar-background");
    hasHomeComposerVariant ||= text.includes("externalFooterVariant:`home`");
    hasHomeFooterSlot ||= text.includes("home-external-footer") && text.includes("relative z-0 -mt-2");
    hasHomeFooterSurface ||= text.includes("rounded-b-2xl bg-token-side-bar-background dark:bg-token-bg-fog");
    if (hasHomeFooterShell && hasHomeSidebarSurface && hasHomeComposerVariant && hasHomeFooterSlot && hasHomeFooterSurface) break;
  }

  const badEntries = [];
  for (const entryPath of walkFiles(meta.header)) {
    const entry = findEntry(meta.header, entryPath);
    if (!entry?.integrity?.hash || entry.files || entry.unpacked) continue;
    const bytes = extractFile(asar, meta, entryPath).bytes;
    const blockSize = entry.integrity.blockSize || bytes.length;
    const blocks = entry.integrity.blocks || [];
    const actualBlocks = [];
    if (bytes.length === 0) {
      actualBlocks.push(sha256(bytes));
    }
    for (let offset = 0; offset < bytes.length; offset += blockSize) {
      actualBlocks.push(sha256(bytes.subarray(offset, Math.min(offset + blockSize, bytes.length))));
    }
    const blockMismatch = blocks.length !== actualBlocks.length || blocks.some((block, index) => block !== actualBlocks[index]);
    const hashMismatch = entry.integrity.hash !== sha256(bytes);
    if (blockMismatch || hashMismatch) {
      badEntries.push(entryPath);
      if (badEntries.length >= 10) break;
    }
  }

  const checks = {
    markerOnce: [cssMarker, ...legacyCssMarkers].reduce((total, item) => total + countOccurrences(html, item), 0) === 1,
    cssExact: comparableCustomCss.trimEnd() === buildCustomCss(bgAssetPath, theme).trimEnd(),
    cssVersion: customCss.includes("--color-token-main-surface-primary:"),
    topFadeHandled: customCss.includes(".app-shell-main-content-top-fade"),
    footerFadeHandled: customCss.includes("data-thread-scroll-footer=true"),
    composerHandled: customCss.includes(".bg-token-input-background\\/70") && customCss.includes(":has(.ProseMirror)"),
    homeComposerHandled: customCss.includes(":has(.relative.z-0.-mt-2>.bg-token-side-bar-background.rounded-b-2xl) .bg-token-input-background\\/90:has([data-codex-composer])"),
    homeDirectFooterHandled: customCss.includes(".relative.z-0.-mt-2>.bg-token-side-bar-background.rounded-b-2xl"),
    homeStickyHandled: customCss.includes(".sticky.top-0.electron\\:bg-token-main-surface-primary"),
    homeExternalFooterHandled: customCss.includes(".bg-token-side-bar-background.rounded-b-2xl") && customCss.includes("--color-token-bg-fog"),
    settingsSurfaceHandled: customCss.includes("--color-background-panel:var(--c)") && customCss.includes("--color-token-bg-secondary:"),
    outlineButtonsHandled: customCss.includes("--color-token-bg-fog:") && customCss.includes("button.bg-token-bg-fog"),
    openPillHandled: customCss.includes("--color-token-list-hover-background:") && customCss.includes("button[data-state=open]"),
    homeFooterBundleShape: hasHomeFooterShell && hasHomeSidebarSurface && hasHomeComposerVariant && hasHomeFooterSlot && hasHomeFooterSurface,
    noBroadClassContains: !customCss.includes("[class*="),
    noGlobalWhiteSweep: !customCss.includes(":is(.bg-white"),
    escapedSelectors: customCss.includes(".bg-token-input-background\\/70"),
    pngDimensions: dimensions?.width === Number(theme.targetWidth || 1024) && dimensions?.height === Number(theme.targetHeight || 576),
    pngPaddingMarker: theme.mode === "expanded" || theme.mode === "external" || theme.mode === "unpacked" || bg.includes(Buffer.from("codex-background")),
    pngMatchesSource,
    headerHashMatchesApp: installedHeaderHash === null ? appPaths.platform !== "darwin" && appPaths.platform !== "win32" : headerHash === installedHeaderHash,
    headerHashMatchesPlist: appPaths.platform !== "darwin" || headerHash === installedHeaderHash,
    entryIntegrityOk: badEntries.length === 0,
  };
  return {
    ok: Object.values(checks).every(Boolean),
    checks,
    theme: {
      surface: theme.surface,
      text: theme.text,
      mode: theme.mode,
      preparedImagePath: expectedPngPath,
      targetWidth: Number(theme.targetWidth || 1024),
      targetHeight: Number(theme.targetHeight || 576),
    },
    app: {
      platform: appPaths.platform,
      appRoot,
      asarPath,
      integrityPath: appPaths.platform === "win32" ? appPaths.exePath : plistPath,
    },
    backgroundAsset: bgAssetPath,
    dimensions,
    headerHash,
    installedHeaderHash,
    installedHeaderHashError,
    plistHash: appPaths.platform === "darwin" ? installedHeaderHash : undefined,
    badEntries,
  };
}

function getPreferredSlotSize() {
  const asar = fs.readFileSync(asarPath);
  const meta = readAsar(asar);
  const entry = findEntry(meta.header, preferredBgAssetPath);
  if (!entry || entry.files) {
    throw new Error(`Missing preferred background asset slot: ${preferredBgAssetPath}`);
  }
  return entry.unpacked ? 902530 : entry.size;
}

function safeSlug(filePath) {
  return path.basename(filePath).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "wallpaper";
}

function cssEscapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function writeThemePreview(results, outDir) {
  const cards = results.map((result) => {
    if (result.error) {
      return `<section class="card error"><h2>${cssEscapeAttr(result.name)}</h2><p>${cssEscapeAttr(result.error)}</p></section>`;
    }
    const rec = result.recommendation;
    const image = path.relative(outDir, result.prepared.output);
    const p = buildPreset({
      surface: rec.surface,
      text: rec.text,
      overlay: rec.overlay,
      sidebarOverlay: rec.sidebarOverlay,
      composerOverlay: rec.composerOverlay,
      position: "center",
    });
    return `<section class="card" style="--image:url('${cssEscapeAttr(image)}');--gradient:${p.gradient};--main:${p.main};--sidebar:${p.sidebar};--composer:${p.composer};--fg:${p.fg};--muted:${p.muted};--border:${p.border};--hover:${p.hover}">
      <div class="mock">
        <aside><strong>Codex</strong><span>New chat</span><span>Search</span><span>Projects</span><span>${cssEscapeAttr(result.name)}</span></aside>
        <main>
          <h2>What should we work on?</h2>
          <div class="composer"><span>Type a message</span><div class="row"><span>+</span><span>Full access</span><span>5.5 high</span><span>Up</span></div><div class="row project">Project workspace</div></div>
          <div class="tiles"><div>Connect messages<br><small>Bring in context from recent discussions</small></div><div>Connect email<br><small>Summarize related requests</small></div><div>Connect files<br><small>Review notes and plans</small></div></div>
        </main>
      </div>
      <p class="meta">${cssEscapeAttr(JSON.stringify({
        surface: rec.surface,
        text: rec.text,
        overlay: rec.overlay,
        sidebarOverlay: rec.sidebarOverlay,
        composerOverlay: rec.composerOverlay,
        luma: result.analysis.centerLuma,
        contrast: result.analysis.contrast,
        size: result.prepared.size,
        dimensions: `${result.prepared.targetWidth}x${result.prepared.targetHeight}`,
      }))}</p>
    </section>`;
  }).join("\n");
  const html = `<!doctype html>
<meta charset="utf-8">
<title>Codex background theme tests</title>
<style>
  body{margin:0;padding:28px;background:#151022;color:#f8f4ff;font:14px/1.45 -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif}
  h1{font-size:22px;margin:0 0 20px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(620px,1fr));gap:22px}
  .card{border:1px solid rgb(255 255 255/.16);border-radius:14px;background:rgb(255 255 255/.06);padding:14px}
  .card.error{background:rgb(120 20 35/.22)}
  .mock{height:390px;border-radius:12px;overflow:hidden;display:grid;grid-template-columns:150px 1fr;background:var(--gradient),var(--image) center/cover no-repeat;box-shadow:0 22px 70px rgb(0 0 0/.36)}
  aside{padding:22px 18px;display:flex;flex-direction:column;gap:16px;background:var(--sidebar);color:var(--fg)}
  aside span{color:var(--fg);opacity:.88}
  main{padding:76px 58px;color:var(--fg);background:var(--main);display:flex;flex-direction:column;align-items:center;gap:24px}
  main h2{font-size:26px;font-weight:500;margin:0;text-shadow:0 2px 16px rgb(0 0 0/.35)}
  .composer{width:min(620px,88%);border:1px solid var(--border);border-radius:22px;background:var(--composer);box-shadow:0 16px 34px rgb(0 0 0/.18);overflow:hidden}
  .composer>span{display:block;padding:16px 18px;color:var(--muted)}
  .row{display:flex;align-items:center;gap:16px;border-top:1px solid var(--border);padding:12px 18px;color:var(--fg)}
  .row span:nth-child(2){color:#ff8b4a}
  .row span:nth-child(3){margin-left:auto}
  .project{color:var(--fg);opacity:.86}
  .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;width:min(560px,82%)}
  .tiles div{border:1px solid var(--border);border-radius:12px;padding:18px;background:rgb(20 14 34/.30);color:var(--fg)}
  small{color:var(--muted)}
  .meta{margin:12px 2px 0;color:#d9d1e8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}
</style>
<h1>Codex background theme tests</h1>
<div class="grid">${cards}</div>`;
  const previewPath = path.join(outDir, "index.html");
  fs.writeFileSync(previewPath, html);
  return previewPath;
}

function testImages(imagePaths, args = {}) {
  if (imagePaths.length === 0) {
    throw new Error("No image paths were provided for --test-images");
  }
  const slotSize = getPreferredSlotSize();
  const outDir = path.join(toolDir, "theme-tests", new Date().toISOString().replace(/[:.]/g, "-"));
  fs.mkdirSync(outDir, { recursive: true });
  const results = [];
  for (const imagePath of imagePaths) {
    const abs = path.resolve(imagePath);
    const name = path.basename(abs);
    if (!fs.existsSync(abs)) {
      results.push({ name, source: abs, error: "file not found" });
      continue;
    }
    try {
      const slug = safeSlug(abs);
      const preparedPath = path.join(outDir, `${slug}.png`);
      const prepared = choosePreparedImageSize(abs, preparedPath, slotSize, args);
      if (prepared.error) {
        results.push({ name, source: abs, prepared, error: prepared.error });
        continue;
      }
      const analysis = analyzePng(fs.readFileSync(prepared.output));
      const recommendation = recommendTheme(analysis, args);
      const config = {
        surface: recommendation.surface,
        text: recommendation.text,
        mode: "stable",
        overlay: recommendation.overlay,
        sidebarOverlay: recommendation.sidebarOverlay,
        composerOverlay: recommendation.composerOverlay,
        fit: "cover",
        position: "center",
        targetWidth: prepared.targetWidth,
        targetHeight: prepared.targetHeight,
        sourceImagePath: abs,
        preparedImagePath: prepared.output,
      };
      fs.writeFileSync(path.join(outDir, `${slug}.theme.json`), JSON.stringify(config, null, 2));
      results.push({ name, source: abs, prepared, analysis, recommendation, configPath: path.join(outDir, `${slug}.theme.json`) });
    } catch (error) {
      results.push({ name, source: abs, error: error.message });
    }
  }
  const previewPath = writeThemePreview(results, outDir);
  const reportPath = path.join(outDir, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify({ slotSize, previewPath, results }, null, 2));
  return { slotSize, outDir, reportPath, previewPath, results };
}

function backupInstalledFiles(stamp) {
  const asarBackup = path.join(backupDir, `app.asar.${stamp}.bak`);
  fs.copyFileSync(asarPath, asarBackup);
  const backups = { asarBackup };
  if (plistPath && fs.existsSync(plistPath)) {
    backups.plistBackup = path.join(backupDir, `Info.plist.${stamp}.bak`);
    fs.copyFileSync(plistPath, backups.plistBackup);
  }
  if (appPaths.platform === "win32" && appPaths.exePath && fs.existsSync(appPaths.exePath)) {
    backups.exeBackup = path.join(backupDir, `${path.basename(appPaths.exePath)}.${stamp}.bak`);
    fs.copyFileSync(appPaths.exePath, backups.exeBackup);
  }
  return backups;
}

function ensureBackgroundConfigured(theme, args = {}) {
  if (args.image) return;
  const candidate = theme.preparedImagePath || theme.sourceImagePath || defaultPngPath;
  if (candidate && fs.existsSync(candidate)) return;
  throw new Error("No background image is configured. Run this first with --image <path-to-wallpaper.png>.");
}

function main() {
  const args = parseArgs();
  let theme = resolveThemeOptions(args);
  assertExpandedModeAllowed(theme);
  ensureBackgroundConfigured(theme, args);
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backups = backupInstalledFiles(stamp);

  const asar = fs.readFileSync(asarPath);
  const meta = readAsar(asar);

  if (args.image) {
    const sourceImagePath = path.resolve(args.image);
    if (!fs.existsSync(sourceImagePath)) {
      throw new Error(`Image not found: ${sourceImagePath}`);
    }
    const prepared = theme.mode === "external" || theme.mode === "unpacked"
      ? {
        output: sourceImagePath,
        targetWidth: getImageDimensions(sourceImagePath).width,
        targetHeight: getImageDimensions(sourceImagePath).height,
        mode: theme.mode,
      }
      : theme.mode === "expanded"
        ? prepareExpandedImage(sourceImagePath, expandedPngPath, theme)
        : (() => {
          const preferred = findEntry(meta.header, preferredBgAssetPath);
          const slotSize = preferred && !preferred.files && !preferred.unpacked ? preferred.size : 902530;
          const stablePrepared = choosePreparedImageSize(sourceImagePath, activePngPath, slotSize, theme);
          if (stablePrepared.error) {
            throw new Error(stablePrepared.error);
          }
          return stablePrepared;
        })();
    const analysis = analyzePng(fs.readFileSync(prepared.output));
    const recommendationInput = recommendationInputFor(theme, args);
    const recommendation = recommendTheme(analysis, recommendationInput);
    theme = {
      ...theme,
      ...recommendation,
      sourceImagePath,
      externalImagePath: theme.mode === "external" ? sourceImagePath : theme.externalImagePath,
      preparedImagePath: prepared.output,
      targetWidth: prepared.targetWidth,
      targetHeight: prepared.targetHeight,
    };
    if (!args.noSaveConfig) {
      fs.writeFileSync(themeConfigPath, JSON.stringify(theme, null, 2));
    }
  }

  const html = extractFile(asar, meta, htmlPath);
  let backgroundAsset;
  let headerBytes;

  if (theme.mode === "expanded") {
    const inputPng = fs.readFileSync(theme.preparedImagePath || defaultPngPath);
    backgroundAsset = customBgAssetPath;
    const patchedHtml = buildPatchedHtml(html.bytes, backgroundAsset, theme);
    const rebuilt = rebuildAsarWithReplacements(
      asar,
      meta,
      new Map([[htmlPath, patchedHtml]]),
      [{ path: backgroundAsset, bytes: inputPng }]
    );
    headerBytes = rebuilt.headerBytes;
    fs.writeFileSync(asarPath, rebuilt.asar);
  } else if (theme.mode === "external") {
    backgroundAsset = theme.externalImagePath || theme.sourceImagePath || theme.preparedImagePath || defaultPngPath;
    const patchedHtml = buildPatchedHtml(html.bytes, preferredBgAssetPath, theme);
    if (patchedHtml.length !== html.entry.size) {
      throw new Error(`Replacement size mismatch for ${htmlPath}`);
    }
    const newHash = sha256(patchedHtml);
    updateEntryIntegrity(meta.header, htmlPath, newHash);
    patchedHtml.copy(asar, html.start);
    const headerText = JSON.stringify(meta.header);
    headerBytes = Buffer.from(headerText, "utf8");
    if (headerBytes.length !== meta.headerJsonSize) {
      throw new Error("Header size changed unexpectedly");
    }
    headerBytes.copy(asar, meta.headerStart);
    fs.writeFileSync(asarPath, asar);
  } else if (theme.mode === "unpacked") {
    const inputPng = fs.readFileSync(theme.preparedImagePath || theme.sourceImagePath || defaultPngPath);
    backgroundAsset = preferredBgAssetPath;
    const patchedHtml = buildPatchedHtml(html.bytes, backgroundAsset, theme);
    if (patchedHtml.length !== html.entry.size) {
      throw new Error(`Replacement size mismatch for ${htmlPath}`);
    }
    const unpackedPath = unpackedPathForEntry(backgroundAsset);
    fs.mkdirSync(path.dirname(unpackedPath), { recursive: true });
    fs.copyFileSync(theme.preparedImagePath || theme.sourceImagePath || defaultPngPath, unpackedPath);
    setUnpackedEntry(meta.header, backgroundAsset, inputPng);
    updateEntryIntegrity(meta.header, htmlPath, sha256(patchedHtml));
    patchedHtml.copy(asar, html.start);
    headerBytes = writePaddedHeader(asar, meta);
    fs.writeFileSync(asarPath, asar);
  } else {
    const inputPng = fs.readFileSync(theme.preparedImagePath || defaultPngPath);
    const asset = pickBackgroundAsset(asar, meta, inputPng.length);
    backgroundAsset = asset.path;
    const bg = makePngExactSize(inputPng, asset.file.entry.size);
    const patchedHtml = buildPatchedHtml(html.bytes, asset.path, theme);

    const replacements = [
      { path: asset.path, file: asset.file, bytes: bg },
      { path: htmlPath, file: html, bytes: patchedHtml },
    ];

    for (const replacement of replacements) {
      if (replacement.bytes.length !== replacement.file.entry.size) {
        throw new Error(`Replacement size mismatch for ${replacement.path}`);
      }
      const oldHash = replacement.file.entry.integrity?.hash;
      if (!oldHash) {
        throw new Error(`Missing integrity hash for ${replacement.path}`);
      }
      const newHash = sha256(replacement.bytes);
      updateEntryIntegrity(meta.header, replacement.path, newHash);
      replacement.bytes.copy(asar, replacement.file.start);
    }

    const headerText = JSON.stringify(meta.header);
    headerBytes = Buffer.from(headerText, "utf8");
    if (headerBytes.length !== meta.headerJsonSize) {
      throw new Error("Header size changed unexpectedly");
    }
    headerBytes.copy(asar, meta.headerStart);
    fs.writeFileSync(asarPath, asar);
  }

  const newHeaderHash = sha256(headerBytes);
  const integrityPath = writeInstalledAsarHash(newHeaderHash);

  console.log(JSON.stringify({
    ...backups,
    backgroundAsset,
    html: htmlPath,
    app: {
      platform: appPaths.platform,
      appRoot,
      asarPath,
      integrityPath,
    },
    theme: {
      mode: theme.mode,
      surface: theme.surface,
      text: theme.text,
      preparedImagePath: theme.preparedImagePath,
      targetWidth: theme.targetWidth,
      targetHeight: theme.targetHeight,
    },
    headerHash: newHeaderHash,
  }, null, 2));
}

const args = parseArgs();
if (args.check) {
  const result = validateInstalled();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
} else if (args.analyze || args.analyzeImage) {
  const imagePath = args.image || args.analyzeImage || args._[0];
  if (!imagePath) {
    throw new Error("Use --analyze-image <path> or --image <path>");
  }
  const outPath = path.join(toolDir, "theme-tests", `${safeSlug(imagePath)}-analysis.png`);
  const theme = resolveThemeOptions(args);
  const prepared = prepareImage(path.resolve(imagePath), outPath, theme);
  const analysis = analyzePng(fs.readFileSync(outPath));
  console.log(JSON.stringify({ prepared, analysis, recommendation: recommendTheme(analysis, recommendationInputFor(theme, args)) }, null, 2));
} else if (args.testImages) {
  const result = testImages(args._, resolveThemeOptions(args));
  console.log(JSON.stringify(result, null, 2));
} else {
  main();
}
