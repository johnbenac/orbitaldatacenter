# Earth imagery sources and preparation

This bundle contains archival satellite-derived imagery for the Orbital Data Center's globe and orbital horizon. It keeps geography, cloud opacity, nighttime light and water coverage separate so the renderer can calculate illumination and atmosphere. The cloud layer represents an archival global composite, not current weather or conditions on a selected mission date.

**Close orbital views:** this folder preserves the overview globe's existing imagery and supplies global fallbacks. Spacecraft and launch cameras now use the larger regional layers documented in [`../earth-detail/README.md`](../earth-detail/README.md): 81,920-pixel day and night mosaics and a 40,960-pixel cloud field. The overview globe remains unchanged.

All inputs were retrieved and inspected on **2026-11-07**. Exact URLs, source dimensions, SHA-256 checksums, output dimensions and output checksums are recorded in `manifest.json`.

## Source catalogue

| Layer | Primary source | Original resolution | Date / credit |
| --- | --- | --- | --- |
| Day surface | [NASA Blue Marble: Next Generation, base maps](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/) — September 2004 | 21,600 × 10,800 | September 2004 monthly MODIS composite; NASA Earth Observatory / NASA GSFC; Blue Marble data courtesy of Reto Stöckli |
| Clouds | [NASA Blue Marble: Clouds, record 57747](https://visibleearth.nasa.gov/images/57747/blue-marble-clouds), also described in [NASA's Blue Marble article](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/) | 8,192 × 4,096 | Published February 11, 2002; NASA GSFC / Reto Stöckli; enhancements by Robert Simmon; MODIS teams |
| Night lights | [NASA Earth at Night maps](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/) — Black Marble 2016 | 13,500 × 6,750 | 2016 annual composite; NASA Earth Observatory / Suomi NPP VIIRS / Black Marble |
| Geographic water mask | [NASA SVS high-resolution layers, record 4439](https://svs.gsfc.nasa.gov/4439/) — Blue Marble land TIFF alpha | 8,192 × 4,096 | Static land layer published June 23, 2016; NASA GSFC Scientific Visualization Studio / Blue Marble |

### Exact source files

- Day: <https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/september/world.200409.3x21600x10800.jpg>
- Clouds, original NASA URL: <https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif>
- Clouds, actual retrieval of that NASA TIFF: <https://web.archive.org/web/20231230035002id_/https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif>
- Night: <https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg>
- Land alpha: <https://svs.gsfc.nasa.gov/vis/a000000/a004400/a004439/flat_bluemarble_8192x4096.tif>

The original cloud host returned HTTP 503 during preparation. The source TIFF therefore comes from the Internet Archive's **December 30, 2023** capture of the exact NASA file; the [archived NASA record](https://web.archive.org/web/20231212203633/https://visibleearth.nasa.gov/images/57747/blue-marble-clouds) retains its credits and download links. Its native 8K detail was retained. A 2K reduction agrees with the [cloud image still served by NASA](https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images/cloud_combined_2048.jpg) to a grayscale correlation of 0.9991 (small resampling/compression differences). The source combines two days of visible-light observations with a third day of polar thermal-infrared imagery. No empty polar bands, generated clouds or upscaled 2K substitute are included.

## License and attribution

These NASA Earth imagery assets are covered by the [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). NASA imagery and scientific visualization content are generally not subject to copyright in the United States; NASA SVS states that its content is public domain unless otherwise noted. Retain the source credit above and do not imply NASA endorsement. These files contain no NASA insignia, commercial map tiles or third-party imagery identified as separately restricted by their source records.

Suggested display credit: **Imagery: NASA Earth Observatory / NASA GSFC / NASA Scientific Visualization Studio.**

## Asset contract

All maps use **north-up equirectangular** projection, longitude −180° at the left edge, +180° at the right, and Greenwich in the center. Latitude runs +90° at the top to −90° at the bottom.

| Asset | Dimensions | Intended use |
| --- | --- | --- |
| `day-1k.jpg` | 1,024 × 512 | Fast initial surface preview |
| `day-4k.jpg` | 4,096 × 2,048 | Global surface and software-renderer base |
| `day-16k/c{column}-r{row}.jpg` | 32 tiles, each 2,052 × 2,052 | Selected high-resolution surface regions at close orbital distances |
| `clouds-4k.jpg` | 4,096 × 2,048 | Global cloud opacity |
| `clouds-8k.jpg` | 8,192 × 4,096 | Native high-resolution cloud detail for capable devices |
| `night-4k.jpg` | 4,096 × 2,048 | Night-side light emission |
| `ocean-2k.png` | 2,048 × 1,024 | Ocean specular mask |

The 16K surface is an **8 × 4** tile grid with zero-based columns west to east and rows north to south. Each tile has a **2,048-pixel interior and two padding pixels on each side**, making 2,052 pixels. Padding copies neighboring source pixels, wraps at the antimeridian and clamps at the poles. Interior texture coordinates span `2/2052` through `2050/2052`. Only the needed tiles need to be transferred or resident in the GPU.

Day and night images contain sRGB color. Cloud and ocean masks are **linear data**, without sRGB conversion: white cloud pixels are opaque, white ocean pixels are water, and black pixels are transparent cloud or land respectively. The ocean mask comes directly from inverted NASA land-layer alpha, with antialiased coastlines; it is not derived from ocean color. It describes geographic water and is not a dynamic sea-ice map. The renderer may suppress glint over bright snow/ice.

## Rebuilding

Use Python with Pillow and NumPy, keeping downloaded originals outside this repository:

```sh
python scripts/prepare-earth-assets.py --download --source-dir /tmp/odc-earth-sources
```

The script pins all source SHA-256 values before processing. Existing originals can be placed in that directory using the filenames recorded in `manifest.json`; omit `--download` for an offline rebuild. Use `--output` for an alternate destination. Source TIFFs and full-resolution originals are not part of the deployed site.

Processing consists of Lanczos resampling, tiled crops, neighboring-pixel gutters, grayscale cloud conversion, inverse-alpha water extraction and optimized progressive JPEG/PNG encoding. No sharpening, generated detail, geographic recoloring or fabricated weather is added. JPEG color images use no chroma subsampling; clouds are grayscale. Individual byte counts and checksums are in the manifest.
