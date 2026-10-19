function createPokesurvivorAutoLoader(env) {
  'use strict';
  const NS='pokesurvivor-ko-local-test';
  function versionParts(value){
    const m=/^(\d+)\.(\d+)(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value||'');
    if(!m)throw new Error('잘못된 버전 형식');
    return {nums:[+m[1],+m[2],+(m[3]||0)],pre:m[4]?m[4].split('.'):null};
  }
  function compare(a,b){
    const x=versionParts(a),y=versionParts(b);
    for(let i=0;i<3;i++)if(x.nums[i]!==y.nums[i])return x.nums[i]>y.nums[i]?1:-1;
    if(!x.pre&&!y.pre)return 0;if(!x.pre)return 1;if(!y.pre)return -1;
    for(let i=0;i<Math.max(x.pre.length,y.pre.length);i++){
      if(x.pre[i]===undefined)return -1;if(y.pre[i]===undefined)return 1;
      if(x.pre[i]===y.pre[i])continue;
      const xn=/^\d+$/.test(x.pre[i]),yn=/^\d+$/.test(y.pre[i]);
      if(xn&&yn)return +x.pre[i]>+y.pre[i]?1:-1;if(xn!==yn)return xn?-1:1;
      return x.pre[i]>y.pre[i]?1:-1;
    }return 0;
  }
  function header(code){
    if(typeof code!=='string'||code.length>4000000)throw new Error('패치 응답 크기 오류');
    const m=/^\uFEFF?\s*\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/.exec(code);
    if(!m)throw new Error('패치 파일 형식 오류');
    const version=/^\/\/\s*@version\s+(\S+)/m.exec(m[1])?.[1];
    const namespace=/^\/\/\s*@namespace\s+(\S+)/m.exec(m[1])?.[1];
    if(namespace!==NS)throw new Error('패치 식별자 불일치');versionParts(version);return version;
  }
  function validated(record,expected){
    if(!record||typeof record.code!=='string')return null;
    const version=header(record.code);if(version!==record.version||(expected&&version!==expected))throw new Error('버전과 코드 불일치');
    return {...record,version,compiled:env.compile(record.code)};
  }
  async function run(){
    let cached=null,installed=null,interacted=false,cacheError=null;
    const report=x=>{env.status?.(x);return x;};
    if(env.otherPatch?.())return report({action:'duplicate-script'});
    const install=record=>{
      if(installed)return;
      if(env.otherPatch?.())throw new Error('이전 패치가 중복 실행 중입니다');
      env.execute(record.compiled,record.version);installed=record.version;
    };
    const detach=env.onInteraction?.(()=>{interacted=true;if(cached&&!installed){try{install(cached);}catch(e){cacheError=String(e.message||e);}}})||(()=>{});
    try{
      try{cached=validated(await env.getCache());}catch(e){cacheError=String(e.message||e);}
      if(interacted&&cached&&!installed)install(cached);
      report({action:'checking',version:cached?.version||null});
      const meta=await env.fetchMeta();const remote=header(meta);
      if(cached&&compare(remote,cached.version)<=0){install(cached);return report({action:'installed-cache',version:cached.version});}
      report({action:'downloading',version:remote});
      const code=await env.fetchBundle(remote);
      const next=validated({version:remote,code},remote);
      // Reread shared extension storage to avoid ordinary stale-frame downgrades.
      let store=next;
      try{const latest=validated(await env.getCache());if(latest&&compare(latest.version,next.version)>0)store=latest;}catch(e){}
      let saved=false;
      try{await env.setCache({version:store.version,code:store.code,savedAt:Date.now()});saved=true;}catch(e){cacheError='캐시 저장 실패';}
      if(installed||interacted){return report({action:'staged-update',version:installed,available:store.version,saved,cacheError});}
      install(store);
      return report({action:'installed-new',version:store.version,saved,cacheError});
    }catch(e){
      const error=String(e.message||e);
      if(cached){try{install(cached);return report({action:'offline-cache',version:cached.version,error,cacheError});}catch(installError){return report({action:'execution-failed',error:String(installError.message||installError)});}}
      return report({action:'first-load-failed',error,cacheError});
    }finally{detach();}
  }
  return {run,compare,header};
}
