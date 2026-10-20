const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8').split('<script>')[1].split("document.addEventListener('DOMContentLoaded',()=>{")[0];const states=[];
for(let lv=0;lv<5;lv++){const c=vm.createContext({console});vm.runInContext(source,c);vm.runInContext(`let seed3=729;Math.random=()=>((seed3=(1664525*seed3+1013904223)>>>0)/4294967296);newGame();${lv?'initLevel('+lv+',50);':''}
S.cash=10000000;S.year=4;S.month=6;S.age=35;S.projectClock=42;S.env=85;S.npc.boss.f=95;phaseReset();phase3Reset();Math.random=()=>.5;
S.f.road+=10;S.f.water+=10;S.f.pipe+=10;S.f.sewage+=10;S.f.park+=10;recruitSpecialist('commerce');recruitSpecialist('eco');
S.ind.push({id:'grain',age:60,cut:0,nm:'验收粮油企业'});S.f.grain++;registerInvestment('grain',100,'验收粮油企业');syncFirms();var grain3=S.phase3.firms.at(-1);grain3.stage='reduced';grain3.health=30;grain3.bad=10;
S.ind.push({id:'coal',age:60,cut:0,nm:'验收退出煤矿'});S.f.coal++;registerInvestment('coal',100,'验收退出煤矿');syncFirms();closeFirm(S.phase3.firms.at(-1),'有序退出');startMine(S.phase3.mines[0].uid);mineStep();
S.ind.push({id:'paper',age:60,cut:0,nm:'验收造纸企业'});S.f.paper++;registerInvestment('paper',100,'验收造纸企业');syncFirms();
startHome('basic','self');for(let m=0;m<7;m++)housingStep();startHome('luxury','private');var private3=S.phase3.homes.at(-1);private3.developerFunds=20;S.phase3.market.index=.55;S.phase3.market.next=projectMonth()+6;for(let m=0;m<3;m++)housingStep();
S.phase3.notices['p3_fixture_pet']={id:'p3_fixture_pet',firm:S.phase3.firms.at(-1).uid,title:'工业片区群众联名来信',handled:false,at:projectMonth()};S.sched.push({id:'p3_fixture_pet',m:0});schedulePhase3('p3_aid',grain3.uid);S.tab='business';
`,c);states.push(JSON.parse(vm.runInContext('JSON.stringify(S)',c)));}
fs.writeFileSync(path.join(__dirname,'fixtures/v113-scenes.json'),JSON.stringify(states,null,2)+'\n');console.log('Generated 5 synthetic v1.13 scenarios through game functions.');
