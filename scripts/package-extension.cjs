'use strict';
// Dependency-free classic ZIP writer: sorted ASCII paths, raw DEFLATE, CRC32,
// and the fixed DOS timestamp 1980-01-01 00:00:00. No host metadata is stored.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=path.resolve(__dirname,'..');
const REPO='https://github.com/GuenohPark/pokesurvivor/blob/main/';
const EXTENSION_FILES=[
 'LICENSE','README.md','THIRD-PARTY-NOTICES.md','extension-background.js',
 'extension-content.js','extension-main.js','manifest.json','pokesurvivor-ko-menu.user.js',
 'licenses/GAME-LICENSE-NONCOMMERCIAL.md','licenses/Galmuri-LICENSE.txt','licenses/PokeAPI-LICENSE.md',
].sort();
const table=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=table[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
function createZip(entries){
 if(entries.length>65535)throw Error('ZIP64 is not supported');
 const locals=[],central=[];let offset=0;
 const seen=new Set();
 for(const entry of [...entries].sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
  if(!/^[\x20-\x7e]+$/.test(entry.name)||entry.name.startsWith('/')||entry.name.includes('\\')||entry.name.split('/').some(p=>!p||p==='.'||p==='..')||seen.has(entry.name))throw Error('Unsafe or duplicate ZIP name: '+entry.name);
  seen.add(entry.name);
  const name=Buffer.from(entry.name,'ascii'),data=Buffer.from(entry.data),packed=zlib.deflateRawSync(data,{level:9}),crc=crc32(data);
  if(name.length>65535||data.length>0xffffffff||packed.length>0xffffffff||offset>0xffffffff)throw Error('ZIP64 is not supported');
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
  locals.push(local,name,packed);
  const header=Buffer.alloc(46);header.writeUInt32LE(0x02014b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(20,6);header.writeUInt16LE(8,10);header.writeUInt16LE(33,14);header.writeUInt32LE(crc,16);header.writeUInt32LE(packed.length,20);header.writeUInt32LE(data.length,24);header.writeUInt16LE(name.length,28);header.writeUInt32LE(offset,42);central.push(header,name);
  offset+=local.length+name.length+packed.length;
 }
 const directory=Buffer.concat(central);
 if(offset+directory.length>0xffffffff)throw Error('ZIP64 is not supported');
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,directory,end]);
}
function extensionLicense(text){
 return text.replace(/(?:\.\.\/)?docs\/THIRD-PARTY-NOTICES\.md/g,'THIRD-PARTY-NOTICES.md').replace(/(?<![\w/.-])Galmuri-LICENSE\.txt/g,'licenses/Galmuri-LICENSE.txt');
}
function extensionNotices(text){
 const localLicenses=['GAME-LICENSE-NONCOMMERCIAL.md','Galmuri-LICENSE.txt','PokeAPI-LICENSE.md'];
 function destination(target){
  if(/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target))return target;
  const [file,...tail]=target.split(/(?=[?#])/),suffix=tail.join('');
  if(localLicenses.includes(file))return 'licenses/'+file+suffix;
  if(file==='LICENSE')return 'LICENSE'+suffix;
  const resolved=path.posix.normalize(path.posix.join('docs',file));
  if(resolved==='LICENSE')return 'LICENSE'+suffix;
  if(resolved==='docs/THIRD-PARTY-NOTICES.md')return 'THIRD-PARTY-NOTICES.md'+suffix;
  if(resolved.startsWith('licenses/'))return resolved+suffix;
  if(resolved.startsWith('extension/')&&EXTENSION_FILES.includes(resolved.slice(10)))return resolved.slice(10)+suffix;
  if(resolved.startsWith('../')||resolved.startsWith('/'))throw Error('Notice link escapes repository: '+target);
  return REPO+resolved+suffix;
 }
 // Markdown links and reference definitions, including the parent's ../data links.
 let result=text.replace(/(\]\()([^\s)]+)([^)]*\))/g,(_,a,url,b)=>a+destination(url)+b)
  .replace(/^(\s*\[[^\]]+\]:\s*)(\S+)/gm,(_,a,url)=>a+destination(url));
 // Older notices name these files in prose rather than Markdown links.
 for(const file of localLicenses)result=result.replace(new RegExp('(?<![\\w/.-])(?<!\\[)'+file.replaceAll('.','\\.'),'g'),'licenses/'+file);
 result=result.replace(/(?<![\w/.-])(?<!\[)names-provenance\.json/g,REPO+'data/names-provenance.json');
 return result;
}
function packageExtension(root=ROOT){
 const read=file=>fs.readFileSync(path.join(root,file),'utf8');
 const write=(file,data)=>fs.writeFileSync(path.join(root,file),data);
 const readme=path.join(root,'extension/README.md');
 if(!fs.existsSync(readme)){
  try{fs.writeFileSync(readme,'# PokéSurvivor Korean desktop extension\n\nExtract this ZIP and load the enclosed `extension` directory as an unpacked extension in desktop Chromium (Developer mode, Load unpacked). Open https://pokesurvivor.com/ and refresh.\n\nThis is not an iPhone installer. Safari requires conversion, signing, and device validation. Do not enable another Korean patch at the same time.\n\nSee [LICENSE](LICENSE) and [third-party notices](THIRD-PARTY-NOTICES.md).\n',{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
 }
 write('extension/LICENSE',extensionLicense(read('LICENSE')));
 write('extension/THIRD-PARTY-NOTICES.md',extensionNotices(read('docs/THIRD-PARTY-NOTICES.md')));
 const entries=EXTENSION_FILES.map(file=>{
  const location=path.join(root,'extension',file);if(!fs.lstatSync(location).isFile())throw Error('Extension resource must be a regular file: '+file);
  return {name:'extension/'+file,data:fs.readFileSync(location)};
 });
 const zip=createZip(entries);fs.mkdirSync(path.join(root,'dist'),{recursive:true});write('dist/pokesurvivor-ko-desktop-extension.zip',zip);
 console.log(`Packaged desktop extension: ${entries.length} files, ${zip.length} bytes.`);
 return zip;
}
module.exports={crc32,createZip,extensionLicense,extensionNotices,packageExtension,EXTENSION_FILES};
if(require.main===module)packageExtension();
