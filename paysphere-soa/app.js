/* PaySphere SOA Control Room: all simulations run client-side, no dependencies. */
(() => {
"use strict";

/* ============================ utilities ============================ */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function makeRng(seed){
  const u = mulberry32(seed);
  const normal = (m=0,s=1) => { let a=0,b=0; while(a===0)a=u(); while(b===0)b=u(); return m + s*Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*b); };
  const lognormal = (mu,s) => Math.exp(normal(mu,s));
  const poisson = lam => { const L=Math.exp(-lam); let k=0,p=1; do{k++;p*=u();}while(p>L); return k-1; };
  const uniform = (a,b) => a + (b-a)*u();
  return {u, normal, lognormal, poisson, uniform};
}
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const C = {cyan:"#22d3ee",teal:"#14b8a6",blue:"#3b82f6",red:"#f43f5e",amber:"#f59e0b",green:"#22c55e",grid:"#1e293b",axis:"#64748b",text:"#94a3b8"};
const fmt = (x,d=1) => Number(x).toFixed(d);
const quantile = (arr,q) => { if(!arr.length) return 0; const s=[...arr].sort((a,b)=>a-b); return s[Math.min(s.length-1,Math.floor(q*s.length))]; };

function setupCanvas(cv){
  if(!cv.dataset.h) cv.dataset.h = cv.getAttribute("height");
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = +cv.dataset.h;
  cv.width = w*dpr; cv.height = h*dpr; cv.style.height = h+"px";
  const ctx = cv.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.font = "11px 'JetBrains Mono', monospace";
  return {ctx, w, h};
}
function axes(ctx, box, xr, yr, opts={}){
  const {x0,y0,x1,y1} = box;
  ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.fillStyle = C.axis;
  const yt = opts.yTicks || 5;
  for(let i=0;i<=yt;i++){
    const v = yr[0] + (yr[1]-yr[0])*i/yt, y = y1 - (y1-y0)*i/yt;
    ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
    ctx.textAlign="right"; ctx.textBaseline="middle"; ctx.fillText((opts.yFmt||(v=>v.toFixed(0)))(v), x0-6, y);
  }
  const xt = opts.xTicks || 6;
  for(let i=0;i<=xt;i++){
    const v = xr[0] + (xr[1]-xr[0])*i/xt, x = x0 + (x1-x0)*i/xt;
    ctx.textAlign="center"; ctx.textBaseline="top"; ctx.fillText((opts.xFmt||(v=>v.toFixed(0)))(v), x, y1+6);
  }
  if(opts.xLabel){ctx.textAlign="center";ctx.fillText(opts.xLabel,(x0+x1)/2,y1+24);}
  if(opts.yLabel){ctx.save();ctx.translate(12,(y0+y1)/2);ctx.rotate(-Math.PI/2);ctx.textAlign="center";ctx.textBaseline="top";ctx.fillText(opts.yLabel,0,-6);ctx.restore();}
}

/* ============================ router ============================ */
const inited = {}, onShow = {};
function route(){
  const id = (location.hash||"#overview").slice(1);
  const view = document.getElementById("view-"+id) ? id : "overview";
  $$(".view").forEach(v => v.classList.toggle("active", v.id === "view-"+view));
  $$(".nav a").forEach(a => a.classList.toggle("active", a.dataset.view === view));
  $("#sidebar").classList.remove("open");
  window.scrollTo({top:0});
  if(!inited[view] && INIT[view]){ inited[view] = true; INIT[view](); }
  if(onShow[view]) requestAnimationFrame(onShow[view]);
}
window.addEventListener("hashchange", route);
window.addEventListener("resize", () => { const v=(location.hash||"#overview").slice(1); if(onShow[v]) onShow[v](); });
$("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");

/* ============================ shared model ============================ */
const LAYERS = {
  "Consumer":["MobileApp","MerchantPOS","PartnerAPI"],
  "Gateway":["APIGateway","AuthZ-OAuth2"],
  "Orchestration":["PaymentOrchestrator","SagaCoordinator","EventBus"],
  "Business":["VPA-Resolver","FraudScoring","RiskEngine","Ledger","Notification","Rewards"],
  "Data/Infra":["CustomerDB","LedgerDB","FeatureStore","AuditLog"],
  "External":["NPCI-Switch","Bank-CBS","SMS-Provider"],
};
const LCOL = {"Consumer":"#60a5fa","Gateway":"#818cf8","Orchestration":"#a78bfa","Business":"#2dd4bf","Data/Infra":"#fbbf24","External":"#fb7185"};
const EDGES = [["MobileApp","APIGateway"],["MerchantPOS","APIGateway"],["PartnerAPI","APIGateway"],["APIGateway","AuthZ-OAuth2"],["APIGateway","PaymentOrchestrator"],["PaymentOrchestrator","VPA-Resolver"],["PaymentOrchestrator","FraudScoring"],["PaymentOrchestrator","SagaCoordinator"],["SagaCoordinator","Ledger"],["SagaCoordinator","NPCI-Switch"],["NPCI-Switch","Bank-CBS"],["FraudScoring","RiskEngine"],["FraudScoring","FeatureStore"],["RiskEngine","FeatureStore"],["VPA-Resolver","CustomerDB"],["Ledger","LedgerDB"],["SagaCoordinator","EventBus"],["EventBus","Notification"],["EventBus","Rewards"],["EventBus","AuditLog"],["Notification","SMS-Provider"],["Rewards","CustomerDB"],["AuthZ-OAuth2","CustomerDB"]];
const BTW = {"MobileApp":0,"MerchantPOS":0,"PartnerAPI":0,"APIGateway":.332,"AuthZ-OAuth2":.042,"PaymentOrchestrator":.555,"SagaCoordinator":.547,"EventBus":.329,"VPA-Resolver":.045,"FraudScoring":.189,"RiskEngine":0,"Ledger":.1,"Notification":.1,"Rewards":.066,"CustomerDB":.079,"LedgerDB":0,"FeatureStore":0,"AuditLog":0,"NPCI-Switch":.1,"Bank-CBS":0,"SMS-Provider":0};
const CAPS = {
  "P2P Transfer":["MobileApp","APIGateway","PaymentOrchestrator","VPA-Resolver","SagaCoordinator","NPCI-Switch","Bank-CBS","Ledger"],
  "Merchant Payment":["MerchantPOS","APIGateway","PaymentOrchestrator","FraudScoring","SagaCoordinator","NPCI-Switch","Bank-CBS"],
  "Fraud Screening":["PaymentOrchestrator","FraudScoring","RiskEngine","FeatureStore"],
  "Notifications":["SagaCoordinator","EventBus","Notification","SMS-Provider"],
  "Rewards / Cashback":["EventBus","Rewards","CustomerDB"],
  "Audit / Compliance":["EventBus","AuditLog"],
  "Partner Onboarding":["PartnerAPI","APIGateway","AuthZ-OAuth2","CustomerDB"],
};
const LAYER_OF = {}; Object.entries(LAYERS).forEach(([l,ss])=>ss.forEach(s=>LAYER_OF[s]=l));
const callersOf = {}; Object.keys(LAYER_OF).forEach(s=>callersOf[s]=[]);
EDGES.forEach(([a,b])=>callersOf[b].push(a));
function ancestors(s, allowed){
  const seen = new Set(), st=[s];
  while(st.length){ const n=st.pop(); for(const p of callersOf[n]) if(!seen.has(p) && (!allowed||allowed.has(p))){ seen.add(p); st.push(p);} }
  return seen;
}
function blast(s){
  const per = {}; let total = 0;
  for(const [cap,chain] of Object.entries(CAPS)){
    const set = new Set(chain); let v = 0;
    if(set.has(s)){ v = (ancestors(s,set).size + 1)/chain.length; }
    per[cap] = v; total += v;
  }
  return {per,total};
}

/* ============================ overview ============================ */
function initOverview(){
  $$("[data-count]").forEach(el => {
    const target = +el.dataset.count, suf = el.dataset.suffix||"", dec = (el.dataset.count.split(".")[1]||"").length;
    const t0 = performance.now(), dur = 1400;
    const tick = now => { const p = Math.min(1,(now-t0)/dur), e = 1-Math.pow(1-p,3);
      el.textContent = (target*e).toLocaleString("en-IN",{minimumFractionDigits:dec,maximumFractionDigits:dec}) + suf;
      if(p<1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}

/* ============================ architecture ============================ */
function initArchitecture(){
  const svg = $("#archSvg"), NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs={}, parent=svg) => { const e=document.createElementNS(NS,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); parent.appendChild(e); return e; };
  const pos = {}, R = {};
  Object.entries(LAYERS).forEach(([layer,ss],li) => {
    const y = 60 + li*104;
    el("rect",{x:8,y:y-42,width:984,height:84,rx:12,fill:LCOL[layer],"fill-opacity":.05,stroke:LCOL[layer],"stroke-opacity":.15});
    el("text",{x:24,y:y+4,class:"layer-label"}).textContent = layer.toUpperCase();
    ss.forEach((s,i) => { pos[s] = [580 + (i-(ss.length-1)/2)*138, y]; R[s] = 15 + 42*BTW[s]; });
  });
  const defs = el("defs");
  const mk = (id,color) => { const m = el("marker",{id,viewBox:"0 0 10 10",refX:9,refY:5,markerWidth:7,markerHeight:7,orient:"auto-start-reverse"},defs); el("path",{d:"M0,0 L10,5 L0,10 z",fill:color},m); };
  mk("arr","#475569"); mk("arrHot","#f43f5e");
  const edgeEls = EDGES.map(([a,b]) => {
    const [x1,y1]=pos[a],[x2,y2]=pos[b], dx=x2-x1, dy=y2-y1, d=Math.hypot(dx,dy);
    const sx=x1+dx/d*R[a], sy=y1+dy/d*R[a], ex=x2-dx/d*(R[b]+3), ey=y2-dy/d*(R[b]+3);
    const mx=(sx+ex)/2 - dy/d*14, my=(sy+ey)/2 + dx/d*14;
    const p = el("path",{d:`M${sx},${sy} Q${mx},${my} ${ex},${ey}`,class:"edge","marker-end":"url(#arr)"});
    return {a,b,p};
  });
  const nodeEls = {};
  Object.keys(pos).forEach(s => {
    const g = el("g",{class:"node",tabindex:0});
    el("circle",{cx:pos[s][0],cy:pos[s][1],r:R[s],fill:LCOL[LAYER_OF[s]],"fill-opacity":.85,stroke:"#0b1120"},g);
    el("text",{x:pos[s][0],y:pos[s][1]+R[s]+13,"text-anchor":"middle"},g).textContent = s;
    g.addEventListener("click", ev => { ev.stopPropagation(); select(s); });
    g.addEventListener("keydown", ev => { if(ev.key==="Enter") select(s); });
    nodeEls[s] = g;
  });
  svg.addEventListener("click", () => select(null));

  const side = $("#archSide"), emptyHTML = side.innerHTML;
  function bindEmpty(){ const b=$("#archWorst"); if(b) b.onclick = () => {
    let best=null,bv=-1; Object.keys(pos).forEach(s=>{const v=blast(s).total; if(v>bv){bv=v;best=s;}}); select(best); }; }
  bindEmpty();

  function select(s){
    Object.values(nodeEls).forEach(g=>g.classList.remove("failed","impacted","dim"));
    edgeEls.forEach(e=>{e.p.classList.remove("hot");e.p.setAttribute("marker-end","url(#arr)");});
    if(!s){ side.innerHTML = emptyHTML; bindEmpty(); return; }
    const anc = ancestors(s);
    Object.entries(nodeEls).forEach(([n,g]) => { if(n===s) g.classList.add("failed"); else if(anc.has(n)) g.classList.add("impacted"); else g.classList.add("dim"); });
    edgeEls.forEach(e => { if((e.b===s||anc.has(e.b)) && anc.has(e.a)){ e.p.classList.add("hot"); e.p.setAttribute("marker-end","url(#arrHot)"); } });
    const b = blast(s), fanIn = callersOf[s].length, fanOut = EDGES.filter(e=>e[0]===s).length;
    const level = b.total>1.3?"high":b.total>0.7?"mid":"low";
    const verdictTxt = {high:"High governance priority: decouple this service or add redundancy, a cached fallback and a dedicated SLO.",
      mid:"Medium risk: protect callers with timeouts and circuit breakers.", low:"Low blast radius: failure stays local to one capability."}[level];
    const caps = Object.entries(b.per).sort((x,y)=>y[1]-x[1]);
    side.innerHTML = `
      <div class="svc-title">${s}</div><div class="svc-layer">${LAYER_OF[s]} layer · failure injected</div>
      <div class="svc-stats"><div><b>${fanIn}</b><span>fan-in</span></div><div><b>${fanOut}</b><span>fan-out</span></div><div><b>${anc.size}</b><span>callers hit</span></div></div>
      <div class="side-sub">Capability impact · blast radius ${fmt(b.total,2)}</div>
      ${caps.map(([c,v])=>`<div class="cap"><div class="cap-top"><span style="color:${v?'var(--text)':'var(--dim)'}">${c}</span><span>${Math.round(v*100)}%</span></div>
        <div class="bar"><i style="width:${v*100}%;background:${v>.75?C.red:v>.4?C.amber:C.cyan}"></i></div></div>`).join("")}
      <div class="verdict ${level}">${verdictTxt}</div>
      <p class="mono" style="margin-top:12px">betweenness centrality = ${BTW[s].toFixed(3)}</p>`;
  }
}

/* ============================ chaos lab ============================ */
const chaos = {};
function initChaos(){
  const rng = makeRng(42), RPS = 40, WIN = 300;
  const names = ["naive","retry","cb"], cols = [C.red,C.amber,C.teal];
  let t=0, playing=false, bankUntil=-1, npciUntil=-1, acc=0, last=0, demoDone=false;
  let hist, latBuf, cbErrBuf, faults;
  const reset = () => { t=0; bankUntil=npciUntil=-1; hist={naive:[],retry:[],cb:[]}; latBuf={naive:[],retry:[],cb:[]}; cbErrBuf=[]; faults=[]; draw(); updateCards(); };
  const sev = () => +$("#sev").value/100, thr = () => +$("#thr").value/100, spd = () => +$("#spd").value;

  function stepSecond(){
    const bank = t < bankUntil, npci = t < npciUntil;
    const p = bank ? sev() : npci ? 0.25 : 0.01;
    const out = {naive:[0,[]],retry:[0,[]],cb:[0,[]]};
    // breaker window: underlying error rate over last ~5 s
    const recentErr = cbErrBuf.length ? cbErrBuf.reduce((a,b)=>a+b,0)/cbErrBuf.length : 0;
    const open = recentErr > thr();
    let errs = 0;
    for(let i=0;i<RPS;i++){
      const base = rng.lognormal(Math.log(120),.35) + (npci ? rng.lognormal(Math.log(900),.3) : 0);
      // naive
      const f1 = rng.u() < p; out.naive[0] += f1?0:1; out.naive[1].push(f1?3000:base);
      // retry x3
      let tries=0, ok=false; while(tries<3 && !ok){ tries++; ok = rng.u() >= p; }
      let lat = base + (tries-1)*1800 + (ok?0:3000) + (bank ? rng.lognormal(Math.log(400),.4) : 0);
      out.retry[0] += ok?1:0; out.retry[1].push(lat);
      // circuit breaker + bulkhead + fallback
      const f3 = rng.u() < p; errs += f3?1:0;
      if(open){ const fb = rng.u() < .92; out.cb[0] += fb?1:0; out.cb[1].push(rng.lognormal(Math.log(45),.25)); }
      else { out.cb[0] += f3?0:1; out.cb[1].push(f3?800:base); }
    }
    cbErrBuf.push(errs/RPS); if(cbErrBuf.length>5) cbErrBuf.shift();
    names.forEach(n => { hist[n].push(out[n][0]/RPS); if(hist[n].length>WIN) hist[n].shift();
      latBuf[n].push(out[n][1]); if(latBuf[n].length>10) latBuf[n].shift(); });
    faults.push(bank?2:npci?1:0); if(faults.length>WIN) faults.shift();
    t++;
    if(!demoDone && t===40){ demoDone=true; bankUntil = t+120; }
  }
  function rolling(arr,i,k=10){ let s=0,c=0; for(let j=Math.max(0,i-k+1);j<=i;j++){s+=arr[j];c++;} return c?s/c:0; }
  function draw(){
    const {ctx,w,h} = setupCanvas($("#chaosChart"));
    const box = {x0:44,y0:10,x1:w-10,y1:h-28};
    ctx.clearRect(0,0,w,h);
    const n = faults.length, xs = i => box.x0 + (box.x1-box.x0)*(i/(WIN-1));
    const start = t - n;
    // fault shading
    for(let i=0;i<n;i++) if(faults[i]){ ctx.fillStyle = faults[i]===2?"rgba(244,63,94,.13)":"rgba(245,158,11,.13)"; ctx.fillRect(xs(i),box.y0,(box.x1-box.x0)/(WIN-1)+1,box.y1-box.y0); }
    axes(ctx,box,[Math.max(0,t-WIN),Math.max(WIN,t)],[0,100],{xFmt:v=>v.toFixed(0)+"s",yFmt:v=>v.toFixed(0)+"%"});
    names.forEach((nm,k) => {
      const a = hist[nm]; if(!a.length) return;
      ctx.strokeStyle = cols[k]; ctx.lineWidth = 2.2; ctx.beginPath();
      a.forEach((_,i) => { const y = box.y1 - (box.y1-box.y0)*rolling(a,i); i?ctx.lineTo(xs(i),y):ctx.moveTo(xs(i),y); });
      ctx.stroke();
    });
    if(!n){ ctx.fillStyle=C.text; ctx.textAlign="center"; ctx.font="14px 'IBM Plex Sans'"; ctx.fillText("Press ▶ Start traffic",(box.x0+box.x1)/2,(box.y0+box.y1)/2); }
    $("#chaosClock").textContent = `t = ${start + n} s`;
  }
  function updateCards(){
    const ids = {naive:["#sNaive","#lNaive"],retry:["#sRetry","#lRetry"],cb:["#sCb","#lCb"]};
    names.forEach(n => { const a=hist[n];
      if(!a.length){ $(ids[n][0]).textContent="–"; $(ids[n][1]).textContent="–"; return; }
      $(ids[n][0]).textContent = fmt(rolling(a,a.length-1)*100,1)+"%";
      const p99 = quantile(latBuf[n].flat(),.99);
      $(ids[n][1]).textContent = p99>=1000 ? fmt(p99/1000,2)+" s" : Math.round(p99)+" ms"; });
    const bank = t < bankUntil, npci = t < npciUntil, fs = $("#faultState");
    fs.innerHTML = bank ? `<span class="dot bad"></span>Bank-CBS brown-out · ${bankUntil-t}s left` :
      npci ? `<span class="dot warn"></span>NPCI latency spike · ${npciUntil-t}s left` : `<span class="dot"></span>No active faults`;
    $("#injBank").classList.toggle("on",bank); $("#injNpci").classList.toggle("on",npci);
  }
  function loop(now){
    if(!playing) return;
    const dt = Math.min(.1,(now-last)/1000); last = now; acc += dt*spd()*5;
    let stepped=false; while(acc>=1){ stepSecond(); acc-=1; stepped=true; }
    if(stepped){ draw(); updateCards(); }
    requestAnimationFrame(loop);
  }
  const play = on => { playing = on; $("#chaosPlay").textContent = on?"❚❚ Pause":"▶ Start traffic"; if(on){ last=performance.now(); requestAnimationFrame(loop);} };
  $("#chaosPlay").onclick = () => play(!playing);
  $("#chaosReset").onclick = () => { reset(); };
  $("#injBank").onclick = () => { bankUntil = t+120; npciUntil=-1; if(!playing) play(true); updateCards(); };
  $("#injNpci").onclick = () => { npciUntil = t+60; if(!playing) play(true); updateCards(); };
  $("#injClear").onclick = () => { bankUntil = npciUntil = t; updateCards(); };
  [["#sev","#sevOut",v=>v+"%"],["#thr","#thrOut",v=>v+"%"],["#spd","#spdOut",v=>v+"×"]].forEach(([i,o,f]) => $(i).oninput = e => $(o).textContent = f(e.target.value));
  reset();
  onShow.chaos = () => { draw(); };
  chaos.autostart = () => { if(!playing && t===0) play(true); };
  setTimeout(chaos.autostart, 500);
}

/* ============================ circuit breaker ============================ */
function initBreaker(){
  const svg = $("#fsmSvg"), NS="http://www.w3.org/2000/svg";
  const el = (tag,attrs={},parent=svg) => { const e=document.createElementNS(NS,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); parent.appendChild(e); return e; };
  const S = {CLOSED:{x:120,y:175,cls:"closed",sub:"calls pass through"}, HALF_OPEN:{x:380,y:70,cls:"half",sub:"trial probes"}, OPEN:{x:640,y:175,cls:"open",sub:"fail fast"}};
  const r = 54;
  const defs = el("defs"); const m = el("marker",{id:"fa",viewBox:"0 0 10 10",refX:9,refY:5,markerWidth:7,markerHeight:7,orient:"auto"},defs); el("path",{d:"M0,0 L10,5 L0,10 z",fill:"#475569"},m);
  const edges = {};
  function edge(a,b,off,label,key){
    const A=S[a],B=S[b], mx=(A.x+B.x)/2, my=(A.y+B.y)/2, dx=B.x-A.x, dy=B.y-A.y, d=Math.hypot(dx,dy);
    const cx = mx - dy/d*off, cy = my + dx/d*off;
    const v1 = [cx-A.x,cy-A.y], l1=Math.hypot(...v1), v2=[cx-B.x,cy-B.y], l2=Math.hypot(...v2);
    const sx=A.x+v1[0]/l1*r, sy=A.y+v1[1]/l1*r, ex=B.x+v2[0]/l2*(r+4), ey=B.y+v2[1]/l2*(r+4);
    edges[key] = el("path",{d:`M${sx},${sy} Q${cx},${cy} ${ex},${ey}`,class:"fsm-edge","marker-end":"url(#fa)"});
    const lx=(sx+2*cx+ex)/4, ly=(sy+2*cy+ey)/4;
    el("text",{x:lx,y:ly+(off>0?14:-6),class:"fsm-label"}).textContent = label;
  }
  edge("CLOSED","OPEN",62,"error rate > 50%","c2o");
  edge("OPEN","HALF_OPEN",-22,"after 4 s timeout","o2h");
  edge("HALF_OPEN","OPEN",-30,"probe fails","h2o");
  edge("HALF_OPEN","CLOSED",-22,"3 probes succeed","h2c");
  const nodes = {};
  Object.entries(S).forEach(([k,v]) => { const g = el("g",{class:`fsm-state ${v.cls}`}); el("circle",{cx:v.x,cy:v.y,r},g);
    el("text",{x:v.x,y:v.y+2},g).textContent = k.replace("_","-");
    el("text",{x:v.x,y:v.y+20,class:"sub"},g).textContent = v.sub; nodes[k]=g; });

  let state="CLOSED", win=[], openedAt=0, probes=0, called=0, shorted=0, trips=0, auto=null;
  const log = (msg,cls="") => { const lg=$("#cbLog"), d=document.createElement("div");
    d.innerHTML = `<span class="t">${new Date().toLocaleTimeString("en-GB")}</span> <span class="${cls}">${msg}</span>`;
    lg.prepend(d); while(lg.children.length>80) lg.lastChild.remove(); };
  const flash = k => { edges[k].classList.add("flash"); setTimeout(()=>edges[k].classList.remove("flash"),900); };
  function setState(s,edgeKey){ state=s; if(edgeKey) flash(edgeKey); render(); }
  function render(){
    Object.entries(nodes).forEach(([k,g])=>g.classList.toggle("on",k===state));
    const dots = $("#cbWindow"); dots.innerHTML = "";
    for(let i=0;i<20;i++){ const d=document.createElement("i"); if(i<win.length) d.className = win[i]?"ok":"bad"; dots.appendChild(d); }
    const er = win.length ? win.filter(x=>!x).length/win.length : 0;
    $("#cbErr").textContent = `error rate ${Math.round(er*100)}%` + (state==="HALF_OPEN"?` · probes ${probes}/3`:"");
    $("#cbCalled").textContent=called; $("#cbShort").textContent=shorted; $("#cbTrips").textContent=trips;
  }
  function send(){
    const fail = +$("#cbFail").value/100;
    if(state==="OPEN"){ shorted++; log("short-circuited → fallback served in 2 ms","warn"); render(); return; }
    called++;
    const ok = Math.random() >= fail;
    if(state==="HALF_OPEN"){
      if(!ok){ trips++; openedAt=performance.now(); log("probe FAILED → circuit re-opened","bad"); setState("OPEN","h2o"); return; }
      probes++; log(`probe ${probes}/3 succeeded`,"ok");
      if(probes>=3){ win=[]; log("dependency healthy → circuit CLOSED","info"); setState("CLOSED","h2c"); return; }
      render(); return;
    }
    win.push(ok); if(win.length>20) win.shift();
    log(ok?"Bank-CBS responded 200 OK":"Bank-CBS error / timeout", ok?"ok":"bad");
    const er = win.filter(x=>!x).length/win.length;
    if(win.length>=10 && er>0.5){ trips++; openedAt=performance.now(); log(`error rate ${Math.round(er*100)}% > 50% → circuit OPEN`,"bad"); setState("OPEN","c2o"); return; }
    render();
  }
  (function tick(){
    if(state==="OPEN"){
      const el = performance.now()-openedAt; $("#cbTimer").style.width = Math.min(100,el/40)+"%";
      if(el>=4000){ probes=0; log("timeout elapsed → HALF-OPEN, allowing trial requests","info"); setState("HALF_OPEN","o2h"); }
    } else $("#cbTimer").style.width = "0%";
    requestAnimationFrame(tick);
  })();
  $("#cbOne").onclick = send;
  $("#cbAuto").onclick = () => { if(auto){clearInterval(auto);auto=null;$("#cbAuto").textContent="▶ Auto traffic";} else {auto=setInterval(send,260);$("#cbAuto").textContent="❚❚ Stop traffic";} };
  $("#cbFail").oninput = e => $("#cbFailOut").textContent = e.target.value+"%";
  log("breaker initialised in CLOSED state","info"); render();
}

/* ============================ saga ============================ */
function initSaga(){
  const STEPS = [
    {f:"ReserveFunds",c:"ReleaseFunds",p:.01,d:40},{f:"FraudCheck",c:null,p:.04,d:90},{f:"DebitPayer",c:"RefundPayer",p:.02,d:60},
    {f:"NPCI-Route",c:"ReverseRoute",p:.06,d:180},{f:"CreditPayee",c:"ReverseCredit",p:.05,d:120},{f:"Notify",c:null,p:0,d:30}];
  const sel = $("#sagaFail");
  STEPS.forEach(s => { const o=document.createElement("option"); o.value=s.f; o.textContent=s.f; sel.appendChild(o); });
  const track=$("#sagaTrack"), comp=$("#sagaComp");
  track.innerHTML = STEPS.map((s,i)=>`<div class="step" id="sf${i}"><span class="st"></span><b>${s.f}</b><small>p(fail) ${(s.p*100).toFixed(0)}%</small></div>`).join("");
  comp.innerHTML = STEPS.map((s,i)=>`<div class="step ${s.c?'':'none'}" id="sc${i}"><span class="st"></span><b>${s.c||""}</b><small>compensates ${s.f}</small></div>`).join("");
  const tally = {}; let txn = 0, busy = false;
  const log = (msg,cls="") => { const lg=$("#sagaLog"), d=document.createElement("div"); d.innerHTML=`<span class="${cls}">${msg}</span>`; lg.appendChild(d); lg.scrollTop=lg.scrollHeight; };
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const gamma4 = (rng,scale) => { let s=0; for(let i=0;i<4;i++) s += -Math.log(1-rng.u()); return s*scale; };
  const rng = makeRng(7);
  function plan(mode){
    const ev=[], done=[]; let clock=0;
    for(let i=0;i<STEPS.length;i++){
      const s=STEPS[i], d=gamma4(rng,s.d/4), fails = mode==="random" ? rng.u()<s.p : mode===s.f;
      if(fails){ ev.push({i,kind:"failed",name:s.f,t:clock,d}); clock+=d;
        for(let j=done.length-1;j>=0;j--){ const k=done[j]; if(STEPS[k].c){ const cd=gamma4(rng,STEPS[k].d/5); ev.push({i:k,kind:"comp",name:STEPS[k].c,t:clock,d:cd}); clock+=cd; } }
        return {ev,outcome:"ABORTED@"+s.f,clock}; }
      ev.push({i,kind:"ok",name:s.f,t:clock,d}); clock+=d; done.push(i);
    }
    return {ev,outcome:"COMMITTED",clock};
  }
  function chart(){
    const {ctx,w,h} = setupCanvas($("#sagaChart")); ctx.clearRect(0,0,w,h);
    const keys = ["COMMITTED",...STEPS.filter(s=>s.p>0).map(s=>"ABORTED@"+s.f)];
    const total = Object.values(tally).reduce((a,b)=>a+b,0)||1, max = Math.max(1,...keys.map(k=>tally[k]||0));
    const bh = (h-10)/keys.length, lx = 150;
    keys.forEach((k,i) => { const v=tally[k]||0, y=5+i*bh, bw=(w-lx-90)*Math.sqrt(v/max);
      ctx.fillStyle = C.text; ctx.textAlign="right"; ctx.textBaseline="middle"; ctx.fillText(k.replace("ABORTED@","✕ "),lx-10,y+bh/2);
      ctx.fillStyle = k==="COMMITTED"?C.green:C.red; ctx.globalAlpha=.85; ctx.fillRect(lx,y+bh*.18,Math.max(2,bw),bh*.64); ctx.globalAlpha=1;
      ctx.fillStyle = "#cbd5e1"; ctx.textAlign="left"; ctx.fillText(`${v} (${(v/total*100).toFixed(1)}%)`,lx+bw+8,y+bh/2); });
    $("#sagaTotal").textContent = `${Object.values(tally).reduce((a,b)=>a+b,0).toLocaleString()} tx`;
  }
  function resetLanes(){ STEPS.forEach((_,i)=>{ $("#sf"+i).className="step"; $("#sf"+i+" .st").textContent=""; const c=$("#sc"+i); c.className="step"+(STEPS[i].c?"":" none"); c.querySelector(".st").textContent=""; }); }
  async function runOne(){
    if(busy) return; busy=true; $("#sagaRun").disabled=true; resetLanes(); $("#sagaLog").innerHTML="";
    txn++; const id = "TX-"+String(txn).padStart(4,"0"); $("#sagaTx").textContent=id;
    const {ev,outcome,clock} = plan(sel.value);
    log(`${id} started by SagaCoordinator`,"info");
    for(const e of ev){
      const cell = e.kind==="comp" ? $("#sc"+e.i) : $("#sf"+e.i);
      cell.classList.add("running"); await sleep(Math.min(700,e.d*3.2));
      cell.classList.remove("running");
      if(e.kind==="ok"){ cell.classList.add("ok"); cell.querySelector(".st").textContent="✓"; log(`+${e.t.toFixed(0).padStart(4)} ms  ${e.name} committed (${e.d.toFixed(0)} ms)`,"ok"); }
      else if(e.kind==="failed"){ cell.classList.add("failed"); cell.querySelector(".st").textContent="✕"; log(`+${e.t.toFixed(0).padStart(4)} ms  ${e.name} FAILED → starting compensation`,"bad");
        STEPS.forEach((_,k)=>{ if(k>e.i) $("#sf"+k).classList.add("skipped"); }); }
      else { cell.classList.add("active"); cell.querySelector(".st").textContent="↩"; log(`+${e.t.toFixed(0).padStart(4)} ms  ${e.name} executed`,"warn"); }
    }
    log(`${id} ${outcome==="COMMITTED"?"COMMITTED":"ROLLED BACK, consistent state restored"} in ${clock.toFixed(0)} ms`, outcome==="COMMITTED"?"ok":"warn");
    tally[outcome]=(tally[outcome]||0)+1; chart(); busy=false; $("#sagaRun").disabled=false;
  }
  $("#sagaRun").onclick = runOne;
  $("#sagaBatch").onclick = () => { let comps=0; for(let i=0;i<500;i++){ const r=plan("random"); tally[r.outcome]=(tally[r.outcome]||0)+1; comps+=r.ev.filter(e=>e.kind==="comp").length; txn++; }
    $("#sagaLog").innerHTML=""; log(`Batch of 500 sagas completed · ${comps} compensating transactions executed · 0 partial states`,"info"); chart(); };
  onShow.saga = chart; chart();
}

/* ============================ QoS composer ============================ */
function initQos(){
  const ABS = ["KYC-Verify","FraudScore","PaymentRoute","SMS-Notify","Receipt-Store"], K=6, rng=makeRng(42);
  const cand = ABS.map(()=>Array.from({length:K},()=>({lat:rng.uniform(20,400),cost:rng.uniform(.01,.2),rel:rng.uniform(.985,.9999)})));
  const N = Math.pow(K,ABS.length), lat=new Float64Array(N), cost=new Float64Array(N), rel=new Float64Array(N), combo=[];
  for(let n=0;n<N;n++){ let x=n,l=0,c=0,r=1; const cb=[]; for(let a=0;a<ABS.length;a++){ const p=x%K; x=Math.floor(x/K); cb.push(p); l+=cand[a][p].lat; c+=cand[a][p].cost; r*=cand[a][p].rel; } lat[n]=l; cost[n]=c; rel[n]=r; combo.push(cb); }
  const pareto = new Uint8Array(N).fill(1);
  for(let i=0;i<N;i++){ for(let j=0;j<N;j++){ if(lat[j]<=lat[i]&&cost[j]<=cost[i]&&rel[j]>=rel[i]&&(lat[j]<lat[i]||cost[j]<cost[i]||rel[j]>rel[i])){pareto[i]=0;break;} } }
  const nP = pareto.reduce((a,b)=>a+b,0);
  const mm = a => [Math.min(...a),Math.max(...a)], [l0,l1]=mm(lat), [c0,c1]=mm(cost), [r0,r1]=mm(rel);
  $("#qosCount").textContent = `${N.toLocaleString()} compositions · ${nP} Pareto-optimal`;
  let best=0, prevCombo=null;
  function compute(){
    let wl=+$("#wLat").value, wc=+$("#wCost").value, wr=+$("#wRel").value, s=wl+wc+wr; if(!s){wl=wc=wr=1;s=3;}
    wl/=s; wc/=s; wr/=s;
    $("#wLatOut").textContent=wl.toFixed(2); $("#wCostOut").textContent=wc.toFixed(2); $("#wRelOut").textContent=wr.toFixed(2);
    let bu=-1; for(let n=0;n<N;n++){ const u = wl*(l1-lat[n])/(l1-l0) + wc*(c1-cost[n])/(c1-c0) + wr*(rel[n]-r0)/(r1-r0); if(u>bu){bu=u;best=n;} }
    $("#qosBest").innerHTML = `<div class="row"><span>End-to-end latency</span><b>${lat[best].toFixed(0)} ms</b></div><div class="row"><span>Cost / transaction</span><b>₹${cost[best].toFixed(3)}</b></div><div class="row"><span>Reliability</span><b>${(rel[best]*100).toFixed(2)}%</b></div><div class="row"><span>Utility (SAW)</span><b>${bu.toFixed(3)}</b></div>`;
    const cb = combo[best];
    $("#qosTable").innerHTML = ABS.map((a,i)=>{ const p=cand[i][cb[i]]; const ch = prevCombo && prevCombo[i]!==cb[i];
      return `<div class="qcell ${ch?'changed':''}"><div class="qn">${a}</div><div class="qp">Provider-${cb[i]+1}</div><div class="qm">${p.lat.toFixed(0)} ms<br>₹${p.cost.toFixed(3)}<br>${(p.rel*100).toFixed(2)}%</div></div>`; }).join("");
    prevCombo = cb; draw();
  }
  function draw(){
    const {ctx,w,h} = setupCanvas($("#qosChart")); ctx.clearRect(0,0,w,h);
    const box={x0:56,y0:12,x1:w-12,y1:h-40}, X=v=>box.x0+(box.x1-box.x0)*(v-l0)/(l1-l0), Y=v=>box.y1-(box.y1-box.y0)*(v-r0)/(r1-r0);
    axes(ctx,box,[l0,l1],[r0*100,r1*100],{yFmt:v=>v.toFixed(1)+"%",xFmt:v=>v.toFixed(0),xLabel:"end-to-end latency (ms)",yTicks:5});
    ctx.fillStyle="rgba(100,116,139,.35)"; for(let n=0;n<N;n++) if(!pareto[n]) ctx.fillRect(X(lat[n])-1,Y(rel[n])-1,2,2);
    for(let n=0;n<N;n++) if(pareto[n]){ const t=(cost[n]-c0)/(c1-c0); ctx.fillStyle=`hsl(${190-150*t},85%,${55+5*t}%)`; ctx.beginPath(); ctx.arc(X(lat[n]),Y(rel[n]),3.4,0,7); ctx.fill(); }
    const bx=X(lat[best]), by=Y(rel[best]);
    ctx.strokeStyle=C.amber; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(bx,box.y1); ctx.lineTo(bx,by); ctx.lineTo(box.x0,by); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=C.amber; ctx.font="22px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("★",bx,by);
    ctx.font="11px 'JetBrains Mono'"; ctx.fillStyle=C.text; ctx.textAlign="right"; ctx.fillText("pareto colour: cyan = cheap → orange = expensive", box.x1, box.y0+8);
  }
  ["#wLat","#wCost","#wRel"].forEach(id=>$(id).oninput=compute);
  $$("[data-preset]").forEach(b=>b.onclick=()=>{ const [a,c,r]=b.dataset.preset.split(","); $("#wLat").value=a; $("#wCost").value=c; $("#wRel").value=r; compute(); });
  onShow.qos = draw; compute();
}

/* ============================ business case ============================ */
function initBusiness(){
  const SIMS=3000, Y=5;
  const defaults = {bCapex:30,bGrow:15,bDebt:12,bRate:10};
  function run(){
    const capexS=+$("#bCapex").value, grow=+$("#bGrow").value/100, debt=+$("#bDebt").value/100, r=+$("#bRate").value/100;
    $("#bCapexOut").textContent=capexS; $("#bGrowOut").textContent=Math.round(grow*100)+"%"; $("#bDebtOut").textContent=Math.round(debt*100)+"%"; $("#bRateOut").textContent=Math.round(r*100)+"%";
    const rng = makeRng(42), npvM=[], npvS=[], payS=[];
    for(let s=0;s<SIMS;s++){
      for(const arch of ["M","S"]){
        const capex = arch==="M" ? rng.normal(18,2) : rng.normal(capexS,4);
        let npv=-capex, cum=-capex, pay=null;
        for(let y=0;y<Y;y++){
          const opex = arch==="M" ? rng.normal(9,1)*Math.pow(1+debt,y) : rng.normal(8,1)*Math.pow(.95,y);
          const rev = rng.normal(22,4)*Math.pow(1+(arch==="M"?.06:grow),y);
          const outage = arch==="M" ? rng.poisson(3)*rng.lognormal(Math.log(1.2),.5) : rng.poisson(1)*rng.lognormal(Math.log(.6),.5);
          const cf = rev-opex-outage; npv += cf/Math.pow(1+r,y+1); cum += cf; if(pay===null && cum>0) pay=y+1;
        }
        if(arch==="M") npvM.push(npv); else { npvS.push(npv); payS.push(pay===null?Infinity:pay); }
      }
    }
    let wins=0; for(let i=0;i<SIMS;i++) if(npvS[i]>npvM[i]) wins++;
    $("#bWin").textContent=(wins/SIMS*100).toFixed(1)+"%"; $("#bWin").style.color = wins/SIMS>.5?C.green:C.red;
    $("#bNpvS").textContent="₹"+quantile(npvS,.5).toFixed(1)+" cr"; $("#bNpvM").textContent="₹"+quantile(npvM,.5).toFixed(1)+" cr";
    const mp = quantile(payS,.5); $("#bPay").textContent = isFinite(mp) ? mp+" yr" : "> 5 yr";
    draw(npvM,npvS);
  }
  let lastData=null;
  function draw(a,b){
    if(a) lastData=[a,b]; if(!lastData) return; [a,b]=lastData;
    const {ctx,w,h}=setupCanvas($("#bChart")); ctx.clearRect(0,0,w,h);
    const lo=Math.min(quantile(a,.001),quantile(b,.001)), hi=Math.max(quantile(a,.999),quantile(b,.999)), B=60, bw=(hi-lo)/B;
    const hist = arr => { const hh=new Array(B).fill(0); arr.forEach(v=>{const k=Math.floor((v-lo)/bw); if(k>=0&&k<B) hh[k]++;}); return hh; };
    const ha=hist(a), hb=hist(b), mx=Math.max(...ha,...hb);
    const box={x0:44,y0:10,x1:w-10,y1:h-40};
    axes(ctx,box,[lo,hi],[0,mx],{xFmt:v=>"₹"+v.toFixed(0),yFmt:v=>v.toFixed(0),xLabel:"NPV over 5 years (₹ crore)",yTicks:4});
    const pw=(box.x1-box.x0)/B;
    [[ha,"rgba(100,116,139,.7)"],[hb,"rgba(59,130,246,.7)"]].forEach(([hh,c])=>{ ctx.fillStyle=c; hh.forEach((v,i)=>{ const bh=(box.y1-box.y0)*v/mx; ctx.fillRect(box.x0+i*pw,box.y1-bh,pw-1,bh); }); });
    if(lo<0&&hi>0){ const zx=box.x0+(box.x1-box.x0)*(-lo)/(hi-lo); ctx.strokeStyle=C.red; ctx.lineWidth=1.5; ctx.setLineDash([5,4]); ctx.beginPath(); ctx.moveTo(zx,box.y0); ctx.lineTo(zx,box.y1); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle=C.red; ctx.textAlign="left"; ctx.fillText("break-even",zx+5,box.y0+10); }
  }
  let to; Object.keys(defaults).forEach(id=>$("#"+id).oninput=()=>{clearTimeout(to);to=setTimeout(run,30);});
  $("#bReset").onclick=()=>{Object.entries(defaults).forEach(([k,v])=>$("#"+k).value=v); run();};
  onShow.business = () => draw(); run();
}

/* ============================ results gallery ============================ */
const FIGS = [
  ["01-architecture.png","Enterprise SOA reference architecture","23 services across six layers; node size is betweenness centrality. PaymentOrchestrator and SagaCoordinator are the structural hubs.",[1]],
  ["02-chaos-experiment.png","Chaos experiment: 108,000 simulated calls","Success rate, p99 latency, latency CDF and percentiles for three resilience strategies under a bank brown-out and an NPCI latency spike.",[2,5]],
  ["03-circuit-breaker.png","Circuit-breaker state timeline","The breaker trips OPEN during both faults, short-circuiting about 9,500 calls instead of sending them to a failing dependency.",[2,5]],
  ["04-saga.png","Saga orchestration traces","Forward steps vs compensating transactions for sample payments; outcome breakdown and duration of 5,000 sagas.",[3]],
  ["05-blast-radius.png","Blast-radius matrix & risk quadrant","Which business capabilities degrade when each service fails. CustomerDB tops the list because it is a shared database.",[3]],
  ["06-governance.png","SLA governance dashboard","Hourly availability over a week, policy-as-code violations, error budget remaining and Bank-CBS budget burn-down.",[3,5]],
  ["07-qos-pareto.png","QoS-aware composition: Pareto front","7,776 provider bindings evaluated on latency, cost and reliability; 161 are Pareto-optimal and SAW picks one.",[2,3]],
  ["08-event-stream.png","Event-stream analytics on the service bus","24 hours of throughput with EWMA anomaly detection; a flash-sale surge, partial outage and coordinated fraud ring are flagged.",[4]],
  ["09-business-case.png","Monte Carlo business case","Cash-flow fan chart and NPV distributions across 10,000 scenarios; SOA wins in 98.9% of them.",[4]],
  ["10-kpi-summary.png","Key findings summary","One-page KPI board for the report.",[5]],
];
function initResults(){
  const g=$("#gallery");
  g.innerHTML = FIGS.map(([f,t,d,u],i)=>`<figure class="fig" data-units="${u.join(",")}" data-i="${i}"><div class="img"><img src="assets/figures/${f}" alt="${t}" loading="lazy"></div><figcaption class="cap"><span class="units">Unit ${u.join(" · ")}</span><br><b>${t}</b><p>${d}</p></figcaption></figure>`).join("");
  $$("#galFilters .chip").forEach(c=>c.onclick=()=>{ $$("#galFilters .chip").forEach(x=>x.classList.remove("active")); c.classList.add("active");
    $$(".fig").forEach(f=>f.classList.toggle("hide", c.dataset.f!=="all" && !f.dataset.units.split(",").includes(c.dataset.f))); });
  const lb=$("#lightbox");
  $$(".fig").forEach(f=>f.onclick=()=>{ const [file,t,d]=FIGS[+f.dataset.i]; lb.querySelector("img").src="assets/figures/"+file; lb.querySelector(".lb-cap").innerHTML=`<b>${t}</b><br>${d}`; lb.classList.add("open"); });
  lb.onclick = e => { if(e.target.tagName!=="IMG") lb.classList.remove("open"); };
  document.addEventListener("keydown",e=>{ if(e.key==="Escape") lb.classList.remove("open"); });
}

/* ============================ report ============================ */
function initReport(){
  $$("#repTabs .tab").forEach(t=>t.onclick=()=>{ $$("#repTabs .tab").forEach(x=>x.classList.remove("active")); t.classList.add("active");
    $$(".tab-body").forEach(b=>b.classList.toggle("active", b.id==="t-"+t.dataset.t)); });
}

const INIT = {overview:initOverview, architecture:initArchitecture, chaos:initChaos, breaker:initBreaker, saga:initSaga, qos:initQos, business:initBusiness, results:initResults, report:initReport};
route();
})();
