const {chromium}=require('/root/node_modules/playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium-1228/chrome-linux/chrome',args:['--no-sandbox']});
 const page=await browser.newPage({hasTouch:true});const results=[];
 await page.route('**/widelands.js',r=>r.fulfill({contentType:'application/javascript',body:''}));
 await page.goto('http://127.0.0.1:5191/');await page.evaluate(()=>document.getElementById('loading').style.display='none');
 for(const [width,height] of [[896,414],[960,432],[1280,549],[1032,792],[549,1280]]){
  await page.setViewportSize({width,height});
  for(const open of [false,true]){
   await page.evaluate(open=>setTools(open),open);await page.waitForTimeout(60);
   const result=await page.evaluate(()=>{
    const c=canvas.getBoundingClientRect();
    const buttons=[...document.querySelectorAll('#controls button,#toolbox button')].filter(b=>b.getClientRects().length);
    const overlap=buttons.filter(b=>{const r=b.getBoundingClientRect();return Math.min(r.right,c.right)>Math.max(r.left,c.left)&&Math.min(r.bottom,c.bottom)>Math.max(r.top,c.top)});
    const small=buttons.filter(b=>{const r=b.getBoundingClientRect();return r.width<43.9||r.height<43.9});
    // The bottom band includes the game's dialog footer and OK/Back actions.
    const footerClear=[.1,.3,.5,.7,.9].every(x=>document.elementFromPoint(c.left+x*c.width,c.top+.88*c.height)===canvas);
    return {canvas:[c.x,c.y,c.width,c.height],overlap:overlap.map(b=>b.id),small:small.map(b=>b.id),footerClear};
   });
   if(result.overlap.length||result.small.length||!result.footerClear)throw Error(JSON.stringify({width,height,open,...result}));
   results.push({width,height,open,...result});
  }
 }
 await page.evaluate(()=>{window.__keys=[];for(const type of ['keydown','keyup'])window.addEventListener(type,e=>window.__keys.push([type,e.code]));});
 await page.locator('[data-key="Enter"]').tap();
 const keys=await page.evaluate(()=>window.__keys);
 if(JSON.stringify(keys)!==JSON.stringify([['keydown','Enter'],['keyup','Enter']]))throw Error('Confirm key did not complete: '+JSON.stringify(keys));
 await page.evaluate(()=>window.widelandsBack());
 if(!await page.locator('#toolbox').evaluate(e=>e.hidden))throw Error('Back must close controls first');
 fs.writeFileSync('/tmp/widelands-controls-0.7.json',JSON.stringify(results,null,2));console.log('10 layouts: no overlap, 44px targets, footer reachable; Confirm and Back passed');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
