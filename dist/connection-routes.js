// Pure, shared centreline construction. Procurement and display use the same
// rounded route; points are in metres in the containing assembly's frame.
const add=(a,b,k=1)=>a.map((x,i)=>x+k*b[i]),sub=(a,b)=>add(a,b,-1),mul=(a,k)=>a.map(x=>x*k),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),length=a=>Math.hypot(...a),unit=a=>mul(a,1/(length(a)||1)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function routeLength(points){let total=0;for(let i=1;i<points.length;i++)total+=length(sub(points[i],points[i-1]));return total;}
export function roundedConnectionRoute(input,bendRadiusM=.03,arcSteps=8){
 const points=[];for(const p of input||[])if(p?.length===3&&p.every(Number.isFinite)&&(!points.length||length(sub(p,points.at(-1)))>1e-8))points.push([...p]);
 if(points.length<3){const lengthM=routeLength(points);return {points,lengthM,developedLengthM:lengthM,minimumBendRadiusM:Infinity,bendLimited:false};}
 const out=[points[0]],radii=[],desiredTrims=points.map(()=>0);
 let developedLengthM=routeLength(points);
 for(let i=1;i<points.length-1;i++){const u=unit(sub(points[i],points[i-1])),v=unit(sub(points[i+1],points[i])),angle=Math.acos(Math.max(-1,Math.min(1,dot(u,v))));if(angle>=1e-5&&angle<=Math.PI-1e-4)desiredTrims[i]=bendRadiusM*Math.tan(angle/2);}
 // Adjacent fillets share a straight segment. Their actual tangent trims
 // must fit together; an oblique corner may legitimately use more than half
 // while its shallower neighbour uses less. Preserve two percent of each
 // segment and scale both requested trims only when their sum cannot fit.
 const segmentScales=points.slice(1).map((p,i)=>{const requested=desiredTrims[i]+desiredTrims[i+1];return requested>0?Math.min(1,.98*length(sub(p,points[i]))/requested):1;});
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1],u=unit(sub(b,a)),v=unit(sub(c,b)),cos=Math.max(-1,Math.min(1,dot(u,v))),angle=Math.acos(cos);
  if(angle<1e-5){out.push(b);continue;}
  // A reversing route has no finite fillet. Keep its corner visible to the
  // audit instead of making a spline loop through neighbouring equipment.
  if(angle>Math.PI-1e-4){out.push(b);radii.push(0);continue;}
  const tangent=Math.tan(angle/2),trim=desiredTrims[i]*Math.min(segmentScales[i-1],segmentScales[i]),radius=trim/tangent;
  developedLengthM+=radius*angle-2*trim;
  const entry=add(b,u,-trim),exit=add(b,v,trim),normal=unit(sub(v,mul(u,cos))),center=add(entry,normal,radius),axis=unit(cross(u,v)),start=sub(entry,center);
  out.push(entry);const steps=Math.max(2,Math.ceil(arcSteps*angle/(Math.PI/2)-1e-10));
  for(let j=1;j<steps;j++){const t=angle*j/steps,rot=add(add(mul(start,Math.cos(t)),cross(axis,start),Math.sin(t)),axis,dot(axis,start)*(1-Math.cos(t)));out.push(add(center,rot));}
  out.push(exit);radii.push(radius);
 }
 out.push(points.at(-1));return {points:out,lengthM:routeLength(out),developedLengthM,minimumBendRadiusM:radii.length?Math.min(...radii):Infinity,bendLimited:radii.some(r=>r+1e-7<bendRadiusM)};
}

export function sampleConnectionRoute(points,count=48,{preserveVertices=false}={}){
 const total=routeLength(points),dist=[0];for(let i=1;i<points.length;i++)dist.push(dist.at(-1)+length(sub(points[i],points[i-1])));
 if(!points.length)return [];if(total<1e-10)return Array.from({length:count+1},()=>[...points[0]]);
 // A uniform arclength resample can bridge right across a small-radius bend.
 // Preserve every constructed fillet vertex in the actual displayed tube.
 if(preserveVertices){
  if(points.length>count+1)throw new Error('Connection sampling capacity is smaller than the constructed route');
  const pieces=Array.from({length:points.length-1},()=>1),remaining=count-pieces.length,lengths=pieces.map((_,i)=>dist[i+1]-dist[i]),heap=pieces.map((_,i)=>i);
  // This is the same longest-current-piece allocation as the original scan.
  // Equal scores retain its lower-segment-index tie break, so the subdivision
  // counts, original vertices and every floating-point output coordinate stay
  // identical. Updating only the selected heap root avoids a complete corner
  // scan for each of the thousands of rings in an articulated service chain.
  const higher=(a,b)=>{const x=lengths[a]/pieces[a],y=lengths[b]/pieces[b];return x>y||x===y&&a<b;};
  function sift(index){const entry=heap[index];for(;;){let child=index*2+1;if(child>=heap.length)break;if(child+1<heap.length&&higher(heap[child+1],heap[child]))child++;if(!higher(heap[child],entry))break;heap[index]=heap[child];index=child;}heap[index]=entry;}
  for(let i=Math.floor(heap.length/2)-1;i>=0;i--)sift(i);
  for(let k=0;k<remaining;k++){pieces[heap[0]]++;sift(0);}
  const out=[[...points[0]]];for(let i=0;i<pieces.length;i++)for(let j=1;j<=pieces[i];j++)out.push(add(points[i],sub(points[i+1],points[i]),j/pieces[i]));return out;
 }
 let segment=1;return Array.from({length:count+1},(_,i)=>{const d=total*i/count;while(segment<points.length-1&&dist[segment]<d)segment++;const a=points[segment-1],b=points[segment],t=(d-dist[segment-1])/(dist[segment]-dist[segment-1]||1);return add(a,sub(b,a),t);});
}
