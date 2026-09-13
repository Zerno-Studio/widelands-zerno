const {chromium}=require('/root/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium-1228/chrome-linux/chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:960,height:432},hasTouch:true});let errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5191/?tutorial=1');await p.waitForFunction(()=>getComputedStyle(document.getElementById('loading')).display==='none',{},{timeout:60000});await p.waitForTimeout(35000);
 await p.screenshot({path:'/tmp/widelands-ui-phone-before.png'});
 const r=await p.locator('#canvas').boundingBox();await p.touchscreen.tap(r.x+r.width*.5,r.y+r.height*465/720);await p.waitForTimeout(2000);
 await p.screenshot({path:'/tmp/widelands-ui-phone.png'});
 await p.setViewportSize({width:1032,height:792});await p.waitForTimeout(300);await p.screenshot({path:'/tmp/widelands-ui-fold.png'});
 if(errors.length)throw Error(JSON.stringify(errors));console.log('Real game touch capture completed without JS errors');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
