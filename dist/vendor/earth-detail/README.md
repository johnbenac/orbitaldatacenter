# Earth detail for close spacecraft views

This directory supplies local, regional imagery to the **close observer Earth renderer** used by the spacecraft and ascent cameras. The overview globe continues to use its existing images and materials in `../earth/`. The observer shares those global maps as its fallback and adds independently managed day, night and cloud detail.

The highest delivered grids are **81,920 × 40,960 for day and night** and **40,960 × 20,480 for clouds**. These are tiled datasets: the browser requests the geographic parents needed by the current view, rather than downloading or allocating a whole global image at that size. Cloud detail has explicit source-coverage limits described below; its 40K file grid does not imply new kilometre-scale observations everywhere.

The imagery is archival visual context. Surface season, city lights and clouds come from different observation periods; they do not represent conditions on a selected mission date.

## Datasets and provenance

| Layer | Source and observation period | Original source grid | Interpretation |
| --- | --- | --- | --- |
| Day | [NASA Blue Marble: Next Generation](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/), **September 2004** | Eight 21,600 × 21,600 sectors; 86,400 × 43,200 global | MODIS surface-color composite, nominal 500 m product grid. This is the same month used by the overview surface. |
| Night | [NASA Black Marble maps](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/), **2016 annual composite** | Eight 21,600 × 21,600 grayscale sectors; 86,400 × 43,200 global | Processed light-intensity visualization on a nominal 500 m grid. VIIRS DNB sensor resolution is approximately 750 m; texture sampling does not create finer instrument resolution. |
| Clouds | [NASA Blue Marble: Clouds](https://visibleearth.nasa.gov/images/57747/blue-marble-clouds), archival **2001 imagery / multi-day visual composite**, published in 2002 | Two 21,600 × 21,600 raw hemispheres; 43,200 × 21,600 global, plus the existing 8,192 × 4,096 finished composite | An appearance/coverage mask with genuine finer cloud structure where the raw observations are usable. It is not a retrieved optical-depth field or live weather. |

Exact original URLs, archive retrieval URLs, source checksums, preparation settings, output dimensions and output checksums are recorded in:

- [day-provenance.json](day-provenance.json.zip)
- [night-provenance.json](night-provenance.json.zip)
- [clouds-provenance.json](clouds-provenance.json.zip)

Day credit: **NASA Earth Observatory / NASA Goddard Space Flight Center / Reto Stöckli**. Night credit: **NASA Earth Observatory / NASA GSFC / Suomi NPP VIIRS; Miguel Román and Joshua Stevens**. Cloud credit: **NASA GSFC; Reto Stöckli, Robert Simmon and the MODIS teams**. NASA's [Blue Marble description](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/) explains the visible-light cloud composite and the additional polar infrared imagery in the finished global map.

Inputs were retrieved on **2026-11-07**. The cloud originals were recovered from archived copies of the original NASA files; the archive locations and original-file checksums are retained in the cloud provenance. Preparation does not generate geography, city lights or cloud structure.

These NASA imagery products follow the [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/); NASA imagery is generally not subject to copyright in the United States. Retain the credits and source records, without implying NASA endorsement.

## Parent-file contract

Day and cloud files are named `c{column}-r{row}.avif`; night files remain `c{column}-r{row}.webp`. Column and row indices are zero-based. Every parent contains a **2,048 × 2,048 interior and a four-pixel border on each side**, for a **2,056 × 2,056 encoded image**. Changing the delivery codec did not reduce the geographic grids, parent dimensions or gutters.

| Directory | Global grid | Parent columns × rows | Parent count | Encoded bytes |
| --- | --- | --- | ---: | ---: |
| `day-80k/` | 81,920 × 40,960 | 40 × 20 | 800 | 63,987,572 |
| `day-20k/` | 20,480 × 10,240 | 10 × 5 | 50 | 5,849,172 |
| `night-80k/` | 81,920 × 40,960 | 40 × 20 | 800 | 22,089,720 |
| `night-20k/` | 20,480 × 10,240 | 10 × 5 | 50 | 3,000,928 |
| `clouds-40k/` | 40,960 × 20,480 | 20 × 10 | 200 | 31,709,748 |
| `clouds-20k/` | 20,480 × 10,240 | 10 × 5 | 50 | 8,591,831 |

The complete image collection is **135,228,971 bytes**; this is its stored size, not the initial page payload. Parent files are fetched from this site's `./vendor/earth-detail/` path. NASA and archive downloads occur during preparation.

All maps are north-up equirectangular: longitude −180° at the left, +180° at the right, latitude +90° at the top and −90° at the bottom. Columns advance eastward; rows advance southward. Geographic padding wraps across the antimeridian and clamps at the poles. Interior texture boundaries are `4/2056` and `2052/2056`; padding is outside the geographic interior.

For a grid with `C` columns and `R` rows, parent `(c, r)` covers longitude `−180 + 360c/C` through `−180 + 360(c+1)/C`, and latitude `90 − 180r/R` down to `90 − 180(r+1)/R`.

## Virtual pages and progressive loading

The implementation is in [earth-detail.js](../../earth-detail.js), with observer materials in [earth-appearance.js](../../earth-appearance.js).

The renderer extracts **512 × 512 virtual-page interiors** from decoded parent files. Each virtual page has four gutter pixels on every side, giving a **520-pixel atlas pitch**. At a source's highest level, one parent supplies a 4 × 4 set of virtual pages. The same medium parent can also supply coarser levels through downsampling.

| Virtual level | Global virtual grid | Pages across × down | Layers and source role |
| --- | --- | --- | --- |
| 0 | 5,120 × 2,560 | 10 × 5 | Day, night, clouds |
| 1 | 10,240 × 5,120 | 20 × 10 | Day, night, clouds |
| 2 | 20,480 × 10,240 | 40 × 20 | Day, night, clouds; medium source files |
| 3 | 40,960 × 20,480 | 80 × 40 | Cloud maximum; day/night intermediate level |
| 4 | 81,920 × 40,960 | 160 × 80 | Day and night maximum |

Selection follows the actual Earth-fixed view transform, visible frustum, horizon and projected texel size. Medium parents receive first-paint priority. A resident ancestor continues to cover descendants that have not loaded; missing pages use the existing global map. The cache and atlases have bounded capacity, and device texture capability limits the resident page budget. The default manager allows three concurrent parent requests and retains up to eight decoded parents. It does not require the complete collection to be resident.

CPU and GPU sampling use the same geographic page table and top-down atlas rows. The combined page table has 160 × 80 entries per layer; a fine table cell may refer to a coarser resident page. Disposing the observer releases its detail resources without replacing the overview globe's maps or materials.

## Color and scalar encoding

| Layer | Stored encoding | Sampling rule |
| --- | --- | --- |
| Day | 8-bit SDR sRGB color, AVIF 4:2:0/full range with an embedded sRGB ICC profile | Decode to linear RGB before final bilinear interpolation and lighting. |
| Night | Grayscale **sRGB display intensity**, encoded in WebP RGB | Sample the red channel, decode its sRGB display encoding, then apply the renderer's light tint and exposure. `byte / 255` is not linear physical radiance. |
| Clouds | 8-bit grayscale AVIF 4:0:0/full range; linear appearance/coverage scalar for rendering | Sample the red channel without an sRGB transform. Black is transparent and white is opaque. |

The CPU sampler linearizes the four day/night samples before its final bilinear combination, matching the GPU's sRGB texture sampling. Cloud masks remain linear scalar data. Night imagery supplies light intensity without a blue terrain backdrop; the renderer supplies its displayed emission color. None of these display textures should be used as calibrated radiometric measurements.

## Cloud coverage limits and fallback

The raw cloud hemispheres contain real 1/120-degree structure, approximately **0.928 km per source texel at the equator**. Their filenames identify 2001 day 210, but the imagery is used here as an archival multi-day visual composite, not a simultaneous global observation. Resampling to the delivered 40,960-pixel width yields approximately **0.978 km equatorial texel spacing** where the raw detail is valid.

Those raw hemispheres lack the finished 8K composite's completed poles and repaired longitude joins. The prepared field therefore retains the finished composite's broad cloud coverage and adds only aligned finer structure from the larger observations:

```text
prepared = clamp(polished8K_resampled
               + validity * (raw43K_downsampled - raw43K_lowpass8K_resampled),
                 0, 255)
```

`validity` is the product of two smooth geographic weights:

- **Polar coverage:** full raw-detail weight through latitude ±55°, tapering to zero between absolute latitude 55° and 65°. At and beyond ±65°, the prepared files retain the existing finished 8K cloud field.
- **Longitude joins:** raw-detail weight is zero within 0.25° of longitude 0° or ±180°, and rises smoothly to full weight at 1° from those joins. The finished 8K field supplies these strips.

Consequently, polar caps and the narrow join strips **do not gain new kilometre-scale observations**. They retain the existing broad appearance at the larger file grid. Upsampling that fallback is not counted as new detail. No procedural noise or generated clouds fill the source gaps.

These fallbacks and tapers are prepared into the cloud files. The runtime samples them normally; it does not apply a separate latitude or longitude replacement. The 20K cloud level is a reduction of the same prepared 40K field, preserving broad cloud placement during refinement. Before a detail page is ready, the observer uses its existing global 4K/8K cloud map.

## Reproducing the assets

Use Python with NumPy and Pillow with AVIF encoding support (the delivered bundle used Pillow 13). Keep original downloads and large working rasters outside the repository. Each script writes only its own detail asset family and provenance file:

```sh
python scripts/prepare-earth-day-detail.py \
  --source-dir /tmp/odc-earth-day --download

python scripts/prepare-earth-detail-night.py \
  --source-dir /tmp/odc-earth-night --download

python scripts/prepare-earth-cloud-details.py \
  --source-dir /tmp/odc-earth-clouds \
  --base-source-dir /tmp/odc-earth-base \
  --work-dir /tmp/odc-earth-cloud-work --download
```

All three accept `--output` for a separate destination. Existing source caches support offline preparation without `--download`. Preserve the provenance files alongside the images; they record source and output checksums and the settings used for this bundle. Day maps and high-resolution clouds use AVIF quality 55, speed 6; the 20K cloud preview tier uses quality 45 at the same spatial dimensions. All are encoded directly from their uncompressed prepared fields rather than transcoding earlier WebP files. Night retains WebP quality 92, selecting lossless encoding for sparse tiles when smaller. No image contains HDR or orientation metadata. The source rasters and temporary working mosaics are not deployed with the site.

The provenance JSON files are delivered as single-file ZIP archives. Unzipping restores the exact original UTF-8 bytes.
