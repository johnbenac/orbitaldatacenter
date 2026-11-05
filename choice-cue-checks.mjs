import assert from 'node:assert/strict';
import {createChoiceCues} from './dist/choice-cues.js';

const reduced = {matches: false};
globalThis.matchMedia = () => reduced;
let deliver;
globalThis.IntersectionObserver = class {
  constructor(callback) { deliver = callback; }
  observe() {} unobserve() {} disconnect() {}
};
function group(key) {
  const marks = [];
  const buttons = [true, false, false].map(selected => ({
    matches: () => selected, classList: {add: cue => marks.push(cue)}
  }));
  return {dataset: {choiceGroup: key}, isConnected: true, closest: () => null, querySelectorAll: () => buttons, marks};
}
const cues = createChoiceCues();
let groups = [group('chapters'), group('launch-stops')];
const render = workspace => cues.update(workspace, {querySelectorAll: () => groups});
const enter = target => deliver([{target, isIntersecting: true}]);
render('D/launcher');
assert.deepEqual(groups[0].marks, []);
enter(groups[0]);
assert.deepEqual(groups[0].marks, ['cue-selected', 'cue-option', 'cue-option']);
const departed = groups[1];
departed.isConnected = false;
groups = [group('chapters'), group('launch-stops')];
render('D/launcher');
enter(departed);
enter(groups[0]);
assert.deepEqual(departed.marks, []);
assert.deepEqual(groups[0].marks, [], 'clock redraw must not replay the introduction');
enter(groups[1]);
assert.equal(groups[1].marks.length, 3, 'milestones below the fold play when reached');
render('D/compute');
enter(groups[0]);
assert.equal(groups[0].marks.length, 3, 'the next workspace can introduce its controls');
reduced.matches = true;
render('D/data');
enter(groups[0]);
assert.equal(groups[0].marks.length, 3, 'reduced-motion navigation is quiet');
console.log('Choice cues run on first visibility, survive redraws, reset on navigation and respect reduced motion.');
