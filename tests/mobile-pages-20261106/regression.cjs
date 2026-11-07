const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),before=fs.readFileSync(path.join(root,'backups/index-before-mobile-pages-20261106.html'),'utf8'),after=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=html=>html.split('<script>')[1].split('</script>')[0];
// Compare the entire script, including event binding, persistence and anonymous
// callbacks, allowing only the four display-template regions changed this round.
const viewsOnly=code=>{
 for(const [start,end] of [['function vHist(){','function vDist(){'],['function vOver(){','function vBuild(){'],['function vFile(){','function bindPanel(){'],['vFin=function(){return _p3Fin()+','vAgenda=function(){return _p3Agenda()']]){
  const a=code.indexOf(start),b=code.indexOf(end,a);assert.ok(a>=0&&b>a,start);code=code.slice(0,a)+'/* display template */\n'+code.slice(b);
 }return code;
};
assert.equal(viewsOnly(script(after)),viewsOnly(script(before)));
assert.equal(before.split('<script>')[0].split('</style>')[1],after.split('<script>')[0].split('</style>')[1]);
const run=(c,s)=>vm.runInContext(s,c,{timeout:20000});
const fixtures=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/v114-scenes.json'),'utf8'));
function context(html,lv){const store=new Map(),c=vm.createContext({console,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}});run(c,script(html).split("document.addEventListener('DOMContentLoaded',()=>{")[0]);c.fixture=fixtures[lv];run(c,`let seed=71834;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);newGame();S=JSON.parse(JSON.stringify(fixture));migrate();S.honors.id='qa-stable';S.year=8+S.lvl*6;S.age=31+S.year;S.tenure=3;S.ratings=Array.from({length:S.year-1},(_,i)=>['A','B','B','C'][i%4]);S.cash=12345678;S.phase='work';S.planZone='heavy';S.phase1.resources=['煤炭','油气'];for(const [id] of SOE)S.phase1.permits[id]=2;S.hist=Array.from({length:S.lvl},(_,i)=>({lvl:i,city:LV[i].city,years:5+i,built:45+i*19,hdr:78,grades:'ABBABACABABABA',sat:68,pros:65,liv:60,debt:84,pros0:60,debt0:80,leftY:3+i*5,after:5+i}));for(const k of ['v114','v113'])LS.set('yifang_save_before_'+k,'{}');`);return c;}
const controls=html=>[...html.matchAll(/<(?:button|select|option|input|a)\b[^>]*>/g)].map(m=>m[0].replace(/\s(?:class|style)="[^"]*"/g,''));
const labels=html=>[...html.matchAll(/<(button|option)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(m=>m[2]);
const numbers=html=>(html.replace(/<[^>]*>/g,' ').match(/-?\d+(?:\.\d+)?/g)||[]).sort();
const views=['vOver()','vMap()','vLand()','vInd()','vRegion()','vDistrict()','vProjects()','vBusiness()','vFin()','vDebt()','vHR()','vFile()','vHonors()','vRanking()',...['traffic','people','infra','eco','ind'].map(cat=>`(S.buildCat='${cat}',vBuild())`)];
let cases=0,controlCount=0;
for(let lv=0;lv<5;lv++)for(const view of views){const old=context(before,lv),now=context(after,lv);const a=run(old,view),b=run(now,view);assert.deepEqual(controls(b),controls(a),`controls level${lv} ${view}`);assert.deepEqual(labels(b),labels(a),`labels level${lv} ${view}`);assert.deepEqual(numbers(b),numbers(a),`displayed values level${lv} ${view}`);assert.equal(run(now,'JSON.stringify(S)'),run(old,'JSON.stringify(S)'),`post-render save level${lv} ${view}`);assert.equal(run(now,'seed'),run(old,'seed'));controlCount+=controls(b).length;cases++;}
const result={passed:cases+2,failed:0,viewCases:cases,preservedControls:controlCount,fullScriptOutsideFourViewsIdentical:true,renderedValuesStateAndRngIdentical:true};fs.writeFileSync(path.join(__dirname,'regression-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
