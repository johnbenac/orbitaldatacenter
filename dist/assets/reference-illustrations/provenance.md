# Current design reference carousel — graphics and source kit v2

This replaces the v1 suggestion based on a generic, obsolete v21 spacecraft.
All six images here are generated from the **current v56 reference catalog**,
using recipe revision **odc-study-2026-11-r2**, source mission cases and complete
deployed spacecraft. No legacy live-text starter is used.

## The six references

1. Redwire 8 kW compute node — `redwire-platform` family.
2. Starcloud-3 — `starcloud-inline` family.
3. SpaceX Starmind AI1 — `starmind-cross` family.
4. Orbital-1 / Reflex — September revision, `orbital-reflex` family.
5. Orbital June reference — separate June revision, `orbital-rack` family.
6. Star Catcher self-powered node model — `heatlift-study` family.

Names identify the workbench's reference interpretations, not official vendor
renders, endorsements or photographs of operating spacecraft. Distinct June
and September Orbital revisions remain separate. Full geometry is retained;
large deployed spans naturally make central equipment small in a whole-vehicle
view. Each Blender scene also has an optional body-detail camera for reframing.

## Ready to try

Open `carousel/index.html` after extracting the asset ZIP. It works locally
without a server, build tool, framework, Blender or an external service.

The demo starts on a random reference and automatically advances every eight
seconds after an image finishes loading. Previous/next buttons and arrow keys
browse manually. Play/pause is explicit; manual browsing pauses automatic
cycling. Reduced-motion users start paused. Background tabs and hidden carousels
stop their timers. The next image is preloaded without loading the entire
catalog on startup. The slideshow continues for as long as loading takes.

`carousel/slides.json` holds the image paths and captions. The same list is
embedded into the demo HTML so opening it from a ZIP extraction works without
fetch/module CORS restrictions. When changing a slide, update both copies.

The demo selects 960 px or 1920 px WebP images for the viewport. Images are 16:9 compositions that preserve the entire modeled architecture;
they are contained rather than cropped on narrow screens. Captions and controls
remain outside the illustration, so text is editable and images can be reused.

## Optional upstream integration

This is a suggested component, not a patch to the supplied application. Nothing
has been deployed or sent automatically to the development team.

1. Copy `carousel.css`, `carousel.js`, and `images/` into the application's chosen
   static asset namespace. Update slide paths for that namespace.
2. In `#startup`, replace only the existing `.startup-art` picture with an empty
   container for this component. Keep `#startup-title`, `#startup-message`, its
   status role, retry/open-tab actions, noscript text, and startup/error logic.
3. Call `ReferenceCarousel.mount(container, slides, {interval: 8000})` after its
   classic script loads. The demo shows the exact call. Load with `defer` or
   after the DOM container exists.
   Mount it before the heavy application entry point; do not wait for numerical
   initialization or 3D scene construction to show the first image.
4. On successful app startup or unmount, call the returned controller's
   `destroy()` and release it. Do not let the carousel delay or control loading.
5. The upstream `.startup-art img` CSS targets the old picture; remove or scope
   it for the new container. Keep startup content flexible/scrollable so controls
   and loading text fit on small screens. Do not place duplicate status roles
   in the image caption.
6. Add newly shipped static files to `dist/assets.json` for offline exports.
   Keep only optimized WebP files in the deployment, not Blender scenes or
   source texture banks. The finished PNGs are provided as masters, not startup
   downloads. For a PNG-only deployment, update the slide paths explicitly.

For long loads, the application must keep the main thread responsive: yield
between expensive initialization steps or use its workers. JavaScript timers
and click handlers cannot run while the application blocks that thread. This
component stays independent of the model and renderer, but cannot fix blocking
initialization by itself.

Browsing pictures **does not** choose a reference mission or mutate the active
workbench. Whether selecting a reference should eventually open it is a separate
product decision; this kit intentionally provides loading-time browsing only.

The source export and scene audit are also recorded in `MODEL-PROVENANCE.json`
and `SCENE-VALIDATION.json`.

## Full editable sources

The companion source ZIP contains the same asset/demo files plus:

- `scenes/*.blend`: six compressed Blender 5.2 scenes, with all image textures
  packed. Cameras, spacecraft objects, material nodes, Earth/cloud meshes,
  lighting and sky are independently editable. Render paths are relative.
- `exchange/*.glb`: six spacecraft-only glTF binary exports for use without
  Blender. Earth, photographic staging and camera lights are not part of these.
- `exports/*.json`: exact exported object geometry, normals, UVs, world matrices,
  material slots, material maps, full design inputs, recipe/reference metadata,
  and evidence records for each model. No UUID regeneration is needed to use them.
- `source/render-reference.py`: scene builder and photographic setup. Run with
  Blender 5.2+ as below. `render-all.py` drives all six and saves logs.
- `source/workbench-snapshot/`: immutable module/material snapshot sufficient
  to re-export the exact catalog, including the Three.js dependency and license.
  Material-generation scripts are included alongside the modules.
  It is an export fixture, not a full application distribution. PROVENANCE.json
  records source hashes and production commit
  `ce1096c3669380375ad08748c81b78d83f953dbf`.
- Earth/cloud JPGs, NASA starfield EXR, extracted spacecraft texture PNGs, and
  browser export/optimization scripts. The images are not AI-generated guesses
  at these designs; their mesh geometry comes from the current workbench.

Render one source scene without rebuilding it:

```sh
blender --background scenes/redwire-8kw.blend \
  --python-expr "import bpy; bpy.context.scene.cycles.device='CPU'" --render-frame 1
```

Rebuild all scene files from the exported design JSON and textures:

```sh
python3 source/render-all.py --blender /path/to/blender
```

Add `--cpu` for CPU-only rebuilding, or `--gpu-name` to select a particular OptiX device.
Add `--preview` for quick 960×540 drafts. Full renders use Cycles, 2400×1350,
adaptive sampling up to 160 samples, tiled rendering and CPU image denoising.
The GPU path uses OptiX if available and falls back to CPU otherwise.
Packed scenes can be opened and rendered from Blender's UI with no Python setup.

The complete application source for this export is also available at
https://github.com/johnbenac/orbitaldatacenter/tree/ce1096c3669380375ad08748c81b78d83f953dbf.

To re-export from the immutable snapshot, serve `source/workbench-snapshot/` with
Python's static server, then point `source/export-catalog.py --url` at its
`export-catalog.html` (requires Playwright). The exporter waits for every model's
material maps to load and fails on missing maps. Original meshes and groups are
preserved; annotation glyphs and nonphysical engineering overlays are excluded
from photographic renders. The original source snapshot is unchanged.

## Credits and meaning

Spacecraft geometry, PBR material illustrations, scripts and staging are project
artifacts under the accompanying AGPLv3 license; retained third-party licenses
are included. Workbench material maps are illustrative rather than vendor
qualification evidence. Full reference names, sources and assumptions remain in
the exported metadata.

Earth day/cloud textures: Solar System Scope / INOVE,
https://www.solarsystemscope.com/textures/, Creative Commons Attribution 4.0,
https://creativecommons.org/licenses/by/4.0/. Mapped to a 3D Earth/cloud stage,
color/brightness adjusted and rendered with an atmospheric scattering layer.

Starfield: NASA Scientific Visualization Studio, **Ernie Wright**, Deep Star
Maps 2020, https://svs.gsfc.nasa.gov/4851/. Rotated and exposure-adjusted.

Retain these credits and links with derivative images. The demo displays a credit
line outside the render so the images remain reusable; a different placement
must keep the attribution associated with the artwork. Each stage uses the
reference's modeled source-case altitude, with illustrative lighting/viewpoint.
This is presentation work, not a finding of feasibility or verification.
