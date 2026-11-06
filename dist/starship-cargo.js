// ODC accommodation study. Metres in the ship frame, +Y noseward and -X outboard.
// Nose stations are exterior drawing estimates. The cargo datum is four metres
// below the former station, leaving a fixed crown and both forward flap roots.
export const shipNose=[[4.5,0],[4.5,10.6],[4.46,12.5],[4.30,14.8],[4.00,17],[3.55,19.3],[2.9,21.6],[2.10,23.6],[1.18,25.4],[.45,26.47],[.09,26.75],[.022,26.77]];
const angleRad=46.5*Math.PI/180;
export const cargoBay=Object.freeze({angleRad,travelRad:112*Math.PI/180,sillM:.40,headerM:14.90,
 deckM:.80,strokeM:9.1,frameM:.10,hingeX:-4.5*Math.cos(angleRad),hingeZ:-4.5*Math.sin(angleRad)});
export function noseRadius(y){
 for(let i=1;i<shipNose.length;i++){const [a,l]=shipNose[i-1],[b,u]=shipNose[i];if(y<=u)return a+(b-a)*(Math.max(l,y)-l)/(u-l);}
 return shipNose.at(-1)[0];
}
export function starshipCargoFit(stack,{radialPaddingM=0,axialPaddingM=0}={}){
 const g=cargoBay,widthM=2*(noseRadius(g.headerM)*Math.sin(angleRad)-g.frameM),heightM=g.headerM-g.frameM-g.deckM;
 const wide=stack.reduce((a,b)=>a.heightM>=b.heightM?a:b),high=stack.reduce((a,b)=>a.z1M>=b.z1M?a:b);
 const requiredWidthM=Math.max(2.55,wide.heightM+2*radialPaddingM),requiredHeightM=high.z1M+axialPaddingM;
 const widthMarginM=widthM-requiredWidthM,heightMarginM=heightM-requiredHeightM;
 const depthMarginM=g.strokeM-4.5-.15-Math.max(...stack.map(s=>s.widthM/2))-radialPaddingM;
 const body=stack.find(s=>s.part==='Insulated bus'),bells=stack.find(s=>s.part==='Engine bells');
 const liftStrokeM=Math.max(.30,(body?.z0M??0)-(bells?.z0M??body?.z0M??0)+.14);
 let hullMarginM=Infinity,hullPart='';
 for(const section of stack){
  const margin=noseRadius(g.deckM+section.z1M+axialPaddingM)-.17-section.radiusM-radialPaddingM;
  if(margin<hullMarginM){hullMarginM=margin;hullPart=section.part}
 }
 const minimum=Math.min(widthMarginM,heightMarginM,depthMarginM,hullMarginM);
 const limitingPart=minimum===heightMarginM?high.part:minimum===widthMarginM?wide.part:minimum===depthMarginM?'Outboard release stroke':hullPart;
 return {fits:minimum>=0,liftStrokeM,widthM,heightM,requiredWidthM,requiredHeightM,widthMarginM,heightMarginM,depthMarginM,hullMarginM,
  strokeM:g.strokeM,limitingPart};

}
function fraction(t,a,b){return Math.max(0,Math.min(1,(t-a)/(b-a)))}
function ramp(t,a,b){const k=fraction(t,a,b);return k*k*(3-2*k)}
export function starshipCargoFlight(t,c,canMove=true,liftStrokeM=.8){
 if(!canMove)return {hatch:0,carriageM:0,payloadM:0,liftM:0,pinLiftM:0,kickM:0,clamped:true};
 const hatch=ramp(t,c.doorOpen,c.hatchClear)*(1-ramp(t,c.carriageHome,c.hatchLatched));
 const carriageM=cargoBay.strokeM*ramp(t,c.hatchClear,c.release)*(1-ramp(t,c.releaseClear,c.carriageHome));
 const extractEnd=c.eject,drift=Math.max(0,t-extractEnd);
 // First lift axially in the outboard cradle until the engine bells and
 // pilots are fully above the upper flange. Then a side pusher initiates drift.
 const liftM=liftStrokeM*ramp(t,c.release,extractEnd);
 const ejectM=drift<2?.035*drift**2:.14*(drift-1);
 const payloadM=t<c.release?carriageM:cargoBay.strokeM+ejectM;
 const pinLiftM=liftM*(1-ramp(t,extractEnd+3,extractEnd+9));
 const kickM=Math.min(.14,ejectM)*(1-ramp(t,extractEnd+2,extractEnd+6));
 return {hatch,carriageM,payloadM,liftM,pinLiftM,kickM,clamped:t<c.release};
}
