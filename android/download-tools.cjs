'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=__dirname,tools=path.join(root,'toolchain');
const jdk=JSON.parse(fs.readFileSync(path.join(tools,'jdk-metadata.json')))[0].binary.package;
const sdk=JSON.parse(fs.readFileSync(path.join(tools,'sdk-downloads.json')));
const downloads=[{name:'jdk.tar.gz',url:jdk.link,hash:jdk.checksum,algorithm:'sha256'},...sdk.map(x=>({name:x.archive.url,url:'https://dl.google.com/android/repository/'+x.archive.url,hash:x.archive.checksum,algorithm:'sha1'}))];
function run(command,args){const r=cp.spawnSync(command,args,{stdio:'inherit'});if(r.status!==0)throw Error(command+' failed '+r.status);}
for(const d of downloads){const dest=path.join(tools,d.name);if(!fs.existsSync(dest))run('curl',['--fail','--location','--retry','2','--silent','--show-error','--output',dest,d.url]);const actual=crypto.createHash(d.algorithm).update(fs.readFileSync(dest)).digest('hex');if(actual!==d.hash)throw Error('Checksum mismatch: '+d.name);console.log('Verified '+d.name);}
fs.mkdirSync(path.join(tools,'jdk'),{recursive:true});run('tar',['-xzf',path.join(tools,'jdk.tar.gz'),'-C',path.join(tools,'jdk')]);
fs.mkdirSync(path.join(tools,'sdk'),{recursive:true});for(const d of downloads.filter(x=>x.name.endsWith('.zip')))run('unzip',['-q','-o',path.join(tools,d.name),'-d',path.join(tools,'sdk')]);
console.log('Official toolchain downloaded and checksum-verified.');
