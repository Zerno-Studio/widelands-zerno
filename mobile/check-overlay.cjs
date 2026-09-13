const {chromium}=require('/root/node_modules/playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});const p=await b.newPage({hasTouch:true});await p.route('**/widelands.js',r=>r.fulfill({body:''}));await p.goto('http://127.0.0.1:5191/');await p.evaluate(()=>{document.getElementById('loading').hidden=true;window.leakedMapClicks=0;canvas.addEventListener('mousedown',()=>leakedMapClicks++);Module.mobileContext={scope:3,window:'Save Game'};Module.mobileActions=[];Module.mobileWindowActions=[{id:1,name:'ok',label:'OK',enabled:true}];Module.mobileTextFields=[{id:2,name:'filename',text:'',window:'Save Game'}];});const results=[];
for(const [width,height] of [[1280,549],[1032,792],[549,1280]]){
 await p.setViewportSize({width,height});await p.evaluate(()=>setTools(false));await p.waitForTimeout(300);
 const before=await p.evaluate(()=>({rect:JSON.stringify(canvas.getBoundingClientRect().toJSON()),viewport:JSON.stringify(Module.mobileViewport)}));
 for(let i=0;i<3;i++){
 console.log('Open',width,height,i);await p.locator('#more').tap();await p.waitForTimeout(200);
 const current=await p.evaluate(()=>({rect:JSON.stringify(canvas.getBoundingClientRect().toJSON()),viewport:JSON.stringify(Module.mobileViewport)}));if(JSON.stringify(current)!==JSON.stringify(before))throw Error('Opening changed game size');
 const header=p.locator('#toolbox header'),r=await header.boundingBox();const cdp=await p.context().newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+60,y:r.y+20,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:65,y:65,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const hit=await p.evaluate(()=>{const t=toolbox.getBoundingClientRect();return toolbox.contains(document.elementFromPoint(t.x+20,t.y+20));});if(!hit)throw Error('Overlay does not capture input');
 await p.locator('#close-tools').tap();await p.waitForTimeout(300);console.log('Closed?',await p.evaluate(()=>({hidden:toolbox.hidden,drag:panelDrag})));if(!await p.locator('#toolbox').isHidden()){await p.screenshot({path:'/tmp/wl11-close-fail.png'});throw Error('Touch close failed after drag');}
 const after=await p.evaluate(()=>({rect:JSON.stringify(canvas.getBoundingClientRect().toJSON()),viewport:JSON.stringify(Module.mobileViewport)}));if(JSON.stringify(after)!==JSON.stringify(before))throw Error('Closing or dragging changed game size');
 }
 await p.evaluate(()=>setTools(true));await p.evaluate(()=>widelandsKeyboardInset(240));await p.waitForTimeout(300);
 const ime=await p.evaluate(()=>({rect:JSON.stringify(canvas.getBoundingClientRect().toJSON()),viewport:JSON.stringify(Module.mobileViewport)}));if(JSON.stringify(ime)!==JSON.stringify(before))throw Error('IME changed game size');
 await p.evaluate(()=>widelandsKeyboardInset(0));results.push({width,height,openCloseDragCycles:3,unchanged:true});
}
if(await p.evaluate(()=>leakedMapClicks))throw Error('Overlay taps leaked to game');
fs.writeFileSync('/tmp/wl11-overlay.json',JSON.stringify(results,null,2));console.log(results);await b.close();})().catch(e=>{console.error(e);process.exit(1)});
