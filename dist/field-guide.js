// Short definitions are local to the current question. The numerical evidence comes
// from the design, snapshot or paired simulations supplied by the phase renderer.
const terms={
 conops:[['Duty cycle','The fraction of a schedule set aside for compute. Delivered work also depends on power, cooling and the connection to Earth.'],['Service window','The interval during which the customer expects a response or a completed delivery.']],
 purpose:[['Acceptance condition','The test that makes a result useful to the customer, such as a quality threshold and a delivery deadline.'],['Staging','Moving inputs or model weights to the cluster before work begins.']],
 environment:[['Albedo','Sunlight reflected from Earth onto the spacecraft.'],['Earth infrared','Thermal radiation emitted by Earth. It can reach the vehicle during eclipse.']],
 orbit:[['Solar beta angle','The signed angle between the Sun direction and the orbital plane. It helps determine whether the spacecraft passes through shadow.'],['Perigee','The lowest point in the orbit. A lower perigee exposes the vehicle to denser air.']],
 compute:[['Accelerator memory','Fast memory beside the processors. Model weights and the working state for a run must fit the chosen layout.'],['Useful throughput','Work completed per second for the selected model, precision and workload.']],
 data:[['Backlog','Data waiting aboard for transmission. It grows when production outruns delivery.'],['Goodput','The rate of useful data transfer after overhead and link losses.']],
 comm:[['Acquisition','Time spent finding and locking onto the other terminal before useful transfer.'],['Line rate','The physical bit rate of the link. Protocol overhead reduces the portion available to a customer.']],
 power:[['Kilowatts (kW)','Power measures how fast energy is being generated or used at an instant.'],['Kilowatt-hours (kWh)','Energy measures how much can be stored or supplied. A 10 kW load uses 5 kWh in half an hour.']],
 thermal:[['Thermal resistance','The temperature difference required to move a unit of heat flow through a path, often expressed in K/kW.'],['Thermal inertia','Stored heat makes temperature respond over time after power or sunlight changes.']],
 attitude:[['Torque','A turning effect that changes angular momentum. A spacecraft can need torque even while holding its pointing direction.'],['Stored momentum','Angular momentum held by the gyroscopes. A sustained disturbance can fill their available storage.']],
 prop:[['Specific impulse','Impulse delivered per unit propellant weight, conventionally expressed in seconds.'],['Delta-v','The velocity change a maneuver requires or a propulsion system can supply.']],
 mass:[['Dry mass','The mass of the spacecraft hardware before loading consumable propellant.'],['Launched mass','The launch stack includes the fueled spacecraft and the flight adapter allocated to the launch.']],
 launch:[['Keep-in envelope','The region the payload may occupy inside the launcher, with room reserved for movement and tolerances.'],['Insertion','The point where the launch vehicle delivers the spacecraft into its initial orbit.']],
 launcher:[['Bolt circle','The circle through the centers of a set of equally spaced fasteners.'],['Separation plane','The joint that releases the spacecraft after launch. It can sit below a permanently bolted fitting.']],
 mechanical:[['Mass center','The weighted average of all mass positions. A heavy item far from the center can shift the balance of the whole vehicle.'],['Moment of inertia','Resistance to changing rotation about an axis. Both mass and its distance from that axis matter.']],
 avionics:[['Housekeeping','Status readings that tell operators how the spacecraft itself is doing.'],['Command buffer','Storage for spacecraft commands waiting to be sent or executed.']]
};
export const domainTerms=id=>terms[id]||[];
export function referenceLesson(id){
 const notes={
  architecture:['Which parts belong to every mission?','Follow the load from the spacecraft’s aft deck to its launcher. A different mission can resize the computers, wings or batteries while keeping the same spacecraft attachment pattern.', 'See the launcher adapter','launcher','B'],
  equipment:['How do individual parts become a vehicle mass?','Quantity times unit mass gives each equipment allocation. To find the balance point, the mechanical model also needs the location of that mass. Filter a subsystem here, then inspect its contribution in Mechanical Design.', 'Inspect mass properties','mechanical','B'],
  sources:['What is the basis for a number?','A supplier rating belongs to a particular configuration. A workbench assumption sets a value for the study. The launch-vehicle drawings show both cases side by side, including what the provider actually specifies.', 'Inspect interface dimensions','launcher','B'],
  checks:['What does a passing check establish?','A check exercises a particular relationship in the model. For the battery, one test is to follow an operating load into eclipse. The arrays lose direct sunlight and the electrical ledger should account for the energy taken from storage.', 'Explore electrical power','power','E']
 };
 const row=notes[id];if(!row)return null;
 return {question:row[0],explanation:row[1],evidence:[],action:{label:row[2],domain:row[3],phase:row[4]}};
}
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const changeText=(el,value)=>{if(el.textContent!==value)el.textContent=value};
export function paintFieldGuide(doc,note,phase,id,reference){
 const el=k=>doc.getElementById(k),root=el('field-note');
 if(!note){root.hidden=true;return}
 root.hidden=false;
 const stage={A:'Design decision',B:'Inside the subsystem',C:'Interpret the comparison',D:'Launch preparation',E:'At the mission clock',F:'Mission closeout'};
 changeText(el('field-kicker'),reference?'Engineering reference':stage[phase]);
 changeText(el('field-question'),note.question);
 changeText(el('field-explanation'),note.explanation);
 const evidence=(note.evidence||[]).map(f=>`<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('');
 const measures=el('field-evidence');if(measures.dataset.content!==evidence){measures.innerHTML=evidence;measures.dataset.content=evidence}
 measures.hidden=!evidence;
 const action=el('field-follow');action.hidden=!note.action;if(note.action)changeText(action,note.action.label);
 const source=el('field-source');source.hidden=!note.source?.url;if(!source.hidden){source.href=note.source.url;changeText(source,note.source.title+' ↗')}
 const glossary=el('field-glossary'),vocabulary=reference?[]:domainTerms(id);glossary.hidden=!vocabulary.length;
 const glossaryKey=reference||id;
 if(glossary.dataset.domain!==glossaryKey){glossary.dataset.domain=glossaryKey;glossary.open=false;el('field-definitions').innerHTML=vocabulary.map(([term,meaning])=>`<div><dt>${esc(term)}</dt><dd>${esc(meaning)}</dd></div>`).join('')}
}
