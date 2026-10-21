// One document-lifetime entry for every distribution. No account/progression access or history patches.
(function(){
'use strict';
function allowedLocation(loc, win) {
 try{const u=new URL(loc.href);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&['pokesurvivor.com','www.pokesurvivor.com'].includes(u.hostname)&&['/','/index.html','/dev.html'].includes(u.pathname)&&!/(?:auth|login|sign.?in|token|callback|password|session|(?:[?&#]|^)code(?:=|%3d))/i.test(u.search+u.hash)&&(!win||win.top===win.self);}catch(e){return false;}
}
if(typeof document==='undefined'){if(typeof module!=='undefined'&&module.exports)module.exports={allowedLocation};return;}
const CONFIG=PSKO_RUNTIME_CONFIG;
if(!allowedLocation(location,typeof window==='undefined'?null:window))return;
if(globalThis.__PSKO_BOOT?.pending||globalThis.__PSKO_BOOT?.active)return;
const state={version:CONFIG.version,channel:CONFIG.channel,pending:true,active:false,status:'waiting-root',features:new Map(),canvas:{ok:false,reason:'not-attempted',realmVerified:false},isAllowed:()=>allowedLocation(location,window),registerFeature(name,refresh){if(this.features.has(name))return false;this.features.set(name,refresh);return true;}};
globalThis.__PSKO_BOOT=state;
let rootWait=null,rootObserver=null,queued=false,lastURL=location.href,lastRoot=null;
function refresh(){queued=false;if(!state.active)return;if(!state.isAllowed()){state.status='suspended-route';return;}state.status='active';state.api?.installDOM();if(document.body)state.api?.walk(document.body);for(const callback of state.features.values()){try{callback();}catch(e){console.warn('[PSKO] feature refresh failed',String(e?.message||e));}}}
function schedule(){if(!queued){queued=true;window.requestAnimationFrame(refresh);}}
function start(){
 if(!state.isAllowed()){state.pending=false;state.status='excluded-route';return;}
 const root=document.documentElement;if(!root)return;
 rootWait?.disconnect();
 // Shared DOM marker also prevents duplication across page/isolated realms or older scripts.
 if(root.dataset.pskoRuntime||root.dataset.pskoDom||globalThis.__PSKO_DOM_OBSERVER){state.pending=false;state.status='other-patch-active';console.warn('[PSKO] Another Korean patch is active. Disable it and reload after the run.');return;}
 root.dataset.pskoRuntime=CONFIG.channel+'@'+CONFIG.version;
 state.pending=false;state.active=true;state.status='starting';lastRoot=root;
 /* PSKO_PAYLOAD */
 rootObserver=new MutationObserver(()=>{if(document.documentElement!==lastRoot){lastRoot=document.documentElement;bodyObserver.disconnect();if(lastRoot)bodyObserver.observe(lastRoot,{childList:true});state.api?.installDOM();}schedule();});
 // Existing modules observe subtree changes; this observer handles whole body/root replacements only.
 rootObserver.observe(document,{childList:true,subtree:false});
 const bodyObserver=new MutationObserver(schedule);bodyObserver.observe(root,{childList:true});
 for(const name of ['popstate','hashchange','pageshow'])window.addEventListener(name,schedule);
 // pushState does not emit popstate. Poll URL only, not game state, without replacing history APIs.
 const timer=window.setInterval(()=>{if(location.href!==lastURL){lastURL=location.href;schedule();}},1000);
 state.refresh=schedule;state.status='active';state.canvas.realmVerified=false;
 state.disposeLifecycle=()=>{rootObserver.disconnect();bodyObserver.disconnect();window.clearInterval(timer);for(const name of ['popstate','hashchange','pageshow'])window.removeEventListener(name,schedule);};
}
if(document.documentElement)start();else{rootWait=new MutationObserver(start);rootWait.observe(document,{childList:true});}
})();
