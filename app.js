const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let launches = [], activeTab = 'TRENDING';

const escapeHTML = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const short = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : '—';
const units = v => { const n = Number(v || 0) / 1e18; return n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : n.toFixed(n<10?2:0); };
const ipfs = uri => uri?.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${uri.slice(7)}` : uri;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

function unpack(item){ return item?.launch || item; }
function evidence(l){
  const m=l.market||{}, c=l.content||{}, socials=c.socials||{};
  const desc=(c.description||'').trim();
  const trades=(m.buyCount24h||0)+(m.sellCount24h||0);
  const buyRatio=trades ? (m.buyCount24h||0)/trades : .5;
  const progress=clamp(Number(l.curve?.pairReserveUnits||0)/Number(l.targetPairUnits||1),0,1);
  const socialCount=Object.values(socials).filter(Boolean).length;
  const signals=[];
  const add=(ok,label,pts,detail)=>signals.push({ok,label,pts:ok?pts:0,max:pts,detail});
  add(desc.length>=40,'Meaningful project description',12,desc.length>=40?`${desc.length} characters of public context`:'Little or no public context');
  add(socialCount>=1,'Verifiable project link',10,socialCount?`${socialCount} public link${socialCount>1?'s':''}`:'No website or social link');
  add(Boolean(socials.website||socials.github),'Build artifact or website',8,(socials.website||socials.github)?'A product surface is linked':'No website/GitHub evidence in metadata');
  add((m.holderCount||0)>=12,'Participation breadth',10,`${m.holderCount||0} recorded holders`);
  add(trades>=20,'Active price discovery',8,`${trades} trades in the 24h window`);
  add(buyRatio>=.25&&buyRatio<=.8,'Balanced trade direction',7,trades?`${Math.round(buyRatio*100)}% buys`:'Not enough trade data');
  add(progress>=.12,'Curve commitment',10,`${Math.round(progress*100)}% of target reserve`);
  add(l.lifecycle==='GRADUATED','Graduated lifecycle',8,l.lifecycle==='GRADUATED'?'Graduation completed':'Still in testnet discovery');
  add(Boolean(l.launcherAddress),'Creator is attributable',9,l.launcherAddress?short(l.launcherAddress):'Creator unavailable');
  add(m.complete!==false,'Complete market snapshot',10,m.complete!==false?'Market snapshot reports complete':'Partial market snapshot');
  add(Boolean(l.asOfBlock),'Block-anchored freshness',8,l.asOfBlock?`As of block ${l.asOfBlock}`:'No block anchor');
  const score=clamp(signals.reduce((s,x)=>s+x.pts,0),0,100);
  return {score,signals,progress,trades,buyRatio};
}
function grade(score){return score>=82?['A','a']:score>=68?['B','b']:score>=52?['C','c']:['D','d'];}
function card(item){
  const l=unpack(item), ev=evidence(l), [g,cl]=grade(ev.score), img=ipfs(l.content?.image?.uri);
  return `<article class="launch-card" data-token="${escapeHTML(l.tokenAddress)}" tabindex="0" role="button" aria-label="Analyze ${escapeHTML(l.name)}">
    <div class="card-top"><div class="token-icon">${img?`<img src="${escapeHTML(img)}" alt="" loading="lazy" onerror="this.remove()">`:escapeHTML((l.symbol||'?').slice(0,2))}</div><span class="grade ${cl}">${g} / ${ev.score}</span></div>
    <h3>${escapeHTML(l.name||'Unnamed launch')}</h3><span class="symbol">$${escapeHTML(l.symbol||'—')} · ${escapeHTML(l.pairSymbol||'ETH')}</span>
    <p class="desc">${escapeHTML(l.content?.description||'No project description supplied. Evidence is limited.')}</p>
    <div class="stats"><div><span>HOLDERS</span><b>${(l.market?.holderCount||0).toLocaleString()}</b></div><div><span>24H TRADES</span><b>${ev.trades.toLocaleString()}</b></div></div>
    <div class="progress" title="Curve reserve progress"><i style="width:${Math.round(ev.progress*100)}%"></i></div>
  </article>`;
}
function render(){
  const q=$('#search').value.trim().toLowerCase();
  const filtered=launches.filter(x=>{const l=unpack(x);return `${l.name} ${l.symbol} ${l.tokenAddress} ${l.launcherAddress}`.toLowerCase().includes(q)});
  $('#launchGrid').innerHTML=filtered.length?filtered.map(card).join(''):'<div class="loading">No launches match this filter.</div>';
  $$('.launch-card').forEach(el=>{const open=()=>showReport(el.dataset.token);el.onclick=open;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}});
}
async function loadBoard(tab=activeTab){
  activeTab=tab; $('#sourceState').textContent='Reading public API…'; $('#sourceState').className='source-state';
  $('#launchGrid').innerHTML='<div class="loading"><i></i>Reading public launch data…</div>';
  try{
    const r=await fetch(`/api/board?tab=${encodeURIComponent(tab)}&limit=24`); const j=await r.json();
    if(!r.ok||!j.data?.items) throw new Error(j.error?.message||'Source unavailable');
    launches=j.data.items; render();
    const avg=launches.length?Math.round(launches.reduce((s,x)=>s+evidence(unpack(x)).score,0)/launches.length):0;
    $('#healthScore').textContent=avg; $('#scanCount').textContent=(j.data.page?.totalCount||launches.length).toLocaleString();
    $('#pulseTime').textContent='LIVE / '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    $('#sourceState').textContent=`Live · ${launches.length} launches · public source`; $('#sourceState').className='source-state ok';
  }catch(e){
    $('#sourceState').textContent='Source temporarily unavailable'; $('#sourceState').className='source-state error';
    $('#launchGrid').innerHTML=`<div class="loading">Could not read the public API. ${escapeHTML(e.message)} — retry shortly.</div>`;
  }
}
async function loadBuilders(){
  try{const r=await fetch('/api/builders');const j=await r.json();const d=j.data;
    $('#builderCount').textContent=(d.page?.totalCount||0).toLocaleString();
    $('#builderTable').innerHTML=`<div class="builder-row head"><span>RANK</span><span>CREATOR</span><span>LAUNCHES</span><span>BEST CURRENT</span><span>BUILD PACE</span></div>`+(d.items||[]).map(b=>`<div class="builder-row"><span class="rank">#${b.rank}</span><span class="address" title="${b.creatorAddress}">${short(b.creatorAddress)}</span><b>${b.launchCount}</b><span>${escapeHTML(b.bestCurrent?.symbol||'UNRANKED')}</span><span class="dim">${escapeHTML(b.pace?.label||'—')}</span></div>`).join('');
  }catch{$('#builderTable').innerHTML='<div class="loading">Builder context unavailable.</div>'}
}
function showReport(token){
  const item=launches.find(x=>unpack(x).tokenAddress===token);if(!item)return;
  const l=unpack(item),ev=evidence(l),[g]=grade(ev.score),img=ipfs(l.content?.image?.uri),socials=l.content?.socials||{};
  const summary=ev.score>=82?'Strong visible evidence across product context, participation and data quality. Verify linked artifacts independently.':ev.score>=68?'Healthy public signals, with some evidence gaps worth checking before interaction.':ev.score>=52?'Mixed evidence. The launch has activity, but important proof or participation signals are missing.':'Limited public evidence. Treat the score as a prompt for deeper verification, not a verdict.';
  $('#report').innerHTML=`<div class="report-wrap"><div class="report-hero"><div class="token-icon">${img?`<img src="${escapeHTML(img)}" alt="">`:escapeHTML((l.symbol||'?').slice(0,2))}</div><div><h2>${escapeHTML(l.name)}</h2><span class="symbol">$${escapeHTML(l.symbol)} · ${short(l.tokenAddress)}</span></div><div class="score-box"><strong>${ev.score}</strong><span>GRADE ${g} / 100</span></div></div>
  <p class="report-summary">${summary}</p><div class="signal-list">${ev.signals.map(s=>`<div class="signal"><span class="${s.ok?'yes':'no'}">${s.ok?'●':'○'}</span><span>${escapeHTML(s.label)}<small style="display:block;color:#738078;margin-top:4px">${escapeHTML(s.detail)}</small></span><b>${s.pts}/${s.max}</b></div>`).join('')}</div>
  <div class="report-actions"><a href="https://testnet.vibevibe.fun/token/${l.tokenAddress}" target="_blank" rel="noreferrer">Open on vibe/vibe ↗</a>${socials.website?`<a href="${escapeHTML(socials.website)}" target="_blank" rel="noreferrer">Website ↗</a>`:''}${socials.x?`<a href="${escapeHTML(socials.x)}" target="_blank" rel="noreferrer">X profile ↗</a>`:''}</div></div>`;
  $('#reportDialog').showModal();
}
$$('.filters button').forEach(b=>b.onclick=()=>{$$('.filters button').forEach(x=>x.classList.remove('active'));b.classList.add('active');loadBoard(b.dataset.tab)});
$('#search').addEventListener('input',render);
$('#randomBtn').onclick=()=>{if(launches.length){showReport(unpack(launches[Math.floor(Math.random()*launches.length)]).tokenAddress);$('#scanner').scrollIntoView()}};
$('.close').onclick=()=>$('#reportDialog').close();
$('#reportDialog').addEventListener('click',e=>{if(e.target===$('#reportDialog'))$('#reportDialog').close()});
loadBoard();loadBuilders();
