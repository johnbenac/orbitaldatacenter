import {integrationProfile} from './integration-profiles.js';
import {integrationState,INTEGRATION_TIMES} from './integration-sequence.js';
import {icon} from './icons.js';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const times=INTEGRATION_TIMES;
export const hasLoadingDirector=domain=>domain==='launcher'||domain==='launch';
export function loadingEnd(h){
 return h.payloadInterface?.passes===false?times[1]:h.fairing.fit?times[6]:times[2];
}
function stages(h){
 const p=integrationProfile(h.input.launcher,h.input.launchSite),ship=p.kind==='ship-bay',horizontal=p.kind==='horizontal';
 return [
  ['Checkout','The spacecraft stands upright on temporary supports while the team checks the payload and prepares the lift.'],
  ['Pick up','The lifting rig takes the spacecraft’s weight. The crew clears the service connections and guides the spacecraft over its flight adapter.'],
  ['Seat spacecraft','The spacecraft meets the adapter at its aft mounting ring. The next move encloses the stowed payload.'],
  [ship?'Close nose module':'Encapsulate',ship?'The retained forward enclosure now surrounds the payload. Its outer structure will become the nose of the assembled ship.':'The fairing surrounds the spacecraft and its adapter. They travel together from this point.'],
  [horizontal?'Turn horizontal':ship?'Lift clear':'Load transporter',horizontal?'The enclosed assembly turns to line up with the launch vehicle on its horizontal supports.':ship?'The crane raises the complete forward assembly for transfer to the ship.':'The upright enclosed payload is now supported by a transfer carrier.'],
  [ship||horizontal?'Align':'Reach mating station',ship?'The forward section is directly above the ship’s tank section. The flaps and Raptor engine bay identify the receiving vehicle.':horizontal?'The payload and receiving stage now share a horizontal axis. The last movement seats the joint.':'The transporter has reached the receiving station. The crane lifts the upright payload above the vehicle, aligns the mating faces and lowers the assembly.'],
  [ship?'Complete ship':'Mate to vehicle',ship?'The payload’s forward section has joined the tank and engine section. The assembled Starship stands upright on its supports.':'The flight hardware now carries the payload through the mission adapter. The lifting rig can release the assembly.']
 ];
}
function holdText(h){
 if(h.payloadInterface?.passes===false)return 'Loading holds before pickup. The fixed spacecraft interface fails the mechanical fit check. Inspect the adapter in Phase B.';
 return 'Loading holds before enclosure closure. The stowed spacecraft crosses the selected payload envelope. Inspect the clearance in Phase C.';
}
export function loadingPlayer(h,s,playing){
 const steps=stages(h),end=loadingEnd(h),t=Math.min(s.t,end),step=integrationState(t).step;
 const held=end<times[6]&&t>=end,done=t>=end,labels=steps.map(([name,text],i)=>
  `<button type="button" data-loading-at="${times[i]}" aria-current="${step===i?'step':'false'}" ${times[i]>end?'disabled':''} data-tip="${esc(times[i]>end?holdText(h):text)}"><i>${i+1}</i><span>${esc(name)}</span></button>`).join('');
 return `<section class="loading-player" aria-label="Payload loading animation"><header><div><small>Payload integration</small><h3>Load ${esc(h.launcherLabel)}</h3></div>
 <button id="loading-play" type="button" class="btn" data-loading-play aria-label="${playing?'Pause payload loading':done?'Replay payload loading':'Play payload loading'}">${icon(playing?'pause':'play',13)}<span>${playing?'Pause':done?'Replay loading':'Play loading'}</span></button></header>
 <div class="loading-stages" data-choice-group="payload-loading" role="group" aria-label="Loading milestones">${labels}</div>
 <p id="loading-description">${esc(held?holdText(h):steps[step][1])}</p>
 <label class="loading-seek"><span>Scrub the lift</span><input type="range" id="loading-cursor" min="${times[0]}" max="${end}" step="1" value="${t}" aria-label="Payload integration mission time"><output id="loading-time">${display(t)}</output></label></section>`;
}
function display(t){const sec=Math.round(Math.abs(t));return 'T−'+String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
export function refreshLoadingPlayer(doc,h,s,playing){
 const slider=doc.getElementById('loading-cursor');if(!slider||!slider.isConnected)return;
 const end=loadingEnd(h),t=Math.min(s.t,end),step=integrationState(t).step;
 if(doc.activeElement!==slider)slider.value=String(t);
 slider.setAttribute('aria-valuetext',display(t)+' before launch');doc.getElementById('loading-time').textContent=display(t);
 const text=t>=end&&end<times[6]?holdText(h):stages(h)[step][1];
 const description=doc.getElementById('loading-description');if(description.textContent!==text)description.textContent=text;
 doc.querySelectorAll('[data-loading-at]').forEach((b,i)=>{const state=i===step?'step':'false';if(b.getAttribute('aria-current')!==state)b.setAttribute('aria-current',state)});
}
