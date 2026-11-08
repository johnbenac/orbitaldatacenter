import assert from 'node:assert/strict';
import {canvas} from './render-test-canvas.mjs';
import {acquireDetailMaterials} from './dist/detail-materials.js';

globalThis.document={createElement:()=>canvas()};
const a=acquireDetailMaterials(),b=acquireDetailMaterials();
assert.equal(a.stats().textures,1,'unused hardware finishes must not allocate maps');
assert.equal(a.board,b.board,'PCB closeups share one printed pattern across views');
assert.equal(a.gasket,a.rubber,'seal detail shares its elastomer material');
assert.equal(a.board.userData.materialId,'electronics-board','inspection retains the established material identity');
const resources=[a.board,a.board.map,a.grip,a.grip.map,a.caution,a.caution.map,a.label,a.label.map];
for(const m of [a.board,a.grip,a.caution]){
 assert(m.map.image.width<=256&&m.map.image.height<=256,'inspection texture allocation is bounded');
 const pixels=m.map.image.frame.data,colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add(pixels[i]*65536+pixels[i+1]*256+pixels[i+2]);assert(colors.size>1,'pattern has visible surface variation');
}
const borrowed=a.steel;let borrowedDisposals=0;borrowed.addEventListener('dispose',()=>borrowedDisposals++);
const tag=a.decal('J1 / INPUT'),map=tag.map;assert.equal(tag,b.decal('J1 / INPUT'));
for(let i=0;i<500;i++)a.decal('PART '+i);
assert(a.stats().textures<=35,'navigating many unique components cannot grow the printed map cache indefinitely');
assert.equal(a.decal('J1 / INPUT'),tag,'active labels are never evicted to satisfy a new request');
resources.push(tag,map);const disposed=new Map();for(const resource of resources)resource.addEventListener('dispose',()=>disposed.set(resource,(disposed.get(resource)||0)+1));
a.release();a.release();assert.equal(disposed.size,0,'closing one viewport cannot dispose another viewport’s maps');
b.release();for(const resource of resources)assert.equal(disposed.get(resource),1,'generated resources dispose once after the last owner closes');
assert.equal(borrowedDisposals,0,'the existing physical material library outlives inspection views');
const next=acquireDetailMaterials();assert.notEqual(next.board,resources[0],'reopening creates live detail resources after cleanup');assert.equal(next.steel,borrowed);next.release();
console.log('Inspection materials: shared physical finishes, visible bounded procedural textures, capped printed labels, and multi-viewport lifecycle passed.');
