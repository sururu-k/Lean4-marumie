/* 環境同一性の事後検証。

     node verify_manifest.js <target-dir> <satellite-dir> [target-package-name]

   不変条件:
     1. 衛星と対象の両 manifest に現れる同名の git パッケージは、rev が完全一致する。
     2. パス依存は、衛星から解決した実体が対象側の同じ名前のパス依存（または対象自身）と
        同じディレクトリを指す。
     3. 同名パッケージの重複が無い。

   ここが食い違うと「対象が検査された実体」と「解析器が読む実体」が別物になり、
   解析結果が静かに嘘になる。検出したら必ず停止する。

   出力(1 行 1 判定。呼び出し側の bash が読む):
     OK <name> <rev>                       一致
     MISMATCH <name> <targetRev> <satRev>  不一致(終了コード 1)
     EXTRA <name> <rev>                    衛星のみに居る依存(importGraph 等)。情報のみ
     PATHDEP <name> <resolved-path>        対象自身・パス依存の確認
     ERROR <message>                       パス不一致・重複など(終了コード 1)

   対象に manifest が無い(依存ゼロの)場合、比較対象が無いので
   衛星側の git 依存は全て EXTRA になり、検証は自明に通る。 */
"use strict";
const fs = require("fs");
const path = require("path");

const strip = (s) => String(s == null ? "" : s).replace(/[«»]/g, "").trim();

function loadManifest(dir, required) {
  const file = path.join(dir, "lake-manifest.json");
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    if (required) throw new Error(`${file} を読めません: ${e.message}`);
    return { packages: [] };
  }
}

function realOrResolve(p) {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
}

function packageMap(man, label, errors) {
  const map = new Map();
  for (const p of Array.isArray(man.packages) ? man.packages : []) {
    const n = strip(p && p.name);
    if (!n) continue;
    if (map.has(n)) errors.push(`${label} に同名パッケージが重複しています: ${n}`);
    map.set(n, p);
  }
  return map;
}

function verify(targetDir, satDir, targetName) {
  const target = loadManifest(targetDir, false);
  const sat = loadManifest(satDir, true);
  const errors = [];
  const warnings = [];
  const lines = [];
  const mismatches = [];
  const extras = [];
  const pathdeps = [];

  const targetMap = packageMap(target, "対象 manifest", errors);
  const satMap = packageMap(sat, "衛星 manifest", errors);
  const targetRev = new Map();
  for (const [n, p] of targetMap) if (p.type === "git" && p.rev != null) targetRev.set(n, p.rev);

  for (const [n, p] of satMap) {
    if (p.type === "path") {
      let resolved = "";
      if (p.dir != null && String(p.dir).trim()) {
        resolved = realOrResolve(path.resolve(satDir, String(p.dir)));
      }
      pathdeps.push({ name: n, resolved });
      lines.push(`PATHDEP ${n}`);
      const tp = targetMap.get(n);
      if (tp && tp.type === "path" && tp.dir != null && String(tp.dir).trim()) {
        const tr = realOrResolve(path.resolve(targetDir, String(tp.dir)));
        if (resolved && tr !== resolved) {
          errors.push(`パス依存 ${n} の実体が食い違います（対象 ${tr} / 衛星 ${resolved}）`);
        }
      }
      if (targetName && n === strip(targetName) && resolved) {
        const root = realOrResolve(targetDir);
        if (resolved !== root) {
          errors.push(`衛星の対象パス依存 ${n} が対象ディレクトリを指していません（対象 ${root} / 衛星 ${resolved}）`);
        }
      }
      continue;
    }
    if (p.type !== "git") continue;
    if (p.rev == null || p.rev === "") {
      warnings.push(`git 依存 ${n} に rev がありません`);
    }
    if (targetRev.has(n)) {
      if (targetRev.get(n) === p.rev) lines.push(`OK ${n} ${p.rev}`);
      else {
        lines.push(`MISMATCH ${n} ${targetRev.get(n)} ${p.rev}`);
        mismatches.push({ name: n, target: targetRev.get(n), satellite: p.rev });
      }
    } else {
      lines.push(`EXTRA ${n} ${p.rev == null ? "" : p.rev}`);
      extras.push({ name: n, rev: p.rev == null ? "" : p.rev });
    }
  }
  for (const e of errors) lines.push(`ERROR ${e}`);
  return {
    ok: errors.length === 0 && mismatches.length === 0,
    lines, errors, warnings, mismatches, extras, pathdeps,
    targetName: strip(targetName),
  };
}

if (require.main === module) {
  const [targetDir, satDir, targetName] = process.argv.slice(2);
  if (!targetDir || !satDir) {
    console.error("usage: verify_manifest.js <target-dir> <satellite-dir> [target-package-name]");
    process.exit(2);
  }
  try {
    const result = verify(targetDir, satDir, targetName);
    for (const line of result.lines) console.log(line);
    for (const w of result.warnings) console.error(`verify_manifest: 警告: ${w}`);
    process.exit(result.ok ? 0 : 1);
  } catch (e) {
    console.error(`verify_manifest: ${e.message}`);
    process.exit(2);
  }
}

module.exports = { verify, loadManifest };
