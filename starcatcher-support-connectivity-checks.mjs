import assert from 'node:assert/strict';
import {inspectStarcatcherSupportConnectivity} from './dist/starcatcher-support-connectivity.js';

const h={architectureFamilyId:'heatlift-study',bodyWidthM:2,bodyHeightM:2,
 bodyLengthM:2,propulsion:{forwardDeckZ:-.7}},roof=1-.048-.0002;
const corridor={id:'contact-fixture',label:'Finite contact fixture',
 fromM:[0,0,0],toM:[0,0,.8],widthM:.1,depthM:.1,normalBody:[0,1,0],
 mounts:[.05,.75].map(z=>({attachmentPointM:[.059,roof,z],
  trayPointM:[.059,-.051,z],attachmentNormalBody:[0,-1,0],
  attachment:'Actual inner roof face'})),
 rungStationsM:[.006,.25,.5,.75,.794],retainerStationsM:[.25,.5,.75]};
const inspect=sections=>inspectStarcatcherSupportConnectivity(h,{},sections);

const ordinary=inspect([corridor]);
assert(ordinary.ok,'Butted rungs, keeper legs and mounted rails must form a connected frame');
assert.equal(ordinary.structuralRoots.length,2);
assert.equal(ordinary.keeperIdsWithoutLoadPath.length,0);

const fragment=structuredClone(corridor);
fragment.railOpeningsM=[{side:-1,fromM:.30,toM:.35,basis:'First physical crossing'},
 {side:-1,fromM:.37,toM:.42,basis:'Second physical crossing'}];
const broken=inspect([fragment]);
assert(!broken.ok);
assert.equal(broken.isolatedRailIds.length,1);
assert.equal(broken.disconnected.length,1);
assert.equal(broken.keeperIdsWithoutLoadPath.length,0,
 'An isolated rail remnant must not falsely detach the connected keeper assembly');
assert(Math.abs(broken.disconnected[0].massKg-.020*.018*.002*2700)<1e-12);
fragment.railOpeningsM=[{side:-1,fromM:.30,toM:.42,
 basis:'Merge the actual crossings across only the disconnected intermediate strip'}];
assert(inspect([fragment]).ok,'Removing the isolated strip must retain every anchored keeper');

const floatingKeeper=structuredClone(corridor);
floatingKeeper.railOpeningsM=[-1,1].map(side=>({side,fromM:.45,toM:.55,
 basis:'Both rear rails are physically absent under the middle keeper'}));
const keeperResult=inspect([floatingKeeper]);
assert(!keeperResult.ok);
assert.equal(keeperResult.keeperIdsWithoutLoadPath.length,3,
 'The floating middle cap and both legs must lack a structural load path');

const unseated=structuredClone(corridor);
for(const mount of unseated.mounts)mount.attachmentPointM[1]-=.001;
const unseatedResult=inspect([unseated]);
assert(!unseatedResult.ok);
assert.equal(unseatedResult.structuralRoots.length,0,
 'A roof label cannot anchor feet separated from the actual roof by 1 mm');
assert.equal(unseatedResult.attachmentIssues.length,2);
assert(unseatedResult.keeperIdsWithoutLoadPath.length>0);

const child={id:'shared-fixture',label:'Shared rail bracket fixture',
 fromM:[.3,-.13,.3],toM:[.3,-.13,.6],widthM:.05,depthM:.04,
 normalBody:[0,1,0],rungStationsM:[.006,.15,.294],retainerStationsM:[.15],
 mounts:[{attachmentPointM:[.059,-.052,.4],trayPointM:[.334,-.151,.4],
  attachmentNormalBody:[0,-1,0],footDimensionsM:[.012,.010,.003],
  attachmentPartId:'starcatcher:raceway:contact-fixture',
  attachment:'Actual lower face of the parent rear rail'}]};
const shared=inspect([corridor,child]);
assert(shared.ok,'The child must connect through its real parent contact to the roof feet');
assert.equal(shared.structuralRoots.length,2,'Shared feet must never become independent roots');
const mislabeled=structuredClone(child);
mislabeled.mounts[0].attachmentPartId='starcatcher:raceway:missing-parent';
assert(inspect([corridor,mislabeled]).attachmentIssues.some(issue=>
 issue.code==='shared-foot-misses-parent-material'));
const unanchoredParent=inspect([unseated,child]);
assert(!unanchoredParent.ok);
assert(unanchoredParent.keeperIdsWithoutLoadPath.some(id=>id.includes('shared-fixture')),
 'A child cannot inherit a load path from an unanchored parent');

console.log('Star Catcher finite support connectivity checks passed');
