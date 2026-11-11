const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'bin/l4sb.cjs');
function run(args, cwd) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
}
test('installed command works from another directory and preserves errors', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'l4sb cli '));
  try {
    assert.equal(run(['--help'], dir).status, 0);
    assert.match(run(['--version'], dir).stdout, /0\.2\.0/);
    assert.notEqual(run(['unknown'], dir).status, 0);
    const result = run(['all'], dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /lean-toolchain/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('separate offline viewers preserve reports, metadata and tool assets', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'l4sb viewers '));
  const toolAsset = path.join(root, 'Graph/Web/js/default-report.js');
  const before = fs.existsSync(toolAsset) ? fs.readFileSync(toolAsset, 'utf8') : null;
  const sample = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'Graph/Web/js/sample.js'), 'utf8'), sample);
  try {
    for (const name of ['project A', 'project B']) {
      const dest = path.join(dir, name);
      fs.mkdirSync(dest);
      const report = path.join(dest, 'report.jsonl');
      fs.writeFileSync(report, sample.window.LDR.SAMPLE);
      if (name === 'project A') fs.writeFileSync(path.join(dest, 'report.meta.json'), JSON.stringify({
        declCount: sample.window.LDR.SAMPLE.trim().split('\n').length, target: { name }
      }));
      const result = run(['web', report], dir);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout.trim(), path.join(dest, 'Web/index.html'));
      assert.ok(fs.existsSync(path.join(dest, 'Web/js/store.js')));
      const context = { window: {} };
      vm.runInNewContext(fs.readFileSync(path.join(dest, 'Web/js/default-report.js'), 'utf8'), context);
      assert.equal(context.window.LDR.DEFAULT_REPORT, sample.window.LDR.SAMPLE);
      assert.equal(context.window.LDR.DEFAULT_META?.target.name, name === 'project A' ? name : undefined);
    }
    assert.equal(fs.existsSync(toolAsset) ? fs.readFileSync(toolAsset, 'utf8') : null, before);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
