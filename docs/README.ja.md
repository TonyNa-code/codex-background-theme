# Codex Background Theme 日本語ガイド

Codex Desktop にローカルの壁紙とガラス風の UI を追加するための小さな
ツールです。

真っ白、または真っ黒な Codex の画面を、自分の PNG 画像に差し替えたい
ときに使えます。サイドバー、入力欄、設定画面、ポップオーバー、ホーム画面
のカードが読みにくくなりすぎないよう、主要な UI トークンも一緒に調整します。

このリポジトリには壁紙画像は含まれていません。利用する権利のある画像だけ
を指定してください。

## こんな人向け

- Codex Desktop に好きな壁紙を入れたい。
- 透明感のある UI にしたいが、文字の読みやすさも残したい。
- 画質重視の方法と、より保守的な方法を選びたい。
- Codex の更新後にテーマを戻す手間を減らしたい。
- ローカルのアプリファイルを変更することを理解して使える。

## 現在の状態

- macOS: `unpacked` モードと大きめの PNG 壁紙でローカル検証済み。
- Windows: パス検出と ASAR integrity リソース処理は入っていますが、実機の
  Windows 版 Codex での更新テストはまだ不足しています。現時点では実験的
  サポートです。

このプロジェクトは非公式であり、OpenAI とは関係ありません。

## macOS クイックスタート

```bash
git clone https://github.com/TonyNa-code/codex-background-theme.git
cd codex-background-theme
npm install
zsh scripts/install-macos.zsh --image "/path/to/wallpaper.png"
```

実行後、`Cmd+Q` で Codex を完全に終了してから開き直してください。

インストーラーはパッチャーを次の場所へコピーします。

```text
~/.codex/codex-background-theme
```

また、Codex の更新後にテーマを再適用するための LaunchAgent も登録します。

## Windows クイックスタート

Windows 対応はまだ実験的です。まずは手動で実行し、うまくいかなかった場合
に Codex を再インストールできる状態で試してください。

```powershell
git clone https://github.com/TonyNa-code/codex-background-theme.git
cd codex-background-theme
npm install
node .\src\patch-codex-background.js --mode unpacked --image "C:\Path\To\wallpaper.png"
node .\src\patch-codex-background.js --check
```

Codex が標準以外の場所にある場合は、アプリのディレクトリ、exe、
resources ディレクトリ、または `app.asar` を指定できます。

```powershell
node .\src\patch-codex-background.js --app-root "C:\Path\To\Codex" --mode unpacked --image "C:\Path\To\wallpaper.png"
```

## よく使うコマンド

```bash
node src/patch-codex-background.js --help
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --mode unpacked
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --surface light --text dark
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --surface glass --text light
node src/patch-codex-background.js --analyze-image "/path/to/wallpaper.png"
node src/patch-codex-background.js --check
```

## 見た目の選び方

- 明るい画像、白っぽい画像: `--surface light --text dark` から試す。
- 暗い画像、夜景、紫や青の多い画像: `--surface glass --text light` から試す。
- 迷う場合: `--surface auto` で画像の明るさから自動選択する。
- 4K など大きい PNG: `--mode unpacked` を優先する。
- できるだけ保守的に試したい場合: `--mode stable` も使えます。ただし既存の
  画像スロットに収める必要があるため、画質や細部は `unpacked` より落ちること
  があります。

詳しくは [THEMING.md](THEMING.md) を参照してください。

## 2 つのパッチ方針

`unpacked` は、大きい PNG や 4K 壁紙、細部の多いイラストに向いた方法です。
画像を ASAR の外側にある unpacked リソースとして置くため、既存の小さな画像
スロットに無理に詰め込む必要がありません。画質を優先したい場合はこちらから
試すのがおすすめです。

`stable` は、より保守的な方法です。Codex に元からある PNG リソーススロットを
使うので、変更内容を把握しやすく、パッチの形も比較的コントロールしやすいです。
ただしスロットのサイズに制限されるため、大きい画像は縮小や圧縮が強くなり、
仕上がりが少し柔らかく見えることがあります。

```bash
# 画質重視。大きい画像向け
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --mode unpacked

# 保守的。画質はやや落ちることがある
node src/patch-codex-background.js --image "/path/to/wallpaper.png" --mode stable
```

詳しい比較は [MODES.md](MODES.md) にあります。

## 注意

- このツールはローカルの Codex Desktop アプリファイルを変更します。
- 変更前にバックアップを書きますが、完全に戻したい場合は Codex の再インストール
  または更新が一番確実です。
- Codex の更新でテーマが消えた場合は、reapply スクリプトを実行してください。
- 権限のない業務端末では使わないでください。
- issue には個人情報、ローカルパス、トークン、非公開スクリーンショット、
  配布権のない壁紙を載せないでください。
