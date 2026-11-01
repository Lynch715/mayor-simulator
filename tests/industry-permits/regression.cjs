const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(process.argv[2]||path.join(root,'index.html'),'utf8').split('<script>')[1].split("document.addEventListener('DOMContentLoaded',()=>{")[0];
const run=(c,s)=>vm.runInContext(s,c,{timeout:10000});
const json=(c,s)=>JSON.parse(run(c,'JSON.stringify('+s+')'));
function context(level=0){
 const store=new Map(),c=vm.createContext({console,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}});
 run(c,source);run(c,`newGame();${level?'initLevel('+level+',0);':''}S.cash=1000000;S.env=85;S.npc.boss.f=100;Math.random=()=>.1;`);return c;
}
function approve(c,id='factory'){assert.equal(run(c,`schedulePhaseAction('permit_${id}')`),null);run(c,'runAgenda()');}
let passed=0,failed=0;
function test(name,f){try{f();passed++;console.log('PASS',name);}catch(e){failed++;console.error('FAIL',name,e.message);}}
test('复现截图：通用县批后可在重工业治理片区立项冶炼、造纸或化工',()=>{
 for(const id of ['metal','paper','chemical']){const c=context();approve(c);run(c,"S.planZone='heavy'");assert.equal(run(c,`industryGate('${id}','heavy')`),null);assert.equal(run(c,`queueBuild('${id}')`),null);assert.equal(run(c,'S.phase1.permits.factory'),0);assert.equal(run(c,'S.build.length'),1);assert.ok(run(c,'S.build[0].p2Id'));}
});
test('七种高污染国企均可使用通用县批；一份资格只准一次立项',()=>{
 const ids=json(context(),'SOE.filter(x=>x[2]===3).map(x=>x[0])');
 for(const id of ids){const c=context();approve(c);assert.equal(run(c,`queueBuild('${id}')`),null);assert.equal(run(c,'S.phase1.permits.factory'),0);assert.match(run(c,"queueBuild('paper')"),/县级审批/);assert.ok(run(c,'Object.values(S.phase1.permits).every(n=>Number.isFinite(n)&&n>=0)'));}
});
test('安排审批不即时发资格；实际月结执行后才能立项',()=>{
 const c=context();assert.equal(run(c,"schedulePhaseAction('permit_factory')"),null);assert.ok(run(c,"industryGate('paper')"));run(c,'runAgenda();tick()');assert.equal(run(c,'S.phase1.permits.factory'),1);assert.equal(run(c,"queueBuild('paper')"),null);assert.equal(run(c,'S.agUse.permit_factory'),1);
});
test('环境不合格或随机审批失败不发资格',()=>{
 for(const setup of ['S.env=59','Math.random=()=>.99']){const c=context();run(c,setup);approve(c);assert.equal(run(c,'S.phase1.permits.factory||0'),0);assert.ok(run(c,"industryGate('metal')"));}
});
test('先用本企业专属资格，保留通用资格供其他项目',()=>{
 const c=context();approve(c);approve(c,'paper');assert.equal(run(c,"queueBuild('paper')"),null);assert.equal(run(c,'S.phase1.permits.paper'),0);assert.equal(run(c,'S.phase1.permits.factory'),1);assert.equal(run(c,"queueBuild('metal')"),null);assert.equal(run(c,'S.phase1.permits.factory'),0);
});
test('专属审批不用于其他国企或招商工厂',()=>{
 const c=context();approve(c,'paper');assert.ok(run(c,"industryGate('metal')"));assert.ok(run(c,"industryGate('factory')"));assert.equal(run(c,"queueBuild('paper')"),null);
});
test('失败立项不扣资格或挪用土地，修复条件后可继续',()=>{
 for(const setup of ["S.planZone='eco'","S.planZone='low'","S.f.power=0","landTake(landFree('ind'),'ind')"]){const c=context();approve(c);run(c,setup);const before=json(c,'[S.phase1.permits,S.phase1.land,S.cash,S.build]');assert.ok(run(c,"queueBuild('paper')"));assert.deepEqual(json(c,'[S.phase1.permits,S.phase1.land,S.cash,S.build]'),before);}
});
test('县级通用资格不代替市级重污染会审或镇级禁入',()=>{
 const town=context();approve(town);run(town,"S.planZone='heavy'");assert.ok(run(town,"queueBuild('refinery')"));assert.equal(run(town,'S.phase1.permits.factory'),1);
 const county=context(1);run(county,"S.phase1.permits.factory=2;S.planZone='heavy'");assert.match(run(county,"queueBuild('refinery')"),/市级会审/);approve(county,'refinery');assert.equal(run(county,"queueBuild('refinery')"),null);assert.equal(run(county,'S.phase1.permits.refinery'),0);assert.equal(run(county,'S.phase1.permits.factory'),2);assert.ok(run(county,"queueBuild('refinery')"));
});
test('市级会审不绕过资源、片区条件，失败不扣资格',()=>{
 const c=context(1);approve(c,'oilfield');run(c,"S.planZone='heavy'");assert.match(run(c,"queueBuild('oilfield')"),/资源/);assert.equal(run(c,'S.phase1.permits.oilfield'),1);run(c,"S.phase1.resources.push('油气');S.planZone='mixed'");assert.match(run(c,"queueBuild('oilfield')"),/片区/);assert.equal(run(c,'S.phase1.permits.oilfield'),1);run(c,"S.planZone='heavy'");assert.equal(run(c,"queueBuild('oilfield')"),null);assert.equal(run(c,'S.phase1.permits.oilfield'),0);
});
test('低中污染无需审批，不扣通用资格；县级以上高污染不扣旧资格',()=>{
 const c=context();approve(c);for(const id of ['grain','cng'])assert.equal(run(c,`queueBuild('${id}')`),null);assert.equal(run(c,'S.phase1.permits.factory'),1);
 const county=context(1);run(county,'S.phase1.permits.factory=1');assert.equal(run(county,"queueBuild('paper')"),null);assert.equal(run(county,'S.phase1.permits.factory'),1);
});
test('旧档只存factory资格也直接生效，迁移、保存、读取不改存量资产',()=>{
 const c=context();run(c,'S.phase1.permits={factory:1,paper:1};save();var old=LS.get("yifang_save");migrate();migrate();save();load()');assert.equal(run(c,'JSON.stringify(S)'),run(c,'old'));assert.equal(run(c,"queueBuild('metal')"),null);run(c,'save();load()');assert.equal(run(c,'S.phase1.permits.factory'),0);assert.equal(run(c,'S.phase1.permits.paper'),1);assert.equal(run(c,'S.build[0].id'),'metal');assert.equal(run(c,"queueBuild('paper')"),null);
});
test('旧版真实存档获批后跨版本读取，不要求玩家重批',()=>{
 const oldSource=fs.readFileSync(path.join(__dirname,'before.html'),'utf8').split('<script>')[1].split("document.addEventListener('DOMContentLoaded',()=>{")[0];
 const old=vm.createContext({console,localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}});run(old,oldSource);run(old,"newGame();S.env=85;S.npc.boss.f=100;Math.random=()=>.1;S.ag='permit_factory';runAgenda()");
 const c=context();c.raw=run(old,'JSON.stringify(S)');run(c,'LS.set("yifang_save",raw);load()');assert.equal(run(c,'S.phase1.permits.factory'),1);assert.equal(run(c,"queueBuild('metal')"),null);assert.equal(run(c,'S.phase1.permits.factory'),0);
});
test('招商事件消耗同一通用资格，不能重复用于国企',()=>{
 const c=context();approve(c);const count=run(c,'S.f.factory||0');run(c,'addEventFactory(1)');assert.equal(run(c,'S.f.factory'),count+1);assert.equal(run(c,'S.phase1.permits.factory'),0);assert.ok(run(c,"queueBuild('paper')"));
});
for(const kind of ['p3_expand','p3_move'])test(kind+' 同步消耗通用资格且无NaN，第二家被拦截',()=>{
 const c=context();run(c,"recruitSpecialist('commerce');S.f.paper=1;S.ind.push({id:'paper',age:60});syncFirms();var firm=firmRecord(0);firm.stage='stable'");approve(c);assert.equal(run(c,`firmGate('${kind}',firm.uid)`),null);assert.match(run(c,`firmWork('${kind}',firm.uid)`),/扩产|搬迁/);assert.equal(run(c,'S.phase1.permits.factory'),0);assert.ok(run(c,"queueBuild('metal')"));assert.ok(run(c,'Object.values(S.phase1.permits).every(n=>Number.isFinite(n)&&n>=0)'));
});
test('建设卡片直接显示项目审批入口、通用余量和待办状态',()=>{
 const c=context();run(c,"S.buildCat='ind'");let html=run(c,'vBuild()');assert.ok(html.includes('县级通用审批资格：0项'));assert.match(html,/<div class="phase-permit">[\s\S]*?data-phase-action="permit_metal"/);
 run(c,"schedulePhaseAction('permit_factory')");assert.ok(run(c,'vIndustryPermit("paper")').includes('本月已安排审批'));run(c,'runAgenda();S.ag=""');html=run(c,'vIndustryPermit("metal")');assert.ok(html.includes('资格：1项（含通用1项）'));assert.ok(!html.includes('data-phase-action'));
 const county=context(1);run(county,"S.buildCat='ind'");assert.ok(run(county,'vIndustryPermit("refinery")').includes('申报市级会审'));
});
console.log(JSON.stringify({passed,failed}));if(failed)process.exitCode=1;
