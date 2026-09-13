const {chromium}=require('/root/node_modules/playwright');
const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium-1228/chrome-linux/chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:1032,height:792},hasTouch:true});const errors=[],results=[];
 p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5191/?tutorial=1');await p.waitForTimeout(35000);
 for(const [width,height,open] of [[1032,792,false],[960,432,false],[960,432,true],[1032,792,false],[549,1280,false],[1280,549,false]]){
  await p.setViewportSize({width,height});await p.evaluate(open=>setTools(open),open);await p.waitForTimeout(1500);
  const r=await p.evaluate(()=>{
   const c=canvas.getBoundingClientRect(),v=document.getElementById('viewport').getBoundingClientRect();
   const gl=canvas.getContext('webgl2');
   return {desired:Module.mobileViewport,actual:[canvas.width,canvas.height],buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],css:[c.width,c.height],viewport:[v.width,v.height],contextLost:gl.isContextLost(),footerClear:document.elementFromPoint(c.x+c.width*.5,c.y+c.height*.95)===canvas};
  });
  if(r.actual[0]!==r.desired.width||r.actual[1]!==r.desired.height||r.buffer.join()!==r.actual.join()||r.contextLost||!r.footerClear||r.css.some((v,i)=>Math.abs(v-r.viewport[i])>1)||Math.abs(r.actual[0]/r.actual[1]-r.css[0]/r.css[1])>.005)throw Error(JSON.stringify(r));
  results.push({width,height,open,...r});
  await p.screenshot({path:`/tmp/widelands-adaptive-${width}-${height}${open?'-drawer':''}.png`});
 }
 // Welcome dialog is centred; its OK button is 105 game pixels below centre.
 await p.setViewportSize({width:1032,height:792});await p.waitForTimeout(1000);
 await p.screenshot({path:'/tmp/widelands-adaptive-before.png'});
 const pos=await p.evaluate(()=>{const r=canvas.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height*(.5+105/canvas.height)}});
 await p.touchscreen.tap(pos.x,pos.y);await p.waitForTimeout(1500);
 await p.screenshot({path:'/tmp/widelands-adaptive-after.png'});
 if(errors.length)throw Error(JSON.stringify(errors));
 fs.writeFileSync('/tmp/widelands-adaptive-check.json',JSON.stringify({results,errors},null,2));console.log('Adaptive viewport, WebGL buffer and footer checks passed; touch screenshots saved');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
