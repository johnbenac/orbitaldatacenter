import {INTEGRATION_TIMES} from './integration-sequence.js';

export function loadingEnd(h){
 if(h.input.launcher==='starship'&&!h.fairing.fit)return INTEGRATION_TIMES[1];
 return h.payloadInterface?.passes===false?INTEGRATION_TIMES[1]:h.fairing.fit?INTEGRATION_TIMES[6]:INTEGRATION_TIMES[2];
}
export function loadingHoldText(h){
 if(h.payloadInterface?.passes===false)return 'Loading holds before pickup. The fixed spacecraft interface fails the mechanical fit check. Inspect the adapter in Phase B.';
 if(h.input.launcher==='starship')return 'Side loading is held at checkout. The installed stack must fit both the internal envelope and the retained hatch and carriage. Inspect the clearances in Phase C.';
 return 'Loading holds before enclosure closure. The stowed spacecraft crosses the selected payload envelope. Inspect the clearance in Phase C.';
}
export function launchCompatibility(h){
 const interfaceOK=h.payloadInterface?.passes===true,fairingOK=h.fairing?.fit===true,cargoOK=h.input?.launcher!=='starship'||h.fairing?.cargoAccess?.fits===true,massOK=Number.isFinite(h.launchScreenMarginKg)&&h.launchScreenMarginKg>=0,issues=[];
 if(!interfaceOK)issues.push({code:'launch-interface-fit',message:loadingHoldText({...h,payloadInterface:{...h.payloadInterface,passes:false}})});
 if(!fairingOK)issues.push({code:'launch-fairing-fit',message:loadingHoldText({...h,payloadInterface:{...h.payloadInterface,passes:true}}),radialClearanceM:h.fairing?.radialClearanceM,axialClearanceM:h.fairing?.axialClearanceM,limitingPart:h.fairing?.limitingPart});
 if(!cargoOK&&fairingOK)issues.push({code:'launch-cargo-access',message:'Side loading is held at checkout because the installed stack does not fit the retained hatch and carriage.'});
 if(!massOK)issues.push({code:'launch-mass-screen',message:Number.isFinite(h.launchScreenMarginKg)?'The stowed launch stack exceeds the tighter mission allowance or launcher reference by '+(-h.launchScreenMarginKg).toLocaleString('en-US',{maximumFractionDigits:0})+' kg. Launch authorization is held in this baseline.':'The launch mass allowance and launcher reference screen are incomplete.'});
 const ok=!issues.length,holdTime=!interfaceOK||h.input?.launcher==='starship'&&(!fairingOK||!cargoOK)?INTEGRATION_TIMES[1]:!fairingOK?INTEGRATION_TIMES[2]:INTEGRATION_TIMES[6];
 return {ok,interfaceOK,fairingOK,cargoOK,massOK,issues,reason:issues[0]?.message||null,holdTime,holdKind:holdTime===INTEGRATION_TIMES[1]?'checkout':holdTime===INTEGRATION_TIMES[2]?'encapsulation':'launch-readiness'};
}
export const launchHold=h=>launchCompatibility(h).reason;

// Keep the requested mission time and all phase controls. The physical launch
// rehearsal stays at its existing last permitted bay state. At commissioning
// the independently selectable operating-orbit study is explicitly assumed.
export function launchProgressState(compatibility,time,requestedPhase,commissioningStartS=900){
 const held=!compatibility.ok&&time>=compatibility.holdTime&&time<commissioningStartS;
 return {held,reason:held?compatibility.reason:null,issues:held?compatibility.issues:[],requestedTime:time,geometryTime:held?compatibility.holdTime:time,geometryPhase:held?'integration':requestedPhase,holdKind:held?compatibility.holdKind:null,assumedOrbit:!compatibility.ok&&time>=commissioningStartS};
}
