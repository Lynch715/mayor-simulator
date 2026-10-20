const fs=require('fs'),vm=require('vm');const source=fs.readFileSync('index.html','utf8').split('<script>')[1].split("document.addEventListener('DOMContentLoaded',()=>{")[0];
function context(lv=0){const c=vm.createContext({console});vm.runInContext(source,c);vm.runInContext(`let seed=1331;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);newGame();${lv?'initLevel('+lv+',50);':''}Math.random=()=>.5;`,c);return c;}
const run=(c,s)=>vm.runInContext(s,c);const j=(c,s)=>JSON.parse(run(c,'JSON.stringify('+s+')'));const findings={};
{
 const c=context();run(c,`S.env=85;S.npc.boss.f=95;phaseReset();issueCQ(1000,36);for(let i=0;i<4;i++){queueBuild('park');applyProjectSubsidy(S.careerProjects.at(-1).uid);}for(let i=0;i<3;i++)tick();var before={cash:S.cash,sanctions:S.sanctions,projects:localProjects().map(p=>({id:p.uid,name:p.n,paid:p.grant.paid,environmentRisk:p.risk.environment}))};S.env=39;S.month=12;S.projectClock=12;targetedInspection();var after={cash:S.cash,sanctions:S.sanctions,incidents:localProjects().map(p=>p.incident?.reason),annualNext:annual().next};`);
 findings.cityEnvironmentClawback=j(c,'{before,after}');
}
{
 const c=context(2);run(c,`S.cash=1000000;phaseReset();var merit0=S.merit;var coverage0=cov('clinic');for(let i=0;i<12;i++)queueBuild('clinic');for(let i=0;i<4;i++)tick();var result={built:S.f.clinic,coverage:cov('clinic'),gained:S.merit-merit0,projects:localProjects().filter(p=>p.fac==='clinic').length,cashbookError:S.monthly.cashbook.error};`);findings.redundantClinicMerit=j(c,'{coverage0,result}');
}
{
 const c=context();run(c,`S.ind.push({id:'paper',age:60,cut:0});S.f.paper=1;syncFirms();S.f.power=10;S.f.water=10;S.env=60;phaseReset();var highTax=taxIndustry();environmentMonth(0);var highPol=S.phase1.environment.pollution;S.f.power=0;S.f.water=0;S.env=60;phaseReset();var lowTax=taxIndustry();environmentMonth(0);var lowPol=S.phase1.environment.pollution;`);findings.rationingPollution=j(c,'{highTax,lowTax,highPol,lowPol}');
}
{
 const c=context(4);run(c,`S.f.road+=10;S.f.water+=10;S.f.pipe+=10;S.f.sewage+=10;S.f.park+=10;S.phase3.market.index=.45;var before={cash:S.cash,res:landFree('res')};var response=startHome('basic','private');var h=S.phase3.homes[0];var after={response,cash:S.cash,res:landFree('res'),landPrice:h.landPrice,construction:h.cost,fullSales:h.price*100*.7,developerFunds:h.developerFunds,stage:h.stage};`);findings.actualPrivateLandSaleInColdMarket=j(c,'{before,after}');
}
{
 const c=context();run(c,`S.cash=100000;S.env=80;phaseReset();S.phase1.permits.factory=1;addEventFactory(1);syncFirms();var f=S.phase3.firms.at(-1);recruitSpecialist('commerce');S.phase1.permits.factory=1;firmWork('p3_expand',f.uid);S.projectClock=10;var n={id:'hearing-expanding',firm:f.uid,handled:false};S.phase3.notices[n.id]=n;petitionWork(n.id,'hear');var during={stage:f.stage,factor:firmFactor(f),expansion:JSON.parse(JSON.stringify(f.expansion))};companyStep();var next={stage:f.stage,factor:firmFactor(f),expansion:f.expansion};`);findings.hearingDoesNotLimitExpansion=j(c,'{during,next}');
}
fs.writeFileSync('tests/audit-20261020/gameplay-deep.json',JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
