(async function(){
 'use strict';
 const here=new URL(location.href);
if(here.protocol!=='https:' || here.username || here.password || (here.port && here.port!=='443') || !['pokesurvivor.com','www.pokesurvivor.com'].includes(here.hostname) || !['/','/index.html','/dev.html'].includes(here.pathname) || /(?:auth|login|sign.?in|token|callback|password|session|(?:[?&#]|^)code(?:=|%3d))/i.test(here.search+here.hash)) return;
if(typeof window!=='undefined' && window.top!==window.self) return;

 if(globalThis.__PSKO_AUTO_BOOTED)return;globalThis.__PSKO_AUTO_BOOTED=true;
 const BASE='https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/';
 const CACHE='pokesurvivor-ko:bundle-cache:v1';
 let badge=null,hideTimer=null;
 const show=text=>{
  if(!/(^|\.)pokesurvivor\.com$/i.test(location.hostname))return;
  if(!badge){badge=document.createElement('div');badge.id='psko-auto-status';badge.setAttribute('translate','no');badge.setAttribute('data-psko-own','');badge.setAttribute('role','status');badge.style.cssText='position:fixed;right:8px;bottom:8px;z-index:2147483647;max-width:90vw;padding:6px 9px;color:#ffdf8c;background:rgba(10,17,28,.94);border:1px solid #8b7440;font:12px Pixelify,system-ui,sans-serif;line-height:1.5;pointer-events:none';(document.body||document.documentElement).appendChild(badge);}
  clearTimeout(hideTimer);badge.hidden=false;badge.textContent=text;
 };
 const status=r=>{
  globalThis.__PSKO_AUTO_STATUS={...r};
  const labels={checking:r.version?'한국어 v'+r.version+' · 업데이트 확인 중':'한국어 패치 확인 중',downloading:'한국어 v'+r.version+' 받는 중', 'installed-cache':'한국어 v'+r.version, 'installed-new':'한국어 v'+r.version+' 적용됨', 'offline-cache':'한국어 v'+r.version+' · 저장된 버전 사용', 'staged-update':r.saved?'한국어 v'+r.available+' 준비됨 · 다음 새로고침 때 적용':'패치 캐시 저장 실패 · 다음 접속 시 재시도', 'duplicate-script':'기존 한국어 패치를 끄고 자동 로더만 켜 주세요', 'first-load-failed':'한국어 패치 연결 실패 · 인터넷 확인 후 새로고침', 'execution-failed':'한국어 패치 실행 실패 · Userscripts 실행 권한을 확인해 주세요'};
  show(labels[r.action]||'한국어 패치');
  if(badge && !['checking','downloading','duplicate-script'].includes(r.action))hideTimer=setTimeout(()=>{badge.hidden=true;},r.action==='staged-update'?9000:5000);
  if(['first-load-failed','execution-failed'].includes(r.action))console.warn('[PSKO auto]',r.error||r.action);
 };
 const gm=typeof GM==='object'?GM:null;
 if(!gm?.getValue||!gm?.setValue||!gm?.xmlHttpRequest){status({action:'execution-failed',error:'GM 권한이 없는 파일입니다. 자동 로더 원본을 설치해 주세요.'});return;}
 function request(url,timeout){
  return new Promise((resolve,reject)=>{
   let settled=false,req,timer;
   const done=r=>{if(settled)return;settled=true;clearTimeout(timer);if(r.status<200||r.status>=300){reject(new Error('HTTP '+r.status));return;}resolve(String(r.responseText??r.response??''));};
   const fail=e=>{if(settled)return;settled=true;clearTimeout(timer);reject(new Error(e?.message||'네트워크 연결 실패'));};
   try{req=gm.xmlHttpRequest({method:'GET',url,timeout,responseType:'text',onload:done,onerror:fail,ontimeout:()=>fail({message:'연결 시간 초과'})});if(req?.then)req.then(done,fail);if(!settled)timer=setTimeout(()=>{try{req?.abort?.();}catch(e){}fail({message:'연결 시간 초과'});},timeout+500);}catch(e){fail(e);}
  });
 }
 const loader=createPokesurvivorAutoLoader({
  getCache:()=>gm.getValue(CACHE,null),setCache:value=>gm.setValue(CACHE,value),
  fetchMeta:()=>request(BASE+'pokesurvivor-ko-menu.meta.js?check='+Date.now(),5000),
  fetchBundle:version=>request(BASE+'pokesurvivor-ko-menu.user.js?v='+encodeURIComponent(version)+'&check='+Date.now(),15000),
  compile:source=>Function(source),execute:fn=>fn(),
  otherPatch:()=>!!document.documentElement.dataset.pskoDom,
  onInteraction:handler=>{const once=()=>handler();for(const name of ['pointerdown','touchstart','keydown'])addEventListener(name,once,{capture:true,passive:true});return()=>{for(const name of ['pointerdown','touchstart','keydown'])removeEventListener(name,once,true);};},
  status,
 });
 await loader.run();
})();
