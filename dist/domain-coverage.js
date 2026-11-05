// Crosswalk between the workbench and NASA's space-vehicle work-breakdown guidance.
const coverage=[
 ['Mission CONOPS','Mission operations','Mission objectives, operations, commissioning and the disposal decision.'],
 ['AI Data Center Purpose','Payload requirements','Earth-customer product, acceptance criteria and compute mission.'],
 ['Environment','Natural and induced environments','Orbital flux, atmosphere, magnetic field, heating and mechanical disturbances.'],
 ['Orbit & eclipse','Flight dynamics / navigation','Keplerian propagation, eclipses, targeting, orbit maneuvers and station geometry. Navigation sensor estimation is outside this study.'],
 ['Compute & storage','Payload electronics','Accelerators, hosts, payload memory and bulk storage.'],
 ['Data & delivery','Payload data system / ground segment','Customer data, transmission backlog and delivery deadlines.'],
 ['Communications','Telecommunications','RF and optical terminals, tracking, telemetry and command links, link budgets and ground access.'],
 ['Electrical Power · formerly Battery & Power','Electrical power system','Generation, regulation, storage, distribution and electrical loads. Harness allocations appear in the equipment list.'],
 ['Thermal Control · formerly Thermal','Thermal control system','Heat transport, environmental exchange, operational and survival temperatures.'],
 ['Attitude Determination & Control · formerly Attitude Control','Guidance, navigation and control','Pointing, sensors, articulated surfaces, gyro steering and momentum management. Orbit propagation is in Orbit & eclipse.'],
 ['Propulsion · formerly Propellant','Propulsion system','Propellant storage, pressurization, engine feeds, thrust, impulse and reserves.'],
 ['Mass budget','System mass accounting','Mass allocations and launch, wet and dry totals. Mechanical Design owns their locations.'],
 ['Launch & insertion','System integration and launch operations','Adapter, stowed payload, separation and insertion.'],
 ['Launch vehicle','Launch service / carrier','Launcher performance, fairing accommodation and mission allowance.'],
 ['Mechanical Design','Structures and mechanisms','Component stations and dimensions, mass properties, deployment, load path and atmospheric demise screening. Structural stress, vibration and fracture qualification require separate models.'],
 ['Command & Data Handling','Flight avionics / flight software','Spacecraft computer, commands, onboard housekeeping and storage. Embedded software is represented by these functions.']
];
export function domainCoverage(){
 return '<section class="panel lowerpan" id="domain-coverage"><div class="panelhead"><h2>Spacecraft discipline coverage</h2><span class="arch-stamp">16 DOMAINS</span></div><div class="arch-pad"><p>NASA’s spacecraft breakdown places power, telecommunications, command and data handling, mechanical, thermal, propulsion, guidance and control, harness and flight software within the flight system. The workbench assigns these responsibilities across spacecraft, AI payload and mission views.</p></div><div class="arch-scroll" tabindex="0"><table class="arch-table"><thead><tr><th>Workbench domain</th><th>Engineering discipline</th><th>Coverage</th></tr></thead><tbody>'+coverage.map((r,i)=>'<tr><td><small>'+String(i+1).padStart(2,'0')+'</small>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>').join('')+'</tbody></table></div><div class="arch-pad"><a href="https://standards.nasa.gov/sites/default/files/standards/MSFC/A/0/msfchdbk3684a.pdf" target="_blank" rel="noopener">NASA Marshall WBS Handbook · spacecraft element 06 ↗</a> &nbsp; <a href="https://science.nasa.gov/learn/basics-of-space-flight/chapter11-1/" target="_blank" rel="noopener">NASA Basics of Space Flight · Onboard Systems ↗</a></div></section>';
}
