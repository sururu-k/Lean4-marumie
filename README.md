# Lean4まるみえ / Lean4SemanticBench

Lean プロジェクトの宣言・依存関係・公理を解析し、ブラウザで確認するツールです。一度導入すれば、他のプロジェクトから `l4sb all` で実行できます。解析結果は対象プロジェクトの `.l4sb/` に閉じ込め、ビューアは `file://` で開けます。

[![CI](https://github.com/sururu-k/Lean4-marumie/actions/workflows/ci.yml/badge.svg)](https://github.com/sururu-k/Lean4-marumie/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 導入して、対象プロジェクトで実行する

必要なものは Node.js 18 以上、npm、bash、git、elan（lake）です。Lean のバージョンは対象の `lean-toolchain` に合わせます。解析器も同じバージョンでビルドするため、初回は依存の取得とコンパイルに時間がかかります。

このリポジトリのルートで、一度だけインストールします。

```sh
npm install --global .
```

続いて、解析したい Lake プロジェクトのルートで実行します。

```sh
cd /path/to/YourProject
l4sb doctor .          # 環境と対象の準備状態を確認（ビルドはしない）
l4sb all
# モジュールを指定する場合
l4sb all . YourProject.Basic YourProject.Main
```

`doctor` は Node.js、lake、lean、同梱ファイル、対象の `lean-toolchain`・`lakefile`・`lake-manifest.json`、`.l4sb/` の状態を検査し、足りないものには次の一手を表示します。機械可読な結果が必要なら `l4sb doctor . --json` を使ってください。

モジュールを省略すると `lean_lib` 名から推定します。ライブラリ名とモジュール名が異なるプロジェクトでは、明示指定してください。対象が別の場所にある場合は `l4sb all /path/to/YourProject YourModule` でも実行できます。

最後に表示される `.l4sb/Web/index.html` をブラウザで開くと、解析結果を確認できます。サーバは不要です。

## 結果は対象プロジェクトの `.l4sb/` に保存する

```text
YourProject/.l4sb/
├── report.jsonl           宣言の解析結果（1 行 1 宣言）
├── report.meta.json       対象・モジュール・生成日時・再現性の情報
└── Web/index.html         結果を埋め込んだビューア
```

`report.meta.json` には、解析対象の名前・git リビジョン・dirty の有無、toolchain、モジュール、透過引数、生成日時、宣言数、バイト数、レポートの SHA-256 を記録します。絶対パスは記録しません。ビューアはこの来歴がレポート本体と一致するときだけ埋め込み、一致しなければ来歴を付けずに表示します。

`.l4sb/` には解析器の作業用ファイルも入ります。プロジェクトごとに出力するため、別プロジェクトを解析しても以前のビューアは上書きされません。共有するときは `Web/` フォルダ全体を渡してください。

## 必要な処理だけ実行する

```sh
l4sb report . YourModule          # 解析結果を生成
l4sb check .                      # レポートを検査
l4sb web .                        # ビューアを再生成し、パスを出力
l4sb web /path/to/report.jsonl    # 保存済みレポートからも生成可能
l4sb clean                        # 現在のプロジェクトの .l4sb/ を削除
l4sb doctor [.] [--json]          # 環境・対象・出力の診断
l4sb --help
l4sb --version
```

`check` と `web` は Node.js と bash だけで使えます。`report` の標準出力はレポートのパス一行、`web` の標準出力は HTML のパス一行です。進捗は標準エラー出力に流れます。`report` は一時ファイルに書いて検証してから置き換えるので、途中で失敗しても直前の正しいレポートを壊しません。

インストールせずに試す場合は、対象プロジェクトから次のように呼び出せます。

```sh
node /path/to/Lean4-marumie/bin/l4sb.cjs all
```

配布用のアーカイブを作るには、このリポジトリで `npm pack` を実行します。受け取った側は `npm install --global /path/to/lean4-marumie-0.3.0.tgz` で導入できます。更新時は再インストール、削除時は `npm uninstall --global lean4-marumie` を実行してください。

## 実行できないとき

まず `l4sb doctor .` を実行してください。失敗した検査には、次に確認する場所が表示されます。

- `l4sb` が見つからない場合は、`npm prefix --global` で表示される場所の `bin` が PATH に含まれているか確認してください。
- `lake` が見つからない場合は、elan を導入し、`lake --version` が実行できる状態にしてください。
- 解析器のビルドが失敗する場合は、対象の Lean バージョンを確認してください。意味論上の下限は v4.23.0 ですが、すべてのバージョンでのコンパイルを保証するものではありません。
- 対象がモジュール `LeanDeclReport` を提供する場合（このリポジトリ自身など）は、衛星の解析器と名前が衝突します。自己解析には `make -f Makefile.dev self` を使ってください。

解析では対象の `lakefile.lean` を実行し、対象をビルドします。詳しい引数・互換性・制限は [スクリプトの説明](Commands/Scripts/README.md) を参照してください。

## Web 画面と操作デモを開く

[ビューア](Graph/Web/index.html)は CSS と描画ライブラリを同梱しており、ネット接続なしで開けます。宣言の検索、依存先・参照元の切り替え、右パネルでの確認、Markdown レポートの保存ができます。グラフは階層表示が既定で、従来の円錐表示にも切り替えられます。宣言を選ぶと詳細が開き、「中心にする」でその宣言から探索できます。`/` で検索、`f` で集中表示、`[` `]` で閲覧履歴を移動できます。

操作を紹介する[デスクトップ版の操作録画](artifacts/lean4-marumie-demo-1440.mp4)と[スマートフォン版](artifacts/lean4-marumie-demo-390.mp4)を用意しています。サンプルデータを本番ビューアで操作した録画です。画面や主張の差し替えはありません。

デモを再生・編集する場合は、開発用の依存を導入して起動します。

```sh
npm ci
npm run demo
```

CSS を再生成するには `npm run build:web`、オフラインの画面操作を検査するには `npm run test:web` を使います。画面操作の検査には Chrome または Chromium が必要です。実行ファイルは環境変数 `CHROME_PATH` で指定できます。動画を再生成するには `npm run record:demo` を実行してください（ffmpeg が必要）。Vite サーバの起動は不要です。

## 開発

```sh
npm ci
npm test                    # CLI・パーサ・レイアウト・診断のユニットテスト
npm run check               # shell/JS の構文検査
npm run typecheck           # デモの TypeScript 検査
npm run test:web            # 4 幅のオフライン表示・検索・レポート
npm run test:web:states     # 不正入力・空データ・長い名前・キーボード
make -f Makefile.dev build  # 解析器のビルド（Lean が必要）
make -f Makefile.dev self   # 自己解析と検査
```

CI は Node.js 20/22 のユニットテスト、静的検査、型検査、Chrome を使った Web 検査を実行します。

## セキュリティとライセンス

このツールは対象プロジェクトの `lakefile.lean` を実行し、対象をビルドします。信頼できるプロジェクトにだけ使ってください。詳細と脆弱性の報告先は [SECURITY.md](SECURITY.md) を参照してください。

ライセンスは [MIT](LICENSE) です。コントリビューションの手順は [CONTRIBUTING.md](CONTRIBUTING.md) にあります。
