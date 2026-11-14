# Parts verification implementation contract

Date: November 7, 2026. Existing site source is opened and ready. Root owns publication and shared UI/viewer integration. Keep all physics, mass accounting and existing articles intact. No claim that a planned test has been conducted or an item is accepted. All new geometry is an illustrative setting, not a certified facility or test result.

## Data module (verification_plan agent)

Own `dist/part-verification.js` and `docs/parts-verification-research.md`.

Export `verificationSources` registry (id => {title,organization,url,section?,description}), `verificationSettings` registry (id => {id,label,description}), and `partVerification(record,catalog,hardware)`.

Return `{profile,title,summary,level,scope,defaultSetting,settings:[id],activities:[...],analyses:[...],integration:{parentId?,title,prerequisites:[],steps:[],evidence:[]},sources:[id]}`.

Activity: `{id,title,requirement,methods:['test'|'analysis'|'inspection'|'demonstration'],setting,objective,approach,measurements:[],criteria,conditions,article:'flight'|'qualification'|'engineering'|'provider'|'installed',evidence:[],prerequisites:[],status:'planned',sources:[],animation?:'deployment'|'cmg'|'terminals'|'integration'|'fairing'|'service'|'processing'|'mate'|'fixture',chart?:{kind:'sequence'|'thermal-cycle'|'vibration'|'load'|'signal'|'inspection',...}}`.

Analysis: `{id,title,description,kind:'mass'|'thermal'|'power'|'geometry'|'interfaces'|'verification',inputs:[{label,value,unit?,basis}],outputs:[{label,value,unit?,basis}],equation?,limits:[],sources:[],status:'study'|'planned'}`. Use actual record/hardware values where meaningful; do not fabricate solver results. Unknown values remain unallocated. Qualitative explanatory diagrams are fine.

Settings IDs shared with scene builder: `studio`, `installed`, `review`, `vibration`, `thermal-vacuum`, `thermal-cycle`, `acoustic`, `rf-chamber`, `optical-bench`, `load-frame`, `mass-properties`, `pressure-bench`, `electrical-bench`, `clean-inspection`, `deployment`, `fit-check`, `propulsion-stand`, `site-commissioning`. Not every setting belongs on every part; keep menus relevant. Review is a bench / high-bay stand scaled to the item. Bare inventory, internal coating/layer and site civil works need appropriate verification ownership, not an invented standalone shaker test.

Read current GSFC-STD-7000B (official PDF with April 2026 administrative extension) and NASA SE Handbook sections5.2/5.3/6.1/Appendix I. Verify technical claims with primary sources and exact GEVS section anchors. Sources are references for a proposed workbench PDR plan, not imposed universal requirements. Four methods are Test, Analysis, Inspection, Demonstration.

## 3D setting module (verification_scene agent)

Own `dist/part-verification-scenes.js` and optional scene-only validation script. Import existing local Three.js.

Export `createVerificationSetting({kind,size,scaleMode='auto',software=false})`, where size is THREE.Vector3 or [x,y,z] in meters, and kind is a setting ID above. Return `{root,placement:THREE.Vector3,fitBounds:THREE.Box3,background,labels:[{text,position}],references:[{name,sizeM,description}],update(progress),dispose(),stats}`. Root moves selected original part geometry so its minY sits at placement.y and its center x/z at placement.x/z. Therefore build fixtures around a part centered horizontally, with actual supplied dimensions. Do not clone or transform the flight model here. Fit bounds include item, useful nearby reference and relevant rig; exclude room-wide floor bounds.

Use actual meter scale for references (banana0.18m, ruler0.3m, person1.75m, pallet1.2m, shipping container12.192m or equivalent). Select close-sized references automatically, place beside item, never resize a person to fit. Scale modes `auto`,`none`,`banana`,`person`,`ruler`,`container`. Stage size may adapt to modeled item, with room/fixture sizes understood as illustrative.

Build polished restrained test settings with floor, fixture, sensible colors and geometry cues, not generic boxes alone: shaker/table, cutaway TVAC with rail/cart, acoustic chamber, absorber-lined RF chamber, optical bench, load frame/load cells, mass platen, pressure test bay, electrical bench, clean inspection, fit/deployment stand, propulsion stand and civil commissioning. Reuse geometry/materials within stage, bound draw calls and polygons (target <=150 objects and <=15k triangles, lower in software). Software renderer reads meshes/lines and textures, not shadows/sprites. Dimension lines/labels may be returned for root to paint as overlay. No huge textures/assets; deployment budget tight.

## Verification UI module (verification_ui agent)

Own `dist/part-verification-ui.js`, `dist/part-verification.css`, optional UI-only test. Coordinate with data agent; don't edit data or main parts UI.

Export `renderPartVerification(record,catalog,hardware,{activityId,partLink})` -> escaped HTML for a rich PDR verification panel directly below 3D viewer and before the learning article. Import data module. Include product-level V diagram (actual part/parent highlighted), four method explanations, requirement-to-method matrix/activity list, selected activity's setup/prerequisites/criteria/evidence, analyses with meaningful charts/diagrams, and integration/acceptance handoff. Use SVG generated from data, not invented measurement curves or pass badges. Diagram IDs unique and keyboard-accessible controls.

Events root handles via delegation: `data-verification-activity="id"`, `data-part-setting="settingId"`, `data-verification-animation="animationId"`, and existing `data-part-select` links from supplied partLink. Include method filters if useful via data attributes handled inside an exported `bindPartVerification(host,{onActivity,onSetting,onAnimation})` returning cleanup, or ask root to handle. Prefer one cohesive document with overview and activity focus, not a forest of nested disclosure panels. Charts labeled planned/illustrative or study calculations with units, formula and limits. Acceptance is a future evidence/review gate, not a button that claims success.

## Root ownership

Root edits parts-ui.js/css, part-viewer.js, route/persistence/capture integration, catalog metadata only as needed, tests, static size budget, manifest, source helper and publication. Default viewer: `review` (appropriate bench/stand) with auto scale references. Keep `studio` isolated option and `installed` surrounding assembly; migrate saved context=true to installed. Rendering mode Materials/Solid/Wireframe stays separate from setting. Saved part settings and activity survive updates sensibly; reset unsupported settings for new part.
