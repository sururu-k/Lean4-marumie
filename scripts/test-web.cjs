const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch(require('./browser.cjs')());
 try {for(const width of [1440,768,390,320]){
  const page=await browser.newPage({viewport:{width,height:960}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(/^https?:/,r=>r.abort());
  await page.goto('file://'+path.resolve('Graph/Web/index.html'));
  await page.waitForSelector('canvas');
  await page.waitForFunction(()=>window.LDR?.store?.state?.center || document.getElementById('listCount').textContent.includes('件'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow ${width}`);
  await page.locator('#btnData').click();await page.locator('#dataSample').click();
  await page.locator('#btnReport').click();
  await page.waitForFunction(()=>document.getElementById('reportText').value.length>0);
  await page.locator('#reportDlgClose').click();
  await page.locator('#themeBtn').click();assert.equal(await page.locator('html').evaluate(e=>e.classList.contains('dark')),true);
  await page.screenshot({path:`artifacts/web-dark-${width}.png`});
  await page.locator('#themeBtn').click();
  if (!(await page.locator('#search').isVisible())) await page.locator('#btnSide').click();
  await page.locator('#search').fill('pair_inj');
  await page.waitForTimeout(100);
  assert.match(await page.locator('#declList').innerText(),/pair_inj/);
  assert.deepEqual(errors,[],`page errors ${width}`);
  await page.screenshot({path:`artifacts/web-${width}.png`});
  await page.close();console.log(`offline, search, report, theme: ${width}px OK`);
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
