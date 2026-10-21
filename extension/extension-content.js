'use strict';
(function(){
const here=new URL(location.href);
if(here.protocol!=='https:' || here.username || here.password || (here.port && here.port!=='443') || !['pokesurvivor.com','www.pokesurvivor.com'].includes(here.hostname) || !['/','/index.html','/dev.html'].includes(here.pathname) || /(?:auth|login|sign.?in|token|callback|password|session|(?:[?&#]|^)code(?:=|%3d))/i.test(here.search+here.hash)) return;
if(typeof window!=='undefined' && window.top!==window.self) return;

 const ext=globalThis.browser||globalThis.chrome;
 if(!ext?.runtime?.sendMessage)return;
 Promise.resolve(ext.runtime.sendMessage({type:'PSKO_INSTALL_MAIN'})).then(result=>{
  document.documentElement.dataset.pskoMode=result?.ok?'dom-and-native-main':'dom-only';
 }).catch(()=>{document.documentElement.dataset.pskoMode='dom-only';});
})();
