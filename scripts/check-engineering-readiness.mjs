#!/usr/bin/env node
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {auditEngineeringReadiness,readinessConfigurationIds} from './engineering-readiness-audit.mjs';

const args=process.argv.slice(2),options={solves:'none'},references=[];let output=null,json=false,quiet=false;
for(let i=0;i<args.length;i++){
 const arg=args[i];
 if(arg==='--solves')options.solves=args[++i];
 else if(arg==='--reference')references.push(args[++i]);
 else if(arg==='--output')output=resolve(args[++i]);
 else if(arg==='--json')json=true;
 else if(arg==='--quiet')quiet=true;
 else if(arg==='--help'){
  console.log('Usage: node scripts/check-engineering-readiness.mjs [--solves none|offered|all] [--reference ID] [--output report.json] [--json] [--quiet]\nChecks all shipped references, every launch-vehicle catalog variant, the alternate engine catalog, and all numerical thermal plans by default. --solves offered also executes the full default TVAC/cycling schedules available in the parts navigator and each vehicle thermal-balance case. --solves all executes every numerical thermal plan. A missing required input, broken plan/setting link, invalid model/case or solver failure exits 1. Predicted engineering shortfalls and unreviewed physical evidence are reported separately.\nConfigurations: '+readinessConfigurationIds.join(', '));process.exit(0);
 }else throw new RangeError('Unknown option: '+arg);
}
if(references.length)options.referenceIds=[...new Set(references)];
let lastProgress=0;
options.onProgress=p=>{
 if(quiet)return;
 if(p.stage==='complete')console.error(p.referenceId+': '+p.readyThermalPlans+'/'+p.thermalPlans+' thermal plans ready; '+p.predictions+' complete predictions.');
 else if(p.stage==='prediction'&&Date.now()-lastProgress>15000){console.error('Running '+p.referenceId+' '+p.itemId+' '+p.kind+'…');lastProgress=Date.now();}
};
const report=await auditEngineeringReadiness(options);
if(output){await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');}
if(json)console.log(JSON.stringify(report,null,2));
else{
 const c=report.counts;
 console.log((report.passed?'PASS':'FAIL')+' engineering readiness: '+c.references+' references, '+c.parts+' part instances, '+c.thermalReady+'/'+c.thermalPlans+' numerical thermal plans ready, '+c.offeredThermalSettings+' offered thermal settings, '+c.thermalPredictions+' full predictions.');
 console.log(c.electricalRequirements+' electrical requirements; '+c.electricalPlans+' verification plans; '+c.electricalHarnesses+' harness routes; '+c.electricalChecks+' executable electrical checks; '+report.observations.electricalPredictedShortfalls+' predicted electrical shortfalls.');
 console.log(c.requiredDesignInputs+' required design inputs; '+c.derivedInputs+' derived allocations; '+c.pdrDomains+' domain screens / '+c.pdrComparisons+' comparisons; '+c.communicationBenches+' installed communications benches ('+c.communicationNotInstalled+' absent hardware cases).');
 if(report.issues.length){for(const problem of report.issues.slice(0,30))console.error([problem.referenceId,problem.domain,problem.itemId||problem.caseId,problem.path].filter(Boolean).join(' / ')+': '+problem.message);if(report.issues.length>30)console.error((report.issues.length-30)+' additional issues'+(output?' are in '+output:'. Use --output report.json for the full report.'));}
 console.log('Physical evidence and predicted performance remain independent: '+report.observations.unverifiedThermalRequirements+' thermal requirements open; '+report.observations.predictedShortfalls+' PDR shortfalls; '+report.observations.predictionsWithUnmetPlateaus+' predictions with unmet plateaus.');
 if(output)console.log('Report: '+output);
 console.log('Elapsed: '+report.elapsedS.toFixed(1)+' s');
}
if(!report.passed)process.exitCode=1;
