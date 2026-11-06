const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('file://'+require('path').resolve(__dirname,process.env.HTML||'../../index.html'));await p.click('#btnNew');
const r=await p.evaluate(()=>{const out=[];
 for(const mode of ['builder'])for(let lv=0;lv<5;lv++){let agg={lv,mode,months:0,elig:0,share:0,hits:0,pct:[],poolN:0};
  for(let seed=1;seed<=30;seed++){let s=seed*7919;Math.random=()=>{s=(s*16807)%2147483647;return s/2147483647;};
   initLevel(lv,0);S.cash=lv?S.cash:S.cash;
   for(let m=0;m<120;m++){
    if(mode==='builder'&&m%3===0){S.cash=Math.max(S.cash,5000*S.sc);for(const id of ['school','house','fzone','logi','park','road'])try{queueBuild(id);}catch(e){}
      try{(S.phase1&&S.phase1.plots||[]).forEach((pl,i)=>{try{sellPlot&&sellPlot(i,'auction');}catch(e){}});}catch(e){}}
    getters();const e=EV.find(x=>x.id==='land_expro');
    const pool=EV.filter(e=>e.w>0&&S.lvl>=e.lv[0]&&S.lvl<=e.lv[1]&&!(e.once&&S.once[e.id])&&(!e.cond||e.cond(S)));
    const wt=x=>x.w*(x.lowLand&&S.landPct<0.1?x.lowLand:1)*(x.mo&&x.mo.indexOf(S.month)>=0?3.5:1);
    const tot=pool.reduce((a,x)=>a+wt(x),0);agg.poolN+=pool.length;
    if(pool.includes(e)){agg.elig++;agg.share+=wt(e)/tot;}
    if(m%12===0)agg.pct.push(Math.round(S.landPct*100));
    try{runAgenda();const res=tick();if(res&&res.evQueue&&res.evQueue.includes('land_expro'))agg.hits++;}catch(err){}
    agg.months++;}}
  out.push({lv,mode,eligPct:Math.round(agg.elig/agg.months*100),avgShareWhenElig:agg.elig?(agg.share/agg.elig*100).toFixed(1)+'%':'-',hitsPer10y:(agg.hits/30).toFixed(2),avgPool:Math.round(agg.poolN/agg.months),landPctYearly_seed6:agg.pct.slice(-10).join(',')});}
 return out;});
console.table(r);await b.close();})();
