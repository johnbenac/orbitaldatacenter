import {flightButtons} from './flight-transport.js';
import {integrationProfile} from './integration-profiles.js';
import {integrationState,INTEGRATION_TIMES} from './integration-sequence.js';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const times=INTEGRATION_TIMES;
export const hasLoadingDirector=domain=>domain==='launcher'||domain==='launch';
export function loadingEnd(h){
 if(h.input.launcher==='starship'&&!h.fairing.fit)return times[1];
 return h.payloadInterface?.passes===false?times[1]:h.fairing.fit?times[6]:times[2];
}
export function loadingStages(h){
 const p=integrationProfile(h.input.launcher,h.input.launchSite),ship=p.kind==='ship-bay',horizontal=p.kind==='horizontal';
 if(ship)return [
  ['Checkout','Inspect the stowed spacecraft on its stand alongside the complete reusable ship. The flight adapter sits on its retained rail carriage.'],
  ['Unlatch hatch','Open the leeward side hatch below the forward flap roots while the flight article remains on its checkout stand.'],
  ['Extend carriage','Extend the empty adapter and carriage through the open hatch. The crane lifts the spacecraft and lines it up over the outboard berth.'],
  ['Seat and capture','Lower the spacecraft onto the extended adapter. Engage the launch restraints around the aft interface and remove the lifting fixture.'],
  ['Draw cargo inside','The telescoping rails draw the captured spacecraft sideways into the cargo bay. The nose and heat shield stay on the ship.'],
  ['Lock carriage','The carriage reaches its inboard hard stops. The launch locks transfer load to the cargo deck.'],
  ['Latch hatch','Close and latch the retained hatch. The same carriage will extend in orbit to release the spacecraft.']
 ];
 return [
  ['Checkout','The spacecraft stands upright on temporary supports while the team checks the payload and prepares the lift.'],
  ['Pick up','The lifting rig takes the spacecraft’s weight. The crew clears the service connections and guides the spacecraft over its flight adapter.'],
  ['Seat spacecraft','The spacecraft meets the adapter at its aft mounting ring. The next move encloses the stowed payload.'],
  ['Encapsulate','The fairing surrounds the spacecraft and its adapter. They travel together from this point.'],
  [horizontal?'Turn horizontal':'Load transporter',horizontal?'The enclosed assembly turns to line up with the launch vehicle on its horizontal supports.':'The upright enclosed payload is now supported by a transfer carrier.'],
  [horizontal?'Align':'Reach mating station',horizontal?'The payload and receiving stage now share a horizontal axis. The last movement seats the joint.':'The transporter has reached the receiving station. The crane lifts the upright payload above the vehicle, aligns the mating faces and lowers the assembly.'],
  ['Mate to vehicle','The flight hardware now carries the payload through the mission adapter. The lifting rig can release the assembly.']
 ];
}
export function loadingHoldText(h){
 if(h.payloadInterface?.passes===false)return 'Loading holds before pickup. The fixed spacecraft interface fails the mechanical fit check. Inspect the adapter in Phase B.';
 if(h.input.launcher==='starship')return 'Side loading is held at checkout. The installed stack must fit both the internal envelope and the retained hatch and carriage. Inspect the clearances in Phase C.';
 return 'Loading holds before enclosure closure. The stowed spacecraft crosses the selected payload envelope. Inspect the clearance in Phase C.';
}
export function loadingPlayer(h,s,playing){
 const steps=loadingStages(h),end=loadingEnd(h),t=Math.min(s.t,end),step=integrationState(t).step;
 const held=end<times[6]&&t>=end,done=t>=end,labels=steps.map(([name,text],i)=>
  `<button type="button" data-loading-at="${times[i]}" aria-current="${step===i?'step':'false'}" ${times[i]>end?'disabled':''} data-tip="${esc(times[i]>end?loadingHoldText(h):text)}"><i>${i+1}</i><span>${esc(name)}</span></button>`).join('');
 return `<section class="loading-player" aria-label="Payload loading animation"><header><div><small>Payload integration</small><h3>Load ${esc(h.launcherLabel)}</h3></div>
 <div class="flight-transport">${flightButtons(playing,done?'Replay loading':'Play loading',{loading:true,id:'loading-play'})}</div></header>
 <div class="loading-stages" data-choice-group="payload-loading" role="group" aria-label="Loading milestones">${labels}</div>
 <p id="loading-description">${esc(held?loadingHoldText(h):steps[step][1])}</p>
 <label class="loading-seek"><span>Scrub the lift</span><input type="range" id="loading-cursor" min="${times[0]}" max="${end}" step="1" value="${t}" aria-label="Payload integration mission time"><output id="loading-time">${display(t)}</output></label></section>`;
}
function display(t){const sec=Math.round(Math.abs(t));return 'T−'+String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
export function refreshLoadingPlayer(doc,h,s,playing){
 const slider=doc.getElementById('loading-cursor');if(!slider||!slider.isConnected)return;
 const end=loadingEnd(h),t=Math.min(s.t,end),step=integrationState(t).step;
 const fwd=doc.getElementById('loading-play');
 if(fwd){
  const current=playing>0?'Pause payload loading':t>=end?'Replay payload loading':'Play payload loading';
  const rev=fwd.parentElement?.querySelector('[data-loading-play="reverse"]');
  if(rev&&(fwd.getAttribute('aria-label')!==current||rev.getAttribute('aria-pressed')!==String(playing<0))){
   fwd.parentElement.innerHTML=flightButtons(playing,t>=end?'Replay loading':'Play loading',{loading:true,id:'loading-play'});
  }
 }
 if(doc.activeElement!==slider)slider.value=String(t);
 slider.setAttribute('aria-valuetext',display(t)+' before launch');doc.getElementById('loading-time').textContent=display(t);
 const text=t>=end&&end<times[6]?loadingHoldText(h):loadingStages(h)[step][1];
 const description=doc.getElementById('loading-description');if(description.textContent!==text)description.textContent=text;
 doc.querySelectorAll('[data-loading-at]').forEach((b,i)=>{const state=i===step?'step':'false';if(b.getAttribute('aria-current')!==state)b.setAttribute('aria-current',state)});
}
