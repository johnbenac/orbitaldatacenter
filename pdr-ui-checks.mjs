// Bounded regression of actual app event handlers; no GPU, worker or full audit.
// Run: node pdr-ui-checks.mjs
import assert from 'node:assert/strict';

const started=performance.now(),imp=name=>import(new URL('./dist/'+name,import.meta.url));
const ids=new Map(),listeners=new Map(),frames=new Map();let frameCount=0,workStarts=0;
class Element{
  constructor(id='',tagName='DIV'){
    this.id=id;this.tagName=tagName.toUpperCase();this.innerHTML='';this.dataset={};this.open=false;this.hidden=false;
    this.children=[];this.parentElement=null;this.ownerDocument=globalThis.document;
    this.attributes=new Map();this.handlers=new Map();
    let content='';Object.defineProperty(this,'textContent',{get:()=>content,set:value=>{content=String(value);for(const child of this.children)child.parentElement=null;this.children=[]}});
    const styles=new Map();this.style={setProperty:(key,value)=>styles.set(key,String(value)),getPropertyValue:key=>styles.get(key)??''};
    const classes=new Set();
    this.classList={add(...names){names.forEach(name=>classes.add(name))},remove(...names){names.forEach(name=>classes.delete(name))},
      toggle(name,force){const enabled=force??!classes.has(name);if(enabled)classes.add(name);else classes.delete(name);return enabled},contains:name=>classes.has(name)};
    Object.defineProperty(this,'className',{get:()=>[...classes].join(' '),set:value=>{classes.clear();String(value).split(/\s+/).filter(Boolean).forEach(name=>classes.add(name))}});
    if(['BUTTON','INPUT','SELECT'].includes(this.tagName))this.disabled=false;
  }
  setAttribute(key,value){this.attributes.set(key,String(value));if(this===globalThis.document?.body&&key==='data-work-active'&&String(value)==='true')workStarts++;if(key==='id')this.id=String(value);if(key==='class')String(value).split(/\s+/).forEach(name=>this.classList.add(name));if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value)}
  getAttribute(key){return this.attributes.get(key)??null}
  hasAttribute(key){return this.attributes.has(key)}
  removeAttribute(key){this.attributes.delete(key)}
  matches(selector){
    return selector.split(',').some(part=>{const s=part.trim();
      if(s.startsWith('#'))return this.id===s.slice(1);
      if(s.startsWith('.'))return this.classList.contains(s.slice(1));
      const attrs=[...s.matchAll(/\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]/g)];
      if(attrs.length){const tag=s.replace(/\[[^\]]+\]/g,'');if(tag&&this.tagName!==tag.toUpperCase())return false;return attrs.every(attr=>{const value=attr[1].startsWith('data-')?this.dataset[attr[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:this.getAttribute(attr[1]);return value!=null&&(attr[2]===undefined||String(value)===attr[2])})}
      return this.tagName===s.toUpperCase();
    });
  }
  getBoundingClientRect(){return {width:760,height:390,left:0,right:760,top:0,bottom:390}}
  querySelector(selector){return this.querySelectorAll(selector)[0]??(selector==='[data-sd-sheet]'?null:new Element())}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)])}
  contains(node){return node===this||this.children.some(child=>child.contains(node))}
  focus(){if(globalThis.document)globalThis.document.activeElement=this}
  append(...children){children.forEach(child=>this.appendChild(child))}
  appendChild(child){if(child.parentElement)child.remove();this.children.push(child);child.parentElement=this;child.ownerDocument=this.ownerDocument??globalThis.document;if(child.id)ids.set(child.id,child);return child}
  remove(){if(this.parentElement){const children=this.parentElement.children;children.splice(children.indexOf(this),1);this.parentElement=null}}
  addEventListener(type,handler){const list=this.handlers.get(type)||[];list.push(handler);this.handlers.set(type,list)}
  removeEventListener(type,handler){this.handlers.set(type,(this.handlers.get(type)||[]).filter(fn=>fn!==handler))}
  insertBefore(child){return this.appendChild(child)}before(){}insertAdjacentHTML(){}
  showModal(){this.open=true}
  close(){this.open=false}
  scrollIntoView(){}closest(selector){return this.matches(selector)?this:this.parentElement?.closest(selector)??null}
  click(){const event={target:this,currentTarget:this,preventDefault(){},stopPropagation(){}};for(const handler of this.handlers.get('click')||[])handler(event)}
  getContext(){return null}
  getClientRects(){return []}
  get isConnected(){return this===globalThis.document?.body||!!this.parentElement?.isConnected}
}
globalThis.document={
  body:new Element(),
  getElementById(id){if(!ids.has(id))ids.set(id,new Element(id));return ids.get(id)},
  querySelectorAll(selector){return this.body.querySelectorAll(selector)},querySelector(selector){return this.body.querySelectorAll(selector)[0]??new Element()},createElement(tag){return new Element('',tag)},
  addEventListener(type,handler,capture){listeners.set((capture?'capture:':'')+type,handler)}
};
const backing=new Map();
globalThis.window={localStorage:{getItem:key=>backing.get(key)??null,setItem:(key,value)=>backing.set(key,value)},scrollTo(){},addEventListener(){}};
document.body.ownerDocument=document;document.defaultView=window;document.documentElement=new Element('html','HTML');document.documentElement.ownerDocument=document;
globalThis.matchMedia=()=>({matches:true});
globalThis.requestAnimationFrame=handler=>{frames.set(++frameCount,handler);return frameCount};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
Object.assign(window,{requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval});
globalThis.innerWidth=1280;globalThis.innerHeight=800;
const realTimeout=globalThis.setTimeout;
globalThis.setTimeout=(handler,delay,...args)=>{const timer=realTimeout(handler,delay,...args);if(delay>=2500)timer.unref?.();return timer};
const rawError=console.error;
console.error=(error,...rest)=>{
  if(error?.stack?.includes('scene.js')||error?.stack?.includes('three.module.js'))return;
  rawError(error,...rest);
};
// The worker transport has its own regression. Exercise the supported local
// fallback here so the bounded test uses the real app without browser threads.
globalThis.Worker=undefined;

// Seed the real app through its public share/import format before app.js runs.
const {defaults,sizeDesign}=await imp('design.js');
const {encodeScenario,decodeScenario}=await imp('exports.js');
const fixture={
  schema:'odc-scenario/1',modelVersion:'21.0',
  design:{...defaults,missionYears:.003,solarM2:5,serviceRoute:'relay',relayDownMbps:100},
  view:{phase:'B',domain:'power',solve:'installed',t:7800,start:0,scope:'day',detail:false,preset:'custom'}
};
assert.ok(fixture.design.missionYears*365.25<2,'Fixture must stay below two mission days');
globalThis.location=new URL('https://example.test/#design='+encodeScenario(fixture));
await imp('app.js');

const el=id=>document.getElementById(id);
const fire=async dataset=>{const target=new Element('','BUTTON');target.dataset=dataset;await listeners.get('click')({target})};
const change=async(id,value,dataset={})=>{
  const target=new Element(id);
  Object.assign(target,{value:String(value),valueAsNumber:Number(value),dataset,tagName:typeof value==='number'?'INPUT':'SELECT'});
  await listeners.get('change')({target});
};
const snapshot=async()=>{
  await fire({action:'share'});
  const encoded=el('dialogbody').innerHTML.match(/#design=([A-Za-z0-9_-]+)/)?.[1];
  assert.ok(encoded,'App share action must expose the current scenario');
  await fire({action:'close'});
  return decodeScenario(encoded);
};
const accept=async()=>{
  assert.equal(el('dialogtitle').textContent,'Review design change');
  assert.match(el('dialogbody').innerHTML,/data-action="applyimpact"/);
  await fire({action:'applyimpact'});
};
const checkRow=id=>{
  const row=[...el('pdr-domain-host').innerHTML.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(match=>match[0]).find(row=>row.includes('<small>'+id+'</small>'));
  assert.ok(row,'Rendered assessment must contain '+id);
  return {html:row,status:row.match(/data-status="([^"]+)"/)?.[1]};
};

const initial=await snapshot();
assert.equal(initial.design.missionYears,.003);
assert.deepEqual(initial.design,sizeDesign(fixture.design).input,'Initialization must preserve the installed configuration');
assert.equal(initial.view.solve,'installed');
assert.ok(['meets','shortfall'].includes(checkRow('power-day-soc').status),'Initial selected-day result must be calculated');
assert.ok(['meets','shortfall'].includes(checkRow('power-day-unserved').status),'Initial unserved-energy result must be calculated');

// A proposal acknowledges its input before the first asynchronous yield. The
// real Cancel control must abort it without committing the edited selection;
// overlapping navigation must not change the mission under that calculation.
const launchControl=el('guidelauncher');
Object.assign(launchControl,{tagName:'SELECT',value:'starship',disabled:false});
const cancelledProposal=listeners.get('change')({target:launchControl});
const workStatus=el('work-status');
assert.equal(workStatus.hidden,false,'Activity must appear synchronously with the input event');
assert.equal(workStatus.dataset.state,'working');
assert.equal(launchControl.getAttribute('aria-busy'),'true','The originating control must acknowledge the work');
assert.equal(launchControl.disabled,true,'Duplicate submissions must be prevented during calculation');
assert.equal(el('main').getAttribute('inert'),'','The workspace must stay consistent while a proposal is pending');
const cancelControl=workStatus.querySelector('[data-work-cancel]');
assert.equal(cancelControl.getAttribute('aria-label'),'Cancel calculation');
assert.equal(cancelControl.hidden,false);
await fire({phase:'A'});
cancelControl.click();
await cancelledProposal;
assert.equal(workStatus.dataset.state,'cancelled');
assert.equal(el('dialog').open,false,'Cancelled proposals must not open a delayed review');
assert.equal(launchControl.value,initial.design.launcher,'Cancellation must restore the selected launcher');
assert.equal(launchControl.getAttribute('aria-busy'),null);
assert.equal(launchControl.disabled,false);
assert.equal(el('main').getAttribute('inert'),null,'Cancellation must release the workspace');
const cancelled=await snapshot();
assert.deepEqual(cancelled.design,initial.design,'Cancelled work must retain every installed parameter');
assert.deepEqual(cancelled.designIdentity,initial.designIdentity);
assert.equal(cancelled.view.phase,initial.view.phase,'A duplicate action must not navigate during calculation');

// Applying an explicit proposal commits quantities once, then evaluates them as installed.
await change('phase-solve','solar');
await accept();
const sized=await snapshot();
assert.notEqual(sized.design.solarM2,initial.design.solarM2,'Solar proposal must change the installed area');
assert.equal(sized.view.lastSizingMethod,'solar');
assert.equal(sized.view.solve,'installed','Accepted sizing action must not stay active during later mission edits');
assert.notEqual(sized.designIdentity.vehicleId,initial.designIdentity.vehicleId);
for(const [key,value] of Object.entries(initial.design))if(key!=='solarM2')assert.equal(sized.design[key],value,'Solar proposal retained '+key);

// Dragging a parameter is immediate local feedback: it must not start a
// debounced calculation that could swallow the final change event on release.
// Reuse the orbit edit to verify the final value and installed design invariants.
const altitude=sized.design.altitudeKm+25;
const sliderRow=new Element();sliderRow.classList.add('fieldbox');
const slider=new Element('test-altitude','INPUT'),sliderNumber=new Element('','INPUT');
Object.assign(slider,{type:'range',min:'100',max:'2000',dataset:{param:'altitudeKm'}});slider.setAttribute('type','range');
Object.assign(sliderNumber,{type:'number',dataset:{param:'altitudeKm'}});sliderNumber.setAttribute('type','number');
sliderRow.append(slider,sliderNumber);document.body.appendChild(sliderRow);
const beforeDragStarts=workStarts;
const dragAltitude=value=>{slider.value=String(value);slider.valueAsNumber=value;listeners.get('input')({target:slider});
  assert.equal(sliderNumber.value,String(value),'Dragging must immediately update the paired numeric input');
  assert.equal(slider.style.getPropertyValue('--pct'),100*(value-100)/(2000-100)+'%','Dragging must immediately update the range fill');
  assert.equal(slider.getAttribute('aria-busy'),null,'Dragging must not lock the input');
  assert.equal(el('main').getAttribute('inert'),null,'Dragging must keep the workspace interactive');
};
dragAltitude(sized.design.altitudeKm+10);
await new Promise(resolve=>setTimeout(resolve,220));
assert.equal(workStarts,beforeDragStarts,'A paused drag must not start a background review');
const duringDrag=await snapshot();
assert.deepEqual(duringDrag.design,sized.design,'A drag preview must not change installed parameters');
assert.deepEqual(duringDrag.designIdentity,sized.designIdentity);
dragAltitude(altitude);
const releasedSlider=listeners.get('change')({target:slider});
assert.equal(workStarts,beforeDragStarts+1,'Releasing the slider must start exactly one review');
assert.equal(slider.getAttribute('aria-busy'),'true','The final change must acknowledge its calculation');
await releasedSlider;
assert.equal(workStarts,beforeDragStarts+1,'The final change must not queue a duplicate review');
if(el('dialog').open)await accept();
sliderRow.remove();
const orbited=await snapshot();
assert.equal(orbited.design.altitudeKm,altitude);
assert.equal(orbited.view.solve,'installed');
assert.deepEqual(orbited.designIdentity.installed,sized.designIdentity.installed);
assert.equal(orbited.designIdentity.vehicleId,sized.designIdentity.vehicleId);
assert.notEqual(orbited.designIdentity.missionId,sized.designIdentity.missionId);
for(const [key,value] of Object.entries(sized.design))if(key!=='altitudeKm')assert.equal(orbited.design[key],value,'Mission edit retained '+key);
assert.ok(el('pdr-domain-host').innerHTML.includes(orbited.designIdentity.vehicleId));
assert.ok(el('pdr-domain-host').innerHTML.includes(orbited.designIdentity.missionId));

// Direct event dispatch cannot bypass the four controlled-allowance input locks.
const controlled=['structureMargin','reserveFraction','radialPaddingM','axialPaddingM'];
for(const key of controlled){
  await change('',orbited.design[key]+.123,{param:key});
  assert.equal(el('dialog').open,false,key+' must not open an editable proposal');
}
const locked=await snapshot();
assert.deepEqual(locked.design,orbited.design);
assert.deepEqual(locked.designIdentity,orbited.designIdentity);

// Mission Baseline uses the actual delegated link handler to open a Phase B domain.
await fire({page:'mission'});
assert.equal((await snapshot()).view.reference,'mission');
assert.match(el('subsystem').innerHTML,/data-pdr-open-domain="power"/);
await fire({pdrOpenDomain:'power'});
const linked=await snapshot();
assert.equal(linked.view.phase,'B');assert.equal(linked.view.domain,'power');assert.equal(linked.view.reference,null);
assert.equal(el('pdr-domain-host').hidden,false);
assert.match(el('pdr-domain-host').innerHTML,/data-pdr-domain="power"/);
assert.deepEqual(linked.design,locked.design);

// Import from an editable phase into an unsampled integration view. Day-specific
// results must be unknown for the new simulation, not copied from the old one.
assert.ok(['meets','shortfall'].includes(checkRow('power-day-soc').status));
const imported={...linked,design:{...linked.design,trayCount:linked.design.trayCount+1},
  view:{...linked.view,phase:'D',domain:'power',chapter:'integration',t:-2100,start:0,detail:false,reference:null,solve:'installed'}};
const file=new Blob([JSON.stringify(imported)],{type:'application/json'});
Object.defineProperty(file,'name',{value:'PDR-short-integration.json'});
const fileInput=el('filein');fileInput.files=[file];
await fileInput.onchange({target:fileInput});
await accept();
const restored=await snapshot();
assert.equal(restored.view.phase,'D');assert.equal(restored.view.t,-2100);assert.equal(restored.view.detail,false);
assert.equal(restored.design.trayCount,imported.design.trayCount);
assert.notEqual(restored.designIdentity.vehicleId,linked.designIdentity.vehicleId);
for(const id of ['power-day-soc','power-day-unserved'])assert.equal(checkRow(id).status,'unassessed',id+' must not inherit the previous simulation summary');

console.log(JSON.stringify({status:'passed',seconds:Number(((performance.now()-started)/1000).toFixed(2)),missionYears:restored.design.missionYears,
  solarM2:sized.design.solarM2,vehicleBefore:initial.designIdentity.vehicleId,vehicleAfterSizing:sized.designIdentity.vehicleId,
  missionBefore:sized.designIdentity.missionId,missionAfterOrbit:orbited.designIdentity.missionId,
  controlledInputs:controlled.length,baselineLink:'Phase B / power',prelaunchDayChecks:'unassessed',reviewExecution:'local fallback',
  immediateAcknowledgement:true,cancelledProposal:'design and control retained',duplicateNavigation:'ignored while calculating',
  sliderInput:'local feedback without calculation',sliderRelease:'one review preserves final value and vehicle identity'},null,2));
