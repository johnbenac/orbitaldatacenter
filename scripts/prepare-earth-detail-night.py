#!/usr/bin/env python3
"""Prepare local orbital night detail from NASA's original 500 m visualizations.

Dependencies: Pillow, NumPy. Original downloads and large working rasters stay
outside the repository. The existing globe images are never opened for writing.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import gc
import hashlib
import io
import json
import math
import mmap
import tempfile
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_BASE = "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144897/"
SOURCE_PAGE = "https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/"
SOURCE_HASHES = {
    "A1": "4e5a1135eb97ffa17067128f278d329ccf8d8819f469c9c4a40ffda7b77c809b",
    "A2": "13e06e1c9244e3d81c08b7d37cc447edaf77ceaecd5a007c2a208469ff788fbc",
    "B1": "19a3e114e0a3970577813ff54e81e60fe5f32b6c38148468625a8a02f594a33c",
    "B2": "036ba07752c03f2a52f6038af863dd8d6c2e19f7b31ddae064f833d2ca823c8f",
    "C1": "95c448f32e5c42bd4017d1c0394a56a93b77abb449cc1666573495df00f89a58",
    "C2": "949c72ba9bd7b32e05f5009b9769e2aecf906742146498c1c4d3a27b05aa5c2c",
    "D1": "46f7261c8f70f6efea9505b86605ff3e0dee514a00f95f96339da04c2bb58662",
    "D2": "fa13ddb4d30e4e0c9a4d1b2842fb67a96cc4abfe6837c4dfff2369b0fa2364c7",
}
NATIVE_WIDTH, NATIVE_HEIGHT = 86400, 43200
INTERIOR, BORDER = 2048, 4
FILE_SIZE = INTERIOR + 2 * BORDER
Image.MAX_IMAGE_PIXELS = 600_000_000  # Exact, checksum-pinned 21,600² inputs.


def digest_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def release_pages(array: np.memmap, write: bool = False) -> None:
    if write:
        array.flush()
    # Flush dirty output first. Let concurrent asset preparation reclaim RAM.
    if hasattr(array._mmap, "madvise"):
        array._mmap.madvise(mmap.MADV_DONTNEED)


def sources(source_dir: Path, download: bool) -> list[dict]:
    source_dir.mkdir(parents=True, exist_ok=True)
    records = []
    for sector, expected_hash in SOURCE_HASHES.items():
        path = source_dir / f"night-native-{sector}-gray.jpg"
        url = SOURCE_BASE + f"BlackMarble_2016_{sector}_gray.jpg"
        if not path.exists():
            if not download:
                raise SystemExit(f"Missing {path}; supply originals or use --download.")
            partial = path.with_suffix(".jpg.part")
            with urllib.request.urlopen(url, timeout=60) as response, partial.open("wb") as output:
                for block in iter(lambda: response.read(1024 * 1024), b""):
                    output.write(block)
            if digest_file(partial) != expected_hash:
                partial.unlink()
                raise SystemExit(f"Downloaded source checksum mismatch: {url}")
            partial.replace(path)
        if digest_file(path) != expected_hash:
            raise SystemExit(f"Source checksum mismatch: {path}")
        with Image.open(path) as image:
            if image.size != (21600, 21600) or image.mode != "L":
                raise SystemExit(f"Unexpected source dimensions or mode: {path}")
        records.append({
            "sector": sector,
            "url": url,
            "cachedFilename": path.name,
            "width": 21600,
            "height": 21600,
            "mode": "L",
            "bytes": path.stat().st_size,
            "sha256": expected_hash,
            "longitudeDegrees": [-180 + 90 * (ord(sector[0]) - ord("A")), -90 + 90 * (ord(sector[0]) - ord("A"))],
            "latitudeDegreesTopToBottom": [90 if sector[1] == "1" else 0, 0 if sector[1] == "1" else -90],
        })
    return records


def assemble_native(source_dir: Path, cache: Path, records: list[dict]) -> Path:
    path = cache / "night-native-86400x43200.raw"
    marker = path.with_suffix(".complete.json")
    signature = {"sources": SOURCE_HASHES, "width": NATIVE_WIDTH, "height": NATIVE_HEIGHT, "version": 1}
    if marker.exists() and path.exists() and path.stat().st_size == NATIVE_WIDTH * NATIVE_HEIGHT:
        if json.loads(marker.read_text()) == signature:
            return path
    target = np.memmap(path, mode="w+", dtype=np.uint8, shape=(NATIVE_HEIGHT, NATIVE_WIDTH))
    for record in records:
        sector = record["sector"]
        column, row = ord(sector[0]) - ord("A"), int(sector[1]) - 1
        with Image.open(source_dir / record["cachedFilename"]) as image:
            target[row * 21600:(row + 1) * 21600, column * 21600:(column + 1) * 21600] = np.asarray(image)
        release_pages(target, write=True)
        gc.collect()
        print(f"Assembled source sector {sector}", flush=True)
    del target
    marker.write_text(json.dumps(signature, indent=2) + "\n")
    return path


def resample_native(native_path: Path, cache: Path, width: int, height: int) -> Path:
    """Resample continuous global strips, including real antimeridian neighbors.

    This avoids independent-sector filter seams without allocating a giant PIL
    image. Each output strip samples the same continuous global transform.
    """
    path = cache / f"night-{width}x{height}.raw"
    marker = path.with_suffix(".complete.json")
    signature = {"sources": SOURCE_HASHES, "width": width, "height": height, "resampling": "Lanczos", "version": 2}
    if marker.exists() and path.exists() and path.stat().st_size == width * height:
        if json.loads(marker.read_text()) == signature:
            return path
    native = np.memmap(native_path, mode="r", dtype=np.uint8, shape=(NATIVE_HEIGHT, NATIVE_WIDTH))
    target = np.memmap(path, mode="w+", dtype=np.uint8, shape=(height, width))
    scale = NATIVE_HEIGHT / height
    support = math.ceil(3 * scale) + 2
    strip_rows = int(round(540 / scale))
    strips = math.ceil(height / strip_rows)
    for number, start in enumerate(range(0, height, strip_rows)):
        end = min(height, start + strip_rows)
        source_top, source_bottom = start * scale, end * scale
        first, last = math.floor(source_top) - support, math.ceil(source_bottom) + support
        valid_first, valid_last = max(0, first), min(NATIVE_HEIGHT, last)
        # Copy a narrow latitude band, not the entire 3.7 GB raster.
        band = np.pad(
            np.asarray(native[valid_first:valid_last]),
            ((valid_first - first, last - valid_last), (support, support)),
            mode="edge",
        )
        # Longitude gutters wrap instead of clamping the dateline.
        band[:, :support] = band[:, NATIVE_WIDTH:NATIVE_WIDTH + support]
        band[:, NATIVE_WIDTH + support:] = band[:, support:2 * support]
        box = (support, source_top - first, NATIVE_WIDTH + support, source_bottom - first)
        with Image.fromarray(band) as image:
            resized = image.resize((width, end - start), Image.Resampling.LANCZOS, box=box)
            target[start:end] = np.asarray(resized)
            resized.close()
        del band
        if (number + 1) % 8 == 0 or number + 1 == strips:
            release_pages(target, write=True)
            release_pages(native)
            print(f"Resampled {width}px map: strip {number + 1}/{strips}", flush=True)
    del native, target
    marker.write_text(json.dumps(signature, indent=2) + "\n")
    return path


def encode_tile(array: np.ndarray, path: Path, image_format: str) -> dict:
    image = Image.fromarray(array)
    lossless = False
    if image_format == "webp":
        # Empty/sparse fields can be substantially smaller without any loss.
        sparse = np.count_nonzero(array) < array.size * 0.005
        buffer = io.BytesIO()
        image.save(buffer, format="WEBP", quality=92, method=6)
        data = buffer.getvalue()
        if sparse:
            exact = io.BytesIO()
            image.save(exact, format="WEBP", lossless=True, quality=75, method=4)
            if len(exact.getvalue()) < len(data):
                data = exact.getvalue()
                lossless = True
    else:
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=92, optimize=True, progressive=True)
        data = buffer.getvalue()
    image.close()
    path.write_bytes(data)
    return {
        "path": path.name,
        "width": FILE_SIZE,
        "height": FILE_SIZE,
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "lossless": lossless,
    }


def tile_level(raw_path: Path, width: int, height: int, directory: Path, image_format: str, workers: int) -> dict:
    directory.mkdir(parents=True, exist_ok=True)
    array = np.memmap(raw_path, mode="r", dtype=np.uint8, shape=(height, width))
    columns, rows = width // INTERIOR, height // INTERIOR
    files = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        for row in range(rows):
            y = np.clip(np.arange(row * INTERIOR - BORDER, (row + 1) * INTERIOR + BORDER), 0, height - 1)
            pending = []
            for column in range(columns):
                x = np.mod(np.arange(column * INTERIOR - BORDER, (column + 1) * INTERIOR + BORDER), width)
                pixels = array[y[:, None], x[None, :]]
                path = directory / f"c{column}-r{row}.{image_format}"
                pending.append((column, executor.submit(encode_tile, pixels, path, image_format)))
                # Bound queued image copies, leaving RAM available for day assets.
                if len(pending) >= workers * 2:
                    completed_column, future = pending.pop(0)
                    entry = future.result()
                    entry.update({"column": completed_column, "row": row})
                    files.append(entry)
            for column, future in pending:
                entry = future.result()
                entry.update({"column": column, "row": row})
                files.append(entry)
            release_pages(array)
            print(f"Encoded {directory.name}: row {row + 1}/{rows}", flush=True)
    del array
    return {
        "pathPattern": directory.name + f"/c{{column}}-r{{row}}.{image_format}",
        "globalWidth": width,
        "globalHeight": height,
        "columns": columns,
        "rows": rows,
        "interiorPixels": INTERIOR,
        "borderPixels": BORDER,
        "fileWidth": FILE_SIZE,
        "fileHeight": FILE_SIZE,
        "virtualPageInteriorPixels": 512,
        "virtualPagesPerParentSide": 4,
        "totalBytes": sum(item["bytes"] for item in files),
        "files": sorted(files, key=lambda item: (item["row"], item["column"])),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=Path(tempfile.gettempdir()) / "odc-earth-night-sources")
    parser.add_argument("--cache-dir", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / "dist" / "vendor" / "earth-detail")
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--format", choices=("webp", "jpg"), default="webp")
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()
    cache = args.cache_dir or args.source_dir / "night-processing"
    cache.mkdir(parents=True, exist_ok=True)
    args.output.mkdir(parents=True, exist_ok=True)
    records = sources(args.source_dir, args.download)
    native = assemble_native(args.source_dir, cache, records)
    high = resample_native(native, cache, 81920, 40960)
    medium = resample_native(native, cache, 20480, 10240)
    levels = {
        "high": tile_level(high, 81920, 40960, args.output / "night-80k", args.format, args.workers),
        "medium": tile_level(medium, 20480, 10240, args.output / "night-20k", args.format, args.workers),
    }
    manifest = {
        "schemaVersion": 1,
        "title": "NASA Black Marble 2016 — local orbital night detail",
        "retrieved": "2026-11-07",
        "sourcePage": SOURCE_PAGE,
        "sourceMetadata": "https://github.com/nasa-gibs/worldview-options-eosdis/blob/master/common/config/metadata/viirs/VIIRS_Black_Marble.md",
        "license": "NASA media usage guidelines; generally not subject to copyright in the United States",
        "licenseUrl": "https://www.nasa.gov/nasa-brand-center/images-and-media/",
        "credit": "NASA Earth Observatory / NASA Goddard Space Flight Center; Suomi NPP VIIRS; Miguel Román and Joshua Stevens",
        "observationPeriod": "2016 annual composite",
        "sourceGlobalDimensions": [NATIVE_WIDTH, NATIVE_HEIGHT],
        "sourceResolutionNote": "NASA's visualization grid is nominally 500 m; the VIIRS DNB sensor resolution is approximately 750 m. The bundle preserves the real source detail and does not imply finer instrument resolution.",
        "projection": {
            "type": "equirectangular",
            "longitudeDegrees": [-180, 180],
            "latitudeDegreesTopToBottom": [90, -90],
            "columns": "west to east",
            "rows": "north to south",
        },
        "colorSpace": "sRGB-display-intensity-scalar",
        "scalarChannel": "r",
        "interpretation": "Grayscale sRGB display intensity: black is no visible light, white is bright light. Sample the red channel and linearize its display encoding before light calculations, tint and exposure. The grayscale source is encoded in RGB WebP; byte/255 is not linear physical radiance. This is a processed archival visualization, not calibrated radiance or current city lighting. CPU and GPU rendering use the same interpretation.",
        "processing": {
            "script": "scripts/prepare-earth-detail-night.py",
            "resampling": "Lanczos directly from the original 86,400×43,200 grayscale mosaic for both levels",
            "seams": "Continuous global strip resampling across source-sector borders; horizontal wrap and polar clamp; four-pixel gutters copied from neighboring global pixels",
            "codec": "WebP quality 92, method 6; lossless used only when a sparse tile becomes smaller" if args.format == "webp" else "Optimized progressive JPEG quality 92",
            "noSyntheticDetail": True,
            "globalGlobeAssetsModified": False,
        },
        "sources": records,
        "levels": levels,
        "totalImageBytes": sum(level["totalBytes"] for level in levels.values()),
    }
    (args.output / "night-provenance.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Night detail complete: {manifest['totalImageBytes']:,} bytes", flush=True)


if __name__ == "__main__":
    main()
