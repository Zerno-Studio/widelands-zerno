const {chromium}=require('/root/node_modules/playwright');
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});const p=await b.newPage({viewport:{width:1000,height:700},hasTouch:true});await p.route('**/widelands.js',r=>r.fulfill({body:''}));await p.goto('http://127.0.0.1:5191/');await p.evaluate(()=>{document.getElementById('loading').hidden=true;Module.mobileContext={scope:3};window.clicks=[];for(const t of ['mousedown','mouseup'])canvas.addEventListener(t,e=>clicks.push(t));});const c=await p.context().newCDPSession(p);
async function touch(type,x=100,y=100){await c.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,id:1}]});}
async function reset(){await p.evaluate(()=>{clicks=[];Module.mobileGesture={dx:0,dy:0,ratio:1};});}
async function hit(pan){await p.evaluate(pan=>{Module.mobileTouchHit={id:Module.mobileTouchProbe.id,pan};},pan);}
await touch('touchStart');await hit(true);await touch('touchMove',180,140);await touch('touchEnd');await p.waitForTimeout(60);
let r=await p.evaluate(()=>({g:Module.mobileGesture,clicks}));if(r.clicks.length||r.g.dx<50)throw Error('Map swipe '+JSON.stringify(r));
await reset();await touch('touchStart');await touch('touchMove',180,140);await touch('touchEnd');await hit(true);await p.waitForTimeout(60);
r=await p.evaluate(()=>({g:Module.mobileGesture,clicks}));if(r.clicks.length||r.g.dx<50)throw Error('Delayed native hit '+JSON.stringify(r));
await reset();await touch('touchStart');await hit(false);await touch('touchMove',180,140);await touch('touchEnd');await p.waitForTimeout(60);
r=await p.evaluate(()=>({g:Module.mobileGesture,clicks}));if(r.g.dx||JSON.stringify(r.clicks)!=='["mousedown","mouseup"]')throw Error('UI drag '+JSON.stringify(r));
await reset();await touch('touchStart');await hit(true);await touch('touchEnd');await p.waitForTimeout(60);
r=await p.evaluate(()=>({g:Module.mobileGesture,clicks}));if(r.g.dx||JSON.stringify(r.clicks)!=='["mousedown","mouseup"]')throw Error('Tap '+JSON.stringify(r));
await reset();await touch('touchStart');await touch('touchCancel');await p.waitForTimeout(30);if(await p.evaluate(()=>mode!=='idle'||stroke!==null||clicks.length))throw Error('Cancel left input active');
console.log('Map swipe, delayed hit after release, native UI drag, tap and cancel passed');await b.close();})().catch(e=>{console.error(e);process.exit(1)});
