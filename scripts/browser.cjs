const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
module.exports = function browserOptions() {
  if (process.env.CHROME_PATH) return {executablePath:process.env.CHROME_PATH,headless:true};
  const cache = path.join(os.homedir(),'Library/Caches/ms-playwright');
  if(fs.existsSync(cache)) {
    const versions=fs.readdirSync(cache).filter(n=>n.startsWith('chromium_headless_shell-')).sort((a,b)=>Number(b.split('-').pop())-Number(a.split('-').pop()));
    for(const version of versions) {
      const file=path.join(cache,version,'chrome-headless-shell-mac-arm64/chrome-headless-shell');
      if(fs.existsSync(file))return {executablePath:file,headless:true};
    }
  }
  return {channel:'chrome',headless:true};
};
