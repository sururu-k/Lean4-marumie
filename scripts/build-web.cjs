const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'Graph/Web/assets');
fs.mkdirSync(out, {recursive: true});
const cli = require.resolve('@tailwindcss/cli/package.json');
const result = spawnSync(process.execPath, [path.join(path.dirname(cli),'dist/index.mjs'), '-i', 'Graph/Web/styles.css', '-o', 'Graph/Web/assets/app.css', '--minify'], {cwd:root,stdio:'inherit'});
if(result.status !== 0) process.exit(result.status || 1);
fs.copyFileSync(path.join(path.join(path.dirname(require.resolve('p5')), '..'),'lib/p5.min.js'), path.join(out,'p5.min.js'));

fs.copyFileSync(path.join(path.dirname(require.resolve('p5')), '../license.txt'), path.join(out,'p5-license.txt'));
fs.copyFileSync(path.join(path.dirname(require.resolve('tailwindcss/package.json')),'LICENSE'), path.join(out,'tailwind-license.txt'));
