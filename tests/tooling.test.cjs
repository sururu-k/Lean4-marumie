const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const targetInfo = require('../Commands/Scripts/lib/target_info.js');
const { verify } = require('../Commands/Scripts/lib/verify_manifest.js');

function tempDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `l4sb ${name} `));
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function run(args, opts = {}) {
  return spawnSync(process.execPath, args, { encoding: 'utf8', ...opts });
}

test('target_info parses TOML, manifest and toolchain without executing the lakefile', () => {
  const dir = tempDir('toml');
  try {
    write(path.join(dir, 'lean-toolchain'), 'leanprover/lean4:v4.33.0-rc1\n');
    write(path.join(dir, 'lakefile.toml'), `
# コメント
name = "demo" # 行末コメント
[[lean_lib]]
name = 'Demo'
[[lean_lib]]
name = "Demo.Extra"
[[require]]
name = "mathlib"
git = "https://github.com/leanprover-community/mathlib4"
rev = "abc123"
[[require]]
name = "importGraph"
rev = "def456"
`);
    write(path.join(dir, 'lake-manifest.json'), JSON.stringify({
      packagesDir: 'vendor/packages',
      packages: [
        { name: 'mathlib', type: 'git', rev: 'abc123' },
        { name: 'importGraph', type: 'git', rev: 'def456' },
        { name: 'local', type: 'path', dir: 'deps/local' },
      ],
    }));
    const info = targetInfo.inspect(dir);
    assert.equal(info.name, 'demo');
    assert.equal(info.config, 'lakefile.toml');
    assert.equal(info.toolchain, 'leanprover/lean4:v4.33.0-rc1');
    assert.equal(info.toolchainTag, 'v4.33.0-rc1');
    assert.deepEqual(info.libs, ['Demo', 'Demo.Extra']);
    assert.deepEqual(info.requires, ['mathlib', 'importGraph']);
    assert.equal(info.hasManifest, true);
    assert.equal(info.gitDeps, 2);
    assert.equal(info.hasImportGraph, true);
    assert.equal(info.hasMathlib, true);
    assert.equal(info.pkgdir, 'vendor/packages');
    assert.equal(info.packages.length, 3);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('target_info ignores Lean comments and understands scoped requires', () => {
  const dir = tempDir('lean');
  try {
    write(path.join(dir, 'lean-toolchain'), 'v4.30.0\n');
    write(path.join(dir, 'lakefile.lean'), `
-- require fake.line
/- require fake.block
   /- nested -/
-/
package «Demo.Proj»
lean_lib Demo
require "scope" / "real.name"
require importGraph
`);
    const parsed = targetInfo.parseLeanFile(fs.readFileSync(path.join(dir, 'lakefile.lean'), 'utf8'));
    assert.equal(parsed.name, 'Demo.Proj');
    assert.deepEqual(parsed.libs, ['Demo']);
    assert.deepEqual(parsed.requires, ['real.name', 'importGraph']);
    const info = targetInfo.inspect(dir);
    assert.equal(info.toolchainTag, 'v4.30.0');
    assert.equal(info.hasImportGraph, true);
    assert.equal(info.hasMathlib, false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('target_info rejects a malformed manifest instead of guessing', () => {
  const dir = tempDir('bad');
  try {
    write(path.join(dir, 'lean-toolchain'), 'v4.33.0\n');
    write(path.join(dir, 'lakefile.toml'), 'name = "x"\n');
    write(path.join(dir, 'lake-manifest.json'), '{not json');
    assert.throws(() => targetInfo.inspect(dir), /lake-manifest\.json/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('verify_manifest checks revisions, target path and path dependencies', () => {
  const dir = tempDir('verify');
  try {
    const target = path.join(dir, 'target');
    const sat = path.join(target, '.l4sb');
    write(path.join(target, 'deps/shared'), '');
    write(path.join(target, 'lake-manifest.json'), JSON.stringify({
      packages: [
        { name: 'mathlib', type: 'git', rev: 'abc' },
        { name: 'shared', type: 'path', dir: 'deps/shared' },
      ],
    }));
    write(path.join(sat, 'lake-manifest.json'), JSON.stringify({
      packages: [
        { name: 'demo', type: 'path', dir: '..' },
        { name: 'shared', type: 'path', dir: '../deps/shared' },
        { name: 'mathlib', type: 'git', rev: 'abc' },
        { name: 'importGraph', type: 'git', rev: 'def' },
      ],
    }));
    const result = verify(target, sat, 'demo');
    assert.equal(result.ok, true, result.errors.join('\n'));
    assert.ok(result.lines.includes('OK mathlib abc'));
    assert.ok(result.lines.includes('EXTRA importGraph def'));
    assert.ok(result.lines.includes('PATHDEP demo'));
    assert.ok(!result.lines.some((l) => l.includes(dir)), 'absolute paths must not leak into output');

    write(path.join(sat, 'lake-manifest.json'), JSON.stringify({
      packages: [{ name: 'mathlib', type: 'git', rev: 'zzz' }],
    }));
    const mismatch = verify(target, sat, 'demo');
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.mismatches[0].name, 'mathlib');

    write(path.join(sat, 'lake-manifest.json'), JSON.stringify({
      packages: [
        { name: 'shared', type: 'path', dir: '../elsewhere' },
        { name: 'mathlib', type: 'git', rev: 'abc' },
      ],
    }));
    write(path.join(target, 'elsewhere'), '');
    const wrongPath = verify(target, sat, 'demo');
    assert.equal(wrongPath.ok, false);
    assert.match(wrongPath.errors.join('\n'), /パス依存 shared/);

    write(path.join(target, 'lake-manifest.json'), JSON.stringify({
      packages: [
        { name: 'mathlib', type: 'git', rev: 'abc' },
        { name: 'mathlib', type: 'git', rev: 'def' },
      ],
    }));
    const duplicate = verify(target, sat, 'demo');
    assert.equal(duplicate.ok, false);
    assert.match(duplicate.errors.join('\n'), /重複/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('doctor reports a healthy target as JSON and fails strict mode on warnings', () => {
  const dir = tempDir('doctor');
  try {
    const target = path.join(dir, 'project');
    const bin = path.join(dir, 'bin');
    write(path.join(target, 'lean-toolchain'), 'leanprover/lean4:v4.33.0\n');
    write(path.join(target, 'lakefile.toml'), 'name = "demo"\n[[lean_lib]]\nname = "Demo"\n');
    write(path.join(target, 'lake-manifest.json'), JSON.stringify({ packages: [] }));
    for (const [name, text] of Object.entries({
      bash: 'GNU bash, version 5.2.0',
      git: 'git version 2.45.0',
      lake: 'Lake version 5.0.0 (Lean version 4.33.0)',
      lean: 'Lean (version 4.33.0, arm64-apple-darwin)',
      elan: 'elan 4.2.4',
    })) {
      const file = path.join(bin, name);
      write(file, `#!/bin/sh\necho '${text}'\n`);
      fs.chmodSync(file, 0o755);
    }
    const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, L4SB_DOCTOR_TIMEOUT_MS: '2000' };
    const script = path.join(root, 'Commands/Scripts/lib/doctor.js');
    const result = run([script, target, '--json'], { env });
    assert.equal(result.status, 0, result.stderr);
    const data = JSON.parse(result.stdout);
    assert.equal(data.schemaVersion, 1);
    assert.equal(data.target.name, 'demo');
    assert.deepEqual(data.target.modules, ['Demo']);
    assert.equal(data.summary.fail, 0);
    assert.ok(data.checks.some((c) => c.id === 'satellite' && c.status === 'warn'));

    const strict = run([script, target, '--json', '--strict'], { env });
    assert.equal(strict.status, 1, 'strict mode must reject warnings');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('doctor fails clearly for a directory that is not a Lake project', () => {
  const dir = tempDir('doctor bad');
  try {
    const result = run([path.join(root, 'Commands/Scripts/lib/doctor.js'), dir, '--json'], {
      env: { ...process.env, L4SB_DOCTOR_TIMEOUT_MS: '200' },
    });
    assert.equal(result.status, 1, result.stderr);
    const data = JSON.parse(result.stdout);
    assert.equal(data.ok, false);
    assert.ok(data.checks.some((c) => c.id === 'toolchain' && c.status === 'fail'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('tool version is declared once consistently', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const sh = fs.readFileSync(path.join(root, 'Commands/Scripts/l4sb.sh'), 'utf8');
  const match = sh.match(/^L4SB_VERSION="([^"]+)"/m);
  assert.equal(match[1], pkg.version);
  assert.equal(pkg.license, 'MIT');
  assert.ok(fs.existsSync(path.join(root, 'LICENSE')));
  const cli = run([path.join(root, 'bin/l4sb.cjs'), '--version']);
  assert.equal(cli.status, 0);
  assert.equal(cli.stdout.trim(), `l4sb ${pkg.version}`);
});

test('make_default_report embeds provenance only when it matches the report', () => {
  const dir = tempDir('embed');
  try {
    const report = path.join(dir, 'report.jsonl');
    const meta = path.join(dir, 'report.meta.json');
    const out = path.join(dir, 'default-report.js');
    fs.writeFileSync(report, '{"name":"A"}\n{"name":"B"}\n');
    fs.writeFileSync(meta, JSON.stringify({ schemaVersion: 2, declCount: 2, target: { name: 'demo' } }));
    const result = run([path.join(root, 'Graph/make_default_report.js'), report, out]);
    assert.equal(result.status, 0, result.stderr);
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync(out, 'utf8'), context);
    assert.equal(context.window.LDR.DEFAULT_META.schemaVersion, 2);
    assert.equal(context.window.LDR.DEFAULT_META.target.name, 'demo');

    // ハッシュが食い違う来歴は「別のレポートの来歴」なので埋め込まない
    fs.writeFileSync(meta, JSON.stringify({ schemaVersion: 2, declCount: 2, sha256: 'deadbeef' }));
    const stale = run([path.join(root, 'Graph/make_default_report.js'), report, out]);
    assert.equal(stale.status, 0, stale.stderr);
    const staleContext = { window: {} };
    vm.runInNewContext(fs.readFileSync(out, 'utf8'), staleContext);
    assert.equal(staleContext.window.LDR.DEFAULT_META, undefined);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
