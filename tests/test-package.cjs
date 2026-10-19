'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),zlib=require('zlib'),crypto=require('crypto'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
const {createZip,crc32,extensionLicense,extensionNotices,packageExtension,EXTENSION_FILES}=require('../scripts/package-extension.cjs');
const read=file=>fs.readFileSync(path.join(root,file));
// Deliberately independent bit-at-a-time CRC implementation for reader checks.
function checksum(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c&1)?(c>>>1)^0xedb88320:c>>>1;}return (c^0xffffffff)>>>0;}
function unpack(zip){
 const end=zip.length-22;assert(end>=0);assert.strictEqual(zip.readUInt32LE(end),0x06054b50);
 assert.strictEqual(zip.readUInt32LE(end+4),0);assert.strictEqual(zip.readUInt16LE(end+20),0);
 const count=zip.readUInt16LE(end+10),directory=zip.readUInt32LE(end+16),size=zip.readUInt32LE(end+12);
 assert.strictEqual(zip.readUInt16LE(end+8),count);assert.strictEqual(directory+size,end);
 const result=new Map();let pos=directory,nextLocal=0;
 for(let i=0;i<count;i++){
  assert.strictEqual(zip.readUInt32LE(pos),0x02014b50);
  assert.strictEqual(zip.readUInt16LE(pos+8),0);assert.strictEqual(zip.readUInt16LE(pos+10),8);
  assert.strictEqual(zip.readUInt16LE(pos+12),0);assert.strictEqual(zip.readUInt16LE(pos+14),33);
  const crc=zip.readUInt32LE(pos+16),packedSize=zip.readUInt32LE(pos+20),dataSize=zip.readUInt32LE(pos+24),nameSize=zip.readUInt16LE(pos+28),local=zip.readUInt32LE(pos+42);
  assert.strictEqual(zip.readUInt16LE(pos+30),0);assert.strictEqual(zip.readUInt16LE(pos+32),0);assert.strictEqual(zip.readUInt32LE(pos+38),0);
  const name=zip.subarray(pos+46,pos+46+nameSize).toString('ascii');
  assert(/^[\x20-\x7e]+$/.test(name));assert(!name.includes('..'));assert(!result.has(name));assert.strictEqual(local,nextLocal);
  assert.strictEqual(zip.readUInt32LE(local),0x04034b50);assert.strictEqual(zip.readUInt16LE(local+6),0);assert.strictEqual(zip.readUInt16LE(local+8),8);
  assert.strictEqual(zip.readUInt16LE(local+10),0);assert.strictEqual(zip.readUInt16LE(local+12),33);
  assert.strictEqual(zip.readUInt32LE(local+14),crc);assert.strictEqual(zip.readUInt32LE(local+18),packedSize);assert.strictEqual(zip.readUInt32LE(local+22),dataSize);
  assert.strictEqual(zip.readUInt16LE(local+26),nameSize);assert.strictEqual(zip.readUInt16LE(local+28),0);
  assert.strictEqual(zip.subarray(local+30,local+30+nameSize).toString('ascii'),name);
  const start=local+30+nameSize,body=zlib.inflateRawSync(zip.subarray(start,start+packedSize));assert.strictEqual(body.length,dataSize);assert.strictEqual(checksum(body),crc,'CRC: '+name);
  result.set(name,body);nextLocal=start+packedSize;pos+=46+nameSize;
 }
 assert.strictEqual(pos,end);assert.strictEqual(nextLocal,directory);return result;
}
assert.strictEqual(crc32(Buffer.from('123456789')),0xcbf43926);
assert.strictEqual(crc32(Buffer.alloc(0)),0);
const zip=read('dist/pokesurvivor-ko-desktop-extension.zip'),entries=unpack(zip);
assert.strictEqual(entries.size,11);
assert.deepStrictEqual([...entries.keys()],EXTENSION_FILES.map(f=>'extension/'+f));
for(const [name,body]of entries)assert(body.equals(read(name)),'ZIP round trip: '+name);
const manifest=JSON.parse(entries.get('extension/manifest.json'));
for(const name of [manifest.background.service_worker,...manifest.content_scripts.flatMap(s=>s.js)]){assert(!name.includes('/'));assert(entries.has('extension/'+name));}
assert.strictEqual(manifest.version,JSON.parse(read('package.json')).version);
assert(entries.get('extension/pokesurvivor-ko-menu.user.js').equals(read('dist/pokesurvivor-ko-menu.user.js')));
assert.strictEqual(entries.get('extension/LICENSE').toString(),extensionLicense(read('LICENSE').toString()));
assert.strictEqual(entries.get('extension/THIRD-PARTY-NOTICES.md').toString(),extensionNotices(read('docs/THIRD-PARTY-NOTICES.md').toString()));
// Every local Markdown destination must exist within the standalone archive.
let localLinkChecks=0;
for(const name of ['extension/README.md','extension/THIRD-PARTY-NOTICES.md']){
 for(const match of entries.get(name).toString().matchAll(/\]\(([^\s)]+)(?:[^)]*)\)|^\s*\[[^\]]+\]:\s*(\S+)/gm)){
  const target=match[1]||match[2];if(/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target))continue;
  const file=target.split(/[?#]/)[0];const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(name),file));assert(entries.has(resolved)||[...entries.keys()].some(entry=>entry.startsWith(resolved.replace(/\/$/,'')+'/')),'standalone link: '+name+' -> '+target);localLinkChecks++;
 }
}
assert.strictEqual(extensionLicense('See docs/THIRD-PARTY-NOTICES.md and licenses/Galmuri-LICENSE.txt.'),'See THIRD-PARTY-NOTICES.md and licenses/Galmuri-LICENSE.txt.');
assert.strictEqual(extensionNotices('[license](../licenses/PokeAPI-LICENSE.md) [data](../data/names-provenance.json) [source](../src/runtime-core.js)'),
 '[license](licenses/PokeAPI-LICENSE.md) [data](https://github.com/GuenohPark/pokesurvivor/blob/main/data/names-provenance.json) [source](https://github.com/GuenohPark/pokesurvivor/blob/main/src/runtime-core.js)');
const reordered=createZip([...entries].reverse().map(([name,data])=>({name,data})));assert(reordered.equals(zip),'entry order must not affect ZIP bytes');
const corrupt=Buffer.from(zip),central=corrupt.readUInt32LE(corrupt.length-6);corrupt.writeUInt32LE(0,14);corrupt.writeUInt32LE(0,central+16);assert.throws(()=>unpack(corrupt),/CRC/);
for(const name of ['../escape','/absolute','a/../b','a\\b','한글'])assert.throws(()=>createZip([{name,data:Buffer.alloc(0)}]));
assert.throws(()=>createZip([{name:'same',data:Buffer.alloc(0)},{name:'same',data:Buffer.alloc(0)}]));
// A full build may regenerate distributables, but must never edit author docs.
const protectedFiles=['README.md','LICENSE',...fs.readdirSync(path.join(root,'docs')).map(f=>'docs/'+f),'extension/README.md'];
const protectedBefore=new Map(protectedFiles.map(f=>[f,read(f)]));
const built=cp.spawnSync(process.execPath,[path.join(root,'scripts/build.cjs')],{cwd:root,encoding:'utf8'});
assert.strictEqual(built.status,0,built.stdout+built.stderr);
assert(read('dist/pokesurvivor-ko-desktop-extension.zip').equals(zip),'full build ZIP reproducibility');
for(const [file,body]of protectedBefore)assert(read(file).equals(body),'build changed author file: '+file);
// Exercise fallback creation and preservation in an isolated disposable fixture.
const fixture=fs.mkdtempSync(path.join(root,'tests','.package-fixture-'));
try{
 fs.mkdirSync(path.join(fixture,'docs'));fs.cpSync(path.join(root,'extension'),path.join(fixture,'extension'),{recursive:true});
 fs.copyFileSync(path.join(root,'LICENSE'),path.join(fixture,'LICENSE'));fs.copyFileSync(path.join(root,'docs/THIRD-PARTY-NOTICES.md'),path.join(fixture,'docs/THIRD-PARTY-NOTICES.md'));
 fs.unlinkSync(path.join(fixture,'extension/README.md'));packageExtension(fixture);assert(fs.readFileSync(path.join(fixture,'extension/README.md'),'utf8').includes('Load unpacked'));
 const custom='# Author-owned extension README\n';fs.writeFileSync(path.join(fixture,'extension/README.md'),custom);packageExtension(fixture);assert.strictEqual(fs.readFileSync(path.join(fixture,'extension/README.md'),'utf8'),custom);
}finally{fs.rmSync(fixture,{recursive:true,force:true});}
console.log(JSON.stringify({result:'passed',zipEntries:entries.size,zipBytes:zip.length,crcAndRoundTripChecks:entries.size,localLinkChecks,manifestResourceChecks:3,fullBuildReproducible:true,reverseInputOrderReproducible:true,protectedAuthorFiles:protectedFiles.length,readmeFallbackAndPreservation:true,corruptionRejected:true,unsafeOrDuplicateNamesRejected:6,sha256:crypto.createHash('sha256').update(zip).digest('hex')},null,2));
