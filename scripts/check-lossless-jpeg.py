"""Compare final decoded pixels, quantization and original APP/COM metadata.

Usage: python scripts/check-lossless-jpeg.py original.jpg optimized.jpg
Pillow is needed only for the independent pixel/quantization comparison.
"""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image


def metadata_markers(data):
    records = []
    offset = 2
    if data[:2] != b"\xff\xd8":
        raise ValueError("Expected a JPEG SOI marker")
    while offset < len(data):
        if data[offset] != 255:
            raise ValueError("Malformed JPEG marker boundary")
        offset += 1
        while data[offset] == 255:
            offset += 1
        marker = data[offset]
        offset += 1
        if marker in (0xDA, 0xD9):
            break
        if marker == 0x01 or 0xD0 <= marker <= 0xD7:
            continue
        length = int.from_bytes(data[offset:offset + 2], "big")
        payload = data[offset + 2:offset + length]
        offset += length
        if 0xE0 <= marker <= 0xEF or marker == 0xFE:
            records.append((marker, payload))
    return records


if len(sys.argv) != 3:
    raise SystemExit("Usage: check-lossless-jpeg.py original.jpg optimized.jpg")
original, optimized = map(Path, sys.argv[1:])
before, after = original.read_bytes(), optimized.read_bytes()
with Image.open(original) as image:
    size = image.size
    pixels = image.convert("RGBA").tobytes()
    quantization = image.quantization
with Image.open(optimized) as image:
    assert image.size == size, "Image dimensions changed"
    assert image.quantization == quantization, "Quantization tables changed"
    assert image.convert("RGBA").tobytes() == pixels, "Decoded RGBA pixels changed"
assert metadata_markers(before) == metadata_markers(after), "APP/COM metadata changed"
assert len(after) < len(before), "No package-size saving"
print(json.dumps({
    "dimensions": size,
    "originalBytes": len(before),
    "optimizedBytes": len(after),
    "bytesSaved": len(before) - len(after),
    "rgbaExact": True,
    "quantizationExact": True,
    "appAndCommentMarkersExact": True,
    "originalFileSha256": hashlib.sha256(before).hexdigest(),
    "optimizedFileSha256": hashlib.sha256(after).hexdigest(),
    "decodedRgbaSha256": hashlib.sha256(pixels).hexdigest()
}, indent=2))
