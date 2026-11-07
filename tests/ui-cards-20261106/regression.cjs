const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const load=file=>fs.readFileSync(path.join(root,file),'utf8').split('<script>')[1].split("document.addEventListener('DOMContentLoaded',()=>{")[0];
const run=(c,s)=>vm.runInContext(s,c,{timeout:120000});
function context(file='index.html'){
 const store=new Map(),c=vm.createContext({console,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}});
 run(c,load(file));run(c,'let seed=71834;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);newGame()');return c;
}
let passed=0;const counts=[];
for(const saved of [false,true])for(const lvl of [0,1])for(const zone of ['low','mixed','restricted','eco','heavy'])for(const mode of ['none','generic','dedicated'])for(const resources of [[],['煤炭'],['煤炭','油气']]){
 const c=context();c.resources=resources;run(c,`initLevel(${lvl},0);S.planZone='${zone}';S.phase1.resources=resources;${mode==='generic'?'S.phase1.permits.factory=1':mode==='dedicated'?'SOE.forEach(([id])=>S.phase1.permits[id]=1)':''}`);
 if(saved)run(c,'save();load()');
 const before=run(c,'JSON.stringify(S)'),names=run(c,'JSON.stringify(SOE.map(([id])=>FAC[id].n))');
 const html=run(c,'vIndustryDirectory()'),groups={};
 for(const match of html.matchAll(/data-soe-group="(ready|approval|blocked)"[\s\S]*?(?=data-soe-group=|$)/g))groups[match[1]]=match[0];
 const expected=JSON.parse(run(c,`JSON.stringify(SOE.map(([id])=>{const g=pollutionGrade(id),F=FAC[id];let state='ready';if(g>ZONES[S.planZone].max||(g===4&&S.lvl===0))state='blocked';else if(F.resource&&!S.phase1.resources.includes(F.resource))state='blocked';else if(industryApproval(id)&&industryPermitKey(id)===null)state='approval';return {id,state};}))`));
 for(const {id,state} of expected){assert.ok(groups[state].includes('data-soe="'+id+'"'),[lvl,zone,mode,resources,id,state].join('/'));const card=html.match(new RegExp('<article[^>]*data-soe="'+id+'"[\\s\\S]*?</article>'))[0];assert.equal(card.includes('data-phase-action="permit_'+id+'"'),state==='approval');}
 assert.equal((html.match(/data-soe="/g)||[]).length,34);assert.ok(!html.includes('<table'));assert.ok(!html.includes('点击展开'));assert.equal(run(c,'JSON.stringify(S)'),before);assert.equal(run(c,'JSON.stringify(SOE.map(([id])=>FAC[id].n))'),names);
 if(!saved&&mode==='none'&&resources.length===1)counts.push({lvl,zone,...Object.fromEntries(Object.keys(groups).map(k=>[k,expected.filter(x=>x.state===k).length]))});passed++;
}
for(const zone of ['low','restricted','eco']){
 const c=context();assert.equal(run(c,`industryGate('refinery','${zone}')`),run(c,`'当前片区（'+ZONES['${zone}'].n+'）不允许重污染项目'`));passed++;
}
// The added fourth argument must leave all existing three-argument callers unchanged.
{
 const previous=context('backups/index-before-ui-cards-followup-20261106.html'),current=context();
 for(const lvl of [0,1])for(const zone of ['low','mixed','restricted','eco','heavy'])for(const permit of [0,1])for(const resources of [[],['煤炭'],['煤炭','油气']]){
  current.resources=resources;run(current,`initLevel(${lvl},0);S.phase1.resources=resources;S.phase1.permits={factory:${permit},refinery:${permit}}`);
  previous.input=JSON.parse(run(current,'JSON.stringify(S)'));run(previous,'S=input');
  for(const id of ['factory',...JSON.parse(run(current,'JSON.stringify(SOE.map(([id])=>id))'))]){
   assert.equal(run(current,`industryGate('${id}','${zone}')`),run(previous,`industryGate('${id}','${zone}')`));
   assert.equal(run(current,`industryGate('${id}','${zone}',{paper:1})`),run(previous,`industryGate('${id}','${zone}',{paper:1})`));
  }
 }
 passed++;
}
{
 const c=context();assert.equal(run(c,"industryGate('paper','mixed',undefined,{ignorePermit:true})"),null);
 assert.ok(run(c,"industryGate('paper','mixed')"));assert.ok(run(c,"industryGate('paper','eco',undefined,{ignorePermit:true})"));
 assert.ok(run(c,"industryGate('refinery','heavy',undefined,{ignorePermit:true})"));
 run(c,'initLevel(1,0)');assert.match(run(c,"industryGate('oilfield','heavy',undefined,{ignorePermit:true})"),/资源/);
 run(c,"S.phase1.resources.push('油气')");assert.equal(run(c,"industryGate('oilfield','heavy',undefined,{ignorePermit:true})"),null);
 assert.ok(run(c,"industryGate('oilfield','heavy')"));passed++;
}
// Wording changes cannot alter group membership or approval buttons.
{
 const fingerprint=html=>Array.from(html.matchAll(/data-soe-group="(ready|approval|blocked)"[\s\S]*?(?=data-soe-group=|$)/g),m=>[m[1],Array.from(m[0].matchAll(/data-soe="([^"]+)"/g),x=>x[1])]);
 for(const lvl of [0,1])for(const zone of ['mixed','eco','heavy']){
  const c=context();run(c,`initLevel(${lvl},0);S.planZone='${zone}'`);const before=fingerprint(run(c,'vIndustryDirectory()'));
  run(c,"var originalUiGate=industryGate;industryGate=function(){const result=originalUiGate.apply(this,arguments);return result===null?null:'全新提示文案，与原文完全不同';}");
  assert.deepEqual(fingerprint(run(c,'vIndustryDirectory()')),before);
 }
 passed++;
}

// Exact deterministic campaign parity: render-only changes must leave state and RNG identical.
for(let lvl=0;lvl<5;lvl++){
 const old=context('backups/index-before-ui-cards-20261106.html'),now=context();
 for(const c of [old,now])run(c,`initLevel(${lvl},0);S.honors.id='qa-stable';S.cash=10000000;`);
 for(let m=0;m<120;m++){
  for(const c of [old,now])run(c,"S.ag='routine';runAgenda();var result=tick();if(result.annualDue)annual();");
  assert.equal(run(now,'JSON.stringify(S)'),run(old,'JSON.stringify(S)'),`level ${lvl}, month ${m}`);assert.equal(run(now,'seed'),run(old,'seed'));
 }
 passed++;
}
// Run the existing land-event simulation body unchanged, in the same VM (no file:// browser).
const original=fs.readFileSync(path.join(root,'tests/land-event-20261106/landsim.cjs'),'utf8');
const landBody=original.split('const r=await p.evaluate(()=>{')[1].split('return out;});')[0];
const land=context();const result=JSON.parse(run(land,'JSON.stringify((()=>{'+landBody+'return out;})())'));
const oldLand=context('backups/index-before-ui-cards-20261106.html');
const oldResult=JSON.parse(run(oldLand,'JSON.stringify((()=>{'+landBody+'return out;})())'));
assert.deepEqual(result,oldResult);passed++;
fs.writeFileSync(path.join(__dirname,'classification-counts.json'),JSON.stringify(counts,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'land-event.json'),JSON.stringify({source:'tests/land-event-20261106/landsim.cjs',execution:'unchanged evaluate callback in VM',result},null,2)+'\n');
console.log(JSON.stringify({passed,classificationCases:180,campaignMonthsPerVersion:600,landEventMonthsPerVersion:18000,landEventParity:true,failed:0},null,2));
