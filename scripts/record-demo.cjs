/* Record the production viewer. No substituted graph, claims, or UI components. */
const {chromium}=require('playwright-core');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch(require('./browser.cjs')());
 try {for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:960},recordVideo:{dir:path.join(require('node:os').tmpdir(),'l4sb-live-video'),size:{width,height:960}}});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(/^https?:/,r=>r.abort());
   await page.goto('file://'+path.resolve('Graph/Web/index.html'));
   await page.waitForSelector('[data-flow-node]');
   // Stageshow arrow-style cursor, only an overlay on the real recorded input.
   await page.evaluate(()=>{
     const cursor=document.createElement('div');cursor.id='recordingCursor';cursor.setAttribute('aria-hidden','true');
     cursor.style.cssText='position:fixed;left:0;top:0;z-index:9999;pointer-events:none;width:22px;height:22px;transform:translate(-40px,-40px)';
     cursor.innerHTML='<svg width="22" height="22" viewBox="0 0 22 22"><path d="M4 3 18.5 9.6 11.8 11.8 9.6 18.5Z" fill="#292524" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>';
     document.body.append(cursor);document.addEventListener('mousemove',e=>{cursor.style.transform=`translate(${e.clientX-4}px,${e.clientY-3}px)`;});
   });
   const wait=ms=>page.waitForTimeout(ms);
   async function click(locator){await locator.scrollIntoViewIfNeeded();const r=await locator.boundingBox();assert.ok(r);await page.mouse.move(r.x+r.width/2,r.y+r.height/2,{steps:20});await wait(200);await page.mouse.click(r.x+r.width/2,r.y+r.height/2);}
   await wait(1300);
   if(width<700)await click(page.locator('#btnSide'));
   const search=page.locator('#search');await click(search);await search.pressSequentially('meet_comm',{delay:100});await wait(650);
   const theorem=page.locator('#declList [data-sel="Examples.meet_comm"]');await theorem.dblclick({delay:100});
   if(width<700&&await search.isVisible())await click(page.locator('#btnSide'));
   await page.waitForFunction(()=>LDR.store.derived.center==='Examples.meet_comm');
   await click(page.locator('#btnFit'));await wait(1700);
   const dependency=page.locator('[data-flow-node="Examples.meet"]');
   assert.equal(await dependency.count(),1,'real dependency is visible');await click(dependency);
   await page.waitForFunction(()=>LDR.store.state.selected==='Examples.meet');await wait(1600);
   if(width<700&&await page.locator('#sideR').isVisible())await click(page.locator('#btnSideR'));
   await click(page.locator('#btnReport'));
   await page.waitForFunction(()=>document.getElementById('reportText').value.includes('meet_comm'));
   await wait(2200);
   await page.screenshot({path:path.resolve(`artifacts/demo-poster-${width}.png`)});
   const video=page.video();await context.close();const source=await video.path();
   const dest=path.resolve(`artifacts/lean4-marumie-demo-${width}.mp4`);
   const result=spawnSync('ffmpeg',['-y','-i',source,'-vf','fps=30','-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-movflags','+faststart',dest],{encoding:'utf8'});
   if(result.status!==0)throw Error(result.stderr);assert.deepEqual(errors,[]);console.log(dest);
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
