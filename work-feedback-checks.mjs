// Task lifecycle checks: actual progress, inert/focus restoration and cancellation.
// This DOM harness does not run the spacecraft model or a browser.
import assert from 'node:assert/strict';
import {createWorkFeedback, yieldToPaint} from './dist/work-feedback.js';

let clock = 0, sequence = 0;
const timers = new Map();
const original = Object.fromEntries(['setTimeout','clearTimeout','setInterval','clearInterval','requestAnimationFrame','cancelAnimationFrame'].map(key => [key, globalThis[key]]));
globalThis.setTimeout = (fn, delay = 0) => { const id = ++sequence; timers.set(id,{fn,at:clock+delay}); return id; };
globalThis.setInterval = (fn, delay) => { const id = ++sequence; timers.set(id,{fn,at:clock+delay,repeat:delay}); return id; };
globalThis.clearTimeout = globalThis.clearInterval = id => timers.delete(id);
function advance(ms) {
  const end = clock + ms;
  for (let count = 0; count < 1000; count++) {
    const due = [...timers.entries()].filter(([,timer]) => timer.at <= end).sort((a,b) => a[1].at-b[1].at || a[0]-b[0])[0];
    if (!due) { clock = end; return; }
    const [id,timer] = due;
    clock = timer.at;
    if (timer.repeat) timer.at += timer.repeat;
    else timers.delete(id);
    timer.fn();
  }
  throw Error('Unexpected timer loop');
}

class Element {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase();this.ownerDocument = doc;this.children = [];this.parentElement = null;
    this.attrs = new Map();this.dataset = {};this.style = {};this.hidden = false;this.listeners = new Map();this._text = '';this.className = '';
    if (['BUTTON','INPUT'].includes(this.tagName)) this.disabled = false;
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      add: name => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean),name])].join(' '); },
      remove: name => { this.className = this.className.split(/\s+/).filter(item => item !== name).join(' '); }
    };
  }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this._text = String(value);for (const child of this.children) child.parentElement = null;this.children = []; }
  get open() { return this.attrs.has('open'); }
  set open(value) { if (value) this.attrs.set('open','');else this.attrs.delete('open'); }
  get isConnected() { return this === this.ownerDocument.body || !!this.parentElement?.isConnected; }
  setAttribute(name, value) {
    this.attrs.set(name,String(value));
    if (name === 'inert' && this.contains(this.ownerDocument.activeElement)) this.ownerDocument.activeElement = this.ownerDocument.body;
  }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  removeAttribute(name) { this.attrs.delete(name); }
  appendChild(child) {
    if (child.parentElement) child.parentElement.children = child.parentElement.children.filter(item => item !== child);
    child.parentElement = this;this.children.push(child);return child;
  }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  matches(selector) {
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    if (selector === 'dialog[open]') return this.tagName === 'DIALOG' && this.open;
    if (selector === '[inert]') return this.attrs.has('inert');
    return this.tagName === selector.toUpperCase();
  }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) ?? null; }
  querySelectorAll(selector) {
    const choices = selector.split(',').map(value => value.trim());
    return this.children.flatMap(child => [...(choices.some(value => child.matches(value)) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  addEventListener(name, fn) { this.listeners.set(name,fn); }
  focus() { if (!this.closest('[inert]')) this.ownerDocument.activeElement = this; }
  showPopover() { this.popoverVisible = true; }
  hidePopover() { this.popoverVisible = false; }
}
function documentFixture() {
  const doc = {defaultView:{},listeners:new Map()};
  doc.createElement = tag => new Element(tag,doc);
  doc.body = doc.createElement('body');doc.activeElement = doc.body;
  doc.getElementById = id => doc.body.querySelector('#'+id);
  doc.querySelectorAll = selector => doc.body.querySelectorAll(selector);
  doc.addEventListener = (type,fn) => doc.listeners.set(type,fn);
  for (const id of ['main','rail','lifecycle']) {const node=doc.createElement('section');node.id=id;doc.body.appendChild(node);}
  const topbar=doc.createElement('header');topbar.className='topbar';doc.body.appendChild(topbar);
  const source=doc.createElement('button');source.textContent='Starship';doc.getElementById('main').appendChild(source);
  return {doc,source};
}

try {
  const {doc,source} = documentFixture();
  const main=doc.getElementById('main'),rail=doc.getElementById('rail');
  main.setAttribute('aria-busy','false');rail.setAttribute('inert','');rail.setAttribute('aria-busy','true');
  source.focus();
  const feedback=createWorkFeedback({document:doc,now:()=>clock});
  const work=feedback.begin({title:'Reviewing Starship',detail:'Comparing this launcher with the installed vehicle.',steps:['Sizing spacecraft','Replaying one day','Preparing review'],source});
  const panel=doc.getElementById('work-status');
  assert.equal(feedback.active,true);assert.equal(feedback.current,work);
  assert.equal(panel.hidden,false);assert.equal(panel.dataset.expanded,'false');
  assert.equal(source.textContent,'Starship');assert.equal(source.disabled,true);assert.equal(source.getAttribute('aria-busy'),'true');
  assert.equal(main.getAttribute('inert'),'');assert.equal(doc.activeElement,doc.body);
  assert.equal(panel.querySelector('.work-measure').hidden,true,'No invented percent while progress is unknown');
  advance(139);assert.equal(panel.dataset.expanded,'false');
  advance(1);assert.equal(panel.dataset.expanded,'true');
  advance(110);assert.match(panel.querySelector('.work-elapsed').textContent,/0\.3 s elapsed/);
  work.stage(1,'Integrating the same 24-hour window.');
  const steps=panel.querySelector('.work-steps').children;
  assert.deepEqual(steps.map(step=>step.dataset.state),['complete','current','waiting']);
  work.progress(1,4,'One of four reported units complete.');
  assert.equal(panel.querySelector('.work-measure-track').getAttribute('aria-valuenow'),'1');
  assert.equal(panel.querySelector('.work-measure-track').getAttribute('aria-valuemax'),'4');
  assert.equal(panel.querySelector('.work-measure-track').children[0].style.transform,'scaleX(0.25)');
  work.finish('Design review ready');
  assert.equal(feedback.active,false);assert.equal(feedback.current,null);
  assert.equal(main.getAttribute('inert'),null);assert.equal(main.getAttribute('aria-busy'),'false');
  assert.equal(rail.getAttribute('inert'),'');assert.equal(rail.getAttribute('aria-busy'),'true');
  assert.equal(source.disabled,false);assert.equal(source.getAttribute('aria-busy'),null);assert.equal(source.classList.contains('is-working'),false);
  assert.equal(doc.activeElement,source);assert.equal(panel.dataset.state,'ready');assert.equal(panel.dataset.expanded,'false');
  assert.throws(()=>{const nested=feedback.begin({title:'Outer'});try{feedback.begin({title:'Duplicate'});}finally{nested.finish();}},/already in progress/);
  console.log('PASS immediate acknowledgement, real stage/count progress and exact workspace restoration');

  const next=feedback.begin({title:'Updating power',expandImmediately:true});
  assert.equal(panel.dataset.expanded,'true');
  work.fail('Stale failure');advance(1500);
  assert.equal(feedback.active,true);assert.equal(panel.hidden,false);assert.equal(panel.querySelector('.work-title').textContent,'Updating power');
  next.fail('<untrusted text>');
  advance(5000);assert.equal(panel.hidden,false);assert.equal(panel.dataset.state,'error');assert.equal(panel.querySelector('.work-detail').textContent,'<untrusted text>');
  assert.equal(main.getAttribute('inert'),null);assert.equal(feedback.active,false);
  feedback.dismiss();assert.equal(panel.hidden,true);
  console.log('PASS stale handles cannot clear a newer task; failures stay visible without retaining locks');

  let aborted=0;
  const cancel=feedback.begin({title:'Reviewing a proposal',source,cancel:()=>aborted++});
  assert.equal(panel.querySelector('.work-status-action').hidden,false);
  cancel.setCancelable(null);assert.equal(panel.querySelector('.work-status-action').hidden,true);assert.equal(cancel.cancel(),false);assert.equal(aborted,0);
  cancel.setCancelable(()=>aborted++);
  const event={key:'Escape',preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true}};
  doc.listeners.get('keydown')(event);
  assert.equal(aborted,1);assert.equal(event.prevented,true);assert.equal(event.stopped,true);assert.equal(feedback.active,false);
  assert.equal(panel.dataset.state,'cancelled');assert.equal(source.disabled,false);assert.equal(main.getAttribute('inert'),null);
  assert.equal(cancel.cancel(),false);cancel.finish('Late result');assert.equal(panel.dataset.state,'cancelled');
  console.log('PASS cancellation is once-only and can be disabled at commit boundaries');

  const dialog=doc.createElement('dialog'),header=doc.createElement('header'),content=doc.createElement('div'),field=doc.createElement('input');
  dialog.open=true;content.appendChild(field);dialog.appendChild(header);dialog.appendChild(content);doc.body.appendChild(dialog);field.focus();
  const modalWork=feedback.begin({title:'Evaluating this field',source:field,cancel:()=>{}});
  assert.equal(panel.parentElement,dialog);assert.equal(dialog.getAttribute('inert'),null);
  assert.equal(header.getAttribute('inert'),'');assert.equal(content.getAttribute('inert'),'');assert.equal(panel.closest('[inert]'),null);
  assert.equal(panel.popoverVisible,true);modalWork.cancel();
  assert.equal(header.getAttribute('inert'),null);assert.equal(content.getAttribute('inert'),null);assert.equal(doc.activeElement,field);
  dialog.open=false;
  const preparing=feedback.begin({title:'Preparing review',source});
  dialog.open=true;const resultButton=doc.createElement('button');content.appendChild(resultButton);resultButton.focus();
  preparing.finish('Review ready');
  assert.equal(doc.activeElement,resultButton,'Result dialog autofocus must win over original source focus');
  assert.equal(panel.hidden,true,'Completed work must not cover result-dialog actions');
  assert.equal(feedback.active,false);assert.equal(main.getAttribute('inert'),null);
  console.log('PASS work in a modal keeps Cancel reachable; result dialogs retain focus and unobstructed actions');

  let frame;
  globalThis.requestAnimationFrame=callback=>{frame=callback;return 9};globalThis.cancelAnimationFrame=()=>{};
  let yielded=false;const painted=yieldToPaint().then(()=>{yielded=true});
  await Promise.resolve();assert.equal(yielded,false);frame();advance(0);await painted;assert.equal(yielded,true);
  globalThis.requestAnimationFrame=()=>10;
  let fallback=false;const background=yieldToPaint().then(()=>{fallback=true});
  advance(80);await background;assert.equal(fallback,true);
  console.log('PASS work yields through a paint opportunity and does not hang in a suspended document');
} finally {
  for (const [key,value] of Object.entries(original)) {
    if (value === undefined) delete globalThis[key];else globalThis[key]=value;
  }
}
