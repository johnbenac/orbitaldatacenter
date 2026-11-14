# Rendering and verification-environment repair

## Confirmed defects repaired

- Shared software rendering now gives each triangle edge one owner, avoiding double blending along translucent mesh diagonals. The reproduced 20%-opacity pane had 170 seam pixels at 36% opacity before the repair.
- Reflected world transforms preserve front/back face selection. Lines crossing the eye clip to the near plane instead of disappearing. Double-sided and back-facing physical materials use the appropriate normal for lighting.
- Perspective near planes scale with camera-to-focus distance. This retains useful depth precision from small parts to large facilities, while preserving larger existing scene-specific clipping values and the existing orthographic paths.
- Verification settings have outward-facing banana and chamber surfaces, corrected door hinges and swept bounds, perpendicular RF absorbers, and fixture clearances derived from the selected article envelope. Load-frame crossheads, chamber shrouds, shields, accessories, and reference figures no longer intersect the tested article/support cases.
- Only enclosing walls that obscure the selected article fade. Their materials are private, their depth writes are disabled while faded, and their original opaque state is restored when clear. Parts, instruments, stands, and scale references remain solid. Orthographic visibility uses parallel rays, including after stage transforms.
- The same camera and wall-visibility updates run for inspection, capture preview, recording, and post-capture restoration.

## Validation

All of the following passed on the combined working tree:

- `camera-clipping-checks.mjs`: 20 actual fits and 25 gesture cases, extreme ranges, inside-camera cases, main bay/launch paths, and unchanged orthographic behavior.
- `software-raster-artifact-checks.mjs`: translucent edge coverage and tessellation invariance, reflections, near-clipped triangles and lines, and front/back lighting.
- `parts-verification-scenes-checks.mjs`: 516 existing scene/reference cases plus 209 artifact-specific cases across 16 physical settings. Maximum fixture complexity remains 96 draw calls and 5,340 triangles.
- `parts-verification-viewer-checks.mjs` and `parts-viewer-checks.mjs`: setting changes, source transforms, model identity, fit endpoints, fixture motion, detail synchronization, capture/recording overlays, unmodeled records, idle rendering, and disposal.
- `wireframe-rendering-checks.mjs`, `launch-water-depth-checks.mjs`, `earth-rendering-checks.mjs`, and `launch-rendering-checks.mjs`: wireframe clipping/occlusion, no terrain leaks across 474,405 interior water pixels, imagery/texture registration, lighting and launch effects.
- `orbit-lighting-render-checks.mjs`, `orbital-camera-scene-checks.mjs`, and `leader-camera-checks.mjs`: eclipse Auto/Studio equivalence, capture restoration, camera-frame and gesture behavior, and the intentional leader action-menu -> Center interaction.
- Independent cutaway review: 35 projection/transform cases; orthographic pan invariance; private material ownership; exactly-once disposal of 76 materials and 49 geometries.
- `git diff --check`.

Browser inspection exercised integration-bay rotation, pan, zoom and expanded view; launch-pad rotation; Earth-orbit rotation; spacecraft and core views; battery thermal-vacuum and RF settings from multiple angles; orthographic cutaways; export preview with guides hidden; the small optical aperture and banana; a thermal-cycle chamber around the optical housing finish; the primary structure in a load frame; and the fuel vessel in its pressure-test setting.

The lighting regression fixture now supplies the current DOM interface and holds hardware detail constant during pixel comparisons. The leader regression now follows the existing action menu before choosing Center. These are test corrections, not changes to those product interactions.

## Verification limits

The available browser used the Canvas/software rendering fallback. GPU-facing changes received camera-math, geometry, regression and code review, but were not visually exercised across physical GPUs, drivers, or native Firefox/Chrome installations. A small local CPU rendering sample showed approximately 1–4% median timing variation in chamber scenes; this is not an end-user frame-rate benchmark.

The reported attachment could not be recovered as image pixels in this session. These checks confirm the reproduced defects and the exercised workflows; they do not establish that every possible artifact has been eliminated.
