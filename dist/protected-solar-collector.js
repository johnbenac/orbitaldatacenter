// Protected-core solar-root accommodation. The electrical cassette sits
// inboard of both the wound blanket and the existing mechanical bearing.
// These are project dimensions and material selections, not supplier ratings.
import {familyAppendageDimensions as A} from './family-appendage-dimensions.js';

export const protectedSolarCollectorDimensions=Object.freeze({
 // The body-side pedestal is 90 mm long, centered 40 mm from the wall.
 bearingInboardEndM:.19,clearanceM:.012,hardpointOutboardM:.085,
 caseOuterRadiusM:.127,caseInnerRadiusM:.123,caseEndBoreRadiusM:.096,
 caseEndThicknessM:.004,caseAxialReserveM:.012,
 trackOuterRadiusM:.092,trackInnerRadiusM:.086,
 carrierInnerRadiusM:.067,carrierEndReserveM:.004,
 brushRadialMinM:.091,brushRadialMaxM:.124,brushAxialM:.005,brushWidthM:.014,
 rootExtensionOuterRadiusM:.067,rootExtensionBoreRadiusM:.055,
 lockExtensionOuterRadiusM:.044,lockExtensionBoreRadiusM:.030,
 aluminiumDensityKgM3:2700,copperDensityKgM3:8960,
 polyimideDensityKgM3:1420,brushDensityKgM3:1800
});

export function protectedSolarCollectorAllocation({wingLengthM,contactCount}){
 if(!Number.isInteger(contactCount)||contactCount<2)throw new Error('Solar collector needs a complete positive/return contact inventory');
 const d=protectedSolarCollectorDimensions,packedRollM=Math.sqrt(.125**2+.002*wingLengthM/Math.PI),
  stackHalfM=(contactCount-1)*A.solarContactAxialPitchM/2+A.solarContactTubeRadiusM,
  caseHalfM=stackHalfM+d.caseAxialReserveM,
  inboardCenterM=Math.max(d.bearingInboardEndM,packedRollM+A.solarReelDiscRadialOverhangM)+d.clearanceM+caseHalfM,
  originalStandOffM=packedRollM+.12,
  rootStandOffM=Math.max(originalStandOffM,inboardCenterM+caseHalfM+d.hardpointOutboardM+d.clearanceM);
 return {revision:'protected-solar-collector-bay-r1',contactCount,packedRollM,stackHalfM,caseHalfM,inboardCenterM,originalStandOffM,rootStandOffM,
  supportExtensionM:rootStandOffM-originalStandOffM,
  minimumRollGapM:inboardCenterM-caseHalfM-packedRollM-A.solarReelDiscRadialOverhangM,
  minimumBearingGapM:inboardCenterM-caseHalfM-d.bearingInboardEndM,
  minimumHardpointGapM:rootStandOffM-inboardCenterM-caseHalfM-d.hardpointOutboardM,
  basis:'The complete fixed housing, brushes, rotating contact stack and dielectric carrier occupy a coaxial bay inboard of the stowed roll and root bearing. The bay grows with installed contact count. A 12 mm project clearance separates its outer material envelope from the roll/discs, bearing and wall hardpoint; it is not a collision-check tolerance.'};
}

// One separately owned assembly per wing. Fixed extension tubes move the
// original root/lock rods outward without changing their lengths. Their
// body-side guides stay at the original wall hardpoints.
// The pre-existing mechanism allocation remains unchanged. Every new cassette
// and extension material piece is counted in full; open bores add no mass.
export function protectedSolarCollectorHardware(h,layout){
 const a=h.solarRootCollector;if(!a)return [];
 const d=protectedSolarCollectorDimensions;
 return layout.mounts.filter(m=>m.kind==='solar').map((mount,instance)=>{
  const side=mount.side,root=mount.supports[0].seat,x=-side*a.inboardCenterM,
   annulus=(id,role,outerRadiusM,innerRadiusM,lengthM,positionM,material,densityKgM3)=>({id,role,shape:'annulus',axis:'x',outerRadiusM,innerRadiusM,lengthM,positionM,material,densityKgM3}),
   // The barrel meets the two end caps at butt joints. Its material stops
   // at their inner faces, so the shared mass schedule has no joint overlap.
   pieces=[annulus('case','stator',d.caseOuterRadiusM,d.caseInnerRadiusM,2*(a.caseHalfM-d.caseEndThicknessM),[x,0,0],'Aluminium',d.aluminiumDensityKgM3),
    ...[-1,1].map(sign=>annulus('end-cap-'+sign,'stator',d.caseOuterRadiusM,d.caseEndBoreRadiusM,d.caseEndThicknessM,[x+sign*(a.caseHalfM-d.caseEndThicknessM/2),0,0],'Aluminium',d.aluminiumDensityKgM3)),
    annulus('contact-carrier','rotor',d.trackInnerRadiusM,d.carrierInnerRadiusM,2*(a.stackHalfM+d.carrierEndReserveM),[x,0,0],'Polyimide dielectric',d.polyimideDensityKgM3)];
  for(let k=0;k<a.contactCount;k++){
   const station=x+(k-(a.contactCount-1)/2)*A.solarContactAxialPitchM,
    circuit='P-SA-'+(instance+1)+'/channel-'+(Math.floor(k/2)+1)+'/'+(k%2?'positive':'return');
   pieces.push({...annulus('contact-'+k,'rotor',d.trackOuterRadiusM,d.trackInnerRadiusM,2*A.solarContactTubeRadiusM,[station,0,0],'Copper contact',d.copperDensityKgM3),circuit},
    {id:'brush-'+k,role:'stator',shape:'box',dimensionsM:[d.brushAxialM,d.brushRadialMaxM-d.brushRadialMinM,d.brushWidthM],positionM:[station,(d.brushRadialMaxM+d.brushRadialMinM)/2,0],material:'Carbon contact brush',densityKgM3:d.brushDensityKgM3,circuit});
  }
  if(a.supportExtensionM>1e-9)for(const [index,support]of mount.supports.entries()){
   const center=support.foot.map((v,k)=>v-root[k]);center[0]+=side*a.supportExtensionM/2;
   const lock=support.role==='restraint';
   pieces.push({...annulus('support-extension-'+index,'support',lock?d.lockExtensionOuterRadiusM:d.rootExtensionOuterRadiusM,lock?d.lockExtensionBoreRadiusM:d.rootExtensionBoreRadiusM,a.supportExtensionM,center,'Aluminium',d.aluminiumDensityKgM3),
    basis:'New fixed hollow extension for the '+(lock?'launch-lock guide':'root-shaft pedestal')+'. The original guide stays at the wall; the original rod shifts outward without changing length. Its archived mass allocation is unchanged. Only the rod retracts, so the added extension stays in the fixed body mass frame.'});
  }
  return {id:'protected-solar-collector-'+(instance+1),wbs:'07.08.'+String(instance+1).padStart(2,'0'),itemId:'flight:07.08.'+String(instance+1).padStart(2,'0'),label:'Solar root '+(instance+1)+' electrical cassette and support extension',frame:'body',positionM:[...root],wingInstance:instance,side,materialPieces:pieces,sourceUrl:'./protected-solar-collector.js',basis:a.basis+' Aluminium 2700, copper 8960, polyimide 1420 and carbon-brush 1800 kg/m³ are preliminary material-density selections. The old decorative stator torus is replaced; electrical cassette material was not a separate mass row before this repair. Existing mechanism and routed-cable allocations are retained, with no duplicated connector mass.'};
 });
}

// The scene and focused regression construct exactly these hollow material
// buffers. Three.js is supplied by the caller, keeping sizing data independent
// of a browser or WebGL context.
export function protectedSolarCollectorMaterialGeometry(T,piece){
 if(piece.shape!=='annulus')return new T.BoxGeometry(...piece.dimensionsM);
 const shape=new T.Shape(),hole=new T.Path();shape.absarc(0,0,piece.outerRadiusM,0,2*Math.PI,false);hole.absarc(0,0,piece.innerRadiusM,0,2*Math.PI,true);shape.holes.push(hole);
 const geometry=new T.ExtrudeGeometry(shape,{depth:piece.lengthM,bevelEnabled:false,curveSegments:24});geometry.translate(0,0,-piece.lengthM/2);geometry.rotateY(Math.PI/2);return geometry;
}

export function installProtectedSolarCollectorGeometry({T,part,stator,rotor,materials,sourceItemId='flight:02.01',createMesh}){
 const add=createMesh||((parent,geometry,material,name,data)=>{const mesh=new T.Mesh(geometry,material);mesh.name=name;Object.assign(mesh.userData,data);parent.add(mesh);return mesh;});
 const meshes=[];
 for(const piece of part.materialPieces){
  if(piece.role==='support')continue; // Fixed extensions are installed at the physical root/lock hardpoints.
  const parent=piece.role==='rotor'?rotor:stator,geometry=protectedSolarCollectorMaterialGeometry(T,piece),
   material=piece.material.startsWith('Copper')?materials.contact:piece.material.includes('dielectric')||piece.material.startsWith('Carbon')?materials.insulator:materials.metal,
   name=piece.id==='case'?'Rotary electrical stator housing':piece.id.startsWith('contact-')&&piece.circuit?'Rotary collector · '+piece.circuit:piece.id.startsWith('brush-')?'Stator contact · '+piece.circuit:'Solar electrical cassette · '+piece.id,
   mesh=add(parent,geometry,material,name,{part:'solar',physicalPartId:part.itemId,electricalItemIds:[sourceItemId,part.itemId],installationHardwareId:part.id,materialPieceId:piece.id,rotaryElectricalCircuitId:piece.circuit||null});
  mesh.position.set(...piece.positionM);meshes.push(mesh);
 }
 return meshes;
}
