'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const template=fs.readFileSync(path.join(root,'site/index.template.html'),'utf8');
for(const token of ['{{PSKO_VERSION}}','{{PSKO_LOADER_VERSION}}'])if(!template.includes(token))throw Error('Site version template missing: '+token);
fs.writeFileSync(path.join(root,'site/index.html'),template.replaceAll('{{PSKO_VERSION}}',pkg.version).replaceAll('{{PSKO_LOADER_VERSION}}',pkg.autoLoaderVersion));
console.log({siteVersion:pkg.version,iphoneLoaderVersion:pkg.autoLoaderVersion});
