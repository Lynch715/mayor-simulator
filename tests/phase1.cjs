const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8').split('<script>')[1].split("document.addEventListener('DOMContentLoaded',()=>{")[0];
let count=0;
function context(){const storage=new Map();const ctx=vm.createContext({console,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});vm.runInContext(source,ctx);vm.runInContext('let testSeed=123456789;Math.random=()=>((testSeed=(1664525*testSeed+1013904223)>>>0)/4294967296);newGame();',ctx);return ctx;}
function run(c,code){return vm.runInContext(code,c);}
function test(name,fn){try{fn();count++;console.log('PASS',name);}catch(e){console.error('FAIL',name,e.stack);process.exitCode=1;}}
function near(a,b){assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);}
function cash(c){return run(c,'S.cash');}
function balance(c){near(run(c,'S.monthly.cashbook.error'),0);near(run(c,'landFree()'),run(c,'S.land'));assert.ok(run(c,'Object.values(S.phase1.land.free).every(v=>Number.isFinite(v)&&v>=-1e-7)'));}
const old=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/pre-v111-levels.json'),'utf8'));
for(let lvl=0;lvl<5;lvl++)test('原版真实结构存档迁移及幂等：岗位'+lvl,()=>{
 const c=context(),before=old[lvl];c.input=JSON.parse(JSON.stringify(before));run(c,'S=input;migrate()');
 for(const k of ['cash','reserve','land','landSold','landTotal','lvl','age','year','month','merit','housing','env','staff'])assert.equal(run(c,`S.${k}`),before[k],k);
 for(const k of ['build','ind','cq','sb','file','sched','ratings','hist'])assert.deepEqual(JSON.parse(run(c,`JSON.stringify(S.${k})`)),(k==='ind'?before[k].map(x=>({...x,cut:x.cut||0})):before[k]),k);
 const migrated=run(c,'JSON.stringify(S)');run(c,'migrate();migrate()');assert.equal(run(c,'JSON.stringify(S)'),migrated);
 run(c,'tick()');balance(c);
 for(const view of ['vOver','vBuild','vFin','vDebt','vHR','vFile',...(lvl>=1?['vLand']:[]),...(lvl>=2?['vInd']:[]),...(lvl>=3?['vRegion']:[]),...(lvl>=4?['vDistrict']:[])])assert.ok(run(c,`${view}().length>0`));
});
test('旧存档首次读取原字节备份，后续不覆盖',()=>{const c=context();c.input=JSON.stringify(old[1]);run(c,"LS.set('yifang_save',input);load()");assert.equal(run(c,"LS.get('yifang_save_before_v111')"),c.input);run(c,'save();load()');assert.equal(run(c,"LS.get('yifang_save_before_v111')"),c.input);});
test('34项名录完整且数值有限，污染四档数量正确',()=>{const c=context();assert.equal(run(c,'SOE.length'),34);assert.equal(run(c,'SOE.filter(x=>x[2]===1).length'),8);assert.equal(run(c,'SOE.filter(x=>x[2]===2).length'),9);assert.equal(run(c,'SOE.filter(x=>x[2]===3).length'),7);assert.equal(run(c,'SOE.filter(x=>x[2]===4).length'),10);assert.ok(run(c,'SOE.every(([id])=>[FAC[id].cost,FAC[id].tax,FAC[id].powerUse,FAC[id].waterUse,FAC[id].waste].every(Number.isFinite))'));});
test('土地出租不发一次性现金、不重复使用、租金独立入账',()=>{const c=context(),before=cash(c);run(c,'leaseLand(30,5)');near(cash(c),before);near(run(c,'S.land'),570);near(run(c,'landFree("ind")'),240);assert.equal(run(c,'S.phase1.land.leased'),30);run(c,'tick()');assert.ok(run(c,'S.monthly.cashbook.totals.rent>0'));assert.equal(run(c,'S.monthly.cashbook.oneoff'),0);balance(c);});
test('租约最后一次付款后归还工业用地，不能重复收租',()=>{const c=context();run(c,'leaseLand(30,5);S.phase1.leases[0].left=1;tick()');assert.equal(run(c,'S.phase1.leases.length'),0);near(run(c,'S.land'),600);assert.ok(run(c,'S.monthly.rent>0'));run(c,'tick()');assert.equal(run(c,'S.monthly.rent'),0);balance(c);});
test('非法租约、NaN及超过工业库存不改资产',()=>{const c=context(),before=run(c,'JSON.stringify(S)');for(const expr of ['leaseLand(-1)','leaseLand(NaN)','leaseLand(99999)','leaseLand(3,1)'])assert.ok(run(c,expr));assert.equal(run(c,'JSON.stringify(S)'),before);});
test('旧事件卖地按折价和指定面积同时记现金、土地、出让统计',()=>{const c=context();const price=run(c,'landPrice()');run(c,'applyFx({cashLand:.3,land:-40})');near(run(c,'S.land'),560);near(run(c,'S.landSold'),40);near(run(c,'S.landRev'),40*price*.3);near(run(c,'S.phase1.finance.entries[0].amount'),40*price*.3);run(c,'tick()');balance(c);});
test('无地时事件不能凭空卖地',()=>{const c=context();run(c,"landTake(600,'any');applyFx({cashLand:1})");near(cash(c),180);near(run(c,'S.landRev'),0);});
test('按宗出让只扣对应用途，原限价配建和协议方式仍可用',()=>{for(const how of ['auction','limit','deal']){const c=context();run(c,`initLevel(1,0);S.env=70;S.plots=[{use:'ind',mu:400,heat:1.3,loc:'测试宗地',id:'test'}];S.planZone='mixed'`);const before=run(c,'landFree("ind")');assert.equal(run(c,`plotAct(0,'${how}')`),null);near(run(c,'landFree("ind")'),before-400);run(c,'tick()');balance(c);}});
test('旧手工出让及盘活资产完整入账',()=>{const c=context();run(c,"sellLand(20);issueCQ(200,36);revitalize();tick()");assert.ok(run(c,'S.monthly.cashbook.totals.land>0'));assert.ok(run(c,'S.monthly.cashbook.totals.principal<0'));balance(c);});
test('新项目不能挪用住宅地；保护地不参与兜底',()=>{const c=context();run(c,"landTake(landFree('ind'),'ind');S.planZone='mixed'");const before=run(c,'JSON.stringify(S.phase1.land)');assert.ok(run(c,"queueBuild('grain')"));assert.equal(run(c,'JSON.stringify(S.phase1.land)'),before);});
test('各片区污染准入及县级会审不被建设入口绕过',()=>{const c=context();assert.ok(run(c,"queueBuild('chemical')"));run(c,"S.planZone='eco'");assert.ok(run(c,"queueBuild('grain')"));run(c,"initLevel(1,0);S.planZone='heavy'");assert.ok(run(c,"queueBuild('refinery')"));run(c,"S.env=80;S.npc.boss.f=100;S.ag='permit_refinery';runAgenda()");assert.equal(run(c,'S.phase1.permits.refinery'),1);assert.equal(run(c,"queueBuild('refinery')"),null);assert.equal(run(c,'S.phase1.permits.refinery'),0);assert.ok(run(c,"queueBuild('refinery')"));});
test('旧招商事件被拒绝时不发放项目收益或污染扣分',()=>{const c=context();const before=run(c,'[S.pros,S.env,S.f.factory,S.cash].join()');run(c,'applyFx({fac:{id:"factory",n:1},pros:5,env:-6})');assert.equal(run(c,'[S.pros,S.env,S.f.factory,S.cash].join()'),before);});
test('企业增加提升真实需求，短缺压低生产；扩容能恢复',()=>{const c=context();run(c,"S.f.grain=12;for(let i=0;i<12;i++)S.ind.push({id:'grain',age:60})");const before=run(c,'utilityStatus().power.demand');assert.ok(before>run(c,'utilityStatus().power.capacity'));const tax=run(c,'taxIndustry()');run(c,'S.f.power+=5;S.f.water+=5');assert.ok(run(c,'taxIndustry()')>tax);});
test('供水收入受容量限制，污水只对实际处理量收费',()=>{const c=context();run(c,'S.f.water=0;S.f.sewage=0');assert.equal(run(c,'utilityStatus().water.served'),0);assert.equal(run(c,'utilityStatus().sewage.served'),0);run(c,'S.f.water=100');near(run(c,'utilityStatus().water.served'),run(c,'utilityStatus().water.demand'));});
test('经营毛收入不直接全部扩大借债额度；卖地不扩大经常性收入',()=>{const c=context();const inc=run(c,'annualIncome()');run(c,'sellLand(10)');near(run(c,'annualIncome()'),inc);near(run(c,'annualIncome()'),run(c,'(taxCommerce()+taxIndustry()+transferPay()+rentIncome()+Math.max(0,utilityRevenue()-utilityMaintenance()))*12'));});
test('环境正向加分月度封顶、负向不受上限影响',()=>{const c=context();run(c,'envChange(99,"event");envChange(99,"action")');near(run(c,'S.phase1.environment.event+S.phase1.environment.action'),5);const env=run(c,'S.env');run(c,'envChange(-10,"event");envChange(99,"event")');near(run(c,'S.env'),env-10);});
test('跨市园区与竞标不能绕过片区或用地约束',()=>{const c=context();run(c,"initLevel(3,0);S.cash=10000000;phaseReset();S.planZone='eco'");const before=run(c,'[S.cash,S.ind.length,S.land].join()');assert.ok(run(c,"coopDo(0,'park')"));assert.ok(run(c,'bidBig(3)'));assert.equal(run(c,'[S.cash,S.ind.length,S.land].join()'),before);});
test('原数值输入入口拒绝NaN，防止存档余额污染',()=>{const c=context();const before=run(c,'[S.cash,S.land,cqOut(),sbOut()].join()');for(const expr of ['sellLand(NaN)','issueCQ(NaN,36)','issueSB(NaN,60)','repayCQ(NaN)'])assert.ok(run(c,expr));assert.equal(run(c,'[S.cash,S.land,cqOut(),sbOut()].join()'),before);});
test('其他事件收入也属于一次性收入，支出不混入收入',()=>{const c=context();run(c,'applyFx({cash:10});applyFx({cash:-5});tick()');near(run(c,'S.monthly.cashbook.oneoff'),10);near(run(c,'S.monthly.cashbook.totals.event'),-5);balance(c);});
test('准备金还本完整列示资金转入和本金支付，现金余额仍对平',()=>{const c=context();run(c,'S.reserve=60;S.cq=[{amt:100,rate:7,left:36,term:36}];repayCQ(100);tick()');near(run(c,'S.monthly.cashbook.totals.principal'),-100);assert.ok(run(c,'S.monthly.cashbook.entries.some(e=>e.kind==="reserve"&&e.amount===60)'));balance(c);});
test('新版租约、技改、待结流水及选定专项工作保存读取不重复发放',()=>{const c=context();run(c,"leaseLand(20,10);S.phase1.tech.factory=2;S.ag='govern';sellLand(5);save();");const before=run(c,'JSON.stringify(S)');assert.ok(run(c,'load()'));assert.equal(run(c,'JSON.stringify(S)'),before);});
test('镇级高污染项目获县级审批后可建设，资格仅消耗一次',()=>{const c=context();run(c,"S.env=80;S.npc.boss.f=100;S.ag='permit_chemical';runAgenda();");assert.equal(run(c,'S.phase1.permits.chemical'),1);assert.equal(run(c,"queueBuild('chemical')"),null);assert.equal(run(c,'S.phase1.permits.chemical'),0);assert.ok(run(c,"queueBuild('chemical')"));});
test('环境自然恢复、污染、生态、超载及截断能够对平',()=>{for(const env of [0,20,99,100]){const c=context();run(c,`S.env=${env};phaseReset();S.f.grain=2;S.ind=[{id:'grain',age:60}];envChange(3,'event');tick()`);const E=run(c,'S.monthly.environment');near(E.opening+E.natural+E.ecology+E.action+E.event+E.pollution+E.overflow+E.clipping,E.closing);assert.ok(E.closing>=0&&E.closing<=100);}});
test('生态设施收益封顶，厂技改确实降低持续污染',()=>{const c=context();run(c,"S.cash=100000;phaseReset();S.f.grain=1;S.ind=[{id:'grain',age:60}];S.f.park=100;S.f.wetland=100;tick()");assert.ok(run(c,'S.monthly.environment.ecology<=2'));const pollution=run(c,'S.monthly.environment.pollution');run(c,"S.ag='tech_grain';runAgenda();tick()");assert.ok(run(c,'S.monthly.environment.pollution')>pollution);balance(c);});
test('专项行动占用原月度唯一安排，不能即时获得奖励',()=>{const c=context();run(c,"S.cash=1000;phaseReset();S.ag='study'");const before=cash(c);assert.equal(run(c,"schedulePhaseAction('govern')"),null);near(cash(c),before);assert.equal(run(c,'S.ag'),'govern');run(c,'runAgenda()');assert.ok(cash(c)<before);assert.ok(run(c,'S.phase1.environment.action>0'));});
test('低环境否决晋升，整改恢复后原晋升链继续有效',()=>{const c=context();run(c,'initLevel(1,200);S.env=20;S.pros=95;S.liv=95;S.sat=95;S.cq=[];S.unity=70');assert.notEqual(run(c,'annual().next'),'promote');run(c,'S.env=70;S.phase1.envLock=false;S.pros=95;S.liv=95;S.sat=95;S.unity=70');assert.equal(run(c,'annual().next'),'promote');});
test('未来三月预测不修改存档或调用随机数；到期债务只计一次',()=>{const c=context();run(c,'S.cq=[{amt:100,rate:7,left:2,term:36}]');const before=run(c,'JSON.stringify(S)');run(c,'Math.random=()=>{throw Error("random in forecast")};');const rows=run(c,'cashForecast()');assert.deepEqual(Array.from(rows,x=>x.principal),[0,100,0]);assert.equal(run(c,'JSON.stringify(S)'),before);});
test('预测区分专项债受限资金和可用现金，租约到期不继续计收入',()=>{const c=context();run(c,'S.sbUnspent=1000;leaseLand(30,5);S.phase1.leases[0].left=1');const rows=run(c,'cashForecast()');near(rows[0].cash-rows[0].available,1000);assert.ok(rows[1].income<rows[0].income);});
test('到期本金部分偿还不返还已支付现金，也不重复滚存',()=>{const c=context();run(c,'S.cash=0;S.reserveRate=0;S.cq=[{amt:1000,rate:0,left:1,term:36}];phaseReset();tick()');const paid=run(c,'S.monthly.principal');assert.ok(paid>=0);near(run(c,'cqOut()'),1000-paid);balance(c);});
test('借债、事件补助、主动还本和专项债分别归类',()=>{const c=context();run(c,"initLevel(1,0);S.cash=10000;phaseReset();queueBuild('hosp');issueCQ(500,36);issueSB(300,60);applyFx({cash:10});S.ag='province';Math.random=()=>.1;runAgenda();repayCQ(20);tick()");assert.ok(run(c,'S.monthly.cashbook.totals.financing>0'));assert.ok(run(c,'S.monthly.cashbook.totals.eventIncome>0'));assert.ok(run(c,'S.monthly.cashbook.totals.principal<0'));balance(c);});
test('升职不携带原城市租约、土地或专项债；保留个人履历和责任',()=>{const c=context();run(c,"leaseLand(20,5);S.file.push({y:1,t:'旧责任',sev:2,exp:false});initLevel(1,25)");assert.equal(run(c,'S.phase1.leases.length'),0);assert.equal(run(c,'S.hist[0].phase1.leases.length'),1);assert.ok(run(c,'S.file.some(f=>f.t==="旧责任")'));assert.equal(run(c,'S.merit'),25);});
test('所有旧事件选项、各岗位连续月结不出NaN且现金可对平',()=>{
 const c=context();const lengths=run(c,'[EV.length,PET.length]');let cases=0;
 for(let lv=0;lv<5;lv++){
  const options=run(c,`EV.concat(PET).filter(e=>!e.lv||(${lv}>=e.lv[0]&&${lv}<=e.lv[1])).flatMap(e=>e.opts.map(o=>o.fx||{}))`);
  for(const fx of options){run(c,`newGame();initLevel(${lv},0);S.cash=10000000;phaseReset();`);c.fx=fx;run(c,'applyFx(fx);tick()');balance(c);assert.ok(run(c,'[S.cash,S.env,S.land,S.pros,S.liv,S.sat,hdr()].every(Number.isFinite)'));cases++;}
 }
 console.log('  old event option cases:',cases,'event catalogs:',lengths.join('/'));
});
test('五级玩法连续十年结算：含融资、土地、建设、租赁、区县预算',()=>{
 for(let lv=0;lv<5;lv++){const c=context();run(c,`initLevel(${lv},0);S.cash=10000000;phaseReset();leaseLand(Math.min(30*S.lsc,landFree('ind')),5);queueBuild('hosp');if(S.dist){for(const k in S.alloc)S.alloc[k].fund=1;}`);
  for(let m=0;m<120;m++){run(c,'runAgenda();var step=tick();if(step.annualDue)annual();');balance(c);assert.ok(run(c,'[S.cash,S.env,S.land,S.pros,S.liv,S.sat,hdr()].every(Number.isFinite)'));}
 }
});
console.log(`${count} tests passed${process.exitCode?', failures above':''}`);
