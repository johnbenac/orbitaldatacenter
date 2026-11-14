import {runThermalAnalysis} from './thermal-analysis.js';
self.onmessage=event=>{try{const {model,caseDefinition,options}=event.data;self.postMessage({ok:true,run:runThermalAnalysis(model,caseDefinition,options||{})});}catch(error){self.postMessage({ok:false,error:error.message||String(error)});}};
