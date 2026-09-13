const {chromium}=require('/root/node_modules/playwright');const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium-1228/chrome-linux/chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:1032,height:792},hasTouch:true});let errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>fs.appendFileSync('/tmp/wl9-console.log',m.text()+'\n'));
 await p.goto('http://127.0.0.1:5191/?tutorial=1');await p.waitForFunction(()=>Module.mobileContext?.scope===3,{},{timeout:90000});await p.waitForTimeout(10000);
 await p.locator('#more').tap();await p.waitForFunction(()=>Module.mobileWindowActions?.some(a=>a.label==='OK'),{},{timeout:20000});await p.waitForTimeout(500);
 fs.writeFileSync('/tmp/wl9-actions.json',JSON.stringify(await p.evaluate(()=>({context:Module.mobileContext,buttons:Module.mobileWindowActions,commands:Module.mobileActions})),null,2));
 await p.screenshot({path:'/tmp/wl9-context.png'});
 await p.locator('#window-actions button').filter({hasText:/^OK$/}).tap();await p.waitForTimeout(1800);await p.screenshot({path:'/tmp/wl9-after-ok.png'});
 // Same original handler opens Objectives after welcome OK.
 const afterOK=await p.evaluate(()=>Module.mobileContext.window);if(!afterOK.toLowerCase().includes('objective'))throw Error('OK failed: '+afterOK);
 await p.locator('#more').tap();await p.waitForTimeout(600);
 // Close the original Objectives window via its real close button, discovered from the tree.
 const close=await p.evaluate(()=>Module.mobileWindowActions.find(a=>/close/i.test(a.label+' '+a.name)));
 if(close){await p.evaluate(a=>{Module.mobileWindowCommand=a;setTools(false);},close);await p.waitForTimeout(800);}else{await p.evaluate(()=>{setTools(false);key('Escape',27);});}
 const before=await p.evaluate(()=>Module.mobileCamera);
 const cdp=await p.context().newCDPSession(p);let points=[{x:350,y:300,id:1},{x:550,y:300,id:2}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
 for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points.map(t=>({...t,x:t.x+i*12}))});await p.waitForTimeout(60);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(500);const pan=await p.evaluate(()=>Module.mobileCamera);
 if(Math.abs(pan.x-before.x)<1){await p.screenshot({path:'/tmp/wl9-pan-failed.png'});throw Error('Camera did not pan '+JSON.stringify(await p.evaluate(()=>({context:Module.mobileContext,gesture:Module.mobileGesture,mode,beforeCamera:Module.mobileCamera}))))};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
 for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...points[0],x:350-i*10},{...points[1],x:550+i*10}]});await p.waitForTimeout(60);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(500);const pinch=await p.evaluate(()=>Module.mobileCamera);if(!(pinch.zoom<pan.zoom))throw Error('Spread did not zoom in');
 await p.waitForTimeout(2000);
 for(let i=0;i<12;i++){
 await p.evaluate(()=>{Module.mobileSnapshotRequest=true;});await p.waitForTimeout(500);
 const context=await p.evaluate(()=>Module.mobileContext);
 console.log('Dismiss',i,context);
 if(!context.blocked){await p.waitForTimeout(1800);if(!await p.evaluate(()=>Module.mobileContext.blocked))break;continue;}
 const button=await p.evaluate(()=>Module.mobileWindowActions.find(a=>a.label==='OK')||Module.mobileWindowActions.find(a=>a.name==='b_close'));
 if(!button)throw Error('No confirmation button '+JSON.stringify(context));
 await p.evaluate(a=>Module.mobileWindowCommand=a,button);await p.waitForTimeout(1000);
 }
 await p.locator('#more').tap();await p.locator('[data-tab="commands"]').tap();await p.locator('#action-search').fill('save');await p.waitForTimeout(500);await p.screenshot({path:'/tmp/wl9-commands.png'});
 await p.locator('#command-actions button').filter({hasText:/^Save/}).first().tap();await p.waitForTimeout(1500);const saveContext=await p.evaluate(()=>Module.mobileContext.window);await p.screenshot({path:'/tmp/wl9-save.png'});
 if(!/save/i.test(saveContext))throw Error('Native Save shortcut failed: '+saveContext);
 await p.locator('#more').tap();await p.locator('[data-tab="context"]').tap();
 await p.locator('#window-fields input').first().fill('touch-smoke');await p.waitForTimeout(1200);
 await p.screenshot({path:'/tmp/wl9-save-overlay.png'});
 await p.locator('#window-actions button').filter({hasText:/^OK$/}).tap();
 await p.waitForFunction(()=>{try{return FS.readdir('/home/widelands/save').some(n=>n.includes('touch-smoke'));}catch(e){return false;}},{},{timeout:60000});await p.waitForTimeout(2000);
 const saved=await p.evaluate(async()=>{await new Promise((ok,bad)=>FS.syncfs(false,e=>e?bad(String(e)):ok()));return FS.readdir('/home/widelands/save').filter(n=>n.includes('touch-smoke'));});
 console.log('Actual game saved',saved);
 await p.screenshot({path:'/tmp/wl9-game-fold.png'});

 await p.setViewportSize({width:960,height:432});await p.waitForTimeout(1000);await p.screenshot({path:'/tmp/wl9-phone.png'});
 await p.locator('#more').tap();await p.locator('[data-tab="help"]').tap();await p.locator('[data-scale="6"]').tap();await p.waitForTimeout(1200);await p.screenshot({path:'/tmp/wl9-scale150.png'});
 await p.locator('[data-scale="5"]').tap();await p.waitForTimeout(700);
 const storage=await p.evaluate(async()=>{FS.writeFile('/home/widelands/.probe','ok');await new Promise((ok,bad)=>FS.syncfs(false,e=>e?bad(String(e)):ok()));FS.unlink('/home/widelands/.probe');return true;});
 const savedBefore=await p.evaluate(()=>Array.from(FS.readFile('/home/widelands/save/touch-smoke.wgf')));
 await p.reload();await p.waitForFunction(()=>{try{return FS.stat('/home/widelands/save/touch-smoke.wgf').size>0;}catch(e){return false;}},{},{timeout:90000});
 const savedAfter=await p.evaluate(()=>Array.from(FS.readFile('/home/widelands/save/touch-smoke.wgf')));
 if(JSON.stringify(savedBefore)!==JSON.stringify(savedAfter))throw Error('Save changed across reload');
 console.log('Save survives reload byte-for-byte',savedAfter.length);
 if(errors.length)throw Error(JSON.stringify(errors));fs.writeFileSync('/tmp/wl9-result.json',JSON.stringify({afterOK,before,pan,pinch,saveContext,saved,saveBytes:savedAfter.length,reloadPreserved:true,storage,errors},null,2));console.log('Native context OK, pan, pinch, Save command, scale and IDBFS passed');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
