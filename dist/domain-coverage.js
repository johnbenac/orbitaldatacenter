// Crosswalk between the workbench and NASA's space-vehicle work-breakdown guidance.
const coverage=[
 ['Mission CONOPS','Mission operations','Mission objectives, operations, commissioning and the disposal decision.'],
 ['Environment','Natural and induced environments','Orbital flux, atmosphere, magnetic field, heating and mechanical disturbances.'],
 ['Flight Dynamics','Flight dynamics / navigation','Keplerian propagation, seasonal illumination, targeting, maneuvers, station geometry and a controlled GNSS/ground-tracking allocation. The runtime propagates exact state; navigation-error evidence is tracked separately.'],
 ['Payload Operations','Payload requirements & electronics','Earth-customer acceptance, workload execution, accelerators, hosts, payload memory and storage.'],
 ['Data & delivery','Payload data system / ground segment','Customer data, transmission backlog and delivery deadlines.'],
 ['Communications','Telecommunications','RF and optical terminals, tracking, telemetry and command links, link budgets and ground access.'],
 ['Electrical Power','Electrical power system','Selected 120 V reference or 400 V development family; MPPT, rated conversion, storage, protected current paths and routed harness losses. Equipment counts, mass and power follow the same installed architecture.'],
 ['Thermal Control','Thermal control system','Junction, cold plate, liquid transport and radiator temperatures; hydraulic capacity, environmental exchange, heaters and bypass cold control.'],
 ['Attitude Determination & Control','Guidance, navigation and control','Pointing, sensors, articulated surfaces, gyro steering, momentum management and preliminary flexible-body/mechanism bounds. Flight Dynamics owns orbit propagation and navigation.'],
 ['Propulsion · formerly Propellant','Propulsion system','Propellant storage, pressurization, engine feeds, thrust, impulse and reserves.'],
 ['Mass budget','System mass accounting','Mass allocations and launch, wet and dry totals. Mechanical Design owns their locations.'],
 ['Launch & insertion','System integration and launch operations','Adapter, stowed payload, separation and insertion.'],
 ['Launch vehicle','Launch service / carrier','Launcher performance, fairing accommodation and mission allowance.'],
 ['Mechanical Design','Structures and mechanisms','Selected architecture and matched packaging alternatives; component stations, mass properties, deployment, static longeron and flexible-mode bounds. Coupled loads, local stress, vibration and fracture qualification remain evidence gates.'],
 ['Command & Data Handling','Flight avionics','Spacecraft computer, commands, onboard housekeeping and storage.'],
 ['Flight Software','Onboard software and guidance, navigation & control','Mode selection, body reference generation, mechanism tracking, magnetic unloading and maneuver permissives.']
];
export function domainCoverage(){
 return '<section class="panel lowerpan" id="domain-coverage"><div class="panelhead"><h2>Spacecraft discipline coverage</h2><span class="arch-stamp">'+coverage.length+' DOMAINS</span></div><div class="arch-pad"><p>NASA’s spacecraft breakdown places power, telecommunications, command and data handling, mechanical, thermal, propulsion, guidance and control, harness and flight software within the flight system. The workbench assigns these responsibilities across spacecraft, AI payload and mission views.</p></div><div class="arch-scroll" tabindex="0"><table class="arch-table"><thead><tr><th>Workbench domain</th><th>Engineering discipline</th><th>Coverage</th></tr></thead><tbody>'+coverage.map((r,i)=>'<tr><td><small>'+String(i+1).padStart(2,'0')+'</small>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>').join('')+'</tbody></table></div><div class="arch-pad"><a href="https://standards.nasa.gov/sites/default/files/standards/MSFC/A/0/msfchdbk3684a.pdf" target="_blank" rel="noopener">NASA Marshall WBS Handbook · spacecraft element 06 ↗</a> &nbsp; <a href="https://science.nasa.gov/learn/basics-of-space-flight/chapter11-1/" target="_blank" rel="noopener">NASA Basics of Space Flight · Onboard Systems ↗</a></div></section>';
}
