# Orbital landmarks v5 — editable artwork handoff

The poster is `orbital-data-center-plans-orbit-landmarks-4x5.png`, exactly
2000 × 2500 pixels. `poster.html` is its editable layout. Six 2400 × 1350 scene
masters are in `renders/`; packed, editable Blender scenes are in `scenes/`.

## Composition

The original approved orbital cameras, focal lengths and every spacecraft mesh
transform remain unchanged. Landmarks are placed behind the wings so they can
overlap, filling the frames without zooming out or rotating the spacecraft.
Their geometry is normalized to the labeled physical dimensions and placed in
perspective. These are illustrative compositions, not equal-depth orthographic
scale charts. Physical dimensions are retained in the labels.

Earth retains its original true-radius geometry, photographic materials,
atmosphere, sunlight and NASA starfield. The cloud object is removed. Each
Earth texture is oriented so the corresponding landmark location projects to
screen coordinates (0.5, 0.18), with north pointing upward locally. The backgrounds
show the relevant geographic regions; they do not assert actual mission locations.

| Configuration | Landmark | Earth context |
| --- | --- | --- |
| Redwire 8 kW | Statue of Liberty | New York City |
| Starcloud-3 | Great Pyramid | Giza, Egypt |
| Starmind AI1 | Taj Mahal | Agra, India |
| Orbital-1 / Reflex | Eiffel Tower (2019) | Paris |
| June 2026 reference | Elizabeth Tower / Big Ben | London |
| Star Catcher study | Space Needle | Seattle |

The Space Needle is the downloaded Intentional3D model, not the procedural
placeholder from v4. `assets/needle-printables/` contains all nine original STL files,
creator/source records and license evidence. `source/import-needle.py` assigns
white painted-steel and glazing materials to that geometry. Detail renders and
an independently editable model scene are in `landmarks/`.

The Taj Mahal retains its original detailed geometry and diffuse textures. Its
legacy glTF specular/gloss materials are explicitly converted to lit marble.
The pyramid retains the modeled 203-course exterior from v4.

## Sources and reproduction

`original-scenes/` contains the six approved packed orbital inputs. `original-source/`
contains the frozen v56 workbench modules, original render pipeline, exact raw
mesh/material/input exports and source Earth/sky maps. The source spacecraft are
recipe `odc-study-2026-11-r2`, commit
`ce1096c3669380375ad08748c81b78d83f953dbf`. Starcloud and June radiator clocking
is preserved by retaining all spacecraft transforms.

Use Blender 5.2 and Python 3 with Playwright. Render individual references with
`--ids starmind-ai1`; use `--cpu` or select an OptiX device with `--gpu-name`.

```sh
python3 source/render-all.py --blender /path/to/blender --preview
python3 source/render-all.py --blender /path/to/blender
python3 source/render-poster.py
```

`audits/` records unchanged cameras/craft, geographic projection checks, landmark
dimensions and perspective placement. `MODEL-CREDITS.json`, `ARTWORK-LICENSE.md`
and `POST-TEXT.txt` provide the reuse terms and attribution. This is optional
upstream artwork; no site code was changed or deployed.

## Scale lineup poster (posted to LinkedIn, November 2026)

`orbital-data-center-plans-orbit-landmarks-scale-4x5.png` is v5 with the six cards reordered smallest to
largest landmark (Statue of Liberty, Taj Mahal, Big Ben, Great Pyramid, Space Needle, Eiffel Tower) and a
common-scale lineup of the same six landmarks in the footer, between the call to action and the URL.

- `source/render-scale-strip.py` renders all six landmarks in one orthographic elevation at 4 px per metre,
  on a transparent background, to `renders/landmark-scale-strip.png`. Sizes come from the same labelled
  metres as `render-orbital.py`; `audits/landmark-scale-strip.json` records each landmark's measured size.
  The pyramid is face-on, so its width is the 230.3 m base; its modelled height is 138.8 m. Blender 4.0.2
  was used (no denoiser in that build, hence 384 samples); the script has a fallback for the 4.1+ call in
  `import-needle.py`.
- `source/make-scale-poster-html.py` derives `poster-scale-strip.html` from `poster.html`, reorders the
  cards, enlarges the footer and inserts the lineup. `poster.html` is unchanged.
- `source/render-poster.py` takes `--html` and `--out`; defaults reproduce the original v5 poster.

```sh
blender -b --python source/render-scale-strip.py
python3 source/make-scale-poster-html.py
python3 source/render-poster.py --html poster-scale-strip.html \
    --out orbital-data-center-plans-orbit-landmarks-scale-4x5.png
```

## Not in git

This folder holds the finished posters, the layouts, the render scripts and the six 2400 x 1350 scene
masters. The packed Blender scenes, original scenes and source exports, the landmark model assets
(`assets/`, about 148 MB) and the delivery ZIPs are large and are not committed. They were kept in the
workspace under `work/orbit-landmarks-v5/` and its `-delivery` folder, so re-rendering the scenes or the
strip needs those files restored first.
