const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = Number(process.env.PORT || 4173);
const HOST = '0.0.0.0';
const PUBLIC = __dirname;
const API = 'https://testnet.vibevibe.fun/api/v1/chains/46630';
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};

function send(res, code, body, type='application/json; charset=utf-8', headers={}) {
  res.writeHead(code, {'content-type': type, 'cache-control':'no-store', 'x-content-type-options':'nosniff', ...headers});
  res.end(body);
}
function proxy(res, upstreamPath) {
  const req = https.get(API + upstreamPath, {headers:{accept:'application/json','user-agent':'VibeLens/1.0'}}, up => {
    let chunks=[]; up.on('data', c=>chunks.push(c)); up.on('end',()=>{
      const body=Buffer.concat(chunks);
      res.writeHead(up.statusCode || 502, {'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=15','access-control-allow-origin':'*'});
      res.end(body);
    });
  });
  req.setTimeout(12000,()=>req.destroy(new Error('upstream timeout')));
  req.on('error', e=>send(res,502,JSON.stringify({error:'UPSTREAM_UNAVAILABLE',message:e.message})));
}

http.createServer((req,res)=>{
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') return send(res,200,JSON.stringify({ok:true,service:'vibelens'}));
  if (url.pathname === '/api/board') {
    const allowed = new Set(['TRENDING','NEW','FINAL_STRETCH','GRADUATED','MOVERS']);
    const tab = allowed.has(url.searchParams.get('tab')) ? url.searchParams.get('tab') : 'TRENDING';
    const requested = Number(url.searchParams.get('limit')) || 20;
    const limit = requested > 20 ? 40 : 20; // upstream accepts fixed page sizes
    return proxy(res, `/board?tab=${tab}&limit=${limit}&page=1&include=shelf`);
  }
  if (url.pathname === '/api/builders') return proxy(res, '/builders?limit=8&offset=0');
  if (url.pathname === '/api/score-method') return send(res,200,JSON.stringify({version:'1.0',principle:'Evidence, not hype',weights:{productProof:30,marketHealth:25,communityQuality:20,creatorContext:15,dataConfidence:10},notInvestmentAdvice:true}));

  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  file = path.normalize(file).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(PUBLIC, file);
  if (!full.startsWith(PUBLIC)) return send(res,403,'Forbidden','text/plain');
  fs.readFile(full,(err,data)=>{
    if (err) {
      if (!path.extname(file)) return fs.readFile(path.join(PUBLIC,'index.html'),(e,d)=> e ? send(res,404,'Not found','text/plain') : send(res,200,d,'text/html; charset=utf-8'));
      return send(res,404,'Not found','text/plain');
    }
    send(res,200,data,MIME[path.extname(full)] || 'application/octet-stream', {'cache-control':'public, max-age=300'});
  });
}).listen(PORT,HOST,()=>console.log(`VibeLens listening on http://${HOST}:${PORT}`));
