const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),src=fs.readFileSync(path.join(root,'index.html'),'utf8').split('<script>')[1].split("document.addEventListener('DOMContentLoaded',()=>{")[0];
const states=[];
for(let lv=0;lv<5;lv++){
 const c=vm.createContext({console});vm.runInContext(src,c);
 vm.runInContext(`let seed=711;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);newGame();${lv?'initLevel('+lv+',40);':''}
 S.cash=10000000;S.year=4;S.age=35;S.month=6;S.env=85;S.npc.boss.f=95;phaseReset();phase2Reset();Math.random=()=>.5;
 queueBuild('park');var green=S.careerProjects[S.careerProjects.length-1];applyProjectSubsidy(green.uid);for(let m=0;m<3;m++)tick();
 recruitSpecialist('eco');recruitSpecialist('commerce');trainSpecialist('C1');if(S.lvl>=2){S.leads=[{fac:'agri',n:'验收招商样本',inv:1000,ask:{land:20,cash:100,cut:0}}];leadAct(0,'take');}else if(S.lvl===1)addEventFactory(1);queueBuild('hosp');applyProjectSubsidy(S.build[S.build.length-1].p2Id);
 queueBuild('clinic');if(S.lvl>=1)issueSB(80*S.sc,60);bidMunicipal('road');startMunicipal(S.phase2.offers[0].uid);bidMunicipal('water');
 green.risk.environment=.6;green.warningAt=projectMonth();green.reviewAt=projectMonth()+6;S.phase2.equipment.power.wear=76;S.phase2.equipment.power.offline=1;schedulePhase2('p2_maintain','power');
 `,c);
 states.push(JSON.parse(vm.runInContext('JSON.stringify(S)',c)));
}
fs.writeFileSync(path.join(__dirname,'fixtures/v112-scenes.json'),JSON.stringify(states,null,2)+'\n');
console.log('Generated 5 v1.12 synthetic browser scenarios.');
