const {chromium}=require('/root/node_modules/playwright');const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium-1228/chrome-linux/chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:1280,height:549},hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5191/?tutorial=1');await p.waitForFunction(()=>Module.mobileContext?.scope===3,{},{timeout:90000});await p.waitForTimeout(10000);
 for(let i=0;i<16;i++){
  await p.evaluate(()=>Module.mobileSnapshotRequest=true);await p.waitForTimeout(500);
  const c=await p.evaluate(()=>Module.mobileContext);
  if(!c.blocked && c.window==='interactive_base'){await p.waitForTimeout(2000);if(await p.evaluate(()=>Module.mobileContext.window==='interactive_base'))break;continue;}
  const a=await p.evaluate(()=>Module.mobileWindowActions.find(a=>a.label==='OK')||Module.mobileWindowActions.find(a=>a.name==='b_close'));
  if(a)await p.evaluate(a=>Module.mobileWindowCommand=a,a);
  await p.waitForTimeout(1000);
 }
 // A one-finger map swipe must pan, never emit a left click.
 const input=await p.context().newCDPSession(p);
 await p.evaluate(()=>{window.mapClicks=[];canvas.addEventListener('mousedown',e=>mapClicks.push(e.button));});
 const cameraBefore=await p.evaluate(()=>({...Module.mobileCamera}));
 await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:180,id:1}]});
 for(let i=1;i<=5;i++){await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180+i*16,y:180,id:1}]});await p.waitForTimeout(50);}
 await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(400);
 const swipe=await p.evaluate(()=>({camera:Module.mobileCamera,hit:Module.mobileTouchHit,context:Module.mobileContext,clicks:mapClicks}));
 if(!swipe.hit.pan||swipe.clicks.length||Math.abs(swipe.camera.x-cameraBefore.x)<5)throw Error('Single swipe failed '+JSON.stringify({cameraBefore,swipe}));
 const fullViewport=await p.evaluate(()=>({width:canvas.width,height:canvas.height}));
 await p.evaluate(()=>{Module.mobileRegistryRequest=true;});await p.waitForTimeout(600);
 const action=await p.evaluate(()=>Module.mobileActions.find(a=>a.name==='minimap'));if(!action)throw Error('Missing minimap');
 await p.evaluate(id=>Module.mobileCommandQueue.push(id),action.id);await p.waitForTimeout(1200);
 await p.locator('#more').tap();await p.waitForFunction(()=>Module.mobileWindowActions?.some(a=>a.name==='buildings'),{},{timeout:10000});await p.waitForTimeout(900);
 if(JSON.stringify(await p.evaluate(()=>({width:canvas.width,height:canvas.height})))!==JSON.stringify(fullViewport))throw Error('Overlay changed native resolution');
 const before=await p.evaluate(()=>Module.mobileWindowActions.find(a=>a.name==='buildings'));
 fs.writeFileSync('/tmp/wl10-buttons.json',JSON.stringify(await p.evaluate(()=>Module.mobileWindowActions),null,2));
 if(!before.toggle||!before.icon)throw Error('Missing toggle/icon '+JSON.stringify(before));
 const target=p.locator('#window-actions [data-action-name="buildings"]');await target.scrollIntoViewIfNeeded();
 await target.tap();await p.waitForFunction(old=>Module.mobileWindowActions.find(a=>a.name==='buildings')?.pressed!==old,before.pressed,{timeout:10000});
 if(await p.locator('#toolbox').isHidden())throw Error('Toggle closed drawer');
 const after=await p.evaluate(()=>Module.mobileWindowActions.find(a=>a.name==='buildings'));
 if(await target.getAttribute('aria-pressed')!==String(after.pressed)){await p.waitForTimeout(400);}
 await p.screenshot({path:'/tmp/wl10-minimap-phone.png'});
 await target.tap();await p.waitForFunction(old=>Module.mobileWindowActions.find(a=>a.name==='buildings')?.pressed===old,before.pressed,{timeout:10000});
 const iconCount=await p.locator('#window-actions img').evaluateAll(imgs=>imgs.filter(i=>i.complete&&i.naturalWidth>0).length);if(iconCount<5)throw Error('Original icons failed '+iconCount);
 const dimensions=await p.evaluate(()=>({width:canvas.width,height:canvas.height,viewport:JSON.stringify(Module.mobileViewport)}));
 await p.evaluate(()=>widelandsKeyboardInset(280));await p.waitForTimeout(500);
 const keyboard=await p.evaluate(()=>({width:canvas.width,height:canvas.height,viewport:JSON.stringify(Module.mobileViewport),drawerHeight:toolbox.clientHeight}));
 if(dimensions.width!==keyboard.width||dimensions.height!==keyboard.height||dimensions.viewport!==keyboard.viewport)throw Error('Keyboard resized game');
 await p.screenshot({path:'/tmp/wl10-keyboard-layout.png'});await p.evaluate(()=>widelandsKeyboardInset(0));
 await p.setViewportSize({width:1032,height:792});await p.waitForTimeout(1000);await p.screenshot({path:'/tmp/wl10-minimap-fold.png'});
 const crop=await target.locator('img').evaluate(i=>({width:i.naturalWidth,height:i.naturalHeight,fit:getComputedStyle(i).objectFit}));if(crop.fit!=='cover')throw Error('Mini-map icon is not center-cropped');
 await p.evaluate(()=>requestWindowAction({...Module.mobileWindowActions.find(a=>a.name==='buildings'),id:1}));
 await p.waitForFunction(()=>Module.mobileLastAction?.status==='stale',{},{timeout:10000});await p.waitForTimeout(300);
 if(!await p.getByRole('status').isVisible())throw Error('Stale action failed silently');
 if(await p.evaluate(()=>Module.mobileWindowActions.find(a=>a.name==='buildings').pressed)!==before.pressed)throw Error('Stale action changed game');
 if(errors.length)throw Error(JSON.stringify(errors));
 const result={cameraBefore,swipe,fullViewport,before,after,restored:true,iconCount,crop,staleRejected:true,dimensions,keyboard,errors};fs.writeFileSync('/tmp/wl10-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
