const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const b=await chromium.launch(require('./browser.cjs')());
 try {for(const width of [1280,390]){
  const p=await b.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+path.resolve('Graph/Web/index.html'));await p.waitForSelector('[data-flow-node]');
  const before=await p.evaluate(()=>LDR.store.state.rawText);
  await p.locator('#btnData').click();await p.locator('#dataText').fill('not JSON');await p.locator('#dataApply').click();
  assert.equal(await p.locator('#dataError').isVisible(),true);assert.equal(await p.evaluate(()=>LDR.store.state.rawText),before);
  await p.locator('#dataClose').click();
  await p.evaluate(()=>LDR.store.actions.loadText(''));assert.equal(await p.locator('#graphEmpty').isVisible(),true);
  await p.locator('#graphEmptyLoad').click();await p.locator('#dataSample').click();await p.waitForSelector('[data-flow-node]');
  await p.evaluate(()=>LDR.store.actions.navigate('Examples.quadruple_eq'));await p.waitForTimeout(100);
  const rect=await p.locator('[data-flow-node="Examples.quadruple_eq"]').boundingBox();const viewport=await p.locator('#flowViewport').boundingBox();
  assert.ok(rect.y>=viewport.y && rect.y+rect.height<=viewport.y+viewport.height,'dense graph must reveal its center');
  await p.evaluate(()=>{
    const n=LDR.store.state.nodes['Examples.double'];const long='Examples.'+'long_declaration_'.repeat(12);
    LDR.store.actions.loadText(JSON.stringify({...n,name:long,typeDeps:[],valueDeps:[]}));
  });
  assert.match(await p.locator('.flow-node-label').innerText(),/long_declaration/);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await p.locator('#btnReport').click();await p.waitForFunction(()=>document.getElementById('reportText').value.length>0);
  if(width<700){assert.equal(await p.locator('#reportOpts').isVisible(),false);await p.locator('#reportOptionsToggle').click();assert.equal(await p.locator('#reportOpts').isVisible(),true);await p.locator('#reportOptionsToggle').click();}
  await p.locator('#reportDlgClose').click();
  await p.keyboard.press('/');await p.waitForTimeout(50);assert.equal(await p.locator('#search').evaluate(e=>document.activeElement===e),true);
  assert.deepEqual(errors,[]);console.log(`${width}px: invalid input retained data; empty, dense, long name, report settings, keyboard search, reduced motion OK`);
  await p.close();
 }}finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
