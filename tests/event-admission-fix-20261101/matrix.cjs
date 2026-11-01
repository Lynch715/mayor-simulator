const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),html=fs.readFileSync(process.argv[2]||path.join(root,'index.html'),'utf8');
const source=html.split('<script>')[1].split("document.addEventListener('DOMContentLoaded',()=>{")[0];
const run=(c,s)=>vm.runInContext(s,c,{timeout:10000}),json=(c,s)=>JSON.parse(run(c,'JSON.stringify('+s+')'));
let passed=0;const failures=[],counts={},examples={};
function check(group,label,fn){counts[group]=(counts[group]||0)+1;try{fn();passed++;}catch(error){failures.push({group,label,error:error.message.slice(0,700)});}}
function context(level=0){const store=new Map(),c=vm.createContext({console,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}});run(c,source);run(c,`newGame();${level?'initLevel('+level+',0);':''}S.cash=1e9;S.liv=95;S.env=90;S.npc.boss.f=100;S.f.power+=100;S.f.water+=100;S.f.sewage+=100;S.planZone='heavy';S.phase1.resources=['煤炭','油气'];Math.random=()=>.1;`);return c;}
function near(a,b){assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);}
const catalog=json(context(),'FACORDER.map(id=>({id,...FAC[id]}))');
const assets=c=>json(c,'({cash:S.cash,land:S.phase1.land,permits:S.phase1.permits,build:S.build,projects:S.careerProjects,f:S.f,ind:S.ind})');
for(let level=0;level<5;level++)for(const F of catalog)check('69设施×5级别',`${level} / ${F.id}`,()=>{
 const c=context(level),required=F.ind&&((F.grade===3&&level===0)||(F.grade===4&&level===1)),locked=F.lvl!==undefined&&level<F.lvl;
 const before=assets(c),result=run(c,`queueBuild('${F.id}')`);
 if(locked||required){assert.ok(result);assert.deepEqual(assets(c),before);if(locked)return;run(c,`S.phase1.permits.${F.id}=1`);}
 else {assert.equal(result,null);assert.equal(run(c,'S.build.length'),1);return;}
 const land=run(c,'landFree()');assert.equal(run(c,`queueBuild('${F.id}')`),null);assert.equal(run(c,`S.phase1.permits.${F.id}`),0);near(land-run(c,'landFree()'),run(c,`FAC.${F.id}.land*S.lsc*.35`));assert.equal(run(c,'S.careerProjects.length'),1);
});
for(const F of catalog.filter(f=>f.grade>=3))for(const zone of ['low','mixed','restricted','eco','heavy'])check('17类高重污染×5片区',F.id+' / '+zone,()=>{
 const c=context(F.grade===4?1:0);run(c,`S.phase1.permits.${F.id}=1;S.planZone='${zone}'`);const before=assets(c),result=run(c,`queueBuild('${F.id}')`);
 if(run(c,`ZONES.${zone}.max`)<F.grade){assert.ok(result);assert.deepEqual(assets(c),before);}else{assert.equal(result,null);assert.equal(run(c,`S.phase1.permits.${F.id}`),0);}
});
for(const F of catalog.filter(f=>f.ind))for(const reason of ['land','power'])check('全部工业失败不扣资格',F.id+' / '+reason,()=>{
 const c=context(Math.max(F.lvl||0,F.grade===4?1:0));run(c,`S.phase1.permits.${F.id}=1;${reason==='land'?"landTake(landFree('ind'),'ind')":"S.f.power=0"}`);const before=assets(c),result=run(c,`queueBuild('${F.id}')`);
 if(reason==='power'&&F.solar){assert.equal(result,null);return;}assert.ok(result);assert.deepEqual(assets(c),before);
});
for(const F of catalog.filter(f=>f.resource))check('资源条件与已批资格',F.id,()=>{
 const c=context(1);run(c,`S.phase1.resources=[];S.phase1.permits.${F.id}=1;`);const before=assets(c);assert.match(run(c,`queueBuild('${F.id}')`),/资源条件/);assert.deepEqual(assets(c),before);run(c,`S.phase1.resources.push('${F.resource}')`);assert.equal(run(c,`queueBuild('${F.id}')`),null);assert.equal(run(c,`S.phase1.permits.${F.id}`),0);
});
for(let level=0;level<5;level++)for(const F of [...catalog.filter(f=>f.ind),{id:'factory',ind:true}].filter(f=>(f.lvl||0)<=level))for(const kind of ['p3_expand','p3_move'])check('扩产搬迁执行与资格',`${level} / ${F.id} / ${kind}`,()=>{
 const c=context(level);run(c,`recruitSpecialist('commerce');${F.id==='factory'?"S.f.factory=1":"S.f['"+F.id+"']=1;S.ind.push({id:'"+F.id+"',age:60,cut:0})"};syncFirms();var firm=S.phase3.firms.find(f=>f.fac==='${F.id}');firm.stage='stable';`);
 const approval=run(c,`industryApproval('${F.id}')`),permit=F.grade===3&&level===0?'factory':F.id;
 if(approval){assert.match(run(c,`schedulePhase3('${kind}',firm.uid)`),/审批|会审/);run(c,`S.phase1.permits.${permit}=1`);}
 const before=assets(c);assert.equal(run(c,`schedulePhase3('${kind}',firm.uid)`),null);assert.deepEqual(assets(c),before);
 run(c,'save();var raw=JSON.stringify(S);load()');assert.equal(run(c,'JSON.stringify(S)'),run(c,'raw'));run(c,'runAgenda()');assert.equal(run(c,'firmById(firm.uid).stage'),kind==='p3_expand'?'expanding':'relocating');
 if(approval)assert.equal(run(c,`S.phase1.permits.${permit}`),0);assert.ok(run(c,'Object.values(S.phase1.permits).every(v=>Number.isFinite(v)&&v>=0)'));
 assert.ok(run(c,'S.cash')<before.cash);assert.ok(run(c,'landFree()')<before.land.free.ind+before.land.free.com+before.land.free.res);
});
for(const type of ['road','pipe','sewage','park','renewal','water'])for(const scenario of ['normal','land','cash','role','expiry','save'])check('六类市政合同',type+' / '+scenario,()=>{
 const c=context(1);run(c,`bidMunicipal('${type}');var offer=S.phase2.offers[0];`);assert.ok(run(c,'offer'));
 if(scenario==='land')run(c,"landTake(landFree(),'any')");if(scenario==='cash')run(c,'S.cash=0');if(scenario==='role')run(c,"assignCadre('C1','')");if(scenario==='expiry')run(c,'S.projectClock=offer.expires+1');
 if(scenario==='save'){run(c,'save();var raw=JSON.stringify(S);load()');assert.equal(run(c,'JSON.stringify(S)'),run(c,'raw'));}
 const before=assets(c),result=run(c,'startMunicipal(offer.uid)');
 if(!['normal','save'].includes(scenario)){assert.ok(result);assert.deepEqual(assets(c),before);assert.equal(run(c,'offer.state'),'offered');return;}
 assert.equal(result,null);assert.equal(run(c,'S.phase2.offers.find(o=>o.uid===offer.uid).state'),'started');assert.equal(run(c,'S.careerProjects[0].grant.status'),'municipal');const first=assets(c);assert.ok(run(c,'startMunicipal(offer.uid)'));assert.deepEqual(assets(c),first);
});
for(const F of catalog)check('全部项目专项补贴资格',F.id,()=>{
 const level=Math.max(F.lvl||0,F.grade===4?1:0),c=context(level);run(c,`S.phase1.permits.${F.id}=1;queueBuild('${F.id}');var project=S.careerProjects[0]`);assert.ok(run(c,'project'));
 const cash=run(c,'S.cash'),amount=run(c,'Math.round(project.cost*grantRule(project).ratio)'),budget=run(c,'LV[S.lvl].transfer*2');if(amount>budget){assert.match(run(c,'subsidyGate(project.uid)'),/总额不足/);run(c,'applyProjectSubsidy(project.uid)');assert.equal(run(c,'project.grant.status'),'none');near(run(c,'S.cash'),cash);return;}
 assert.equal(run(c,'subsidyGate(project.uid)'),null);run(c,'applyProjectSubsidy(project.uid)');assert.equal(run(c,'project.grant.status'),'approved');near(run(c,'S.cash'),cash);assert.ok(run(c,'subsidyGate(project.uid)'));run(c,'save();var raw=JSON.stringify(S);load()');assert.equal(run(c,'JSON.stringify(S)'),run(c,'raw'));
});
for(const family of ['pre-v111-levels','pre-v112-levels','pre-v113-levels','pre-v114-levels','v114-scenes'])for(let level=0;level<5;level++)check('旧档迁移资产与资格保留',family+' / '+level,()=>{
 const input=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures',family+'.json'),'utf8'))[level],c=context();c.input=input;run(c,'S=JSON.parse(JSON.stringify(input));migrate();var migrated=JSON.stringify(S);migrate();save();load()');assert.equal(run(c,'JSON.stringify(S)'),run(c,'migrated'));
 for(const key of ['cash','land','build','ind','hist','careerProjects'])if(input[key]!==undefined)assert.deepEqual(json(c,'S.'+key),key==='ind'?input.ind.map(x=>({...x,cut:x.cut||0})):input[key]);if(input.phase1?.permits)assert.deepEqual(json(c,'S.phase1.permits'),input.phase1.permits);
});
for(let level=0;level<5;level++)check('招商事件县批与片区',String(level),()=>{
 const c=context(level),fx=run(c,'EV.find(e=>e.id==="factory").opts[0].fx');c.fx=fx;if(level===0)run(c,'S.phase1.permits.factory=1');const count=run(c,'S.f.factory||0');run(c,'applyFx(fx)');assert.equal(run(c,'S.f.factory'),count+1);if(level===0)assert.equal(run(c,'S.phase1.permits.factory'),0);
 run(c,"S.planZone='eco'");const before=assets(c);assert.ok(run(c,'eventAdmission(fx)'));run(c,'applyFx(fx)');assert.deepEqual(assets(c),before);
});
const buildEvents=json(context(),'EV.concat(PET).flatMap(e=>e.opts.filter(o=>o.fx?.q||o.fx?.q2).map(o=>({id:e.id,levels:e.lv,option:o.t,fx:o.fx})))');
for(let level=2;level<5;level++)for(const id of ['agri','logi','fzone','mall','tour','tech','port','fin','aero'].filter(id=>(catalog.find(f=>f.id===id).lvl||0)<=level))for(const zone of ['heavy','eco'])check('真实招商项目池',level+' / '+id+' / '+zone,()=>{
 const c=context(level);run(c,`S.planZone='${zone}';S.leads=[{fac:'${id}',n:'合规招商样本',ask:{land:20,cash:100,cut:0},inv:1000,y:1}];`);const before=assets(c),result=run(c,"leadAct(0,'take')");
 if(zone==='eco'){assert.ok(result);assert.deepEqual(assets(c),before);}else{assert.equal(result,null);assert.equal(run(c,'S.ind.length'),before.ind.length+1);near(run(c,'landFree("ind")'),before.land.free.ind-20);assert.equal(run(c,'S.careerProjects.length'),before.projects.length+1);}
});
for(const id of ['tech','port','fin','fzone','tour'])for(const scenario of ['win','lose','zone','land','cash'])check('真实区域竞标项目池',id+' / '+scenario,()=>{
 const c=context(3);run(c,`S.bigp={fac:'${id}',n:'区域竞标样本',base:100,r:[.01,.01]};`);
 if(scenario==='lose')run(c,'S.bigp.r=[1000,1000]');if(scenario==='zone')run(c,"S.planZone='eco'");if(scenario==='land')run(c,"landTake(landFree('ind'),'ind')");if(scenario==='cash')run(c,'S.cash=0');const before=assets(c),result=run(c,'bidBig(3)');
 if(['zone','land','cash'].includes(scenario)){assert.ok(result);assert.deepEqual(assets(c),before);}else{assert.equal(result,null);assert.equal(run(c,'S.ind.length'),before.ind.length+(scenario==='win'?1:0));if(scenario==='lose')near(run(c,'S.land'),before.land.free.ind+before.land.free.res+before.land.free.com);}
});
for(const scenario of ['normal','zone','land','cash'])check('跨市产业园落地',scenario,()=>{
 const c=context(3);if(scenario==='zone')run(c,"S.planZone='eco'");if(scenario==='land')run(c,"landTake(landFree('ind'),'ind')");if(scenario==='cash')run(c,'S.cash=0');const before=assets(c),result=run(c,"coopDo(0,'park')");if(scenario==='normal'){assert.equal(result,null);assert.equal(run(c,'S.ind.length'),before.ind.length+1);}else{assert.ok(result);assert.deepEqual(assets(c),before);}
});
for(const type of ['basic','better','luxury'])for(const mode of ['self','private'])for(const scenario of ['normal','land','road','role','finance','cash','restricted','save'])check('住宅开发审批',`${type} / ${mode} / ${scenario}`,()=>{
 const c=context(1);run(c,'S.f.road+=100;S.f.pipe+=100;S.f.park+=100;S.phase3.market.index=1.2;S.pros=90;');
 if(scenario==='land')run(c,"landTake(landFree('res'),'res')");if(scenario==='road')run(c,'S.f.road=0');if(scenario==='role')run(c,"assignCadre('C1','')");if(scenario==='finance')run(c,"assignCadre('C3','')");if(scenario==='cash')run(c,'S.cash=0');if(scenario==='restricted')run(c,'S.nosell=6');
 const blocked=['land','road','role'].includes(scenario)||(mode==='self'&&['finance','cash'].includes(scenario))||(mode==='private'&&scenario==='restricted'),before=assets(c),result=run(c,`startHome('${type}','${mode}')`);
 if(blocked){assert.ok(result);assert.deepEqual(assets(c),before);assert.equal(run(c,'S.phase3.homes.length'),0);}else{assert.equal(result,null);assert.equal(run(c,'S.phase3.homes.length'),1);assert.equal(run(c,'S.careerProjects[0].status'),'estate_construction');if(scenario==='save'){run(c,'save();var raw=JSON.stringify(S);load()');assert.equal(run(c,'JSON.stringify(S)'),run(c,'raw'));}}
});
for(const scenario of ['normal','eco','urban','cash','save'])check('退出矿区修复立项',scenario,()=>{
 const c=context(1);run(c,"recruitSpecialist('eco');S.f.coal=1;S.ind.push({id:'coal',age:60,cut:0});syncFirms();closeFirm(S.phase3.firms.find(f=>f.fac==='coal'),'审计样本退出');var mine=S.phase3.mines[0];");assert.ok(run(c,'mine'));
 if(scenario==='eco')run(c,"assignCadre(roleMember('eco').id,'')");if(scenario==='urban')run(c,"assignCadre('C1','')");if(scenario==='cash')run(c,'S.cash=0');const before=assets(c),result=run(c,'startMine(mine.uid)');if(['eco','urban','cash'].includes(scenario)){assert.ok(result);assert.deepEqual(assets(c),before);assert.equal(run(c,'mine.stage'),'idle');}else{assert.equal(result,null);assert.equal(run(c,'mine.stage'),'restoring');const state=assets(c);assert.ok(run(c,'startMine(mine.uid)'));assert.deepEqual(assets(c),state);if(scenario==='save'){run(c,'save();var raw=JSON.stringify(S);load()');assert.equal(run(c,'JSON.stringify(S)'),run(c,'raw'));}}
});
for(const ev of buildEvents)check('事件立项失败不得先发副作用',ev.id,()=>{
 const c=context(ev.levels?.[0]||0);run(c,"landTake(landFree(),'any')");c.fx=ev.fx;const before=json(c,'({cash:S.cash,sat:S.sat,pros:S.pros,liv:S.liv,sched:S.sched.length,build:S.build.length})'),gate=run(c,'eventAdmission(fx)');run(c,'applyFx(fx)');const after=json(c,'({cash:S.cash,sat:S.sat,pros:S.pros,liv:S.liv,sched:S.sched.length,build:S.build.length})');examples[ev.id]={event:ev,gate,before,after,logs:json(c,'S.log.slice(0,3).map(l=>l.t)')};assert.ok(gate,'事件选项未提前提示用地不足');assert.deepEqual(after,before);
});
check('工业事件不能绕过片区准入','land_cheap3',()=>{
 const c=context(1);run(c,"S.planZone='eco'");const fx=run(c,'EV.find(e=>e.id==="land_cheap3").opts.find(o=>o.fx?.q).fx');c.fx=fx;const before=assets(c);assert.ok(run(c,'eventAdmission(fx)'));run(c,'applyFx(fx)');examples.industrialEvent={fx,beforeCash:before.cash,afterCash:run(c,'S.cash'),beforePros:run(c,'S.pros-2'),afterPros:run(c,'S.pros'),build:run(c,'S.build.length'),logs:json(c,'S.log.slice(0,3).map(l=>l.t)')};assert.equal(run(c,'S.cash'),before.cash,'禁止工业的片区不应扣事件配套费');assert.equal(run(c,'S.build.length'),before.build.length);
});
check('双项目事件必须核验全部所需土地','metro',()=>{
 const c=context(2);run(c,"landTake(landFree(),'any');landAdd(FAC.road.land*S.lsc*.35,'com');");c.fx=run(c,'EV.find(e=>e.id==="metro").opts.find(o=>o.fx?.q2).fx');const before=run(c,'S.cash');run(c,'applyFx(fx)');examples.partialMetro={cashDelta:run(c,'S.cash')-before,projects:json(c,'S.build.map(b=>b.id)'),followupScheduled:run(c,'S.sched.some(s=>s.id==="metro2")')};assert.equal(run(c,'S.build.length'),0,'两项配套应一起通过或一起不执行');assert.equal(run(c,'S.cash'),before);assert.equal(run(c,'S.sched.some(s=>s.id==="metro2")'),false);
});
const report={date:'2026-11-01',sourceSha256:crypto.createHash('sha256').update(html).digest('hex'),scope:'Regression matrix for event admission repair; synthetic in-memory state only.',runtimeModified:true,counts,passed,failed:failures.length,failures,examples};
fs.writeFileSync(path.join(__dirname,'audit-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed,failed:failures.length,counts,failures},null,2));if(failures.length)process.exitCode=1;
