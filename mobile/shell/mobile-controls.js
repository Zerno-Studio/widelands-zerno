/* Native actions and camera requests are consumed inside the WASM event loop. */
const viewport=document.getElementById('viewport'),toolbox=document.getElementById('toolbox'),more=document.getElementById('more');
let resizeTimer;
function fitCanvas(){const w=viewport.clientWidth,h=viewport.clientHeight;if(w<1||h<1)return;const scale=Math.max(800/w,600/h,Math.min(1,1440/w,1080/h));canvas.style.width=w+'px';canvas.style.height=h+'px';clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{Module.mobileViewport={width:Math.round(w*scale),height:Math.round(h*scale)};},120);}
new ResizeObserver(fitCanvas).observe(viewport);fitCanvas();
for(const type of ['keydown','keyup','keypress','mousedown','mouseup','mousemove','wheel'])toolbox.addEventListener(type,e=>e.stopPropagation());
let tab='context',snapshotVersion=-1,contextKey='',snapshotKey='';
function setTab(name){tab=name;for(const n of ['context','commands','help'])document.getElementById(n+'-section').hidden=n!==name;for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-pressed',String(b.dataset.tab===name));renderActions();}
function setTools(open){releaseInput();toolbox.hidden=!open;document.getElementById('app').classList.toggle('actions-open',open);if(open)requestAnimationFrame(clampActions);more.setAttribute('aria-expanded',String(open));if(open){Module.mobileSnapshotRequest=true;Module.mobileRegistryRequest=true;renderActions();}}
more.onclick=()=>setTools(toolbox.hidden);document.getElementById('close-tools').onclick=()=>setTools(false);
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>setTab(b.dataset.tab);
function key(code,keyCode){for(const type of ['keydown','keyup'])window.dispatchEvent(new KeyboardEvent(type,{key:code,code,keyCode,which:keyCode,bubbles:true}));}
window.widelandsBack=()=>{releaseInput();if(!toolbox.hidden){setTools(false);return;}key('Escape',27);};
document.getElementById('back-action').onclick=()=>{setTools(false);key('Escape',27);};
let nextButton=0;
document.getElementById('close-window').onclick=()=>{setTools(false);nextButton=2;more.title='Tap the window to close it';};
document.getElementById('minimize-window').onclick=()=>{setTools(false);nextButton=1;more.title='Tap the window to minimize it';};
if(location.hostname!=='appassets.androidplatform.net'){history.replaceState({widelands:true},'');history.pushState({widelands:true},'');addEventListener('popstate',()=>{history.pushState({widelands:true},'');window.widelandsBack();});const b=document.getElementById('fullscreen');b.hidden=false;b.onclick=async()=>{try{await document.documentElement.requestFullscreen();if(screen.orientation?.lock)await screen.orientation.lock('landscape');}catch(e){message('Fullscreen: '+e.message);}};}
function plain(text){const doc=new DOMParser().parseFromString(text,'text/html');return doc.body.textContent.replace(/\s+/g,' ').trim();}
// Original assets are already mounted in MEMFS. Blob URLs avoid extra network requests.
const assetURLs=new Map();
function gameAsset(path){
 if(!path)return '';
 if(assetURLs.has(path))return assetURLs.get(path);
 for(const prefix of ['/data/',''])try{
  const bytes=FS.readFile(prefix+path.replace(/^\//,''));
  const url=URL.createObjectURL(new Blob([bytes],{type:/\.ttf$/.test(path)?'font/ttf':'image/png'}));assetURLs.set(path,url);return url;
 }catch(e){}
 return '';
}
let gameSkinReady=false;
function applyGameSkin(){
 if(gameSkinReady||typeof FS==='undefined')return;
 const font=gameAsset('i18n/fonts/DejaVu/DejaVuSans-Bold.ttf');if(!font)return;
 gameSkinReady=true;
 const face=new FontFace('Widelands',`url(${font})`,{weight:'700'});face.load().then(f=>document.fonts.add(f)).catch(()=>{});
 for(const [key,path] of Object.entries({'--game-button':'templates/default/wui/button.png','--game-panel':'templates/default/wui/windows/background.png','--game-border':'templates/default/wui/windows/top.png'})){
  const url=gameAsset(path);if(url)document.documentElement.style.setProperty(key,`url("${url}")`);
 }
}
window.widelandsKeyboardInset=px=>{document.documentElement.style.setProperty('--ime-inset',Math.max(0,px)+'px');if(px>0)requestAnimationFrame(()=>{if(toolbox.contains(document.activeElement)&&document.activeElement.matches('input'))document.activeElement.scrollIntoView({block:'nearest'});});};
function actionButton(a,callback){
 const b=document.createElement('button');b.className='game-action';b.dataset.actionName=a.name;
 const icon=gameAsset(a.icon);if(icon){const img=document.createElement('img');img.src=icon;img.alt='';img.className='action-icon'+(a.icon.startsWith('images/wui/minimap/')?' native-crop':'');b.append(img);}
 const copy=document.createElement('span');copy.className='action-copy';const title=document.createElement('span');title.textContent=plain(a.label);copy.append(title);
 const hint=plain(a.tooltip||'');if(hint&&hint!==plain(a.label)){const small=document.createElement('small');small.textContent=hint;copy.append(small);}
 if(a.toggle){b.setAttribute('aria-pressed',String(a.pressed));const small=document.createElement('small');small.textContent=(Module.mobileContext?.windowName==='minimap'?'Mini-map · ':'')+(a.pressed?'On':'Off');copy.append(small);const state=document.createElement('span');state.className='action-state';state.textContent=a.pressed?'✓':'○';b.append(state);}
 b.append(copy);b.disabled=a.enabled===false||a.bound===false;b.title=hint;b.onclick=callback;return b;
}
let pendingWindowAction=null;
const actionFeedback=document.createElement('p');actionFeedback.setAttribute('role','status');actionFeedback.hidden=true;toolbox.querySelector('header').after(actionFeedback);
function requestWindowAction(a){
 if(pendingWindowAction)return;
 pendingWindowAction=a;Module.mobileLastAction=null;Module.mobileWindowCommand={...a};actionFeedback.hidden=true;
}
// Wait for native dispatch before changing layout: resizing can recreate widgets.
setInterval(()=>{
 const result=Module.mobileLastAction;if(!pendingWindowAction||!result||result.id!==pendingWindowAction.id)return;
 const action=pendingWindowAction;pendingWindowAction=null;
 if(result.status==='dispatched'){if(!action.toggle)setTools(false);}
 else {actionFeedback.hidden=false;actionFeedback.textContent='The game window changed. Please select the action again.';Module.mobileSnapshotRequest=true;}
},100);
function renderActions(){applyGameSkin();const c=Module.mobileContext||{scope:1,window:'Loading…'};document.getElementById('context-label').textContent=({'interactive_base':c.scope===2?'Map editor':'In game','widelands_main_menu':'Main menu'}[c.window]||plain(c.window));const fields=document.getElementById('window-fields');
 if(fields.dataset.context!==c.window||!fields.contains(document.activeElement)){
 fields.replaceChildren();fields.dataset.context=c.window;
 for(const f of Module.mobileTextFields||[]){const label=document.createElement('label');label.textContent=f.name.replace(/_/g,' ');const input=document.createElement('input');input.type='text';input.value=f.text;input.maxLength=512;input.autocomplete='off';input.oninput=()=>{Module.mobileTextCommand={...f,text:input.value};};label.append(input);fields.append(label);}
 }
 const target=document.getElementById('window-actions');target.replaceChildren();for(const a of Module.mobileWindowActions||[])target.append(actionButton(a,()=>requestWindowAction(a)));document.getElementById('context-note').textContent=Module.mobileInspectText?plain(Module.mobileInspectText):(target.children.length?(c.windowName==='minimap'?'Mini-map layers. Buildings shows building markers.':'Same icons and actions as the game window. On/off states update from the game.'):'Use Commands for game actions, or hold a game control to inspect it.');
 document.getElementById('context-note').hidden=!Module.mobileInspectText&&c.windowName!=='minimap';
 const list=document.getElementById('command-actions');list.replaceChildren();const q=document.getElementById('action-search').value.toLowerCase(),all=document.getElementById('all-scopes').checked;
 for(const a of Module.mobileActions||[]){if(!all&&!(a.scopes&1)&&!(a.scopes&(1<<c.scope)))continue;if(q&&!`${a.label} ${a.name}`.toLowerCase().includes(q))continue;const b=actionButton(a,()=>{Module.mobileCommandQueue.push(a.id);setTools(false);});b.disabled=b.disabled||!!c.blocked;const hint=document.createElement('small');hint.textContent=c.blocked?'Finish the current dialog first':a.bound?'Runs in its original game context':'Not assigned in the game';b.append(hint);list.append(b);}
}
for(const id of ['action-search','all-scopes'])document.getElementById(id).addEventListener('input',renderActions);
setInterval(()=>{if(toolbox.hidden)return;const c=JSON.stringify(Module.mobileContext);if(c!==contextKey){contextKey=c;Module.mobileSnapshotRequest=true;}if(Module.mobileSnapshotVersion!==snapshotVersion){snapshotVersion=Module.mobileSnapshotVersion;const next=JSON.stringify([Module.mobileContext,Module.mobileWindowActions,Module.mobileActions,Module.mobileTextFields]);if(next!==snapshotKey){snapshotKey=next;renderActions();}}},200);
setInterval(()=>{if(!toolbox.hidden)Module.mobileSnapshotRequest=true;},800);
function updateMods(){for(const b of document.querySelectorAll('[data-mod]'))b.setAttribute('aria-pressed',String(!!((Module.mobileModifiers||0)&Number(b.dataset.mod))));more.title=Module.mobileModifiers?'Extra options armed for next tap':'Actions';}
for(const b of document.querySelectorAll('[data-mod]'))b.onclick=()=>{Module.mobileModifiers=(Module.mobileModifiers||0)^Number(b.dataset.mod);updateMods();};
document.getElementById('clear-modifiers').onclick=()=>{Module.mobileModifiers=0;updateMods();};
for(const b of document.querySelectorAll('[data-scale]')){b.setAttribute('aria-pressed',String(Number(b.dataset.scale)===Module.mobileScale));b.onclick=()=>{Module.mobileScale=Number(b.dataset.scale);try{localStorage.setItem('widelands.uiScale',String(Module.mobileScale));}catch(e){}for(const x of document.querySelectorAll('[data-scale]'))x.setAttribute('aria-pressed',String(Number(x.dataset.scale)===Module.mobileScale));};}
let stroke=null,strokeId=0;
let touches=new Map(),mode='idle',start=null,lastPoint=null,lastPair=null,holdTimer=null,clearModsTimer=null;
function mouse(type,p,button=0,buttons=0){lastPoint=p;if(type==='mousedown'||type==='mouseup')(Module.mobileMouseModifiers ||= []).push(Module.mobileModifiers||0);canvas.dispatchEvent(new MouseEvent(type,{button,buttons,clientX:p.clientX,clientY:p.clientY,bubbles:true,cancelable:true,ctrlKey:!!(Module.mobileModifiers&192),shiftKey:!!(Module.mobileModifiers&3),altKey:!!(Module.mobileModifiers&768)}));}
function advanceStroke(){
 if(!stroke||!stroke.moved)return;
 const hit=Module.mobileTouchHit;if(!hit||hit.id!==stroke.id)return;
 if(!stroke.route){stroke.route=hit.pan?'pan':'drag';stroke.previous=stroke.start;if(stroke.route==='drag')mouse('mousedown',stroke.start,0,1);}
 mode=stroke.route;
 if(stroke.previous===stroke.last&&!stroke.ended)return;
 if(mode==='pan'){const r=canvas.getBoundingClientRect(),g=Module.mobileGesture;g.dx+=(stroke.last.clientX-stroke.previous.clientX)*canvas.width/r.width;g.dy+=(stroke.last.clientY-stroke.previous.clientY)*canvas.height/r.height;}
 else mouse('mousemove',stroke.last,0,1);
 stroke.previous=stroke.last;
 if(stroke.ended){if(mode==='drag')mouse('mouseup',stroke.last,0,0);stroke=null;mode='idle';clearLater();}
}
setInterval(()=>{if(stroke?.moved)advanceStroke();},16);
function pair(){const [a,b]=[...touches.values()];return{x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2,d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)};}
function clearLater(){clearTimeout(clearModsTimer);clearModsTimer=setTimeout(()=>{Module.mobileModifiers=0;updateMods();},150);}
function releaseInput(){clearTimeout(holdTimer);if(mode==='drag'&&lastPoint)mouse('mouseup',lastPoint,0,0);touches.clear();stroke=null;Module.mobileTouchProbe=null;mode='idle';lastPair=null;}
function cancelAll(){releaseInput();nextButton=0;Module.mobileModifiers=0;Module.mobileGesture={dx:0,dy:0,ratio:1};updateMods();}
for(const type of ['touchstart','touchmove','touchend','touchcancel'])canvas.addEventListener(type,e=>{
 e.preventDefault();e.stopImmediatePropagation();
 if(type==='touchcancel'){cancelAll();return;}
 if(type==='touchstart'){
  for(const t of e.changedTouches)touches.set(t.identifier,t);
  if(touches.size>=2){clearTimeout(holdTimer);if(mode==='drag')mouse('mouseup',lastPoint,0,0);stroke=null;mode='gesture';lastPair=pair();return;}
  if(mode!=='idle')return;
  start=[...touches.values()][0];mode='pending';mouse('mousemove',start);stroke={id:++strokeId,start,last:start,moved:false,ended:false};const r=canvas.getBoundingClientRect();Module.mobileTouchProbe={id:stroke.id,x:Math.round((start.clientX-r.left)*canvas.width/r.width),y:Math.round((start.clientY-r.top)*canvas.height/r.height)};
  holdTimer=setTimeout(()=>{if(mode==='pending'){mode='hold';Module.mobileSnapshotRequest=true;setTab('context');setTools(true);}},650);
 }else if(type==='touchmove'){
  for(const t of e.changedTouches)if(touches.has(t.identifier))touches.set(t.identifier,t);
  if(mode==='gesture'&&touches.size>=2){const p=pair(),r=canvas.getBoundingClientRect();if(lastPair&&Module.mobileContext?.scope>=2){const g=Module.mobileGesture;g.dx+=(p.x-lastPair.x)*canvas.width/r.width;g.dy+=(p.y-lastPair.y)*canvas.height/r.height;if(lastPair.d>10&&p.d>10)g.ratio*=p.d/lastPair.d;}lastPair=p;return;}
  if(touches.size!==1||!['pending','drag','pan'].includes(mode))return;
  const p=[...touches.values()][0];if(stroke){stroke.last=p;if(Math.hypot(p.clientX-start.clientX,p.clientY-start.clientY)>8){stroke.moved=true;clearTimeout(holdTimer);}advanceStroke();}
 }else{
  clearTimeout(holdTimer);const p=e.changedTouches[0];for(const t of e.changedTouches)touches.delete(t.identifier);
  if(stroke&&stroke.moved){stroke.last=p;stroke.ended=true;advanceStroke();if(stroke){mode='awaitend';return;}}
  else if(mode==='pending'){mouse('mousemove',p);mouse('mousedown',p,nextButton,nextButton===2?2:nextButton===1?4:1);mouse('mouseup',p,nextButton,0);nextButton=0;clearLater();}
  else if(mode==='drag'){mouse('mouseup',p,0,0);clearLater();}
  if(touches.size===0){stroke=null;mode='idle';lastPair=null;}else mode='suppress';
 }
},{passive:false,capture:true});
addEventListener('blur',cancelAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAll();});

// Floating controls never participate in the canvas layout.
let panelDrag=null;
const panelHeader=toolbox.querySelector('header');
panelHeader.title='Drag to move Actions';
function clampActions(){
 if(toolbox.hidden)return;
 const app=document.getElementById('app').getBoundingClientRect(),r=toolbox.getBoundingClientRect();
 const ime=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ime-inset'))||0;
 const x=Math.max(8,Math.min(r.left-app.left,app.width-r.width-8));
 const y=Math.max(8,Math.min(r.top-app.top,app.height-ime-r.height-8));
 toolbox.style.left=x+'px';toolbox.style.top=y+'px';toolbox.style.right='auto';toolbox.style.bottom='auto';
}
panelHeader.addEventListener('pointerdown',e=>{
 if(e.target.closest('button,input')||e.button!==0)return;
 e.stopPropagation();const r=toolbox.getBoundingClientRect();
 panelDrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};panelHeader.setPointerCapture(e.pointerId);
});
panelHeader.addEventListener('pointermove',e=>{
 if(!panelDrag||panelDrag.id!==e.pointerId)return;e.stopPropagation();
 const app=document.getElementById('app').getBoundingClientRect();
 toolbox.style.left=(panelDrag.left-app.left+e.clientX-panelDrag.x)+'px';
 toolbox.style.top=(panelDrag.top-app.top+e.clientY-panelDrag.y)+'px';
 toolbox.style.right='auto';toolbox.style.bottom='auto';clampActions();
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])panelHeader.addEventListener(type,()=>{panelDrag=null;});
new ResizeObserver(()=>requestAnimationFrame(clampActions)).observe(document.getElementById('app'));
const applyKeyboardInset=window.widelandsKeyboardInset;
window.widelandsKeyboardInset=px=>{applyKeyboardInset(px);requestAnimationFrame(clampActions);};

// Explicit touch taps keep window controls reliable after a captured drag.
// Mouse/keyboard clicks retain their ordinary path; synthesized touch clicks run once.
let overlayTap=null,lastOverlayTap=null;
document.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;
 const b=e.target.closest('button');
 overlayTap=b&&(toolbox.contains(b)||b===more)?{id:e.pointerId,b,x:e.clientX,y:e.clientY,moved:false}:null;
},true);
document.addEventListener('pointermove',e=>{if(overlayTap?.id===e.pointerId&&Math.hypot(e.clientX-overlayTap.x,e.clientY-overlayTap.y)>8)overlayTap.moved=true;},true);
document.addEventListener('pointercancel',()=>{overlayTap=null;},true);
document.addEventListener('pointerup',e=>{
 const t=overlayTap;if(!t||t.id!==e.pointerId)return;overlayTap=null;
 if(t.moved||t.b.disabled||e.target.closest('button')!==t.b)return;
 lastOverlayTap={b:t.b,time:performance.now()};t.b.click();
},true);
document.addEventListener('click',e=>{
 if(e.isTrusted&&e.detail>0&&lastOverlayTap&&performance.now()-lastOverlayTap.time<500&&e.target.closest('button')===lastOverlayTap.b){e.preventDefault();e.stopImmediatePropagation();}
},true);
document.addEventListener('touchend',e=>{
 if(lastOverlayTap&&performance.now()-lastOverlayTap.time<100&&e.target.closest('button')===lastOverlayTap.b)e.preventDefault();
},{capture:true,passive:false});
