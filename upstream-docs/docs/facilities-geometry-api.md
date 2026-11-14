# Facility geometry interface

`dist/facility-geometry.js` exports `createFacilityEquipment(asset, options)` and `facilityEquipmentDimensions(asset)`.

Options: `{software:false, cutaway:true, includeReference:true}`. The builder accepts a catalog asset, never an article size. All dimensions are metres. Geometry with `dimensionRole:'working-envelope'` keeps the exact published test/setup volume in cyan and adds fixed, explicitly notional surrounding equipment. `geometry.representation:'wireframe-volume'` retains its original role as a measured extent reference, with notional surrounding equipment; it does not turn chamber interior dimensions into a usable test envelope. Direct-field acoustic volumes receive an open speaker array, not a room. FOCAL6.5 receives a notional cylindrical vacuum housing around its published optical setup box. All other volume-only vacuum systems receive a notional shell and separate thermal liner; temperature systems receive a notional room. These dimensions depend only on the catalog reference volume, never on the selected article. INPE keeps `representation:'wireframe-volume'` and no usable envelope is inferred. Bench heights omitted by the source use a labeled fixed schematic support height, while their `dimensionBounds` has zero Y extent. `includeReference:false` is useful inside the parts viewer, which manages its own scale references.

Return values:

- `root`: `THREE.Group`; `available`: whether public geometry is usable.
- `bounds`: `THREE.Box3` for the fixed equipment including schematic supports.
- `fitBounds`: equipment and optional fixed 1.75 m person; excludes the ground grid.
- `dimensionBounds`: exact published chamber/room/table dimensions and their display datum; tabletop height is zero. `root.userData.publishedDimensions` retains source fields.
- `workingBounds`: published usable envelope only; empty when unpublished.
- `placement`: nominal bottom-center placement datum.
- `getArticlePlacement(sizeM)` returns `{position:Vector3, outside:boolean, reason:string}`. It does not mutate any equipment geometry or declare engineering compatibility. A grossly oversized article moves beside the system; envelope and mass verdicts come from `assessFacilityFit`.
- `labels`: `{text, position:Vector3, type}` entries in root-local coordinates.
- `references`: scale-reference records with bounds.
- `stats`: objects, drawCalls, triangles, materials, geometryType, assetId, dimensionRole, geometryScaleInvariant, notionalContext, notionalContextType, representationNote. The same representation metadata is in `root.userData`; every invented context node is marked `notional:true`, `schematic:true`, `sourcedDimension:false`, and `dimensionRole:'notional-equipment'`.
- `background`, `cameraDirection`, `contentOffset`, `animated`.
- `update(progress)`: optional fixed 3 mm illustrative shaker motion; never a test prescription.
- `updateCamera(camera)`: inspection cutaway surfaces; camera may be perspective or orthographic.
- `setCutaway(boolean)`, `dispose()` (idempotent, owns all returned geometry/materials).

For the atlas, frame `fitBounds`, add `root` once, project labels through the camera, update the camera-dependent cutaway after orbit changes, and call `dispose()` before switching systems. Root owns the atlas viewer/UI; this module does not install another render loop.

`createVerificationSetting` accepts `facilityAsset` and `facilityFit`; the part viewer exposes `setFacility(assetId)` and `getState().facility` with `{assetId,facilityId,name,facilityName,fit,outside,placementNote}`. The selected full asset ID is also `getState().facilityAssetId`. Pass `facilityAssetId` to `setPart` options to select a system, or call `setFacility(null)` to restore automatic selection for that test setting. Explicit choices persist per setting; a new article never changes the selected equipment dimensions. The factory itself also accepts an initial `facilityAssetId`.
