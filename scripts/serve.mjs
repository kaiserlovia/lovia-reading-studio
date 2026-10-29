import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root=resolve(import.meta.dirname,'../dist'),port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png'};
createServer(async(req,res)=>{
  try{
    if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}
    const url=new URL(req.url,'http://localhost'),path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!path.startsWith(root+sep))throw Error('Invalid path');
    const file=await stat(path);if(!file.isFile())throw Error('Not a file');
    res.writeHead(200,{'Content-Type':types[extname(path).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(path));
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Lovia preview: http://127.0.0.1:${port}`));
