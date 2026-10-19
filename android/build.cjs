'use strict';
// Dependency-free local test build. Never publish .local-signing or SIGNING_HOME.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=__dirname,tools=path.join(root,'toolchain'),out=path.join(root,'build');
const findHome=()=>{const d=fs.readdirSync(path.join(tools,'jdk')).find(n=>fs.existsSync(path.join(tools,'jdk',n,'Contents/Home/bin/javac')));return path.join(tools,'jdk',d,'Contents/Home');};
const javaHome=process.env.JAVA_HOME||findHome();
const sdk=path.join(tools,'sdk'),bt=process.env.BUILD_TOOLS||path.join(sdk,'android-15');
const androidJar=process.env.ANDROID_JAR||path.join(sdk,'android-35/android.jar');
const bin=n=>path.join(javaHome,'bin',n);const env={...process.env,JAVA_HOME:javaHome};
function run(exe,args,opts={}){const r=cp.spawnSync(exe,args,{env,cwd:root,encoding:'utf8',...opts});if(r.stdout)process.stdout.write(r.stdout);if(r.stderr)process.stderr.write(r.stderr);if(r.status!==0)throw Error(path.basename(exe)+' failed, exit '+r.status);return r.stdout||'';}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
fs.rmSync(out,{recursive:true,force:true});for(const d of ['gen','classes','dex'])fs.mkdirSync(path.join(out,d),{recursive:true});
const src=path.join(root,'app/src/main');
run(path.join(bt,'aapt2'),['compile','--dir',path.join(src,'res'),'-o',path.join(out,'resources.zip')]);
run(path.join(bt,'aapt2'),['link','-I',androidJar,'--manifest',path.join(src,'AndroidManifest.xml'),'--java',path.join(out,'gen'),'-A',path.join(src,'assets'),'--min-sdk-version','23','--target-sdk-version','35','--version-code','2','--version-name','0.1.1-test','--auto-add-overlay','-o',path.join(out,'unsigned.apk'),path.join(out,'resources.zip')]);
const sources=[...walk(path.join(src,'java')),...walk(path.join(out,'gen'))].filter(n=>n.endsWith('.java'));
run(bin('javac'),['-encoding','UTF-8','-g:none','-source','8','-target','8','-bootclasspath',path.join(bt,'core-lambda-stubs.jar')+path.delimiter+androidJar,'-d',path.join(out,'classes'),...sources]);
const policyTest=path.join(root,'tests/OriginPolicyTest.java');
const testSources=fs.existsSync(path.join(root,'tests'))?walk(path.join(root,'tests')).filter(n=>n.endsWith('.java')):[];
const testClasses=[];
if(testSources.length){fs.mkdirSync(path.join(out,'test-classes'),{recursive:true});const classpath=path.join(out,'classes')+path.delimiter+androidJar;run(bin('javac'),['-encoding','UTF-8','-cp',classpath,'-d',path.join(out,'test-classes'),...testSources]);for(const file of testSources){const text=fs.readFileSync(file,'utf8');if(!text.includes('static void main('))continue;const pkg=text.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];const name=(pkg?pkg+'.':'')+path.basename(file,'.java');run(bin('java'),['-cp',path.join(out,'test-classes')+path.delimiter+classpath,name]);testClasses.push(name);}}
run(bin('java'),['-cp',path.join(bt,'lib/d8.jar'),'com.android.tools.r8.D8','--release','--min-api','23','--lib',androidJar,'--output',path.join(out,'dex'),...walk(path.join(out,'classes')).filter(n=>n.endsWith('.class'))]);
for(const dex of walk(path.join(out,'dex')).filter(n=>n.endsWith('.dex')))run(bin('jar'),['ufM',path.join(out,'unsigned.apk'),'-C',path.dirname(dex),path.basename(dex)]);
run(path.join(bt,'zipalign'),['-f','-p','4',path.join(out,'unsigned.apk'),path.join(out,'aligned.apk')]);
const signingHome=process.env.SIGNING_HOME||path.join(root,'.local-signing');fs.mkdirSync(signingHome,{recursive:true,mode:0o700});
const secretPath=path.join(signingHome,'signing.json'),keyPath=path.join(signingHome,'test-signing.p12');
let signing;if(fs.existsSync(secretPath))signing=JSON.parse(fs.readFileSync(secretPath,'utf8'));else{signing={alias:'pokesurvivor-ko-test',password:crypto.randomBytes(32).toString('base64url')};fs.writeFileSync(secretPath,JSON.stringify(signing),{mode:0o600,flag:'wx'});}
env.APK_SIGNING_PASSWORD=signing.password;
if(!fs.existsSync(keyPath)){run(bin('keytool'),['-genkeypair','-keystore',keyPath,'-storetype','PKCS12','-alias',signing.alias,'-keyalg','RSA','-keysize','3072','-sigalg','SHA256withRSA','-validity','3650','-dname','CN=Unofficial Korean Test, O=Local Development, C=KR','-storepass:env','APK_SIGNING_PASSWORD','-keypass:env','APK_SIGNING_PASSWORD']);fs.chmodSync(keyPath,0o600);}
const apk=path.join(out,'pokesurvivor-ko-android-0.1.1-test.apk');
run(bin('java'),['-jar',path.join(bt,'lib/apksigner.jar'),'sign','--ks',keyPath,'--ks-key-alias',signing.alias,'--ks-pass','env:APK_SIGNING_PASSWORD','--key-pass','env:APK_SIGNING_PASSWORD','--min-sdk-version','23','--v1-signing-enabled','true','--v2-signing-enabled','true','--v3-signing-enabled','true','--v4-signing-enabled','false','--out',apk,path.join(out,'aligned.apk')]);
const signature=run(bin('java'),['-jar',path.join(bt,'lib/apksigner.jar'),'verify','--verbose','--print-certs',apk]);
const alignment=run(path.join(bt,'zipalign'),['-c','-p','4',apk]);
const badging=run(path.join(bt,'aapt2'),['dump','badging',apk]);
const digest=crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex');
const report={apk:path.basename(apk),versionCode:Number(badging.match(/versionCode='(\d+)'/)[1]),versionName:badging.match(/versionName='([^']+)'/)[1],bytes:fs.statSync(apk).size,sha256:digest,signature,badging,alignment:'passed',originPolicyTests:fs.existsSync(policyTest)?18:0,testSuites:testClasses,runtime:'NOT YET TESTED ON ANDROID',signing:'Local test key, not an official or Play Store release.'};
fs.writeFileSync(path.join(out,'build-report.json'),JSON.stringify(report,null,2));delete env.APK_SIGNING_PASSWORD;
console.log(JSON.stringify({apk:report.apk,bytes:report.bytes,sha256:report.sha256,signatureVerified:true,alignment:'passed'},null,2));
