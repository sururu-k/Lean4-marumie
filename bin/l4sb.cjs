#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const args = process.argv.slice(2);
// --version は bash の有無に依存せず返す（導入直後の確認に使える）。
if (args[0] === '--version' || args[0] === '-v' || args[0] === '-V') {
  const pkg = require('../package.json');
  console.log(`l4sb ${pkg.version}`);
  process.exit(0);
}
if (args[0] === '--help' || args[0] === '-h') args[0] = 'help';
// 通常は対象プロジェクトの根から l4sb all と呼ぶ。
if (['all', 'init', 'report', 'clean'].includes(args[0]) &&
    (!args[1] || args[1].startsWith('-'))) args.splice(1, 0, '.');
const script = path.join(__dirname, '../Commands/Scripts/l4sb.sh');
if (!require('node:fs').existsSync(script)) {
  console.error(`l4sb: 実行スクリプトが見つかりません: ${script}`);
  process.exit(1);
}
const result = spawnSync('bash', [script, ...args], { stdio: 'inherit' });
if (result.error) {
  console.error(`l4sb: ${result.error.message}`);
  process.exit(1);
}
if (result.signal) process.kill(process.pid, result.signal);
else process.exit(result.status ?? 1);
