# Bundled launch-site geography

These files are actual public geographic observations, packaged locally so the
viewer does not depend on a commercial basemap, API key, or third-party image
request at runtime. They surround the separate, schematic launch-infrastructure
model. They are geographic context for preliminary design, not a site survey,
current construction record, or provider interface drawing.

## Coverage and source detail

All six regional rasters cover approximately 24 × 24 km. Regional display
sampling is 5.86 m/pixel at 4096 × 4096, except Wenchang, which is 11.72 m/pixel at
2048 × 2048. **Display sampling is not native source resolution.** Source dates,
nominal acquisition resolution, exact geographic bounds, requests, and reuse
terms are in each `*-record.json` and in `catalog.js`.

| Region | Actual imagery | Acquisition | Local context |
| --- | --- | --- | --- |
| Cape Canaveral / Kennedy Space Center, Florida | USDA NAIP via USGS National Map; nominal 30 cm source | 2023-01-09 | Five shared or site-specific 4096 px aerial patches, sampled at 0.75–1 m/pixel |
| Starbase / Boca Chica, Texas | USDA NAIP via USGS National Map; nominal 60 cm source | 2022-06-05 to 2022-06-10 | 4096 px aerial patch, sampled at 0.75 m/pixel |
| Pecan Island, Louisiana | USDA NAIP via USGS National Map; nominal 30 cm source | 2023-04-22 | 4096 px aerial patch, sampled at 0.75 m/pixel; the launch position remains a study location |
| Vandenberg, California | USDA NAIP 2012 via California Department of Fish and Wildlife; 1 m source | 2012 | Two 4096 px aerial patches, sampled at 1 m/pixel; historical buildings must not be read as current infrastructure |
| Guiana Space Centre / Kourou, French Guiana | IGN BD ORTHO; nominal 20 cm acquisition, but the public launch-complex image is provider-blurred | 2022-09-26 at the queried center; the regional mosaic may contain other dates | Actual 10 m Sentinel-2 context from 2026-08-10, sampled into a modest 512 px patch; no obscured detail is reconstructed |
| Wenchang, Hainan | Copernicus Sentinel-2 L2A; 10 m source | 2026-04-03 | Regional satellite context only; no submeter aerial detail is claimed |

The acquisition date is taken from the provider's image metadata, rather than
the service update date. The current public NAIP services omit Vandenberg; the
California DFW 2012 service provides actual historical coverage. The public IGN
image at Kourou visibly limits detail around the launch complex. Its nominal
20 cm metadata therefore does not describe the detail visible there. The
public Sentinel crop is clearer context, but still contains only 10 m source
information and small observed clouds over nearby forest.

## Imagery processing

The builder requests data in EPSG:4326 with exact west/south/east/north bounds.
Pixels run west to east and north to south. Server aspect-ratio adjustment is
disabled for ArcGIS exports. Four bounded requests form each 4096 px aerial
image; no geographic features are generated or relocated.

Where aerial coverage stops offshore, actual Copernicus Sentinel-2 images fill
the gap. Different aerial flights can give ocean water very different colors.
The builder uses Sentinel Scene Classification Layer class 6, a sea-connected
flood fill, and a soft shoreline buffer to blend a radiometrically balanced
Sentinel water field into the aerial. This removes rectangular coverage and
exposure seams while preserving the aerial land and nearshore water. Opaque
white IGN no-data is replaced only where the independent Sentinel classification
identifies water. Both data sources receive attribution on the resulting image.

Kourou requires two adjacent Sentinel tiles from the same 2026-08-10 orbit. The
source item records are retained. The displayed offshore colors are processed
for visual continuity; they are not a water-quality measurement. The renderer
may add a separately disclosed presentation water surface and illustrative
vegetation. None of those additions changes the underlying coordinates or
claims to add geographic observations.

Kourou's separate 512 px local Sentinel context has a **300 m edge feather**
into the exact geographic crop of the bundled IGN regional image. The smooth
transition removes the rectangular color boundary between observations. Its
center retains the original 10 m Sentinel observation; no feature is moved or
reconstructed. The local patch credits both sources and records the underlay,
geographic bounds, blend width, and method in `image.edgeBlend`.

The compressed JPEGs use sRGB source color and retain real source texture.
Preview JPEGs are only convenience thumbnails. No AI-generated satellite
imagery, Google imagery, or proprietary basemap tiles are included.

## Elevation and vectors

Each region includes a 257 × 257 grid of actual sampled elevation, approximately
93.75 m between samples. All samples are finite metres, ordered north to south
in row-major order. Grid vertices include the exact bounding edges.

Elevation grids are delivered as single-file `*-elevation.json.zip` archives.
They contain the exact original JSON bytes: no sample, coordinate, decimal
precision, or provenance is rounded or removed. The viewer lazily loads its
existing ZIP decoder before parsing the grid; plain JSON remains supported.
`scripts/package-launch-elevation.py` reproduces the archives, and
`launch-elevation-checks.mjs` verifies their original-byte hashes and values.

US regions use the USGS 3D Elevation Program ImageServer. Its sparse floating
point TIFF format includes empty ocean tiles; the builder explicitly decodes
those as no-data/zero rather than interpreting TIFF headers as elevations.
Kourou and Wenchang use the public Mapzen Terrain Tiles service, whose relevant
source data include USGS SRTM/GMTED and NOAA ETOPO1. Source tile values are decoded
and bilinearly sampled into the geographic grid. Subsea values in that global
source are set to zero for the scene's sea-level surface.

The viewer registers the selected pad's elevation sample to the model grade.
This preserves actual regional relief without moving the selected site pin.
The terrain is sufficient to represent California's coastal hills and Hainan's
ridge; it is not an engineering-grade pad elevation or flood model.

Optional GeoJSON extracts contain only public OpenStreetMap coastlines,
waterways, and geographic landmarks. Geometry is simplified by approximately
2 m. Every retained object has an OSM source link. Raw user identifiers,
changeset information, and unrelated address data are not distributed.

## Attribution and reuse

- **US imagery and 3DEP:** USDA NAIP / USGS, The National Map; U.S. public-domain
  data. [USGS terms](https://www.usgs.gov/faqs/what-are-terms-uselicensing-map-services-and-data-national-map).
- **California historical aerial:** USDA NAIP 2012 / California Department of
  Fish and Wildlife. [CDFW map services](https://wildlife.ca.gov/Data/GIS/Map-Services).
- **IGN aerial:** © IGN · BD ORTHO · Licence Ouverte / Etalab 2.0.
  [Product](https://geoservices.ign.fr/bdortho),
  [license](https://www.etalab.gouv.fr/licence-ouverte-open-licence/),
  [public-image limitations](https://remonterletemps.ign.fr/faq).
- **Sentinel:** Contains modified Copernicus Sentinel data 2026, served by
  Microsoft Planetary Computer.
  [Copernicus terms](https://dataspace.copernicus.eu/terms-and-conditions),
  [dataset](https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a).
- **Global elevation:** Mapzen; USGS SRTM/GMTED; NOAA ETOPO1.
  [AWS registry](https://registry.opendata.aws/terrain-tiles/),
  [source attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).
- **Vectors:** © OpenStreetMap contributors, ODbL 1.0.
  [Copyright and reuse](https://www.openstreetmap.org/copyright).

The manifest retains each source's license and license URL separately. Open
data availability does not imply that the displayed imagery is current or
that every site offers the same resolution.

## Rebuild and verify

From the repository root, with Python 3, Pillow and NumPy installed:

```sh
python tools/build-launch-geography.py
python tools/build-launch-geography.py --only vandenberg
python tools/build-launch-geography.py --detail-only kourou
python tools/build-launch-geography.py --resume
python tools/build-launch-geography.py --catalog-only
node launch-geography-checks.mjs
```

The builder caches public responses outside the repository, bounds concurrency,
and writes completed records incrementally. `--resume` keeps completed region
and local-patch records. The manifest is atomically replaced. Fixed Sentinel
item identifiers make satellite selection reproducible; the current aerial
mosaic services may evolve on a fresh uncached rebuild. Exact requests and
metadata snapshots are retained in the distributed records.

Validation checks all 14 launch positions against the image bounds, real image
dimensions, local asset paths, geographic orientation, finite elevation grids,
distinct regional imagery, real Vandenberg relief, terrain registration,
asynchronous loading/error handling, and disposal behavior. Imagery previews
were also inspected for source gaps, offshore seams and visible detail limits.

Acquired and reviewed: 2026-11-07.
