import {terminalPattern} from './terminal-activity.js';

// Bench settings and acceptance limits are illustrative project choices. Each
// test exercises an isolated article; the flight clock and recorder stay live
// independently. Null observations mean that an upstream stage prevented a read.
const attenuation={label:'Extra path attenuation',unit:'dB',min:0,max:32,step:1,initial:0};
export const commTestCases=[
 {id:'sband',terminal:'S-band',title:'Command and telemetry round trip',question:'Can mission control tell that the flight computer accepted its command?',
  setup:'A shielded RF hat couples one flight patch to a representative ground modem. A mission-control console sends a harmless status request.',
  stimulus:'Send command 42, then decode the next housekeeping sample and check its echoed command number.',
  criterion:'Both receivers must lock. Mission control must receive the matching command number within 10 seconds of dispatch.',
  basis:'The fixture uses calibrated receiver inputs, a 290 K noise reference and a 5 dB demodulation threshold. The two directions have separate rates and receive levels. The timing bound includes one full installed housekeeping period.',
  source:{title:'NASA · Ground data systems, §11.7',url:'https://www.nasa.gov/smallsat-institute/sst-soa/ground-data-systems-and-mission-operations/'},
  stages:['Issue status request','Receive uplink','Build housekeeping reply','Check return at console'],
  control:{...attenuation,help:'Add the same calibrated loss to both directions. The weaker return can disappear while the flight computer still receives commands.'}},
 {id:'ka',terminal:'Ka',title:'Known-pattern downlink',question:'Does the ground decoder recover the exact bits that left the recorder?',
  setup:'The recorder supplies a known pattern to the flight transmitter. A coupled Ka test port feeds an attenuator and a representative station modem.',
  stimulus:'Compare sixteen repetitions of a 2,047-bit pseudorandom sequence at the transmitting and receiving ends.',
  criterion:'The receiver must lock and all 32,752 bits must match in this run.',
  basis:'A conducted modem check bypasses the dish. The study uses uncoded coherent QPSK in white noise and a repeatable noise realization. A short clean pattern is one observation. Dish pattern, flight coding and long-run error rate need separate tests.',
  source:{title:'NASA Glenn · SCaN Testbed PRBS-11 receiver check',url:'https://ntrs.nasa.gov/api/citations/20200002144/downloads/20200002144.pdf'},
  stages:['Read reference pattern','Transmit through test port','Acquire station modem','Compare received bits'],
  control:{...attenuation,help:'Turn down the received carrier. Bit mismatches can appear before the modem loses lock.'}},
 {id:'optical',terminal:'Optical',title:'Beacon and transmit alignment',question:'When the tracker centers the beacon, does the outgoing laser point at that same target?',
  setup:'Inside an enclosed optical bench, a collimator supplies a reference beacon. A sampled transmit beam reaches a focal-plane receiver referenced to that beacon.',
  stimulus:'Center the reference beacon, then displace the transmit boresight and compare the outgoing spot with the reference axis.',
  criterion:'With the configured pointing residual, the modeled loss from transmit misalignment must stay within the 3 dB allocation.',
  basis:'TBIRD compared transmit and receive boresights through environmental testing. This bench uses the study’s effective divergence and optical pointing residual. The injected offset represents a possible alignment change. The 3 dB allowance is a project assumption.',
  source:{title:'NASA / MIT Lincoln Laboratory · TBIRD preflight pointing tests',url:'https://ntrs.nasa.gov/citations/20210026049'},
  stages:['Set reference beacon','Center receive tracker','Locate outgoing spot','Compare with tolerance'],
  control:{label:'Transmit boresight offset',unit:'µrad',min:0,max:65,step:.5,initial:0,help:'Move the transmit axis relative to the centered receive beacon. A tighter beam gives the same angular shift a larger penalty.'}}
];

const metric=(label,value,unit)=>({label,value,unit});
const measure=(id,label,observed,operator,limit,unit)=>({
 id,label,observed,operator,limit,unit,
 passed:observed==null?null:operator==='≥'?observed>=limit:operator==='≤'?observed<=limit:observed===limit
});
const stage=(status,detail)=>({status,detail});
const f=(v,n=1)=>Number(v.toFixed(n)).toLocaleString('en-US',{maximumFractionDigits:n});
const noiseDbmHz=10*Math.log10(1.380649e-23*290*1000);
const requiredEbNo=5;
function ebNoDb(receivedDbm,noiseFigureDb,rateBps){
 return receivedDbm-noiseDbmHz-noiseFigureDb-10*Math.log10(rateBps);
}
function sband(h,loss){
 const d=h.input,upBps=16000,downBps=64000,nfDb=4,seq=42,packetBytes=h.cdh.packetBytes;
 const up=ebNoDb(-108-loss,nfDb,upBps)-requiredEbNo,down=ebNoDb(-108-loss,nfDb,downBps)-requiredEbNo;
 const accepted=up>=0,received=accepted&&down>=0;
 const commandBytes=16,oneWay=.25,bound=d.hkPeriodS+2*oneWay+(commandBytes*8/upBps)+(packetBytes*8/downBps);
 const response=accepted?{lastAccepted:seq}:null,echo=received?response.lastAccepted:null;
 const marginAt=x=>Math.min(up,down)+loss-x;
 const requirements=[
  measure('uplink','Command receiver margin',up,'≥',0,'dB'),measure('downlink','Telemetry receiver margin',down,'≥',0,'dB'),
  measure('match','Returned command number',echo,'=',seq,'count'),measure('deadline','Worst-case status return',received?bound:null,'≤',10,'s')
 ];
 return {requirements,marginAt,measurements:[metric('Uplink margin',f(up),'dB'),metric('Return margin',f(down),'dB'),metric('Echoed command',echo??'—',''),metric('Return bound',received?f(bound,2):'—','s')],
  stages:[stage('pass','The console issued command 42 after synchronizing the modems.'),
   stage(accepted?'pass':'fail',accepted?'The spacecraft receiver demodulated the request.':'The command fell below the spacecraft receiver threshold.'),
   stage(accepted?'pass':'blocked',accepted?'The flight-computer model placed command 42 in the next status sample.':'No accepted command was available to echo.'),
   stage(!accepted?'blocked':received&&bound<=10?'pass':'fail',!accepted?'Awaiting a reply.':!received?'The return carrier fell below the station threshold.':'The console recovered command 42 within a modeled bound of '+f(bound,2)+' s.')],
  summary:!accepted?'The uplink lost lock before the command reached the spacecraft.':!received?'The spacecraft accepted the command. Mission control could not decode its reply.':bound>10?'The command echo matched, but its return exceeded the 10 s limit.':'Mission control decoded the matching command echo within the 10 s limit.',
  assumptions:[metric('Nominal calibrated input per receiver',-108,'dBm'),metric('Noise reference',290,'K'),metric('Receiver noise figure',nfDb,'dB'),metric('Threshold',requiredEbNo,'dB Eb/N₀'),metric('Command channel',upBps,'bit/s'),metric('Telemetry channel',downBps,'bit/s'),metric('Command size',commandBytes,'byte'),metric('Ground segment each way',oneWay,'s'),metric('Housekeeping period',d.hkPeriodS,'s'),metric('Status packet size',packetBytes,'byte')]};
}

// Ideal coherent QPSK has the same bit error probability as coherent BPSK.
// erfc approximation (Numerical Recipes) is used only for nonnegative x.
function bitErrorProbability(ebNo){
 const x=Math.sqrt(10**(ebNo/10)),t=1/(1+.5*x);
 return .5*t*Math.exp(-x*x-1.26551223+t*(1.00002368+t*(.37409196+t*(.09678418+t*(-.18628806+t*(.27886807+t*(-1.13520398+t*(1.48851587+t*(-.82215223+t*.17087277)))))))));
}
const patternLength=2047*16,noiseSeed=0x622019;
function comparePattern(probability){
 let lfsr=0x7ff,noise=noiseSeed,errors=0;
 for(let i=0;i<patternLength;i++){
  const bit=lfsr>>>10,feedback=(bit^(lfsr>>>8))&1;
  lfsr=((lfsr<<1)|feedback)&0x7ff;
  noise^=noise<<13;noise^=noise>>>17;noise^=noise<<5;
  const received=bit^Number((noise>>>0)/4294967296<probability);
  if(received!==bit)errors++;
 }
 return errors;
}
function ka(h,loss){
 const d=h.input,rateMbps=Math.min(500,d.linkCapMbps/d.codingEff),rateBps=rateMbps*1e6,nfDb=4;
 const marginAt=x=>ebNoDb(-69-x,nfDb,rateBps)-requiredEbNo,margin=marginAt(loss),locked=margin>=0;
 const ebNo=margin+requiredEbNo,errors=locked?comparePattern(bitErrorProbability(ebNo)):null;
 const requirements=[measure('lock','Ground receiver margin',margin,'≥',0,'dB'),measure('mismatch','Bit mismatches',errors,'=',0,'bit'),measure('count','Compared bits',locked?patternLength:0,'=',patternLength,'bit')];
 return {requirements,marginAt,measurements:[metric('Test line rate',f(rateMbps,3),'Mbit/s'),metric('Receiver margin',f(margin),'dB'),metric('Bits compared',locked?f(patternLength,0):0,'bit'),metric('Mismatches',errors??'—','bit')],
  stages:[stage('pass','The source produced sixteen cycles of PRBS-11.'),stage('pass','The flight transmitter drove the coupled port at '+f(rateMbps,3)+' Mbit/s.'),
   stage(locked?'pass':'fail',locked?'The station modem acquired the stream.':'The station modem fell below its modeled lock threshold.'),
   stage(!locked?'blocked':errors?'fail':'pass',!locked?'The comparator received no synchronized stream.':f(errors,0)+' of '+f(patternLength,0)+' bit positions differed.')],
  summary:!locked?'The ground modem lost lock. A bit comparison needs a synchronized receiver.':errors?'The carrier stayed locked, but the recovered pattern contained '+f(errors,0)+' mismatched bits.':'All 32,752 received bits matched the reference pattern in this run.',
  assumptions:[metric('Nominal station input',-69,'dBm'),metric('Noise reference',290,'K'),metric('Receiver noise figure',nfDb,'dB'),metric('Threshold',requiredEbNo,'dB Eb/N₀'),metric('Ka maximum physical rate',500,'Mbit/s'),metric('Design application ceiling',d.linkCapMbps,'Mbit/s'),metric('Design application efficiency',d.codingEff,'fraction'),metric('Physical test rate',rateMbps,'Mbit/s'),metric('Noise seed',noiseSeed,'integer'),metric('PRBS polynomial degree',11,'count'),metric('Bits per cycle',2047,'bit'),metric('Cycles',16,'count')]};
}
const opticalBudgetDb=3,gaussianLossDb=20*Math.LOG10E;
export function opticalOffsetAllowance(h){
 const div=terminalPattern(h.input,'Optical').fullWidthRad*5e5;
 const squared=div**2*opticalBudgetDb/gaussianLossDb-h.input.opticalJitterUrad**2;
 return squared>=0?Math.sqrt(squared):null;
}
function optical(h,offset){
 const d=h.input,div=terminalPattern(d,'Optical').fullWidthRad*5e5,jitter=d.opticalJitterUrad;
 const lossAt=x=>gaussianLossDb*(Math.hypot(x,jitter)/div)**2;
 const marginAt=x=>opticalBudgetDb-lossAt(x),loss=lossAt(offset),radial=Math.hypot(offset,jitter);
 const requirements=[measure('coupling','Pointing loss',loss,'≤',opticalBudgetDb,'dB')];
 return {requirements,marginAt,measurements:[metric('Angular offset',f(offset,2),'µrad'),metric('Fine-pointing residual',f(jitter,2),'µrad'),metric('Effective half-angle',f(div,2),'µrad'),metric('Pointing loss',f(loss,2),'dB')],
  stages:[stage('pass','The bench collimator established its reference axis.'),stage('pass','The synthetic tracker was given a centered beacon and the design pointing residual.'),
   stage('pass','The beam sampler resolved a transmit bias of '+f(offset,2)+' µrad from the reference axis.'),stage(loss<=3?'pass':'fail','Combined angular error of '+f(radial,2)+' µrad gives '+f(loss,2)+' dB of modeled loss.')],
  summary:loss<=3?'The outgoing beam falls inside the 3 dB pointing-loss allocation.':'The receive tracker is centered, but the outgoing beam exceeds the 3 dB loss allocation.',
  assumptions:[metric('Transmit aperture',d.opticalApertureM,'m'),metric('Wavelength',1550,'nm'),metric('Design fine-pointing residual',jitter,'µrad'),metric('Effective Gaussian half-angle',div,'µrad'),metric('Boresight bias',offset,'µrad'),metric('Pointing loss allocation',3,'dB')]};
}
const benches={sband,ka,optical};
export function runCommVerification(h,id,setting){
 const spec=commTestCases.find(test=>test.id===id);
 if(!spec)throw RangeError('Unknown communications test: '+id);
 const control=spec.control,x=Math.min(control.max,Math.max(control.min,Number.isFinite(setting)?setting:control.initial));
 const {requirements,marginAt,assumptions,measurements,stages,summary}=benches[id](h,x);
 const passed=requirements.every(row=>row.passed===true);
 const samples=Array.from({length:33},(_,i)=>{const v=control.min+(control.max-control.min)*i/32;return {x:v,y:marginAt(v)}});
 const trace={samples,limit:0,current:{x,y:marginAt(x)},xLabel:control.label,xUnit:control.unit,yLabel:'Margin',yUnit:'dB',unit:'dB'};
 const evidence={schema:'odc-ground-communications-test/1',id,title:spec.title,method:'Deterministic simulated ground test',setting:metric(control.label,x,control.unit),assumptions,requirements,outcome:passed?'pass':'fail',source:spec.source};
 return {id,setting:x,passed,summary,measurements,stages:stages.map((s,i)=>({...s,label:spec.stages[i]})),trace,evidence,signature:JSON.stringify([id,x,assumptions.map(a=>a.value)])};
}
