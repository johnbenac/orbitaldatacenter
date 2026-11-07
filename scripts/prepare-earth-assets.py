#!/usr/bin/env python3
"""Build the offline Earth imagery bundle from checksum-pinned NASA imagery.

Requires Pillow and NumPy. Raw downloads are cached outside the repository.
Example:
  python scripts/prepare-earth-assets.py --download --source-dir /tmp/odc-earth-sources
"""

from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
Image.MAX_IMAGE_PIXELS = 300_000_000  # Pinned 21,600 × 10,800 NASA source.
RETRIEVED = "2026-11-07"
LICENSE_URL = "https://www.nasa.gov/nasa-brand-center/images-and-media/"
SOURCES = {
    "day": {
        "file": "day-original.jpg",
        "title": "NASA Blue Marble: Next Generation, September 2004, base map",
        "page": "https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/",
        "url": "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/september/world.200409.3x21600x10800.jpg",
        "dimensions": [21600, 10800],
        "sha256": "7cf788e13a3a7b4a926b524f8f71d635c56a18c48ba0bfe35695b05a305db3f3",
        "date": "2004-09",
        "credit": "NASA Earth Observatory / NASA Goddard Space Flight Center; Blue Marble data courtesy of Reto Stöckli",
        "description": "Monthly MODIS surface composite with cloud contamination removed by NASA processing. The base map has no added cloud layer, day/night terminator, atmospheric limb, or city lights.",
    },
    "clouds": {
        "file": "clouds-blue-marble-original.tif",
        "title": "NASA Blue Marble: Clouds",
        "page": "https://visibleearth.nasa.gov/images/57747/blue-marble-clouds",
        "currentPage": "https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/",
        "archivedPage": "https://web.archive.org/web/20231212203633/https://visibleearth.nasa.gov/images/57747/blue-marble-clouds",
        "url": "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif",
        "retrievedFrom": "https://web.archive.org/web/20231230035002id_/https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif",
        "dimensions": [8192, 4096],
        "sha256": "d137775d8966ab8d443fd5126dc6e7ad72072bc1ed50555c5818d221735daf0f",
        "date": "2002-02-11 publication; multi-day archival cloud composite",
        "credit": "NASA Goddard Space Flight Center; cloud imagery by Reto Stöckli; enhancements by Robert Simmon; MODIS teams",
        "description": "Original full-global NASA cloud texture: two days of visible-light imagery plus a third day of thermal-infrared imagery over the poles. This is an archival appearance layer, not live or mission-date weather. The original host returned HTTP 503 during preparation, so the exact NASA TIFF was retrieved from the Internet Archive's 2023-12-30 capture.",
    },
    "night": {
        "file": "night-original.jpg",
        "title": "NASA Black Marble 2016 global night map",
        "page": "https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/",
        "url": "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg",
        "dimensions": [13500, 6750],
        "sha256": "230aac448ae68c358be433dd518888cccb3a85ccf66f7b44326441c324ad6725",
        "date": "2016 annual composite",
        "credit": "NASA Earth Observatory; Suomi NPP VIIRS / Black Marble",
        "description": "Archival composite of nighttime observations. Source includes a subdued surface background as well as illuminated settlements; the renderer controls its night-only emission.",
    },
    "ocean": {
        "file": "land-original.tif",
        "title": "NASA SVS Blue Marble land layer, high-resolution monsoon layers",
        "page": "https://svs.gsfc.nasa.gov/4439/",
        "url": "https://svs.gsfc.nasa.gov/vis/a000000/a004400/a004439/flat_bluemarble_8192x4096.tif",
        "dimensions": [8192, 4096],
        "sha256": "87053cd6e5c3408c3a4c8fcd302538057b98f177e283b66bd0ee8e4bd7a95a51",
        "date": "2016-06-23 publication; static Blue Marble land layer",
        "credit": "NASA Goddard Space Flight Center Scientific Visualization Studio; Blue Marble",
        "description": "Ocean mask is the inverted alpha channel of NASA's RGBA land layer, resampled with Lanczos. No color threshold or invented coastline is used. White denotes water, black denotes land; coastal pixels are antialiased. This is a geographic surface mask, not a dynamic sea-ice product.",
    },
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def source_file(source_dir: Path, source: dict, download: bool) -> Path:
    path = source_dir / source["file"]
    if not path.is_file():
        if not download:
            raise SystemExit(f"Missing {path}; provide the source cache or use --download.")
        source_dir.mkdir(parents=True, exist_ok=True)
        urls = [source["url"]]
        if source.get("retrievedFrom"):
            urls.append(source["retrievedFrom"])
        failures = []
        for url in urls:
            temporary = path.with_suffix(path.suffix + ".part")
            try:
                with urllib.request.urlopen(url, timeout=60) as response, temporary.open("wb") as handle:
                    for block in iter(lambda: response.read(1024 * 1024), b""):
                        handle.write(block)
                if sha256(temporary) != source["sha256"]:
                    raise ValueError("Source SHA-256 does not match the pinned original")
                temporary.replace(path)
                break
            except Exception as error:
                temporary.unlink(missing_ok=True)
                failures.append(f"{url}: {error}")
        else:
            raise SystemExit("Could not retrieve source:\n" + "\n".join(failures))
    if sha256(path) != source["sha256"]:
        raise SystemExit(f"Source checksum mismatch: {path}")
    with Image.open(path) as image:
        if list(image.size) != source["dimensions"]:
            raise SystemExit(f"Source dimensions mismatch: {path}")
    return path


def save_jpeg(image: Image.Image, path: Path, quality: int) -> None:
    image.save(path, quality=quality, subsampling=0, optimize=True, progressive=True)


def build(source_dir: Path, output: Path, download: bool) -> None:
    raw = {key: source_file(source_dir, source, download) for key, source in SOURCES.items()}
    (output / "day-16k").mkdir(parents=True, exist_ok=True)

    with Image.open(raw["day"]) as original:
        save_jpeg(original.resize((4096, 2048), Image.Resampling.LANCZOS), output / "day-4k.jpg", 94)
        day = original.resize((16384, 8192), Image.Resampling.LANCZOS)
    # Match the fast preview to the already-compressed base map's appearance.
    with Image.open(output / "day-4k.jpg") as base:
        save_jpeg(base.resize((1024, 512), Image.Resampling.LANCZOS), output / "day-1k.jpg", 90)

    for row in range(4):
        y = np.clip(np.arange(row * 2048 - 2, (row + 1) * 2048 + 2), 0, 8191)
        band = np.asarray(day.crop((0, int(y.min()), 16384, int(y.max()) + 1)))
        for column in range(8):
            x = np.mod(np.arange(column * 2048 - 2, (column + 1) * 2048 + 2), 16384)
            tile = band[(y - y.min())[:, None], x[None, :]]
            save_jpeg(Image.fromarray(tile), output / "day-16k" / f"c{column}-r{row}.jpg", 93)
        print(f"Prepared day tile row {row + 1}/4", flush=True)
    day.close()

    with Image.open(raw["clouds"]) as original:
        clouds = original.convert("L")
        save_jpeg(clouds, output / "clouds-8k.jpg", 90)
        save_jpeg(clouds.resize((4096, 2048), Image.Resampling.LANCZOS), output / "clouds-4k.jpg", 90)
    with Image.open(raw["night"]) as original:
        save_jpeg(original.resize((4096, 2048), Image.Resampling.LANCZOS), output / "night-4k.jpg", 94)
    with Image.open(raw["ocean"]) as original:
        ImageOps.invert(original.getchannel("A")).resize((2048, 1024), Image.Resampling.LANCZOS).save(
            output / "ocean-2k.png", optimize=True
        )

    write_manifest(output)


def write_manifest(output: Path) -> None:
    files = []
    for path in sorted(output.rglob("*")):
        if path.suffix.lower() not in (".jpg", ".png"):
            continue
        relative = path.relative_to(output).as_posix()
        source = "day" if relative.startswith("day") else relative.split("-")[0]
        with Image.open(path) as image:
            files.append({
                "path": relative,
                "width": image.width,
                "height": image.height,
                "mode": image.mode,
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
                "source": source,
                "colorSpace": "linear-data" if source in ("clouds", "ocean") else "sRGB",
            })
    manifest = {
        "schemaVersion": 1,
        "title": "Orbital Data Center — archival NASA Earth imagery",
        "retrieved": RETRIEVED,
        "projection": {
            "type": "equirectangular",
            "longitudeDegrees": [-180, 180],
            "latitudeDegreesTopToBottom": [90, -90],
            "origin": "northwest",
            "columns": "west to east",
            "rows": "north to south",
        },
        "license": {
            "name": "NASA media usage guidelines; US Government imagery generally not subject to US copyright",
            "url": LICENSE_URL,
            "svsPolicy": "https://svs.gsfc.nasa.gov/",
            "credit": "Imagery: NASA Earth Observatory / NASA GSFC / NASA Scientific Visualization Studio",
            "note": "NASA imagery is credited without implying NASA endorsement. No third-party commercial map imagery is included.",
        },
        "usage": "Archival visual context, not live weather or a mission-date surface/illumination observation. Surface, cloud, city-light and geographic-water layers are separate; lighting is calculated by the renderer.",
        "sources": SOURCES,
        "layers": {
            "dayPreview": "day-1k.jpg",
            "dayBase": "day-4k.jpg",
            "dayDetail": {
                "pathPattern": "day-16k/c{column}-r{row}.jpg",
                "globalWidth": 16384,
                "globalHeight": 8192,
                "columns": 8,
                "rows": 4,
                "interiorPixels": 2048,
                "borderPixels": 2,
                "fileWidth": 2052,
                "fileHeight": 2052,
                "borderRule": "Horizontal wrap across antimeridian; vertical clamp at poles",
                "interiorUvRange": [2 / 2052, 2050 / 2052],
            },
            "cloudsBase": "clouds-4k.jpg",
            "cloudsDetail": "clouds-8k.jpg",
            "cloudsInterpretation": "Linear data: black transparent, white opaque; archived multi-day cloud composite with global polar coverage",
            "night": "night-4k.jpg",
            "ocean": "ocean-2k.png",
            "oceanInterpretation": "Linear data: black land, white water; antialiased geographic coastline, not sea-ice state",
        },
        "preparation": {
            "script": "scripts/prepare-earth-assets.py",
            "resampling": "Lanczos",
            "dayJpegQuality": 93,
            "dayBaseAndNightJpegQuality": 94,
            "previewAndCloudJpegQuality": 90,
            "chromaSubsampling": "4:4:4 (none); cloud maps are grayscale",
            "processing": "Resize, crop, pad, grayscale cloud conversion and land-alpha inversion only; no generated detail, sharpening, recoloring or cloud fabrication",
        },
        "totalImageBytes": sum(item["bytes"] for item in files),
        "files": files,
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Prepared {len(files)} images: {manifest['totalImageBytes']:,} bytes", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=Path(tempfile.gettempdir()) / "odc-earth-sources")
    parser.add_argument("--output", type=Path, default=ROOT / "dist" / "vendor" / "earth")
    parser.add_argument("--download", action="store_true", help="Download missing checksum-pinned originals")
    parser.add_argument("--manifest-only", action="store_true", help="Refresh metadata from already-prepared images")
    args = parser.parse_args()
    if args.manifest_only:
        write_manifest(args.output)
    else:
        build(args.source_dir, args.output, args.download)


if __name__ == "__main__":
    main()
