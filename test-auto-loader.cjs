'use strict';
const fs=require('fs'),assert=require('assert');const root=__dirname;
const core=fs.readFileSync(root+'/auto-loader-core.js','utf8');const make=new Function(core+';return createPokesurvivorAutoLoader;')();
const bundle=(v,body='')=>'// ==UserScript==\n// @namespace pokesurvivor-ko-local-test\n// @version '+v+'\n// ==/UserScript==\n'+body;
const cached=v=>({version:v,code:bundle(v)});const reports=[];
async function scenario(name,options,expect){
 let cache=options.cache||null,handler=()=>{},metaCalls=0,bundleCalls=0,writes=0;const executed=[];
 const env={getCache:async()=>cache,setCache:async r=>{if(options.cacheFail)throw Error('quota');writes++;cache=r;},
 fetchMeta:async()=>{metaCalls++;if(options.interactAt==='meta')handler();if(options.offline)throw Error('offline');return bundle(options.remote||'0.4.1');},
 fetchBundle:async v=>{bundleCalls++;if(options.interactAt==='bundle')handler();return options.badHTML?'<html>error</html>':bundle(options.payloadVersion||v,options.badSyntax?'function {':'');},
 compile:s=>new Function(s),execute:(fn,v)=>{executed.push(v);fn();},otherPatch:()=>!!options.duplicate,
 onInteraction:fn=>{handler=fn;return()=>{handler=()=>{};};},status:()=>{}};
 const result=await make(env).run();assert.strictEqual(result.action,expect.action,name);
 if(expect.executed)assert.deepStrictEqual(executed,expect.executed,name+' executed');if(expect.bundleCalls!==undefined)assert.strictEqual(bundleCalls,expect.bundleCalls,name+' downloads');if(expect.cacheVersion)assert.strictEqual(cache.version,expect.cacheVersion,name+' cache');
 reports.push({name,action:result.action,version:result.version||null,available:result.available||null,metaCalls,bundleCalls,writes,executed});
}
(async()=>{
 const cmp=make({}).compare;assert(cmp('0.10.0','0.9.9')>0);assert(cmp('1.0.0','1.0.0-beta.2')>0);assert(cmp('1.0.0-beta.10','1.0.0-beta.2')>0);assert.strictEqual(cmp('0.4.1','0.4.1'),0);
 await scenario('first download',{}, {action:'installed-new',executed:['0.4.1'],bundleCalls:1,cacheVersion:'0.4.1'});
 await scenario('same version uses cached code',{cache:cached('0.4.1')},{action:'installed-cache',executed:['0.4.1'],bundleCalls:0});
 await scenario('newer version installs before input',{cache:cached('0.4.0')},{action:'installed-new',executed:['0.4.1'],bundleCalls:1,cacheVersion:'0.4.1'});
 await scenario('offline keeps cached version',{cache:cached('0.4.0'),offline:true},{action:'offline-cache',executed:['0.4.0'],bundleCalls:0});
 await scenario('no cache and offline',{offline:true},{action:'first-load-failed',executed:[],bundleCalls:0});
 await scenario('input while checking stages update',{cache:cached('0.4.0'),interactAt:'meta'},{action:'staged-update',executed:['0.4.0'],bundleCalls:1,cacheVersion:'0.4.1'});
 await scenario('first download after input waits until reload',{interactAt:'bundle'},{action:'staged-update',executed:[],bundleCalls:1,cacheVersion:'0.4.1'});
 await scenario('stale CDN metadata never downgrades',{cache:cached('0.4.1'),remote:'0.4.0'},{action:'installed-cache',executed:['0.4.1'],bundleCalls:0,cacheVersion:'0.4.1'});
 await scenario('meta/code version mismatch uses cache',{cache:cached('0.4.0'),payloadVersion:'0.3.0'},{action:'offline-cache',executed:['0.4.0'],cacheVersion:'0.4.0'});
 await scenario('HTML instead of JS is rejected',{cache:cached('0.4.0'),badHTML:true},{action:'offline-cache',executed:['0.4.0'],cacheVersion:'0.4.0'});
 await scenario('syntax failure is rejected',{cache:cached('0.4.0'),badSyntax:true},{action:'offline-cache',executed:['0.4.0'],cacheVersion:'0.4.0'});
 await scenario('duplicate old script does not run another copy',{duplicate:true},{action:'duplicate-script',executed:[],bundleCalls:0});
 await scenario('cache quota error does not block current installation',{cacheFail:true},{action:'installed-new',executed:['0.4.1'],bundleCalls:1});
 // Integration: GM is a lexical injected parameter, not globalThis.GM.
 const entry=fs.readFileSync(root+'/auto-loader-entry.js','utf8');let store=null,fullDownloads=0,metadataDownloads=0;
 for(let run=0;run<2;run++){
  const globals={},document={documentElement:{dataset:{}}};
  const gm={getValue:async()=>store,setValue:async(k,v)=>{store=v;},xmlHttpRequest:d=>{const isMeta=d.url.includes('.meta.js');if(isMeta)metadataDownloads++;else fullDownloads++;return Promise.resolve({status:200,responseText:bundle('0.4.1','globalThis.__PSKO_AUTO_TEST_EXECUTIONS=(globalThis.__PSKO_AUTO_TEST_EXECUTIONS||0)+1;')});}};
  const launch=new Function('GM','globalThis','document','location','addEventListener','removeEventListener','setTimeout','clearTimeout','console',core+'\n'+entry);
  launch(gm,globals,document,{hostname:'pokesurvivor.org'},()=>{},()=>{},setTimeout,clearTimeout,console);
  for(let i=0;i<100&&!['installed-new','installed-cache'].includes(globals.__PSKO_AUTO_STATUS?.action);i++)await new Promise(r=>setTimeout(r,2));
  assert(['installed-new','installed-cache'].includes(globals.__PSKO_AUTO_STATUS?.action));
 }
 assert.strictEqual(fullDownloads,1);assert.strictEqual(metadataDownloads,2);assert.strictEqual(globalThis.__PSKO_AUTO_TEST_EXECUTIONS,2);delete globalThis.__PSKO_AUTO_TEST_EXECUTIONS;
 const report={result:'passed',coreScenarios:reports.length,versionAssertions:4,gmLexicalParameterIntegration:{pageLoads:2,metadataDownloads,fullDownloads,executions:2},scenarios:reports,limitations:['These are deterministic Node tests, not physical iPhone execution.','No forced page reload or hot swap occurs after user input.']};
 fs.writeFileSync(root+'/auto-loader-tests.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
