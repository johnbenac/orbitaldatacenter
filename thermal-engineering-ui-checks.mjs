import assert from 'node:assert/strict';
import {parseThermalMeasurements,compareThermalMeasurements,thermalTemperaturePlot,thermalNetworkDiagram,thermalTraceCSV,thermalMeasurementTemplate,thermalNumber,activeThermalBoundaryIds} from './dist/thermal-engineering-visuals.js';
import {runThermalAnalysis} from './dist/thermal-analysis.js';
import {sizeDesign,missionStarter} from './dist/design.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';
import {buildThermalAnalysisModel} from './dist/thermal-analysis-model.js';

const checks=[],failures=[];
const test=(name,fn)=>{try{fn();checks.push(name);}catch(error){failures.push({name,error:error.message});}};
const near=(a,b,tolerance=1e-9)=>assert(Math.abs(a-b)<=tolerance,`${a} differs from ${b}`);
const sample=(timeS,article,mount)=>({timeS,temperatures:{article,...(mount==null?{}:{mount})}});
const run={id:'duplicate-stage-run',nodes:[{id:'article',label:'Article'},{id:'mount',label:'Mount'}],frames:[
 {timeS:0,stageId:'cold',temperaturesK:{article:280,mount:300},boundariesK:{shroud:270},residualW:0},
 {timeS:10,stageId:'cold',temperaturesK:{article:300,mount:320},boundariesK:{shroud:280},residualW:0},
 {timeS:10,stageId:'hot',temperaturesK:{article:300,mount:320},boundariesK:{shroud:340},residualW:0},
 {timeS:20,stageId:'hot',temperaturesK:{article:310,mount:330},boundariesK:{shroud:340},residualW:0}
]};
const before=JSON.stringify(run);

test('BOM, quoted headers, CRLF, Celsius conversion and Kelvin preservation',()=>{
 const data=parseThermalMeasurements('\uFEFF"time_s","article_C","mount_K"\r\n0,0,300\r\n10,100,400\r\n',['article','mount']);
 assert.deepEqual(data.channels,['article','mount']);near(data.samples[0].temperatures.article,273.15);near(data.samples[1].temperatures.article,373.15);assert.equal(data.samples[1].temperatures.mount,400);assert.equal(data.temperatureUnit,'K');
});
test('Measurement import rejects ambiguous or physically invalid input',()=>{
 for(const text of ['seconds,article_K\n0,290\n1,291','time_s,unknown_K\n0,290\n1,291','time_s,article_K,article_C\n0,290,17\n1,291,18','time_s,article_K\n0,290\n0,291','time_s,article_K\n1,290\n0,291','time_s,article_K\n-1,290\n1,291','time_s,article_K\n0,\n1,291','time_s,article_K\n0,0\n1,291','time_s,article_C\n0,-273.15\n1,20','time_s,article_K\n0,Infinity\n1,291','time_s,article_K\n0,290,extra\n1,291','time_s,"article_K\n0,290\n1,291'])assert.throws(()=>parseThermalMeasurements(text,['article']));
 assert.throws(()=>parseThermalMeasurements('time_s,article_K\n0,290',['article']));
 assert.throws(()=>parseThermalMeasurements('time_s,article_K\n'+Array.from({length:10001},(_,i)=>i+',290').join('\n'),['article']));
});
test('Correlation preserves signed bias and per-channel RMS across duplicate stage timestamps',()=>{
 const data={samples:[sample(5,292,310),sample(10,302,318),sample(15,307,325)]},result=compareThermalMeasurements(run,data);
 assert.equal(result.sampleCount,6);near(result.biasK,2/3);near(result.rmseK,Math.sqrt(16/6));near(result.maxAbsK,2);
 const article=result.channels.find(c=>c.nodeId==='article'),mount=result.channels.find(c=>c.nodeId==='mount');near(article.biasK,2);near(article.rmseK,2);near(mount.biasK,-2/3);near(mount.rmseK,Math.sqrt(4/3));
 assert(result.residuals.every(r=>Number.isFinite(r.predictedK)&&Number.isFinite(r.errorK)));assert.equal(result.status,'comparison-only');assert.equal(result.modelRunId,run.id);
});
test('Correlation excludes outside measurements without extrapolation and rejects missing channels',()=>{
 const result=compareThermalMeasurements(run,{samples:[sample(-1,999),sample(0,280),sample(20,310),sample(21,999)]});assert.equal(result.outsideSamples,2);assert.equal(result.sampleCount,2);near(result.rmseK,0);
 assert.throws(()=>compareThermalMeasurements(run,{samples:[sample(21,300),sample(22,301)]}),/overlapping/);
 assert.throws(()=>compareThermalMeasurements(run,{samples:[{timeS:5,temperatures:{unmodeled:300}}]}),/predicted channel/);
});
test('Actual solver histories correlate at duplicate stage boundaries',()=>{
 const model={id:'contract-model',nodes:[{id:'article',label:'Article',capacityJPerK:100,initialK:300,loadW:10}],boundaries:[{id:'fixture',temperatureK:300}],conductors:[{id:'support',from:'article',boundaryId:'fixture',conductanceWPerK:1}],radiation:[],convection:[],heaters:[],heatPumps:[]};
 const definition={id:'contract-case',kind:'tvac-cycling',initialBoundariesK:{fixture:300},dtS:10,sampleEveryS:10,steps:[{id:'powered',label:'Powered',type:'ramp',durationS:60,boundariesK:{fixture:300},loadFraction:1},{id:'unpowered',label:'Unpowered',type:'ramp',durationS:60,boundariesK:{fixture:300},loadFraction:0}]};
 const solved=runThermalAnalysis(model,definition);assert(solved.frames.some((f,i)=>i&&f.timeS===solved.frames[i-1].timeS),'solver must exercise a real duplicate stage timestamp');
 const unique=[...new Map(solved.frames.map(f=>[f.timeS,f])).values()],csv=thermalMeasurementTemplate(solved)+unique.map(f=>f.timeS+','+(f.temperaturesK.article+1.25)).join('\r\n');
 const result=compareThermalMeasurements(solved,parseThermalMeasurements(csv,['article']));near(result.biasK,1.25);near(result.rmseK,1.25);near(result.maxAbsK,1.25);assert.equal(result.sampleCount,unique.length);
});
test('Temperature chart retains boundary jumps and finite physical axes',()=>{
 const html=thermalTemperaturePlot(run,{limits:{minK:275,maxK:325},timeS:10});assert(!/NaN|Infinity/.test(html));assert(html.includes('Elapsed time / min'));assert(html.includes('Allocated operating band'));assert(html.includes('te-boundary-line'));
 const boundary=/class="te-boundary-line"[^>]*d="([^"]*)"/.exec(html)[1],points=[...boundary.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(m=>[Number(m[1]),Number(m[2])]);assert.equal(points[1][0],points[2][0],'a boundary command change retains one shared elapsed time');assert.notEqual(points[1][1],points[2][1],'a boundary command jump must not be smoothed away');
});
test('Only atmospheric cases display an air boundary',()=>{
 const frames=run.frames.map(f=>({...f,boundariesK:{...f.boundariesK,fixture:293.15,air:293.15}}));
 for(const caseKind of ['tvac-cycling','thermal-balance','orbital-transient']){const html=thermalTemperaturePlot({...run,caseKind,frames});assert(!html.includes('air boundary'));assert(html.includes('shroud boundary'));assert(html.includes('fixture boundary'));}
 for(const caseKind of ['atmospheric-cycling','installed-environment'])assert(thermalTemperaturePlot({...run,caseKind,frames}).includes('air boundary'));
});
test('Whole-spacecraft orbital boundaries omit test-only fixtures and stay above absolute zero',()=>{
 const hardware=sizeDesign(missionStarter('text')),model=buildThermalAnalysisModel(hardware),frames=run.frames.map(f=>({...f,boundariesK:{shroud:3,fixture:293.15,air:293.15}})),orbital={...run,caseKind:'orbital-transient',model,caseDefinition:{convectionEnabled:false},frames};
 assert(model.conductors.some(e=>e.boundaryId==='fixture'&&e.activeIn?.includes('test')),'exercise the actual spacecraft test-support topology');
 assert.deepEqual(activeThermalBoundaryIds(orbital),['shroud']);const html=thermalTemperaturePlot(orbital);assert(html.includes('shroud boundary'));assert(!html.includes('fixture boundary'));assert(!html.includes('air boundary'));
 const kelvinTicks=[...html.matchAll(/<text x="54"[^>]*>([^<]+)<\/text>/g)].map(m=>Number(m[1].replaceAll(',','')));assert.equal(kelvinTicks.length,5);assert.equal(kelvinTicks[0],0);assert(kelvinTicks.every(t=>t>=0));
 const tvac={...orbital,caseKind:'tvac-cycling'};assert.deepEqual(activeThermalBoundaryIds(tvac).sort(),['fixture','shroud']);assert(thermalTemperaturePlot(tvac).includes('fixture boundary'));
 const atmospheric={...orbital,caseKind:'atmospheric-cycling',caseDefinition:{convectionEnabled:true}};assert.deepEqual(activeThermalBoundaryIds(atmospheric).sort(),['air','fixture','shroud']);assert(!activeThermalBoundaryIds({...atmospheric,caseDefinition:{convectionEnabled:false}}).includes('air'));
});
test('Local-surface orbital model retains its active fixture and honors radiative case switches',()=>{
 const hardware=sizeDesign(missionStarter('text')),catalog=buildPartsCatalog(hardware),model=buildThermalAnalysisModel(hardware,{record:catalog.byId['flight:02.02'],catalog}),frames=run.frames.map(f=>({...f,boundariesK:{shroud:3,fixture:293.15,air:293.15}})),orbital={...run,caseKind:'orbital-transient',model,caseDefinition:{convectionEnabled:false},frames};
 assert(model.conductors.some(e=>e.id==='fixture-conditioning'&&!e.activeIn),'exercise the actual local mounting boundary');assert.deepEqual(activeThermalBoundaryIds(orbital).sort(),['fixture']);const html=thermalTemperaturePlot(orbital);assert(html.includes('fixture boundary'));assert(!html.includes('shroud boundary'),'internally mounted battery is not directly radiating to a 3 K space sink');assert(!html.includes('air boundary'));
 const exposed=buildThermalAnalysisModel(hardware,{record:catalog.byId['flight:03.01'],catalog});assert.deepEqual(activeThermalBoundaryIds({...orbital,model:exposed}).sort(),['fixture','shroud'],'exposed radiator retains space radiation');
 const switched={...orbital,model:{...model,radiation:model.radiation.map(e=>({...e,activeIn:['test']}))}};assert.deepEqual(activeThermalBoundaryIds(switched),['fixture']);assert.deepEqual(activeThermalBoundaryIds({...switched,caseKind:'tvac-cycling'}).sort(),['fixture','shroud']);
});
test('Temperature chart starts finite segments and does not invent values across missing samples',()=>{
 const sparse={nodes:[{id:'article',label:'Article'}],frames:[{timeS:0,temperaturesK:{}},{timeS:10,temperaturesK:{article:290}},{timeS:15,temperaturesK:{article:295}},{timeS:20,temperaturesK:{}},{timeS:30,temperaturesK:{article:310}}]};
 const html=thermalTemperaturePlot(sparse),path=/class="te-node-line"[^>]*d="([^"]*)"/.exec(html)[1];assert(path.trim().startsWith('M'));assert.equal((path.match(/M/g)||[]).length,2,'a missing interval must split the line');assert.equal((path.match(/L/g)||[]).length,1);assert(!/NaN|Infinity/.test(html));
 const empty=thermalTemperaturePlot({nodes:[{id:'article'}],frames:[{timeS:0,temperaturesK:{}},{timeS:10,temperaturesK:{}}]});assert(!/NaN|Infinity/.test(empty));assert(empty.includes('te-empty'));
});
test('Plot and network text are escaped; model units and lumped resolution remain visible',()=>{
 const label='<script>alert("x")</script> & quoted',unsafe={...run,nodes:[{id:'article',label,capacityJPerK:150,loadW:12,initialK:290}]};
 const plot=thermalTemperaturePlot(unsafe);assert(!plot.includes('<script>'));assert(plot.includes('&lt;script&gt;'));assert(plot.includes('&amp; quoted'));
 const network=thermalNetworkDiagram({...unsafe,conductors:[]});assert(!network.includes('<script>'));assert(network.includes('&lt;script&gt;'));assert(network.includes('150 J/K'));assert(network.includes('12 W'));assert(network.includes('Spatial temperature gradients inside a node are unresolved'));
});
test('Trace CSV retains stage, boundary and energy diagnostics; template contains no fabricated observations',()=>{
 const csv=thermalTraceCSV(run);assert(csv.startsWith('"time_s","stage_id","article_K","mount_K","boundary_shroud_K","energy_residual_W"'));assert.equal(csv.split('\r\n').filter(Boolean).length,run.frames.length+1);assert(csv.includes('"10","cold","300","320","280","0"'));assert(csv.includes('"10","hot","300","320","340","0"'));
 assert.equal(thermalMeasurementTemplate(run),'"time_s","article_K","mount_K"\r\n');const quoted=thermalTraceCSV({...run,frames:[{...run.frames[0],stageId:'cold,"hold"\nnext'}]});assert(quoted.includes('"cold,""hold""\nnext"'));
 assert.equal(thermalNumber(0), '0');assert.equal(thermalNumber(NaN),'—');assert.equal(thermalNumber(Infinity),'—');
 assert.equal(JSON.stringify(run),before,'plots, exports and comparisons do not alter source artifacts');
});

console.log(JSON.stringify({passed:checks.length,checks,failures},null,2));if(failures.length)process.exitCode=1;
