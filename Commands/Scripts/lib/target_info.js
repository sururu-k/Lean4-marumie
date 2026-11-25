/* 対象 Lake プロジェクトの内省。

     node target_info.js <target-dir>

   bash が eval できる形（L4SB_* の代入行）で出力する。`inspect(dir)` は
   同じ結果をオブジェクトで返すので、テストと doctor からも使える。

   検出するもの:
     name             パッケージ名（require に使う。«» は剥がす）
     config           lakefile.toml | lakefile.lean | ""
     toolchain        lean-toolchain の内容
     toolchainTag     その版部分（例 v4.33.0-rc1）。importGraph の公式タグ解決に使う
     libs             lean_lib 名（report の既定モジュール）
     requires         require 名
     hasManifest      lake-manifest.json の有無
     gitDeps          manifest 中の git 依存の数
     hasImportGraph   依存木に importGraph が居るか
     hasMathlib       依存木に mathlib が居るか
     pkgdir           manifest の packagesDir（無ければ .lake/packages）
     packages         manifest のパッケージ要約 [{name,type,rev}]
     warnings         解析を止めないが利用者に伝えたいこと

   Lake の探索順は lakefile.lean 優先、無ければ lakefile.toml（v4.8.0 以降）。
   両方あるプロジェクトで .toml を読むと、Lake が実際に使う設定と食い違う。
   ここでの解釈は「標準的な書き方」だけを対象にした既定値の提供であり、
   計算で組み立てる lakefile はモジュール名の明示指定に委ねる。 */
"use strict";
const fs = require("fs");
const path = require("path");

function stripGuillemets(s) {
  return String(s == null ? "" : s).replace(/[«»]/g, "");
}

function normalizeName(s) {
  return stripGuillemets(s).trim();
}

/* Lean のコメントを落とす。文字列リテラルは残す（require "foo" の名前を読むため）。
   ブロックコメントは入れ子になる（Lean の仕様）。 */
function stripLeanComments(src) {
  let out = "";
  let block = 0;
  let i = 0;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (block > 0) {
      if (c === "/" && n === "-") { block++; i += 2; }
      else if (c === "-" && n === "/") { block--; i += 2; }
      else { if (c === "\n") out += "\n"; i++; }
    } else if (c === "-" && n === "-") {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "/" && n === "-") {
      block++; i += 2;
    } else if (c === '"') {
      out += c; i++;
      while (i < src.length) {
        out += src[i];
        if (src[i] === "\\") {
          i++;
          if (i < src.length) out += src[i];
          i++;
          continue;
        }
        if (src[i] === '"') { i++; break; }
        i++;
      }
    } else {
      out += c; i++;
    }
  }
  return out;
}

/* TOML の行からコメントを落とす。引用符の中の # はコメントではない。 */
function stripTomlComment(line) {
  let quote = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === "\\" && quote === '"') { i++; continue; }
      if (c === quote) quote = "";
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === "#") {
      return line.slice(0, i);
    }
  }
  return line;
}

function tomlValue(raw) {
  const s = String(raw || "").trim();
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
    try { return JSON.parse(s); } catch { return s.slice(1, -1); }
  }
  if (s.length >= 2 && s[0] === "'" && s[s.length - 1] === "'") {
    return s.slice(1, -1);
  }
  return s;
}

function parseLeanFile(src) {
  const code = stripLeanComments(src);
  const one = (re) => {
    const m = code.match(re);
    return m ? normalizeName(m[1] || m[2] || m[3]) : "";
  };
  const name = one(/^[ \t]*(?:@\[[^\]]*\][ \t]*)?package[ \t]+(?:"([^"]+)"|«([^»]+)»|([A-Za-z0-9_][A-Za-z0-9_.\-']*))/m);
  const libRe = /^[ \t]*(?:@\[[^\]]*\][ \t]*)?lean_lib[ \t]+(?:"([^"]+)"|«([^»]+)»|([A-Za-z0-9_][A-Za-z0-9_.\-']*))/gm;
  const reqRe = /^[ \t]*(?:@\[[^\]]*\][ \t]*)?require[ \t]+(?:(?:"([^"]+)"|«([^»]+)»|([A-Za-z0-9_][A-Za-z0-9_.\-']*))[ \t]*\/[ \t]*)?(?:"([^"]+)"|«([^»]+)»|([A-Za-z0-9_][A-Za-z0-9_.\-']*))/gm;
  const libs = [], requires = [];
  for (const m of code.matchAll(libRe)) libs.push(normalizeName(m[1] || m[2] || m[3]));
  for (const m of code.matchAll(reqRe)) requires.push(normalizeName(m[4] || m[5] || m[6]));
  return { name, libs, requires };
}

function parseTomlFile(src) {
  let table = "";
  let name = "";
  const libs = [], requires = [];
  let currentRequire = null;
  for (const raw of src.split("\n")) {
    const line = stripTomlComment(raw).trim();
    if (!line) continue;
    const th = line.match(/^\[\[?[ \t]*([A-Za-z0-9_.-]+)[ \t]*\]\]?$/);
    if (th) {
      table = th[1];
      if (table === "require") { currentRequire = { name: "" }; requires.push(currentRequire); }
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+)[ \t]*=[ \t]*(.+)$/);
    if (!kv) continue;
    const key = kv[1], value = tomlValue(kv[2]);
    if (key === "name") {
      if (!table || table === "package") name = normalizeName(value);
      else if (table === "lean_lib") libs.push(normalizeName(value));
      else if (table === "require") {
        if (!currentRequire) { currentRequire = { name: "" }; requires.push(currentRequire); }
        currentRequire.name = normalizeName(value);
      }
    } else if (table === "require" && currentRequire) {
      currentRequire[key] = value;
    }
  }
  return {
    name,
    libs,
    requires: requires.map((r) => (typeof r === "string" ? r : r.name)).filter(Boolean),
  };
}

function readText(dir, file) {
  const p = path.join(dir, file);
  try {
    return { text: fs.readFileSync(p, "utf8"), path: p };
  } catch (e) {
    if (e.code === "ENOENT" || e.code === "ENOTDIR") return null;
    throw new Error(`${p} を読めません: ${e.message}`);
  }
}

function toolchainInfo(text) {
  const toolchain = String(text || "").trim();
  if (!toolchain) return { toolchain: "", tag: "" };
  // leanprover/lean4:v4.33.0 と v4.33.0 の両方を受ける
  const tail = toolchain.includes(":") ? toolchain.slice(toolchain.lastIndexOf(":") + 1) : toolchain;
  return { toolchain, tag: tail.trim() };
}

function inspect(dir) {
  if (!dir) throw new Error("target directory is required");
  const root = path.resolve(dir);
  let stat;
  try { stat = fs.statSync(root); } catch (e) { throw new Error(`対象ディレクトリがありません: ${root}`); }
  if (!stat.isDirectory()) throw new Error(`対象がディレクトリではありません: ${root}`);

  const warnings = [];
  const leanf = readText(root, "lakefile.lean");
  const toml = leanf ? null : readText(root, "lakefile.toml");
  const config = leanf ? "lakefile.lean" : toml ? "lakefile.toml" : "";
  const parsed = leanf ? parseLeanFile(leanf.text) : toml ? parseTomlFile(toml.text) : { name: "", libs: [], requires: [] };
  if (!config) warnings.push("lakefile.lean / lakefile.toml が見つかりません");

  let name = normalizeName(parsed.name);
  const libs = [...new Set(parsed.libs.map(normalizeName).filter(Boolean))];
  const requires = [...new Set(parsed.requires.map(normalizeName).filter(Boolean))];

  let hasManifest = false, gitDeps = 0, hasImportGraph = false, hasMathlib = false;
  let pkgdir = ".lake/packages";
  const packages = [];
  const manRaw = readText(root, "lake-manifest.json");
  if (manRaw) {
    hasManifest = true;
    let man;
    try { man = JSON.parse(manRaw.text); }
    catch (e) { throw new Error(`lake-manifest.json を JSON として読めません: ${e.message}`); }
    if (typeof man.packagesDir === "string" && man.packagesDir.trim()) pkgdir = man.packagesDir.trim();
    const seen = new Set();
    for (const p of Array.isArray(man.packages) ? man.packages : []) {
      const n = normalizeName(p && p.name);
      if (!n) continue;
      if (seen.has(n)) warnings.push(`lake-manifest.json に同名パッケージが重複しています: ${n}`);
      seen.add(n);
      if (p.type === "git") gitDeps++;
      if (n === "importGraph") hasImportGraph = true;
      if (n === "mathlib") hasMathlib = true;
      packages.push({ name: n, type: String(p.type || ""), rev: p.rev == null ? "" : String(p.rev), dir: p.dir == null ? "" : String(p.dir) });
    }
    if (!name && typeof man.name === "string") name = normalizeName(man.name);
  }
  if (requires.includes("importGraph")) hasImportGraph = true;
  if (requires.includes("mathlib")) hasMathlib = true;
  if (!name) warnings.push("パッケージ名を検出できません（モジュール名を明示してください）");
  if (!libs.length) warnings.push("lean_lib を検出できません（モジュール名を明示してください）");

  const tc = toolchainInfo((readText(root, "lean-toolchain") || {}).text);
  if (!tc.toolchain) warnings.push("lean-toolchain が見つかりません");

  return {
    root,
    name,
    config,
    toolchain: tc.toolchain,
    toolchainTag: tc.tag,
    libs,
    requires,
    hasManifest,
    gitDeps,
    hasImportGraph,
    hasMathlib,
    pkgdir,
    packages,
    warnings,
  };
}

function shellQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

function toShell(info) {
  const out = [];
  const put = (k, v) => out.push(`${k}=${shellQuote(v)}`);
  put("L4SB_NAME", info.name);
  put("L4SB_CONFIG", info.config);
  put("L4SB_TOOLCHAIN", info.toolchain);
  put("L4SB_TOOLCHAIN_TAG", info.toolchainTag);
  put("L4SB_LIBS", info.libs.join(" "));
  put("L4SB_REQUIRES", info.requires.join(" "));
  put("L4SB_HAS_MANIFEST", info.hasManifest ? 1 : 0);
  put("L4SB_GIT_DEPS", info.gitDeps);
  put("L4SB_HAS_IMPORTGRAPH", info.hasImportGraph ? 1 : 0);
  put("L4SB_HAS_MATHLIB", info.hasMathlib ? 1 : 0);
  put("L4SB_PKGDIR", info.pkgdir);
  return out.join("\n");
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: target_info.js <target-dir>");
    process.exit(2);
  }
  try {
    process.stdout.write(toShell(inspect(dir)) + "\n");
  } catch (e) {
    console.error(`target_info: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { inspect, toShell, parseLeanFile, parseTomlFile, toolchainInfo, stripLeanComments };
