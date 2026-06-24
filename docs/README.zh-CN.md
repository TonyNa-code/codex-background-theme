# Codex Background Theme 中文说明

这是一个给 Codex Desktop 加本地壁纸和玻璃质感界面的工具。

如果你觉得 Codex 默认的纯白或纯黑背景太单调，可以用它把自己手里的
PNG 图片设成 Codex 背景，同时让侧边栏、输入框、设置页、弹窗和首页卡片
保持可读。

这个仓库不包含任何壁纸素材。请只使用你有权使用的图片。

## 适合谁用

- 想给 Codex Desktop 换壁纸的人。
- 想要透明或玻璃质感界面，但又不想牺牲文字可读性的人。
- 想在高画质和更保守的补丁方式之间自己选择的人。
- 想在 Codex 更新后自动补回主题的人。
- 愿意接受“修改本机应用文件”这一前提的人。

## 当前状态

- macOS：已经在本机用 `unpacked` 模式和大 PNG 图片测试过。
- Windows：已有路径识别和 ASAR integrity 资源处理逻辑，但还没有在真实
  Windows Codex 安装里完整跑过，所以仍然标记为实验性。

这是非官方项目，和 OpenAI 没有关联。

## macOS 快速开始

```bash
git clone https://github.com/TonyNa-code/codex-background-theme.git
cd codex-background-theme
npm install
zsh scripts/install-macos.zsh --image "/path/to/wallpaper.png"
```

执行后请用 `Cmd+Q` 完全退出 Codex，再重新打开。

安装脚本会把补丁工具复制到：

```text
~/.codex/codex-background-theme
```

同时会安装一个 LaunchAgent，用来在 Codex 更新后尝试自动补回主题。

如果 Codex 已经抢在补丁完成前启动，当前窗口可能还是旧背景，需要重启 Codex 才会
读取新文件。默认情况下脚本会发系统通知提醒你。如果你想让它自动完成这次重启，
可以安装时加上：

```bash
zsh scripts/install-macos.zsh --image "/path/to/wallpaper.png" --auto-restart
```

这个选项适合个人电脑；如果你担心当前窗口里有没发出的输入，就不要开启它。

更新后自动补丁和重启行为的细节见 [REAPPLY.md](REAPPLY.md)。

## Windows 快速开始

Windows 目前仍是实验支持。建议先手动运行，并确保你知道如何重新安装
Codex：

```powershell
git clone https://github.com/TonyNa-code/codex-background-theme.git
cd codex-background-theme
npm install
node .\src\patch-codex-background.js --mode unpacked --image "C:\Path\To\wallpaper.png"
node .\src\patch-codex-background.js --check
```

如果 Codex 安装在非默认位置，可以传入应用目录、exe、resources 目录或
`app.asar`：

```powershell
node .\src\patch-codex-background.js --app-root "C:\Path\To\Codex" --mode unpacked --image "C:\Path\To\wallpaper.png"
```

## 常用命令

```bash
node src/patch-codex-background.js --help
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --mode unpacked
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --surface light --text dark
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --surface glass --text light
node src/patch-codex-background.js --analyze-image "/path/to/wallpaper.png"
node src/patch-codex-background.js --check
```

## 怎么选效果

- 明亮、浅色、白底多的图：先试 `--surface light --text dark`。
- 暗色、夜景、紫蓝色多的图：先试 `--surface glass --text light`。
- 不确定：用 `--surface auto`，让脚本根据图片亮度给一个起点。
- 大图或 4K PNG：优先用 `--mode unpacked`。
- 想要更保守、更可控的补丁方式：可以试 `--mode stable`，但图片会被限制在
  Codex 现有资源槽里，画质和细节通常不如 `unpacked`。

更细的说明见 [THEMING.md](THEMING.md)。

## 两种补丁路线

`unpacked` 是目前更推荐的路线，适合大 PNG、4K 图、细节多的壁纸。它会把图片
放在 ASAR 外部的 unpacked 资源位置，因此不需要把大图硬塞进原本的小图片槽里，
画质通常更好。

`stable` 是更保守的路线。它复用 Codex 里已有的 PNG 资源槽，修改范围更容易
理解，也更可控。但这个槽本身大小有限，所以大图需要被压缩或缩放，最后效果可能
会更软一些，细节也可能少一点。

```bash
# 画质优先，适合大图
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --mode unpacked

# 保守可控，但画质可能弱一点
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --mode stable
```

英文详细对比见 [MODES.md](MODES.md)。

## 注意事项

- 这个工具会修改本机 Codex Desktop 的应用文件。
- 修改前会写备份，但最稳妥的恢复方式仍然是重新安装或更新 Codex。
- Codex 更新可能会覆盖补丁，主题消失后重新执行 reapply 即可。
- 不要在没有权限的工作电脑上使用。
- 提 issue 时不要上传私有截图、带路径的日志、token、账号信息，或没有
  版权的壁纸。
