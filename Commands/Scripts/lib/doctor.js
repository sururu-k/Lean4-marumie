/* l4sb doctor — 実行環境と対象プロジェクトの準備状態を診断する。

     node doctor.js [target-dir] [--json] [--strict]

   目的は「なぜ動かないか」を利用者に返すこと。ここでは lakefile を実行せず、
   ビルドもしない。読める範囲の事実だけを集め、足りないものには具体的な
   次の一手を添える。終了コードは 0（警告のみ）または 1（エラーあり）。
   --strict を付けると警告も失敗として扱う。 */
"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const targetInfo = require("./target_info.js");
const { verify } = require("./verify_manifest.js");

const ROOT = path.resolve(__dirname, "../../..");
const pkg = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")); }
  catch { return { version: "unknown" }; }
})();

const checks = [];
function add(id, status, label, detail, hint) {
  checks.push({ id, status, label, detail: detail || "", hint: hint || "" });
}

const TIMEOUT = Number(process.env.L4SB_DOCTOR_TIMEOUT_MS || 5000);

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: TIMEOUT });
  const text = `${r.stdout || ""}${r.stderr || ""}`.trim().split("\n").filter(Boolean);
  return { ok: !r.error && r.status === 0, line: text[0] || "", error: r.error ? r.error.message : "" };
}

function versionCheck(id, label, cmd, args) {
  const r = run(cmd, args);
  if (r.ok) add(id, "ok", label, r.line);
  else add(id, "warn", label, r.error || `\`${cmd} ${args.join(" ")}\` が失敗しました`, `\`${cmd}\` を PATH に通してください`);
  return r;
}

function readText(file) {
  try { return fs.readFileSync(file, "utf8"); } catch { return null; }
}

function countLines(text) {
  return text.split("\n").filter((l) => l.trim()).length;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function nodeMajor() {
  return Number(process.versions.node.split(".")[0]);
}

/* ---------- 同梱物 ---------- */
function checkBundledAssets() {
  const required = [
    "Graph/Web/index.html",
    "Graph/Web/index.js",
    "Graph/Web/workspace.js",
    "Graph/Web/workspace.css",
    "Graph/Web/assets/app.css",
    "Graph/Web/assets/p5.min.js",
    "Graph/Web/js/flow.js",
    "Graph/Web/js/store.js",
    "Graph/Web/js/panels.js",
    "Graph/ldr_check.js",
    "Graph/make_default_report.js",
    "Commands/Scripts/l4sb.sh",
  ];
  const missing = required.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  if (missing.length) add("assets", "fail", "同梱ファイル", `見つかりません: ${missing.join(", ")}`, "リポジトリを完全に取得し直すか、npm パッケージを再インストールしてください");
  else add("assets", "ok", "同梱ファイル", `${required.length} 件`);
}

/* ---------- 版の整合 ---------- */
function checkVersions() {
  const sh = readText(path.join(ROOT, "Commands/Scripts/l4sb.sh")) || "";
  const m = sh.match(/^L4SB_VERSION="([^"]+)"/m);
  if (m && m[1] !== pkg.version) {
    add("version", "warn", "版の整合", `package.json ${pkg.version} / l4sb.sh ${m[1]}`, "リリース前に二つを同じ値にしてください");
  } else if (m) {
    add("version", "ok", "版の整合", `v${pkg.version}`);
  }
}

/* ---------- 対象 ---------- */
function checkTarget(dir) {
  let info;
  try {
    info = targetInfo.inspect(dir);
  } catch (e) {
    add("target", "fail", "対象プロジェクト", e.message, "Lake プロジェクトの根（lean-toolchain がある場所）を指定してください");
    return null;
  }
  add("target", "ok", "対象プロジェクト", `${info.name || "(名前不明)"} · ${info.config || "(lakefile なし)"} · ${info.toolchain || "(toolchain 不明)"}`);
  if (!info.toolchain) add("toolchain", "fail", "lean-toolchain", "ありません", "Lake プロジェクトの根を指定してください");
  else add("toolchain", "ok", "lean-toolchain", info.toolchain);
  if (info.libs.length) add("libs", "ok", "既定モジュール", info.libs.join(" "));
  else add("libs", "warn", "既定モジュール", "lean_lib を検出できません", "`l4sb report <target> <Module>` のように明示指定してください");
  if (!info.hasManifest) add("manifest", "warn", "lake-manifest.json", "ありません（依存ゼロの対象なら正常）", "依存がある場合は `lake update` で生成してください");
  else add("manifest", "ok", "lake-manifest.json", `${info.packages.length} パッケージ / git ${info.gitDeps} 件`);
  if (info.libs.includes("LeanDeclReport")) {
    add("self", "warn", "自己解析", "対象がモジュール LeanDeclReport を提供しています", "衛星は使えません。`make -f Makefile.dev self` を使ってください");
  }
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    add("writable", "ok", "書き込み権限", "あり");
  } catch {
    add("writable", "fail", "書き込み権限", "対象に書き込めません", "`<target>/.l4sb/` を作れる権限が必要です");
  }
  const st = typeof fs.statfsSync === "function" ? (() => { try { return fs.statfsSync(dir); } catch { return null; } })() : null;
  if (st) {
    const free = Number(st.bavail || 0) * Number(st.bsize || 0);
    if (free > 0 && free < 512 * 1024 * 1024) add("disk", "warn", "空き容量", `${(free / 1048576).toFixed(0)} MB`, "Lean のビルドには数 GB 必要になることがあります");
    else if (free > 0) add("disk", "ok", "空き容量", `${(free / 1073741824).toFixed(1)} GB`);
  }

  const sat = path.join(dir, ".l4sb");
  if (!fs.existsSync(sat)) {
    add("satellite", "warn", "衛星ワークスペース", "未生成", "`l4sb init <target>` または `l4sb all <target>` で生成されます");
    return info;
  }
  const stamp = readText(path.join(sat, ".l4sb-stamp"));
  if (!stamp) add("satellite", "warn", "衛星ワークスペース", ".l4sb-stamp がありません", "`l4sb init <target> --force` で作り直してください");
  else add("satellite", "ok", "衛星ワークスペース", path.relative(dir, sat));

  if (info.hasManifest && fs.existsSync(path.join(sat, "lake-manifest.json"))) {
    try {
      const result = verify(dir, sat, info.name);
      if (result.ok) add("identity", "ok", "環境同一性", `${result.pathdeps.length} パス依存 / 不一致なし`);
      else add("identity", "fail", "環境同一性", result.errors[0] || result.mismatches[0] && `${result.mismatches[0].name} の rev が不一致`, "`l4sb init <target> --force` で衛星を作り直してください");
      for (const w of result.warnings) add("identity-warn", "warn", "環境同一性の注意", w);
    } catch (e) {
      add("identity", "fail", "環境同一性", e.message, "衛星の lake-manifest.json を確認してください");
    }
  }

  const report = path.join(sat, "report.jsonl");
  if (!fs.existsSync(report)) {
    add("report", "warn", "レポート", "未生成", "`l4sb report <target>` または `l4sb all <target>` を実行してください");
  } else {
    const text = readText(report) || "";
    const n = countLines(text);
    if (!n) add("report", "fail", "レポート", "空です", "モジュール名を確認して再生成してください");
    else add("report", "ok", "レポート", `${n} 宣言`);
    const meta = readJson(report.replace(/\.jsonl$/, ".meta.json"));
    if (!meta) add("meta", "warn", "来歴", "report.meta.json がありません", "`l4sb report` で再生成すると付きます");
    else if (meta.declCount !== n) add("meta", "warn", "来歴", `宣言数が一致しません（来歴 ${meta.declCount} / 実体 ${n}）`, "レポートと来歴を同じ実行で作り直してください");
    else add("meta", "ok", "来歴", `schema ${meta.schemaVersion || 1} · ${meta.generatedAt || "日時なし"}`);
  }

  const web = path.join(sat, "Web", "index.html");
  if (fs.existsSync(web)) add("web", "ok", "ビューア", path.relative(dir, web));
  else add("web", "warn", "ビューア", "未生成", "`l4sb web <target>` で生成できます");
  return info;
}

/* ---------- メイン ---------- */
function main(argv) {
  const json = argv.includes("--json");
  const strict = argv.includes("--strict");
  const target = argv.find((a) => !a.startsWith("-"));
  if (argv[0] === "--help" || argv[0] === "-h") {
    console.log("usage: l4sb doctor [target-dir] [--json] [--strict]");
    return 0;
  }

  add("node", nodeMajor() >= 18 ? "ok" : "fail", "Node.js", process.version, nodeMajor() >= 18 ? "" : "Node.js 18 以上が必要です");
  add("platform", "ok", "実行環境", `${process.platform} ${process.arch}`);
  const bash = versionCheck("bash", "bash", "bash", ["--version"]);
  if (!bash.ok) add("bash-hint", "fail", "bash", "l4sb.sh の実行に必要です", "bash を導入するか、Windows では WSL/Git Bash を使ってください");
  versionCheck("git", "git", "git", ["--version"]);
  const lake = versionCheck("lake", "lake", "lake", ["--version"]);
  if (!lake.ok && target) add("lake-required", "fail", "lake", "対象の解析に必要です", "elan を導入し、`lake --version` が通る状態にしてください");
  versionCheck("lean", "lean", "lean", ["--version"]);
  versionCheck("elan", "elan", "elan", ["--version"]);
  checkBundledAssets();
  checkVersions();
  if (target) checkTarget(path.resolve(target));

  const count = (s) => checks.filter((c) => c.status === s).length;
  const fails = count("fail"), warns = count("warn");
  const ok = fails === 0 && (!strict || warns === 0);
  const summary = { ok: count("ok"), warn: warns, fail: fails };

  if (json) {
    const targetInfoOut = target ? (() => { try { return targetInfo.inspect(path.resolve(target)); } catch { return null; } })() : null;
    console.log(JSON.stringify({
      schemaVersion: 1,
      tool: "l4sb",
      version: pkg.version,
      generatedAt: new Date().toISOString(),
      cwd: process.cwd(),
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      target: targetInfoOut ? { name: targetInfoOut.name, root: path.resolve(target), toolchain: targetInfoOut.toolchain, modules: targetInfoOut.libs } : null,
      summary, ok, checks,
    }, null, 2));
    return ok ? 0 : 1;
  }

  console.log(`l4sb doctor — v${pkg.version}`);
  console.log(`  実行: Node ${process.version} / ${process.platform} ${process.arch}`);
  if (target) console.log(`  対象: ${path.resolve(target)}`);
  console.log("");
  for (const c of checks) {
    const mark = c.status === "ok" ? "✓" : c.status === "warn" ? "!" : "✗";
    console.log(`  ${mark} ${c.label}${c.detail ? ": " + c.detail : ""}`);
    if (c.hint && c.status !== "ok") console.log(`      → ${c.hint}`);
  }
  console.log("");
  console.log(`合計: ${summary.ok} OK / ${summary.warn} 警告 / ${summary.fail} エラー`);
  if (!ok) {
    console.log("");
    console.log("上記の「→」を順に解消してください。");
  }
  return ok ? 0 : 1;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { main, checks };
