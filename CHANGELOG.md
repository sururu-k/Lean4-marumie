# 変更履歴

## 0.3.0 — 2026-11-24

### 追加

- `l4sb doctor [target] [--json] [--strict]` を追加。Node.js / bash / lake / lean、同梱ファイル、対象の Lake 設定、衛星、レポート、来歴、書き込み権限を診断する。
- `report.meta.json` を schema 2 に拡張。ツールの版と dirty、Node.js / OS、レポートの SHA-256 を記録する。
- CI（Node.js 20/22 のユニットテスト、静的検査、型検査、Chrome による Web 検査）を追加。
- MIT ライセンス、`SECURITY.md`、`CONTRIBUTING.md` を追加。
- `target_info.js` / `verify_manifest.js` のユニットテストを追加。

### 変更

- `report` は一時ファイルへ書き、JSONL を検証してから置き換える。失敗時に直前のレポートを壊さない。
- 環境同一性の検証が、パス依存の実体と同名パッケージの重複まで確認する。
- `lakefile.lean` のコメントを無視し、スコープ付き `require` と `lean-toolchain` の表記揺れを扱う。
- ビューアの集中表示が、解除時に左右パネルの開閉状態を復元する。
- 検索欄の Enter / Esc、一覧行の ↑↓ / Shift+Enter、レポートを閉じた後のフォーカス戻しを追加。
- `localStorage` が使えない環境でも表示を続行する。
- 来歴の埋め込み前に、宣言数・バイト数・SHA-256 を照合する。

### 修正

- レポートを閉じた直後に `/` が効かない問題を修正。
- ダイアログ表示中に背景のショートカットが動く問題を修正。

## 0.2.0

- オフラインビューア、階層表示、Markdown レポート、レスポンシブ表示、操作録画を追加。
