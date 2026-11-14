# Lossless launch-site JPEG packaging

The expanded thermal workspace needed additional deployment-package space. Two existing launch-site images were repackaged using libjpeg's coefficient-preserving transcoding API. The optimizer reads the original quantized DCT coefficients, writes those same coefficients as optimized progressive JPEG scans, and copies every APP and COM metadata marker. It performs no image resize, pixel edit, inverse transform or requantization.

| Asset | Original bytes | Optimized bytes | Saved |
| --- | ---: | ---: | ---: |
| `cape-lc36-detail.jpg` | 7,316,117 | 6,850,007 | 466,110 |
| `cape-lc16-detail.jpg` | 7,197,228 | 6,751,569 | 445,659 |
| Total | 14,513,345 | 13,601,576 | **911,769** |

Both assets remain 4096 × 4096 pixels. An independent Pillow decode compared every RGBA byte and confirmed exact equality. Quantization tables and raw APP/COM metadata also match exactly. The machine-readable hashes and results are in `lossless-jpeg-packaging-proof.json`. Original binaries remain in source revision `a9f186ea78b71d9f5151a44fcd852e75128fed0c`.

## Reproduce

The small optimizer source is `scripts/lossless-jpeg-optimize.c`; compilation requires a normal libjpeg development installation. The proof checker requires Pillow. No compiler, codec headers or vendor libraries are included in the site or repository.

```sh
cc -O2 -Wall scripts/lossless-jpeg-optimize.c -ljpeg -o /tmp/odc-jpeg-optimize
git show a9f186ea78b71d9f5151a44fcd852e75128fed0c:dist/assets/launch-sites/cape-lc36-detail.jpg > /tmp/lc36-original.jpg
/tmp/odc-jpeg-optimize /tmp/lc36-original.jpg /tmp/lc36-optimized.jpg
python scripts/check-lossless-jpeg.py /tmp/lc36-original.jpg /tmp/lc36-optimized.jpg
```

Repeat with LC16 to reproduce its proof. Different libjpeg versions may choose different entropy coding and file bytes; the decoder/quantization/metadata checks are the acceptance condition. This packaging change does not modify image credits, texture URLs, application logic, resolution or imagery.

## 14 November 2026 — Redwire source package

The updated site exceeded Sites' 256 MiB expanded-archive limit. The same
coefficient-preserving optimizer reduced thirteen additional launch-site JPEGs
by **3,060,845 bytes**, with no change to image content or design information.
The previous LC16/LC36 optimization above is retained unchanged.

Every optimized image passed exact decoded-RGBA, dimension and quantization
equality. An independent complete-marker comparison also confirmed identical
APP/COM metadata throughout each JPEG, identical component sampling and
quantization-table assignments, and no trailing data after either end marker.
Only the JPEG scan/entropy representation changes: sequential to optimized
progressive coding. No image was resized, requantized, deleted or replaced.

| Complete package measurement | Before | After |
| --- | ---: | ---: |
| Static file payload bytes | 268,110,385 | 265,049,540 |
| Expanded TAR bytes, including headers and padding | 270,080,000 | **267,018,240** |
| Expanded TAR size | 257.57 MiB | **254.65 MiB** |
| Files | 2,583 | **2,583** |

The resulting expanded archive is **1,417,216 bytes (1.35 MiB) below** the
268,435,456-byte limit. File inventory is identical. The thirteen JPEGs are
the only changed payloads; the remaining **2,570 files are byte-for-byte
identical**, including application code, engineering models, geometry, data,
other imagery, citations, licenses and the offline-export inventory.

The [machine-readable proof](lossless-jpeg-packaging-2026-11-14.json) retains
per-image byte counts and hashes, decoded-image hashes, complete metadata
checks, and the package inventory/content comparison. Original image bytes
remain in source commit `86acb2c3b9254da97a142a0a56c4463359a889db`.

To reproduce, use the existing optimizer and checker commands above for each
`records[].path` in the proof, retrieving its original from that source commit.
This run used the system libjpeg-turbo 2.1.5 library and matching upstream
headers; the headers and compiler are not included in the shipped site.
Package with the normal Sites helper and measure the entire decompressed TAR,
including its headers and padding. Gzip size alone does not establish the
expanded-archive limit.

This is a packaging change. Redwire's design, harness accounting and routing
results are unchanged. No deployment is performed by this source update.
