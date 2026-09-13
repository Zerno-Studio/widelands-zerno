// Run against mobile/serve.py or a server serving the packaged asset directory.
// BENCH_BASE can point to the saved 0.1.0 threaded build for the same workload.
const {chromium}=require(process.env.PLAYWRIGHT_PATH || '/root/node_modules/playwright');
const fs=require('fs');
(async()=>{
 const tag=process.env.CHECK_TAG||'single';const base=process.env.BENCH_BASE||'http://127.0.0.1:5190/single-preview/';
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/root/.cache/ms-playwright/chromium-1228/chrome-linux/chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:1280,height:720}});let errors=[],logs=[];
 p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{logs.push(m.text());fs.appendFileSync('/tmp/widelands-'+tag+'.log',m.text()+'\n')});
 await p.addInitScript(()=>{window.__frames=[];const original=WebGL2RenderingContext.prototype.clear;WebGL2RenderingContext.prototype.clear=function(mask){if((mask&0x4100)===0x4100)window.__frames.push(performance.now());return original.apply(this,arguments)};});
 await p.goto(base+'?tutorial=1');await p.waitForTimeout(35000);
 await p.screenshot({path:'/tmp/widelands-'+tag+'-welcome.png'});
 const rect=await p.locator('#canvas').boundingBox();await p.mouse.click(rect.x+rect.width*640/1280,rect.y+rect.height*465/720);await p.waitForTimeout(2000);
 await p.evaluate(()=>window.__frames=[]);await p.waitForTimeout(10000);
 const metrics=await p.evaluate(()=>{const f=window.__frames;const dt=f.slice(1).map((v,i)=>v-f[i]).sort((a,b)=>a-b);return {crossOriginIsolated,sharedMemory:typeof SharedArrayBuffer!=='undefined',frames:f.length,fps:f.length>1?1000*(f.length-1)/(f.at(-1)-f[0]):0,p95FrameMs:dt[Math.floor(dt.length*.95)],canvas:[canvas.width,canvas.height]}});
 await p.screenshot({path:'/tmp/widelands-'+tag+'-game.png'});
 if(tag==='single'){
  await p.evaluate(()=>window.widelandsBack());await p.waitForTimeout(700);
  await p.evaluate(()=>window.widelandsBack());await p.waitForTimeout(700);
  await p.screenshot({path:'/tmp/widelands-single-back.png'});
  await p.goBack();await p.waitForTimeout(700);metrics.browserBackStayed=p.url().startsWith(base);
  metrics.storage=await p.evaluate(async()=>{FS.writeFile('/home/widelands/.probe','ok');await new Promise((ok,bad)=>FS.syncfs(false,e=>e?bad(String(e)):ok()));FS.unlink('/home/widelands/.probe');await new Promise((ok,bad)=>FS.syncfs(false,e=>e?bad(String(e)):ok()));return true});
 }
 const result={...metrics,errors,logs:logs.slice(-12)};fs.writeFileSync('/tmp/widelands-'+tag+'-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
