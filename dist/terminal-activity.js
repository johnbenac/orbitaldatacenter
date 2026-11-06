// RF widths are full half-power beamwidths. The optical width is twice
// the characteristic divergence used by the Gaussian optical link budget.
const rad=Math.PI/180;
export function terminalPattern(d,terminal){
 if(terminal==='Ka'){
  const apertureM=d.kaDishM||.60;
  return {apertureM,fullWidthRad:70*rad*(299792458/26e9)/apertureM};
 }
 if(terminal==='Optical'){
  const apertureM=d.opticalApertureM||.10;
  return {apertureM,fullWidthRad:2*1.22*1.55e-6/apertureM};
 }
 return {apertureM:.0843,fullWidthRad:80*rad};
}

// Accepted-step volume in decimal GB. Directions are spacecraft-relative.
// An active route can have no records when no bytes were available to send.
export function stepTransfers(b,dt){
 const rows=[],peer=b.g.station,route=b.relayOn?'relay':'direct',target=b.relayOn?'Assumed relay':peer;
 function add(terminal,direction,route,peer,service,gb){
  if(!peer||!(gb>0))return;
  let row=rows.find(r=>r.terminal===terminal&&r.direction===direction&&r.route===route);
  if(!row){row={terminal,direction,route,peer,gb:0,seconds:dt,mbps:0,services:{}};rows.push(row)}
  row.services[service]=gb;row.gb+=gb;row.mbps=row.gb*8000/dt;
 }
 add('S-band','rx','direct',peer,'command',b.uploaded);
 add('S-band','tx','direct',peer,'telemetry',b.telemetryGB);
 add(b.relayOn?'Optical':'S-band','rx',route,target,'input',b.incoming);
 add(b.relayOn?'Optical':b.link.groundLink,'tx',route,target,'payload',b.delivered);
 return rows;
}
export function clipTransfers(rows,seconds){
 return rows.map(r=>{
  const share=seconds/r.seconds;
  return {...r,seconds,gb:r.gb*share,services:Object.fromEntries(Object.entries(r.services).map(([k,v])=>[k,v*share]))};
 });
}
export function terminalRuns(trace){
 const runs=[],last=new Map();
 for(const {start,end,terminalActivity=[]} of trace){
  for(const flow of terminalActivity){
   const key=[flow.terminal,flow.direction,flow.route,flow.peer].join('|');
   let run=last.get(key);
   if(!run||Math.abs(run.end-start)>1e-6){
    run={...flow,start,end,services:{...flow.services}};last.set(key,run);runs.push(run);
   }else{
    run.end=end;run.gb+=flow.gb;run.seconds+=flow.seconds;
    for(const [k,v] of Object.entries(flow.services))run.services[k]=(run.services[k]||0)+v;
   }
  }
 }
 for(const run of runs){run.mbps=run.gb*8000/run.seconds;run.seek=(run.start+run.end)/2}
 return runs;
}
