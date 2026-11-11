#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const args = process.argv.slice(2);
if (args[0] === '--version') args[0] = 'version';
// 通常は対象プロジェクトの根から l4sb all と呼ぶ。
if (['all', 'init', 'report', 'clean'].includes(args[0]) &&
    (!args[1] || args[1].startsWith('-'))) args.splice(1, 0, '.');
const result = spawnSync('bash', [path.join(__dirname, '../Commands/Scripts/l4sb.sh'), ...args], { stdio: 'inherit' });
if (result.error) {
  console.error(`l4sb: ${result.error.message}`);
  process.exit(1);
}
if (result.signal) process.kill(process.pid, result.signal);
else process.exit(result.status ?? 1);
