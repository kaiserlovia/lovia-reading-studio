import { readdir, readFile, stat, mkdir, cp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..');
const entries=await readdir(root,{withFileTypes:true});
const files=entries.filter(e=>e.isFile()&&/\.(html|js|css|png|jpe?g)$/i.test(e.name));
for(const file of files.filter(f=>f.name.endsWith('.js'))){
  new vm.Script(await readFile(join(root,file.name),'utf8'),{filename:file.name});
}
for(const page of ['index.html','daynight.html','studio.html']){
  const html=await readFile(join(root,page),'utf8');
  for(const [i,match]of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].entries()){
    if(!/\bsrc=/.test(match[1])&&!/\btype=/.test(match[1]))new vm.Script(match[2],{filename:page+':script'+i});
  }
  for(const [,url]of html.matchAll(/(?:src|href)="(\.\/[^"#?]+)(?:\?[^"#]*)?"/g))await stat(resolve(root,url));
}
const out=join(root,'dist');await mkdir(out,{recursive:true});
for(const f of files)await cp(join(root,f.name),join(out,f.name));
await cp(join(root,'assets'),join(out,'assets'),{recursive:true});
console.log(`Built ${files.length} static files and assets; active JavaScript and local references validated.`);
