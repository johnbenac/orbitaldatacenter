const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const finite=Number.isFinite;
const colors=['#f4b467','#78d0d1','#a5bbf7','#db9cbe','#b8d886','#ef947c','#a8c5d1','#c4abe4'];
export const thermalNumber=(v,d=2)=>finite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
export function activeThermalBoundaryIds(run){
 const kind=run?.caseKind||run?.caseDefinition?.kind,model=run?.model;
 // Recorded boundary commands can include inactive fixture and air inputs.
 // Match the solver's case topology rather than interpreting every command
 // as a heat-exchange path. Older artifacts have no topology to inspect.
 if(!model)return [...new Set((run?.frames||[]).flatMap(f=>Object.keys(f.boundariesK||{})))].filter(id=>id!=='air'||['atmospheric-cycling','installed-environment'].includes(kind));
 const active=new Set(),phase=kind==='orbital-transient'?'orbit':'test',add=edge=>{if(edge.boundaryId&&!edge.to)active.add(edge.boundaryId);};
 for(const edge of [...model.conductors||[],...model.radiation||[]])if(!edge.activeIn||edge.activeIn.includes(phase))add(edge);
 if(['atmospheric-cycling','installed-environment'].includes(kind)&&run.caseDefinition?.convectionEnabled===true)for(const edge of model.convection||[])add(edge);
 return [...active];
}
export function thermalTemperaturePlot(run,{limits=null,timeS=0,measured=null}={}){
 const frames=run?.frames||[];if(frames.length<2)return '<p class="te-empty">Run a case to see the boundary and article response over time.</p>';
 const nodes=(run.nodes||[]).filter(n=>frames.some(f=>finite(f.temperaturesK?.[n.id]))).slice(0,8);
 const activeBoundaries=new Set(activeThermalBoundaryIds(run)),boundaryIds=[...new Set(frames.flatMap(f=>Object.keys(f.boundariesK||{})))].filter(id=>activeBoundaries.has(id)).slice(0,3);
 const values=frames.flatMap(f=>[...nodes.map(n=>f.temperaturesK?.[n.id]),...boundaryIds.map(id=>f.boundariesK?.[id])]).filter(finite);
 const bands=[limits?.minK,limits?.maxK].filter(finite);values.push(...bands);
 if(!values.length)return '<p class="te-empty">No finite temperatures were recorded for this result.</p>';
 for(const s of measured?.samples||[])for(const n of nodes)if(finite(s.temperatures?.[n.id]))values.push(s.temperatures[n.id]);
 let low=values.reduce((a,b)=>Math.min(a,b),Infinity),high=values.reduce((a,b)=>Math.max(a,b),-Infinity);const pad=Math.max(4,(high-low)*.09);low=Math.max(0,low-pad);high=Math.max(low+1,high+pad);
 const start=frames[0].timeS,end=frames.at(-1).timeS,span=Math.max(1,end-start),unit=span>=3600?'h':'min',divisor=unit==='h'?3600:60;
 const left=63,right=925,top=18,bottom=256,X=t=>left+(t-start)/span*(right-left),Y=t=>bottom-(t-low)/(high-low)*(bottom-top);
 const path=(key,boundary=false)=>{let connected=false;return frames.map(f=>{const value=boundary?f.boundariesK?.[key]:f.temperaturesK?.[key];if(!finite(value)){connected=false;return '';}const command=(connected?'L':'M')+X(f.timeS).toFixed(2)+' '+Y(value).toFixed(2);connected=true;return command;}).join(' ');};
 let svg='<svg class="te-temperature-svg" viewBox="0 0 950 300" role="img" aria-label="Simulated temperatures and boundary temperatures against elapsed time. Values are also listed in the results table.">';
 if(bands.length===2)svg+='<rect class="te-limit-band" x="'+left+'" y="'+Y(Math.max(...bands))+'" width="'+(right-left)+'" height="'+Math.abs(Y(bands[0])-Y(bands[1]))+'"/>';
 for(let i=0;i<=4;i++){const t=low+(high-low)*i/4,y=Y(t);svg+='<path class="te-chart-grid" d="M'+left+' '+y+'H'+right+'"/><text x="'+(left-9)+'" y="'+(y+4)+'" text-anchor="end">'+thermalNumber(t,1)+'</text>';}
 for(let i=0;i<=4;i++){const t=start+span*i/4;svg+='<text x="'+X(t)+'" y="279" text-anchor="middle">'+thermalNumber((t-start)/divisor,2)+'</text>';}
 svg+='<text x="12" y="16">K</text><text x="493" y="296" text-anchor="middle">Elapsed time / '+unit+'</text>';
 boundaryIds.forEach((id,i)=>{svg+='<path class="te-boundary-line" style="opacity:'+(1-i*.15)+';stroke-dasharray:'+['6 4','2 3','9 3 2 3'][i]+'" d="'+path(id,true)+'"/>';});
 nodes.forEach((n,i)=>{svg+='<path class="te-node-line" style="stroke:'+colors[i%colors.length]+'" d="'+path(n.id)+'"/>';});
 for(const k of bands)svg+='<path class="te-limit-line" d="M'+left+' '+Y(k)+'H'+right+'"/>';
 for(const s of measured?.samples||[]){if(s.timeS<start||s.timeS>end)continue;nodes.forEach((n,i)=>{const v=s.temperatures?.[n.id];if(finite(v))svg+='<circle r="2.8" fill="'+colors[i%colors.length]+'" cx="'+X(s.timeS)+'" cy="'+Y(v)+'"/>';});}
 svg+='<path class="te-cursor-line" d="M'+X(Math.max(start,Math.min(end,timeS)))+' '+top+'V'+bottom+'"/></svg>';
 return '<figure class="te-plot"><figcaption><strong>Article response &amp; imposed boundary</strong><span>Predicted temperatures · kelvin</span></figcaption>'+svg+'<div class="te-chart-key">'+nodes.map((n,i)=>'<span><i style="background:'+colors[i%colors.length]+'"></i>'+esc(n.label||n.id)+'</span>').join('')+boundaryIds.map((id,i)=>'<span><i class="te-dashed-key" style="opacity:'+(1-i*.15)+'"></i>'+esc(id)+' boundary</span>').join('')+(bands.length?'<span><i class="te-band-key"></i>Allocated operating band</span>':'')+(measured?'<span>● Imported measurements</span>':'')+'</div></figure>';
}
export function thermalNetworkDiagram(model){
 const nodes=model?.nodes||[];if(!nodes.length)return '<p class="te-empty">No thermal network has been allocated for this item.</p>';
 const columns=Math.min(3,nodes.length),rows=Math.ceil(nodes.length/columns),width=900,height=rows*130+35,positions=new Map();
 nodes.forEach((n,i)=>positions.set(n.id,{x:25+(i%columns)*(850/columns),y:32+Math.floor(i/columns)*130,w:Math.min(240,800/columns),h:86}));
 let svg='<svg class="te-network-svg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Lumped thermal network. Lines are allocated conductive paths, with conductance in watts per kelvin.">';
 const links=(model.conductors||model.conductionLinks||[]).filter(l=>positions.has(l.from)&&positions.has(l.to));
 for(const link of links){const a=positions.get(link.from),b=positions.get(link.to),x1=a.x+a.w/2,y1=a.y+a.h/2,x2=b.x+b.w/2,y2=b.y+b.h/2;svg+='<path class="te-network-edge" d="M'+x1+' '+y1+'L'+x2+' '+y2+'"/><text class="te-edge-label" x="'+((x1+x2)/2)+'" y="'+((y1+y2)/2-8)+'" text-anchor="middle">'+thermalNumber(link.conductanceWPerK,2)+' W/K</text>';}
 nodes.forEach((n,i)=>{const p=positions.get(n.id),label=String(n.label||n.id);svg+='<g><rect class="te-network-node" x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'" rx="8"/><rect x="'+p.x+'" y="'+p.y+'" width="3" height="'+p.h+'" fill="'+colors[i%colors.length]+'"/><text class="te-network-title" x="'+(p.x+13)+'" y="'+(p.y+25)+'">'+esc(label.length>28?label.slice(0,26)+'…':label)+'</text><text x="'+(p.x+13)+'" y="'+(p.y+46)+'">C = '+thermalNumber(n.capacityJPerK,1)+' J/K</text><text x="'+(p.x+13)+'" y="'+(p.y+65)+'">Q = '+thermalNumber(n.loadW,1)+' W · '+thermalNumber(n.initialK,1)+' K initial</text></g>';});
 return '<figure class="te-network"><figcaption><strong>Conductive node topology</strong><span>'+nodes.length+' resolved nodes · '+links.length+' drawn conductive paths</span></figcaption>'+svg+'</svg><p>Each node is a uniform temperature. Conductive paths between nodes are drawn above; boundary exchange, radiation and active heat transport are listed below. Spatial temperature gradients inside a node are unresolved.</p></figure>';
}
function csvRows(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('The CSV has an unclosed quoted field.');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows;
}
export function parseThermalMeasurements(text,nodeIds){
 if(typeof text!=='string'||text.length>2000000)throw Error('Use a temperature CSV smaller than 2 MB.');
 const rows=csvRows(text.replace(/^\uFEFF/,''));if(rows.length<3)throw Error('Include a header and at least two measurement rows.');if(rows.length>10001)throw Error('Use at most 10,000 measurement rows.');
 const headers=rows.shift().map(x=>x.trim());if(headers[0]!=='time_s')throw Error('The first column must be time_s, in elapsed seconds.');
 const allowed=new Set(nodeIds),seen=new Set(),channels=headers.slice(1).map(h=>{const match=/^(.+)_(K|C)$/.exec(h);if(!match)throw Error('Temperature columns must end in _K or _C: '+h);if(!allowed.has(match[1]))throw Error('No modeled node matches '+match[1]+'. Use the template from this run.');if(seen.has(match[1]))throw Error('Duplicate node '+match[1]);seen.add(match[1]);return {id:match[1],unit:match[2]};});
 if(!channels.length)throw Error('Include at least one temperature channel.');let previous=-Infinity;
 const samples=rows.map((row,i)=>{if(row.length!==headers.length)throw Error('Row '+(i+2)+' has the wrong number of columns.');if(row.some(v=>!v.trim()))throw Error('Row '+(i+2)+' contains an empty measurement.');const t=Number(row[0]);if(!finite(t)||t<0||t<=previous)throw Error('Elapsed times must be finite, nonnegative, and strictly increasing (row '+(i+2)+').');previous=t;const temperatures={};channels.forEach((c,j)=>{const value=Number(row[j+1])+(c.unit==='C'?273.15:0);if(!finite(value)||value<=0||value>5000)throw Error('Invalid absolute temperature in row '+(i+2)+'.');temperatures[c.id]=value;});return {timeS:t,temperatures};});
 return {timeUnit:'s',temperatureUnit:'K',samples,channels:channels.map(c=>c.id)};
}
export function compareThermalMeasurements(run,data){
 const frames=run?.frames||[];if(frames.length<2)throw Error('Run the model before comparing measurements.');const totals=new Map(),residuals=[];let cursor=0,outside=0;
 for(const sample of data.samples||[]){if(sample.timeS<frames[0].timeS||sample.timeS>frames.at(-1).timeS){outside++;continue;}while(cursor<frames.length-1&&frames[cursor+1].timeS<=sample.timeS)cursor++;
  const a=frames[cursor],b=frames[Math.min(cursor+1,frames.length-1)],f=b.timeS>a.timeS?(sample.timeS-a.timeS)/(b.timeS-a.timeS):0;
  for(const [id,measuredK]of Object.entries(sample.temperatures)){const va=a.temperaturesK?.[id],vb=b.temperaturesK?.[id];if(!finite(va)||!finite(vb))throw Error('The selected run has no predicted channel '+id+'.');const predictedK=va+(vb-va)*f,errorK=measuredK-predictedK,t=totals.get(id)||{nodeId:id,sum:0,square:0,maxAbsK:0,sampleCount:0};t.sum+=errorK;t.square+=errorK*errorK;t.maxAbsK=Math.max(t.maxAbsK,Math.abs(errorK));t.sampleCount++;totals.set(id,t);residuals.push({timeS:sample.timeS,nodeId:id,measuredK,predictedK,errorK});}
 }
 const channels=[...totals.values()].map(t=>({nodeId:t.nodeId,biasK:t.sum/t.sampleCount,rmseK:Math.sqrt(t.square/t.sampleCount),maxAbsK:t.maxAbsK,sampleCount:t.sampleCount}));if(!channels.length)throw Error('Measurements and simulation have no overlapping time interval.');
 const count=channels.reduce((s,c)=>s+c.sampleCount,0),sum=[...totals.values()].reduce((s,c)=>s+c.sum,0),square=[...totals.values()].reduce((s,c)=>s+c.square,0);
 return {modelRunId:run.id,biasK:sum/count,rmseK:Math.sqrt(square/count),maxAbsK:Math.max(...channels.map(c=>c.maxAbsK)),sampleCount:count,outsideSamples:outside,channels,residuals,method:'Measured minus linearly interpolated predicted node temperature; no extrapolation and no parameter fitting.',status:'comparison-only'};
}
const csvCell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
export function thermalTraceCSV(run){const nodes=run.nodes||[],boundaries=[...new Set((run.frames||[]).flatMap(f=>Object.keys(f.boundariesK||{})))],headers=['time_s','stage_id',...nodes.map(n=>n.id+'_K'),...boundaries.map(id=>'boundary_'+id+'_K'),'energy_residual_W'];return headers.map(csvCell).join(',')+'\r\n'+(run.frames||[]).map(f=>[f.timeS,f.stageId,...nodes.map(n=>f.temperaturesK?.[n.id]),...boundaries.map(id=>f.boundariesK?.[id]),f.residualW].map(csvCell).join(',')).join('\r\n')+'\r\n';}
export function thermalMeasurementTemplate(run){return ['time_s',...(run.nodes||[]).map(n=>n.id+'_K')].map(csvCell).join(',')+'\r\n';}
