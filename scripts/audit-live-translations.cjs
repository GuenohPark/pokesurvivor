'use strict';
// Optional read-only network audit. Never accesses player/account/save endpoints.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
(async()=>{
 const source={};await Promise.all(['pokedex','moves','items','lang-en'].map(async key=>{const url='https://pokesurvivor.com/js/data/'+key+'.js';const r=await fetch(url+'?ko-audit='+Date.now(),{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(key+' HTTP '+r.status);const code=await r.text();if(code.length>500000||/^\s*</.test(code))throw Error('Unexpected static source '+key);source[key]={url,code,sha256:crypto.createHash('sha256').update(code).digest('hex')};}));
 const ctx=vm.createContext(Object.create(null),{codeGeneration:{strings:false,wasm:false}});vm.runInContext('globalThis.G={I18n:{add:d=>globalThis.dictionary=d}}',ctx);for(const key of ['pokedex','moves','items','lang-en'])new vm.Script(source[key].code,{filename:key+'.js'}).runInContext(ctx,{timeout:1500});
 const game=JSON.parse(vm.runInContext('JSON.stringify({dictionary,species:G.DEX.map(p=>p.name),moves:G.Moves.ALL.map(m=>m.name),evolved:Object.values(G.Moves.EVO).map(r=>r[0]),items:G.Items.LIST.map(m=>m.name)})',ctx));
 const locale=read('data/dictionary.ko.json'),names=read('data/official-names.ko.json');const known=new Set([...locale.entries.flatMap(e=>[e.es,e.en]),...Object.values(names.names).flatMap(m=>Object.keys(m))]);const missing=[...new Set([...Object.entries(game.dictionary).flat(),...game.species,...game.moves,...game.evolved,...game.items])].filter(s=>typeof s==='string'&&!known.has(s));
 console.log(JSON.stringify({passed:missing.length===0,checkedAt:new Date().toISOString(),baseMoves:game.moves.length,evolvedLabels:game.evolved.length,species:game.species.length,englishPairs:Object.keys(game.dictionary).length,missingExactLabels:missing,source:Object.fromEntries(Object.entries(source).map(([k,v])=>[k,{url:v.url,sha256:v.sha256}]))},null,2));if(missing.length)process.exitCode=1;
})().catch(e=>{console.error('Public-source audit failed: '+e.message);process.exitCode=1;});
