# コントリビューション

変更は小さく保ち、何を・なぜ変えたかを説明してください。生成物
（`Graph/report.jsonl`、`Graph/Web/js/default-report.js`、`Graph/Web/assets/app.css`、
`demo/dist/`）は手で編集せず、生成コマンドで作り直してください。

## 変更前

- 再現する不具合は Issue に、再現手順と期待する動作を書いてください。
- 大きな設計変更は、実装を始める前に Issue で相談してください。
- 脆弱性は [SECURITY.md](SECURITY.md) の手順で非公開に報告してください。

## ローカル検査

```sh
npm ci
npm test                    # CLI・レイアウト・診断のユニットテスト
npm run check               # shell/JS の構文検査
npm run test:web            # 4 幅のオフライン表示・検索・レポート
npm run test:web:states     # 不正入力・空データ・長い名前・キーボード
```

Lean 側を変更した場合は、対象の toolchain で次も実行してください。

```sh
make -f Makefile.dev build
make -f Makefile.dev self
```

解析器は Lean core + Std + ImportGraph だけに依存させてください（Mathlib を
import しない）。UI は CDN を使わず、`file://` で完結させてください。

## Pull Request

1. `main` からブランチを作る。
2. 一つの目的に絞り、必要なテストと文書を同じ変更に含める。
3. 実行した検査を PR に書く。CI が全体を再実行します。
4. 生成物や無関係な整形を含めない。

## リリース

`package.json` と `Commands/Scripts/l4sb.sh` の `L4SB_VERSION` を同じ値に上げ、
`CHANGELOG.md` を更新してタグを打ちます。CI の `CI Gate` が通ることを確認して
ください。
