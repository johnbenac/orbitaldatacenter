import assert from 'node:assert/strict';
import {nominalCheckoutDesign} from './verification-fixtures.mjs';
import {sizeDesign} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {groundOffset,renderDisposalView} from './dist/disposal-views.js';
const h=sizeDesign(nominalCheckoutDesign()),sim=createSimulation(h),p=sim.disposal();
assert(p.feasible&&p.impact&&p.footprint?.points.length>4);
const [e,n]=groundOffset(p.target,p.impact);assert(Math.abs(Math.hypot(e,n)-p.targetErrorKm)<1e-5);
const a=p.footprint.bearingDeg*Math.PI/180;
const projected=p.footprint.points.map(q=>groundOffset(p.impact,q));
const major=Math.max(...projected.map(([x,y])=>Math.abs(x*Math.sin(a)+y*Math.cos(a))));
const minor=Math.max(...projected.map(([x,y])=>Math.abs(x*Math.cos(a)-y*Math.sin(a))));
assert(Math.abs(major-p.footprint.semiMajorKm)<1e-4);assert(Math.abs(minor-p.footprint.semiMinorKm)<1e-4);
const report=renderDisposalView(h,sim.at(p.end),p);assert.match(report,/Zoom to the landing ellipse/);assert.match(report,/Commanded target/);assert.match(report,/Surface impact/);assert.doesNotMatch(report,/NaN|undefined/);
const dateline=groundOffset({latDeg:0,lonDeg:179.9},{latDeg:0,lonDeg:-179.9});assert(dateline[0]>21&&dateline[0]<23&&Math.abs(dateline[1])<.01);
const high=sizeDesign({disposalMethod:'graveyard'}),orbit=createSimulation(high),g=orbit.disposal();assert(g.feasible&&g.burns.length===2);
const trace=renderDisposalView(high,orbit.at(g.end),g);assert.match(trace,/Commanded circular/);assert.match(trace,/Final apogee/);assert.doesNotMatch(trace,/NaN|undefined/);
for(const [html,plan]of [[trace,g],[report,p]])for(const match of html.matchAll(/data-disposal-time="([^"]+)"/g)){const t=Number(match[1]);assert(t>=plan.start&&t<=plan.end);}
console.log('Surface projection, dateline, confidence-ellipse semiaxes and true-north bearing, transfer plot and propagated terminal seek times passed.');
