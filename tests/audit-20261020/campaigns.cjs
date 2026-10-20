const fs=require('fs'),vm=require('vm');const source=fs.readFileSync('index.html','utf8').split('<script>')[1].split("document.addEventListener('DOMContentLoaded',()=>{")[0];const runs=[];
for(const policy of ['hold','legacy','mixed'])for(let seedNo=1;seedNo<=20;seedNo++){
 const c=vm.createContext({console});vm.runInContext(source,c);c.seedNo=seedNo;c.policy=policy;vm.runInContext(`let rng=seedNo*12345;Math.random=()=>((rng=(1664525*rng+1013904223)>>>0)/4294967296);newGame();let auditEnd=null,auditMonths=0,auditErrors=0,auditBuilds=0;
 for(let i=0;i<72&&!auditEnd;i++){
  if(policy!=='hold'){
   // 融资只看当期缺口和已有债务额度，不调用未来事件。
   const due=S.build.reduce((a,b)=>a+(b.cost-b.paid)/b.left,0),target=150+due*3,need=target-S.cash;
   if(need>0&&hdr()<75){const amt=Math.min(cqQuota(),need,Math.max(0,annualIncome()*.75-cqOut()));if(amt>1)issueCQ(amt,60);}
   const types=policy==='legacy'?['logi','fzone']:['seedling','grain','warehouse','solar'];
   if(i%8===0&&S.build.length<1&&S.ind.length<4&&S.cash>120){const id=types[auditBuilds%types.length];if(!queueBuild(id))auditBuilds++;}
  }
  const preferred=S.cash<100?['budget','debtwork','selfcheck','survey','study','team']:['study','report','survey','edu','team','invest','province'];
  S.ag=preferred.find(k=>S.agPool.includes(k))||S.agPool[0]||'routine';runAgenda();const result=tick();auditMonths++;if(Math.abs(S.monthly.cashbook.error)>.001)auditErrors++;
  auditEnd=checkInstant();if(auditEnd)break;
  for(const id of result.evQueue){const e=findEvent(id);if(!e)continue;const opts=e.opts.filter(o=>reqOk(o)&&!eventAdmission(o.fx));const o=opts.find(o=>!o.grey)||opts[0];if(!o)continue;applyFx(o.fx);if(e.once)S.once[e.id]=1;if(o.end){auditEnd=o.end;break;}}
  if(result.annualDue&&!auditEnd){const R=annual();if(R.next==='promote')initLevel(S.lvl+1,S.merit*.25);else if(R.next)auditEnd=R.next;}
  agRefresh();
 }
 var auditResult={policy,seed:seedNo,months:auditMonths,end:auditEnd,level:S.lvl,cash:S.cash,debt:hdr(),merit:S.merit,env:S.env,pros:S.pros,liv:S.liv,sat:S.sat,ratings:S.ratings,cashbookErrors:auditErrors,projects:auditBuilds};`,c,{timeout:20000});runs.push(JSON.parse(vm.runInContext('JSON.stringify(auditResult)',c)));
}
const summary=Object.fromEntries(['hold','legacy','mixed'].map(policy=>{const rows=runs.filter(r=>r.policy===policy);return [policy,{runs:rows.length,months:rows.reduce((a,r)=>a+r.months,0),survive72:rows.filter(r=>!r.end).length,promoted:rows.filter(r=>r.level>0).length,endings:rows.reduce((a,r)=>(a[r.end||'active']=(a[r.end||'active']||0)+1,a),{}),cashbookErrors:rows.reduce((a,r)=>a+r.cashbookErrors,0)}]}));
fs.writeFileSync('tests/audit-20261020/campaigns.json',JSON.stringify({limitations:'20 seeded runs per fixed policy, real 180 opening cash. First enabled non-grey event option, no optimization or win-rate claim; mixed simple policies do not cover all player choices.',summary,runs},null,2));console.log(JSON.stringify(summary,null,2));
