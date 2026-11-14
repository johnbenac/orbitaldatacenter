import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {routingSourceFingerprint,sameRoutingSourceFingerprint} from './routing-source-fingerprint.mjs';

const root=fileURLToPath(new URL('..',import.meta.url)),args=process.argv.slice(2),at=args.indexOf('--output'),target=at>=0?path.resolve(args[at+1]):'/tmp/orbital-routing-publication-report.json',directory=path.dirname(target);await mkdir(directory,{recursive:true});
const checks=[
 ['collision-engine','routing-audit-checks.mjs',false],
 ['planner-candidates','routing-planner-checks.mjs',false],
 ['rendered-connection-sampling','connection-sampling-checks.mjs',false],
 ['connector-service-loops','electrical-service-loop-checks.mjs',false],
 ['connector-bore-datums','connector-bore-datum-checks.mjs',false],
 ['routing-frames','routing-frame-checks.mjs',false],
 ['fixed-solar-collectors','fixed-solar-collector-checks.mjs',false],
 ['fixed-collector-hardware','fixed-collector-hardware-checks.mjs',false],
 ['pcdu-routing-comb','pcdu-routing-comb-checks.mjs',false],
 ['packed-equipment-layout','packed-equipment-layout-checks.mjs',false],
 ['inspector','routing-inspector-checks.mjs',false],
 ['operational-envelopes','routing-operational-envelope-checks.mjs',true],
 ['ground','ground-routing-checks.mjs',true],
 ['hinge-flex','hinge-flex-routing-checks.mjs',true],
 ['accordion-flex','accordion-flex-routing-checks.mjs',false],
 ['fluid-interface-allocation','energy-design-checks.mjs',false],
 ['protected-fluid-accommodation','protected-fluid-accommodation-checks.mjs',true],
 ['protected-equipment-accommodation','protected-equipment-allocation-checks.mjs',true],
 ['protected-release-motion','protected-release-motion-checks.mjs',false],
 ['radiator-motion','flight-radiator-routing-checks.mjs',true],
 ['solar-deployment-halfspaces','solar-deployment-halfspace-checks.mjs',false],
 ['launch','launch-routing-checks.mjs',true],
 ['launch-runner-contract','launch-routing-runner-checks.mjs',false],
 ['joined-launch','joined-launch-routing-checks.mjs',true],
 ['flight-fluids','flight-fluid-routing-checks.mjs',true],
 ['flight-combined','flight-routing-checks.mjs',true],
];
const sourceFingerprint=await routingSourceFingerprint({includeAllSources:true});
const report={schema:'orbital-routing-publication-v1',generatedAt:new Date().toISOString(),ok:false,complete:false,sourceFingerprint,checks:[],policy:'Any missing inventory, collision, connector/bend/length failure, unknown motion or unresolved interval blocks publication. GitHub workflow and Sites source publication use this same executable gate. Source inputs must stay unchanged throughout the complete gate.'};
for(const [id,script,json] of checks){
 const started=Date.now(),reportPath=path.join(directory,path.basename(target,'.json')+'-'+id+'.json');console.log('\nRouting gate: '+id);
 const result=await new Promise(resolve=>{const child=spawn(process.execPath,[script,...(json?['--output',reportPath]:[])],{cwd:root,stdio:'inherit'});child.once('error',error=>resolve({exitCode:null,error:error.message}));child.once('close',(code,signal)=>resolve({exitCode:code,signal}));});
 const row={id,script,...result,ok:result.exitCode===0,durationS:(Date.now()-started)/1000};if(json)try{row.report=JSON.parse(await readFile(reportPath,'utf8'));if(row.report.ok===false)row.ok=false;}catch(error){row.ok=false;row.reportError=error.message;}report.checks.push(row);
 // Persist failures as well as successes, including on an interrupted run.
 await writeFile(target,JSON.stringify(report,null,2)+'\n');
}
report.finishedSourceFingerprint=await routingSourceFingerprint({includeAllSources:true});report.sourceUnchanged=sameRoutingSourceFingerprint(sourceFingerprint,report.finishedSourceFingerprint);report.complete=report.checks.length===checks.length;report.ok=report.complete&&report.sourceUnchanged&&report.checks.every(c=>c.ok);if(!report.sourceUnchanged)report.issues=[{code:'routing-source-changed-during-gate',message:'The checks ran against changing source inputs. Their combined result cannot certify a single publication version.'}];await writeFile(target,JSON.stringify(report,null,2)+'\n');console.table(report.checks.map(({id,ok,exitCode,durationS})=>({id,ok,exitCode,durationS})));console.log('Routing report: '+target);if(!report.ok)process.exitCode=1;
