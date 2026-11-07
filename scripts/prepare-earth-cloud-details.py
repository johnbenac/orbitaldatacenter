#!/usr/bin/env python3
"""Prepare genuine kilometre-scale NASA cloud detail without changing the globe.

Requires Pillow with AVIF support and NumPy. Source downloads and working
rasters stay outside the repository. The raw 2001 NASA cloud hemispheres contain real 1/120-degree detail,
but lack the polished 8K composite's polar fill and seam repair. We retain that
composite's broad coverage and add only the aligned raw image's high frequencies.
No procedural texture, AI image generation, or nominal-resolution upscaling is
used to create detail. The polar caps deliberately retain the original fallback.

Example:
  python scripts/prepare-earth-cloud-details.py \
    --source-dir /tmp/cloud-originals --base-source-dir /tmp/earth-originals \
    --work-dir /tmp/cloud-work --download
"""

from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
Image.MAX_IMAGE_PIXELS = 1_000_000_000  # Checksum-pinned NASA hemisphere rasters.
WIDTH, HEIGHT = 40960, 20480
INTERIOR, GUTTER = 2048, 4
QUALITIES = {"clouds-40k": 55, "clouds-20k": 45}
ENCODING = {
    "format": "AVIF", "qualityByLayer": QUALITIES, "speed": 6, "maxThreads": 2,
    "bitDepth": 8, "subsampling": "4:0:0", "range": "full",
    "colorPrimaries": "BT.709", "transfer": "sRGB IEC 61966-2-1",
    "interpretation": "Decoded grayscale code values remain linear coverage data; the renderer does not apply an sRGB-to-linear transform to this mask.",
}
RAW_SOURCES = {
    "west": {
        "file": "cloud.W.2001210.21600x21600.png",
        "url": "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud.W.2001210.21600x21600.png",
        "retrievedFrom": "https://web.archive.org/web/20140709060446id_/http://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud.W.2001210.21600x21600.png",
        "sha256": "d7a6b03bb54b8ba56f72af6d1d49f191a25c12e911c43739c900e893d10eb814",
        "dimensions": [21600, 21600],
        "longitudeDegrees": [-180, 0],
    },
    "east": {
        "file": "cloud.E.2001210.21600x21600.png",
        "url": "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud.E.2001210.21600x21600.png",
        "retrievedFrom": "https://web.archive.org/web/20140709062822id_/http://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud.E.2001210.21600x21600.png",
        "sha256": "11eb1aaf8e6056b9aebc0de4894dc5ad8a21cbe8738c6ddc92e88701eb7e1b99",
        "dimensions": [21600, 21600],
        "longitudeDegrees": [0, 180],
    },
}
BASE_SOURCE = {
    "file": "clouds-blue-marble-original.tif",
    "url": "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif",
    "retrievedFrom": "https://web.archive.org/web/20231230035002id_/https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif",
    "sha256": "d137775d8966ab8d443fd5126dc6e7ad72072bc1ed50555c5818d221735daf0f",
    "dimensions": [8192, 4096],
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1048576), b""):
            h.update(block)
    return h.hexdigest()


def source_file(directory: Path, source: dict, download: bool) -> Path:
    path = directory / source["file"]
    if not path.exists():
        if not download:
            raise SystemExit(f"Missing {path}; provide the source cache or --download.")
        directory.mkdir(parents=True, exist_ok=True)
        failures = []
        for url in [source["url"], source["retrievedFrom"]]:
            temporary = path.with_suffix(path.suffix + ".part")
            try:
                request = urllib.request.Request(url, headers={
                    "User-Agent": "Orbital-Data-Center-imagery-preparation/1.0",
                    "Range": "bytes=0-",
                })
                with urllib.request.urlopen(request, timeout=60) as response, temporary.open("wb") as target:
                    for block in iter(lambda: response.read(1048576), b""):
                        target.write(block)
                if sha256(temporary) != source["sha256"]:
                    raise ValueError("Downloaded bytes do not match the NASA source checksum")
                temporary.replace(path)
                break
            except Exception as error:
                temporary.unlink(missing_ok=True)
                failures.append(f"{url}: {error}")
        else:
            raise SystemExit("Source download failed:\n" + "\n".join(failures))
    if sha256(path) != source["sha256"]:
        raise SystemExit(f"Source checksum mismatch: {path}")
    with Image.open(path) as im:
        if list(im.size) != source["dimensions"]:
            raise SystemExit(f"Unexpected source dimensions: {path}")
    return path


def smoothstep(lo: float, hi: float, value: np.ndarray) -> np.ndarray:
    t = np.clip((value - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def padded_low_image(image: Image.Image, pad: int = 16) -> Image.Image:
    # The same globally aligned resampling coordinates are used for every tile.
    # Padding supplies real neighbors across the antimeridian and clamps poles.
    pixels = np.asarray(image)
    pixels = np.pad(pixels, ((0, 0), (pad, pad)), mode="wrap")
    pixels = np.pad(pixels, ((pad, pad), (0, 0)), mode="edge")
    return Image.fromarray(pixels)


def upsample_region(image: Image.Image, col: int, row: int) -> np.ndarray:
    x, y = col * INTERIOR, row * INTERIOR
    # The high raster is exactly five times the 8192 x 4096 low-frequency grid.
    box = (16 + x / 5, 16 + y / 5, 16 + (x + INTERIOR) / 5, 16 + (y + INTERIOR) / 5)
    return np.asarray(image.resize((INTERIOR, INTERIOR), Image.Resampling.LANCZOS, box=box), dtype=np.float32)


def build_field(source_dir: Path, base_dir: Path, work_dir: Path, download: bool) -> tuple[np.memmap, dict]:
    paths = {name: source_file(source_dir, source, download) for name, source in RAW_SOURCES.items()}
    base_path = source_file(base_dir, BASE_SOURCE, download)
    work_dir.mkdir(parents=True, exist_ok=True)
    raw = np.memmap(work_dir / "raw-clouds-40960.gray", dtype=np.uint8, mode="w+", shape=(HEIGHT, WIDTH))
    raw_low = Image.new("L", (8192, 4096))
    for half, name in enumerate(["west", "east"]):
        with Image.open(paths[name]) as original:
            native = original.resize((WIDTH // 2, HEIGHT), Image.Resampling.LANCZOS)
            raw[:, half * (WIDTH // 2):(half + 1) * (WIDTH // 2)] = np.asarray(native)
            native.close()
            raw_low.paste(original.resize((4096, 4096), Image.Resampling.LANCZOS), (half * 4096, 0))
        print(f"Prepared {name} native cloud hemisphere", flush=True)
    raw.flush()
    with Image.open(base_path) as original:
        base = original.convert("L")
    low_a, low_b = np.asarray(raw_low), np.asarray(base)
    first, last = round((90 - 50) / 180 * 4096), round((90 + 50) / 180 * 4096)
    correlation = float(np.corrcoef(low_a[first:last].ravel(), low_b[first:last].ravel())[0, 1])
    if correlation < 0.98:
        raise SystemExit(f"Cloud sources do not register reliably: correlation {correlation:.6f}")
    base_padded, raw_padded = padded_low_image(base), padded_low_image(raw_low)
    base.close()
    raw_low.close()
    combined = np.memmap(work_dir / "prepared-clouds-40960.gray", dtype=np.uint8, mode="w+", shape=(HEIGHT, WIDTH))
    residual_sum, residual_squared, count = 0.0, 0.0, 0
    for row in range(HEIGHT // INTERIOR):
        latitude = 90 - (np.arange(row * INTERIOR, (row + 1) * INTERIOR, dtype=np.float32) + 0.5) / HEIGHT * 180
        polar_weight = 1 - smoothstep(55, 65, np.abs(latitude))
        for col in range(WIDTH // INTERIOR):
            longitude = (np.arange(col * INTERIOR, (col + 1) * INTERIOR, dtype=np.float32) + 0.5) / WIDTH * 360 - 180
            seam_distance = np.minimum(np.abs(longitude), 180 - np.abs(longitude))
            seam_weight = smoothstep(0.25, 1.0, seam_distance)
            weight = polar_weight[:, None] * seam_weight[None, :]
            y, x = row * INTERIOR, col * INTERIOR
            baseline = upsample_region(base_padded, col, row)
            low_native = upsample_region(raw_padded, col, row)
            fine = np.asarray(raw[y:y + INTERIOR, x:x + INTERIOR], dtype=np.float32) - low_native
            prepared = np.rint(np.clip(baseline + fine * weight, 0, 255)).astype(np.uint8)
            combined[y:y + INTERIOR, x:x + INTERIOR] = prepared
            # Fine residual is reported as processing QA, not sensor uncertainty.
            delta = prepared.astype(np.float32) - baseline
            residual_sum += float(delta.sum(dtype=np.float64))
            residual_squared += float(np.square(delta).sum(dtype=np.float64))
            count += delta.size
        print(f"Prepared coherent cloud-detail row {row + 1}/10", flush=True)
    combined.flush()
    base_padded.close()
    raw_padded.close()
    del raw
    return combined, {
        "rawToPolishedCorrelationWithin50Degrees": correlation,
        "highFrequencyResidualMeanCodeValue": residual_sum / count,
        "highFrequencyResidualRmsCodeValue": (residual_squared / count) ** 0.5,
    }


def save_tiles(raster: np.ndarray, output: Path, name: str, workers: int) -> list[dict]:
    height, width = raster.shape
    columns, rows = width // INTERIOR, height // INTERIOR
    directory = output / name
    directory.mkdir(parents=True, exist_ok=True)
    quality = QUALITIES[name]

    def save_tile(position: tuple[int, int]) -> dict:
        col, row = position
        x = np.mod(np.arange(col * INTERIOR - GUTTER, (col + 1) * INTERIOR + GUTTER), width)
        y = np.clip(np.arange(row * INTERIOR - GUTTER, (row + 1) * INTERIOR + GUTTER), 0, height - 1)
        pixels = raster[y[:, None], x[None, :]]
        path = directory / f"c{col}-r{row}.avif"
        with Image.fromarray(pixels) as tile:
            tile.save(path, format="AVIF", quality=quality, speed=ENCODING["speed"],
                      max_threads=ENCODING["maxThreads"], subsampling="4:0:0", range="full")
        return {"path": path.relative_to(output).as_posix(), "column": col, "row": row,
                "width": INTERIOR + 2 * GUTTER, "height": INTERIOR + 2 * GUTTER,
                "bytes": path.stat().st_size, "sha256": sha256(path)}

    files = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for index, record in enumerate(pool.map(save_tile, [(col, row) for row in range(rows) for col in range(columns)])):
            files.append(record)
            if (index + 1) % columns == 0:
                print(f"Encoded {name} row {(index + 1) // columns}/{rows}", flush=True)
    return files


def build(args: argparse.Namespace) -> None:
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    high, qa = build_field(args.source_dir, args.base_source_dir, args.work_dir, args.download)
    files = save_tiles(high, output, "clouds-40k", args.workers)
    # Both detail levels derive from the same prepared field, preventing weather
    # changes or incompatible broad coverage when LOD switches at close range.
    with Image.frombuffer("L", (WIDTH, HEIGHT), high, "raw", "L", 0, 1) as full:
        medium = full.resize((WIDTH // 2, HEIGHT // 2), Image.Resampling.LANCZOS)
    files += save_tiles(np.asarray(medium), output, "clouds-20k", args.workers)
    medium.close()
    manifest = {
        "schemaVersion": 1,
        "title": "NASA Blue Marble clouds — observed kilometre-scale detail for close Earth views",
        "retrieved": "2026-11-07",
        "sourcePage": "https://visibleearth.nasa.gov/images/57747/blue-marble-clouds",
        "currentSourceDescription": "https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/",
        "credit": "NASA Goddard Space Flight Center; cloud imagery by Reto Stöckli; polished composite enhancements by Robert Simmon; MODIS teams",
        "license": "https://www.nasa.gov/nasa-brand-center/images-and-media/",
        "sources": {**RAW_SOURCES, "polishedGlobalBase": BASE_SOURCE},
        "sourceNativeCombinedDimensions": [43200, 21600],
        "sourcePixelDegrees": 1 / 120,
        "sourceEquatorialKmPerPixel": 40075.017 / 43200,
        "deliveredEquatorialKmPerPixel": 40075.017 / WIDTH,
        "projection": {"type": "equirectangular", "longitudeDegrees": [-180, 180],
                       "latitudeDegreesTopToBottom": [90, -90], "origin": "northwest"},
        "colorSpace": "linear-data",
        "interpretation": "Grayscale appearance/coverage mask; black transparent, white opaque. An archival composite, not current or mission-date weather, and not a retrieved optical-depth product.",
        "preparation": {
            "script": "scripts/prepare-earth-cloud-details.py",
            "formula": "polished8k upsample + validity * (native43k downsample - native43k lowpass8k upsample); clamp to 0..255",
            "nativeDownsample": "Lanczos to 40960 x 20480, never enlarging the observed detail source",
            "lowFrequencyPreservation": "The aligned polished 8K composite supplies broad cloud coverage, completed poles and repaired seams; the native source supplies only finer measured structure.",
            "polarValidity": "Full detail through ±55 degrees; smooth taper to zero at ±65 degrees. Higher latitudes retain the polished 8K fallback because raw hemispheres have missing polar data.",
            "seamValidity": "Fine residual is zero within 0.25 degrees of 0/180-degree source seams, tapering to full at 1 degree; the polished global base fills these narrow strips.",
            "mediumLod": "Lanczos reduction of the same prepared 40K field to 20480 x 10240",
            "encoding": ENCODING,
            "noInventedDetail": "No procedural or generated cloud texture. Upsampling is used only for the existing broad fallback and removal of the native source's low frequencies, never claimed as new observed detail.",
        },
        "layers": {
            "clouds40k": {"pathPattern": "clouds-40k/c{column}-r{row}.avif", "globalWidth": WIDTH, "globalHeight": HEIGHT, "columns": 20, "rows": 10},
            "clouds20k": {"pathPattern": "clouds-20k/c{column}-r{row}.avif", "globalWidth": WIDTH // 2, "globalHeight": HEIGHT // 2, "columns": 10, "rows": 5},
        },
        "tile": {"interiorPixels": INTERIOR, "borderPixels": GUTTER, "fileWidth": INTERIOR + 2 * GUTTER,
                 "fileHeight": INTERIOR + 2 * GUTTER, "borderRule": "Horizontal wrap; vertical clamp"},
        "qa": qa,
        "totalBytes": sum(f["bytes"] for f in files),
        "files": files,
    }
    (output / "clouds-provenance.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Prepared {len(files)} cloud tiles, {manifest['totalBytes'] / 1_000_000:.1f} MB total; source correlation {qa['rawToPolishedCorrelationWithin50Degrees']:.6f}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--base-source-dir", type=Path, required=True)
    parser.add_argument("--work-dir", type=Path, default=Path(tempfile.gettempdir()) / "odc-earth-cloud-details")
    parser.add_argument("--output", type=Path, default=ROOT / "dist/vendor/earth-detail")
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--download", action="store_true")
    build(parser.parse_args())
