# Launch vehicle surface and identity assets

The local files let exported copies render the same carrier markings without
requests to third-party image servers. The application loads only the current
vehicle family's assets. SVG artwork has explicit 2,048-pixel rasterization width;
its paths remain the source artwork. The Relativity SVG viewBox is cropped to the
wordmark bounds. Images and material objects belong to the current launch assembly
and are disposed with it. Browser HTTP caching handles repeated source requests.

## Source artwork

Retrieved 2026-11-07. Marks identify the depicted provider or manufacturer. They
remain the trademarks/artwork of their respective owners; this project does not
claim affiliation, endorsement, or an open-source license for third-party marks.
Placements are an illustrative livery on a configurable PDR study, not the paint
schedule for a particular flight. Concept variants inherit family identity.

| Local file | Source / ownership | Treatment |
| --- | --- | --- |
| `spacex.svg` | SpaceX; [original mark mirrored by Wikimedia Commons](https://commons.wikimedia.org/wiki/File:SpaceX_logo_black.svg), from spacex.com | Original paths; explicit rasterization size. Commons records PD-textlogo; trademark rights remain. |
| `falcon-heavy.svg` | SpaceX, vector by Philip Terry Graham; [Commons source record](https://commons.wikimedia.org/wiki/File:Falcon_Heavy_logo.svg) | Original paths; explicit rasterization size. Commons records PD-textlogo. |
| `blue-origin.svg` | Blue Origin; [official website wordmark](https://d1o72l87sylvqg.cloudfront.net/redstone/logo-blue-origin-optimized.svg) | Original paths; ink tint applied by material. |
| `blue-feather.png` | Blue Origin; [official feather artwork](https://d1o72l87sylvqg.cloudfront.net/blue-origin/logo-feather-blue-square-optimized.png) | Download unchanged. The renderer derives an alpha mask from the white-on-blue mark and crops the empty margin. |
| `relativity.svg` | Relativity Space; [official wordmark](https://www.relativityspace.com/s/Relativity_Logo-02.svg) | Original paths; empty viewBox margin cropped; dark ink material. |
| `ula.png` | United Launch Alliance; [official website mark](https://www.ulalaunch.com/img/ULA_Logo.png) | Unchanged transparent PNG. |
| `vulcan.svg` | United Launch Alliance, vector by Philip Terry Graham; [Commons source record](https://commons.wikimedia.org/wiki/File:Vulcan_logo.svg) | Original paths; explicit rasterization size. Commons records PD-textlogo. |
| `vulcan-wrap.png` | United Launch Alliance; `Vulcanwrap_Booster.png` from [official Vulcan 3D model](https://www.ulalaunch.com/docs/default-source/3d-rocket-models/vulcancentaur.zip?sfvrsn=df4b7944_2), linked on the [downloads page](https://www.ulalaunch.com/explore/downloads) | Unchanged transparent texture; conformed around the parametric core. |
| `arianespace.svg` | Arianespace; inline navigation artwork at [arianespace.com](https://www.arianespace.com/) | Original vector paths extracted from page; dark ink material. |
| `arianegroup.svg` | ArianeGroup; inline navigation artwork at [ariane.group](https://www.ariane.group/en/) | Original vector paths extracted from page; dark ink material. |
| `casc-official.jpg` | China Aerospace Science and Technology Corporation; [official logo explanation](https://english.spacechina.com/n17138/n2357695/index.html) and [image](https://english.spacechina.com/n17138/n2357695/c2376685/part/2460635.jpg) | Unchanged source image. |
| `calt.png` | China Academy of Launch Vehicle Technology; [source record](https://commons.wikimedia.org/wiki/File:LOGO_CALT.png), credited to calt.com | Unchanged transparent source PNG. |

## Surface references

- [Relativity's Terran R architecture illustration](https://images.squarespace-cdn.com/content/59a8fb50d2b8575fad311abb/9c79a002-8e3e-486f-b519-89c69a7d8686/VEHICLE_OVERVIEW_TR_SOHNE_04b_2.png): satin metal body, dark aft diamond motif, provider wordmark.
- [SpaceX Falcon Heavy](https://www.spacex.com/vehicles/falcon-heavy/): white body, composite interstage, recovery hardware and provider identification.
- [SpaceX Starship](https://www.spacex.com/vehicles/starship/): welded stainless-steel skin and ceramic windward tiles. The ODC retained cargo door remains a mission integration assumption.
- [Blue Origin New Glenn](https://www.blueorigin.com/new-glenn): white painted stages, blue identity and darker lower/interstage areas.
- [ArianeGroup on Ariane 6 appearance](https://www.ariane.group/en/news/ariane-6-designed-to-go-far-in-high-style/): white fuselage, ArianeGroup manufacture, Arianespace operation.
- [ULA Vulcan](https://www.ulalaunch.com/rockets/vulcan-centaur): white body and red/gray Vulcan identity. The visual wrap comes from ULA's downloadable model, not a recreated emblem.

## Original generated assets

`scripts/generate-launch-surfaces.py` in the repository reproducibly generates the
five original surface families, flag SVGs and the geometric Terran R motif:

| Family | Albedo | Surface channels | Resolution |
| --- | --- | --- | --- |
| White paint | restrained panel seams, rivets, inspection covers, fine paint grain | R: bump height; G: roughness; B: reserved | 1,024 × 2,048 |
| Satin aluminium | brushed grain, narrow joins | R: bump height; G: roughness; B: reserved | 2,048 × 2,048 |
| Stainless steel | weld rings, longitudinal join offsets, subtle metal grain | R: bump height; G: roughness; B: reserved | 2,048 × 2,048 |
| Ceramic tiles | individual hex tiles and narrow dark gaps | R: tile relief; G: roughness; B: reserved | 1,024 × 2,048 |
| Carbon composite | subtle weave | R: weave relief; G: roughness; B: reserved | 512 × 1,024 |

Albedo uses sRGB and WebP; linear material data uses PNG with no color-space
conversion. Lighting, reflections and shadows are computed by the renderer rather
than painted into these maps. Values are visual estimates; the rendering maps do
not change the engineering model's thermal or optical properties. No mass,
performance, readiness or qualification assumptions are derived from a texture.

Mipmapping, bounded anisotropy, synchronous tiny placeholders and asynchronous
local image decoding are used throughout. Painted markings are conformal meshes,
owned by the actual stage, booster, fairing half or retained cargo crown. They
therefore separate, rotate and move with that component, including during fairing
jettison. The existing ODC mission patch stays on its own retained/jettisonable skin.
