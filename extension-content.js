'use strict';
(function(){
 const ext=globalThis.browser||globalThis.chrome;
 if(!ext?.runtime?.sendMessage)return;
 Promise.resolve(ext.runtime.sendMessage({type:'PSKO_INSTALL_MAIN'})).then(result=>{
  document.documentElement.dataset.pskoMode=result?.ok?'dom-and-native-main':'dom-only';
 }).catch(()=>{document.documentElement.dataset.pskoMode='dom-only';});
})();
