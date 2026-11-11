const {chromium}=require('playwright-core');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const b=await chromium.launch(require('./browser.cjs')());
 try {for(const width of [1104,390]){
   const context=await b.newContext({viewport:{width,height:840},recordVideo:{dir:path.join(require('node:os').tmpdir(),'l4sb-demo-video'),size:{width,height:840}}});
   const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4174/');
   await page.waitForSelector('.ss-stage');
   await page.waitForTimeout(12500);
   const dest=path.resolve(`artifacts/lean4-marumie-demo-${width}.mp4`);
   await page.screenshot({path:path.resolve(`artifacts/demo-poster-${width}.png`)});
   const video=page.video();await context.close();
   const file=await video.path();
   const result=spawnSync('ffmpeg',['-y','-i',file,'-vf','fps=30','-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-movflags','+faststart',dest],{encoding:'utf8'});
   if(result.status!==0)throw Error(result.stderr);
   if(errors.length)throw Error(errors.join('\n'));
   console.log(dest);
 }}finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
