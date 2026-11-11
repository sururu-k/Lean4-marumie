# Lean4まるみえ / Lean4SemanticBench

Leanプロジェクトの宣言・依存関係・公理を解析し、ブラウザで確認するツールです。一度導入すれば、他のプロジェクトから `l4sb all` で実行できます。

## 導入して、対象プロジェクトで実行する

必要なものは Node.js 18以上、npm、bash、git、elan（lake）です。Leanのバージョンは対象の `lean-toolchain` に合わせます。解析器も同じバージョンでビルドするため、初回は依存の取得とコンパイルに時間がかかります。

このリポジトリのルートで、一度だけインストールします。

```sh
npm install --global .
```

続いて、解析したいLakeプロジェクトのルートで実行します。

```sh
cd /path/to/YourProject
l4sb all
# モジュールを指定する場合
l4sb all . YourProject.Basic YourProject.Main
```

モジュールを省略すると `lean_lib` 名から推定します。ライブラリ名とモジュール名が異なるプロジェクトでは、明示指定してください。対象が別の場所にある場合は `l4sb all /path/to/YourProject YourModule` でも実行できます。

最後に表示される `.l4sb/Web/index.html` をブラウザで開くと、解析結果を確認できます。サーバは不要です。

## 結果は対象プロジェクトの `.l4sb/` に保存する

```text
YourProject/.l4sb/
├── report.jsonl           宣言の解析結果
├── report.meta.json       対象・モジュール・生成日時
└── Web/index.html         結果を埋め込んだビューア
```

`.l4sb/` には解析器の作業用ファイルも入ります。プロジェクトごとに出力するため、別プロジェクトを解析しても以前のビューアは上書きされません。共有するときは `Web/` フォルダ全体を渡してください。

## 必要な処理だけ実行する

```sh
l4sb report . YourModule          # 解析結果を生成
l4sb check .                     # レポートを検査
l4sb web .                       # ビューアを再生成し、パスを出力
l4sb web /path/to/report.jsonl    # 保存済みレポートからも生成可能
l4sb clean                       # 現在のプロジェクトの .l4sb/ を削除
l4sb --help
l4sb --version
```

`check` と `web` はNode.jsとbashだけで使えます。`report` の標準出力はレポートのパス一行、`web` の標準出力はHTMLのパス一行です。進捗は標準エラー出力に流れます。

インストールせずに試す場合は、対象プロジェクトから次のように呼び出せます。

```sh
node /path/to/Lean4-marumie/bin/l4sb.cjs all
```

配布用のアーカイブを作るには、このリポジトリで `npm pack` を実行します。受け取った側は `npm install --global /path/to/lean4-marumie-0.2.0.tgz` で導入できます。更新時は再インストール、削除時は `npm uninstall --global lean4-marumie` を実行してください。

## 実行できないとき

- `l4sb` が見つからない場合は、`npm prefix --global` で表示される場所の `bin` がPATHに含まれているか確認してください。
- `lake` が見つからない場合は、elanを導入し、`lake --version` が実行できる状態にしてください。
- 解析器のビルドが失敗する場合は、対象のLeanバージョンを確認してください。意味論上の下限はv4.23.0ですが、すべてのバージョンでのコンパイルを保証するものではありません。

解析では対象の `lakefile.lean` を実行し、対象をビルドします。詳しい引数・互換性・制限は [スクリプトの説明](Commands/Scripts/README.md) を参照してください。

開発時の検査は `npm test` と `npm run check`、解析器のビルドは `make -f Makefile.dev build` です。
