import * as T from './vendor/three.module.js';
import {tagMaterial,roleMaterial} from './spacecraft-material-render.js';
import {redwirePayloadTransferPolicy as transferPolicy} from './redwire-payload-transfer.js';

// One material schedule owns both the visible installation and its MEL mass.
// Coordinates are metres in the body or moving payloadRack frame. Cable space
// is left open; no filled tray/enclosure volume is charged as metal.
const aluminium={material:'6061 aluminium preliminary selection',densityKgM3:2700};
const copper={material:'Copper contact rings',densityKgM3:8960};
const polymer={material:'PEEK insulating carrier preliminary selection',densityKgM3:1300};
const steel={material:'Bearing steel preliminary selection',densityKgM3:7800};
const box=(id,dimensionsM,positionM,extra={})=>({id,dimensionsM,positionM,...extra});
const annulus=(id,outerRadiusM,innerRadiusM,lengthM,positionM,extra={})=>({id,shape:'annulus',axis:'x',outerRadiusM,innerRadiusM,lengthM,positionM,...extra});
const plus=(a,b)=>a.map((v,i)=>v+b[i]);
export const redwireHarnessInstallationPolicy=Object.freeze({
 revision:'redwire-mounted-trays-rotary-2',cableAxisYM:.1056,coreLengthM:.80,coreRadiusM:.100,
 serviceStrokeM:.045,clearanceM:.003,wallThicknessM:.002,
 laneXM:{nearPower:.86,nearData:.95,farPower:1.20,farData:1.32},
 basis:'Static cable branches lie in two open panel-mounted trays. A custom hinge-axis electrical/optical transfer separates the fixed and moving cable cuts; the rotary component, not a free cable hoop, crosses the deployment joint.'
});
function hollowBox(dimensionsM,t=.002,openAxes=[]){
 const pieces=[];for(let axis=0;axis<3;axis++)if(!openAxes.includes(axis))for(const sign of[-1,1]){const d=dimensionsM.map((v,i)=>i===axis?t:v-(i<axis?2*t:0)),p=[0,0,0];p[axis]=sign*(dimensionsM[axis]-t)/2;pieces.push(box('wall-'+axis+'-'+sign,d,p));}return pieces;
}
export function redwirePanelLane(spec,architecture){
 const target=architecture.boxById[spec.toBoxId];if(spec.fromBoxId!=='payload-transfer-rotor'||target?.frame!=='payload')return null;
 const side=Math.sign(target.positionM[0])||1,near=target.positionM[2]<0,kind=spec.kind==='data'?'Data':'Power',key=(near?'near':'far')+kind;
 return {side,x:side*redwireHarnessInstallationPolicy.laneXM[key],near,kind:key};
}
export function redwirePanelRouteControls(spec,architecture,from,to){
 const lane=redwirePanelLane(spec,architecture);if(!lane)return null;
 return [[...from],[lane.x,from[1],from[2]],[lane.x,to[1],to[2]],[...to]];
}
export function redwirePlatformHarnessLocalRoute(graph,harness,connectorLengthM){
 const point=end=>{const p=graph.portById[harness[end+'PortId']],b=graph.boxById[p.boxId];return plus(plus(b.positionM,p.positionM),p.normal.map(n=>n*(.018+.92*connectorLengthM)));};
 return redwirePanelRouteControls(harness,graph,point('from'),point('to'));
}
function retentionRecords(architecture){
 const records=[];for(const spec of architecture.harnesses){const lane=redwirePanelLane(spec,architecture);if(!lane)continue;const from=architecture.portById[spec.fromPortId],to=architecture.portById[spec.toPortId],a=plus(architecture.boxById[from.boxId].positionM,from.positionM),b=plus(architecture.boxById[to.boxId].positionM,to.positionM),R=spec.bendRadiusM,low=a[2]+R+.065,high=b[2]-R-.065;records.push({spec,lane,a,b,stations:high-low>.20?[low,high]:[(a[2]+b[2])/2]});}return records;
}
export function redwireHarnessInstallationHardware(h,architecture){
 if(h.architectureFamilyId!=='redwire-platform')return [];
 const schedule=[],roof=h.bodyHeightM/2,end=h.bodyLengthM/2,axis=[0,roof+.20,end+.15],hingeLocal=[0,-.105,-h.radiatorLengthM/2],retainers=retentionRecords(architecture);
 const add=(id,label,wbs,frame,positionM,materialPieces,extra={})=>{const p={id,label,wbs,itemId:'flight:'+wbs,owner:'redwire-harness-installation',frame,positionM,...aluminium,materialPieces,basis:redwireHarnessInstallationPolicy.basis,...extra};schedule.push(p);return p;};
 for(const [i,side]of[-1,1].entries()){
  const center=[side*.995,.035,-.62],pieces=[box('inboard-longeron',[.025,.003,2.10],[-.4775,0,0]),box('outboard-longeron',[.025,.003,2.10],[.4775,0,0]),box('outer-lip',[.003,.10,2.10],[side*.4885,.0515,0]),box('root-lip',[.98,.10,.003],[0,.0515,-1.0485]),box('tip-lip',[.98,.10,.003],[0,.0515,1.0485])];
  const stations=[...Array.from({length:9},(_,k)=>-1.0+k*.25),...retainers.filter(r=>r.lane.side===side).flatMap(r=>[...r.stations,r.a[2],r.b[2]].map(z=>z-center[2]))].sort((a,b)=>a-b),intervals=[];
  for(const z of stations){const lo=z-.0125,hi=z+.0125,last=intervals.at(-1);if(last&&lo<=last[1])last[1]=Math.max(last[1],hi);else intervals.push([lo,hi]);}
  for(const [k,[lo,hi]]of intervals.entries())pieces.push(box('cross-rung-'+k,[.93,.003,hi-lo],[0,0,(lo+hi)/2]));
  for(const x of[-.4775,.4775])for(const z of[-.92,-.31,.31,.92]){pieces.push(box('foot-'+x+'-'+z,[.025,.006,.06],[x,-.057,z]),box('stand-'+x+'-'+z,[.025,.0525,.025],[x,-.02775,z]));}
  add('redwire:tray:'+side,(side<0?'Port':'Starboard')+' open ladder cable tray','07.07.'+String(i+1).padStart(2,'0'),'payload',center,pieces,{basis:'2.10 m ventilated ladder tray: two 25 mm longitudinal rails, discrete 25 mm cross-rungs at ≤250 mm pitch and every restraint station, and outer retention lips. Eight pedestals seat on the actual upper leaf face at payloadRack Y=-.025 m and bolt it to the leaf. Open gaps preserve radiator exposure and make every cable bend visible.'});
 }
 let clampIndex=0;
 for(const {spec,lane,stations,a,b}of retainers){
  const r=spec.cableDiameterM/2,c=.003,stroke=.045,th=.004;
  for(const [k,z]of stations.entries()){
   const span=stroke+2*(r+c),height=2*(r+c),center=[lane.x+lane.side*stroke/2,.1056,z],bottom=.1056-height/2-th,footTop=.0405;
   const pieces=[box('lower-saddle',[span+2*th,th,.022],[0,-height/2-th/2,0]),box('removable-retainer',[span+2*th,th,.022],[0,height/2+th/2,0]),box('inboard-cheek',[th,height,.022],[-span/2-th/2,0,0]),box('outboard-cheek',[th,height,.022],[span/2+th/2,0,0]),box('mounting-pedestal',[.024,bottom-footTop,.022],[0,(bottom+footTop)/2-.1056,0]),box('tray-foot',[span+2*th,.004,.035],[0,.0385-.1056,0])];
   add('redwire:retainer:'+spec.id+':'+k,spec.id+' removable tray restraint '+(k+1),'07.07.'+String(10+(clampIndex++)).padStart(2,'0'),'payload',center,pieces,{harnessId:spec.id,basis:'Removable retaining bridge and bolted pedestal. Its 45 mm lateral service slot contains the full constant-length connector-withdrawal movement; connector backshells provide terminal strain relief. No contact/collision exemption is used.'});
  }
  for(const [end,x,z]of[['source',lane.side*.55,a[2]],['computer',lane.side*.64,b[2]]]){
   const outer=r+c+th,base=.0405,bottom=.1056-outer,center=[x,.1056,z],pieces=[annulus('removable-saddle',outer,r+c,.022,[0,0,0]),box('pedestal',[.022,bottom-base,.020],[0,(base+bottom)/2-.1056,0]),box('rung-foot',[.035,.004,.035],[0,.0385-.1056,0])];
   add('redwire:lead-saddle:'+spec.id+':'+end,spec.id+' '+end+' straight-lead saddle','07.07.'+String(10+(clampIndex++)).padStart(2,'0'),'payload',center,pieces,{harnessId:spec.id,basis:'Removable annular saddle on the straight connector lead, fixed to a ladder rung. Its axis follows the cable so the full45mm unplugging movement remains inside the bore. Connector backshells carry terminal strain relief; this support has no solid-clearance exemption.'});
  }
 }
 // Terminal enclosures are already rendered by physicalBox in the electrical
 // scene; this record supplies their actual thin-wall material takeoff once.
 for(const [index,id]of['payload-transfer-stator','payload-transfer-rotor'].entries()){
  const b=architecture.boxById[id];if(b)add('redwire:'+id+':enclosure',b.label+' enclosure','07.08.'+String(index+1).padStart(2,'0'),b.frame,[...b.positionM],hollowBox(b.dimensionsM),{renderedBy:'electrical-equipment',electricalBoxId:id,basis:'2 mm aluminium terminal enclosure; external shell and ports are represented by the electrical equipment scene. Cable/termination mass is accounted by its individual harness cuts.'});
 }
 add('redwire:rotary:stator-shell','Hybrid rotary transfer stator housing','07.08.03','body',axis,[annulus('casing-port',.100,.096,.284,[-.254,0,0]),annulus('casing-stator-window',.100,.096,.224,[0,0,0],{startAngleRad:.20,angleRad:2*Math.PI-Math.PI/3-.20}),annulus('casing-starboard',.100,.096,.284,[.254,0,0]),annulus('end-ring-left',.100,.040,.004,[-.398,0,0]),annulus('end-ring-right',.100,.040,.004,[.398,0,0])],{basis:'Custom 0.80 m by 0.20 m rotary interface envelope. Housing is 4 mm aluminium, with an explicit224mm axial radial window at the fixed bridge entry; this is a PDR allocation, not a selected supplier or qualified product.'});
 const ringPieces=Array.from({length:32},(_,i)=>annulus('power-contact-'+(i+1),.072,.064,.006,[(i-15.5)*.015,0,0],copper));
 ringPieces.push(annulus('insulating-carrier',.064,.040,.50,[0,0,0],polymer),annulus('rotor-hub',.040,.030,.80,[0,0,0],aluminium));
 add('redwire:rotary:rotor-core','32-ring payload power rotor','07.08.04','payload',hingeLocal,ringPieces,{basis:'Eight conductors each use four parallel contact passes. 32 copper rings at 15 mm pitch, 6 mm axial copper width, on an explicit insulating carrier and hollow aluminium hub. Current and loss budgets are declared by the electrical architecture; this is not a supplier rating.'});
 add('redwire:rotary:bearings','Rotary bearing pair','07.08.05','body',axis,[-1,1].map(side=>annulus('bearing-'+side,.082,.040,.014,[side*.367,0,0],steel)),{basis:'Two annular steel bearing envelopes, explicit metal volume at the custom hinge axis. Bearing selection and life remain a detailed design activity.'});
 const brushes=[];for(let i=0;i<32;i++){const x=(i-15.5)*.015;brushes.push(box('contact-finger-'+i,[.006,.014,.014],[x,.078,0],copper));}brushes.push(box('brush-carrier',[.50,.010,.040],[0,.090,0],polymer));
 add('redwire:rotary:stator-contacts','32 stator contact paths and carrier','07.08.06','body',axis,brushes,{basis:'Explicit copper contact-finger and insulating-carrier volumes. Contact pressure, parallel sharing, wear and electrical life remain component design requirements.'});
 add('redwire:rotary:optical-cartridge','Eight-channel single-mode optical rotary cartridge','07.08.07','body',plus(axis,[.30,0,0]),[],{massItems:[{id:'sm-optical-cartridge',label:'Custom eight-channel SM optical rotary cartridge',massKg:1.20,positionM:[0,0,0],dimensionsM:[.10,.12,.12],basis:'Declared 1.20 kg preliminary internal cartridge allocation, including optical train, alignment carrier and local protection. Eight active fibers for four duplex 100G LR4 links; not supplier mass or qualification data.'}],basis:'Custom eight-channel SM optical rotary interface housed in the spare axial bay; declared component mass is separate from housing and copper volume.'});
 const neckCenter=[0,roof-.020,end-.20],neck=hollowBox([.22,.30,.20],.004,[1]),bridgeCenter=[0,roof+.165,end-.025],bridge=hollowBox([.22,.10,.35],.004,[2]);
 add('redwire:rotary:roof-neck','Stator insulated roof-transfer neck','07.08.08','body',neckCenter,neck,{basis:'Hollow fixed transfer neck passes through an actual rectangular roof aperture. It connects the internal stator terminal bank to the hinge housing; internal conductors are represented by the functional rotary channel map.'});
 add('redwire:rotary:fixed-bridge','Stator neck-to-hinge bridge','07.08.09','body',bridgeCenter,bridge,{basis:'Hollow aluminium bridge joins the roof neck to the fixed rotary housing; it reserves contained internal electrical/optical transfer space.'});
 const mountPieces=[];for(const x of[-.35,.35]){mountPieces.push(box('foot-'+x,[.10,.012,.22],[x,-.194,-.26]),box('cantilever-web-'+x,[.018,.076,.36],[x,-.150,-.15]),annulus('housing-collar-'+x,.112,.100,.024,[x,0,0]));}
 add('redwire:rotary:stator-mount','Roof-mounted rotary stator support pair','07.08.10','body',axis,mountPieces,{basis:'Two explicit bolted roof feet, vertical webs and bearing-support caps carry the fixed housing. Hardware contacts are assembly joints; routed cables retain ordinary solid clearance checks.'});
 const rotorMount=[];for(const x of[-.19,.19]){rotorMount.push(box('foot-'+x,[.08,.006,.30],[x,-.022,-1.39]),box('stand-'+x,[.025,.0346,.18],[x,-.0017,-1.39]));}
 // Thin fork cheeks link the rotating core to the bank, beside its cable cavity.
 for(const x of[-.27,.27]){rotorMount.push(box('coupling-cheek-'+x,[.012,.125,.10],[x,-.0415,hingeLocal[2]+.055]),box('bank-fork-flange-'+x,[.06,.012,.20],[Math.sign(x)*.255,.021,hingeLocal[2]+.20]));}
 add('redwire:rotary:rotor-mount','Payload terminal bank feet and rotor fork','07.08.11','payload',[0,0,0],rotorMount,{basis:'Two feet attach the rotor terminal bank to the moving leaf; side fork cheeks connect its rotating interface to the core. The root-edge relief clears the rotary housing.'});
 const rootZ=-h.radiatorLengthM/2,thickness=.07,reliefWidth=transferPolicy.rootReliefWidthM;
 add('redwire:rotary:panel-relief-edges','Compute platform rotary root-edge closeouts','07.08.12','payload',[0,-.06,rootZ],[box('relief-back',[reliefWidth,thickness,.002],[0,0,.126]),box('relief-port-edge',[.002,thickness,.125],[-reliefWidth/2-.001,0,.0625]),box('relief-starboard-edge',[.002,thickness,.125],[reliefWidth/2+.001,0,.0625])],{basis:'2 mm aluminium closure strips seal the exposed honeycomb cut edges around the physical .92 m by .125 m hinge relief. All strips lie beyond the removed notch and are included in the MEL material takeoff.'});
 // The rotor leaves the fixed casing through its open axial hub. This
 // rotating elbow has a real60mm opening at that hub and joins the bank on
 // its rear side, clear of the actual optical/power connector approaches.
 const hood=[box('vertical-outboard-wall',[.002,.2106,.08],[.443,.0653,0]),box('vertical-front-wall',[.040,.2106,.002],[.422,.0653,.039]),box('vertical-back-wall',[.040,.2106,.002],[.422,.0653,-.039]),box('vertical-bottom',[.040,.002,.076],[.422,-.039,0]),box('hub-opening-upper',[.002,.1406,.08],[.401,.1003,0]),box('hub-opening-lower',[.002,.010,.08],[.401,-.035,0]),box('hub-opening-port',[.002,.060,.010],[.401,0,-.035]),box('hub-opening-starboard',[.002,.060,.010],[.401,0,.035]),box('bank-elbow-top',[.204,.002,.08],[.342,.2496,0]),box('bank-elbow-bottom',[.160,.002,.076],[.320,.1716,0]),box('bank-elbow-front',[.204,.078,.002],[.342,.2096,.039]),box('bank-elbow-back',[.204,.078,.002],[.342,.2096,-.039]),box('bank-elbow-outboard',[.002,.078,.076],[.443,.2096,0])];
 add('redwire:rotary:rotor-outlet-hood','Hollow rotating hub-to-bank outlet elbow','07.08.13','payload',hingeLocal,hood,{basis:'2 mm aluminium rotating outlet elbow. Its60mm hub opening lies beyond the fixed end-ring face atX=.400m; a hollow vertical run rises inside the actual root-edge relief and turns into the rear of the rotor bank. It does not penetrate the fixed cylindrical casing or the intact leaf.'});
 const conductorCount=architecture.rotaryTransferAccounting?.internalLeadConductorCount||8,duplexCount=(architecture.rotaryTransferAccounting?.opticalChannels||8)/2;
 for(const [index,frame,length,position]of[[0,'body',transferPolicy.internalLeadFixedLengthM,[0,roof+.09,end-.08]],[1,'payload',transferPolicy.internalLeadRotatingLengthM,[.22,-.005,rootZ+.03]]]){
  const materialTakeoff=[{material:'Copper conductor strip',quantity:conductorCount,cutLengthM:length,areaMM2:transferPolicy.internalLeadCopperAreaMM2,densityKgM3:transferPolicy.copperDensityKgM3},{material:'PEEK insulation envelope',quantity:conductorCount,cutLengthM:length,areaMM2:transferPolicy.internalLeadInsulationAreaMM2,densityKgM3:transferPolicy.internalLeadInsulationDensityKgM3}],massItems=materialTakeoff.map((cut,i)=>({id:i?'insulation-cuts':'copper-cuts',label:cut.material+' · '+conductorCount+' individual '+length.toFixed(2)+'m cuts',massKg:cut.quantity*cut.cutLengthM*cut.areaMM2*1e-6*cut.densityKgM3,positionM:[0,0,0],dimensionsM:frame==='body'?[.48,.37,.50]:[.48,.30,.28],materialTakeoff:[cut],renderEnvelope:false,occlusion:'contained',basis:conductorCount+'×'+length+'m×'+cut.areaMM2+'mm²×'+cut.densityKgM3+'kg/m³. Exact preliminary cut/material schedule within the owned component housing; the bounding dimensions are an inertia proxy, not a claimed detailed internal cable path.'}));
  add('redwire:rotary:'+frame+'-internal-leads',(frame==='body'?'Fixed stator':'Rotating rotor')+' internal power conductor cut set','07.08.'+(14+index),frame,position,[],{massItems,materialTakeoff,occlusion:'contained',renderEnvelope:false,containedCuts:Array.from({length:conductorCount},(_,i)=>({id:'P-PAY-'+(Math.floor(i/2)+1)+':'+(i%2?'return':'supply')+':'+frame,net:i%2?'return':'supply',cutLengthM:length,copperAreaMM2:transferPolicy.internalLeadCopperAreaMM2,insulationAreaMM2:transferPolicy.internalLeadInsulationAreaMM2})),fit:{powerInsulatedAreaM2:conductorCount*(transferPolicy.internalLeadCopperAreaMM2+transferPolicy.internalLeadInsulationAreaMM2)*1e-6,opticalEnvelopeAreaM2:duplexCount*Math.PI*.002**2,minimumContainedPassageAreaM2:Math.PI*.030**2},basis:'Individual supply/return internal leads are included once by exact cut length, copper area and insulation volume. The 12×7mm insulated strip envelope fits the60mm hollow hub with the four duplex optical pigtails. Internal placement/fold details and insulation qualification remain component design work, not a claim of detailed routed geometry. External installed cables retain full ordinary clearance and service checks.'});
 }
 return schedule;
}
function annularGeometry(piece){
 const shape=new T.Shape(),start=piece.startAngleRad||0,angle=piece.angleRad??2*Math.PI,end=start+angle;
 if(angle<2*Math.PI-1e-10){shape.moveTo(piece.outerRadiusM*Math.cos(start),piece.outerRadiusM*Math.sin(start));shape.absarc(0,0,piece.outerRadiusM,start,end,false);shape.lineTo(piece.innerRadiusM*Math.cos(end),piece.innerRadiusM*Math.sin(end));shape.absarc(0,0,piece.innerRadiusM,end,start,true);shape.closePath();}
 else{shape.absarc(0,0,piece.outerRadiusM,0,2*Math.PI,false);const hole=new T.Path();hole.absarc(0,0,piece.innerRadiusM,0,2*Math.PI,true);shape.holes.push(hole);}
 const g=new T.ExtrudeGeometry(shape,{depth:piece.lengthM,bevelEnabled:false,curveSegments:24});g.translate(0,0,-piece.lengthM/2);if(piece.axis==='x')g.rotateY(Math.PI/2);else if(piece.axis==='y')g.rotateX(Math.PI/2);return g;
}
export function createRedwireHarnessInstallation({factory,h,architecture,material}){
 if(h.architectureFamilyId!=='redwire-platform'||!factory.payloadRack)return null;
 const root=factory.root,body=new T.Group(),payload=new T.Group();body.name='redwire-harness-installation-body';payload.name='redwire-harness-installation-payload';root.add(body);factory.payloadRack.add(payload);
 body.userData.part=payload.userData.part='harness';
 const parts=new Map(),metals=new Map();
 function pieceMaterial(piece,part){const key=piece.material||part.material;if(metals.has(key))return metals.get(key);const m=(material||roleMaterial(h,'electronics-case')).clone();if(key?.includes('Copper'))m.color.set('#bc7840');else if(key?.includes('PEEK'))m.color.set('#a49b78');else if(key?.includes('steel'))m.color.set('#77818b');else m.color.set('#8d9ba5');metals.set(key,m);return m;}
 const schedule=architecture.installationHardware?.filter(p=>p.owner==='redwire-harness-installation')||redwireHarnessInstallationHardware(h,architecture);
 for(const part of schedule){if(part.renderedBy==='electrical-equipment')continue;const g=new T.Group();g.name=part.id;g.position.set(...part.positionM);g.userData={part:'harness',physicalPartId:part.itemId,electricalItemIds:[part.itemId],installationHardwareId:part.id,installationBasis:part.basis};(part.frame==='payload'?payload:body).add(g);parts.set(part.id,g);
  for(const piece of [...(part.materialPieces||[]),...(part.massItems||[])]){if(piece.renderEnvelope===false)continue;const geometry=piece.shape==='annulus'?annularGeometry(piece):new T.BoxGeometry(...piece.dimensionsM),m=tagMaterial(new T.Mesh(geometry,pieceMaterial(piece,part)));m.name=part.label+' · '+piece.id;m.position.set(...piece.positionM);Object.assign(m.userData,{...g.userData,materialPieceId:piece.id,declaredComponentMassKg:piece.massKg||null});g.add(m);}
 }
 const hingeAnchor=new T.Object3D();hingeAnchor.name='Redwire hybrid rotary hinge axis';hingeAnchor.position.set(0,h.bodyHeightM/2+.20,h.bodyLengthM/2+.15);body.add(hingeAnchor);
 const panelAnchor=new T.Object3D();panelAnchor.name='Redwire open payload raceways';panelAnchor.position.set(0,.1056,-.65);payload.add(panelAnchor);
 const roofPassage=factory.addRoutingFeedthrough({id:'redwire-rotary-stator-neck',axis:'y',sign:1,positionM:[0,h.bodyHeightM/2,h.bodyLengthM/2-.20],widthM:.232,heightM:.212,part:'harness',straightM:.04});
 const result={revision:redwireHarnessInstallationPolicy.revision,body,payload,parts,hingeAnchor,panelAnchor,inspectionPoints:[hingeAnchor,panelAnchor],roofPassage,schedule,policy:redwireHarnessInstallationPolicy};factory.redwireHarnessInstallation=result;return result;
}
