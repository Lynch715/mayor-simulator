// Run the unchanged historical event suite with its three pre-identity save
// comparisons allowing only the already-released identity defaults.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const root=path.resolve(__dirname,'../..'),file=path.join(root,'tests/event-admission-fix-20261101/regression.cjs');
let code=fs.readFileSync(file,'utf8');
const comparison='assert.equal(run(c,"LS.get(\'yifang_save\')"),c.raw)';
if(code.split(comparison).length!==4)throw Error('Historical suite changed; review compatibility adapter');
code=code.replaceAll(comparison,'assertMigratedSave(run(c,"LS.get(\'yifang_save\')"),c.raw)');
code+=`\nfunction assertMigratedSave(current,original){
 const actual=JSON.parse(current),expected=JSON.parse(original);
 const defaults={player:{name:'无名'},places:['青石','沂川','临渡','江岚','海屿','衡川'],orders:[]};
 for(const [key,value] of Object.entries(defaults))if(!(key in expected)){assert.deepEqual(actual[key],value,key+' migration default');delete actual[key];}
 assert.deepEqual(actual,expected,'all original save fields unchanged');
}\n`;
const suite=new Module(file,module);suite.filename=file;suite.paths=Module._nodeModulePaths(path.dirname(file));
process.env.EVENT_ADMISSION_RESULTS=process.env.EVENT_ADMISSION_RESULTS||path.join(__dirname,'event-admission-results.json');
suite._compile(code,file);
