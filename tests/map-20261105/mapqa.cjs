const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+require('path').resolve(__dirname,'../../index.html'));await p.click('#btnNew');
const r=await p.evaluate(()=>{const out={same:0,diff:0,months:0,errs:[],items:[]};Math.random=(s=>()=>{s=(s*16807)%2147483647;return s/2147483647;})(42);
 for(let lv=0;lv<5;lv++){if(lv>0)initLevel(lv,0);S.cash=1e7;
  for(let m=0;m<96;m++){
   if(m%5===0){for(const id of ['school','park','road','fzone','house','bridge','wetland','greenway'])queueBuild(id);}
   try{runAgenda();tick();}catch(e){}
   try{const before=JSON.stringify(S);mapSvg();vMap();mapKeys();(JSON.stringify(S)===before)?out.same++:out.diff++;}catch(e){out.errs.push(lv+':'+m+':'+e.message);}
   out.months++;}
  out.items.push(lv+':'+mapItemsNow.length+'项 firms '+(S.phase3.firms.length));}
 return out;});
console.log(JSON.stringify(r),JSON.stringify(errs.slice(0,3)));await b.close();})();
